from typing import Literal, Optional

from pydantic import BaseModel, Field

DrawnKind = Literal[
    "point", "polyline", "polygon", "rectangle", "circle", "volume",
    "measure-distance", "measure-area",
]


class DrawnFeatureStyle(BaseModel):
    color: str = "#2C5F6F"
    width: int = 2
    fillAlpha: float = 0.28
    extrudeHeight: Optional[float] = None


class DrawnFeature(BaseModel):
    id: str
    kind: DrawnKind
    name: str
    positions: list[list[float]]
    style: DrawnFeatureStyle = Field(default_factory=DrawnFeatureStyle)
    createdAt: str


class MissionFeatures(BaseModel):
    drawn: list[DrawnFeature] = Field(default_factory=list)


class MissionBundle(BaseModel):
    """
    Workstation-compatible mission bundle. This is the payload that goes in
    coa_result.json's `recommended_mission` field on export, and is what
    the workstation's Mission panel opens directly for rehearsal/playback.

    CZML packets are generated from the COA's phased timeline - keep the
    document packet first, then one packet per entity/path/label, per the
    standard CZML convention.
    """
    id: str
    name: str
    description: str = ""
    features: MissionFeatures = Field(default_factory=MissionFeatures)
    czml: list[dict] = Field(default_factory=list)
