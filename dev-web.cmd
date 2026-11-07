@echo off
title RakSat Web :3000
cd /d "%~dp0web"
if not exist "node_modules\" (
  echo Installing web dependencies...
  call npm install
)
if not exist ".env.local" if exist ".env.example" (
  echo WARNING: web\.env.local not found. Copy from .env.example first.
)
echo.
echo  RakSat Web  -^>  http://localhost:3000
echo.
call npm run dev
pause
