@echo off
rem One double-click (asks for administrator once): installs the credit worker as a Windows task that starts at boot,
rem before anyone signs in, restarts by itself and runs only the reviewed worker code. Run it again to update.
powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList -NoProfile -ExecutionPolicy Bypass -NoExit -File \"%~dp0install-service.ps1\""
