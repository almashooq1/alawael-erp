/**
 * W1416 — WhatsApp bot NLU robustness (typo tolerance + light stemming + hamza).
 *
 * The bot routes free-text to a unit via keyword scoring. v1 (W1382) was EXACT
 * substring only, so real Arabic input missed: single-char typos ("حضوور"),
 * prefixed/inflected forms, broken plurals ("مواعيد"), and ؤ/ئ hamza variance.
 * W1416 adds:
 *   - normalize: ؤ→و, ئ→ي folding.
 *   - lightStem: strip ONE leading article/particle (feeds fuzzy only).
 *   - editDistanceLE1: single-edit typo tolerance.
 *   - scoreUnits: half-weight fuzzy fallback for ≥4-char single-word keywords,
 *     with EXACT match still dominating (precision preserved).
 */
'use strict';

const reg = require('../intelligence/whatsapp-bot-flow.registry');
const { normalize, lightStem, editDistanceLE1, scoreUnits, resolveUnitId } = reg;

describe('W1416 — normalize hamza folding', () => {
  test('folds ؤ → و and ئ → ي (spelling variance)', () => {
    expect(normalize('مسؤول')).toBe(normalize('مسوول'));
    expect(normalize('مسئول')).toBe(normalize('مسيول'));
    expect(normalize('شؤون')).toBe('شوون');
  });
  test('still folds the W1382 set (alef/ya/ta-marbuta/harakat/tatweel/digits)', () => {
    expect(normalize('مَوْعِد')).toBe('موعد');
    expect(normalize('موعـــد')).toBe('موعد');
    expect(normalize('فاتورة')).toBe('فاتوره');
    expect(normalize('١٢٣')).toBe('123'); // Arabic-Indic digits fold to ASCII, kept
  });
});

describe('W1416 — lightStem (conservative, fuzzy-only)', () => {
  test('strips a leading definite article when ≥3 chars remain', () => {
    expect(lightStem('الموعد')).toBe('موعد');
    expect(lightStem('للموعد')).toBe('موعد');
    expect(lightStem('والموعد')).toBe('موعد');
    expect(lightStem('بالمركز')).toBe('مركز');
  });
  test('strips a single leading particle when ≥3 chars remain', () => {
    expect(lightStem('وموعد')).toBe('موعد');
    expect(lightStem('فموعد')).toBe('موعد');
  });
  test('never over-strips short words into noise', () => {
    expect(lightStem('ال')).toBe('ال');
    expect(lightStem('بلد')).toBe('بلد'); // ب + لد(2) → no strip
    expect(lightStem('كلب')).toBe('كلب');
    expect(lightStem('وله')).toBe('وله'); // و + له(2) → no strip
  });
});

describe('W1416 — editDistanceLE1', () => {
  test('true for equal / single substitution / insertion / deletion', () => {
    expect(editDistanceLE1('موعد', 'موعد')).toBe(true);
    expect(editDistanceLE1('موعد', 'موعت')).toBe(true); // substitution
    expect(editDistanceLE1('حضور', 'حضوور')).toBe(true); // insertion
    expect(editDistanceLE1('تسجيل', 'تسجل')).toBe(true); // deletion
  });
  test('false for ≥2 edits or length gap >1', () => {
    expect(editDistanceLE1('موعد', 'مواعيد')).toBe(false); // gap 2
    expect(editDistanceLE1('abc', 'xyz')).toBe(false);
    expect(editDistanceLE1('حضور', 'حصصر')).toBe(false);
  });
});

describe('W1416 — scoreUnits / resolveUnitId routing improvements', () => {
  test('single-char typos now route (fuzzy fallback)', () => {
    expect(resolveUnitId('حضوور ابني اليوم')).toBe('attendance'); // typo حضور
    expect(resolveUnitId('ابغى تسجل ابني')).toBe('register'); // typo تسجيل
  });
  test('broken plural مواعيد routes to appointment (keyword add)', () => {
    expect(resolveUnitId('ابغى اعرف المواعيد المتاحة')).toBe('appointment');
  });
  test('prefixed/inflected forms route via stemmed fuzzy', () => {
    expect(resolveUnitId('والموعد متى')).toBe('appointment');
  });
});

describe('W1416 — precision preserved (no false routing, exact dominates)', () => {
  test('exact keywords still route to the right unit', () => {
    expect(resolveUnitId('احجز موعد تقييم')).toBe('appointment');
    expect(resolveUnitId('عندي شكوى')).toBe('complaint');
    expect(resolveUnitId('ابي اكلم موظف')).toBe('human');
    expect(resolveUnitId('وش خدماتكم')).toBe('info');
    expect(resolveUnitId('فاتورة هذا الشهر')).toBe('billing');
  });
  test('unrelated text does not falsely route', () => {
    expect(resolveUnitId('كيف الطقس')).toBeNull();
    expect(resolveUnitId('شكرا جزيلا لكم')).toBeNull();
  });
  test('an EXACT match outranks a fuzzy near-match for another unit', () => {
    // "شكوى" is an exact complaint hit; even if another unit fuzzy-matches a
    // typo'd token, the exact full-weight hit must win.
    const r = scoreUnits('عندي شكوى بخصوص الحضوور');
    expect(r).not.toBeNull();
    expect(r.unitId).toBe('complaint');
  });
  test('numeric menu selection still takes priority', () => {
    expect(resolveUnitId('3')).toBe(reg.UNITS[2].id);
  });
});
