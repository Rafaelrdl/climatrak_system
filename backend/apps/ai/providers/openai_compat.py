"""
AI Providers - OpenAI-Compatible Client

Cliente LLM compatível com API OpenAI.
Funciona com: OpenAI, Ollama (/v1), vLLM, LocalAI, etc.
"""

import logging
import time
from typing import List, Optional

import httpx

from .base import BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse

logger = logging.getLogger(__name__)


class OpenAICompatProvider(BaseLLMProvider):
    """
    Cliente para APIs compatíveis com OpenAI.

    Compatível com:
    - OpenAI oficial
    - Ollama (endpoint /v1)
    - vLLM (--api-key / OpenAI compat)
    - LocalAI
    - Azure OpenAI (com ajustes)
    """

    def __init__(self, config: LLMConfig):
        super().__init__(config)
        self.base_url = config.base_url.rstrip("/")
        self.chat_endpoint = f"{self.base_url}/chat/completions"

    def _get_headers(self) -> dict:
        """Retorna headers para requisições."""
        headers = {
            "Content-Type": "application/json",
        }
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers

    def _build_request_body(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> dict:
        """Constrói corpo da requisição."""
        body = {
            "model": self.config.model,
            "messages": self._build_messages_payload(messages),
            "temperature": temperature or self.config.temperature,
            "max_tokens": max_tokens or self.config.max_tokens,
        }
        # Adicionar parâmetros extras se fornecidos
        for key, value in kwargs.items():
            if value is not None:
                body[key] = value
        return body

    def _parse_response(self, response_data: dict) -> LLMResponse:
        """Parseia resposta da API."""
        try:
            choice = response_data.get("choices", [{}])[0]
            message = choice.get("message", {})
            usage = response_data.get("usage", {})

            return LLMResponse(
                content=message.get("content", ""),
                tokens_prompt=usage.get("prompt_tokens", 0),
                tokens_completion=usage.get("completion_tokens", 0),
                tokens_total=usage.get("total_tokens", 0),
                model=response_data.get("model", self.config.model),
                finish_reason=choice.get("finish_reason", ""),
                raw_response=response_data,
            )
        except (KeyError, IndexError) as e:
            logger.error(f"Error parsing LLM response: {e}")
            raise ValueError(f"Invalid LLM response format: {e}")

    async def chat_async(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> LLMResponse:
        """
        Envia mensagens para o LLM de forma assíncrona.

        Implementa retry com backoff exponencial.
        """
        body = self._build_request_body(messages, temperature, max_tokens, **kwargs)
        headers = self._get_headers()
        last_error = None

        for attempt in range(self.config.retry_attempts):
            try:
                async with httpx.AsyncClient(
                    timeout=self.config.timeout_seconds
                ) as client:
                    response = await client.post(
                        self.chat_endpoint,
                        json=body,
                        headers=headers,
                    )
                    response.raise_for_status()
                    return self._parse_response(response.json())

            except httpx.TimeoutException as e:
                last_error = e
                self.logger.warning(
                    f"LLM request timeout (attempt {attempt + 1}/{self.config.retry_attempts})"
                )
            except httpx.HTTPStatusError as e:
                last_error = e
                self.logger.warning(
                    f"LLM request failed with status {e.response.status_code} "
                    f"(attempt {attempt + 1}/{self.config.retry_attempts})"
                )
                # Não retry para erros 4xx (exceto rate limit)
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    raise
            except Exception as e:
                last_error = e
                self.logger.exception(f"LLM request error: {e}")

            # Backoff exponencial
            if attempt < self.config.retry_attempts - 1:
                delay = self.config.retry_delay * (2**attempt)
                await self._async_sleep(delay)

        raise RuntimeError(f"LLM request failed after {self.config.retry_attempts} attempts: {last_error}")

    async def _async_sleep(self, seconds: float):
        """Sleep assíncrono."""
        import asyncio
        await asyncio.sleep(seconds)

    def chat_sync(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> LLMResponse:
        """
        Envia mensagens para o LLM de forma síncrona.

        Implementa retry com backoff exponencial.
        """
        body = self._build_request_body(messages, temperature, max_tokens, **kwargs)
        headers = self._get_headers()
        last_error = None

        for attempt in range(self.config.retry_attempts):
            try:
                with httpx.Client(timeout=self.config.timeout_seconds) as client:
                    response = client.post(
                        self.chat_endpoint,
                        json=body,
                        headers=headers,
                    )
                    response.raise_for_status()
                    return self._parse_response(response.json())

            except httpx.TimeoutException as e:
                last_error = e
                self.logger.warning(
                    f"LLM request timeout (attempt {attempt + 1}/{self.config.retry_attempts})"
                )
            except httpx.HTTPStatusError as e:
                last_error = e
                self.logger.warning(
                    f"LLM request failed with status {e.response.status_code} "
                    f"(attempt {attempt + 1}/{self.config.retry_attempts})"
                )
                # Não retry para erros 4xx (exceto rate limit)
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    raise
            except Exception as e:
                last_error = e
                self.logger.exception(f"LLM request error: {e}")

            # Backoff exponencial
            if attempt < self.config.retry_attempts - 1:
                delay = self.config.retry_delay * (2**attempt)
                time.sleep(delay)

        raise RuntimeError(f"LLM request failed after {self.config.retry_attempts} attempts: {last_error}")

    def health_check(self) -> bool:
        """
        Verifica se o provider está disponível.

        Tenta fazer uma requisição simples de listagem de modelos.
        """
        try:
            with httpx.Client(timeout=5) as client:
                # Tenta endpoint de modelos (padrão OpenAI)
                response = client.get(
                    f"{self.base_url}/models",
                    headers=self._get_headers(),
                )
                return response.status_code == 200
        except Exception as e:
            self.logger.warning(f"LLM health check failed: {e}")
            return False
