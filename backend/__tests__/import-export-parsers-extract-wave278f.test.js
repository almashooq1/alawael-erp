/**
 * import-export-parsers-extract-wave278f.test.js — drift guard for
 * the W278f Pass 3 extract.
 *
 * Pre-extract: 8 import-side methods (_parseExcel / _parseCSV /
 * _parseJSON / _suggestColumnMappings / _validateImportData /
 * _detectDuplicates / _transformImportData / _applyTransform) lived on
 * ImportExportProService. Post-extract: they are standalone functions
 * in `services/importExport/parsers.js`. Mirror of W278e (output side).
 *
 * If a future refactor re-inlines them or re-introduces a
 * `this._parseExcel` call back into the parent service, these
 * assertions catch it.
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const PARSERS = require('../services/importExport/parsers');

const SERVICE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'importExportPro.service.js'),
  'utf8'
);

describe('W278f — importExportPro Pass 3 (parsers) extract', () => {
  describe('parsers module exports', () => {
    const expectedNames = [
      'parseExcel',
      'parseCSV',
      'parseJSON',
      'suggestColumnMappings',
      'validateImportData',
      'detectDuplicates',
      'transformImportData',
      'applyTransform',
    ];

    it.each(expectedNames)('exports %s', name => {
      expect(typeof PARSERS[name]).toBe('function');
    });

    it('parseExcel is async', () => {
      expect(PARSERS.parseExcel.constructor.name).toBe('AsyncFunction');
    });

    it('parseCSV + parseJSON are sync (they wrap synchronous parsers)', () => {
      expect(PARSERS.parseCSV.constructor.name).toBe('Function');
      expect(PARSERS.parseJSON.constructor.name).toBe('Function');
    });
  });

  describe('parser behaviour smoke tests', () => {
    it('parseJSON handles array form', () => {
      const buf = Buffer.from(JSON.stringify([{ a: 1 }, { a: 2 }]));
      expect(PARSERS.parseJSON(buf)).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('parseJSON handles { data: [] } form', () => {
      const buf = Buffer.from(JSON.stringify({ data: [{ x: 'y' }] }));
      expect(PARSERS.parseJSON(buf)).toEqual([{ x: 'y' }]);
    });

    it('parseJSON throws on invalid JSON', () => {
      expect(() => PARSERS.parseJSON(Buffer.from('not json'))).toThrow(/Invalid JSON/);
    });

    it('parseCSV parses with default delimiter', () => {
      const buf = Buffer.from('name,age\nAhmed,30\nFatima,25\n');
      const rows = PARSERS.parseCSV(buf);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ name: 'Ahmed', age: '30' });
    });

    it('applyTransform Saudi phone normalization', () => {
      expect(PARSERS.applyTransform('0501234567', 'saudiPhone')).toBe('+966501234567');
      expect(PARSERS.applyTransform('00966501234567', 'saudiPhone')).toBe('+966501234567');
      expect(PARSERS.applyTransform('501234567', 'saudiPhone')).toBe('+966501234567');
    });

    it('applyTransform Arabic normalization', () => {
      expect(PARSERS.applyTransform('أحمد', 'normalizeArabic')).toBe('احمد');
    });

    it('detectDuplicates flags rows with same required-field value', () => {
      const data = [{ email: 'a@x.com' }, { email: 'b@x.com' }, { email: 'a@x.com' }];
      // detectDuplicates only considers fields marked `required: true`
      const mappings = [{ sourceColumn: 'email', targetField: 'email', required: true }];
      const dups = PARSERS.detectDuplicates(data, mappings);
      expect(dups.length).toBeGreaterThan(0);
      expect(dups[0]).toMatchObject({ field: 'email', value: 'a@x.com' });
    });
  });

  describe('parent service post-extract invariants', () => {
    it('requires the parsers module', () => {
      expect(SERVICE_SRC).toMatch(/require\(['"]\.\/importExport\/parsers['"]\)/);
    });

    it('dispatches via parsers.* (not this._*)', () => {
      const externalDispatches = [
        ['Excel', 'parseExcel'],
        ['CSV', 'parseCSV'],
        ['JSON', 'parseJSON'],
      ];
      for (const [, newName] of externalDispatches) {
        expect(SERVICE_SRC).toMatch(new RegExp(`parsers\\.${newName}\\b`));
      }
      // No this._parse* / this._validateImportData / this._transformImportData / this._suggestColumnMappings
      for (const m of [
        '_parseExcel',
        '_parseCSV',
        '_parseJSON',
        '_suggestColumnMappings',
        '_validateImportData',
        '_transformImportData',
      ]) {
        expect(SERVICE_SRC).not.toMatch(new RegExp(`this\\.${m}\\b`));
      }
    });

    it('no longer defines the 8 extracted methods on the class', () => {
      for (const m of [
        '_parseExcel',
        '_parseCSV',
        '_parseJSON',
        '_suggestColumnMappings',
        '_validateImportData',
        '_detectDuplicates',
        '_transformImportData',
        '_applyTransform',
      ]) {
        expect(SERVICE_SRC).not.toMatch(new RegExp(`\\n\\s+(async\\s+)?${m}\\s*\\(`));
      }
    });
  });
});
