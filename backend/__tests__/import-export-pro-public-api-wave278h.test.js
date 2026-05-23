/**
 * import-export-pro-public-api-wave278h.test.js — drift guard for the
 * ImportExportProService singleton's public API surface.
 *
 * MOTIVATION (W278g lesson recorded the hard way):
 * `backend/tests/unit/importExportPro.service.test.js` uses a defensive
 * pattern: `if (typeof svc.X !== 'function') return;` for ~30 methods.
 * When W278f extracted `_parseExcel/_parseCSV/_parseJSON/_suggestColumnMappings`
 * from the singleton, those auto-generated smoke tests silently early-
 * returned PASS — masking the fact that controllers calling
 * `importExportService._parseExcel(...)` were now broken at runtime
 * (TypeError on `await undefined(...)`).
 *
 * THIS TEST closes that gap: it asserts the full set of methods present
 * on the singleton, sorted. Future extracts MUST update the expected
 * list — which forces the author to think about who calls each method
 * and whether they still resolve.
 *
 * It also asserts that methods we have INTENTIONALLY removed during the
 * W226+W278e+W278f+W278g refactor stay removed (no accidental re-inline).
 */

'use strict';

jest.unmock('mongoose');

const svc = require('../services/importExportPro.service');

describe('W278h — importExportPro singleton public API surface', () => {
  // Use a sorted set so the diff on regression is easy to read.
  // When you intentionally add/remove a method, update this list in the
  // same commit so future regressions show up as a focused mismatch.
  const EXPECTED_METHODS = [
    '_createZip',
    '_fetchModuleData',
    '_frequencyToCron',
    '_generateCSVTemplate',
    '_generateDefaultFields',
    '_generateExcelTemplate',
    '_getExampleValue',
    '_getModel',
    '_getNextRunDate',
    '_mongooseTypeToDataType',
    'bulkExport',
    'cancelJob',
    'createExport',
    'createScheduledExport',
    'createTemplate',
    'deleteJob',
    'executeImport',
    'executeScheduledExports',
    'generateImportTemplate',
    'getAvailableModules',
    'getJob',
    'getJobs',
    'getModuleFields',
    'getStatistics',
    'listScheduledExports',
    'listTemplates',
    'parseImportFile',
    'retryJob',
    'toggleScheduledExport',
  ];

  const REMOVED_METHODS = [
    // W278e Pass 2 — formatters moved to services/importExport/formatters.js
    '_exportToExcel',
    '_exportToCSV',
    '_exportToJSON',
    '_exportToPDF',
    '_exportToXML',
    '_exportToDOCX',
    '_resolveColumns',
    '_getNestedValue',
    // W278f Pass 3 — parsers moved to services/importExport/parsers.js
    '_parseExcel',
    '_parseCSV',
    '_parseJSON',
    '_suggestColumnMappings',
    '_validateImportData',
    '_detectDuplicates',
    '_transformImportData',
    '_applyTransform',
    // W278g Pass 4 — data-quality moved to services/importExport/data-quality.js
    'cleanAndEnrichData',
    'generateDataQualityReport',
    '_calculateDataQualityScore',
  ];

  function actualMethods() {
    const proto = Object.getPrototypeOf(svc);
    return Object.getOwnPropertyNames(proto)
      .filter(n => n !== 'constructor' && typeof svc[n] === 'function')
      .sort();
  }

  it('singleton exposes exactly the expected public+private method surface', () => {
    expect(actualMethods()).toEqual([...EXPECTED_METHODS].sort());
  });

  it.each(REMOVED_METHODS)('%s stays REMOVED (post-W278 extracts)', name => {
    expect(typeof svc[name]).not.toBe('function');
  });

  it('every name in EXPECTED_METHODS is in fact a function on svc', () => {
    // Catches typos in the expected list itself.
    for (const m of EXPECTED_METHODS) {
      expect(typeof svc[m]).toBe('function');
    }
  });
});
