# MealMind — Technical Architecture

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React PWA (Vite + Tailwind) | Installable on phones, single codebase |
| Backend | FastAPI (Python) | Lightweight, async, pairs with LLM tooling |
| Database | SQLite (Phase 1) → PostgreSQL (Phase 4) | Simple for single household, migrate when multi-user |
| LLM Proxy | LiteLLM | Route between local Ollama and cloud models |
| Local LLM | Ollama (on Proxmox VM) | Free inference for quick tasks |
| Cloud LLM | Anthropic Claude / OpenAI (via LiteLLM) | Heavier reasoning: plan generation, nutritional analysis |
| Deployment | Docker/Podman on home server | Self-hosted, behind Tailscale for remote access |
| Auth | Simple PIN or local-only access (Phase 1) → proper auth (Phase 4) | Two-person household doesn't need OAuth yet |

## Architecture Diagram

```
┌─────────────────────────┐
│   React PWA (Vite)      │
│   └─ Tailwind CSS       │
│   └─ Service Worker      │
│   └─ PWA Manifest       │
└────────┬────────────────┘
         │ REST API
┌────────▼────────────────┐
│   FastAPI Backend        │
│   ├─ /api/plans          │  ← meal plan CRUD
│   ├─ /api/recipes        │  ← recipe CRUD
│   ├─ /api/grocery        │  ← grocery list generation
│   ├─ /api/chat           │  ← AI copilot (streaming)
│   ├─ /api/prep-guide     │  ← batch cooking steps
│   └─ /api/profile        │  ← user preferences
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐ ┌───▼──────────┐
│SQLite│ │ LiteLLM Proxy │
│      │ │  ├─ Ollama    │ ← local: grocery list formatting, portion math
│      │ │  └─ Claude    │ ← cloud: plan generation, nutritional analysis, chat
└──────┘ └──────────────┘
```

## LLM Routing Strategy

| Task | Model | Rationale |
|---|---|---|
| Meal plan generation | Cloud (Claude) | Complex multi-constraint reasoning |
| Nutritional gap analysis | Cloud (Claude) | Requires holistic week review |
| Chat copilot (open-ended) | Cloud (Claude) | Conversational quality matters |
| Grocery list consolidation | Local (Ollama) | Structured, formulaic task |
| Portion scaling math | Local (Ollama) | Simple arithmetic |
| Recipe tag generation | Local (Ollama) | Classification task |
| Prep guide step sequencing | Cloud (Claude) | Requires cooking domain knowledge |

---

## Data Model

