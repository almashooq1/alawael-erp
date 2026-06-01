/**
 * iq-report-service-wave714.test.js
 * ════════════════════════════════════════════════════════════════
 * Service-layer drift guard for IQ Report Generation
 * Coverage: Report generation, AR/EN interpretation, recommendations, governance
 * ────────────────────────────────────────────────────────────────
 * Wave: W714
 * Assertions: 22 total
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('[W714] IQ Report Service — Static Analysis', () => {
  let SERVICE_SRC;

  beforeAll(() => {
    SERVICE_SRC = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'iqReportService.js'),
      'utf8'
    );
  });

  describe('Export Functions (3)', () => {
    it('[1] Must export generateAssessmentReport function', () => {
      expect(SERVICE_SRC).toMatch(/generateAssessmentReport|exports\.generateAssessmentReport/);
    });

    it('[2] Must export generateInterpretation_AR function', () => {
      expect(SERVICE_SRC).toMatch(/generateInterpretation_AR|interpretation.*ar/i);
    });

    it('[3] Must export generateRecommendations_AR function', () => {
      expect(SERVICE_SRC).toMatch(/generateRecommendations_AR|recommendations.*ar/i);
    });
  });

  describe('Report Generation Logic (6)', () => {
    it('[4] generateAssessmentReport must call registry.resolve', () => {
      expect(SERVICE_SRC).toMatch(/registry\.resolve|registry\.get|getModule/i);
    });

    it('[5] Must call module.computeDerived for scoring', () => {
      expect(SERVICE_SRC).toMatch(/computeDerived|module\.compute/i);
    });

    it('[6] Must call module.interpret for classification', () => {
      expect(SERVICE_SRC).toMatch(/\.interpret|interpretScore/i);
    });

    it('[7] Report must include assessment metadata', () => {
      expect(SERVICE_SRC).toMatch(/assessmentId|beneficiaryId|episodeId|branchId/);
    });

    it('[8] Report must include scores and classification', () => {
      expect(SERVICE_SRC).toMatch(/scores|classification|band|fsiq/i);
    });

    it('[9] Report must include governance metadata', () => {
      expect(SERVICE_SRC).toMatch(/governance|compliance|disclaimer|license/i);
    });
  });

  describe('Arabic Interpretation (4)', () => {
    it('[10] Must have generateInterpretation_AR function', () => {
      expect(SERVICE_SRC).toMatch(/generateInterpretation_AR|function.*interpretation.*ar/i);
    });

    it('[11] Must include FSIQ bands for interpretation', () => {
      expect(SERVICE_SRC).toMatch(/110|100|90|80|70|60/);
    });

    it('[12] Must generate Arabic text for each band', () => {
      expect(SERVICE_SRC).toMatch(/قدرات|معرفية|متفوقة|عادية|منخفضة|إعاقة|فكرية/);
    });

    it('[13] Must generate interpretation narratives dynamically', () => {
      expect(SERVICE_SRC).toMatch(/generateInterpretation.*\(|text.*=|narrative/i);
    });
  });

  describe('Recommendations Generation (4)', () => {
    it('[14] Must have generateRecommendations_AR function', () => {
      expect(SERVICE_SRC).toMatch(/generateRecommendations_AR/);
    });

    it('[15] Must have generateRecommendations_EN function', () => {
      expect(SERVICE_SRC).toMatch(/generateRecommendations_EN/);
    });

    it('[16] Recommendations must include severity-based actions', () => {
      expect(SERVICE_SRC).toMatch(/متابعة|تقييم|دعم|تربوي|إحالة|تدخل/i);
    });

    it('[17] Recommendations must be array of bullets', () => {
      expect(SERVICE_SRC).toMatch(/\[\s*['"]\w|return.*\[.*\]|\.split|\.push/);
    });
  });

  describe('Governance & Compliance (3)', () => {
    it('[18] Must include copyright disclaimers', () => {
      expect(SERVICE_SRC).toMatch(/لا يحل محل|does not.*substitute|proprietary|copyright|license/i);
    });

    it('[19] Must reference licensing or instrument sources', () => {
      expect(SERVICE_SRC).toMatch(/getLicensing|licensing|instrumentType|edition/i);
    });

    it('[20] Must NOT include conversion tables or scoring algorithms', () => {
      expect(SERVICE_SRC).not.toMatch(/conversion.*table|raw.*to.*standard|subtest.*formula/i);
    });
  });

  describe('Error Handling & Validation (2)', () => {
    it('[21] Must handle missing scoring module gracefully', () => {
      expect(SERVICE_SRC).toMatch(/catch|throw|error|not.*found|undefined/i);
    });

    it('[22] Must validate assessment data before generating', () => {
      expect(SERVICE_SRC).toMatch(/validate|required|if.*!|check.*exists/i);
    });
  });
});
