# 34 — Governance & Auditability Layer (Wave 26)

> **القاعدة الحاكمة**: اللوحة يجب أن تكون مناسبة لبيئة مؤسسية متعددة الفروع، مع متطلبات تدقيق ومساءلة كاملة.
>
> **Governing rule**: The platform must be suitable for a multi-branch enterprise with full audit + accountability requirements.

This wave doesn't add features users see directly. It ties together every prior layer into an enterprise-grade governance contract — so the platform passes a CBAHI / PDPL / ISO 9001 audit without exception.

---

## 1. The 9 governance requirements mapped to mechanics

| #   | Requirement                       | How we enforce it                                                                                                                                                                                                              |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Permission-aware widgets**      | Every widget element (Wave 24 layout-policy) declares `requiredPermissions[]`. The widget resolver hides any widget the user lacks permission for.                                                                             |
| 2   | **Sensitive data masking**        | Every Mongo field tagged with `sensitivity ∈ {clinical_phi, financial, hr_compensation, pii_identifiers}`. The governance service applies the role's `restrictedData` filter at query time.                                    |
| 3   | **Audit trail visibility**        | Every state change writes to `AuditLog`. A new `GET /api/v1/governance/audit-trail/:entityType/:entityId` endpoint reads it back, decorated with user names + diffs.                                                           |
| 4   | **Action logging**                | Every operator action (acknowledge, confirm, dismiss, drill, action.invoke) is already logged through prior waves. Wave 26 unifies the contract: every action goes through `governance.logAction()` so we have ONE chokepoint. |
| 5   | **Approval status visibility**    | Every record that needs approval (invoice, care plan, leave) declares `approvalState: { stage, status, history[] }`. Widget renders a status pill + click-to-history drawer.                                                   |
| 6   | **Role-based display rules**      | Inherited from [[role-profiles-2026-05-17]] (Wave 23 maskForRole) + [[cognitive-load-framework-2026-05-17]] (Wave 24 targetRoleGroups). Governance layer is the policy combiner.                                               |
| 7   | **Compliance-aware presentation** | Per data kind: a declarative banner config (PHI banner under PDPL Art.13, financial-sensitive banner, etc.). Always rendered when the matching data is on screen.                                                              |
| 8   | **Exception review patterns**     | [[productivity-features-2026-05-17]] (Wave 25) ships the exception review center. Wave 26 specifies the _sign-off_ contract: each reviewed exception must have an `acknowledgedAt + acknowledgedBy + decisionAr` recorded.     |
| 9   | **Who changed what and when**     | The audit-trail endpoint returns a unified timeline merging AuditLog + state.transitions (Wave 11 alerts) + feedback events (Wave 18 insights) into one chronological feed per entity.                                         |

---

## 2. The permission model

### 2.1 Permission codes

Every permission is a dot-separated code: `domain.subdomain.action`.

```
finance.invoices.view
finance.invoices.approve
finance.zatca.submit

clinical.care-plans.view
clinical.care-plans.approve
clinical.assessments.sign

hr.employees.view
hr.employees.terminate
hr.payroll.approve

quality.incidents.view
quality.incidents.create
quality.capa.close

compliance.dsar.view
compliance.dsar.respond

governance.audit-trail.read
governance.audit-trail.export

ops.alerts.acknowledge
ops.alerts.mute
ops.insights.confirm
```

A user's effective permission set = the union of permissions across all their canonical roles (a user can hold multiple roles).

### 2.2 Permission → role mapping

The registry maps each permission code to the **set of role groups** that hold it:

```javascript
'finance.invoices.approve': ['finance', 'head_office', 'executive_leadership'],
'clinical.assessments.sign': ['clinical_supervisor'],
'hr.payroll.approve': ['hr', 'finance'],          // dual oversight
'governance.audit-trail.read': ['quality_compliance', 'executive_leadership'],
```

### 2.3 Widget gating

Every Wave 24 layout-element gains an optional `requiredPermissions: []` array. The dashboard resolver does:

```
for each element in dashboard:
  if element.requiredPermissions.length > 0:
    if not user holds ALL of those permissions:
      hide the element (don't even send to UI)
```

This is **stronger than `revealOn`**. Tier-3 elements may be hidden but still loaded; permission-blocked elements never leave the server. Useful for finance widgets that contain PHI-adjacent data.

