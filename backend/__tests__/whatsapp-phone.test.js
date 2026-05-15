'use strict';

// `./phone.js` is pure helpers (no mongoose) — runs fine under the
// global jest.mock('mongoose'). No need to unmock.

const { normalizePhone, tryNormalizePhone, maskPhone } = require('../services/whatsapp/phone');

describe('phone normalization', () => {
  test.each([
    // input → expected (defaultCountry SA)
    ['0512345678', '966512345678'],
    ['05 12 34 56 78', '966512345678'],
    ['966512345678', '966512345678'],
    ['+966512345678', '966512345678'],
    ['+966 51 234 5678', '966512345678'],
    ['512345678', '966512345678'], // SA mobile-length, no leading 0
    ['+971501234567', '971501234567'], // UAE
    ['+96512345678', '96512345678'], // Kuwait
    ['+97312345678', '97312345678'], // Bahrain
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  test('rejects nullish + too-short input', () => {
    expect(() => normalizePhone(null)).toThrow(/required/);
    expect(() => normalizePhone('')).toThrow(/required/);
    expect(() => normalizePhone('12')).toThrow(/Invalid/);
  });

  test('tryNormalizePhone returns null on bad input (non-throwing)', () => {
    expect(tryNormalizePhone(null)).toBeNull();
    expect(tryNormalizePhone('xx')).toBeNull();
    expect(tryNormalizePhone('+966512345678')).toBe('966512345678');
  });

  test('strips formatting (spaces, dashes, parens)', () => {
    expect(normalizePhone('+966 (51) 234-5678')).toBe('966512345678');
    expect(normalizePhone('05-12-34-56-78')).toBe('966512345678');
  });

  test('preserves already-correct E.164-no-plus (for whatever country)', () => {
    expect(normalizePhone('12025551234')).toBe('12025551234'); // US +1 area
  });
});

describe('maskPhone (PII redaction)', () => {
  test('keeps country code + last 3 digits, masks the middle', () => {
    expect(maskPhone('966512345678')).toBe('9665*****678');
    expect(maskPhone('971501234567')).toBe('9715*****567');
  });

  test('handles empty / too-short input safely', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone('123')).toBe('***');
    expect(maskPhone(null)).toBe('');
  });

  test('strips non-digits before masking', () => {
    expect(maskPhone('+966 51 234 5678')).toBe('9665*****678');
  });
});
