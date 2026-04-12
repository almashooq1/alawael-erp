/**
 * Unit Tests — SaudiTaxService
 * P#72 - Batch 33
 *
 * Singleton export (module.exports = new SaudiTaxService()).
 * Depends on VATReturn, TaxFiling, WithholdingTax (Mongoose) + logger.
 * Covers: VAT returns CRUD, Tax filings CRUD, Withholding tax CRUD,
 *         getStatistics, getUpcomingDeadlines
 */

'use strict';

const mockVATFind = jest.fn();
const mockVATCountDocuments = jest.fn();
const mockVATFindById = jest.fn();
const mockVATCreate = jest.fn();
const mockVATFindByIdAndUpdate = jest.fn();

const mockTFFind = jest.fn();
const mockTFCountDocuments = jest.fn();
const mockTFFindById = jest.fn();
const mockTFCreate = jest.fn();
const mockTFFindByIdAndUpdate = jest.fn();
const mockTFAggregate = jest.fn();

const mockWHTFind = jest.fn();
const mockWHTCountDocuments = jest.fn();
const mockWHTFindById = jest.fn();
const mockWHTCreate = jest.fn();
const mockWHTFindByIdAndUpdate = jest.fn();
const mockWHTAggregate = jest.fn();

jest.mock('../../models/VATReturn', () => ({
  find: (...a) => mockVATFind(...a),
  countDocuments: (...a) => mockVATCountDocuments(...a),
  findById: (...a) => mockVATFindById(...a),
  create: (...a) => mockVATCreate(...a),
  findByIdAndUpdate: (...a) => mockVATFindByIdAndUpdate(...a),
}));

jest.mock('../../models/TaxFiling', () => ({
  find: (...a) => mockTFFind(...a),
  countDocuments: (...a) => mockTFCountDocuments(...a),
  findById: (...a) => mockTFFindById(...a),
  create: (...a) => mockTFCreate(...a),
  findByIdAndUpdate: (...a) => mockTFFindByIdAndUpdate(...a),
  aggregate: (...a) => mockTFAggregate(...a),
}));

jest.mock('../../models/WithholdingTax', () => ({
  find: (...a) => mockWHTFind(...a),
  countDocuments: (...a) => mockWHTCountDocuments(...a),
  findById: (...a) => mockWHTFindById(...a),
  create: (...a) => mockWHTCreate(...a),
  findByIdAndUpdate: (...a) => mockWHTFindByIdAndUpdate(...a),
  aggregate: (...a) => mockWHTAggregate(...a),
}));

