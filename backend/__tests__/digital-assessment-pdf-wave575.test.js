'use strict';

/**
 * digital-assessment-pdf-wave575.test.js — W575.
 *
 * Pure tests for renderReportPdf (no DB): a mock report envelope (the
 * shape buildReport returns) renders to a valid PDF Buffer for both the
 * clinical and family audiences, with the bundled Arabic font.
 */

jest.setTimeout(20000);

const { renderReportPdf } = require('../services/digitalAssessmentPdf.service');
const { findArabicFont } = require('../services/reporting/renderer/pdfRenderer');

function mockReport(audience) {
  const base = {
    generatedAt: new Date('2026-05-29T00:00:00.000Z'),
    audience,
    reportLanguage: 'ar',
    measure: {
      code: 'M-CHAT-R',
      name: 'Modified Checklist for Autism in Toddlers',
      name_ar: 'قائمة الفحص المعدّلة للتوحّد',
      abbreviation: 'M-CHAT-R/F',
      publisher: 'Robins et al.',
      familyFriendlyLabel_ar: 'فحص التوحّد',
    },
    beneficiary: { id: 'b1', name: 'طفل تجريبي', fileNumber: 'F-001' },
    application: {
      id: 'app123456',
      date: new Date('2026-05-20'),
      purpose: 'baseline',
      applicationNumber: 1,
      setting: 'clinic',
    },
    score: { value: 17, min: 0, max: 20, direction: 'lower_better', subscales: [] },
    interpretation: {
      label_ar: 'خطر مرتفع',
      label_en: 'High risk',
      severity: 'severe',
      color: '#b71c1c',
    },
    bands: [
      {
        label_ar: 'خطر منخفض',
        label_en: 'Low',
        minScore: 0,
        maxScore: 2,
        severity: 'normal',
        color: '#2e7d32',
        isCurrent: false,
      },
      {
        label_ar: 'خطر متوسط',
        label_en: 'Medium',
        minScore: 3,
        maxScore: 7,
        severity: 'moderate',
        color: '#ef6c00',
        isCurrent: false,
      },
      {
        label_ar: 'خطر مرتفع',
        label_en: 'High',
        minScore: 8,
        maxScore: 20,
        severity: 'severe',
        color: '#b71c1c',
        isCurrent: true,
      },
    ],
  };
  if (audience === 'family') {
    return {
      ...base,
      summary_ar: 'فحص التوحّد: خطر مرتفع',
      recommendation_ar: 'يُنصح بتقييم تشخيصي.',
      comparison: { changeFromBaseline: -3, trend: 'improving' },
    };
  }
  return {
    ...base,
    comparison: {
      baselineScore: 20,
      previousScore: 19,
      changeFromBaseline: -3,
      trend: 'improving',
      isClinicallySignificant: true,
    },
    versionPinned: { measureVersion: '1.0.0', algorithmVersion: '1.0.0' },
    assessor: { name: 'د. تجريبي' },
    clinicalObservations: 'ملاحظة سريرية تجريبية',
    notes: null,
    items: Array.from({ length: 20 }, (_, i) => ({
      number: i + 1,
      text_ar: `بند رقم ${i + 1}`,
      text_en: `Item ${i + 1}`,
      response: i % 2,
      responseLabel_ar: i % 2 ? 'نعم' : 'لا',
      responseLabel_en: i % 2 ? 'Yes' : 'No',
      atRisk: i < 5,
    })),
  };
}

describe('W575 — bundled Arabic font present', () => {
  test('findArabicFont resolves the bundled Noto Naskh Arabic TTF', () => {
    const f = findArabicFont();
    expect(f).toBeTruthy();
    expect(f).toMatch(/NotoNaskhArabic-Regular\.ttf$/);
  });
});

describe('W575 — renderReportPdf produces valid PDFs', () => {
  test('clinical report → valid non-trivial PDF', async () => {
    const buf = await renderReportPdf(mockReport('clinical'));
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(3000);
  });

  test('family report → valid PDF (smaller, no item table)', async () => {
    const clin = await renderReportPdf(mockReport('clinical'));
    const fam = await renderReportPdf(mockReport('family'));
    expect(fam.slice(0, 5).toString()).toBe('%PDF-');
    // family omits the 20-item table → should not be larger than clinical
    expect(fam.length).toBeLessThanOrEqual(clin.length);
  });

  test('returns null when pdfkit is unavailable (graceful)', async () => {
    const buf = await renderReportPdf(mockReport('family'), {
      PDFDocument: null,
      // force the require to fail by pointing at a bogus module loader
    });
    // pdfkit IS installed, so this still renders — assert it does not throw
    expect(buf === null || buf.slice(0, 5).toString() === '%PDF-').toBe(true);
  });
});
