# Visible — Design System

> The design system for the **Visible** Next.js app (the `academia/` codebase).
> Direction: **light editorial, Supabase-inspired — _borders, not shadows_** on a
> warm **cream** substrate with a single **teal** brand accent.
>
> Source of truth: `src/app/globals.css` (`@theme` + `:root`) and the shadcn/Base-UI
> components in `src/components/ui/`. This file documents them — if they ever
> disagree, the code wins.

---

## 1. Principles

1. **Semantic tokens only.** Components read `--background` / `--foreground` /
   `--card` / `--primary` / `--border` … so the whole app re-skins from one
   `:root` block. Never hardcode `bg-neutral-*`, `text-gray-*`, or hex values
   in components.
2. **Light only.** Dark mode was removed. `<html>` carries no `dark` class; any
   `dark:*` utility left in a component is inert. (The `@custom-variant dark`
   declaration is kept only so shadcn primitives compile.)
3. **Borders, not shadows.** Hierarchy comes from border weight + the
   cream/white alternation, not elevation. Shadows are reserved for genuinely
   floating UI (dialogs, popovers) and the one `inset` hairline on primary buttons.
4. **One accent.** Grays are neutral (zero chroma) so the teal is the only color
   that reads as "brand." Don't introduce second accent colors.
5. **Mobile-first.** Base styles target ~360 px; scale up with `sm:` / `md:` /
   `lg:`. Ultra-light for 3G (no sans webfont — system stack).
6. **System fonts in the app, serif only on the landing.** See §3.

---

## 2. Color tokens

All colors are **OKLCH** (`oklch(L C H)` or `oklch(L C H / A)`), defined in
`:root` in `globals.css`. Hex values are **approximate** (for design tools only;
the OKLCH is authoritative).

### Surfaces & text

| Token | OKLCH | Hex ≈ | Use |
|---|---|---|---|
| `--background` | `0.98 0.004 80` | `#F8F5EF` | Page background (warm cream) |
| `--foreground` | `0.18 0 0` | `#1E1E1E` | Primary text (neutral near-black ink) |
| `--card` | `1 0 0` | `#FFFFFF` | Cards, popovers (pure white) |
| `--card-foreground` | `0.18 0 0` | `#1E1E1E` | Text on cards |
| `--popover` / `--popover-foreground` | `1 0 0` / `0.18 0 0` | `#FFFFFF` / `#1E1E1E` | Floating surfaces |
| `--secondary` | `0.96 0.006 80` | `#F2EDE2` | Alt sections, footer, secondary fills |
| `--secondary-foreground` | `0.30 0 0` | `#474747` | Text on secondary |
| `--muted` | `0.94 0.005 80` | `#EDE8DD` | Subtle fills, hover bg |
| `--muted-foreground` | `0.45 0 0` | `#6E6E6E` | Body/caption text (AA on cream) |
| `--accent` | `0.94 0.005 80` | `#EDE8DD` | Active nav / hover surface |
| `--accent-foreground` | `0.30 0 0` | `#474747` | Text on accent |

### Brand & semantic

| Token | OKLCH | Hex ≈ | Use |
|---|---|---|---|
| `--primary` | `0.50 0.10 175` | `#1A6C60` | **Brand teal** — CTAs, accents, active nav, links |
| `--primary-foreground` | `1 0 0` | `#FFFFFF` | Text/icon on teal |
| `--destructive` | `0.55 0.22 25` | `#D93D34` | Errors, danger |
| `--border` | `0 0 0 / 10%` | `rgba(0,0,0,.10)` | Hairline borders, dividers |
| `--input` | `0 0 0 / 14%` | `rgba(0,0,0,.14)` | Form field borders (a touch stronger) |
| `--ring` | `0.50 0.10 175 / 50%` | teal 50% | Focus ring |

### Charts

| Token | OKLCH | Hex ≈ |
|---|---|---|
| `--chart-1` | `0.50 0.10 175` | `#1A6C60` (teal, leads) |
| `--chart-2` | `0.55 0.11 220` | `#3E7CC4` (blue) |
| `--chart-3` | `0.62 0.14 45` | `#C9712E` (orange) |
| `--chart-4` | `0.52 0.13 290` | `#7C5BC4` (purple) |
| `--chart-5` | `0.58 0.16 12` | `#D14B5A` (red-pink) |

### Sidebar (app shell)

