# Production Cutover — W801–W810 Facility Maintenance / PPM Ops Hub

Date: 2026-06-03 (W811 ops doc)  
Scope: 10 waves (W801–W810) wiring Phase-16 ops routes, facility-asset → work-order
bridge, maintenance hub, PPM cron, and ops dashboard PPM tiles. One env-gated cron
(`ENABLE_PPM_WO_SWEEPER`) — everything else is live on deploy.

This document is the ops checklist for verifying the maintenance integration chain
in production. Read top-to-bottom; sections follow deployment dependency order.

---

## 0. Pre-flight: what this series fixes

Before W801, `routes/operations/*.routes.js` existed but **were not mounted** in
`mountAllRoutes` — web-admin and API clients calling `/api/v1/ops/*` got **404**.

W801 registers `ops.registry.js` from `_registry.js` and links:

- `MaintenanceWorkOrder` ↔ `facilityAssetId` / `facilityId` (assetId optional on submit)
- `FacilityAsset` single-asset spawn (`POST /facility-asset/:id/spawn-work-order`)
- Ops work-order list/get with populate (W805)

W807–W808 add **maintenance hub** snapshot + bulk spawn + daily PPM sweeper.  
W809–W810 surface PPM KPIs on branch ops dashboard and COO executive board.

**Out of scope:** Next.js web-admin pages for `/ops/maintenance-hub` — API is stable;
legacy/mobile consumers can call REST directly until UI is built.

---

## 1. Mongoose models (auto-register on route load)

| Model                   | Collection               | Notes                                      |
| ----------------------- | ------------------------ | ------------------------------------------ |
| `FacilityAsset`         | `facility_assets`        | W369 catalog; PPM due dates + certificates |
| `MaintenanceWorkOrder`  | `maintenanceworkorders`  | 14-state SLA machine; W801 link fields     |
| `Facility` (operations) | `facilities`             | Inspections; spawn WO from finding (W801)  |

No data migrations required. Indexes created on first use.

---

## 2. HTTP mounts

### 2.1 Ops Control Tower (`ops.registry.js` — W801)

Dual paths: `/api/ops/<module>` **and** `/api/v1/ops/<module>`.

| Module              | Path prefix                    | Wave   |
| ------------------- | ------------------------------ | ------ |
| Work orders         | `/ops/work-orders`             | W801–W805 |
| Facilities          | `/ops/facilities`              | W801   |
| SLA engine          | `/ops/sla`                     | Phase 16 |
| Ops dashboard       | `/ops/dashboard`               | W809–W810 |
| Purchase requests   | `/ops/purchase-requests`       | Phase 16 |
| Meeting governance  | `/ops/meeting-governance`      | Phase 16 |
| Route optimization  | `/ops/route-optimization`      | Phase 16 |
| Notification dispatch | `/ops/notification-dispatch` | Phase 16 |
| **Maintenance hub** | `/ops/maintenance-hub`         | W807–W808 |

### 2.2 Facility asset spawn (W801 + W802)

Mounted via `features.registry.js` (existing W369 surface):

```text
POST /api/v1/facility-asset/:id/spawn-work-order
```

Idempotent when an open WO already exists for the asset.

### 2.3 Maintenance hub endpoints (W807)

| Method | Path                              | Roles (summary)                    |
| ------ | --------------------------------- | ---------------------------------- |
| GET    | `/maintenance-hub/snapshot`       | HUB_READ_ROLES (facility_manager+) |
| POST   | `/maintenance-hub/spawn-due-maintenance` | SPAWN_ROLES (supervisor+)   |

`spawn-due-maintenance` body (optional): `{ limit: 1–50, markInMaintenance: boolean }`.

### 2.4 Ops dashboard PPM sections (W809–W810)

| Board            | Endpoint (existing)              | New payload keys   |
| ---------------- | -------------------------------- | ------------------ |
| Branch dashboard | `GET /ops/dashboard/branch`      | `facilityAssets`   |
| COO executive    | `GET /ops/dashboard/coo`         | `facilityPpm` + `worstBranches` |

---

## 3. Cron activation (W808 — optional, recommended)

Wired in `startup/maintenanceHubBootstrap.js` from `operationsBootstrap.js`.

```bash
ENABLE_PPM_WO_SWEEPER=true
# Optional scoping:
PPM_WO_SWEEPER_BRANCH_IDS=b1,b2
PPM_WO_SWEEPER_LIMIT=25   # default 25, max 50
```

Schedule: **daily 05:30 Asia/Riyadh** — calls `spawnDueMaintenanceWorkOrders` (idempotent;
skips assets that already have open WOs).

