@echo off
title RakSat Worker
cd /d "%~dp0"
if not exist "node_modules\" (
  echo Installing API dependencies...
  call npm install
)
echo.
echo  RakSat Worker  -^>  reminders / LINE / push
echo.
call npm run worker
pause
