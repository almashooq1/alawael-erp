# ADR-023 — ReportTemplate Pattern D rename proposal (Tier 1 consolidation candidate)

**Status**: 🟡 Proposed — needs stakeholder sign-off
**Date**: 2026-05-24
**Supersedes**: extends [ADR-021](021-duplicate-model-registration-consolidation-strategy.md) (duplicate Mongoose model registration framework); follows [ADR-022](022-approval-request-pattern-d-rename-proposal.md) (first per-entity application of Pattern D)
**Owner**: pending (suggest: platform architecture lead + reports module owner)

---

## Context

ADR-021 framed the W340 baseline duplicate-registration findings and laid out the
4-pattern decision tree (A consolidate / B re-export / C ALLOWLIST / D rename).
ADR-022 applied Pattern D to ApprovalRequest as the first per-entity decision.

This ADR is that per-entity analysis for `ReportTemplate`. The W340 baseline
comment lists "ReportTemplate (3×)" but at the current main (HEAD `5276d4b6c`) the
strict registration-form scan finds **2** sites — both registering under the same
Mongoose name `ReportTemplate` but using **different collection names**. Schemas
diverge significantly.

`W341–W347 / W349` cleared most Tier 2 entries mechanically. Tier 1 remains:
`ApprovalRequest` (3×, ADR-022 ✅) / **`ReportTemplate` (2×, this ADR)** /
`WorkflowInstance` (3×) / `AuditLog` (4× — W347 ALLOWLISTed stopgap).

---

## The 2 ReportTemplate schemas

### Schema A: `backend/models/reports/ReportTemplate.js` (147 lines)

**Domain**: Rehab-domain reporting (beneficiary / clinical / assessment / financial / HR / operational / transport / quality / inventory / executive).

**Collection**: `report_templates`

**Naming convention**: `snake_case` field names (`name_ar`, `data_source`, `allowed_roles`, `is_active`).

**Distinctive shape**:

```js
{
  code: String (required, unique, uppercase, trim),  // canonical lookup key
  name_ar / name_en / description_ar,                // bilingual via _ar / _en suffix
  category: enum [11 rehab-domain categories],
  data_source: { collection, pipeline[], lookup_collections[] },
  columns: [columnSchema],                            // typed sub-doc with format/width/visible/sortable
  filters: [filterSchema],                            // text/number/date/date_range/select/multi_select/boolean
  default_sort: { field, direction },
  group_by: [String],
  chart_config: { type, x_axis, y_axis, series[] },
  allowed_roles: [String],                            // ['admin', 'director', 'hr_manager', ...]
  allowed_branches: [ObjectId → 'Branch'],            // branch-scoping per multi-tenant ADR-004
  is_public, is_schedulable, supports_export,
  export_formats: ['pdf', 'xlsx', 'csv', 'json'],
  max_rows: Number (default 10000),
  is_active, is_system, version,
  created_by / updated_by → 'User',
  deleted_at: Date,                                   // soft-delete
}
```

**Distinctive behavior**:

- `pre(/^find/)` hook excludes soft-deleted unless `withDeleted: true`
- `softDelete(userId)` method
- Sub-doc schemas (`columnSchema`, `filterSchema`) are typed + reusable

**Callers** (lookup-form `mongoose.model('ReportTemplate')`, 2 sites):

- `backend/domains/reports/services/ReportsEngine.js:578` — report generation
- `backend/domains/reports/services/ReportsEngine.js:747` — template management

The lookup-callers expect Schema A's shape (snake_case fields, soft-delete, branch-scoping).

### Schema B: `backend/services/documents/documentReporting.engine.js` (inline lines 15-102 of a 609-line file)

**Domain**: Document-management reporting (usage / compliance / workflow / storage / user_activity / audit).

**Collection**: `document_report_templates` ← **already a different collection from Schema A**

**Naming convention**: `camelCase` field names (`nameAr`, `dataSource`, `isSystem`, `createdBy`).

**Distinctive shape**:

```js
{
  name / nameAr,                                       // bilingual via nameAr (NOT _ar)
  key: String (unique),                                // canonical lookup key (vs Schema A's `code`)
  description / descriptionAr,
  category: enum [8 document-domain categories],       // usage/compliance/workflow/storage/user_activity/financial/audit/custom
  type: enum ['tabular', 'summary', 'chart', 'dashboard', 'detailed', 'comparison'],  // ← Schema A has no equivalent
  dataSource: { collection, pipeline[], filters },     // singular `filters` (Schema A has `filters[]` as separate top-level)
  columns: [{ key, label, labelAr, type, sortable, filterable, width, format, aggregate }],
  charts: [{ type, title, titleAr, dataKey, categoryKey, colors[] }],   // ← Schema A's chart_config is single, this is array
  schedule: {                                           // ← Schema A's `is_schedulable` is a boolean; this is the full SCHEDULE
    enabled, frequency: enum [daily/weekly/monthly/quarterly/yearly],
    dayOfWeek, dayOfMonth, time,
    recipients: [{ email, name }],
    format: enum [pdf/excel/csv/html],                  // 'excel' (NOT 'xlsx')
    lastRun, nextRun,
  },
  isSystem, isPublic,
  createdBy → 'User',
  // NO deleted_at / soft-delete
  // NO allowed_branches / branch-scoping
  // NO allowed_roles
  // NO version field
}
```

