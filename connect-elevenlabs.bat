@echo off
title ElevenLabs Official One-Click Connect
echo ========================================================
echo Connecting ElevenLabs to LUNA AI...
echo A browser window will open. Click 'Authorize' to finish!
echo ========================================================
cd /d "%~dp0"
call npx -y @elevenlabs/cli@latest onboard connect --env-path .env
if exist .env (
    copy /y .env backend\.env > nul
)
echo.
echo ========================================================
echo ElevenLabs connection complete!
echo Your selected voice: Kristen (Qbw4VpyUrHEG7NigKzty)
echo ========================================================
pause
