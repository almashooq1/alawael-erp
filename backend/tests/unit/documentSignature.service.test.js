/**
 * Unit Tests — documentSignature.service.js
 * DB-dependent — mongoose globally mocked by jest.setup.js
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mongoose = require('mongoose');
const engine = require('../../services/documents/documentSignature.service');
const { SIGNATURE_TYPES } = engine;

// ─── helpers ───
const fakeSig = (overrides = {}) => ({
  _id: 'sig1',
  documentId: 'doc1',
  documentVersion: 1,
  signerId: 'u1',
  signerName: 'أحمد محمد',
  signerEmail: 'a@b.com',
  signerRole: 'أخصائي',
  signerDepartment: 'التأهيل',
  signatureType: 'approval',
  signatureHash: 'abc123hash',
  documentHash: 'docHash',
  signatureImage: '',
  signatureText: 'أحمد محمد',
  position: { page: 1, x: 100, y: 200, width: 200, height: 80 },
  comments: '',
  reason: '',
  status: 'signed',
  signedAt: new Date(),
  isValid: true,
  expiresAt: null,
  signatureChainId: null,
  orderInChain: 0,
  deviceInfo: { ip: '1.2.3.4', timestamp: new Date() },
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockImplementation(function () {
    return Promise.resolve(this);
  }),
  ...overrides,
});

const fakeChain = (overrides = {}) => ({
  _id: 'ch1',
  documentId: 'doc1',
  name: 'سلسلة موافقة',
  nameEn: 'Approval Chain',
  description: '',
  participants: [
    {
      userId: { _id: 'u1', toString: () => 'u1' },
      name: 'أحمد',
      order: 0,
      isRequired: true,
      status: 'pending',
      signatureType: 'approval',
    },
    {
      userId: { _id: 'u2', toString: () => 'u2' },
      name: 'خالد',
      order: 1,
      isRequired: true,
      status: 'pending',
      signatureType: 'review',
    },
  ],
  requireSequential: true,
  allowParallelSigning: false,
  status: 'active',
  currentOrder: 0,
  createdBy: 'mgr1',
  createdAt: new Date(),
  save: jest.fn().mockImplementation(function () {
    return Promise.resolve(this);
  }),
  ...overrides,
});

const mockChain = resolveVal => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolveVal),
  populate: jest.fn().mockReturnThis(),
});

let SigModel, ChainModel;

beforeEach(() => {
  jest.clearAllMocks();
  SigModel = mongoose.model('DigitalSignature');
  ChainModel = mongoose.model('SignatureChain');
});

// ═══════════════════════════════════════
//  SIGNATURE_TYPES
// ═══════════════════════════════════════
describe('SIGNATURE_TYPES', () => {
  it('exports all 6 types', () => {
    expect(Object.keys(SIGNATURE_TYPES)).toHaveLength(6);
    expect(SIGNATURE_TYPES.approval.label).toBe('موافقة');
    expect(SIGNATURE_TYPES.rejection.icon).toBe('❌');
    expect(SIGNATURE_TYPES.witness.labelEn).toBe('Witness');
  });

  it('getSignatureTypes returns SIGNATURE_TYPES', () => {
    expect(engine.getSignatureTypes()).toEqual(SIGNATURE_TYPES);
  });
});

// ═══════════════════════════════════════
//  _formatSignature
// ═══════════════════════════════════════
describe('signature._formatSignature', () => {
  it('formats raw signature with type config', () => {
    const r = engine._formatSignature(fakeSig());
    expect(r.id).toBe('sig1');
    expect(r.signer.name).toBe('أحمد محمد');
    expect(r.signer.id).toBe('u1');
    expect(r.type.key).toBe('approval');
    expect(r.type.label).toBe('موافقة');
    expect(r.type.icon).toBe('✅');
    expect(r.status).toBe('signed');
    expect(r.isValid).toBe(true);
    expect(r.signatureHash).toBe('abc123hash');
  });

  it('handles populated signerId', () => {
    const raw = fakeSig({ signerId: { _id: 'u1', name: 'أحمد', email: 'a@b.com' } });
    const r = engine._formatSignature(raw);
    expect(r.signer.id).toBe('u1');
  });

  it('handles unknown signatureType', () => {
    const raw = fakeSig({ signatureType: 'unknown' });
    const r = engine._formatSignature(raw);
    expect(r.type.icon).toBe('✍️');
    expect(r.type.color).toBe('#6B7280');
  });

  it('marks signatureImage as exists when present', () => {
    const r = engine._formatSignature(fakeSig({ signatureImage: 'base64data' }));
    expect(r.signatureImage).toBe('(exists)');
  });

  it('marks signatureImage as null when empty', () => {
    const r = engine._formatSignature(fakeSig({ signatureImage: '' }));
    expect(r.signatureImage).toBeNull();
  });
});

// ═══════════════════════════════════════
//  _formatChain
// ═══════════════════════════════════════
describe('signature._formatChain', () => {
  it('formats chain with progress', () => {
    const chain = fakeChain();
    chain.participants[0].status = 'signed';
    const r = engine._formatChain(chain);
    expect(r.id).toBe('ch1');
    expect(r.name).toBe('سلسلة موافقة');
    expect(r.progress).toBe(50);
    expect(r.participants).toHaveLength(2);
    expect(r.settings.requireSequential).toBe(true);
    expect(r.status).toBe('active');
  });

  it('0% progress when none signed', () => {
    const r = engine._formatChain(fakeChain());
    expect(r.progress).toBe(0);
  });

  it('100% progress when all signed', () => {
    const chain = fakeChain();
    chain.participants[0].status = 'signed';
    chain.participants[1].status = 'signed';
    const r = engine._formatChain(chain);
    expect(r.progress).toBe(100);
  });
});

// ═══════════════════════════════════════
//  revokeSignature
// ═══════════════════════════════════════
describe('signature.revokeSignature', () => {
  it('revokes signed signature', async () => {
    const sig = fakeSig({ status: 'signed' });
    SigModel.findById.mockResolvedValue(sig);

    const r = await engine.revokeSignature('sig1', 'u1', 'سبب الإلغاء');
    expect(r.success).toBe(true);
    expect(sig.status).toBe('revoked');
    expect(sig.isValid).toBe(false);
    expect(sig.revokeReason).toBe('سبب الإلغاء');
    expect(sig.save).toHaveBeenCalled();
  });

  it('throws when not found', async () => {
    SigModel.findById.mockResolvedValue(null);
    await expect(engine.revokeSignature('bad', 'u1')).rejects.toThrow('التوقيع غير موجود');
  });

  it('throws when not signed status', async () => {
    SigModel.findById.mockResolvedValue(fakeSig({ status: 'pending' }));
    await expect(engine.revokeSignature('sig1', 'u1')).rejects.toThrow('غير نشط');
  });
});

// ═══════════════════════════════════════
//  getDocumentSignatures
// ═══════════════════════════════════════
describe('signature.getDocumentSignatures', () => {
  it('returns signatures with counts', async () => {
    const sigs = [fakeSig({ status: 'signed' }), fakeSig({ _id: 'sig2', status: 'pending' })];
    SigModel.find.mockReturnValue(mockChain(sigs));

    const r = await engine.getDocumentSignatures('doc1');
    expect(r.success).toBe(true);
    expect(r.total).toBe(2);
    expect(r.signedCount).toBe(1);
    expect(r.pendingCount).toBe(1);
    expect(r.signatures).toHaveLength(2);
  });

  it('returns zero counts for no sigs', async () => {
    SigModel.find.mockReturnValue(mockChain([]));
    const r = await engine.getDocumentSignatures('doc1');
    expect(r.total).toBe(0);
    expect(r.signedCount).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getPendingSignatures
// ═══════════════════════════════════════
describe('signature.getPendingSignatures', () => {
  it('returns direct pending', async () => {
    const pending = [fakeSig({ status: 'pending' })];
    SigModel.find.mockReturnValue(mockChain(pending));
    ChainModel.find.mockReturnValue(mockChain([]));

    const r = await engine.getPendingSignatures('u1');
    expect(r.success).toBe(true);
    expect(r.total).toBe(1);
    // type: 'direct' is overwritten by _formatSignature's type object
    expect(r.pending[0].type.key).toBe('approval');
  });

  it('returns chain pending', async () => {
    SigModel.find.mockReturnValue(mockChain([]));
    const chain = fakeChain();
    chain.participants[0].userId = { toString: () => 'u1' };
    ChainModel.find.mockReturnValue(mockChain([chain]));

    const r = await engine.getPendingSignatures('u1');
    expect(r.success).toBe(true);
    expect(r.total).toBe(1);
    expect(r.pending[0].type).toBe('chain');
    expect(r.pending[0].chainName).toBe('سلسلة موافقة');
  });
});

// ═══════════════════════════════════════
//  rejectInChain
// ═══════════════════════════════════════
describe('signature.rejectInChain', () => {
  it('cancels chain when required signer rejects', async () => {
    const chain = fakeChain();
    ChainModel.findById.mockResolvedValue(chain);

    const r = await engine.rejectInChain('ch1', 'u1', 'غير مناسب');
    expect(r.success).toBe(true);
    expect(r.isCancelled).toBe(true);
    expect(chain.status).toBe('cancelled');
    expect(chain.save).toHaveBeenCalled();
  });

  it('throws when chain not found', async () => {
    ChainModel.findById.mockResolvedValue(null);
    await expect(engine.rejectInChain('bad', 'u1')).rejects.toThrow('غير موجودة');
  });

  it('throws when user not pending participant', async () => {
    const chain = fakeChain();
    ChainModel.findById.mockResolvedValue(chain);
    await expect(engine.rejectInChain('ch1', 'unknown_user')).rejects.toThrow('لست مشاركاً');
  });
});

// ═══════════════════════════════════════
//  getSignatureChain
// ═══════════════════════════════════════
describe('signature.getSignatureChain', () => {
  it('returns formatted chain', async () => {
    const chain = fakeChain();
    ChainModel.findById.mockReturnValue(mockChain(chain));
    const r = await engine.getSignatureChain('ch1');
    expect(r.id).toBe('ch1');
    expect(r.participants).toHaveLength(2);
  });

  it('returns null when not found', async () => {
    ChainModel.findById.mockReturnValue(mockChain(null));
    const r = await engine.getSignatureChain('bad');
    expect(r).toBeNull();
  });
});

// ═══════════════════════════════════════
//  getDocumentChains
// ═══════════════════════════════════════
describe('signature.getDocumentChains', () => {
  it('returns chains for document', async () => {
    ChainModel.find.mockReturnValue(mockChain([fakeChain()]));
    const r = await engine.getDocumentChains('doc1');
    expect(r.success).toBe(true);
    expect(r.total).toBe(1);
    expect(r.chains[0].name).toBe('سلسلة موافقة');
  });

  it('returns empty when no chains', async () => {
    ChainModel.find.mockReturnValue(mockChain([]));
    const r = await engine.getDocumentChains('doc1');
    expect(r.total).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getSignatureStats
// ═══════════════════════════════════════
describe('signature.getSignatureStats', () => {
  it('returns aggregated stats', async () => {
    SigModel.aggregate
      .mockResolvedValueOnce([
        { _id: 'signed', count: 10 },
        { _id: 'pending', count: 3 },
      ]) // statusCounts
      .mockResolvedValueOnce([{ _id: 'approval', count: 8 }]); // typeCounts
    ChainModel.countDocuments
      .mockResolvedValueOnce(5) // totalChains
      .mockResolvedValueOnce(3); // completedChains

    const r = await engine.getSignatureStats();
    expect(r.success).toBe(true);
    expect(r.stats.byStatus).toHaveLength(2);
    expect(r.stats.byType).toHaveLength(1);
    expect(r.stats.chains.total).toBe(5);
    expect(r.stats.chains.completed).toBe(3);
    expect(r.stats.chains.completionRate).toBe(60);
  });

  it('returns 0 completion rate when no chains', async () => {
    SigModel.aggregate.mockResolvedValue([]);
    ChainModel.countDocuments.mockResolvedValue(0);

    const r = await engine.getSignatureStats();
    expect(r.stats.chains.completionRate).toBe(0);
  });
});
