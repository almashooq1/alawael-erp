# Authorization Governance Layer — Design (GRC)

> Governance layer for the multi-branch (1 HQ + 12 branches) authorization
> system. Extends [ADR-035](decisions/035-enterprise-authorization-design.md)
> (the 5-layer authz design) + [ADR-036](decisions/036-role-archetype-reconciliation.md)
> (role archetypes) + [`role-permissions.seed.json`](role-permissions.seed.json)
> (S1–S8 SoD) + [`authz-risk-rules.json`](authz-risk-rules.json). **PostgreSQL +
> Node.js target**; the live system is Express + Mongo, so each deliverable notes
> its live-Mongo interim realization.
>
> This design was produced by a multi-agent run (7 designers → schema → an
> **adversarial GRC+PG/Node review (26 findings)** → synthesis) and the review's
> fixes are **baked into the design below**, not appended. The five corrections
> that change correctness are flagged inline as **[FIX Fn]**.

---

## 1. Governance principles

Each principle names its enforcement point — none is aspirational.

| #         | Principle                                                        | Enforcement                                                                                                                                                       |
| --------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GP-1**  | Deny-by-default + deny-overrides-allow                           | PDP combinator (already live) + `role/user_denied_permissions`; RLS `USING` returns nothing when context is unset                                                 |
| **GP-2**  | The database is the boundary, the app is defense-in-depth        | RLS `FORCE` + `NOSUPERUSER NOBYPASSRLS` app role; never a `BYPASSRLS` role **[FIX F26]**                                                                          |
| **GP-3**  | Scope is DB-derived, never app-claimed                           | `set_app_context(user_id)` looks up `is_hq`/`branch_ids` from `user_branch_roles`; **raises `NO_ACTIVE_ROLE` if the user has zero active roles** **[FIX F3]**     |
| **GP-4**  | Every privileged grant is time-bounded                           | `CHECK` rejecting `valid_until IS NULL` on `is_sensitive` perms; access-review auto-expires the rest                                                              |
| **GP-5**  | No self-approval; maker ≠ checker on every approval              | `change_request_decision` guard `decided_by <> requester`; **dual-control requires distinct archetypes, not just 2 votes** **[FIX F12]**                          |
| **GP-6**  | The audit trail is append-only + tamper-evident                  | `REVOKE UPDATE/DELETE`, `BEFORE UPDATE OR DELETE` trigger, hash chain; off-box hash-head streaming **[FIX F19]**                                                  |
| **GP-7**  | Must-survive audit is written outside the business transaction   | denies, blocked attempts, and tamper attempts go to an **autonomous-commit outbox**, never the txn that may `ROLLBACK` **[FIX F5/F7]**                            |
| **GP-8**  | Auditor is read-only, terminally                                 | S5 is `requiresApproval:false severity:block` = **no approval route exists**; a `permission_change_request` carrying `SOD_AUDIT_WRITE` is impossible **[FIX F9]** |
| **GP-9**  | Break-glass is the only path to out-of-role PHI, always expiring | RLS disjunct gated on `now() < expires_at` **and** `invoked_by = current_user`; HQ_ADMIN never eligible (DB-derived) **[FIX F4/F13/F15]**                         |
| **GP-10** | Unknown/unverifiable ⇒ deny                                      | NULL author in a SoD comparison raises, never passes **[FIX F11]**; unset/empty GUC coalesces to false                                                            |

## 2. Required tables & schema additions (PostgreSQL 15, schema `authz`)

Tables: `audit_log` (partitioned), `permission_change_request` +
`change_request_item` + `change_request_decision` + `escalation_policy`,
`delegation_assignment`, `access_review_campaign` + `access_review_item`,
`break_glass_session`, `audit_chain_checkpoint` **[FIX F18]**, and an
`audit_outbox` **[FIX F5]**.

### 2.1 `audit_log` — append-only, hash-chained, branch-RLS-exempt (D9)

```sql
CREATE TABLE authz.audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  event_type    text   NOT NULL,                 -- §3 taxonomy key
  severity      text   NOT NULL CHECK (severity IN ('info','notice','warning','critical')),
  actor_id      bigint,                           -- NULL only for system events
  target_user_id bigint, branch_id bigint, permission_key text,
  request_id    bigint, delegation_id bigint, break_glass_id uuid,
  decision      text, reason text,
  detail        jsonb NOT NULL DEFAULT '{}',
  row_hash      bytea NOT NULL,                   -- self-hash (sync)
  prev_hash     bytea, sealed_hash bytea,         -- chain (async sealer) [FIX F1]
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
-- monthly partitions; ix_audit_denies is PARTIAL on decision='deny' for hot probing scans [FIX F21]
ALTER TABLE authz.audit_log ENABLE ROW LEVEL SECURITY;       -- FORCE; insert-only for app, no branch filter
REVOKE UPDATE, DELETE, TRUNCATE ON authz.audit_log FROM authz_app;
```

