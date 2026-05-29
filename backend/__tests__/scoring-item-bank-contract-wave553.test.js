'use strict';

/**
 * scoring-item-bank-contract-wave553.test.js — W553.
 *
 * The scoring contract gained an optional `itemBank` (the bilingual
 * digital questionnaire) + `rawShape`. These tests lock:
 *   1. validateItemBank rejects every malformed shape.
 *   2. A clean item bank passes + the module freezes.
 *   3. rawShape must be in the allowed set.
 *   4. expectedItemCount must agree with itemBank.items.length.
 *   5. registry.getItemBank + scoring engine .getItemBank/.listAdministrable.
 *   6. Existing bank-less modules (BERG/FIM/SCQ) still load.
 */

jest.setTimeout(15000);

const { validateContract, validateItemBank } = require('../measures/scoring/contract');
const registry = require('../measures/scoring');
const engine = require('../services/measureScoringEngine.service');

function baseModule(overrides = {}) {
  return {
    measureCode: 'TST',
    engineVersion: '1.0.0',
    derivedType: 'sum',
    direction: 'lower_better',
    computeDerived: () => ({ value: 0 }),
    interpret: () => ({
      band: 'b',
      label_ar: 'ا',
      label_en: 'a',
      severity: 'normal',
      color: '#000',
    }),
    delta: () => null,
    ...overrides,
  };
}

function goodBank(overrides = {}) {
  return {
    instrumentName_ar: 'أداة',
    instrumentName_en: 'Instrument',
    instrumentVersion: '1.0',
    items: [
      {
        number: 1,
        text_ar: 'سؤال',
        text_en: 'Question',
        responseOptions: [
          { value: 0, label_ar: 'لا', label_en: 'No' },
          { value: 1, label_ar: 'نعم', label_en: 'Yes' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('W553 — validateItemBank structural guards', () => {
  test('passes a clean bank', () => {
    expect(() => validateItemBank(goodBank(), 'tst')).not.toThrow();
  });

  test('rejects non-object', () => {
    expect(() => validateItemBank([], 'tst')).toThrow(/must be an object/);
    expect(() => validateItemBank(null, 'tst')).toThrow(/must be an object/);
  });

  test('requires bilingual instrument name + version', () => {
    expect(() => validateItemBank(goodBank({ instrumentName_ar: '' }), 'tst')).toThrow(
      /instrumentName_ar/
    );
    expect(() => validateItemBank(goodBank({ instrumentVersion: undefined }), 'tst')).toThrow(
      /instrumentVersion/
    );
  });

  test('requires a non-empty items array', () => {
    expect(() => validateItemBank(goodBank({ items: [] }), 'tst')).toThrow(/non-empty array/);
  });

  test('requires bilingual item text', () => {
    const bank = goodBank({ items: [{ number: 1, text_ar: 'س', text_en: '' }] });
    expect(() => validateItemBank(bank, 'tst')).toThrow(/text_en/);
  });

  test('rejects duplicate item numbers', () => {
    const bank = goodBank({
      items: [
        { number: 1, text_ar: 'أ', text_en: 'a' },
        { number: 1, text_ar: 'ب', text_en: 'b' },
      ],
    });
    expect(() => validateItemBank(bank, 'tst')).toThrow(/duplicate/);
  });

  test('rejects item.domain not in declared domains', () => {
    const bank = goodBank({
      domains: [{ key: 'x', name_ar: 'س', name_en: 'x' }],
      items: [{ number: 1, text_ar: 'أ', text_en: 'a', domain: 'y' }],
    });
    expect(() => validateItemBank(bank, 'tst')).toThrow(/not in declared/);
  });

  test('rejects responseOption without numeric value or bilingual label', () => {
    const bank = goodBank({
      items: [
        {
          number: 1,
          text_ar: 'أ',
          text_en: 'a',
          responseOptions: [{ value: 'x', label_ar: 'ل', label_en: 'l' }],
        },
      ],
    });
    expect(() => validateItemBank(bank, 'tst')).toThrow(/value must be a number/);
  });
});

describe('W553 — validateContract wiring', () => {
  test('accepts a module with a valid itemBank + rawShape', () => {
    const mod = baseModule({ rawShape: 'item_array', itemBank: goodBank(), expectedItemCount: 1 });
    expect(() => validateContract(mod, 'tst.js')).not.toThrow();
  });

  test('rejects invalid rawShape', () => {
    const mod = baseModule({ rawShape: 'nope' });
    expect(() => validateContract(mod, 'tst.js')).toThrow(/rawShape/);
  });

  test('rejects expectedItemCount disagreeing with bank size', () => {
    const mod = baseModule({ rawShape: 'item_array', itemBank: goodBank(), expectedItemCount: 99 });
    expect(() => validateContract(mod, 'tst.js')).toThrow(/disagrees/);
  });

  test('module with NO itemBank still validates (back-compat)', () => {
    expect(() => validateContract(baseModule(), 'tst.js')).not.toThrow();
  });
});

describe('W553 — registry + engine item-bank surface', () => {
  test('bank-less legacy modules still load', () => {
    for (const code of ['BERG', 'FIM', 'SCQ', 'VINELAND-3', 'WEEFIM']) {
      expect(registry.has(code)).toBe(true);
      expect(registry.getItemBank(code)).toBeNull();
    }
  });

  test('getItemBank returns a bank for item-bank modules', () => {
    const ib = registry.getItemBank('M-CHAT-R');
    expect(ib).toBeTruthy();
    expect(ib.itemBank.items.length).toBe(20);
    expect(ib.rawShape).toBe('item_array');
    expect(ib.measureCode).toBe('M-CHAT-R');
  });

  test('engine.getItemBank + listAdministrable agree with registry', () => {
    expect(engine.getItemBank('PEDSQL').itemBank.items.length).toBe(23);
    const codes = engine
      .listAdministrable()
      .map(m => m.measureCode)
      .sort();
    expect(codes).toEqual(['CARS-2', 'M-CHAT-R', 'PEDSQL', 'SDQ']);
  });

  test('every item-bank item carries bilingual text', () => {
    for (const code of ['M-CHAT-R', 'CARS-2', 'PEDSQL']) {
      const ib = registry.getItemBank(code);
      for (const it of ib.itemBank.items) {
        expect(typeof it.text_ar).toBe('string');
        expect(it.text_ar.length).toBeGreaterThan(0);
        expect(typeof it.text_en).toBe('string');
        expect(it.text_en.length).toBeGreaterThan(0);
      }
    }
  });
});
