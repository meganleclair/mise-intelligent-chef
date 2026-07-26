# Mise: Visual Identity Refresh — Design

## Context

Mise shipped with a calm, quiet, editorial identity: warm neutral/olive-sage-peach palette (oklch tokens in `globals.css`), Fraunces serif headlines, modest border radius, DM Sans body copy. Since then, the app gained its flagship differentiator — **Sous**, a recipe-scoped AI nutrition chat (see `2026-07-22-nutrition-chat-refactor-design.md`) — but Sous has almost no visual presence: one homepage section and a single sheet-trigger button, no distinct color, no icon, no personality.

The owner explored three reference apps (a travel-app dashboard, a recipe-app UI, a food-brand product page) as mood-board input, iterated through several color/typography/icon directions with live visual mockups, and landed on a direction that keeps Mise's warm foundation but pushes it bolder and gives Sous a real, consistent visual identity throughout the app.

## Goals

- Replace the current oklch olive/sage/peach palette with a warmer, bolder cream + chocolate-brown + blush-pink palette.
- Drop the Fraunces serif headline treatment entirely in favor of a bold rounded sans (Fredoka).
- Introduce Capriola as a dedicated wordmark typeface for "Mise" and "Sous" brand text specifically (not used for anything else — it ships in exactly one weight, which is fine for a wordmark and wrong for general headlines).
- Move to a fully pill-shaped (`999px`) radius scale for buttons, tags, badges, and chips.
- Give Sous a consistent visual mark (Font Awesome Pro Duotone `hat-chef`) used everywhere Sous appears.
- Migrate the whole app's iconography from Font Awesome free-solid/free-regular to Font Awesome Pro Duotone (owner has a full Pro license).
- Add a recurring thin swirl/line-art decorative motif as a background accent behind hero sections and empty states.
- Apply this consistently across every page — home, recipe detail, Kitchen, the Nutrition Panel, and auth pages. This is a full consistency pass, not a homepage-only refresh.

## Non-goals

- No functional/behavioral changes to Sous, recipe import, Kitchen, or any other feature — this is visual only.
- No new features beyond what's described above (no new pages, no new Sous capabilities).
- No dark mode work (out of scope, not requested).
- No illustrated mascot/character for Sous — the owner explicitly chose a simple icon mark over a character (see prior brainstorm turn), a decision this refresh does not revisit.

## Design tokens

### Color

Replace the `:root` block in `src/app/globals.css`. Current oklch tokens (`--surface-primary`, `--text-heading`, `--accent-sage`, `--accent-peach`, `--accent-olive`, and everything derived from them) are replaced with:

| Token | New value | Role |
|---|---|---|
| `--surface-primary` | `#F1E4D3` | Page background |
| `--surface-elevated` | `#FBF6EF` | Cards, elevated surfaces |
| `--text-heading` | `#4A3626` | Headings, primary button background, icon color |
| `--text-muted` | `#7A6552` | Secondary/muted text |
| `--accent-blush` | `#F3DCD3` | Secondary accent surface (statement panels, Sous-adjacent secondary cards) — replaces `--accent-peach` |
| `--accent-chocolate` | `#4A3626` | Primary accent — same value as `--text-heading`, kept as a distinct token name for semantic clarity where "this is the Sous/primary-action color" matters more than "this is heading text" |

Derived tokens (`--background`, `--foreground`, `--card`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, all `--chart-*`, all `--sidebar-*`) are recomputed from the new base tokens following the exact same structural pattern already in `globals.css` (i.e. `--primary: var(--accent-chocolate)`, `--accent: var(--accent-blush)`, etc.) — the *mechanism* doesn't change, only the underlying hues.

### Typography

