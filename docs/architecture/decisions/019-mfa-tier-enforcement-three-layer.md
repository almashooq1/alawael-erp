# 19. MFA Tier Enforcement — Three-Layer Architecture

Date: 2026-05-22

## Status

✅ **Accepted — implementation complete across 28 atomic commits W273→W275z.**

This ADR documents architecture that has already shipped end-to-end. It
exists to crystallise the patterns for future contributors (extending to
new services, new routes, or new actor sources) and to give auditors a
single document that explains the full MFA-tier-enforcement story.

## Context

Pre-W273, MFA tier enforcement in this codebase existed only as a
service-layer concept used by `beneficiary-lifecycle.service.js` (W95).
CLAUDE.md mandated:

> "Don't bypass loadMfaActor middleware on routes that touch beneficiary
> lifecycle, care-plan transitions, access-review attestations, or payroll
> override."

An attendance/biometric audit on 2026-05-22 found that this rule was
violated across the entire biometric/attendance/hikvision route surface.
13 sensitive endpoints were reaching production with `authenticate +
RBAC` only — no MFA gate. Among them:

- `POST /api/v1/hikvision/payroll/overrides/:id/execute` (financial,
  irreversible)
- `POST /api/v1/hikvision/templates/:id/suspend` (biometric template
  lockout — effectively locks out an employee from the building)
- `POST /api/v1/hikvision/fraud/flags/:id/dismiss` (abuse vector:
  real fraud silently dismissed)
- `DELETE /api/v1/biometric-attendance/devices/:id` (device removal)
- 9 more

The audit traced the gap to two compounding factors:

1. **CLAUDE.md rule was advisory, not enforced.** No drift test caught
   new sensitive routes shipping without `loadMfaActor`.
2. **Wave 95 service-layer pattern** (`enforceMfa: true` factory option
   - service-layer `checkMfaTier` call) was correct but had not been
     extended past one service. New services adopted the route-layer-only
     model and the gap accumulated.

Additional context surfaced during implementation:

- The route layer middleware `loadMfaActor` (W86) is a **populator**,
  not a guard. It writes `req.actor.mfaLevel + mfaAssertedAt` from the
  in-process MFA state map. Without a downstream consumer that READS
  those fields, the middleware is security theater.
- 8 of the 16+ services in scope are **cron-shaped** (called from
  `intelligence/hikvision-scheduler.service.js` or `services/hr/
zktecoService.js` cron handlers). Cron has no user session, so
  service-layer MFA guards would break the scheduled job.
- 4 of those cron handlers contained pre-existing **naming-mismatch
  bugs** (`sweepUnresponsive` vs `sweepStaleDevices`, etc.) that never
  surfaced because no test exercised the scheduler-handler ↔
  service-method binding directly.

## Decision

Adopt a **five-layer enforcement stack**:

```text
1. Route-layer middleware             requireMfaTier(N, { maxAgeMin })
2. Service-layer factory + helper     enforceMfa flag + _checkMfaTier(actor, t, m)
3. Synthetic system-actor             makeSystemActor() for cron paths
4. Drift guard for routes             no-mfa-bypass-on-sensitive-routes
5. Drift guard for scheduler          scheduler-handlers-resolve
```

Each layer compensates for failure modes the others can't see:

- **Layer 1** protects HTTP traffic at the routing edge.
- **Layer 2** protects against non-HTTP callers (CLI replay, internal
  service-to-service, future workers).
- **Layer 3** lets trusted cron jobs satisfy Layer 2 without bypassing
  it.
- **Layer 4** prevents NEW routes from shipping without Layer 1.
- **Layer 5** prevents the scheduler-handler-typo class of bug from
  recurring.

### Layer 1 — Route-layer middleware (W273)

File: `backend/middleware/requireMfaTier.js`

Exports:

- `attachMfaActor(req, _res, next)` — lazy variant of W86's
  `loadMfaActor`. Resolves `req.app._mfaChallengeService` per-request
  (the MFA service wires late in `app.js` startup). Falls back to
  `mfaLevel = 0` when no service is wired → downstream guards **fail
  CLOSED**.
- `requireMfaTier(requiredTier, { maxAgeMin? })` — factory returning
  Express middleware. Rejects 401 `ACTOR_REQUIRED` / 403
  `MFA_TIER_REQUIRED` / 403 `MFA_FRESHNESS_REQUIRED`. Diagnostic
  fields in response body let the web-admin render an actionable
  "step-up to tier N" prompt.

