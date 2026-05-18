/**
 * hash-chain-lib-wave88.test.js — Wave 88.
 *
 * Direct tests for the canonical hash-chain library. The Wave-87 stability
 * tests + the Wave-45 care-plan signatureChain tests + the Wave-72 access-
 * review tests indirectly exercise it through the adapters, but this file
 * pins the lib's own contract so future refactors can't silently change
 * encoding semantics or chain-walk behaviour.
 */

'use strict';

const crypto = require('crypto');
const lib = require('../intelligence/hash-chain.lib');

const { HASH_ENCODING_VERSIONS, encodeTemporal, hashLinkedPayload, verifyHashChain } = lib;

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

describe('hash-chain.lib — exports + constants (Wave 88)', () => {
  test('HASH_ENCODING_VERSIONS frozen with 2 named encodings', () => {
    expect(Object.isFrozen(HASH_ENCODING_VERSIONS)).toBe(true);
    expect(HASH_ENCODING_VERSIONS.EPOCH_MS).toBe('epoch-ms');
    expect(HASH_ENCODING_VERSIONS.ISO_STRING).toBe('iso');
    expect(Object.keys(HASH_ENCODING_VERSIONS).sort()).toEqual(['EPOCH_MS', 'ISO_STRING']);
  });

  test('DEFAULT_ENCODING is EPOCH_MS (Wave 87 canonical)', () => {
    expect(lib.DEFAULT_ENCODING).toBe(HASH_ENCODING_VERSIONS.EPOCH_MS);
  });

  test('ALL_ENCODINGS is frozen array of both encodings', () => {
    expect(Object.isFrozen(lib.ALL_ENCODINGS)).toBe(true);
    expect(lib.ALL_ENCODINGS).toEqual([
      HASH_ENCODING_VERSIONS.EPOCH_MS,
      HASH_ENCODING_VERSIONS.ISO_STRING,
    ]);
  });
});

describe('hash-chain.lib — encodeTemporal (Wave 88)', () => {
  const probeDate = new Date('2026-05-18T10:30:00.123Z');
  const probeIso = probeDate.toISOString();
  const probeMs = probeDate.getTime();

  test('EPOCH_MS encodes any input form into the same string', () => {
    expect(encodeTemporal(probeDate)).toBe(String(probeMs));
    expect(encodeTemporal(probeIso)).toBe(String(probeMs));
    expect(encodeTemporal(probeMs)).toBe(String(probeMs));
  });

  test('ISO_STRING encodes any input form into the same ISO', () => {
    expect(encodeTemporal(probeDate, HASH_ENCODING_VERSIONS.ISO_STRING)).toBe(probeIso);
    expect(encodeTemporal(probeIso, HASH_ENCODING_VERSIONS.ISO_STRING)).toBe(probeIso);
    expect(encodeTemporal(probeMs, HASH_ENCODING_VERSIONS.ISO_STRING)).toBe(probeIso);
  });

  test('default version is EPOCH_MS', () => {
    expect(encodeTemporal(probeDate)).toBe(
      encodeTemporal(probeDate, HASH_ENCODING_VERSIONS.EPOCH_MS)
    );
  });

  test('null / undefined / invalid date → empty string (no throw)', () => {
    expect(encodeTemporal(null)).toBe('');
    expect(encodeTemporal(undefined)).toBe('');
    expect(encodeTemporal('not-a-date')).toBe('');
  });
});

describe('hash-chain.lib — hashLinkedPayload (Wave 88)', () => {
  test('uses GENESIS sentinel when no priorHash', () => {
    expect(hashLinkedPayload('p1', null)).toBe(sha256('p1|GENESIS'));
    expect(hashLinkedPayload('p1', undefined)).toBe(sha256('p1|GENESIS'));
    expect(hashLinkedPayload('p1', '')).toBe(sha256('p1|GENESIS'));
  });

  test('embeds priorHash in canonical position', () => {
    expect(hashLinkedPayload('p1', 'prev123')).toBe(sha256('p1|prev123'));
  });

  test('different payloads → different hashes', () => {
    expect(hashLinkedPayload('a', 'x')).not.toBe(hashLinkedPayload('b', 'x'));
  });

  test('different priorHash → different hashes', () => {
    expect(hashLinkedPayload('a', 'x')).not.toBe(hashLinkedPayload('a', 'y'));
  });
});

