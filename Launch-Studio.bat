@echo off
title DLSS 5 Video Studio Launcher
cd /d "%~dp0"

echo ========================================================
echo    DLSS 5 Video Studio - RTX Neural Video Upscaler
echo ========================================================
echo [1/2] Checking Next.js Studio Server...

curl -s -o nul http://localhost:3000/api/telemetry
if %errorlevel% neq 0 (
    echo Starting Next.js Production UI Server in background...
    start /min "" cmd /c "cd /d %~dp0ui && npm run start"
    timeout /t 2 /nobreak >nul
) else (
    echo Next.js Production UI Server is active.
)

echo [2/2] Launching Native Desktop Window...
if exist "%~dp0DLSS5VideoStudioApp.exe" (
    start "" "%~dp0DLSS5VideoStudioApp.exe"
) else (
    start "" "%~dp0DLSS5VideoStudio.exe"
)

echo DLSS 5 Video Studio window launched!
exit /b 0
