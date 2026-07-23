# Mise: Nutrition Chat Refactor — Design

## Context

Mise's current core loop is a step-by-step Cook Mode with per-step ingredient matching, plus a single-ingredient AI swap sheet (2-3 canned substitutions per ingredient). In practice:

- The three-tier recipe import pipeline (Spoonacular → JSON-LD scraper → demo mock) frequently produces wrong steps, blurry/mismatched images, or falls back to the generic demo.
- Step-ingredient matching (`getIngredientsForStep()`) is a fragile text-matching heuristic — the README already documents this as a known trade-off ("show everything when confidence is low").
- The AI swap sheet produces suggestions users described as "bizarre" and impractical.
- User research (a structured self-interview, see below) revealed the owner's actual real-world workflow doesn't use step-by-step cook mode at all — she views the original recipe to cook, and instead uses a separate chat AI (ChatGPT) alongside a recipe app (Deglaze) to iteratively test ingredient substitutions and recalculate macros/serving sizes.

### The research finding

Walkthrough of a real cooking session: find a recipe → save it in a recipe app → open a *separate* chat AI → ask multi-turn questions ("what if I use 1/3 cup EVOO instead of 1/2?", "what if I had chickpeas?", "macros for 4 servings" → "too high, redo for 6" → "what's the fiber?") → cook using the original recipe page, not the app's cook mode.

This happens on **every** cook, not just meal-prep. The actual job-to-be-done is: *reason iteratively about substitutions and portioning to make a recipe healthier, without losing taste* — not "get one-shot swap suggestions" and not "be guided step-by-step through cooking."

Numbers only need to be roughly right (not tracking-app-precise) — the user logs final numbers into a separate tracker app manually regardless.

Primary device/context: an iPad propped up in **landscape**, with the recipe/macro info on one side and a chat on the other.

## Goals

- Replace the single-ingredient swap sheet with a recipe-scoped nutrition chat: a macro summary (calories/protein/carbs/fat/fiber, estimated by Claude — not a grounded nutrition database) plus serving-size and ingredient-swap controls, backed by an open conversational chat for "what if" questions.
- Remove step-by-step Cook Mode entirely; replace with a plain instructions read-through and an always-visible link to the original recipe page.
- Track cooked vs. not-yet-cooked recipes.
- Keep recipe saving/importing/organizing (Kitchen, Favorites, Recently Imported) unchanged.

## Non-goals

- Grounded/precise nutrition data (no USDA/Edamam/Spoonacular-nutrition integration) — Claude's estimate is sufficient, matching how the user already uses ChatGPT for this today.
- Tracker-app integration — the user logs numbers into a separate app manually.
- Multiple saved variants per recipe — only one "current" swapped/adjusted version is persisted per recipe.
- Deglaze-style inline ingredient annotation inside instruction text — decided against; the macro card + chat replaces the need for step-scoped ingredient display.
- Fixing recipe-import parsing quality directly — instead, always exposing the original recipe link removes the pressure on parsing to be perfect.

## Architecture

### Data model changes

**Drop:**
- `cook_sessions` (`current_step_index`, `timer_state`, etc.) — no longer meaningful once step-by-step Cook Mode is removed.
- `recipe_modifications` (`ingredient_key`, `replacement_label`, `impact_note`) — built for the one-shot single-ingredient swap model being replaced.

**Add `recipe_nutrition_sessions`** (one row per recipe per user — the "current version"):
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid, references `auth.users` | |
| `recipe_id` | uuid, references `recipes` | |
| `servings` | integer | current serving count for this session |
| `ingredient_overrides` | jsonb | `[{ original, replacement }]` — current swaps |
| `macros` | jsonb | last-estimated `{ calories, protein, carbs, fat, fiber }` for current servings/overrides |
| `updated_at` | timestamptz | |

Unique on `(user_id, recipe_id)` — upserted, not appended. The live chat conversation itself is **not persisted** — it exists only in client-side state while the panel is open, and is discarded (not written anywhere) when the panel closes via either Done Cooking or Exit. Reopening a recipe pre-loads the macro card from this row but always starts a fresh chat.

**Extend `recipes`:**
- Add `has_cooked boolean not null default false` and `first_cooked_at timestamptz`.
- Set by: (a) automatically, when Done Cooking is pressed in the nutrition panel; (b) manually, via a lightweight toggle available directly on the recipe card / detail page (independent of opening the nutrition panel at all) — mirrors the existing inline-favorite-toggle pattern already in the Kitchen page.
- Kitchen page gains a way to filter/view Not-yet-cooked vs. Cooked, alongside existing Favorites/Recently Imported.

### UI: Recipe nutrition panel

Replaces the current AI-swap slide-up sheet, opened from the recipe detail page.

- **Macro card**: calories/protein/carbs/fat/fiber for the current servings, a servings stepper, and the ingredient list with swap affordances (tapping an ingredient's swap control opens the chat, scoped to asking about alternatives for that ingredient).
- **Chat**: open-ended conversation scoped to this recipe (system context = title, ingredients, current servings/overrides). Handles free-form questions ("what if I used chickpeas instead?") and recalculates the macro card as the conversation resolves changes.
- **Session semantics**: opening the panel loads a *working copy* seeded from the persisted `recipe_nutrition_sessions` row (or defaults, if none exists yet). All edits (servings, swaps, chat) apply only to the working copy.
  - **Done Cooking** → upserts the working copy to `recipe_nutrition_sessions`, sets `has_cooked = true` / `first_cooked_at` if not already set, clears the chat.
  - **Exit** → discards the working copy entirely (no write), clears the chat. Recipe reverts to whatever was last actually saved.

### Layout / responsiveness

Primary target: iPad landscape (~1024px+), side-by-side split — macro card + controls on one side, chat on the other. Build the stacked layout first (macro card above, chat below) since it works down to phone width; the side-by-side split is a progressive enhancement at wider viewports, not a separate build.

### Instructions view (replacing Cook Mode)

- No step-by-step navigation, no per-step ingredient matching, no timer tied to a step.
- A single continuous read-through of parsed instructions (when parsing succeeded).
- An always-visible "View original recipe" link/button — not a fallback-only affordance, but a first-class, permanent part of the page. This resolves the import-quality complaint without needing to fix parsing itself: a bad parse is no longer a dead end.

### API / error handling

- New endpoint (replacing `/api/swaps`) handles both the initial macro estimate and ongoing chat turns, scoped to a recipe + current working-copy state.
- On failure: retries automatically server-side (a small number of attempts with backoff) for transient errors before giving up.
- After retries are exhausted: fails loud — an explicit, visible error state in the UI with a manual retry action. No silent fallback to a guessed or generic answer.

## Out of scope / explicitly removed

- `(cook)` route group and all step-by-step Cook Mode UI.
- `cook_sessions` table.
- `/api/swaps` route and `recipe_modifications` table.
- Single-ingredient canned-suggestion swap sheet.

## Open items for the implementation plan

- Exact Claude prompt design for the nutrition chat (system context format, response structure for macro extraction from freeform replies).
- Whether macro re-estimation happens automatically on every servings/swap change or requires an explicit "recalculate" action.
- Visual design pass on the macro card + chat components (functional layout validated here; polish not yet designed).