Default freshness windows (mirror `mfa-challenge.service` constants):

| Tier | Default `maxAgeMin` | Used for                                              |
| ---- | ------------------- | ----------------------------------------------------- |
| 1    | 60                  | (currently no consumers; reserved for low-impact)     |
| 2    | 15                  | Most operator actions (payroll create, fraud dismiss) |
| 3    | 5                   | Highest-impact operator actions (payroll execute)     |

Tier policy: tier 2 for write/state-mutation; tier 3 for
financially-irreversible operations (override execute, period reopen).
Pass `maxAgeMin: null` to disable freshness check (sensitive READS).

### Layer 2 — Service-layer factory + helper (W275 series via W275c lib)

File: `backend/intelligence/mfa-tier-check.lib.js` (W275c)

Pure function:

```js
checkMfaTier(actor, requiredTier, maxAgeMin, opts?) → { ok: true } | { ok: false, reason, ... }
opts.enforceMfa  — default true (security-first when omitted)
opts.now         — clock injection (tests)
```

Each adopter service exposes a factory option `enforceMfa = false`
(default OFF for backwards compatibility with pre-MFA-era tests) and
provides a local wrapper:

```js
function _checkMfaTier(actor, requiredTier, maxAgeMin) {
  return checkMfaTier(actor, requiredTier, maxAgeMin, { enforceMfa, now });
}
```

Each gated method then has a one-line guard at the top:

```js
const mfa = _checkMfaTier(actor, 2, 15);
if (!mfa.ok) return mfa;
```

`app.js` opts each service in by passing `enforceMfa: true` at the
construction site.

**Adopted by 11 services** (8 in `intelligence/hikvision-*`, 1
in `intelligence/payroll-period.service`, 1 in
`intelligence/attendance-reconciliation.service`, 1 in
`services/hr/zktecoService.js`). Covers 22 sensitive methods.

### Layer 3 — Synthetic system-actor (W275q)

File: `backend/intelligence/system-actor.lib.js`

Exports:

- `makeSystemActor({ id?, role?, now? })` — produces a tier-3 fresh
  actor object. userId is a recognisable sentinel
  (`system:scheduler`, `system:worker`, `system:replay`, `system:cli`).
- `isSystemActor(actor)` — heuristic for audit-log attribution.
- `SYSTEM_USER_IDS`, `SYSTEM_ROLES`, `SYSTEM_MFA_TIER` — frozen constants.

Tier `3` is hardcoded in the lib (not per-call configurable) so future
contributors can't lower the bar by accident. Fresh `mfaAssertedAt`
on every call (NOT memoized) so freshness checks pass indefinitely
under cron load.

**Security boundary:** the lib lives in `intelligence/` so it's
importable by service-layer code. HTTP handlers MUST NOT import it
(reviewers should reject any HTTP-handler PR that does). The lib
header carries an explicit warning to this effect.

Trusted callers integrate at the handler boundary:

```js
// In hikvision-scheduler.service.js
return syncWorker.syncAll({ ...args, actor: _systemActor() });

// In services/hr/zktecoService.js (cron tick)
await this.syncAttendanceLogs(deviceId, 'auto', null, { actor: makeSystemActor({...}) });
```

### Layer 4 — Drift guard for routes (W273b, extended W275b+c+d+e+f+g+h+i+j+k+L+m+n+o+p+t+u+v)

File: `backend/__tests__/no-mfa-bypass-on-sensitive-routes-wave273b.test.js`

Loads each router (biometric-attendance, zkteco, hikvision via factory

- DI stubs) and walks its Express `router.stack`. For each route layer
  whose `(method, path)` matches a `SENSITIVE_RULES` entry (currently
  58 rules), asserts the handler chain includes `mfaTierGuard`. Fails
  with structured message showing method+path+why+chain.

Each new sensitive endpoint surface adds a rule to `SENSITIVE_RULES`.
Read-only (GET) routes are auto-exempt by method filter — W273 design
chose tier-gating for writes only.

Pattern proven 10+ times during W273b → W275v: every commit adding
service-layer enforcement also caught a missed route-layer gate via
this drift guard.

### Layer 5 — Drift guard for scheduler (W275z)

File: `backend/__tests__/scheduler-handlers-resolve-wave275z.test.js`

Wires `createHikvisionScheduler` with full service stubs implementing
every method by name. Invokes each handler via `runJob({jobId,...})`
and asserts (a) handler completes ok=true (b) the EXPECTED service
method got called. If a future handler references a non-existent method
(e.g., `syncEverything` instead of `syncAll`), the test fails at PR
time with TypeError "syncEverything is not a function".