### `users`
```sql
CREATE TABLE users (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))),
    name        TEXT NOT NULL,
    calorie_target INTEGER NOT NULL,
    protein_pct REAL DEFAULT 0.30,
    carbs_pct   REAL DEFAULT 0.30,
    fat_pct     REAL DEFAULT 0.40,
    veggie_target INTEGER DEFAULT 5,  -- daily servings
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `household`
```sql
CREATE TABLE household (
    id          TEXT PRIMARY KEY,
    name        TEXT,
    prep_days   TEXT DEFAULT '["sunday","wednesday"]',  -- JSON array
    dineout_days TEXT DEFAULT '["friday_dinner","sunday_dinner"]',  -- JSON array
    cuisine_pref TEXT DEFAULT 'indian-inspired',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `recipes`
```sql
CREATE TABLE recipes (
    id              TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,          -- "Tandoori chicken"
    authentic_name  TEXT,                    -- "tandoori murgh"
    description     TEXT,                    -- "Yogurt-marinated spiced grilled chicken"
    cuisine         TEXT DEFAULT 'indian',
    method_summary  TEXT,                    -- brief cooking method for recipe card
    serving_instructions TEXT,              -- reheat + plate steps (JSON array)
    prep_steps      TEXT,                    -- full prep steps for prep guide (JSON array)
    ingredients     TEXT NOT NULL,           -- JSON array of {name, quantity_1500, quantity_1800, unit, usda_food_id?}
    calories_per_serving INTEGER,
    protein_g       REAL,
    carbs_g         REAL,
    fat_g           REAL,
    veggie_servings REAL DEFAULT 0,
    prep_time_min   INTEGER,
    cook_time_min   INTEGER,
    reheat_time_min INTEGER,
    shelf_life_days INTEGER DEFAULT 4,
    storage_notes   TEXT,
    tags            TEXT,                    -- JSON array: ["high-protein", "gluten-free", "batch-friendly"]
    is_batch_prep   BOOLEAN DEFAULT TRUE,
    is_favorite     BOOLEAN DEFAULT FALSE,
    is_disliked     BOOLEAN DEFAULT FALSE,
    source          TEXT DEFAULT 'ai-generated',  -- 'ai-generated', 'user-added', 'imported'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `meal_plans`
```sql
CREATE TABLE meal_plans (
    id              TEXT PRIMARY KEY,
    household_id    TEXT REFERENCES household(id),
    week_start      DATE NOT NULL,          -- Monday of the week
    status          TEXT DEFAULT 'draft',   -- 'draft', 'approved', 'active', 'completed'
    plan_data       TEXT NOT NULL,           -- JSON: full week structure (see below)
    grocery_list    TEXT,                    -- JSON: consolidated grocery list
    ai_insights     TEXT,                    -- JSON: nutritional gap analysis
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `plan_data` JSON structure
```json
{
  "monday": {
    "breakfast": { "recipe_id": "...", "meal_type": "day-of", "notes": "..." },
    "lunch":    { "recipe_id": "...", "meal_type": "batch-sun", "notes": "..." },
    "dinner":   { "recipe_id": "...", "meal_type": "batch-sun", "notes": "..." }
  },
  "friday": {
    "breakfast": { "recipe_id": "...", "meal_type": "day-of" },
    "lunch":    { "recipe_id": "...", "meal_type": "batch-wed" },
    "dinner":   { "meal_type": "dine-out" }
  }
}
```

### `prep_sessions`
```sql
CREATE TABLE prep_sessions (
    id              TEXT PRIMARY KEY,
    meal_plan_id    TEXT REFERENCES meal_plans(id),
    day             TEXT NOT NULL,           -- 'sunday' or 'wednesday'
    recipe_ids      TEXT NOT NULL,           -- JSON array of recipe IDs in this batch
    steps           TEXT NOT NULL,           -- JSON: LLM-generated interleaved cooking steps
    est_time_min    INTEGER,
    status          TEXT DEFAULT 'pending',  -- 'pending', 'in-progress', 'completed'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `chat_history`
```sql
CREATE TABLE chat_history (
    id              TEXT PRIMARY KEY,
    household_id    TEXT REFERENCES household(id),
    role            TEXT NOT NULL,           -- 'user' or 'assistant'
    content         TEXT NOT NULL,
    context         TEXT,                    -- JSON: which screen, active plan, etc.
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Plans
- `GET    /api/plans/current` — get current week's plan
- `POST   /api/plans/generate` — LLM generates a new plan (streams response)
- `PATCH  /api/plans/{id}` — update/approve plan
- `POST   /api/plans/{id}/regenerate-grocery` — regenerate grocery list

### Recipes
- `GET    /api/recipes` — list saved recipes (with filters: cuisine, tags, favorites)
- `GET    /api/recipes/{id}` — get recipe detail
- `POST   /api/recipes` — save a new recipe
- `PATCH  /api/recipes/{id}` — update recipe (favorite, dislike, edit)

### Prep Guide
- `GET    /api/prep/{session_id}` — get prep session steps
- `PATCH  /api/prep/{session_id}/step/{step_num}` — mark step complete

### Chat
- `POST   /api/chat` — send message to AI copilot (streaming response)
- `GET    /api/chat/history` — get recent chat history

### Grocery
- `GET    /api/grocery/{plan_id}` — get grocery list for a plan
- `PATCH  /api/grocery/{plan_id}/item/{item_id}` — check/uncheck item

### Profile
- `GET    /api/profile` — get household and user profiles
- `PATCH  /api/profile` — update preferences

---

## LLM Prompt Architecture

### Plan Generation Prompt

The system prompt for meal plan generation includes:
1. Household profile (calorie targets, macro split, cuisine preference)
2. Constraints (prep days, dine-out days, breakfast handling)
3. Saved recipes marked as favorites (inject as preferred options)
4. Recipes marked as disliked (inject as exclusions)
5. Recent plan history (last 2-4 weeks) to avoid repetition
6. Nutritional guidelines (balanced macros, micronutrient awareness)

The LLM responds with structured JSON matching the `plan_data` schema.

### Prep Guide Sequencing Prompt

Input: list of recipes for a prep session with their full step lists.
Output: an interleaved, time-optimized step sequence that:
- Starts passive tasks first (marination, rice, simmering)
- Overlaps passive wait times with active tasks
- Groups related prep (e.g., all chopping before any cooking)
- Includes timer durations for every waiting step
- Ends with portioning into containers

### Chat Copilot System Prompt

The copilot has access to:
- Current week's meal plan
- Current screen context (dashboard, recipe detail, prep guide)
- Household preferences
- Saved recipes
- Recent chat history (last 10 messages)

It can take actions via function calling:
- `update_meal(day, slot, recipe_id)` — swap a meal
- `add_to_grocery(items)` — add items to grocery list
- `generate_recipe(constraints)` — create a new recipe suggestion
- `analyze_nutrition(plan_id)` — run weekly gap analysis

---

## Deployment

### Docker Compose (Phase 1)

```yaml
services:
  mealmind-api:
    build: ./backend
    ports:
      - "8400:8000"
    volumes:
      - ./data:/app/data          # SQLite database
    environment:
      - LITELLM_PROXY_URL=http://litellm:4000
      - DATABASE_URL=sqlite:///app/data/mealmind.db
    depends_on:
      - litellm

  mealmind-web:
    build: ./frontend
    ports:
      - "8401:80"

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml"]
```

### Proxmox / Tailscale

- Run containers in a dedicated Proxmox VM or LXC
- Expose via Tailscale for mobile access outside home network
- No public internet exposure needed for Phase 1

---

## Future Scale Considerations

- **Recipe schema extensibility:** USDA food IDs on ingredients enable future nutrition API validation
- **Plan history as training data:** every approved plan + user tweaks builds a preference dataset
- **Template caching:** frequently generated plan patterns can be cached to reduce LLM calls at scale
- **Recipe corpus growth:** user-saved and AI-generated recipes accumulate, enabling collaborative filtering in Phase 4
