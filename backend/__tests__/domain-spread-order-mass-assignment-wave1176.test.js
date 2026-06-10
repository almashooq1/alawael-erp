'use strict';

/**
 * W1176 — spread-order mass-assignment guard (attendance identity spoofing).
 *
 * Bug class: `{ employeeId: req.user?._id, ...req.body }` — the spread comes
 * AFTER the server-pinned field, so a body-carried `employeeId` silently
 * overrides the authenticated identity. Found in hr attendance check-in /
 * check-out: any logged-in caller could record attendance on behalf of any
 * other employee (timesheet/payroll fraud vector).
 *
 * Fix: pin AFTER the spread — `{ ...req.body, employeeId: req.user?._id }`.
 *
 * This guard ratchets the whole domains/ routes layer: any object literal
 * that places a server-authority field BEFORE `...req.body` fails CI.
 */

const fs = require('fs');
const path = require('path');

const DOMAINS = path.resolve(__dirname, '../domains');

// Fields that must NEVER be client-overridable once pinned by the server.
const SERVER_AUTHORITY_FIELDS = [
  'employeeId',
  'staffId',
  'createdBy',
  'updatedBy',
  'branchId',
  'userId',
  'therapistId',
  'organizationId',
];

function listRouteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRouteFiles(full));
    else if (entry.name.endsWith('.routes.js')) out.push(full);
  }
  return out;
}

function findPinBeforeSpread(src) {
  const offenders = [];
  // Object literals containing ...req.body (single-level braces is enough —
  // the dangerous pattern is flat: { pinned: ..., ...req.body }).
  const objRe = /\{[^{}]*\.\.\.req\.body[^{}]*\}/g;
  let m;
  while ((m = objRe.exec(src)) !== null) {
    const obj = m[0];
    const before = obj.split('...req.body')[0];
    for (const field of SERVER_AUTHORITY_FIELDS) {
      if (new RegExp(`\\b${field}\\s*:`).test(before)) {
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push({ line, field, snippet: obj.replace(/\s+/g, ' ').slice(0, 120) });
      }
    }
  }
  return offenders;
}

describe('W1176 — server-authority fields must be pinned AFTER ...req.body', () => {
  const files = listRouteFiles(DOMAINS);

  test('sanity: domain route files discovered', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  test.each(files.map(f => [path.relative(DOMAINS, f).replace(/\\/g, '/'), f]))(
    '%s — no pin-before-spread mass-assignment',
    (_rel, full) => {
      const offenders = findPinBeforeSpread(fs.readFileSync(full, 'utf8'));
      expect(offenders).toEqual([]);
    }
  );
});

describe('W1176 — the two fixed attendance routes pin identity after spread', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(path.join(DOMAINS, 'hr/routes/hr.routes.js'), 'utf8');
  });

  test('check-in: ...req.body BEFORE employeeId pin', () => {
    expect(src).toMatch(
      /checkIn\(\{\s*\.\.\.req\.body,\s*employeeId:\s*req\.user\?\._id\s*\}\)/
    );
  });

  test('check-out: ...req.body BEFORE employeeId pin', () => {
    expect(src).toMatch(
      /checkOut\(\{\s*\.\.\.req\.body,\s*employeeId:\s*req\.user\?\._id\s*\}\)/
    );
  });

  test('no remaining identity-pin-before-spread in hr router', () => {
    expect(src).not.toMatch(/\{\s*employeeId:\s*req\.user\?\._id,\s*\.\.\.req\.body/);
  });
});

describe('W1176 — detector self-test', () => {
  test('flags pin-before-spread', () => {
    const bad = "service.create({ employeeId: req.user?._id, ...req.body })";
    expect(findPinBeforeSpread(bad)).toHaveLength(1);
    expect(findPinBeforeSpread(bad)[0].field).toBe('employeeId');
  });

  test('accepts pin-after-spread', () => {
    const good = "service.create({ ...req.body, employeeId: req.user?._id })";
    expect(findPinBeforeSpread(good)).toEqual([]);
  });

  test('accepts plain spread with no authority fields', () => {
    const ok = "service.create({ ...req.body, date: new Date() })";
    expect(findPinBeforeSpread(ok)).toEqual([]);
  });
});
