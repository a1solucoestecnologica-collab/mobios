# Documentação do MÖBI OS

Este diretório reúne a documentação estratégica, arquitetural e de contrato da plataforma.

---

## Documentos Fundamentais do Projeto

Estes quatro documentos formam a base obrigatória para qualquer desenvolvimento — humano ou por IA.

### 1. [`BIBLIA_MOBI_OS.md`](./BIBLIA_MOBI_OS.md)

**Constituição oficial do projeto.**

Define filosofia, princípios permanentes, domínios, responsabilidades e regras arquiteturais do MÖBI OS.

### 2. [`API_PLATFORM.md`](./API_PLATFORM.md)

**Contrato oficial entre Platform e Aplicativos.**

Define todas as rotas `/api/platform/*`, serviços disponíveis, fluxos de identidade e permissões, exemplos de consumo, boas práticas e antipadrões — **sem expor implementação interna**.

### 3. [`AUDITORIA_PLATFORM.md`](./AUDITORIA_PLATFORM.md)

**Estado atual da arquitetura Platform.**

Documenta o que foi extraído na Fase 3.5, compatibilidade com `/api/admin/*` e o que permanece temporariamente no Admin.

### 4. [`IDENTITY_MIGRATION_PLAN.md`](./IDENTITY_MIGRATION_PLAN.md)

**Plano oficial de migração de identidade.**

Descreve a transição de cadastros legados (`platform_users`, `admin_users`, `ponto_users`) para a entidade oficial `people`.

---

## Hierarquia de autoridade

1. **`BIBLIA_MOBI_OS.md`** — Regras arquiteturais permanentes
2. **`API_PLATFORM.md`** — Contrato técnico Platform ↔ Aplicativos (**mesma autoridade que a Bíblia**)
3. **`README.md` da raiz** — Instruções operacionais de execução e empacotamento
4. **Auditorias e planos de migração** — Estado e evolução documentados
5. **Roadmaps por domínio** — Visão de produto por aplicativo

Em caso de conflito entre um pedido pontual e os documentos fundamentais, **a Bíblia e a API Platform prevalecem** até decisão formal registrada no histórico de versões.

---

## Outros documentos

| Arquivo | Conteúdo |
|---------|----------|
| [`ROADMAP.md`](./ROADMAP.md) | Itens futuros do MÖBI Time (não arquitetura geral) |
| [`AUDITORIA_IDENTIDADE.md`](./AUDITORIA_IDENTIDADE.md) | Estado da identidade (Fase 3) |
| [`../README.md`](../README.md) | Como rodar, build e deploy (operacional) |

---

## Por onde começar

| Objetivo | Leia primeiro |
|----------|---------------|
| Criar um novo aplicativo | `BIBLIA_MOBI_OS.md` + `API_PLATFORM.md` |
| Consumir identidade ou permissões | `API_PLATFORM.md` |
| Entender o estado atual da Platform | `AUDITORIA_PLATFORM.md` |
| Migrar cadastro legado de usuários | `IDENTITY_MIGRATION_PLAN.md` |
| Rodar ou fazer deploy | `../README.md` |
