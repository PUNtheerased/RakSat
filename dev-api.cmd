@echo off
title RakSat API :8787
cd /d "%~dp0"
if not exist "node_modules\" (
  echo Installing API dependencies...
  call npm install
)
echo.
echo  RakSat API  -^>  http://localhost:8787
echo.
call npm run dev
pause
