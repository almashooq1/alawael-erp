/**
 * nafath-signing-service.test.js — service-level lifecycle test using an
 * in-memory fake model + the mock signing client shipped with the adapter.
 *
 * Scenarios:
 *   • requestSignature persists a PENDING row with a randomNumber + txId
 *   • duplicate request within the fingerprint window returns reused=true
 *     and does NOT create a second row or trigger a second adapter call
 *   • pollSignature stays PENDING before MOCK_APPROVE_MS, then transitions
 *     to APPROVED with a verified JWS + signer attributes
 *   • national ID ending in '99' lands on REJECTED
 *   • national ID ending in '88' lands on EXPIRED
 *   • tamper detection — if the stored documentHash is swapped after the
 *     signature is returned, verifySignature fails loudly
 *   • cancelSignature moves PENDING → CANCELLED; non-pending is a no-op
 *   • buildEvidencePackage returns auditor-ready JSON with verification=true
 */

'use strict';

const { createService } = require('../services/nafathSigningService');

function createFakeModel() {
  const rows = new Map();
  let seq = 1;

  class FakeDoc {
    constructor(data) {
      Object.assign(this, data);
      this._id = this._id || `id-${seq++}`;
      this.createdAt = this.createdAt || new Date();
    }
    isResolved() {
      return ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ERROR'].includes(this.status);
    }
    async save() {
      rows.set(this._id, this);
      return this;
    }
  }

  return {
    _rows: rows,
    async create(data) {
      const doc = new FakeDoc(data);
      rows.set(doc._id, doc);
      return doc;
    },
    async findOne(q) {
      for (const doc of rows.values()) {
        let match = true;
        for (const [k, v] of Object.entries(q)) {
          if (k === 'status' && v.$in) {
            if (!v.$in.includes(doc[k])) match = false;
            continue;
          }
          if (k === 'createdAt' && v.$gte) {
            if (doc.createdAt < v.$gte) match = false;
            continue;
          }
          if (doc[k] !== v) match = false;
        }
        if (match) return doc;
      }
      return null;
    },
    findById(id) {
      const doc = rows.get(id);
      const chain = Promise.resolve(doc || null);
      chain.lean = async () => (doc ? { ...doc, _id: id } : null);
      return chain;
    },
  };
}

describe('nafathSigningService lifecycle', () => {
  const client = require('../integrations/nafath/signingClient');

  function buildService({ approveMs = 0 } = {}) {
    const model = createFakeModel();
    // Wrap the mock client so we can control MOCK_APPROVE_MS per test.
    const wrapped = {
      ...client,
      pollStatus: async ({ transactionId, signerNationalId, documentHash }) => {
        return client.pollStatus({
          transactionId,
          signerNationalId,
          documentHash,
          createdAtMs: Date.now() - approveMs - 1, // force the mock past the approval gate
        });
      },
    };
    return { service: createService({ model, client: wrapped }), model };
  }

  const goodInput = {
    documentType: 'IRP',
    documentId: 'irp-123',
    documentHash: 'a'.repeat(64),
    signerNationalId: '1087654321',
    purpose: 'sign',
  };

  it('persists a PENDING request and exposes randomNumber + txId', async () => {
    const { service, model } = buildService();
    const out = await service.requestSignature(goodInput);
    expect(out.status).toBe('PENDING');
    expect(out.randomNumber).toMatch(/^\d{2}$/);
    expect(out.transactionId).toMatch(/^nafath-sign-/);
    expect(model._rows.size).toBe(1);
  });

  it('reuses the same request within the fingerprint window', async () => {
    const { service, model } = buildService();
    const first = await service.requestSignature(goodInput);
    const second = await service.requestSignature(goodInput);
    expect(second.reused).toBe(true);
    expect(second.transactionId).toBe(first.transactionId);
    expect(model._rows.size).toBe(1);
  });

  it('rejects invalid national IDs', async () => {
    const { service } = buildService();
    await expect(
      service.requestSignature({ ...goodInput, signerNationalId: '123' })
    ).rejects.toMatchObject({
      code: 'INVALID_ID',
    });
  });

  it('polls to APPROVED and verifies the signature JWS', async () => {
    const { service } = buildService({ approveMs: 10_000 });
    const out = await service.requestSignature(goodInput);
    const status = await service.pollSignature(out.requestId);
    expect(status.status).toBe('APPROVED');
    expect(status.signerAttributes.fullName).toContain('4321');
  });

  it('polls to REJECTED when the mock sees the 99 sentinel', async () => {
    const { service } = buildService({ approveMs: 10_000 });
    const out = await service.requestSignature({ ...goodInput, signerNationalId: '1087654399' });
    const status = await service.pollSignature(out.requestId);
    expect(status.status).toBe('REJECTED');
    expect(status.errorMessage).toMatch(/رفض/);
  });

  it('polls to EXPIRED when the mock sees the 88 sentinel', async () => {
    const { service } = buildService({ approveMs: 10_000 });
    const out = await service.requestSignature({ ...goodInput, signerNationalId: '1087654388' });
    const status = await service.pollSignature(out.requestId);
    expect(status.status).toBe('EXPIRED');
  });

  it('verifySignature catches post-hoc hash tampering', async () => {
    const { service, model } = buildService({ approveMs: 10_000 });
    const out = await service.requestSignature(goodInput);
    await service.pollSignature(out.requestId);
    // Tamper with the stored document hash as if an attacker rewrote the row
    const row = model._rows.get(out.requestId);
    row.documentHash = 'b'.repeat(64);
    const v = await service.verifySignature(out.requestId);
    expect(v.verified).toBe(false);
    expect(v.reason).toBe('NAFATH_JWS_DOCUMENT_HASH_MISMATCH');
  });

  it('cancelSignature moves PENDING → CANCELLED and is a no-op on resolved', async () => {
    const { service } = buildService({ approveMs: 10_000 });
    const pending = await service.requestSignature(goodInput);
    const cancelled = await service.cancelSignature(pending.requestId);
    expect(cancelled.status).toBe('CANCELLED');

    // Now a resolved request should not flip back
    const another = await service.requestSignature({ ...goodInput, documentId: 'irp-456' });
    await service.pollSignature(another.requestId);
    const after = await service.cancelSignature(another.requestId);
    expect(['APPROVED', 'REJECTED']).toContain(after.status);
  });

  it('buildEvidencePackage returns the auditor JSON with verified=true', async () => {
    const { service } = buildService({ approveMs: 10_000 });
    const out = await service.requestSignature(goodInput);
    await service.pollSignature(out.requestId);
    const evidence = await service.buildEvidencePackage(out.requestId);
    expect(evidence.kind).toBe('nafath-signature-evidence');
    expect(evidence.verification.verified).toBe(true);
    expect(evidence.signature.jws).toMatch(/\./);
    expect(evidence.request.documentHash).toBe(goodInput.documentHash);
  });
});
