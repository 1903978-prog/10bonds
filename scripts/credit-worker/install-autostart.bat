@echo off
rem One double-click: makes the credit worker start by itself at every Windows sign-in.
setlocal
set "DIR=%USERPROFILE%\10bonds-worker"
set "RAW=https://raw.githubusercontent.com/1903978-prog/10bonds/main/scripts/credit-worker"
if not exist "%DIR%" mkdir "%DIR%"
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing '%RAW%/start-worker.bat' -OutFile '%DIR%\start-worker.bat' -TimeoutSec 60; Invoke-WebRequest -UseBasicParsing '%RAW%/uninstall-autostart.bat' -OutFile '%DIR%\uninstall-autostart.bat' -TimeoutSec 60 } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }"
if errorlevel 1 (pause & exit /b 1)
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\10bonds credit worker.lnk'); $s.TargetPath=$env:USERPROFILE+'\10bonds-worker\start-worker.bat'; $s.WorkingDirectory=$env:USERPROFILE+'\10bonds-worker'; $s.WindowStyle=7; $s.Save()"
if errorlevel 1 (echo Could not create the startup shortcut. & pause & exit /b 1)
rem Never sleep or hibernate while on mains power (the worker must run 24/7).
powercfg /change standby-timeout-ac 0 >nul 2>nul
powercfg /change hibernate-timeout-ac 0 >nul 2>nul
echo.
echo Done. The credit worker will now start by itself every time you sign in to Windows.
echo Starting it now ...
start "" /min "%DIR%\start-worker.bat"
timeout /t 5 /nobreak >nul
