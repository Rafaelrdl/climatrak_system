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
        # O __init__.py do agents importa DummyAgent e RootCauseAgent
        # que usam @register_agent decorator
        try:
            from . import agents  # noqa: F401

            # Log agents registrados
            import logging

            logger = logging.getLogger(__name__)
            from .agents import get_registered_agents

            registered = get_registered_agents()
            for agent in registered:
                logger.info(f"AI Agent registered: {agent['key']} ({agent['name']})")
        except ImportError as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to import AI agents: {e}")