---

## 3. Sensitivity classification

Every field that crosses an API response gets tagged. The fieldKindMap from Wave 23 is the index:

```
clinical_phi      diagnosis, treatment_notes, assessment_scores
financial         invoice_amount, payment_method, claim_data
hr_compensation   salary, allowances, bonuses
pii_identifiers   national_id, phone, full_address
business_secret   acquisition_pricing, vendor_contracts
```

The governance service exposes:

- `maskForCompliance(payload, viewer, fieldKindMap)` → strips fields the viewer's role can't see
- `redactForLLM(payload)` → strips ALL sensitivity-tagged fields before sending to a 3rd-party LLM (Anthropic, OpenAI). This is a hard rule: no clinical/financial/HR data ever leaves the platform to an LLM context unless explicitly redacted.

---

## 4. Audit-trail visibility

### 4.1 The unified timeline

`GET /api/v1/governance/audit-trail/:entityType/:entityId` returns a single chronologically merged feed:

```
events:
  - kind: 'audit-log'          (from AuditLog collection)
    at, actorUserId, actorRole, action, ipAddress, metadata
  - kind: 'state-transition'   (from alert.state.transitions / care-plan history)
    at, from, to, byUserId, byRole, reason
  - kind: 'feedback'           (from insight.feedback)
    at, kind: 'confirmed'|'dismissed'|'note', byUserId
  - kind: 'comment'            (from alert.comments / annotation)
    at, byUserId, byRole, text
  - kind: 'approval'           (from approval workflows)
    at, stage, decision: 'approved'|'rejected', byUserId
```

Sorted DESC. Filterable by event kind. Paginated.

### 4.2 Diff visibility

For state changes, the response includes a structural diff:

```
{
  kind: 'state-transition',
  at: '2026-05-17T10:30:00Z',
  actorUserId: 'u-123',
  actorName: 'Ahmed Al-Rashid',     // resolved at read time
  actorRole: 'branch_manager',
  field: 'state.current',
  from: 'OPEN',
  to: 'ACKNOWLEDGED',
  reason: 'Investigating with transport team',
  ipAddress: '10.0.0.42',           // when present
}
```

Permission gate: the audit-trail endpoint requires `governance.audit-trail.read` (held by `quality_compliance` + `executive_leadership` by default). Other roles see only their own actions on the entity.

### 4.3 Export for regulator

`GET /api/v1/governance/audit-trail/:entityType/:entityId/export?format=csv|json` returns a sealed export with the audit-log hash chain (already implemented in [[phase_8_start_2026-04-22]] audit-hash-chain-service.test.js). Required by CBAHI auditors.

---

## 5. Compliance banners

Declarative config per data kind:

```javascript
{
  clinical_phi: {
    bannerAr: 'بيانات صحية محمية — كل عرض يُسجّل (PDPL م.13)',
    bannerEn: 'PHI present — every view is audited (PDPL Art.13)',
    severity: 'must-display',
    requiresAuditLog: true,
    auditAction: 'pii.access',
  },
  financial: {
    bannerAr: 'بيانات مالية حساسة — استخدام داخلي فقط',
    bannerEn: 'Sensitive financial data — internal use only',
    severity: 'should-display',
    requiresAuditLog: true,
    auditAction: 'finance.access',
  },
  hr_compensation: {
    bannerAr: 'بيانات تعويض — لا تشارك خارجياً',
    bannerEn: 'Compensation data — do not share externally',
    severity: 'must-display',
    requiresAuditLog: true,
    auditAction: 'hr.compensation.access',
  },
  pii_identifiers: {
    bannerAr: 'معرفات شخصية — تعامل بسرية',
    bannerEn: 'Personal identifiers — handle confidentially',
    severity: 'should-display',
    requiresAuditLog: false,
    auditAction: null,
  },
}
```

The UI calls `GET /api/v1/governance/banners?dataKinds=clinical_phi,financial` and renders the union of banners. Backend records the `pii.access` AuditLog entry automatically when a route returns `clinical_phi` data and the viewer is not the patient.

---

## 6. Approval state contract

Every record that needs approval implements this sub-document:

