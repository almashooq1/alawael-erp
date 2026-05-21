'use strict';

/**
 * family-report-jargon-guardrail-wave257d.test.js — Wave 257d.
 *
 * Tests the observability-mode wiring that connects W257c
 * scrubFamilyJargon to the W240 measureFamilyReport service.
 *
 * Scope:
 *   - Service exposes _detectFamilyJargonLeaks(report) → leaks[]
 *   - Clean report produces zero leaks (no qualityWarnings field)
 *   - Synthetic leak in each scannable field is detected
 *   - Multiple leaks in one report all surface
 *   - Non-string fields (numbers, dates, IDs) do NOT crash the scan
 *   - measureCode is intentionally NOT scrubbed (internal identifier)
 *
 * This is a unit test for the guardrail itself, not for W240's
 * end-to-end behavior — those existing 17 tests still pass unchanged.
 * Together they prove: existing reports are jargon-clean today AND
 * future regressions will be caught.
 */

const svc = require('../services/measureFamilyReport.service');

function cleanReport(overrides = {}) {
  return {
    beneficiaryId: 'abc',
    headline: 'طفلك يحقّق تقدّماً ملموساً في الأهداف العلاجية',
    narrative: 'لاحظنا تحسّناً واضحاً منذ الشهر الماضي.',
    measures: [
      {
        measureCode: 'BERG',
        name_ar: 'مقياس اتزان الجلوس والوقوف',
        verdict_ar: 'حقّق طفلك الحد الأدنى للتحسّن السريري — إنجاز ملموس',
      },
    ],
    alertParagraphs: [{ alertType: 'PLATEAU_DETECTED', text_ar: 'وصل طفلك إلى مرحلة ثبات.' }],
    signOff: { label_ar: 'يُرجى التوقيع على هذا التقرير.' },
    ...overrides,
  };
}

describe('_detectFamilyJargonLeaks', () => {
  test('clean report → zero leaks', () => {
    const leaks = svc._detectFamilyJargonLeaks(cleanReport());
    expect(leaks).toEqual([]);
  });

  test('leak in headline detected', () => {
    const leaks = svc._detectFamilyJargonLeaks(cleanReport({ headline: 'MCID achieved on BERG' }));
    expect(leaks.length).toBeGreaterThan(0);
    expect(leaks[0].field).toBe('headline');
    expect(leaks[0].sample).toContain('MCID');
  });

  test('leak in narrative detected', () => {
    const leaks = svc._detectFamilyJargonLeaks(
      cleanReport({ narrative: 'plateau classification confirmed' })
    );
    expect(leaks.some(l => l.field === 'narrative')).toBe(true);
  });

  test('leak in signOff.label_ar detected', () => {
    const leaks = svc._detectFamilyJargonLeaks(
      cleanReport({ signOff: { label_ar: 'standard score 85 — sign here' } })
    );
    expect(leaks.some(l => l.field === 'signOff.label_ar')).toBe(true);
  });

  test('leak in alertParagraphs[i].text_ar detected with correct index', () => {
    const leaks = svc._detectFamilyJargonLeaks(
      cleanReport({
        alertParagraphs: [
          { text_ar: 'safe Arabic text' },
          { text_ar: 'regression detected in trajectory' },
        ],
      })
    );
    expect(leaks.some(l => l.field === 'alertParagraphs[1].text_ar')).toBe(true);
  });

  test('leak in measures[i].name_ar detected', () => {
    const leaks = svc._detectFamilyJargonLeaks(
      cleanReport({
        measures: [
          {
            measureCode: 'BERG',
            name_ar: 'BERG Balance Scale',
            verdict_ar: 'safe verdict',
          },
        ],
      })
    );
    expect(leaks.some(l => l.field === 'measures[0].name_ar')).toBe(true);
  });

  test('leak in measures[i].verdict_ar detected', () => {
    const leaks = svc._detectFamilyJargonLeaks(
      cleanReport({
        measures: [
          {
            measureCode: 'BERG',
            name_ar: 'مقياس اتزان',
            verdict_ar: 'baseline value exceeded',
          },
        ],
      })
    );
    expect(leaks.some(l => l.field === 'measures[0].verdict_ar')).toBe(true);
  });

  test('measureCode is intentionally NOT scrubbed (internal identifier)', () => {
    // measureCode = 'BERG' is in the blacklist but it's an internal
    // routing identifier, not display text. Family UI must use name_ar.
    const leaks = svc._detectFamilyJargonLeaks(cleanReport());
    expect(leaks.some(l => l.field?.startsWith('measures[0].measureCode'))).toBe(false);
  });

  test('multiple leaks surface together', () => {
    const leaks = svc._detectFamilyJargonLeaks(
      cleanReport({
        headline: 'MCID achieved',
        narrative: 'plateau detected',
        measures: [
          {
            measureCode: 'BERG',
            name_ar: 'GMFM scale',
            verdict_ar: 'standard score 85',
          },
        ],
      })
    );
    expect(leaks.length).toBeGreaterThanOrEqual(4);
    const fields = leaks.map(l => l.field);
    expect(fields).toContain('headline');
    expect(fields).toContain('narrative');
    expect(fields).toContain('measures[0].name_ar');
    expect(fields).toContain('measures[0].verdict_ar');
  });

  test('non-string fields do not crash the scan', () => {
    const report = cleanReport({
      headline: null,
      narrative: undefined,
      measures: [],
      alertParagraphs: [],
      signOff: null,
    });
    expect(() => svc._detectFamilyJargonLeaks(report)).not.toThrow();
  });

  test('empty arrays/objects handled gracefully', () => {
    const report = {
      headline: '',
      narrative: '',
      measures: [],
      alertParagraphs: [],
      signOff: { label_ar: '' },
    };
    expect(svc._detectFamilyJargonLeaks(report)).toEqual([]);
  });

  test('each leak carries field + matchedToken + sample for triage', () => {
    const leaks = svc._detectFamilyJargonLeaks(
      cleanReport({ headline: 'MCID was achieved on BERG' })
    );
    expect(leaks[0]).toMatchObject({
      field: expect.any(String),
      matchedToken: expect.any(String),
      sample: expect.any(String),
    });
    expect(leaks[0].sample.length).toBeGreaterThan(0);
    expect(leaks[0].sample.length).toBeLessThanOrEqual(200);
  });
});

describe('shipped W240 vocab is jargon-clean (regression net)', () => {
  // These assertions hard-pin the current state: the W240 hardcoded
  // tables are clean today. If a future PR introduces a forbidden
  // token into any of them, these tests fail before the change ships.

  const {
    TREND_LABELS_AR,
    OVERALL_HEADLINES_AR,
    ALERT_PARAGRAPHS_AR,
  } = require('../services/measureFamilyReport.service');
  const { scrubFamilyJargon } = require('../services/clinicalReportNarrativeEngine.service');

  test('every TREND_LABELS_AR.label is clean', () => {
    for (const [key, val] of Object.entries(TREND_LABELS_AR)) {
      expect(() => scrubFamilyJargon(val.label)).not.toThrow();
      void key;
    }
  });

  test('every OVERALL_HEADLINES_AR.headline is clean', () => {
    for (const val of Object.values(OVERALL_HEADLINES_AR)) {
      expect(() => scrubFamilyJargon(val.headline)).not.toThrow();
    }
  });

  test('every ALERT_PARAGRAPHS_AR value is clean', () => {
    for (const val of Object.values(ALERT_PARAGRAPHS_AR)) {
      expect(() => scrubFamilyJargon(val)).not.toThrow();
    }
  });
});