| Token | OKLCH | Notes |
|---|---|---|
| `--sidebar` | `1 0 0` | White surface on the cream page |
| `--sidebar-foreground` | `0.30 0 0` | Nav text |
| `--sidebar-primary` / `-foreground` | `0.50 0.10 175` / `1 0 0` | Teal active state |
| `--sidebar-accent` / `-foreground` | `0.94 0.005 80` / `0.25 0.03 175` | Hover/active fill |
| `--sidebar-border` | `0 0 0 / 8%` | Slightly lighter than `--border` |
| `--sidebar-ring` | `0.50 0.10 175 / 50%` | Focus |

### Brand asset colors (native, in the SVGs)

| | Hex |
|---|---|
| Wordmark "V" | `#1a6c60` (teal) |
| Wordmark "ISIBLE" | `#0a2621` (dark ink-green) |
| Favicon square bg | `#13453e` (forest) |
| Favicon mark | `#ffffff` |

### Status palette (outside the brand)

Status chips and category covers use **Tailwind's default named colors directly**
(`bg-amber-100 text-amber-700`, `bg-blue-100 text-blue-700`, …) — no overrides,
because the default `-100 bg / -700 text` pairings are already tuned for light
backgrounds. Meanings: **amber** = warning/pending · **red** = error · **blue** =
info · **green** = success · **purple** = admin.

The only kept override: the six course-card thumbnail gradients are nudged one
step richer so they don't wash out on white —
`.from-{orange|blue|emerald|pink|amber|sky}-100 { --tw-gradient-from: oklch(~0.90 …) }`.

---

## 3. Typography

```css
--font-sans:  -apple-system, BlinkMacSystemFont, "SF Pro Display",
              "SF Pro Text", "Helvetica Neue", "Segoe UI",
              system-ui, sans-serif;
--font-mono:  ui-monospace, "SF Mono", SFMono-Regular,
              "Menlo", "Monaco", "Consolas", monospace;
--font-serif: "EB Garamond", "Adobe Garamond Pro", Garamond,
              "Hoefler Text", "Iowan Old Style", Georgia,
              "Times New Roman", serif;
```

- **Sans = native system stack** (SF on Apple, Roboto/Segoe elsewhere). No
  webfont download for the app shell — lighter on 3G, native to the
  Apple-heavy designer audience. Declared in `@theme`; **not** `next/font`.
- **Mono = SF Mono / system mono.** Used for metadata: preheaders, prices,
  durations, counts, stat numbers. Tabular figures are on globally for
  `[data-slot="badge"]`, `<time>`, and `.tabular-nums`.
- **Serif = italic EB Garamond — LANDING ONLY.** Editorial accent on `<em>`,
  scoped by CSS so it never ships with the product UI:
  ```css
  [data-landing] em {
    font-family: var(--font-eb-garamond), var(--font-serif);
    font-style: italic; font-weight: 400; color: var(--foreground);
  }
  ```
  The face is loaded via `next/font` **in the server `layout.tsx`** (never a
  client component — see §10) and only downloads where an `<em>` under
  `[data-landing]` uses it.

### Weights & tracking
- Two weights do the work: **400** (regular) and **500/600** (medium/semibold).
- Headings `h1–h4`: `letter-spacing: -0.022em` (set globally).
- Headings on the landing use `font-semibold` (600); body is `font-normal` (400).

### Practical scale (as used on the landing)

| Role | Classes |
|---|---|
| Hero H1 | `text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05]` |
| Section H2 | `text-3xl sm:text-4xl font-semibold tracking-tight` |
| Card H3 | `text-base–text-lg font-semibold` |
| Body | `text-base leading-relaxed text-muted-foreground` |
| Big stat / price | `font-mono text-5xl sm:text-6xl font-semibold` |
| **Mono preheader** | `font-mono text-[11px] uppercase tracking-[0.18em–0.22em] text-muted-foreground` |

**Sentence case** everywhere. The mono preheader is the one ALL-CAPS exception,
rendered as `/ LABEL` (slash + label) via the `Eyebrow` component.

---

## 4. Spacing, radii, layout

```css
--radius: 0.5rem;   /* 8px base */
```

