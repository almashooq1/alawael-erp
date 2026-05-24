'use strict';

/**
 * W360 drift guard — CBAHI registry + CbahiAttestation + cbahi routes.
 *
 * Locks W360 build:
 *   • registry: 8 chapters + 20 starter standards + 13 evidence types
 *   • model registers as 'CbahiAttestation' with canonical Branch ref
 *   • (branchId, standardKey) compound unique index
 *   • Wave-18 invariants: met⇒evidence; partial⇒evidence+gap; not_met⇒gap;
 *     n/a⇒naJustification; non-draft⇒assessor; standardKey∈registry
 *   • 15 endpoints split into registry (3) + attestation (12)
 *   • dualMountAuth at /cbahi
 *
 * Static analysis + pure-data on registry.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'CbahiAttestation.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'cbahi.routes.js'), 'utf8');
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const registry = require('../intelligence/cbahi-standards.registry');
const model = require('../models/CbahiAttestation');

describe('W360 CBAHI registry — chapters', () => {
  it('exposes exactly 8 chapters', () => {
    expect(registry.CHAPTER_KEYS.length).toBe(8);
    expect(registry.CHAPTER_KEYS).toEqual(
      expect.arrayContaining(['PSG', 'MMS', 'IC', 'LD', 'IM', 'ASC', 'PCC', 'EOC'])
    );
  });

  it('every chapter has titleEn + titleAr', () => {
    for (const key of registry.CHAPTER_KEYS) {
      const ch = registry.CHAPTERS[key];
      expect(typeof ch.titleEn).toBe('string');
      expect(ch.titleEn.length).toBeGreaterThan(0);
      expect(typeof ch.titleAr).toBe('string');
      expect(ch.titleAr.length).toBeGreaterThan(0);
    }
  });
});

describe('W360 CBAHI registry — standards', () => {
  it('exposes exactly 20 starter standards', () => {
    expect(Array.isArray(registry.STANDARDS)).toBe(true);
    expect(registry.STANDARDS.length).toBe(20);
  });

  it('each standard has required fields', () => {
    for (const s of registry.STANDARDS) {
      expect(typeof s.key).toBe('string');
      expect(s.key).toMatch(/^[A-Z][A-Z0-9_]+$/); // UPPER_SNAKE
      expect(registry.CHAPTER_KEYS).toContain(s.chapter);
      expect(typeof s.code).toBe('string');
      expect(typeof s.titleEn).toBe('string');
      expect(typeof s.titleAr).toBe('string');
      expect(typeof s.requirement).toBe('string');
      expect(s.requirement.length).toBeGreaterThan(20); // not a stub
      expect(Array.isArray(s.evidenceTypes)).toBe(true);
      expect(s.evidenceTypes.length).toBeGreaterThan(0);
      expect(Array.isArray(s.crossLinks)).toBe(true);
    }
  });

  it('standard keys are unique', () => {
    const keys = registry.STANDARDS.map(s => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('crossLinks cite shipped W356-W359 models', () => {
    // Verify the registry actually references the new wave-built models
    const keys = registry.STANDARDS.map(s => s.key);
    expect(keys).toContain('PSG_RESTRAINT_SECLUSION_DOCUMENTED'); // W193b link
    expect(keys).toContain('PSG_SAFEGUARDING_INTAKE'); // W357 link
    expect(keys).toContain('EOC_MEDICAL_EQUIPMENT_PPM'); // W359 link
    expect(keys).toContain('MMS_PRN_INDICATION_DOCUMENTED'); // W356 link (rescue med)

    const restraintStd = registry.findStandard('PSG_RESTRAINT_SECLUSION_DOCUMENTED');
    expect(restraintStd.crossLinks).toContain('RestraintSeclusionEvent');
    const safeguardingStd = registry.findStandard('PSG_SAFEGUARDING_INTAKE');
    expect(safeguardingStd.crossLinks).toContain('SafeguardingConcern');
    const ppmStd = registry.findStandard('EOC_MEDICAL_EQUIPMENT_PPM');
    expect(ppmStd.crossLinks).toContain('AssistiveDevice');
  });

  it('EVIDENCE_TYPES has 13 entries', () => {
    expect(registry.EVIDENCE_TYPES.length).toBe(13);
    expect(registry.EVIDENCE_TYPES).toEqual(
      expect.arrayContaining([
        'policy_document',
        'training_record',
        'audit_report',
        'capa_record',
        'log_or_register',
        'risk_assessment',
        'inspection_record',
      ])
    );
  });

  it('helpers findStandard / listChapter / allKeys work', () => {
    expect(registry.findStandard('PSG_PATIENT_ID_TWO_IDENTIFIERS')).toBeTruthy();
    expect(registry.findStandard('NONEXISTENT_KEY')).toBeNull();
    expect(registry.listChapter('PSG').length).toBeGreaterThan(0);
    expect(registry.allKeys().length).toBe(20);
  });
});

describe('W360 CbahiAttestation — model shape', () => {
  it('STATUSES exposes draft/met/partially_met/not_met/not_applicable', () => {
    expect(model.STATUSES).toEqual(['draft', 'met', 'partially_met', 'not_met', 'not_applicable']);
  });

  it('branchId refs Branch (W326)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('linkedCapaItemId refs CapaItem (W337 canonical)', () => {
    expect(MODEL_SRC).toMatch(/linkedCapaItemId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CapaItem['"]/);
  });

  it('(branchId, standardKey) compound unique index', () => {
    expect(MODEL_SRC).toMatch(
      /index\(\s*\{\s*branchId\s*:\s*1\s*,\s*standardKey\s*:\s*1\s*\}\s*,\s*\{\s*unique\s*:\s*true\s*\}/
    );
  });
});

describe('W360 CbahiAttestation — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('rejects unknown standardKey', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]standardKey['"]/);
    expect(MODEL_SRC).toMatch(/registry\.findStandard\(this\.standardKey\)/);
  });

  it('status=met requires ≥1 evidence', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]met['"][\s\S]{0,400}invalidate\(\s*['"]evidence['"]/
    );
  });

  it('status=partially_met requires evidence + gapNotes', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]partially_met['"][\s\S]{0,400}invalidate\(\s*['"]evidence['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]partially_met['"][\s\S]{0,600}invalidate\(\s*['"]gapNotes['"]/
    );
  });

  it('status=not_met requires gapNotes', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]not_met['"][\s\S]{0,300}invalidate\(\s*['"]gapNotes['"]/
    );
  });

  it('status=not_applicable requires naJustification', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]not_applicable['"][\s\S]{0,300}invalidate\(\s*['"]naJustification['"]/
    );
  });

  it('non-draft requires assessor + assessedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*!==\s*['"]draft['"][\s\S]{0,400}invalidate\(\s*['"]assessedBy['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*!==\s*['"]draft['"][\s\S]{0,600}invalidate\(\s*['"]assessedAt['"]/
    );
  });
});

describe('W360 cbahi routes — endpoint surface', () => {
  const endpoints = [
    // Registry catalog
    ['get', '/standards'],
    ['get', '/standards/:key'],
    ['get', '/chapters'],
    // Attestation
    ['get', '/attestations'],
    ['get', '/attestations/by-branch/:branchId'],
    ['get', '/attestations/by-standard/:key'],
    ['get', '/attestations/dashboard'],
    ['get', '/attestations/due-reassessment'],
    ['get', '/attestations/:id'],
    ['post', '/attestations'],
    ['post', '/attestations/:id/attest'],
    ['post', '/attestations/:id/evidence'],
    ['delete', '/attestations/:id/evidence/:evidenceId'],
    ['post', '/attestations/:id/snapshot'],
    ['patch', '/attestations/:id'],
    ['delete', '/attestations/:id'],
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

  it('dashboard computes compliancePct from met + 0.5*partial / (total - na)', () => {
    expect(ROUTES_SRC).toMatch(/metCount\s*\+\s*0\.5\s*\*\s*partialCount/);
  });

  it('POST /attestations returns 409 on dup (branch, standard)', () => {
    expect(ROUTES_SRC).toMatch(/existing[\s\S]{0,300}status\(409\)/);
  });
});

describe('W360 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/cbahi.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /cbahiRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/cbahi\.routes['"]\)/
    );
  });

  it('mounts at /cbahi via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]cbahi['"]\s*,\s*cbahiRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W360 + CBAHI Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 360/);
    expect(REGISTRY_SRC).toMatch(/معايير CBAHI/);
  });
});
