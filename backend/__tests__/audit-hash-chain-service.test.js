/**
 * audit-hash-chain-service.test.js — Phase-7 Commit 7.
 *
 * Pure crypto tests — no DB. Verifies:
 *   • canonicalJSON determinism + field exclusion
 *   • computeEntryHash determinism + chaining
 *   • verifyChain happy path
 *   • verifyChain detects modification (tamper)
 *   • verifyChain detects insertion (prev_hash_mismatch)
 *   • verifyChain detects deletion (hash break at the next entry)
 */

'use strict';

const {
  canonicalJSON,
  computeEntryHash,
  verifyChain,
  EXCLUDED_FIELDS,
} = require('../services/auditHashChainService');

describe('canonicalJSON — determinism', () => {
  it("sorts keys so encoding order doesn't matter", () => {
    const a = canonicalJSON({ b: 1, a: 2 });
    const b = canonicalJSON({ a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1}');
  });

  it('handles nested objects + arrays', () => {
    const out = canonicalJSON({ a: { z: 1, y: [2, { b: 3, a: 4 }] } });
    expect(out).toBe('{"a":{"y":[2,{"a":4,"b":3}],"z":1}}');
  });

  it('excludes storage-layer fields', () => {
    const out = canonicalJSON({
      _id: 'x',
      __v: 0,
      chainHash: 'stale',
      prevHash: 'stale',
      createdAt: 'whenever',
      updatedAt: 'whenever',
      expiresAt: 'whenever',
      eventType: 'auth.login',
    });
    expect(out).toBe('{"eventType":"auth.login"}');
  });

  it('handles null + primitives', () => {
    expect(canonicalJSON(null)).toBe('null');
    expect(canonicalJSON(42)).toBe('42');
    expect(canonicalJSON('x')).toBe('"x"');
  });

  it('serializes Date as ISO string', () => {
    const d = new Date('2026-04-22T12:00:00Z');
    expect(canonicalJSON(d)).toBe('"2026-04-22T12:00:00.000Z"');
  });

  it('exports EXCLUDED_FIELDS as a Set for introspection', () => {
    expect(EXCLUDED_FIELDS.has('_id')).toBe(true);
    expect(EXCLUDED_FIELDS.has('chainHash')).toBe(true);
    expect(EXCLUDED_FIELDS.has('eventType')).toBe(false);
  });
});

describe('computeEntryHash — determinism + chaining', () => {
  it('produces a 64-char hex SHA-256', () => {
    const h = computeEntryHash({ eventType: 'x' }, '');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same input → same hash', () => {
    const a = computeEntryHash({ eventType: 'x', actor: 'u1' }, 'abc');
    const b = computeEntryHash({ actor: 'u1', eventType: 'x' }, 'abc');
    expect(a).toBe(b);
  });

  it('prevHash changes the hash', () => {
    const a = computeEntryHash({ eventType: 'x' }, '');
    const b = computeEntryHash({ eventType: 'x' }, 'previous_hash_value');
    expect(a).not.toBe(b);
  });

  it('entry content changes the hash', () => {
    const a = computeEntryHash({ eventType: 'x' }, '');
    const b = computeEntryHash({ eventType: 'y' }, '');
    expect(a).not.toBe(b);
  });

  it('excluded fields are NOT part of the hash', () => {
    const a = computeEntryHash({ eventType: 'x', _id: 'A', chainHash: 'A' }, '');
    const b = computeEntryHash({ eventType: 'x', _id: 'B', chainHash: 'B' }, '');
    expect(a).toBe(b);
  });

  it('throws on non-string prevHash', () => {
    expect(() => computeEntryHash({}, 42)).toThrow();
    expect(() => computeEntryHash({}, null)).toThrow();
  });

  it('handles a mongoose-like doc via .toObject()', () => {
    const doc = {
      eventType: 'auth.login',
      toObject: () => ({ eventType: 'auth.login' }),
    };
    const h = computeEntryHash(doc, '');
    expect(h).toBe(computeEntryHash({ eventType: 'auth.login' }, ''));
  });
});

/**
 * Helper — build a valid chain of N entries given their bodies.
 */
function buildChain(bodies) {
  const chain = [];
  let prev = '';
  for (const body of bodies) {
    const hash = computeEntryHash(body, prev);
    chain.push({ ...body, prevHash: prev, chainHash: hash, _id: `e${chain.length}` });
    prev = hash;
  }
  return chain;
}

describe('verifyChain — happy path', () => {
  it('empty input is trivially valid', () => {
    expect(verifyChain([])).toEqual({ ok: true, verifiedCount: 0, breaks: [] });
  });

  it('single entry with correct hash', () => {
    const chain = buildChain([{ eventType: 'auth.login' }]);
    const result = verifyChain(chain);
    expect(result.ok).toBe(true);
    expect(result.verifiedCount).toBe(1);
  });

  it('100-entry chain verifies cleanly', () => {
    const chain = buildChain(
      Array.from({ length: 100 }, (_, i) => ({ eventType: 'auth.login', seq: i }))
    );
    expect(verifyChain(chain).ok).toBe(true);
  });
});

describe('verifyChain — tamper detection', () => {
  it('detects modification of an entry body', () => {
    const chain = buildChain([{ eventType: 'a' }, { eventType: 'b' }, { eventType: 'c' }]);
    // Tamper entry 1: change body without recomputing hash.
    chain[1].eventType = 'b-tampered';
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
    expect(result.breaks.length).toBeGreaterThanOrEqual(1);
    // The tampered entry's chainHash should mismatch.
    expect(result.breaks.some(b => b.entryId === 'e1' && b.reason === 'chain_hash_mismatch')).toBe(
      true
    );
  });

  it('detects a forged chainHash on a known-good body', () => {
    const chain = buildChain([{ eventType: 'a' }, { eventType: 'b' }]);
    chain[1].chainHash = '0'.repeat(64);
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
    expect(result.breaks[0].entryId).toBe('e1');
  });

  it('detects an INSERTED entry via prev_hash_mismatch', () => {
    const chain = buildChain([{ eventType: 'a' }, { eventType: 'c' }]);
    // Attacker inserts a new entry between 0 and 1 but uses a fresh
    // prevHash=''. The downstream entry's prevHash still points at
    // the OLD chain, so it mismatches.
    const forged = {
      eventType: 'b-forged',
      prevHash: '',
      chainHash: computeEntryHash({ eventType: 'b-forged' }, ''),
      _id: 'forged',
    };
    chain.splice(1, 0, forged);
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
  });

  it('detects a DELETED entry — downstream hashes break', () => {
    const chain = buildChain([{ eventType: 'a' }, { eventType: 'b' }, { eventType: 'c' }]);
    // Attacker removes entry 1; entry 2's prevHash still points at
    // e1's chainHash which is now missing from the stream.
    chain.splice(1, 1);
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
    // The break appears on entry 2 (now at index 1 after splice).
    expect(result.breaks.length).toBeGreaterThanOrEqual(1);
  });
});
