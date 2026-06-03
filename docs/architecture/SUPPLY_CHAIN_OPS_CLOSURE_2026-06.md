# Supply Chain + Facility Ops — Closure Index (2026-06)

**Status:** Engineering complete on `main` through **W819**. Stakeholder ADR-039 sign-off is the
remaining gate before any PO unification program.

This page is the single navigation index — not a fourth cutover doc.

---

## 1. What shipped

| Track | Waves | Consumer | Cutover doc |
| ----- | ----- | -------- | ----------- |
| Legacy purchasing | W780–W804 | `66666/frontend` `/purchasing`, `/branch-purchasing` | [PRODUCTION_CUTOVER_W780_W792_PURCHASING.md](PRODUCTION_CUTOVER_W780_W792_PURCHASING.md) |
| Facility maintenance | W801–W810 | web-admin `/ops/*` + REST | [PRODUCTION_CUTOVER_W801_W810_MAINTENANCE.md](PRODUCTION_CUTOVER_W801_W810_MAINTENANCE.md) |
| ADR-039 policy | W797–W818 | All tiers | [039-SIGNOFF-PACKET.md](decisions/039-SIGNOFF-PACKET.md) + [039-SIGNOFF-EMAIL-AR.md](decisions/039-SIGNOFF-EMAIL-AR.md) |
| Platform hygiene | W812–W813 | Ops / CI | [PRODUCTION_GAPS_BEFORE_LIVE.md](../PRODUCTION_GAPS_BEFORE_LIVE.md) |
| Pilot optional | W816 | Week 3–4 operators | [SCENARIO_7](../pilot/SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS.md) |

---

## 2. Env flags (production)

| Flag | When | Doc |
| ---- | ---- | --- |
| _(none required)_ | Purchasing + maintenance REST live on deploy | Purchasing cutover §2 |
| `ENABLE_PPM_WO_SWEEPER=true` | After manual spawn verified in staging | Maintenance cutover §3 |

---

## 3. Drift guards (sprint-gated)

| Wave | Guard | Prevents |
| ---- | ----- | -------- |
| W797 | `purchasing-po-adr-wave797` | Registry tier split |
| W799 | `purchasing-platform-stats-wave799` | Cross-tier stats API |
| W803 | `purchasing-platform-stats-ui-wave803` | Legacy banner wiring |
| W814 | `purchasing-tier-consumer-wave814` | Web-admin ↔ legacy API mix-up |
| W815 | `purchasing-adr-signoff-packet-wave815` | Sign-off artifact drift |
| W801–W810 | `facility-maintenance-bridge`, `maintenance-hub`, … | Ops mount regressions |
| W813 | `stub-audit-ratchet-wave813` | New hollow route files |
| W816 | `pilot-supply-chain-scenario-wave816` | Pilot doc links |
| W818 | `purchasing-adr-signoff-email-wave818` | Arabic sign-off email drift |
| W819 | `supply-chain-staging-verify-wave819` | Staging smoke script + closure links |
| W820 | `purchasing-signoff-staging-wire-wave820` | Sign-off packet ↔ W819 script in cutover/gaps |

---

## 4. Stakeholder actions (not code)

1. **Schedule 15 min** — send [039-SIGNOFF-EMAIL-AR.md](decisions/039-SIGNOFF-EMAIL-AR.md); attach [039-SIGNOFF-PACKET.md](decisions/039-SIGNOFF-PACKET.md) + [039-DECISION-BRIEF.md](decisions/039-DECISION-BRIEF.md).
2. **Approve Approach B** (keep three PO tiers 12 months).
3. **Pilot week 3–4** — optional Scenario 7 if procurement/facilities in scope.
4. **Do not** open a “unify PO URLs only” PR without migration charter (ADR-039 § Decision).

---

## 5. Quick verification (staging)

**One command** (after staging deploy; needs procurement or facility JWT):

```bash
cd backend
SUPPLY_CHAIN_API_URL=https://<staging-host> \
SUPPLY_CHAIN_TOKEN=<jwt> \
npm run verify:supply-chain-staging
```

Manual curls (same checks):

```bash
# Purchasing federation (Tier B + A counts)
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API/api/v1/purchasing/platform-stats" | jq '.data.tiers'

# Maintenance hub
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API/api/v1/ops/maintenance-hub/snapshot" | jq '.data.facilityAssets'

# Hollow routes (local dev)
cd backend && npm run audit:stub-routes   # expect STUB: 0
```

---

## 6. Related

- [MODULES.md](../MODULES.md) — `/api/v1/purchasing`, `/api/v1/ops/maintenance-hub` rows
- [039-purchase-order-triple-backend.md](decisions/039-purchase-order-triple-backend.md) — full ADR
- [PILOT_CYCLE_1.md](../PILOT_CYCLE_1.md) §11 — optional Scenario 7
