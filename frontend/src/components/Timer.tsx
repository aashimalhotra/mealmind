import { useCallback } from 'react';
import { useCountdown } from '../hooks/useCountdown';

interface TimerProps {
  label?: string;
  durationSec: number;
  autoStart?: boolean;
  onComplete?: () => void;
  paused?: boolean;
  onTogglePause?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function Timer({
  label,
  durationSec,
  autoStart = false,
  onComplete,
  paused = false,
  onTogglePause,
}: TimerProps) {
  const { remaining, isComplete, extend } = useCountdown(durationSec, !autoStart || paused);
  const durationMin = Math.ceil(durationSec / 60);

  const handleExtend = useCallback(() => {
    extend(60);
  }, [extend]);

  if (isComplete && onComplete) {
    onComplete();
  }

  return (
    <div
      style={{
        background: '#3D2E1F',
        borderRadius: '14px',
        padding: '20px',
        textAlign: 'center',
        marginBottom: '16px',
      }}
    >
      {label && (
        <p
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.5)',
            margin: '0',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </p>
      )}
      <p
        style={{
          fontSize: '42px',
          fontWeight: 500,
          color: '#FFF',
          margin: '8px 0',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatTime(remaining)}
      </p>
      <p
        style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)',
          margin: '0 0 16px',
        }}
      >
        of {formatTime(durationSec)}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={onTogglePause}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? (
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M6 4l10 6-10 6z" fill="#FFF" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20">
              <rect x="5" y="4" width="4" height="12" rx="1" fill="#FFF" />
              <rect x="11" y="4" width="4" height="12" rx="1" fill="#FFF" />
            </svg>
          )}
        </button>
        <button
          onClick={handleExtend}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Extend by 1 minute"
        >
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M6 10h8" stroke="#FFF" strokeWidth="1.5" />
            <path d="M12 8l2 2-2 2" stroke="#FFF" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
