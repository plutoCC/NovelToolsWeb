@echo off
setlocal
cd /d "%~dp0"

set "PYTHON_CMD="

where py >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON_CMD=py -3"
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    set "PYTHON_CMD=python"
  )
)

if not defined PYTHON_CMD (
  echo [Novel Tools] Python was not found.
  echo Please install Python 3.11 or newer and enable "Add Python to PATH".
  pause
  exit /b 1
)

echo [Novel Tools] Creating virtual environment...
%PYTHON_CMD% -m venv .venv
if errorlevel 1 (
  echo [Novel Tools] Failed to create virtual environment.
  pause
  exit /b 1
)

echo [Novel Tools] Upgrading pip...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
  echo [Novel Tools] Failed to upgrade pip.
  pause
  exit /b 1
)

echo [Novel Tools] Installing dependencies...
call ".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [Novel Tools] Failed to install dependencies.
  pause
  exit /b 1
)

echo.
echo [Novel Tools] Setup completed.
echo You can now start the app by double-clicking:
echo   Launch-Novel-Tools.vbs
echo   Launch-Novel-Tools.cmd
pause
exit /b 0