describe('hash-chain.lib — verifyHashChain core walk (Wave 88)', () => {
  // Domain shape used in these tests: { id, payload, signedAt, currentHash }
  function computeHash({ id, payload, signedAt }, { previousHash, encodingVersion }) {
    const p = `${id}|${payload}|${encodeTemporal(signedAt, encodingVersion)}`;
    return hashLinkedPayload(p, previousHash);
  }

  function buildChain(specs, encoding = HASH_ENCODING_VERSIONS.EPOCH_MS) {
    let prior = null;
    return specs.map((spec, i) => {
      const entry = { ...spec, id: spec.id || `e${i}` };
      entry.currentHash = computeHash(entry, { previousHash: prior, encodingVersion: encoding });
      prior = entry.currentHash;
      return entry;
    });
  }

  test('empty chain → ok, chainLength 0', () => {
    const r = verifyHashChain({ entries: [], computeEntryHash: computeHash });
    expect(r.ok).toBe(true);
    expect(r.chainLength).toBe(0);
    expect(r.broken).toEqual([]);
    expect(r.brokenAt).toBeNull();
    expect(r.legacyEncodingCount).toBe(0);
  });

  test('intact EPOCH_MS chain → ok, no legacy entries', () => {
    const entries = buildChain([
      { payload: 'A', signedAt: new Date('2026-01-01T00:00:00.000Z') },
      { payload: 'B', signedAt: new Date('2026-01-02T00:00:00.000Z') },
      { payload: 'C', signedAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    const r = verifyHashChain({ entries, computeEntryHash: computeHash });
    expect(r.ok).toBe(true);
    expect(r.chainLength).toBe(3);
    expect(r.broken).toEqual([]);
    expect(r.legacyEncodingCount).toBe(0);
    expect(r.legacyEntryIds).toEqual([]);
  });

  test('intact ISO_STRING chain → ok, all entries flagged as legacy', () => {
    const entries = buildChain(
      [
        { payload: 'A', signedAt: new Date('2026-01-01T00:00:00.000Z') },
        { payload: 'B', signedAt: new Date('2026-01-02T00:00:00.000Z') },
      ],
      HASH_ENCODING_VERSIONS.ISO_STRING
    );
    const r = verifyHashChain({ entries, computeEntryHash: computeHash });
    expect(r.ok).toBe(true);
    expect(r.legacyEncodingCount).toBe(2);
    expect(r.legacyEntryIds).toEqual(['e0', 'e1']);
  });

  test('mixed chain (legacy + new) → ok, only the legacy flagged', () => {
    // Manually build: e0 with ISO, e1 with EPOCH using e0's hash as prior.
    let entries = [];
    const e0 = { id: 'e0', payload: 'A', signedAt: new Date('2026-01-01Z') };
    e0.currentHash = computeHash(e0, {
      previousHash: null,
      encodingVersion: HASH_ENCODING_VERSIONS.ISO_STRING,
    });
    const e1 = { id: 'e1', payload: 'B', signedAt: new Date('2026-01-02Z') };
    e1.currentHash = computeHash(e1, {
      previousHash: e0.currentHash,
      encodingVersion: HASH_ENCODING_VERSIONS.EPOCH_MS,
    });
    entries = [e0, e1];
    const r = verifyHashChain({ entries, computeEntryHash: computeHash });
    expect(r.ok).toBe(true);
    expect(r.legacyEntryIds).toEqual(['e0']);
  });

  test('tampered hash → broken[] with entryId, brokenAt set, reason HASH_MISMATCH', () => {
    const entries = buildChain([
      { payload: 'A', signedAt: new Date('2026-01-01Z') },
      { payload: 'B', signedAt: new Date('2026-01-02Z') },
    ]);
    entries[1].currentHash = sha256('tampered');
    const r = verifyHashChain({ entries, computeEntryHash: computeHash });
    expect(r.ok).toBe(false);
    expect(r.brokenAt).toBe(1);
    expect(r.broken).toHaveLength(1);
    expect(r.broken[0].entryId).toBe('e1');
    expect(r.broken[0].actual).toBe(sha256('tampered'));
    expect(r.reason).toBe('HASH_MISMATCH');
  });

  test('payload swap (decision flip) → broken', () => {
    const entries = buildChain([{ payload: 'APPROVED', signedAt: new Date('2026-01-01Z') }]);
    entries[0].payload = 'REVOKED'; // pretend an attacker flipped it
    const r = verifyHashChain({ entries, computeEntryHash: computeHash });
    expect(r.ok).toBe(false);
    expect(r.broken).toHaveLength(1);
  });

  test('computeEntryHash returns null → hash recomputation skipped (chain accepted)', () => {
    const entries = buildChain([
      { payload: 'A', signedAt: new Date('2026-01-01Z') },
      { payload: 'B', signedAt: new Date('2026-01-02Z') },
    ]);
    // Wipe to garbage — verifier should still pass because computeEntryHash returns null.
    entries[0].currentHash = 'garbage';
    entries[1].currentHash = 'also-garbage';
    const r = verifyHashChain({ entries, computeEntryHash: () => null });
    expect(r.ok).toBe(true);
    expect(r.legacyEncodingCount).toBe(0);
  });

  test('computeEntryHash omitted → only chain-link enforcement (when enabled)', () => {
    const entries = [
      { id: 'a', currentHash: 'H1' },
      { id: 'b', currentHash: 'H2', priorHash: 'H1' },
    ];
    const r = verifyHashChain({
      entries,
      enforcePriorHashLink: true,
      // no computeEntryHash
    });
    expect(r.ok).toBe(true);
  });
});

describe('hash-chain.lib — verifyHashChain enforcePriorHashLink (Wave 88)', () => {
  test('intact prevHash → ok', () => {
    const entries = [
      { id: 'a', currentHash: 'H1', priorHash: null },
      { id: 'b', currentHash: 'H2', priorHash: 'H1' },
    ];
    const r = verifyHashChain({
      entries,
      enforcePriorHashLink: true,
    });
    expect(r.ok).toBe(true);
  });

  test('wrong prevHash → broken with PREV_HASH_MISMATCH', () => {
    const entries = [
      { id: 'a', currentHash: 'H1', priorHash: null },
      { id: 'b', currentHash: 'H2', priorHash: 'WRONG' },
    ];
    const r = verifyHashChain({
      entries,
      enforcePriorHashLink: true,
    });
    expect(r.ok).toBe(false);
    expect(r.brokenAt).toBe(1);
    expect(r.reason).toBe('PREV_HASH_MISMATCH');
  });

  test('genesis entry with non-null prevHash → broken (not actually genesis)', () => {
    const entries = [
      { id: 'a', currentHash: 'H1', priorHash: 'SOMETHING_NOT_NULL' },
      { id: 'b', currentHash: 'H2', priorHash: 'H1' },
    ];
    const r = verifyHashChain({
      entries,
      enforcePriorHashLink: true,
    });
    expect(r.ok).toBe(false);
    expect(r.brokenAt).toBe(0);
    expect(r.reason).toBe('PREV_HASH_MISMATCH');
  });

  test('null and undefined priorHash on genesis both accepted', () => {
    const a = verifyHashChain({
      entries: [{ id: 'a', currentHash: 'H1', priorHash: null }],
      enforcePriorHashLink: true,
    });
    const b = verifyHashChain({
      entries: [{ id: 'a', currentHash: 'H1' /* priorHash undefined */ }],
      enforcePriorHashLink: true,
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  test('custom getPriorHashRef accessor honoured', () => {
    const entries = [
      { id: 'a', currentHash: 'H1', backref: null },
      { id: 'b', currentHash: 'H2', backref: 'WRONG' },
    ];
    const r = verifyHashChain({
      entries,
      enforcePriorHashLink: true,
      getPriorHashRef: e => e.backref,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('PREV_HASH_MISMATCH');
  });
});

describe('hash-chain.lib — accessor overrides (Wave 88)', () => {
  test('custom getCurrentHash accessor — care-plan style (entry.hash, not currentHash)', () => {
    const entries = [
      { id: 'a', hash: 'H1' },
      { id: 'b', hash: 'H1' }, // intentionally same
    ];
    const r = verifyHashChain({
      entries,
      computeEntryHash: () => 'H1', // always returns H1
      getCurrentHash: e => e.hash,
    });
    expect(r.ok).toBe(true);
  });

  test('custom getEntryId surfaces in broken[]', () => {
    const entries = [{ slug: 'alpha', currentHash: 'right' }];
    const r = verifyHashChain({
      entries,
      computeEntryHash: () => 'wrong',
      getEntryId: e => e.slug,
    });
    expect(r.ok).toBe(false);
    expect(r.broken[0].entryId).toBe('alpha');
  });
});
