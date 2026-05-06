import { PrepStep, BackgroundTimer } from '../components/ActiveStepCard';
import { BackgroundTimer as BGTimer } from '../components/BackgroundTimerList';

export interface PrepSession {
  id: string;
  session_id: string;
  title: string;
  subtitle: string;
  est_total_min: number;
  dishes: {
    id: string;
    name: string;
    color: string;
    type: string;
  }[];
  steps: PrepStep[];
  completed_steps_count: number;
  background_timers: BGTimer[];
}

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

export const getPrepSession = async (sessionId: string): Promise<PrepSession> => {
  const response = await fetch(`${API_BASE}/prep/${sessionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch prep session: ${response.statusText}`);
  }
  return response.json();
};

export const completePrepStep = async (
  sessionId: string,
  stepIndex: number
): Promise<PrepStep> => {
  const response = await fetch(`${API_BASE}/prep/${sessionId}/step/${stepIndex}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ completed: true }),
  });
  if (!response.ok) {
    throw new Error(`Failed to complete step: ${response.statusText}`);
  }
  return response.json();
};
