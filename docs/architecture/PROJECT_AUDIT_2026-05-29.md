# Project Audit — 2026-05-29

Comprehensive multi-surface audit across the seven dimensions (critical bugs,
security, performance, code quality, dependencies, API/integration, database).
Every finding cites a file:line that was read and, for CRITICAL/HIGH items,
independently verified (load behavior, `npm audit`, source confirmation).

**Surfaces covered:** `66666/backend` (live API) · `alawael-rehab-platform/apps/web-admin`
(live UI) · `66666/frontend` (legacy client, the modified `api.client.js`) ·
`66666/mobile` (React Native) · `66666/supply-chain-management` (submodule) ·
`66666/contracts` (Solidity).

## Headline

The **main platform is mature and well-defended**: 0 critical findings, centralized
secret management that throws in production, HS256-pinned JWT with no fallback,
fail-closed webhooks, atomic financial state transitions, `npm audit` = **0
vulnerabilities** on backend prod deps, and **264 / 265** tenant-scoped models index
`branchId`. The current working-tree diff is itself a batch of security/correctness
fixes (race-safe invoice/refund transitions, fail-open refund closed, idempotency
scope collision fixed).

**The critical exposure is isolated to the `supply-chain-management` submodule's
live `server-clean.js` entrypoint** (unauthenticated mutations + privilege
escalation + mass assignment). If that submodule is internet-reachable, those are
the urgent items.

## Remediation status (2026-05-29)

- ✅ **CRITICAL #1–#3 fixed** — branch `security/scm-server-clean-criticals` (`4d5a4f011`,
  local, not pushed). Also closes HIGH double-hash + adds `User.email`.
- ✅ **HIGH #6 fixed** — web-admin refresh-token rotation across 14 API clients;
  branch `security/web-admin-refresh-rotation` (`5d68bfb`, local, not pushed); typecheck clean.
- ✅ **HIGH #4/#5 + MEDIUM #12/#13 (crypto-key fallbacks) fixed** — branch
  `security/crypto-key-hardening` (`83ddc29f5`). Routed all 4 inline
  `process.env.X || 'default'` reads through `config/secrets.js` lazy getters that throw in
  prod when unset (dev/test fallback = exact prior literal, so no data breaks; verified 45
  tests pass). **DEPLOY NOTE:** set `DB_HASH_KEY` / `INTEGRATION_SECRET` / `QR_SECRET` in
  prod with this deploy — to the prior default to preserve existing data, or to a strong
  value + the re-key migration in `CRYPTO_KEY_HARDENING_RUNBOOK.md`.
- ⏳ **#16 (doc AES-CBC → GCM + per-record salt)** — deferred follow-up; needs the
  versioned-envelope migration documented in the runbook (would otherwise break existing
  ciphertext). Key fallback for that module is already closed by #5 above.
- ✅ **HIGH #11 + #23 + #26 fixed** — branch `security/mobile-auth-flow` (`4beee6ed7`).
  Resolved #26 by confirming `App.tsx` is the production entry (`package.json` main =
  `expo/AppEntry.js`), then drove the navigator off Redux `auth.isAuthenticated` (login now
  navigates) and dispatched `checkAuth()` at boot to validate the token (not just presence).
  eslint clean; `tsc` reports no errors referencing `App.tsx`.

### Second remediation wave (2026-05-29, MEDIUM/LOW + remaining HIGH)

- ✅ **HIGH #7 fixed** — `apps/web-admin/src/lib/universal-code-api.ts`: `renderUrl` no
  longer wraps the absolute `API_BASE` URL in `withBasePath` (which produced
  `/adminhttps://…` → 404). Returns `API_BASE + path` like `request()`; dropped the now-unused
  import. web-admin `tsc --noEmit` clean.
- ✅ **HIGH #9 + #10 fixed** — supply-chain `routes/suppliers.js` (two concatenated
  CJS+ESM bodies → `SyntaxError`) merged into one consistent CJS module incl. the missing
  `logAction` import; `routes/auth.js` now imports `authMiddleware` (was a load-time
  ReferenceError). Both `node --check` clean. While in `auth.js`, also fixed the same
  double-hash class as #8 (passed plaintext to `new User` — the `pre('save')` hook hashes
  once) and passed the now-required `email`.
