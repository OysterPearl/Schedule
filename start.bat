@echo off
setlocal

rem Agenda - start the FastAPI backend (serves API + frontend, auto-reload on code changes)
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo [setup] Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 goto :error
    echo [setup] Installing dependencies...
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 goto :error
)

echo.
echo Starting Agenda at http://127.0.0.1:8000 (auto-reload enabled)
echo Press Ctrl+C to stop.
echo.
".venv\Scripts\python.exe" run.py
if errorlevel 1 goto :error

exit /b 0

:error
echo.
echo Failed to start the backend. Check the messages above.
pause
exit /b 1
