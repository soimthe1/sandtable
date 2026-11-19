"""
Reads a relative disposition sketch out of the officer's free text, so a
typed-only scenario can still be drawn.

The safety argument for this feature lives in one distinction, and every
function here exists to hold it:

  EXTRACTION (allowed)  - the officer wrote "Alpha Coy holds the ridge east
                          of the village", so Alpha Coy is a friendly unit
                          and it sits east of the village. We are reading
                          their words back to them.
  INVENTION (forbidden) - nothing in that sentence yields latitude 34.12.
                          Free text contains no survey data, so any
                          coordinate a model produces here is fabricated,
                          and plotting it as a position is the same class of
                          error as a fabricated confidence score.

So the output frame is deliberately relative (0..1 in a blank square, see
LaydownSketch) and this module drops anything that escapes it rather than
rescaling it - rescaling real lat/lon into 0..1 would silently manufacture
exactly the plausible-looking map this is meant to prevent.
"""
import logging

from app.prompts.system_prompts import sketch_system_prompt
from app.schemas.scenario import LaydownSketch, ScenarioFreeText, SketchFeature, SketchUnit
from app.services.llm_client import chat_completion_json

logger = logging.getLogger(__name__)

# A sketch is a glanceable diagram, not an order of battle database. Past
# these counts it stops being readable and starts looking like a system of
# record, which is not what it is.
MAX_UNITS = 14
MAX_FEATURES = 8
MAX_FEATURE_POINTS = 12


def _free_text_block(ft: ScenarioFreeText) -> str:
    parts = [
        ("MISSION", ft.mission_statement),
        ("TERRAIN / AREA OF INTEREST", ft.terrain_description),
        ("FORCE COMPOSITION", ft.force_composition_notes),
        ("CONSTRAINTS / ROE", ft.constraints_roe),
        ("ADDITIONAL NOTES", ft.additional_notes),
    ]
    return "\n\n".join(f"{label}:\n{value.strip()}" for label, value in parts if value.strip())


def _in_unit_square(value: float) -> bool:
    return 0.0 <= value <= 1.0


def _coerce_units(raw: list) -> list[SketchUnit]:
    """
    Keeps only units that validate AND stay inside the relative frame.

    Out-of-range x/y is the signature of a model that ignored the frame and
    emitted coordinates (a latitude of 36.48 fails 0..1 on its face). Those
    are dropped, not clamped and not normalized: a dropped unit is a visible
    gap the officer can fix by hand, whereas a rescaled one is an invented
    position wearing a plausible face.
    """
    units: list[SketchUnit] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            x = float(item.get("x"))
            y = float(item.get("y"))
        except (TypeError, ValueError):
            continue
        if not (_in_unit_square(x) and _in_unit_square(y)):
            logger.warning(
                "sketch: dropping unit %r - x/y outside the relative frame (%s, %s), "
                "which usually means the model emitted coordinates",
                item.get("name"),
                x,
                y,
            )
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        affiliation = item.get("affiliation")
        if affiliation not in ("friend", "hostile", "neutral", "unknown"):
            affiliation = "unknown"
        units.append(
            SketchUnit(
                name=name[:60],
                affiliation=affiliation,
                x=x,
                y=y,
                basis=str(item.get("basis") or "")[:200],
            )
        )
        if len(units) >= MAX_UNITS:
            break
    return units


def _coerce_features(raw: list) -> list[SketchFeature]:
    features: list[SketchFeature] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        kind = item.get("kind")
        if not name or kind not in ("line", "area", "point"):
            continue
        points: list[list[float]] = []
        for point in item.get("points") or []:
            if not isinstance(point, (list, tuple)) or len(point) < 2:
                continue
            try:
                x, y = float(point[0]), float(point[1])
            except (TypeError, ValueError):
                continue
            if not (_in_unit_square(x) and _in_unit_square(y)):
                points = []  # same rule as units - drop the whole feature
                logger.warning("sketch: dropping feature %r - point outside the relative frame", name)
                break
            points.append([x, y])
            if len(points) >= MAX_FEATURE_POINTS:
                break
        if not points:
            continue
        features.append(SketchFeature(name=name[:60], kind=kind, points=points))
        if len(features) >= MAX_FEATURES:
            break
    return features


async def extract_sketch(free_text: ScenarioFreeText, ui_language: str) -> LaydownSketch:
    """
    Returns a relative sketch for the given free text. An empty sketch is a
    legitimate result (vague text has nothing to read), and callers must
    treat it as "nothing to draw", not as a failure.
    """
    body = _free_text_block(free_text)
    if not body.strip():
        return LaydownSketch(units=[], features=[], note="")

    raw = await chat_completion_json(
        sketch_system_prompt(ui_language),
        f"Scenario notes:\n\n{body}",
        temperature=0.1,  # extraction, not composition - keep it close to the text
        max_tokens=1500,
    )

    units = _coerce_units(raw.get("units") or [])
    features = _coerce_features(raw.get("features") or [])
    note = str(raw.get("note") or "")[:300]
    return LaydownSketch(units=units, features=features, note=note)
