@echo off
title MÖBI OS - Instalador VM
cd /d "%~dp0"

echo.
echo ========================================
echo   MÖBI OS - Instalador para VM Windows
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado.
  echo Instale Node.js 22.5+ em https://nodejs.org/
  echo Depois execute este arquivo novamente.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install\windows\install.ps1" %*
if errorlevel 1 (
  echo.
  echo Instalacao falhou.
  pause
  exit /b 1
)

echo.
pause
