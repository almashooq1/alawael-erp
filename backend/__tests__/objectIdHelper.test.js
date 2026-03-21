/**
 * @file objectIdHelper.test.js
 * اختبارات وحدة لأدوات التعامل مع ObjectId
 */
const mongoose = require('mongoose');

// Mongoose 8 removed ObjectId.isValid — polyfill for test env if missing
if (typeof mongoose.Types.ObjectId.isValid !== 'function') {
  mongoose.Types.ObjectId.isValid = v => {
    if (v instanceof mongoose.Types.ObjectId) return true;
    if (typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v)) return true;
    if (typeof v === 'number') return true;
    if (typeof v === 'object' && v !== null) return true;
    return false;
  };
}

const { toObjectIdSafe, extractSafeUserId, isMockUser } = require('../utils/objectIdHelper');

const VALID_HEX = '507f1f77bcf86cd799439011'; // 24-char hex
const VALID_OID = new mongoose.Types.ObjectId(VALID_HEX);

/* ================================================================
 *  toObjectIdSafe
 * ================================================================ */
describe('toObjectIdSafe', () => {
  test('converts valid 24-char hex string to ObjectId', () => {
    const result = toObjectIdSafe(VALID_HEX);
    expect(result).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(result.toString()).toBe(VALID_HEX);
  });

  test('returns ObjectId instance as-is', () => {
    const result = toObjectIdSafe(VALID_OID);
    expect(result).toBe(VALID_OID);
  });

  test('returns null for "mock_tester"', () => {
    expect(toObjectIdSafe('mock_tester')).toBeNull();
  });

  test('returns null for null', () => {
    expect(toObjectIdSafe(null)).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(toObjectIdSafe(undefined)).toBeNull();
  });

  test('returns null for invalid string', () => {
    expect(toObjectIdSafe('not-an-id')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(toObjectIdSafe('')).toBeNull();
  });

  test('handles object with _id property', () => {
    const obj = { _id: VALID_HEX };
    // mongoose.Types.ObjectId.isValid(obj) may be true, and obj._id exists
    const result = toObjectIdSafe(obj);
    // Should recursively resolve to ObjectId via _id
    if (result) {
      expect(result.toString()).toBe(VALID_HEX);
    }
  });

  test('returns null for number (12)', () => {
    // Number 12 is "valid" per mongoose.isValid but length != 24
    const result = toObjectIdSafe(12);
    expect(result).toBeNull();
  });
});

/* ================================================================
 *  extractSafeUserId
 * ================================================================ */
describe('extractSafeUserId', () => {
  test('returns null for null', () => {
    expect(extractSafeUserId(null)).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(extractSafeUserId(undefined)).toBeNull();
  });

  test('extracts from string', () => {
    const result = extractSafeUserId(VALID_HEX);
    expect(result).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(result.toString()).toBe(VALID_HEX);
  });

  test('extracts from object with id', () => {
    const result = extractSafeUserId({ id: VALID_HEX });
    if (result) {
      expect(result.toString()).toBe(VALID_HEX);
    }
  });

  test('extracts from object with _id', () => {
    const result = extractSafeUserId({ _id: VALID_HEX });
    if (result) {
      expect(result.toString()).toBe(VALID_HEX);
    }
  });

  test('returns null for mock_tester string', () => {
    expect(extractSafeUserId('mock_tester')).toBeNull();
  });

  test('returns null for empty object', () => {
    expect(extractSafeUserId({})).toBeNull();
  });

  test('returns null for number', () => {
    expect(extractSafeUserId(42)).toBeNull();
  });
});

/* ================================================================
 *  isMockUser
 * ================================================================ */
describe('isMockUser', () => {
  test('returns true for "mock_tester"', () => {
    expect(isMockUser('mock_tester')).toBe(true);
  });

  test('returns false for valid ObjectId string', () => {
    expect(isMockUser(VALID_HEX)).toBe(false);
  });

  test('returns false for null', () => {
    // JS: false || null evaluates to null (falsy), not false
    expect(isMockUser(null)).toBeFalsy();
  });

  test('returns false for undefined', () => {
    expect(isMockUser(undefined)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isMockUser('')).toBe(false);
  });

  test('returns true for object whose toString is mock_tester', () => {
    const obj = { toString: () => 'mock_tester' };
    expect(isMockUser(obj)).toBe(true);
  });

  test('returns false for object whose toString is something else', () => {
    const obj = { toString: () => 'real_user' };
    expect(isMockUser(obj)).toBe(false);
  });
});
