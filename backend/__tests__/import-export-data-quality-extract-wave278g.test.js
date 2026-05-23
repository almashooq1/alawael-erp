/**
 * import-export-data-quality-extract-wave278g.test.js — drift guard for
 * the W278g Pass 4 extract + a regression fix for W278f controller drift.
 *
 * Pre-extract: 3 methods (cleanAndEnrichData / generateDataQualityReport /
 * _calculateDataQualityScore) lived on ImportExportProService. Post-extract:
 * they are standalone functions in `services/importExport/data-quality.js`.
 *
 * Also covers a W278f-introduced silent regression: the controller's
 * preview-quality endpoint called `importExportService._parseExcel` /
 * `_parseCSV` / `_parseJSON` / `_suggestColumnMappings`, all of which
 * W278f had moved out of the singleton — leaving the endpoint broken
 * (TypeError on `await undefined(...)` for the parsers, silent `[]` for
 * the optional-chain suggestColumnMappings). W278g rewires the controller
 * to import `parsers` + `dataQuality` directly. These assertions catch
 * any re-introduction of the stale `importExportService._X` pattern.
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const DQ = require('../services/importExport/data-quality');

const SERVICE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'importExportPro.service.js'),
  'utf8'
);
const CONTROLLER_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'controllers', 'importExportPro.controller.js'),
  'utf8'
);

describe('W278g — importExportPro Pass 4 (data-quality) extract', () => {
  describe('data-quality module exports', () => {
    it('exports cleanAndEnrichData', () => {
      expect(typeof DQ.cleanAndEnrichData).toBe('function');
    });

    it('exports generateDataQualityReport', () => {
      expect(typeof DQ.generateDataQualityReport).toBe('function');
    });

    it('exports calculateDataQualityScore', () => {
      expect(typeof DQ.calculateDataQualityScore).toBe('function');
    });
  });

  describe('cleanAndEnrichData Saudi business rules', () => {
    it('auto-calculates 15% VAT + total for invoices', () => {
      const result = DQ.cleanAndEnrichData([{ amount: '100' }], 'invoices');
      expect(result[0].tax).toBe('15.00');
      expect(result[0].total).toBe('115.00');
    });

    it('auto-calculates 9.75% GOSI + netSalary for payroll', () => {
      const result = DQ.cleanAndEnrichData(
        [{ basicSalary: '10000', housingAllowance: '2000' }],
        'payroll'
      );
      expect(parseFloat(result[0].gosiDeduction)).toBeCloseTo(975, 1); // 10000 * 0.0975
      // net = 10000 + 2000 - 975 = 11025
      expect(parseFloat(result[0].netSalary)).toBeCloseTo(11025, 1);
    });

    it('trims strings + normalizes whitespace', () => {
      const result = DQ.cleanAndEnrichData([{ name: '  Ahmed   Saleh  ' }], 'beneficiaries');
      expect(result[0].name).toBe('Ahmed Saleh');
    });
  });

  describe('generateDataQualityReport', () => {
    const data = [
      { id: '1', email: 'a@x.com', age: '30' },
      { id: '2', email: 'b@x.com', age: '25' },
      { id: '3', email: '', age: 'not-a-number' },
    ];
    const mappings = [
      { sourceColumn: 'id', dataType: 'string', required: true },
      { sourceColumn: 'email', dataType: 'email', required: true },
      { sourceColumn: 'age', dataType: 'number' },
    ];

    it('returns completeness per field', () => {
      const report = DQ.generateDataQualityReport(data, mappings);
      expect(report.completeness.email.filled).toBe(2);
      expect(report.completeness.email.empty).toBe(1);
    });

    it('flags inconsistent values', () => {
      const report = DQ.generateDataQualityReport(data, mappings);
      expect(report.consistency.age.inconsistent).toBeGreaterThanOrEqual(1);
    });

    it('returns an overallScore between 0 and 100', () => {
      const report = DQ.generateDataQualityReport(data, mappings);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('parent service post-extract invariants', () => {
    it('requires the data-quality module', () => {
      expect(SERVICE_SRC).toMatch(/require\(['"]\.\/importExport\/data-quality['"]\)/);
    });

    it('dispatches via dataQuality.* (not this.X) where called internally', () => {
      // cleanAndEnrichData IS called internally by executeImport
      expect(SERVICE_SRC).toMatch(/dataQuality\.cleanAndEnrichData\b/);
      expect(SERVICE_SRC).not.toMatch(/this\.cleanAndEnrichData\b/);
      expect(SERVICE_SRC).not.toMatch(/this\._calculateDataQualityScore\b/);
    });

    it('no longer defines the 3 extracted methods on the class', () => {
      for (const m of [
        'cleanAndEnrichData',
        'generateDataQualityReport',
        '_calculateDataQualityScore',
      ]) {
        expect(SERVICE_SRC).not.toMatch(new RegExp(`\\n\\s+(async\\s+)?${m}\\s*\\(`));
      }
    });
  });

  describe('controller post-extract invariants (W278f regression fix)', () => {
    it('imports parsers + dataQuality modules at top', () => {
      expect(CONTROLLER_SRC).toMatch(/require\(['"]\.\.\/services\/importExport\/parsers['"]\)/);
      expect(CONTROLLER_SRC).toMatch(
        /require\(['"]\.\.\/services\/importExport\/data-quality['"]\)/
      );
    });

    it('no longer calls importExportService._parseExcel / _parseCSV / _parseJSON', () => {
      // These were stale W278f drift — singleton no longer has these methods
      for (const m of ['_parseExcel', '_parseCSV', '_parseJSON', '_suggestColumnMappings']) {
        expect(CONTROLLER_SRC).not.toMatch(new RegExp(`importExportService\\.${m}\\b`));
      }
    });

    it('uses parsers.parseExcel / parseCSV / parseJSON / suggestColumnMappings', () => {
      expect(CONTROLLER_SRC).toMatch(/parsers\.parseExcel\b/);
      expect(CONTROLLER_SRC).toMatch(/parsers\.parseCSV\b/);
      expect(CONTROLLER_SRC).toMatch(/parsers\.parseJSON\b/);
      expect(CONTROLLER_SRC).toMatch(/parsers\.suggestColumnMappings\b/);
    });

    it('uses dataQuality.generateDataQualityReport (not importExportService.generateDataQualityReport)', () => {
      expect(CONTROLLER_SRC).toMatch(/dataQuality\.generateDataQualityReport\b/);
      expect(CONTROLLER_SRC).not.toMatch(/importExportService\.generateDataQualityReport\b/);
    });
  });
});
