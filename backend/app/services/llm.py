import httpx
import json
from typing import AsyncGenerator, Optional
from app.config import settings


class LLMResponseError(Exception):
    """Raised when LLM returns invalid response (e.g., malformed JSON in JSON mode)"""
    pass


class LLMClient:
    def __init__(self, base_url: str, default_model: str = "mealmind-default", api_key: str = ""):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model
        self.api_key = api_key
        self._client = httpx.AsyncClient(timeout=30.0)
        self._headers = {"Content-Type": "application/json"}
        if self.api_key:
            self._headers["Authorization"] = f"Bearer {self.api_key}"

    async def close(self) -> None:
        """Close the underlying HTTP client"""
        await self._client.aclose()

    async def chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        json_mode: bool = False,
        stream: bool = False
    ):
        """
        Send chat request to LiteLLM proxy.
        
        Args:
            messages: List of OpenAI-format message dicts
            model: Override default model (ignored if json_mode=True)
            json_mode: Use mealmind-json model, parse response as JSON
            stream: Return async generator of content deltas if True
        
        Returns:
            - If stream=True: Async generator yielding content deltas
            - If json_mode=True: Parsed JSON dict
            - Otherwise: Content string
        """
        if json_mode:
            current_model = "mealmind-json"
        else:
            current_model = model if model is not None else self.default_model

        payload = {
            "model": current_model,
            "messages": messages,
            "stream": stream
        }

        url = f"{self.base_url}/chat/completions"

        if stream:
            return self._stream_chat(url, payload)
        return await self._non_stream_chat(url, payload, json_mode)

    async def _non_stream_chat(self, url: str, payload: dict, json_mode: bool):
        """Handle non-streaming chat request"""
        response = await self._client.post(url, json=payload, headers=self._headers, timeout=300.0)
        response.raise_for_status()
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]

        if json_mode:
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                raise LLMResponseError(f"Invalid JSON response from LLM: {e}") from e
        return content

    async def _stream_chat(self, url: str, payload: dict) -> AsyncGenerator[str, None]:
        """Handle streaming chat request, yield content deltas"""
        async with self._client.stream("POST", url, json=payload, headers=self._headers, timeout=300.0) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                
                line = line[6:].strip()
                if line == "[DONE]":
                    break
                
                try:
                    chunk = json.loads(line)
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except (json.JSONDecodeError, KeyError):
                    # Skip malformed SSE chunks
                    continue


def get_llm() -> LLMClient:
    """Create and return configured LLM client using app settings"""
    return LLMClient(
        base_url=settings.LITELLM_PROXY_URL,
        api_key=settings.LITELLM_PROXY_API_KEY
    )
