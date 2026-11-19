# Deploying Sandtable

This guide installs Sandtable on a server, step by step, including servers with no internet
access (air-gapped). You do not need to know the project. Follow the sections in order and check
the "Expected" result after each step.

Sandtable ships as **one Docker image**: nginx serves the built UI and proxies `/api` to the
FastAPI backend inside the same container. The image is built once on a machine with internet
access, saved as a `.tar`, and loaded on the target, so the target needs no source code,
toolchain or registry access.

Some words used below:
- **Image**: a packaged copy of the application. It arrives as a single `.tar` file.
- **Container**: the running application, started from the image.
- **Build PC**: a computer with the source code, Docker and internet access (Windows, Linux or macOS).
- **Target server**: the server where the application will run. It needs Docker, and network access to the LLM server only.

## 0. Before you start

Collect these values first. You will enter them in step 4.

| Placeholder | What it is | Where to get it |
|---|---|---|
| `<LLM_URL>` | Address of the language-model server. Ollama: `http://<host>:11434`. vLLM or OpenAI: `http://<host>:8000/v1` | The team that runs the LLM server |
| `<LLM_MODEL>` | Exact model name on that server, e.g. `qwen3:30b-a3b-instruct-2507-q8_0` | Same team; Ollama lists them at `<LLM_URL>/api/tags`, vLLM at `<LLM_URL>/models` |
| `<WORKSTATION_HOSTNAME>` | Hostname of the geospatial workstation allowed to send scenarios | The workstation administrator |
| `<SERVER>` | Hostname or IP of the target server | Your server administrator |
| API key (optional) | Only if the LLM server requires one | The team that runs the LLM server |

You need:
- On the build PC: Docker running, and a clone of this repository with `config/config.yaml` and
  `config/config.prod.yaml` created from their templates:

  ```bash
  cp config/config.example.yaml config/config.yaml
  cp config/config.prod.example.yaml config/config.prod.yaml
  ```

  (On Windows, `.\scripts\dev.ps1 setup` does this for you.)
- On the target server: Docker with the `docker compose` command, and a user allowed to run Docker
  (on Linux: member of the `docker` group, or use `sudo` in front of every `docker` command).
- Time: about 15 minutes, plus the image build (about 5 minutes on the build PC).

## 1. Build (on the build PC)

**Windows (PowerShell)**, in the project folder:

```powershell
.\scripts\dev.ps1 build
```

For Arabic as the default interface language, use `.\scripts\dev.ps1 build -DefaultLanguage ar` instead.

Expected: the last lines say `Done: ...\dist\sandtable-<timestamp>.tar (about 75 MB)`.
If it fails with "docker" errors, start Docker Desktop and run the command again.

**Linux or macOS**, in the project folder (the same two steps the script runs):

```bash
docker build -f docker/Dockerfile \
  --build-arg VITE_DEFAULT_UI_LANGUAGE=en \
  --build-arg VITE_API_BASE_URL= \
  -t sandtable:1.0.0 .
mkdir -p dist && docker save -o dist/sandtable-$(date +%Y%m%d-%H%M).tar sandtable:1.0.0
```

To deploy your own branding, put it in `frontend/brand.local/` before building (see
[`frontend/brand.example/`](../frontend/brand.example/README.md)); the image picks it up.

If the target server has internet access, you can skip the tar: clone the repository on the
server, run the `docker build` command above there, and follow the steps below in the clone
(skip `docker load` in step 5).

Copy these to a USB drive (or any transfer medium), keeping the `config` folder as a folder
(`config.yaml` and `config.prod.yaml` are created by `.\scripts\dev.ps1 setup` from their
`*.example.yaml` templates if they are missing):

```
dist\sandtable-<timestamp>.tar
docker-compose.prod.yaml
.env.prod.example
config\config.yaml
config\config.prod.yaml
docs\DEPLOYMENT.md
```

## 2. Prerequisites (on the target server)

Create a folder named `sandtable` (for example `/opt/sandtable` on Linux or `D:\Apps\sandtable`
on Windows) and copy everything from step 1 into it, so it looks like this:

```
sandtable/
  docker-compose.prod.yaml
  .env.prod.example
  DEPLOYMENT.md
  sandtable-<timestamp>.tar
  config/
    config.yaml
    config.prod.yaml
```

Open a terminal in that folder and check Docker:

```bash
docker --version
docker compose version
```

Expected: both print a version number. If `docker compose` is unknown, install the Docker Compose plugin.

Check that port 8080 is free (the application will use it):

```bash
docker ps --format "{{.Ports}}" | grep 8080
```

