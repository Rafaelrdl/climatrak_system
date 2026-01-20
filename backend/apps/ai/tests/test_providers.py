"""
Tests for AI Providers - LLM Client
"""

import json
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.ai.providers.base import LLMConfig, LLMMessage, LLMResponse
from apps.ai.providers.openai_compat import OpenAICompatProvider


class LLMConfigTests(TestCase):
    """Tests for LLMConfig dataclass."""

    def test_default_values(self):
        """Test LLMConfig with minimal args."""
        config = LLMConfig(
            base_url="http://localhost:11434/v1",
            model="mistral-nemo",
        )

        self.assertEqual(config.base_url, "http://localhost:11434/v1")
        self.assertEqual(config.model, "mistral-nemo")
        self.assertEqual(config.api_key, "")
        self.assertEqual(config.temperature, 0.2)
        self.assertEqual(config.max_tokens, 4096)
        self.assertEqual(config.timeout_seconds, 60)
        self.assertEqual(config.retry_attempts, 3)


class LLMMessageTests(TestCase):
    """Tests for LLMMessage dataclass."""

    def test_create_message(self):
        """Test creating LLM message."""
        msg = LLMMessage(role="user", content="Hello")
        self.assertEqual(msg.role, "user")
        self.assertEqual(msg.content, "Hello")


class LLMResponseTests(TestCase):
    """Tests for LLMResponse dataclass."""

    def test_tokens_used_from_total(self):
        """Test tokens_used returns total_tokens when available."""
        response = LLMResponse(
            content="Test",
            tokens_prompt=10,
            tokens_completion=20,
            tokens_total=30,
        )
        self.assertEqual(response.tokens_used, 30)

    def test_tokens_used_calculated(self):
        """Test tokens_used calculates from prompt + completion."""
        response = LLMResponse(
            content="Test",
            tokens_prompt=15,
            tokens_completion=25,
            tokens_total=0,
        )
        self.assertEqual(response.tokens_used, 40)


