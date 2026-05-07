import React from 'react';

interface FABProps {
  pulse?: boolean;
  onClick?: () => void;
}

const FAB: React.FC<FABProps> = ({ pulse = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 w-13 h-13 rounded-full bg-accent-gold flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-105 ${
        pulse ? 'animate-pulse' : ''
      }`}
      aria-label="Open AI chat"
    >
      {/* Chat icon for AI interaction */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
};

export default FAB;
