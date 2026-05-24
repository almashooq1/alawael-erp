'use strict';

/**
 * W359 drift guard — AssistiveDevice + assistive-device routes.
 *
 * Locks W359 build shape:
 *   • model registers as 'AssistiveDevice' with canonical refs
 *   • CATEGORIES (12) + AVAILABILITY (4) + LOAN_STATUSES (7) +
 *     MAINTENANCE_KINDS (7) + CONDITION_GRADES (6) enums frozen
 *   • assetTag + branchId unique compound index
 *   • Wave-18 invariants: availability state machine + loan subdoc
 *     integrity + maintenance subdoc integrity
 *   • virtuals: isLoanOverdue + isMaintenanceOverdue
 *   • 18 endpoints (catalog + loans + maintenance) at /assistive-device
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'AssistiveDevice.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'assistive-device.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/AssistiveDevice');

describe('W359 AssistiveDevice — exports & enums', () => {
  it('exports CATEGORIES with 12 device kinds', () => {
    expect(model.CATEGORIES).toEqual(
      expect.arrayContaining([
        'wheelchair',
        'walker',
        'hearing_aid',
        'prosthetic',
        'orthotic',
        'aac_device',
        'standing_frame',
        'communication_board',
        'feeding_aid',
        'visual_aid',
        'sensory_tool',
        'other',
      ])
    );
    expect(model.CATEGORIES.length).toBe(12);
  });

  it('exports AVAILABILITY with available/loaned/maintenance/retired', () => {
    expect(model.AVAILABILITY).toEqual(['available', 'loaned', 'maintenance', 'retired']);
  });

  it('exports LOAN_STATUSES with the 7-state loan lifecycle', () => {
    expect(model.LOAN_STATUSES).toEqual([
      'requested',
      'approved',
      'checked_out',
      'returned',
      'lost',
      'damaged',
      'cancelled',
    ]);
  });

  it('exports MAINTENANCE_KINDS with 7 entries', () => {
    expect(model.MAINTENANCE_KINDS).toEqual(
      expect.arrayContaining([
        'preventive',
        'corrective',
        'cleaning',
        'calibration',
        'fitting',
        'battery_replacement',
        'inspection',
      ])
    );
    expect(model.MAINTENANCE_KINDS.length).toBe(7);
  });

  it('exports CONDITION_GRADES with new→broken (6 tiers)', () => {
    expect(model.CONDITION_GRADES).toEqual(['new', 'excellent', 'good', 'fair', 'poor', 'broken']);
  });
});

describe('W359 AssistiveDevice — canonical refs + uniqueness', () => {
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('currentLoaneeId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/currentLoaneeId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });

  it('loan subdoc beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(
      /LoanSchema[\s\S]{0,400}beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/
    );
  });

  it('assetTag + branchId compound unique index', () => {
    expect(MODEL_SRC).toMatch(
      /index\(\s*\{\s*assetTag\s*:\s*1\s*,\s*branchId\s*:\s*1\s*\}\s*,\s*\{\s*unique\s*:\s*true\s*\}/
    );
  });
});

describe('W359 AssistiveDevice — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('availability=loaned requires currentLoaneeId + currentLoanStartedAt', () => {
    expect(MODEL_SRC).toMatch(
      /availability\s*===\s*['"]loaned['"][\s\S]{0,400}invalidate\(\s*['"]currentLoaneeId['"]/
    );
    expect(MODEL_SRC).toMatch(
      /availability\s*===\s*['"]loaned['"][\s\S]{0,600}invalidate\(\s*['"]currentLoanStartedAt['"]/
    );
  });

  it('availability=available forces null currentLoaneeId', () => {
    expect(MODEL_SRC).toMatch(
      /availability\s*===\s*['"]available['"][\s\S]{0,300}currentLoaneeId[\s\S]{0,300}invalidate\(\s*\n?\s*['"]currentLoaneeId['"]/
    );
  });

  it('availability=maintenance requires inMaintenanceSince', () => {
    expect(MODEL_SRC).toMatch(
      /availability\s*===\s*['"]maintenance['"][\s\S]{0,200}invalidate\(\s*['"]inMaintenanceSince['"]/
    );
  });

  it('availability=retired requires retiredAt + retirementReason', () => {
    expect(MODEL_SRC).toMatch(
      /availability\s*===\s*['"]retired['"][\s\S]{0,400}invalidate\(\s*['"]retiredAt['"]/
    );
    expect(MODEL_SRC).toMatch(
      /availability\s*===\s*['"]retired['"][\s\S]{0,600}invalidate\(\s*['"]retirementReason['"]/
    );
  });

  it('loan-subdoc requires beneficiaryId + status + startedAt', () => {
    expect(MODEL_SRC).toMatch(/loans\.\$\{i\}\.beneficiaryId/);
    expect(MODEL_SRC).toMatch(/loans\.\$\{i\}\.status/);
    expect(MODEL_SRC).toMatch(/loans\.\$\{i\}\.startedAt/);
  });
});

describe('W359 AssistiveDevice — virtuals', () => {
  it('isLoanOverdue virtual present (compares currentLoanExpectedReturnAt)', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isLoanOverdue['"]\)/);
    expect(MODEL_SRC).toMatch(/currentLoanExpectedReturnAt/);
  });

  it('isMaintenanceOverdue virtual present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isMaintenanceOverdue['"]\)/);
    expect(MODEL_SRC).toMatch(/nextMaintenanceDue/);
  });
});

describe('W359 assistive-device routes — endpoint surface', () => {
  const endpoints = [
    // Catalog
    ['get', '/'],
    ['get', '/available'],
    ['get', '/due-maintenance'],
    ['get', '/overdue-loans'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['patch', '/:id'],
    ['post', '/:id/retire'],
    ['delete', '/:id'],
    // Loans
    ['post', '/:id/loans'],
    ['post', '/:id/loans/:loanId/approve'],
    ['post', '/:id/loans/:loanId/check-out'],
    ['post', '/:id/loans/:loanId/return'],
    ['post', '/:id/loans/:loanId/mark-lost'],
    ['post', '/:id/loans/:loanId/mark-damaged'],
    ['post', '/:id/loans/:loanId/cancel'],
    // Maintenance
    ['post', '/:id/maintenance'],
    ['post', '/:id/maintenance/start'],
    ['post', '/:id/maintenance/end'],
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

  it('check-out flips availability to loaned + sets currentLoanee fields', () => {
    expect(ROUTES_SRC).toMatch(
      /loan\.status\s*=\s*['"]checked_out['"][\s\S]{0,500}row\.availability\s*=\s*['"]loaned['"]/
    );
  });

  it('return flips availability back to available + clears currentLoanee', () => {
    expect(ROUTES_SRC).toMatch(
      /loan\.status\s*=\s*['"]returned['"][\s\S]{0,500}row\.availability\s*=\s*['"]available['"]/
    );
    expect(ROUTES_SRC).toMatch(
      /loan\.status\s*=\s*['"]returned['"][\s\S]{0,800}currentLoaneeId\s*=\s*null/
    );
  });

  it('mark-lost retires the device + clears loanee', () => {
    expect(ROUTES_SRC).toMatch(
      /loan\.status\s*=\s*['"]lost['"][\s\S]{0,500}availability\s*=\s*['"]retired['"]/
    );
  });

  it('mark-damaged moves to maintenance', () => {
    expect(ROUTES_SRC).toMatch(
      /loan\.status\s*=\s*['"]damaged['"][\s\S]{0,500}availability\s*=\s*['"]maintenance['"]/
    );
  });
});

describe('W359 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/assistive-device.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /assistiveDeviceRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/assistive-device\.routes['"]\)/
    );
  });

  it('mounts at /assistive-device via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]assistive-device['"]\s*,\s*assistiveDeviceRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W359 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 359/);
    expect(REGISTRY_SRC).toMatch(/الأجهزة المساعدة/);
  });
});
