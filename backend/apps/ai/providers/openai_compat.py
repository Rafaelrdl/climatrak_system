"""
AI Providers - OpenAI-Compatible Client

Cliente LLM compatível com API OpenAI.
Funciona com: OpenAI, Z.ai, vLLM, LocalAI, etc.
"""

import logging
import threading
import time
from typing import List, Optional

import httpx

from .base import BaseLLMProvider, LLMConfig, LLMMessage, LLMResponse

logger = logging.getLogger(__name__)

# Rate limiter global (singleton por processo)
_rate_limiter_lock = threading.Lock()
_last_request_time: float = 0.0
_rate_limit_backoff_until: float = 0.0


class OpenAICompatProvider(BaseLLMProvider):
    """
    Cliente para APIs compatíveis com OpenAI.

    Compatível com:
    - OpenAI oficial
    - Z.ai (GLM-4)
    - vLLM (--api-key / OpenAI compat)
    - LocalAI
    - Azure OpenAI (com ajustes)
    
    Features:
    - Rate limiting automático com delay entre requisições
    - Backoff exponencial em caso de erro 429
    """

    def __init__(self, config: LLMConfig):
        super().__init__(config)
        self.base_url = config.base_url.rstrip("/")
        self.chat_endpoint = f"{self.base_url}/chat/completions"
    
    def _wait_for_rate_limit(self) -> None:
        """
        Aguarda o delay mínimo entre requisições para evitar rate limiting.
        
        Implementa:
        1. Delay mínimo entre requisições (rate_limit_delay)
        2. Backoff adicional após erros 429 (rate_limit_backoff)
        """
        global _last_request_time, _rate_limit_backoff_until
        
        with _rate_limiter_lock:
            now = time.time()
            
            # Verificar se estamos em período de backoff
            if now < _rate_limit_backoff_until:
                wait_time = _rate_limit_backoff_until - now
                self.logger.info(f"Rate limit backoff: waiting {wait_time:.1f}s")
                time.sleep(wait_time)
                now = time.time()
            
            # Aplicar delay mínimo entre requisições
            elapsed = now - _last_request_time
            if elapsed < self.config.rate_limit_delay:
                wait_time = self.config.rate_limit_delay - elapsed
                self.logger.debug(f"Rate limit delay: waiting {wait_time:.1f}s")
                time.sleep(wait_time)
            
            _last_request_time = time.time()
    
    def _set_rate_limit_backoff(self) -> None:
        """Define período de backoff após erro 429."""
        global _rate_limit_backoff_until
        
        with _rate_limiter_lock:
            _rate_limit_backoff_until = time.time() + self.config.rate_limit_backoff
            self.logger.warning(
                f"Rate limit hit, backing off for {self.config.rate_limit_backoff}s"
            )

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
        """
        Parseia resposta da API.
        
        Suporta dois formatos:
        1. OpenAI compat: usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
        2. Fallback: prompt_eval_count, eval_count (campos no root)
        
        Campos extras preservados em raw_response:
        - total_duration, load_duration, prompt_eval_duration, eval_duration (nanosegundos)
        """
        try:
            choices = response_data.get("choices", [])
            if not choices:
                # Lista vazia - resposta inválida
                raise ValueError("Empty choices in LLM response")
            
            choice = choices[0]
            message = choice.get("message", {})
            usage = response_data.get("usage", {})

            # Tentar formato OpenAI primeiro
            tokens_prompt = usage.get("prompt_tokens", 0)
            tokens_completion = usage.get("completion_tokens", 0)
            tokens_total = usage.get("total_tokens", 0)

            # Fallback para formato alternativo (campos no root)
            if tokens_prompt == 0 and tokens_completion == 0:
                tokens_prompt = response_data.get("prompt_eval_count", 0)
                tokens_completion = response_data.get("eval_count", 0)
                # Recalcular total se não vier
                if tokens_total == 0:
                    tokens_total = tokens_prompt + tokens_completion

            return LLMResponse(
                content=message.get("content", ""),
                tokens_prompt=tokens_prompt,
                tokens_completion=tokens_completion,
                tokens_total=tokens_total,
                model=response_data.get("model", self.config.model),
                finish_reason=choice.get("finish_reason", ""),
                raw_response=response_data,
            )
        except (KeyError, IndexError, ValueError) as e:
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

        Implementa:
        - Rate limiting com delay entre requisições
        - Retry com backoff exponencial
        - Backoff adicional após erro 429
        """
        body = self._build_request_body(messages, temperature, max_tokens, **kwargs)
        headers = self._get_headers()
        last_error = None
        
        self.logger.debug(f"LLM request body: model={body.get('model')}, messages_count={len(body.get('messages', []))}")

        for attempt in range(self.config.retry_attempts):
            # Aplicar rate limiting antes de cada requisição
            self._wait_for_rate_limit()
            
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
                # Log do corpo da resposta de erro
                try:
                    error_body = e.response.text[:500]
                    self.logger.error(f"LLM error response body: {error_body}")
                except Exception:
                    pass
                
                # Rate limit - aplicar backoff e tentar novamente
                if e.response.status_code == 429:
                    self._set_rate_limit_backoff()
                    # Continua para o retry
                # Não retry para outros erros 4xx
                elif 400 <= e.response.status_code < 500:
                    raise
            except Exception as e:
                last_error = e
                self.logger.exception(f"LLM request error: {e}")

            # Backoff exponencial
            if attempt < self.config.retry_attempts - 1:
                delay = self.config.retry_delay * (2**attempt)
                self.logger.info(f"Retrying in {delay}s...")
                time.sleep(delay)

        raise RuntimeError(f"LLM request failed after {self.config.retry_attempts} attempts: {last_error}")

    def health_check(self) -> bool:
        """
        Verifica se o provider está disponível.

        Estratégia em 2 etapas:
        1. Tenta GET /models (padrão OpenAI)
        2. Se falhar, tenta POST /chat/completions mínimo (fallback para Z.ai e outros)
        """
        try:
            with httpx.Client(timeout=10) as client:
                # Etapa A: Tenta endpoint de modelos (padrão OpenAI)
                try:
                    response = client.get(
                        f"{self.base_url}/models",
                        headers=self._get_headers(),
                    )
                    if response.status_code == 200:
                        return True
                    self.logger.debug(f"GET /models returned status {response.status_code}")
                except Exception as e:
                    self.logger.debug(f"GET /models failed: {e}")

                # Etapa B: Fallback - POST mínimo em /chat/completions
                try:
                    body = {
                        "model": self.config.model,
                        "messages": [{"role": "user", "content": "ping"}],
                        "max_tokens": 1,
                        "temperature": 0,
                        "stream": False,
                    }
                    response = client.post(
                        self.chat_endpoint,
                        json=body,
                        headers=self._get_headers(),
                    )
                    if response.status_code == 200:
                        self.logger.debug("Health check via chat/completions succeeded")
                        return True
                    self.logger.debug(f"POST /chat/completions returned status {response.status_code}")
                except Exception as e:
                    self.logger.debug(f"POST /chat/completions failed: {e}")

                return False
        except Exception as e:
            self.logger.warning(f"LLM health check failed: {e}")
            return False
