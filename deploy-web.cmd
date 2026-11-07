@echo off
title RakSat Deploy Web (Vercel)
cd /d "%~dp0web"

echo.
echo  Deploy RakSat web to Vercel
echo  ---------------------------
echo  1) Browser will open for login — use EMAIL or Google
echo     DO NOT click Continue with GitHub on that error page.
echo  2) After login, answer prompts (link project / env later)
echo.

call npx vercel login
if errorlevel 1 goto :fail

echo.
echo  Logged in. Starting deploy from web\ ...
call npx vercel
if errorlevel 1 goto :fail

echo.
echo  Done. For production: npx vercel --prod
echo.
pause
exit /b 0

:fail
echo.
echo  Failed. See messages above.
pause
exit /b 1