- ✅ **MEDIUM #20 fixed** — supply-chain `index.js` now has a terminal error handler +
  404 handler (no more default-Express stack-trace leak / hang).
- ✅ **MEDIUM #18 fixed** — `mobile/src/navigation/SprintAppNavigator.tsx` exposes a
  `useSprintSession()` context with `logout()` that clears `authToken` + `currentUser` from
  SecureStore and resets state. mobile `tsc` clean.
- ✅ **LOW #21 fixed** — `backend/routes/parent-portal-v1.routes.js`: 27 catch blocks no
  longer echo raw `err.message` to clients; each returns its existing generic fallback while
  keeping the `error:'InternalError'` code. No test asserts on those bodies.
- ✅ **LOW #25 already resolved** — verified all 5 `server-clean.js` delete handlers now
  return 404 on a missing id (landed with the #1–#3 hardening; the original audit predates it).
- ⚖️ **MEDIUM #17 — FALSE POSITIVE, no change.** `mobile/src/services/ApiService.ts:370`
  resolving the offline queue with the full Axios `response` is **correct**: that promise is
  awaited by the `get/post/put/delete` wrappers, which each `return response.data`. Resolving
  with `response.data` would double-extract (`.data.data` → undefined) and _introduce_ the bug.
- ⏳ **Still deferred (need a data migration, not autonomous):** #16 (AES-CBC→GCM versioned
  envelope) and #23 (visitor JWT → httpOnly cookie).

## Severity tally

| Severity    | Count |
| ----------- | ----- |
| 🔴 CRITICAL | 3     |
| 🟠 HIGH     | 8     |
| 🟡 MEDIUM   | 9     |
| 🟢 LOW      | 6     |

---

## 🔴 CRITICAL

All three are in the supply-chain submodule's live entrypoint `server-clean.js`
(verified: both `npm start` and `dev` run `server-clean.js`).

1. **No authentication on any data mutation.** `supply-chain-management/backend/server-clean.js`
   — every mutating route (`app.post/put/delete` for suppliers ~:664/:686/:698,
   products, inventory, orders, shipments) has no auth middleware. Anyone on the
   network can create/alter/delete all business data.
   **Fix:** apply the working `authRequired` from `server-mongodb.js:402` to every
   mutation, or repoint the entrypoint to `server-mongodb.js`.

2. **Privilege escalation via self-registration.** `server-clean.js:335` —
   `role: role || 'user'` trusts a client-supplied role; `POST /api/auth/register
{"role":"admin"}` mints an admin. (`server.js`/`server-mongodb.js` clamp via an
   `ALLOWED_ROLES` whitelist; this one does not.)
   **Fix:** apply the same `safeRole` whitelist.

3. **Mass assignment on every PUT.** `server-clean.js:688` —
   `Supplier.findByIdAndUpdate(req.params.id, req.body, {new:true})` (and the
   products/inventory/orders/shipments PUTs). Combined with #1, any field is
   writable.
   **Fix:** destructure and assign only an allow-list of fields (the modular
   `routes/orders.js` PUT shows the right pattern).

---

## 🟠 HIGH

4. **Crypto-key fallback bypasses central secrets — searchable-PII HMAC.**
   `backend/database/plugins/field-encryption.js:164` —
   `process.env.DB_HASH_KEY || process.env.DB_ENCRYPTION_KEY || 'default-hash-key'`.
   `deterministicHash()` blinds searchable encrypted PII; with no prod guard (unlike
   `config/secrets.js:36`), a deployment missing the env var computes every hash
   under a publicly-known key, defeating the blinding.
   **Fix:** route through `config/secrets.js` so it throws in production.

5. **Integration-credential encryption uses a default key + static salt.**
   `backend/services/documents/documentIntegrations.service.js:228` (default key) and
   `:235` (`crypto.scryptSync(key, 'salt', 32)` — constant salt). Encrypts third-party
   integration credentials; a missing `INTEGRATION_SECRET` in prod stores them under
   a repo-embedded key.
   **Fix:** central secrets + prod throw; replace the static salt with a per-record
   random salt stored with the ciphertext.

