@echo off
:: AHK Manager — Frontend-only Vite dev server (no Rust required)
:: Opens http://localhost:1420 — NOTE: Tauri features won't work in browser.
:: Use run-tauri.bat for the full desktop app.

title AHK Manager (Frontend Only)
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org/
    pause
    exit /b 1
)

echo ===========================================
echo  AHK Manager - Frontend Dev Server
echo  http://localhost:1420
echo ===========================================
echo  Press Ctrl+C to stop.
echo.

npm run dev
pause
