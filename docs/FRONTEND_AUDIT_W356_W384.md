# Frontend Audit — W356-W370 + W384 Modules

**Type**: Research output (Cycle 2 item #4 from OPEN_ISSUES_INVENTORY.md)
**Date**: 2026-05-25
**Scope**: Verify Next.js 15 pages exist in `alawael-rehab-platform/apps/web-admin/src/app/(dashboard)/` for the 11 W356-W384 clinical-services modules
**Audience**: Product PM + frontend lead (decide if naming cleanup is worth scheduling)

---

## Headline finding

**All 11 modules have complete frontend coverage** (list + detail + new + nav). The original Cycle 2 concern ("what's missing for pilot UX") is resolved: **nothing critical is missing**. Pilot Week 2 can proceed.

The audit surfaced ONE secondary issue worth flagging (naming inconsistency in §3 below).

---

## 1. Per-module coverage matrix

| Wave      | Module                      | Backend route            | Frontend path                                | List |   Detail    |     New     | Nav entry | Notes                                                                                            |
| --------- | --------------------------- | ------------------------ | -------------------------------------------- | :--: | :---------: | :---------: | :-------: | ------------------------------------------------------------------------------------------------ |
| W356      | SeizureEvent                | `/api/seizure-log`       | `(dashboard)/seizure-log/`                   |  ✅  |     ✅      |     ✅      |    ✅     | Reference impl per CLAUDE.md                                                                     |
| W357      | SafeguardingConcern         | `/api/safeguarding`      | `(dashboard)/safeguarding/`                  |  ✅  |     ✅      |     ✅      |    ✅     | —                                                                                                |
| W358      | CommunicationAidProfile     | `/api/communication-aid` | `(dashboard)/communication-aid/`             |  ✅  |     ✅      |     ✅      |    ✅     | Singleton per beneficiary                                                                        |
| W359      | AssistiveDevice             | `/api/assistive-device`  | `(dashboard)/assistive-devices/`             |  ✅  |     ✅      |     ✅      |    ✅     | **plural path** (route is singular)                                                              |
| W360+W367 | CbahiAttestation            | `/api/cbahi`             | `(dashboard)/cbahi/` + `cbahi/attestations/` |  ✅  | ✅ (nested) | ✅ (nested) |    ✅     | **nested CRUD pattern** (list at /cbahi is the dashboard; CRUD lives under /cbahi/attestations/) |
| W361      | TransitionPlan              | `/api/transition-plan`   | `(dashboard)/transition-plans/`              |  ✅  |     ✅      |     ✅      |    ✅     | **plural path** (route is singular)                                                              |
| W362      | AdaptiveSportsProgram       | `/api/adaptive-sports`   | `(dashboard)/adaptive-sports/`               |  ✅  |     ✅      |     ✅      |    ✅     | —                                                                                                |
| W363      | RespiteBooking              | `/api/respite`           | `(dashboard)/respite/`                       |  ✅  |     ✅      |     ✅      |    ✅     | —                                                                                                |
| W368      | BeneficiaryDietPrescription | `/api/diet-prescription` | `(dashboard)/diet-prescription/`             |  ✅  |     ✅      |     ✅      |    ✅     | —                                                                                                |
| W369      | FacilityAsset               | `/api/facility-asset`    | `(dashboard)/facility-assets/`               |  ✅  |     ✅      |     ✅      |    ✅     | **plural path** (route is singular)                                                              |
| W384      | CaregiverSupportProgram     | `/api/caregiver-support` | `(dashboard)/caregiver-support/`             |  ✅  |     ✅      |     ✅      |    ✅     | —                                                                                                |

**Score**: **11/11 modules fully wired**. No new pages to ship.

---

## 2. Aggregator + nav-items.v2.tsx wiring

Both confirmed wired (`grep -E "<module-name>" components/layout/nav-items.v2.tsx`):

- All 11 modules have entries in the clinical section of `nav-items.v2.tsx`
- W390 added caregiver-support as the 8th card in the `/clinical-services/[id]` cross-surface aggregator (per CLAUDE.md addendum)

---

## 3. Secondary finding — naming inconsistency (NOT urgent, decision needed)

Three modules use PLURAL paths while 7 use SINGULAR + 1 is nested. CLAUDE.md's W372 doctrine implied singular, but reality diverged when the modules shipped:

| Backend route            | Frontend path                     | Style         |
| ------------------------ | --------------------------------- | ------------- |
| `/api/seizure-log`       | `/seizure-log`                    | singular      |
| `/api/safeguarding`      | `/safeguarding`                   | singular      |
| `/api/communication-aid` | `/communication-aid`              | singular      |
| `/api/adaptive-sports`   | `/adaptive-sports`                | singular      |
| `/api/respite`           | `/respite`                        | singular      |
| `/api/diet-prescription` | `/diet-prescription`              | singular      |
| `/api/caregiver-support` | `/caregiver-support`              | singular      |
| `/api/assistive-device`  | `/assistive-devices`              | **PLURAL** ⚠ |
| `/api/facility-asset`    | `/facility-assets`                | **PLURAL** ⚠ |
| `/api/transition-plan`   | `/transition-plans`               | **PLURAL** ⚠ |
| `/api/cbahi`             | `/cbahi` + `/cbahi/attestations/` | **nested** ⚠ |

### Decision needed: do we standardise?

**Option A — Leave as-is** (zero work)

- ✓ All routes work, nav-items.v2.tsx is consistent with what exists
- ✓ No breaking change risk
- ✗ Future agents adding pages have no clear convention to follow

**Option B — Move 3 plural paths to singular** (~1 day work)

- Cost: rename 9 page.tsx files (3 modules × 3 pages each) + update nav-items entries + update any deep-links
- Risk: any external bookmark / docs / e2e test that hard-codes `/assistive-devices` etc. breaks
- ✓ Matches W372 doctrine + matches backend route names

**Option C — Update doctrine to allow both, document the rule** (~30 min work)

- Cost: write one paragraph in CLAUDE.md "frontend conventions" section: "use singular for entity-level routes; plural for collection-summary dashboards; nested for sub-resource hierarchies (cbahi → attestations)"
- ✓ Codifies the actual pattern; future agents have rule to follow
- ✗ Existing inconsistency stays; the 3 plural cases stay anomalous

**My recommendation**: **Option C**. The 3 plural paths reflect a real product decision (these ARE collection-summary dashboards — facility-assets manages many assets, transition-plans shows lifetime plans, assistive-devices is a loan catalog). Forcing singular would obscure that semantic. Just document the rule.

---

## 4. Out of scope but observed

The broader `(dashboard)/` directory has **158 top-level routes**, many of which have list-only pages (no detail/new). Examples:

- `aac/`, `ar-vr/`, `case-management/`, `civil-defense/`, `crm/`, `early-intervention/`, `family-visits/`, `montessori/` — list only
- `audit-trail/`, `bip-tracking/`, `gas/`, `supervisor/` — NO page at all (TypeScript imports only? layouts?)

This is **out of scope for the Cycle 2 audit** (which focused on W356-W384). Categorising those 158 directories into "intentional read-only dashboards" vs "incomplete CRUD" vs "stub for future feature" requires per-domain context that's not in the codebase. Recommend treating as a separate Cycle if you want a full inventory.

---

## 5. Cycle 2 deliverables (this audit)

- ✅ Confirmed all 11 W356-W384 modules have complete UI coverage
- ✅ Identified naming inconsistency as the only worth-flagging issue
- ✅ 3 explicit options with cost/risk trade-offs for user decision
- ✅ Out-of-scope items called out (broader 158-dir inventory) as separate Cycle if needed

**Next user decision**: pick A, B, or C for the naming inconsistency. Or defer it and move to a different Cycle 3 item.

---

## 6. Related

- [`OPEN_ISSUES_INVENTORY.md`](OPEN_ISSUES_INVENTORY.md) §3 "Frontend pages for W356-W370" row
- CLAUDE.md "W356–W376 Clinical Services Series" section
- W372-W376 commit chain (frontend foundation)
- W390 (caregiver-support 8th aggregator card)