**Distinctive behavior**:

- No soft-delete pre-find hook
- No branch-scoping (single-tenant by collection isolation)
- Embeds `schedule` directly (vs Schema A which uses a separate `is_schedulable` boolean and presumably defers scheduling to another system)
- Sibling `GeneratedReport` model defined in the same file (lines 107+) with `ref: 'ReportTemplate'` — that ref expects Schema B since this file owns the document-reporting domain

**Callers**:

- All callers internal to `services/documents/` (the file itself defines the storage layer)
- No external consumers verified (lookup grep finds 0 callers outside `documents/`)

---

## The bug today

When both modules load (in arbitrary order — Mongoose registration is order-dependent), one Mongoose model name `ReportTemplate` wins.

- If Schema A loads first: `services/documents/documentReporting.engine.js:105`'s `mongoose.models.ReportTemplate || mongoose.model('ReportTemplate', schemaB)` evaluates the left operand (Schema A model exists), so it **returns Schema A's compiled model**. All `documents/` calls then operate against Schema A's shape — but data still gets written to whichever collection Schema A maps to (`report_templates`). The `document_report_templates` collection sees zero writes.
- If Schema B loads first: opposite — `reports/ReportTemplate.js`'s registration is short-circuited to return Schema B; reports engine callers expecting Schema A's `code` / `category` / `allowed_roles` / soft-delete fail silently.

**Worse**: in dev/test the load order is influenced by which file requires the other first. Different test files exercise different load orders. Production order is deterministic-per-deployment but undocumented.

**Even worse**: the lookup-form callers in `domains/reports/services/ReportsEngine.js:578,747` do `mongoose.model('ReportTemplate')` (one-arg form, lookup by registered name). This ALWAYS gets whichever was registered first. Schema A's behavior + Schema B's collection (or vice versa) → silent data divergence.

---

## Decision tree per ADR-021

| Pattern                        | Applies?           | Why                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** (consolidate)            | ❌ No              | Schemas serve genuinely different domains. Rehab-domain reports answer "what therapy outcomes happened" (clinical, branch-scoped, role-gated, soft-deletable). Document-domain reports answer "how is the document system being used" (admin observability). The shapes diverge for substantive reasons, not accident. Forcing one shape would lose ~half the fields either way. |
| **B** (re-export)              | ❌ No              | A re-export means one file becomes the canonical and the other just re-exports it. But callers consume different fields (rehab: `code` / `allowed_roles` / `deleted_at` / `data_source.lookup_collections`; document: `key` / `type` / `schedule.frequency` / `charts[]`). Re-export would break one side's callers.                                                             |
| **C** (REGISTRATION_ALLOWLIST) | ❌ No (rejected)   | The W347 AuditLog pattern (ALLOWLIST as stopgap) is only justifiable when sites are defensive `mongoose.model('X') ?? fallback` patterns, not 2 sites both creating full schemas. ReportTemplate's 2 sites are real co-creators, not defensive fallbacks. ALLOWLIST would hide the load-order bug indefinitely.                                                                  |
| **D** (RENAME)                 | ✅ **Recommended** | Each schema gets a domain-prefixed name. Both collections continue to exist (they already DO — `report_templates` + `document_report_templates`). Callers update their `mongoose.model('X')` lookups + `ref: 'X'` references to the prefixed name. W340 baseline drops `ReportTemplate` once both sites are renamed.                                                             |

---

## Recommended rename (Pattern D)

### Naming triple

| Schema                                                                | Current registration                    | Proposed new registration                       | Collection (unchanged)      |
| --------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------- | --------------------------- |
| A — `backend/models/reports/ReportTemplate.js`                        | `mongoose.model('ReportTemplate', ...)` | `mongoose.model('RehabReportTemplate', ...)`    | `report_templates`          |
| B — `backend/services/documents/documentReporting.engine.js` (inline) | `mongoose.model('ReportTemplate', ...)` | `mongoose.model('DocumentReportTemplate', ...)` | `document_report_templates` |

### Migration steps

1. **Schema A rename** (smaller change — internal to `backend/models/reports/` + 2 internal callers):
   - Update `models/reports/ReportTemplate.js:147` registration → `'RehabReportTemplate'`
   - Update lookup-callers in `domains/reports/services/ReportsEngine.js:578,747` → `mongoose.model('RehabReportTemplate')`
   - Search backend for any `ref: 'ReportTemplate'` and re-point to `RehabReportTemplate` where the field semantically targets Schema A (rehab-domain report).
