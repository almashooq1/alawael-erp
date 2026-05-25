'use strict';

/**
 * W364 + W370 + W383 drift guard — clinicalSweepersBootstrap shape.
 *
 * Locks the 12-sweeper bootstrap shape:
 *   • exports wireClinicalSweepers(app, {logger})
 *   • 12 env-gated cron stanzas using independent ENABLE_*_SWEEPER flags
 *     (W364: 7, W370: +4, W383: +1)
 *   • Asia/Riyadh timezone on every schedule
 *   • Only the RESPITE_NOSHOW sweeper mutates state (status flip)
 *   • Wired into app.js after riskSweeperBootstrap (clinical-services
 *     neighborhood)
 *
 * Static analysis only — backend/jest.setup.js mocks mongoose +
 * node-cron isn't loaded under USE_MOCK_DB. The bootstrap loads
 * node-cron via `loadOptional` to gracefully skip when missing, so the
 * code is exercise-able but the cron callbacks aren't invoked here.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'clinicalSweepersBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const bootstrap = require('../startup/clinicalSweepersBootstrap');

describe('W364 clinicalSweepersBootstrap — exports', () => {
  it('exports wireClinicalSweepers function', () => {
    expect(typeof bootstrap.wireClinicalSweepers).toBe('function');
  });

  it('throws if logger is missing', () => {
    expect(() => bootstrap.wireClinicalSweepers(null, {})).toThrow(/logger required/);
  });

  it('uses loadOptional for node-cron (graceful skip)', () => {
    expect(SRC).toMatch(/function loadOptional/);
    expect(SRC).toMatch(/loadOptional\(['"]node-cron['"]\)/);
  });

  it('uses Asia/Riyadh timezone for all schedules', () => {
    const tzMatches = SRC.match(/timezone:\s*['"]Asia\/Riyadh['"]/g) || [];
    expect(tzMatches.length).toBeGreaterThanOrEqual(1); // shared TZ const
    expect(SRC).toMatch(/const\s+TZ\s*=\s*\{\s*timezone:\s*['"]Asia\/Riyadh['"]\s*\}/);
  });
});

describe('W364 + W370 + W383 — 12 sweepers, each env-gated independently', () => {
  const envFlags = [
    // W364 original 7
    'ENABLE_SAFEGUARDING_SLA_SWEEPER',
    'ENABLE_DEVICE_LOAN_SWEEPER',
    'ENABLE_DEVICE_MAINTENANCE_SWEEPER',
    'ENABLE_RESPITE_NOSHOW_SWEEPER',
    'ENABLE_TRANSITION_OVERDUE_SWEEPER',
    'ENABLE_CBAHI_REASSESSMENT_SWEEPER',
    'ENABLE_AAC_REASSESSMENT_SWEEPER',
    // W370 additions (4) — for W368 (diet) + W369 (facility) modules
    'ENABLE_DIET_REVIEW_SWEEPER',
    'ENABLE_FACILITY_INSPECTION_SWEEPER',
    'ENABLE_FACILITY_MAINTENANCE_SWEEPER',
    'ENABLE_FACILITY_CERT_SWEEPER',
    // W383 addition — emits assessment.overdue per ClinicalAssessment past dueDate
    'ENABLE_ASSESSMENT_OVERDUE_SWEEPER',
  ];

  for (const flag of envFlags) {
    it(`gates on ${flag} === 'true'`, () => {
      const re = new RegExp(`process\\.env\\.${flag}\\s*===\\s*['"]true['"]`);
      expect(SRC).toMatch(re);
    });
  }

  it('counts scheduledCount as it wires each sweeper (W364: 7, W370: +4, W383: +1 = 12)', () => {
    expect(SRC).toMatch(/let\s+scheduledCount\s*=\s*0/);
    const incs = SRC.match(/scheduledCount\+\+/g) || [];
    expect(incs.length).toBe(12);
  });

  it('logger summary reports n/12 enabled (post-W383)', () => {
    expect(SRC).toMatch(/all 12 disabled/);
    expect(SRC).toMatch(/clinical sweepers wired:\s*\$\{scheduledCount\}\/12/);
  });
});

describe('W364 — sweepers reference correct models', () => {
  it('SafeguardingConcern via safeModel', () => {
    expect(SRC).toMatch(/safeModel\(['"]SafeguardingConcern['"]\)/);
  });

  it('AssistiveDevice via safeModel (loan + maintenance)', () => {
    expect(SRC).toMatch(/safeModel\(['"]AssistiveDevice['"]\)/);
  });

  it('RespiteBooking via safeModel', () => {
    expect(SRC).toMatch(/safeModel\(['"]RespiteBooking['"]\)/);
  });

  it('TransitionPlan via safeModel', () => {
    expect(SRC).toMatch(/safeModel\(['"]TransitionPlan['"]\)/);
  });

  it('CbahiAttestation via safeModel', () => {
    expect(SRC).toMatch(/safeModel\(['"]CbahiAttestation['"]\)/);
  });

  it('CommunicationAidProfile via safeModel', () => {
    expect(SRC).toMatch(/safeModel\(['"]CommunicationAidProfile['"]\)/);
  });

  it('BeneficiaryDietPrescription via safeModel (W370)', () => {
    expect(SRC).toMatch(/safeModel\(['"]BeneficiaryDietPrescription['"]\)/);
  });

  it('FacilityAsset via safeModel (W370)', () => {
    expect(SRC).toMatch(/safeModel\(['"]FacilityAsset['"]\)/);
  });
});

describe('W364 — cron schedules', () => {
  const schedules = [
    // [cron expression, sweeper label]
    ['0 8 * * *', 'safeguarding SLA (daily 08:00)'],
    ['0 9 * * *', 'device loan (daily 09:00)'],
    ['30 9 * * *', 'device maintenance (daily 09:30)'],
    ['0 2 * * *', 'respite no-show (daily 02:00)'],
    ['0 10 * * *', 'transition overdue (daily 10:00)'],
    ['0 6 * * 1', 'CBAHI reassessment (weekly Mon 06:00)'],
    ['30 6 * * 1', 'AAC reassessment (weekly Mon 06:30)'],
    // W370 additions
    ['0 7 * * 1', 'diet prescription review (weekly Mon 07:00)'],
    ['0 5 * * *', 'facility inspection (daily 05:00)'],
    ['30 5 * * *', 'facility maintenance (daily 05:30)'],
    ['0 6 * * *', 'facility certificate (daily 06:00)'],
    // W383 addition
    ['0 4 * * *', 'assessment overdue (daily 04:00, W383)'],
  ];

  for (const [expr, label] of schedules) {
    it(`schedule ${label} = '${expr}'`, () => {
      const escaped = expr.replace(/\*/g, '\\*');
      const re = new RegExp(`cron\\.schedule\\(\\s*['"]${escaped}['"]`);
      expect(SRC).toMatch(re);
    });
  }
});

