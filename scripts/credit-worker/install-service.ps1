# 10bonds credit worker: one-time installer for unattended 24/7 running on the Lenovo. Run once as administrator
# (install-autostart.bat does that with one double-click). Running it again updates the worker to this reviewed release.
#
# What it does:
#  1. Copies the reviewed worker files into %USERPROFILE%\10bonds-worker, only if their SHA-256 matches the pins below
#     (from this folder, or downloaded and checked). Nothing is ever downloaded again at restart.
#  2. Stores the worker token encrypted (Windows DPAPI, machine scope) in token.bin, readable only by this account,
#     SYSTEM and administrators. The old plain-text config.txt is removed.
#  3. Registers the scheduled task "10bonds credit worker": starts at boot BEFORE anyone signs in, after resume from sleep,
#     and every 5 minutes as a watchdog; runs as this account without a stored password (S4U); no time limit;
#     restarts on failure; only one copy at a time.
#  4. Removes the old sign-in shortcut and stops the old window loop.
#  5. Reports the sleep setting. It changes the power plan only with -KeepAwakeOnAC.
# It never installs, pulls or loads a model and never opens Ollama to the network.
#Requires -RunAsAdministrator
param(
  [string]$Token = '',
  [switch]$KeepAwakeOnAC,
  [string]$Ref = 'main'
)
$ErrorActionPreference = 'Stop'

# Reviewed release: SHA-256 of each file (lower case). lib/creditWorkerService.test.ts fails when a file changes without its pin.
$Pins = [ordered]@{
  'worker.mjs'     = '8b4913b684d9d7aa705237542e3dad00499cec70aa378347b8166c14a6577e5a'
  'package.json'   = '4be4bd19e681457db42a1a993bf7ea46452bd282f0dbfb8a47cae879e10981dc'
  'run-worker.ps1' = '1e461a6980ba47315f6303b7961e26728e013f8a6b2c72fdda053eafadc2ce88'
}
$TaskName = '10bonds credit worker'
$Dir = Join-Path $env:USERPROFILE '10bonds-worker'
$Raw = "https://raw.githubusercontent.com/1903978-prog/10bonds/$Ref/scripts/credit-worker"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Dir 'logs') | Out-Null

function Get-Sha([string]$path) { (Get-FileHash -Algorithm SHA256 $path).Hash.ToLower() }

# 1. Reviewed files only.
$staging = Join-Path $Dir 'staging'
New-Item -ItemType Directory -Force -Path $staging | Out-Null
foreach ($name in $Pins.Keys) {
  $target = Join-Path $staging $name
  $local = Join-Path $PSScriptRoot $name
  if ((Test-Path $local) -and ((Get-Sha $local) -eq $Pins[$name])) { Copy-Item -Force $local $target }
  else { Invoke-WebRequest -UseBasicParsing -Uri "$Raw/$name" -OutFile $target -TimeoutSec 60 }
  if ((Get-Sha $target) -ne $Pins[$name]) { throw "$name does not match the reviewed release (SHA-256). Nothing was changed. Download the installer again from the same release." }
}

