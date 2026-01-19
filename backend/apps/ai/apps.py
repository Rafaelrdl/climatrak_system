from django.apps import AppConfig


class AIConfig(AppConfig):
    """
    Configuração do app AI - Agentes de Inteligência Artificial.

    Gerencia:
    - AIJob: Jobs de execução de agentes
    - AIKnowledgeDocument/Chunk: Base de conhecimento RAG (AI-006)
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

        Registra os agentes e handlers disponíveis.
        """
        import logging

        logger = logging.getLogger(__name__)

        # Importar agents para registrar no registry
        # O __init__.py do agents importa DummyAgent e RootCauseAgent
        # que usam @register_agent decorator
        try:
            from . import agents  # noqa: F401

            from .agents import get_registered_agents

            registered = get_registered_agents()
            for agent in registered:
                logger.info(f"AI Agent registered: {agent['key']} ({agent['name']})")
        except ImportError as e:
            logger.warning(f"Failed to import AI agents: {e}")

        # Importar handlers para registrar no core_events (AI-006)
        # Handlers são registrados via @register_event_handler decorator
        try:
            from . import handlers  # noqa: F401

            logger.info("AI handlers registered (procedure.updated)")
        except ImportError as e:
            logger.warning(f"Failed to import AI handlers: {e}")