6. **Rotated refresh token not persisted → silent forced logout (web-admin, systemic).**
   Backend rotates and blacklists the refresh token on every `/refresh`, but most
   client refresh handlers read only `accessToken` and never store the new
   `refreshToken`. One silent refresh succeeds, then the next 401 re-sends a revoked
   token → forced login. Sites: `apps/web-admin/src/lib/auth/context.tsx:200` plus
   ~10 per-domain clients (`parent-api.ts:56`, `access-review-api.ts:84`,
   `audit-trail-api.ts:67`, `beneficiary-lifecycle-api.ts:81`, `care-planning-api.ts:91`,
   `episode-api.ts:81`, `hikvision-api.ts:150`, `llm-anomaly-api.ts:60`,
   `mfa-challenge-api.ts:62`, `no-show-api.ts:69`). Only `lib/api.ts:231` and
   `lib/api-fetch.ts` handle rotation correctly.
   **Fix:** extract the correct `refreshAccessToken()` into one shared helper; delete
   the divergent inline blocks.

7. **Broken render URL — `withBasePath` applied to an absolute API URL.**
   `apps/web-admin/src/lib/universal-code-api.ts:83` — `withBasePath(API_BASE + path)`
   yields `/adminhttps://…/api/v1/…` in prod (404), since `API_BASE` is absolute.
   **Fix:** return `API_BASE + path` directly.

8. **Double-hashed passwords lock out all new users (supply-chain live server).**
   `supply-chain-management/backend/server-clean.js:329` calls `bcrypt.hash` before
   `new User(...)`, while `models/User.js` also hashes in a `pre('save')` hook →
   hash-of-a-hash; login `compare` can never match.
   **Fix:** pass plaintext to `new User` and let the model hook hash once.

9. **`routes/suppliers.js` is corrupted — throws at require (alt entrypoint).**
   `supply-chain-management/backend/routes/suppliers.js` — verified
   `SyntaxError: Identifier 'express' has already been declared`. Two concatenated
   module bodies (CJS review-route lines 1–51, ESM CRUD lines 52–148) with duplicate
   `express`/`router` and `logAction` used at :30 but imported at :54. Classic
   concurrent-edit-on-shared-file corruption. Affects only the `index.js` entrypoint
   (`index.js:47`), not the live `server-clean.js`. `module.exports = router` exports
   the 2nd router, silently dropping `/:id/review`.
   **Fix:** keep one consistent module body.

10. **`routes/auth.js` references undefined `authMiddleware`.**
    `supply-chain-management/backend/routes/auth.js:67` — used but never imported
    (verified: appears only at :67) → ReferenceError at module load, breaks `index.js`.
    **Fix:** `const { authMiddleware } = require('../middleware/auth');`.

11. **Mobile auth-flow not wired to Redux state.** `mobile/App.tsx:121` gates the
    navigator on a boot-time `isSignedIn = !!token`; the login/register thunks update
    Redux `auth.isAuthenticated` but `App.tsx` never subscribes → after a successful
    login the user is stuck on the Login screen until app restart. The existing
    `checkAuth` thunk (`src/store/authSlice.ts:69`) is never dispatched, so an
    expired/revoked token still renders the full UI until the first 401.
    **Fix:** gate on `useAppSelector(s => s.auth.isAuthenticated)` and dispatch
    `checkAuth` on boot.

---

## 🟡 MEDIUM

12. **Forgeable document-QR HMAC default secret.**
    `backend/services/documents/documentQRCode.service.js:167` —
    `process.env.QR_SECRET || 'doc-qr-secret'`. **Fix:** central secrets + prod throw.

13. **Nafath JWS signing falls back to a mock secret.**
    `backend/integrations/nafath/signingClient.js:37` — defaults to
    `'alawael-nafath-mock-secret-do-not-use-in-prod'` with nothing enforcing it.
    **Fix:** make it `required` via `config/secrets.js`.

14. **Currency stored as floating-point `Number` (systemic).** 57 monetary fields
    across 30 models; `backend/models/finance/Invoice.js` alone has 13. IEEE-754
    doubles accumulate rounding error in financial arithmetic.
    **Fix:** integer minor units (halalas) or `Decimal128`; migrate per-domain via the
    existing ratchet pattern.

15. **Hardcoded admin password in a committed script.** `backend/reset-password.js:8`
    — `NEW_PASSWORD = 'Admin@123456'`. Account-takeover if ever run against prod.
    **Fix:** read from argv/env; refuse when `NODE_ENV === 'production'`.

