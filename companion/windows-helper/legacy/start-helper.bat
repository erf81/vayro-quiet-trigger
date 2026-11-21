@echo off
REM Copyright 2026 erf81
REM SPDX-License-Identifier: Apache-2.0
REM LEGACY DEV LAUNCHER — End users should install Quiet Trigger Setup (QuietTriggerHelper.exe).
setlocal
echo Starting Quiet Trigger local loopback bridge (127.0.0.1:47821)...
start "Quiet Trigger Bridge" /min node "%~dp0..\..\bridge\bridge-server.js"
timeout /t 2 /nobreak >nul
echo Starting Quiet Trigger floating palette helper (Ctrl+Alt+Space)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\quiet-trigger-palette.ps1" %*
