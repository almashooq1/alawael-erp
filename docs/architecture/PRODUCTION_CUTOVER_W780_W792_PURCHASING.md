# Production Cutover — W780–W799 Legacy Purchasing / Supply Chain

Date: 2026-06-02 (updated W800)  
Scope: 20 waves (W780–W799) closing the legacy `/api/v1/purchasing/*` vertical for
66666 React surfaces (`/purchasing`, `/branch-purchasing`). Zero new env flags —
deploy-ready on next push once roles are provisioned.

This document is the ops checklist for verifying the purchasing adapter chain in
production. Read top-to-bottom; sections follow deployment dependency order.

---

## 0. Pre-flight: three PO models (do NOT merge blindly)

The platform still has **three** purchase-order backends. This series wires the
**legacy purchasing adapter** only:

| Surface                             | API path                                   | Mongoose model                      | Consumer                                               |
| ----------------------------------- | ------------------------------------------ | ----------------------------------- | ------------------------------------------------------ |
| **Legacy purchasing (this series)** | `/api/v1/purchasing/orders`                | `InventoryModulePurchaseOrder`      | `66666/frontend` — `/purchasing`, `/branch-purchasing` |
| Inventory module                    | `/api/v1/inventory-module/purchase-orders` | same `InventoryModulePurchaseOrder` | Item picker in branch PR form (W789)                   |
| Web-admin inventory                 | `/api/v1/inventory/purchase-orders`        | `PurchaseOrder` (InventoryStock)    | `alawael-rehab-platform/web-admin`                     |

**Cutover rule:** legacy React pages MUST call `/api/v1/purchasing/*`. Web-admin
inventory pages stay on `/api/v1/inventory/*` until a deliberate ADR unifies PO
models. W783 added `/api/v1/inventory` as an alias to `inventory-enhanced` for
web-admin only — not a PO unification.

---

## 1. Mongoose models (auto-register on route load)

| Model                          | Collection                      | Used by                      |
| ------------------------------ | ------------------------------- | ---------------------------- |
| `InventoryModulePurchaseOrder` | `inventorymodulepurchaseorders` | PO create/receive/approve    |
| `PurchaseReceipt`              | `purchasereceipts`              | GRN (goods receipt notes)    |
| `Vendor`                       | `vendors`                       | Supplier master              |
| `VendorSupplyContract`         | `vendorsupplycontracts`         | Branch contracts tab         |
| `PurchaseRequest`              | `purchaserequests`              | PR workflow (ops engine)     |
| `InventoryModuleItem`          | `inventorymoduleitems`          | Stock bump on receive (W786) |
| `InventoryModuleTransaction`   | `inventorymoduletransactions`   | Receipt audit trail          |

No migrations required — indexes created on first use. Stock receive requires PO
lines with `item_id` pointing at a registered `InventoryModuleItem`.

---

## 2. HTTP mount

Registered in `backend/routes/registries/features.registry.js`:

```text
dualMountAuth(app, 'purchasing', purchasing.routes)
→ /api/purchasing/*  AND  /api/v1/purchasing/*
```

**Primary endpoints** (legacy UI):

| Area                   | Methods                                    | Notes                                              |
| ---------------------- | ------------------------------------------ | -------------------------------------------------- |
| `/stats`, `/dashboard` | GET                                        | W787 legacy tile aliases                           |
| `/platform-stats`      | GET                                        | W799 — ADR-039 cross-tier read-only counts         |
| `/vendors`             | CRUD                                       | W780                                               |
| `/requests`            | CRUD + submit/approve/reject/convert-to-po | W773/W789                                          |
| `/orders`              | CRUD + approve/receive/status              | W780/W784/W795 partial `body.items` on receive     |
| `/orders/:id/receipts` | GET                                        | W785 — must be registered **before** `/orders/:id` |
| `/receipts`            | CRUD                                       | W781 GRN                                           |
| `/contracts`           | list + expiring + create                   | W781                                               |

Auth: per-route `authorize(...)` — see section 5.

---

## 3. Legacy UI surfaces (66666/frontend)

| Route                | Page                      | Service                               | Waves                                           |
| -------------------- | ------------------------- | ------------------------------------- | ----------------------------------------------- |
| `/purchasing`        | `PurchasingManagement.js` | `operationsService.purchasingService` | W787 stats, W791 lineItems, W795 receive dialog |
| `/branch-purchasing` | `BranchPurchasing.js`     | `branchWarehouseService`              | W788–W790 PO tab, W795 partial receive          |

**End-to-end workflow (branch path):**

```text
PR (optional itemId picker) → submit → approve → convert-to-po
  → PO tab → approve → receive (full or partial via dialog) → GRN + stock ↑
```

**Partial receive (W795):** `PATCH /orders/:id/receive` with `{ items: [{ itemName, quantityReceived }] }` creates a per-shipment GRN; PO status becomes `partial` until all lines fulfilled. Omit `items` for legacy full receive (idempotent per W784).

**Central purchasing path:** list POs → view line items (W791) → approve → receive dialog (W795).

---

## 4. Verification (post-deploy smoke)

Run against staging with a procurement_manager JWT:

```bash
# Adapter unit (fast)
cd backend && npx jest --config=jest.config.js \
  __tests__/purchasing-vendor-order-wave780.test.js \
  __tests__/purchasing-po-receipt-bridge-wave784.test.js \
  __tests__/purchasing-receive-stock-wave786.test.js \
  __tests__/purchasing-pr-item-convert-wave789.test.js \
  __tests__/purchasing-po-line-items-wave790.test.js \
  __tests__/purchasing-routes-flow-wave791.test.js \
  __tests__/purchasing-routes-stock-wave792.test.js \
  __tests__/purchasing-cutover-doc-wave793.test.js \
  __tests__/purchasing-routes-auth-wave794.test.js \
  __tests__/purchasing-partial-receive-wave795.test.js \
  __tests__/purchasing-platform-stats-wave799.test.js \
  --no-coverage

# HTTP E2E (MongoMemoryServer — no external DB)
cd backend && npx jest --config=jest.config.js \
  __tests__/purchasing-routes-flow-wave791.test.js \
  __tests__/purchasing-routes-stock-wave792.test.js \
  __tests__/purchasing-routes-auth-wave794.test.js \
  __tests__/purchasing-partial-receive-wave795.test.js \
  __tests__/purchasing-platform-stats-wave799.test.js \
  --no-coverage

# Route load gate (pre-push)
cd backend && npm run check:routes-load

# Cross-tier federation (read-only — ADR-039; staging JWT required)
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/api/v1/purchasing/platform-stats" | jq '.data.tiers'
# Expect: legacyPurchasing.* + inventoryStock.* (modelAvailable true when InventoryStock registered)
```

**Manual UI checklist:**

1. `/branch-purchasing` — create PR with inventory item → convert → PO tab shows `itemsSummary`.
2. Approve + receive PO — partial qty dialog (W795) or full receive; GRN appears; stock ↑ for linked `item_id`.
3. `/purchasing` — PO table shows summary; detail dialog lists `lineItems` + GRNs; `partial` status chip when applicable.
4. `/purchasing` + `/branch-purchasing` — `PurchasingPlatformStatsBanner` shows Tier B + Tier A (W803/W804).
5. `GET /api/v1/purchasing/platform-stats` — returns both tiers without mutating either collection (W799).

---

## 5. Roles to provision

Backend accepts (non-exhaustive; see `purchasing.routes.js`):

- `admin`, `manager`, `procurement_manager` — full PO/vendor/convert
- `department_head`, `cfo`, `ceo` — PR approval chain
- `staff` — PR create/submit

Missing roles → 403 on mutate endpoints (not silent fallback).

---

## 6. Wave map (W780–W799)

| Wave | Deliverable                                                       |
| ---- | ----------------------------------------------------------------- |
| W780 | Vendors + orders adapter; real data (no stubs)                    |
| W781 | `PurchaseReceipt` + `VendorSupplyContract`                        |
| W782 | Frontend `unwrapApiList` for legacy envelopes                     |
| W783 | `/api/v1/inventory` alias for web-admin                           |
| W784 | PO receive ↔ GRN sync (idempotent full receive)                  |
| W785 | `GET /orders/:id/receipts` + stats receipt count                  |
| W786 | Stock bump via `purchasingStockReceive.lib.js`                    |
| W787 | Stats aliases for `PurchasingManagement` tiles                    |
| W788 | BranchPurchasing PO tab + GRN dialog                              |
| W789 | PR `itemId` picker + convert-to-po UI                             |
| W790 | `lineItems` / `itemsSummary` on adapter payloads                  |
| W791 | `/purchasing` line items + HTTP PR→PO flow test                   |
| W792 | HTTP receive verifies stock bump (supertest)                      |
| W793 | This cutover doc + registry drift guard                           |
| W794 | Real `authorize()` 401/403 route negatives                        |
| W795 | Partial receive via `body.items` + receive dialog                 |
| W796 | Cutover doc sync through W795                                     |
| W797 | ADR-039 triple-backend formalization                              |
| W798 | MODULES.md + PRODUCTION_GAPS discoverability links                |
| W799 | `GET /platform-stats` cross-tier read-only PO counts (ADR-039)    |
| W800 | Cutover doc verification sync through W799 (this section §4 curl) |
| W803 | `PurchasingPlatformStatsBanner` on `/purchasing`                  |
| W804 | Same banner on `/branch-purchasing`                               |

**Sprint-gated drift guards:** 19+ test files under `backend/__tests__/purchasing-*-wave78*.test.js` (enumerated in `backend/sprint-tests.txt`).

---

## 7. Open follow-ups (post-W799)

- **Web-admin PO unification** — **blocked on ADR-039 sign-off**
  ([`docs/architecture/decisions/039-purchase-order-triple-backend.md`](decisions/039-purchase-order-triple-backend.md)).
  Web-admin `/inventory/purchase-orders` stays on `/api/v1/inventory/purchase-orders`
  (InventoryStock). Do **not** redirect to `/api/v1/purchasing` without migration.
  Stakeholder brief: [`039-DECISION-BRIEF.md`](decisions/039-DECISION-BRIEF.md).

---

## 8. Related docs

- `CLAUDE.md` — repo routing doctrine (66666 backend vs web-admin)
- `docs/MIGRATION_LEDGER.md` — two-repo topology
- `docs/architecture/PRODUCTION_CUTOVER_W356_W370.md` — template for clinical cutover pattern