**Hash chain — corrected** [FIX F1/F16/F17]:

- The `BEFORE INSERT` trigger computes `row_hash = sha256(canonical(NEW))` where
  `canonical()` is **`jsonb_build_object(...)::text` with sorted keys / length-prefixed
  fields** — never unescaped `||` concatenation (forgeable by field-shifting) and
  never raw `jsonb::text` (non-canonical across versions).
- `prev_hash`/`sealed_hash` are **back-filled by a single-writer `chain-sealer`
  worker** in commit order — the chain is inherently serial, so it is NOT computed
  inside every caller's transaction (which would serialize all 13 sites on one
  advisory lock and deadlock under a long break-glass txn).

**Tamper evidence** [FIX F18/F19]: `verify_audit_chain` runs every 15 min over the
open partition (cheap, `id > last_verified`); each `DETACH` writes a signed row to
`audit_chain_checkpoint`; `row_hash` heads stream continuously to an off-box WORM
store so the anchor isn't co-located with a potential tamperer.

### 2.2 `audit_outbox` — the must-survive path [FIX F5/F7]

```sql
CREATE TABLE authz.audit_outbox (LIKE authz.audit_log INCLUDING DEFAULTS, drained bool DEFAULT false);
```

Denies, SoD-rejection attempts, and tamper attempts are written here on a
**separate connection that commits independently**, _before_ the business txn
throws/rolls back, then drained into `audit_log` by the sealer. Without this, every
denied-access event (the entire security signal) is rolled back with the deny.

### 2.3 `permission_change_request` (+ items, decisions) — maker-checker

```sql
CREATE TABLE authz.permission_change_request (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id bigint NOT NULL, state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','approved','rejected','auto_expired','applied')),
  requires_dual bool NOT NULL DEFAULT false, fired_codes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,              -- pending TTL
  CHECK (NOT (fired_codes @> '{SOD_AUDIT_WRITE}'))   -- auditor-write is never approvable [FIX F9]
);
CREATE TABLE authz.change_request_item (        -- one row per grant in the request
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, request_id bigint NOT NULL,
  grant_kind text NOT NULL, role_id bigint, branch_id bigint, unit_id bigint,
  service_id bigint, permission_key text, resulting_grant_id bigint,
  CHECK (CASE grant_kind                         -- shape matches kind [FIX F24]
    WHEN 'branch_role'  THEN role_id IS NOT NULL
    WHEN 'unit_access'  THEN unit_id IS NOT NULL
    WHEN 'service_access' THEN service_id IS NOT NULL
    WHEN 'permission'   THEN permission_key IS NOT NULL END));
CREATE TABLE authz.change_request_decision (
  request_id bigint NOT NULL, decided_by bigint NOT NULL,
  decider_archetype text NOT NULL,               -- snapshot for dual-control [FIX F12]
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  UNIQUE (request_id, decided_by));              -- one vote per approver
```

Guards: `decided_by <> requester` (maker≠checker); on `pending→approved` when
`requires_dual`, a trigger asserts the decision set contains **≥1 HQA AND ≥1 EXD,
distinct users** (`COUNT(DISTINCT decider_archetype) over the required set`, not
`COUNT(*)`) **[FIX F12]**. `apply_change_request` is the only privileged writer to
the grant tables — `SECURITY DEFINER SET search_path = authz, pg_catalog`, owned by
a role ≠ `authz_app` **[FIX F23]**.

### 2.4 `delegation_assignment` — temporary acting-as

```sql
CREATE TABLE authz.delegation_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id bigint NOT NULL, delegate_id bigint NOT NULL CHECK (delegate_id <> delegator_id),
  permission_keys text[] NOT NULL, valid_from timestamptz NOT NULL, valid_until timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'active', CHECK (valid_until > valid_from));   -- always expires
```

Grant-power is blocked **by capability class, not literal key** — `createDelegation`
expands each delegated key/role to effective perms and rejects any resolving to the
`is_grant_power`/`policy-manage` class **[FIX F25]**. Auto-revoke fires **only when a
role change actually removes a depended-on permission** (trigger on
`UPDATE OF role_id, status OR DELETE`, re-derive effective ⊆), not on every row touch
**[FIX F20]**.

### 2.5 `access_review_campaign` + `access_review_item` — re-attestation

