# Credit research worker (runs on the Lenovo)

Claims jobs from 10bonds.com over HTTPS, collects public sources, asks the **local** Ollama to extract facts, and sends them back.
The website calculates IR / BR from those facts. Ollama's port 11434 is never opened to the internet; the worker only makes outbound calls.

Needs: Node 18+, Ollama running with one model pulled (`ollama list`). Optional: `pdftotext` (poppler) for PDF reports.

Settings (environment variables):

| Name | Meaning |
|---|---|
| `WORKER_TOKEN` | token from Admin > Credit Research > Create token |
| `OLLAMA_MODEL` | ignored: the worker always uses `qwen3:8b` and never loads any other model (no embedding model either) |
| `BONDS_URL` | default `https://10bonds.com` |
| `OLLAMA_URL` | default `http://127.0.0.1:11434` (refuses non-local addresses) |
| `NUM_CTX`, `NUM_PREDICT`, `MAX_DOCS`, `IDLE_SECONDS` | optional limits |
| `INFERENCE_TIMEOUT_S` | whole-answer limit, default 1800 (30 min); there is no shorter hidden limit |
| `OLLAMA_THINK` | `1` turns the model's thinking on; default off (thinking makes qwen3 models slow and breaks the JSON) |

## Install on the Lenovo (Windows, unattended 24/7)

Double-click `install-autostart.bat` once (it asks for administrator once). It runs `install-service.ps1`, which:

- copies only the reviewed `worker.mjs`, `package.json` and `run-worker.ps1` (their SHA-256 are pinned in the installer; a different file is refused);
- stores the token encrypted (Windows DPAPI) in `%USERPROFILE%\10bonds-worker\token.bin`, readable only by this account, SYSTEM and administrators, and removes the old plain-text `config.txt`;
- registers the task **10bonds credit worker**: starts at boot before anyone signs in, after resume from sleep and every 5 minutes as a watchdog; no time limit; restarts on failure; one copy only;
- removes the old sign-in shortcut; reports the sleep setting (changes it only with `-KeepAwakeOnAC`).

`run-worker.ps1` (started by the task) keeps one worker alive: it starts Ollama on 127.0.0.1 if it is not answering, restarts the worker with growing waits (10 s to 10 min, with jitter), pauses 30 min after 10 starts in 30 min, and writes `logs\worker.log` (5 MB, 3 old copies). It never downloads code.
The worker claims no job while Ollama or `qwen3:8b` is missing (it never pulls a model) and reports that to the site; a rejected token makes it wait 5 min, doubling to 1 hour, instead of restarting every 20 s.
To update: run the installer from the new release. To remove: `uninstall-autostart.bat`.

Check from anywhere: https://10bonds.com/api/credit-worker/status (connected, stage, jobs done, oldest queued job, alerts).

After changing `worker.mjs`, `package.json` or `run-worker.ps1`, run `node scripts/credit-worker/pin.mjs` (a test fails otherwise).

Run once by hand (development): `node scripts/credit-worker/worker.mjs`.
Linux: a systemd unit with `Restart=always` and `EnvironmentFile=` holding the settings above.

When the computer sleeps the worker stops claiming; the website shows it offline after 3 minutes and an unfinished job is handed out again after its 15-minute lease runs out. The site accepts each result once (a repeat of the same result is recognised; a job claimed by another worker is refused).
Pause/resume, retry and "Analyse now" are on Admin > Credit Research.
