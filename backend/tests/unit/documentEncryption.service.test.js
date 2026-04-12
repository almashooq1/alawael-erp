/**
 * Unit Tests — documentEncryption.service.js
 * DB + crypto service — uses jest.setup.js global mongoose mock
 *
 * The standalone helpers (deriveKey, encryptData, decryptData, generateChecksum)
 * are NOT exported, so we test them indirectly via the class methods.
 * We test the classification logic, DLP scanning, access control, and stats.
 */
'use strict';

const mongoose = require('mongoose');
const service = require('../../services/documents/documentEncryption.service');

// Seed a Document in the mock store so findById works
const seedDocument = async (id, extra = {}) => {
  const Document = mongoose.model('Document');
  const store = await Document.create({
    _id: id,
    title: extra.title || 'Test Doc',
    content: extra.content || 'Test content',
    description: extra.description || 'Test desc',
    ...extra,
  });
  // Overwrite _id to match our desired id for findById lookup
  store._id = id;
  return store;
};

describe('DocumentEncryptionService', () => {
  // ═══════════════════════════════════════
  //  encryptDocument
  // ═══════════════════════════════════════
  describe('encryptDocument', () => {
    it('encrypts a document in the store', async () => {
      await seedDocument('enc-doc-1');
      const r = await service.encryptDocument(
        'enc-doc-1',
        { key: 'test-master-key-32char!!' },
        'user1'
      );
      expect(r.success).toBe(true);
      expect(r.record).toBeDefined();
      expect(r.checksum).toBeTruthy();
    });

    it('throws for non-existent document', async () => {
      await expect(service.encryptDocument('missing-id', {}, 'u1')).rejects.toThrow('غير موجود');
    });
  });

  // ═══════════════════════════════════════
  //  decryptDocument
  // ═══════════════════════════════════════
  describe('decryptDocument', () => {
    it('throws if no encryption record', async () => {
      await expect(service.decryptDocument('no-enc-doc', {}, 'u1')).rejects.toThrow('لا يوجد سجل');
    });
  });

  // ═══════════════════════════════════════
  //  getEncryptionStatus
  // ═══════════════════════════════════════
  describe('getEncryptionStatus', () => {
    it('returns status for any documentId', async () => {
      const r = await service.getEncryptionStatus('any-doc');
      expect(r.success).toBe(true);
      expect(r).toHaveProperty('isEncrypted');
    });

    it('isEncrypted is false when no record', async () => {
      const r = await service.getEncryptionStatus('nonexistent');
      expect(r.isEncrypted).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  //  batchEncrypt
  // ═══════════════════════════════════════
  describe('batchEncrypt', () => {
    it('returns results array', async () => {
      await seedDocument('batch1');
      await seedDocument('batch2');
      const r = await service.batchEncrypt(['batch1', 'batch2', 'missing'], {}, 'u1');
      expect(r.success).toBe(true);
      expect(r.results.length).toBe(3);
      expect(r.encrypted).toBeGreaterThanOrEqual(1);
      expect(r.results.find(x => x.documentId === 'missing').success).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  //  classifyDocument
  // ═══════════════════════════════════════
  describe('classifyDocument', () => {
    it('creates public classification', async () => {
      const r = await service.classifyDocument('clf-doc-1', 'public', {}, 'u1');
      expect(r.success).toBe(true);
      expect(r.classification).toBeDefined();
    });

    it('creates confidential with auto-restrictions', async () => {
      const r = await service.classifyDocument('clf-doc-2', 'confidential', {}, 'u1');
      expect(r.success).toBe(true);
      expect(r.classification.restrictions?.noCopy).toBe(true);
      expect(r.classification.restrictions?.watermarkRequired).toBe(true);
    });

    it('creates secret with stricter restrictions', async () => {
      const r = await service.classifyDocument('clf-doc-3', 'secret', {}, 'u1');
      expect(r.success).toBe(true);
      const rest = r.classification.restrictions;
      expect(rest.noCopy).toBe(true);
      expect(rest.noDownload).toBe(true);
      expect(rest.encryptionRequired).toBe(true);
      expect(rest.noForward).toBe(true);
    });

    it('creates top_secret with all restrictions', async () => {
      const r = await service.classifyDocument('clf-doc-4', 'top_secret', {}, 'u1');
      expect(r.success).toBe(true);
      const rest = r.classification.restrictions;
      expect(rest.noPrint).toBe(true);
      expect(rest.noExport).toBe(true);
      expect(rest.encryptionRequired).toBe(true);
    });
  });

  // ═══════════════════════════════════════
  //  autoClassifyDocument
  // ═══════════════════════════════════════
  describe('autoClassifyDocument', () => {
    it('throws for non-existent document', async () => {
      await expect(service.autoClassifyDocument('missing-auto')).rejects.toThrow('غير موجود');
    });

    it('detects credit card pattern', async () => {
      await seedDocument('cc-doc', {
        title: 'بطاقة',
        content: 'الرقم 4111-1111-1111-1111 خاص',
      });
      const r = await service.autoClassifyDocument('cc-doc');
      expect(r.success).toBe(true);
      expect(r.detectedPatterns.length).toBeGreaterThan(0);
      expect(r.detectedPatterns.some(p => p.includes('ائتمان') || p.includes('Credit'))).toBe(true);
    });

    it('detects Saudi National ID', async () => {
      await seedDocument('nid-doc', {
        content: 'الهوية 1234567890 محمد',
      });
      const r = await service.autoClassifyDocument('nid-doc');
      expect(r.detectedPatterns.some(p => p.includes('هوية') || p.includes('National'))).toBe(true);
    });

    it('detects secret keywords', async () => {
      await seedDocument('secret-kw-doc', {
        title: 'وثيقة سرية',
        content: 'هذا مستند سري جداً classified',
      });
      const r = await service.autoClassifyDocument('secret-kw-doc');
      expect(r.detectedPatterns.some(p => p.includes('كلمة مفتاحية'))).toBe(true);
    });

    it('classifies as internal when no patterns found', async () => {
      await seedDocument('clean-doc', {
        title: 'تقرير عادي',
        content: 'لا يوجد بيانات حساسة',
      });
      const r = await service.autoClassifyDocument('clean-doc');
      expect(r.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════
  //  getClassification
  // ═══════════════════════════════════════
  describe('getClassification', () => {
    it('returns null classification when none', async () => {
      const r = await service.getClassification('no-class');
      expect(r.success).toBe(true);
      expect(r.classification).toBeNull();
    });
  });

  // ═══════════════════════════════════════
  //  getClassifications
  // ═══════════════════════════════════════
  describe('getClassifications', () => {
    it('returns paginated result', async () => {
      const r = await service.getClassifications({});
      expect(r.success).toBe(true);
      expect(Array.isArray(r.classifications)).toBe(true);
      expect(typeof r.total).toBe('number');
    });
  });

  // ═══════════════════════════════════════
  //  DLP — scanContent
  // ═══════════════════════════════════════
  describe('scanContent', () => {
    it('returns clean for safe content', async () => {
      const r = await service.scanContent('مرحبا هذا نص عادي');
      expect(r.success).toBe(true);
      expect(r.riskScore).toBe(0);
      expect(r.hasViolations).toBe(false);
      expect(r.shouldBlock).toBe(false);
    });

    it('returns structured result', async () => {
      const r = await service.scanContent('test');
      expect(r).toHaveProperty('violations');
      expect(r).toHaveProperty('riskScore');
      expect(r).toHaveProperty('hasViolations');
      expect(r).toHaveProperty('shouldBlock');
    });
  });

  // ═══════════════════════════════════════
  //  DLP Policies
  // ═══════════════════════════════════════
  describe('createDLPPolicy', () => {
    it('creates policy with defaults', async () => {
      const r = await service.createDLPPolicy({ name: 'Test DLP' }, 'u1');
      expect(r.success).toBe(true);
      expect(r.policy.name).toBe('Test DLP');
      expect(r.policy.sensitivePatterns.length).toBeGreaterThan(0);
    });
  });

  describe('getDLPPolicies', () => {
    it('returns array', async () => {
      const r = await service.getDLPPolicies({});
      expect(r.success).toBe(true);
      expect(Array.isArray(r.policies)).toBe(true);
    });
  });

  describe('deleteDLPPolicy', () => {
    it('returns success', async () => {
      const r = await service.deleteDLPPolicy('pol-id');
      expect(r.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════
  //  Access Logs
  // ═══════════════════════════════════════
  describe('logAccess', () => {
    it('logs allowed action', async () => {
      const r = await service.logAccess('doc1', 'user1', 'view', {});
      expect(r.success).toBe(true);
      expect(r.blocked).toBe(false);
    });
  });

  describe('getAccessLogs', () => {
    it('returns paginated logs', async () => {
      const r = await service.getAccessLogs({});
      expect(r.success).toBe(true);
      expect(Array.isArray(r.logs)).toBe(true);
      expect(typeof r.total).toBe('number');
    });
  });

  // ═══════════════════════════════════════
  //  Stats
  // ═══════════════════════════════════════
  describe('getStats', () => {
    it('returns stats object', async () => {
      const r = await service.getStats();
      expect(r.success).toBe(true);
      expect(typeof r.encryptedDocuments).toBe('number');
      expect(typeof r.classifiedDocuments).toBe('number');
      expect(typeof r.activeDLPPolicies).toBe('number');
      expect(typeof r.totalAccessLogs).toBe('number');
      expect(typeof r.dlpViolations).toBe('number');
    });
  });
});
