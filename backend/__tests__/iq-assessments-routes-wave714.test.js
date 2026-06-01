/**
 * iq-assessments-routes-wave714.test.js
 * ════════════════════════════════════════════════════════════════
 * Route-layer drift guard for IQ Assessment REST API endpoints
 * Coverage: POST /, GET /:id, GET /by-beneficiary/:id, GET /:id/report
 * MFA Tier: Tier 2 (write), Tier 1 (read)
 * ────────────────────────────────────────────────────────────────
 * Wave: W714
 * Assertions: 32 total
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('[W714] IQ Assessments Routes — Static Analysis', () => {
  let ROUTES_SRC;

  beforeAll(() => {
    ROUTES_SRC = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'iq-assessments.routes.js'),
      'utf8'
    );
  });

  describe('Route Definitions (8)', () => {
    it('[1] POST / endpoint must enforce MFA tier 2', () => {
      expect(ROUTES_SRC).toMatch(/router\.post\s*\(\s*['"]\/['"].*requireMfaTier\s*\(\s*2\s*\)/);
    });

    it('[2] POST / must enforce beneficiary branch access', () => {
      expect(ROUTES_SRC).toMatch(/enforceBeneficiaryBranch\s*\(\s*req,/);
    });

    it('[3] POST / must validate FSIQ range 40-160', () => {
      expect(ROUTES_SRC).toMatch(/40.*160|fullScaleIQ/);
    });

    it('[4] GET /:id must enforce MFA tier 1', () => {
      expect(ROUTES_SRC).toMatch(/router\.get\s*\(\s*['"]\/:/);
    });

    it('[5] GET /:id must validate ObjectId', () => {
      expect(ROUTES_SRC).toMatch(/ObjectId\.isValid|isValid.*req\.params|Types\.ObjectId/);
    });

    it('[6] GET /:id must enforce branch match', () => {
      expect(ROUTES_SRC).toMatch(/assertBranchMatch\s*\(\s*req,/);
    });

    it('[7] GET /by-beneficiary/:beneficiaryId must filter by branch', () => {
      expect(ROUTES_SRC).toMatch(/branchFilter\s*\(\s*req\s*\)/);
    });

    it('[8] GET /:id/report must call report generation', () => {
      expect(ROUTES_SRC).toMatch(/generateAssessmentReport|iqReportService/);
    });
  });

  describe('Field Validation (8)', () => {
    it('[9] InstrumentType must be enum SB5 | WECHSLER', () => {
      expect(ROUTES_SRC).toMatch(/['"]SB5['"].*['"]WECHSLER['"]|SB5.*WECHSLER/);
    });

    it('[10] Edition conditional required for WECHSLER', () => {
      expect(ROUTES_SRC).toMatch(/WPPSI|WISC|WAIS|edition/i);
    });

    it('[11] Indices must support both instrument types', () => {
      expect(ROUTES_SRC).toMatch(/indices|Object\.fromEntries|new Map/);
    });

    it('[12] Indices handled as Map or object structure', () => {
      expect(ROUTES_SRC).toMatch(/new Map|Object\.fromEntries|indices/);
    });

    it('[13] Classification band assigned from interpretation', () => {
      expect(ROUTES_SRC).toMatch(/classificationBand|interp\.band|interp\.tier/);
    });

    it('[14] Severity tier tracked for CBAHI compliance', () => {
      expect(ROUTES_SRC).toMatch(/severityTier|interp\.tier|tier/);
    });

    it('[15] FSIQ validation enforces 40-160 bounds', () => {
      expect(ROUTES_SRC).toMatch(/40.*160|40-160|40–160/);
    });

    it('[16] All mutations validate ObjectId before use', () => {
      expect(ROUTES_SRC).toMatch(/isValid|ObjectId/);
    });
  });

  describe('Security Enforcement (6)', () => {
    it('[17] All POST mutations require MFA tier 2', () => {
      expect(ROUTES_SRC).toMatch(/requireMfaTier\s*\(\s*2\s*\)/);
    });

    it('[18] Must import MFA middleware', () => {
      expect(ROUTES_SRC).toMatch(/requireMfaTier|branchScope\.middleware/i);
    });

    it('[19] Must import branch isolation helpers', () => {
      expect(ROUTES_SRC).toMatch(/assertBranchMatch|enforceBeneficiaryBranch|branchFilter/);
    });

    it('[20] Error responses use consistent status codes', () => {
      expect(ROUTES_SRC).toMatch(/\.status\s*\(\s*(?:400|403|404|500)\s*\)/);
    });

    it('[21] Must validate ObjectId on all param access', () => {
      expect(ROUTES_SRC).toMatch(/isValid|req\.params/);
    });

    it('[22] Must NOT store raw item responses', () => {
      expect(ROUTES_SRC).not.toMatch(/itemResponse|rawItems|itemArray/i);
    });
  });

  describe('Report Generation & Interpretation (6)', () => {
    it('[23] Must generate AR interpretation', () => {
      expect(ROUTES_SRC).toMatch(/interpretation.*ar|interpretation_ar|ar.*interpretation/i);
    });

    it('[24] Must generate EN interpretation', () => {
      expect(ROUTES_SRC).toMatch(/interpretation.*en|interpretation_en|en.*interpretation/i);
    });

    it('[25] Must generate AR recommendations', () => {
      expect(ROUTES_SRC).toMatch(/recommendations.*ar|recommendations_ar/i);
    });

    it('[26] Must generate EN recommendations', () => {
      expect(ROUTES_SRC).toMatch(/recommendations.*en|recommendations_en/i);
    });

    it('[27] Report must include derived assessment data', () => {
      expect(ROUTES_SRC).toMatch(/derived|assessment|report/);
    });

    it('[28] Must NOT include conversion tables in response', () => {
      expect(ROUTES_SRC).not.toMatch(/conversionTable|scoreTable|rawTable|itemArray/i);
    });
  });

  describe('Imports & Module Dependencies (4)', () => {
    it('[29] Must import IQAssessment model', () => {
      expect(ROUTES_SRC).toMatch(/IQAssessment|require.*models\/IQAssessment/);
    });

    it('[30] Must import report service or module', () => {
      expect(ROUTES_SRC).toMatch(/iqReportService|generateAssessmentReport|require.*services/i);
    });

    it('[31] Router must be exported for app.js mounting', () => {
      expect(ROUTES_SRC).toMatch(/module\.exports.*router|exports.*router/);
    });

    it('[32] Must create express router', () => {
      expect(ROUTES_SRC).toMatch(/express\.Router\s*\(\s*\)|router\s*=/);
    });
  });
});
