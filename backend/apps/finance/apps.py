from django.apps import AppConfig


class FinanceConfig(AppConfig):
    """
    Configuração do app Finance - Orçamento Vivo.
    
    Gerencia:
    - CostCenter: Centros de custo hierárquicos
    - RateCard: Tabela de custos por role
    - BudgetPlan/Envelope/Month: Orçamento por envelopes
    - CostTransaction: Ledger de transações (implementado em FIN-002)
    - Commitment: Compromissos de orçamento (implementado em FIN-005)
    - SavingsEvent: Eventos de economia (implementado em FIN-007)
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.finance'
    verbose_name = 'Finance - Orçamento Vivo'