2. **Schema B rename** (larger change, but contained within `backend/services/documents/`):
   - Extract Schema B from inline `documentReporting.engine.js:15-105` into a new file `backend/models/documents/DocumentReportTemplate.js` (matches the pattern of canonical models living under `models/` rather than inline in `services/`).
   - Register as `'DocumentReportTemplate'`.
   - Update all `services/documents/` callers to import the new model.
   - Update the sibling `GeneratedReport.templateId` ref from `'ReportTemplate'` → `'DocumentReportTemplate'`.
3. **W340 baseline cleanup**:
   - Remove `'ReportTemplate'` from `KNOWN_DUPLICATE_REGISTRATIONS` set in `backend/__tests__/no-duplicate-model-registration-wave340.test.js`.
   - Update the stale "(3×)" comment to reflect the historical pre-fix state.
4. **Drift guard verification**:
   - Re-run `npx jest --runInBand __tests__/no-duplicate-model-registration-wave340.test.js __tests__/universal-model-ref-drift-wave325c.test.js` — both should still pass.
   - Any new phantom-ref findings from step 1's `ref:` re-pointing must be fixed in the same PR.

### Estimated PR footprint

- **Schema A side**: 1 model file + 1 service file (2 lookups), ~6 line changes total
- **Schema B side**: 1 new file + 1 extracted-from file + N caller updates (need to grep `services/documents/` for full count) + 1 ref re-point in sibling `GeneratedReport`
- **W340 baseline test**: 1 line removed + 1 comment updated
- **Total**: ~10–15 line changes, 4–5 files. One PR. ~30-60 min focused work.

### Risk assessment

- **Migration data**: Both collections (`report_templates` + `document_report_templates`) are unchanged — no data migration needed.
- **Caller breakage**: Static analysis (grep for `mongoose.model('ReportTemplate'` + `ref: 'ReportTemplate'`) finds all touch points. Each must be updated in the same PR.
- **Tooling sensitivity**: The W340 + W325c drift guards verify the rename via the stale-baseline assertion (ratchet-down forced).
- **Rollback**: Revert PR. No DB schema changes; no data lost.

---

## Open questions for stakeholder

1. **Naming**: Do `RehabReportTemplate` + `DocumentReportTemplate` convey the right semantic distinction? Alternatives:

   - `OperationalReportTemplate` (more generic, but loses "rehab" specificity)
   - `ClinicalReportTemplate` (but Schema A's categories include `financial` / `hr` / `operational` — not purely clinical)
   - `BeneficiaryReportTemplate` (too narrow — Schema A handles non-beneficiary categories)
   - **Recommended**: stick with `RehabReportTemplate` (matches the platform branding "Al-Awael Rehab Platform") + `DocumentReportTemplate`.

2. **Where should Schema B's extracted model live?**:

   - `backend/models/documents/DocumentReportTemplate.js` (matches the `models/<subdomain>/` convention used by `models/reports/` itself, also `models/quality/` per W337-W349)
   - `backend/services/documents/DocumentReportTemplate.js` (keeps it next to its consumers but breaks the "models live in models/" convention)
   - **Recommended**: `models/documents/DocumentReportTemplate.js`.

3. **Should this PR also clean up the lookup-form vs registration-form inconsistency in `domains/reports/services/ReportsEngine.js`?**:

   - The file does `mongoose.model('ReportTemplate')` (lookup) twice. After the rename it'll do `mongoose.model('RehabReportTemplate')`. Should we additionally `require()` the model directly at top-of-file? That's the W214 lazy-require pattern from elsewhere in the codebase and would make the dependency explicit.
   - **Recommended**: yes — small refactor; makes the dependency graph readable.

4. **Should W340 + W325c add a future-proof guard to prevent future "(N×) same-name registrations" in the prompts/models/ tree?**:
   - W340 already does this. The drift guard catches future re-introductions automatically.
   - **Recommended**: nothing additional needed.

---

## Decision

⏳ **Pending stakeholder sign-off on Q1–Q4 above.**

Once Q1–Q3 are resolved, this ADR transitions to **Accepted** and the PR can land.

---

## See also

- [ADR-021](021-duplicate-model-registration-consolidation-strategy.md) — framework
- [ADR-022](022-approval-request-pattern-d-rename-proposal.md) — first per-entity application (ApprovalRequest)
- `backend/__tests__/no-duplicate-model-registration-wave340.test.js` — drift guard
- `backend/__tests__/universal-model-ref-drift-wave325c.test.js` — phantom-ref guard (will catch missed `ref:` updates)
- `docs/BUILD_SEQUENCE_PLAN.md` — Priority 1 entry referencing ReportTemplate
