@echo off
echo Building wiki index...
echo.

cd /d "%~dp0.."
node Build/build-index.js

echo.
if %ERRORLEVEL% EQU 0 (
    echo Done! Press any key to exit.
) else (
    echo Error occurred! Press any key to exit.
)
pause >nul
