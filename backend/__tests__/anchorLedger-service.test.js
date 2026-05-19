/**
 * Smoke tests for services/anchorLedger.service.js — the minimal
 * no-op forwarder shipped 2026-05-19 to activate the optional app.js
 * anchor hook (previously try/catch-degraded to null).
 *
 * Critical invariant verified: `txId` is always **null** here. Any
 * future change that returns a non-null txId without writing a real
 * chain transaction is a real audit/compliance regression — callers
 * use res.txId as a verifiable on-chain pointer and a fake value
 * would silently mislead regulators.
 */

'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const crypto = require('crypto');
const logger = require('../utils/logger');
const { anchorLedgerService } = require('../services/anchorLedger.service');

beforeEach(() => {
  logger.info.mockClear();
});

describe('anchorLedgerService.commit', () => {
  it('exposes a .commit function (this is the shape app.js checks)', () => {
    expect(typeof anchorLedgerService.commit).toBe('function');
  });

  it('returns null txId (no real chain wired — must never fake one)', async () => {
    const res = await anchorLedgerService.commit({
      kind: 'access-review.attestation',
      payloadHash: 'abc123',
      entityId: 'attestation-1',
    });
    expect(res.txId).toBeNull();
    expect(res.anchored).toBe(false);
  });

  it('accepts both `kind` (access-review) and `type` (beneficiary-lifecycle) labels', async () => {
    const r1 = await anchorLedgerService.commit({ kind: 'access-review.attestation' });
    const r2 = await anchorLedgerService.commit({ type: 'beneficiary.lifecycle' });
    expect(r1.kind).toBe('access-review.attestation');
    expect(r2.kind).toBe('beneficiary.lifecycle');
  });

  it('uses caller-supplied payloadHash verbatim', async () => {
    const res = await anchorLedgerService.commit({
      kind: 'x',
      payloadHash: 'precomputed-hash-deadbeef',
    });
    expect(res.payloadHash).toBe('precomputed-hash-deadbeef');
  });

  it('falls back to sha256(payload) when payloadHash absent', async () => {
    const payload = { recordId: 'r-1', toState: 'discharged' };
    const expected = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const res = await anchorLedgerService.commit({ type: 'beneficiary.lifecycle', payload });
    expect(res.payloadHash).toBe(expected);
  });

  it('emits one structured anchor line per call', async () => {
    await anchorLedgerService.commit({
      kind: 'access-review.attestation',
      payloadHash: 'h1',
      entityId: 'att-1',
    });
    expect(logger.info).toHaveBeenCalledTimes(1);
    const [msg, line] = logger.info.mock.calls[0];
    expect(msg).toBe('anchor: access-review.attestation');
    expect(line).toMatchObject({
      kind: 'access-review.attestation',
      entityId: 'att-1',
      payloadHash: 'h1',
      anchored: false,
      reason: 'no-chain-client-wired',
    });
  });

  it('coerces ObjectId-ish entityId to string', async () => {
    const res = await anchorLedgerService.commit({
      kind: 'x',
      entityId: { toString: () => 'oid-xyz' },
    });
    const [, line] = logger.info.mock.calls[0];
    expect(line.entityId).toBe('oid-xyz');
    expect(res.txId).toBeNull();
  });

  it('returns a resolved promise even with null/undefined input', async () => {
    await expect(anchorLedgerService.commit()).resolves.toMatchObject({ txId: null });
    await expect(anchorLedgerService.commit(null)).resolves.toMatchObject({ txId: null });
  });

  it('returns a hashedAt ISO timestamp', async () => {
    const res = await anchorLedgerService.commit({ kind: 'x' });
    expect(res.hashedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
