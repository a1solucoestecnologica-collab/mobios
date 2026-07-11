# Cria pacote ZIP pronto para instalar na VM (Windows ou Linux).
# Uso: powershell -ExecutionPolicy Bypass -File install\criar-pacote-vm.ps1

param(
  [string]$Output = "",
  [switch]$SkipBuild,
  [switch]$AllowEmptyDb
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Build-App([string]$Name) {
  $appDir = Join-Path $ProjectRoot $Name
  if (-not (Test-Path (Join-Path $appDir "package.json"))) {
    Write-Host "  Pulando $Name (sem package.json)"
    return
  }
  Write-Host "  Build: $Name"
  Push-Location $appDir
  if (-not (Test-Path "node_modules")) {
    npm ci
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build falhou em $Name" }
  Pop-Location
}

Write-Step "MOBI OS - criar pacote para VM"
Write-Host "Projeto: $ProjectRoot"

if (-not $SkipBuild) {
  Write-Step "Instalando dependencias da raiz"
  Push-Location $ProjectRoot
  if (-not (Test-Path "node_modules")) { npm ci }
  Pop-Location

  Write-Step "Build dos aplicativos"
  foreach ($app in @("planner", "ponto", "admin", "portal")) {
    Build-App $app
  }
}

Write-Step "Empacotando ZIP de deploy"
$packArgs = @("-ExecutionPolicy", "Bypass", "-File", (Join-Path $ProjectRoot "install\package-deploy.ps1"))
if ($Output) { $packArgs += @("-Output", $Output) }
if ($AllowEmptyDb) { $packArgs += "-AllowEmptyDb" }
& powershell @packArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Step "Concluido"
Write-Host "Copie o ZIP gerado em dist\ para a VM."
Write-Host "Windows: INSTALAR-VM.bat"
Write-Host "Ubuntu: sudo bash INSTALAR-UBUNTU.sh"
