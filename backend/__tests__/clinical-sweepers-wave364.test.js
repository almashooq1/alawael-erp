'use strict';

/**
 * W364 drift guard — clinicalSweepersBootstrap shape.
 *
 * Locks the 7-sweeper bootstrap shape:
 *   • exports wireClinicalSweepers(app, {logger})
 *   • 7 env-gated cron stanzas using independent ENABLE_*_SWEEPER flags
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

describe('W364 — 7 sweepers, each env-gated independently', () => {
  const envFlags = [
    'ENABLE_SAFEGUARDING_SLA_SWEEPER',
    'ENABLE_DEVICE_LOAN_SWEEPER',
    'ENABLE_DEVICE_MAINTENANCE_SWEEPER',
    'ENABLE_RESPITE_NOSHOW_SWEEPER',
    'ENABLE_TRANSITION_OVERDUE_SWEEPER',
    'ENABLE_CBAHI_REASSESSMENT_SWEEPER',
    'ENABLE_AAC_REASSESSMENT_SWEEPER',
  ];

  for (const flag of envFlags) {
    it(`gates on ${flag} === 'true'`, () => {
      const re = new RegExp(`process\\.env\\.${flag}\\s*===\\s*['"]true['"]`);
      expect(SRC).toMatch(re);
    });
  }

  it('counts scheduledCount as it wires each sweeper', () => {
    expect(SRC).toMatch(/let\s+scheduledCount\s*=\s*0/);
    const incs = SRC.match(/scheduledCount\+\+/g) || [];
    expect(incs.length).toBe(7);
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
