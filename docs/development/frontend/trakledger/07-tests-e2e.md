# Testes E2E — Finance UI (MVP)

## Cenário 1: OS → Ledger → Painel
1) Logar como usuário com permissão
2) Abrir OS existente
3) Preencher horas/peças/terceiros
4) Fechar OS
5) Postar custos
6) Abrir /finance/ledger filtrado por OS e validar lançamentos
7) Abrir /finance e validar atualização do “Realizado”

## Cenário 2: Compromisso aprovado
1) Criar commitment no mês atual
2) Aprovar
3) Validar em /finance que “Comprometido” atualizou

## Cenário 3: Savings manual
1) Criar savings event
2) Validar que “Economia” aparece no painel do mês
