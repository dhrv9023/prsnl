@echo off
title Kareerist Studio — Launcher
echo ================================================
echo    KAREERIST STUDIO — Starting All Services
echo ================================================
echo.

set ROOT=%~dp0

REM ── Backend ──────────────────────────────────────────────────────────────
echo [1/2] Starting Backend  (http://localhost:8000)
start "Kareerist — Backend" cmd /k ^
  "cd /d "%ROOT%backend" && (if not exist .venv (echo [setup] Creating virtual environment... && py -3.14 -m venv .venv && echo [setup] Installing dependencies... && .venv\Scripts\pip install -r requirements.txt -q)) && echo [ok] Starting FastAPI server... && .venv\Scripts\python.exe -m uvicorn app.main:app --reload"

REM Give backend a head start
timeout /t 3 /nobreak >nul

REM ── Frontend ─────────────────────────────────────────────────────────────
echo [2/2] Starting Frontend (http://localhost:8080)
start "Kareerist — Frontend" cmd /k ^
  "cd /d "%ROOT%frontend" && (if not exist node_modules (echo [setup] Installing npm packages... && npm install)) && npm run dev"

echo.
echo ================================================
echo  Both services are starting in separate windows.
echo  Backend   ->  http://localhost:8000
echo  Frontend  ->  http://localhost:8080
echo ================================================
echo.
echo  Close this window whenever you like.
pause
