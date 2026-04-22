/**
 * rbac-roles-consistency.test.js — drift invariants for the Phase 7
 * role expansion.
 *
 * Three things must stay in sync forever:
 *   1. models/User.js `role` enum
 *   2. config/rbac.config.js `ROLES` map
 *   3. config/rbac.config.js `ROLE_HIERARCHY` map
 *   4. config/rbac.config.js `ROLE_PERMISSIONS` map
 *
 * If anyone adds a role to one of these without updating the others,
 * authorization silently misbehaves (enum accepts a role that has no
 * permissions, or hierarchy includes a role the model rejects on save).
 * This test fails CI the moment that drift appears.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROLES, ROLE_HIERARCHY, ROLE_PERMISSIONS } = require('../config/rbac.config');

describe('RBAC role-enum ↔ config consistency', () => {
  // Extract the User.role enum by parsing the file (avoids importing
  // Mongoose which would require a connection in test env).
  const userModelSrc = fs.readFileSync(path.join(__dirname, '..', 'models', 'User.js'), 'utf8');

  function extractEnum(src) {
    const match = src.match(/role:\s*\{[\s\S]*?enum:\s*\[([\s\S]*?)\]/);
    if (!match) throw new Error('User.role enum not found');
    // Strip // comments line by line BEFORE splitting on commas, so a
    // comment like `// Level 0` doesn't leak into the role list.
    return match[1]
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, '').trim())
      .join('\n')
      .split(',')
      .map(s =>
        s
          .trim()
          .replace(/^['"]|['"]$/g, '')
          .trim()
      )
      .filter(Boolean);
  }

  const userEnum = extractEnum(userModelSrc);
  const rolesMapValues = Object.values(ROLES);

  it('User.role enum has 40+ values (Phase 7 expansion landed)', () => {
    expect(userEnum.length).toBeGreaterThanOrEqual(40);
  });

  it('every ROLES key in rbac.config is also in User.role enum', () => {
    const missing = rolesMapValues.filter(r => !userEnum.includes(r));
    if (missing.length) {
      throw new Error(
        `rbac.config ROLES map has ${missing.length} role(s) NOT in User.role enum:\n  ` +
          missing.join('\n  ') +
          '\nAdd them to models/User.js enum or remove from rbac.config.'
      );
    }
  });

  it('every User.role enum value is also in rbac.config ROLES map', () => {
    const missing = userEnum.filter(r => !rolesMapValues.includes(r));
    if (missing.length) {
      throw new Error(
        `User.role enum has ${missing.length} role(s) NOT in rbac.config ROLES map:\n  ` +
          missing.join('\n  ') +
          '\nAdd them to config/rbac.config.js ROLES + ROLE_HIERARCHY + ROLE_PERMISSIONS.'
      );
    }
  });

  it('every role in ROLES map has a ROLE_HIERARCHY entry', () => {
    const missing = rolesMapValues.filter(r => !ROLE_HIERARCHY[r]);
    if (missing.length) {
      throw new Error(
        `${missing.length} role(s) in ROLES missing from ROLE_HIERARCHY:\n  ` + missing.join('\n  ')
      );
    }
  });

  it('every role in ROLES map has a ROLE_PERMISSIONS entry (possibly empty)', () => {
    const missing = rolesMapValues.filter(r => ROLE_PERMISSIONS[r] === undefined);
    if (missing.length) {
      throw new Error(
        `${missing.length} role(s) in ROLES missing from ROLE_PERMISSIONS:\n  ` +
          missing.join('\n  ') +
          '\nEven roles that inherit everything need an entry (use `{}`).'
      );
    }
  });

  it('every ROLE_HIERARCHY.inherits[] reference points to a known role', () => {
    const errors = [];
    for (const [role, meta] of Object.entries(ROLE_HIERARCHY)) {
      for (const parent of meta.inherits || []) {
        if (!ROLE_HIERARCHY[parent]) {
          errors.push(`${role} → inherits [${parent}] which isn't in the hierarchy`);
        }
      }
    }
    if (errors.length) throw new Error('Dangling inheritance:\n  ' + errors.join('\n  '));
  });

  it('every ROLE_HIERARCHY entry has a level in [0, 100]', () => {
    const bad = Object.entries(ROLE_HIERARCHY).filter(
      ([, m]) => typeof m.level !== 'number' || m.level < 0 || m.level > 100
    );
    if (bad.length) {
      throw new Error(
        `Out-of-range level(s):\n  ` + bad.map(([r, m]) => `${r} = ${m.level}`).join('\n  ')
      );
    }
  });
});

describe('Phase 7 — specific role inclusions (spec lock)', () => {
  // These roles MUST exist after the 2026-04-22 Phase 7 commit. If a
  // future refactor drops one, this test makes the regression obvious.
  const PHASE_7_REQUIRED = [
    // HQ
    'ceo',
    'group_gm',
    'group_cfo',
    'group_chro',
    'group_quality_officer',
    'compliance_officer',
    'internal_auditor',
    'it_admin',
    // Region
    'regional_director',
    'regional_quality',
    // Branch
    'branch_manager',
    'clinical_director',
    'quality_coordinator',
    // Dept supervisors
    'hr_supervisor',
    'finance_supervisor',
    'therapy_supervisor',
    'special_ed_supervisor',
    // Specialty
    'therapist_slp',
    'therapist_ot',
    'therapist_pt',
    'therapist_psych',
    'special_ed_teacher',
    'therapy_assistant',
    // Support
    'hr_officer',
    'driver',
    'bus_assistant',
    // External
    'guardian',
  ];

  it('all 27 Phase-7 roles are in the ROLES map', () => {
    const valuesSet = new Set(Object.values(ROLES));
    const missing = PHASE_7_REQUIRED.filter(r => !valuesSet.has(r));
    if (missing.length) {
      throw new Error('Missing Phase 7 roles:\n  ' + missing.join('\n  '));
    }
  });
});
