# MealMind — Product Requirements Document

## Overview

MealMind is a mobile-first PWA for AI-powered meal planning and batch cooking, designed for households that meal prep twice a week. The app combines structured meal planning with an LLM copilot that handles plan generation, nutritional analysis, grocery list creation, and real-time cooking guidance.

## Target Users

- **Primary:** Health-conscious couples/households who batch cook weekly
- **Initial scope:** Personal use (2-person household, Indian-inspired cuisine)
- **Future scope:** Public app with multi-cuisine, multi-household support

## Core User Profile

- Two people sharing meals with different calorie targets (1500 / 1800 kcal)
- Macro split: 30% Protein / 30% Carbs / 40% Fat (balanced)
- Non-vegetarian, Indian-inspired meals with universally readable names
- Prep sessions: Sunday and Wednesday, 1–2 hours each
- Dine-out days: Friday and Sunday dinner
- Breakfasts: mostly day-of (eggs, crepes, pancake bake) with some prepped condiments (chutneys, guac)

## Key Constraints

- Same meals for both people, portion-adjusted for calorie targets
- Meal names must be universally understandable (e.g., "cumin rice" not "jeera rice") with authentic names stored as subtitles
- Kitchen-friendly: spacious touch targets, big text, one-action-at-a-time during cooking
- Self-hosted on home server (Docker/Podman)

---

## Feature Breakdown by Phase

### Phase 1 — MVP: "Plan & Prep"

1. **Weekly meal plan view**
   - Dashboard with daily meals (breakfast, lunch, dinner) in a week grid
   - Four tracking rings: Protein, Carbs, Fat, Veggie servings
   - Per-day calorie and macro progress
   - Dine-out day badges (Friday/Sunday dinner)
   - Person toggle (1500 / 1800 view)

2. **LLM-generated meal plans**
   - User provides constraints (cuisine preference, prep days, dine-out days, dietary restrictions)
   - LLM generates a full week plan respecting macro targets and batch-cook feasibility
   - User reviews, approves, or asks for tweaks via chat

3. **Recipe detail view**
   - Reference card for each meal: macros, calories, tags, veggie servings
   - "Prepped on [day] · stored in fridge" status badge
   - Serving instructions (reheat + plate) — assumes food is already prepped
   - Full ingredient list with 1500/1800 portion toggle
   - Storage & reheating guidance
   - "View in prep guide" CTA linking to the batch session
   - AI serving tips (e.g., "add extra rice for 1800 target")

4. **Prep guide (batch cooking mode)**
   - Full end-to-end cooking flow: marination → cooking → portioning
   - LLM-optimized step sequencing (passive tasks overlap active tasks)
   - One active step displayed at a time with large, kitchen-friendly text
   - Per-step timers with pause/extend controls
   - Parallel background timers (rice cooking, soup simmering, chicken marinating)
   - Completed steps collapsed, upcoming steps visible
   - Progress bar color-coded by dish

5. **Grocery list**
   - Auto-generated from approved meal plan
   - Quantities consolidated across recipes and both calorie targets
   - Grouped by category (Protein, Produce, Dairy, Grains & Pantry)
   - Filter tabs: All items / Sun prep / Wed prep / Day-of
   - Each item annotated with which prep day and recipe it's for
   - Pantry check section: spices/staples shown as tappable chips (tap to add if running low)
   - Checkable items with strikethrough
   - Share list / Copy as text export

6. **AI chat copilot**
   - Bottom sheet triggered by saffron FAB
   - Proactive insights on plan load (nutritional gaps, veggie shortfalls)
   - Inline recipe cards in suggestions with macro tags and action buttons
   - "Add to plan" / "Suggest another" CTAs on suggestions
   - Quick action chips: leftover ideas, meal swaps, weekly nutrition review, regenerate grocery list
   - Context-aware during prep guide (substitutions, troubleshooting)

### Phase 2 — "Nutrition Brain"

- Per-meal and per-day macro/calorie tracking (LLM-estimated, no manual entry)
- Weekly nutritional gap analysis with proactive suggestions
- Recipe memory: save favorites, tag dislikes, LLM draws from history
- USDA FoodData Central validation layer for macro accuracy

### Phase 3 — "Chat Copilot Enhanced"

- Full-screen expandable chat with conversation history
- Mid-prep Q&A: substitutions, technique questions, troubleshooting
- "What can I make with leftovers?" intelligence
- Prep coaching with step-by-step guidance and timers

### Phase 4 — "Scale & Publish"

- Multi-user auth and household profiles
- Template/caching layer to reduce LLM cost per user
- Recommendation layer (collaborative filtering from structured recipe data)
- Google Calendar integration for prep day reminders
- Photo-based meal logging (LLM estimates macros from image)
- Seasonal ingredient suggestions

---

## Screen Inventory

| Screen | Purpose | Nav location |
|---|---|---|
| Dashboard | Today's meals + macro rings + week strip | Plan tab (home) |
| Recipe detail | Reference card for a single meal | Tap meal card from dashboard |
| Prep guide | Step-by-step batch cooking mode | "Start prep guide" from dashboard or recipe detail |
| AI chat panel | Copilot bottom sheet | FAB (saffron, bottom-right) |
| Grocery list | Consolidated shopping list | Accessible from dashboard or AI chat |
| Recipes tab | Saved recipe collection | Bottom nav — Recipes |
| Profile | Preferences, calorie targets, household settings | Bottom nav — Profile |

---

## Step Ownership Model

A critical design decision: **recipe detail** and **prep guide** divide cooking steps by *when* they happen, with zero duplication.

- **Prep guide** owns the full end-to-end batch cooking workflow: marination, parallel cooking, portioning into containers. This is the Sunday/Wednesday session.
- **Recipe detail** assumes the food is already prepped and stored. It shows only serving instructions: reheat method + plating guidance. It's the Monday-Wednesday reference card.

The "View in prep guide" button on the recipe detail links back to the original batch session for reference.

---

## Meal Naming Convention

All meals use universally understandable English names as the primary display. Authentic Indian names are stored as subtitles/tags for searchability.

| Display name | Subtitle/tag |
|---|---|
| Chickpea flour crepes | besan chilla |
| Cumin rice | jeera rice |
| Lentil soup | tadka dal |
| Spiced cauliflower & potato | aloo gobi |
| Flatbread | roti / chapati |
| Yogurt dip | raita |
| Spiced ground meat | keema |
| Creamy spinach | palak paneer |
| Mint-cilantro chutney | hari chutney |
