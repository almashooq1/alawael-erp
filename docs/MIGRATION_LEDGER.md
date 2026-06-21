# Migration Ledger — Al-Awael Platform topology & convergence

> Living document. Records **where each layer of the system actually lives**, the
> strategic decision about how they converge, and the known old↔new overlaps.
> Routing rules derived from this live in the root `CLAUDE.md` "Which repo?" section.
> Last audited: **2026-05-29**.

## 1. The real topology — three layers, not two

A topology audit on 2026-05-29 found the system is **three layers**, which is easy to
mistake for a simple "old backend + new frontend" split:

| #   | Layer                  | Repo / path                             | Stack                           | Status                                                                                                    |
| --- | ---------------------- | --------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **Backend API (live)** | `66666/backend`                         | Express + Mongo (JS)            | **Canonical & live** — 501 route files; serves every web-admin surface via `/api/v1` on port 3001         |
| 2   | **Admin UI (live)**    | `alawael-rehab-platform/apps/web-admin` | Next.js 15 (TS)                 | **Canonical & live** — ~190 dashboard surfaces; runs _on the layer-1 API_ (`NEXT_PUBLIC_API_URL` → 66666) |
| 3   | **V4 micro-services**  | `alawael-rehab-platform/services/*`     | NestJS + Prisma + Postgres (TS) | **FROZEN** — ~5% built; the live UI does **not** consume it                                               |

### Why layer 3 is "frozen, ~5% built"

- `services/core` has **20 modules**; `beneficiary`, `clinical`, `documents`,
  `notifications`, `reports` have **1 module each** (stubs); `crm`, `dashboards`,
  `facilities`, `finance`, `hr`, `integrations`, `procurement`, `quality`,
  `scheduling`, `social`, `transport` are **empty dirs**.
- **No API gateway** exists, and each service defaults to port **3001** — the same
  port the live 66666 backend uses. They cannot all serve `/api/v1/*` to web-admin.
- web-admin has ~50+ per-domain API clients (`apps/web-admin/src/lib/*-api.ts`), all
  hitting `/api/v1/...` on the single `NEXT_PUBLIC_API_URL`. With ~190 surfaces and
  only ~21 real V4 modules, the live UI is overwhelmingly served by **layer 1 (66666)**.

## 2. Strategic decision (2026-05-29)

**Consolidate on the live product (web-admin + 66666). Freeze the V4 micro-services skeleton.**

Rationale:

- The live product works, is mature, and is actively used. The V4 backend is a ~5%
  skeleton with no gateway and a port collision; **the UI never reaches it.**
- Finishing V4 means rewriting battle-tested logic (Saudi gov integrations, governance,
  MFA, hash-chain, 501 routes) into NestJS — months/years of work for **no near-term
  user value**, while doubling the maintenance surface.
- A TS frontend (web-admin) talking to a separate JS backend API (66666) is a normal,
  professional architecture. A half-built parallel backend is not.

**We do NOT physically merge the two repos** — different stacks, a public↔private
boundary (`alawael-erp` public, `alawael-rehab-platform` private), and near-zero shared
code mean a merge buys all of a monorepo's cost and none of its benefit. We unify the
_direction_, not the files.

Revisit this decision only if a deliberate, **gateway-fronted, domain-by-domain backend
cutover is explicitly funded** (each migrated domain wired to web-admin on migration —
never building V4 code that nothing consumes).

## 3. Where work goes (quick reference)

| Work                                                           | Goes in                                 |
| -------------------------------------------------------------- | --------------------------------------- |
| New / changed backend API (endpoints, models, services, crons) | `66666/backend`                         |
| New admin / dashboard UI                                       | `alawael-rehab-platform/apps/web-admin` |
| Shared TS UI / auth / i18n / validators                        | `alawael-rehab-platform/packages/*`     |
| Docs / ADRs / this ledger                                      | `66666/docs`                            |
| Bug fix                                                        | repo that owns the file                 |
| New domain in V4 `services/*`                                  | **don't** (frozen)                      |

Full decision table: root `CLAUDE.md` → "Which repo? — routing doctrine".

## 4. Known old↔new overlaps (anti-duplication watch)

Concepts that exist in BOTH the live 66666 backend and the frozen V4 skeleton. The
**66666 path is authoritative** until/unless a funded cutover changes that.

| Concept        | Live (authoritative)                            | Frozen V4 copy                                    | Note                                                                                                                                    |
| -------------- | ----------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Leave requests | `66666/backend/routes/leave-requests.routes.js` | `services/core/src/hr/leave/*` (built 2026-05-29) | V4 endpoint is **orphaned** — web-admin `/hr/leaves` calls 66666. Kept (harmless, CI-green) as a reference if a cutover is ever funded. |

> When you find another overlap, add a row here rather than silently building a second copy.

## 5. V4 micro-services archival (2026-06)

The frozen V4 NestJS/Prisma skeleton that previously lived under
`alawael-rehab-platform/services/*` has been physically archived to
`_archive/services-v4/` and removed from the active workspace build.

| Aspect            | Detail                                                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**          | 2026-06                                                                                                                                                                                                                                                       |
| **Source**        | `alawael-rehab-platform/services/*`                                                                                                                                                                                                                           |
| **Destination**   | `alawael-rehab-platform/_archive/services-v4/`                                                                                                                                                                                                                |
| **What moved**    | `services/core` (~134 files), `services/beneficiary`, `services/clinical`, `services/documents`, `services/notifications`, `services/reports`, and the remaining empty-domain stubs.                                                                          |
| **Rationale**     | The live UI never consumed these services; they defaulted to port 3001 and collided with the live 66666 backend. Keeping them in the active workspace added build time, dependency noise, and the recurring trap of building backend code that nothing calls. |
| **Verification**  | `pnpm-workspace.yaml` no longer includes `services/*`; `git status` shows the source directories deleted and `_archive/` created. The live build (`pnpm run typecheck`) passes across the remaining 15 packages.                                              |
| **Reversibility** | Full contents are preserved in `_archive/services-v4/`; restoring a service is a directory move + workspace re-add.                                                                                                                                           |

### Impact on this ledger

- The "frozen" status in §2 is upgraded to **archived**: the code is retained for
  reference, but it is no longer part of the daily workspace or build.
- The routing rule in §3 is unchanged: new backend work still goes to
  `66666/backend`.

## 6. What is settled vs open

- ✅ **Frontend convergence** — `web-admin` is the single go-forward UI; 66666's legacy
  React frontend is dead (maintenance only, do not extend).
- ✅ **Backend home** — `66666/backend` is the canonical live API; new backend work goes here.
- ✅ **Repo structure** — stay two repos; do not merge.
- ✅ **V4 micro-services** — archived under `_archive/services-v4/`; retained for reference
  but no longer built.
- ⏸️ **V4 resurrection** — only if a deliberate, gateway-fronted, domain-by-domain cutover
  is explicitly funded.
- ❓ **Public/private** — `alawael-erp` is public, `alawael-rehab-platform` is private. A
  hard blocker to any physical merge; unchanged by this decision.
