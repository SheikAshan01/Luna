@echo off
title LUNA AI - Desktop Holographic Interface
echo ========================================================
echo Launching LUNA AI Desktop UI...
echo ========================================================
cd /d %~dp0apps\desktop
call npm run electron:dev
pause
