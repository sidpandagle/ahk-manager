@echo off
setlocal EnableDelayedExpansion

title AHK Manager - Build

echo.
echo  =============================================
echo   AHK Manager - Production Build
echo  =============================================
echo.

:: ── Check Node ────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Install it from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

:: ── Check npm ─────────────────────────────────
where npm >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] npm not found.
    pause
    exit /b 1
)

:: ── Check Rust / Cargo ────────────────────────
where cargo >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Rust / Cargo not found. Install from https://rustup.rs
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('cargo --version') do set CARGO_VER=%%v
echo  [OK] %CARGO_VER%

:: ── Move to script directory ──────────────────
cd /d "%~dp0"
echo  [OK] Working directory: %CD%
echo.

:: ── Install / refresh npm deps ────────────────
echo  [1/2] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
)
echo.

:: ── Tauri production build ────────────────────
echo  [2/2] Building Tauri app (this may take a few minutes)...
call npm run tauri build
if errorlevel 1 (
    echo.
    echo  [ERROR] Build failed. Check the output above for details.
    pause
    exit /b 1
)

echo.
echo  =============================================
echo   Build complete!
echo  =============================================
echo.
echo  Installer(s) are in:
echo    src-tauri\target\release\bundle\nsis\
echo    src-tauri\target\release\bundle\msi\
echo.
echo  Standalone EXE:
echo    src-tauri\target\release\ahk-manager.exe
echo.

:: ── Open output folder ───────────────────────
set BUNDLE_DIR=%~dp0src-tauri\target\release\bundle
if exist "%BUNDLE_DIR%" (
    explorer "%BUNDLE_DIR%"
)

pause
endlocal
