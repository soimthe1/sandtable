import json
import uuid
from datetime import datetime, timezone

from pydantic import ValidationError

from app.config import settings
from app.prompts.system_prompts import (
    generation_system_prompt,
    guardrail_repair_prompt,
    revision_system_prompt,
)
from app.schemas.coa import Coa, CoaResult, GenerationWarning
from app.schemas.scenario import ScenarioInput
from app.services import translation
from app.services.guardrails import find_quantitative_leaks, sanitize_quantitative_leaks
from app.services.llm_client import chat_completion_json


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _scenario_to_prompt(scenario: ScenarioInput, reasoning_lang_note: str) -> str:
    ft = scenario.free_text
    parts = [
        f"MISSION STATEMENT:\n{ft.mission_statement or '(not provided)'}",
        f"TERRAIN / AREA OF INTEREST:\n{ft.terrain_description or '(not provided)'}",
        f"FORCE COMPOSITION NOTES:\n{ft.force_composition_notes or '(not provided)'}",
        f"CONSTRAINTS / ROE:\n{ft.constraints_roe or '(not provided)'}",
    ]
    if ft.additional_notes:
        parts.append(f"ADDITIONAL NOTES:\n{ft.additional_notes}")

    if scenario.imported_scenario:
        s = scenario.imported_scenario
        oob_lines = "\n".join(
            f"  - {e.name} ({e.affiliation}, SIDC {e.sidc}) at {e.longitude:.4f}, {e.latitude:.4f}"
            for e in s.order_of_battle
        ) or "  (none)"
        terrain_lines = "\n".join(f"  - {t.name} [{t.kind}]" for t in s.terrain_features) or "  (none)"
        parts.append(
            "IMPORTED SCENARIO (from the workstation, scenario.json):\n"
            f"Mission: {s.mission_name}\n"
            f"Home reference point: {s.home.longitude:.4f}, {s.home.latitude:.4f}\n"
            f"Order of battle:\n{oob_lines}\n"
            f"Terrain features:\n{terrain_lines}\n"
            f"Constraints (imported): {s.constraints or '(none)'}"
        )

    if scenario.sketch and scenario.sketch.units:
        # Relative, text-derived laydown (see LaydownSketch). Labelled as such
        # in the prompt so the model treats it as the officer's own stated
        # arrangement and never as surveyed positions - it carries no
        # coordinates and must not be reasoned about as if it did.
        sketch_lines = "\n".join(
            f"  - {u.name} ({u.affiliation})" + (f" - stated as: {u.basis}" if u.basis else "")
            for u in scenario.sketch.units
        )
        feature_lines = "\n".join(
            f"  - {f.name} [{f.kind}]" for f in scenario.sketch.features
        ) or "  (none)"
        parts.append(
            "STATED LAYDOWN (read from the officer's own text above; RELATIVE arrangement only, "
            "no coordinates, no scale):\n"
            f"Units:\n{sketch_lines}\n"
            f"Terrain:\n{feature_lines}"
        )

    parts.append(reasoning_lang_note)
    return "\n\n".join(parts)


async def _generate_raw(scenario: ScenarioInput) -> dict:
    reasoning_lang = translation.generation_reasoning_language(scenario.ui_language)
    system_prompt = generation_system_prompt(reasoning_lang)
    user_prompt = _scenario_to_prompt(
        scenario,
        "Produce 2 to 3 distinct COAs for the scenario above, following the JSON contract exactly.",
    )
    return await chat_completion_json(system_prompt, user_prompt, temperature=0.5, max_tokens=6000)


async def generate_coas(scenario: ScenarioInput) -> tuple[CoaResult, list[GenerationWarning]]:
    raw = await _generate_raw(scenario)
    raw_coas = raw.get("coas", [])
    if not raw_coas:
        raise ValueError("Model returned no COAs.")

    warnings: list[GenerationWarning] = []
    cleaned_coas: list[Coa] = []

    for raw_coa in raw_coas:
        raw_coa.setdefault("id", f"coa-{uuid.uuid4().hex[:8]}")
        coa_dict, coa_warnings = await _enforce_guardrail(raw_coa, scenario.ui_language)
        coa_dict = await translation.translate_coa_fields_to_language(coa_dict, scenario.ui_language)
        try:
            cleaned_coas.append(Coa.model_validate(coa_dict))
        except ValidationError as e:
            raise ValueError(f"Model output for '{coa_dict.get('name', '?')}' failed schema validation: {e}")
        warnings.extend(coa_warnings)

    result = CoaResult(
        scenario_ref=scenario.imported_scenario.mission_name if scenario.imported_scenario else "untitled",
        generated_at=_now_iso(),
        coas=cleaned_coas,
    )
    return result, warnings


async def revise_coa(coa: Coa, change_request: str, ui_language: str) -> tuple[Coa, list[GenerationWarning]]:
    reasoning_lang = translation.generation_reasoning_language(ui_language)
    system_prompt = revision_system_prompt(reasoning_lang)
    user_prompt = (
        f"Current COA (JSON):\n{json.dumps(coa.model_dump(exclude={'recommended_mission'}), ensure_ascii=False)}\n\n"
        f"Officer's requested change:\n{change_request}"
    )
    raw = await chat_completion_json(system_prompt, user_prompt, temperature=0.4, max_tokens=4000)
    raw.setdefault("id", coa.id)

    coa_dict, warnings = await _enforce_guardrail(raw, ui_language)
    coa_dict = await translation.translate_coa_fields_to_language(coa_dict, ui_language)
    revised = Coa.model_validate(coa_dict)
    return revised, warnings


async def _enforce_guardrail(coa_dict: dict, ui_language: str) -> tuple[dict, list[GenerationWarning]]:
    """Detect fabricated quantitative confidence; re-prompt once, then sanitize as last resort."""
    warnings: list[GenerationWarning] = []
    leaks = find_quantitative_leaks(coa_dict)
    if not leaks:
        return coa_dict, warnings

    reasoning_lang = translation.generation_reasoning_language(ui_language)
    retries = settings.risk_guardrail_max_retries
    attempt = 0
    while leaks and attempt < retries:
        attempt += 1
        repaired = await chat_completion_json(
            generation_system_prompt(reasoning_lang),
            guardrail_repair_prompt(json.dumps(coa_dict, ensure_ascii=False)),
            temperature=0.2,
            max_tokens=4000,
        )
        # repair prompt returns a single COA object (or possibly {"coas":[...]})
        coa_dict = repaired.get("coas", [repaired])[0] if "coas" in repaired else repaired
        leaks = find_quantitative_leaks(coa_dict)

    if leaks:
        coa_dict = sanitize_quantitative_leaks(coa_dict)
        warnings.append(
            GenerationWarning(
                coa_id=coa_dict.get("id", "?"),
                message=(
                    "The model produced a fabricated quantitative confidence figure in a risk assessment "
                    "even after a repair attempt; it was stripped client-side. Consider re-running this COA."
                ),
            )
        )
    return coa_dict, warnings
