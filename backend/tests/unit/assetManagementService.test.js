/**
 * Unit tests — assetManagementService.js
 * Singleton + class export. Asset model + logger + sanitize
 */
'use strict';

/* ── mock declarations ──────────────────────────────────────────── */
const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockCountDocuments = jest.fn();
const mockSave = jest.fn();

jest.mock('../../models/Asset', () => {
  const ctor = jest.fn().mockImplementation(data => ({
    ...data,
    save: mockSave,
  }));
  ctor.find = (...a) => mockFind(...a);
  ctor.findById = (...a) => mockFindById(...a);
  ctor.findByIdAndUpdate = (...a) => mockFindByIdAndUpdate(...a);
  ctor.findByIdAndDelete = (...a) => mockFindByIdAndDelete(...a);
  ctor.countDocuments = (...a) => mockCountDocuments(...a);
  return ctor;
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

const { assetManagementService: service } = require('../../services/assetManagementService');

beforeEach(() => jest.clearAllMocks());

/* ================================================================ */
describe('AssetManagementService', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('getAllAssets', () => {
    it('returns all assets with no filters', async () => {
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([{ _id: 'A1' }]),
        }),
      });
      const res = await service.getAllAssets();
      expect(res).toHaveLength(1);
      expect(mockFind).toHaveBeenCalledWith({});
    });

    it('applies status filter', async () => {
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });
      await service.getAllAssets({ status: 'active' });
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    });

    it('applies category filter', async () => {
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });
      await service.getAllAssets({ category: 'furniture' });
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ category: 'furniture' }));
    });

    it('applies location filter', async () => {
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });
      await service.getAllAssets({ location: 'B1' });
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ location: 'B1' }));
    });

    it('applies search with $or regex', async () => {
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });
      await service.getAllAssets({ search: 'desk' });
      expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.any(Array) }));
    });

    it('throws on error', async () => {
      mockFind.mockImplementation(() => {
        throw new Error('fail');
      });
      await expect(service.getAllAssets()).rejects.toThrow('fail');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('createAsset', () => {
    it('creates and saves asset', async () => {
      mockSave.mockResolvedValue({ _id: 'A-NEW', name: 'Desk' });
      const res = await service.createAsset({
        name: 'Desk',
        category: 'furniture',
        createdBy: 'U1',
      });
      expect(res._id).toBe('A-NEW');
      expect(mockSave).toHaveBeenCalled();
    });

    it('uses default values', async () => {
      mockSave.mockResolvedValue({ _id: 'A2' });
      await service.createAsset({ name: 'X', category: 'c' });
      // No error means defaults applied
    });

    it('throws on save error', async () => {
      mockSave.mockRejectedValue(new Error('DB fail'));
      await expect(service.createAsset({ name: 'X', category: 'c' })).rejects.toThrow('DB fail');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getAssetById', () => {
    it('returns asset with populate', async () => {
      mockFindById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: 'A1', name: 'Desk' }),
      });
      const res = await service.getAssetById('A1');
      expect(res.name).toBe('Desk');
    });

    it('returns null when not found', async () => {
      mockFindById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      const res = await service.getAssetById('bad');
      expect(res).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('updateAsset', () => {
    it('updates and returns asset', async () => {
      mockFindByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: 'A1', name: 'Updated' }),
      });
      const res = await service.updateAsset('A1', { name: 'Updated' });
      expect(res.name).toBe('Updated');
    });

    it('returns null when not found', async () => {
      mockFindByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      const res = await service.updateAsset('bad', {});
      expect(res).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('deleteAsset', () => {
    it('deletes and returns true', async () => {
      mockFindByIdAndDelete.mockResolvedValue({ _id: 'A1' });
      expect(await service.deleteAsset('A1')).toBe(true);
    });

    it('returns false when not found', async () => {
      mockFindByIdAndDelete.mockResolvedValue(null);
      expect(await service.deleteAsset('bad')).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getAssetsByCategory', () => {
    it('finds by category', async () => {
      mockFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([{ _id: 'A1', category: 'tech' }]),
        }),
      });
      const res = await service.getAssetsByCategory('tech');
      expect(res).toHaveLength(1);
      expect(mockFind).toHaveBeenCalledWith({ category: 'tech' });
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getDepreciationReport', () => {
    it('generates report with summary', async () => {
      const purchaseDate = new Date();
      purchaseDate.setFullYear(purchaseDate.getFullYear() - 1);
      mockFind.mockResolvedValue([
        {
          _id: 'A1',
          name: 'Laptop',
          category: 'tech',
          value: 10000,
          depreciationRate: 0.2,
          purchaseDate,
        },
      ]);
      const rpt = await service.getDepreciationReport();
      expect(rpt.totalAssets).toBe(1);
      expect(rpt.assets).toHaveLength(1);
      expect(rpt.assets[0].monthsOwned).toBeGreaterThan(0);
      expect(rpt.summary.totalOriginalValue).toBe(10000);
      expect(rpt.summary.totalDepreciatedValue).toBeLessThan(10000);
    });

    it('handles empty assets', async () => {
      mockFind.mockResolvedValue([]);
      const rpt = await service.getDepreciationReport();
      expect(rpt.totalAssets).toBe(0);
      expect(rpt.summary.depreciationPercentage).toBe(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getHealthStatus', () => {
    it('returns healthy status', async () => {
      mockCountDocuments.mockResolvedValue(42);
      const res = await service.getHealthStatus();
      expect(res.status).toBe('healthy');
      expect(res.assetsCount).toBe(42);
    });

    it('returns error status on failure', async () => {
      mockCountDocuments.mockRejectedValue(new Error('fail'));
      const res = await service.getHealthStatus();
      expect(res.status).toBe('error');
    });
  });
});
