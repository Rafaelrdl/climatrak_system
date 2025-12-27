# Modelo de Dados (ERD) — Finance + Integrações CMMS/IoT

## Objetivo
Definir o modelo de dados do módulo financeiro e como ele se relaciona com:
- OS (WorkOrder)
- Ativos (Asset)
- Sensores e Alertas (IoT)

## ERD (Mermaid)
```mermaid
erDiagram
  TENANT ||--o{ COST_CENTER : has
  TENANT ||--o{ RATE_CARD : has
  TENANT ||--o{ BUDGET_PLAN : has
  TENANT ||--o{ COST_TRANSACTION : has
  TENANT ||--o{ COMMITMENT : has
  TENANT ||--o{ SAVINGS_EVENT : has

  COST_CENTER ||--o{ BUDGET_ENVELOPE : budgets
  BUDGET_PLAN  ||--o{ BUDGET_ENVELOPE : contains
  BUDGET_ENVELOPE ||--o{ BUDGET_MONTH : month_limits

  COST_CENTER ||--o{ COST_TRANSACTION : allocates
  COST_CENTER ||--o{ COMMITMENT : reserves

  CMMS_ASSET ||--o{ COST_TRANSACTION : relates
  CMMS_WORK_ORDER ||--o{ COST_TRANSACTION : generates
  CMMS_WORK_ORDER ||--o{ COMMITMENT : linked
  CMMS_ASSET ||--o{ SAVINGS_EVENT : saves
  CMMS_WORK_ORDER ||--o{ SAVINGS_EVENT : evidence

  IOT_ALERT ||--o{ SAVINGS_EVENT : triggers
  CMMS_ASSET ||--o{ IOT_SENSOR : has
  IOT_SENSOR ||--o{ IOT_READING : produces
Relações com CMMS
Asset (CMMS_ASSET)

Referenciado por:

CostTransaction.asset_id

SavingsEvent.asset_id

Necessário: todo Asset deve ter cost_center_id (direto ou derivado pela hierarquia de local).

WorkOrder (CMMS_WORK_ORDER)

Referenciado por:

CostTransaction.work_order_id

Commitment.work_order_id

SavingsEvent.work_order_id

Relações com IoT
Sensor (IOT_SENSOR)

Deve ter asset_id para ligar telemetria ao ativo.

Leituras (Timescale) não precisam FK forte no Finance; agregações usam asset_id/sensor_id.

Alert (IOT_ALERT)

Pode ligar a economia e risco:

SavingsEvent.alert_id (principal)

Opcional: CostTransaction.alert_id (custo originado por alerta)

Entidades (campos chave)
CostCenter

Hierarquia: Unidade > Prédio > Área > Sistema

id, tenant_id, name, parent_id, code, tags

BudgetPlan/Envelope/Month

Planos anuais, envelopes por categoria/centro, valores mensais

RateCard

role, cost_per_hour, vigência

CostTransaction (Ledger)

Transação imutável (após fechamento):

occurred_at, amount, transaction_type, category, cost_center_id

vínculos opcionais: asset_id, work_order_id, vendor_id, etc.

idempotency_key, meta, is_locked

Commitment

Reserva/compromisso (cotações/pedidos):

amount, status, budget_month, vendor_id, work_order_id

SavingsEvent

Economia com evidência:

event_type, savings_amount, confidence, vínculos + evidências