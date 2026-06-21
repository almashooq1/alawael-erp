# Al-Awael — Brand & Design System (single source of truth)

> Created 2026-06-21 from the design-unification workshop. Prevents the
> palette drift that this work fixed (the public landing had diverged to an
> off-brand green/gold scheme while the admin used the official navy/orange).

## 1. The brand (from the official logo)

Three brand colors + warm neutrals + one Arabic typeface. **Never introduce a
fourth brand color.** The canonical token source is
[`alawael-rehab-platform/packages/ui/src/styles/tokens.css`](../../alawael-rehab-platform/packages/ui/src/styles/tokens.css)
(mirrored in `tokens.ts` + `apps/web-admin/tailwind.config.ts`).

| Role              | Name           | Hex (500)           | Use for                                            |
| ----------------- | -------------- | ------------------- | -------------------------------------------------- |
| **Primary**       | Care Navy      | `#1B4A8A`           | Trust, headings, links, primary surfaces, body     |
| **Accent**        | Sunrise Orange | `#F39220`           | CTAs, highlights, milestones, eyebrows, focus ring |
| **Wellness**      | Growth Green   | `#28A648`           | Progress, therapy, success states                  |
| Neutral bg        | Warm Paper     | `#FBF7F1`           | Page background                                    |
| Danger (semantic) | —              | `#C0392B` / `red-*` | Errors, required fields, "before" states           |

- **Type:** `Tajawal` first, `Cairo` fallback. Arabic body ≥16px, line-height ~1.7.
- **Logo:** use the real assets — `public/brand/logo-*.png` (catalogued in
  `packages/ui/src/brand-info.ts` as `brandAssets`) or `/alawael-logo.svg`.
  **Never** the typed letter "ع" as a stand-in.
- **Tagline:** «عناية خاصة بقدرات خاصة».

## 2. Which surface lives where

| Surface                                                   | Repo / path                             | Stack                                   | Notes                                                                          |
| --------------------------------------------------------- | --------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| Public landing + parent auth (`/`, `/login`, `/register`) | `66666/frontend`                        | Vite + React 18 + **Tailwind v4**       | LIVE (served by nginx). Edit `frontend/tailwind.config.js` tokens.             |
| Admin app (`/admin`)                                      | `alawael-rehab-platform/apps/web-admin` | Next.js 15 + Tailwind 3 + `@alawael/ui` | LIVE at `alaweal.org/admin`. Edit `packages/ui` tokens + `tailwind.config.ts`. |

## 3. How the landing re-skin works (so you don't break it)

The landing re-skins **centrally** via `frontend/tailwind.config.js`:
`primary` → navy, `accent` → orange, `green` → growth green. Changing those
tokens re-skins every token-based utility (`bg-primary-600`, `text-accent-500`,
…) across the whole page at once.

⚠️ **Legacy utility names are repointed, not renamed.** These keep their old
names but now render brand colors — do not assume the name implies the color:

| Utility (legacy name)                                     | Actually renders                       |
| --------------------------------------------------------- | -------------------------------------- |
| `text-gradient-green`, `bg-gradient-green`, `.glow-green` | **navy** (primary)                     |
| `text-gradient-gold`, `.badge-gold`                       | **orange** (accent)                    |
| `.btn-primary`                                            | **navy**; `.btn-accent` (new) = orange |

New code should prefer the semantic tokens directly (`primary-*` / `accent-*` /
`green-*`). Avoid hard-coded rainbow literals (`from-blue-500`, `bg-emerald-100`,
`text-amber-800`, …) — they are off-brand. Guard against regressions with:

```bash
cd frontend && grep -rEn "(bg|text|border|ring|shadow|from|via|to)-(emerald|blue|indigo|purple|violet|teal|cyan|rose|pink|fuchsia|lime|amber|yellow|sky)-" src/pages/Landing src/data/landingContent.js
# expect 0 (red-* is allowed as a semantic danger color)
```

## 4. Icons

The landing uses an inline **Heroicons-v2 outline** registry (`icons` map +
`<Icon name="…" />` helper in `LandingPage.jsx`); data carries an `iconKey`.
**No emoji as icons.** Add new concepts to the `icons` map (same
`fill=none viewBox=0 0 24 24 stroke=currentColor strokeWidth=1.5` style); color
is inherited via the parent's `text-*` class.

## 5. Accessibility baseline (this audience needs it)

Skip link + `<main>` landmark · nav `aria-expanded/controls` · honor
`prefers-reduced-motion` (CountUp / typewriter / carousels) · modal focus
management (focus-in + restore + Escape + `role="dialog"`) · tap targets ≥24px ·
visible focus ring (orange) · readable contrast (no thin `text-gray-400` body).

## 6. Open product decision

`alaweal.org/` currently **302 → /admin/dashboard** (the W1415 root redirect),
so the public landing is not shown at the root. If the landing should be the
public face again, the nginx `location = /` redirect must be changed to serve
the Vite app. **This is a product/infra decision — not a code change in this repo.**
