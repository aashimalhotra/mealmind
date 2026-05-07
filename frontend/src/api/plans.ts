import { apiGet, apiPatch } from './client';

// --- Type Definitions ---

/** Meal slot in plan_data (breakfast, lunch, dinner) */
export interface MealSlot {
  recipe_id?: string;
  meal_type?: string;
  notes?: string;
}

/** Daily meal structure in plan_data */
export interface DayMeals {
  breakfast?: MealSlot;
  lunch?: MealSlot;
  dinner?: MealSlot;
}

/** Full plan_data JSON structure (key: lowercase day name) */
export type PlanData = Record<string, DayMeals>;

/** Backend PlanOut response matching GET /api/plans/current */
export interface PlanOut {
  id: string;
  household_id: string;
  week_start: string; // YYYY-MM-DD (Monday)
  status: 'draft' | 'approved' | 'active' | 'completed';
  plan_data: PlanData;
  grocery_list?: string; // JSON string
  ai_insights?: string; // JSON string
  created_at: string;
  updated_at: string;
}

// --- API Functions ---

/**
 * Fetch current week's active plan
 * GET /api/plans/current
 */
export async function getCurrentPlan(): Promise<PlanOut> {
  return apiGet('/api/plans/current') as Promise<PlanOut>;
}

/**
 * Trigger plan generation and return EventSource-like object for SSE progress updates
 * SSE events include stages: "Drafting recipes…", "Building plan…", "Resolving nutrition…"
 * POST /api/plans/generate (SSE stream)
 */
export function generatePlan() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8400';
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  // Store event listeners by event type
  const listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();

  const eventSourceLike = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((error: Error | Event) => void) | null,

    addEventListener: (type: string, handler: (event: MessageEvent) => void) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)!.add(handler);
    },

    removeEventListener: (type: string, handler: (event: MessageEvent) => void) => {
      const handlers = listeners.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    },

    close: () => {
      controller.abort();
      if (reader) {
        reader.cancel().catch(() => {});
      }
    },
  };

  const dispatchEvent = (type: string, data: string) => {
    console.log('[SSE] Dispatching event type:', type, 'to listeners');
    const event = new MessageEvent(type, { data });

    // Call onmessage for 'message' type events
    if (type === 'message' && eventSourceLike.onmessage) {
      eventSourceLike.onmessage(event);
    }

    // Call registered listeners
    const handlers = listeners.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  };

  console.log('[SSE] Starting POST request to /api/plans/generate');

  fetch(`${API_BASE}/api/plans/generate`, {
    method: 'POST',
    headers: {
      'Accept': 'text/event-stream',
    },
    signal: controller.signal,
  }).then(async (response) => {
    console.log('[SSE] Response received, status:', response.status, 'ok:', response.ok);
    if (!response.ok) {
      throw new Error(`SSE request failed with status ${response.status}`);
    }
    if (!response.body) {
      throw new Error('No readable stream in SSE response');
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      console.log('[SSE] reader.read() result:', { done, valueLength: value?.length });
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      console.log('[SSE] Buffer after decode:', JSON.stringify(buffer));
      // Normalize line endings and split on event separator
      const normalizedBuffer = buffer.replace(/\r\n/g, '\n');
      const eventBlocks = normalizedBuffer.split('\n\n');
      console.log('[SSE] eventBlocks count:', eventBlocks.length);
      buffer = eventBlocks.pop() || '';

      for (const block of eventBlocks) {
        if (!block.trim()) continue;
        console.log('[SSE] Processing block:', JSON.stringify(block));

        let eventType = 'message';
        let data = '';
        const lines = block.split('\n');

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            data += line.slice(5).trim() + '\n';
          } else if (line.startsWith(':')) {
            // Ignore comment lines
          }
        }

        data = data.trimEnd();
        console.log('[SSE] Parsed event - type:', eventType, 'data:', data);
        if (data) {
          dispatchEvent(eventType, data);
        }
      }
    }
    console.log('[SSE] Stream closed');
  }).catch((error) => {
    console.log('[SSE] Fetch error:', error);
    if (error.name !== 'AbortError') {
      if (eventSourceLike.onerror) {
        eventSourceLike.onerror(error);
      }
      // Dispatch error event to listeners
      dispatchEvent('error', error.message);
    }
  });

  return eventSourceLike;
}

/**
 * Fetch a specific plan by ID
 * GET /api/plans/{id}
 */
export async function getPlan(planId: string): Promise<PlanOut> {
  return apiGet(`/api/plans/${planId}`) as Promise<PlanOut>;
}

/**
 * Approve a plan by ID (sets status to 'approved')
 * PATCH /api/plans/{id}
 */
export async function approvePlan(planId: string): Promise<PlanOut> {
  return apiPatch(`/api/plans/${planId}`, { status: 'approved' }) as Promise<PlanOut>;
}

/**
 * Insight response from GET /api/plans/{id}/insight
 */
export interface PlanInsight {
  severity: 'info' | 'warning' | 'critical';
  title?: string;
  body: string;
}

/**
 * Fetch AI insight for a specific plan
 * GET /api/plans/{id}/insight
 */
export async function getPlanInsight(planId: string): Promise<PlanInsight> {
  return apiGet(`/api/plans/${planId}/insight`) as Promise<PlanInsight>;
}
