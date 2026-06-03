# ADR-039 Sign-Off Packet — Purchase Order Triple-Backend

**Purpose:** One-page artifact for product + supply-chain + platform to approve **Approach B**
(keep three tiers; no cross-redirect) for 12 months.

**Meeting time:** 15 minutes  
**Email draft (AR):** [039-SIGNOFF-EMAIL-AR.md](039-SIGNOFF-EMAIL-AR.md) (W818 — copy/paste to stakeholders)  
**Full ADR:** [039-purchase-order-triple-backend.md](039-purchase-order-triple-backend.md)  
**Decision brief:** [039-DECISION-BRIEF.md](039-DECISION-BRIEF.md)  
**Ops cutover:** [PRODUCTION_CUTOVER_W780_W792_PURCHASING.md](../PRODUCTION_CUTOVER_W780_W792_PURCHASING.md)  
**Closure index:** [SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md](../SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md) (W817–W822 — engineering freeze)

---

## Recommendation (platform)

Approve **Approach B — Keep tiers separate**. Do **not** redirect web-admin PO pages to
`/api/v1/purchasing` without a funded migration program.

| Tier | API | Consumer |
| ---- | --- | -------- |
| **A** | `/api/v1/inventory/purchase-orders` | web-admin inventory / procurement |
| **B** | `/api/v1/purchasing/*` | legacy React `/purchasing`, `/branch-purchasing` |
| **C** | `/api/v1/inventory-module/purchase-orders` | branch PR item picker only |

**Already shipped on `main` (no sign-off required to deploy):** W780–W804 purchasing,
W799–W804 ADR-039 banner, W814 tier-consumer drift guard, W801–W811 maintenance hub,
W818 Arabic sign-off email, W819 `npm run verify:supply-chain-staging`.

---

## Sign-off (check all three)

| Role | Name | Date | Decision |
| ---- | ---- | ---- | -------- |
| **Supply chain / procurement lead** | _________________ | ________ | ☐ Approve Approach B for 12 months |
| **Web-admin / inventory product lead** | _________________ | ________ | ☐ Tier A stays on `/inventory/purchase-orders` |
| **Platform / backend lead** | _________________ | ________ | ☐ BI/reporting documents two PO sources until migration |

**If any box is unchecked:** open ADR-039 amendment PR — do not change API mounts in code.

---

## Staging verification (ops — before pilot cutover)

**One command (W819)** — procurement or facility JWT on staging:

```bash
cd backend
SUPPLY_CHAIN_API_URL=https://<staging-host> \
SUPPLY_CHAIN_TOKEN=<jwt> \
npm run verify:supply-chain-staging
```

Manual curls (same checks):

```bash
# Tier B — legacy adapter (read-only federation)
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API/api/v1/purchasing/platform-stats" | jq '.data.tiers'

# Tier B — branch PR → PO flow (see cutover doc §4)
# 1. /branch-purchasing → convert PR → PO tab
# 2. /purchasing → partial receive dialog (W795)

# Tier A — web-admin only (separate repo / staging URL)
# /inventory/purchase-orders — create → approve → receive (InventoryStock)

# Maintenance (orthogonal)
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API/api/v1/ops/maintenance-hub/snapshot" | jq '.data.facilityAssets.dueMaintenance'
```

Legacy UI must show **PurchasingPlatformStatsBanner** (Tier B + Tier A counts) on
`/purchasing` and `/branch-purchasing` after deploy.

---

## If stakeholders choose Approach A or C later

| Approach | Trigger | Minimum program |
| -------- | ------- | ---------------- |
| **A — Migrate to InventoryStock** | Signed charter + 8–12 waves | Data migration script + legacy UI rewrite + retire adapter |
| **C — Facade projection** | Signed charter + 5–7 waves | Projection service + drift tests on field parity |

Until then: **no** `dualMount` alias between `purchasing` and `inventory` keys (enforced by W797 + W814).

---

## Record keeping

After sign-off, scan or paste approval into ticket `ADR-039` and update ADR-039 status line:

```text
Status: Accepted (Approach B) — signed YYYY-MM-DD by <names>
```

Platform engineering does **not** change runtime behaviour on sign-off — Approach B is already live.