Campaign snapshots current non-default/elevated grants into items; reviewer (owning
manager) decides keep/revoke/modify; **closure auto-expires un-attested items**. Bulk
auto-expiry recomputes campaign counters **once at batch end** — the per-row counter
trigger is disabled for the batch to avoid a lock convoy on the campaign row **[FIX F22]**.

### 2.6 `break_glass_session` — emergency PHI read

```sql
CREATE TABLE authz.break_glass_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),         -- UUID, not guessable bigint [FIX F13]
  invoked_by bigint NOT NULL, target_beneficiary_id bigint NOT NULL, branch_id bigint NOT NULL,
  reason_code text NOT NULL, justification text NOT NULL,
  state text NOT NULL DEFAULT 'active', expires_at timestamptz NOT NULL,   -- minutes
  review_due_at timestamptz NOT NULL, reviewed_verdict text);
```

- RLS widening: `app.current_break_glass_grants()` returns true only when
  `s.invoked_by = app.current_user_id() AND s.state='active' AND now() < s.expires_at`
  and the read targets the pinned beneficiary — closes the **PHI IDOR** **[FIX F4/F13]**.
- HQ_ADMIN exclusion is enforced by a `BEFORE INSERT` trigger that **DB-derives the
  actor's archetype** from `user_branch_roles` and raises if `HQ_ADMIN` — not a
  self-declared column **[FIX F15]**.
- **PHI reads under glass are logged by the application read path** (PDP permit on a
  `*:read` while a glass session is set → outbox audit), or `pgaudit` — there is no
  SELECT-trigger; the "auto-stamped on every read" claim is dropped **[FIX F8]**.
- Post-hoc review is **self-enforcing**: the next break-glass invocation by the same
  actor is **blocked at the DB** if they have any unreviewed session past
  `review_due_at`; `ENABLE_BG_REVIEW_ESCALATOR` defaults **ON** (it's a safety
  control, not a normal sweeper) **[FIX F14]**.

## 3. Audit event taxonomy

Canonical envelope = the `audit_log` columns. Keys (`category.noun.verb`):

| Category             | event_type keys                                                                                                      | severity           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ |
| authn                | `authn.login.succeeded` / `.failed` / `authn.mfa.stepped_up`                                                         | info / notice      |
| authz_decision       | `authz.access.permitted` (sampled), `authz.access.denied`                                                            | info / **warning** |
| grant_lifecycle      | `grant.permission.applied` (one **per item** [FIX F6]), `.revoked`, `.modified`, `.expired`                          | notice             |
| approval             | `approval.request.created` / `.approved` / `.cosigned` [FIX F6] / `.rejected` / `.escalated` / `.auto_expired`       | notice             |
| delegation           | `delegation.started` / `.used` / `.revoked` / `.expired`                                                             | notice             |
| break_glass          | `break_glass.invoked` (**critical**), `.phi_accessed` [FIX F8], `.expired`, `.reviewed`                              | critical / warning |
| access_review        | `review.campaign.opened` / `review.item.attested` / `.revoked` / `.campaign_closed`                                  | info / notice      |
| policy_change        | `policy.role.changed` / `.permission.changed` / `.sod.changed` / `.threshold.changed`                                | warning            |
| **abuse (attempts)** | `abuse.sod.maker_checker_attempt`, `abuse.self_grant.attempt`, `abuse.auditor_write.attempt`, `audit.tamper.attempt` | **critical**       |

The **abuse.\*** keys are the blocked-attack signal; they are written via the
**outbox before the `RAISE`** so a blocked attempt that rolls back its txn still
leaves a trace **[FIX F7]**. A denied access is "suspicious" (→ A2) when ≥ N denies
by one actor in M minutes — computed off the partial `ix_audit_denies` index, not a
daily rollup **[FIX F21]**.

## 4. Approval workflow design

**Sensitive** (→ change-request, not auto-apply): cross-branch/HQ (`branch_id IS NULL`)
grant, any T2/T3 permission, SoD-touching, `user:role_grant:*`, branch-role for a
branch user. **State machine**: `draft → pending → {approved|rejected|auto_expired} → applied`.
The grant is **not written until `applied`**; `apply_change_request` runs post-approval.
Approver tier by sensitivity (peer/senior/`hq_security`), `reviewer ≠ requester`,
dual-control (HQA+EXD distinct archetypes) for HQ/policy changes **[FIX F12]**, pending
TTL auto-expires. Node surface: `createChangeRequest` / `approve` / `reject` — each
re-runs the risk evaluator at decision time (TOCTOU closure). Delegation service:
`createDelegation` (subset + capability-class block) / `revoke`.

## 5. Access review workflow

