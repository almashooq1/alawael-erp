# ADR-039 Decision Brief — Purchase Order Triple-Backend

**Audience:** Product owner (supply chain) + web-admin lead + backend platform  
**Date:** 2026-06-03  
**Full ADR:** [039-purchase-order-triple-backend.md](039-purchase-order-triple-backend.md)  
**Sign-off packet (print/email):** [039-SIGNOFF-PACKET.md](039-SIGNOFF-PACKET.md)

## Meeting question (15 minutes)

> Do we **keep two live PO backends** (web-admin InventoryStock + legacy adapter)
> until a funded migration, or **force one API** now?

## Recommendation

**Keep separate (ADR-039 Approach B)** — ship nothing that redirects web-admin to
`/api/v1/purchasing`.

## Facts

| Question                       | Answer                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Is legacy purchasing done?     | Yes — W780–W795 on `main`; cutover doc published.                                     |
| What does web-admin use today? | `GET/POST /api/v1/inventory/purchase-orders` (InventoryStock).                        |
| Same database collection?      | **No** — `purchaseorders` (Stock) vs `inventorymodulepurchaseorders` (module).        |
| Can we alias URLs only?        | **No** — field shapes and stock services differ.                                      |
| Partial receive                | Tier B: `partial` + W795 dialog; Tier A: `partially_received` + `receiveGoodsFromPO`. |

## Options

| Option                               | Effort     | Risk                                             |
| ------------------------------------ | ---------- | ------------------------------------------------ |
| **B — Keep tiers (recommended)**     | 0 waves    | Low — status quo + ADR guard                     |
| **A — Migrate module → Stock**       | 8–12 waves | Medium — data migration + legacy UI rewrite      |
| **C — Adapter facade for web-admin** | 5–7 waves  | High — projection drift, dual stock paths remain |

## Sign-off needed

- [ ] Supply chain: legacy `/purchasing` remains Tier B for 12 months.
- [ ] Web-admin: `/inventory/purchase-orders` remains Tier A; no path change without ADR-039 amendment.
- [ ] Platform: reporting/BI documents two PO sources until migration.

## No-regrets pre-work (either sign-off)

1. Link ADR-039 from cutover doc §7 (W797). ✅
2. Add drift guard so new `dualMount` redirects between tiers fail CI review checklist. ✅ W814 `purchasing-tier-consumer-wave814.test.js`
