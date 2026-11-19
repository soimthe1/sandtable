# sandtable developer commands. Run from anywhere: .\scripts\dev.ps1 <command>
#
#   setup    create backend\.venv (Python 3.11) and install frontend packages; create .env and config\*.yaml from their templates
#   start    stop old dev servers, start API (uvicorn :8000) + UI (Vite :5173) in this window, open the browser
#   stop     stop the dev servers
#   status   show what is listening on the dev ports
#   logs     follow logs of the dockerised dev stack (docker-compose.yaml)
#   test     backend import/compile check + frontend type check and build
#   build    build the production image and save it to dist\sandtable-<timestamp>.tar
#            options: -DefaultLanguage en|ar (baked into the UI at build time)

param(
    [Parameter(Position = 0)]
    [ValidateSet("setup", "start", "stop", "status", "logs", "test", "build", "help")]
    [string]$Command = "help",

    [ValidateSet("en", "ar")]
    [string]$DefaultLanguage = "en"
)

# Continue, not Stop: Windows PowerShell 5.1 turns any stderr line from a native
# tool (npm/pip warnings) into a terminating error under Stop. Every native call
# below checks $LASTEXITCODE instead.
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Py = Join-Path $Backend ".venv\Scripts\python.exe"
$Image = "sandtable:1.0.0"
$Ports = @{ api = 8000; ui = 5173 }
$PidFile = Join-Path $Root ".dev-pids"

function Say($text, $color = "Cyan") { Write-Host $text -ForegroundColor $color }

function Stop-DevServers {
    if (Test-Path $PidFile) {
        foreach ($id in Get-Content $PidFile) {
            # taskkill /T also ends the child processes (uvicorn reloader, node).
            & taskkill /PID $id /T /F 2>$null | Out-Null
        }
        Remove-Item $PidFile -Force
    }
    foreach ($port in $Ports.Values) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    }
}

function Wait-Http($url, $seconds = 60) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { Start-Sleep -Milliseconds 500 }
    }
    return $false
}

function Assert-Setup {
    if (-not (Test-Path $Py)) { throw "backend\.venv missing - run: .\scripts\dev.ps1 setup" }
    if (-not (Test-Path (Join-Path $Frontend "node_modules"))) { throw "frontend\node_modules missing - run: .\scripts\dev.ps1 setup" }
    if (-not (Test-Path (Join-Path $Root ".env"))) { throw ".env missing - run: .\scripts\dev.ps1 setup" }
}

