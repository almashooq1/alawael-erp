/**
 * W1547 — branch-isolation drift guard for routes/scheduling-module.routes.js
 *
 * Closes a cross-tenant IDOR found in the appointments/scheduling audit:
 * `requireBranchAccess` only rejects an EXPLICIT foreign branchId — it does NOT
 * auto-filter queries. So every read / transition on a tenant model
 * (Appointment, AppointmentRecurrence, RoomBooking, WaitlistEntry — each declares
 * a REQUIRED `branch_id`) must spread `branchScopeFilter(req)` into its filter.
 * Pre-fix, list/get/calendar/reports/no-shows trusted a client-supplied
 * `branch_id` (or applied none), and the PUT mass-assigned `branch_id` / `status`
 * (cross-tenant move + transition bypass).
 *
 * This is a STATIC source guard (no DB) mirroring the W269h
 * `no-broken-req-branchid` style: a future edit that removes the scoping, adds a
 * bare `{ _id: req.params.id, deleted_at: null }` filter, reintroduces the
 * client-trusting `filter.branch_id = branch_id`, or drops a mass-assign lock
 * fails CI.
 */
const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'scheduling-module.routes.js');
const SRC = fs.readFileSync(ROUTE, 'utf8');

describe('W1547 scheduling-module branch isolation (static drift guard)', () => {
  test('branchScopeFilter helper exists and derives from branchFilter(req)', () => {
    expect(SRC).toMatch(/const branchScopeFilter = \(req, requested\) =>/);
    expect(SRC).toMatch(/const _bf = branchFilter\(req\)/);
    expect(SRC).toMatch(/_bf\.branchId !== undefined/);
  });

  test('no client-trusting `filter.branch_id = branch_id` remains', () => {
    expect(SRC).not.toMatch(/filter\.branch_id = branch_id/);
  });

  test('no bare (unscoped) single-line `:id` filter remains', () => {
    // The scoped form ends `deleted_at: null, ...branchScopeFilter(req) })`.
    // A bare `deleted_at: null }` (immediate brace) only appears on an unscoped
    // single-line filter. Multi-line filters keep `deleted_at: null,` (comma).
    expect(SRC).not.toMatch(/deleted_at: null \}/);
  });

  test('PUT /appointments/:id locks tenant + identity + lifecycle fields', () => {
    for (const f of ['branch_id', 'beneficiary_id', 'status']) {
      expect(SRC).toContain(`delete updateData.${f};`);
    }
  });

  test('every tenant-model query/transition is branch-scoped (or allowlisted operational)', () => {
    const TENANT = ['Appointment', 'AppointmentRecurrence', 'RoomBooking', 'WaitlistEntry'];
    const re = new RegExp(
      `\\b(${TENANT.join('|')})\\.(find|findOne|findOneAndUpdate|countDocuments|aggregate)\\s*\\(`,
      'g'
    );
    // Operational queries keyed by a SPECIFIC resource (not a cross-branch list of
    // PHI), so a branch filter is unnecessary — allowlisted with justification:
    const ALLOW = [
      /RoomBooking\.findOne\(\{\s*room_id: req\.body\.room_id/, // create-time slot conflict (room_id + time)
      /Appointment\.find\(\{\s*therapist_id: req\.params\.therapistId/, // booked-slots calc (therapist + day)
      /RoomBooking\.find\(\{\s*room_id: req\.params\.roomId/, // single-room availability (room_id + day)
    ];
    const violations = [];
    let m;
    while ((m = re.exec(SRC)) !== null) {
      const start = m.index;
      const window = SRC.slice(start, start + 360);
      // Scoped inline, OR uses a pre-built `filter`/`_scope` var (scoped at its
      // declaration), OR scoped-by-parent via recurrence_id, OR allowlisted.
      const scoped =
        /branchScopeFilter\(req|branch_id|recurrence_id/.test(window) ||
        /\(filter\)|\{ \$match: filter \}|\.\.\._scope/.test(window);
      const allowed = ALLOW.some(a => a.test(window));
      if (!scoped && !allowed) {
        const lineNo = SRC.slice(0, start).split('\n').length;
        violations.push(`${m[1]}.${m[2]} @ line ${lineNo}`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('the pre-built `filter` objects that feed tenant queries are branch-scoped', () => {
    // Every `const filter = { ... }` used by a tenant-model query must spread the
    // scope. (Catches the case the windowed scan above treats as scoped-by-var.)
    const decls = SRC.match(/const filter = \{[^]*?\};/g) || [];
    const unscoped = decls.filter(
      // accept the helper, a pre-built `_scope`, or the pre-existing inline W663
      // translation (`...(_bf.branchId !== undefined ? { branch_id } : {})`).
      d => !/\.\.\.branchScopeFilter\(req|\.\.\._scope|_bf\.branchId/.test(d)
    );
    expect(unscoped).toEqual([]);
  });

  test('coverage floor — scoping applied broadly', () => {
    const count = (SRC.match(/branchScopeFilter\(req/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(18);
  });
});
