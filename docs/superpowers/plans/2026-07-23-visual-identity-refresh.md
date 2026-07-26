# Visual Identity Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Mise's color/typography/shape tokens, migrate every icon from Font Awesome free-solid/free-regular to Pro Duotone, give Sous a consistent icon mark, and add a reusable decorative swirl motif — a full visual consistency pass across the whole app.

**Architecture:** Token-level changes in `globals.css`/`layout.tsx` cascade automatically to every page since the app already consistently uses shared `Button`/`Card`/CSS-variable primitives (confirmed during brainstorming — no one-off styling to hunt down). Icon migration introduces one small `DuotoneIcon` wrapper component so duotone's secondary-layer styling is centralized in one place, not repeated at each of the ~10 call sites. Everything is sequenced so the app builds and looks coherent after every task, not just at the end.

**Tech Stack:** Next.js 16, Tailwind v4 (CSS-first config, no `tailwind.config.js`), `next/font/google`, `@fortawesome/react-fontawesome` + `@fortawesome/pro-duotone-svg-icons` (already installed).

---

### Task 1: Color tokens

**Files:**
- Modify: `src/app/globals.css:59-105`

- [ ] **Step 1: Replace the `:root` and `.dark` blocks**

Replace lines 59-105 of `src/app/globals.css` (the `:root { ... }` and `.dark { ... }` blocks) with:

```css
:root {
  --surface-primary: #F1E4D3;
  --surface-elevated: #FBF6EF;
  --text-heading: #4A3626;
  --text-muted: #7A6552;
  --accent-blush: #F3DCD3;
  --accent-chocolate: #4A3626;

  --background: var(--surface-primary);
  --foreground: var(--text-heading);
  --card: var(--surface-elevated);
  --card-foreground: var(--text-heading);
  --popover: var(--surface-elevated);
  --popover-foreground: var(--text-heading);
  --primary: var(--accent-chocolate);
  --primary-foreground: #FBF6EF;
  --secondary: #F3E7DC;
  --secondary-foreground: var(--text-heading);
  --muted: #F0E3D2;
  --muted-foreground: var(--text-muted);
  --accent: var(--accent-blush);
  --accent-foreground: var(--text-heading);
  --destructive: oklch(0.55 0.2 25);
  --border: #E4D5C0;
  --input: #E4D5C0;
  --ring: var(--accent-blush);
  --chart-1: #4A3626;
  --chart-2: #7A6552;
  --chart-3: #F3DCD3;
  --chart-4: #D9647A;
  --chart-5: #C93B5C;
  --radius: 0.5rem;
  --sidebar: #EDE0CE;
  --sidebar-foreground: var(--text-heading);
  --sidebar-primary: var(--accent-chocolate);
  --sidebar-primary-foreground: #FBF6EF;
  --sidebar-accent: var(--accent-blush);
  --sidebar-accent-foreground: var(--text-heading);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--ring);
}

.dark {
  --background: var(--surface-primary);
  --foreground: var(--text-heading);
}
```

