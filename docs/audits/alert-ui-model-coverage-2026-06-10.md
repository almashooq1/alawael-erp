# Alert-rule ↔ UI write-model coverage audit — 2026-06-10

## TL;DR

The smart-alerts engine (`backend/alerts/rules/*`, gated by `ALERTS_ENGINE_ENABLED`)
has a **systemic latent coverage gap**: several clinical/HR rules query the
**base/legacy** model name, while the live web-admin UIs write the **same concept**
to a **richer sibling** model. On fragmented domains the alert therefore watches a
model the UI never populates, so it would **never fire on real onboarded data**.

This is a consequence of the project's known domain-model fragmentation (multiple
models per concept) plus in-flight consolidation ADRs. **One instance was fixed**
(credentials → W1151); the rest are tied to their domains' canonical-model
decisions and are **deferred** (re-pointing standalone would conflict with active
consolidation or target a soon-to-be-deprecated model).

> **Impact today: none.** Production is a fresh, un-onboarded instance — every
> sibling model is empty, so no rule fires regardless. This is a **readiness** gap:
> it bites the moment each domain is populated with real data.

## The pattern

```
web-admin <surface>/new  ──POST──▶  /api/v1/<route>  ──writes──▶  Model_B   (richer sibling, UI-backed)
backend alerts/rules/<rule>.js     ctx.models.Model_A.find(...)                Model_A   (base/legacy — empty)
                                                                               └── Model_A ≠ Model_B  → alert never fires
```

## Per-concept status

| Concept | Alert reads | UI actually writes | Endpoint | Status |
|---|---|---|---|---|
| **Staff credentials** | `EmployeeCredential` | `StaffCertification` | `/api/v1/rehabilitation-advanced/staff-certifications` | ✅ **FIXED — W1151** (additive: both models now covered) |
| **Goals** | `Goal` | `SmartGoal` | `/api/v1/therapist-pro/smart-goals` | ⏸ Deferred → golden-thread **ADR-040** (TherapeuticGoal canonical). Canonical is in flux toward `TherapeuticGoal`, so additive-cover-`SmartGoal` may cover a soon-deprecated model. |
| **Care plans** | `CarePlan` | `CarePlanVersion` (W41 care-planning registry) | care-planning surfaces | ⏸ Deferred → **W41 / ADR-026** (care-plan / IEP-IFSP fragmentation). |
| **Incidents** | `Incident` | `Incident` vs `IncidentReport` vs `BehaviorIncident` / `CrisisIncident` … | quality/incidents | ⏸ Needs a confirmed UI trace; quality domain. |
| **Documents** | `Document` | `Document` vs `ControlledDocument` / `EmployeeDocument` … | documents | ⏸ Needs a confirmed UI trace. |
| **Employment contracts** | `EmploymentContract` | `EmploymentContract` vs `HREmploymentContract` / `Nitaqat…` | HR | ⏸ Needs a confirmed UI trace; HR domain. |
| **Vaccinations** | `Vaccination` | `Vaccination` (single model) | — | ✅ Safe — not fragmented. |
| **PDPL DSAR** | `PdplRequest` | `PdplRequest` (single model) | — | ✅ Safe — not fragmented. |
| **Invoices / finance** | `Invoice` | `Invoice` | — | ✅ Safe. |
| **Operational (W1006+)** | `FacilityAsset`, `MaintenanceWorkOrder`, `Vehicle`, `Contract.model`, `InventoryStock`, `CapaItem`, … | spot-checked: `facility-assets/new` → `/api/v1/facility-asset` → `FacilityAsset` ✅ matches | various | ✅ Lower risk (rules built against these models); facility-asset verified. Re-verify the rest opportunistically. |

## Fix patterns

1. **Additive-cover-both** (the W1151-safe pattern, use when the canonical is still
   undecided): add a *new* rule reading the sibling model **alongside** the
   existing one — non-destructive, easy to retire later. See
   `backend/alerts/rules/staff-certification-expired.js` +
   `staff-certification-expiry-30d.js` (self-loading on `StaffCertification`,
   leaving the W1147 `EmployeeCredential` rules untouched).
2. **Re-point at canonical** (use once a consolidation ADR picks the canonical
   model): change the rule's `ctx.models.X` / self-load `require()` to the chosen
   model. **Do this as part of the ADR's implementation**, not standalone.

## How to re-verify a concept (worked example)

1. Find the create UI: `apps/web-admin/src/app/(dashboard)/<surface>/new/page.tsx`.
2. Find its API client/endpoint (often a typed client like `smartGoalApi.create`
   or a raw `apiFetch('/api/v1/...')`; may live in a shared form component).
3. Follow the endpoint to the backend route and its `mongoose.model(...)` target.
4. Compare to the alert rule's `ctx.models.<X>` read.
5. If they differ → mismatch. Apply pattern 1 (now) or 2 (with the ADR).

**Worked example (credentials):** `staff-certifications/new` → `apiFetch('/api/v1/rehabilitation-advanced/staff-certifications')`
→ `routes/rehabilitation-advanced.routes.js` → `StaffCertification`
(`models/rehab-advanced/StaffCertification.model.js`, expiry nested at
`certification_info.expiry_date`). The alert read `EmployeeCredential`
(`models/EmployeeCredential.js`) — different model → W1151 added the
`StaffCertification` coverage.

## Guardrails already in place

- `backend/__tests__/alert-engine-model-availability-wave1149.test.js` (W1149) —
  asserts every alert-loader model + every rule self-load `require()` resolves to a
  real model file. Catches the *model-missing* class, **not** the *wrong-model*
  (mismatch) class documented here — that one needs the UI-trace above.
- `backend/__tests__/model-event-bridge-mapping-models-exist-wave1148.test.js`
  (W1148) — the bridge analog (phantom mapping models).
