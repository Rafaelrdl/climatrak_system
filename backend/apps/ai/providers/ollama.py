"""
AI Providers - Ollama Native Client

Cliente para API nativa do Ollama (/api/chat).
Mais estável e com melhor suporte que o endpoint OpenAI-compat.

Ref: https://github.com/ollama/ollama/blob/main/docs/api.md
"""

import logging
import time
from typing import List, Optional

import httpx

from .base import BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse

logger = logging.getLogger(__name__)


class OllamaNativeProvider(BaseLLMProvider):
    """
    Cliente para API nativa do Ollama.

    Usa /api/chat em vez de /v1/chat/completions (OpenAI compat).
    A API nativa é mais estável e tem menos problemas de timeout.
    """

    def __init__(self, config: LLMConfig):
        super().__init__(config)
        # Remove /v1 se presente na URL base
        base = config.base_url.rstrip("/")
        if base.endswith("/v1"):
            base = base[:-3]
        self.base_url = base
        self.chat_endpoint = f"{self.base_url}/api/chat"
        self.generate_endpoint = f"{self.base_url}/api/generate"

    def _get_headers(self) -> dict:
        """Retorna headers para requisições."""
        return {"Content-Type": "application/json"}

    def _build_messages_payload(self, messages: List[LLMMessage]) -> List[dict]:
        """Converte mensagens para formato Ollama."""
        return [{"role": m.role, "content": m.content} for m in messages]

    def _build_request_body(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> dict:
        """Constrói corpo da requisição para /api/chat."""
        # Opções válidas do Ollama (ref: https://github.com/ollama/ollama/blob/main/docs/modelfile.md)
        valid_options = {
            "temperature", "num_predict", "top_k", "top_p", "repeat_penalty",
            "seed", "num_ctx", "num_batch", "num_gpu", "main_gpu", "low_vram",
            "f16_kv", "vocab_only", "use_mmap", "use_mlock", "num_thread",
            "numa", "num_keep", "typical_p", "presence_penalty", "frequency_penalty",
            "mirostat", "mirostat_tau", "mirostat_eta", "penalize_newline", "stop",
        }
        
        options = {
            "temperature": temperature or self.config.temperature,
            "num_predict": max_tokens or self.config.max_tokens,
        }
        
        # Adicionar apenas opções válidas do Ollama
        for key, value in kwargs.items():
            if value is not None and key in valid_options:
                options[key] = value
        
        body = {
            "model": self.config.model,
            "messages": self._build_messages_payload(messages),
            "stream": False,  # Resposta completa, não streaming
            "options": options,
        }
        return body

    def _parse_response(self, response_data: dict) -> LLMResponse:
        """
        Parseia resposta da API nativa do Ollama.

        Formato esperado:
        {
            "model": "mistral-nemo",
            "message": {"role": "assistant", "content": "..."},
            "done": true,
            "total_duration": 123456789,  # nanosegundos
            "load_duration": 12345678,
            "prompt_eval_count": 100,
            "prompt_eval_duration": 12345678,
            "eval_count": 50,
            "eval_duration": 12345678
        }
        """
        try:
            message = response_data.get("message", {})
            content = message.get("content", "")

            # Tokens: Ollama usa prompt_eval_count e eval_count
            tokens_prompt = response_data.get("prompt_eval_count", 0)
            tokens_completion = response_data.get("eval_count", 0)
            tokens_total = tokens_prompt + tokens_completion

            # Finish reason baseado em "done"
            done = response_data.get("done", False)
            finish_reason = "stop" if done else "incomplete"

            return LLMResponse(
                content=content,
                tokens_prompt=tokens_prompt,
                tokens_completion=tokens_completion,
                tokens_total=tokens_total,
                model=response_data.get("model", self.config.model),
                finish_reason=finish_reason,
                raw_response=response_data,
            )
        except (KeyError, TypeError) as e:
            logger.error(f"Error parsing Ollama response: {e}")
            raise ValueError(f"Invalid Ollama response format: {e}")

    async def chat_async(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> LLMResponse:
        """
        Envia mensagens para o Ollama de forma assíncrona.

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
                    self.logger.debug(
                        f"Ollama request (attempt {attempt + 1}): "
                        f"model={self.config.model}, messages={len(messages)}"
                    )
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
                    f"Ollama request timeout (attempt {attempt + 1}/{self.config.retry_attempts})"
                )
            except httpx.HTTPStatusError as e:
                last_error = e
                self.logger.warning(
                    f"Ollama request failed with status {e.response.status_code} "
                    f"(attempt {attempt + 1}/{self.config.retry_attempts}): "
                    f"{e.response.text[:200]}"
                )
                # Não retry para erros 4xx (exceto rate limit)
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    raise
            except Exception as e:
                last_error = e
                self.logger.exception(f"Ollama request error: {e}")

            # Backoff exponencial
            if attempt < self.config.retry_attempts - 1:
                delay = self.config.retry_delay * (2**attempt)
                await self._async_sleep(delay)

        raise RuntimeError(
            f"Ollama request failed after {self.config.retry_attempts} attempts: {last_error}"
        )

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
        Envia mensagens para o Ollama de forma síncrona.

        Implementa retry com backoff exponencial.
        """
        body = self._build_request_body(messages, temperature, max_tokens, **kwargs)
        headers = self._get_headers()
        last_error = None

        for attempt in range(self.config.retry_attempts):
            try:
                with httpx.Client(timeout=self.config.timeout_seconds) as client:
                    self.logger.debug(
                        f"Ollama sync request (attempt {attempt + 1}): "
                        f"model={self.config.model}, messages={len(messages)}"
                    )
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
                    f"Ollama sync request timeout (attempt {attempt + 1}/{self.config.retry_attempts})"
                )
            except httpx.HTTPStatusError as e:
                last_error = e
                self.logger.warning(
                    f"Ollama sync request failed with status {e.response.status_code} "
                    f"(attempt {attempt + 1}/{self.config.retry_attempts})"
                )
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    raise
            except Exception as e:
                last_error = e
                self.logger.exception(f"Ollama sync request error: {e}")

            # Backoff exponencial
            if attempt < self.config.retry_attempts - 1:
                delay = self.config.retry_delay * (2**attempt)
                time.sleep(delay)

        raise RuntimeError(
            f"Ollama sync request failed after {self.config.retry_attempts} attempts: {last_error}"
        )

    def health_check(self) -> bool:
        """
        Verifica se o Ollama está saudável.

        Tenta fazer uma requisição HEAD para o servidor.
        """
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.head(self.base_url)
                return response.status_code == 200
        except Exception as e:
            self.logger.warning(f"Ollama health check failed: {e}")
            return False
