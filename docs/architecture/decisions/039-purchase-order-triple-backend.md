# 039. Purchase Order Triple-Backend — Keep Separate, Do Not Redirect

Date: 2026-06-03

## Status

Proposed

## Context

After W780–W795 the **legacy purchasing adapter** (`/api/v1/purchasing/*` →
`InventoryModulePurchaseOrder`) is production-ready for 66666 React surfaces.
**Web-admin** (`alawael-rehab-platform`) already ships inventory PO pages at
`/inventory/purchase-orders` and `/procurement/orders`, both calling
`/api/v1/inventory/purchase-orders` → `models/InventoryStock.js` `PurchaseOrder`.

A fourth mount, `/api/v1/inventory-module/purchase-orders`, shares the **same
Mongoose model** as legacy purchasing but uses inline routes (item picker in W789).

| Tier                          | API prefix                                 | Model                            | Primary consumer                                           |
| ----------------------------- | ------------------------------------------ | -------------------------------- | ---------------------------------------------------------- |
| A — Web-admin inventory       | `/api/v1/inventory/purchase-orders`        | `PurchaseOrder` (InventoryStock) | web-admin `/inventory/*`, `/procurement/orders`            |
| B — Legacy supply chain       | `/api/v1/purchasing/orders`                | `InventoryModulePurchaseOrder`   | 66666 `/purchasing`, `/branch-purchasing`                  |
| C — Inventory module (picker) | `/api/v1/inventory-module/purchase-orders` | same as B                        | Branch PR `itemId` picker (W789)                           |
| (orphan comment)              | `/api/v1/purchase-orders`                  | —                                | Referenced in stale TS types only; **no live 66666 route** |

**Schema divergence (cannot merge by URL redirect alone):**

- InventoryStock PO: `supplierId`, `warehouseId`, `partially_received`, embedded
  `items[].itemId` ref `InventoryItem` (stock service `receiveGoodsFromPO`).
- InventoryModule PO: `supplier_name` string, `partial` status, `items[].item_id` →
  `InventoryModuleItem`, GRN via `PurchaseReceipt` + `purchasingAdapter` (W784–W795).

**Risk if we redirect web-admin to `/api/v1/purchasing` without migration:**

- Broken forms (missing warehouse/supplier FK shapes).
- Split stock ledgers (`InventoryItem` vs `InventoryModuleItem` collections).
- Status enum mismatch (`partial` vs `partially_received`).

Ops checklist: [`PRODUCTION_CUTOVER_W780_W792_PURCHASING.md`](../PRODUCTION_CUTOVER_W780_W792_PURCHASING.md).

## Decision

**Approach B — Formalize three tiers; no cross-redirect in 2026-Q2.**

1. **Web-admin stays on Tier A** (`inventory-enhanced` + InventoryStock PO) until a
   funded consolidation program ships with explicit data migration + UI rewrite.
2. **Legacy React stays on Tier B** (`purchasingAdapter`); W780–W795 is the
   canonical path for branch/central supply-chain — do not point legacy UI at
   `/api/v1/inventory/*`.
3. **Tier C is read/write scoped to inventory-module flows only** (picker, module
   CRUD); new supply-chain features must not add a fourth PO writer.
4. **No “unification PR”** that only changes `NEXT_PUBLIC_API_URL` paths or
   `dualMount` aliases — rejected as silent data fork.
5. **Future consolidation (optional, Phase 2)** — only after stakeholder sign-off
   on [`039-DECISION-BRIEF.md`](039-DECISION-BRIEF.md) Approach A or C:
   - **A:** Migrate InventoryModule PO docs → InventoryStock schema + retire adapter.
   - **C:** Facade service projecting InventoryStock shape from adapter reads (higher
     drift risk).

## Consequences

### Positive

- Zero regression risk to web-admin inventory PO pages already in production use.
- Legacy W780–W795 investment preserved; ops doc remains accurate.
- Clear ownership: web-admin inventory team ↔ InventoryStock service; supply-chain ↔
  purchasing adapter.

### Negative

- Two stock item collections (`InventoryItem` vs `InventoryModuleItem`) until
  consolidation.
- Reporting across branches may need union queries or BI layer normalization.
- Procurement staff may see different PO numbers in legacy vs web-admin UIs.

### Guardrails (enforce now)

- New PO features: pick **one** tier in the PR description; cross-tier requires ADR
  amendment.
- Drift guards: `purchasing-po-adr-wave797.test.js`, `purchasing-tier-consumer-wave814.test.js`,
  `purchasing-adr-signoff-packet-wave815.test.js` + cutover doc §7 link.
- Stakeholder sign-off: [`039-SIGNOFF-PACKET.md`](039-SIGNOFF-PACKET.md) (Approach B, 12 months).
- Wave namespace: backend adapter waves continue `W78x`; web-admin PO changes ship
  in `alawael-rehab-platform` with separate wave collision scope.

## References

- W783 — `/api/v1/inventory` alias mount (web-admin only).
- W795 — partial receive on Tier B (`body.items` on `PATCH …/receive`).
- ADR-021 — duplicate model registration pattern (InventoryModulePurchaseOrder vs
  `PurchaseOrder` name collision rationale in `models/inventory/PurchaseOrder.js`).