| Token | Multiplier | ≈ px | Typical use |
|---|---|---|---|
| `--radius-sm` | ×0.6 | ~5px | tiny chips |
| `--radius-md` | ×0.8 | ~6px | inputs, small buttons |
| `--radius-lg` | ×1.0 | 8px | buttons (`rounded-lg`) |
| `--radius-xl` | ×1.4 | ~11px | — |
| `--radius-2xl` | ×1.8 | ~14px | cards (`rounded-2xl`) |
| `--radius-3xl` | ×2.2 | ~18px | premium panels (offer, final CTA) |
| `--radius-4xl` | ×2.6 | ~21px | — |

- **Spacing scale:** Tailwind defaults — `gap-2`(8) `gap-3`(12) `gap-4`(16)
  `gap-6`(24) `gap-10`(40); section vertical rhythm `py-16 sm:py-24`
  (`py-20 sm:py-28` for hero/final).
- **Containers:** prose/text `max-w-2xl`/`max-w-3xl`; grids `max-w-4xl`/`max-w-5xl`;
  app content `max-w-6xl`. Horizontal gutter `px-5` (mobile) → `sm:px-6`.
- Mobile-first: single column on phones, `sm:`/`md:`/`lg:` grids above.

---

## 5. Surfaces & elevation

**Borders, not shadows.** Three working tiers:

| Tier | Recipe |
|---|---|
| Page | `bg-background` (cream) |
| Card / panel | `bg-card` (white) + `border border-border` — **no shadow** |
| Subtle band | `bg-muted/30` or `bg-secondary` between white sections |
| Premium panel | `bg-primary` (teal, white text) or `bg-primary/[0.04]` tinted card |
| Dark band | `bg-foreground text-background` (self-inverting: near-black + cream) |

- **Hover:** `hover:-translate-y-1` (2px lift) + `hover:border-primary/40`. A
  soft teal glow is allowed on the landing only:
  `hover:shadow-[0_0_40px_-12px_oklch(var(--primary)/0.25)]`.
- Real shadows only on floating UI: dialogs (`shadow-2xl`), popovers, the
  primary button's `shadow-[inset_0_-1px_0_0_rgb(0_0_0/15%)]` hairline.

---

## 6. Components

### Button — `src/components/ui/button.tsx`
Base: `rounded-lg border border-transparent text-sm font-medium`, focus ring
`ring-2 ring-ring/50`.

| Variant | Look |
|---|---|
| `default` | Teal fill + white text + inset hairline (primary CTA) |
| `outline` | White card + `border-border/80`, hover `bg-muted` |
| `secondary` | `bg-secondary` fill |
| `subtle` | `bg-muted/60` — between ghost and outline |
| `ghost` | No chrome, hover `bg-muted` |
| `destructive` | `bg-destructive/10 text-destructive` (muted, not loud red) |
| `link` | Teal text, underline on hover |

Sizes: `xs` (h-6) · `sm` (h-7) · `default` (h-8) · `lg` (h-9) · `icon` / `icon-xs` /
`icon-sm` / `icon-lg`. Render as a link with the Base-UI pattern:
`<Button render={<a href="…" />}>`.

### Badge — `src/components/ui/badge.tsx`
Base: `h-5 rounded-md px-2 text-xs font-medium`.
Variants: `default` (secondary fill) · `primary` (teal) · `secondary` (muted) ·
`destructive` · `outline` · `ghost` · `link` · `pill` (rounded-full chip) ·
`mono` (monospace, outlined-only — for prices/IDs/versions).

### Other UI primitives (`src/components/ui/`)
shadcn-for-Base-UI: `dialog`, `popover`, `sheet`, `card`, `input`, `tabs`, etc.
Dialogs/sheets use a `bg-black/50` scrim (theme-independent) + `bg-popover` content.

---

## 7. Animations & micro-interactions

Tuned subtle; all respect `prefers-reduced-motion`.

| Pattern | Implementation |
|---|---|
| **Fade-up reveal** | `opacity-0 translate-y-6` → `opacity-100 translate-y-0`, `transition-all duration-700 ease-out`, fired by an IntersectionObserver (`useFadeUp`). |
| **Stagger** | inline `transition-delay` 60–120 ms between siblings |
| **Hover lift** | `-translate-y-1` + border-color shift (+ optional teal glow on landing) |
| **Glow pulse** | `@keyframes visible-glow-pulse` (5s, opacity 1 → 0.65) on hero/CTA backdrops |
| **Scroll progress** | fixed 2px top bar, width set imperatively per scroll tick |
| **Nav underline** | `after:` pseudo-element, `scale-x-0 → scale-x-100` on hover |
| **CountUp** | numbers animate 0 → value, locale-formatted (`fr-FR`) |

