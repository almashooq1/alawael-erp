# Form-save mismatch audit — web-admin ↔ 66666 backend (2026-06-05)

**Origin:** user report "عند تسجيل مستفيد لا يحفظ المعلومات" (beneficiary registration
doesn't save). Root-caused, fixed, deployed (W926, PR #273). Follow-up question:
"هل تم التطبيق لكامل المشروع؟" → this audit.

## The bug class

A web-admin create form POSTs a payload the live 66666 Mongoose model **rejects**
(enum mismatch, missing `required` field, wrong field names / nested shape, or a
strict route validator), so `.save()` / `findOneAndUpdate(runValidators)` throws
→ **HTTP 500/400** → the UI shows nothing saved. Verified per-surface by replaying
the exact form payload against the live model (`mongodb://127.0.0.1:27017/alawael-erp`).

## Systemic root causes (two)

1. **Contract drift.** Several web-admin surfaces were built against a **V4 Prisma**
   contract (camelCase, e.g. `Vehicle.plateNumber`/`type`) but are wired to the
   **66666 Mongoose** backend (snake_case, `license_plate`/`vehicle_type` lowercase
   enum). Both **read and write** are mismatched, not just save. The V4 services are
   FROZEN (see `CLAUDE.md` routing doctrine) — the **66666 contract is canonical**,
   so the fix is to align the **frontend** to it (api.ts bidirectional adapters +
   form fields), not to fork the backend.
2. **Branch/auth gap.** `generateToken` (`middleware/auth.js`) puts only
   `{id,email,role,permissions}` in the JWT — **no `branchId`** — and `authenticate`
   does no DB enrichment (`req.user = decoded`). So `req.branchScope.branchId` is
   `null` for everyone (fail-open → allBranches). In the DB only **6/69 users** have
   a `branchId`, and the live admin (`admin@alawael.com.sa`) has **none**. Models that
   make `branch_id` **required** (Vehicle, Invoice, Employee, PurchaseOrder) therefore
   have **no valid server-side branch source** at create time → those forms need an
   explicit **branch selector** (a product/UX decision), or a systemic auth fix that
   carries/enriches `branchId`.

## Per-surface status

| Surface | Failure (verified) | Fix location | Needs decision | Status |
|---|---|---|---|---|
| **beneficiaries** | Arabic `category` vs English enum; createdBy null | backend normalizer + model fields | — | ✅ DONE (W926, PR #273, deployed) |
| **icf-assessments** | `assessorId` required, not injected | backend (server-derived) | — | ✅ DONE (W930, this PR) |
| **crm/complaints** | strict validator wants `subject`+lowercase `source`; model needs `content`+`type` | frontend (align to real contract) | no | TODO — frontend adapter |
| **therapy-groups** | `nameAr`+`type` required; form sends `name`/`focus` | frontend (map name→nameAr, add type select) | no | TODO — frontend |
| **transport/vehicles** | `branch_id`+`license_plate` required; UPPER `type` vs lowercase enum | frontend adapter + **branch selector** | **branch UX** | BLOCKED on branch decision |
| **finance/invoices** | `branch_id`+`beneficiary_id` required; camelCase vs snake_case | frontend adapter + **branch + beneficiary pickers** | **branch UX** | BLOCKED |
| **inventory/purchase-orders** | `supplierId`+`itemId`+`branchId` (refs) required; form sends free-text | frontend (supplier/item pickers) + branch | **pickers + branch** | BLOCKED |
| **hr/employees** | 13 required fields not collected (phone,email,salary,department,…) | frontend (expand form) OR model relax | **product: which fields mandatory** | BLOCKED |
| **quality/incidents** | targets the **IT-ops `Incident`** model (`title`+`category` required) — wrong entity | route to a clinical/safety incident model | **which model** | BLOCKED on design |
| **documents** | frontend JSON POST → route is **multipart-only** (`/upload`, `req.file`) | add JSON route OR switch frontend to multipart upload | **upload approach** | BLOCKED on design |
| **sessions** | `episodeId` required (validator) — form has no episode link | episode linkage UX | **episode UX** | BLOCKED on design |
| **assessments** | `episodeId` required + `type`→`category` field/vocab mismatch | episode linkage + adapter | **episode UX** | BLOCKED on design |
| **care-plans** | `episodeId` required | episode linkage UX | **episode UX** | BLOCKED on design |

**OK (no action):** quality/capa, safety, research, field-training, inventory/items,
inventory/assets, treatment-plans, therapy-assessments, smart-goals, behavior-plans,
nutrition-plans, telehealth.

## Recommended sequencing

1. **Done now (backend, no decision):** beneficiaries ✅, icf-assessments ✅.
2. **Next (frontend, no decision):** complaints, therapy-groups — pure contract
   alignment in `api.ts`/form; ship to web-admin repo.
3. **Decision then build (branch_id surfaces):** decide branch-selection UX
   (recommend: form branch selector defaulting to the user's branch; required for
   cross-branch admins). Then vehicles, invoices, purchase-orders + the beneficiary/
   supplier/item pickers.
4. **Product/design:** hr/employees required-field set; quality/incidents target
   model; documents upload approach; sessions/assessments/care-plans episode linkage.
5. **Systemic (high leverage):** carry `branchId` in the JWT or enrich `req.user`
   from DB so branch-scoped injection works platform-wide (also hardens W926/W930).

## Design-surface options (researched 2026-06-05) — recommended option in **bold**

### hr/employees
- New fact: `POST /api/v1/hr/employees` has **no handler** (the admin router only does
  GET/PATCH). The working create route is `/api/v1/hr-module/employees`
  (`hr-module.routes.js` → `Employee.create`), but the form posts to `/api/v1/hr` and
  in camelCase vs the snake_case model.
- **Option A (recommended):** add a real `POST /employees` on `routes/hr/employee-admin.routes.js`
  reusing its existing camel→snake adapter; expand the form to collect the genuinely-
  required HR fields (national_id, date_of_birth, gender, phone, email, basic_salary,
  department[enum], specialization[enum], hire_date, contract_type[map values]); default
  branch_id from req.user. Fix the `contractType` value set (EMPLOYMENT/… → fixed/indefinite/…).
- Option B: relax national_id/dob/gender/phone/email/basic_salary/specialization to optional
  (weakens HR integrity; national_id/email carry unique indexes + GOSI/WPS assume them). Still
  needs the POST route.

### quality/incidents
- New fact: a clinical model **`models/quality/IncidentReport.js`** already has a LIVE endpoint
  `POST /api/v1/quality-module/incidents` (lifecycle-complete). The form currently hits the
  IT-ops `models/Incident.js` (SECURITY_BREACH/SYSTEM_OUTAGE…).
- **Recommended:** repoint `incidentApi` → `/api/v1/quality-module/incidents`; map the form's
  `type`(SAFETY/CLINICAL/…) → `incident_type`(fall/medication_error/…/other), `severity`
  (LOW/MED/HIGH/CRITICAL → minor/moderate/major/critical), add `title`+`incident_date`,
  default branch_id from req.user. (Alternative: build a route for `QualityIncident` which has
  first-class beneficiary-360 red-flag linkage but no endpoint today.)

### documents
- New fact: the route has **no JSON `POST /`** — only multipart `POST /upload` (multer,
  requires `req.file`). Model uses fileName/filePath/fileSize; `category` enum is **Arabic**.
- **Option B (recommended):** switch the form to a real multipart upload to `/upload` (the form
  already labels `fileUrl` as a temporary placeholder) + map English category → Arabic enum.
  Entity linkage (entityType/entityId) has no model home → separate schema extension if needed.
- Option A: add a metadata-only JSON `POST /` that stores a URL — bends a file-oriented model.

### sessions / assessments / care-plans
- New fact: validators require `episodeId`; the **episodes list endpoint + web-admin
  `episodeApi.listForBeneficiary` already exist** and are wired. The 3 forms just don't use them.
- **Option A (recommended):** add an episode selector to each form (on beneficiary select →
  `episodeApi.listForBeneficiary`, prefer active; include episodeId in payload). Pure frontend,
  no backend/validator change. Add an inline "create episode" affordance for beneficiaries with none.
- Option B: backend auto-find/create an active episode when none supplied (smoother but
  silently manufactures clinical episodes — weakens the episode-of-care model).

## Verification harness

Replay any surface against the live model before/after a fix:

```bash
cd backend && MONGODB_URI=mongodb://127.0.0.1:27017/alawael-erp node -e '<construct model with form payload; doc.validate()>'
```
