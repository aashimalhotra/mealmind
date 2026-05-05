# MealMind — Design System

## Design Philosophy

Warm, inviting, kitchen-friendly. "Your grandmother's kitchen meets modern health tracking." The app should feel like opening a cookbook, not a spreadsheet. Spacious touch targets because you're using this with flour on your hands.

**Mode:** Light mode default. Dark mode is a future nice-to-have.

---

## Color Palette

Indian-inspired earthy tones. Every color maps to a food mental model.

### Core Colors

```
--color-primary:          #C45B28    /* Terracotta / turmeric orange — primary actions, protein ring */
--color-secondary:        #4A8C5C    /* Curry leaf green — success states, fat ring, "on track" */
--color-accent-gold:      #C49B28    /* Saffron gold — AI copilot, FAB, carbs ring */
--color-accent-olive:     #6B8C3A    /* Olive green — veggie servings ring */
```

### Background & Surface

```
--color-bg:               #FAF6F0    /* Warm off-white, like fresh malai */
--color-surface:          #FFFFFF    /* Card backgrounds */
--color-surface-warm:     #FFF8ED    /* AI insight cards, pantry check */
--color-border:           #E8DDD0    /* Card borders, dividers */
--color-border-light:     #F0E6D8    /* Inner dividers within cards */
```

### Text

```
--color-text-primary:     #3D2E1F    /* Warm charcoal — headings, body */
--color-text-secondary:   #6B5A48    /* Medium brown — descriptions, step text */
--color-text-tertiary:    #8C7B6B    /* Muted — labels, timestamps, subtitles */
--color-text-placeholder: #B8ADA0    /* Input placeholders */
```

### Macro Ring Colors

```
--color-protein:          #C45B28    /* Terracotta — think tandoori */
--color-carbs:            #C49B28    /* Wheat gold — think roti/rice */
--color-fat:              #4A8C5C    /* Curry leaf green — think ghee */
--color-veggies:          #6B8C3A    /* Olive green — think sabzi */
```

### Semantic Colors

```
--color-success:          #4A8C5C    /* Completed steps, "prepped" badges */
--color-prep-day:         #4A8C5C    /* Wednesday prep indicator */
--color-dine-out:         #C49B28    /* Friday/Sunday dine-out badges */
--color-ai-surface:       #FFF8ED    /* AI insight/tip card background */
--color-ai-accent:        #C49B28    /* AI copilot FAB, AI avatar */
```

### Dark UI (prep guide header, timers, user chat bubbles)

```
--color-dark-bg:          #3D2E1F    /* Deep warm brown */
--color-dark-text:        #FFFFFF
--color-dark-text-muted:  rgba(255, 255, 255, 0.5)
```

### Macro Tag Backgrounds (recipe detail)

```
--color-protein-bg:       #FDF5EE
--color-carbs-bg:         #FBF6E8
--color-fat-bg:           #EDF5F0
--color-veggies-bg:       #F2F5EC
```

---

## Typography

### Font Stack

- **Headings / recipe titles:** A rounded, warm sans-serif — Nunito, DM Sans, or similar. Characterful but not childish.
- **Body text:** Same family for consistency at MVP. Consider adding a serif display font (Fraunces, Playfair Display) for recipe titles only in Phase 2.
- **Mono / numbers:** Use `font-variant-numeric: tabular-nums` for timers and macro numbers to prevent layout shift.

### Scale (mobile-first, kitchen-distance reading)

```
--font-size-xs:           10px    /* Timestamps, item counts */
--font-size-sm:           11px    /* Labels, category headers, tag text */
--font-size-body-sm:      12px    /* Subtitles, descriptions, AI tips */
--font-size-body:         13px    /* Step text, chat messages, secondary info */
--font-size-body-lg:      14px    /* Ingredient names, section headers */
--font-size-input:        14px    /* Form inputs */
--font-size-card-title:   15px    /* Meal card titles, step instructions */
--font-size-section:      16px    /* Section headers, timer labels */
--font-size-screen-title: 18px    /* Screen titles (Batch cook guide) */
--font-size-heading:      20px    /* Active step title, calorie display */
--font-size-page-title:   22px    /* Dashboard greeting, recipe name */
--font-size-timer:        42px    /* Active timer countdown */
```

### Weights

```
--font-weight-normal:     400
--font-weight-medium:     500    /* Primary weight for headings, bold numbers */
```

---

## Spacing & Layout

### Border Radius

```
--radius-sm:              6px     /* Small tags, badges */
--radius-md:              8px     /* Filter tabs, buttons */
--radius-lg:              10px    /* Macro tag boxes, action chips */
--radius-card:            12px    /* Standard cards, timers, background items */
--radius-card-lg:         14px    /* Meal cards, ingredient lists, main CTAs */
--radius-active-step:     16px    /* Active step card in prep guide */
--radius-page:            24px    /* Phone frame / page container */
```

### Spacing

```
--space-xs:               4px
--space-sm:               6px
--space-md:               8px
--space-lg:               10px
--space-xl:               12px
--space-2xl:              14px
--space-3xl:              16px
--space-4xl:              18px
--space-5xl:              20px
```

### Page Padding

```
--page-padding:           20px    /* Horizontal page padding */
```

### Touch Targets

