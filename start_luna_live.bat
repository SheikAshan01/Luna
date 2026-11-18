@echo off
title LUNA 24/7 Cloudflare Live Tunnel
color 0B
cd /d "%~dp0"
echo Starting Luna Live Cloudflare Tunnel...
python -u run_luna_live.py
pause
