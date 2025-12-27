# Documentação — TrakSense Backend (unificado para TrakNor + TrakSense)

Este repositório concentra o backend unificado do ecossistema TrakNor (CMMS) + TrakSense (monitoramento HVAC/IoT).
A documentação abaixo descreve o módulo financeiro (Orçamento Vivo), suas integrações com CMMS e IoT, e o plano de entrega.

---

## Comece por aqui
- [Visão do Produto (Orçamento Vivo)](product/01-visao-produto.md)
- [MVP Spec (escopo fechado)](finance/00-mvp-spec.md)
- [Roadmap e Entregas (M0..M5)](delivery/01-roadmap.md)

---

## Produto (requisitos e histórias)
- [Personas e Histórias de Usuário](product/02-personas-e-historias.md)

---

## Domínio Financeiro
- [Modelo de Dados (ERD) + integrações CMMS/IoT](finance/01-erd.md)
- [Regras de Negócio (Orçamento, Ledger, Compromissos)](finance/02-regras-negocio.md)
- [Economia, ROI e BAR (v2)](finance/03-economia-e-risco.md)

---

## APIs e Contratos
- [API Finance (endpoints e payloads)](api/finance.md)
- [API CMMS (campos e endpoints necessários)](api/cmms.md)

---

## Eventos e Outbox
- [Contrato de Evento + Outbox](events/01-contrato-eventos.md)
- [Eventos do MVP](events/02-eventos-mvp.md)

---

## Execução (GitHub)
- [Backlog (Issues prontas)](delivery/02-backlog-issues.md)
- [Configuração de Labels/Milestones/Projeto](delivery/03-github-setup.md)

---

## ADR (Decisões de Arquitetura)
- [Índice ADR](adr/README.md)
