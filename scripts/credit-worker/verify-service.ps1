# 10BONDS Lenovo: read-only post-install verification.
# Usage (on Lenovo, standard PowerShell session):
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\verify-service.ps1
# This script NEVER installs, starts, stops, updates or downloads anything.
# No tokens, keys, model contents or user files are printed.
$ErrorActionPreference = 'Continue'

$workerDir = Join-Path $env:USERPROFILE '10bonds-worker'
$taskName = '10bonds credit worker'
$summary = [ordered]@{
  checkedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
  machine = $env:COMPUTERNAME
  installed = $false
  taskState = 'missing'
  taskLogonType = $null
  taskLastResult = $null
  taskLastRunUtc = $null
  taskAtBoot = $false
  taskWatchdog = $false
  taskOnResume = $false
  settingsPresent = $false
  workerFilePresent = $false
  workerHashMatchesInstalledPin = $false
  tokenFilePresent = $false
  nodeAvailable = $false
  ollamaReachable = $false
  qwen3_8bPresent = $false
  publicEndpointReachable = $false
  anyWorkerConnected = $null
  publicWorkerVersion = $null
  jobsDoneLast24h = $null
  queueSize = $null
  alerts = @()
  localConfigurationHealthy = $false
  note = 'A local configuration check does not prove 24/7 uptime, reboot recovery or successful job completion.'
}

try {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  $summary.installed = $true
  $summary.taskState = [string]$task.State
  $summary.taskLogonType = [string]$task.Principal.LogonType
  foreach ($trigger in $task.Triggers) {
    # Scheduled Task CIM classes use type-specific properties; avoid depending
    # on localized display strings or reading any credentials.
    $class = [string]$trigger.CimClass.CimClassName
    if ($class -match 'BootTrigger') { $summary.taskAtBoot = $true }
    if ($class -match 'TimeTrigger' -and $trigger.Repetition.Interval) {
      $summary.taskWatchdog = $true
    }
    if ($class -match 'EventTrigger') { $summary.taskOnResume = $true }
  }
  try {
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction Stop
    $summary.taskLastResult = $taskInfo.LastTaskResult
    if ($taskInfo.LastRunTime -and $taskInfo.LastRunTime.Year -gt 2000) {
      $summary.taskLastRunUtc = $taskInfo.LastRunTime.ToUniversalTime().ToString('o')
    }
  } catch {}
} catch {}

$settingsFile = Join-Path $workerDir 'settings.json'
$workerFile = Join-Path $workerDir 'worker.mjs'
$tokenFile = Join-Path $workerDir 'token.bin'
$summary.settingsPresent = Test-Path $settingsFile
$summary.workerFilePresent = Test-Path $workerFile
$summary.tokenFilePresent = Test-Path $tokenFile
if ($summary.settingsPresent) {
  try {
    $config = Get-Content -Raw $settingsFile -ErrorAction Stop | ConvertFrom-Json
    if ($summary.workerFilePresent -and [string]$config.workerSha256 -match '^[0-9a-fA-F]{64}$') {
      $actual = (Get-FileHash -Algorithm SHA256 $workerFile -ErrorAction Stop).Hash
      $summary.workerHashMatchesInstalledPin = ($actual -ieq $config.workerSha256)
    }
    if ($config.node -and (Test-Path $config.node)) { $summary.nodeAvailable = $true }
  } catch {}
}

try {
  $status = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -Method Get -TimeoutSec 5 -ErrorAction Stop
  $summary.ollamaReachable = $true
  $summary.qwen3_8bPresent = @($status.models | Where-Object { $_.name -eq 'qwen3:8b' }).Count -gt 0
} catch {}

# Public endpoint describes the *most recent worker*, not necessarily
# THIS Lenovo. Never equate its connected=true flag to a local acceptance pass.
try {
  $remote = Invoke-RestMethod -Uri 'https://10bonds.com/api/credit-worker/status' -Method Get -TimeoutSec 15 -ErrorAction Stop
  $summary.publicEndpointReachable = $true
  $summary.anyWorkerConnected = [bool]$remote.connected
  $summary.publicWorkerVersion = if ($remote.version) { [string]$remote.version } else { $null }
  $summary.jobsDoneLast24h = $remote.jobsDoneLast24h
  $summary.queueSize = $remote.queued
  $summary.alerts = @($remote.alerts)
} catch {}

$summary.localConfigurationHealthy = (
  $summary.installed -and
  $summary.taskLogonType -eq 'S4U' -and
  $summary.taskAtBoot -and
  $summary.taskWatchdog -and
  $summary.taskOnResume -and
  $summary.settingsPresent -and
  $summary.workerFilePresent -and
  $summary.workerHashMatchesInstalledPin -and
  $summary.tokenFilePresent -and
  $summary.nodeAvailable -and
  $summary.ollamaReachable -and
  $summary.qwen3_8bPresent
)

$summary | ConvertTo-Json -Depth 5
if (-not $summary.localConfigurationHealthy) { exit 2 }
exit 0
