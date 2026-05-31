# Enterprise Multi-Branch Authorization — Target Design

> **Status**: north-star design (see [ADR-035](decisions/035-enterprise-authorization-design.md)).
> The LIVE backend is Express + MongoDB; this is the PostgreSQL/RLS **target**.
> Each section notes its live-Mongo realization where one already exists.
> 1 HQ + 12 branches · RBAC + scope + deny + delegation + maker-checker + audit.

---

## 0. The one-paragraph thesis

Authorization is a **system layer**, not a route guard. A person's access is a
layered, time-aware, governed _profile_: RBAC decides _capability_, scope
(branch/unit/service/shift) decides _reach_, deny + SoD decide _the lines you
can't cross_, delegation decides _temporary acting-as_, and every sensitive
change is a **reviewable proposal**, not an immediate write. The database is the
inescapable boundary; the application is defense-in-depth; the admin console
makes the dangerous path slow, justified, and recorded.

---

## 1. Conceptual model (PDP / PEP / PAP / PIP)

| Component                             | Role                                                 | Realization                       |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| **PDP** — Policy Decision Point       | pure `can(ctx, permission, {branchId})` → allow/deny | `authorization.service.js`        |
| **PEP** — Policy Enforcement Point    | middleware + RLS; refuses on deny                    | `requirePermission`, RLS policies |
| **PAP** — Policy Administration Point | the admin console (this doc §6)                      | web-admin module                  |
| **PIP** — Policy Information Point    | resolver: roles → inheritance → scope − deny         | `authorization.repository.js`     |

**Capability vs scope vs constraint** — the three axes that must never be merged:

- **Capability** (RBAC): `invoice:approve`, `beneficiary:read`. Few, reusable.
- **Scope** (ABAC/PBAC): _where_ — branch, unit, service, shift. Lives in rows.
- **Constraint**: deny (absolute), SoD (mutually-exclusive), time (validity).

A decision is `ALLOW iff (some role grants P) AND (scope covers the row) AND
(no deny matches) AND (no SoD violated) AND (now ∈ validity)`. Deny and SoD are
evaluated **last and win**.

---

## 2. PostgreSQL schema (≈20 tables, schema `authz`)

Normalized; each scope dimension is its own junction; **no JSON** in the authz
structure (auditability + FK integrity + indexing).

```
identity            roles & perms          scope (per dimension)
──────────          ─────────────          ────────────────────
users               roles                  user_branch_roles      (user × role × branch, validity)
user_profiles       permissions            user_unit_access
                    role_permissions       user_service_access
branches            role_hierarchy         user_shift_assignments
units               role_denied_perms      user_scope_overrides   (grant|deny exception, time-boxed)
services
                    exceptions             governance
                    ──────────             ──────────
                    user_denied_perms      delegation_assignments (temporary acting-as, always expires)
                                           permission_change_requests (maker-checker)
                                           sod_constraint         (mutually-exclusive perms/roles)
                                           audit_log              (append-only, hash-chained)
```

Key modeling rules (→ ADR-035 D1/D2):

- `roles.scope_level ∈ {global, region, branch}` — the _tier only_; the branch
  binding lives in `user_branch_roles.branch_id`.
- **HQ = `branch_id IS NULL`** on a `global`-tier grant. There is no "HQ branch"
  row. `branches.is_headquarters` marks the _place_, not the _scope_.
- `role_hierarchy(parent_role_id, child_role_id)` → inheritance resolved by a
  recursive CTE `role_closure` at read time (no denormalized closure to drift).
- PG15 niceties: `GENERATED ALWAYS AS IDENTITY`, `UNIQUE NULLS NOT DISTINCT`
  (so one `(user, role, NULL-branch)` grant is unique), generated `is_active`
  columns from validity windows, `num_nonnulls()` CHECKs for "exactly one scope
  target."

---

## 3. Row-Level Security (the inescapable boundary — ADR-035 D4/D5)

