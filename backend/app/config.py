"""
All configuration lives here. Nothing else in the app reads files or os.environ for settings -
import `settings` instead.

Two sources, never overlapping:

  config/config.yaml        every setting that is not a secret (AI profiles under `ai:`,
                            application settings under `app:`)
  config/config.prod.yaml   every key of config.yaml with its production value; merged over
                            config.yaml when APP_ENV=prod (set by docker-compose.prod.yaml)
  environment               secrets only: LLM_API_KEY (when a profile names it with
                            api_key_env). Development loads them from the repo-root .env;
                            production passes .env.prod through compose `env_file:`.

AI access goes through app/services/ai_providers.py, which is configured here from `ai:`.
Switching provider or model (ollama | openai | comfyui) is a config.yaml edit only.
"""
import os
from pathlib import Path
from typing import Literal

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict

from app.services import ai_providers

# backend/app/config.py -> backend/app -> backend -> repo root (local development).
_REPO_ROOT = Path(__file__).resolve().parents[2]

# Config folder: <repo>/config locally, /app/config in the container (mounted read-only).
CONFIG_DIR_CANDIDATES = (_REPO_ROOT / "config", Path("/app/config"))
CONFIG_DIR = next((p for p in CONFIG_DIR_CANDIDATES if (p / "config.yaml").is_file()), CONFIG_DIR_CANDIDATES[0])

APP_ENV = os.environ.get("APP_ENV", "dev").strip().lower()

# Development secrets. Never overrides a variable that is already set (compose env_file).
load_dotenv(_REPO_ROOT / ".env", override=False)

# Words that mark a secret: such keys belong in .env, never in YAML.
_SECRET_WORDS = ("password", "secret", "token", "api_key")


class ConfigError(RuntimeError):
    pass


class AppSettings(BaseModel):
    """The `app:` section of config.yaml. Unknown keys are rejected."""

    model_config = ConfigDict(extra="forbid")

    # Product name in the API title (/docs). The UI's name and logo come from frontend/brand.local/.
    display_name: str = "Sandtable"
    default_ui_language: Literal["en", "ar"] = "en"
    translation_mode: Literal["native", "translate"] = "native"
    # Ask the endpoint for guaranteed-JSON output on structured calls. Turn off only if
    # the endpoint rejects it.
    json_mode: bool = True
    risk_guardrail_max_retries: int = 1
    cors_origins: list[str] = []
    # POST /api/scenario/import-url fetches a caller-supplied URL server-side (SSRF
    # surface). Empty allows any host - development only. In production list the
    # workstation hostnames that may hand scenarios over.
    scenario_url_allowed_hosts: list[str] = []
    scenario_url_fetch_timeout_seconds: int = 20


def _merge(base: dict, overlay: dict) -> dict:
    out = dict(base)
    for key, value in overlay.items():
        out[key] = _merge(out[key], value) if isinstance(value, dict) and isinstance(out.get(key), dict) else value
    return out


def _reject_secrets(node, path: str = "") -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            lowered = str(key).lower()
            if any(word in lowered for word in _SECRET_WORDS) and not lowered.endswith("_env"):
                raise ConfigError(f"{path}{key}: secrets belong in .env / .env.prod, not in config YAML")
            _reject_secrets(value, f"{path}{key}.")


def _load_yaml(name: str) -> dict:
    path = CONFIG_DIR / name
    with path.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def _load() -> tuple[dict, list[str]]:
    if not (CONFIG_DIR / "config.yaml").is_file():
        searched = ", ".join(str(p / "config.yaml") for p in CONFIG_DIR_CANDIDATES)
        raise ConfigError(
            f"config.yaml not found. Searched: {searched}. Copy config/config.example.yaml to config/config.yaml."
        )
    data, loaded = _load_yaml("config.yaml"), [str(CONFIG_DIR / "config.yaml")]
    if APP_ENV == "prod":
        if not (CONFIG_DIR / "config.prod.yaml").is_file():
            raise ConfigError(f"APP_ENV=prod but {CONFIG_DIR / 'config.prod.yaml'} is missing")
        data = _merge(data, _load_yaml("config.prod.yaml"))
        loaded.append(str(CONFIG_DIR / "config.prod.yaml"))
    unknown = set(data) - {"ai", "app"}
    if unknown:
        raise ConfigError(f"config.yaml: unknown top-level keys {sorted(unknown)}; allowed: ai, app")
    _reject_secrets(data)
    return data, loaded


class Settings:
    """Resolved settings. Attribute names are what the rest of the app reads."""

    def __init__(self) -> None:
        data, self.config_files_loaded = _load()
        ai_providers.configure(data.get("ai"), base_dir=CONFIG_DIR.parent)
        self.ai = ai_providers.profile("default")
        self.app = AppSettings(**(data.get("app") or {}))

    # AI (default profile)
    @property
    def llm_provider(self) -> str:
        return self.ai["provider"]

    @property
    def llm_base_url(self) -> str:
        return self.ai["base_url"]

    @property
    def llm_model(self) -> str:
        return self.ai["model"]

    @property
    def llm_suppress_thinking(self) -> bool:
        return self.ai["suppress_thinking"]

    # Application
    @property
    def default_ui_language(self) -> str:
        return self.app.default_ui_language

    @property
    def translation_mode(self) -> str:
        return self.app.translation_mode

    @property
    def json_mode(self) -> bool:
        return self.app.json_mode

    @property
    def risk_guardrail_max_retries(self) -> int:
        return self.app.risk_guardrail_max_retries

    @property
    def cors_origin_list(self) -> list[str]:
        return self.app.cors_origins

    @property
    def scenario_url_allowed_hosts_list(self) -> list[str]:
        return [h.strip().lower() for h in self.app.scenario_url_allowed_hosts if h.strip()]

    @property
    def scenario_url_fetch_timeout_seconds(self) -> int:
        return self.app.scenario_url_fetch_timeout_seconds


settings = Settings()


def in_container() -> bool:
    """Best-effort: Docker creates /.dockerenv in every container it builds."""
    return Path("/.dockerenv").exists()


def config_warnings() -> list[str]:
    """
    Human-readable misconfiguration warnings, surfaced by /api/health and logged at startup.
    Empty list means nothing looked wrong. Missing or invalid config files are errors and stop
    startup instead (ConfigError), so they never reach this list.
    """
    warnings: list[str] = []
    host = settings.llm_base_url.lower()
    if in_container() and ("localhost" in host or "127.0.0.1" in host):
        warnings.append(
            f"ai.default.base_url is {settings.llm_base_url}, which inside a container points at "
            "the container itself, not at the host machine. Set it in config/config.prod.yaml to a "
            "hostname or IP reachable from the container."
        )
    if in_container() and "APP_ENV" not in os.environ:
        warnings.append(
            "APP_ENV is not set inside a container, so config.prod.yaml is not applied. Start the "
            "app with docker-compose.prod.yaml, which sets APP_ENV=prod."
        )
    return warnings
