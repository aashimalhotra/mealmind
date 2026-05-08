import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useChatStream } from '../hooks/useChatStream';

const ChatPanel: React.FC = () => {
  const { messages, addMessage, isFabPulsing, setFabPulsing } = useChatStore();
  const { sendMessage, isStreaming } = useChatStream();
  const [inputValue, setInputValue] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a user message
  const handleSendMessage = () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage = inputValue.trim();
    
    addMessage({
      role: 'user',
      content: userMessage,
    });

    setInputValue('');
    sendMessage(userMessage);
  };

  // Handle quick action click
  const handleQuickAction = (action: string) => {
    if (isStreaming) return;

    addMessage({
      role: 'user',
      content: action,
    });
    sendMessage(action);
  };

  // Handle clear chat
  const handleClearChat = async () => {
    setIsClearing(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8400';
      const response = await fetch(`${API_BASE}/api/chat/history`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }
      // Clear local store
      useChatStore.setState({ messages: [] });
    } catch (error) {
      console.error('Failed to clear chat:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-[#E8DDD0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center">
            {/* Flame icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 2c-1.2 1.6-3.2 2.4-3.2 4.8 0 1.76 1.44 3.2 3.2 3.2s3.2-1.44 3.2-3.2C11.2 4.4 9.2 3.6 8 2z" />
              <path d="M6 13h4M6.5 15h3" />
            </svg>
          </div>
          <p className="text-base font-medium text-text-primary">MealMind</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearChat}
            disabled={isClearing}
            className="bg-white rounded-lg px-2.5 py-1 border border-[#E8DDD0] text-xs text-text-tertiary disabled:opacity-50"
          >
            {isClearing ? 'Clearing...' : 'Clear'}
          </button>
          <button className="bg-white rounded-lg p-1.5 border border-[#E8DDD0]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#8C7B6B" strokeWidth="1.2" strokeLinecap="round">
              <path d="M3 7h8M7 3v8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-tertiary text-sm mt-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-accent-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round">
                    <path d="M7 2c-1 1.3-2.7 2-2.7 4 0 1.5 1.2 2.7 2.7 2.7s2.7-1.2 2.7-2.7c0-2-1.7-2.7-2.7-4z" />
                    <path d="M5 13h4M5.5 15h3" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[75%] p-3.5 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-text-primary text-white rounded-br-sm'
                    : 'bg-white border border-[#E8DDD0] rounded-bl-sm'
                }`}
                data-testid={message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}
              >
                <p className={`text-sm leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-text-primary'}`}>{message.content}</p>
                <p className="text-[10px] text-text-tertiary mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="px-5 py-3 border-t border-[#E8DDD0]">
          <p className="text-[11px] text-text-tertiary mb-2 text-center">Quick actions</p>
          <div className="flex gap-1.5 flex-wrap">
            {[
              'What can I make with leftovers?',
              'Swap a meal',
              'Review my week\'s nutrition',
              'Regenerate grocery list',
            ].map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="bg-white rounded-lg px-3 py-1.5 border border-[#E8DDD0] text-xs text-text-primary"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="p-4 border-t border-[#E8DDD0] bg-bg">
        <div className="flex gap-2.5 items-end">
          <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-[#E8DDD0]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about meals, nutrition, cooking..."
              className="w-full text-sm text-text-primary placeholder-text-tertiary outline-none bg-transparent"
              data-testid="chat-input"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isStreaming}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
              inputValue.trim() && !isStreaming ? 'bg-accent-gold' : 'bg-[#E8DDD0]'
            }`}
            data-testid="chat-send-button"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14V4M9 4l-4 4M9 4l4 4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