```sql
-- every tenant table:
ALTER TABLE clinical_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_note FORCE ROW LEVEL SECURITY;   -- table owner is NOT exempt

CREATE POLICY branch_isolation ON clinical_note
  USING (
    app.current_app_is_hq()                            -- HQ sees all
    OR branch_id = ANY (app.current_app_branch_ids())  -- else only my branch set
  );

-- transaction-scoped context (NOT session — pooled-connection safe):
CREATE FUNCTION app.set_app_context(p_user_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = authz, app, pg_temp AS $$
BEGIN
  -- scope is DB-derived from user_branch_roles, NOT trusted from the app:
  PERFORM set_config('app.user_id',    p_user_id::text, true);          -- is_local = true
  PERFORM set_config('app.is_hq',      (…lookup…)::text, true);
  PERFORM set_config('app.branch_ids', (…lookup csv…),   true);
END $$;

-- fail-closed readers:
CREATE FUNCTION app.current_app_is_hq() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.is_hq', true)::boolean, false);  -- missing ⇒ false
$$;
```

Non-negotiables:

- App connects as a **`NOSUPERUSER NOBYPASSRLS`** role — even a forgotten
  `WHERE` returns only in-scope rows.
- Context is **transaction-local** (`is_local = true`) — a returned pooled
  connection carries no stale scope.
- An **un-stamped** connection (`current_setting(...,true)` is NULL) → coalesce
  to `false`/empty → **sees nothing**. Fail-closed by construction.
- `audit_log` has its own policy: append-only, readable by HQ/security, exempt
  from branch isolation (it records cross-branch denials).
- RLS migrations run **last** in the ordering (after the data is denormalized).

**Live-Mongo realization**: there is no RLS. The substitute is (a) `branchId`
denormalized onto every tenant collection, (b) `branchFilter(req)` injected into
every `find` **and** every `.aggregate()` `$match`, (c) the `tenantScope` plugin
for find-paths, (d) two drift/audit tools that fail CI when an aggregate or a
route slips the net. This is weaker than RLS (it relies on the developer +
guards, not the engine) — hence ADR-035 is 🟡.

---

## 4. Node/Express authorization service (ADR-035 D6/D8)

```
authorization/
  permissions.registry.js     // P = Object.freeze({...}); ALL; assertRegistryMatchesDb()
  authorization.service.js     // resolveSecurityContext(); pure can(ctx, perm, {branchId})
  authorization.repository.js  // recursive CTE role_closure; deny aggregation
  middleware/
    authenticate.js            // authN ONLY (who) — separate file, separate concern
    requirePermission.js       // authZ (what) — calls PDP; auto-enforces tier-2 for SENSITIVE
    requireAssurance.js        // step-up MFA freshness windows {2:15m, 3:5m}
  withRequestContext.js        // opens txn, set_app_context, runs handler, COMMITS before res.json
  scoped.js                    // handler wrapper → makes RLS un-forgettable
  risk/evaluate.js             // pure dangerous-combination engine (§7)
  audit.service.js             // record() fire-and-forget + recordSync() awaited
```

Doctrine:

- **Permissions are centralized** — `P.INVOICE_APPROVE`, never the string
  `'invoice:approve'` scattered in routes. `assertRegistryMatchesDb()` is a
  drift guard (the live-Mongo twin already exists as the reason-codes registry
  pattern).
- **authN ⟂ authZ** — `authenticate` answers _who_; `requirePermission` answers
  _what_. Never the same middleware.
- `can()` is **pure** and **deny-biased** — given the resolved context it
  branches on no I/O; deny and SoD short-circuit to `false`.
- The **`scoped()` wrapper** runs the handler's DB work inside
  `withRequestContext` and **commits before `res.json`** — avoiding the
  `res.on('finish')` commit-after-send anti-pattern, so a developer cannot
  forget to establish RLS scope.
- Sensitive mutation → `202 + change_request_id` (not a write). See §6/§7.

---

## 5. Decision flow (request → allow/deny)

