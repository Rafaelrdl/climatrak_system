"""
AI Utils - Tolerant JSON Parser

Extrai e valida JSON de respostas LLM que podem conter texto extra,
fences de código markdown, ou outros artefatos.
"""

import json
import logging
import re
from typing import Any, Optional, Tuple

logger = logging.getLogger(__name__)


def extract_first_json_object(text: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Extrai o primeiro objeto JSON válido de um texto que pode conter
    markdown fences, texto explicativo, ou outros artefatos.

    Args:
        text: Texto bruto da resposta LLM

    Returns:
        Tuple de (parsed_dict, error_message).
        Se sucesso: (dict, None)
        Se falha: (None, error_message)

    Examples:
        >>> extract_first_json_object('```json\\n{"foo": 1}\\n```')
        ({'foo': 1}, None)

        >>> extract_first_json_object('Here is the analysis: {"result": true}')
        ({'result': True}, None)

        >>> extract_first_json_object('No JSON here')
        (None, 'No JSON object found in text')
    """
    if not text or not text.strip():
        return None, "Empty input text"

    original_text = text

    # 1. Remover fences de markdown (```json ... ``` ou ``` ... ```)
    # Captura conteúdo dentro de fences
    fence_pattern = r"```(?:json|JSON)?\s*([\s\S]*?)```"
    fence_matches = re.findall(fence_pattern, text)
    if fence_matches:
        # Tentar cada match dentro de fence
        for match in fence_matches:
            result, error = _try_parse_json(match.strip())
            if result is not None:
                return result, None
        # Se nenhum fence teve JSON válido, continuar com o texto original
        logger.debug("Fence content did not contain valid JSON, trying full text")

    # 2. Tentar parse direto do texto (removendo fences primeiro)
    text = re.sub(r"```(?:json|JSON)?\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    result, error = _try_parse_json(text)
    if result is not None:
        return result, None

    # 3. Tentar encontrar objeto JSON por padrão de braces
    # Encontra a primeira ocorrência de { e tenta parsear dali
    brace_start = text.find("{")
    if brace_start != -1:
        # Tenta encontrar o fechamento correspondente
        candidate = text[brace_start:]
        result, error = _try_parse_json_with_brace_matching(candidate)
        if result is not None:
            return result, None

    # 4. Se ainda falhou, tentar extrair JSON de arrays também
    bracket_start = text.find("[")
    if bracket_start != -1:
        candidate = text[bracket_start:]
        result, _ = _try_parse_json(candidate)
        if result is not None and isinstance(result, list):
            # Retorna como dict com key "items" para manter interface consistente
            return {"items": result}, None

    logger.warning(f"Failed to extract JSON from text (length={len(original_text)}): {original_text[:200]}...")
    return None, "No valid JSON object found in text"


def _try_parse_json(text: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Tenta parsear texto como JSON.

    Returns:
        Tuple de (parsed_dict, error_message)
    """
    if not text:
        return None, "Empty text"

    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result, None
        elif isinstance(result, list):
            # Aceita array também
            return {"items": result}, None
        else:
            return None, f"JSON is not an object or array: {type(result)}"
    except json.JSONDecodeError as e:
        return None, str(e)


def _try_parse_json_with_brace_matching(text: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Tenta encontrar um objeto JSON válido usando matching de braces.

    Começa do primeiro { e tenta encontrar o } correspondente,
    tentando parsear a cada fechamento de brace.

    Args:
        text: Texto começando com {

    Returns:
        Tuple de (parsed_dict, error_message)
    """
    if not text or not text.startswith("{"):
        return None, "Text does not start with {"

    depth = 0
    in_string = False
    escape_next = False

    for i, char in enumerate(text):
        if escape_next:
            escape_next = False
            continue

        if char == "\\":
            escape_next = True
            continue

        if char == '"' and not escape_next:
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                # Encontrou o fechamento
                candidate = text[: i + 1]
                result, error = _try_parse_json(candidate)
                if result is not None:
                    return result, None
                # Se não parseou, continua procurando

    return None, "No matching closing brace found"


def clean_llm_response(text: str) -> str:
    """
    Limpa resposta LLM removendo artefatos comuns.

    Args:
        text: Resposta bruta do LLM

    Returns:
        Texto limpo
    """
    if not text:
        return ""

    # Remove fences de markdown
    text = re.sub(r"```(?:json|JSON)?\s*", "", text)
    text = re.sub(r"```\s*", "", text)

    # Remove prefixos comuns de LLMs
    prefixes_to_remove = [
        "Here is the JSON:",
        "Here's the JSON:",
        "Here is the result:",
        "Here's the result:",
        "Output:",
        "Result:",
        "JSON:",
    ]
    for prefix in prefixes_to_remove:
        if text.strip().lower().startswith(prefix.lower()):
            text = text.strip()[len(prefix):].strip()
            break

    return text.strip()


def validate_json_schema(
    data: dict,
    required_keys: set[str],
    optional_keys: Optional[set[str]] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Valida se um dict tem as chaves obrigatórias.

    Args:
        data: Dicionário para validar
        required_keys: Conjunto de chaves obrigatórias
        optional_keys: Conjunto de chaves opcionais (para logging)

    Returns:
        Tuple de (is_valid, error_message)
    """
    if not isinstance(data, dict):
        return False, f"Expected dict, got {type(data)}"

    missing = required_keys - set(data.keys())
    if missing:
        return False, f"Missing required keys: {missing}"

    return True, None