- Minimum touch target: 44px × 44px (FAB, timer controls, nav items)
- Checkboxes in grocery list: 22px visual, but padded to 44px tap area
- Meal cards: full-width tappable rows, minimum 60px height

---

## Component Patterns

### Macro Rings

- SVG circles with `stroke-dasharray` / `stroke-dashoffset` animation
- Ring diameter: 68px on dashboard
- Stroke width: 5px
- Background track: `--color-border` (#E8DDD0)
- Active stroke: respective macro color
- Center text: percentage or fraction (veggies: "2/5")
- Below ring: label + "current / target" with units

### Meal Cards

- White background, rounded corners (`--radius-card-lg`)
- Subtle border: 0.5px `--color-border`
- Left content: meal type badge (colored pill), time, title, macro summary
- Right: 52×52px rounded placeholder (abstract food illustration)
- Dinner card dimmed (opacity: 0.6) if not yet eaten
- Tap → recipe detail

### Meal Type Badges

| Meal | Text color | Background |
|---|---|---|
| Breakfast | #C45B28 | #FAECE7 |
| Lunch | #4A8C5C | #E1F5EE |
| Dinner | #8C6B3A | #FAF0E0 |

### Week Strip

- Horizontal scroll, 7 day pills
- Current day: filled primary color (#C45B28), white text
- Other days: white background, border
- Dine-out days (Fri/Sun): gold label text, wider pill indicator (18×6px)
- Prep days: green dot indicator
- Regular days: neutral dot (#E8DDD0)

### Prep Day Card

- White card with green left border (3px solid `--color-success`)
- Shows prep day label, batch summary, time estimate, chevron
- Only surfaces when relevant (approaching prep day)

### AI Insight Card

- Background: `--color-ai-surface` (#FFF8ED)
- Left: 28px saffron gold circle with icon
- Right: title "AI insight" + suggestion text
- Used on dashboard, recipe detail, and inline in chat

### Timer (Prep Guide)

- Dark background (#3D2E1F) rounded container
- Large countdown: 42px, tabular-nums, white
- Label above (e.g., "FIRST SIDE"), muted
- "of X:00" below
- Pause and extend buttons: 48px circles, rgba white background

### Background Timers

- White card, standard border
- Left: colored dot (matches dish) + timer name + "Started at step N"
- Right: countdown + "of X:00"
- Sorted by time remaining

### Active Step Card (Prep Guide)

- Larger border radius (16px)
- Step number in colored circle + "ACTIVE NOW" label
- Large step title (20px)
- Step description (15px, higher line-height)
- Timer block
- Previous / Next action buttons

### Action Buttons

- Primary: filled color, white text, 14px radius, 14px padding
- Secondary: white/cream background, border, dark text
- Navigation (Previous): cream background, icon + label, flex: 1
- Main action (Next step): primary color, flex: 2

### Grocery List Items

- Checkbox: 22px rounded square, 6px radius
- Checked: green fill with white checkmark SVG
- Unchecked: border only
- Checked items: text strikethrough, muted color, but still visible
- Item name + subtitle (which recipe/prep day) + quantity right-aligned

### Chat Bubbles (AI Panel)

- AI messages: white background, `4px 14px 14px 14px` radius (top-left sharp)
- User messages: dark background (#3D2E1F), `14px 4px 14px 14px` radius (top-right sharp)
- AI avatar: 28px saffron gold circle with flame icon
- Timestamps: 10px, muted, below bubble

### Quick Action Chips

- White background, standard border, 10px radius
- 12px text, tappable
- Wrap in flex container with 6px gap

### Bottom Navigation

- White background, top border
- Three tabs: Plan (active: primary), Recipes, Profile
- Icon + 10px label
- FAB overlaps nav bar: 52px saffron gold circle, positioned absolute right: 20px, top: -24px
- FAB shadow: `0 2px 12px rgba(196, 155, 40, 0.35)`

### Bottom Sheet (Chat Panel)

- Slides up over dimmed dashboard (dashboard at opacity 0.4, brightness 0.7)
- Drag handle: 36×4px rounded bar, centered
- Header: AI avatar + "MealMind" title + Clear/expand buttons
- Divider below header
- Scrollable chat area
- Fixed input bar at bottom: text input + send button (saffron gold circle, up-arrow icon)

### Portion Toggle (Recipe Detail Ingredients)

- Small segmented control: two segments (1500 / 1800)
- Active segment: primary fill, white text
- Inactive segment: white background, muted text
- Positioned right-aligned next to "Ingredients" header

### Tags / Pills

- Background: white, standard border
- Left: 8px colored dot
- Text: 12px, medium weight
- Examples: "High protein," "Gluten free," "Batch friendly"

### Status Badges

- "Prepped on Sunday · stored in fridge": green-tinted background, green checkmark icon, green text
- "Prep day — Wednesday": green text, no background, used as card label

---

## Interaction Patterns

- **Swipe left on meal card:** trigger AI swap suggestion
- **Long-press meal card:** save to favorites
- **Tap pantry chip:** promote spice to main shopping list
- **FAB pulse animation:** gentle bounce when AI has proactive suggestion
- **Macro ring animation:** fills on page load and when meals are completed
- **Step completion checkmark:** satisfying fill animation
- **Bottom sheet:** swipe up to full screen, swipe down to dismiss
