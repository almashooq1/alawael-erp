# ADR-030 — Dormant Module Disposition (vehicles/ + similar) (🟡 Proposed)

**Date**: 2026-05-26
**Type**: ADR (decision-required)
**Mode**: 👤 then 🤝 (stakeholder decides direction; Claude executes)
**Decider**: Tech lead + transport/fleet domain owner (if `vehicles/` is to be wired) OR architecture owner (if deleting)
**Effort**: A (wire-up) ~5-10 days / B (delete) ~1-2 days / C (defer) 0 days

## Context

The W340 AF-2 ratchet sweep (commits `b12fd9c8b` + `f08fe12a7`) surfaced a class of tech debt the codebase carries: **dormant modules**. Service files define schemas + business logic + an `.initialize(connection)` method, but the module is never wired up at app startup. Their `connection.model(...)` registrations never fire at runtime, and the route files that depend on the services aren't mounted in `_registry.js`.

The dormant-module discovery + the cleanup recipe (replace `connection.model` with `mongoose.model` lookup) are documented at:

- [canonical-location-pattern.md §Exception: the empty-shim pattern](../canonical-location-pattern.md)
- W340 baseline comments at `backend/__tests__/no-duplicate-model-registration-wave340.test.js`
- Commit `b12fd9c8b` (the 6-entry consolidation that established the pattern)

The cleanup recipe is a **stopgap** that neutralizes the schema-divergence risk while preserving the code for the eventual wire-up-vs-delete decision. This ADR makes that decision explicit.

## Dormant module inventory (verified 2026-05-25)

### Group A — `backend/vehicles/` (5 services + 5 routes + index.js)

**Files**: ~10 files, several thousand LOC of business logic.

| File                                           | LOC  | Schemas defined                                      | Routes file mounted?                    |
| ---------------------------------------------- | ---- | ---------------------------------------------------- | --------------------------------------- |
| `vehicles/index.js`                            | 155  | n/a (orchestrator)                                   | ❌ never required from app.js           |
| `vehicles/vehicle-service.js`                  | ~800 | Vehicle + VehicleTrip + VehicleMaintenance + FuelLog | ❌ vehicle-routes not mounted           |
| `vehicles/saudi-vehicle-service.js`            | ~720 | SaudiVehicle + VehicleTrip                           | ❌ saudi-vehicle-routes not mounted     |
| `vehicles/saudi-traffic-service.js`            | ~700 | TrafficAccident + DriverLicense + TrafficViolation   | ❌ saudi-traffic-routes not mounted     |
| `vehicles/student-transport-service.js`        | ~600 | Student + StudentTrip + Pickup + Dropoff             | ❌ student-transport-routes not mounted |
| `vehicles/rehabilitation-transport-service.js` | ~700 | Beneficiary + RehabilitationBranch + TransportRoute  | ❌ rehab-transport-routes not mounted   |

**Already cleaned via dormant-service recipe**: Vehicle, VehicleTrip, VehicleMaintenance, TransportRoute, Beneficiary, TrafficAccident (commits `a56c9feb0` + `b12fd9c8b`).

### Group B — `backend/communication/` (partial dormancy)

| File                                             | LOC  | `.initialize()` called? |
| ------------------------------------------------ | ---- | ----------------------- |
| `communication/email-service.js`                 | ~620 | ❌ never                |
| `communication/whatsapp-service.js`              | ~500 | ❌ never                |
| `communication/sms-service.js`                   | ~200 | ❌ never                |
| `communication/electronic-directives-service.js` | ~300 | ❌ never                |

These ARE loaded at module-level (via `communication/index.js` ← `server.js:463`), so their schema definitions execute. But the `connection.model` registrations inside their dormant `.initialize()` methods never fire. The cleanup recipe has been applied to `email-service.js` (commit `b12fd9c8b`); the other 3 don't have W340 baseline entries (their connection.model targets aren't duplicates).

### Group C — `backend/permissions/permission-service.js`

Loaded by `permission-middleware.js` for its method exports, but `.initialize(connection)` is never called. Methods like `checkPermission` reference `this.Permission`/`this.Role` which remain `null` — would crash if invoked. Currently no caller invokes them (middleware uses `hasRole`/`getUserPermissions` which also rely on the null fields).

Permission + Role schemas already migrated to canonical `models/RBAC/{Permission,Role}.js` (commit `98988fe75`) via empty-shim recipe. The middleware methods that depend on `this.X` would still crash if invoked.

## Three options

### Option A — Wire up the dormant modules properly (effort: L, ~5-10 days per group)

**Steps for Group A (`vehicles/`)**:

