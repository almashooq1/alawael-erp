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

## Verification harness

Replay any surface against the live model before/after a fix:

```bash
cd backend && MONGODB_URI=mongodb://127.0.0.1:27017/alawael-erp node -e '<construct model with form payload; doc.validate()>'
```
