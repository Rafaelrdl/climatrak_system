# RBAC — Finance UI

## Papéis típicos
- technician: vê custos da própria OS, preenche horas/itens, não aprova comprometidos
- operator: similar ao técnico, pode lançar itens dependendo da regra
- admin/owner: acesso total
- viewer: somente leitura

## Regras por tela (MVP)
- /finance (painel): gestor/admin/viewer
- /finance/budgets: admin/owner (gestor se você permitir)
- /finance/ledger:
  - listar: gestor/admin
  - criar adjustment: admin/owner
- /finance/commitments:
  - criar: gestor/admin
  - aprovar: admin/owner (ou diretor)
- /finance/savings:
  - criar: gestor/admin
  - listar: viewer+
- Aba Custos na OS:
  - técnico pode editar apontamentos e materiais
  - postar custos: gestor/admin (ou técnico se política permitir)

## Implementação
- Guard de rota com checagem de abilities
- Ocultar/disable botões se sem permissão
- Backend sempre valida (UI não substitui RBAC)
