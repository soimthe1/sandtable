# Architecture and design notes

These notes explain decisions that the code alone doesn't make obvious, and a few rules that would
quietly break the app's purpose if they were changed carelessly.

## What the app is

Sandtable drafts courses of action (COAs) for military staff planning. A planner describes a
scenario; the backend asks an LLM for two or three distinct COAs, each with a phased timeline, an
adversarial red-team critique and a qualitative risk comparison. The planner revises, compares,
accepts and exports.

It has **no connection to any live system, sensor or execution path**, and nothing it produces may
read as "the system decided X". Every COA is a draft for human review. Wording such as "COA 2 is the
correct choice" or "execute COA 2", in a prompt or a UI string, is a bug.

## Layout

```
backend/app/
  config.py                 settings from config/*.yaml + secrets from env; import `settings`
  main.py                   FastAPI wiring, CORS, routers, startup config log
  storage.py                in-process session store (no database, on purpose)
  prompts/system_prompts.py every prompt; the JSON contract; draft-framing text
  routers/                  HTTP only: health, scenario, coa, export
  schemas/                  Pydantic models = wire and file contracts
  services/
    llm_client.py           the only module that talks to an LLM
    ai_providers.py         provider implementations (ollama | openai | comfyui)
    coa_generator.py        prompt -> LLM -> guardrail -> translate -> validate
    guardrails.py           detects and strips fabricated confidence figures
    sketch_extractor.py     relative layout from free text (see "Two kinds of position")
    translation.py          native vs translate i18n modes
    mission_bundle_builder.py  CZML/features bundle for export
frontend/src/
  api/client.ts             every fetch() to the backend
  state/useSessionStore.ts  app state + scenario_url / return_url launch handling
  brand/                    default brand + optional brand.local/ loader
  components/               sand table, roster, COA cards, timeline, compare view, ...
  data/sampleScenarios.ts   three fictional sample scenarios (en + ar) with geometry
  i18n/{en,ar}.json         every user-facing string
  types/schema.ts           hand-maintained TypeScript mirror of the Pydantic schemas
docker/                     single production image: nginx + uvicorn under supervisord
```

## Non-negotiables

1. **No bare quantitative confidence figures.** Risk text is qualitative and comparative ("more
   exposed than COA 2 on the northern flank, because..."), never a percentage, decimal or X/10
   score. Three layers enforce it: the system prompt; the regex scan
   (`guardrails.py::find_quantitative_leaks`); and a one-shot repair re-prompt with a client-side
   sanitizing fallback (`coa_generator.py::_enforce_guardrail`). A new narrative field in the COA
   schema probably needs scanning too.
2. **Draft framing, never selection framing**, in prompts and UI copy alike.
3. **Provider logic stays in `llm_client.py` / `ai_providers.py`.** Nothing else branches on the
   provider.
4. **The app stays standalone.** It integrates with a mapping workstation through a URL in and a
   URL out only. It has no shared package, shared database or iframe.

## Reasoning models

Two independent layers, and both stay. (1) Each profile can ask the endpoint not to think
(`suppress_thinking`), in that endpoint's own dialect. (2) Reasoning blocks are stripped from
every response regardless. Asking is best-effort; stripping is what protects the JSON contract.

## Two kinds of position, and why they never merge

- **Surveyed.** An imported `scenario.json` carries real lon/lat. Drawn by `ScenarioSandTable`,
  exported in the mission bundle.
- **Read from prose.** Typed text carries no survey data, so `/api/scenario/sketch` extracts only
  what the planner stated: which units exist, their affiliation, and the spatial relations their
  own words assert. Drawn by `LaydownSketchPanel` in a relative 0..1 frame, labelled as derived
  from text, editable, and **excluded from export**.

Reading "Alpha Coy is east of the village" from a sentence that says so is extraction. Producing
latitude 34.12 from that sentence would be invention. `SketchUnit.x/y` are bounded 0..1 so a model
that returns coordinates fails validation, and out-of-range values are dropped, not rescaled.

## Visuals are procedural, not generated

Everything drawn (sand table, roster, timeline, card frames) is rendered with SVG/CSS from data
the backend returned. A score panel, Monte Carlo chart or generated "tactical map" image would have
to be invented by a model. That is the same integrity problem as a fabricated percentage, only as
pixels. Decorative motion (the radar sweep on the sand table, timeline playback) represents no
sensor, coverage or simulation, and is never wired to data.

## Storage

`storage.py` is an in-process dict keyed by session UUID. A restart clears it. Adding persistence
is a deliberate scope change, not something to slip in with another change.

## Contracts to keep in sync by hand

- `backend/app/schemas/*.py` (source of truth)
- `frontend/src/types/schema.ts`
- `backend/app/prompts/system_prompts.py` (`_JSON_CONTRACT`), for fields the model produces
- `translation.py::translate_coa_fields_to_language`, for new narrative fields (it translates named
  fields only)

`Scenario.version` and `CoaResult.version` are the compatibility boundary with workstations; bump
them when the wire shape changes.

## Configuration and branding

- `config/config.yaml` holds every non-secret setting; `config/config.prod.yaml` holds the same keys
  with production values (applied when `APP_ENV=prod`). Both are git-ignored; the tracked files are
  the `*.example.yaml` templates. Secrets (`LLM_API_KEY`) come from `.env` / `.env.prod`.
- The UI brand defaults live in `frontend/src/brand/`, `src/styles/tokens.css` (`--brand-*`) and
  `src/i18n`. `frontend/brand.local/` (git-ignored) overrides any of them at build time through
  `import.meta.glob`, so the folder is optional.
- Webfonts are bundled from `@fontsource`. Never switch to a CDN link: on a disconnected network
  the request hangs and the UI silently falls back to system fonts.
