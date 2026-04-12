/**
 * Unit Tests — DocumentQRService
 * P#66 - Batch 26
 *
 * Pure in-memory singleton (Map + EventEmitter + crypto).
 * Covers: generateQR, scanQR, disableQR, getDocumentQRCodes,
 *         batchGenerateQR, getScanAnalytics, getStatistics,
 *         _generateQRSVG, _isFinderPatternFilled, _processScan
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('DocumentQRService', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/documentQRService');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty qrCodes and scanHistory', () => {
      expect(service.qrCodes.size).toBe(0);
      expect(service.scanHistory).toHaveLength(0);
    });

    it('has a default baseUrl', () => {
      expect(service.baseUrl).toBeDefined();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateQR                                                          */
  /* ------------------------------------------------------------------ */
  describe('generateQR', () => {
    it('generates a QR code for a document', async () => {
      const res = await service.generateQR('doc1');
      expect(res.success).toBe(true);
      expect(res.data.documentId).toBe('doc1');
      expect(res.data.id).toContain('qr_');
      expect(res.data.verificationCode).toBeDefined();
      expect(res.data.url).toContain('/verify/');
      expect(res.data.svgData).toContain('<svg');
      expect(res.data.status).toBe('active');
    });

    it('generates verification type URL by default', async () => {
      const res = await service.generateQR('doc2');
      expect(res.data.url).toContain('/verify/');
    });

    it('generates access type URL', async () => {
      const res = await service.generateQR('doc3', { type: 'access' });
      expect(res.data.url).toContain('/doc/doc3');
    });

    it('generates download type URL', async () => {
      const res = await service.generateQR('doc4', { type: 'download' });
      expect(res.data.url).toContain('/download/doc4');
    });

    it('generates info type URL', async () => {
      const res = await service.generateQR('doc5', { type: 'info' });
      expect(res.data.url).toContain('/info/doc5');
    });

    it('accepts custom size and colors', async () => {
      const res = await service.generateQR('doc6', {
        size: 512,
        color: '#FF0000',
        backgroundColor: '#000000',
      });
      expect(res.data.size).toBe(512);
      expect(res.data.color).toBe('#FF0000');
    });

    it('sets expiry when expiresInDays > 0', async () => {
      const res = await service.generateQR('doc7', { expiresInDays: 30 });
      expect(res.data.expiresAt).toBeDefined();
      const diff = new Date(res.data.expiresAt) - new Date();
      expect(diff / 86400000).toBeCloseTo(30, 0);
    });

    it('sets maxScans limit', async () => {
      const res = await service.generateQR('doc8', { maxScans: 100 });
      expect(res.data.maxScans).toBe(100);
    });

    it('hashes password when provided', async () => {
      const res = await service.generateQR('doc9', { password: 'secret123' });
      expect(res.data.password).toBeDefined();
      expect(res.data.password).not.toBe('secret123'); // should be hashed
      expect(res.data.password.length).toBe(64); // SHA-256 hex
    });

    it('stores QR in the map', async () => {
      const res = await service.generateQR('docM');
      expect(service.qrCodes.has(res.data.id)).toBe(true);
    });

    it('emits "qrGenerated" event', async () => {
      const spy = jest.fn();
      service.on('qrGenerated', spy);
      await service.generateQR('docE');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('includes dataUrl field', async () => {
      const res = await service.generateQR('docDU');
      expect(res.data.dataUrl).toContain('data:image/svg+xml,');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _generateQRSVG / _isFinderPatternFilled                            */
  /* ------------------------------------------------------------------ */
  describe('_generateQRSVG', () => {
    it('returns SVG string with correct dimensions', () => {
      const svg = service._generateQRSVG('https://example.com', 256, '#000', '#FFF');
      expect(svg).toContain('<svg');
      expect(svg).toContain('width="256"');
      expect(svg).toContain('height="256"');
    });

    it('contains fill rects', () => {
      const svg = service._generateQRSVG('test-data', 128, '#000', '#FFF');
      expect(svg).toContain('<rect');
    });
  });

  describe('_isFinderPatternFilled', () => {
    it('top-left corner outer ring is filled', () => {
      expect(service._isFinderPatternFilled(0, 0, 21)).toBe(true);
      expect(service._isFinderPatternFilled(0, 6, 21)).toBe(true);
      expect(service._isFinderPatternFilled(6, 0, 21)).toBe(true);
    });

    it('top-left inner square is filled', () => {
      expect(service._isFinderPatternFilled(2, 2, 21)).toBe(true);
      expect(service._isFinderPatternFilled(3, 3, 21)).toBe(true);
    });

    it('top-left gap is not filled', () => {
      expect(service._isFinderPatternFilled(1, 1, 21)).toBe(false);
      expect(service._isFinderPatternFilled(1, 5, 21)).toBe(false);
    });

    it('top-right finder pattern works', () => {
      expect(service._isFinderPatternFilled(0, 14, 21)).toBe(true); // outer
      expect(service._isFinderPatternFilled(0, 20, 21)).toBe(true); // outer
    });

    it('bottom-left finder pattern works', () => {
      expect(service._isFinderPatternFilled(14, 0, 21)).toBe(true); // outer
      expect(service._isFinderPatternFilled(20, 0, 21)).toBe(true); // outer
    });

    it('returns false for non-finder positions', () => {
      expect(service._isFinderPatternFilled(10, 10, 21)).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  scanQR                                                              */
  /* ------------------------------------------------------------------ */
  describe('scanQR', () => {
    it('scans a valid QR code by id', async () => {
      const { data } = await service.generateQR('doc1');
      const res = await service.scanQR(data.id, { userId: 'u1', userName: 'Ali' });
      expect(res.success).toBe(true);
      expect(res.data.verified).toBe(true);
      expect(res.data.documentId).toBe('doc1');
    });

    it('scans by verification code fallback', async () => {
      const { data } = await service.generateQR('doc2');
      const res = await service.scanQR(data.verificationCode);
      expect(res.success).toBe(true);
    });

    it('increments scanCount', async () => {
      const { data } = await service.generateQR('doc3');
      await service.scanQR(data.id);
      await service.scanQR(data.id);
      expect(service.qrCodes.get(data.id).scanCount).toBe(2);
    });

    it('records scan in history', async () => {
      const { data } = await service.generateQR('doc4');
      await service.scanQR(data.id, { userId: 'u1', userName: 'Ali' });
      expect(service.scanHistory.length).toBe(1);
      expect(service.scanHistory[0].scannedBy).toBe('u1');
    });

    it('rejects expired QR', async () => {
      const { data } = await service.generateQR('doc5', { expiresInDays: 1 });
      // Force expiry
      service.qrCodes.get(data.id).expiresAt = new Date(Date.now() - 86400000);
      const res = await service.scanQR(data.id);
      expect(res.success).toBe(false);
      expect(res.expired).toBe(true);
    });

    it('rejects scan when limit reached', async () => {
      const { data } = await service.generateQR('doc6', { maxScans: 1 });
      await service.scanQR(data.id);
      const res = await service.scanQR(data.id);
      expect(res.success).toBe(false);
    });

    it('rejects disabled QR', async () => {
      const { data } = await service.generateQR('doc7');
      await service.disableQR(data.id);
      const res = await service.scanQR(data.id);
      expect(res.success).toBe(false);
    });

    it('rejects wrong password', async () => {
      const { data } = await service.generateQR('doc8', { password: 'correct' });
      const res = await service.scanQR(data.id, { password: 'wrong' });
      expect(res.success).toBe(false);
    });

    it('accepts correct password', async () => {
      const { data } = await service.generateQR('doc9', { password: 'secret' });
      const res = await service.scanQR(data.id, { password: 'secret' });
      expect(res.success).toBe(true);
    });

    it('returns error for unknown QR id', async () => {
      const res = await service.scanQR('nonexistent');
      expect(res.success).toBe(false);
    });

    it('emits "qrScanned" event', async () => {
      const spy = jest.fn();
      service.on('qrScanned', spy);
      const { data } = await service.generateQR('docEV');
      await service.scanQR(data.id);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  disableQR                                                           */
  /* ------------------------------------------------------------------ */
  describe('disableQR', () => {
    it('disables an existing QR code', async () => {
      const { data } = await service.generateQR('docD');
      const res = await service.disableQR(data.id);
      expect(res.success).toBe(true);
      expect(service.qrCodes.get(data.id).status).toBe('disabled');
    });

    it('returns error for non-existent QR', async () => {
      const res = await service.disableQR('ghost');
      expect(res.success).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getDocumentQRCodes                                                  */
  /* ------------------------------------------------------------------ */
  describe('getDocumentQRCodes', () => {
    it('returns QR codes for a specific document', async () => {
      await service.generateQR('docA');
      await service.generateQR('docA');
      await service.generateQR('docB');
      const res = await service.getDocumentQRCodes('docA');
      expect(res.data.length).toBe(2);
      expect(res.total).toBe(2);
    });

    it('returns empty for document with no QR codes', async () => {
      const res = await service.getDocumentQRCodes('none');
      expect(res.data).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  batchGenerateQR                                                     */
  /* ------------------------------------------------------------------ */
  describe('batchGenerateQR', () => {
    it('generates QR codes for multiple documents', async () => {
      const res = await service.batchGenerateQR(['d1', 'd2', 'd3']);
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(3);
      expect(res.total).toBe(3);
      expect(service.qrCodes.size).toBe(3);
    });

    it('passes options to each generation', async () => {
      const res = await service.batchGenerateQR(['b1', 'b2'], { type: 'info', size: 512 });
      expect(res.data[0].type).toBe('info');
      expect(res.data[0].size).toBe(512);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getScanAnalytics                                                    */
  /* ------------------------------------------------------------------ */
  describe('getScanAnalytics', () => {
    it('returns analytics for scans', async () => {
      const { data: qr } = await service.generateQR('docAn');
      await service.scanQR(qr.id, { userId: 'u1', userName: 'Ali' });
      await service.scanQR(qr.id, { userId: 'u2', userName: 'Sara' });
      const res = await service.getScanAnalytics('docAn');
      expect(res.success).toBe(true);
      expect(res.data.totalScans).toBe(2);
      expect(res.data.uniqueUsers).toBe(2);
    });

    it('filters by documentId', async () => {
      const { data: q1 } = await service.generateQR('docX');
      const { data: q2 } = await service.generateQR('docY');
      await service.scanQR(q1.id);
      await service.scanQR(q2.id);
      const res = await service.getScanAnalytics('docX');
      expect(res.data.totalScans).toBe(1);
    });

    it('respects days filter', async () => {
      const { data: qr } = await service.generateQR('docOld');
      await service.scanQR(qr.id);
      // Manually set old scan date
      service.scanHistory[0].scannedAt = new Date(Date.now() - 60 * 86400000);
      const res = await service.getScanAnalytics('docOld', { days: 30 });
      expect(res.data.totalScans).toBe(0);
    });

    it('groups by day and user', async () => {
      const { data: qr } = await service.generateQR('docG');
      await service.scanQR(qr.id, { userName: 'Ali' });
      await service.scanQR(qr.id, { userName: 'Ali' });
      const res = await service.getScanAnalytics('docG');
      expect(Object.keys(res.data.byDay).length).toBeGreaterThan(0);
      expect(res.data.byUser['Ali']).toBe(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getStatistics                                                       */
  /* ------------------------------------------------------------------ */
  describe('getStatistics', () => {
    it('returns zeros when empty', async () => {
      const res = await service.getStatistics();
      expect(res.data.totalQRCodes).toBe(0);
      expect(res.data.totalScans).toBe(0);
      expect(res.data.averageScansPerQR).toBe(0);
    });

    it('counts by type and status', async () => {
      await service.generateQR('doc1', { type: 'verification' });
      await service.generateQR('doc2', { type: 'access' });
      await service.generateQR('doc3', { type: 'verification' });
      const res = await service.getStatistics();
      expect(res.data.totalQRCodes).toBe(3);
      expect(res.data.byType.verification).toBe(2);
      expect(res.data.byType.access).toBe(1);
      expect(res.data.byStatus.active).toBe(3);
    });

    it('calculates average scans per QR', async () => {
      const { data: q1 } = await service.generateQR('docS1');
      const { data: q2 } = await service.generateQR('docS2');
      await service.scanQR(q1.id);
      await service.scanQR(q1.id);
      await service.scanQR(q2.id);
      const res = await service.getStatistics();
      expect(res.data.totalScans).toBe(3);
      expect(res.data.averageScansPerQR).toBe(2); // Math.round(3/2) = 2
    });
  });
});
