# Credit research worker (runs on the Lenovo)

Claims jobs from 10bonds.com over HTTPS, collects public sources, asks the **local** Ollama to extract facts, and sends them back.
The website calculates IR / BR from those facts. Ollama's port 11434 is never opened to the internet; the worker only makes outbound calls.

Needs: Node 18+, Ollama running with one model pulled (`ollama list`). Optional: `pdftotext` (poppler) for PDF reports.

Settings (environment variables):

| Name | Meaning |
|---|---|
| `WORKER_TOKEN` | token from Admin > Credit Research > Create token |
| `OLLAMA_MODEL` | ignored: the worker always uses `qwen3:8b` (Livio, 04 Nov 2026) |
| `BONDS_URL` | default `https://10bonds.com` |
| `OLLAMA_URL` | default `http://127.0.0.1:11434` (refuses non-local addresses) |
| `NUM_CTX`, `NUM_PREDICT`, `MAX_DOCS`, `IDLE_SECONDS` | optional limits |
| `INFERENCE_TIMEOUT_S` | whole-answer limit, default 1800 (30 min); there is no shorter hidden limit |
| `OLLAMA_THINK` | `1` turns the model's thinking on; default off (thinking makes qwen3 models slow and breaks the JSON) |

**Easiest (Windows): double-click `start-worker.bat`** (download it from https://raw.githubusercontent.com/1903978-prog/10bonds/main/scripts/credit-worker/start-worker.bat). It installs nothing else, updates `worker.mjs` itself at every start, remembers the token (asked once) and the model in `%USERPROFILE%\10bonds-worker\config.txt`, starts Ollama if needed and restarts the worker if it stops.

Run once by hand: `node scripts/credit-worker/worker.mjs`.

Start at boot:
- Windows: Task Scheduler > Create Task > Trigger "At startup" > Action `node.exe` with argument `C:\path\to\10bonds\scripts\credit-worker\worker.mjs`; set the variables in a small `run.cmd` (`set WORKER_TOKEN=...`) and point the task at it. Tick "Restart if the task fails".
- Linux: a systemd unit with `Restart=always` and `EnvironmentFile=` holding the settings above.

When the computer sleeps the worker stops claiming; the website shows it offline after 3 minutes and an unfinished job is handed out again after its 15-minute lease runs out.
Pause/resume, retry and "Analyse now" are on Admin > Credit Research.

## Autostart at Windows sign-in

Double-click `install-autostart.bat` once (it puts a minimized shortcut to `start-worker.bat` in the Startup folder and starts the worker). Double-click `uninstall-autostart.bat` to undo it.