```
approvalState: {
  stage: 'draft'|'pending-review'|'approved'|'rejected'|'expired',
  currentStep: number,         // 1, 2, 3... matches workflow definition
  totalSteps: number,
  approvedBy: [
    { userId, role, at, decision: 'approved'|'rejected', reasonAr? }
  ],
  pendingFromRole: roleGroupKey | null,
  expiresAt: Date | null,
}
```

The widget renders:

- A **status pill** (4 colors: gray draft / amber pending / green approved / red rejected)
- A **stepper** showing N/M steps
- An **expand button** that opens an approval-history drawer

The status pill is also a permission gate — clicking it triggers `approve/reject` actions which require the role-specific permission (e.g. `finance.invoices.approve`).

---

## 7. Exception sign-off contract

Every exception reviewed in the [[productivity-features-2026-05-17]] Exception Review Center must result in an explicit decision:

```
{
  exceptionId, reviewedAt, reviewedBy: userId, reviewedRole: roleGroup,
  decision: 'accepted'|'rejected'|'requires-followup',
  decisionAr: 'تم التعامل' | 'تم رفضه' | 'يحتاج متابعة',
  decisionEn: ...,
  followUpId?: when decision = 'requires-followup', auto-creates a FollowUp
                (Wave 25 productivity layer) with dueBy 7d.
}
```

The review center UI prevents leaving without a decision per exception. Backend rejects empty decisions.

---

## 8. Multi-branch enterprise specifics

- **Cross-branch visibility** requires `branch-access:cross` permission. Default holders: `executive_leadership`, `head_office`, `quality_compliance`.
- **Branch-scoped users** (most roles) see ONLY their assigned branch's data. The query layer enforces this — no UI flag toggling.
- **Regional roles** (`regional_director`, `regional_quality`) see a configured subset of branches via `user.regionBranchIds`.
- **Tenant-bypass roles** (`super_admin`, `head_office_admin`) see everything; their views are flagged with a visual cue ("Org-wide view") to remind them of the responsibility.
- Every cross-branch query writes a `cross-branch.access` AuditLog entry — auditors love this.

---

## 9. Wave 26 deliverables (this PR)

- [x] Design doc (this file)
- [ ] `backend/intelligence/governance.registry.js` — permission codes + role→permission mapping + compliance banner catalog + sensitivity classifications
- [ ] `backend/intelligence/governance.service.js`:
  - `hasPermission(canonicalRole, code)` / `hasPermissions(role, codes)` / `getUserPermissions(role)`
  - `filterWidgetsByPermissions(widgets, role)` (consumes Wave 24 layout elements)
  - `maskForCompliance(payload, canonicalRole, fieldKindMap)` (alias of Wave 23 maskForRole + extended)
  - `redactForLLM(payload, fieldKindMap)` — strict, no PII to LLM
  - `getBannersForDataKinds([kinds])` — UI banner config
  - `recordAccess({ kind, viewerId, entityType, entityId })` — emits AuditLog
- [ ] `backend/routes/governance.routes.js`:
  - `GET /api/v1/governance/permissions/me` — user's effective permission set
  - `GET /api/v1/governance/permissions/check?codes=...` — pass/fail check
  - `GET /api/v1/governance/banners?dataKinds=...` — compliance banners
  - `GET /api/v1/governance/audit-trail/:entityType/:entityId` — unified timeline
  - `GET /api/v1/governance/audit-trail/:entityType/:entityId/export?format=` — sealed export
- [ ] Tests covering: permission resolution, widget filtering, masking, LLM redaction, banners, audit-trail merge
- [ ] Wire into `app.js` (always-on)

---

## 10. Drift guards

1. **Every widget element in `layout-policy.registry` that touches sensitive data declares `requiredPermissions[]`.**
   Drift test: any element whose `refKpiId` matches a finance/clinical/hr KPI MUST list a corresponding permission.

2. **Every canonical role from `roles.constants.js` holds at least one permission.**
   Drift test: a role with zero permissions would be unusable.

3. **Every compliance banner's `auditAction` is unique** so we can count distinct access kinds in dashboards.

4. **No 3rd-party LLM call ships without going through `redactForLLM`** — enforced via a lint rule (Wave 27) that flags `anthropic.messages.create(...)` calls missing the redact preprocessor.

These guards make governance non-negotiable. The team can't ship a feature that bypasses the audit log or leaks sensitive data — the build refuses.
