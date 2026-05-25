'use strict';

/**
 * W368 drift guard — BeneficiaryDietPrescription + routes.
 *
 * Locks the IDDSI dysphagia framework + NPO + enteral feeding shape.
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'BeneficiaryDietPrescription.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'diet-prescription.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/BeneficiaryDietPrescription');

describe('W368 BeneficiaryDietPrescription — IDDSI + clinical enums', () => {
  it('FOOD_IDDSI per IDDSI framework (0, 3, 4, 5, 6, 7) — skipping drinks-only 1+2', () => {
    expect(model.FOOD_IDDSI).toEqual([0, 3, 4, 5, 6, 7]);
  });

  it('DRINK_IDDSI per IDDSI framework (0-4)', () => {
    expect(model.DRINK_IDDSI).toEqual([0, 1, 2, 3, 4]);
  });

  it('ENTERAL_ROUTES covers NG/OG/GT/JT/GJT', () => {
    expect(model.ENTERAL_ROUTES).toEqual(['ng', 'og', 'gt', 'jt', 'gjt']);
  });

  it('ENTERAL_DELIVERY covers bolus/continuous/intermittent/gravity', () => {
    expect(model.ENTERAL_DELIVERY).toEqual(['bolus', 'continuous', 'intermittent', 'gravity']);
  });

  it('PRESCRIBER_DISCIPLINES includes SLP / RD / MD / GI / Pediatrics', () => {
    expect(model.PRESCRIBER_DISCIPLINES).toEqual([
      'speech_language_pathologist',
      'registered_dietitian',
      'physician',
      'gastroenterologist',
      'pediatrician',
    ]);
  });

  it('STATUSES = draft/active/on_hold/discontinued', () => {
    expect(model.STATUSES).toEqual(['draft', 'active', 'on_hold', 'discontinued']);
  });

  it('ALLERGENS aligned with kitchen.model.js allergen set', () => {
    expect(model.ALLERGENS).toEqual([
      'gluten',
      'dairy',
      'nuts',
      'eggs',
      'soy',
      'fish',
      'shellfish',
      'sesame',
      'other',
    ]);
  });
});

describe('W368 — canonical refs', () => {
  it('beneficiaryId refs Beneficiary AND is unique (singleton per beneficiary)', () => {
    expect(MODEL_SRC).toMatch(
      /beneficiaryId\s*:\s*\{[\s\S]{0,300}ref\s*:\s*['"]Beneficiary['"][\s\S]{0,300}unique\s*:\s*true/
    );
  });

  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('prescribedBy refs User', () => {
    expect(MODEL_SRC).toMatch(/prescribedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });

  it('linkedCarePlanVersionId refs CarePlanVersion (W41)', () => {
    expect(MODEL_SRC).toMatch(
      /linkedCarePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });
});

describe('W368 — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('active requires NPO or IDDSI or enteral (must have a prescription)', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]active['"][\s\S]{0,400}!this\.npo[\s\S]{0,300}invalidate/
    );
  });

  it('NPO=true forbids IDDSI levels', () => {
    expect(MODEL_SRC).toMatch(
      /this\.npo[\s\S]{0,400}foodIddsiLevel[\s\S]{0,300}invalidate\(\s*['"]foodIddsiLevel['"][\s\S]{0,200}'IDDSI/
    );
  });

  it('NPO=true requires startedAt + reason', () => {
    expect(MODEL_SRC).toMatch(/this\.npo[\s\S]{0,600}invalidate\(\s*['"]npoStartedAt['"]/);
    expect(MODEL_SRC).toMatch(/this\.npo[\s\S]{0,800}invalidate\(\s*['"]npoReason['"]/);
  });

  it('enteral active requires route + formulaName', () => {
    expect(MODEL_SRC).toMatch(
      /enteralFeeding\.active[\s\S]{0,300}invalidate\(\s*['"]enteralFeeding\.route['"]/
    );
    expect(MODEL_SRC).toMatch(
      /enteralFeeding\.active[\s\S]{0,500}invalidate\(\s*\n?\s*['"]enteralFeeding\.formulaName['"]/
    );
  });

  it('continuous feeding requires ratePerHour', () => {
    expect(MODEL_SRC).toMatch(
      /deliveryMode\s*===\s*['"]continuous['"][\s\S]{0,400}invalidate\(\s*\n?\s*['"]enteralFeeding\.ratePerHour['"]/
    );
  });

  it('active requires prescriber + discipline + nextReviewDue', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]active['"][\s\S]{0,600}invalidate\(\s*['"]prescribedBy['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]active['"][\s\S]{0,800}invalidate\(\s*['"]prescriberDiscipline['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]active['"][\s\S]{0,1000}invalidate\(\s*['"]nextReviewDue['"]/
    );
  });

  it('allergens whitelist enforced', () => {
    expect(MODEL_SRC).toMatch(/!ALLERGENS\.includes\(a\)/);
  });
});

describe('W368 — virtuals', () => {
  it('reviewOverdue + isEnteral', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]reviewOverdue['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isEnteral['"]\)/);
  });
});

describe('W368 — route surface', () => {
  const endpoints = [
    ['get', '/'],
    ['get', '/by-beneficiary/:id'],
    ['get', '/due-review'],
    ['get', '/npo-active'],
    ['get', '/enteral-active'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['post', '/:id/activate'],
    ['post', '/:id/start-npo'],
    ['post', '/:id/end-npo'],
    ['post', '/:id/start-enteral'],
    ['post', '/:id/stop-enteral'],
    ['post', '/:id/review'],
    ['post', '/:id/discontinue'],
    ['patch', '/:id'],
    ['delete', '/:id'],
  ];
  for (const [verb, p] of endpoints) {
    it(`${verb.toUpperCase()} ${p}`, () => {
      const escaped = p.replace(/\//g, '\\/');
      expect(ROUTES_SRC).toMatch(new RegExp(`router\\.${verb}\\(\\s*['"]${escaped}['"]`));
    });
  }

  it('authenticates via router.use(authenticateToken)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('PRESCRIBE_ROLES is narrower than READ_ROLES (clinical orders)', () => {
    expect(ROUTES_SRC).toMatch(/PRESCRIBE_ROLES\s*=\s*\[/);
    expect(ROUTES_SRC).toMatch(
      /PRESCRIBE_ROLES\s*=\s*\[[\s\S]{0,500}['"]speech_language_pathologist['"]/
    );
    // PRESCRIBE_ROLES should NOT include 'parent' or 'guardian'
    const block = ROUTES_SRC.split('PRESCRIBE_ROLES')[1]?.split(']')[0] || '';
    expect(block).not.toMatch(/['"]parent['"]/);
    expect(block).not.toMatch(/['"]guardian['"]/);
  });

  it('POST / returns 409 on dup beneficiaryId', () => {
    expect(ROUTES_SRC).toMatch(/existing[\s\S]{0,200}status\(409\)/);
  });

  it('activate gates on prescriberDiscipline being whitelisted', () => {
    expect(ROUTES_SRC).toMatch(/PRESCRIBER_DISCIPLINES\.includes\(discipline\)/);
  });
});

describe('W368 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/diet-prescription.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /dietPrescriptionRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/diet-prescription\.routes['"]\)/
    );
  });

  it('mounts at /diet-prescription via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]diet-prescription['"]\s*,\s*dietPrescriptionRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W368 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 368/);
    expect(REGISTRY_SRC).toMatch(/وصفة النظام الغذائي/);
  });
});
