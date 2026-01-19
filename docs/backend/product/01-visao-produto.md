# Visão do Produto — TrakLedger (Orçamento Vivo)

## Objetivo
Implementar o **TrakLedger**, módulo financeiro ("Orçamento Vivo") que conecta a operação
do **TrakNor (CMMS)** e dados do **TrakSense (IoT)** em uma camada de governança e visibilidade:

- **Planejado vs Comprometido vs Realizado**
- Custos automáticos por OS (mão de obra + peças + terceiros/contratos)
- **Economia/ROI** rastreável (ligado a alertas e OS)
- Evolução para **BAR (Budget-at-Risk)** e Forecast por condição (v2)

## Por que isso é inovador?
CMMS tradicional registra custo "depois do fato". O Orçamento Vivo:
1. Planeja orçamento por envelopes (mês/categoria/centro de custo)
2. Captura custo real automaticamente via fluxo de manutenção
3. Controla compromissos (cotações/pedidos) antes do custo virar realizado
4. (v2) Conecta telemetria HVAC → custo de energia → economia com evidência
5. (v2) Conecta risco de falha → risco financeiro → priorização por R$

## Princípios do módulo
- **Ledger (extrato) é a fonte de verdade**: custos viram transações (imutáveis após fechamento do mês).
- **Idempotência obrigatória**: jobs podem reprocessar sem duplicar custos.
- **Tudo com dimensões**: centro de custo, categoria, ativo, OS, fornecedor, contrato.
- **Auditoria e governança**: aprovação/compromisso e lock de período.
- **Evidência**: economia precisa ligar alerta → OS → antes/depois → valor.

## Escopo por versões
### MVP (v1)
- Centro de custo
- RateCard (custo/h por perfil)
- Orçamento: plano anual + envelopes + valores mensais
- Ledger: custos gerados no fechamento de OS + ajustes manuais
- Compromissos (básico): submitted/approved e visão "comprometido"
- SavingsEvent manual (estrutura para futuro automático)
- Relatórios: Planejado vs Comprometido vs Realizado + custos por ativo/categoria

### v2 (futuro)
- Energia: tarifa + custo diário automático via telemetria/estimativa
- Economia automática: baseline + antes/depois
- BAR/Forecast: risco financeiro por ativo e projeções
- Workflow completo de compras: ordered/received/paid + conciliações
