# Componentes base — Finance UI

## Objetivo
Padronizar componentes para reduzir inconsistência e acelerar telas.

## Lista de componentes
- MoneyCell
  - Formatação monetária (BRL default)
  - exibe sinal (opcional)
- DeltaBadge
  - variação positiva/negativa/neutra
- MonthPicker
  - seleciona mês (YYYY-MM)
- CostCenterSelect
  - select com busca (async)
- CategorySelect
- DataTable
  - filtros, paginação, sort
  - modo server-side (padrão)
- AttachmentUploader
  - upload e lista de anexos (NF/cotação/relatório)
- SummaryCards
  - cards com KPI e link

## Diretrizes
- Sempre suportar loading/disabled
- Acessibilidade: labels e focus states
- Tipos TS para props