jest.mock('../../models/TaxCalendar', () => ({}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

let service;
beforeEach(() => {
  jest.clearAllMocks();
  jest.isolateModules(() => {
    service = require('../../services/saudiTax.service');
  });
});

describe('SaudiTaxService', () => {
  /* ================================================================ */
  /*  listVATReturns                                                    */
  /* ================================================================ */
  describe('listVATReturns', () => {
    it('returns paginated data', async () => {
      mockVATFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([{ _id: 'V1' }]),
            }),
          }),
        }),
      });
      mockVATCountDocuments.mockResolvedValue(1);

      const res = await service.listVATReturns();
      expect(res.data).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
      expect(res.pagination.page).toBe(1);
    });

    it('filters by status and year', async () => {
      mockVATFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockVATCountDocuments.mockResolvedValue(0);

      await service.listVATReturns({ status: 'draft', year: '2025' });
      expect(mockVATFind).toHaveBeenCalled();
    });
  });

  /* ================================================================ */
  /*  getVATReturn                                                      */
  /* ================================================================ */
  describe('getVATReturn', () => {
    it('returns document on success', async () => {
      mockVATFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'V1', status: 'draft' }),
      });
      const res = await service.getVATReturn('V1');
      expect(res._id).toBe('V1');
    });

    it('throws 404 when not found', async () => {
      mockVATFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(service.getVATReturn('bad')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  createVATReturn                                                   */
  /* ================================================================ */
  describe('createVATReturn', () => {
    it('creates and returns document', async () => {
      const data = { period: { startDate: '2025-01-01', endDate: '2025-03-31' } };
      mockVATCreate.mockResolvedValue({ ...data, _id: 'V-NEW' });
      const res = await service.createVATReturn(data, 'USER-1');
      expect(res._id).toBe('V-NEW');
      expect(data.createdBy).toBe('USER-1');
    });

    it('sets createdBy on data', async () => {
      const data = { period: { startDate: '2025-01-01', endDate: '2025-03-31' } };
      mockVATCreate.mockResolvedValue({ ...data });
      await service.createVATReturn(data, 'USER-1');
      expect(data.createdBy).toBe('USER-1');
    });
  });

  /* ================================================================ */
  /*  updateVATReturn                                                   */
  /* ================================================================ */
  describe('updateVATReturn', () => {
    it('updates and returns document', async () => {
      mockVATFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'V1', status: 'draft' }),
      });
      const res = await service.updateVATReturn('V1', { status: 'draft' }, 'USER-1');
      expect(res._id).toBe('V1');
    });

    it('throws 404 when not found', async () => {
      mockVATFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(service.updateVATReturn('bad', {}, 'U')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  fileVATReturn                                                     */
  /* ================================================================ */
  describe('fileVATReturn', () => {
    it('files a draft VAT return', async () => {
      const doc = { _id: 'V1', status: 'draft', save: jest.fn().mockResolvedValue(true) };
      mockVATFindById.mockResolvedValue(doc);
      const res = await service.fileVATReturn('V1', 'USER-1');
      expect(res.status).toBe('filed');
      expect(res.filedBy).toBe('USER-1');
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws 404 when not found', async () => {
      mockVATFindById.mockResolvedValue(null);
      await expect(service.fileVATReturn('bad', 'U')).rejects.toThrow();
    });

    it('throws 400 when not draft', async () => {
      mockVATFindById.mockResolvedValue({ _id: 'V1', status: 'filed' });
      await expect(service.fileVATReturn('V1', 'U')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  listTaxFilings                                                    */
  /* ================================================================ */
  describe('listTaxFilings', () => {
    it('returns paginated data', async () => {
      mockTFFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([{ _id: 'TF1' }]),
                }),
              }),
            }),
          }),
        }),
      });
      mockTFCountDocuments.mockResolvedValue(5);

      const res = await service.listTaxFilings({ page: 1, limit: 20 });
      expect(res.data).toHaveLength(1);
      expect(res.pagination.total).toBe(5);
    });
  });

  /* ================================================================ */
  /*  getTaxFiling                                                      */
  /* ================================================================ */
  describe('getTaxFiling', () => {
    it('returns document', async () => {
      mockTFFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ _id: 'TF1' }),
          }),
        }),
      });
      const res = await service.getTaxFiling('TF1');
      expect(res._id).toBe('TF1');
    });

    it('throws 404 when not found', async () => {
      mockTFFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      });
      await expect(service.getTaxFiling('bad')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  createTaxFiling                                                   */
  /* ================================================================ */
  describe('createTaxFiling', () => {
    it('creates with auto filingNumber', async () => {
      mockTFCountDocuments.mockResolvedValue(3);
      const data = { type: 'VAT', periodStart: '2025-01-01' };
      mockTFCreate.mockResolvedValue({ ...data, filingNumber: 'VAT-2025-0004' });
      const res = await service.createTaxFiling(data, 'USER-1');
      expect(data.filingNumber).toBe('VAT-2025-0004');
      expect(data.createdBy).toBe('USER-1');
    });
  });

  /* ================================================================ */
  /*  submitTaxFiling                                                   */
  /* ================================================================ */
  describe('submitTaxFiling', () => {
    it('submits and saves', async () => {
      const doc = {
        _id: 'TF1',
        filingNumber: 'VAT-2025-0001',
        status: 'draft',
        save: jest.fn().mockResolvedValue(true),
      };
      mockTFFindById.mockResolvedValue(doc);
      const res = await service.submitTaxFiling('TF1', 'USER-1');
      expect(res.status).toBe('submitted');
      expect(res.submittedBy).toBe('USER-1');
    });

    it('throws 404 when not found', async () => {
      mockTFFindById.mockResolvedValue(null);
      await expect(service.submitTaxFiling('bad', 'U')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  listWithholdingTax                                                */
  /* ================================================================ */
  describe('listWithholdingTax', () => {
    it('returns paginated data', async () => {
      mockWHTFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([{ _id: 'W1' }]),
            }),
          }),
        }),
      });
      mockWHTCountDocuments.mockResolvedValue(1);

      const res = await service.listWithholdingTax();
      expect(res.data).toHaveLength(1);
    });
  });

  /* ================================================================ */
  /*  getWithholdingTax                                                 */
  /* ================================================================ */
  describe('getWithholdingTax', () => {
    it('returns document', async () => {
      mockWHTFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'W1', isDeleted: false }),
      });
      const res = await service.getWithholdingTax('W1');
      expect(res._id).toBe('W1');
    });

    it('throws 404 when not found', async () => {
      mockWHTFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(service.getWithholdingTax('bad')).rejects.toThrow();
    });

    it('throws 404 when isDeleted', async () => {
      mockWHTFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'W1', isDeleted: true }),
      });
      await expect(service.getWithholdingTax('W1')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  createWithholdingTax                                              */
  /* ================================================================ */
  describe('createWithholdingTax', () => {
    it('auto-calculates withholdingAmount and netAmount', async () => {
      const data = { grossAmount: 10000, withholdingRate: 5 };
      mockWHTCreate.mockResolvedValue({ ...data, certificateNumber: 'WHT-1' });
      await service.createWithholdingTax(data, 'USER-1');
      expect(data.withholdingAmount).toBe(500);
      expect(data.netAmount).toBe(9500);
    });

    it('sets createdBy', async () => {
      const data = { grossAmount: 1000, withholdingRate: 10 };
      mockWHTCreate.mockResolvedValue({ ...data });
      await service.createWithholdingTax(data, 'USER-1');
      expect(data.createdBy).toBe('USER-1');
    });
  });

  /* ================================================================ */
  /*  updateWithholdingTax                                              */
  /* ================================================================ */
  describe('updateWithholdingTax', () => {
    it('recalculates amounts when both grossAmount and rate given', async () => {
      const data = { grossAmount: 20000, withholdingRate: 15 };
      mockWHTFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'W1' }),
      });
      await service.updateWithholdingTax('W1', data, 'U');
      expect(data.withholdingAmount).toBe(3000);
      expect(data.netAmount).toBe(17000);
    });

    it('throws 404 when not found', async () => {
      mockWHTFindByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(service.updateWithholdingTax('bad', {}, 'U')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  deleteWithholdingTax                                              */
  /* ================================================================ */
  describe('deleteWithholdingTax', () => {
    it('soft deletes and returns message', async () => {
      mockWHTFindByIdAndUpdate.mockResolvedValue({ _id: 'W1', isDeleted: true });
      const res = await service.deleteWithholdingTax('W1');
      expect(res.message).toBeDefined();
    });

    it('throws 404 when not found', async () => {
      mockWHTFindByIdAndUpdate.mockResolvedValue(null);
      await expect(service.deleteWithholdingTax('bad')).rejects.toThrow();
    });
  });

  /* ================================================================ */
  /*  getStatistics                                                     */
  /* ================================================================ */
  describe('getStatistics', () => {
    it('returns year stats', async () => {
      mockTFAggregate.mockResolvedValue([{ _id: 'VAT', count: 5, total: 10000 }]);
      mockTFCountDocuments.mockResolvedValue(2);
      mockWHTAggregate.mockResolvedValue([{ total: 5000, count: 3 }]);

      const res = await service.getStatistics(2025);
      expect(res.year).toBe(2025);
      expect(res.filings).toHaveLength(1);
      expect(res.overdue).toBe(2);
      expect(res.withholdingTax.total).toBe(5000);
    });

    it('defaults to current year', async () => {
      mockTFAggregate.mockResolvedValue([]);
      mockTFCountDocuments.mockResolvedValue(0);
      mockWHTAggregate.mockResolvedValue([]);

      const res = await service.getStatistics();
      expect(res.year).toBe(new Date().getFullYear());
    });

    it('handles empty WHT aggregate', async () => {
      mockTFAggregate.mockResolvedValue([]);
      mockTFCountDocuments.mockResolvedValue(0);
      mockWHTAggregate.mockResolvedValue([]);

      const res = await service.getStatistics(2025);
      expect(res.withholdingTax).toEqual({ total: 0, count: 0 });
    });
  });

  /* ================================================================ */
  /*  getUpcomingDeadlines                                              */
  /* ================================================================ */
  describe('getUpcomingDeadlines', () => {
    it('returns upcoming filings', async () => {
      mockTFFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ _id: 'TF1', dueDate: new Date() }]),
          }),
        }),
      });
      const res = await service.getUpcomingDeadlines(30);
      expect(res).toHaveLength(1);
    });

    it('returns empty when no deadlines', async () => {
      mockTFFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      const res = await service.getUpcomingDeadlines();
      expect(res).toEqual([]);
    });
  });
});
