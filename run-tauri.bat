@echo off
:: AHK Manager — Full Tauri app (Rust + React, hot-reload native window)
:: Double-click to launch. First run compiles Rust (~2-3 min); subsequent runs are faster.

title AHK Manager
cd /d "%~dp0"

:: Ensure Cargo is on PATH (rustup installs to %USERPROFILE%\.cargo\bin)
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Download from https://nodejs.org/
    pause
    exit /b 1
)

:: Check Cargo
where cargo >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Cargo not found. Install Rust from https://rustup.rs/
    pause
    exit /b 1
)

echo ===========================================
echo  AHK Manager - Starting Tauri dev server
echo ===========================================
echo  First run compiles Rust (may take 2-3 min)
echo  Press Ctrl+C to stop.
echo.

npm run tauri dev
pause
