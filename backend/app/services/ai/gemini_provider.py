"""Centralized Google Gemini Client Provider and API Execution Engine.

Manages client lifecycle, authentication checks, model selection, and prompt execution
using the official `google-genai` SDK.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class GeminiProvider:
    """Manages Gemini Client lifecycle and structured execution."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def is_configured(self) -> bool:
        """Return True if a valid GEMINI_API_KEY is configured."""
        return bool(self.settings.GEMINI_API_KEY and self.settings.GEMINI_API_KEY.strip())

    @property
    def model_name(self) -> str:
        """Return configured model name (default: gemini-2.5-flash)."""
        return self.settings.GEMINI_MODEL or "gemini-2.5-flash"

    def get_client(self) -> Optional[Any]:
        """Lazily initialize and return the Google GenAI client instance."""
        if not self.is_configured:
            return None
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.settings.GEMINI_API_KEY)
                logger.info(f"Initialized Google GenAI Client with model: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize google-genai Client: {e}")
                return None
        return self._client

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
    ) -> Optional[str]:
        """Generate text using Gemini."""
        client = self.get_client()
        if not client:
            return None

        try:
            config: Dict[str, Any] = {"temperature": temperature}
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=config,
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini generate_text failed: {e}")
            return None

    async def generate_structured_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
    ) -> Optional[Any]:
        """Generate guaranteed JSON output using response_mime_type."""
        client = self.get_client()
        if not client:
            return None

        try:
            config: Dict[str, Any] = {
                "response_mime_type": "application/json",
                "temperature": temperature,
            }
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=config,
            )
            if response.text:
                return json.loads(response.text)
            return None
        except Exception as e:
            logger.error(f"Gemini generate_structured_json failed: {e}")
            return None


# Global singleton instance
gemini_provider = GeminiProvider()
