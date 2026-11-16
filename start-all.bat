@echo off
title LUNA AI Full Ecosystem Launcher (Backend + Desktop + Mobile)
echo ========================================================
echo Starting LUNA AI Complete Ecosystem
echo Online + Offline + Windows Desktop + Android Mobile
echo ========================================================

:: 1. Launch Backend Core (Port 8000)
start "LUNA Core Backend" cmd /c "%~dp0run-backend.bat"

:: 2. Wait for backend to be ready
echo Initializing backend server...
timeout /t 3 /nobreak > nul

:: 3. Launch Desktop UI
start "LUNA Desktop Hologram" cmd /c "%~dp0run-desktop.bat"

:: 4. Launch Mobile Expo Server
start "LUNA Mobile Server" cmd /k "cd /d %~dp0apps\mobile && npx expo start"

echo ========================================================
echo ALL SYSTEMS LAUNCHED SUCCESSFULLY!
echo 1. Backend Core: http://127.0.0.1:8000
echo 2. Desktop Hologram: Running (Shortcut: Ctrl + Space)
echo 3. Mobile Metro: Scan QR code with Expo Go on Android
echo ========================================================
pause
