# Mise — Intelligent Chef

**A full-stack cooking app built around Claude.**

Import any recipe URL, get AI-driven ingredient swaps tuned to real dietary shifts, work through a prep checklist, then cook one clear step at a time.

→ [Live app](https://miseintelligentchef.netlify.app) · [Portfolio case study](https://meganleclairdesign.com/projects/mise)

---

## What it does

Recipe websites are built for traffic, not cooking. Mise strips the friction out of the gap between "found a recipe" and "actually cooked it."

**Editorial mode** — Import any URL, browse your kitchen, plan what to cook.

**Cook mode** — One step at a time. Ingredients narrow to just what's relevant to the current step. Timer persists across tab switches and refreshes. Swap any ingredient without losing your place.

**AI ingredient swaps (Claude)** — A slide-up sheet powered by Claude Haiku generates 2–3 substitutions per ingredient, focused on real dietary shifts: dairy-free, lower calorie, lower carb, higher protein. Quality is enforced at the prompt level — cheap neutral oils are explicitly banned, combinations are encouraged (e.g. cream cheese + whole milk for heavy cream), and Claude receives the full ingredient list as context so suggestions are grounded in the actual dish.

---

## Architecture

### Recipe import — three-tier pipeline

1. **Spoonacular** — enriched parsing when a key is configured
2. **JSON-LD structured data** — a custom adapter fetches the URL directly, extracts `<script type="application/ld+json">` blocks, and finds `@type: "Recipe"` nodes — handling nested `@graph`, HowToSection with `itemListElement`, and plain string arrays. Works with virtually any major recipe site, for free.
3. **Demo mock** — full end-to-end flow with no external dependencies

### Image proxy

Recipe images route through `/api/image-proxy`, which fetches with a browser `User-Agent` and sets `Referer` to the source hostname — bypassing hotlink protection silently. Private IP ranges are blocked. Images are validated by content-type, capped at 8MB, and cached for 7 days.

### Session model

Cook sessions persist to Supabase (`cook_sessions`). Timer state is stored as a fixed `endsAt` timestamp — not a countdown counter — so a background tab or phone lock doesn't drift the clock.

### Step-ingredient matching

`getIngredientsForStep()` matches ingredient names against step text. Strict matching misses paraphrased ingredients; loose matching shows too much. The solution: show everything when confidence is low and flag it explicitly. Honest beats clever.

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

**Prompt scope matters more than prompt cleverness.** The Claude swap prompt went through several iterations. The breakthrough wasn't better positive instructions — it was tighter exclusions. Explicitly telling Claude what *not* to suggest (cheap neutral oils, aromatic vegetables that aren't swap candidates) produced dramatically more useful output than rewording what it *should* suggest.

**Context makes AI suggestions credible.** Sending only the ingredient name produced generic results. Sending the full recipe ingredient list alongside it gave Claude enough context to reason about what a substitution actually does to the dish.

**Three-tier import emerged from real failures.** Spoonacular occasionally extracts garbage from paywalled or redirect pages. JSON-LD is surprisingly reliable as a free fallback — most major recipe sites include it for SEO. Designing each adapter against the same interface kept fallback logic clean.

---

## Running locally

```bash
npm install
npm run dev
```

The app works fully without any API keys — the JSON-LD import adapter handles recipe URLs, the demo recipes demonstrate every feature, and the AI swap endpoint falls back gracefully when `ANTHROPIC_API_KEY` isn't set.

To enable Claude-powered swaps and Spoonacular imports, copy `.env.local.example` and fill in your keys.

---

Built by [Megan LeClair](https://meganleclairdesign.com).
