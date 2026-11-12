@echo off
rem One double-click (asks for administrator once): stops the credit worker and removes its task. Token, knowledge file and logs stay.
powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList -NoProfile -ExecutionPolicy Bypass -NoExit -File \"%~dp0uninstall-service.ps1\""
