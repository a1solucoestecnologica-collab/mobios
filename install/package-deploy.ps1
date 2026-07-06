param(
  [string]$Output = "",
  [switch]$AllowEmptyDb
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$DataDir = Join-Path $ProjectRoot "data"
$DbPath = Join-Path $DataDir "moble-tools.sqlite"
$DistDir = Join-Path $ProjectRoot "dist"

if (-not $Output) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmm"
  $Output = Join-Path $DistDir "moble-tools-deploy-$stamp.zip"
} else {
  $Output = Resolve-Path (Split-Path $Output -Parent) + "\" + (Split-Path $Output -Leaf)
}

Write-Host "Preparando banco de dados..."
Push-Location $ProjectRoot
node scripts/prepare-database.js
if ($LASTEXITCODE -ne 0 -and -not $AllowEmptyDb) {
  Pop-Location
  exit $LASTEXITCODE
}
Pop-Location

$staging = Join-Path $env:TEMP ("moble-tools-staging-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $staging | Out-Null

try {
  $include = @(
    "server.js",
    "app.js",
    "index.html",
    "styles.css",
    "package.json",
    "package-lock.json",
    "README.md",
    "INICIAR-MOBLE-TOOLS.bat"
  )

  foreach ($file in $include) {
    $source = Join-Path $ProjectRoot $file
    if (Test-Path $source) {
      Copy-Item $source (Join-Path $staging $file)
    }
  }

  Copy-Item -Recurse (Join-Path $ProjectRoot "install") (Join-Path $staging "install")
  New-Item -ItemType Directory -Force -Path (Join-Path $staging "data") | Out-Null
  Copy-Item $DbPath (Join-Path $staging "data\moble-tools.sqlite")

  New-Item -ItemType Directory -Force -Path (Split-Path $Output -Parent) | Out-Null
  if (Test-Path $Output) { Remove-Item $Output -Force }
  Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $Output

  $sizeMb = [math]::Round((Get-Item $Output).Length / 1MB, 2)
  Write-Host ""
  Write-Host "Pacote criado: $Output ($sizeMb MB)"
  Write-Host ""
  Write-Host "Na VM Linux:"
  Write-Host "  unzip moble-tools-deploy-*.zip -d moble-tools"
  Write-Host "  cd moble-tools/install/linux"
  Write-Host "  chmod +x install.sh"
  Write-Host "  sudo ./install.sh"
  Write-Host ""
  Write-Host "Na VM Windows (PowerShell como Admin):"
  Write-Host "  Expand-Archive moble-tools-deploy-*.zip -DestinationPath C:\moble-tools-src"
  Write-Host "  cd C:\moble-tools-src\install\windows"
  Write-Host "  .\install.ps1"
}
finally {
  if (Test-Path $staging) {
    Remove-Item $staging -Recurse -Force
  }
}
