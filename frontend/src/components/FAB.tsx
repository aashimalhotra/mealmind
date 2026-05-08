import React from 'react';

interface FABProps {
  pulse?: boolean;
  onClick?: () => void;
}

const FAB: React.FC<FABProps> = ({ pulse = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      data-testid="chat-fab"
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 w-13 h-13 rounded-full bg-accent-gold flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-105 ${
        pulse ? 'animate-pulse' : ''
      }`}
      aria-label="Open AI chat"
    >
      {/* Flame icon for AI chat */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c-1.8 2.4-4.8 3.6-4.8 7.2 0 2.64 2.16 4.8 4.8 4.8s4.8-2.16 4.8-4.8c0-3.6-2.4-5.4-4.8-7.2z" />
        <path d="M9 19.5h6M9.75 22.5h4.5" />
      </svg>
    </button>
  );
};

export default FAB;
