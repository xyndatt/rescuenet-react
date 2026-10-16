@echo off
title RescueNet setup
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then run this file again.
  pause
  exit /b 1
)
cd /d "%~dp0"
node scripts\setup.mjs
echo.
pause