class OpenAICompatProviderTests(TestCase):
    """Tests for OpenAICompatProvider."""

    def setUp(self):
        """Set up test provider."""
        self.config = LLMConfig(
            base_url="http://test-llm:11434/v1",
            model="test-model",
            api_key="test-key",
            timeout_seconds=10,
            retry_attempts=2,
        )
        self.provider = OpenAICompatProvider(self.config)

    def test_get_headers_with_api_key(self):
        """Test headers include authorization when API key set."""
        headers = self.provider._get_headers()

        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertEqual(headers["Authorization"], "Bearer test-key")

    def test_get_headers_without_api_key(self):
        """Test headers without authorization when no API key."""
        config = LLMConfig(
            base_url="http://test-llm:11434/v1",
            model="test-model",
            api_key="",
        )
        provider = OpenAICompatProvider(config)
        headers = provider._get_headers()

        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertNotIn("Authorization", headers)

    def test_build_messages_payload(self):
        """Test message payload building."""
        messages = [
            LLMMessage(role="system", content="You are helpful"),
            LLMMessage(role="user", content="Hello"),
        ]

        payload = self.provider._build_messages_payload(messages)

        self.assertEqual(len(payload), 2)
        self.assertEqual(payload[0]["role"], "system")
        self.assertEqual(payload[0]["content"], "You are helpful")
        self.assertEqual(payload[1]["role"], "user")
        self.assertEqual(payload[1]["content"], "Hello")

    def test_build_request_body(self):
        """Test request body building."""
        messages = [LLMMessage(role="user", content="Test")]

        body = self.provider._build_request_body(messages)

        self.assertEqual(body["model"], "test-model")
        self.assertEqual(body["temperature"], 0.2)
        self.assertEqual(body["max_tokens"], 4096)
        self.assertEqual(len(body["messages"]), 1)

    def test_build_request_body_with_overrides(self):
        """Test request body with parameter overrides."""
        messages = [LLMMessage(role="user", content="Test")]

        body = self.provider._build_request_body(
            messages,
            temperature=0.8,
            max_tokens=1000,
        )

        self.assertEqual(body["temperature"], 0.8)
        self.assertEqual(body["max_tokens"], 1000)

    def test_parse_response_success(self):
        """Test parsing successful API response."""
        response_data = {
            "id": "test-id",
            "model": "test-model",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "Hello!"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15,
            },
        }

        result = self.provider._parse_response(response_data)

        self.assertEqual(result.content, "Hello!")
        self.assertEqual(result.tokens_prompt, 10)
        self.assertEqual(result.tokens_completion, 5)
        self.assertEqual(result.tokens_total, 15)
        self.assertEqual(result.finish_reason, "stop")

    def test_parse_response_empty_choices(self):
        """Test parsing response with no choices raises error."""
        response_data = {"choices": [], "usage": {}}

        with self.assertRaises(ValueError) as ctx:
            self.provider._parse_response(response_data)

        self.assertIn("Empty choices", str(ctx.exception))

    @patch("apps.ai.providers.openai_compat.httpx.Client")
    def test_chat_sync_success(self, mock_client_class):
        """Test successful synchronous chat call."""
        # Mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "model": "test-model",
            "choices": [
                {
                    "message": {"role": "assistant", "content": "Response"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8},
        }

        # Setup mock client
        mock_client = MagicMock()
        mock_client.post.return_value = mock_response
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_class.return_value = mock_client

        # Call
        messages = [LLMMessage(role="user", content="Hello")]
        result = self.provider.chat_sync(messages)

        # Assert
        self.assertEqual(result.content, "Response")
        self.assertEqual(result.tokens_total, 8)

    @patch("apps.ai.providers.openai_compat.httpx.Client")
    def test_health_check_success(self, mock_client_class):
        """Test successful health check."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        mock_client = MagicMock()
        mock_client.get.return_value = mock_response
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_class.return_value = mock_client

        result = self.provider.health_check()

        self.assertTrue(result)

    @patch("apps.ai.providers.openai_compat.httpx.Client")
    def test_health_check_failure(self, mock_client_class):
        """Test health check failure."""
        mock_client = MagicMock()
        mock_client.get.side_effect = Exception("Connection refused")
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client_class.return_value = mock_client

        result = self.provider.health_check()

        self.assertFalse(result)

    def test_parse_response_ollama_native_format(self):
        """
        Test parsing Ollama native format with prompt_eval_count and eval_count.
        
        Ollama responses include tokens in root level fields:
        - prompt_eval_count: input tokens
        - eval_count: output tokens
        """
        response_data = {
            "model": "gemma3",
            "choices": [
                {
                    "message": {"role": "assistant", "content": "Test response"},
                    "finish_reason": "stop",
                }
            ],
            "done": True,
            "prompt_eval_count": 11,
            "eval_count": 18,
            "total_duration": 5000000000,
            "load_duration": 100000000,
            "prompt_eval_duration": 200000000,
            "eval_duration": 4700000000,
        }

        result = self.provider._parse_response(response_data)

        self.assertEqual(result.content, "Test response")
        self.assertEqual(result.tokens_prompt, 11)
        self.assertEqual(result.tokens_completion, 18)
        self.assertEqual(result.tokens_total, 29)
        self.assertEqual(result.model, "gemma3")
        # Verify raw_response preserved
        self.assertEqual(result.raw_response["prompt_eval_count"], 11)
        self.assertEqual(result.raw_response["eval_count"], 18)
        self.assertEqual(result.raw_response["total_duration"], 5000000000)

    def test_parse_response_ollama_fallback_when_usage_empty(self):
        """
        Test that Ollama fields are used when usage dict is empty or missing.
        """
        response_data = {
            "model": "mistral-nemo",
            "choices": [
                {
                    "message": {"role": "assistant", "content": "Response text"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {},  # Empty usage dict
            "prompt_eval_count": 25,
            "eval_count": 42,
        }

        result = self.provider._parse_response(response_data)

        self.assertEqual(result.tokens_prompt, 25)
        self.assertEqual(result.tokens_completion, 42)
        self.assertEqual(result.tokens_total, 67)

    def test_parse_response_openai_format_takes_precedence(self):
        """
        Test that OpenAI usage format takes precedence over Ollama fields.
        """
        response_data = {
            "model": "gpt-4",
            "choices": [
                {
                    "message": {"role": "assistant", "content": "OpenAI response"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150,
            },
            # Ollama fields also present (should be ignored)
            "prompt_eval_count": 11,
            "eval_count": 18,
        }

        result = self.provider._parse_response(response_data)

        # Should use OpenAI format, not Ollama
        self.assertEqual(result.tokens_prompt, 100)
        self.assertEqual(result.tokens_completion, 50)
        self.assertEqual(result.tokens_total, 150)

