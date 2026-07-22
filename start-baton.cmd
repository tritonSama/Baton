@echo off
cd /d "%~dp0"

if not exist "package.json" (
  echo ERROR: Run this inside the cloned Baton repo folder.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Dependencies missing — running setup first...
  call "%~dp0setup.cmd"
  if errorlevel 1 exit /b 1
)

echo Starting Baton...
call npm run dev
