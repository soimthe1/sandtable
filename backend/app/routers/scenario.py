import json
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.schemas.scenario import LaydownSketch, Scenario, ScenarioFreeText
from app.services.sketch_extractor import extract_sketch

router = APIRouter(prefix="/api/scenario", tags=["scenario"])


@router.post("/import", response_model=Scenario)
async def import_scenario(file: UploadFile):
    """
    Parses and validates a scenario.json exported from a workstation. The frontend
    merges the result into the on-screen form rather than replacing it, so the
    officer can still edit/annotate before generating COAs.
    """
    raw = await file.read()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Not valid JSON: {e}")

    try:
        return Scenario.model_validate(payload)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Doesn't match scenario.json contract: {e}")


class ImportScenarioUrlRequest(BaseModel):
    url: str


@router.post("/import-url", response_model=Scenario)
async def import_scenario_url(req: ImportScenarioUrlRequest):
    """
    URL-based counterpart to /import.

    This is the read half of the loosely-coupled, URL-only handoff with the
    geospatial workstation: rather than the officer manually
    downloading scenario.json from a workstation and re-uploading it here,
    the workstation can launch Sandtable with `?scenario_url=<url-to-scenario.json>`
    (see frontend/src/state/useSessionStore.ts), and the frontend calls this
    endpoint with that URL on load. The fetch happens server-side so it
    isn't subject to the browser's CORS policy for the workstation origin, and
    so the workstation never needs to add Sandtable's origin to any CORS allowlist of
    its own - the two apps stay unaware of each other beyond this one URL.

    No shared database, no iframe embedding, no auth handoff - just a URL
    Sandtable fetches once, on demand.
    """
    parsed = urlparse(req.url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=422, detail=f"Unsupported URL scheme: {parsed.scheme or '(none)'}")

    allowed_hosts = settings.scenario_url_allowed_hosts_list
    if allowed_hosts and (parsed.hostname or "").lower() not in allowed_hosts:
        raise HTTPException(
            status_code=422,
            detail=f"Host '{parsed.hostname}' is not in SCENARIO_URL_ALLOWED_HOSTS.",
        )

    try:
        async with httpx.AsyncClient(timeout=settings.scenario_url_fetch_timeout_seconds) as client:
            resp = await client.get(req.url)
            resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502, detail=f"{req.url} returned {e.response.status_code}: {e.response.text[:300]}"
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch {req.url}: {e}")

    try:
        payload = resp.json()
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"{req.url} did not return valid JSON: {e}")

    try:
        return Scenario.model_validate(payload)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Doesn't match scenario.json contract: {e}")


class SketchRequest(BaseModel):
    free_text: ScenarioFreeText
    ui_language: str = "en"


@router.post("/sketch", response_model=LaydownSketch)
async def build_sketch(req: SketchRequest):
    """
    Reads a relative disposition sketch out of the officer's free text, so a
    typed-only scenario (no scenario.json) still has something to draw.

    This is NOT a geocoder and the result is NOT a map - see LaydownSketch
    and services/sketch_extractor.py for the extraction-vs-invention line
    this depends on. An empty sketch is a valid 200 response, not an error:
    vague text legitimately has nothing to read out of it.
    """
    try:
        return await extract_sketch(req.free_text, req.ui_language)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not read a sketch from the text: {e}")
