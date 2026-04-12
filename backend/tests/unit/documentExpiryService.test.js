/**
 * Unit Tests — DocumentExpiryService
 * P#66 - Batch 26
 *
 * Pure in-memory singleton (Map + EventEmitter).
 * Covers: trackExpiry, checkExpiry, renewDocument, getExpiringDocuments,
 *         getExpiredDocuments, getAlerts, markAlertRead, getRetentionPolicies,
 *         upsertRetentionPolicy, getStatistics, _updateExpiryStatus
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('DocumentExpiryService', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/documentExpiryService');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Constants / Initial State                                          */
  /* ------------------------------------------------------------------ */
  describe('constants & initial state', () => {
    it('exports RETENTION_POLICIES with known keys', () => {
      expect(service.RETENTION_POLICIES).toBeDefined();
      expect(service.RETENTION_POLICIES.FINANCIAL).toBeDefined();
      expect(service.RETENTION_POLICIES.LEGAL.retentionYears).toBe(15);
      expect(service.RETENTION_POLICIES.HR.retentionYears).toBe(7);
      expect(service.RETENTION_POLICIES.CONTRACTS.retentionYears).toBe(10);
      expect(service.RETENTION_POLICIES.CORRESPONDENCE.retentionYears).toBe(5);
      expect(service.RETENTION_POLICIES.TRAINING.retentionYears).toBe(3);
      expect(service.RETENTION_POLICIES.CERTIFICATES.retentionYears).toBe(0);
      expect(service.RETENTION_POLICIES.GENERAL.retentionYears).toBe(5);
    });

    it('exports ALERT_LEVELS', () => {
      expect(service.ALERT_LEVELS).toEqual({
        INFO: 'info',
        WARNING: 'warning',
        URGENT: 'urgent',
        EXPIRED: 'expired',
      });
    });

    it('starts with empty tracked documents', () => {
      expect(service.trackedDocuments.size).toBe(0);
    });

    it('has default retention policies loaded', async () => {
      const res = await service.getRetentionPolicies();
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(8);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  trackExpiry                                                        */
  /* ------------------------------------------------------------------ */
  describe('trackExpiry', () => {
    it('tracks a document with expiry date', async () => {
      const future = new Date(Date.now() + 90 * 86400000).toISOString();
      const res = await service.trackExpiry('doc1', {
        documentTitle: 'Contract A',
        category: 'contracts',
        expiryDate: future,
        retentionPolicyId: 'contracts',
        ownerId: 'u1',
        ownerName: 'Ahmed',
      });
      expect(res.success).toBe(true);
      expect(res.data.documentId).toBe('doc1');
      expect(res.data.status).toBe('active');
      expect(res.data.retentionEndDate).toBeDefined();
      expect(service.trackedDocuments.size).toBe(1);
    });

    it('sets status "active" when no expiryDate', async () => {
      const res = await service.trackExpiry('doc2', { ownerId: 'u1' });
      expect(res.data.status).toBe('active');
      expect(res.data.expiryDate).toBeNull();
    });

    it('sets "expired" when expiryDate is in the past', async () => {
      const past = new Date(Date.now() - 5 * 86400000).toISOString();
      const res = await service.trackExpiry('doc3', { expiryDate: past, ownerId: 'u1' });
      expect(res.data.status).toBe('expired');
    });

    it('sets "expiring_soon" when within 30 days', async () => {
      const soon = new Date(Date.now() + 10 * 86400000).toISOString();
      const res = await service.trackExpiry('doc4', { expiryDate: soon, ownerId: 'u1' });
      expect(res.data.status).toBe('expiring_soon');
    });

    it('uses default notifyBefore and maxRenewals', async () => {
      const res = await service.trackExpiry('doc5', { ownerId: 'u1' });
      expect(res.data.notifyBefore).toEqual([90, 60, 30, 14, 7, 1]);
      expect(res.data.maxRenewals).toBe(3);
    });

    it('accepts custom notifyBefore and maxRenewals', async () => {
      const res = await service.trackExpiry('doc6', {
        ownerId: 'u1',
        notifyBefore: [7, 3],
        maxRenewals: 1,
      });
      expect(res.data.notifyBefore).toEqual([7, 3]);
      expect(res.data.maxRenewals).toBe(1);
    });

    it('skips retentionEndDate when retentionYears = 0 (certificates)', async () => {
      const res = await service.trackExpiry('doc7', {
        ownerId: 'u1',
        retentionPolicyId: 'certificates',
      });
      expect(res.data.retentionEndDate).toBeUndefined();
    });

    it('emits "expiryTracked" event', async () => {
      const spy = jest.fn();
      service.on('expiryTracked', spy);
      await service.trackExpiry('docE', { ownerId: 'u1' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].documentId).toBe('docE');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  checkExpiry                                                        */
  /* ------------------------------------------------------------------ */
  describe('checkExpiry', () => {
    it('returns empty results when nothing tracked', async () => {
      const res = await service.checkExpiry();
      expect(res.success).toBe(true);
      expect(res.data.expired).toHaveLength(0);
      expect(res.data.expiringSoon).toHaveLength(0);
      expect(res.summary.totalTracked).toBe(0);
    });

    it('detects expired documents', async () => {
      const past = new Date(Date.now() - 2 * 86400000).toISOString();
      await service.trackExpiry('docX', { expiryDate: past, ownerId: 'u1' });
      const res = await service.checkExpiry();
      expect(res.data.expired.length).toBe(1);
      expect(res.data.expired[0].daysOverdue).toBeGreaterThan(0);
    });

    it('detects expiring_soon documents (≤30 days)', async () => {
      const soon = new Date(Date.now() + 15 * 86400000).toISOString();
      await service.trackExpiry('docS', { expiryDate: soon, ownerId: 'u1' });
      const res = await service.checkExpiry();
      expect(res.data.expiringSoon.length).toBe(1);
    });

    it('auto-renews expired document if autoRenew=true', async () => {
      const past = new Date(Date.now() - 1 * 86400000).toISOString();
      await service.trackExpiry('docAR', {
        expiryDate: past,
        ownerId: 'u1',
        autoRenew: true,
      });
      const res = await service.checkExpiry();
      // The document should have been renewed
      const tracking = service.trackedDocuments.get('docAR');
      expect(tracking.renewalCount).toBe(1);
    });

    it('skips documents with no expiryDate', async () => {
      await service.trackExpiry('docNE', { ownerId: 'u1' });
      const res = await service.checkExpiry();
      expect(res.data.expired).toHaveLength(0);
      expect(res.data.expiringSoon).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  renewDocument                                                      */
  /* ------------------------------------------------------------------ */
  describe('renewDocument', () => {
    it('renews a tracked document', async () => {
      const soon = new Date(Date.now() + 5 * 86400000).toISOString();
      await service.trackExpiry('docR', { expiryDate: soon, ownerId: 'u1' });
      const res = await service.renewDocument('docR', {
        renewedBy: 'admin',
        reason: 'Extension',
      });
      expect(res.success).toBe(true);
      expect(res.data.renewalCount).toBe(1);
      expect(res.data.renewalHistory).toHaveLength(1);
    });

    it('rejects renewal for untracked document', async () => {
      const res = await service.renewDocument('ghost');
      expect(res.success).toBe(false);
    });

    it('rejects renewal when maxRenewals exceeded', async () => {
      const soon = new Date(Date.now() + 5 * 86400000).toISOString();
      await service.trackExpiry('docMax', {
        expiryDate: soon,
        ownerId: 'u1',
        maxRenewals: 1,
      });
      await service.renewDocument('docMax');
      const res2 = await service.renewDocument('docMax');
      expect(res2.success).toBe(false);
      expect(res2.message).toContain('الأقصى');
    });

    it('extends expiry by 1 year when no newExpiryDate provided', async () => {
      const base = new Date(Date.now() + 10 * 86400000);
      await service.trackExpiry('docY', { expiryDate: base.toISOString(), ownerId: 'u1' });
      await service.renewDocument('docY');
      const tracking = service.trackedDocuments.get('docY');
      const diff = new Date(tracking.expiryDate) - base;
      const daysExtended = diff / 86400000;
      expect(daysExtended).toBeCloseTo(365, 0);
    });

    it('uses custom newExpiryDate when provided', async () => {
      const oldDate = new Date(Date.now() + 5 * 86400000).toISOString();
      const customDate = new Date(Date.now() + 180 * 86400000).toISOString();
      await service.trackExpiry('docC', { expiryDate: oldDate, ownerId: 'u1' });
      await service.renewDocument('docC', { newExpiryDate: customDate });
      const tracking = service.trackedDocuments.get('docC');
      expect(new Date(tracking.expiryDate).toISOString()).toBe(new Date(customDate).toISOString());
    });

    it('emits "documentRenewed" event', async () => {
      const spy = jest.fn();
      service.on('documentRenewed', spy);
      const soon = new Date(Date.now() + 5 * 86400000).toISOString();
      await service.trackExpiry('docRE', { expiryDate: soon, ownerId: 'u1' });
      await service.renewDocument('docRE');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getExpiringDocuments                                               */
  /* ------------------------------------------------------------------ */
  describe('getExpiringDocuments', () => {
    it('returns documents expiring within default 30 days', async () => {
      const soon = new Date(Date.now() + 10 * 86400000).toISOString();
      const far = new Date(Date.now() + 60 * 86400000).toISOString();
      await service.trackExpiry('d1', { expiryDate: soon, ownerId: 'u1' });
      await service.trackExpiry('d2', { expiryDate: far, ownerId: 'u2' });
      const res = await service.getExpiringDocuments();
      expect(res.data.length).toBe(1);
    });

    it('respects custom days option', async () => {
      const soon = new Date(Date.now() + 10 * 86400000).toISOString();
      const far = new Date(Date.now() + 60 * 86400000).toISOString();
      await service.trackExpiry('d3', { expiryDate: soon, ownerId: 'u1' });
      await service.trackExpiry('d4', { expiryDate: far, ownerId: 'u2' });
      const res = await service.getExpiringDocuments({ days: 90 });
      expect(res.data.length).toBe(2);
    });

    it('excludes already-expired documents', async () => {
      const past = new Date(Date.now() - 5 * 86400000).toISOString();
      await service.trackExpiry('d5', { expiryDate: past, ownerId: 'u1' });
      const res = await service.getExpiringDocuments();
      expect(res.data.length).toBe(0);
    });

    it('sorts by expiry date ascending', async () => {
      const s1 = new Date(Date.now() + 20 * 86400000).toISOString();
      const s2 = new Date(Date.now() + 5 * 86400000).toISOString();
      await service.trackExpiry('d6', { expiryDate: s1, ownerId: 'u1' });
      await service.trackExpiry('d7', { expiryDate: s2, ownerId: 'u2' });
      const res = await service.getExpiringDocuments();
      expect(new Date(res.data[0].expiryDate) < new Date(res.data[1].expiryDate)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getExpiredDocuments                                                 */
  /* ------------------------------------------------------------------ */
  describe('getExpiredDocuments', () => {
    it('returns only expired documents', async () => {
      const past = new Date(Date.now() - 5 * 86400000).toISOString();
      const future = new Date(Date.now() + 30 * 86400000).toISOString();
      await service.trackExpiry('e1', { expiryDate: past, ownerId: 'u1' });
      await service.trackExpiry('e2', { expiryDate: future, ownerId: 'u2' });
      const res = await service.getExpiredDocuments();
      expect(res.data.length).toBe(1);
      expect(res.data[0].documentId).toBe('e1');
    });

    it('returns empty when none expired', async () => {
      const future = new Date(Date.now() + 30 * 86400000).toISOString();
      await service.trackExpiry('e3', { expiryDate: future, ownerId: 'u1' });
      const res = await service.getExpiredDocuments();
      expect(res.data).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getAlerts / markAlertRead                                          */
  /* ------------------------------------------------------------------ */
  describe('getAlerts & markAlertRead', () => {
    it('returns empty alerts initially', async () => {
      const res = await service.getAlerts('u1');
      expect(res.data).toHaveLength(0);
    });

    it('filters by userId', async () => {
      // Manually add alerts for testing
      service.alerts.push(
        { id: 'a1', ownerId: 'u1', level: 'warning', read: false, createdAt: new Date() },
        { id: 'a2', ownerId: 'u2', level: 'info', read: false, createdAt: new Date() }
      );
      const res = await service.getAlerts('u1');
      expect(res.data.length).toBe(1);
    });

    it('filters unreadOnly', async () => {
      service.alerts.push(
        { id: 'a3', ownerId: 'u1', level: 'info', read: true, createdAt: new Date() },
        { id: 'a4', ownerId: 'u1', level: 'urgent', read: false, createdAt: new Date() }
      );
      const res = await service.getAlerts('u1', { unreadOnly: true });
      expect(res.data.every(a => !a.read)).toBe(true);
    });

    it('filters by level', async () => {
      service.alerts.push(
        { id: 'a5', ownerId: 'u1', level: 'urgent', read: false, createdAt: new Date() },
        { id: 'a6', ownerId: 'u1', level: 'info', read: false, createdAt: new Date() }
      );
      const res = await service.getAlerts('u1', { level: 'urgent' });
      expect(res.data.every(a => a.level === 'urgent')).toBe(true);
    });

    it('marks alert as read', async () => {
      service.alerts.push({ id: 'aR', ownerId: 'u1', read: false, createdAt: new Date() });
      await service.markAlertRead('aR');
      expect(service.alerts.find(a => a.id === 'aR').read).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Retention Policies                                                 */
  /* ------------------------------------------------------------------ */
  describe('retention policies', () => {
    it('lists all default retention policies', async () => {
      const res = await service.getRetentionPolicies();
      expect(res.data.length).toBe(8);
    });

    it('upserts a new policy', async () => {
      const res = await service.upsertRetentionPolicy({
        nameAr: 'سجلات طبية',
        nameEn: 'Medical Records',
        retentionYears: 25,
        autoArchive: false,
      });
      expect(res.success).toBe(true);
      expect(res.data.retentionYears).toBe(25);
      expect(res.data.id).toBeDefined();
    });

    it('updates existing policy with same id', async () => {
      await service.upsertRetentionPolicy({
        id: 'financial',
        nameAr: 'مالي v2',
        nameEn: 'Fin v2',
        retentionYears: 12,
      });
      const policies = await service.getRetentionPolicies();
      const fin = policies.data.find(p => p.id === 'financial');
      expect(fin.retentionYears).toBe(12);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getStatistics                                                      */
  /* ------------------------------------------------------------------ */
  describe('getStatistics', () => {
    it('returns zeros when empty', async () => {
      const res = await service.getStatistics();
      expect(res.success).toBe(true);
      expect(res.data.total).toBe(0);
      expect(res.data.active).toBe(0);
    });

    it('counts by status correctly', async () => {
      const past = new Date(Date.now() - 5 * 86400000).toISOString();
      const soon = new Date(Date.now() + 10 * 86400000).toISOString();
      const far = new Date(Date.now() + 60 * 86400000).toISOString();
      await service.trackExpiry('s1', { expiryDate: past, ownerId: 'u1', category: 'hr' });
      await service.trackExpiry('s2', { expiryDate: soon, ownerId: 'u1', category: 'hr' });
      await service.trackExpiry('s3', { expiryDate: far, ownerId: 'u1', category: 'legal' });
      await service.trackExpiry('s4', { ownerId: 'u1', category: 'legal' }); // no expiry
      const res = await service.getStatistics();
      expect(res.data.total).toBe(4);
      expect(res.data.expired).toBe(1);
      expect(res.data.expiringSoon).toBe(1);
      expect(res.data.active).toBe(1);
      expect(res.data.noExpiry).toBe(1);
      expect(res.data.byCategory.hr).toBe(2);
      expect(res.data.byCategory.legal).toBe(2);
    });

    it('includes alert counts', async () => {
      service.alerts.push({ id: 'x1', read: false }, { id: 'x2', read: true });
      const res = await service.getStatistics();
      expect(res.data.totalAlerts).toBe(2);
      expect(res.data.unreadAlerts).toBe(1);
    });
  });
});