```
request
  │  authenticate            → req.user (who)            [authN]
  ▼
withRequestContext           → BEGIN; set_app_context(user)   [scope from DB, not claims]
  │
  ▼
requirePermission(P.X)       → resolveSecurityContext()       [PIP: roles+inheritance−deny]
  │                            → can(ctx, P.X, {branchId})    [PDP, pure, deny-biased]
  │                            → SENSITIVE ⇒ requireAssurance(2) [step-up MFA]
  ▼ allow
handler (scoped)             → DB work sees ONLY in-scope rows [RLS = PEP]
  │
  ▼
COMMIT  →  res.json          → audit.record(decision)         [D9: append-only, hash-chained]
```

Any deny at any stage → `403` + `audit.recordSync(denied)` (denials are awaited,
never lost). A sensitive _change_ → not executed; a `permission_change_request`
is created and the response is `202`.

---

## 6. Admin console (PAP) — the access administration UX

Not a user form with a roles dropdown. Three workspaces mirroring the data model:

```
A. DIRECTORY → USER ACCESS PROFILE (dimension-tabbed)   the subject
B. APPROVALS INBOX        (maker-checker queue)         the governance
C. AUDIT EXPLORER         (global access history)       the evidence
```

### 6.1 Principles

1. **Separation = navigation** — Identity / Branch-Roles / Scope / Exceptions /
   Delegation / History, each its own editor + save + audit trail.
2. **Effective access is first-class** — the profile opens on a read-only
   "what can this person actually do, right now" panel (resolver output).
3. **Sensitive change = a proposal** — cross-branch/HQ/SoD edits become a
   change-request; the maker sees _pending_, never a silent apply.
4. **Time is visible everywhere** — validity windows, expiring colour,
   delegation inherently temporary.
5. **Guardrails inline** — dangerous combinations detected as the admin builds
   the change (§7), severity-coded to block / justify / approve.

### 6.2 Screens

Directory · Create-User wizard · **Access Profile** (Overview / Identity /
Branch-Roles / Scope / Exceptions / Delegation / History) · Approvals Inbox ·
Change-Request Detail · Audit Explorer · Roles & Permissions Catalog ·
Delegation Center · Access-Review Campaigns.

### 6.3 Wireframe — User Access Profile

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← دليل المستخدمين      سارة العتيبي · أخصائية نطق · فرع الرياض      [● نشط]    │
│  ⚠ تنبيه: تخويل بلا تاريخ انتهاء (1) · يتطلّب مراجعة                            │ ← RiskBanner
├──────────┬───────────────────────────────────────────────────────────────────┤
│ نظرة عامة│  ┌─ الصلاحيات الفعلية (كما هي الآن) ──────────────────────────────┐ │
│ الهوية   │  │  النطاق: فرع الرياض            HQ: لا                          │ │
│ الأدوار  │  │  يقرأ: المستفيدون، الجلسات، التقييمات                          │ │
│ النطاق   │  │  يكتب: جلسات النطق، أهداف SMART                                │ │
│ الاستثناء│  │  ممنوع: الفوترة (منع صريح)                                     │ │ ← EffectiveAccessPanel
│ التفويض  │  └────────────────────────────────────────────────────────────────┘ │
│ السجل    │  ┌─ مؤشرات المخاطر ───────────────────────────────────────────────┐ │
│          │  │  🟡 تخويل دائم بلا مدة — اقترح نافذة صلاحية                     │ │
│          │  │  🟢 لا تعارض في الفصل بين المهام                                │ │
│          │  └────────────────────────────────────────────────────────────────┘ │
└──────────┴───────────────────────────────────────────────────────────────────┘
```

### 6.4 Wireframe — Branch-Roles editor (mid-change, risk gating)

```
┌─ الأدوار حسب الفرع ──────────────────────────────────────────────────────────┐
│  أخصائية نطق        · فرع الرياض   · صالح: دائم            [مراجعة] [إلغاء]    │
│  ─────────────────────────────────────────────────────────────────────────── │
│  + إضافة دور:  [ مدير فرع ▾ ]  الفرع: [ كل الفروع ▾ ]  صالح حتى: [ ____ ]      │
│                                                                                │
│  🔴 تصعيد صلاحيات: منح دور عام (كل الفروع) لمستخدم على مستوى فرع.              │ ← evaluate-risk
│     يتطلّب اعتماداً من أمن المعلومات.  سبب التغيير (مطلوب): [ _____________ ]   │
│                                                                                │
│                                   [ إرسال للاعتماد ]  ← (بدّل من "تطبيق")       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Wireframe — Approvals Inbox (checker)

