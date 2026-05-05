# MealMind — Spec Phase 1 (MVP) Implementation Plan

> **For executor agents:** Each step below is a discrete unit of work. The **Prompt** block at the end of each step is self-contained — copy it verbatim and feed to the executor as its task. The executor must read all referenced spec files at the start of each step.
>
> **Working directory:** `/Users/deepeshchaudhary/Projects/mealmind`
> **Branch policy:** create one branch per sprint (`sprint-N-<name>`); commit after every step within the sprint; merge to `main` after sprint verification.

---

## Context

Building **MealMind**, a self-hosted mobile-first PWA for AI-driven meal planning + batch cooking, for a 2-person household (1500 / 1800 kcal targets, Indian-inspired cuisine, prep Sun + Wed). Repo is greenfield: only specs and HTML mockups exist. This plan covers **spec Phase 1 (MVP — "Plan & Prep")**, an 8-sprint program producing the full installable PWA + FastAPI backend + LiteLLM/Ollama integration + Docker deploy.

---

## Locked decisions

| Topic | Decision |
|---|---|
| Repo layout | Monorepo: `backend/` + `frontend/` siblings + root `docker-compose.yml` |
| Backend stack | FastAPI (Python 3.12) + SQLAlchemy 2.x + Alembic + SQLite + httpx + sse-starlette + pytest + httpx-test |
| Frontend stack | React 18 + TypeScript + Vite + Tailwind v3 + vitest + React Testing Library + Playwright (E2E only, Sprint 8) |
| LLM | LiteLLM proxy → **Ollama only** (no Anthropic key). Model: `llama3.1:8b-instruct` for general, `qwen2.5:14b` if available for plan-gen/prep-sequencing JSON. LiteLLM config swappable so Claude can be added later without code changes. |
| Nutrition | USDA FoodData Central via its own `/foods/search` endpoint (no fuzzy lib). LLM (Ollama) fallback flagged `llm_estimate` in DB. |
| Streaming | SSE (`sse-starlette` server-side, `EventSource` client-side) |
| Auth | None (LAN / Tailscale-only) |
| Migrations | Alembic |
| Test discipline | TDD-lite: write the test alongside or just before the code; every step ends with passing tests + commit |
| Reference artifacts | `specs/docs/01-PRD.md`, `specs/docs/02-DESIGN-SYSTEM.md`, `specs/docs/03-ARCHITECTURE.md`, `specs/docs/04-BUILD-PLAN.md`, `specs/mockups/*.html` |

### Standing instructions for the executor agent (apply to every step)

1. **Read first:** before any code, read the spec files referenced in the step's **References** block. Mockup HTML files are visual ground-truth — use their exact colors, spacing, and structure.
2. **Tokens, not magic numbers:** never hard-code colors/spacing/radii. Always reference CSS variables from `frontend/src/styles/tokens.css` or Tailwind theme extensions.
3. **No Anthropic / OpenAI calls.** All LLM calls go through LiteLLM at `http://litellm:4000` (or `http://localhost:4000` in dev). Model id: `ollama/llama3.1:8b-instruct` unless the step says otherwise.
4. **Tests required.** No step is "done" without tests passing. Backend = pytest. Frontend = vitest + RTL.
5. **Commit message format:** Conventional Commits (`feat(scope): ...`, `test(scope): ...`, `chore(scope): ...`).
6. **Stop on ambiguity.** If a spec is contradictory or a step's instruction is unclear, stop and ask — do not invent.
7. **Do not skip hooks** with `--no-verify` and do not amend; always create new commits.
8. **Sprint branch:** at the start of each sprint, run `git checkout -b sprint-N-<name>`. At the end of the sprint, the planner (not the executor) merges.

---

# Sprint 1 — Foundation (estimated 8 steps)

**Goal:** scaffold both apps, wire DB + LiteLLM + Docker, render an empty PWA shell with bottom nav and design tokens. End state: `docker-compose up` boots backend + frontend + LiteLLM, the PWA loads, hits `/api/health`, and shows the empty Plan tab.

**Branch:** `sprint-1-foundation`

---

### Step 1.1: Bootstrap repo skeleton + tooling

