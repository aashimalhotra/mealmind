import pytest
import json
from app.services.llm import LLMClient, LLMResponseError, get_llm


@pytest.mark.asyncio
async def test_chat_non_streaming_returns_content(httpx_mock):
    """Test that non-streaming chat returns content string"""
    # Mock the LiteLLM endpoint response
    httpx_mock.add_response(
        json={
            "choices": [
                {
                    "message": {
                        "content": "Hello! I'm MealMind assistant."
                    }
                }
            ]
        }
    )

    client = LLMClient(base_url="http://localhost:4000")
    messages = [{"role": "user", "content": "Hello"}]
    
    result = await client.chat(messages)
    
    assert result == "Hello! I'm MealMind assistant."
    
    # Verify the request was made correctly
    request = httpx_mock.get_request()
    assert request.url.path == "/chat/completions"
    body = json.loads(request.content)
    assert body["model"] == "mealmind-default"
    assert body["messages"] == messages
    assert body["stream"] is False


@pytest.mark.asyncio
async def test_chat_json_mode_parses_response(httpx_mock):
    """Test that JSON mode parses response as dict"""
    json_response = {"meal_plan": {"monday": {"breakfast": "eggs"}}}
    
    httpx_mock.add_response(
        json={
            "choices": [
                {
                    "message": {
                        "content": json.dumps(json_response)
                    }
                }
            ]
        }
    )

    client = LLMClient(base_url="http://localhost:4000")
    messages = [{"role": "user", "content": "Generate a meal plan"}]
    
    result = await client.chat(messages, json_mode=True)
    
    assert result == json_response
    assert isinstance(result, dict)
    
    # Verify mealmind-json model was used
    request = httpx_mock.get_request()
    body = json.loads(request.content)
    assert body["model"] == "mealmind-json"


@pytest.mark.asyncio
async def test_chat_json_mode_raises_on_invalid_json(httpx_mock):
    """Test that JSON mode raises LLMResponseError on invalid JSON"""
    httpx_mock.add_response(
        json={
            "choices": [
                {
                    "message": {
                        "content": "This is not valid JSON"
                    }
                }
            ]
        }
    )

    client = LLMClient(base_url="http://localhost:4000")
    messages = [{"role": "user", "content": "Generate JSON"}]
    
    with pytest.raises(LLMResponseError) as exc_info:
        await client.chat(messages, json_mode=True)
    
    assert "Invalid JSON response from LLM" in str(exc_info.value)


@pytest.mark.asyncio
async def test_chat_streaming_yields_deltas(httpx_mock):
    """Test that streaming chat yields content deltas"""
    # Create SSE stream response
    sse_chunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        'data: {"choices":[{"delta":{"content":"!"}}]}',
        'data: [DONE]'
    ]
    
    httpx_mock.add_response(
        status_code=200,
        text="\n".join(sse_chunks),
        headers={"content-type": "text/event-stream"}
    )

    client = LLMClient(base_url="http://localhost:4000")
    messages = [{"role": "user", "content": "Hello"}]
    
    # Collect all deltas from the async generator
    deltas = []
    async for delta in await client.chat(messages, stream=True):
        deltas.append(delta)
    
    assert deltas == ["Hello", " world", "!"]
    
    # Verify the request was made with stream=True
    request = httpx_mock.get_request()
    body = json.loads(request.content)
    assert body["stream"] is True


@pytest.mark.asyncio
async def test_get_llm_returns_configured_client():
    """Test that get_llm() returns properly configured client"""
    client = get_llm()
    
    assert isinstance(client, LLMClient)
    assert client.base_url == "http://localhost:4000"  # default from settings
    assert client.default_model == "mealmind-default"
    
    await client.close()