# 2. Token: given, or moved out of the old config.txt, or kept, or asked once.
$tokenFile = Join-Path $Dir 'token.bin'
$oldConfig = Join-Path $Dir 'config.txt'
if (-not $Token -and (Test-Path $oldConfig)) {
  $line = Get-Content $oldConfig | Where-Object { $_ -match '^TOKEN=' } | Select-Object -First 1
  if ($line) { $Token = $line.Substring(6).Trim() }
}
if (-not $Token -and -not (Test-Path $tokenFile)) {
  $sec = Read-Host -AsSecureString 'Paste the worker token from 10bonds.com Admin > Credit Research > Create token'
  $Token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
if ($Token) {
  if ($Token -notmatch '^[A-Za-z0-9_\-\.]{10,200}$') { throw 'That does not look like a worker token. Nothing was changed.' }
  Add-Type -AssemblyName System.Security
  $enc = [System.Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($Token), [Text.Encoding]::UTF8.GetBytes('10bonds-credit-worker'), [System.Security.Cryptography.DataProtectionScope]::LocalMachine)
  [IO.File]::WriteAllBytes($tokenFile, $enc)
  $Token = $null
}
if (-not (Test-Path $tokenFile)) { throw 'No worker token. Nothing was started.' }
# Only this account, SYSTEM and administrators may read the token file.
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $tokenFile /inheritance:r /grant:r "${me}:(R,W)" 'SYSTEM:(F)' '*S-1-5-32-544:(F)' | Out-Null
if (Test-Path $oldConfig) { Set-Content -Path $oldConfig -Value ('x' * 200); Remove-Item -Force $oldConfig }

# Stop the old window loop and the running worker before swapping files.
Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Stop-ScheduledTask -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -like '*10bonds-worker*worker.mjs*' -or $_.CommandLine -like '*start-worker.bat*' -or $_.CommandLine -like '*run-worker.ps1*') } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
foreach ($name in $Pins.Keys) { Move-Item -Force (Join-Path $staging $name) (Join-Path $Dir $name) }
Remove-Item -Force -Recurse $staging

# pdfjs-dist (PDF reading) from the pinned package.json, once.
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw 'Node.js is not installed. Install it (winget install -e --id OpenJS.NodeJS.LTS) and run this again.' }
if (-not (Test-Path (Join-Path $Dir 'node_modules\pdfjs-dist'))) { Push-Location $Dir; try { & (Join-Path (Split-Path $node) 'npm.cmd') install --silent --no-audit --no-fund | Out-Null } finally { Pop-Location } }
$ollama = (Get-Command ollama -ErrorAction SilentlyContinue).Source
if (-not $ollama) { Write-Warning 'Ollama was not found. The worker will wait (and claim no job) until Ollama answers on 127.0.0.1:11434.' }
@{ node = $node; ollama = $ollama; workerSha256 = $Pins['worker.mjs']; installedAt = (Get-Date).ToUniversalTime().ToString('o'); ref = $Ref } |
  ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $Dir 'settings.json')

# 3. The task.
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $Dir 'run-worker.ps1') + '"') -WorkingDirectory $Dir
$atBoot = New-ScheduledTaskTrigger -AtStartup
$watchdog = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$cls = Get-CimClass -ClassName MSFT_TaskEventTrigger -Namespace Root/Microsoft/Windows/TaskScheduler
$onResume = New-CimInstance -CimClass $cls -ClientOnly
$onResume.Enabled = $true
$onResume.Subscription = "<QueryList><Query Id='0' Path='System'><Select Path='System'>*[System[Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and EventID=1]]</Select></Query></QueryList>"
$principal = New-ScheduledTaskPrincipal -UserId $me -LogonType S4U -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($atBoot, $watchdog, $onResume) -Principal $principal -Settings $settings -Force | Out-Null

# 4. The old sign-in shortcut is replaced by the task.
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) '10bonds credit worker.lnk'
if (Test-Path $lnk) { Remove-Item -Force $lnk }

# 5. Sleep: report; change only when asked.
$acSleep = (powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE | Select-String 'Current AC Power Setting Index' | ForEach-Object { [Convert]::ToInt32(($_ -split ':')[1].Trim(), 16) }) | Select-Object -First 1
if ($KeepAwakeOnAC) { powercfg /change standby-timeout-ac 0; Write-Host 'Sleep on mains power: off (changed because -KeepAwakeOnAC was given).' }
elseif ($acSleep -gt 0) { Write-Warning ("This computer sleeps after $([int]($acSleep / 60)) min on mains power; the worker stops while it sleeps and resumes after. Run again with -KeepAwakeOnAC to keep it awake on mains power.") }

Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 20
$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "Installed. Task state: $((Get-ScheduledTask -TaskName $TaskName).State), last result $($info.LastTaskResult). Log: $Dir\logs\worker.log"
Write-Host 'Check from anywhere: https://10bonds.com/api/credit-worker/status (connected, stage, jobs done, alerts).'