(The `.dark` block is unchanged in structure from before — dark mode is explicitly out of scope per the design spec's non-goals, so it just continues to mirror light-mode values rather than being built out. `--destructive` is left as the existing oklch red — no design decision was made to change error/destructive styling.)

- [ ] **Step 2: Update `@theme inline`'s color token list to drop the removed sage/peach/olive names**

In `src/app/globals.css`, lines 18-20 currently read:
```css
  --color-accent-sage: var(--accent-sage);
  --color-accent-peach: var(--accent-peach);
  --color-accent-olive: var(--accent-olive);
```
Replace with:
```css
  --color-accent-blush: var(--accent-blush);
  --color-accent-chocolate: var(--accent-chocolate);
```

- [ ] **Step 3: Grep for any remaining reference to the removed token names**

Run: `grep -rn "accent-sage\|accent-peach\|accent-olive" src`
Expected: no output. If anything appears, it's a Tailwind utility class like `text-accent-sage`/`bg-accent-peach` used somewhere outside `globals.css` — replace it with `text-accent-chocolate`/`bg-accent-blush` (whichever is the closer semantic match) before proceeding.

- [ ] **Step 4: Verify the app builds and looks coherent**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run build` — expect success.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "Replace color tokens: cream + chocolate-brown + blush-pink palette"
```

---

### Task 2: Typography — Fredoka headlines, Capriola wordmarks

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css:7-16`
- Modify: `src/components/editorial-header.tsx:16-18`
- Modify: `src/app/(editorial)/page.tsx:22-24, 60-62`

- [ ] **Step 1: Replace the font loading in `layout.tsx`**

Replace the full contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { DM_Sans, Fredoka, Capriola, Geist_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["700"],
});

const capriola = Capriola({
  variable: "--font-capriola",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mise — Cook with clarity",
  description:
    "Turn messy recipes into a calmer, step-by-step cooking experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fredoka.variable} ${capriola.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
```

(`DM_Sans` and `Geist_Mono` are untouched — body copy and monospace stay exactly as they are. `Fraunces` is removed entirely. `Fredoka` is loaded at `weight: ["700"]` only, since that's the only weight this refresh uses for headlines — matches the design spec exactly. `Capriola` only ships weight `400`, so that's its only valid value.)

- [ ] **Step 2: Update the `@theme inline` font mapping in `globals.css`**

Replace lines 7-16 of `src/app/globals.css`:
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-dm-sans);
  --font-serif: var(--font-fraunces);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-fraunces);
  --color-surface-primary: var(--surface-primary);
  --color-surface-elevated: var(--surface-elevated);
  --color-text-heading: var(--text-heading);
  --color-text-muted: var(--text-muted);
```
with:
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-dm-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-fredoka);
  --font-wordmark: var(--font-capriola);
  --color-surface-primary: var(--surface-primary);
  --color-surface-elevated: var(--surface-elevated);
  --color-text-heading: var(--text-heading);
  --color-text-muted: var(--text-muted);
```

