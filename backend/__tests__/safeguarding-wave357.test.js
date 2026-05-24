'use strict';

/**
 * W357 drift guard — SafeguardingConcern + safeguarding routes shape.
 *
 * Locks W357 build shape:
 *   • model registers as 'SafeguardingConcern' with canonical refs
 *   • category/severity/status/outcome/subjectKind enums frozen
 *   • Wave-18 invariants: substantiated⇒actionPlan, critical⇒supervisor,
 *     escalated⇒authority, closed⇒outcomeSummary+closedBy+closedAt,
 *     subjectKind=beneficiary⇒subjectBeneficiaryId
 *   • 12 endpoints (open / list / by-subject / stats / get / post / triage
 *     / investigate / substantiate / notify-authority / close / patch /
 *     delete) — intake intentionally permissive across staff roles
 *   • dualMountAuth at /safeguarding
 *
 * Static analysis only — backend/jest.setup.js mocks mongoose.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SafeguardingConcern.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'safeguarding.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/SafeguardingConcern');

describe('W357 SafeguardingConcern — exports & enums', () => {
  it('exports CATEGORIES with 7 entries', () => {
    expect(model.CATEGORIES).toEqual(
      expect.arrayContaining([
        'physical',
        'sexual',
        'emotional',
        'neglect',
        'financial',
        'online',
        'other',
      ])
    );
    expect(model.CATEGORIES.length).toBe(7);
  });

  it('exports SEVERITY with low/medium/high/critical', () => {
    expect(model.SEVERITY).toEqual(['low', 'medium', 'high', 'critical']);
  });

  it('exports STATUSES with the 7-state lifecycle', () => {
    const expected = [
      'reported',
      'triaged',
      'investigating',
      'substantiated',
      'unsubstantiated',
      'escalated_to_authority',
      'closed',
    ];
    expect(model.STATUSES).toEqual(expect.arrayContaining(expected));
    expect(model.STATUSES.length).toBe(expected.length);
  });

  it('exports OUTCOMES with 3 classifications', () => {
    expect(model.OUTCOMES).toEqual(['substantiated', 'unsubstantiated', 'inconclusive']);
  });

  it('exports SUBJECT_KINDS with beneficiary/staff/other', () => {
    expect(model.SUBJECT_KINDS).toEqual(['beneficiary', 'staff', 'other']);
  });
});

describe('W357 SafeguardingConcern — canonical refs', () => {
  it('subjectBeneficiaryId refs Beneficiary (W324+W329)', () => {
    expect(MODEL_SRC).toMatch(
      /subjectBeneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/
    );
  });

  it('branchId refs Branch (W326)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('reportedBy + triagedBy + investigatorId + closedBy ref User', () => {
    expect(MODEL_SRC).toMatch(/reportedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/triagedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/investigatorId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/closedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });

  it('linkedIncidentId refs Incident (cross-link with quality module)', () => {
    expect(MODEL_SRC).toMatch(/linkedIncidentId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Incident['"]/);
  });
});

describe('W357 SafeguardingConcern — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('subjectKind=beneficiary requires subjectBeneficiaryId', () => {
    expect(MODEL_SRC).toMatch(
      /subjectKind\s*===\s*['"]beneficiary['"][\s\S]{0,300}invalidate\(\s*['"]subjectBeneficiaryId['"]/
    );
  });

  it('description required', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(\s*['"]description['"]/);
  });

  it('severity=critical requires supervisorNotifiedAt', () => {
    expect(MODEL_SRC).toMatch(
      /severity\s*===\s*['"]critical['"][\s\S]{0,400}invalidate\(\s*\n?\s*['"]supervisorNotifiedAt['"]/
    );
  });

  it('status=substantiated requires actionPlan', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]substantiated['"][\s\S]{0,500}invalidate\(\s*['"]actionPlan['"]/
    );
  });

  it('status=escalated_to_authority requires authorityName + authorityReportedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]escalated_to_authority['"][\s\S]{0,400}invalidate\(\s*['"]authorityName['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]escalated_to_authority['"][\s\S]{0,600}invalidate\(\s*['"]authorityReportedAt['"]/
    );
  });

  it('status=closed requires outcomeSummary + closedBy + closedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]closed['"][\s\S]{0,400}invalidate\(\s*['"]outcomeSummary['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]closed['"][\s\S]{0,600}invalidate\(\s*['"]closedBy['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]closed['"][\s\S]{0,800}invalidate\(\s*['"]closedAt['"]/
    );
  });
});

describe('W357 safeguarding routes — endpoint surface', () => {
  const endpoints = [
    ['get', '/open'],
    ['get', '/'],
    ['get', '/by-subject/:id'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['post', '/:id/triage'],
    ['post', '/:id/investigate'],
    ['post', '/:id/substantiate'],
    ['post', '/:id/notify-authority'],
    ['post', '/:id/close'],
    ['patch', '/:id'],
    ['delete', '/:id'],
  ];

  for (const [verb, p] of endpoints) {
    it(`${verb.toUpperCase()} ${p}`, () => {
      const escaped = p.replace(/\//g, '\\/').replace(/:/g, ':');
      const re = new RegExp(`router\\.${verb}\\(\\s*['"]${escaped}['"]`);
      expect(ROUTES_SRC).toMatch(re);
    });
  }

  it('authenticates via router.use(authenticateToken)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('blocks edits after closure (409 in PATCH)', () => {
    const closedBlocks = ROUTES_SRC.match(/status\s*===\s*['"]closed['"]/g) || [];
    expect(closedBlocks.length).toBeGreaterThanOrEqual(2);
  });

  it('intake (POST /) accepts wider role set than investigate/close', () => {
    // INTAKE_ROLES + INVESTIGATE_ROLES + CLOSE_ROLES declared as separate sets
    expect(ROUTES_SRC).toMatch(/INTAKE_ROLES/);
    expect(ROUTES_SRC).toMatch(/INVESTIGATE_ROLES/);
    expect(ROUTES_SRC).toMatch(/CLOSE_ROLES/);
    // Intake set must include 'therapist' + 'teacher' + 'nurse' (encouraging reporting)
    expect(ROUTES_SRC).toMatch(
      /INTAKE_ROLES\s*=\s*\[[\s\S]{0,500}['"]therapist['"][\s\S]{0,500}['"]teacher['"]/
    );
  });

  it('substantiate route demands actionPlan for substantiated outcome', () => {
    expect(ROUTES_SRC).toMatch(/outcome\s*===\s*['"]substantiated['"][\s\S]{0,300}actionPlan/);
  });
});

describe('W357 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/safeguarding.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /safeguardingRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/safeguarding\.routes['"]\)/
    );
  });

  it('mounts at /safeguarding via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]safeguarding['"]\s*,\s*safeguardingRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W357 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 357/);
    expect(REGISTRY_SRC).toMatch(/بلاغ حماية/);
  });
});
