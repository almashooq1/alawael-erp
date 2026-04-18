/**
 * arabic-search.test.js — unit tests for utils/arabicSearch.
 *
 * Real-data calibration: the variants tested here are the ones we saw
 * in the demo seed + production imports from partner clinics. If
 * anyone edits LETTER_MAP or DIGIT_MAP, this suite fails loudly
 * rather than silently breaking receptionist typeahead.
 */

'use strict';

const { normalize, escapeRegex, buildOrClause } = require('../utils/arabicSearch');

describe('normalize — alef variants', () => {
  it.each([
    ['أحمد', 'احمد'],
    ['إحمد', 'احمد'],
    ['آحمد', 'احمد'],
    ['ٱحمد', 'احمد'],
    ['احمد', 'احمد'],
  ])('%s → %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });
});

describe('normalize — ta marbuta + alef maksura + hamza-on-* ', () => {
  it('ta marbuta ة → ha ه', () => {
    expect(normalize('فاطمة')).toBe('فاطمه');
  });
  it('alef maksura ى → ya ي', () => {
    expect(normalize('يحيى')).toBe('يحيي');
  });
  it('hamza-on-waw ؤ → waw و', () => {
    expect(normalize('مسؤول')).toBe('مسوول');
  });
  it('hamza-on-ya ئ → ya ي', () => {
    expect(normalize('قائم')).toBe('قايم');
  });
});

describe('normalize — Arabic-Indic digits', () => {
  it.each([
    ['١٢٣٤٥٦٧٨٩٠', '1234567890'],
    ['رقم ١٢٣', 'رقم 123'],
    ['1000001100', '1000001100'],
    ['mixed ٥ 5 ', 'mixed 5 5'],
  ])('%s → %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });
});

describe('normalize — tashkeel + whitespace', () => {
  it('strips harakat', () => {
    // fat-ha + damma + kasra + shadda + sukoon
    expect(normalize('مَدُرِّسَ')).toBe('مدرس');
  });

  it('strips tatweel', () => {
    expect(normalize('طـــالب')).toBe('طالب');
  });

  it('collapses runs of whitespace + lowercases + trims', () => {
    expect(normalize('  Ahmad   Ali  ')).toBe('ahmad ali');
  });

  it('handles null + undefined safely', () => {
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
});

describe('escapeRegex', () => {
  it('escapes all regex metacharacters', () => {
    expect(escapeRegex('a.b*c?d+e(f)g[h]i{j}k|l^m$n\\o')).toBe(
      'a\\.b\\*c\\?d\\+e\\(f\\)g\\[h\\]i\\{j\\}k\\|l\\^m\\$n\\\\o'
    );
  });

  it('leaves normal chars alone', () => {
    expect(escapeRegex('ahmad 1234')).toBe('ahmad 1234');
  });
});

describe('buildOrClause', () => {
  it('builds prefix $or by default', () => {
    const clause = buildOrClause('أحمد', ['firstName_ar', 'lastName_ar']);
    expect(clause).toHaveLength(2);
    expect(clause[0].firstName_ar).toBeInstanceOf(RegExp);
    // Should anchor at start
    expect(clause[0].firstName_ar.source.startsWith('^')).toBe(true);
    // Should have folded أ → ا
    expect('احمد').toMatch(clause[0].firstName_ar);
    expect('أحمد'.replace(/أ/, 'ا')).toMatch(clause[0].firstName_ar);
  });

  it('builds substring $or with mode=substring', () => {
    const clause = buildOrClause('12', ['phone'], { mode: 'substring' });
    expect(clause[0].phone.source.startsWith('^')).toBe(false);
    expect('001234567').toMatch(clause[0].phone);
  });

  it('returns null for empty query', () => {
    expect(buildOrClause('', ['x'])).toBeNull();
    expect(buildOrClause('   ', ['x'])).toBeNull();
    expect(buildOrClause(null, ['x'])).toBeNull();
  });

  it('regex is safe against metacharacter injection', () => {
    // Without escaping this would blow up or match unexpectedly
    const clause = buildOrClause('a.b(c)', ['x']);
    expect(clause[0].x.source).toBe('^a\\.b\\(c\\)');
    expect('a.b(c)d').toMatch(clause[0].x);
    expect('aXbYc').not.toMatch(clause[0].x);
  });

  it('query "احمد" matches stored "أحمد" (hamza vs plain alef)', () => {
    // The DB often has "أحمد" because forms save whatever the user typed,
    // but receptionists type "احمد" (plain alef). The regex must span both.
    const clause = buildOrClause('احمد', ['firstName_ar']);
    const rx = clause[0].firstName_ar;
    expect('أحمد').toMatch(rx);
    expect('احمد').toMatch(rx);
    expect('إحمد').toMatch(rx);
    expect('آحمد').toMatch(rx);
    // Does not match unrelated words
    expect('علي').not.toMatch(rx);
  });

  it('query "فاطمه" matches stored "فاطمة" (ha vs ta marbuta)', () => {
    // Substring mode for last-name partial
    const clause = buildOrClause('فاطمه', ['lastName_ar'], { mode: 'substring' });
    expect('فاطمة').toMatch(clause[0].lastName_ar);
    expect('فاطمه').toMatch(clause[0].lastName_ar);
  });

  it('query "1234" matches stored Arabic-Indic "١٢٣٤"', () => {
    const clause = buildOrClause('1234', ['beneficiaryNumber']);
    const rx = clause[0].beneficiaryNumber;
    expect('1234').toMatch(rx);
    expect('١٢٣٤').toMatch(rx);
    expect('1234 extra').toMatch(rx);
  });
});
