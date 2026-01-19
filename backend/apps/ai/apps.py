from django.apps import AppConfig


class AIConfig(AppConfig):
    """
    Configuração do app AI - Agentes de Inteligência Artificial.

    Gerencia:
    - AIJob: Jobs de execução de agentes
    - Providers: Clients LLM (OpenAI-compat)
    - Agents: RCA, Preventivo, Preditivo, Inventário, Quick Repair

    Requisitos:
    - Multi-tenant: toda execução via schema_context
    - Idempotência: jobs não duplicam efeitos
    - Observabilidade: logs estruturados
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ai"
    verbose_name = "AI - Agentes de IA"

    def ready(self):
        """
        Hook chamado quando o app é carregado.

        Registra os agentes disponíveis.
        """
        # Importar agents para registrar no registry
        try:
            from .agents import registry  # noqa: F401
        except ImportError:
            pass
