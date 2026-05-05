# MealMind — Spec Package for Claude Code

## Directory Structure

```
README.md                              ← You are here
specs/
├── docs/
│   ├── 01-PRD.md                      ← Product requirements, features, phasing
│   ├── 02-DESIGN-SYSTEM.md            ← Colors, typography, spacing, components
│   ├── 03-ARCHITECTURE.md             ← Tech stack, data model, API design, LLM prompts
│   └── 04-BUILD-PLAN.md               ← Sprint-by-sprint implementation checklist
└── mockups/
    ├── 01-dashboard.html              ← Main dashboard with macro rings + week view
    ├── 02-recipe-detail.html          ← Recipe card (serving mode, assumes food is prepped)
    ├── 03-prep-guide.html             ← Batch cooking step-by-step with parallel timers
    ├── 04-ai-chat.html                ← AI copilot bottom sheet panel
    └── 05-grocery-list.html           ← Consolidated shopping list by category
```

## How to Use in Claude Code

1. **Start a new Claude Code session** and point it at this directory
2. **Reference the docs** when building: "Read 01-PRD.md and 03-ARCHITECTURE.md, then scaffold the FastAPI backend"
3. **Reference the mockups** when building UI: "Open 01-dashboard.html and implement this as a React component using the design tokens from 02-DESIGN-SYSTEM.md"
4. **Follow the build plan** in 04-BUILD-PLAN.md sprint by sprint

## Key Design Decisions (Quick Reference)

- **Step ownership:** Prep guide owns full cooking flow (marination → cooking → portioning). Recipe detail owns serving instructions only (reheat + plate).
- **Meal naming:** English-friendly primary names, authentic Indian names as subtitles/tags.
- **LLM-first architecture:** LLM generates plans, estimates nutrition, sequences batch cooking, and powers the chat copilot. Structured data layer (SQLite) stores recipes, preferences, and plan history as context for the LLM.
- **Portion model:** Same meals for both people, quantities toggle between 1500 and 1800 calorie targets.
- **Macro tracking:** Four rings — Protein (terracotta), Carbs (wheat gold), Fat (curry leaf green), Veggies (olive green, tracked as servings).

## Mockup Viewing

Open any `.html` file in a browser to see the mobile mockup. Each file is self-contained with inline styles — no dependencies.