switch ($Command) {
    "setup" {
        if (-not (Test-Path $Py)) {
            Say "Creating backend\.venv (Python 3.11)..."
            & py -3.11 -m venv (Join-Path $Backend ".venv")
            if ($LASTEXITCODE) { throw "Could not create the venv - is Python 3.11 installed (py -3.11)?" }
        }
        Say "Installing backend packages..."
        & $Py -m pip install --disable-pip-version-check -q -r (Join-Path $Backend "requirements.txt")
        if ($LASTEXITCODE) { throw "pip install failed." }
        Say "Installing frontend packages..."
        Push-Location $Frontend; try { & npm ci } finally { Pop-Location }
        if ($LASTEXITCODE) { throw "npm ci failed." }
        $envFile = Join-Path $Root ".env"
        if (-not (Test-Path $envFile)) {
            Copy-Item (Join-Path $Root ".env.example") $envFile
            Say "Created .env from .env.example (secrets only). Settings are in config\config.yaml." Yellow
        }
        foreach ($name in "config.yaml", "config.prod.yaml") {
            $cfg = Join-Path $Root "config\$name"
            if (-not (Test-Path $cfg)) {
                Copy-Item (Join-Path $Root ("config\" + ($name -replace '\.yaml$', '.example.yaml'))) $cfg
                Say "Created config\$name from its template. Set the LLM endpoint under ai:." Yellow
            }
        }
        Say "Setup complete. Next: .\scripts\dev.ps1 start" Green
    }

    "start" {
        Assert-Setup
        Say "Stopping any previous dev servers..."
        Stop-DevServers
        $api = Start-Process -FilePath $Py -WorkingDirectory $Backend -NoNewWindow -PassThru `
            -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", $Ports.api
        $ui = Start-Process -FilePath "cmd.exe" -WorkingDirectory $Frontend -NoNewWindow -PassThru `
            -ArgumentList "/c", "npm run dev -- --port $($Ports.ui) --strictPort"
        Set-Content $PidFile @($api.Id, $ui.Id)
        try {
            if (-not (Wait-Http "http://localhost:$($Ports.api)/api/health")) { throw "API did not answer on port $($Ports.api) within 60s - see the output above." }
            if (-not (Wait-Http "http://localhost:$($Ports.ui)")) { throw "UI did not answer on port $($Ports.ui) within 60s - see the output above." }
            Say "Ready: http://localhost:$($Ports.ui)  (API http://localhost:$($Ports.api)/api/health). Ctrl+C stops both." Green
            Start-Process "http://localhost:$($Ports.ui)"
            while (-not $api.HasExited -and -not $ui.HasExited) { Start-Sleep -Seconds 1 }
            Say "A dev server exited - stopping the other one." Yellow
        }
        finally { Stop-DevServers }
    }

    "stop" { Stop-DevServers; Say "Dev servers stopped." Green }

    "status" {
        foreach ($name in $Ports.Keys) {
            $port = $Ports[$name]
            $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($conn) { Say ("{0,-4} port {1}: running (PID {2})" -f $name, $port, $conn.OwningProcess) Green }
            else { Say ("{0,-4} port {1}: not running" -f $name, $port) Yellow }
        }
    }

    "logs" { & docker compose -f (Join-Path $Root "docker-compose.yaml") logs -f }

    "test" {
        Assert-Setup
        Say "Backend: compile and import check..."
        & $Py -m compileall -q (Join-Path $Backend "app")
        if ($LASTEXITCODE) { throw "Backend compile check failed." }
        Push-Location $Backend; try { & $Py -c "import app.main; print('backend import OK')" } finally { Pop-Location }
        if ($LASTEXITCODE) { throw "Backend import failed." }
        Say "Frontend: type check and production build..."
        Push-Location $Frontend; try { & npm run build } finally { Pop-Location }
        if ($LASTEXITCODE) { throw "Frontend build failed." }
        Say "All checks passed. (No automated test suite yet.)" Green
    }

    "build" {
        Say "Building $Image (UI default language: $DefaultLanguage)..."
        # Context is the repo root: the single image needs backend\ and frontend\.
        # The root .dockerignore keeps node_modules, .venv and every .env* out of it.
        & docker build -f (Join-Path $Root "docker\Dockerfile") `
            --build-arg "VITE_DEFAULT_UI_LANGUAGE=$DefaultLanguage" `
            --build-arg "VITE_API_BASE_URL=" `
            -t $Image $Root
        if ($LASTEXITCODE) { throw "docker build failed." }
        $dist = Join-Path $Root "dist"
        New-Item -ItemType Directory -Force $dist | Out-Null
        $tar = Join-Path $dist ("sandtable-{0}.tar" -f (Get-Date -Format "yyyyMMdd-HHmm"))
        Say "Saving image to $tar ..."
        & docker save -o $tar $Image
        if ($LASTEXITCODE) { throw "docker save failed." }
        Say ("Done: {0} ({1:N0} MB)" -f $tar, ((Get-Item $tar).Length / 1MB)) Green
        Say "Copy to the target: the .tar, docker-compose.prod.yaml, .env.prod.example, config\, docs\DEPLOYMENT.md" Green
    }

    default { Get-Content $PSCommandPath -TotalCount 11 | ForEach-Object { $_ -replace "^# ?", "" } }
}
