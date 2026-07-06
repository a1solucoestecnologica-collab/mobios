param(
  [string]$InstallDir = "C:\moble-tools",
  [int]$Port = 4173,
  [switch]$ForceDb,
  [switch]$SkipNodeCheck
)

$ErrorActionPreference = "Stop"

function Show-Usage {
  Write-Host @"
Uso: .\install.ps1 [-InstallDir PATH] [-Port NUM] [-ForceDb] [-SkipNodeCheck]

Instala o Moble Tools (MOBI OS) nesta maquina Windows.
Execute a partir da pasta descompactada do pacote de deploy.
"@
}

if ($args -contains "-h" -or $args -contains "--help") {
  Show-Usage
  exit 0
}

$PackageRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$requiredFiles = @(
  "server.js",
  "package.json",
  "data\moble-tools.sqlite"
)

foreach ($file in $requiredFiles) {
  $path = Join-Path $PackageRoot $file
  if (-not (Test-Path $path)) {
    throw "Arquivo obrigatorio ausente: $path"
  }
}

$dbPath = Join-Path $PackageRoot "data\moble-tools.sqlite"
$dbHead = Get-Content $dbPath -TotalCount 1 -ErrorAction SilentlyContinue
if ($dbHead -like "version https://git-lfs.github.com/spec/v1*") {
  throw "O pacote contem ponteiro Git LFS em vez do banco SQLite real."
}

if (-not $SkipNodeCheck) {
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) {
    throw "Node.js nao encontrado. Instale Node.js >= 22.5 em https://nodejs.org/"
  }
  $version = node -p "process.versions.node"
  $parts = $version.Split(".")
  $major = [int]$parts[0]
  $minor = [int]$parts[1]
  if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 5)) {
    throw "Node.js $version encontrado. Requer >= 22.5."
  }
  Write-Host "Node.js v$version OK"
}

New-Item -ItemType Directory -Force -Path $InstallDir, (Join-Path $InstallDir "data") | Out-Null

$appFiles = @("server.js", "app.js", "index.html", "styles.css", "package.json", "package-lock.json")
foreach ($file in $appFiles) {
  Copy-Item (Join-Path $PackageRoot $file) (Join-Path $InstallDir $file) -Force
}

$targetDb = Join-Path $InstallDir "data\moble-tools.sqlite"
if ((Test-Path $targetDb) -and -not $ForceDb) {
  Write-Host "Banco existente preservado em $targetDb"
} else {
  Write-Host "Copiando banco de dados do pacote..."
  Copy-Item $dbPath $targetDb -Force
}

Push-Location $InstallDir
npm ci --omit=dev
Pop-Location

$taskName = "MobleTools"
$nodePath = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $nodePath -Argument "server.js" -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Moble Tools MOBI OS" | Out-Null
Start-ScheduledTask -TaskName $taskName

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "========================================"
Write-Host " Moble Tools instalado com sucesso"
Write-Host "========================================"
Write-Host " Diretorio: $InstallDir"
Write-Host " Porta:     $Port"
Write-Host " Local:     http://localhost:$Port"
if ($ip) { Write-Host " Rede:      http://${ip}:$Port" }
Write-Host " Tarefa:    $taskName (inicia com o Windows)"
Write-Host "========================================"
