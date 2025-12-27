"""
Sistema de parsers de payload para diferentes formatos de dispositivos IoT.

Este módulo fornece uma arquitetura plugável para processar diferentes
formatos de payload MQTT de diversos fabricantes e modelos de dispositivos.
"""
import importlib
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class PayloadParser(ABC):
    """Interface base para todos os parsers de payload."""
    
    @abstractmethod
    def can_parse(self, payload: Dict[str, Any], topic: str) -> bool:
        """
        Verifica se este parser pode processar o payload.
        
        Args:
            payload: Dados recebidos do EMQX
            topic: Tópico MQTT onde a mensagem foi publicada
            
        Returns:
            True se este parser pode processar o payload, False caso contrário
        """
        pass
    
    @abstractmethod
    def parse(self, payload: Dict[str, Any], topic: str) -> Dict[str, Any]:
        """
        Processa o payload e retorna um formato padrão.
        
        Args:
            payload: Dados recebidos do EMQX
            topic: Tópico MQTT onde a mensagem foi publicada
            
        Returns:
            Dicionário no formato padrão TrakSense:
            {
                'device_id': str,
                'timestamp': datetime,
                'sensors': [
                    {
                        'sensor_id': str,
                        'value': float,
                        'labels': {
                            'unit': str,
                            'type': str,
                            ...
                        }
                    },
                    ...
                ],
                'metadata': {
                    'model': str (opcional),
                    'gateway_id': str (opcional),
                    'format': str (opcional),
                    ...
                }
            }
        """
        pass


class PayloadParserManager:
    """Gerencia os parsers de payload disponíveis."""
    
    def __init__(self):
        self._parsers: List[PayloadParser] = []
        self._load_parsers()
    
    def _load_parsers(self):
        """Carrega dinamicamente os parsers disponíveis."""
        from django.conf import settings
        
        # Obter lista de módulos de parsers da configuração
        parser_modules = getattr(settings, 'PAYLOAD_PARSER_MODULES', [
            'apps.ingest.parsers.standard',
            'apps.ingest.parsers.khomp_senml',
        ])
        
        for module_path in parser_modules:
            try:
                module = importlib.import_module(module_path)
                
                # Procurar por classes que herdam de PayloadParser
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (isinstance(attr, type) and 
                        issubclass(attr, PayloadParser) and 
                        attr is not PayloadParser):
                        parser_instance = attr()
                        self._parsers.append(parser_instance)
                        logger.info(f"✅ Registrado parser: {attr.__name__}")
            except ImportError as e:
                logger.warning(f"⚠️ Não foi possível importar o módulo de parser {module_path}: {e}")
            except Exception as e:
                logger.error(f"❌ Erro ao carregar parser de {module_path}: {e}", exc_info=True)
    
    def get_parser(self, payload: Dict[str, Any], topic: str) -> Optional[PayloadParser]:
        """
        Encontra o parser apropriado para o payload.
        
        Args:
            payload: Dados recebidos do EMQX
            topic: Tópico MQTT onde a mensagem foi publicada
            
        Returns:
            Parser apropriado ou None se nenhum parser for encontrado
        """
        for parser in self._parsers:
            try:
                if parser.can_parse(payload, topic):
                    logger.info(f"🎯 Parser selecionado: {parser.__class__.__name__}")
                    return parser
            except Exception as e:
                logger.error(
                    f"❌ Erro ao verificar parser {parser.__class__.__name__}: {e}",
                    exc_info=True
                )
        
        logger.warning(f"⚠️ Nenhum parser encontrado para o payload. Topic: {topic}")
        return None
    
    def reload_parsers(self):
        """Recarrega todos os parsers (útil para adicionar novos em runtime)."""
        logger.info("🔄 Recarregando parsers...")
        self._parsers.clear()
        self._load_parsers()
        logger.info(f"✅ {len(self._parsers)} parser(s) carregado(s)")


# Singleton para acesso global
parser_manager = PayloadParserManager()
