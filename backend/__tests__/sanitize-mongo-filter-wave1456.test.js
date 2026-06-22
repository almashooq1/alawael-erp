'use strict';

/**
 * W1456 — NoSQL operator-injection guard for export filters.
 *
 * BUG: the export routes (`exports.routes.js`, `exportImport.routes.js`) `JSON.parse` a
 * user-supplied `filters` query-string param AFTER the global express-mongo-sanitize ran
 * (it only saw `filters` as an opaque string), then pass the reconstituted object straight
 * into `importExportPro.service._fetchModuleData` → `Model.find({...query})`. An authenticated
 * user could send `filters={"password":{"$ne":null}}` to dump arbitrary collections, or
 * `{"$where":"..."}` for server-side JS DoS. FIX: `sanitizeMongoFilter` strips operator /
 * dotted / prototype keys at the shared sink before the query reaches Mongoose.
 */

const { sanitizeMongoFilter } = require('../utils/sanitize');

describe('W1456 sanitizeMongoFilter', () => {
  test('strips $-prefixed operator keys (the exfiltration / auth-bypass / DoS vectors)', () => {
    expect(sanitizeMongoFilter({ password: { $ne: null } })).toEqual({ password: {} });
    expect(sanitizeMongoFilter({ $where: 'sleep(5000)||true' })).toEqual({});
    expect(sanitizeMongoFilter({ age: { $gt: 0 } })).toEqual({ age: {} });
    expect(sanitizeMongoFilter({ name: { $regex: '.*' } })).toEqual({ name: {} });
  });

  test('strips dotted and prototype-pollution keys', () => {
    expect(sanitizeMongoFilter({ 'a.b': 1, c: 2 })).toEqual({ c: 2 });
    expect(sanitizeMongoFilter({ constructor: { x: 1 }, ok: 1 })).toEqual({ ok: 1 });
  });

  test('preserves legitimate equality filters + nested values', () => {
    expect(sanitizeMongoFilter({ status: 'active', branchId: 'b1', n: 5 })).toEqual({
      status: 'active',
      branchId: 'b1',
      n: 5,
    });
    expect(sanitizeMongoFilter({ a: { b: { c: 'x' } } })).toEqual({ a: { b: { c: 'x' } } });
  });

  test('recurses into arrays, stripping operators inside', () => {
    expect(sanitizeMongoFilter({ tags: [{ $ne: 1 }, { keep: 2 }] })).toEqual({
      tags: [{}, { keep: 2 }],
    });
  });

  test('passes primitives through unchanged', () => {
    expect(sanitizeMongoFilter('x')).toBe('x');
    expect(sanitizeMongoFilter(5)).toBe(5);
    expect(sanitizeMongoFilter(null)).toBe(null);
    expect(sanitizeMongoFilter(undefined)).toBe(undefined);
  });
});
