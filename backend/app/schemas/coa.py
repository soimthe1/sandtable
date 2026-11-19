from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.mission_bundle import MissionBundle


class CoaPhase(BaseModel):
    name: str
    description: str
    start_offset_min: int = Field(description="Minutes relative to COA start (H-hour = 0)")


class RiskFactor(BaseModel):
    factor: str
    assessment: str = Field(
        description=(
            "Qualitative, comparative text only - e.g. 'more exposed than COA 2 on the "
            "northern flank'. Never a bare percentage or fabricated numeric score."
        )
    )


class Coa(BaseModel):
    id: str
    name: str
    narrative: str
    phases: list[CoaPhase] = Field(default_factory=list)
    red_team_critique: str = ""
    risk_factors: list[RiskFactor] = Field(default_factory=list)
    recommended_mission: Optional[MissionBundle] = Field(
        default=None, description="Only populated on export, not during generation/revision."
    )


class CoaResult(BaseModel):
    version: str = "1.0"
    scenario_ref: str
    generated_at: str
    coas: list[Coa] = Field(default_factory=list)


# --- Internal API request/response models (not part of the file contract above) ---

class GenerationWarning(BaseModel):
    coa_id: str
    message: str


class GenerateCoaResponse(BaseModel):
    session_id: str = Field(
        description="v1 plumbing only - not part of the coa_result.json file contract itself"
    )
    result: CoaResult
    warnings: list[GenerationWarning] = Field(default_factory=list)


class ReviseCoaRequest(BaseModel):
    session_id: str
    coa_id: str
    change_request: str = Field(description="e.g. 'keep this COA but avoid the ridge route'")
    ui_language: Literal["en", "ar"] = "en"


class ExportCoaRequest(BaseModel):
    session_id: str
    coa_id: str
