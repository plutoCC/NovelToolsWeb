@echo off
setlocal
cd /d "%~dp0"

set "SITE_URL=http://127.0.0.1:8000"
set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
set "LOG_FILE=%~dp0server.log"

if not exist "%PYTHON_EXE%" (
  echo [Novel Tools] Python virtual environment not found:
  echo %PYTHON_EXE%
  echo.
  echo Please run Setup-Novel-Tools.cmd first.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $resp = Invoke-WebRequest -Uri '%SITE_URL%/api/health' -UseBasicParsing -TimeoutSec 2; if ($resp.StatusCode -eq 200) { exit 0 } } catch {}; exit 1"

if errorlevel 1 (
  start "NovelToolsServer" /min cmd.exe /c ""%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 1>>"%LOG_FILE%" 2>&1"

  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline=(Get-Date).AddSeconds(20); do { try { $resp = Invoke-WebRequest -Uri '%SITE_URL%/api/health' -UseBasicParsing -TimeoutSec 2; if ($resp.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $deadline); exit 1"

  if errorlevel 1 (
    echo [Novel Tools] Server failed to start within 20 seconds.
    echo Check the log file for details:
    echo %LOG_FILE%
    pause
    exit /b 1
  )
)

start "" "%SITE_URL%/"
exit /b 0
