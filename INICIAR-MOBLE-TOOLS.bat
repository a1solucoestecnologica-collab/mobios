@echo off
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org/ ^(versao 22.5 ou superior^).
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias...
  call npm install
)

echo Iniciando MOBLE TOOLS...
echo.
echo Acesse neste computador:
echo http://localhost:4173
echo.
echo Para outro computador/celular na mesma rede Wi-Fi, use:
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4"') do (
  set IP=%%A
  goto :found
)
:found
set IP=%IP: =%
echo http://%IP%:4173
echo.
echo Mantenha esta janela aberta enquanto o sistema estiver em uso.
echo.
node server.js
pause