---

## 8. Conventions — do / don't

**Do**
- Use semantic tokens: `bg-card` / `bg-background` / `bg-muted` / `text-foreground`
  / `text-muted-foreground` / `text-primary` / `border-border`.
- Teal button: `bg-primary text-primary-foreground`.
- Dark high-contrast chip/button: `bg-foreground text-background` (self-inverting).
- Completion/success: `text-primary` + `bg-primary/10 ring-1 ring-primary/15`.
- Active nav: `bg-accent text-accent-foreground` (sidebar) or
  `bg-primary text-primary-foreground` (mobile pill tabs).

**Don't**
- ❌ `text-white` on a token surface — cards are pure white → white-on-white.
  `text-white` is allowed **only** on genuinely colored/dark surfaces (image
  overlays `bg-black/40-50`, banners `bg-red-600`/`bg-amber-500`, the `bg-black`
  video player).
- ❌ hardcoded `bg-neutral-*` / `text-gray-*` / hex in components.
- ❌ serif / `<em>` styling inside the web app (serif is landing-only).
- ❌ real drop shadows for static hierarchy (use borders).

---

## 9. Landing-specific patterns

The marketing landing (`src/components/landing/landing-page.tsx`, rendered at `/`
for signed-out visitors) is a long-form FR sales letter. Its root carries
`data-landing` (which unlocks the serif `<em>` rule). Reusable pieces:

| Piece | What it is |
|---|---|
| `Eyebrow` | `/ LABEL` mono preheader above every section |
| `Reveal` | fade-up wrapper (`useFadeUp`), optional `delay` |
| `BrandSeal` | faint decorative watermark — concentric rings + dotted ring + curved tagline + the Visible mark; `aria-hidden`, `pointer-events-none`, ~4–5% opacity, behind content. Per-instance `useId` for unique curved-text path ids. |
| `HeroBackdrop` | dot-grid + slow teal glow on hero/final-CTA |
| `PaymentChooser` | Base-UI `Dialog` with two payment cards (Chariow / Stripe) |
| `CtaButton` | primary CTA; all of them scroll to the price section (`#tarif`) |
| Sticky mobile CTA | fixed bottom bar, appears past the hero (mobile only) |
| Spend-vs-receive ledger | the "Le calcul" two-column ROI card |

**Decorative-background rule:** any watermark/backdrop must be `aria-hidden`,
`pointer-events-none`, and sit behind a `relative` content wrapper.

---

## 10. Tech stack & gotchas

- **Next.js 16 (App Router, Turbopack)**, **Tailwind CSS v4** (`@theme inline`),
  **Base UI + shadcn** components, **lucide-react** icons.
- **Tailwind v4:** tokens live in `@theme inline` in `globals.css`; each
  `--color-*` maps a CSS var to a utility. No `tailwind.config.js` color block.
- **`next/font` → server layout ONLY.** Calling a `next/font` loader from a
  `"use client"` module compiles to a READY build but its `.variable` is
  **undefined at runtime** under Turbopack → the first render that reads it
  throws. Load all fonts in `src/app/layout.tsx` (a Server Component) and expose
  the CSS var on `<html>`.
- **`next/image` for content photos** (`fill` + `sizes` + `object-cover` inside a
  `relative` aspect container) — optimized output matters for the 3G audience.
  Plain `<img>` is used only for inline SVG logos.
- **A green build ≠ a working page.** Client-side throws don't appear in Vercel
  server logs; verify the rendered page, not just the build state.

---

## 11. Assets

| File | Format | Notes |
|---|---|---|
| `public/logo.svg` | SVG wordmark | "Visible" — `#1a6c60` + `#0a2621` |
| `public/symbol.svg` | SVG | favicon mark — forest `#13453e` square + white mark |
| `public/alex.jpg` | JPG 776×1000 | founder photo (podcast) |
| `public/illustrations/*.svg` | SVG | empty-states / error art (via `Illustration`) |

Available in `academia-workshop/` (not yet wired): `alex-prof.jpg` (studio),
`chariow.png`, `stripe.png` (official payment logos).

---

*Generated from the live code (`globals.css`, `ui/button.tsx`, `ui/badge.tsx`)
on 2026-06-16. Update alongside token changes.*
