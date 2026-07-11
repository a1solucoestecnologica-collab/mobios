param(
  [string]$InstallDir = "C:\moble-tools",
  [int]$Port = 4173,
  [string]$AdminEmail = "",
  [string]$AdminPassword = "",
  [switch]$ForceDb,
  [switch]$SkipNodeCheck,
  [switch]$DevMode
)

$ErrorActionPreference = "Stop"

function Show-Usage {
  Write-Host @"
Uso: .\install.ps1 [-InstallDir PATH] [-Port NUM] [-AdminEmail EMAIL] [-AdminPassword SENHA] [-ForceDb] [-DevMode]

Instala o MÖBI OS nesta VM Windows.
Execute a partir da pasta descompactada do pacote (ou do repositorio).

Exemplo:
  .\install.ps1 -AdminEmail admin@empresa.com -AdminPassword "MinhaSenhaSegura123"
"@
}

if ($args -contains "-h" -or $args -contains "--help") {
  Show-Usage
  exit 0
}

$PackageRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

function Require-File([string]$RelativePath) {
  $path = Join-Path $PackageRoot $RelativePath
  if (-not (Test-Path $path)) {
    throw "Arquivo obrigatorio ausente: $path"
  }
  return $path
}

Require-File "server.js"
Require-File "package.json"
$dbPath = Require-File "data\moble-tools.sqlite"

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

function Copy-Tree([string]$RelativeSource, [string]$RelativeDest) {
  $source = Join-Path $PackageRoot $RelativeSource
  if (-not (Test-Path $source)) { return }
  $dest = Join-Path $InstallDir $RelativeDest
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item (Join-Path $source "*") $dest -Recurse -Force
}

function Copy-File([string]$RelativeSource, [string]$RelativeDest) {
  $source = Join-Path $PackageRoot $RelativeSource
  if (-not (Test-Path $source)) { return }
  $dest = Join-Path $InstallDir $RelativeDest
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item $source $dest -Force
}

Write-Host "Instalando em $InstallDir ..."

New-Item -ItemType Directory -Force -Path $InstallDir, (Join-Path $InstallDir "data"), (Join-Path $InstallDir "uploads\ponto") | Out-Null

foreach ($file in @("server.js", "app.js", "index.html", "styles.css", "package.json", "package-lock.json", "INICIAR-MOBLE-TOOLS.bat")) {
  Copy-File $file $file
}

Copy-Tree "planner\dist" "planner\dist"
Copy-Tree "ponto\dist" "ponto\dist"
Copy-File "ponto\server-handlers.js" "ponto\server-handlers.js"
Copy-Tree "ponto\server-handlers" "ponto\server-handlers"
Copy-File "platform\server-handlers.js" "platform\server-handlers.js"
Copy-Tree "platform\server-handlers" "platform\server-handlers"
Copy-Tree "admin\dist" "admin\dist"
Copy-File "admin\server-handlers.js" "admin\server-handlers.js"
Copy-Tree "admin\server-handlers" "admin\server-handlers"
Copy-Tree "portal\dist" "portal\dist"
Copy-File "portal\index.html" "portal\index.html"
Copy-File "portal\server-handlers.js" "portal\server-handlers.js"

Copy-File "install\templates\moble-tools.env.example" "moble-tools.env.example"
Copy-File "install\windows\start-moble-tools.ps1" "start-moble-tools.ps1"

$targetDb = Join-Path $InstallDir "data\moble-tools.sqlite"
if ((Test-Path $targetDb) -and -not $ForceDb) {
  Write-Host "Banco existente preservado em $targetDb"
} else {
  Write-Host "Copiando banco de dados..."
  Copy-Item $dbPath $targetDb -Force
}

$envPath = Join-Path $InstallDir "moble-tools.env"
if (-not (Test-Path $envPath)) {
  $nodeEnv = if ($DevMode) { "development" } else { "production" }
  $demo = if ($DevMode) { "true" } else { "false" }
  $insecure = if ($DevMode) { "MOBI_ALLOW_INSECURE_BOOT=1`n" } else { "" }
  $email = if ($AdminEmail) { $AdminEmail } else { "admin@empresa.com" }
  $pass = if ($AdminPassword) { $AdminPassword } else { "AltereEstaSenhaSegura123" }
  @"
HOST=0.0.0.0
PORT=$Port
NODE_ENV=$nodeEnv
PORTAL_DEMO_MODE=$demo
${insecure}MOBI_BOOTSTRAP_ADMIN_EMAIL=$email
MOBI_BOOTSTRAP_ADMIN_PASSWORD=$pass
"@ | Set-Content -Path $envPath -Encoding UTF8
  Write-Host "Config criada: $envPath"
} else {
  Write-Host "Config existente preservada: $envPath"
}

Push-Location $InstallDir
npm ci --omit=dev
Pop-Location

$ps1Path = Join-Path $InstallDir "start-moble-tools.ps1"
$taskName = "MobleTools"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ps1Path`"" -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "MÖBI OS" | Out-Null
Start-ScheduledTask -TaskName $taskName

$ruleName = "MÖBI OS HTTP $Port"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existingRule) { Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue }
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "========================================"
Write-Host " MÖBI OS instalado com sucesso"
Write-Host "========================================"
Write-Host " Pasta:     $InstallDir"
Write-Host " Porta:     $Port"
Write-Host " Local:     http://localhost:$Port"
Write-Host " Portal:    http://localhost:$Port/portal"
if ($ip) { Write-Host " Rede:      http://${ip}:$Port" }
Write-Host " Config:    $envPath"
Write-Host " Servico:   Tarefa agendada '$taskName' (inicia com Windows)"
Write-Host " Manual:    powershell -File `"$ps1Path`""
Write-Host "========================================"
Write-Host ""
Write-Host "IMPORTANTE: edite moble-tools.env com e-mail e senha do administrador."
