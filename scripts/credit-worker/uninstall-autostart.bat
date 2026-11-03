@echo off
rem One double-click: stops the credit worker from starting at sign-in. Nothing else is deleted.
powershell -NoProfile -Command "$p=[Environment]::GetFolderPath('Startup')+'\10bonds credit worker.lnk'; if (Test-Path $p) { Remove-Item $p; Write-Host 'Autostart removed.' } else { Write-Host 'Autostart was not installed.' }"
pause
