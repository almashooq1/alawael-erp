/**
 * blockchain-cert-service-pure.test.js
 *
 * Pure-function tests for blockchainCertService. The lifecycle methods
 * (createCertificate / issueCertificate / batchIssue / verifyByHash) require
 * a live Mongoose, so they live in an integration suite. Here we cover only
 * the deterministic primitives:
 *
 *   • canonicalize — recursive sorted-key JSON
 *   • computeCertHash — same payload → same hash, any field change → different hash
 *   • publicVerifyUrl — env-driven base + fallback
 */

'use strict';

const {
  canonicalize,
  computeCertHash,
  publicVerifyUrl,
} = require('../services/blockchainCertService');

describe('canonicalize — determinism', () => {
  it('sorts keys recursively so encoding order is irrelevant', () => {
    const a = canonicalize({ b: 1, a: { z: 2, y: 3 } });
    const b = canonicalize({ a: { y: 3, z: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":{"y":3,"z":2},"b":1}');
  });

  it('serializes arrays in the given order', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('serializes Date as ISO string', () => {
    const d = new Date('2026-05-03T12:00:00.000Z');
    expect(canonicalize(d)).toBe('"2026-05-03T12:00:00.000Z"');
  });

  it('serializes null + primitives via JSON', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize('x')).toBe('"x"');
    expect(canonicalize(42)).toBe('42');
    expect(canonicalize(true)).toBe('true');
  });
});

describe('computeCertHash', () => {
  const base = {
    recipient: { name: { ar: 'علي', en: 'Ali' }, nationalId: '1234567890' },
    title: { ar: 'إنجاز', en: 'Achievement' },
    data: { score: 92 },
    issueDate: new Date('2026-05-03T00:00:00.000Z'),
    previousHash: '0'.repeat(64),
  };

  it('returns a 64-char hex sha256 string', () => {
    const out = computeCertHash(base);
    expect(out).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same payload', () => {
    expect(computeCertHash(base)).toBe(computeCertHash({ ...base }));
  });

  it('is independent of object-key insertion order', () => {
    const reordered = {
      previousHash: base.previousHash,
      issueDate: base.issueDate,
      data: base.data,
      title: base.title,
      recipient: base.recipient,
    };
    expect(computeCertHash(reordered)).toBe(computeCertHash(base));
  });

  it('changes when recipient changes', () => {
    const mutated = { ...base, recipient: { name: { ar: 'أحمد', en: 'Ahmed' } } };
    expect(computeCertHash(mutated)).not.toBe(computeCertHash(base));
  });

  it('changes when previousHash changes (chain linkage)', () => {
    const mutated = { ...base, previousHash: 'a'.repeat(64) };
    expect(computeCertHash(mutated)).not.toBe(computeCertHash(base));
  });

  it('treats missing data as null (no implicit "undefined" leak)', () => {
    const noData = { ...base };
    delete noData.data;
    const explicit = { ...base, data: null };
    expect(computeCertHash(noData)).toBe(computeCertHash(explicit));
  });
});

describe('publicVerifyUrl', () => {
  const ORIG = process.env.BLOCKCHAIN_VERIFY_PUBLIC_BASE;
  afterEach(() => {
    if (ORIG === undefined) delete process.env.BLOCKCHAIN_VERIFY_PUBLIC_BASE;
    else process.env.BLOCKCHAIN_VERIFY_PUBLIC_BASE = ORIG;
  });

  it('falls back to API path when env is unset', () => {
    delete process.env.BLOCKCHAIN_VERIFY_PUBLIC_BASE;
    expect(publicVerifyUrl('abc')).toBe('/api/v1/blockchain/public/verify/abc');
  });

  it('uses env base when present, stripping trailing slash', () => {
    process.env.BLOCKCHAIN_VERIFY_PUBLIC_BASE = 'https://alaweal.org/verify/';
    expect(publicVerifyUrl('abc')).toBe('https://alaweal.org/verify/abc');
  });
});
