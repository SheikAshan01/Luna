@echo off
title LUNA AI Master Launcher
echo ========================================================
echo Launching LUNA AI (Backend + Desktop App)...
echo ========================================================

start "LUNA Core Backend" cmd /c "%~dp0run-backend.bat"

echo Waiting for backend server to initialize...
timeout /t 3 /nobreak > nul

start "LUNA Desktop Hologram" cmd /c "%~dp0run-desktop.bat"

echo All LUNA systems running!
