# backend/scripts — what each script does

Grouped by audience so you can skim and find what you need in <30 seconds.

## Ops / cron / SSH-in

Scripts that follow the exit-code contract (0 = clean, 1 = actionable, 2 = error) and are safe to pipe into pagers, alerts, or cron.

| Script             | What it does                                                                   | Root npm proxy                 |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------ |
| `gov-status.js`    | Snapshot of all 10 gov adapters' configured + circuit state                    | `npm run gov:status[:json]`    |
| `cpe-attention.js` | SCFHS CPE compliance digest — lists therapists in the 180-day attention window | `npm run cpe:attention[:json]` |
| `preflight.js`     | Deploy gate — fails if any `*_MODE=live` adapter is missing env vars           | `npm run preflight[:prod]`     |
| `dsar-hash.js`     | Compute the SHA-256 targetHash for a DSAR query on the adapter audit trail     | `npm run dsar:hash -- <id>`    |

All three `:json` variants output machine-readable JSON for downstream tools (Slack bots, alerting stacks, jq pipelines).

**Getting usage:** `--help` / `-h` is implemented on every ops script and exits 0 without touching the network or DB. Invoke the script directly so npm doesn't intercept the flag:

```bash
node backend/scripts/cpe-attention.js --help    # ✓ prints script usage
node backend/scripts/gov-status.js --help       # ✓
node backend/scripts/preflight.js --help        # ✓
node backend/scripts/dsar-hash.js --help        # ✓
# npm run cpe:attention -- --help               # ✗ npm eats --help as its own flag
```

## Deployment / setup

| Script                | What it does                                                         |
| --------------------- | -------------------------------------------------------------------- |
| `dev-setup.js`        | One-shot bootstrap for a fresh clone — installs deps, creates `.env` |
| `setup-database.js`   | Creates the base DB + admin user + essential indexes                 |
| `generate-secrets.js` | Emits a stanza of fresh JWT + encryption secrets for `.env` rotation |

## Seeds

| Script                  | What it does                                                             |
| ----------------------- | ------------------------------------------------------------------------ |
| `seed-all.js`           | Umbrella seeder — runs all registered seeders with `--reset / --dry-run` |
| `seed-demo-showcase.js` | End-to-end demo fixture (branches, employees, CPE records, invoices)     |

## Health + smoke

| Script            | What it does                                                  |
| ----------------- | ------------------------------------------------------------- |
| `smoke-basic.js`  | Quick up/down check — hits `/health` and reports connectivity |
| `smoke-health.js` | Deeper probe including gov-integrations health aggregator     |

## Diagnostics (dev-side)

| Script                   | What it does                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| `check-architecture.js`  | Static audit of layer boundaries (no core→infra imports, etc.)       |
| `check-deps.js`          | Scans for broken `require()` paths across the tree                   |
| `check-services.js`      | Walks `services/` and reports missing `module.exports` or stub files |
| `inspect-routes.js`      | Dumps the live Express route table — useful for "is X mounted?"      |
| `log-viewer.js`          | Tails + filters the structured log file                              |
| `project-stats.js`       | Module counts, LoC by layer, test file counts                        |
| `verify-ddd-platform.js` | Validates the DDD folder structure + boundary rules                  |

## Destructive (use with care)

| Script           | What it does                                                         |
| ---------------- | -------------------------------------------------------------------- |
| `db-backup.js`   | Dumps the current DB state to a timestamped archive                  |
| `db-reset.js`    | **Destructive.** Drops all collections matching the DB-reset pattern |
| `cleanup.js`     | Removes temp files, old logs, orphan seeders — idempotent            |
| `clear-cache.js` | Invalidates the Redis/in-memory cache layer                          |

## Other (utility)

| Script        | What it does                                                         |
| ------------- | -------------------------------------------------------------------- |
| `migrations/` | One-shot data migrations — see each file's header for scope + safety |

---

## Adding a new script

1. Follow the exit-code contract if the script is cron-facing:
   `0 = nothing to do, 1 = actionable, 2 = internal error`.
2. Document the contract in the file header — see `gov-status.js` and
   `cpe-attention.js` for the pattern; the `cpe-attention-script.test.js`
   suite asserts the header mentions exit codes.
3. Add the script to `backend/package.json` + (if ops-facing) a root
   proxy in `package.json` matching the `cd backend && npm run X`
   convention. The `root-proxy-scripts.test.js` drift check enforces
   that every proxy resolves.
4. Update this README so the next operator can find it.
