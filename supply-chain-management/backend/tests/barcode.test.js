/**
 * Comprehensive Barcode Service Unit Tests
 * Run: npm test -- barcode.test.js
 */

const BarcodeService = require('../services/BarcodeService');
const BarcodeLog = require('../models/BarcodeLog');

// Mock MongoDB for testing
jest.mock('../models/BarcodeLog');
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('BarcodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    BarcodeLog.create = jest.fn().mockResolvedValue({ _id: 'test-id' });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const data = 'https://example.com/product/123';
      const result = await BarcodeService.generateQRCode(data);

      expect(result).toMatch(/^data:image\/png;base64/);
      expect(BarcodeLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QR',
          data: data,
          status: 'success',
        })
      );
    });

    it('should reject empty data', async () => {
      await expect(BarcodeService.generateQRCode('')).rejects.toThrow('Data is required');
    });

    it('should generate QR with different error correction levels', async () => {
      const data = 'test data';

      for (const level of ['L', 'M', 'Q', 'H']) {
        const result = await BarcodeService.generateQRCode(data, level);
        expect(result).toMatch(/^data:image\/png;base64/);
        expect(BarcodeLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCorrection: level,
          })
        );
      }
    });
  });

  describe('generateBarcode', () => {
    it('should generate CODE128 barcode', async () => {
      const data = 'PROD-2025-001';
      const result = await BarcodeService.generateBarcode(data, 'CODE128');

      expect(result).toMatch(/^data:image\/png;base64/);
      expect(BarcodeLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BARCODE',
          data: data,
          format: 'CODE128',
          status: 'success',
        })
      );
    });

    it('should support multiple barcode formats', async () => {
      // Test different data for different formats
      const testData = {
        CODE128: 'TEST-PRODUCT-2025',
        CODE39: 'TEST-PRODUCT-2025',
        EAN13: '0012345678905', // Valid EAN-13 with correct check digit
      };
      const formats = ['CODE128', 'CODE39', 'EAN13'];

      for (const format of formats) {
        const data = testData[format];
        const result = await BarcodeService.generateBarcode(data, format);
        expect(result).toMatch(/^data:image\/png;base64/);
      }
    });

    it('should reject invalid format', async () => {
      await expect(BarcodeService.generateBarcode('data', 'INVALID')).rejects.toThrow(
        'Invalid format'
      );
    });

    it('should reject empty data', async () => {
      await expect(BarcodeService.generateBarcode('')).rejects.toThrow('Data is required');
    });
  });

  describe('generateBatchCodes', () => {
    it('should generate batch of mixed codes', async () => {
      const items = [
        { data: 'https://example.com/1', type: 'QR' },
        { data: 'PROD-001', type: 'BARCODE', format: 'CODE128' },
        { data: 'https://example.com/2', type: 'QR' },
      ];

      const results = await BarcodeService.generateBatchCodes(items);

      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({
        data: 'https://example.com/1',
        type: 'QR',
        status: 'success',
      });
      expect(results[1]).toMatchObject({
        data: 'PROD-001',
        type: 'BARCODE',
        format: 'CODE128',
        status: 'success',
      });
    });

    it('should handle batch with progress callback', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        data: `item-${i}`,
        type: 'QR',
      }));

      const progressUpdates = [];
      const callback = progress => progressUpdates.push(progress);

      await BarcodeService.generateBatchCodes(items, callback);

      expect(progressUpdates).toHaveLength(5);
      expect(progressUpdates[4]).toMatchObject({
        current: 5,
        total: 5,
        percentage: 100,
      });
    });

    it('should reject empty items array', async () => {
      await expect(BarcodeService.generateBatchCodes([])).rejects.toThrow(
        'Items must be a non-empty array'
      );
    });

    it('should limit batch size to 1000', async () => {
      const items = Array.from({ length: 1001 }, (_, i) => ({
        data: `item-${i}`,
        type: 'QR',
      }));

      await expect(BarcodeService.generateBatchCodes(items)).rejects.toThrow(
        'Maximum 1000 items allowed'
      );
    });

    it('should handle partial failures in batch', async () => {
      const items = [
        { data: 'valid-data', type: 'QR' },
        { data: '', type: 'QR' }, // Invalid
        { data: 'another-valid', type: 'QR' },
      ];

      const results = await BarcodeService.generateBatchCodes(items);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('error');
      expect(results[2].status).toBe('success');
    });
  });

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      const mockStats = [
        { _id: 'QR', count: 50, successCount: 50, errorCount: 0 },
        { _id: 'BARCODE', count: 30, successCount: 29, errorCount: 1 },
      ];

      BarcodeLog.aggregate = jest.fn().mockResolvedValue(mockStats);

      const stats = await BarcodeService.getStatistics();

      expect(stats).toEqual(mockStats);
      expect(stats[0].count).toBe(50);
      expect(stats[1].errorCount).toBe(1);
    });
  });
});

describe('BarcodeService Integration', () => {
  it('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      BarcodeService.generateQRCode(`data-${i}`)
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result).toMatch(/^data:image\/png;base64/);
    });
  });

  it('should handle mixed concurrent operations', async () => {
    const promises = [
      BarcodeService.generateQRCode('qr-data'),
      BarcodeService.generateBarcode('barcode-data', 'CODE128'),
      BarcodeService.generateBatchCodes([
        { data: 'batch-1', type: 'QR' },
        { data: 'batch-2', type: 'BARCODE', format: 'EAN13' },
      ]),
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    expect(typeof results[0]).toBe('string');
    expect(typeof results[1]).toBe('string');
    expect(Array.isArray(results[2])).toBe(true);
  });
});