```
┌─ صندوق الاعتمادات ───────────────────────────────  [ بانتظاري (4) | طلباتي (2) ]┐
│ # 9911  منح "مدير فرع · كل الفروع" → سارة العتيبي     🔴 تصعيد   منذ ٢٠ دقيقة   │
│ # 9908  منع "الفوترة" → خالد المطيري                  🟢 روتيني  منذ ساعة       │
│ ───────────────────────────────────────────────────────────────────────────── │
│ ▸ مراجعة #9911:                                                                 │
│   الحالي:   أخصائية نطق · فرع الرياض                                            │
│   المقترح:  + مدير فرع · كل الفروع · بلا مدة                                     │ ← ProposedChangeDiff
│   المخاطر:  🔴 تصعيد صلاحيات · 🟡 تخويل دائم بلا مدة                            │ ← re-evaluated NOW
│   مقدّم الطلب: ليلى (لا يمكنها اعتماد طلبها)                                     │
│   قرارك: [ اعتماد ]  [ رفض ]   السبب: [ ________________ ]   🔐 تحقّق ثنائي     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.6 API contracts (store-agnostic; sensitive ⇒ `202`)

```
GET   /api/admin/users?branch=&role=&status=&risk=&page=   → { data, page }
GET   /api/admin/users/:id/effective-access                → resolver output
GET/POST/DELETE /api/admin/users/:id/branch-roles | unit-access | service-access
              | shift-assignments | denied-permissions | scope-overrides
