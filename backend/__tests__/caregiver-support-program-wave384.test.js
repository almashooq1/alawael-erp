'use strict';

/**
 * W384 drift guard — CaregiverSupportProgram + caregiver-support routes.
 *
 * Locks W384 build (graduation of advanced-family-support-service.js scaffold):
 *   • PROGRAM_TYPES (5) + STATUSES (5) + SESSION_FORMATS (5) + ATTENDANCE (5) frozen
 *   • Canonical refs: Beneficiary / Branch / Guardian / User
 *   • Wave-18 invariants: completed⇒completedAt; discontinued⇒discontinuedAt+reason;
 *     paused⇒pausedAt; sibling_group⇒age_range; training⇒totalModules≥1;
 *     caregiver identity (guardian OR name+relationship); sessions[]⇒sessionDate+format;
 *     module hoursCompleted ≤ targetHours
 *   • Virtuals: sessionsCount + sessionsAttendedCount + modulesCompletedCount +
 *     hoursCompletedTotal + modulesProgressPct + burdenScoreDelta + isOverdue
 *   • 18 endpoints at /caregiver-support
 *   • Mounted in features.registry.js via dualMountAuth
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'CaregiverSupportProgram.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'caregiver-support-program.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const CANONICAL_INDEX_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'intelligence', 'canonical', 'index.js'),
  'utf8'
);

const model = require('../models/CaregiverSupportProgram');

describe('W384 CaregiverSupportProgram — exports & enums', () => {
  it('exposes 5 PROGRAM_TYPES matching the scaffold', () => {
    expect(model.PROGRAM_TYPES).toEqual([
      'caregiver_counseling',
      'caregiver_training',
      'parent_support_group',
      'sibling_support_group',
      'caregiver_peer_support',
    ]);
  });

  it('exposes 5-state STATUSES lifecycle', () => {
    expect(model.STATUSES).toEqual([
      'enrolled',
      'in_progress',
      'paused',
      'completed',
      'discontinued',
    ]);
  });

  it('exposes 5 SESSION_FORMATS', () => {
    expect(model.SESSION_FORMATS).toEqual(['individual', 'family', 'group', 'phone', 'video']);
  });

  it('exposes 5 ATTENDANCE_STATUSES', () => {
    expect(model.ATTENDANCE_STATUSES).toEqual([
      'attended',
      'absent',
      'cancelled',
      'late',
      'partial',
    ]);
  });
});

describe('W384 CaregiverSupportProgram — canonical refs', () => {
  it('beneficiaryId refs Beneficiary (W324+W329)', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });

  it('branchId refs Branch (W326)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('caregiverGuardianId refs Guardian', () => {
    expect(MODEL_SRC).toMatch(
      /caregiverGuardianId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Guardian['"]/
    );
  });

  it('assignedCounselorId + facilitatorId + actorId ref User', () => {
    expect(MODEL_SRC).toMatch(/assignedCounselorId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/facilitatorId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/actorId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });
});

describe('W384 CaregiverSupportProgram — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('caregiver identity (guardian OR name+relationship) enforced', () => {
    expect(MODEL_SRC).toMatch(/hasGuardian/);
    expect(MODEL_SRC).toMatch(/hasNameRelation/);
    expect(MODEL_SRC).toMatch(/invalidate\(\s*\n?\s*['"]caregiverName['"]/);
  });

  it('status=completed requires completedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,300}invalidate\(\s*\n?\s*['"]completedAt['"]/
    );
  });

  it('status=discontinued requires discontinuedAt + reason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]discontinued['"][\s\S]{0,800}invalidate\(\s*\n?\s*['"]discontinuedAt['"]/
    );
    expect(MODEL_SRC).toMatch(/invalidate\(\s*\n?\s*['"]discontinuationReason['"]/);
  });

  it('status=paused requires pausedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]paused['"][\s\S]{0,300}invalidate\(\s*\n?\s*['"]pausedAt['"]/
    );
  });

  it('sibling_support_group requires age range', () => {
    expect(MODEL_SRC).toMatch(
      /programType\s*===\s*['"]sibling_support_group['"][\s\S]{0,600}invalidate\(\s*['"]siblingAgeRange['"]/
    );
  });

  it('caregiver_training requires totalModules ≥ 1', () => {
    expect(MODEL_SRC).toMatch(
      /programType\s*===\s*['"]caregiver_training['"][\s\S]{0,400}invalidate\(\s*['"]totalModules['"]/
    );
  });

  it('sessions[] requires sessionDate + format', () => {
    expect(MODEL_SRC).toMatch(/sessions\.\$\{i\}\.sessionDate/);
    expect(MODEL_SRC).toMatch(/sessions\.\$\{i\}\.format/);
  });

  it('module hoursCompleted ≤ targetHours invariant', () => {
    expect(MODEL_SRC).toMatch(
      /hoursCompleted\)\s*>\s*Number\(\s*m\.targetHours[\s\S]{0,200}invalidate/
    );
  });

  it('Zarit burden scores constrained to [0, 88]', () => {
    expect(MODEL_SRC).toMatch(/preProgramBurdenScore[\s\S]{0,150}max\s*:\s*88/);
    expect(MODEL_SRC).toMatch(/postProgramBurdenScore[\s\S]{0,150}max\s*:\s*88/);
  });
});

describe('W384 CaregiverSupportProgram — virtuals', () => {
  it('sessionsCount virtual present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]sessionsCount['"]\)/);
  });

  it('sessionsAttendedCount counts attendanceStatus=attended', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]sessionsAttendedCount['"]\)/);
    expect(MODEL_SRC).toMatch(/attendanceStatus\s*===\s*['"]attended['"]/);
  });

  it('modulesCompletedCount + modulesProgressPct virtuals present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]modulesCompletedCount['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]modulesProgressPct['"]\)/);
  });

  it('hoursCompletedTotal sums modulesProgress.hoursCompleted', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]hoursCompletedTotal['"]\)/);
  });

  it('burdenScoreDelta = post - pre', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]burdenScoreDelta['"]\)/);
    expect(MODEL_SRC).toMatch(/postProgramBurdenScore\s*-\s*this\.outcomes\.preProgramBurdenScore/);
  });

  it('isOverdue virtual present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isOverdue['"]\)/);
  });
});

describe('W384 caregiver-support-program routes — endpoint surface', () => {
  const endpoints = [
    ['get', '/'],
    ['get', '/by-beneficiary/:id'],
    ['get', '/overdue'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['post', '/:id/start'],
    ['post', '/:id/pause'],
    ['post', '/:id/resume'],
    ['post', '/:id/complete'],
    ['post', '/:id/discontinue'],
    ['post', '/:id/sessions'],
    ['patch', '/:id/sessions/:sId'],
    ['delete', '/:id/sessions/:sId'],
    ['post', '/:id/modules'],
    ['patch', '/:id/modules/:mId'],
    ['post', '/:id/outcomes'],
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

  it('start route blocks if not enrolled', () => {
    expect(ROUTES_SRC).toMatch(/row\.status\s*!==\s*['"]enrolled['"][\s\S]{0,400}status\(409\)/);
  });

  it('discontinue route requires reason', () => {
    expect(ROUTES_SRC).toMatch(/reason\s*مطلوب/);
  });

  it('modules route gated to programType=caregiver_training', () => {
    expect(ROUTES_SRC).toMatch(
      /row\.programType\s*!==\s*['"]caregiver_training['"][\s\S]{0,300}status\(409\)/
    );
  });

  it('sessions auto-promote enrolled → in_progress on first record', () => {
    expect(ROUTES_SRC).toMatch(/first session recorded/);
  });

  it('outcomes route clamps Zarit to [0, 88]', () => {
    expect(ROUTES_SRC).toMatch(/Math\.min\(88,\s*body\.preProgramBurdenScore\)/);
    expect(ROUTES_SRC).toMatch(/Math\.min\(88,\s*body\.postProgramBurdenScore\)/);
  });

  it('patch blocks edits on completed / discontinued', () => {
    expect(ROUTES_SRC).toMatch(
      /row\.status\s*===\s*['"]completed['"][\s\S]{0,200}row\.status\s*===\s*['"]discontinued['"]/
    );
  });
});

describe('W384 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/caregiver-support-program.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /caregiverSupportProgramRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/caregiver-support-program\.routes['"]\)/
    );
  });

  it('mounts at /caregiver-support via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]caregiver-support['"]\s*,\s*caregiverSupportProgramRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W384 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 384/);
    expect(REGISTRY_SRC).toMatch(/برنامج دعم مقدمي الرعاية/);
  });
});

describe('W384 canonical schema', () => {
  it('registered in intelligence/canonical/index.js', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/caregiver-support-program\.canonical['"]\)/
    );
  });

  it('canonical entry exposes the Zod schema', () => {
    const entry = require('../intelligence/canonical/schemas/caregiver-support-program.canonical');
    expect(entry.name).toBe('CaregiverSupportProgram');
    expect(entry.mongooseModelName).toBe('CaregiverSupportProgram');
    expect(typeof entry.schema.safeParse).toBe('function');
    const ok = entry.schema.safeParse({
      beneficiaryId: '507f1f77bcf86cd799439011',
      programType: 'caregiver_counseling',
      status: 'enrolled',
    });
    expect(ok.success).toBe(true);
    const bad = entry.schema.safeParse({
      beneficiaryId: '507f1f77bcf86cd799439011',
      programType: 'not_a_real_type',
      status: 'enrolled',
    });
    expect(bad.success).toBe(false);
  });
});
