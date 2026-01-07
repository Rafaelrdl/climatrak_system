# ClimaTrak System (Monorepo)

Backend unificado + Frontend único para **CMMS (manutenção)** + **Monitoramento IoT/HVAC** + **TrakLedger (Orçamento Vivo)**, com arquitetura **multi-tenant** (isolamento por schema no PostgreSQL).

> 📌 Comece por aqui: `docs/README.md`  
> O README foca em "como rodar e contribuir". A especificação completa fica na pasta `/docs` (MVP, ERD, APIs, eventos, backlog).  

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Requisitos](#requisitos)
- [Setup Local (Quickstart)](#setup-local-quickstart)
- [Multi-tenant e Domínios](#multi-tenant-e-domínios)
- [Fluxo IoT (MQTT → EMQX → Ingest)](#fluxo-iot-mqtt--emqx--ingest)
- [TrakLedger: Orçamento Vivo](#TrakLedger-orçamento-vivo)
- [Comandos Úteis](#comandos-úteis)
- [Testes, Lint e Formatação](#testes-lint-e-formatação)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Visão Geral

O ClimaTrak System é uma plataforma multi-tenant para:

- **CMMS**: ordens de serviço, planos de manutenção, procedimentos, inventário
- **Monitoramento IoT/HVAC**: telemetria, alertas, dashboards em tempo real
- **TrakLedger (Orçamento Vivo)**: orçamento por mês/categoria/centro de custo + custos automáticos por OS + comprometidos + economia/ROI (MVP + evoluções)

---

## Arquitetura

**Backend**

- Django 5 + DRF
- Celery (jobs assíncronos)
- django-tenants (schema por tenant)
- PostgreSQL 16 (+ TimescaleDB para séries temporais)

**Frontend**

- React 19 + Vite 6 + TypeScript + Tailwind

**IoT**

- MQTT → EMQX → Webhook HTTP → endpoint de ingest no backend
- Leituras normalizadas em tabela Timescale (hypertable)

---

## Estrutura do Repositório

```
climatrak_system/
├── backend/       # Django + DRF + Celery + django-tenants
├── frontend/      # React + Vite + TS + Tailwind
├── docs/          # Especificações (MVP, ERD, APIs, eventos, backlog)
├── infra/         # docker-compose, configs (nginx/emqx/etc)
├── scripts/       # scripts utilitários
├── .github/       # Copilot instructions, templates, prompts
├── Makefile
└── README.md
```

---

## Requisitos

- Docker + Docker Compose
- Node.js (LTS recomendado)
- Python (somente se rodar fora do Docker)
- (Opcional) Make instalado

---

## Setup Local (Quickstart)

### 1) Subir infraestrutura (Docker)

```bash
make dev
```

> Se você não usar make, procure o docker-compose.yml em `/infra` e rode via `docker compose up`.

### 2) Rodar migrations multi-tenant

```bash
make migrate
```

### 3) Criar tenant e usuário dev

```bash
make seed
```

### 4) Subir frontend

```bash
cd frontend
npm install
npm run dev
```

### Acesso (exemplo)

- **Frontend**: http://umc.localhost:5173
- **Backend**: http://umc.localhost:8000

### Credenciais dev (seed padrão)

- **Email**: `owner@umc.localhost`
- **Senha**: `Dev@123456`

---

## Multi-tenant e Domínios

Cada tenant tem schema PostgreSQL isolado. Em dev, normalmente usamos subdomínio:

- `umc.localhost:8000` → tenant "umc" (schema do tenant)

Frontend em dev usa proxy Vite:

- `/api` → `http://umc.localhost:8000`

### Importante sobre subdomínios no localhost

Dependendo do sistema/ambiente, subdomínios de localhost podem não resolver automaticamente.
Se tiver problemas, você pode:

- usar um domínio local próprio (ex.: `climatrak.local`) e apontar no arquivo hosts
- apontar subdomínios explicitamente no hosts (ex.: `umc.climatrak.local`)

**Exemplo (Linux/macOS):** `/etc/hosts`

```
127.0.0.1 climatrak.local
127.0.0.1 umc.climatrak.local
```

Depois ajuste `ALLOWED_HOSTS`, `PUBLIC_SCHEMA_URLCONF` e configurações de domínio conforme seu setup.

---

## Fluxo IoT (MQTT → EMQX → Ingest)

**Fluxo:**

```
MQTT (device) → EMQX → Webhook HTTP → POST /api/telemetry/ingest → Django
                                         ↓
                               Telemetry (raw) + Reading (normalizado)
                                         ↓
                               Celery Tasks → Alert evaluation → Notificações
```

**Padrão de tópico MQTT (sugestão)**

```
tenants/{slug}/sites/{site}/assets/{asset}/...
```

---

## TrakLedger: Orçamento Vivo

O módulo TrakLedger (MVP) entrega:

- Orçamento por centro de custo/categoria (plano anual + meses)
- Ledger (CostTransaction) como fonte de verdade (imutável após lock mensal)
- Custos automáticos por OS (labor + parts + third_party)
- Compromissos básicos (submitted/approved) → visão "Comprometido"
- Economia manual (SavingsEvent) com evidências
- Dashboard mensal: Planejado vs Comprometido vs Realizado (+ Economia)

📚 **Documentação do TrakLedger:**

- `docs/TrakLedger/00-mvp-spec.md`
- `docs/TrakLedger/01-erd.md`
- `docs/TrakLedger/02-regras-negocio.md`
- `docs/events/*`
- `docs/api/TrakLedger.md`
- `docs/delivery/02-backlog-issues.md`

---

## Comandos Úteis

### Backend / Infra

```bash
make dev          # sobe containers
make migrate      # migrate_schemas (multi-tenant)
make seed         # cria tenant dev + usuário owner
make fmt          # formatação (black + isort)
make lint         # lint (ruff)
make test         # pytest (quando disponível)
```

### Frontend

```bash
cd frontend
npm run dev
npm test
```

---

## Testes, Lint e Formatação

**Backend:**

- `make fmt`
- `make lint`
- `make test` (pytest)

**Frontend:**

- `npm test` (Vitest)
- `npm run cy:smoke` (Cypress E2E smoke tests)
- `npm run cy:critical` (Cypress E2E critical tests)

---

## CI/CD & QA

O projeto utiliza GitHub Actions para CI/CD automatizado:

### Workflows

| Workflow | Trigger | Descrição |
|----------|---------|-----------|
| `backend-ci.yml` | PR, push main/develop | Lint (ruff), tests (pytest), migrations check |
| `frontend-ci.yml` | PR, push main/develop | ESLint, TypeScript check, build, Vitest |
| `e2e-tests.yml` | PR, nightly | Cypress smoke/critical tests |
| `codeql.yml` | PR, push, weekly | Security analysis (Python, JS/TS) |
| `trivy.yml` | PR, push, daily | Vulnerability, misconfiguration, secrets scan |
| `dependabot.yml` | Weekly | Auto-update dependencies (pip, npm, actions) |

### Executando CI Localmente

```bash
# Backend
cd backend
make ci-local  # ou: make lint && make test

# Frontend
cd frontend
npm run lint
npx tsc --noEmit
npm test
npm run build

# E2E (requer stack rodando)
cd frontend
npm run cy:smoke
```

### Security Scanning

- **CodeQL**: Análise estática de segurança para Python e TypeScript
- **Trivy**: Scan de vulnerabilidades, secrets e misconfigurations
- **Dependabot**: PRs automáticos para atualização de dependências

Os resultados aparecem na aba **Security** do repositório.

---

## Contribuindo

### 1) Trabalhe por Issue

O desenvolvimento segue o backlog em:

- `docs/delivery/02-backlog-issues.md`

**Sugestão de ordem (MVP):**

1. FIN-001 (models base)
2. FIN-002 (ledger + idempotência + lock)
3. EVT-001 (outbox + dispatcher)
4. API-001 (APIs base)
5. CMMS-001, FIN-003, FIN-004 (OS → Ledger)
6. FIN-005.. (Commitments)
7. FIN-007.. (Savings + Reporting)

### 2) PR pequeno, 1 escopo

- 1 issue por PR
- incluir:
  - migrations (se houver)
  - testes
  - atualização de docs se mudar contrato

### 3) Padrões importantes

- **Multi-tenant**: nunca vazar dados entre tenants
- **Eventos**: usar Outbox + consumidores idempotentes
- **TrakLedger**: ledger como fonte de verdade

---

## Licença

Defina aqui sua licença (MIT, Apache-2.0, proprietária, etc).
