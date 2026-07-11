# Instalador MÖBI OS para VM

Instalação em **3 passos**.

---

## Passo 1 — Criar o pacote (no seu PC, antes de levar para a VM)

Abra PowerShell na pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File install\criar-pacote-vm.ps1
```

Isso faz o build de todos os apps (Tools, Time, WorkMaps, Admin, Portal) e gera:

`dist\moble-tools-deploy-AAAAAMMDD-HHMM.zip`

Copie esse ZIP para a VM.

---

## Passo 2 — Instalar na VM

### Windows

1. Descompacte o ZIP (ex.: `C:\moble-tools-src`)
2. Clique com o botão direito em **`INSTALAR-VM.bat`** → **Executar como administrador**

Ou no PowerShell (Admin):

```powershell
cd C:\moble-tools-src
.\INSTALAR-VM.bat -AdminEmail "admin@empresa.com" -AdminPassword "SuaSenhaSegura123"
```

### Linux (Ubuntu/Debian)

```bash
unzip moble-tools-deploy-*.zip -d moble-tools
cd moble-tools
sudo bash install/linux/instalar-vm.sh --admin-email admin@empresa.com --admin-password 'SuaSenhaSegura123'
```

O instalador Linux também instala o Node.js 22 automaticamente, se necessário.

---

## Passo 3 — Acessar

| URL | Descrição |
|-----|-----------|
| `http://IP-DA-VM:4173` | Central MÖBI OS |
| `http://IP-DA-VM:4173/portal` | Portal do colaborador |

**Edite a configuração do administrador:**

- **Windows:** `C:\moble-tools\moble-tools.env`
- **Linux:** `/etc/moble-tools/moble-tools.env`

Depois de alterar, reinicie o serviço:

- **Windows:** `Restart-ScheduledTask -TaskName MobleTools`
- **Linux:** `sudo systemctl restart moble-tools`

---

## Opções úteis

### Windows (`install\windows\install.ps1`)

| Parâmetro | Descrição |
|-----------|-----------|
| `-InstallDir C:\caminho` | Pasta de instalação (padrão: `C:\moble-tools`) |
| `-Port 4173` | Porta HTTP |
| `-AdminEmail` / `-AdminPassword` | Primeiro administrador |
| `-ForceDb` | Sobrescreve banco existente |
| `-DevMode` | Modo desenvolvimento (demo + boot inseguro) |

### Linux (`install/linux/install.sh`)

| Parâmetro | Descrição |
|-----------|-----------|
| `--dir /opt/moble-tools` | Pasta de instalação |
| `--port 4173` | Porta HTTP |
| `--admin-email` / `--admin-password` | Primeiro administrador |
| `--force-db` | Sobrescreve banco |
| `--dev` | Modo desenvolvimento |

---

## Serviço automático

- **Windows:** tarefa agendada `MobleTools` (inicia com o sistema)
- **Linux:** `systemctl status moble-tools`

Logs Linux: `journalctl -u moble-tools -f`

---

## Requisitos

- Node.js **>= 22.5** (Windows: instalar manualmente; Linux: instalador cuida disso)
- Porta **4173** liberada no firewall da VM
