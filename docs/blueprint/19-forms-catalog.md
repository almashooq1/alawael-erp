# Phase 19 — Forms Catalog (Ready-to-Use Templates)

**Status**: Closed @ v4.0.114
**Date**: 2026-04-25

## What it is

A library of **32 pre-designed `FormTemplate` seeds** spanning three audiences
(beneficiary / hr / management) so admins switch on a working form with one
click instead of building it from scratch in `FormDesigner`.

The infrastructure (FormTemplate model, FormSubmission, FormDesigner UI,
documentForms.service) already existed before Phase 19 — what was missing was
**content**: pre-baked templates that turn the platform from "form
infrastructure" into "ERP with forms ready out of the box".

## What ships

| Audience                     | Count  | Categories                                                                                             |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| **Beneficiary** (المستفيدين) | 12     | intake (1), consent (3), feedback (3), welfare (1), request (4)                                        |
| **HR** (شؤون الموظفين)       | 12     | leave (3), compensation (2), change (3), separation (1), evaluation (1), feedback (1), development (1) |
| **Management** (الإدارة)     | 8      | procurement (2), finance (2), governance (2), risk (2)                                                 |
| **Total**                    | **32** |                                                                                                        |

### Beneficiary forms

| ID                                         | عربي                          |
| ------------------------------------------ | ----------------------------- |
| `beneficiary.intake.registration`          | تسجيل مستفيد جديد             |
| `beneficiary.consent.treatment`            | موافقة العلاج والتأهيل        |
| `beneficiary.consent.photography`          | موافقة التصوير والنشر         |
| `beneficiary.consent.data-sharing`         | موافقة مشاركة البيانات (PDPL) |
| `beneficiary.feedback.complaint`           | بلاغ شكوى                     |
| `beneficiary.feedback.suggestion`          | اقتراح / ملاحظة               |
| `beneficiary.feedback.satisfaction-survey` | استبيان رضا                   |
| `beneficiary.welfare.application`          | طلب إعانة / دعم               |
| `beneficiary.request.transfer`             | طلب نقل بين الفروع            |
| `beneficiary.request.visit`                | طلب زيارة منزلية              |
| `beneficiary.request.info-update`          | تحديث البيانات الشخصية        |
| `beneficiary.request.cessation`            | طلب إيقاف الخدمة              |

### HR forms

| ID                                 | عربي                 |
| ---------------------------------- | -------------------- |
| `hr.leave.annual`                  | طلب إجازة سنوية      |
| `hr.leave.sick`                    | طلب إجازة مرضية      |
| `hr.leave.maternity-paternity`     | إجازة وضع / أبوة     |
| `hr.compensation.overtime`         | طلب ساعات إضافية     |
| `hr.compensation.salary-advance`   | طلب سُلفة على الراتب |
| `hr.change.salary`                 | طلب تعديل راتب       |
| `hr.change.position`               | طلب تعديل مسمى وظيفي |
| `hr.change.transfer`               | طلب نقل بين الفروع   |
| `hr.separation.resignation`        | استقالة              |
| `hr.evaluation.performance-annual` | تقييم أداء سنوي      |
| `hr.feedback.employee-complaint`   | شكوى موظف            |
| `hr.development.training-request`  | طلب تدريب / دورة     |

### Management forms

| ID                                         | عربي                 |
| ------------------------------------------ | -------------------- |
| `management.procurement.purchase-request`  | طلب شراء             |
| `management.procurement.vendor-onboarding` | تسجيل مورد جديد      |
| `management.finance.budget-approval`       | اعتماد ميزانية       |
| `management.finance.capex-approval`        | اعتماد إنفاق رأسمالي |
| `management.governance.policy-change`      | اقتراح تعديل سياسة   |
| `management.governance.strategic-decision` | مذكرة قرار استراتيجي |
| `management.risk.audit-finding-response`   | رد على ملاحظة مراجعة |
| `management.risk.acceptance`               | قبول مخاطرة          |

## Architecture

