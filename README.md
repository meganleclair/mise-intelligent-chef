# Mise — Intelligent Chef

**A full-stack cooking app built around Claude.**

Import any recipe URL, browse your kitchen, and talk through it with a recipe-scoped nutrition chat — swap ingredients, change servings, get updated macro estimates, all in one conversation with Claude.

→ [Live app](https://miseintelligentchef.netlify.app) · [Portfolio case study](https://meganleclairdesign.com/projects/mise)

---

## What it does

Recipe websites are built for traffic, not cooking. Mise strips the friction out of the gap between "found a recipe" and "actually cooked it."

**Editorial mode** — Import any URL, browse your kitchen, plan what to cook.

**Nutrition chat (Claude)** — A recipe-scoped chat, backed by Claude Haiku: ask "what if I used chickpeas instead?" or "what's this at 6 servings?" and get an updated macro estimate (calories, protein, carbs, fat, fiber) alongside a conversational answer — the same back-and-forth you'd have with a general chat AI, but grounded in the actual recipe. Rough estimates, not tracking-app precision — swap suggestions and serving-size math happen in the same conversation instead of two separate tools.

---

## Architecture

### Recipe import — three-tier pipeline

1. **Spoonacular** — enriched parsing when a key is configured
2. **JSON-LD structured data** — a custom adapter fetches the URL directly, extracts `<script type="application/ld+json">` blocks, and finds `@type: "Recipe"` nodes — handling nested `@graph`, HowToSection with `itemListElement`, and plain string arrays. Works with virtually any major recipe site, for free.
3. **Demo mock** — full end-to-end flow with no external dependencies

### Image proxy

Recipe images route through `/api/image-proxy`, which fetches with a browser `User-Agent` and sets `Referer` to the source hostname — bypassing hotlink protection silently. Private IP ranges are blocked. Images are validated by content-type, capped at 8MB, and cached for 7 days.

### Nutrition session model

One "current version" per recipe persists to Supabase (`recipe_nutrition_sessions`) — servings, active ingredient swaps, and the last-estimated macros. The live conversation itself isn't persisted; only this resulting state is, restored the next time you open the recipe.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) — Server Components, Server Actions, Route Handlers |
| AI | Claude Haiku via `@anthropic-ai/sdk` |
| Database + Auth | Supabase SSR — per-request server clients, RLS on all tables |
| Recipe import | Spoonacular → custom JSON-LD adapter → demo mock |
| UI | shadcn/ui (Dialog, Sheet, Checkbox) |
| Deployment | Netlify |

---

## What building it surfaced

**State belongs in the prompt, not just conversation history.** The nutrition-chat prompt asks Claude to return the full current list of active ingredient swaps every turn — not just what changed — so servings and substitutions stay consistent across a multi-turn conversation without extra merge logic on the server.

**Context makes AI suggestions credible.** Sending only the ingredient name produced generic results. Sending the full recipe ingredient list alongside it gave Claude enough context to reason about what a substitution actually does to the dish.

**Three-tier import emerged from real failures.** Spoonacular occasionally extracts garbage from paywalled or redirect pages. JSON-LD is surprisingly reliable as a free fallback — most major recipe sites include it for SEO. Designing each adapter against the same interface kept fallback logic clean.

---

## Running locally

```bash
npm install
npm run dev
```

The app works fully without any API keys — the JSON-LD import adapter handles recipe URLs and the demo recipes demonstrate every feature. Without `ANTHROPIC_API_KEY`, recipe summaries are skipped silently and the nutrition chat shows a clear error instead of a response.

To enable the nutrition chat, recipe summaries, and Spoonacular imports, copy `.env.example` to `.env.local` and fill in your keys.

---

Built by [Megan LeClair](https://meganleclairdesign.com).
