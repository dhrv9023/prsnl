@echo off
echo ============================================
echo    KAREERIST - Starting All Services
echo ============================================
echo.

:: Start Backend (FastAPI)
echo [1/2] Starting Backend (FastAPI on port 8000)...
cd /d "d:\kareer\kareerist-studio\backend\Jobify"
start "Kareerist Backend" cmd /k "python -m uvicorn app.main:app --reload --port 8000"

:: Small delay to let backend start first
timeout /t 3 /nobreak > nul

:: Start Frontend (Vite on port 8080)
echo [2/2] Starting Frontend (Vite on port 8080)...
cd /d "d:\kareer\kareerist-studio"
start "Kareerist Frontend" cmd /k "node_modules\.bin\vite --port 8080"

echo.
echo ============================================
echo    Both services are starting!
echo    Frontend: http://localhost:8080
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo ============================================
echo.
echo Close this window anytime. The services
echo will keep running in their own windows.
pause
