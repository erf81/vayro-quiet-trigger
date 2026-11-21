@echo off
title ZAU Console - Windows Hotkey Helper
echo Starting ZAU Console Local Loopback Bridge (127.0.0.1:47821)...
start "ZAU Bridge Server" cmd /k node "%~dp0bridge-server.js"
timeout /t 2 /nobreak >nul
echo Starting ZAU Console Hotkey Listener (Default: Ctrl+Alt+Space when Photoshop is active)...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0zau-palette.ps1" -Hotkey "Ctrl+Alt+Space"
