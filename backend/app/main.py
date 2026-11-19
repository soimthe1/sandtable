import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_ENV, config_warnings, settings
from app.routers import coa, export, health, scenario

logger = logging.getLogger("sandtable.config")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    Print where config came from, once, at startup.

    One line in `docker compose logs` at boot shows which config files were
    applied and which LLM endpoint is in use. The same information is on
    /api/health.
    """
    logger.warning(
        "Sandtable config: APP_ENV=%s | config files = %s | provider=%s base_url=%s model=%s",
        APP_ENV,
        settings.config_files_loaded,
        settings.llm_provider,
        settings.llm_base_url,
        settings.llm_model,
    )
    for warning in config_warnings():
        logger.warning("Sandtable config WARNING: %s", warning)
    yield


app = FastAPI(
    title=f"{settings.app.display_name} - AI-assisted COA drafting and red-team wargaming",
    description=(
        "Scenario-in / analysis-out COA drafting and red-team wargaming support. "
        "Standalone service - no connection to any live system, sensor, or execution path. "
        "Every COA is a draft for human review; nothing here executes or auto-selects a course of action."
    ),
    version="1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scenario.router)
app.include_router(coa.router)
app.include_router(export.router)

