"""
Arabic support has two modes, switched by TRANSLATION_MODE (see .env.example) -
no code changes needed to flip between them:

  native    - the scenario text goes to the model as-typed, with a system-prompt
              directive to answer in the UI language. This is the default because
              the recommended models (e.g. Qwen3-235B-A22B) advertise strong
              Arabic coverage - trust that first.

  translate - a transparent round-trip: Arabic officer input is translated to
              English before it reaches the COA-generation prompt, the model
              reasons in English, and the result is translated back to Arabic
              before it's returned to the frontend. This reuses the SAME
              LLM_BASE_URL for translation calls - no separate translation
              service to stand up, which matters for an air-gapped deployment.

Run a side-by-side eval (same Arabic scenario, 2-3 candidate models, an
Arabic-speaking reviewer judging fluency/register) before deciding which mode
to ship with in production - see the build brief's model-recommendation note.
"""
from app.config import settings
from app.prompts.system_prompts import translation_prompt
from app.services.llm_client import chat_completion


async def _translate(text: str, source_lang: str, target_lang: str) -> str:
    if not text or not text.strip() or source_lang == target_lang:
        return text
    return await chat_completion(
        system_prompt="You are a precise military-register translator.",
        user_prompt=translation_prompt(text, source_lang, target_lang),
        temperature=0.1,
        max_tokens=2000,
    )


async def translate_scenario_text_to_english(text: str, ui_language: str) -> str:
    """Call before building the generation prompt, on free-text scenario fields."""
    if settings.translation_mode != "translate" or ui_language == "en":
        return text
    return await _translate(text, ui_language, "en")


async def translate_coa_fields_to_language(coa: dict, ui_language: str) -> dict:
    """
    Call after generation/revision, on the narrative-bearing fields of a single
    COA dict (as parsed from the model's JSON response), only when the model
    was made to reason in English via the translate round-trip.
    """
    if settings.translation_mode != "translate" or ui_language == "en":
        return coa

    coa = dict(coa)
    coa["narrative"] = await _translate(coa.get("narrative", ""), "en", ui_language)
    coa["red_team_critique"] = await _translate(coa.get("red_team_critique", ""), "en", ui_language)
    coa["phases"] = [
        {**p, "name": await _translate(p.get("name", ""), "en", ui_language),
         "description": await _translate(p.get("description", ""), "en", ui_language)}
        for p in coa.get("phases", [])
    ]
    coa["risk_factors"] = [
        {**r, "factor": await _translate(r.get("factor", ""), "en", ui_language),
         "assessment": await _translate(r.get("assessment", ""), "en", ui_language)}
        for r in coa.get("risk_factors", [])
    ]
    return coa


def generation_reasoning_language(ui_language: str) -> str:
    """Which language the model should actually be told to answer in."""
    if settings.translation_mode == "translate" and ui_language != "en":
        return "en"
    return ui_language
