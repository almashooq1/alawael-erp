/**
 * import-export-formatters-extract-wave278e.test.js — drift guard for
 * the W278e Pass 2 extract.
 *
 * Pre-extract: 6 `_exportTo<Format>` methods + `_resolveColumns` +
 * `_getNestedValue` lived as private members of ImportExportProService.
 * Post-extract: they are standalone functions in
 * `services/importExport/formatters.js` + `services/importExport/format-helpers.js`.
 *
 * If a future refactor re-inlines them, or accidentally introduces a
 * `this._exportToX` call back into the parent service, these assertions
 * catch it.
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const HELPERS = require('../services/importExport/format-helpers');
const FORMATTERS = require('../services/importExport/formatters');

const SERVICE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'importExportPro.service.js'),
  'utf8'
);

describe('W278e — importExportPro Pass 2 extract', () => {
  describe('format-helpers exports', () => {
    it('exports resolveColumns + getNestedValue as functions', () => {
      expect(typeof HELPERS.resolveColumns).toBe('function');
      expect(typeof HELPERS.getNestedValue).toBe('function');
    });

    it('getNestedValue resolves dot-notation paths', () => {
      const row = { a: { b: { c: 42 } } };
      expect(HELPERS.getNestedValue(row, 'a.b.c')).toBe(42);
      expect(HELPERS.getNestedValue(row, 'a.missing')).toBeUndefined();
      expect(HELPERS.getNestedValue(null, 'a')).toBeUndefined();
    });

    it('resolveColumns returns an ordered list of column descriptors', () => {
      const cols = HELPERS.resolveColumns([{ id: 1, name: 'x' }], ['id', 'name'], 'beneficiaries');
      expect(Array.isArray(cols)).toBe(true);
      expect(cols.length).toBeGreaterThanOrEqual(2);
      const keys = cols.map(c => c.key);
      expect(keys).toEqual(expect.arrayContaining(['id', 'name']));
    });
  });

  describe('formatters exports', () => {
    const expectedNames = [
      'exportToExcel',
      'exportToCSV',
      'exportToJSON',
      'exportToPDF',
      'exportToXML',
      'exportToDOCX',
    ];

    it.each(expectedNames)('exports %s as an async function', name => {
      expect(typeof FORMATTERS[name]).toBe('function');
      // every exporter is async — checking they return a Promise on minimal input
      // would actually invoke heavy libs (ExcelJS / PDFKit). Constructor check is enough.
      expect(FORMATTERS[name].constructor.name).toBe('AsyncFunction');
    });
  });

  describe('parent service post-extract invariants', () => {
    it('requires the formatters module', () => {
      expect(SERVICE_SRC).toMatch(/require\(['"]\.\/importExport\/formatters['"]\)/);
    });

    it('dispatches via formatters.exportTo<Format> (not this._exportTo<Format>)', () => {
      for (const fmt of ['Excel', 'CSV', 'JSON', 'PDF', 'XML', 'DOCX']) {
        expect(SERVICE_SRC).toMatch(new RegExp(`formatters\\.exportTo${fmt}\\b`));
        // The private method form must be gone — otherwise the extract was incomplete.
        expect(SERVICE_SRC).not.toMatch(new RegExp(`this\\._exportTo${fmt}\\b`));
      }
    });

    it('no longer defines the extracted methods on the class', () => {
      // Re-defining them would mean either dead code or a duplicate behaviour bug.
      for (const m of [
        '_exportToExcel',
        '_exportToCSV',
        '_exportToJSON',
        '_exportToPDF',
        '_exportToXML',
        '_exportToDOCX',
        '_resolveColumns',
        '_getNestedValue',
      ]) {
        expect(SERVICE_SRC).not.toMatch(new RegExp(`\\n\\s+(async\\s+)?${m}\\s*\\(`));
      }
    });
  });
});
