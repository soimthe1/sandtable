from fastapi import APIRouter, HTTPException

from app import storage
from app.schemas.coa import GenerateCoaResponse, ReviseCoaRequest
from app.schemas.scenario import ScenarioInput
from app.services.coa_generator import generate_coas, revise_coa
from app.services.llm_client import LLMError

router = APIRouter(prefix="/api/coa", tags=["coa"])


@router.post("/generate", response_model=GenerateCoaResponse)
async def generate(scenario: ScenarioInput):
    if not any(
        [
            scenario.free_text.mission_statement,
            scenario.free_text.terrain_description,
            scenario.free_text.force_composition_notes,
            scenario.imported_scenario,
        ]
    ):
        raise HTTPException(status_code=422, detail="Provide at least a mission statement or an imported scenario.")

    try:
        result, warnings = await generate_coas(scenario)
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    session = storage.create_session(scenario, result)
    return GenerateCoaResponse(session_id=session.id, result=result, warnings=warnings)


@router.get("/session/{session_id}", response_model=GenerateCoaResponse)
async def get_session_result(session_id: str):
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Unknown session_id (backend may have restarted).")
    return GenerateCoaResponse(session_id=session.id, result=session.result, warnings=[])


@router.post("/revise", response_model=GenerateCoaResponse)
async def revise(req: ReviseCoaRequest):
    session = storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Unknown session_id (backend may have restarted).")

    target = next((c for c in session.result.coas if c.id == req.coa_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"No COA with id {req.coa_id} in this session.")

    try:
        revised, warnings = await revise_coa(target, req.change_request, req.ui_language)
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))

    updated_coas = [revised if c.id == req.coa_id else c for c in session.result.coas]
    session.result.coas = updated_coas
    storage.update_result(req.session_id, session.result)

    return GenerateCoaResponse(session_id=session.id, result=session.result, warnings=warnings)