Expected: no output. If something is listed, another container uses 8080: change `"8080:80"` in
`docker-compose.prod.yaml` to a free port such as `"8090:80"`, and use that port everywhere below.

Open port 8080 in the server firewall for the users' network.

Check that the server can reach the LLM server (Ollama: add `/api/tags`; vLLM/OpenAI: add `/models`):

```bash
curl <LLM_URL>/api/tags
```

Expected: a JSON list that contains `<LLM_MODEL>`. If it times out, ask the network team to allow
the target server to reach the LLM server. The application cannot generate anything without it.

## 3. External setup

None. sandtable has no database and needs no accounts.

## 4. Configuration

`config/config.prod.yaml` lists every setting of `config/config.yaml` with its production value;
you only edit the values. Open `config/config.prod.yaml` in a text editor and set these values
(leave every other line as it is):

```yaml
ai:
  default:
    base_url: <LLM_URL>
    model: <LLM_MODEL>

app:
  cors_origins: []
  scenario_url_allowed_hosts:
    - <WORKSTATION_HOSTNAME>
```

- Leave the `ai:` values as they are if the LLM server and model are already right.
- For a vLLM or OpenAI server, also set `provider: openai` under `default:`. For one that needs an
  API key, add `api_key_env: LLM_API_KEY` as well.
- Never use `localhost` or `127.0.0.1` in `<LLM_URL>`: inside the container that is the container itself.
- Indentation matters in YAML: use spaces, exactly as shown.

Create the secrets file:

```bash
cp .env.prod.example .env.prod          # Linux
copy .env.prod.example .env.prod        # Windows
```

If the LLM server needs an API key, open `.env.prod` and put it after `LLM_API_KEY=`. Otherwise
leave the file as it is. On Windows, make sure it is saved as `.env.prod`, not `.env.prod.txt`
(check with `dir /a`).

## 5. First start

Load the image (use the real file name):

```bash
docker load -i sandtable-<timestamp>.tar
```

Expected: `Loaded image: sandtable:1.0.0`.

Start the application:

```bash
docker compose -f docker-compose.prod.yaml --env-file .env.prod up -d
```

Expected: `Container sandtable  Started`. If it says `couldn't find env file`, `.env.prod` is
missing or misnamed (step 4).

## 6. Verify

Wait 20 seconds, then:

```bash
docker compose -f docker-compose.prod.yaml ps
```

Expected: the `sandtable` line shows `Up ... (healthy)`.

Check the configuration the application actually loaded:

```bash
curl http://localhost:8080/api/health
```

Expected: `"status": "ok"`, `"app_env": "prod"`, `"config_files_loaded"` listing both
`/app/config/config.yaml` and `/app/config/config.prod.yaml`, your `llm_base_url` and `llm_model`,
and `"warnings": []`.

Check the LLM connection:

```bash
curl http://localhost:8080/api/health/llm
```

Expected: `"reachable": true` and `"configured_model_available": true`.

Finally open `http://<SERVER>:8080` in a browser from a user's PC. Expected: the Sandtable screen with
the scenario form. Generate a COA from one of the sample scenarios to confirm the whole chain works.

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker compose up` tries to download the image and fails | The image was not loaded | Run the `docker load` command from step 5 first |
| `couldn't find env file` | `.env.prod` missing or named `.env.prod.txt` | Redo the last part of step 4 |
| `ps` shows `(unhealthy)`; `docker compose -f docker-compose.prod.yaml logs` shows `config.yaml not found` | The `config` folder is not next to `docker-compose.prod.yaml` | Put it there (step 2 layout), then start again |
| Logs show a YAML or validation error naming a key | A typo or wrong indentation in `config/config.prod.yaml` | Fix the named key, then start again |
| `/api/health/llm` shows `"reachable": false` | The server cannot reach `base_url`, or it says `localhost` | Fix `base_url` in `config/config.prod.yaml`, check the firewall, then `docker compose -f docker-compose.prod.yaml restart` |
| `"configured_model_available": false` | The model name does not match the server's list | Copy the exact name from the server's model list into `model:` and restart |
| The browser cannot open `http://<SERVER>:8080` | Firewall or port in use | Open the port in the firewall; check step 2 |
| Generation fails with a JSON error | The LLM server rejects JSON mode | Add `json_mode: false` under `app:` in `config/config.prod.yaml` and restart |

To see what the application is doing: `docker compose -f docker-compose.prod.yaml logs -f` (Ctrl+C to leave).

Upgrades later: copy the new `.tar`, run `docker load -i <new tar>`, then the start command from step 5 again.
Configuration changes: edit `config/config.prod.yaml` and run `docker compose -f docker-compose.prod.yaml restart`.
