@echo off
setlocal
cd /d "%~dp0"

echo.
echo  === Baton setup (from GitHub clone) ===
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo NOTE: git not found in PATH. That is OK if you already cloned.
) else (
  git --version
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo 1. Download LTS from https://nodejs.org/
  echo 2. Install it, then reopen this window
  echo 3. Run setup.cmd again
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Found Node %NODE_VER%

node -e "const m=+process.versions.node.split('.')[0]; if(m<20){console.error('ERROR: Need Node 20+. You have '+process.version); process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: package.json missing.
  echo Clone https://github.com/tritonSama/Baton.git and run setup.cmd inside that folder.
  pause
  exit /b 1
)

echo.
echo Installing dependencies (first time can take a few minutes)...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed. Check your network and try again.
  pause
  exit /b 1
)

echo.
echo Running tests...
call npm test
if errorlevel 1 (
  echo WARNING: Some tests failed. You can still try: start-baton.cmd
) else (
  echo Tests passed.
)

echo.
echo  Setup complete.
echo.
echo  Next:  double-click start-baton.cmd
echo     or: npm run dev
echo.
echo  Build Windows installer:  build-installer.cmd
echo.
pause
