from typing import AsyncGenerator, List, Dict
import httpx


async def stream_chat(messages: List[Dict]) -> AsyncGenerator[str, None]:
    """Stream chat responses from LLM via LiteLLM proxy."""
    from app.config import settings
    
    # LiteLLM proxy URL (OpenAI-compatible endpoint)
    url = f"{settings.LITELLM_PROXY_URL}/v1/chat/completions"
    
    # Request payload
    payload = {
        "model": "mealmind-default",
        "messages": messages,
        "stream": True
    }
    
    # Headers
    headers = {"Content-Type": "application/json"}
    if settings.LITELLM_PROXY_API_KEY:
        headers["Authorization"] = f"Bearer {settings.LITELLM_PROXY_API_KEY}"
    
    # Stream from the proxy
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as response:
            async for chunk in response.aiter_lines():
                if chunk.startswith("data: "):
                    data_str = chunk[6:]  # Remove "data: " prefix
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        import json
                        data = json.loads(data_str)
                        content = data["choices"][0]["delta"].get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError):
                        continue
