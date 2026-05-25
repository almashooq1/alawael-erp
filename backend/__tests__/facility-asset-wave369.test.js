'use strict';

/**
 * W369 drift guard — FacilityAsset + facility-asset routes.
 *
 * Locks the building-infrastructure PPM + inspection + regulatory
 * certificate lifecycle.
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'FacilityAsset.js'), 'utf8');
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'facility-asset.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/FacilityAsset');

describe('W369 FacilityAsset — exports & enums', () => {
  it('CATEGORIES covers accessibility-critical + HVAC + fire + water + power + gases + therapy + security', () => {
    expect(model.CATEGORIES).toEqual(
      expect.arrayContaining([
        'elevator',
        'wheelchair_lift',
        'ramp',
        'hvac_unit',
        'fire_alarm_panel',
        'fire_sprinkler',
        'fire_extinguisher',
        'smoke_detector',
        'water_heater',
        'water_treatment',
        'generator',
        'medical_oxygen_plant',
        'hydrotherapy_pool',
        'sensory_room',
        'cctv_camera',
      ])
    );
    expect(model.CATEGORIES.length).toBeGreaterThanOrEqual(25);
  });

  it('STATUSES = in_service / inspection_failed / maintenance / out_of_service / retired', () => {
    expect(model.STATUSES).toEqual([
      'in_service',
      'inspection_failed',
      'maintenance',
      'out_of_service',
      'retired',
    ]);
  });

  it('CRITICALITY = low/medium/high/life_safety', () => {
    expect(model.CRITICALITY).toEqual(['low', 'medium', 'high', 'life_safety']);
  });

  it('INSPECTION_KINDS covers regulatory + PPM + corrective + calibration + load_test + safety + cleaning', () => {
    expect(model.INSPECTION_KINDS).toEqual([
      'regulatory_annual',
      'preventive_maintenance',
      'corrective_repair',
      'calibration',
      'load_test',
      'safety_check',
      'cleaning_sanitization',
    ]);
  });

  it('INSPECTION_OUTCOMES = pass / pass_with_observations / fail / deferred', () => {
    expect(model.INSPECTION_OUTCOMES).toEqual([
      'pass',
      'pass_with_observations',
      'fail',
      'deferred',
    ]);
  });
});

describe('W369 FacilityAsset — canonical refs + uniqueness', () => {
  it('branchId refs Branch AND required', () => {
    expect(MODEL_SRC).toMatch(
      /branchId\s*:\s*\{[\s\S]{0,300}ref\s*:\s*['"]Branch['"][\s\S]{0,200}required\s*:\s*true/
    );
  });

  it('linkedIncidentId refs Incident', () => {
    expect(MODEL_SRC).toMatch(/linkedIncidentId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Incident['"]/);
  });

  it('(assetTag, branchId) compound unique index', () => {
    expect(MODEL_SRC).toMatch(
      /index\(\s*\{\s*assetTag\s*:\s*1\s*,\s*branchId\s*:\s*1\s*\}\s*,\s*\{\s*unique\s*:\s*true\s*\}/
    );
  });
});

describe('W369 FacilityAsset — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('out_of_service requires reason + since', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]out_of_service['"][\s\S]{0,400}invalidate\(\s*['"]outOfServiceReason['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]out_of_service['"][\s\S]{0,600}invalidate\(\s*['"]outOfServiceSince['"]/
    );
  });

  it('retired requires retiredAt + retirementReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]retired['"][\s\S]{0,400}invalidate\(\s*['"]retiredAt['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]retired['"][\s\S]{0,600}invalidate\(\s*['"]retirementReason['"]/
    );
  });

  it('inspection_failed requires a fail inspection with defects', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]inspection_failed['"][\s\S]{0,500}invalidate\(\s*['"]inspections['"]/
    );
  });

  it('fail outcome requires defectsFound', () => {
    expect(MODEL_SRC).toMatch(
      /outcome\s*===\s*['"]fail['"][\s\S]{0,300}invalidate\(`inspections\.\$\{i\}\.defectsFound`/
    );
  });

  it('certificate integrity (number + issuingAuthority + expiresAt all-or-nothing)', () => {
    expect(MODEL_SRC).toMatch(/anySet[\s\S]{0,500}invalidate\(`certificates\.\$\{i\}\.number`/);
    expect(MODEL_SRC).toMatch(
      /anySet[\s\S]{0,700}invalidate\(`certificates\.\$\{i\}\.issuingAuthority`/
    );
    expect(MODEL_SRC).toMatch(/anySet[\s\S]{0,900}invalidate\(`certificates\.\$\{i\}\.expiresAt`/);
  });
});

describe('W369 FacilityAsset — virtuals', () => {
  it('isInspectionOverdue + isMaintenanceOverdue + hasExpiredCertificate', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isInspectionOverdue['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isMaintenanceOverdue['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]hasExpiredCertificate['"]\)/);
  });
});

describe('W369 facility-asset routes — endpoint surface', () => {
  const endpoints = [
    ['get', '/'],
    ['get', '/due-inspection'],
    ['get', '/due-maintenance'],
    ['get', '/out-of-service'],
    ['get', '/expired-certificates'],
    ['get', '/life-safety'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['patch', '/:id'],
    ['post', '/:id/inspection'],
    ['post', '/:id/certificate'],
    ['post', '/:id/start-maintenance'],
    ['post', '/:id/return-to-service'],
    ['post', '/:id/out-of-service'],
    ['post', '/:id/retire'],
    ['delete', '/:id/inspections/:inspId'],
    ['delete', '/:id/certificates/:certId'],
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

  it('fail-outcome inspection auto-flips status to inspection_failed', () => {
    expect(ROUTES_SRC).toMatch(
      /body\.outcome\s*===\s*['"]fail['"][\s\S]{0,300}row\.status\s*=\s*['"]inspection_failed['"]/
    );
  });

  it('pass after inspection_failed restores in_service', () => {
    expect(ROUTES_SRC).toMatch(
      /row\.status\s*===\s*['"]inspection_failed['"][\s\S]{0,400}row\.status\s*=\s*['"]in_service['"]/
    );
  });

  it('certificate endpoint requires number + issuingAuthority + expiresAt', () => {
    expect(ROUTES_SRC).toMatch(/certificate number مطلوب/);
    expect(ROUTES_SRC).toMatch(/issuingAuthority مطلوب/);
    expect(ROUTES_SRC).toMatch(/expiresAt مطلوب/);
  });

  it('write set includes facility_manager + maintenance + safety_officer roles', () => {
    expect(ROUTES_SRC).toMatch(
      /WRITE_ROLES\s*=\s*\[[\s\S]{0,500}['"]facility_manager['"][\s\S]{0,300}['"]maintenance['"][\s\S]{0,300}['"]safety_officer['"]/
    );
  });
});

describe('W369 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/facility-asset.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /facilityAssetRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/facility-asset\.routes['"]\)/
    );
  });

  it('mounts at /facility-asset via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]facility-asset['"]\s*,\s*facilityAssetRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W369 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 369/);
    expect(REGISTRY_SRC).toMatch(/أصول المنشأة/);
  });
});
