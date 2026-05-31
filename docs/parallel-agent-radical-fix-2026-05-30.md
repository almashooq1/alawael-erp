# Radical fix for the push / deploy / parallel-agent pain — 2026-05-30

This package eliminates the recurring causes of broken pushes and stalled
deploys observed across the 2026-05-29/30 session. **Four targeted changes**
on a single branch (`chore/workflow-radical-fix-2026-05-30`):

| #   | Change                                     | What it eliminates                                                                 |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| ①   | `scripts/agent-worktree.sh` (new)          | Two-agents-on-one-tree races (catalog corruption, commit absorption, branch chaos) |
| ②   | `.husky/pre-push` — drop heavy gate        | 13-min push wait + the `cannot lock ref HEAD` race window                          |
| ③   | `deploy-hostinger.yml` — seed measures too | Engine staying dormant on production (the W553–W567 chain)                         |
| ④   | GitHub branch protection (this doc)        | `git push origin main` of red/unreviewed work                                      |

---

## ① Per-agent git worktree (the structural fix)

The root cause of every "cross-agent" incident this session was **two coding
sessions sharing the same working tree + git index**. The doctrine going
forward:

> **One active session = one worktree = one branch.** Integration is via PR
> to `main`. Sessions never share an index.

Start a session:

```bash
scripts/agent-worktree.sh measures-pdf
# → creates ../alawael-agent-measures-pdf/ on branch agent/measures-pdf-YYYY-MM-DD
cd ../alawael-agent-measures-pdf      # then launch Claude HERE
```

Run a second session in parallel — fully isolated:

```bash
scripts/agent-worktree.sh security-audit
# → ../alawael-agent-security-audit/ on a separate branch
```

Finish a session:

```bash
git push -u origin <branch>           # then open PR against main
scripts/agent-worktree.sh --prune measures-pdf   # remove the worktree
```

List + housekeeping:

```bash
scripts/agent-worktree.sh --list
git worktree prune                    # remove stale .git/worktree refs
```

**Why this works**: each worktree has its own `.git/worktrees/<slug>/index`.
Concurrent `git add`/`git commit` from two worktrees CANNOT race the same
index — git physically partitions them. The 3 destructive incidents this
session (catalog corruption, W568 absorption, today's duplicate-and-revert
of caregiver endpoints) all required a shared index. With this script, none
of them are possible.

---

## ② Pre-push gate: keep fast, move heavy to CI

`.husky/pre-push` previously ran `npm run quality:push`
(`test:guard + test:domains + test:phase2`) — ~10–13 min on a fast machine,
slower in a busy worktree. This had two costs:

1. **Push felt punitive.** Devs avoided pushing, hoarded WIP locally, and
   then took the absorption risk on big multi-commit pushes.
2. **It widened the ref-lock window.** While the heavy gate ran, a parallel
   session could land a commit; the second `git push` then failed with
   `fatal: cannot lock ref HEAD` mid-flight (observed twice this session).

The fix keeps the **six fast static drift guards** (sprint-paths,
routes-load, gitignored-sources, hook-style, wave-collision, route-shadowing
— total <15 s) and the three frontend `--max-warnings=0` lints. The heavy
test suite is already enforced by the **CI Pipeline + Sprint Tests jobs**
that run on every push to main; running it twice (locally + CI) just makes
pushes slow without catching anything new.

Need to run it locally before a big change anyway?

```bash
RUN_HEAVY_GATE=1 git push        # opts back in to the old behaviour
# or run it directly:
cd backend && npm run quality:push
```

---

## ③ Auto-deploy: enable the existing workflow

`deploy-hostinger.yml` was already a complete CD pipeline (rsync → pm2
restart → nginx reload → health check → smoke probes). It was idle for one
reason only — **the required secrets had never been configured**. The
pre-flight step fails out with a clear "❌ Missing: VPS_HOST / VPS_USER /
VPS_SSH_KEY" message; if you've never seen that error, you've never seen
the workflow run.

### One-time GitHub setup (~2 min)

1. Repo → **Settings** → **Environments** → **New environment** → name it
   exactly `VPS_HOST` (note: the workflow reads `${{ secrets.VPS_HOST }}` —
   but the environment **name** is also `VPS_HOST` in the existing setup,
   confirmed in `deploy-hostinger.yml` line ~261).
