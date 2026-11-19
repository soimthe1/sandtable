from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app import storage
from app.schemas.coa import CoaResult, ExportCoaRequest
from app.services.mission_bundle_builder import build_mission_bundle

router = APIRouter(prefix="/api/export", tags=["export"])


def _build_export_result(session_id: str, coa_id: str) -> tuple[CoaResult, str]:
    """Shared by both the POST (download) and GET (URL handoff) export routes."""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Unknown session_id (backend may have restarted).")

    target = next((c for c in session.result.coas if c.id == coa_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"No COA with id {coa_id} in this session.")

    mission = build_mission_bundle(target, session.scenario.imported_scenario)
    accepted = target.model_copy(update={"recommended_mission": mission})

    export_result = CoaResult(
        scenario_ref=session.result.scenario_ref,
        generated_at=session.result.generated_at,
        coas=[accepted],
    )
    filename = f"{accepted.id}-coa_result.json"
    return export_result, filename


@router.post("/coa")
async def export_coa(req: ExportCoaRequest):
    """
    Officer has accepted one COA. Returns a coa_result.json containing just
    that COA, with `recommended_mission` populated, as a download - this is
    the file the workstation opens in its Mission panel, and/or the standalone
    export artifact. Used by the "Accept & export mission bundle" button.
    """
    export_result, filename = _build_export_result(req.session_id, req.coa_id)
    return JSONResponse(
        content=export_result.model_dump(mode="json"),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/coa/{session_id}/{coa_id}")
async def export_coa_by_url(session_id: str, coa_id: str):
    """
    Stable, GET-able counterpart to POST /api/export/coa.

    This is the write half of the loosely-coupled, URL-only handoff with the
    geospatial workstation: when the workstation launches Sandtable with
    `?return_url=<workstation-page>`, the frontend's "Return to workstation"
    action (see useSessionStore.ts) sends the officer back to that URL with
    a `coa_result_url` query parameter pointing at *this* endpoint. The workstation
    then does a plain GET to fetch the accepted COA - no polling, no shared
    session, no callback auth. The URL is only valid as long as the backend
    process still holds the session in memory (see app/storage.py); it is
    not intended as a durable link.
    """
    export_result, _filename = _build_export_result(session_id, coa_id)
    return JSONResponse(content=export_result.model_dump(mode="json"))
