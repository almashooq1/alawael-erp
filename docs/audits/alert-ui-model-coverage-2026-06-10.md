# Alert-rule ↔ UI write-model coverage audit — 2026-06-10

## TL;DR

**Original concern:** the smart-alerts engine (`backend/alerts/rules/*`) appeared to
have a _systemic_ coverage gap — several clinical/HR rules query a **base** model
while the live web-admin UIs write the **same concept** to a **sibling** model, so an
alert would never fire on real data.

**Verified outcome (correction, same day): this was largely over-flagged.** On
rigorous per-model verification, a "sibling model" usually means a **different
concern** — a version-history layer, a lighter workflow variant, or a different
_type_ — **not** a competing store. In those cases the alert reading the base model
is **correct**. After verification, **only _credentials_ was a genuine wrong-model
mismatch** (`EmployeeCredential` vs the UI-backed `StaffCertification` — both
staff-credential stores with the same expiry concept). **That one is FIXED (W1151).**
Care-plans and goals are **confirmed false alarms**; incidents/documents/contracts
are different-purpose siblings, not bugs.

**Lesson:** before flagging an alert↔UI "model mismatch", confirm the sibling is a
**competing store for the same concept** (same key fields + lifecycle) — not a
version-history layer, a lighter-workflow variant, or a different type.

> **Impact today: none either way** — production is a fresh, un-onboarded instance
> (every model empty). The credential fix (W1151) is readiness for when staff
> certifications are entered.

## The pattern

```
web-admin <surface>/new  ──POST──▶  /api/v1/<route>  ──writes──▶  Model_B   (richer sibling, UI-backed)
backend alerts/rules/<rule>.js     ctx.models.Model_A.find(...)                Model_A   (base/legacy — empty)
                                                                               └── Model_A ≠ Model_B  → alert never fires
```

## Per-concept status

| Concept                  | Alert reads                                                                                           | UI actually writes                                                                          | Endpoint                                               | Status                                                                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Staff credentials**    | `EmployeeCredential`                                                                                  | `StaffCertification`                                                                        | `/api/v1/rehabilitation-advanced/staff-certifications` | ✅ **FIXED — W1151** (additive: both models now covered)                                                                                                                                                                                                                   |
| **Goals**                | `Goal` (IEP)                                                                                          | `SmartGoal` (lighter therapist workflow)                                                    | `/api/v1/therapist-pro/smart-goals`                    | ✅ **NOT a mismatch** — `Goal` is the full IEP model with `lastProgressAt` (built for stall-detection); `SmartGoal` is explicitly "lighter… without the full IEP machinery" with %-progress (no `lastProgressAt`). Different workflows → alert correctly scoped to `Goal`. |
| **Care plans**           | `CarePlan`                                                                                            | —                                                                                           | —                                                      | ✅ **NOT a mismatch** — `CarePlan` has the alert's exact fields (`status` ACTIVE/DRAFT/ARCHIVED + `reviewDate`). `CarePlanVersion` is the W41 append-only **version-history** layer, not a competing store.                                                                |
| **Incidents**            | `Incident` (comprehensive mgmt)                                                                       | `IncidentReport` (safety/clinical reports)                                                  | quality/incidents                                      | 🔶 **Ambiguous, not a bug** — `Incident` = comprehensive incident-management; `IncidentReport` = safety reports. Different purposes → which to cover is a scoping question, not a wrong model.                                                                             |
| **Documents**            | `Document`                                                                                            | `ControlledDocument` / `EmployeeDocument` (different doc _types_)                           | documents                                              | ✅ Likely fine — siblings are specialized document types, not competing stores (not deep-verified).                                                                                                                                                                        |
| **Employment contracts** | `EmploymentContract`                                                                                  | `HREmploymentContract` / `Nitaqat…` (specialized)                                           | HR                                                     | ✅ Likely fine — siblings are specialized variants (not deep-verified).                                                                                                                                                                                                    |
| **Vaccinations**         | `Vaccination`                                                                                         | `Vaccination` (single model)                                                                | —                                                      | ✅ Safe — not fragmented.                                                                                                                                                                                                                                                  |
| **PDPL DSAR**            | `PdplRequest`                                                                                         | `PdplRequest` (single model)                                                                | —                                                      | ✅ Safe — not fragmented.                                                                                                                                                                                                                                                  |
| **Invoices / finance**   | `Invoice`                                                                                             | `Invoice`                                                                                   | —                                                      | ✅ Safe.                                                                                                                                                                                                                                                                   |
| **Operational (W1006+)** | `FacilityAsset`, `MaintenanceWorkOrder`, `Vehicle`, `Contract.model`, `InventoryStock`, `CapaItem`, … | spot-checked: `facility-assets/new` → `/api/v1/facility-asset` → `FacilityAsset` ✅ matches | various                                                | ✅ Lower risk (rules built against these models); facility-asset verified. Re-verify the rest opportunistically.                                                                                                                                                           |

## Fix patterns

1. **Additive-cover-both** (the W1151-safe pattern, use when the canonical is still
   undecided): add a _new_ rule reading the sibling model **alongside** the
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
  real model file. Catches the _model-missing_ class, **not** the _wrong-model_
  (mismatch) class documented here — that one needs the UI-trace above.
- `backend/__tests__/model-event-bridge-mapping-models-exist-wave1148.test.js`
  (W1148) — the bridge analog (phantom mapping models).