(`--font-serif` is removed entirely — nothing should reference `font-serif` as a Tailwind utility after this task. `--font-wordmark` is new, mapped to Capriola, exposed as a `font-wordmark` Tailwind utility class via Tailwind v4's `@theme inline` mechanism, the same way `--font-heading`/`--font-sans`/`--font-mono` already work.)

- [ ] **Step 3: Grep for every `font-serif` usage and replace with `font-heading`**

Run: `grep -rln "font-serif" src`

For each file found, replace `font-serif` with `font-heading` in every className. As of this plan's writing, this affects at minimum:
- `src/components/editorial-header.tsx:16` — the "Mise" wordmark link (handled specially in Step 4 below — don't just blanket-replace this one with `font-heading`, it needs `font-wordmark` instead)
- `src/app/(editorial)/page.tsx` — multiple `h1`/`h2` headings (e.g. lines 25, 63, 88, 100) — replace `font-serif` with `font-heading` on all of these except line 23 and line 61 (the "Mise" and "Meet Sous" eyebrow labels — handled in Step 4)
- Any other file the grep surfaces (component files for recipe/demo pages, etc.) — replace `font-serif` with `font-heading` in every case EXCEPT literal "Mise" or "Sous" wordmark text (identify by reading the surrounding JSX text content, not just the className)

- [ ] **Step 4: Apply `font-wordmark` (Capriola) specifically to "Mise"/"Sous" brand-text labels**

In `src/components/editorial-header.tsx`, change line 16 from:
```tsx
        <Link href="/" className="font-serif text-xl tracking-tight text-text-heading">
          Mise
        </Link>
```
to:
```tsx
        <Link href="/" className="font-wordmark text-xl tracking-tight text-text-heading">
          Mise
        </Link>
```

In `src/app/(editorial)/page.tsx`, change line 22-24 from:
```tsx
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Mise
          </p>
```
to:
```tsx
          <p className="font-wordmark text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mise
          </p>
```
(dropping `font-medium` since Capriola only has one weight — the `font-medium` utility would have no effect and is misleading to leave in) and change lines 60-62 from:
```tsx
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Meet Sous
            </p>
```
to:
```tsx
            <p className="font-wordmark text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Meet Sous
            </p>
```

- [ ] **Step 5: Verify no `font-serif`/`--font-fraunces`/`Fraunces` references remain**

Run: `grep -rn "font-serif\|font-fraunces\|Fraunces" src`
Expected: no output.

- [ ] **Step 6: Build and verify**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run build` — expect success.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/editorial-header.tsx "src/app/(editorial)/page.tsx"
git commit -m "Replace Fraunces with Fredoka headlines and Capriola wordmarks"
```

(If Step 3's grep surfaces additional files beyond what's listed above, include those in this same commit — this task isn't complete until zero `font-serif` references remain anywhere in `src`.)

---

### Task 3: Shape — pill-shaped buttons/tags, modest card rounding

**Files:**
- Modify: `src/app/globals.css:91` (radius token, already touched by Task 1 — this task adds to it)
- Modify: `src/components/ui/button.tsx:7, 25, 26, 30, 32`

- [ ] **Step 1: Set the base radius token**

In `src/app/globals.css`, confirm `--radius: 0.5rem;` (set in Task 1) is changed to:
```css
  --radius: 1.25rem;
```
This becomes the radius for cards/containers (`rounded-lg`/`rounded-xl` utilities, which most container components in this codebase use — `card.tsx`'s `rounded-xl`, `dialog.tsx`'s popup `rounded-xl`). Buttons/tags/badges get pill-shaping via `rounded-full`, handled below — they don't use the `--radius` scale at all once changed.

- [ ] **Step 2: Make the button base and all size-variant overrides pill-shaped**

In `src/components/ui/button.tsx`, line 7, change:
```
"group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```
to (only the `rounded-lg` → `rounded-full` change):
```
"group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
```

Then fix the four size variants that clamp radius with arbitrary-value syntax (these override the base class and would otherwise cap small buttons at 10-12px radius instead of a true pill, since `min(var(--radius-md), 10px)` always resolves to `10px` once `--radius-md` is anything above 10px):

Line 25, change:
```
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
```
to:
```
        xs: "h-6 gap-1 rounded-full px-2 text-xs in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
```

Line 26, change:
```
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
```
to:
```
        sm: "h-7 gap-1 rounded-full px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
```

Line 30, change:
```
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
```
to:
```
        "icon-xs":
          "size-6 rounded-full in-data-[slot=button-group]:rounded-full [&_svg:not([class*='size-'])]:size-3",
```

Line 32, change:
```
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
```
to:
```
        "icon-sm":
          "size-7 rounded-full in-data-[slot=button-group]:rounded-full",
```

- [ ] **Step 3: Pill-shape the two hand-rolled tag/filter-pill spots that don't use the `Button` component**

`src/components/kitchen-recipe-lists.tsx:80` already uses `rounded-full` for the cooked-filter buttons — no change needed there, it's already correct (confirms the pill direction was already anticipated in that one spot).

`src/app/(editorial)/page.tsx` — the two mock chat-bubble `<p>` tags in the "Meet Sous" section (lines 74, 77) currently use `rounded-lg` — these are chat-bubble-shaped content, not buttons/tags/badges per the design spec's shape rule (bubbles are more like small cards), so leave them as `rounded-lg` (now resolving to the new `1.25rem` card radius) — no change here. Do not pill-shape chat message bubbles.

- [ ] **Step 4: Verify no other `rounded-[min(var(--radius-md)` arbitrary-value patterns remain**

Run: `grep -rn "rounded-\[min(var(--radius" src`
Expected: no output.

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run build` — expect success.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/ui/button.tsx
git commit -m "Move to pill-shaped buttons/tags and 1.25rem card radius"
```

---

### Task 4: `DuotoneIcon` wrapper component

**Files:**
- Create: `src/components/duotone-icon.tsx`

- [ ] **Step 1: Create the wrapper**

```tsx
import { FontAwesomeIcon, type FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

/**
 * Wraps FontAwesomeIcon with the app's standard duotone secondary-layer
 * opacity, centralized here instead of repeated at every call site.
 */
export function DuotoneIcon({ style, ...props }: FontAwesomeIconProps) {
  return (
    <FontAwesomeIcon
      style={{ "--fa-secondary-opacity": 0.4, ...style } as React.CSSProperties}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Verify it renders correctly with a real duotone icon (manual check — this repo has no jsdom/component-testing setup, per `vitest.config.ts`'s `environment: "node"`)**

Temporarily use it in one low-risk spot to confirm the two-tone rendering actually shows up visually before rolling it out everywhere in Task 5. In `src/components/recipe-image-fallback.tsx`, change:
```tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";
```
to:
```tsx
import { faImage } from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
```
and change the `<FontAwesomeIcon icon={faImage} .../>` usage (inside the placeholder block) to `<DuotoneIcon icon={faImage} .../>` (same props otherwise).

Run: `npm run dev`, open any recipe with a missing/broken image (or temporarily pass a bad URL) to see the placeholder icon, and visually confirm the icon shows two distinct shades of the same color (a solid part and a ~40%-opacity part), not a single flat-colored icon. If it renders as a single flat color with no visible two-tone effect, STOP — this means `@fortawesome/react-fontawesome` v3.3.0 isn't picking up the `--fa-secondary-opacity` CSS custom property automatically for this icon set, and the wrapper needs a different approach (e.g. explicitly reading `icon.icon[4]` as a 2-element array and rendering two `<path>` elements by hand, or checking whether `@fortawesome/fontawesome-svg-core`'s CSS needs to be imported somewhere — check `src/app/layout.tsx`/`globals.css` for whether Font Awesome's core CSS is imported at all). Report this as a blocker rather than guessing further if the visual check fails.

- [ ] **Step 3: Once visually confirmed, commit this spike**

```bash
git add src/components/duotone-icon.tsx src/components/recipe-image-fallback.tsx
git commit -m "Add DuotoneIcon wrapper, verify duotone rendering via recipe-image-fallback"
```

---

### Task 5: Icon migration — remaining 9 files

**Files:**
- Modify: `src/components/kitchen-recipe-lists.tsx:6, 95, 159, 226`
- Modify: `src/components/editorial-header.tsx:3, 24, 31`
- Modify: `src/components/sign-out-button.tsx:4, 20`
- Modify: `src/components/remove-from-recent-button.tsx:6, 53`
- Modify: `src/components/delete-recipe-button.tsx:6, 53`
- Modify: `src/components/password-input.tsx:5, 31-35`
- Modify: `src/components/star-rating.tsx:3-4, 29-37, 77-81`
- Modify: `src/components/kitchen-favorite-button.tsx:5-6, 40-47`
- Modify: `src/components/cooked-toggle-button.tsx` (find its current `faUtensils` import line via `grep -n "faUtensils" src/components/cooked-toggle-button.tsx` first)

This task covers every remaining Font Awesome icon in the codebase (recipe-image-fallback.tsx was already migrated as the Task 4 spike). All of these follow the same two-part pattern: (1) swap the import source from `@fortawesome/free-solid-svg-icons`/`@fortawesome/free-regular-svg-icons` to `@fortawesome/pro-duotone-svg-icons`, (2) replace `FontAwesomeIcon` with `DuotoneIcon` (import from `@/components/duotone-icon`) at each usage. Do every file in one task since each change is small and mechanical, but verify the build after each file to catch typos early rather than at the very end.

- [ ] **Step 1: `src/components/kitchen-recipe-lists.tsx`** — 2 icons, 3 usages

Line 6, change:
```tsx
import { faChevronDown, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
```
to:
```tsx
import { faChevronDown, faMagnifyingGlass } from "@fortawesome/pro-duotone-svg-icons";
```
Add `import { DuotoneIcon } from "@/components/duotone-icon";` alongside the other imports, and remove the now-unused `FontAwesomeIcon` import if nothing else in the file uses it directly (check — this file has 3 `FontAwesomeIcon` usages, all switching to `DuotoneIcon`, so the `FontAwesomeIcon` import becomes fully unused and must be removed).

Replace all three `<FontAwesomeIcon icon={faMagnifyingGlass} .../>` (line 94) and `<FontAwesomeIcon icon={faChevronDown} .../>` (lines 159, 226) with `<DuotoneIcon icon={faMagnifyingGlass} .../>` / `<DuotoneIcon icon={faChevronDown} .../>` — same props otherwise, unchanged.

- [ ] **Step 2: `src/components/editorial-header.tsx`** — 2 icons (`faHouse`, `faUtensils`), 2 usages

Line 3, change:
```tsx
import { faHouse, faUtensils } from "@fortawesome/free-solid-svg-icons";
```
to:
```tsx
import { faHouse, faUtensils } from "@fortawesome/pro-duotone-svg-icons";
```
Add `import { DuotoneIcon } from "@/components/duotone-icon";`, remove the `FontAwesomeIcon` import (no longer used directly in this file), and replace lines 24 and 31's `<FontAwesomeIcon .../>` with `<DuotoneIcon .../>`, same props.

- [ ] **Step 3: `src/components/sign-out-button.tsx`** — 1 icon, 1 usage

Line 4, change:
```tsx
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
```
to:
```tsx
import { faRightFromBracket } from "@fortawesome/pro-duotone-svg-icons";
```
Add the `DuotoneIcon` import, remove `FontAwesomeIcon`, replace line 20's usage.

- [ ] **Step 4: `src/components/remove-from-recent-button.tsx`** — 1 icon, 1 usage

Line 6, change:
```tsx
import { faXmark } from "@fortawesome/free-solid-svg-icons";
```
to:
```tsx
import { faXmark } from "@fortawesome/pro-duotone-svg-icons";
```
Add the `DuotoneIcon` import, remove `FontAwesomeIcon`, replace line 53's usage.

- [ ] **Step 5: `src/components/delete-recipe-button.tsx`** — 1 icon, 1 usage

Line 6, change:
```tsx
import { faTrash } from "@fortawesome/free-solid-svg-icons";
```
to:
```tsx
import { faTrash } from "@fortawesome/pro-duotone-svg-icons";
```
Add the `DuotoneIcon` import, remove `FontAwesomeIcon`, replace line 53's usage.

- [ ] **Step 6: `src/components/password-input.tsx`** — 2 icons (one shown at a time via ternary), 1 usage site

Line 5, change:
```tsx
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
```
to:
```tsx
import { faEye, faEyeSlash } from "@fortawesome/pro-duotone-svg-icons";
```
Add the `DuotoneIcon` import, remove `FontAwesomeIcon`. Replace lines 31-35:
```tsx
        <FontAwesomeIcon
          icon={visible ? faEyeSlash : faEye}
          className="h-4 w-4"
          aria-hidden
        />
```
with:
```tsx
        <DuotoneIcon
          icon={visible ? faEyeSlash : faEye}
          className="h-4 w-4"
          aria-hidden
        />
```

- [ ] **Step 7: `src/components/cooked-toggle-button.tsx`**

Run `grep -n "faUtensils\|FontAwesomeIcon" src/components/cooked-toggle-button.tsx` first to get the exact current line numbers (this file was last touched in an earlier task in this branch and its exact current line numbers aren't re-verified as part of this plan). Apply the same two-part pattern: swap `faUtensils`'s import source from `free-solid-svg-icons` to `pro-duotone-svg-icons`, swap `FontAwesomeIcon` to `DuotoneIcon`.

- [ ] **Step 8: `src/components/star-rating.tsx`** — single-icon, color-swap-only approach (both `StarRatingDisplay` and `StarRatingInput` use only `faStar`, distinguishing filled/unfilled purely via text-color classes, not two different icons)

Replace lines 3-4:
```tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
```
with:
```tsx
import { faStar } from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
```

Replace the `<FontAwesomeIcon>` at lines 29-37 (inside `StarRatingDisplay`):
```tsx
        <FontAwesomeIcon
          key={n}
          icon={faStar}
          className={cn(
            sizeClass[size],
            n <= value ? "text-primary" : "text-muted-foreground/25",
          )}
          aria-hidden
        />
```
with:
```tsx
        <DuotoneIcon
          key={n}
          icon={faStar}
          className={cn(
            sizeClass[size],
            n <= value ? "text-primary" : "text-muted-foreground/25",
          )}
          aria-hidden
        />
```

Replace the `<FontAwesomeIcon>` at lines 77-81 (inside `StarRatingInput`) the same way:
```tsx
            <DuotoneIcon
              icon={faStar}
              className={cn(sizeClass[size])}
              aria-hidden
            />
```

(No other changes needed — the existing `text-primary`/`text-muted-foreground/*` color-swap logic for filled-vs-unfilled continues to work unchanged; duotone just adds a secondary lighter layer on top of whatever `currentColor` those classes already resolve to.)

- [ ] **Step 9: `src/components/kitchen-favorite-button.tsx`** — two-icon approach (uses distinct `faStarSolid`/`faStarOutline` imports for filled/unfilled, unlike `star-rating.tsx`)

Replace:
```tsx
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";
```
with:
```tsx
import { faStar as faStarSolid } from "@fortawesome/pro-duotone-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/pro-duotone-svg-icons";
```
(Both aliases now resolve to the same underlying duotone `faStar` icon definition — that's fine and intentional: the visual distinction between "favorited" and "not favorited" already comes entirely from the existing `initialFavorite ? "text-amber-500" : "text-muted-foreground"` color-swap, exactly like `star-rating.tsx`. Keeping both import aliases, rather than collapsing to a single `faStar` import, is a deliberate choice to minimize the diff and keep the component's existing `initialFavorite ? faStarSolid : faStarOutline` ternary logic completely unchanged — only the import source changes.)

Replace the `FontAwesomeIcon` import and usage with `DuotoneIcon`, same props otherwise.

- [ ] **Step 10: Verify no Font Awesome free-tier imports remain anywhere**

Run: `grep -rn "free-solid-svg-icons\|free-regular-svg-icons" src`
Expected: no output.

Run: `grep -rln "FontAwesomeIcon" src/components`
Expected: no output (every component should now use `DuotoneIcon` instead — `duotone-icon.tsx` itself importing `FontAwesomeIcon` internally is correct and expected, that's the one legitimate remaining usage).

- [ ] **Step 11: Build and verify**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run build` — expect success.
Run: `npm test` — expect all existing tests still passing (icon changes shouldn't affect any test, but confirm).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Migrate all icons from Font Awesome free-solid/free-regular to Pro Duotone"
```

---

### Task 6: Sous icon mark

**Files:**
- Modify: `src/components/nutrition-panel.tsx:161-169`
- Modify: `src/app/(editorial)/page.tsx:60-62`

- [ ] **Step 1: Add the icon to the `NutritionPanel` trigger button and in-panel header badge**

In `src/components/nutrition-panel.tsx`, add to the imports:
```tsx
import { faHatChef } from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
```

Replace lines 161-169:
```tsx
      <SheetTrigger
        render={<Button size="lg" className="min-h-12 w-full justify-center sm:w-auto" />}
      >
        Cook with Sous
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Chatting with Sous
          </p>
          <SheetTitle>{decodeHtmlEntities(recipeTitle)}</SheetTitle>
        </SheetHeader>
```
with:
```tsx
      <SheetTrigger
        render={<Button size="lg" className="min-h-12 w-full justify-center gap-2 sm:w-auto" />}
      >
        <DuotoneIcon icon={faHatChef} className="h-4 w-4" aria-hidden />
        Cook with Sous
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <DuotoneIcon icon={faHatChef} className="h-3.5 w-3.5" aria-hidden />
            Chatting with Sous
          </p>
          <SheetTitle>{decodeHtmlEntities(recipeTitle)}</SheetTitle>
        </SheetHeader>
```

- [ ] **Step 2: Add the icon to the homepage "Meet Sous" eyebrow label**

In `src/app/(editorial)/page.tsx`, add imports:
```tsx
import { faHatChef } from "@fortawesome/pro-duotone-svg-icons";
import { DuotoneIcon } from "@/components/duotone-icon";
```

Replace (this line was already updated in Task 2 Step 4 to use `font-wordmark` — apply this change on top of that):
```tsx
            <p className="font-wordmark text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Meet Sous
            </p>
```
with:
```tsx
            <p className="font-wordmark flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <DuotoneIcon icon={faHatChef} className="h-3.5 w-3.5" aria-hidden />
              Meet Sous
            </p>
```

- [ ] **Step 3: Build and verify**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run build` — expect success.

- [ ] **Step 4: Commit**

```bash
git add src/components/nutrition-panel.tsx "src/app/(editorial)/page.tsx"
git commit -m "Add Sous icon mark (hat-chef duotone) to every Sous touchpoint"
```

---

### Task 7: Decorative swirl component

**Files:**
- Create: `src/components/decorative-swirl.tsx`
- Modify: `src/app/(editorial)/page.tsx` (hero section, "Meet Sous" section)
- Modify: `src/components/kitchen-recipe-lists.tsx:172-177` (true-empty state only)

- [ ] **Step 1: Create the component**

```tsx
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Thin single-stroke swirl/ellipse line art, used as a low-opacity background
 * accent behind hero sections and empty states. Purely decorative — always
 * `aria-hidden`, absolutely positioned by the caller via `className`.
 */
export function DecorativeSwirl({ className }: Props) {
  return (
    <svg
      viewBox="0 0 180 180"
      className={cn("pointer-events-none text-text-heading/20", className)}
      aria-hidden
    >
      <ellipse
        cx="90"
        cy="90"
        rx="70"
        ry="90"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Add it behind the homepage hero section**

In `src/app/(editorial)/page.tsx`, the hero `<section>` (line 20) needs a positioned ancestor for the absolutely-positioned swirl. Change:
```tsx
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
```
to:
```tsx
      <section className="relative grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <DecorativeSwirl className="pointer-events-none absolute -top-10 right-10 h-44 w-44" />
```
(Add the closing structure is unchanged — this just adds one new self-closing element as the first child of the section, before the existing `<div className="space-y-6">`.)

Add the import: `import { DecorativeSwirl } from "@/components/decorative-swirl";`

- [ ] **Step 3: Add it behind the "Meet Sous" section**

Change:
```tsx
      <section className="mt-20 rounded-2xl border border-border bg-muted/20 px-6 py-10 sm:px-10">
```
to:
```tsx
      <section className="relative mt-20 overflow-hidden rounded-2xl border border-border bg-muted/20 px-6 py-10 sm:px-10">
        <DecorativeSwirl className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56" />
```
(`overflow-hidden` added so the swirl doesn't visually spill outside the card's rounded corners.)

- [ ] **Step 4: Add it behind the Kitchen page's true-empty state (not the filtered-empty state)**

In `src/components/kitchen-recipe-lists.tsx`, the true-empty state is lines 172-177 (`recent.length === 0`), distinct from the filtered-empty state (`"Nothing here for this filter."`, lines 116-118 and 179-181) — only the former gets the decorative treatment, since a "no results for this filter" moment isn't the kind of first-time empty-state design convention this motif is meant for.

Change:
```tsx
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isLoggedIn
              ? "Nothing here yet—import a recipe above."
              : "Sign in to load recipes you've imported."}
          </p>
        ) : filteredRecent.length === 0 ? (
```
to:
```tsx
        {recent.length === 0 ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20 px-6 py-10 text-center">
            <DecorativeSwirl className="pointer-events-none absolute -top-8 left-1/2 h-40 w-40 -translate-x-1/2" />
            <p className="relative text-sm text-muted-foreground">
              {isLoggedIn
                ? "Nothing here yet—import a recipe above."
                : "Sign in to load recipes you've imported."}
            </p>
          </div>
        ) : filteredRecent.length === 0 ? (
```

Add the import: `import { DecorativeSwirl } from "@/components/decorative-swirl";`

- [ ] **Step 5: Build and verify**

Run: `npx tsc --noEmit` — expect 0 errors.
Run: `npm run build` — expect success.

- [ ] **Step 6: Manually confirm in the browser**

Run `npm run dev`, open the homepage and confirm the swirl renders subtly behind the hero and "Meet Sous" section without obscuring text or looking like a rendering bug (it should read as a deliberate, low-opacity background flourish). Open `/kitchen` signed out (or with zero imported recipes) and confirm the same for the empty state.

- [ ] **Step 7: Commit**

```bash
git add src/components/decorative-swirl.tsx "src/app/(editorial)/page.tsx" src/components/kitchen-recipe-lists.tsx
git commit -m "Add decorative swirl motif behind hero sections and empty states"
```

---

### Task 8: Final verification and cleanup

**Files:** none (verification + package.json cleanup only)

- [ ] **Step 1: Full verification sweep**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```
Expected: all four pass with zero errors/failures.

- [ ] **Step 2: Confirm the Pro solid/regular packages are genuinely unused**

Run: `grep -rn "pro-solid-svg-icons\|pro-regular-svg-icons" src`
Expected: no output (nothing in this plan ever imported from these two packages — only `pro-duotone-svg-icons` was used throughout).

If confirmed unused, remove them from the project:
```bash
npm uninstall @fortawesome/pro-solid-svg-icons @fortawesome/pro-regular-svg-icons
```

If anything unexpectedly does import from them, leave them installed and skip this uninstall — don't force a removal that would break a build.

- [ ] **Step 3: Manually confirm the full visual refresh in the browser**

Run `npm run dev` and check, page by page: home (hero + Meet Sous section + swirls + new colors/fonts), a recipe detail page (Sous button with icon, star ratings, favorite button, all icons rendering as duotone), the Kitchen page (cooked/not-cooked filter pills, favorite/cooked/delete/remove icons, empty state with swirl), and the login/signup page (password show/hide icon, button styling). Confirm nothing looks visually broken (missing icons, wrong colors, un-rounded buttons that should be pill-shaped).

- [ ] **Step 4: Commit (only if Step 2 uninstalled packages)**

```bash
git add package.json package-lock.json
git commit -m "Remove unused Font Awesome Pro solid/regular packages"
```

- [ ] **Step 5: Remind the user about the Netlify deploy step**

This plan does not and cannot configure Netlify's build environment — the `.npmrc` Font Awesome Pro auth token that makes `npm install` succeed locally only exists on this machine (it's gitignored, per an earlier change in this branch). Before this branch can deploy successfully, the same Font Awesome Pro npm auth token needs to be added as an environment variable in the Netlify dashboard (Site settings → Environment variables), or Netlify's build-time `npm install` will fail trying to fetch `@fortawesome/pro-duotone-svg-icons`. This is a manual step only the project owner can do — flag it clearly when this plan is reported as complete, don't silently assume it's handled.
