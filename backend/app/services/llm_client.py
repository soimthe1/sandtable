"""
Single entry point for every LLM call in the app: chat_completion() and
chat_completion_json(). Everything upstream (coa_generator, translation,
sketch_extractor) calls only these and never touches provider details.

Provider, endpoint, model and thinking control come from the `ai:` section of
config/config.yaml and are applied by ai_providers.py (ollama | openai | comfyui).
Every function takes an optional `profile` so a task can be pointed at its own
model by adding a profile to config.yaml - no code change.

ai_providers is synchronous (standard library only); calls run in a worker thread
so the event loop is never blocked.
"""
import asyncio
import json

from app.config import settings
from app.services import ai_providers


class LLMError(RuntimeError):
    pass


async def chat_completion(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.4,
    max_tokens: int = 4000,
    profile: str = "default",
    _json_mode: bool = False,
) -> str:
    """Raw chat completion - returns the assistant message content as text, reasoning removed."""
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
    try:
        return await asyncio.to_thread(
            ai_providers.chat,
            messages,
            profile,
            json_mode=_json_mode and settings.json_mode,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except ai_providers.AIError as exc:
        raise LLMError(str(exc)) from exc


async def chat_completion_json(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.4,
    max_tokens: int = 4000,
    profile: str = "default",
) -> dict:
    """Chat completion where the model is instructed to return JSON. Parses and returns a dict."""
    raw = await chat_completion(
        system_prompt, user_prompt, temperature=temperature, max_tokens=max_tokens, profile=profile, _json_mode=True
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        # One forgiving attempt: some models wrap valid JSON in leading/trailing chatter
        # even when told not to. Grab the outermost {...} span and retry.
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise LLMError(f"Model did not return valid JSON: {e}. Raw content: {raw[:1000]}") from e


async def check_llm_endpoint(profile: str = "default") -> dict:
    """
    Live reachability + configured-model check against a profile's endpoint, without
    running a generation. Used by GET /api/health/llm.
    """
    result = await asyncio.to_thread(ai_providers.check, profile)
    if "error" in result:
        return {"reachable": False, "configured_model_available": None, "error": result["error"][:300]}
    return {"reachable": True, "configured_model_available": result.get("model_available")}