Quarterly baseline + event-triggered (role-change/transfer). A campaign snapshots
every elevated/non-default grant into `access_review_item`s assigned to the owning
manager; decisions keep/revoke/modify with captured justification + actor + time.
**Teeth**: at `campaign_closed`, items still `pending` are **auto-expired (revoked),
not flagged** — tying GP-4. Generation = a `SELECT` of current grants into items;
closure = a set-based revoke with counters recomputed once **[FIX F22]**; every
transition emits a `review.*` audit event.

## 6. Alerting & reporting

**Real-time alerts** (source event_type → threshold → channel/severity):

| Alert                                | Trigger                                                                 | Severity                       |
| ------------------------------------ | ----------------------------------------------------------------------- | ------------------------------ |
| Break-glass invoked                  | `break_glass.invoked` (every one)                                       | critical → security, immediate |
| Probing                              | ≥ N `authz.access.denied` by one actor / M min (index window [FIX F21]) | warning                        |
| SoD/blocked attempt                  | any `abuse.*`                                                           | critical                       |
| Cross-branch / HQ grant              | `grant.permission.applied` with `branch_id IS NULL`                     | warning                        |
| After-hours admin action             | privileged `grant/policy.*` outside business hours                      | notice                         |
| Mass-grant                           | one actor → ≥ K targets / window                                        | warning                        |
| Dormant reactivation / policy change | `policy.*`, account re-enable                                           | warning                        |

**Periodic reports** (incremental from a watermark, never full re-scan): access-review
status, grant/revoke delta, **standing-privilege aging** (sensitive grants w/ no
expiry, days old), top denied resources/actors, active-delegation register,
break-glass log + adjudication-SLA, privileged-account inventory.

## 7. Abuse prevention & separation-of-duties

**SoD (S1–S8)** enforced at the right layer, and the **risk-rule keys reconciled to
the real seed permission keys** (`beneficiary:billing:create/approve`,
`treatment_plan:plan:approve` vs author) with a CI guard asserting every
`grantingAny`/`conflictsWith`/`heldRoleAny` token resolves — the two flagship rules
were keyed to a non-existent `invoice:*`/`billing:*` namespace and silently never
fired **[FIX F10]**. Dynamic SoD triggers treat **NULL author/processor as deny**
(cannot prove separation) **[FIX F11]**. Auditor-write is terminal-reject, no approval
route **[FIX F9/GP-8]**.

**Anti-abuse beyond SoD**: grant-velocity/mass-assignment rate limit (Node, on
`grant.applied` stream); privilege-escalation detection (branch user gaining
`branch_id IS NULL`); dormant-privilege detection (granted-never-exercised → review
queue); four-eyes + maker≠checker on `rbac:policy:manage`; **separation between who
changes policy and who approves the change**; immutable audit for everyone incl.
HQ_ADMIN.

---

## Open questions / owner sign-off

- **Q1** — Audit delivery: in-DB outbox + sealer worker, or an external log pipeline
  (Kafka/WORM) as the system of record? (F5/F19 work either way; pick the substrate.)
- **Q2** — `pgaudit` for PHI-read-under-glass logging, or instrument every clinical
  read in Node? (F8.)
- **Q3** — Break-glass eligibility beyond EXECUTIVE_DIRECTOR (on-call clinical lead)?
- **Q4** — Verify cadence (15 min open-partition) + off-box anchor owner (security vs
  platform)?

## Realization roadmap (live-Mongo now vs PG target)

| Deliverable            | Live-Mongo interim                                                                                | PG target                             |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Audit trail + outbox   | extend `AuditLog` + `piiAccess.middleware`; write denies on a separate write, not the request txn | `audit_log` + `audit_outbox` + sealer |
| Grant/revoke history   | already in `AuditLog`; add per-item events                                                        | `grant_lifecycle.*`                   |
| Approval workflow      | `authorization/approvals/engine.js` (exists) + risk re-check                                      | `permission_change_request`           |
| Access review          | `intelligence/access-review.service.js` (exists) + auto-expire teeth                              | campaign tables                       |
| Delegation             | `authorization/delegations/*` (exists) + capability-class block                                   | `delegation_assignment`               |
| Denied-attempt logging | outbox-style separate write off `requireBranchAccess`/PDP denies                                  | `abuse.*` + partial index             |
| Break-glass            | `authorization/break-glass/engine.js` (exists) + IDOR fix + self-enforcing review                 | `break_glass_session`                 |

The governance **organs already exist in the live Mongo system**; this design
hardens them (the F-fixes) and gives the PG target its exact schema. Cross-refs:
ADR-035 (D6/D7/D9), ADR-036, the permissions matrix/seed, `authz-risk-rules.json`,
and [AUTHZ_MODERNIZATION_PLAN.md](AUTHZ_MODERNIZATION_PLAN.md) (how the live code
reaches this).
