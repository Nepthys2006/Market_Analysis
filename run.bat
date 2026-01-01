@echo off
title Stock Exchange Pro - AI Trading Platform
color 0A

echo.
echo ============================================================
echo    STOCK EXCHANGE PRO - AI TRADING ANALYSIS PLATFORM
echo ============================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

:: Change to script directory
cd /d "%~dp0"

:: Install dependencies if needed
echo [INFO] Checking dependencies...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing required packages...
    pip install fastapi uvicorn httpx requests
)

echo.
echo [INFO] Starting Stock Exchange Pro server...
echo [INFO] Frontend will be available at: http://localhost:8000
echo [INFO] Press Ctrl+C to stop the server
echo.
echo ============================================================
echo.

:: Start the server
python server.py

pause
