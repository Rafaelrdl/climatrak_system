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

    def ready(self):
        """
        Hook chamado quando o app é carregado.
        
        Registra os handlers de eventos do Cost Engine.
        """
        # Importar handlers para registrar no dispatcher
        # Isso garante que @register_event_handler seja executado
        from . import handlers  # noqa: F401