2. Inside that environment, add three secrets:
   - `VPS_HOST` → `alaweal.org`
   - `VPS_USER` → `root`
   - `VPS_SSH_KEY` → contents of `~/.ssh-alaweal/alaweal_root_ed25519`
     (entire file including BEGIN/END lines).
3. (Recommended) Set **Required reviewers** for the `production`
   environment so a human approves prod deploys.

That's it. The next push to `main` (excluding `**.md`, `docs/**`,
`.github/**`) will:

1. Run the canonical sprint gate (test:guard + test:sprint, ~13 min).
2. Build the frontend.
3. rsync backend + frontend to the VPS.
4. Restart pm2 (as `alawael`, not root — pm2 daemon is per-user).
5. **Apply idempotent seeds** — now includes `seed-measures-catalog.js`
   (the W553–W567 digital-assessment engine activation, previously had
   to be SSH'd manually).
6. Health-check + run post-deploy smoke probes.

Bundled Noto Naskh Arabic font (`backend/assets/fonts/`) ships with the
backend rsync automatically — so PDF Arabic renders correctly on prod
without a manual font copy.

### Manual dispatch (when needed)

GitHub → Actions → "🚀 Deploy to Production" → Run workflow → type
`deploy` in the confirm field. Useful for retrying or backend-only /
frontend-only redeploys.

---

## ④ Branch protection on `main` (the safety net)

The memory note `project_ci_green_dependabot_policy_2026-05-29` already
documents the missing piece: **"main has NO branch protection → never
blind-merge red PRs"**. Codifying the protection in GitHub closes it.

Repo → **Settings** → **Branches** → **Add branch protection rule** for
`main`:

- ✅ **Require a pull request before merging** (= no direct push to main).
- ✅ **Require approvals** (1 reviewer minimum).
- ✅ **Require status checks to pass before merging** → select:
  - `🧪 Sprint Tests`
  - `CI Pipeline` (or whichever name `ci.yml` uses)
  - `pr-checks`
- ✅ **Require branches to be up to date before merging** (catches
  drifted main).
- ✅ **Require conversation resolution before merging**.
- ❌ Do NOT allow **bypass** for any actor (including admins) without
  intent — the whole point is the gate cannot be skipped.
- ✅ **Restrict pushes that create matching branches** if you want only
  CI to advance main.

After this is set:

- Every change reaches `main` via PR + green CI → no surprise red main.
- The auto-deploy in ③ only fires for verified PR merges → no surprise
  prod regressions.
- The per-agent worktree in ① integrates naturally — each session's
  branch goes through the PR/CI gate before it touches main.

---

## How it all fits together

```
┌──────────────────────────────────────────────────────────────┐
│  Agent A worktree              Agent B worktree              │
│  branch: agent/X-2026-05-30    branch: agent/Y-2026-05-30    │
│  (its own .git/worktrees/X/    (its own .git/worktrees/Y/    │
│   index — no race possible)     index — no race possible)    │
└──────────────────────┬──────────────────────┬────────────────┘
                       │ PR + green CI        │ PR + green CI
                       ▼                      ▼
                  ┌────────────────────────────────┐
                  │  main (branch-protected ④)     │
                  │  fast pre-push only (②)        │
                  └────────────────┬───────────────┘
                                   │ push event
                                   ▼
                  ┌────────────────────────────────┐
                  │  deploy-hostinger.yml (③)      │
                  │  test → build → rsync → pm2 →  │
                  │  seed (incl. measures) →       │
                  │  health → smoke                │
                  └────────────────┬───────────────┘
                                   ▼
                              alaweal.org
```

Each leg is one of the four changes. None of them required new
infrastructure — the workflow + the worktree machinery were already
present; the fix is to **use them as designed**.

---

## Rollback / overrides

- **②**: `RUN_HEAVY_GATE=1 git push` to opt back into the old slow gate.
- **③**: GitHub → Actions → "🚀 Deploy to Production" → toggle
  `skip_tests=true` on manual dispatch in true emergencies (logged).
- **①**: nothing to roll back — the script is purely additive; existing
  single-tree workflows continue to work.
- **④**: branch-protection toggles are admin-reversible in the GitHub UI.
