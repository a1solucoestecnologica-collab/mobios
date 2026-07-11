# MOBLE TOOLS (MOBI OS)

Motor funcional da plataforma MÖBI Tools — gestão de ferramentas de obra.

## Como rodar localmente

```bash
npm install
npm start
```

Acesse: http://localhost:4173

## Rede local (Windows)

Execute `INICIAR-MOBLE-TOOLS.bat` — mostra o IP local para celular/outro PC na mesma rede.

## MÖBI WorkMaps

Segundo produto da plataforma, acessível pelo seletor no topo ("MÖBI Tools" / "MÖBI WorkMaps").
É uma engine de mapas de trabalho baseada em mapas, blocos, conexões, colaboradores e execuções.

Editor visual em React Flow (build separado em `planner/`). Para desenvolver/rebuildar:

```bash
cd planner
npm install
npm run build
```

O build gera `planner/dist/planner.js` e `planner/dist/planner.css`, servidos estaticamente pelo `server.js`.
O servidor principal **não precisa** do Node do WorkMaps em runtime — apenas dos arquivos buildados.

## MÖBI Time (A1 Ponto)

Sistema de cartão ponto integrado à plataforma. Acessível pelo launcher de aplicativos.

**Autenticação:** use as credenciais oficiais da Platform (`person_access`). Não existem senhas padrão em produção.

Para o **primeiro administrador** em produção, defina antes do deploy:

```bash
MOBI_BOOTSTRAP_ADMIN_EMAIL=seu-admin@empresa.com
MOBI_BOOTSTRAP_ADMIN_PASSWORD=senha-segura-min-10-chars
NODE_ENV=production
PORTAL_DEMO_MODE=false
```

Em desenvolvimento, use as mesmas variáveis ou `MOBI_DEV_ADMIN_EMAIL` / `MOBI_DEV_ADMIN_PASSWORD`.

Para desenvolver/rebuildar o frontend:

```bash
cd ponto
npm install
npm run build
```

O build gera `ponto/dist/ponto.js` e `ponto/dist/ponto.css`. As fotos de ponto são salvas em `uploads/ponto/`.
API REST em `/api/ponto/*`. Roadmap futuro: `docs/ROADMAP.md`.

## Deploy na VM

### 1. Empacotar (na máquina com o banco real)

```powershell
# Pare o servidor antes
# Garanta que planner/dist esteja buildado (cd planner; npm run build)
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

### MÖBI Tools
- Cadastro de ferramentas (foto, QR, histórico)
- Categorias e subcategorias
- Lista requerida e saídas de obra
- Caixas de obra e conferências
- Separações predeterminadas
- Colaboradores
- Exportação JSON
- API REST local

### MÖBI WorkMaps
- Canvas infinito (React Flow): zoom, pan, seleção múltipla, arrastar blocos
- Blocos livres (título, descrição, checklist, anexos, cor, posição)
- Conexões entre blocos
- Mapas de trabalho salvos
- Execuções por colaborador com quatro estados (não iniciado, em andamento, concluído, cancelado)
- Interface do colaborador simplificada (mapa atual, próximo bloco, concluir)

### MÖBI Time (A1 Ponto)
- Login por perfil (ADMIN / EMPLOYEE) com sessão própria
- Registro de ponto com selfie e horário do servidor
- Comprovante em PDF
- CRUD de funcionários e jornadas
- Dashboard admin (presentes, atrasados, registros)
- Histórico, espelho de ponto e banco de horas
- Correção manual com auditoria
- Relatórios (atrasos, faltas, extras, incompletos)
- Configurações da empresa
