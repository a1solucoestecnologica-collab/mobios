# MOBLE TOOLS (MOBI OS)

Motor funcional da plataforma Moble Tools — gestão de ferramentas de obra.

## Como rodar localmente

```bash
npm install
npm start
```

Acesse: http://localhost:4173

## Rede local (Windows)

Execute `INICIAR-MOBLE-TOOLS.bat` — mostra o IP local para celular/outro PC na mesma rede.

## Deploy na VM

### 1. Empacotar (na máquina com o banco real)

```powershell
# Pare o servidor antes
powershell -ExecutionPolicy Bypass -File install\package-deploy.ps1
```

Gera `dist/moble-tools-deploy-*.zip` com app + banco SQLite.

> **Importante:** coloque o banco real em `data/moble-tools.sqlite` antes de empacotar. Veja `data/LEIA-ME-BANCO.md`.

### 2. Instalar na VM Linux

```bash
unzip moble-tools-deploy-*.zip -d moble-tools
cd moble-tools/install/linux
chmod +x install.sh
sudo ./install.sh
```

### 3. Instalar na VM Windows

```powershell
Expand-Archive moble-tools-deploy-*.zip -DestinationPath C:\moble-tools-src
cd C:\moble-tools-src\install\windows
.\install.ps1
```

## Documentação completa

Auditoria técnica para Obsidian: `docs/AUDITORIA-MOBI-OS.md`

## Persistência

Banco SQLite: `data/moble-tools.sqlite`

## Requisitos

- Node.js >= 22.5.0
- npm

## Escopo implementado

- Cadastro de ferramentas (foto, QR, histórico)
- Categorias e subcategorias
- Lista requerida e saídas de obra
- Caixas de obra e conferências
- Separações predeterminadas
- Colaboradores
- Exportação JSON
- API REST local