**Files:**
- Create: `.gitignore`, `.editorconfig`, `.python-version`, `.nvmrc`, `README.md` (append; don't overwrite spec README), `Makefile`
- Create dirs: `backend/`, `frontend/`, `data/`

**References:** `specs/docs/03-ARCHITECTURE.md` §Deployment

**Verification:** `make help` lists targets; `git status` shows the new files staged.

**Prompt:**
> You are working in `/Users/deepeshchaudhary/Projects/mealmind` (existing git repo, branch `main` with specs only). Create branch `sprint-1-foundation`. Add a project-level `.gitignore` (Python: `__pycache__`, `.venv`, `*.pyc`, `.pytest_cache`, `.coverage`; Node: `node_modules`, `dist`, `.vite`; OS: `.DS_Store`; data: `data/*.db`, `data/*.db-journal`), `.editorconfig` (utf-8, lf, 2-space indent for js/ts/yml/json/md, 4-space for py), `.python-version` (3.12), `.nvmrc` (20), and a root `Makefile` with phony targets: `help`, `dev` (runs `docker compose up --build`), `down`, `backend-test` (cd backend && pytest), `frontend-test` (cd frontend && pnpm test), `lint`, `migrate` (alembic upgrade head), `seed` (python backend/scripts/seed.py — file may not exist yet, that's fine, leave the target). Also create empty dirs `backend/`, `frontend/`, `data/` (use `.gitkeep` files). Commit: `chore(repo): bootstrap project skeleton and tooling`.

---

### Step 1.2: Backend scaffold (FastAPI + SQLAlchemy + Alembic + pytest)

**Files:**
- Create: `backend/pyproject.toml`, `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/db/__init__.py`, `backend/app/db/session.py`, `backend/app/db/base.py`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/.gitkeep`, `backend/tests/__init__.py`, `backend/tests/conftest.py`, `backend/tests/test_health.py`, `backend/Dockerfile`, `backend/.dockerignore`

**References:** `specs/docs/03-ARCHITECTURE.md` §Stack, §API Endpoints (only the surface — endpoints filled in later sprints)

**Verification:** `cd backend && pytest` passes; `uvicorn app.main:app --reload` boots; `curl localhost:8000/api/health` returns `{"status":"ok"}`.

**Prompt:**
> Working dir: `/Users/deepeshchaudhary/Projects/mealmind/backend`. Use `uv` for dependency management (assume `uv` is installed). Create `pyproject.toml` declaring Python 3.12, deps: `fastapi`, `uvicorn[standard]`, `sqlalchemy>=2`, `alembic`, `pydantic>=2`, `pydantic-settings`, `httpx`, `sse-starlette`, `python-multipart`. Dev deps: `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx`, `ruff`, `mypy`. Configure ruff (line-length 100, target-version py312) and pytest (testpaths=tests, asyncio_mode=auto). Build the FastAPI app:
> - `app/config.py`: `Settings(BaseSettings)` reading `DATABASE_URL` (default `sqlite:////app/data/mealmind.db` — note four slashes for absolute path), `LITELLM_PROXY_URL` (default `http://localhost:4000`), `USDA_API_BASE` (default `https://api.nal.usda.gov/fdc/v1`), `CORS_ORIGINS` (default `["http://localhost:5173"]`). Read from `.env`.
> - `app/db/base.py`: declarative `Base` class.
> - `app/db/session.py`: engine + `SessionLocal` + `get_db` FastAPI dependency. Use `connect_args={"check_same_thread": False}` for SQLite.
> - `app/main.py`: create `FastAPI(title="MealMind API")`, add CORS middleware from settings, register `GET /api/health` returning `{"status":"ok","version":"0.1.0"}`.
> - `tests/conftest.py`: pytest fixture for an in-memory SQLite test engine, fixture for an `httpx.AsyncClient` against the app via `httpx.ASGITransport`.
> - `tests/test_health.py`: `async def test_health_returns_ok` hitting `/api/health`.
> Initialize Alembic (`alembic init alembic`) and edit `alembic/env.py` to read URL from `app.config.Settings()` and target `app.db.base.Base.metadata`.
> Write a multistage `Dockerfile` (python:3.12-slim base, install uv, copy pyproject + lock, `uv sync --frozen`, copy app, expose 8000, default `uvicorn app.main:app --host 0.0.0.0 --port 8000`).
> Run `uv sync` then `pytest`. Verify health test passes. Commit: `feat(backend): scaffold FastAPI app with SQLAlchemy, Alembic, and health endpoint`.

---

### Step 1.3: DB models + first migration (all Phase 1 tables)

**Files:**
- Create: `backend/app/db/models.py`, `backend/alembic/versions/0001_initial.py`
- Create: `backend/tests/test_models.py`

**References:** `specs/docs/03-ARCHITECTURE.md` §Data Model (sections `users`, `household`, `recipes`, `meal_plans`, `prep_sessions`, `chat_history`)

**Verification:** `alembic upgrade head` creates the SQLite file with all six tables; `pytest tests/test_models.py` passes.

**Prompt:**
> In `backend/app/db/models.py`, define SQLAlchemy 2.x mapped models matching the SQL schemas in `specs/docs/03-ARCHITECTURE.md` §Data Model exactly. Tables: `User`, `Household`, `Recipe`, `MealPlan`, `PrepSession`, `ChatHistory`. Use `Mapped[...]` annotations. Primary keys are TEXT — generate them via `default=lambda: secrets.token_hex(4)`. JSON columns (prep_days, dineout_days, ingredients, plan_data, grocery_list, ai_insights, recipe_ids, steps, context, tags, serving_instructions, prep_steps) use `sqlalchemy.JSON` type. Booleans use `Boolean`. Timestamps use `DateTime(timezone=True)` with `server_default=func.now()`.
>
> Generate the first Alembic migration: `alembic revision --autogenerate -m "initial schema"`. Verify the generated `0001_initial.py` creates all six tables. Run `alembic upgrade head` against a temp SQLite file to confirm it works.
>
> Write `tests/test_models.py` covering: (a) you can insert a Household with default `prep_days` and the JSON round-trips correctly, (b) you can insert a Recipe with an ingredients JSON array and read it back, (c) FKs work (MealPlan.household_id references Household.id).
>
> Run `pytest`. Commit: `feat(db): add Phase 1 schema and initial Alembic migration`.

---

### Step 1.4: Profile endpoints (Household + User CRUD subset)

**Files:**
- Create: `backend/app/schemas/profile.py`, `backend/app/routers/profile.py`, `backend/tests/test_profile.py`
- Modify: `backend/app/main.py` (register router)

**References:** `specs/docs/03-ARCHITECTURE.md` §API Endpoints (Profile: `GET /api/profile`, `PATCH /api/profile`)

**Verification:** `pytest tests/test_profile.py` passes covering get + patch.

**Prompt:**
> Add Pydantic schemas in `backend/app/schemas/profile.py`: `UserOut`, `HouseholdOut`, `ProfileOut` (combines household + list of users), `ProfileUpdate` (partial). Implement `backend/app/routers/profile.py` with `GET /api/profile` returning the single household + its users (auto-create one Household + two Users on first call: "Person 1"/calorie_target=1500, "Person 2"/calorie_target=1800, household name="Home"), and `PATCH /api/profile` for partial updates to household (cuisine_pref, prep_days, dineout_days) and per-user calorie_target/protein_pct/carbs_pct/fat_pct/veggie_target.
>
> Register the router in `app/main.py` with prefix `/api/profile`, tag `profile`.
>
> Tests in `tests/test_profile.py`:
> - `test_get_profile_creates_default_household_on_first_call`
> - `test_patch_profile_updates_household_cuisine_pref`
> - `test_patch_profile_updates_user_calorie_target`
> - `test_patch_profile_rejects_unknown_user_id` returns 404
>
> Run `pytest`. Commit: `feat(api): add /api/profile GET and PATCH with default household auto-create`.

---

### Step 1.5: Recipes CRUD endpoints

**Files:**
- Create: `backend/app/schemas/recipe.py`, `backend/app/routers/recipes.py`, `backend/tests/test_recipes.py`
- Modify: `backend/app/main.py`

**References:** `specs/docs/03-ARCHITECTURE.md` §Data Model (recipes), §API Endpoints (Recipes block)

**Verification:** all four endpoints (`GET /`, `GET /{id}`, `POST /`, `PATCH /{id}`) tested.

**Prompt:**
> Pydantic schemas in `backend/app/schemas/recipe.py`: `Ingredient` (name, quantity_1500, quantity_1800, unit, usda_food_id?, calories_per_100g?, protein_per_100g?, carbs_per_100g?, fat_per_100g?, nutrition_source: Literal["usda","llm_estimate"]), `RecipeIn`, `RecipeOut`, `RecipeUpdate` (partial — supports `is_favorite`, `is_disliked`, `display_name`, etc.).
>
> `backend/app/routers/recipes.py` with:
> - `GET /api/recipes` — list, query params: `cuisine`, `tags` (comma-separated, match any), `favorites` (bool), `limit` (default 50)
> - `GET /api/recipes/{id}` — 404 if missing
> - `POST /api/recipes` — accept `RecipeIn`; macros (`calories_per_serving`, `protein_g`, `carbs_g`, `fat_g`) may be omitted — leave null until Sprint 3 nutrition resolution fills them
> - `PATCH /api/recipes/{id}` — partial update
>
> Register in `main.py` with prefix `/api/recipes`, tag `recipes`.
>
> Tests in `tests/test_recipes.py` covering each endpoint plus filter combos. Use the conftest fixtures.
>
> Run `pytest`. Commit: `feat(api): add /api/recipes CRUD with filters`.

---

### Step 1.6: LiteLLM proxy config + service client

**Files:**
- Create: `litellm-config.yaml` (repo root), `backend/app/services/__init__.py`, `backend/app/services/llm.py`, `backend/tests/test_llm.py`

**References:** `specs/docs/03-ARCHITECTURE.md` §LLM Routing Strategy, §Deployment (litellm service)

**Verification:** unit test mocks LiteLLM HTTP and asserts the client formats requests correctly.

**Prompt:**
> Create `litellm-config.yaml` at repo root with one Ollama-backed model:
> ```yaml
> model_list:
>   - model_name: mealmind-default
>     litellm_params:
>       model: ollama/llama3.1:8b-instruct
>       api_base: http://host.docker.internal:11434
>   - model_name: mealmind-json
>     litellm_params:
>       model: ollama/llama3.1:8b-instruct
>       api_base: http://host.docker.internal:11434
>       response_format: { "type": "json_object" }
> general_settings:
>   master_key: sk-mealmind-local-only
> ```
> Document in a top-of-file comment that adding Anthropic later means adding a new entry under `model_list` and switching the model name in `app/config.py`.
>
> Build `backend/app/services/llm.py` with an async `LLMClient` class:
> - `__init__(base_url, default_model="mealmind-default")`
> - `async def chat(messages: list[dict], model: str | None = None, json_mode: bool = False, stream: bool = False) -> str | AsyncIterator[str]`
> - When `stream=True`, yields content deltas. When `json_mode=True`, uses `mealmind-json` model and asserts the response parses as JSON (raises `LLMResponseError` if not).
> - Talks to LiteLLM via OpenAI-compatible `POST /chat/completions` (it is OpenAI-compatible).
> - Module-level `get_llm()` factory reading `Settings.LITELLM_PROXY_URL`.
>
> Test in `tests/test_llm.py` with `pytest-httpx` (add as dev dep) mocking the LiteLLM endpoint:
> - `test_chat_non_streaming_returns_content`
> - `test_chat_json_mode_parses_response`
> - `test_chat_json_mode_raises_on_invalid_json`
> - `test_chat_streaming_yields_deltas`
>
> Run `pytest`. Commit: `feat(llm): add LiteLLM client with JSON-mode and streaming support`.

---

### Step 1.7: Frontend scaffold (Vite + React + TS + Tailwind + PWA)

**Files:**
- Create: everything under `frontend/` via `pnpm create vite` then customize.
- Specifically: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/styles/tokens.css`, `frontend/src/styles/global.css`, `frontend/public/manifest.webmanifest`, `frontend/public/icons/icon-192.png`, `frontend/public/icons/icon-512.png` (placeholder solid-color saffron-gold PNGs are fine), `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`

**References:** `specs/docs/02-DESIGN-SYSTEM.md` (entire — transcribe color/typography/spacing/radius tokens verbatim into `tokens.css`), `specs/mockups/01-dashboard.html` (only for visual reference, not implementation yet)

**Verification:** `cd frontend && pnpm dev` boots on :5173; `pnpm test` runs vitest with zero tests; `pnpm build` produces a `dist/` with the PWA manifest.

**Prompt:**
> Working dir: `/Users/deepeshchaudhary/Projects/mealmind/frontend`. Use pnpm. Run `pnpm create vite . --template react-ts`, accepting defaults. Then add: `tailwindcss@3 postcss autoprefixer @vitejs/plugin-react vite-plugin-pwa workbox-window` (deps), `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node` (dev deps). Initialize Tailwind: `npx tailwindcss init -p`.
>
> Configure `tailwind.config.js` to extend the theme with the design tokens — colors named exactly per `02-DESIGN-SYSTEM.md` (e.g., `primary`, `secondary`, `accent-gold`, `accent-olive`, `bg`, `surface`, `surface-warm`, `border`, `text-primary`, `text-secondary`, `text-tertiary`, `protein`, `carbs`, `fat`, `veggies`, `dark-bg`); fontSize, spacing, borderRadius mirroring the doc's scale. `content: ["./index.html","./src/**/*.{ts,tsx}"]`.
>
> `src/styles/tokens.css`: declare CSS variables on `:root` for every token in `02-DESIGN-SYSTEM.md` §Color Palette / §Typography / §Spacing & Layout. Export `--color-*`, `--font-size-*`, `--font-weight-*`, `--space-*`, `--radius-*`, `--page-padding`. Import this file in `main.tsx` before any component.
> `src/styles/global.css`: `@tailwind base; @tailwind components; @tailwind utilities;` and base `body { background: var(--color-bg); color: var(--color-text-primary); font-family: 'Nunito', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }`. Add a `@font-face` import via Google Fonts link in `index.html` for Nunito 400/500/600.
>
> Configure `vite.config.ts` to use `vite-plugin-pwa` with `registerType: 'autoUpdate'`, manifest pointing at `/manifest.webmanifest`, and dev-mode enabled.
>
> Write `public/manifest.webmanifest` with `name`, `short_name: "MealMind"`, `theme_color: "#C45B28"`, `background_color: "#FAF6F0"`, `display: "standalone"`, `icons: [192, 512]`. Generate two solid-color saffron PNG placeholders for the icons (any tool — Pillow or `convert`).
>
> Configure vitest in `vitest.config.ts` with `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `globals: true`. `src/test/setup.ts`: `import '@testing-library/jest-dom'`.
>
> Replace the Vite starter `App.tsx` with a placeholder `<div className="min-h-screen flex items-center justify-center">MealMind</div>`. Delete the boilerplate CSS files Vite generated.
>
> Write `Dockerfile` (multistage: node:20-alpine builder running `pnpm install --frozen-lockfile && pnpm build`; nginx:alpine runtime serving `/usr/share/nginx/html`).
>
> Run `pnpm test` (no tests yet — should still exit 0 with a "no tests found" message; if vitest exits non-zero, add `--passWithNoTests`). Run `pnpm build` and verify `dist/manifest.webmanifest` exists.
>
> Commit: `feat(frontend): scaffold Vite + React + TS + Tailwind + PWA shell with design tokens`.

---

### Step 1.8: Routing shell + bottom nav + Docker Compose

**Files:**
- Create: `frontend/src/App.tsx` (replace), `frontend/src/components/BottomNav.tsx`, `frontend/src/screens/Dashboard.tsx`, `frontend/src/screens/RecipesTab.tsx`, `frontend/src/screens/Profile.tsx`, `frontend/src/api/client.ts`, `frontend/src/components/__tests__/BottomNav.test.tsx`
- Add deps: `react-router-dom`
- Create: `docker-compose.yml` at repo root

**References:** `specs/docs/02-DESIGN-SYSTEM.md` §Component Patterns → Bottom Navigation; `specs/mockups/01-dashboard.html` lines 140–146 (bottom nav structure)

**Verification:** `docker compose up --build` boots all three services; navigating to http://localhost:8401 shows the empty Plan tab with three nav icons; Recipes/Profile tabs route correctly; vitest passes.

**Prompt:**
> Add `react-router-dom@6` to `frontend/package.json`. Wire `BrowserRouter` in `main.tsx`. Replace `App.tsx` to be a layout shell: `<div className="min-h-dvh max-w-md mx-auto bg-bg">` with `<Outlet />` for the page area and `<BottomNav />` fixed at the bottom.
>
> Routes (using `<Routes>` in `App.tsx`):
> - `/` → `Dashboard` (tab: Plan)
> - `/recipes` → `RecipesTab`
> - `/profile` → `Profile`
>
> `BottomNav.tsx`: implement the three-tab nav per `02-DESIGN-SYSTEM.md` §Bottom Navigation and the structure in `01-dashboard.html` lines 140–146. Active tab uses `text-primary` color, inactive uses `text-text-tertiary`. Use `NavLink` from react-router-dom. Wrapper has `bg-surface border-t border-border` and is `fixed bottom-0 inset-x-0 max-w-md mx-auto`. Reserve space at the top for the FAB (which lives in the same nav row, positioned absolute, will be implemented in Sprint 7) — leave a placeholder div the right size for now (52×52px circle, saffron gold from `bg-accent-gold`, no click handler) so the layout doesn't shift later. Inline the SVG icons from `01-dashboard.html` lines 141–145 as React components or directly.
>
> Each screen file (`Dashboard.tsx`, `RecipesTab.tsx`, `Profile.tsx`) gets a stub: `<div className="p-page text-text-primary">{TabName}</div>`. Add `p-page` to Tailwind by extending `padding` with `page: '20px'`.
>
> `frontend/src/api/client.ts`: a tiny fetch wrapper. `const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8400'`. Export `apiGet`, `apiPatch`, `apiPost` returning JSON. Add `VITE_API_BASE_URL` to `frontend/.env.development`.
>
> Test `BottomNav.test.tsx` with RTL: render inside MemoryRouter, assert all three labels appear, click Recipes, assert it has the active styling. Run `pnpm test` — must pass.
>
> Now write `docker-compose.yml` at repo root per `specs/docs/03-ARCHITECTURE.md` §Deployment block (mealmind-api, mealmind-web, litellm services). Map ports: api 8400→8000, web 8401→80, litellm 4000→4000. Volume-mount `./data` into api at `/app/data`, `./litellm-config.yaml` into litellm at `/app/config.yaml`. Set api env: `LITELLM_PROXY_URL=http://litellm:4000`, `DATABASE_URL=sqlite:////app/data/mealmind.db`. Add a healthcheck on the api hitting `/api/health`. Web service depends_on api.
>
> Run `docker compose up --build` and verify: backend logs show "Application startup complete", `curl localhost:8400/api/health` returns ok, frontend at http://localhost:8401 shows the layout with bottom nav, tab navigation works.
>
> Commit: `feat(frontend): add routing shell, bottom nav, and docker-compose orchestration`. Merge sprint-1 to main once verified.

---

# Sprint 2 — Dashboard UI (estimated 7 steps)

**Goal:** ship a pixel-faithful Dashboard screen rendering from a hard-coded fixture (no API yet). Includes macro rings, today's meals, week strip, prep day card, AI insight card, person toggle.

**Branch:** `sprint-2-dashboard`

---

### Step 2.1: MacroRing component

**Files:**
- Create: `frontend/src/components/MacroRing.tsx`, `frontend/src/components/__tests__/MacroRing.test.tsx`

**References:** `02-DESIGN-SYSTEM.md` §Macro Rings; `01-dashboard.html` lines 23–55

**Verification:** snapshot test + arithmetic test of dash-offset.

**Prompt:**
> Build a reusable `<MacroRing label, current, target, unit, color, centerText? />` SVG component matching `02-DESIGN-SYSTEM.md` §Macro Rings exactly: 68×68 viewBox, two concentric circles (background `--color-border`, foreground `var(--color-{macro})`), `r=28`, `stroke-width=5`, `stroke-linecap="round"`, foreground rotated -90° around (34,34). Compute `circumference = 2*π*28 = 175.93` (round to two decimals). Compute `dashoffset = circumference * (1 - clamp(current/target, 0, 1))`. Center text: if `centerText` prop given (e.g., "2/5"), use it; otherwise show `${pct}%`. Below ring: label (font-size-sm, text-tertiary) and `{current} / {target}{unit}` (font-size-body-sm, medium weight, text-primary).
>
> Animation: on mount, animate dashoffset from circumference (empty) to target value over 600ms ease-out. Use a CSS transition on `stroke-dashoffset`.
>
> `font-variant-numeric: tabular-nums` on numeric text.
>
> Test: render with `current=81, target=113, color="#C45B28"`, assert (a) the foreground circle has the right `stroke-dashoffset` after the transition (test against the static target value, not mid-animation), (b) the percent label reads "72%". Use `getByText`.
>
> Commit: `feat(ui): add MacroRing component with animated SVG ring`.

---

### Step 2.2: Macro ring row + calorie summary

**Files:**
- Create: `frontend/src/components/MacroRingRow.tsx`, `frontend/src/components/__tests__/MacroRingRow.test.tsx`
- Create fixture: `frontend/src/fixtures/dashboard.ts`

**References:** `01-dashboard.html` lines 22–58

**Prompt:**
> `frontend/src/fixtures/dashboard.ts` exports a typed `DashboardData` matching what the API will eventually return: `today: { date, person_id, totals: { protein_g, carbs_g, fat_g, veggies, kcal }, targets: { protein_g, carbs_g, fat_g, veggies, kcal }, meals: [{ slot, time, title, kcal, p, c, f }] }`, plus `week`, `prep_day`, `ai_insight`. Populate with the values from `01-dashboard.html`.
>
> `MacroRingRow` renders four `MacroRing`s in a 4-col CSS grid with `gap: var(--space-md)`. Below the grid: a centered "X / Y kcal" line in `text-text-tertiary font-size-body`. Pull values from props.
>
> Test: render with the fixture, assert all four labels are visible and the kcal line reads "890 / 1500 kcal".
>
> Commit: `feat(ui): add MacroRingRow with calorie summary using fixture data`.

---

### Step 2.3: MealCard + meal type badge

**Files:**
- Create: `frontend/src/components/MealCard.tsx`, `frontend/src/components/MealTypeBadge.tsx`, `frontend/src/components/__tests__/MealCard.test.tsx`

**References:** `02-DESIGN-SYSTEM.md` §Meal Cards, §Meal Type Badges; `01-dashboard.html` lines 63–103

**Prompt:**
> `MealTypeBadge` props: `type: 'breakfast' | 'lunch' | 'dinner' | 'dine-out'`. Render a pill with the doc-specified text/bg colors per type. Dine-out uses the gold semantic.
>
> `MealCard` props: `{ slot: 'breakfast'|'lunch'|'dinner', time: string, title: string, macros: { kcal, p, c, f }, dimmed?: boolean, dineOut?: boolean, onClick?: () => void }`. Layout matches `01-dashboard.html` lines 63–88 — left content (badge + time + title + macros line), right 52×52 rounded placeholder block (`bg-border-light rounded-card`). When `dimmed`, wrapper has `opacity-60`. When `dineOut`, render only the badge with text "Dine out — Friday" (or whatever passed in `title`) and no macros.
>
> Touch target: full width row, min-h 60px, `rounded-card-lg`, `border border-border`, `bg-surface`, padding from spec.
>
> Tests: render breakfast meal, assert title and macros visible. Render dimmed dinner, assert wrapper has `opacity-60` class. Render dine-out, assert no macros render.
>
> Commit: `feat(ui): add MealCard and MealTypeBadge components`.

---

### Step 2.4: WeekStrip + day pills

**Files:**
- Create: `frontend/src/components/WeekStrip.tsx`, `frontend/src/components/__tests__/WeekStrip.test.tsx`

**References:** `02-DESIGN-SYSTEM.md` §Week Strip; `01-dashboard.html` lines 106–114

**Prompt:**
> `WeekStrip` props: `{ days: { date: string, dayShort: 'Mon'|...|'Sun', dayNum: number, isToday: boolean, isPrepDay: boolean, isDineOut: boolean }[], onSelectDay?: (date) => void }`. Render a horizontal row (`flex gap-1.5 overflow-x-auto`). Each pill is min-width 42px, `rounded-card`, padding `10px 6px`. Today pill: `bg-primary text-white`. Other days: `bg-surface border border-border`. Dine-out days: gold day name (`text-accent-gold font-medium`) and an 18×6px gold bar indicator instead of a dot. Prep days: 6×6 green dot. Regular: 6×6 neutral dot (`bg-border`).
>
> Test: render the 7-day fixture from `01-dashboard.html`, assert Monday has primary background, Wednesday has prep-day green dot, Friday and Sunday have gold styling.
>
> Commit: `feat(ui): add WeekStrip with prep-day and dine-out indicators`.

---

### Step 2.5: PrepDayCard + AIInsightCard

**Files:**
- Create: `frontend/src/components/PrepDayCard.tsx`, `frontend/src/components/AIInsightCard.tsx`, `frontend/src/components/__tests__/PrepDayCard.test.tsx`, `frontend/src/components/__tests__/AIInsightCard.test.tsx`

**References:** `02-DESIGN-SYSTEM.md` §Prep Day Card, §AI Insight Card; `01-dashboard.html` lines 116–137

**Prompt:**
> `PrepDayCard` props: `{ dayLabel: string, summary: string, durationLabel: string, onClick?: () => void }`. White card, 3px solid `--color-success` left border, `rounded-card-lg`, content matches `01-dashboard.html` lines 116–125. Right-side chevron SVG.
>
> `AIInsightCard` props: `{ title?: string (default "AI insight"), body: string }`. Background `--color-surface-warm`, 28px saffron-gold circle with clock-style SVG icon (copy SVG from `01-dashboard.html` line 130). Body text `--color-text-secondary`.
>
> Tests: render both with fixture content, assert text appears, assert PrepDayCard has the green left border (check computed style or class).
>
> Commit: `feat(ui): add PrepDayCard and AIInsightCard components`.

---

### Step 2.6: Dashboard screen assembly + person toggle

**Files:**
- Modify: `frontend/src/screens/Dashboard.tsx`
- Create: `frontend/src/components/PersonToggle.tsx`, `frontend/src/screens/__tests__/Dashboard.test.tsx`
- Modify: `frontend/src/fixtures/dashboard.ts` (add second person's data)

**References:** entire `01-dashboard.html`; `02-DESIGN-SYSTEM.md` §Portion Toggle (re-use the segmented control pattern for the person toggle)

**Prompt:**
> Build `Dashboard.tsx` to match `01-dashboard.html` end-to-end using the components from steps 2.1–2.5 and the fixture data. Layout:
> 1. Top gradient header (linear-gradient 180deg #E8DDD0→#FAF6F0, `padding: 20px 20px 12px`) containing:
>    - Date label (font-size-body-sm, text-tertiary, uppercase, letter-spacing 0.5px) + greeting (font-size-page-title, font-medium)
>    - Avatar circle (right side, 40px, initials, terracotta tint)
>    - `<PersonToggle />` below the greeting line (segmented control: "1500 / 1800")
>    - `<MacroRingRow />`
> 2. `padding: 0 var(--page-padding)` content area:
>    - "Today's meals" header → three `<MealCard />`s
>    - "This week" header → `<WeekStrip />`
>    - `<PrepDayCard />`
>    - `<AIInsightCard />`
> Add bottom padding equal to nav height + 20px so content isn't hidden under the fixed nav.
>
> `PersonToggle.tsx`: small segmented control (two buttons: "1500" and "1800"), active button `bg-primary text-white rounded-md`, inactive `text-text-tertiary`. Controlled component: `{ value, onChange }`. Place it inline with the greeting row.
>
> Wire the toggle: on change, swap which person's totals/targets feed `MacroRingRow`. Both fixtures live in `dashboard.ts`.
>
> Test in `Dashboard.test.tsx`:
> - Renders all four ring labels
> - Renders three meal titles
> - Toggling 1800 changes the kcal line from "890 / 1500 kcal" to whatever the 1800 fixture says
>
> Visual QA: `pnpm dev`, open http://localhost:5173 in mobile viewport (Chrome devtools, iPhone 14), compare side-by-side with `01-dashboard.html` opened in another tab. Differences in spacing > 4px or color drift = fix.
>
> Commit: `feat(dashboard): assemble Dashboard screen with person toggle from fixture data`.

---

### Step 2.7: Visual regression baseline (Playwright screenshot)

**Files:**
- Create: `frontend/e2e/dashboard.spec.ts`, `frontend/playwright.config.ts`
- Add deps: `@playwright/test`

**Prompt:**
> Add `@playwright/test` to `frontend/devDependencies`. Run `pnpm exec playwright install chromium`. Configure `playwright.config.ts` with `testDir: './e2e'`, baseURL from env, viewport 360×800 (mobile), single-browser chromium.
>
> Write `e2e/dashboard.spec.ts`:
> ```ts
> test('dashboard matches baseline', async ({ page }) => {
>   await page.goto('/');
>   await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixelRatio: 0.02 });
> });
> ```
> Run `pnpm exec playwright test --update-snapshots` once locally to seed the baseline. Commit the baseline PNG.
>
> Add a `frontend-e2e` Make target.
>
> Commit: `test(dashboard): add Playwright visual regression baseline`. Merge sprint-2 to main once verified.

---

# Sprint 3 — Plan Generation + Nutrition (estimated 9 steps)

**Goal:** plan the full week via LLM (Ollama JSON-mode), resolve nutrition via USDA + LLM fallback, persist meal plans, and bind the Dashboard to real data via `/api/plans/current`.

**Branch:** `sprint-3-plan-generation`

---

### Step 3.1: USDA service (search + macros)

**Files:**
- Create: `backend/app/services/usda.py`, `backend/tests/test_usda.py`

**References:** `03-ARCHITECTURE.md` §LLM Routing Strategy (USDA row); USDA FoodData Central API docs (`https://fdc.nal.usda.gov/api-guide.html`)

**Prompt:**
> Implement `usda.py` with:
> - `async def search_food(query: str, limit: int = 5) -> list[FoodHit]` calling `GET {USDA_API_BASE}/foods/search?query={query}&pageSize={limit}&dataType=Foundation,SR%20Legacy` (no API key needed for these data types under low rate limit). Returns top `limit` hits as `FoodHit(food_id, description, macros_per_100g)` where macros_per_100g is dict with keys `calories, protein_g, carbs_g, fat_g`.
> - `async def get_macros(food_id: int) -> Macros` calling `GET {USDA_API_BASE}/food/{food_id}` and pulling nutrient numbers 1003 (protein), 1005 (carbs), 1004 (fat), 1008 (kcal). Cache results in-memory via `functools.lru_cache(maxsize=512)` (wrap the sync helper, since httpx call is async — use `cachetools.TTLCache` instead).
>
> Tests with `pytest-httpx` mocking USDA responses:
> - `test_search_food_returns_top_hits`
> - `test_search_food_handles_empty_results`
> - `test_get_macros_extracts_nutrient_numbers`
> - `test_get_macros_raises_on_404`
>
> Commit: `feat(nutrition): add USDA FoodData Central search and macro lookup`.

---

### Step 3.2: Nutrition resolution service (USDA-first, LLM fallback)

**Files:**
- Create: `backend/app/services/nutrition.py`, `backend/app/prompts/nutrition_estimate.py`, `backend/tests/test_nutrition.py`

**References:** `03-ARCHITECTURE.md` §LLM Routing Strategy (Nutrition rows); `01-PRD.md` §Phase 1 → "Macro data resolved via USDA FoodData Central API on recipe save; LLM fallback only for unmatched ingredients"

**Prompt:**
> `nutrition.py` exports:
> - `async def resolve_ingredient(name: str) -> ResolvedIngredient` — call USDA `search_food(name, 1)`. If a hit, return `ResolvedIngredient(name, usda_food_id, macros_per_100g, nutrition_source="usda")`. If no hit, fall back to `llm.chat(...)` with the prompt from `prompts/nutrition_estimate.py` in JSON mode and parse macros, return `nutrition_source="llm_estimate"`.
> - `def aggregate_macros(ingredients: list[Ingredient], grams_field: str) -> Macros` — sums `(quantity_g / 100) * macros_per_100g` across all ingredients. `grams_field` is either `quantity_1500` or `quantity_1800`.
> - `async def resolve_recipe_nutrition(recipe: Recipe, db: Session) -> None` — for each ingredient missing `usda_food_id` and `calories_per_100g`, call `resolve_ingredient`, persist back to the JSON. Then compute and persist top-level `calories_per_serving`, `protein_g`, `carbs_g`, `fat_g` using `aggregate_macros` with the 1500 quantities (this is the per-1500-serving baseline; the UI will scale up by ratio for 1800).
>
> `prompts/nutrition_estimate.py`: a system prompt asking for strict JSON `{"calories_per_100g": float, "protein_per_100g": float, "carbs_per_100g": float, "fat_per_100g": float}` with no commentary.
>
> Conversion note for the LLM: ingredients may be in various units (cup, tsp, g, ml, piece). For Sprint 3, assume `quantity_1500` is already in grams (the LLM-generated plan in step 3.4 produces grams). Document this in a docstring; we'll add unit conversion in a future sprint if needed.
>
> Tests:
> - `test_resolve_ingredient_uses_usda_when_available` (mock USDA hit)
> - `test_resolve_ingredient_falls_back_to_llm` (mock USDA empty, mock LLM JSON response)
> - `test_aggregate_macros_sums_correctly`
> - `test_resolve_recipe_nutrition_skips_already_resolved` (idempotency)
>
> Commit: `feat(nutrition): add USDA-first resolution with LLM fallback and macro aggregation`.

---

### Step 3.3: Auto-resolve nutrition on recipe save

**Files:**
- Modify: `backend/app/routers/recipes.py` (POST + PATCH hook)
- Modify: `backend/tests/test_recipes.py`

**Prompt:**
> Wrap `POST /api/recipes` and `PATCH /api/recipes/{id}` (only when ingredients changed) so that after the DB write, they call `nutrition.resolve_recipe_nutrition(recipe, db)` and re-commit. Make the call awaitable inline, not a background task — for Phase 1 we want deterministic test output. If resolution fails on any ingredient, log and continue (set that ingredient's `nutrition_source = "llm_estimate"` with `null` macros and a `note` field).
>
> Update tests in `test_recipes.py` to mock the nutrition service and assert it gets called with the right recipe.
>
> Commit: `feat(api): auto-resolve nutrition on recipe save`.

---

### Step 3.4: Plan generation prompt + endpoint (streaming)

**Files:**
- Create: `backend/app/prompts/plan_gen.py`, `backend/app/routers/plans.py`, `backend/app/schemas/plan.py`, `backend/tests/test_plans.py`
- Modify: `backend/app/main.py` (register router)

**References:** `01-PRD.md` §Phase 1 → LLM-generated meal plans; `03-ARCHITECTURE.md` §Plan Generation Prompt, §plan_data JSON structure, §API Endpoints (plans block)

**Prompt:**
> `prompts/plan_gen.py`: a system prompt builder taking `(household, favorites, dislikes, recent_plans)` returning a string. The prompt instructs the model to output strict JSON matching the `plan_data` schema in `03-ARCHITECTURE.md`. Constraints to encode in the prompt: macro split (default 30P/30C/40F), prep days from household, dine-out days from household, breakfast=day-of, batch meals reused across multiple days, English meal names with authentic-name subtitle. The model must also output an `recipes` array with one recipe-shape object per unique recipe in `plan_data` (id, display_name, authentic_name, description, ingredients with quantity_1500 and quantity_1800 in grams, prep_steps, serving_instructions, tags). The recipes get persisted before the plan; the plan references them by id.
>
> Schemas in `schemas/plan.py`: `PlanGenerateRequest` (no body required for Phase 1 — uses household defaults), `PlanGenerateChunk` (SSE events: `recipe`, `day`, `done`, `error`), `PlanOut`.
>
> `routers/plans.py`:
> - `POST /api/plans/generate` returns `EventSourceResponse`. Stream behavior: as the LLM produces the JSON (json_mode, non-streaming since llama3.1 doesn't stream JSON well), emit progress events via a fake-stream wrapper that yields `{"event":"start"}` immediately, `{"event":"thinking"}` every 2s while the LLM call is in flight, and finally `{"event":"recipes"}` and `{"event":"plan"}` events with the parsed payload. After parsing, persist all recipes (calling `resolve_recipe_nutrition` for each), persist the `MealPlan` row with `status="draft"`, then emit `{"event":"done","plan_id":"..."}` and close the stream.
> - `GET /api/plans/current` returns the most recent plan with `status in ('approved','active')`, falling back to the most recent draft. 404 if none.
> - `PATCH /api/plans/{id}` supports updating `status` (`approved`) and replacing day/slot entries in `plan_data`.
>
> Tests:
> - `test_generate_plan_streams_done_event` — mock `LLMClient.chat(json_mode=True)` to return a canned plan_data + recipes JSON. Hit the endpoint with an SSE-aware async client and assert events `start → recipes → plan → done` arrive in order.
> - `test_generate_plan_persists_recipes_and_plan`
> - `test_get_current_plan_returns_404_when_none`
> - `test_get_current_plan_prefers_approved_over_draft`
> - `test_patch_plan_to_approved_succeeds`
>
> Register the router in `main.py`.
>
> Commit: `feat(plans): add streaming plan generation, current-plan, and approve endpoints`.

---

### Step 3.5: Frontend — plan-loading state + binding to /api/plans/current

**Files:**
- Modify: `frontend/src/screens/Dashboard.tsx`
- Create: `frontend/src/api/plans.ts`, `frontend/src/hooks/useCurrentPlan.ts`
- Add deps: `@tanstack/react-query`
- Modify: `frontend/src/main.tsx` (wrap in `QueryClientProvider`)

**Prompt:**
> Add `@tanstack/react-query@5` to frontend deps. Wrap `<App />` in `<QueryClientProvider>` in `main.tsx` with a default `QueryClient`.
>
> `api/plans.ts`: typed wrappers for `getCurrentPlan()`, `generatePlan()` (returns an `EventSource` for SSE consumption), `approvePlan(planId)`. Define TS types matching the backend `PlanOut` and `plan_data` schema.
>
> `hooks/useCurrentPlan.ts`: wraps `useQuery` against `getCurrentPlan`, returns `{ data, isLoading, isError, refetch }`.
>
> Modify `Dashboard.tsx`: when `useCurrentPlan` returns:
> - `isLoading` → render skeletons (gray rounded blocks where rings/cards go)
> - `isError` (404) → render a centered empty-state card "No plan yet" with a primary button "Generate this week's plan" that calls `generatePlan()` and shows progress (use the SSE events: stage label "Drafting recipes…" → "Building plan…" → "Resolving nutrition…" → done refetches)
> - `data` → derive today's meals from `plan_data[today_weekday]`, today's targets from the household member, today's totals from the meals' macros (Phase 1: assume all of today's planned meals are "consumed" — we don't yet track completion). Render the existing dashboard with real data.
>
> Update fixtures: keep them only as Storybook/test fixtures; production Dashboard reads from the API.
>
> Tests in `Dashboard.test.tsx`:
> - Mock the API to return loading → assert skeletons render
> - Mock the API to return 404 → assert "Generate this week's plan" CTA is visible
> - Mock the API to return a fixture plan → assert today's meals render
>
> Commit: `feat(dashboard): bind to /api/plans/current with loading and empty states`.

---

### Step 3.6: Plan generation UI flow (review + approve)

**Files:**
- Create: `frontend/src/screens/PlanReview.tsx`, `frontend/src/components/PlanWeekGrid.tsx`
- Modify: `frontend/src/App.tsx` (add route `/plan/review/:id`)

**Prompt:**
> After `generatePlan()` completes (SSE `done` event with `plan_id`), navigate to `/plan/review/:id`. `PlanReview.tsx` fetches the plan via `GET /api/plans/{id}` (add a thin endpoint if not already present), renders a 7-day grid (`PlanWeekGrid`) with rows = days, columns = breakfast/lunch/dinner. Each cell shows a mini meal card (title + macros). Below the grid, two buttons: "Tweak (chat)" — disabled in this sprint (placeholder for Sprint 7) — and "Approve & save" — calls `approvePlan(id)` then navigates back to `/`.
>
> Tests: render with a fixture plan, assert all 21 cells, click Approve, assert PATCH was called with `{status:'approved'}` and navigation occurred.
>
> Commit: `feat(plans): add plan-review screen with approve action`.

---

### Step 3.7: Dine-out badge handling on dashboard

**Files:**
- Modify: `frontend/src/screens/Dashboard.tsx`, `frontend/src/components/MealCard.tsx`

**Prompt:**
> When a day/slot in `plan_data` has `meal_type: "dine-out"`, the Dashboard renders a `MealCard` in dine-out mode (gold badge, no macros, title "Dining out tonight"). This should already be supported via the `dineOut` prop from Step 2.3 — verify and wire the data binding. Update the test to cover the dine-out case.
>
> Commit: `feat(dashboard): render dine-out slots with gold badge and no macros`.

---

### Step 3.8: USDA + LLM integration smoke test

**Files:**
- Create: `backend/tests/integration/test_plan_generation_e2e.py` (marked `@pytest.mark.integration`, opt-in via `pytest -m integration`)

**Prompt:**
> Write an integration test that spins up the real LiteLLM proxy via docker-compose (or a fixture that assumes it's running on `localhost:4000`) and hits `POST /api/plans/generate` end-to-end. Assert: SSE stream completes with `done`, the resulting plan has 7 days × 3 slots filled, all recipes have non-null macros, at least 3 ingredients in the dataset have `nutrition_source="usda"`. Skip if `MEALMIND_INTEGRATION_TESTS` env var unset.
>
> Document in a top-of-file comment how to run: `MEALMIND_INTEGRATION_TESTS=1 pytest -m integration`.
>
> Commit: `test(plans): add opt-in E2E integration test for plan generation`. Merge sprint-3 to main once verified.

---

# Sprint 4 — Recipe Detail (estimated 5 steps)

**Goal:** tappable recipe detail screen with portion toggle, serving instructions, storage notes, AI tip, and "View in prep guide" CTA.

**Branch:** `sprint-4-recipe-detail`

---

### Step 4.1: GET /api/recipes/{id} expansion

**Files:**
- Modify: `backend/app/schemas/recipe.py`, `backend/app/routers/recipes.py`, `backend/tests/test_recipes.py`

**Prompt:**
> Ensure `GET /api/recipes/{id}` returns a fully-expanded `RecipeDetailOut` containing: id, display_name, authentic_name, description, tags, calories_per_serving, protein_g, carbs_g, fat_g, veggie_servings, prep_time_min, cook_time_min, reheat_time_min, shelf_life_days, storage_notes, serving_instructions (parsed JSON array), ingredients (full array with both quantity fields), and computed `prep_session_id` (lookup the most recent active prep_session whose recipe_ids JSON contains this id; null if none). Add the test.
>
> Commit: `feat(api): expand recipe detail endpoint with prep_session lookup`.

---

### Step 4.2: RecipeDetail screen layout

**Files:**
- Create: `frontend/src/screens/RecipeDetail.tsx`, `frontend/src/components/IngredientList.tsx`, `frontend/src/components/PortionToggle.tsx`, `frontend/src/components/MacroTagRow.tsx`
- Modify: `frontend/src/App.tsx` (add route `/recipe/:id`)

**References:** `specs/mockups/02-recipe-detail.html` (read fully before starting), `02-DESIGN-SYSTEM.md` §Portion Toggle, §Tags / Pills, §Status Badges

**Prompt:**
> First, read `specs/mockups/02-recipe-detail.html` end-to-end. Then build `RecipeDetail.tsx` matching the mockup: page header with back button + recipe title + authentic-name subtitle; tags row (`MacroTagRow`); status badge "Prepped on Sunday · stored in fridge" (green); macro 4-col grid (use the same `MacroRing` or compact tag boxes per the mockup); section "Serving instructions" listing reheat + plate steps; section "Ingredients" with `<PortionToggle value=1500|1800 />` to the right and `<IngredientList items quantityField={selected} />` below; section "Storage & reheating"; section "AI serving tip" using `AIInsightCard`; bottom CTA "View in prep guide" linking to `/prep/:prep_session_id` (disabled if null).
>
> `PortionToggle.tsx`: identical pattern to `PersonToggle` but with values 1500/1800.
>
> `IngredientList.tsx` props: `{ items: Ingredient[], quantityField: 'quantity_1500'|'quantity_1800' }`. Each row: ingredient name + quantity right-aligned. If `nutrition_source === 'llm_estimate'`, append a small "(estimated)" badge.
>
> Wire data via `useQuery` against `GET /api/recipes/{id}`.
>
> Tests: render with a fixture, assert title appears, click portion toggle 1800, assert quantities change, click View-in-prep, assert navigation occurred.
>
> Commit: `feat(recipe): build recipe detail screen with portion toggle and AI tip`.

---

### Step 4.3: Dashboard meal card → recipe detail navigation

**Files:**
- Modify: `frontend/src/components/MealCard.tsx`, `frontend/src/screens/Dashboard.tsx`

**Prompt:**
> Wire the `onClick` prop of `MealCard` so tapping a meal navigates to `/recipe/:id`. The recipe id comes from `plan_data[day][slot].recipe_id`. Dine-out cards have no recipe — disable the click. Test that clicking a meal card navigates correctly.
>
> Commit: `feat(dashboard): make meal cards tappable to recipe detail`.

---

### Step 4.4: AI serving tip generation

**Files:**
- Create: `backend/app/prompts/serving_tip.py`
- Modify: `backend/app/routers/recipes.py` (add `GET /api/recipes/{id}/serving-tip`)
- Modify: `frontend/src/screens/RecipeDetail.tsx` (consume the endpoint)

**Prompt:**
> Add `prompts/serving_tip.py`: a short system prompt that takes a recipe and household profile and returns ONE sentence (under 25 words) tip such as "Add an extra spoon of rice to hit your 1800 target."
>
> Add endpoint `GET /api/recipes/{id}/serving-tip` that calls the LLM and returns `{tip: "..."}`. Cache results for 24 hours per recipe id (in-memory `cachetools.TTLCache`).
>
> Frontend: load the tip via `useQuery` and render in the `AIInsightCard` slot. Show a skeleton while loading.
>
> Tests: backend test mocks the LLM and asserts the cache. Frontend test mocks the endpoint.
>
> Commit: `feat(recipe): add AI-generated serving tip endpoint and binding`.

---

### Step 4.5: Recipe detail visual baseline + sprint merge

**Files:**
- Create: `frontend/e2e/recipe-detail.spec.ts`

**Prompt:**
> Add a Playwright test that navigates to a known seeded recipe id (we'll seed in Sprint 8 — for now use a recipe inserted via a test setup helper that hits `POST /api/recipes`). Take a screenshot, baseline it. Run with `--update-snapshots` first time.
>
> Commit: `test(recipe): add visual regression baseline`. Merge sprint-4 to main once verified.

---

# Sprint 5 — Prep Guide (estimated 8 steps)

**Goal:** end-to-end batch cooking screen with LLM-sequenced steps, active step card, parallel timers, progress bar, and dish color-coding.

**Branch:** `sprint-5-prep-guide`

---

### Step 5.1: Prep sequencing prompt + service

**Files:**
- Create: `backend/app/prompts/prep_sequence.py`, `backend/app/services/prep_sequencer.py`, `backend/tests/test_prep_sequencer.py`

**References:** `03-ARCHITECTURE.md` §Prep Guide Sequencing Prompt; `01-PRD.md` §Prep guide

**Prompt:**
> System prompt in `prompts/prep_sequence.py`: takes a list of recipes (each with their `prep_steps` array) and produces a single time-optimized interleaved sequence as JSON: `{"steps":[{"index": int, "recipe_id": str, "title": str, "description": str, "active": bool, "duration_min": int|null, "depends_on_step": int|null}]}`. Active=true means cook is hands-on; false means a wait (rice cooking, marinating). The prompt must instruct: start passive tasks first; overlap passive waits with active work; group similar prep (all chopping together); always include duration for waits; end with a portioning step.
>
> Service `prep_sequencer.py`:
> - `async def sequence_prep(recipes: list[Recipe]) -> list[Step]`: calls LLM in JSON mode, validates schema with Pydantic.
>
> Tests with mocked LLM: assert sequence is parsed correctly, assert validation rejects malformed JSON.
>
> Commit: `feat(prep): add LLM-driven prep step sequencer`.

---

### Step 5.2: Prep session endpoints

**Files:**
- Create: `backend/app/schemas/prep.py`, `backend/app/routers/prep.py`, `backend/tests/test_prep.py`
- Modify: `backend/app/main.py`

**Prompt:**
> Endpoints per `03-ARCHITECTURE.md` §Prep Guide:
> - `POST /api/prep/from-plan/{plan_id}/{day}` — pulls recipes for that prep day (e.g., "sunday" includes Mon–Wed batch meals), calls `sequence_prep`, persists a `PrepSession` row, returns it
> - `GET /api/prep/{session_id}` — full session with steps
> - `PATCH /api/prep/{session_id}/step/{step_index}` — body `{completed: bool}`. When all steps complete, set session status to `completed`.
>
> Tests covering each.
>
> Commit: `feat(api): add prep session endpoints with auto-sequencing`.

---

### Step 5.3: Timer component

**Files:**
- Create: `frontend/src/components/Timer.tsx`, `frontend/src/components/__tests__/Timer.test.tsx`
- Create: `frontend/src/hooks/useCountdown.ts`

**References:** `02-DESIGN-SYSTEM.md` §Timer (Prep Guide); `specs/mockups/03-prep-guide.html` (timer block)

**Prompt:**
> First, read `specs/mockups/03-prep-guide.html`. Build `Timer.tsx` to match the dark timer block: dark bg `--color-dark-bg`, large countdown 42px tabular-nums white, label above, "of X:00" below, two 48px circular buttons (pause/resume + extend +1 min). Props: `{ label, durationSec, autoStart?, onComplete?, paused?, onTogglePause? }`.
>
> Hook `useCountdown(durationSec, paused)`: returns `{remaining, isComplete, extend(sec)}`. Uses `requestAnimationFrame` rather than `setInterval` for accuracy. Persists state in component state — does NOT need to survive a refresh in this sprint.
>
> Tests: fake timers via vitest's `vi.useFakeTimers()`. Assert countdown ticks, pause halts, extend adds time, onComplete fires.
>
> Commit: `feat(prep): add Timer component with pause and extend`.

---

### Step 5.4: Background timer list

**Files:**
- Create: `frontend/src/components/BackgroundTimerList.tsx`, `frontend/src/hooks/useBackgroundTimers.ts`

**References:** `02-DESIGN-SYSTEM.md` §Background Timers; `03-prep-guide.html`

**Prompt:**
> `useBackgroundTimers()` is a small global store (Zustand or React context) holding `{id, label, recipeColor, startedAtStep, durationSec, startTimestamp}[]`. API: `add(timer)`, `remove(id)`, snapshot of remaining time per timer (computed from `Date.now()`).
>
> `BackgroundTimerList` renders the list sorted by remaining time ascending; row matches the doc spec — colored dot, label + "Started at step N", `MM:SS / X:00` right-aligned. When a timer completes, it stays in the list with state "Done — tap to dismiss" until tapped.
>
> Tests: add three timers, advance fake time, assert sort order; assert dismiss removes it.
>
> Commit: `feat(prep): add BackgroundTimerList with sorting and dismissal`.

---

### Step 5.5: Active step card

**Files:**
- Create: `frontend/src/components/ActiveStepCard.tsx`, `frontend/src/components/__tests__/ActiveStepCard.test.tsx`

**References:** `02-DESIGN-SYSTEM.md` §Active Step Card; `03-prep-guide.html`

**Prompt:**
> Card with `--radius-active-step` (16px), contains: step number badge (colored circle, color from recipe palette), "ACTIVE NOW" label, large title (20px), description (15px, line-height 1.5), embedded `Timer` if `step.duration_min` and `step.active === false` (passive wait → use Timer), or just description (active hands-on → no timer), and bottom button row: Previous (cream secondary, flex 1) + Next step (primary, flex 2). Disable Previous on step 0; Next becomes "Finish" on last step.
>
> Tests: render passive step → Timer renders; render active step → no Timer; click Next → callback fires with next index.
>
> Commit: `feat(prep): add ActiveStepCard with embedded timer for passive waits`.

---

### Step 5.6: Progress bar (color-coded by dish)

**Files:**
- Create: `frontend/src/components/PrepProgressBar.tsx`

**Prompt:**
> Horizontal progress bar segmented per step. Each segment colored by its recipe (assign colors deterministically from a palette of 4–6 swatches sampled from the design system). Completed segments fully filled; active segment half-filled with a subtle pulse animation; upcoming segments at 30% opacity.
>
> Tests: render with 8 steps where 3 complete and step 4 active; assert correct number of fully filled / partially filled / faded segments.
>
> Commit: `feat(prep): add color-coded progress bar component`.

---

### Step 5.7: Prep guide screen assembly

**Files:**
- Create: `frontend/src/screens/PrepGuide.tsx`
- Modify: `frontend/src/App.tsx` (route `/prep/:sessionId`)

**References:** `03-prep-guide.html`

**Prompt:**
> `PrepGuide.tsx` layout (top to bottom):
> 1. Dark header (deep brown bg, white text): back arrow + "Batch cook guide" title + small text "Sun prep — covers Mon–Wed"
> 2. Batch overview row: chips per dish being prepped (color + name), wraps if needed
> 3. `<PrepProgressBar />`
> 4. Completed steps collapsed (a small "X completed" header that expands on tap)
> 5. `<ActiveStepCard />`
> 6. Upcoming steps preview (next 1–2 collapsed cards, muted)
> 7. `<BackgroundTimerList />` fixed near the bottom
>
> Data: `useQuery` against `GET /api/prep/{sessionId}`. State: current step index. On Next: call `PATCH /api/prep/{sessionId}/step/{index}` with `{completed:true}`, advance index. When the active step has `duration_min` and is passive, auto-spawn a background timer when Next is clicked, so the user can move on while it cooks.
>
> Wake-lock: when on this screen, request `navigator.wakeLock.request('screen')` so the phone stays on. Release on unmount.
>
> Test: render with fixture session, assert active step shown, click Next, assert PATCH called.
>
> Commit: `feat(prep): assemble PrepGuide screen with active/background timers`.

---

### Step 5.8: Dashboard "Start prep guide" entry point

**Files:**
- Modify: `frontend/src/screens/Dashboard.tsx`, `frontend/src/components/PrepDayCard.tsx`

**Prompt:**
> When today is a prep day, the `PrepDayCard` becomes a primary CTA. Tapping it: if a `PrepSession` exists for today, navigate to `/prep/:sessionId`; otherwise call `POST /api/prep/from-plan/{plan_id}/{day}` (showing a loading state) and navigate when done.
>
> Add a hook `useTodaysPrepSession(planId)` that wraps both reads.
>
> Test: mock today as Sunday, mock no existing session, click PrepDayCard, assert POST called and navigation occurred. Merge sprint-5 to main once verified.
>
> Commit: `feat(dashboard): wire PrepDayCard to start or resume prep session`.

---

# Sprint 6 — Grocery List (estimated 6 steps)

**Goal:** consolidated shopping list per plan, grouped by category, with prep-day filters, pantry chips, check/uncheck, and share/copy.

**Branch:** `sprint-6-grocery-list`

---

### Step 6.1: Grocery consolidation prompt + service

**Files:**
- Create: `backend/app/prompts/grocery_consolidate.py`, `backend/app/services/grocery.py`, `backend/tests/test_grocery.py`

**References:** `03-ARCHITECTURE.md` §LLM Routing Strategy (Grocery row); `01-PRD.md` §Grocery list

**Prompt:**
> Prompt instructs the LLM to take all ingredients from all recipes in a plan (with both 1500 and 1800 quantities), and produce JSON: `{categories: [{name, items: [{ingredient_name, total_quantity_g, unit_display, recipes: [{recipe_id, recipe_name, prep_day, quantity_g}], is_pantry_chip: bool}]}]}`. Categories: Protein, Produce, Dairy, Grains & Pantry, Spices. `is_pantry_chip = true` for spices and staples (oil, salt, etc.).
>
> Service `grocery.py`:
> - `async def generate_grocery_list(plan: MealPlan, db) -> dict` — gathers ingredients, calls LLM (mealmind-json model), validates schema, persists to `meal_plan.grocery_list`.
>
> Tests with mocked LLM: assert generation, assert items have prep-day attribution, assert pantry chips identified.
>
> Commit: `feat(grocery): add LLM-based grocery list consolidation`.

---

### Step 6.2: Grocery endpoints

**Files:**
- Create: `backend/app/routers/grocery.py`, `backend/app/schemas/grocery.py`, `backend/tests/test_grocery_api.py`
- Modify: `backend/app/main.py`

**Prompt:**
> Endpoints:
> - `GET /api/grocery/{plan_id}` — returns the persisted grocery_list; if null, generates on-the-fly and persists
> - `POST /api/plans/{id}/regenerate-grocery` — forces regeneration (already in plans router; if not, add now)
> - `PATCH /api/grocery/{plan_id}/item/{item_id}` — toggles `checked` on a specific item (item_id = stable hash of ingredient_name + category). Item state persisted to `grocery_list` JSON.
>
> Tests covering each.
>
> Commit: `feat(api): add grocery endpoints with on-demand generation and check toggle`.

---

### Step 6.3: GroceryList screen layout

**Files:**
- Create: `frontend/src/screens/GroceryList.tsx`, `frontend/src/components/GroceryItem.tsx`, `frontend/src/components/CategorySection.tsx`, `frontend/src/components/FilterTabs.tsx`, `frontend/src/components/PantryChip.tsx`
- Modify: `frontend/src/App.tsx` (route `/grocery/:planId`)

**References:** `specs/mockups/05-grocery-list.html` (read fully); `02-DESIGN-SYSTEM.md` §Grocery List Items

**Prompt:**
> Read `05-grocery-list.html` first. Build:
> - `FilterTabs.tsx`: tabs "All / Sun prep / Wed prep / Day-of" with active state highlighting.
> - `GroceryItem.tsx`: 22px rounded-square checkbox, item name + subtitle ("Sun prep — Tandoori chicken"), quantity right-aligned. Checked state strikes through and dims (visible).
> - `CategorySection.tsx`: category header + list of `GroceryItem`s.
> - `PantryChip.tsx`: tappable chip; tap moves item from pantry section into the main grocery list (toggles `is_pantry_chip → false` locally and adds to relevant category — backend PATCH).
> - `GroceryList.tsx` screen: page header, search input (filters items by name client-side), `FilterTabs`, scrollable list of `CategorySection`s, pantry section at bottom with `PantryChip`s, action bar at very bottom with Share + Copy buttons.
>
> Share button: uses `navigator.share` if available; fallback to copy. Copy button writes to clipboard a plain-text format like:
> ```
> MealMind grocery list — week of {date}
>
> Protein
> □ Chicken thigh — 600g (Sun prep)
> □ ...
> ```
>
> Tests: render with fixture, click checkbox, assert PATCH called and visual strikethrough applied; click filter tab, assert filtered set; click pantry chip, assert it adds to main list.
>
> Commit: `feat(grocery): build grocery list screen with filters, search, share, and pantry`.

---

### Step 6.4: Dashboard → Grocery navigation

**Files:**
- Modify: `frontend/src/screens/Dashboard.tsx`

**Prompt:**
> Add a "Grocery list" entry point on the Dashboard — a row card under the AI insight card with a basket icon and chevron, navigating to `/grocery/{currentPlanId}`. Visible only when a current plan exists.
>
> Test: mock plan loaded, click row, assert navigation.
>
> Commit: `feat(dashboard): add grocery list entry point`.

---

### Step 6.5: Optimistic check-toggle UX

**Files:**
- Modify: `frontend/src/components/GroceryItem.tsx`, `frontend/src/api/grocery.ts`

**Prompt:**
> Use react-query's `useMutation` with `onMutate` to optimistically toggle the checkbox immediately, rolling back on error. Test the rollback path by mocking a 500 response.
>
> Commit: `feat(grocery): optimistic check-toggle with rollback on error`.

---

### Step 6.6: Visual baseline + sprint merge

**Prompt:**
> Add Playwright visual baseline for `/grocery/:planId` rendered against a fixture-seeded plan. Update snapshots. Merge sprint-6 to main once verified.
>
> Commit: `test(grocery): add visual regression baseline`.

---

# Sprint 7 — AI Chat Copilot (estimated 8 steps)

**Goal:** bottom-sheet chat panel triggered by FAB, with SSE streaming, inline recipe cards, quick-action chips, and proactive insights on plan load.

**Branch:** `sprint-7-ai-chat`

---

### Step 7.1: Chat copilot prompt + endpoint

**Files:**
- Create: `backend/app/prompts/chat_copilot.py`, `backend/app/routers/chat.py`, `backend/app/schemas/chat.py`, `backend/tests/test_chat.py`
- Modify: `backend/app/main.py`

**References:** `03-ARCHITECTURE.md` §Chat Copilot System Prompt, §API Endpoints (Chat)

**Prompt:**
> System prompt in `chat_copilot.py` builds context: current plan (compact summary), current screen context from request, household preferences, last 10 chat messages. Document that function calling is deferred to Phase 3 — for Phase 1 we ask the LLM to embed structured suggestions inline as fenced JSON: `‹‹‹recipe_suggestion {…}›››` markers that the frontend extracts and renders as recipe cards.
>
> Endpoint `POST /api/chat` (SSE streaming): body `{message: str, screen: str, plan_id?: str}`. Persists user message to `chat_history`, calls LLM with streaming on, emits SSE events `{event:"delta", text:"..."}` per chunk and `{event:"done"}` when finished. Persists assistant message after stream ends.
>
> `GET /api/chat/history?limit=20` returns recent messages.
>
> Tests: mock streaming LLM, assert deltas + done arrive, assert both messages persisted.
>
> Commit: `feat(chat): add streaming chat endpoint with screen-aware prompt`.

---

### Step 7.2: BottomSheet component

**Files:**
- Create: `frontend/src/components/BottomSheet.tsx`, `frontend/src/components/__tests__/BottomSheet.test.tsx`
- Add deps: `framer-motion`

**References:** `02-DESIGN-SYSTEM.md` §Bottom Sheet (Chat Panel); `specs/mockups/04-ai-chat.html`

**Prompt:**
> Read `04-ai-chat.html`. Build `BottomSheet`: rendered via portal, dim+desaturate background (filter brightness 0.7, opacity 0.4), drag handle at top (36×4 rounded bar). Three positions: closed, half-screen (60vh), full-screen. Drag-to-resize with framer-motion's `drag="y"` and `dragConstraints`. Swipe down past a threshold dismisses. `esc` key closes.
>
> Props: `{ open, onClose, children, snapPoints? }`. Test open/close + snap behavior with userEvent.
>
> Commit: `feat(ui): add BottomSheet with drag-to-resize and swipe-to-dismiss`.

---

### Step 7.3: FAB component

**Files:**
- Create: `frontend/src/components/FAB.tsx`
- Modify: `frontend/src/App.tsx` (mount FAB globally)

**References:** `02-DESIGN-SYSTEM.md` §Bottom Navigation (FAB section)

**Prompt:**
> Replace the placeholder FAB div from Step 1.8 with the real `FAB` component: 52px saffron-gold circle, flame icon, fixed positioning over the bottom nav. Optional `pulse` prop adds a gentle bounce animation. Click opens the chat bottom sheet (use a Zustand store or context for open state).
>
> Tests: click FAB, assert sheet opens.
>
> Commit: `feat(ui): add FAB with pulse animation hook`.

---

### Step 7.4: Chat UI: bubbles, input, history

**Files:**
- Create: `frontend/src/components/ChatPanel.tsx`, `frontend/src/components/ChatBubble.tsx`, `frontend/src/components/ChatInput.tsx`, `frontend/src/hooks/useChatStream.ts`

**References:** `02-DESIGN-SYSTEM.md` §Chat Bubbles

**Prompt:**
> `ChatBubble` props: `{ role: 'user'|'assistant', text, timestamp }`. AI: white bg, asymmetric radius `4px 14px 14px 14px`, AI avatar (28px saffron-gold circle + flame). User: dark bg `--color-dark-bg`, white text, radius `14px 4px 14px 14px`, right-aligned. Timestamp 10px below.
>
> `ChatInput`: text input + saffron-gold send button (28px circle with up-arrow). Enter submits.
>
> `useChatStream(message, screen, planId)`: opens `EventSource` against `/api/chat`, accumulates deltas into a state string, returns `{streamingText, done, error}`.
>
> `ChatPanel`: header (avatar + "MealMind" title + clear/expand buttons), divider, scrollable history (loads via `GET /api/chat/history` on mount), `ChatInput` fixed at bottom. On submit: append user bubble immediately, append assistant bubble that progressively fills via `useChatStream`. Auto-scroll to bottom on new messages.
>
> Tests: mock SSE, type message, assert user bubble appears immediately and assistant bubble updates as deltas arrive.
>
> Commit: `feat(chat): build ChatPanel with streaming bubbles and history`.

---

### Step 7.5: Inline recipe suggestion cards

**Files:**
- Create: `frontend/src/components/InlineRecipeCard.tsx`, `frontend/src/lib/parseRecipeMarkers.ts`
- Modify: `frontend/src/components/ChatBubble.tsx`

**Prompt:**
> Parser `parseRecipeMarkers(text)`: extracts `‹‹‹recipe_suggestion {json}›››` blocks from assistant text and returns `{cleanText, suggestions}`. JSON shape: `{title, authentic_name?, kcal, p, c, f, tags, action_buttons: [{label, action: 'add_to_plan'|'suggest_another'|'view_recipe', payload?}]}`.
>
> `InlineRecipeCard` props: `{ suggestion, onAction }`. Renders a compact recipe card inside a chat bubble — title, authentic subtitle, macro tags row, two action buttons.
>
> Wire `onAction='add_to_plan'` to `PATCH /api/plans/{currentId}` after asking the user (modal: "Replace which slot?"). For Phase 1, hard-code "next available slot of the same meal type" — TODO comment for future. `'suggest_another'` re-prompts the LLM with the rejection. `'view_recipe'` navigates if the recipe already exists in the DB; otherwise creates it via `POST /api/recipes` and then navigates.
>
> Tests: parse a sample assistant message containing two markers; render bubbles with cards; click "Add to plan", assert PATCH.
>
> Commit: `feat(chat): render inline recipe suggestion cards with actions`.

---

### Step 7.6: Quick-action chips

**Files:**
- Create: `frontend/src/components/QuickActionChips.tsx`

**References:** `02-DESIGN-SYSTEM.md` §Quick Action Chips

**Prompt:**
> When chat history is empty, render a wrapped row of chips above the input: "Leftover ideas", "Swap a meal", "Weekly nutrition review", "Regenerate grocery list". Tapping a chip pre-fills the input with a canned prompt and submits.
>
> Tests: render empty state, click chip, assert message sent.
>
> Commit: `feat(chat): add quick-action chips for empty state`.

---

### Step 7.7: Proactive insight on plan load

**Files:**
- Create: `backend/app/routers/plans.py` (extend with `GET /api/plans/{id}/insight`)
- Modify: `frontend/src/components/AIInsightCard.tsx`, `frontend/src/screens/Dashboard.tsx`, `frontend/src/components/FAB.tsx`

**Prompt:**
> Add `GET /api/plans/{id}/insight` returning `{title, body, severity: 'info'|'warning'}`. Backend computes a heuristic first (sum veggies/iron-source flags by day; flag if any day < 3 servings) and asks the LLM only if no heuristic flag fires (limit cost). Cache result for 6 hours per plan id.
>
> Frontend: Dashboard's `AIInsightCard` is bound to this endpoint. When severity=warning, the FAB pulses (uses `pulse` prop on the FAB component from Step 7.3).
>
> Tests: backend test mocks both heuristic and LLM. Frontend test mocks endpoint with warning, asserts FAB has `animate-pulse` class.
>
> Commit: `feat(insight): add proactive plan insight with heuristic + LLM fallback`.

---

### Step 7.8: Chat context-awareness during prep guide

**Files:**
- Modify: `frontend/src/screens/PrepGuide.tsx`, `frontend/src/components/ChatPanel.tsx`

**Prompt:**
> Pass current screen context to `useChatStream`: `{screen: 'prep_guide', sessionId, currentStepIndex}`. Backend prompt builder reads this and includes the current step in the system prompt so the user can ask substitution / troubleshooting questions in-context.
>
> Add a Playwright e2e test: open prep guide, open chat, ask "what can I substitute for ginger?", assert assistant bubble streams. Skip if `MEALMIND_INTEGRATION_TESTS` unset (uses real LLM).
>
> Commit: `feat(chat): pass screen context to enable in-prep-guide Q&A`. Merge sprint-7 to main once verified.

---

# Sprint 8 — Polish + Deploy (estimated 7 steps)

**Goal:** seed recipes, finalize PWA installability, offline support, full e2e coverage, ship to Proxmox via docker-compose, expose via Tailscale.

**Branch:** `sprint-8-polish-deploy`

---

### Step 8.1: Recipe seed script

**Files:**
- Create: `backend/scripts/seed.py`, `backend/data/seed_recipes.yaml`

**References:** `01-PRD.md` §Meal Naming Convention (use these example recipes)

**Prompt:**
> `seed_recipes.yaml`: hand-author at least 8 recipes covering tandoori chicken, lentil soup (tadka dal), cumin rice, aloo gobi, keema, palak paneer, besan chilla, mint-cilantro chutney. Each entry has display_name, authentic_name, description, cuisine, ingredients (with quantity_1500 and quantity_1800 in grams), prep_steps (list), serving_instructions (list), prep_time_min, cook_time_min, reheat_time_min, shelf_life_days, storage_notes, tags, is_batch_prep.
>
> `scripts/seed.py`: reads the YAML, calls `POST /api/recipes` for each (or writes directly via SQLAlchemy if running standalone). Idempotent — skip recipes whose display_name already exists. Run with `python -m scripts.seed`.
>
> Add Make target `seed`.
>
> Test: run seed against an empty in-memory DB, assert 8 recipes inserted; run again, assert no duplicates created.
>
> Commit: `feat(seed): add recipe seed script with 8 starter Indian-inspired recipes`.

---

### Step 8.2: Service worker offline cache

**Files:**
- Modify: `frontend/vite.config.ts`, `frontend/src/main.tsx`

**Prompt:**
> Configure `vite-plugin-pwa` runtime caching:
> - App shell: precache (default behavior).
> - `/api/plans/current`, `/api/recipes/{id}`, `/api/grocery/{plan_id}`: `NetworkFirst` with 5s timeout, 24h cache.
> - `/api/plans/generate`, `/api/chat`: `NetworkOnly` (do not cache streams).
> - Static assets: `CacheFirst` with 30d expiration.
>
> Test offline mode in Chrome devtools: load app online, go offline, refresh, verify dashboard renders from cache.
>
> Commit: `feat(pwa): configure service worker for offline plan + grocery access`.

---

### Step 8.3: PWA install verification

**Prompt:**
> No code change — manual QA. Run a lighthouse PWA audit (`pnpm exec lighthouse http://localhost:8401 --view --preset=desktop --only-categories=pwa`). Target ≥ 90. Fix any flagged issues (icon sizes, theme color, viewport, etc.). Add an "Install" button on the dashboard that calls `BeforeInstallPromptEvent.prompt()` when available.
>
> Test on real iOS Safari + Android Chrome via Tailscale URL.
>
> Commit: `chore(pwa): pass Lighthouse PWA audit and add install prompt`.

---

### Step 8.4: End-to-end Playwright suite

**Files:**
- Create: `frontend/e2e/full-flow.spec.ts`

**Prompt:**
> Write a single e2e test that exercises the golden path:
> 1. Visit `/`, see empty state, click Generate.
> 2. Wait for stream to complete (mock backend at MSW level so we don't burn LLM during CI; for local QA, run against real LLM).
> 3. Approve plan, assert dashboard renders with meals.
> 4. Tap a meal → recipe detail → toggle 1800 → "View in prep guide".
> 5. In prep guide, advance through 3 steps, assert progress bar fills.
> 6. Open grocery list from dashboard, tap a checkbox, refresh, assert it persists.
> 7. Open FAB chat, ask a question, assert assistant bubble streams.
>
> Run on every push via a GitHub action (or local-only if no CI yet).
>
> Commit: `test(e2e): add golden-path Playwright suite`.

---

### Step 8.5: Production docker-compose + Proxmox deploy

**Files:**
- Create: `docker-compose.prod.yml`, `deploy/README.md`

**Prompt:**
> `docker-compose.prod.yml`: extends base compose with production-mode commands (no `--reload`, gunicorn for FastAPI: `gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`), nginx serving the prebuilt frontend, restart policies (`unless-stopped`), and a `caddy` or `traefik` sidecar terminating TLS on the Tailscale interface.
>
> `deploy/README.md`: step-by-step Proxmox VM setup (Ubuntu 24.04 LTS, Docker install, Tailscale install, repo clone, `.env` setup including any optional Anthropic key for future, `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`, Tailscale serve config exposing `https://mealmind.<tailnet>.ts.net`).
>
> Commit: `chore(deploy): add production compose overlay and Proxmox runbook`.

---

### Step 8.6: Backup + migration story

**Files:**
- Create: `deploy/backup.sh`, cron entry documentation

**Prompt:**
> `backup.sh`: snapshots `data/mealmind.db` to `data/backups/mealmind-{timestamp}.db.gz`, retains last 30. Document a `0 3 * * *` cron entry on the host. Test the script writes to the right place.
>
> Document migration to Postgres (Phase 4 prep): swap `DATABASE_URL`, run `alembic upgrade head` against fresh PG, copy data via `pgloader sqlite://...`. No code change yet, just docs in `deploy/README.md`.
>
> Commit: `chore(deploy): add SQLite nightly backup script and Postgres migration notes`.

---

### Step 8.7: Final QA + sprint merge

**Prompt:**
> Run full QA pass on the staging Tailscale deployment:
> - Install PWA on iPhone + Pixel
> - Generate a fresh plan end-to-end
> - Run a real Sunday prep session in the kitchen, take notes on UX issues
> - Verify offline mode for grocery list during shopping
> - Confirm chat works against real Ollama
>
> Capture findings in `docs/qa-report-phase-1.md`. File follow-up issues for any non-blocking polish. Merge sprint-8 → main. Tag release `v0.1.0-mvp`.
>
> Commit: `chore(release): tag v0.1.0-mvp after Phase 1 QA pass`.

---

## Verification (overall Phase 1)

End-to-end criteria for declaring Phase 1 complete:

1. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` boots the full stack on a fresh Proxmox VM.
2. From a phone on the Tailnet, the PWA installs to the home screen.
3. The user can: generate a plan → approve → see Dashboard → tap meal → recipe detail → start prep → complete a session → see grocery list → check items → chat with AI for substitutions.
4. All `pytest` suites pass (unit + integration with `MEALMIND_INTEGRATION_TESTS=1`).
5. All `pnpm test` and `pnpm exec playwright test` suites pass.
6. Lighthouse PWA score ≥ 90.
7. The Sunday prep session can be run from start to finish in the kitchen without dropping out of the app.

---

## File-path index (all critical files referenced in this plan)

**Specs (read-only):**
- `specs/docs/01-PRD.md`, `specs/docs/02-DESIGN-SYSTEM.md`, `specs/docs/03-ARCHITECTURE.md`, `specs/docs/04-BUILD-PLAN.md`
- `specs/mockups/01-dashboard.html`, `02-recipe-detail.html`, `03-prep-guide.html`, `04-ai-chat.html`, `05-grocery-list.html`

**Backend (created across sprints 1, 3–8):**
- `backend/pyproject.toml`, `backend/Dockerfile`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/0001_initial.py`
- `backend/app/main.py`, `backend/app/config.py`
- `backend/app/db/{base,session,models}.py`
- `backend/app/schemas/{profile,recipe,plan,prep,chat,grocery}.py`
- `backend/app/routers/{profile,recipes,plans,prep,chat,grocery}.py`
- `backend/app/services/{llm,usda,nutrition,prep_sequencer,grocery}.py`
- `backend/app/prompts/{plan_gen,nutrition_estimate,prep_sequence,chat_copilot,grocery_consolidate,serving_tip}.py`
- `backend/scripts/seed.py`, `backend/data/seed_recipes.yaml`
- `backend/tests/...`

**Frontend (created across sprints 1, 2, 3–7):**
- `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/Dockerfile`, `frontend/playwright.config.ts`, `frontend/vitest.config.ts`
- `frontend/index.html`, `frontend/public/manifest.webmanifest`, `frontend/public/icons/*`
- `frontend/src/main.tsx`, `frontend/src/App.tsx`
- `frontend/src/styles/{tokens,global}.css`
- `frontend/src/api/{client,plans,grocery,recipes,chat,prep}.ts`
- `frontend/src/hooks/{useCurrentPlan,useTodaysPrepSession,useCountdown,useBackgroundTimers,useChatStream}.ts`
- `frontend/src/components/{MacroRing,MacroRingRow,MealCard,MealTypeBadge,WeekStrip,PrepDayCard,AIInsightCard,PersonToggle,PortionToggle,IngredientList,MacroTagRow,Timer,BackgroundTimerList,ActiveStepCard,PrepProgressBar,GroceryItem,CategorySection,FilterTabs,PantryChip,BottomSheet,FAB,ChatPanel,ChatBubble,ChatInput,InlineRecipeCard,QuickActionChips,BottomNav}.tsx`
- `frontend/src/screens/{Dashboard,RecipeDetail,PrepGuide,GroceryList,Profile,RecipesTab,PlanReview}.tsx`
- `frontend/src/lib/parseRecipeMarkers.ts`
- `frontend/src/fixtures/dashboard.ts`
- `frontend/e2e/{dashboard,recipe-detail,grocery,full-flow}.spec.ts`

**Root (Sprints 1, 8):**
- `docker-compose.yml`, `docker-compose.prod.yml`, `litellm-config.yaml`, `Makefile`, `.gitignore`, `.editorconfig`
- `deploy/README.md`, `deploy/backup.sh`
