"""
scenario.json - the workstation -> Sandtable side of the integration contract.

`version` is the actual compatibility boundary (see build brief). Keep it
at "1.0" until the wire shape changes, and bump it deliberately - not
whenever internal fields shift.
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field

Affiliation = Literal["friend", "hostile", "neutral", "unknown"]
TerrainKind = Literal["polygon", "polyline", "point", "rectangle", "circle", "volume"]


class GeoPoint(BaseModel):
    longitude: float
    latitude: float


class OrderOfBattleEntry(BaseModel):
    name: str
    sidc: str = Field(description="MIL-STD-2525C SIDC string")
    affiliation: Affiliation
    longitude: float
    latitude: float


class TerrainFeature(BaseModel):
    name: str
    kind: TerrainKind
    positions: list[list[float]] = Field(
        description="[[lon, lat, alt], ...] - alt optional per point but keep 3-tuples for consistency"
    )


class Scenario(BaseModel):
    version: str = "1.0"
    mission_name: str
    generated_at: str = Field(description="ISO 8601 timestamp")
    home: GeoPoint
    order_of_battle: list[OrderOfBattleEntry] = Field(default_factory=list)
    terrain_features: list[TerrainFeature] = Field(default_factory=list)
    constraints: str = ""


class ScenarioFreeText(BaseModel):
    """
    The officer-authored side of scenario input that scenario.json doesn't
    carry on its own (mission statement / AOI narrative / force notes /
    ROE / catch-all). This is what the on-screen form actually collects;
    an imported scenario.json is merged into it rather than replacing it.
    """
    mission_statement: str = ""
    terrain_description: str = ""
    force_composition_notes: str = ""
    constraints_roe: str = ""
    additional_notes: str = ""


SketchFeatureKind = Literal["line", "area", "point"]


class SketchUnit(BaseModel):
    """
    One unit on a RELATIVE disposition sketch. `x`/`y` are fractions of an
    abstract unit square (0,0 = north-west), NOT coordinates.

    The 0..1 bound is a guardrail, not a formatting detail: it is what
    structurally prevents a model from returning latitude/longitude here. A
    scenario.json carries surveyed positions; free text carries none, so
    anything derived from prose stays in this relative frame and must never
    be promoted into Scenario.order_of_battle or exported as geometry.
    """
    name: str
    affiliation: Affiliation
    x: float = Field(ge=0.0, le=1.0, description="Relative easting, 0..1. Not a longitude.")
    y: float = Field(ge=0.0, le=1.0, description="Relative northing, 0 = north. Not a latitude.")
    basis: str = Field(
        default="",
        description="The phrase in the officer's text this placement was read from, so it can be checked.",
    )


class SketchFeature(BaseModel):
    """Terrain on the relative sketch. `points` are [x, y] pairs in 0..1."""
    name: str
    kind: SketchFeatureKind
    points: list[list[float]] = Field(default_factory=list)


class LaydownSketch(BaseModel):
    """
    A relative disposition sketch derived from the officer's own free text.

    What this is: entities the officer explicitly mentioned, arranged by the
    spatial relationships they explicitly stated ("east of the village", "on
    the far bank"). It reads their words back to them.

    What it is NOT, and must never become: a map. No coordinates, no scale,
    no survey. It is labelled on screen as derived from text, is editable by
    the officer, and is excluded from the exported mission bundle - see
    mission_bundle_builder, which builds geometry only from an imported
    scenario.json.
    """
    units: list[SketchUnit] = Field(default_factory=list)
    features: list[SketchFeature] = Field(default_factory=list)
    note: str = Field(
        default="",
        description="Short note on how the arrangement was read, or what the text left ambiguous.",
    )


class ScenarioInput(BaseModel):
    """What the frontend actually POSTs to /api/coa/generate."""
    free_text: ScenarioFreeText
    imported_scenario: Optional[Scenario] = None
    # Structured laydown read back from free_text (see LaydownSketch). Passed
    # to the generator so it plans against a stated order of battle rather
    # than re-parsing prose - never merged into imported_scenario.
    sketch: Optional[LaydownSketch] = None
    ui_language: Literal["en", "ar"] = "en"
