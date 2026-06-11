'use strict';

/**
 * W1177 — spread-order mass-assignment guard for the legacy routes/ layer
 * (companion to the W1176 domains/ guard — same bug class, bigger surface).
 *
 * Bug class: `{ authorityField: <server value>, ...req.body }` — the spread
 * comes AFTER the server-pinned field, so a body-carried key silently
 * overrides it. Found live in:
 *
 *   - routes/hrAdvanced.routes.js POST /employees/:employeeId/skills —
 *     body employeeId could divert a skill record to another employee.
 *   - routes/rbac.routes.js POST /users/:userId/roles — body userId could
 *     divert a role assignment to a different user than the URL-addressed
 *     one (admin-gated, but role-assignment integrity must not depend on
 *     payload discipline).
 *
 * Audit baseline at fix time: 364 spread sites across routes/, exactly 2
 * vulnerable — both fixed in this wave. Ratchet baseline is EMPTY: any new
 * pin-before-spread fails CI.
 */

const fs = require('fs');
const path = require('path');

const ROUTES = path.resolve(__dirname, '../routes');

const SERVER_AUTHORITY_FIELDS = [
  'employeeId',
  'staffId',
  'createdBy',
  'updatedBy',
  'assignedBy',
  'branchId',
  'userId',
  'therapistId',
  'organizationId',
  'beneficiaryId',
];

function listRouteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRouteFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function findPinBeforeSpread(src) {
  const offenders = [];
  const objRe = /\{[^{}]*\.\.\.req\.body[^{}]*\}/g;
  let m;
  while ((m = objRe.exec(src)) !== null) {
    const before = m[0].split('...req.body')[0];
    for (const field of SERVER_AUTHORITY_FIELDS) {
      if (new RegExp(`\\b${field}\\s*:`).test(before)) {
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push({ line, field, snippet: m[0].replace(/\s+/g, ' ').slice(0, 120) });
      }
    }
  }
  return offenders;
}

describe('W1177 — legacy routes/: authority fields pinned AFTER ...req.body', () => {
  const files = listRouteFiles(ROUTES);

  test('sanity: legacy route files discovered', () => {
    expect(files.length).toBeGreaterThan(300);
  });

  test('no pin-before-spread mass-assignment anywhere in routes/', () => {
    const all = [];
    for (const full of files) {
      const offenders = findPinBeforeSpread(fs.readFileSync(full, 'utf8'));
      for (const o of offenders) {
        all.push(
          `${path.relative(ROUTES, full).replace(/\\/g, '/')}:${o.line} [${o.field}] ${o.snippet}`
        );
      }
    }
    expect(all).toEqual([]);
  });
});

describe('W1177 — the two fixed routes pin AFTER the spread', () => {
  test('hrAdvanced skills: employeeId pinned after body spread', () => {
    const src = fs.readFileSync(path.join(ROUTES, 'hrAdvanced.routes.js'), 'utf8');
    expect(src).toMatch(
      /\{\s*\.\.\.req\.body,\s*employeeId:\s*req\.params\.employeeId,\s*updatedBy:\s*req\.user\._id,?\s*\}/
    );
  });

  test('rbac role assignment: userId pinned after body spread', () => {
    const src = fs.readFileSync(path.join(ROUTES, 'rbac.routes.js'), 'utf8');
    expect(src).toMatch(
      /\{\s*\.\.\.req\.body,\s*userId:\s*req\.params\.userId,\s*assignedBy:\s*req\.user\._id,?\s*\}/
    );
  });
});