**Cutover order:** enable read-only paths first (snapshot + dashboards), then cron
after verifying manual `POST /spawn-due-maintenance` in staging.

---

## 4. Role names to provision

Ensure these exist in your auth provider (non-exhaustive; see route `authorize` lists):

- `facility_manager`, `maintenance_supervisor`, `maintenance_technician`, `maintenance`
- `safety_officer`, `ops_manager`
- Existing: `admin`, `superadmin`, `branch_manager`, `manager`

---

## 5. Verification (post-deploy smoke)

**Combined supply-chain smoke (W819)** — includes maintenance-hub snapshot; run with facility JWT:

```bash
cd backend && SUPPLY_CHAIN_API_URL=https://<staging-host> SUPPLY_CHAIN_TOKEN=<jwt> \
  npm run verify:supply-chain-staging
```

Run against staging with a facility_manager or ops_manager JWT:

```bash
# Drift guards (fast, no DB)
cd backend && npx jest --config=jest.config.js \
  __tests__/facility-maintenance-bridge-wave801.test.js \
  __tests__/facility-asset-spawn-work-order-wave802.test.js \
  __tests__/maintenance-hub-wave807.test.js \
  __tests__/ops-work-order-list-filter-wave805.test.js \
  __tests__/branch-board-ppm-wave809.test.js \
  __tests__/coo-board-ppm-wave810.test.js \
  --no-coverage

# Maintenance hub snapshot
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/v1/ops/maintenance-hub/snapshot" | jq '.data'

# Bulk spawn (staging only — creates WOs)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit":5}' \
  "$API_BASE/api/v1/ops/maintenance-hub/spawn-due-maintenance" | jq '.data'

# Single-asset spawn
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/v1/facility-asset/$ASSET_ID/spawn-work-order" | jq '.data'

# Branch board PPM tile
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/v1/ops/dashboard/branch?branchId=$BRANCH_ID" | jq '.data.facilityAssets'

# COO cross-branch rollup
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/v1/ops/dashboard/coo" | jq '.data.facilityPpm'
```

**Manual UI checklist (when ops UI exists):**

1. Ops work-order list returns assets with `facilityAssetId` populated (W805).
2. Facility asset detail → spawn WO → appears in open WO list.
3. Maintenance hub snapshot shows due PPM counts matching `FacilityAsset` query.
4. Branch dashboard highlights overdue PPM / expired certs (W809).
5. COO board ranks worst branches by due maintenance (W810).

---

## 6. Wave map (W801–W810)

| Wave | Deliverable                                                       |
| ---- | ----------------------------------------------------------------- |
| W801 | `ops.registry.js` + WO↔facility link + facility spawn route       |
| W802 | Behavioral spawn-work-order + idempotent open-WO guard            |
| W805 | Work-order list filter + populate facility asset on get           |
| W807 | Maintenance hub snapshot + `spawn-due-maintenance` REST           |
| W808 | `ENABLE_PPM_WO_SWEEPER` cron (05:30 Asia/Riyadh)                  |
| W809 | Branch ops dashboard `facilityAssets` PPM section                 |
| W810 | COO executive board `facilityPpm` + `worstBranches`               |
| W811 | This cutover doc + registry drift guard                           |

**Sprint-gated drift guards:** `facility-maintenance-bridge-wave801`,
`facility-asset-spawn-work-order-wave802`, `maintenance-hub-wave807`,
`ops-work-order-list-filter-wave805`, `branch-board-ppm-wave809`,
`coo-board-ppm-wave810`, `maintenance-cutover-doc-wave811` (enumerated in
`backend/sprint-tests.txt`).

---

## 7. Open follow-ups (post-W810)

- **Web-admin ops UI** for maintenance hub — API ready; pages deferred.
- **Alerting** on `lifeSafetyOos` / expired certificates — dashboard exposes counts;
  notification channels not wired in this series.
- **Purchasing vertical** — separate doc
  [`PRODUCTION_CUTOVER_W780_W792_PURCHASING.md`](PRODUCTION_CUTOVER_W780_W792_PURCHASING.md);
  ADR-039 still blocks web-admin PO unification.

---

## 8. Related docs

- [`SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md`](SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md) — closure index (W780–W822, engineering freeze)
- `docs/MODULES.md` — `/api/v1/ops/*` and `/api/facility-asset` rows (W801–W810)
- `docs/architecture/PRODUCTION_CUTOVER_W356_W370.md` — template for env-flag cutover
- `docs/architecture/decisions/039-purchase-order-triple-backend.md` — unrelated PO split
