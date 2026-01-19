# Documentação — Backend ClimaTrak (Django / Multi-tenant)

O backend do ClimaTrak é um monolito Django multi-tenant (isolamento por schema),
que atende os módulos **TrakNor (CMMS)**, **TrakSense (Monitoramento IoT/HVAC)**,
**TrakLedger (Orçamento Vivo)** e **TrakService (Field Service / feature-gated)**.

---

## Comece por aqui
- ✅ **Visão Geral do Produto:** [../visao-geral.md](../visao-geral.md)
- ✅ **Contrato de ingest (MQTT → HTTP / EMQX → Django):** [../api/ingest.md](../api/ingest.md)
- ✅ **Eventos (Transactional Outbox):** [../events/01-contrato-eventos.md](../events/01-contrato-eventos.md)
- ✅ **Observabilidade:** [../observability/README.md](../observability/README.md)
- ✅ **Operações (admin):** [../operations/admin.md](../operations/admin.md)

---

## Módulos do backend (apps)
Os apps principais vivem em `backend/apps/`:
- `cmms/` (TrakNor)
- `ingest/` (pipeline IoT)
- `alerts/` (alertas)
- `trakledger/` (finance / orçamento vivo)
- `trakservice/` (field service / feature flags)
- `core_events/` (Outbox)
- `tenants/`, `public_identity/`, `accounts/`, `common/`, `assets/`, `inventory/`, `locations/`, `ops/`

---

## APIs (contratos)
- **Ingest:** [../api/ingest.md](../api/ingest.md)
- **Inventário:** [../api/inventory.md](../api/inventory.md)
- **Finance (TrakLedger):** [../api/finance.md](../api/finance.md)
- **TrakService:** [../api/trakservice.md](../api/trakservice.md)

---

## APIs e Contratos
> Os contratos "fonte de verdade" estão em `docs/api/*`.

---

## Eventos e Outbox
- **Contrato de Evento + Outbox:** [../events/01-contrato-eventos.md](../events/01-contrato-eventos.md)
- **Eventos do MVP:** [../events/02-eventos-mvp.md](../events/02-eventos-mvp.md)
- **Eventos TrakService:** [../events/03-eventos-trakservice.md](../events/03-eventos-trakservice.md)

---

## Finance (TrakLedger)
- **MVP Spec:** [../finance/00-mvp-spec.md](../finance/00-mvp-spec.md)
- **ERD:** [../finance/01-erd.md](../finance/01-erd.md)
- **Regras de negócio:** [../finance/02-regras-negocio.md](../finance/02-regras-negocio.md)
- **Visão do Produto (TrakLedger):** [product/01-visao-produto.md](product/01-visao-produto.md)
- **Personas e histórias (TrakLedger):** [product/02-personas-e-historias.md](product/02-personas-e-historias.md)

---

## Operações
- **Setup EMQX + sensores:** [../operations/emqx-sensors-setup.md](../operations/emqx-sensors-setup.md)