- **Headlines** (`h1`–`h3`, currently `font-serif`/`font-heading` mapped to Fraunces): switch to **Fredoka**, weight 700. Add via `next/font/google` in `src/app/layout.tsx` (`import { Fredoka } from "next/font/google"`), following the exact pattern already used for the existing `DM_Sans`/`Fraunces`/`Geist_Mono` font loads in that file. Update the `--font-heading` / `--font-serif` CSS variable mapping in `globals.css`'s `@theme inline` block to point at the new Fredoka variable instead of Fraunces.
- **Wordmarks only** ("Mise" and "Sous" as brand text — e.g. the small uppercase "Mise" label in the homepage hero, the "Sous" name wherever it appears as a standalone label rather than inside a sentence): **Capriola**, weight 400 (its only weight). Add as its own `next/font/google` load, exposed as a new CSS variable (e.g. `--font-wordmark`), used via a small wrapper/utility class rather than replacing the base `font-sans`/`font-heading` variables — this keeps Capriola scoped to the specific wordmark usages the owner approved, not accidentally applied to general headline copy (which needs Fredoka's bold weight, unavailable in Capriola).
- **Body text**: unchanged — DM Sans stays exactly as it is today. No complaints were raised about body copy; only headline/wordmark treatment changed.
- Fraunces is removed from the project entirely once nothing references it (confirm via grep before removing the `next/font/google` import and its `--font-serif` mapping).

### Shape

- Border radius scale in `globals.css` (`--radius` and its derived `--radius-sm` through `--radius-4xl`) changes from the current `0.5rem`-based scale to a fully pill-shaped system: buttons, tags, badges, and chips render at `999px` (effectively fully rounded regardless of height). Cards and larger containers (recipe hero image box, the Sous macro card, section wrappers) keep `--radius` at `1.25rem` — full pill-rounding is for discrete interactive/label elements, not large content containers, matching every mockup shown during this brainstorm (cards had gentle rounding, buttons/tags were fully pill-shaped).

### Decorative motif

A thin, single-stroke swirl/ellipse line-art SVG (see the `sous-icon-duotone.html`/earlier mockup files in `.superpowers/brainstorm/` for the exact shape used during brainstorming), rendered at low opacity (~20-25%) in the chocolate-brown or muted tone, positioned as a background accent behind: the homepage hero section, the "Meet Sous" promo section, and empty states (e.g. Kitchen's "nothing here yet" states). Implemented as a small reusable component (e.g. `src/components/decorative-swirl.tsx`) accepting position/size props, not hand-copied inline SVG at each usage site.

## Sous visual identity

- **Icon**: `faHatChef` from `@fortawesome/pro-duotone-svg-icons` (already installed, `prefix: "fad"`, confirmed genuinely duotone — 2-path icon definition). Rendered in chocolate-brown (`--text-heading`/`--accent-chocolate`), using Font Awesome's standard duotone CSS custom properties (`--fa-primary-color`, `--fa-secondary-color`, `--fa-secondary-opacity: 0.4`) rather than hardcoded per-instance opacity values, so the styling is centralized and consistent.
- **Everywhere Sous appears**, the icon accompanies the word "Sous": the `NutritionPanel` trigger button ("Cook with Sous"), the in-panel header badge ("Chatting with Sous"), the homepage "Meet Sous" promo section, and the Kitchen/recipe-detail entry points into Sous.
- This was already partly built in the prior nutrition-chat work (button/copy renamed from "Claude" to "Sous") — this refresh adds the actual icon mark to those existing text-only locations, it does not rebuild the Sous feature itself.

## Icon system migration

Replace Font Awesome free-solid/free-regular imports with their Pro Duotone equivalents throughout `src/`. Confirmed (via direct package inspection) that a Duotone (`fad` prefix) version exists for every icon currently in use:

| Current import | File(s) using it | Duotone replacement |
|---|---|---|
| `faChevronDown` (`free-solid`) | `kitchen-recipe-lists.tsx` | `faChevronDown` (`pro-duotone-svg-icons`) |
| `faEye`/`faEyeSlash` (`free-solid`) | `password-input.tsx` (or wherever the show/hide password toggle lives) | `faEye`/`faEyeSlash` (`pro-duotone-svg-icons`) |
| `faHouse` (`free-solid`) | nav/header component | `faHouse` (`pro-duotone-svg-icons`) |
| `faImage` (`free-solid`) | `recipe-image-fallback.tsx` | `faImage` (`pro-duotone-svg-icons`) |
| `faMagnifyingGlass` (`free-solid`) | `kitchen-recipe-lists.tsx` | `faMagnifyingGlass` (`pro-duotone-svg-icons`) |
| `faRightFromBracket` (`free-solid`) | sign-out control | `faRightFromBracket` (`pro-duotone-svg-icons`) |
| `faStar`/`faStarOutline`/`faStarSolid` (`free-solid` + `free-regular`) | `star-rating.tsx` | `faStar` (`pro-duotone-svg-icons`) for the filled/rated state (full-opacity duotone); unrated stars keep a distinct muted/low-opacity treatment (implementation detail, not a duotone-vs-solid question — see Open Items) |
| `faTrash` (`free-solid`) | `delete-recipe-button.tsx` | `faTrash` (`pro-duotone-svg-icons`) |
| `faUtensils` (`free-solid`) | `cooked-toggle-button.tsx` | `faUtensils` (`pro-duotone-svg-icons`) |
| `faXmark` (`free-solid`) | wherever close/dismiss controls render | `faXmark` (`pro-duotone-svg-icons`) |

All Duotone icons render via the same `--fa-primary-color`/`--fa-secondary-color`/`--fa-secondary-opacity` CSS custom property mechanism described above for the Sous mark — one centralized styling approach for every icon in the app, not per-instance color props.

`@fortawesome/pro-solid-svg-icons` and `@fortawesome/pro-regular-svg-icons` (installed during this brainstorm alongside `pro-duotone-svg-icons`) are not needed for this migration and can be removed from `package.json` once the Duotone migration is complete, unless a specific icon turns out to need a non-duotone rendering somewhere (unlikely, but confirm during implementation before removing).

## Scope

Every user-facing page and component gets the new tokens/typography/shape/icons: home page, recipe detail page, demo recipe page, Kitchen page, the Nutrition Panel, login/signup pages, and every shared component (buttons, cards, badges) they depend on. This is a systemic token/component-level change — most of it should flow automatically once `globals.css` tokens, the font loads, and the base `Button`/`Card`/badge-style shadcn components are updated, since the app already consistently uses those shared primitives rather than one-off styling (confirmed during the earlier "is everything on one library" check this same session).

## Open items for the implementation plan

- Exact Fredoka weight/subset configuration in the `next/font/google` call (which subsets, `display` strategy) — standard Next.js font-loading detail, not a design decision.
- The unrated-star visual treatment (Open Items table above) — needs a concrete decision (e.g. outline-only vs. low-opacity duotone) during planning, not blocking the overall direction.
- Whether `@fortawesome/pro-solid-svg-icons`/`pro-regular-svg-icons` get removed from `package.json` after migration, or kept in case a future icon needs non-duotone rendering.
- Netlify build environment needs the `FONTAWESOME_PACKAGE_TOKEN`/npm auth token configured (matching the local `.npmrc`) before this branch can deploy successfully — a manual dashboard step for the owner, not code.
