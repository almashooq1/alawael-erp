'use strict';

/**
 * W363 drift guard — RespiteBooking + respite routes.
 *
 * Locks W363 build:
 *   • TYPES (3) + STATUSES (8) + FUNDING_SOURCES (5) frozen
 *   • Wave-18 invariants: endAt>startAt; type/nightCount consistency;
 *     approved⇒approver+at; rejected⇒reason; checked_in⇒checkedInAt;
 *     completed⇒checkedOutAt; cancelled⇒reason+at; emergencyContact
 *     (name+phone) required
 *   • virtuals: durationHours + isUpcoming + isActive
 *   • 17 endpoints with tiered RBAC (INTAKE / APPROVE / OPS / DELETE)
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'RespiteBooking.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'respite.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/RespiteBooking');

describe('W363 RespiteBooking — exports & enums', () => {
  it('TYPES = day/overnight/extended', () => {
    expect(model.TYPES).toEqual(['day', 'overnight', 'extended']);
  });

  it('STATUSES = 8-state lifecycle', () => {
    expect(model.STATUSES).toEqual([
      'requested',
      'approved',
      'rejected',
      'confirmed',
      'checked_in',
      'completed',
      'cancelled',
      'no_show',
    ]);
  });

  it('FUNDING_SOURCES includes disability_authority_subsidy + 4 others', () => {
    expect(model.FUNDING_SOURCES).toEqual([
      'self_pay',
      'disability_authority_subsidy',
      'insurance',
      'charity',
      'mixed',
    ]);
  });
});

describe('W363 RespiteBooking — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });

  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('requestedBy + approvedBy + checkedInBy + checkedOutBy + cancelledBy ref User', () => {
    expect(MODEL_SRC).toMatch(/requestedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/approvedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/checkedInBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/checkedOutBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/cancelledBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });

  it('linkedCarePlanVersionId refs CarePlanVersion (W41)', () => {
    expect(MODEL_SRC).toMatch(
      /linkedCarePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });
});

describe('W363 RespiteBooking — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('endAt must be > startAt', () => {
    expect(MODEL_SRC).toMatch(/this\.endAt\s*<=\s*this\.startAt/);
  });

  it('day-type forces nightCount=0', () => {
    expect(MODEL_SRC).toMatch(
      /bookingType\s*===\s*['"]day['"][\s\S]{0,200}nightCount\s*>\s*0[\s\S]{0,200}invalidate\(\s*['"]nightCount['"]/
    );
  });

  it('overnight/extended require nightCount ≥ 1', () => {
    expect(MODEL_SRC).toMatch(
      /['"]overnight['"][\s\S]{0,200}['"]extended['"][\s\S]{0,300}nightCount\s*<\s*1[\s\S]{0,300}invalidate\(\s*['"]nightCount['"]/
    );
  });

  it('approved requires approver + approvedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]approved['"][\s\S]{0,400}invalidate\(\s*['"]approvedBy['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]approved['"][\s\S]{0,600}invalidate\(\s*['"]approvedAt['"]/
    );
  });

  it('rejected requires rejectionReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]rejected['"][\s\S]{0,300}invalidate\(\s*['"]rejectionReason['"]/
    );
  });

  it('checked_in requires checkedInAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]checked_in['"][\s\S]{0,300}invalidate\(\s*['"]checkedInAt['"]/
    );
  });

  it('completed requires checkedOutAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,300}invalidate\(\s*['"]checkedOutAt['"]/
    );
  });

  it('cancelled requires reason + cancelledAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,400}invalidate\(\s*['"]cancellationReason['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,600}invalidate\(\s*['"]cancelledAt['"]/
    );
  });

  it('emergency contact name + phone required', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]emergencyContactName['"]/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]emergencyContactPhone['"]/);
  });
});

describe('W363 RespiteBooking — virtuals', () => {
  it('durationHours + isUpcoming + isActive', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]durationHours['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isUpcoming['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isActive['"]\)/);
  });
});

describe('W363 respite routes — endpoint surface', () => {
  const endpoints = [
    ['get', '/'],
    ['get', '/by-beneficiary/:id'],
    ['get', '/upcoming'],
    ['get', '/active'],
    ['get', '/day/:date'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['post', '/:id/approve'],
    ['post', '/:id/reject'],
    ['post', '/:id/confirm'],
    ['post', '/:id/check-in'],
    ['post', '/:id/check-out'],
    ['post', '/:id/cancel'],
    ['post', '/:id/no-show'],
    ['patch', '/:id'],
    ['delete', '/:id'],
  ];

  for (const [verb, p] of endpoints) {
    it(`${verb.toUpperCase()} ${p}`, () => {
      const escaped = p.replace(/\//g, '\\/');
      const re = new RegExp(`router\\.${verb}\\(\\s*['"]${escaped}['"]`);
      expect(ROUTES_SRC).toMatch(re);
    });
  }

  it('authenticates via router.use(authenticateToken)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('tiered RBAC: INTAKE_ROLES + APPROVE_ROLES + OPS_ROLES + DELETE_ROLES', () => {
    expect(ROUTES_SRC).toMatch(/INTAKE_ROLES/);
    expect(ROUTES_SRC).toMatch(/APPROVE_ROLES/);
    expect(ROUTES_SRC).toMatch(/OPS_ROLES/);
    expect(ROUTES_SRC).toMatch(/DELETE_ROLES/);
  });

  it('intake roles include parent + guardian (family can lodge requests)', () => {
    expect(ROUTES_SRC).toMatch(
      /INTAKE_ROLES\s*=\s*\[[\s\S]{0,500}['"]parent['"][\s\S]{0,100}['"]guardian['"]/
    );
  });

  it('reject route requires reason', () => {
    expect(ROUTES_SRC).toMatch(/سبب الرفض مطلوب/);
  });

  it('check-out flips to completed', () => {
    expect(ROUTES_SRC).toMatch(/row\.checkedOutAt[\s\S]{0,400}row\.status\s*=\s*['"]completed['"]/);
  });
});

describe('W363 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/respite.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /respiteRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/respite\.routes['"]\)/
    );
  });

  it('mounts at /respite via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]respite['"]\s*,\s*respiteRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W363 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 363/);
    expect(REGISTRY_SRC).toMatch(/حجز الرعاية المؤقتة/);
  });
});
