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
    "INICIAR-MOBLE-TOOLS.bat",
    "INSTALAR-VM.bat",
    "INSTALAR-VM.sh",
    "INSTALAR-UBUNTU.sh"
  )

  foreach ($file in $include) {
    $source = Join-Path $ProjectRoot $file
    if (Test-Path $source) {
      Copy-Item $source (Join-Path $staging $file)
    }
  }

  Copy-Item -Recurse (Join-Path $ProjectRoot "install") (Join-Path $staging "install")
  Copy-Item (Join-Path $ProjectRoot "install\LEIA-ME-VM.md") (Join-Path $staging "install\LEIA-ME-VM.md") -ErrorAction SilentlyContinue

  # Mooble Planner (WorkMaps): empacota os arquivos ja buildados.
  $plannerDist = Join-Path $ProjectRoot "planner\dist"
  if (-not (Test-Path (Join-Path $plannerDist "planner.js"))) {
    Write-Host "AVISO: planner/dist ausente. Rode 'npm run build' em planner/ antes de empacotar."
  } else {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "planner\dist") | Out-Null
    Copy-Item (Join-Path $plannerDist "*") (Join-Path $staging "planner\dist") -Recurse
  }

  # MÖBI Time (A1 Ponto): empacota os arquivos ja buildados.
  $pontoDist = Join-Path $ProjectRoot "ponto\dist"
  if (-not (Test-Path (Join-Path $pontoDist "ponto.js"))) {
    Write-Host "AVISO: ponto/dist ausente. Rode 'npm run build' em ponto/ antes de empacotar."
  } else {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "ponto\dist") | Out-Null
    Copy-Item (Join-Path $pontoDist "*") (Join-Path $staging "ponto\dist") -Recurse
  }

  # Backend do MÖBI Time
  $pontoServer = Join-Path $ProjectRoot "ponto\server-handlers.js"
  if (Test-Path $pontoServer) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "ponto") | Out-Null
    Copy-Item $pontoServer (Join-Path $staging "ponto\server-handlers.js")
  }

  # Plataforma MÖBI OS (domínio compartilhado)
  $platformHandlers = Join-Path $ProjectRoot "platform\server-handlers"
  if (Test-Path $platformHandlers) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "platform\server-handlers") | Out-Null
    Copy-Item (Join-Path $platformHandlers "*") (Join-Path $staging "platform\server-handlers") -Recurse
  }
  $platformServer = Join-Path $ProjectRoot "platform\server-handlers.js"
  if (Test-Path $platformServer) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "platform") | Out-Null
    Copy-Item $platformServer (Join-Path $staging "platform\server-handlers.js")
  }

  # MÖBI Admin: empacota os arquivos ja buildados.
  $adminDist = Join-Path $ProjectRoot "admin\dist"
  if (-not (Test-Path (Join-Path $adminDist "admin.js"))) {
    Write-Host "AVISO: admin/dist ausente. Rode 'npm run build' em admin/ antes de empacotar."
  } else {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "admin\dist") | Out-Null
    Copy-Item (Join-Path $adminDist "*") (Join-Path $staging "admin\dist") -Recurse
  }

  # Backend do MÖBI Admin
  $adminHandlers = Join-Path $ProjectRoot "admin\server-handlers"
  if (Test-Path $adminHandlers) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "admin\server-handlers") | Out-Null
    Copy-Item (Join-Path $adminHandlers "*") (Join-Path $staging "admin\server-handlers") -Recurse
  }
  $adminServer = Join-Path $ProjectRoot "admin\server-handlers.js"
  if (Test-Path $adminServer) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "admin") | Out-Null
    Copy-Item $adminServer (Join-Path $staging "admin\server-handlers.js")
  }

  # MÖBI Portal: empacota os arquivos ja buildados.
  $portalDist = Join-Path $ProjectRoot "portal\dist"
  if (-not (Test-Path (Join-Path $portalDist "portal.js"))) {
    Write-Host "AVISO: portal/dist ausente. Rode 'npm run build' em portal/ antes de empacotar."
  } else {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "portal\dist") | Out-Null
    Copy-Item (Join-Path $portalDist "*") (Join-Path $staging "portal\dist") -Recurse
  }

  $portalIndex = Join-Path $ProjectRoot "portal\index.html"
  if (Test-Path $portalIndex) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "portal") | Out-Null
    Copy-Item $portalIndex (Join-Path $staging "portal\index.html")
  }

  $portalServer = Join-Path $ProjectRoot "portal\server-handlers.js"
  if (Test-Path $portalServer) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "portal") | Out-Null
    Copy-Item $portalServer (Join-Path $staging "portal\server-handlers.js")
  }

  # Backend do MÖBI Time (subpastas)
  $pontoHandlersDir = Join-Path $ProjectRoot "ponto\server-handlers"
  if (Test-Path $pontoHandlersDir) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "ponto\server-handlers") | Out-Null
    Copy-Item (Join-Path $pontoHandlersDir "*") (Join-Path $staging "ponto\server-handlers") -Recurse
  }

  $templatesDir = Join-Path $ProjectRoot "install\templates"
  if (Test-Path $templatesDir) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "install\templates") | Out-Null
    Copy-Item (Join-Path $templatesDir "*") (Join-Path $staging "install\templates") -Recurse
  }

  $startScript = Join-Path $ProjectRoot "install\windows\start-moble-tools.ps1"
  if (Test-Path $startScript) {
    New-Item -ItemType Directory -Force -Path (Join-Path $staging "install\windows") | Out-Null
    Copy-Item $startScript (Join-Path $staging "install\windows\start-moble-tools.ps1")
  }

  $applyAdmin = Join-Path $ProjectRoot "install\linux\apply-admin-credentials.mjs"
  if (Test-Path $applyAdmin) {
    Copy-Item $applyAdmin (Join-Path $staging "install\linux\apply-admin-credentials.mjs")
  }

  New-Item -ItemType Directory -Force -Path (Join-Path $staging "data") | Out-Null
  Copy-Item $DbPath (Join-Path $staging "data\moble-tools.sqlite")

  New-Item -ItemType Directory -Force -Path (Split-Path $Output -Parent) | Out-Null
  if (Test-Path $Output) { Remove-Item $Output -Force }
  Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $Output

  $sizeMb = [math]::Round((Get-Item $Output).Length / 1MB, 2)
  Write-Host ""
  Write-Host "Pacote criado: $Output ($sizeMb MB)"
  Write-Host ""
  Write-Host "No servidor Ubuntu:"
  Write-Host "  unzip moble-tools-deploy-*.zip -d moble-tools"
  Write-Host "  cd moble-tools"
  Write-Host "  sudo bash INSTALAR-UBUNTU.sh --admin-email admin@empresa.com --admin-password 'SuaSenha'"
}
finally {
  if (Test-Path $staging) {
    Remove-Item $staging -Recurse -Force
  }
}
