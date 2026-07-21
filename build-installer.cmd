@echo off
setlocal
cd /d "%~dp0"

echo.
echo  === Building Baton installer ===
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed. See https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

call npm run dist
if errorlevel 1 (
  echo ERROR: Installer build failed.
  pause
  exit /b 1
)

echo.
echo  Done. Installers are in:
echo    %~dp0release\
echo.
echo  Copy the .exe to another PC and run it — no Node.js required there.
echo.
explorer "%~dp0release"
pause
