# Copilot Instructions — ClimaTrak System (Monorepo)

Você está no repositório **ClimaTrak System**, um monorepo com:
- Backend: Django 5 + DRF + Celery + django-tenants (PostgreSQL schema por tenant)
- Frontend: React 19 + Vite 6 + TypeScript + Tailwind
- Timeseries: PostgreSQL 16 + TimescaleDB (telemetria)
- IoT: EMQX (MQTT) → webhook HTTP → Django /ingest

## Regras de trabalho (obrigatórias)
1) Trabalhe SEMPRE a partir das especificações em `/docs`.
   - Comece por: `docs/README.md`
   - Para Finance: `docs/finance/*`, `docs/events/*`, `docs/api/*`, `docs/delivery/*`
2) Entregue alterações em pacotes pequenos (1 issue por PR).
3) Sempre que criar/alterar models:
   - gerar migrations
   - adicionar/atualizar testes
4) Multi-tenant:
   - nunca vazar dados entre tenants
   - queries e services devem operar no schema correto (django-tenants)
5) Eventos:
   - use Outbox (tabela) para eventos de domínio
   - consumidores Celery devem ser idempotentes
6) Finance:
   - Ledger (CostTransaction) é fonte da verdade
   - idempotência por `idempotency_key` (unique por tenant)
   - mês locked: não editar transações; criar adjustment

## Estrutura do projeto
- Backend em `backend/`
  - apps em `backend/apps/` (tenant-specific)
  - core/eventos em `backend/apps/core_events` (ou equivalente)
- Frontend em `frontend/`
  - features por domínio (evitar “dois produtos”): manutenção, monitoramento, financeiro

## Padrões Backend
- Preferir ViewSets (DRF) e service layer para regras
- Validar permissão (RBAC) em toda rota
- Jobs Celery idempotentes, com retry/backoff

## Padrões Frontend
- React Query para dados remotos
- Services centralizados e tipados
- Componentes UI (shadcn/radix) e padrões de layout consistentes

## Como responder (modo Copilot)
Ao implementar uma issue:
1) Resuma o entendimento
2) Liste arquivos que serão alterados/criados
3) Implemente (código + migrations + testes)
4) Diga como testar localmente (comandos)
5) Atualize docs se mudar contrato
