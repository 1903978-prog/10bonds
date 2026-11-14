# Stops the 10bonds credit worker and removes its scheduled task. The token, knowledge file and logs stay in %USERPROFILE%\10bonds-worker.
#Requires -RunAsAdministrator
$TaskName = '10bonds credit worker'
Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Stop-ScheduledTask -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ($_.CommandLine -like '*10bonds-worker*worker.mjs*' -or $_.CommandLine -like '*run-worker.ps1*') } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host 'The credit worker is stopped and will not start again by itself.'
