# Scenario 7 (Optional) — Supply chain + facility maintenance ops

**Status:** Optional — does not gate Pilot Cycle 1 go/no-go (core scenarios 1–6).  
**Duration:** ~2 hours (procurement lead + facility manager)  
**Prerequisites:** ADR-039 sign-off packet reviewed; pilot branch has ≥1 `FacilityAsset` with PPM due.

**References:**

- [PRODUCTION_CUTOVER_W780_W792_PURCHASING.md](../architecture/PRODUCTION_CUTOVER_W780_W792_PURCHASING.md)
- [PRODUCTION_CUTOVER_W801_W810_MAINTENANCE.md](../architecture/PRODUCTION_CUTOVER_W801_W810_MAINTENANCE.md)
- [039-SIGNOFF-PACKET.md](../architecture/decisions/039-SIGNOFF-PACKET.md)

---

## Pre-test setup

- [ ] Pilot JWT for roles: `procurement_manager` (Tier B) + `facility_manager` (maintenance hub)
- [ ] Legacy UI reachable: `/purchasing`, `/branch-purchasing`
- [ ] web-admin reachable: `/ops/maintenance`, `/ops/branch-board` (optional)
- [ ] `ENABLE_PPM_WO_SWEEPER` remains **false** until Step 7.2 passes manual spawn

---

## Part A — Legacy purchasing (Tier B, ADR-039)

| Step | Action | Verify |
| ---- | ------ | ------ |
| 7A.1 | Open `/branch-purchasing` → create PR with inventory item → convert to PO | PO tab shows `itemsSummary`; status advances |
| 7A.2 | Open `/purchasing` → open PO → partial receive (W795 dialog) | Status `partial` when lines remain; GRN created |
| 7A.3 | Confirm **PurchasingPlatformStatsBanner** (W803/W804) | Tier B + Tier A chips visible; read-only |
| 7A.4 | `GET /api/v1/purchasing/platform-stats` | `data.tiers.legacyPurchasing` + `inventoryStock` counts present |

**If it fails:** capture `SCENARIO:7A + STEP` — do not redirect web-admin to `/purchasing` (ADR-039).

---

## Part B — Maintenance hub (W801–W810)

| Step | Action | Verify |
| ---- | ------ | ------ |
| 7B.1 | `GET /api/v1/ops/maintenance-hub/snapshot` | `facilityAssets.dueMaintenance` ≥ 0 |
| 7B.2 | web-admin `/ops/maintenance` → **إنشاء أوامر للمستحقات** (limit 5) | Message shows created/skipped; open WOs list updates |
| 7B.3 | `/ops/branch-board` (pilot branch) | `facilityAssets` tile shows due maintenance count |
| 7B.4 | `POST /api/v1/facility-asset/:id/spawn-work-order` (one asset) | 201 + open WO; idempotent on repeat |

**If it fails:** verify `ops.registry.js` mounted (W801 drift guard); check WO state machine 503.

---

## Part C — Cron cutover (ops only, after 7B.2)

| Step | Action | Verify |
| ---- | ------ | ------ |
| 7C.1 | Set `ENABLE_PPM_WO_SWEEPER=true` on staging only | Boot log mentions PPM WO sweeper scheduled 05:30 Riyadh |
| 7C.2 | Next day: registry `GET /api/ops/schedulers` (if exposed) or hub snapshot | No duplicate open WOs for same asset (idempotent) |

---

## Acceptance (optional sign-off)

- [ ] 7A.1–7A.4 complete without Tier A/B API mix-up
- [ ] 7B.1–7B.4 complete; at least one preventive WO created
- [ ] ADR-039 sign-off packet filed or scheduled

## Sign-off

| Role | Name | Date |
| ---- | ---- | ---- |
| Procurement lead | | |
| Facility manager | | |

## Cleanup

Do not delete production POs/WOs. Tag pilot records with `pilotCycle1: true` in notes if your seed script supports it.
