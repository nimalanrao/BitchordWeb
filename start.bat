@echo off
title BitChord Web Player
cd /d "%~dp0"

echo ===================================================
echo             Starting BitChord Web Player           
echo ===================================================
echo.

where pnpm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using pnpm...
    pnpm dev
) else (
    where npm >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo pnpm not found in PATH, using npm...
        npm run dev
    ) else (
        echo [ERROR] Neither pnpm nor npm was found. Please make sure Node.js is installed.
        pause
    )
)