GET/POST        /api/admin/users/:id/delegations  · POST .../:did/revoke
POST  /api/admin/access/evaluate-risk  { userId, op, payload } → { findings, decision }
GET   /api/admin/change-requests?status=&assignedTo=me     → [ChangeRequest]
POST  /api/admin/change-requests/:id/approve | reject      { decisionReason, mfaToken }
GET   /api/admin/audit?actor=&branch=&action=&from=&to=    → [AuditEvent]
```

A sensitive write returns:
`202 { status:"pending_approval", change_request_id, findings:[…] }`.

### 6.7 Validation rules (server is the authority)

- Identity: email unique + format; Saudi national-id pattern; status transitions
  guarded.
- Branch-role: branch active; `role.scope_level ↔ branch` (branch-tier needs a
  branch; `NULL` branch = HQ, **global-admin only**); `valid_until > valid_from`;
  no duplicate active `(user, role, branch)`.
- Scope: unit/service must belong to a branch the user already holds a role at.
- Delegation: `from ≠ to`; `valid_until` **mandatory** (always expires);
  delegated role ⊆ delegator's own grants.
- Deny: reason ≥ 8 chars; labelled _absolute_.
- Change request: justification required; **`reviewer ≠ requester`**.
- Self-edit: an admin **cannot apply** changes to their own access.

### 6.8 Arabic UI text — see the table in §6.3–6.5 wireframes; canonical strings:

إدارة المستخدمين والصلاحيات · دليل المستخدمين · ملف الوصول · الهوية والملف
الشخصي · الأدوار حسب الفرع · نطاق الوصول · الوحدات/الخدمات/الورديات ·
الاستثناءات · منع صريح (مُلزِم) · التفويض المؤقت · الصلاحيات الفعلية · صلاحية
عامة (المقر الرئيسي) · صالح من/إلى · غير محدّد المدة · سبب التغيير (مطلوب) ·
إرسال للاعتماد · صندوق الاعتمادات · بانتظار الاعتماد · اعتماد/رفض · سجل الوصول ·
تحذير: تعارض في الفصل بين المهام · تصعيد صلاحيات — يتطلّب اعتماداً · لا يمكنك
تعديل صلاحياتك الخاصة · يتطلّب تحقّقاً إضافياً (تحقّق ثنائي).

---

## 7. Risk-rule engine (D7) — dangerous-combination detection

**Rules are data, not branching code.** They live in `sod_constraint` (+ a small
set of engine invariants) and are evaluated by a pure function
`evaluate(change, currentAccess, rules) → { findings, decision }`, deny-biased,
run identically on the client preview (`POST /evaluate-risk`) and the server
gate. Adding a rule is an INSERT, not a deploy.

The full catalog is data: [`authz-risk-rules.json`](authz-risk-rules.json).
Summary:

| code                      | kind          | severity | flow                                  |
| ------------------------- | ------------- | -------- | ------------------------------------- |
| `SOD_MAKER_CHECKER`       | sod           | block    | block; or SoD-exception → hq_security |
| `SOD_CLINICAL_BILLING`    | sod           | block    | block                                 |
| `SOD_AUDIT_WRITE`         | sod           | block    | block                                 |
| `ESC_BRANCH_TO_HQ`        | escalation    | warn     | justify → senior                      |
| `ESC_GRANT_OF_GRANT`      | escalation    | warn     | justify → hq_security                 |
| `SCOPE_ALL_BRANCHES`      | scope_breadth | warn     | justify; suggest region               |
| `SCOPE_ACCUMULATION`      | scope_breadth | info     | review banner                         |
| `SELF_ESCALATION`         | self          | block    | force cross-approval                  |
| `STANDING_PRIVILEGE`      | standing      | warn     | nudge validity window                 |
| `DENY_ORPHANS_WORKFLOW`   | deny_orphan   | warn     | confirm intent                        |
| `CRITICAL_GRANT_EXPIRING` | expiry        | info     | one-click extend → approval           |

Engine contract:

```js
// deny-bias: any block ⇒ blocked; else any approval-requiring finding ⇒ requires_approval
return {
  findings,
  decision: worst === 'block' ? 'blocked' : findings.some(f => f.requiresApproval) ? 'requires_approval' : 'apply_direct',
};
```

The checker re-runs the **same** evaluator at approve-time — a rule that was
`warn` at propose-time may be `block` by then (TOCTOU closed). Every finding
shown, every override-despite-warn, and every approve/reject is written to
`audit_log` with the rule `code`.

**Live-Mongo realization**: this is the severity-graded, data-driven
generalization of the existing `authorization/sod/domain-rules.js` + the
maker-checker / break-glass engine + the `requireMfaTier` step-up (ADR-019).
Not net-new conceptually — a lift of primitives already running into one
declarative, auditable rule set.

---

## 8. Realization roadmap (design → running)

| Step                                                             | Scope       | Status                           |
| ---------------------------------------------------------------- | ----------- | -------------------------------- |
| Branch denormalization on tenant collections                     | Mongo       | ✅ in progress (W613/W661/W665…) |
| `audit:untenanted-aggregations` + `audit:unauthenticated-routes` | Mongo       | ✅ shipped this session          |
| `UserBranchRole` wired into `requireBranchAccess`                | Mongo       | ✅ W597 (env-gated)              |
| SoD rules → severity-graded data engine                          | Mongo       | ⬜ Q2                            |
| Admin console on web-admin (Next.js 15)                          | web-admin   | ⬜ Q3                            |
| PostgreSQL schema + RLS + Node PDP                               | new backend | ⬜ Q1 (funded cutover)           |

See [ADR-035](decisions/035-enterprise-authorization-design.md) for the decision
record, alternatives considered, and open questions Q1–Q4.
