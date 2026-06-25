/**
 * W1519 — shared guardian resolver: enhancement + consolidation guard
 *
 * (1) pickGuardian priority incl. the new relationship tier (parent/guardian/
 *     grandparent preferred over an arbitrary first-with-phone),
 * (2) static: the event subscribers all REQUIRE the shared resolver (no inline
 *     copy) — proves the W1511/W1513/W1517 consolidation.
 *
 * Pure + static — no DB, no boot.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const resolver = require('../services/whatsapp/whatsappGuardianResolver');

const svcDir = path.join(__dirname, '../services/whatsapp');
const POST_SESSION_SRC = fs.readFileSync(path.join(svcDir, 'whatsappPostSessionSubscriber.js'), 'utf8');
const COMPLAINT_SRC = fs.readFileSync(path.join(svcDir, 'whatsappComplaintResolvedSubscriber.js'), 'utf8');
const DISPATCHER = path.join(svcDir, 'whatsappEventBindingDispatcher.js');

describe('W1519 pickGuardian priority (incl. the new relationship tier)', () => {
  test('1. legal guardian wins over everything', () => {
    expect(
      resolver.pickGuardian([
        { relationship: 'mother', phone: '1', isPrimaryCaregiver: true },
        { relationship: 'father', phone: '2', hasLegalGuardianship: true },
      ]).phone
    ).toBe('2');
  });

  test('2. primary caregiver wins over relationship', () => {
    expect(
      resolver.pickGuardian([
        { relationship: 'father', phone: '1' },
        { relationship: 'mother', phone: '2', isPrimaryCaregiver: true },
      ]).phone
    ).toBe('2');
  });

  test('3. a parent/guardian/grandparent is preferred over a sibling (NEW)', () => {
    expect(
      resolver.pickGuardian([
        { relationship: 'brother', phone: '1' },
        { relationship: 'mother', phone: '2' },
      ]).phone
    ).toBe('2');
    expect(
      resolver.pickGuardian([
        { relationship: 'sister', phone: '1' },
        { relationship: 'guardian', phone: '9' },
      ]).phone
    ).toBe('9');
  });

  test('4. falls back to first-with-phone when no guardian-type relationship', () => {
    expect(resolver.pickGuardian([{ relationship: 'brother', phone: '1' }]).phone).toBe('1');
  });

  test('null on empty / no phone', () => {
    expect(resolver.pickGuardian([])).toBeNull();
    expect(resolver.pickGuardian([{ relationship: 'mother' }])).toBeNull();
  });

  test('GUARDIAN_RELATIONSHIPS exported + parents/guardian included', () => {
    expect(resolver.GUARDIAN_RELATIONSHIPS).toEqual(
      expect.arrayContaining(['father', 'mother', 'guardian'])
    );
    // siblings are NOT guardian relationships
    expect(resolver.GUARDIAN_RELATIONSHIPS).not.toContain('brother');
  });
});

describe('W1519 consolidation — subscribers use the shared resolver (no inline copy)', () => {
  test('post-session + complaint subscribers require whatsappGuardianResolver', () => {
    expect(POST_SESSION_SRC).toMatch(/require\(['"]\.\/whatsappGuardianResolver['"]\)/);
    expect(COMPLAINT_SRC).toMatch(/require\(['"]\.\/whatsappGuardianResolver['"]\)/);
  });

  test('post-session no longer defines its own getGuardianPhone', () => {
    expect(POST_SESSION_SRC).not.toMatch(/async function getGuardianPhone/);
    expect(POST_SESSION_SRC).not.toMatch(/^function pickGuardian/m);
  });

  test('the W1517 dispatcher (if present on this branch) also uses the shared resolver', () => {
    // Off main the dispatcher may not exist yet; assert only if it does.
    if (fs.existsSync(DISPATCHER)) {
      expect(fs.readFileSync(DISPATCHER, 'utf8')).toMatch(/whatsappGuardianResolver/);
    } else {
      expect(true).toBe(true);
    }
  });
});
