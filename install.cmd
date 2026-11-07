@echo off
title RakSat Install
cd /d "%~dp0"

echo.
echo  Installing API dependencies...
call npm install
if errorlevel 1 goto :fail

echo.
echo  Installing Web dependencies...
cd web
call npm install
if errorlevel 1 goto :fail
cd ..

if not exist ".env" if exist ".env.example" (
  copy ".env.example" ".env" >nul
  echo  Created .env from .env.example — fill in real values.
)
if not exist "web\.env.local" if exist "web\.env.example" (
  copy "web\.env.example" "web\.env.local" >nul
  echo  Created web\.env.local from .env.example — fill in real values.
)

echo.
echo  Done. Next:
echo    1. Edit .env and web\.env.local
echo    2. Double-click dev-all.cmd  (or run npm run dev:all)
echo.
pause
exit /b 0

:fail
echo.
echo  Install failed.
pause
exit /b 1
