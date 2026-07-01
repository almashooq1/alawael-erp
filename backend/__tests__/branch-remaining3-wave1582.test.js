'use strict';

/**
 * W1582 — last two of the ?branchId= scope-leak finding (after #851/#862/#864/#872).
 *  - notificationLog: 2 list handlers had `requireBranchAccess` (rejects explicit foreign
 *    branchId) but no auto-filter, so omitting ?branchId= returned ALL branches' notification
 *    audit trail. Scoped with branchFilter(req) + guarded override.
 *  - parentPortal GET /admin/complaints (staff-only): listed ParentComplaint with no branch
 *    base → a restricted staff user saw all branches' parent complaints. Scoped likewise.
 *
 * drilldown was deliberately NOT changed: it is authenticated but ungated exec KPI analytics
 * whose `?branchId=` param is by design (cross-branch drill-in) — restricting it (exec-only vs
 * branch-scoped) is a product decision, flagged for the owner rather than guessed.
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');
function strip(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}
function unguardedOverrides(src, target) {
  const re = new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.branchId\\s*=\\s*req\\.query\\.branchId', 'g');
  let m;
  const bad = [];
  while ((m = re.exec(src))) {
    const pre = src.slice(Math.max(0, m.index - 300), m.index);
    const lastIf = pre.lastIndexOf('if (');
    if (!new RegExp('!\\s*' + target + '\\.branchId\\b').test(lastIf >= 0 ? pre.slice(lastIf) : pre)) {
      bad.push(src.slice(0, m.index).split('\n').length);
    }
  }
  return bad;
}

describe('W1582 remaining branchId scope-leaks are closed', () => {
  test('notificationLog: list filters scoped with branchFilter + overrides guarded', () => {
    const src = strip(fs.readFileSync(path.join(ROUTES, 'notificationLog.routes.js'), 'utf8'));
    expect(src).toMatch(/branchScope\.middleware/);
    expect(src).toMatch(/const filter = \{ \.\.\.branchFilter\(req\) \}/);
    expect(unguardedOverrides(src, 'filter')).toEqual([]);
  });

  test('parentPortal GET /admin/complaints: query scoped with branchFilter + override guarded', () => {
    const src = strip(fs.readFileSync(path.join(ROUTES, 'parentPortal.routes.js'), 'utf8'));
    // the staff complaint list must scope its query
    const idx = src.indexOf("'/admin/complaints'");
    expect(idx).toBeGreaterThan(-1);
    const block = src.slice(idx, idx + 1500);
    expect(block).toMatch(/const query = \{ \.\.\.branchFilter\(req\) \}/);
    expect(unguardedOverrides(block, 'query')).toEqual([]);
  });
});
