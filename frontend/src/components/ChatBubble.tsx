import React from 'react';
import { parseRecipeMarkers } from '../lib/parseRecipeMarkers';
import type { ContentSegment } from '../lib/parseRecipeMarkers';
import InlineRecipeCard from './InlineRecipeCard';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBubbleProps {
  message: ChatMessage;
  onRecipeAction: (action: string, payload?: Record<string, any>) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onRecipeAction }) => {
  const isUser = message.role === 'user';
  const segments: ContentSegment[] = parseRecipeMarkers(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}
      >
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <p key={index} className="whitespace-pre-wrap mb-2 last:mb-0">
                {segment.content}
              </p>
            );
          } else {
            return (
              <div key={index} className="my-2">
                <InlineRecipeCard
                  recipe={segment.data}
                  onAction={onRecipeAction}
                />
              </div>
            );
          }
        })}
        <p className="text-xs opacity-70 mt-1 text-right">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default ChatBubble;