Coverage-completeness test fails if a new `JOB_ID` lands in
`reg.JOB_ID` without a corresponding handler-resolution test, with
explicit instructions to add one.

## Consequences

### Positive

- **70+ HTTP endpoints** gated by route-layer MFA tier check.
- **11 services / 22 methods** gated by service-layer check (defense in
  depth — covers cron, CLI, and future internal callers).
- **2 drift guards** prevent regression on both surfaces.
- **System-actor pattern** is the documented, audit-attributable
  mechanism for cron paths. Audit log readers can distinguish
  `system:*` actors from human users.
- **4 pre-existing scheduler bugs** caught and fixed as side effects
  of the W275 audit (W275t/u/v's drive-by fixes).
- **Backwards compatibility preserved**: every service factory's
  `enforceMfa` default is `false`, so pre-MFA tests stay green.
- **Mechanical adoption pattern** for new services: 3-line wrapper +
  per-method one-line guard + `enforceMfa: true` at construction +
  test file mirroring W275 6-section shape.

### Negative / maintenance burden

- **`enforceMfa` is opt-in.** A new service that forgets to set
  `enforceMfa: true` at the `app.js` construction site silently
  bypasses Layer 2. The drift guard catches Layer 1 omissions but
  NOT Layer 2 omissions. Future enhancement: ADR-021 candidate, a
  drift guard scanning `app.js` for `createX...Service({...})` calls
  and asserting `enforceMfa: true` is present.
- **System-actor sentinel approach assumes audit-log writers honor
  the `isSystemActor()` distinction.** A naive audit writer that logs
  raw `actor.userId` will attribute cron operations to
  `system:scheduler` without distinguishing them from a hypothetical
  human user with that name. Mitigation: the sentinels are clearly
  prefixed (`system:*`); the lib's header comment marks the contract.
- **Drift guards run only via `npm run test:sprint`**, not on every
  CI build. They're "manual pre-PR checklist" tests per the project's
  `test:sprint` convention. A drift gap would surface at PR review
  time, not at commit time. Mitigation: this is a known project-wide
  convention; not specific to MFA work.
- **Two architecture-incompatible factory shapes** are now in active
  use: closure-with-options (W275/b/c/d/f/q/r/t/u/v/w) and
  class-with-static-methods (`services/hr/zktecoService.js`, W275s).
  The class architecture uses a module-level `let _ENFORCE_MFA_SYNC`
  with `__setEnforceMfaSync()` test toggle. Both shapes share the
  same `mfa-tier-check.lib` underneath; the adapter difference is
  cosmetic.
- **Test-stub maintenance load**: every drift-guard test for the
  hikvision factory router stubs ~10 services. Adding a new DI port
  to the factory means updating the stub. The drift-guard file's
  header comments explicitly document this.

## Alternatives considered

### A. Continue ad-hoc per-route enforcement (status quo)

- Each route handler imports `mfa-challenge.service`, checks
  `getUserMfaState(userId)`, returns 403 if low.
- Rejected: cross-cuts every handler, duplicates 20-30 LOC per
  endpoint, no drift guard, no service-layer protection for cron.

### B. Service-layer-only (extend W95 pattern uniformly)

- Every service that has sensitive methods gets `enforceMfa: true`.
- Route layer becomes a thin passthrough; no `requireMfaTier`
  middleware exists.
- Rejected: leaves HTTP attack surface naked when a service's actor
  parameter is wrong type or missing. Defense in depth requires both
  layers.

### C. Always-enforce module-level flag (no factory opt-in)

- `mfa-tier-check.lib` reads a process.env constant `MFA_ENFORCE`
  applied to every check.
- Rejected: pre-W275 tests would all need actor objects in every
  service-method call. Backwards-compatibility burden is too high.

### D. Skip service-layer enforcement entirely; route-only

- W273 + drift guard W273b + Layer 5 scheduler guard would suffice
  for HTTP attack surface.
- Rejected: leaves cron + CLI + internal service-to-service callers
  unprotected. A future feature making a service-to-service call to a
  sensitive method would bypass MFA silently.

### E. Defer cron-shaped services indefinitely (route-only adoption with no system-actor)

- W275e/g/j/L originally chose this path.
- Rejected mid-series at W275q: it left a real gap, and the
  system-actor lib turned out to be ~110 LOC of pure, well-tested code.
  The fix was smaller than the lingering debt.

## Patterns established (for future contributors)

### Adding service-layer MFA to a new service

1. Import `checkMfaTier` from `./mfa-tier-check.lib` (factory shape) OR
   import the module-level pattern from W275s if class-shape.
2. Add `enforceMfa = false` factory option.
3. Add local 3-line `_checkMfaTier` wrapper binding `enforceMfa` + `now`.
4. Add one-line guard at the top of each sensitive method.
5. Pass `enforceMfa: true` at the `app.js` construction site.
6. Update route handlers to pass `actor: actorFrom(req)` (where
   `actorFrom` is the route's actor builder from `attachMfaActor`).
7. If the service has a cron caller, update the scheduler handler to
   pass `{ ..., actor: _systemActor() }`.
8. Write a test mirroring the W275 6-section shape (reject without
   actor, reject low tier, reject stale, accept with system actor or
   fresh tier-N actor, `enforceMfa=false` bypass, factory flag
   default OFF parity).

### Adding a new sensitive route

1. Add the route with `requireMfaTier(N)` after `requirePerm(...)`.
2. Add the route's path regex to `SENSITIVE_RULES` in
   `no-mfa-bypass-on-sensitive-routes-wave273b.test.js`.
3. Drift guard verifies via the next `npm run test:sprint`.

### Adding a new scheduler handler

1. Define the JOB_ID in `hikvision.registry`.
2. Define the handler in `hikvision-scheduler.service.js`.
3. Pass `{ ...args, actor: _systemActor() }` if the target service has
   `enforceMfa: true`.
4. Add a handler-resolution test case to
   `scheduler-handlers-resolve-wave275z.test.js` + add the target
   method name to the corresponding service stub in that file.

## Not in scope

- **Frontend MFA step-up UI**. The route-layer error responses include
  `requiredTier` + `actorTier` + `maxAgeMin` + `ageMin` diagnostic
  fields so a future UI can render an actionable prompt. The UI itself
  is separate work (out of W273-W275 scope; user decision pending on
  workflow design).
- **Audit-log writer integration**. `isSystemActor()` is exported but
  no current audit writer consumes it. Future work to distinguish
  `actor_kind: system | human` in audit rows.
- **mTLS / hardware-token integration**. The W86 mfa-challenge.service
  supports `speakeasy`-style TOTP today. Hardware token (FIDO2) and
  Nafath-based MFA could plug in without disturbing W273-W275 layers.
- **Process-wide MFA state persistence**. `mfa-challenge.service` keeps
  the state map in-process. A horizontally-scaled deployment would
  need to share this via Redis or sticky sessions. Out of scope for
  W273-W275 (would land in a separate ADR).

## References

- **Layer 1 (W273)**: `backend/middleware/requireMfaTier.js` +
  `backend/__tests__/biometric-mfa-tier-wave273.test.js`
- **Layer 2 lib (W275c)**: `backend/intelligence/mfa-tier-check.lib.js`
- **Layer 3 lib (W275q)**: `backend/intelligence/system-actor.lib.js`
- **Layer 4 drift (W273b)**:
  `backend/__tests__/no-mfa-bypass-on-sensitive-routes-wave273b.test.js`
- **Layer 5 drift (W275z)**:
  `backend/__tests__/scheduler-handlers-resolve-wave275z.test.js`
- **Service adopters** (`intelligence/`): `payroll-period`,
  `hikvision-fraud-detection`, `hikvision-face-enrollment`,
  `attendance-reconciliation`, `hikvision-branch-config`,
  `hikvision-fraud-score`, `hikvision-sync-worker`,
  `hikvision-health`, `hikvision-event-parser`,
  `hikvision-anomaly-history`
- **Class-shape adopter**: `services/hr/zktecoService.js` (W275s)
- **Related ADRs**:
  - ADR-005 (Canonical Role Hierarchy) — defines the role enum that
    drives `requirePerm` (the layer beneath MFA)
  - ADR-009 (Audit Trail Standard) — where `isSystemActor()` would
    integrate for audit attribution
  - W86 / W95 prior art — `intelligence/mfa-challenge.service.js`
    and `intelligence/beneficiary-lifecycle.service.js`
- **Commit chain**: W273 (`ba5a2b713`) through W275z (`e985ef11c`)
  — 28 atomic commits over 2026-05-22
- **Memory entries**:
  `~/.claude/projects/.../memory/project_wave273_mfa_tier_route_guard_2026-05-22.md`
  and follow-ups
