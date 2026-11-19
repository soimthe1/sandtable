# Contributing

Thanks for taking a look. Issues and pull requests are welcome.

## Before you start

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), especially **Non-negotiables** and **Two kinds of
position**. A change that adds a numeric confidence score, a "recommended COA", or coordinates
invented from free text will not be merged, however well it is built.

## Setup

See [Quick start](README.md#quick-start). You need an LLM endpoint for end-to-end runs; Ollama on
your own machine is the simplest.

## Checks

```powershell
.\scripts\dev.ps1 test
```

or on Linux/macOS:

```bash
python -m compileall -q backend/app
(cd frontend && npm ci && npm run build)
```

CI runs the same on every push and pull request.

## Conventions

- Routers stay thin; logic goes in `backend/app/services/`.
- Every LLM call goes through `services/llm_client.py`.
- Every user-facing string goes through `t()`, with keys added to **both** `en.json` and `ar.json`.
- Use CSS logical properties (`inline-start`, not `left`) so right-to-left layout keeps working.
- When a schema field changes, update the Pydantic model, `frontend/src/types/schema.ts` and, if the
  model produces it, the JSON contract in `prompts/system_prompts.py`.
- Never commit secrets, real endpoints or organisation branding. `config/config*.yaml`, `.env*` and
  `frontend/brand.local/` are git-ignored for that reason.
- Sample scenarios must stay fictional (invented places, units and nations).
