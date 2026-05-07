import { useRef, useCallback, useState } from 'react';
import { useChatStore } from '../stores/chatStore';

interface UseChatStreamReturn {
  sendMessage: (message: string, screen?: string, planId?: string) => void;
  isStreaming: boolean;
}

export function useChatStream(): UseChatStreamReturn {
  const { addMessage, setFabPulsing } = useChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback((message: string, screen?: string, planId?: string) => {
    if (isStreaming) {
      // Already streaming, abort current stream
      abortControllerRef.current?.abort();
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8400';
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    setFabPulsing(true);

    // Add empty assistant message that we'll update with streaming content
    addMessage({
      role: 'assistant',
      content: '',
    });

    fetch(`${API_BASE}/api/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        screen,
        plan_id: planId,
      }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No readable stream in SSE response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const normalizedBuffer = buffer.replace(/\r\n/g, '\n');
        const eventBlocks = normalizedBuffer.split('\n\n');
        buffer = eventBlocks.pop() || '';

        for (const block of eventBlocks) {
          if (!block.trim()) continue;

          const lines = block.split('\n');
          let data = '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              data += line.slice(5).trim();
            }
          }

          if (data) {
            try {
              const parsed = JSON.parse(data);

              if (parsed.delta) {
                assistantContent += parsed.delta;
                // Update the last assistant message in store
                updateLastAssistantMessage(assistantContent);
              }

              if (parsed.done) {
                // Stream complete
                setIsStreaming(false);
                setFabPulsing(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', data, e);
            }
          }
        }
      }
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error('Chat stream error:', error);
        setIsStreaming(false);
        setFabPulsing(false);
        // Add error message
        addMessage({
          role: 'assistant',
          content: 'Sorry, there was an error processing your request. Please try again.',
        });
      } else {
        setIsStreaming(false);
        setFabPulsing(false);
      }
    });
  }, [addMessage, setFabPulsing, isStreaming]);

  return {
    sendMessage,
    isStreaming,
  };
}

// Helper to update the last assistant message in the store
function updateLastAssistantMessage(content: string) {
  useChatStore.setState((state) => {
    const messages = [...state.messages];
    // Find the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        messages[i] = {
          ...messages[i],
          content,
        };
        break;
      }
    }
    return { messages };
  });
}
