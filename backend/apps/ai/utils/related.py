"""
AI Utils - Related ID Normalization

Converte IDs de objetos relacionados (int/string) para UUID determinístico.
Isso permite que o campo AIJob.related_id (UUIDField) aceite IDs numéricos
de Asset, WorkOrder, InventoryItem, etc.

Referência: docs/ai/02-contrato-api.md
"""

import uuid
from typing import Union

# Namespace para geração de UUIDs determinísticos
# Usando NAMESPACE_URL para consistência
RELATED_UUID_NAMESPACE = uuid.NAMESPACE_URL


def normalize_related_id(
    related_type: str,
    raw_id: Union[str, int, uuid.UUID, None]
) -> uuid.UUID | None:
    """
    Converte related.id (int/string) para UUID determinístico.

    Se o ID já for um UUID válido, retorna como está.
    Caso contrário, gera um UUID determinístico usando uuid5 com
    o padrão: "{type}:{raw_id}".

    Args:
        related_type: Tipo do objeto relacionado (ex: "asset", "work_order")
        raw_id: ID original do objeto (pode ser int, string numérica ou UUID)

    Returns:
        UUID válido ou None se raw_id for None/vazio

    Examples:
        >>> normalize_related_id("asset", 123)
        UUID('...')  # uuid5(NAMESPACE_URL, "asset:123")
        
        >>> normalize_related_id("alert", "550e8400-e29b-41d4-a716-446655440000")
        UUID('550e8400-e29b-41d4-a716-446655440000')  # retorna como está
    """
    if raw_id is None:
        return None

    # Se já é UUID, retornar diretamente
    if isinstance(raw_id, uuid.UUID):
        return raw_id

    raw_id_str = str(raw_id).strip()
    if not raw_id_str:
        return None

    # Tentar fazer parse como UUID válido (36 chars, formato padrão)
    try:
        return uuid.UUID(raw_id_str)
    except (ValueError, AttributeError):
        pass

    # Não é UUID válido, gerar determinístico
    # Padrão: "{type}:{raw_id}"
    deterministic_key = f"{related_type}:{raw_id_str}"
    return uuid.uuid5(RELATED_UUID_NAMESPACE, deterministic_key)


def denormalize_related_id(
    related_type: str,
    uuid_id: uuid.UUID | None,
    expected_raw_ids: list[Union[str, int]] | None = None
) -> str | None:
    """
    Tenta recuperar o ID original a partir de um UUID.

    IMPORTANTE: Esta função só funciona quando você tem uma lista
    de IDs candidatos para verificar. Não é possível reverter
    uuid5 sem conhecer o input original.

    Args:
        related_type: Tipo do objeto relacionado
        uuid_id: UUID a verificar
        expected_raw_ids: Lista de IDs candidatos para verificar

    Returns:
        ID original (string) se encontrado na lista, None caso contrário

    Example:
        >>> denormalize_related_id("asset", some_uuid, [123, 456, 789])
        "123"  # Se some_uuid == normalize_related_id("asset", 123)
    """
    if uuid_id is None:
        return None

    if expected_raw_ids is None:
        return None

    for raw_id in expected_raw_ids:
        if normalize_related_id(related_type, raw_id) == uuid_id:
            return str(raw_id)

    return None