describe('W364 — mutation safety', () => {
  it('only RESPITE_NOSHOW sweeper performs .save() (mutating)', () => {
    // The sweeper file should contain `.save()` calls ONLY inside the
    // respite no-show stanza. Other sweepers do read-only .find().select()
    // + logger output. Verify by counting .save() occurrences.
    const saveCalls = SRC.match(/\.save\(\)/g) || [];
    expect(saveCalls.length).toBe(1);
  });

  it('respite mutation flips approved/confirmed → no_show', () => {
    expect(SRC).toMatch(
      /status:\s*\{\s*\$in:\s*\[\s*['"]approved['"]\s*,\s*['"]confirmed['"]\s*\]/
    );
    expect(SRC).toMatch(/c\.status\s*=\s*['"]no_show['"]/);
  });

  it('respite no-show requires 24h+ past startAt + no checkedInAt', () => {
    expect(SRC).toMatch(/24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
    expect(SRC).toMatch(/checkedInAt:\s*null/);
  });
});

describe('W364 — wiring into app.js', () => {
  it('app.js requires startup/clinicalSweepersBootstrap', () => {
    expect(APP_SRC).toMatch(
      /require\(['"]\.\/startup\/clinicalSweepersBootstrap['"]\)\.wireClinicalSweepers/
    );
  });

  it('wires AFTER riskSweeperBootstrap (clinical-services neighborhood)', () => {
    const riskIdx = APP_SRC.indexOf('riskSweeperBootstrap');
    const clinicalIdx = APP_SRC.indexOf('clinicalSweepersBootstrap');
    expect(riskIdx).toBeGreaterThan(0);
    expect(clinicalIdx).toBeGreaterThan(riskIdx);
  });

  it('app.js comment cites W364', () => {
    expect(APP_SRC).toMatch(/Wave 364/);
  });
});