16. **`documentIntegrations._encrypt` uses AES-256-CBC (unauthenticated).**
    `backend/services/documents/documentIntegrations.service.js:236` — no integrity
    tag, while canonical `field-encryption.js:147` uses GCM with `setAuthTag`.
    **Fix:** switch to `aes-256-gcm`.

17. **Mobile offline-queue resolves the wrong shape.**
    `mobile/src/services/ApiService.ts:368` — `processOfflineQueue` resolves callers
    with the raw Axios `response` instead of `response.data`, silently breaking any
    request queued while offline. **Fix:** resolve with `response.data`.

18. **Mobile Nafath flow has no logout path.** `SprintAppNavigator.tsx` never clears
    `authToken`/`currentUser` from SecureStore. **Fix:** add a logout action.

19. **Supply-chain `User` schema drops `email`.**
    `supply-chain-management/backend/models/User.js` — no `email` field, so the email
    set during register is silently discarded. **Fix:** add the field.

20. **Supply-chain `index.js` has no global error handler / async-error capture.**
    `next(err)` or thrown async errors hang or leak stack traces. **Fix:** add a
    terminal error middleware and/or `express-async-errors`.

---

## 🟢 LOW

21. **Internal error messages leaked to clients.** New caregiver endpoints in
    `backend/routes/parent-portal-v1.routes.js` return raw `err.message` in 500
    branches. **Fix:** log server-side, return a generic message (use `utils/safeError`).

22. **web-admin hard-logout not basePath-aware.** `apps/web-admin/src/lib/api-fetch.ts:57`
    — raw `window.location.replace('/login')` 404s under `NEXT_PUBLIC_BASE_PATH=/admin`.
    **Fix:** wrap with `withBasePath('/login')`.

23. **Visitor JWT in localStorage.** `apps/web-admin/src/app/visitor-login/page.tsx:86`
    — XSS-exfiltratable; flagged for the planned httpOnly-cookie migration.

24. **Missing index on a tenant-filtered collection.**
    `backend/models/quality/Checklist.model.js:39` — `branchId` (and `type`/`isActive`)
    unindexed. Low volume today. **Fix:** `index({ branchId:1, type:1, isActive:1 })`.

25. **Supply-chain delete returns 200 for non-existent IDs.**
    `server-clean.js:698+` — never checks the delete result. **Fix:** 404 when null.

26. **Mobile fire-and-forget login dispatch.** `mobile/src/screens/LoginScreen.tsx:32`
    — `dispatch(login(...))` without `await`/`.unwrap().catch()`. Minor (thunk uses
    `rejectWithValue`).

---

## Verified clean (no action needed)

- **Dependencies:** `npm audit --omit=dev` → 0 vulnerabilities (backend prod deps).
- **Backend auth:** centralized secret (no fallback), HS256 pinned, token blacklist,
  no query-param tokens — `backend/middleware/auth.js:44-49`.
- **NoSQL/command injection:** no `Model.find(req.body)`, no user-input `$where`, no
  `eval`/`Function()` in request paths; `child_process` only in CLI scripts/tests.
- **Webhooks:** WhatsApp signature fails closed in prod with timing-safe compare —
  `backend/services/whatsapp/whatsappWebhook.service.js:75-95`.
- **Database indexes:** 264/265 `branchId` models covered.
- **Mobile security:** tokens in `expo-secure-store`, no secrets/cleartext/logged
  tokens, parameterized SQLite.
- **web-admin:** no hardcoded secrets; all 5 `dangerouslySetInnerHTML` sites
  sanitized; zero `@ts-ignore`; SSE/interval cleanup correct; `.json()` guarded by
  `res.ok`.
- **Blockchain `contracts/CertificateRegistry.sol`:** owner-gated, append-only,
  zero-root/zero-address guards, pause toggle, no external calls → no reentrancy.

## Suggested remediation order

1. Supply-chain CRITICALs (#1–#3): gate mutations with auth, whitelist `role`, stop
   spreading `req.body` — or repoint the entrypoint to the hardened `server-mongodb.js`
   (also retires #8/#9/#10).
2. Backend #4/#5 + web-admin #6: route the two crypto keys through `config/secrets.js`;
   one shared refresh helper.
3. Mobile #11: wire the navigator to Redux auth state + dispatch `checkAuth`.
