# Personas e Histórias de Usuário (MVP)

## Persona: Técnico
### US-T1 — Apontar mão de obra na OS
Como técnico, quero registrar tempo por atividade/role na OS, para que o sistema calcule custo automaticamente.

**Aceite**
- Registrar HH por role.
- Fechar OS gera `CostTransaction(labor)` idempotente.

### US-T2 — Registrar materiais usados
Como técnico, quero registrar peças/materiais usados na OS para compor custo real.

**Aceite**
- Materiais geram `CostTransaction(parts)` ou ficam linkados via inventário.

### US-T3 — Anexar evidências
Como técnico, quero anexar NF/relatório/foto na OS ou custo.

**Aceite**
- Upload salva em storage (MinIO) e referencia em `meta/attachments`.

---

## Persona: Gestor de Manutenção
### US-G1 — Cadastrar orçamento por envelopes
Como gestor, quero cadastrar orçamento anual com valores mensais por centro de custo e categoria.

**Aceite**
- CRUD BudgetPlan/Envelope/Month via API.
- Summary mostra Planejado vs Real no mês.

### US-G2 — Ver custos por ativo e categoria
Como gestor, quero ver ranking de custos por ativo e por categoria.

**Aceite**
- Endpoint de summary por asset/category (top N).

### US-G3 — Criar compromisso e aprovar
Como gestor, quero criar e aprovar compromisso (cotação/pedido) para controlar comprometido.

**Aceite**
- Commitment com status e auditoria.
- Comprometido aparece na visão mensal.

---

## Persona: Diretor/Operações
### US-D1 — Dashboard executivo mensal
Como diretor, quero ver Planejado vs Comprometido vs Realizado e Economia no mês.

**Aceite**
- Endpoint único do mês retorna KPI e breakdown por categoria.

### US-D2 — Abrir economia e ver evidência
Como diretor, quero abrir um SavingsEvent e entender qual OS/alerta gerou.

**Aceite**
- SavingsEvent vincula OS/asset/alert + links de evidência.

---

## Escopo fechado do MVP
Inclui:
- Orçamento + ledger + custos automáticos por OS
- Compromissos básicos
- Economia manual

Fora do MVP:
- Energia automática, economia automática, BAR/Forecast