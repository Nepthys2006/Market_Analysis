@echo off
title Stock Exchange Pro - Public Server
color 0A

echo.
echo ============================================================
echo    STOCK EXCHANGE PRO - PUBLIC ACCESS SERVER
echo ============================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Change to script directory
cd /d "%~dp0"

:: Install dependencies
echo [INFO] Installing dependencies...
pip install fastapi uvicorn httpx requests >nul 2>&1

echo.
echo ============================================================
echo    SERVER IS STARTING!
echo ============================================================
echo.
echo    Local Access:   http://localhost:8000
echo.
echo    For PUBLIC ACCESS, open another terminal and run:
echo      ngrok http 8000
echo.
echo    Then share the ngrok URL with others!
echo    (e.g., https://abc123.ngrok-free.app)
echo.
echo    Make sure Ollama is running for AI Council:
echo      ollama serve
echo.
echo    Press Ctrl+C to stop the server
echo ============================================================
echo.

:: Start the server with public binding
python -m uvicorn server:app --host 0.0.0.0 --port 8000

pause
