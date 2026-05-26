'use strict';

/**
 * W464 drift guard — Independent Advocate canonical role registration.
 *
 * Locks:
 *   • ROLES.INDEPENDENT_ADVOCATE = 'independent_advocate' (snake_case)
 *   • ROLES.CULTURAL_OFFICER = 'cultural_officer' (Phase E reservation)
 *   • ROLES.FAMILY_COUNSELLOR = 'family_counsellor' (Phase C reservation)
 *   • INDEPENDENT_ADVOCATE at Level 4 (cross-discipline + single-branch)
 *   • ALL_ROLES includes the 3 new roles
 *   • resolveRole + levelOf work correctly for the new roles
 *
 * Static analysis + runtime check (no DB).
 */

const fs = require('fs');
const path = require('path');

const rolesModule = require('../config/constants/roles.constants');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'config', 'constants', 'roles.constants.js'),
  'utf8'
);

describe('W464 — Independent Advocate canonical role', () => {
  it('exports ROLES.INDEPENDENT_ADVOCATE = "independent_advocate"', () => {
    expect(rolesModule.ROLES.INDEPENDENT_ADVOCATE).toBe('independent_advocate');
  });

  it('ROLES.INDEPENDENT_ADVOCATE follows snake_case convention', () => {
    expect(rolesModule.ROLES.INDEPENDENT_ADVOCATE).toMatch(/^[a-z_]+$/);
  });

  it('INDEPENDENT_ADVOCATE is in ALL_ROLES', () => {
    expect(rolesModule.ALL_ROLES).toContain('independent_advocate');
  });

  it('source explicitly references CRPD Article 12 + ADR-031', () => {
    expect(SRC).toMatch(/CRPD Article 12/);
    expect(SRC).toMatch(/ADR-031/);
  });

  it('header documents conflict-of-interest-free permissions design', () => {
    expect(SRC).toMatch(/conflict-of-interest-free/);
  });
});

describe('W464 — Phase C/E future role reservations', () => {
  it('exports ROLES.CULTURAL_OFFICER for Phase E', () => {
    expect(rolesModule.ROLES.CULTURAL_OFFICER).toBe('cultural_officer');
  });

  it('exports ROLES.FAMILY_COUNSELLOR for Phase C', () => {
    expect(rolesModule.ROLES.FAMILY_COUNSELLOR).toBe('family_counsellor');
  });

  it('both Phase C/E roles in ALL_ROLES', () => {
    expect(rolesModule.ALL_ROLES).toContain('cultural_officer');
    expect(rolesModule.ALL_ROLES).toContain('family_counsellor');
  });

  it('source documents Phase E + Phase C forward-compat intent', () => {
    expect(SRC).toMatch(/Phase E/);
    expect(SRC).toMatch(/Phase C/);
    expect(SRC).toMatch(/forward-compat/);
  });
});

describe('W464 — role-level hierarchy assignments', () => {
  it('INDEPENDENT_ADVOCATE at Level 4 (cross-discipline, single-branch by default)', () => {
    expect(rolesModule.levelOf('independent_advocate')).toBe(4);
  });

  it('CULTURAL_OFFICER at Level 5 (professional caseload)', () => {
    expect(rolesModule.levelOf('cultural_officer')).toBe(5);
  });

  it('FAMILY_COUNSELLOR at Level 5', () => {
    expect(rolesModule.levelOf('family_counsellor')).toBe(5);
  });

  it('hasLevel correctly routes Level 4 access for advocate', () => {
    expect(rolesModule.hasLevel(['independent_advocate'], 4)).toBe(true);
    expect(rolesModule.hasLevel(['independent_advocate'], 3)).toBe(false);
  });
});

describe('W464 — resolveRole handles new roles without aliasing', () => {
  it('returns canonical name unchanged for independent_advocate', () => {
    expect(rolesModule.resolveRole('independent_advocate')).toBe('independent_advocate');
  });
  it('returns canonical name unchanged for cultural_officer', () => {
    expect(rolesModule.resolveRole('cultural_officer')).toBe('cultural_officer');
  });
  it('returns canonical name unchanged for family_counsellor', () => {
    expect(rolesModule.resolveRole('family_counsellor')).toBe('family_counsellor');
  });
});

describe('W464 — backward compatibility', () => {
  it('previously existing roles still resolve correctly', () => {
    expect(rolesModule.ROLES.SUPER_ADMIN).toBe('super_admin');
    expect(rolesModule.ROLES.THERAPIST).toBe('therapist');
    expect(rolesModule.ROLES.DPO).toBe('dpo');
    expect(rolesModule.levelOf('super_admin')).toBe(1);
    expect(rolesModule.levelOf('dpo')).toBe(2);
  });

  it('CROSS_BRANCH_ROLES + TENANT_BYPASS_ROLES unchanged (no advocate in either)', () => {
    expect(rolesModule.CROSS_BRANCH_ROLES).not.toContain('independent_advocate');
    expect(rolesModule.TENANT_BYPASS_ROLES).not.toContain('independent_advocate');
  });

  it('ALL_ROLES grew by 3 (or more — additive)', () => {
    // Conservative lower bound — just sanity-check we didn't shrink
    expect(rolesModule.ALL_ROLES.length).toBeGreaterThanOrEqual(25);
  });
});
