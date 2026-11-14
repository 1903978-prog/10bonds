# 10bonds credit worker: supervisor started by the Windows scheduled task "10bonds credit worker" (install-service.ps1).
# Runs before anyone signs in, keeps exactly one worker alive, restarts it after a crash, a network loss or a resume from sleep,
# and never downloads code: it only runs the reviewed worker.mjs whose SHA-256 the installer recorded.
# Ollama stays on 127.0.0.1 only. Only qwen3:8b is ever used; this script never pulls or loads a model.
$ErrorActionPreference = 'Continue'
$Dir = $PSScriptRoot
$LogDir = Join-Path $Dir 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir 'worker.log'
$MaxLogBytes = 5MB
$KeepLogs = 3

function Write-Log([string]$line) {
  try {
    if ((Test-Path $Log) -and (Get-Item $Log).Length -gt $MaxLogBytes) {
      for ($i = $KeepLogs - 1; $i -ge 1; $i--) {
        $from = Join-Path $LogDir "worker.$i.log"; $to = Join-Path $LogDir ("worker." + ($i + 1) + ".log")
        if (Test-Path $from) { Move-Item -Force $from $to }
      }
      Move-Item -Force $Log (Join-Path $LogDir 'worker.1.log')
    }
    Add-Content -Path $Log -Value ((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') + ' ' + $line)
  } catch { }
}

# One copy only: the task fires at startup, on resume and every 5 minutes as a watchdog; extra copies leave at once.
$mutex = New-Object System.Threading.Mutex($false, 'Global\10bonds-credit-worker')
$owned = $false
try { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }
if (-not $owned) { exit 0 }

$settingsFile = Join-Path $Dir 'settings.json'
if (-not (Test-Path $settingsFile)) { Write-Log 'settings.json missing: run install-service.ps1 again'; Start-Sleep -Seconds 1800; exit 3 }
$settings = Get-Content -Raw $settingsFile | ConvertFrom-Json

function Read-Token {
  $file = Join-Path $Dir 'token.bin'
  if (-not (Test-Path $file)) { return $null }
  try {
    Add-Type -AssemblyName System.Security
    $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($file), [Text.Encoding]::UTF8.GetBytes('10bonds-credit-worker'), [System.Security.Cryptography.DataProtectionScope]::LocalMachine)
    return [Text.Encoding]::UTF8.GetString($bytes)
  } catch { Write-Log ('token could not be read: ' + $_.Exception.Message); return $null }
}

function Test-WorkerCode {
  $h = (Get-FileHash -Algorithm SHA256 (Join-Path $Dir 'worker.mjs')).Hash.ToLower()
  return $h -eq $settings.workerSha256
}

function Test-Ollama {
  try { Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 5 | Out-Null; return $true } catch { return $false }
}

function Start-Ollama {
  if (Test-Ollama) { return $true }
  if (-not $settings.ollama -or -not (Test-Path $settings.ollama)) { Write-Log 'Ollama is not installed where the installer found it'; return $false }
  Write-Log 'Ollama not answering: starting it (local address only)'
  $env:OLLAMA_HOST = '127.0.0.1:11434'
  Start-Process -FilePath $settings.ollama -ArgumentList 'serve' -WindowStyle Hidden | Out-Null
  for ($i = 0; $i -lt 12; $i++) { Start-Sleep -Seconds 5; if (Test-Ollama) { Write-Log 'Ollama is answering'; return $true } }
  Write-Log 'Ollama did not start within 60 s'
  return $false
}

# Wait doubles per quick failure up to 10 minutes, +/-25% jitter.
function Get-Backoff([int]$n) {
  $base = [Math]::Min(600, 10 * [Math]::Pow(2, [Math]::Max(0, $n - 1)))
  return [int]($base * (0.75 + 0.5 * (Get-Random -Minimum 0.0 -Maximum 1.0)))
}

Write-Log ('supervisor started on ' + $env:COMPUTERNAME + ' (pid ' + $PID + ')')
$starts = @()
$quickFails = 0
while ($true) {
  $token = Read-Token
  if (-not $token) { Write-Log 'no worker token: run install-service.ps1 with a new token; checking again in 30 min'; Start-Sleep -Seconds 1800; continue }
  if (-not (Test-WorkerCode)) { Write-Log 'worker.mjs does not match the reviewed copy: not started. Run install-service.ps1 again; checking again in 30 min'; Start-Sleep -Seconds 1800; continue }
  # The worker itself refuses jobs while Ollama or qwen3:8b is missing and reports it to the site; here we only try to bring Ollama up.
  Start-Ollama | Out-Null

  # Runaway guard: 10 starts in 30 minutes means something is wrong that restarting will not fix.
  $now = Get-Date
  $starts = @($starts | Where-Object { $_ -gt $now.AddMinutes(-30) })
  if ($starts.Count -ge 10) { Write-Log 'restart loop: 10 starts in 30 min, pausing 30 min'; Start-Sleep -Seconds 1800; $starts = @(); continue }
  $starts += $now

  $env:WORKER_TOKEN = $token
  $env:WORKER_DATA = $Dir
  $env:OLLAMA_URL = 'http://127.0.0.1:11434'
  Write-Log 'starting worker'
  $began = Get-Date
  & $settings.node (Join-Path $Dir 'worker.mjs') 2>&1 | ForEach-Object { Write-Log ([string]$_) }
  $code = $LASTEXITCODE
  $env:WORKER_TOKEN = $null
  $ran = ((Get-Date) - $began).TotalMinutes
  if ($ran -ge 5) { $quickFails = 0 } else { $quickFails++ }
  $wait = if ($code -eq 0 -and $quickFails -eq 0) { 5 } else { Get-Backoff $quickFails }
  Write-Log ('worker exited with code ' + $code + ' after ' + [int]$ran + ' min; restarting in ' + $wait + ' s')
  Start-Sleep -Seconds $wait
}