```
backend/config/forms-catalog.registry.js   ← 32 frozen catalog entries (pure data)
                ↓
backend/services/formsCatalogService.js    ← list / get / instantiate (DI'd model)
                ↓
backend/routes/forms-catalog.routes.js     ← REST surface (mounted in app.js)
backend/scripts/seed-forms-catalog.js      ← CLI bulk-seed
```

Every catalog entry includes:

- `id` (frozen, dotted slug, e.g. `hr.leave.annual`)
- `audience` ∈ {beneficiary, hr, management}
- `category` (audience-specific)
- `title` / `titleEn` / `description` / `icon`
- `sections[]` (visual grouping)
- `fields[]` (validated against FormTemplate schema)
- `approvalWorkflow` (multi-step roles + auto-approve windows)
- `metadata` (sla_hours, references, regulatory tags, sensitivity flags)

## REST API

All routes mounted under `/api/v1/forms/catalog`. Authentication required;
instantiate operations require admin / super_admin / forms_admin.

| Method | Path                     | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | `/`                      | list (filter: `?audience=hr&category=leave`) |
| GET    | `/summary`               | counts by audience + category                |
| GET    | `/by-audience/:audience` | filter by audience                           |
| GET    | `/:id`                   | full detail                                  |
| POST   | `/:id/instantiate`       | materialize a single entry as FormTemplate   |
| POST   | `/instantiate-all`       | bulk materialize (filter `audience` in body) |

`instantiate` is **idempotent** on `(catalogId, tenantId, branchId)` — calling
it twice with the same scope returns the existing doc, not a duplicate.

## CLI

```bash
# dry-run (no DB writes)
npm run seed:forms-catalog:dry

# only HR forms
node scripts/seed-forms-catalog.js --audience hr

# scoped to a tenant + branch
node scripts/seed-forms-catalog.js --tenant T1 --branch B1

# force reseed (deletes existing from-catalog templates first)
npm run seed:forms-catalog:reset
```

## Testing

```bash
npm run test:forms-catalog
# → 29 tests / 2 suites in ~1s
```

- `forms-catalog-registry.test.js` (14 tests): shape invariants — unique IDs,
  audience/id alignment, valid field types, no duplicate field names, options
  for select/radio, section references resolve, approval steps shape,
  summary correctness, minimum coverage per audience.
- `forms-catalog-service.test.js` (15 tests): pure reads, idempotent
  instantiate, audience-filter on `instantiateAll`, `CATALOG_NOT_FOUND` error
  code, `buildTemplateDoc` metadata stamp.

## How to extend

1. **Add a new template**: append an object to the appropriate array
   (`beneficiaryForms` / `hrForms` / `managementForms`) inside
   `forms-catalog.registry.js`. The drift test will fail fast on schema or ID
   issues.

2. **Renaming an existing ID** is forbidden. Instead, mark old as
   `deprecated: true` in metadata + add a successor with a fresh ID. Existing
   FormTemplate docs still reference the old `catalogId` for traceability.

3. **Catalog version bump**: update `CATALOG_VERSION` in
   `formsCatalogService.js` when shape changes; `metadata.catalogVersion` on
   future-instantiated docs records which version they came from.

## Non-goals

- **No FormDesigner UI changes**. The catalog is consumed via REST; the
  existing `FormDesigner.jsx` already edits any FormTemplate, including ones
  that originated from the catalog.
- **No FormSubmission changes**. Catalog-instantiated forms submit via the
  same flow as hand-built ones.
- **No auto-seed on tenant create**. The seed CLI runs on demand; the
  decision of which audiences to seed for a given tenant is a tenant-onboarding
  policy choice, not a platform default.

## Touched files

```
backend/config/forms-catalog.registry.js               (new, 700+ lines)
backend/services/formsCatalogService.js                (new)
backend/routes/forms-catalog.routes.js                 (new)
backend/scripts/seed-forms-catalog.js                  (new)
backend/__tests__/forms-catalog-registry.test.js       (new)
backend/__tests__/forms-catalog-service.test.js        (new)
backend/app.js                                         (+10 lines: mount router)
backend/package.json                                   (+4 npm scripts)
docs/blueprint/19-forms-catalog.md                     (this file)
CHANGELOG.md                                           (entry for v4.0.114)
```
