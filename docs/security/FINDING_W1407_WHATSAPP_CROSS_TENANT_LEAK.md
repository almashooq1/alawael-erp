# Security Finding W1407 — WhatsApp admin surface: cross-tenant PII leak (org-scope on a branch-scoped platform)

- **Severity:** 🔴 CRITICAL (confidentiality — PDPL personal-data breach class)
- **Status:** Open — verified end-to-end, NOT yet fixed
- **Found:** 2026-06-17 (adversarial audit of live surfaces)
- **Surface:** `backend/routes/whatsapp.routes.js` (entire file) + `backend/services/whatsapp/whatsappWebhook.service.js`
- **Owner-of-record:** the WhatsApp workstream (W1372 / W1380–W1384). This finding is filed in `docs/security/` and touches **no** code in that workstream — the coordinated fix is the owner's to apply (it spans a tenancy-model decision + 29 read sites + the webhook write path).

---

## TL;DR

Every authenticated user — any role, any branch — can read **every** WhatsApp conversation in the system, including beneficiary names, family/guardian names, and phone numbers. The route layer *appears* to isolate by `organizationId`, but `organizationId` is a field this platform never sets — neither on the JWT/`req.user` nor on the conversation documents. The isolation predicate is therefore a permanent no-op that **fails open**.

Root cause is a **design mismatch**, not a typo: the WhatsApp surface was written for a multi-**organization** tenancy model, but this platform is multi-**branch** (`branchId`). The grafted `organizationId` axis is dead on both sides of every query.

---

## Evidence (verified, not inferred)

### 1. The scoping predicate never fires (read side)

`backend/routes/whatsapp.routes.js`, `/conversations` handler (~line 221) and **29 sites** across the file:

```js
const filter = {};
if (req.user?.organizationId) filter.organizationId = req.user.organizationId;
// ... Conversation.find(filter) ...
```

`req.user.organizationId` is **always `undefined`**. The only thing the auth layer adds beyond the decoded JWT is an id alias:

`backend/middleware/auth.js` (~line 19):

```js
function aliasUserId(decoded) {
  if (decoded && decoded.id && !decoded._id) decoded._id = decoded.id;
  return decoded;            // <-- copies id -> _id ONLY. No organizationId.
}
```

And the User model has **no `organizationId` field at all** — it carries `branchId` (`backend/models/User.js:53`) and `branchIds` (`:73`). So `req.user?.organizationId` can never be truthy → `filter` stays `{}` → `Conversation.find({})` returns **all tenants' conversations**.

The route file mounts only `router.use(authenticate)` — there is **no** `requireBranchAccess` and no `branchFilter(req)` anywhere in it.

### 2. The scope fields are never populated (write side)

Conversations are created by the Meta webhook, which has no user context. `backend/services/whatsapp/whatsappWebhook.service.js` (~line 288):

```js
conv = await Conversation.findOneAndUpdate(
  { phone: fromPhone, ...(beneficiaryId ? { beneficiaryId } : {}) },
  { $setOnInsert: { phone: fromPhone, /* ... */ beneficiaryId /* ... */ } },
  { upsert: true, returnDocument: 'after' }
);
```

`$setOnInsert` sets `phone` and `beneficiaryId` but **neither `organizationId` nor `branchId`**. So even if the route predicate were active, it would match nothing — the isolation is broken from **both** ends.

### 3. The model *can* be scoped — fields exist, just unused

`backend/models/WhatsAppConversation.js` declares `organizationId` (`:134`) **and** `branchId` (`:139`), plus scoped helpers (`byIdScopedFilter(id, orgId)`, `listScoped`). The plumbing for isolation exists; it was simply keyed on the wrong (org) axis and never wired to the populated (branch) axis.

---

## Exploit (no special role needed)

1. Authenticate as any user (lowest-privilege role at any branch).
2. `GET /api/v1/whatsapp/conversations` → returns conversations for **all** branches.
3. Each row exposes `phone`, `beneficiaryId` (→ name), and message history (family/guardian names, clinical context in free text).

This is a horizontal-privilege / IDOR-class confidentiality breach across the entire branch tenancy boundary. Same pattern affects every list/read endpoint in the file (29 sites share the dead `organizationId` predicate).

**Blast radius:** all WhatsApp conversation + message data, all branches. PII categories: contact phone numbers, beneficiary identity, family member names, free-text clinical/social content. This is exactly the data class W269 (cross-branch isolation) exists to wall off.

---

## Why this slipped past existing guards

- **W269h** (`no-broken-req-branchid-wave269h`) fails CI on reads of `req.branchId`. This code reads `req.user.organizationId` — a *different* never-set field — so the guard's pattern doesn't match it. The guard catches the known-bad spelling, not novel dead-scope axes.
- Static drift guards check source *shape*, not runtime *effect* (the W385 lesson). A predicate that "looks like" scoping passes every static check while being a runtime no-op. Only running it as an unprivileged user reveals the open door.

---

## Recommended fix (coordinate with the WhatsApp workstream owner)

The correct tenancy axis on this platform is **`branchId`**, per the W269 doctrine. Three coordinated changes:

1. **Write side — populate `branchId` at creation.** In `whatsappWebhook.service.js`, when a `beneficiaryId` resolves, derive its branch and add `branchId` to `$setOnInsert` (and backfill existing rows by joining on `beneficiaryId`). Conversations with no resolvable beneficiary need a deliberate default-branch / quarantine decision — **this is the owner's tenancy-model call**, which is precisely why this is a finding, not a unilateral patch.

2. **Read side — replace the dead predicate at all 29 sites** with the W269-correct pattern:
   ```js
   const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
   const branchId = effectiveBranchScope(req);            // ignores ?branchId= spoofing
   const filter = { ...(branchId && { branchId }) };       // {} only for cross-branch roles
   ```
   For id-keyed reads (`/conversations/:id`), add `assertBranchMatch(req, doc.branchId, 'WhatsApp conversation')` after the lookup.

3. **Middleware — add `requireBranchAccess`** to the router so explicit foreign-`branchId` requests are rejected at the edge, as defense-in-depth.

**Fail-closed caveat:** applying step 2 before step 1's backfill makes restricted users see *nothing* (every conversation has `branchId: undefined`). The backfill must land first, or in the same change, to avoid trading a confidentiality bug for an availability bug.

## Suggested regression guard (close the class, not just the case)

Extend the W269h drift guard (or add a sibling) to flag **any** `req.user.<field>` used as a tenancy predicate where `<field>` is never assigned by middleware — i.e. treat `organizationId` (and any other unset scope axis) as a dead-scope smell, not just the `req.branchId` spelling. A behavioral counterpart should boot the route under an unprivileged JWT and assert a foreign-branch conversation is **not** returned.

---

## Disposition

- Do **not** ship a blind 29-site rewrite from outside the workstream — the fix needs (a) the branch-derivation rule for beneficiary-less conversations and (b) backfill ordering, both owned by the WhatsApp surface owner.
- This document is the actionable hand-off. Recommend treating as a launch blocker for any external WhatsApp exposure: the surface must not be reachable by production users until branch scoping lands.
