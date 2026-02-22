@echo off
echo ================================================
echo    KAREERIST STUDIO — Starting Frontend
echo ================================================

cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting dev server on http://localhost:8080
echo.
call npm run dev
