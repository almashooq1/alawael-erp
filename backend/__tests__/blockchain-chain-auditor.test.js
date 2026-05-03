/**
 * blockchain-chain-auditor.test.js — auditCertificate is pure given a
 * cert object, so we can test it without spinning Mongo. We mock the
 * AnchorLedger.findOne lookup and feed synthetic certs.
 */

'use strict';

jest.mock('../models/blockchain.model', () => ({
  BlockchainCertificate: { find: jest.fn() },
  CertificateTemplate: {},
  VerificationLog: {},
}));

jest.mock('../services/blockchain/adapters/internalAdapter', () => {
  // Preserve the real InternalAdapter (mockEthereumAdapter extends it)
  // but override AnchorLedger with a jest mock so tests can stub findOne.
  const real = jest.requireActual('../services/blockchain/adapters/internalAdapter');
  return {
    ...real,
    AnchorLedger: { findOne: jest.fn() },
  };
});

const { AnchorLedger } = require('../services/blockchain/adapters/internalAdapter');
const certService = require('../services/blockchainCertService');
const merkle = require('../services/blockchain/merkleTree');
const auditor = require('../services/blockchain/chainAuditor');

function makeCert({
  data = { score: 90 },
  mutateHash = false,
  mutateRoot = false,
  missingAnchor = false,
} = {}) {
  const recipient = { name: { ar: 'علي', en: 'Ali' }, nationalId: '1234567890' };
  const title = { ar: 'إنجاز', en: 'Achievement' };
  const issueDate = new Date('2026-05-03T00:00:00.000Z');
  const previousHash = '0'.repeat(64);
  const trueHash = certService.computeCertHash({ recipient, title, data, issueDate, previousHash });
  const { root, proofs } = merkle.buildTreeWithProofs([trueHash]);
  return {
    cert: {
      _id: 'c1',
      certificateNumber: 'CERT-X',
      status: 'issued',
      isDeleted: false,
      recipient,
      title,
      data,
      issueDate,
      previousHash,
      hash: mutateHash ? 'f'.repeat(64) : trueHash,
      merkleRoot: mutateRoot ? 'a'.repeat(64) : root,
      merkleProof: proofs[0].map(p => `${p.position}:${p.sibling}`),
      blockchain: { transactionHash: '0xabc', network: 'internal' },
    },
    anchor: missingAnchor
      ? null
      : { transactionHash: '0xabc', merkleRoot: mutateRoot ? root : root },
  };
}

describe('auditCertificate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns ok=true for an untampered cert', async () => {
    const { cert, anchor } = makeCert();
    AnchorLedger.findOne.mockReturnValue({ lean: () => Promise.resolve(anchor) });
    const v = await auditor.auditCertificate(cert);
    expect(v.ok).toBe(true);
    expect(v.hashMatch).toBe(true);
    expect(v.merkleMatch).toBe(true);
    expect(v.anchorMatch).toBe(true);
    expect(v.reasons).toEqual([]);
  });

  it('flags hash_mismatch when cert.hash was tampered', async () => {
    const { cert, anchor } = makeCert({ mutateHash: true });
    AnchorLedger.findOne.mockReturnValue({ lean: () => Promise.resolve(anchor) });
    const v = await auditor.auditCertificate(cert);
    expect(v.ok).toBe(false);
    expect(v.hashMatch).toBe(false);
    expect(v.reasons).toContain('hash_mismatch');
  });

  it('flags merkle_mismatch when merkleRoot drifts from the proof', async () => {
    // Fabricate a cert with a valid hash but a wrong merkle root.
    const recipient = { name: { ar: 'A' } };
    const title = { ar: 'T' };
    const issueDate = new Date('2026-05-03');
    const previousHash = '0'.repeat(64);
    const hash = certService.computeCertHash({
      recipient,
      title,
      data: null,
      issueDate,
      previousHash,
    });
    const cert = {
      _id: 'c1',
      certificateNumber: 'CERT-X',
      status: 'issued',
      recipient,
      title,
      data: null,
      issueDate,
      previousHash,
      hash,
      merkleRoot: 'b'.repeat(64),
      merkleProof: ['right:c'.repeat(0) + 'c'.repeat(64)],
      blockchain: { transactionHash: '0xabc' },
    };
    AnchorLedger.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const v = await auditor.auditCertificate(cert);
    expect(v.merkleMatch).toBe(false);
    expect(v.reasons).toContain('merkle_mismatch');
    expect(v.ok).toBe(false);
  });

  it('flags anchor_missing when AnchorLedger has no row for the tx hash', async () => {
    const { cert } = makeCert({ missingAnchor: true });
    AnchorLedger.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    const v = await auditor.auditCertificate(cert);
    expect(v.anchorMatch).toBe(false);
    expect(v.reasons).toContain('anchor_missing');
    expect(v.ok).toBe(false);
  });

  it('treats a cert with no merkle data as ok=hashMatch (single-cert PoC mode)', async () => {
    const { cert } = makeCert();
    delete cert.merkleRoot;
    delete cert.merkleProof;
    delete cert.blockchain;
    const v = await auditor.auditCertificate(cert);
    expect(v.ok).toBe(true);
    expect(v.merkleMatch).toBeNull();
    expect(v.anchorMatch).toBeNull();
  });

  it('handles single-leaf batches where the cert hash is the root', async () => {
    const { cert, anchor } = makeCert();
    cert.merkleRoot = cert.hash;
    cert.merkleProof = [];
    AnchorLedger.findOne.mockReturnValue({
      lean: () => Promise.resolve({ ...anchor, merkleRoot: cert.hash }),
    });
    const v = await auditor.auditCertificate(cert);
    expect(v.merkleMatch).toBe(true);
    expect(v.ok).toBe(true);
  });
});

describe('parseProof', () => {
  it('splits "position:sibling" strings into structured steps', () => {
    expect(auditor.parseProof(['left:abc', 'right:def'])).toEqual([
      { position: 'left', sibling: 'abc' },
      { position: 'right', sibling: 'def' },
    ]);
  });

  it('returns [] for non-arrays', () => {
    expect(auditor.parseProof(null)).toEqual([]);
    expect(auditor.parseProof('nope')).toEqual([]);
  });
});
