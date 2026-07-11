# Instalar MÖBI OS no Ubuntu Server

Guia para o servidor **Ubuntu** (22.04 ou 24.04).

---

## 1. No seu PC Windows — gerar o pacote

```powershell
cd "d:\01 - PROJETOS A1\MOBI OS"
powershell -ExecutionPolicy Bypass -File install\criar-pacote-vm.ps1
```

Arquivo gerado: `dist\moble-tools-deploy-AAAAAMMDD-HHMM.zip`

Envie o ZIP para o servidor Ubuntu (SCP, SFTP, pasta compartilhada da VM, etc.).

---

## 2. No servidor Ubuntu — instalar

Conecte por SSH e execute:

```bash
# Se ainda nao tiver unzip:
sudo apt update && sudo apt install -y unzip

unzip moble-tools-deploy-*.zip -d moble-tools
cd moble-tools
sudo bash INSTALAR-UBUNTU.sh --admin-email admin@empresa.com --admin-password 'SuaSenhaSegura123'
```

O instalador faz automaticamente:

- Instala **Node.js 22** (se nao existir)
- Copia o MÖBI OS para `/opt/moble-tools`
- Instala dependencias npm
- Cria servico **systemd** `moble-tools` (inicia com o sistema)
- Libera porta **4173** no UFW (se estiver ativo)

---

## 3. Acessar

Substitua `IP-DO-SERVIDOR` pelo IP da VM:

| URL | O que e |
|-----|---------|
| `http://IP-DO-SERVIDOR:4173` | Central MÖBI OS |
| `http://IP-DO-SERVIDOR:4173/portal` | Portal do colaborador |

---

## Configuracao do administrador

Arquivo: `/etc/moble-tools/moble-tools.env`

```bash
sudo nano /etc/moble-tools/moble-tools.env
```

Apos alterar:

```bash
sudo systemctl restart moble-tools
```

---

## Comandos uteis no Ubuntu

```bash
# Status do servico
sudo systemctl status moble-tools

# Ver logs em tempo real
sudo journalctl -u moble-tools -f

# Reiniciar
sudo systemctl restart moble-tools

# Parar
sudo systemctl stop moble-tools
```

---

## Opcoes do instalador

```bash
sudo bash INSTALAR-UBUNTU.sh --help
```

| Opcao | Descricao |
|-------|-----------|
| `--admin-email` | E-mail do administrador |
| `--admin-password` | Senha (min. 10 caracteres em producao) |
| `--port 4173` | Porta HTTP |
| `--dir /opt/moble-tools` | Pasta de instalacao |
| `--force-db` | Sobrescreve banco existente |
| `--dev` | Modo desenvolvimento |

---

## Firewall (se nao usar UFW)

Se o UFW estiver desativado, libere a porta no firewall da VM/cloud:

```bash
# Exemplo com ufw
sudo ufw allow 4173/tcp
sudo ufw reload
```

---

## Requisitos

- Ubuntu Server 22.04 ou 24.04 (64 bits)
- Acesso `sudo`
- Porta 4173 acessivel na rede
