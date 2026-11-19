from fastapi import APIRouter

from app.config import APP_ENV, config_warnings, settings
from app.services.llm_client import check_llm_endpoint

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health():
    """
    Static config snapshot - no network call. Fast, always succeeds.

    Reports WHERE the config came from as well as what it says, so a wrong
    config folder or a missing APP_ENV is a one-request diagnosis.
    """
    warnings = config_warnings()
    return {
        "status": "ok" if not warnings else "degraded",
        "llm_provider": settings.llm_provider,
        "llm_base_url": settings.llm_base_url,
        "llm_model": settings.llm_model,
        "llm_suppress_thinking": settings.llm_suppress_thinking,
        "translation_mode": settings.translation_mode,
        "config": {
            "app_env": APP_ENV,
            "config_files_loaded": settings.config_files_loaded,
        },
        "warnings": warnings,
    }


@router.get("/api/health/llm")
async def health_llm():
    """
    Live check against the configured LLM endpoint - actually calls out to
    it (Ollama's /api/tags, or the OpenAI-compatible /models) rather than
    just echoing config. Use this to confirm Ollama is actually reachable
    in dev, or that the backend container can actually reach the vLLM/OpenAI
    host in production, before burning a real generation call to find out.
    """
    check = await check_llm_endpoint()
    return {
        "provider": settings.llm_provider,
        "base_url": settings.llm_base_url,
        "configured_model": settings.llm_model,
        "suppress_thinking": settings.llm_suppress_thinking,
        **check,
    }