1. Add `await require('./vehicles').initialize(connection)` to app.js startup sequence
2. Mount all 5 vehicle routes in `_registry.js` with appropriate URL prefixes
3. Migrate the local schemas (Vehicle, VehicleTrip, etc.) to canonical `models/` files where they belong (some already migrated per Group A above)
4. Wire up MFA tier requirements on sensitive mutations (per W273-W278 doctrine)
5. Add drift guards (per ADR-020 pattern: per-domain service tests)
6. Decide on per-tenant connection isolation: do we need `connection.model` per-tenant, or single global `mongoose.model`?
7. Add to CLAUDE.md MODULES table

**Pros**: Activates ~3000+ LOC of business logic. Closes the dormant-module debt for this group permanently.
**Cons**: Significant work. Requires domain owner (fleet/transport) sign-off on the business logic itself. Risk of activating code paths that haven't been runtime-tested in years.

### Option B — Delete the dormant modules (effort: S, ~1-2 days per group)

**Steps for Group A**:

1. Delete `backend/vehicles/` directory entirely (5 services + 5 routes + index.js)
2. Delete all `backend/tests/unit/*vehicle-*` auto-gen tests
3. Remove `backend/models/Vehicle.js` if no other caller exists (audit refs first — likely still referenced by other models via `ref: 'Vehicle'`)
4. Update `docs/dead-route-audit.json` to flag the deletions
5. Update CLAUDE.md MODULES table to remove the references
6. Verify W325c + W340 + no-broken-requires still green after deletion

**Pros**: Eliminates ~3000-5000 LOC of dead code. Simplifies the codebase. Removes future trap (next engineer wiring it up gets stale code).
**Cons**: Loses the business logic that was already written. If the feature is later needed, must be rebuilt. Some models (`Vehicle`, `TrafficAccident`) ARE referenced by other models — can't delete fully.

### Option C — Defer (status quo) (effort: 0)

Continue the dormant-service cleanup recipe as W340 baseline is ratcheted, but don't make the wire-up-vs-delete decision yet. The recipe (replace `connection.model` with `mongoose.model('X')` lookup) is a stable stopgap.

**Pros**: Zero effort today. Postpones a non-urgent decision.
**Cons**: Codebase carries the dormant code indefinitely. Each new agent session must re-discover the dormancy. Future engineer who decides to "fix the vehicles routes" gets confused.

## Recommendation

**Option C until a stakeholder concretely asks for vehicles/transport features**. The cleanup recipe is working — W340 progress has reduced the immediate risk. The wire-up vs delete decision is genuinely value-dependent: if the business needs fleet management, Option A; if not, Option B.

**What to monitor**: if a feature request lands that needs vehicle tracking / transport scheduling / traffic accident reporting, that's the signal to choose Option A. If a year passes without such a request, that's the signal for Option B.

**Adjacent decision**: parallel pattern in `backend/communication/{whatsapp,sms,electronic-directives}-service.js` + `backend/permissions/permission-service.js` follows the same template. Same A/B/C options apply per group. Recommend deciding all of Group A + B + C together at one stakeholder meeting.

## Decision template

```text
ADR-030 — RESOLVED 2026-MM-DD

Approver signature (tech lead + domain owners):  __________________________

Per-group decision:

  Group A (vehicles/, ~3000 LOC):
    [ ] A — Wire up (~5-10 days)  [ ] B — Delete (~1-2 days)  [ ] C — Defer

  Group B (communication/{whatsapp,sms,directives}, ~1000 LOC):
    [ ] A — Wire up               [ ] B — Delete             [ ] C — Defer

  Group C (permissions/permission-service.js, ~880 LOC):
    [ ] A — Wire up               [ ] B — Delete             [ ] C — Defer

Notes:
  - Per-group decisions can differ (e.g. Group A delete, Group B wire-up)
  - If wire-up chosen: open a sprint with domain owner; W4XX wave per group
  - If delete chosen: 1-day cleanup wave per group; verify drift guards green
```

## Related

- Commit `b12fd9c8b` — the 6-entry dormant-service cleanup that surfaced this
- Commit `98988fe75` — Permission + Role empty-shim consolidation (Group C partial)
- [canonical-location-pattern.md](../canonical-location-pattern.md) §Exception: empty-shim pattern
- [`backend/__tests__/no-duplicate-model-registration-wave340.test.js`](../../backend/__tests__/no-duplicate-model-registration-wave340.test.js) — W340 drift guard with the dormant-service comments
- [OPEN_ISSUES_INVENTORY.md §3 W340 row](../../OPEN_ISSUES_INVENTORY.md) — broader cleanup context
- [memory: project_dormant_module_debt_2026-05-26.md](~/.claude/projects/.../memory/) — agent-side notes on detection + recipe (not in repo)
