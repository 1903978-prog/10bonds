@echo off
rem One double-click: updates itself, remembers token and model, starts the credit worker.
setlocal
title 10bonds credit worker
set "DIR=%USERPROFILE%\10bonds-worker"
set "RAW=https://raw.githubusercontent.com/1903978-prog/10bonds/main/scripts/credit-worker"
if not exist "%DIR%" mkdir "%DIR%"
cd /d "%DIR%"

where node >nul 2>nul
if errorlevel 1 (
  echo Installing Node.js ...
  winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
  echo Node.js installed. Close this window and double-click the file again.
  pause
  exit /b 1
)

rem --- remembered settings ---
set "WORKER_TOKEN="
set "OLLAMA_MODEL="
if exist config.txt for /f "usebackq tokens=1,* delims==" %%A in ("config.txt") do (
  if /i "%%A"=="TOKEN" set "WORKER_TOKEN=%%B"
  if /i "%%A"=="MODEL" set "OLLAMA_MODEL=%%B"
)
if not defined WORKER_TOKEN (
  echo First start only: paste the worker token from 10bonds.com Admin ^> Credit Research ^> Create token, then press Enter.
  set /p "WORKER_TOKEN=Token: "
)
if not defined WORKER_TOKEN (echo No token given. & pause & exit /b 1)

:loop
rem --- Ollama running? ---
ollama list >nul 2>nul
if errorlevel 1 (
  start "" /min ollama serve
  timeout /t 10 /nobreak >nul
)
rem --- model: keep saved one, else qwen3:8b if installed, else the first installed ---
if not defined OLLAMA_MODEL (
  ollama list | findstr /b /i "qwen3:8b" >nul && set "OLLAMA_MODEL=qwen3:8b"
)
if not defined OLLAMA_MODEL (
  for /f "skip=1 tokens=1" %%M in ('ollama list') do if not defined OLLAMA_MODEL set "OLLAMA_MODEL=%%M"
)
if not defined OLLAMA_MODEL (echo No Ollama model installed. Run: ollama pull qwen3:8b & pause & exit /b 1)
> config.txt echo TOKEN=%WORKER_TOKEN%
>> config.txt echo MODEL=%OLLAMA_MODEL%

rem --- self-update (keeps the old copy if the download fails or looks wrong) ---
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%RAW%/worker.mjs' -OutFile worker.new -TimeoutSec 60; if ((Get-Item worker.new).Length -gt 10000) { Move-Item -Force worker.new worker.mjs } } catch { Write-Host 'Update skipped:' $_.Exception.Message }"
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%RAW%/package.json' -OutFile package.json -TimeoutSec 30 } catch {}"
if not exist node_modules\pdfjs-dist call npm install --silent --no-audit --no-fund >nul 2>nul

echo Checking the engine on the real LBBW H1 2026 reports (result in %DIR%\selftest-report.txt) ...
set "WORKER_DATA=%DIR%"
node worker.mjs --selftest
echo Starting worker with model %OLLAMA_MODEL% ...
node worker.mjs
echo Worker stopped. Restarting in 20 seconds (close this window to stop).
timeout /t 20 /nobreak >nul
goto loop
