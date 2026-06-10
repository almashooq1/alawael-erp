'use strict';

/**
 * mass-assignment-array-push-tier2-wave1130.test.js — Tier-2 drift guard.
 *
 * Tier 2 of the 2026-06-10 mass-assignment sweep
 * (docs/architecture/SECURITY-mass-assignment-sweep-2026-06-10.md): routes that
 * pushed raw req.body into an array subdoc via $push/$each. Now sanitized with
 * stripUpdateMeta (same doctrine as W1091/W1112). Lower severity than a
 * top-level $set (the pushed subdoc can't set sibling top-level fields) but
 * still real over-posting into the subdoc's own fields.
 *
 * Sites fixed: enterpriseUltra (escalationPath) · fleetFuelCards (transactions)
 * · fleetTires (pressureLogs) · groupPrograms (sessions) · internalAudit
 * (observations).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/mass-assignment-array-push-tier2-wave1130.test.js
 */

const fs = require('fs');
const path = require('path');

const read = p => fs.readFileSync(path.join(__dirname, '..', 'routes', p), 'utf-8');

const FILES = {
  enterpriseUltra: read('enterpriseUltra.routes.js'),
  fleetFuelCards: read('fleetFuelCards.js'),
  fleetTires: read('fleetTires.js'),
  groupPrograms: read('groupPrograms.routes.js'),
  internalAudit: read('internalAudit.js'),
};

describe('W1130 — Tier-2 array-push routes sanitize the pushed req.body', () => {
  for (const [name, src] of Object.entries(FILES)) {
    test(`${name}: imports/uses stripUpdateMeta`, () => {
      expect(src).toMatch(/stripUpdateMeta/);
    });

    test(`${name}: no raw \`$each: [req.body]\` push remains`, () => {
      expect(src).not.toMatch(/\$each:\s*\[req\.body\]/);
    });

    test(`${name}: no raw \`{ ...req.body, recorded\` push remains`, () => {
      expect(src).not.toMatch(/\{\s*\.\.\.req\.body,\s*recorded/);
    });
  }
});
