@echo off
rem Replaced on 12 Nov 2026: the worker now runs as a Windows task (install-autostart.bat). This file no longer downloads code or keeps the token in plain text.
echo The credit worker is now installed with install-autostart.bat (runs at boot, before sign-in).
schtasks /Query /TN "10bonds credit worker" >nul 2>nul && (schtasks /Run /TN "10bonds credit worker" & echo Started the installed task.) || (echo Not installed yet: double-click install-autostart.bat.)
pause
