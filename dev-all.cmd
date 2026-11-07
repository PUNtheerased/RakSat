@echo off
title RakSat Dev Launcher
cd /d "%~dp0"

echo.
echo  Starting RakSat: API + Web + Worker
echo  -------------------------------------
echo  API     http://localhost:8787
echo  Web     http://localhost:3000
echo  Worker  reminders / LINE / push
echo.

start "RakSat API :8787" cmd /k "%~dp0dev-api.cmd"
timeout /t 2 /nobreak >nul
start "RakSat Web :3000" cmd /k "%~dp0dev-web.cmd"
timeout /t 1 /nobreak >nul
start "RakSat Worker" cmd /k "%~dp0dev-worker.cmd"

echo  Opened 3 terminal windows.
echo  Close those windows to stop each process.
echo.
pause
