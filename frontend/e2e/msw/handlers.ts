/**
 * MSW Handlers for E2E Tests
 * Mock API endpoints for the MealMind application
 */

import { http, HttpResponse, delay, passthrough } from 'msw';

// Mock data
const mockPlan = {
  id: 'test-plan-123',
  user_id: 'test-user',
  plan_data: {
    monday: {
      breakfast: { recipe_id: 'recipe-1', meal_type: 'recipe' },
      lunch: { recipe_id: 'recipe-2', meal_type: 'recipe' },
      dinner: { recipe_id: 'recipe-3', meal_type: 'recipe' },
    },
    tuesday: {
      breakfast: { recipe_id: 'recipe-4', meal_type: 'recipe' },
      lunch: { recipe_id: 'recipe-5', meal_type: 'recipe' },
      dinner: { recipe_id: 'recipe-6', meal_type: 'recipe' },
    },
    wednesday: { prep_day: true },
    thursday: {
      breakfast: { recipe_id: 'recipe-7', meal_type: 'recipe' },
      lunch: { recipe_id: 'recipe-8', meal_type: 'recipe' },
      dinner: { recipe_id: 'recipe-9', meal_type: 'recipe' },
    },
    friday: { dine_out: true },
    saturday: {
      breakfast: { recipe_id: 'recipe-10', meal_type: 'recipe' },
      lunch: { recipe_id: 'recipe-11', meal_type: 'recipe' },
      dinner: { dine_out: true },
    },
    sunday: {
      breakfast: { recipe_id: 'recipe-12', meal_type: 'recipe' },
      lunch: { recipe_id: 'recipe-13', meal_type: 'recipe' },
      dinner: { recipe_id: 'recipe-14', meal_type: 'recipe' },
    },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockRecipes = {
  'recipe-1': {
    id: 'recipe-1',
    title: 'Oatmeal with Berries',
    description: 'Healthy oatmeal breakfast',
    ingredients: [
      { name: 'Rolled oats', amount: 50, unit: 'g' },
      { name: 'Berries', amount: 100, unit: 'g' },
    ],
    instructions: ['Cook oats', 'Add berries'],
    macros_per_serving: { kcal: 300, p: 10, c: 50, f: 8 },
    servings: 1,
    prep_time_minutes: 5,
    cook_time_minutes: 10,
  },
  'recipe-2': {
    id: 'recipe-2',
    title: 'Quinoa Salad',
    description: 'Fresh quinoa salad',
    ingredients: [
      { name: 'Quinoa', amount: 100, unit: 'g' },
      { name: 'Vegetables', amount: 150, unit: 'g' },
    ],
    instructions: ['Cook quinoa', 'Mix vegetables'],
    macros_per_serving: { kcal: 400, p: 15, c: 60, f: 12 },
    servings: 1,
    prep_time_minutes: 15,
    cook_time_minutes: 15,
  },
};

const mockGroceryItems = [
  { id: 'gi-1', plan_id: 'test-plan-123', name: 'Rolled oats', category: 'grains', checked: false },
  { id: 'gi-2', plan_id: 'test-plan-123', name: 'Berries', category: 'produce', checked: false },
  { id: 'gi-3', plan_id: 'test-plan-123', name: 'Quinoa', category: 'grains', checked: true },
];

// SSE event helper
function createSSEStream(stages: string[]) {
  return async function* () {
    for (const stage of stages) {
      yield `data: ${JSON.stringify(stage)}\n\n`;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    yield `event: done\ndata: test-plan-123\n\n`;
  };
}

export const handlers = [
  // Get current plan - returns 404 when no plan exists
  http.get('/api/plans/current', ({ request }) => {
    const url = new URL(request.url);
    const noPlan = url.searchParams.get('no-plan');
    if (noPlan) {
      return HttpResponse.json({ detail: 'No plan found' }, { status: 404 });
    }
    return HttpResponse.json(mockPlan);
  }),

  // Generate plan - SSE stream
  http.get('/api/plans/generate', async () => {
    const stream = new ReadableStream({
      async start(controller) {
        const stages = ['Starting…', 'Analyzing preferences…', 'Selecting recipes…', 'Building prep guide…'];
        for (const stage of stages) {
          controller.enqueue(`data: ${stage}\n\n`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        controller.enqueue(`event: done\ndata: test-plan-123\n\n`);
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  // Get recipe by ID
  http.get('/api/recipes/:id', ({ params }) => {
    const { id } = params;
    const recipe = mockRecipes[id as string];
    if (!recipe) {
      return HttpResponse.json({ detail: 'Recipe not found' }, { status: 404 });
    }
    return HttpResponse.json(recipe);
  }),

  // Get grocery list
  http.get('/api/grocery/:planId', ({ params }) => {
    const { planId } = params;
    return HttpResponse.json(
      mockGroceryItems.filter((item) => item.plan_id === planId)
    );
  }),

  // Toggle grocery item
  http.patch('/api/grocery/:planId/items/:itemId', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, ...body });
  }),

  // Get plan by ID
  http.get('/api/plans/:id', ({ params }) => {
    const { id } = params;
    if (id === mockPlan.id) {
      return HttpResponse.json(mockPlan);
    }
    return HttpResponse.json({ detail: 'Plan not found' }, { status: 404 });
  }),

  // Chat endpoint - SSE stream
  http.post('/api/chat', async ({ request }) => {
    const body = await request.json() as { message: string };
    
    const stream = new ReadableStream({
      async start(controller) {
        const response = `I received: "${body.message}". Here's a helpful response about your meal plan.`;
        // Stream character by character to simulate typing
        for (const char of response) {
          controller.enqueue(`data: ${JSON.stringify(char)}\n\n`);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        controller.enqueue(`event: done\ndata: complete\n\n`);
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];
