"""
Parser para o formato padrão TrakSense.

Este é o formato usado pela maioria dos dispositivos configurados
para enviar dados diretamente para o TrakSense via EMQX.
"""
import datetime
import logging
from typing import Dict, Any

from apps.ingest.parsers import PayloadParser

logger = logging.getLogger(__name__)


class StandardParser(PayloadParser):
    """
    Parser para o formato padrão do TrakSense.
    
    Formato esperado (após processamento do EMQX):
    {
        "client_id": "device-001",
        "topic": "tenants/umc/devices/001/sensors",
        "payload": {
            "device_id": "GW-1760908415",
            "timestamp": "2025-10-20T14:30:00Z",
            "sensors": [
                {
                    "sensor_id": "temp-amb-01",
                    "value": 23.5,
                    "unit": "celsius",
                    "type": "temperature",
                    "labels": {...}
                }
            ]
        },
        "ts": 1729216200000
    }
    """
    
    def can_parse(self, payload: Dict[str, Any], topic: str) -> bool:
        """
        Verifica se o payload segue o formato padrão TrakSense.
        
        Critérios:
        1. Payload é um dict
        2. Tem campo 'payload' (wrapper do EMQX) ou 'sensors' diretamente
        3. O campo 'sensors' é uma lista com elementos dict contendo 'sensor_id' e 'value'
        """
        if not isinstance(payload, dict):
            return False
        
        # Extrair payload interno se vier do EMQX
        inner_payload = payload.get('payload') if 'payload' in payload else payload
        
        if not isinstance(inner_payload, dict):
            return False
        
        # Verificar se tem array de sensores
        sensors = inner_payload.get('sensors')
        if not isinstance(sensors, list):
            return False
        
        # Verificar se pelo menos um sensor tem a estrutura esperada
        for sensor in sensors:
            if isinstance(sensor, dict):
                if sensor.get('sensor_id') and 'value' in sensor:
                    return True
        
        return False
    
    def parse(self, payload: Dict[str, Any], topic: str) -> Dict[str, Any]:
        """
        Processa payload no formato padrão TrakSense.
        """
        # Extrair campos do wrapper EMQX
        client_id = payload.get('client_id')
        ts = payload.get('ts')
        
        # Extrair payload interno
        inner_payload = payload.get('payload') if 'payload' in payload else payload
        
        # Extrair device_id
        device_id = inner_payload.get('device_id')
        if not device_id:
            device_id = client_id
            logger.warning(f"device_id não encontrado no payload, usando client_id: {client_id}")
        
        # Extrair timestamp
        timestamp = None
        
        # Prioridade 1: timestamp no payload interno
        if inner_payload.get('timestamp'):
            try:
                timestamp = datetime.datetime.fromisoformat(
                    inner_payload['timestamp'].replace('Z', '+00:00')
                )
            except (ValueError, AttributeError):
                pass
        
        # Prioridade 2: ts do EMQX (em milissegundos)
        if not timestamp and ts:
            try:
                # IMPORTANTE: Especificar timezone UTC explicitamente
                timestamp = datetime.datetime.fromtimestamp(ts / 1000.0, tz=datetime.timezone.utc)
            except (ValueError, TypeError):
                pass
        
        # Fallback: timestamp atual em UTC
        if not timestamp:
            timestamp = datetime.datetime.now(tz=datetime.timezone.utc)
            logger.warning("Timestamp não encontrado, usando timestamp atual")
        
        # Extrair sensores
        sensors = []
        for sensor_data in inner_payload.get('sensors', []):
            if not isinstance(sensor_data, dict):
                continue
            
            sensor_id = sensor_data.get('sensor_id')
            value = sensor_data.get('value')
            
            if not sensor_id or value is None:
                logger.warning(f"Sensor inválido ignorado: {sensor_data}")
                continue
            
            # Extrair labels
            labels = sensor_data.get('labels', {})
            if not isinstance(labels, dict):
                labels = {}
            
            # Adicionar unit aos labels se não estiver lá
            if 'unit' not in labels and sensor_data.get('unit'):
                labels['unit'] = sensor_data['unit']
            
            # Adicionar type aos labels se não estiver lá
            if 'type' not in labels and sensor_data.get('type'):
                labels['type'] = sensor_data['type']
            
            # Adicionar location aos labels se existir
            if 'location' not in labels and sensor_data.get('location'):
                labels['location'] = sensor_data['location']
            
            # Adicionar description aos labels se existir
            if 'description' not in labels and sensor_data.get('description'):
                labels['description'] = sensor_data['description']
            
            sensors.append({
                'sensor_id': sensor_id,
                'value': float(value),
                'labels': labels
            })
        
        result = {
            'device_id': device_id,
            'timestamp': timestamp,
            'sensors': sensors,
            'metadata': {
                'format': 'standard',
                'client_id': client_id
            }
        }
        
        logger.info(
            f"✅ StandardParser: device={device_id}, "
            f"sensors={len(sensors)}, timestamp={timestamp}"
        )
        
        return result
