# MUI 5 → 9 migration playbook

**Status:** ✅ DONE 2026-05-13 — `@mui/material@^9.0.0` + `@mui/icons-material@^9.0.0` live in main.
**Why this doc still exists:** Reference for the next time someone needs to step a MUI codebase through a multi-major jump. The pitfalls and verification recipe below are still accurate.

## How it actually landed (vs the 2026-05-12 plan)

The playbook expected a 20-25 hour multi-session migration. Reality was
much smaller because MUI v6/v7/v8 keep deprecated APIs working
(warnings, not removals) for one major past their introduction. So the
codebase compiled clean against each major without applying any
codemod — just version bumps:

- `618190fe` feat(frontend): bump @mui/material + @mui/icons-material 5 → 6
- `f64acee1` feat(frontend): bump @mui 6 → 7
- `42657302` feat(frontend): bump @mui 7 → 9 + fix 9 removed icon names + 1 a11y guard

The only manual fix was at the v7 → v9 jump (skipped v8): MUI 9 removed
the bare `*Outline` filled-variant icon exports, so 9 import names had to be
renamed to `*OutlineOutlined`/`*OutlineRounded` equivalents.

The v6 codemod attempt that originally motivated this playbook (2729
transforms with the buggy `list-item-button-prop` rewrite) was NOT
needed — `<ListItem button>` still works as a deprecated prop through
v9 with console warnings only.

## The current state (post-migration)

- `frontend/` is on:
  - `@mui/material@^9.0.0`
  - `@mui/icons-material@^9.0.0`
  - `@emotion/{cache,react,styled}@^11.11.0`
- Dependabot PR `#11` (the original v5 → v9 proposal) was closed during
  the dependabot triage session (2026-05-12 entry).

## What was tried + what failed

`npx @mui/codemod@latest v6.0.0/all frontend/src`:

- Reported 2729 transforms applied across ~220 files, 0 errors.
- Vite build then failed at link time with:

  > Unexpected closing "ListItem" tag does not match opening "ListItemButton" tag

  Root cause: the `list-item-button-prop` codemod converts the OPENING
  tag (`<ListItem button>` → `<ListItemButton>`) but doesn't always
  rewrite the matching closing tag when the opening spans multiple
  lines or has comments between the attribute and the closer. **20+
  files were affected.**

- The transformation was reverted via `git checkout -- frontend/`. Build
  was re-verified on MUI 5: ✓ built in 46.97s.

## Surface area

```
@mui/icons-material imports : 927 across 125 files
ListItem button usages       : ~70  (codemod target — known buggy)
Grid item usages             : substantial (Grid v2 in v6+ removes `item`+`xs`/`sm`/etc.)
sx prop usages               : ubiquitous (mostly safe; minor behavior changes in v7+)
styled() callsites           : ~40
Theme.spacing / Theme.palette: many (some renames in v6+)
```

## Recommended path (one major at a time)

The MUI team explicitly recommends stepping major-by-major. Each step
needs:

1. Bump only the two MUI packages + run codemod for that step
2. Fix the codemod's mechanical gaps by hand (e.g. unbalanced ListItem)
3. `npm run build` (Vite) must pass
4. `npm test` must pass
5. **Visual QA pass on the affected pages** — codemods are mechanical;
   they don't catch subtle layout shifts
6. Deploy to staging if available, eyeball
7. Merge to main → auto-deploy
8. Only then start the next major

### Step 1 — v5 → v6 (largest jump)

- `npx @mui/codemod@latest v6.0.0/all frontend/src` (or apply each
  sub-codemod individually for finer control: `theme-v6`, `grid-v2-props`,
  `list-item-button-prop`, `system-props`, `styled`, `sx-prop`)
- **Manual fix needed**: after `list-item-button-prop`, search the diff
  for `<ListItem` (opening that doesn't have `Button`) immediately
  followed somewhere later by `</ListItemButton>` (or vice versa).
  ESLint won't catch this — only the Vite/esbuild parser will.
- **Manual review areas**:
  - Every `<Grid item ...>` becomes `<Grid size={{...}}>`. Read the
    surrounding flex layout — Grid v2 has stricter default behavior.
  - `theme.spacing(n)` arithmetic still works but some palette/typography
    tokens renamed.

### Step 2 — v6 → v7

- `npx @mui/codemod@latest v7.0.0/all frontend/src`
- Notable: `<Grid container>` defaults changed, Box props changes.

### Step 3 — v7 → v8

- `npx @mui/codemod@latest v8.0.0/all frontend/src`
- Notable: focus management changes, css-vars-default-on.

### Step 4 — v8 → v9

- `npx @mui/codemod@latest v9.0.0/all frontend/src`
- Notable: requires TypeScript 5 if any TS files; `@types/*` bumps.

### Budget estimate

- Per-step **mechanical** time: 1-2 hours (codemod + fix unbalanced tags + build/tests)
- Per-step **visual QA** time: 3-6 hours (depending on how many pages
  use the affected components)
- Four steps × ~6 hours = **~20-25 hours total**, ideally split across
  3-4 days so each step has time to soak.

## Why not skip straight to v9

- The codemods are designed to be applied **incrementally**. `v9.0.0/all`
  exists but assumes v8 conventions. Running it on v5 code generates a
  larger diff with more mechanical gaps.
- Each major fixes specific patterns; running them in order means each
  pass has fewer files to scan + simpler diffs to review.
- If a step's QA reveals a regression, the rollback surface is one
  major instead of four.

## Things the codemod does NOT handle (manual)

- **Custom theme overrides** — `createTheme({...})` arguments evolved
  through v6 + v7. Search for our `createTheme` callsite + check token
  shape.
- **Direct `@mui/material/styles` imports** — some helpers were renamed
  or moved (e.g. `experimental_*` shed the prefix in v6+).
- **Server-side rendering** — if any pages use the SSR helpers, those
  APIs changed in v6.
- **emotion → vanilla CSS** — MUI v6 added an alternate Pigment CSS
  engine. Not required; keep emotion until a follow-up.
- **Icon import paths** — most names stay, but a handful were renamed
  or removed. The codemod doesn't refactor these. Grep for any v5-only
  icon names (rare).

## Open-ended checks to do AFTER landing each major

- Are there custom MUI X components (DataGrid, DatePickers)? If so,
  bump `@mui/x-*` to the matching major too (separate concern, NOT
  in this PR group).
- Are there third-party libraries that depend on `@mui/material`? Some
  peer-dep declarations break on v6+. Look for warnings in
  `npm install --legacy-peer-deps` output.

## File pointers (where the surface is concentrated)

```
frontend/src/components/Layout/LayoutWithTheme.jsx       — theme provider
frontend/src/pages/whatsapp/WhatsAppDashboard.jsx        — known buggy after codemod
frontend/src/components/messaging/ChatComponent.jsx      — known buggy after codemod
frontend/src/components/communications/EmailPanel.js     — known buggy after codemod
frontend/src/components/communications/MessagingPanel.js — known buggy after codemod
frontend/src/components/dashboard/*                      — heavy MUI use, Grid v2 review
frontend/src/pages/Quality/*                             — recent rewrites, sx-heavy
frontend/src/pages/HQDashboard.jsx                       — 17 icon imports
frontend/src/pages/PremiumHub.jsx                        — 43 icon imports (densest)
```

## When this is done

- Close PR #11 manually with "completed via stepped migration".
- Mark this playbook as **DONE** at the top.
- Update `MEMORY.md` index entry for `project_dependabot_42_merges_2026-05-12.md`
  to flag MUI as resolved.
