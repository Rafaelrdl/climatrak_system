---
applyTo: "backend/apps/trakservice/**,frontend/src/modules/trakservice/**,mobile/**/trakservice/**,docs/**/trakservice**,docs/api/trakservice*,docs/events/trakservice*"
---

# TrakService (Field Service) — Instruções específicas

## Objetivo do módulo
Implementar TrakService para equipe terceirizada/field service:
dispatch/agenda, rastreio com privacidade, roteirização + km, orçamentos e integração com Finance.

## Feature gating obrigatório
- Cada feature do TrakService deve ter uma chave em tenant features (ex.: trakservice.enabled, trakservice.routing, trakservice.tracking, trakservice.quotes, trakservice.km).
- Frontend: ocultar navbar/rotas quando desabilitado.
- Backend: bloquear endpoints quando desabilitado (403 ou 404), não confiar só na UI.

## Multi-tenant e segurança
- Nunca consultar dados fora do tenant atual.
- Tracking: respeitar janela de trabalho e regras de privacidade.
- Salvar audit trail mínimo (device_id, recorded_at, source).

## Integração com Finance
- Quando gerar efeitos financeiros: registrar via ledger (idempotência + lock mensal; ajustes via adjustment).
- Eventos via Outbox para integrações e automações.

## UI/Design
- Seguir `design_system.md` / `docs/design_system.md`.
- Reusar componentes (shadcn/ui, Tailwind, padrões de layout já existentes) e manter consistência visual.
