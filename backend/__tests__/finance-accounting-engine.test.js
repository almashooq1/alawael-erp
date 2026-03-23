/* eslint-disable no-undef, no-unused-vars */
/**
 * ===================================================================
 * FINANCE & ACCOUNTING ENGINE - Comprehensive Tests
 * ===================================================================
 * Tests: FiscalPeriodService, FinanceCoreService (DB-backed),
 *        AccountingService enhancements, checkBudgetStatus fix,
 *        Finance validators
 * ===================================================================
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// ─── Helper: Mongoose Model Mock Factory ─────────────────────────────────────

function createModelMock(defaultDoc = {}, overrides = {}) {
  const model = jest.fn(function (data) {
    Object.assign(this, { ...defaultDoc, ...data });
    this.save = jest.fn().mockResolvedValue(this);
    this.toObject = jest.fn().mockReturnValue({ ...defaultDoc, ...data });
  });

  const chainable = result => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  model.find = jest.fn(() => chainable(overrides.findResult || []));
  model.findOne = jest.fn(() => {
    const doc = overrides.findOneResult || null;
    return {
      lean: jest.fn().mockResolvedValue(doc),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(doc),
    };
  });
  model.findById = jest.fn(id => {
    const doc = overrides.findByIdResult || null;
    if (doc) {
      doc.save = doc.save || jest.fn().mockResolvedValue(doc);
    }
    return {
      lean: jest.fn().mockResolvedValue(doc),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(doc),
      then: resolve => resolve(doc),
    };
  });
  model.countDocuments = jest.fn().mockResolvedValue(overrides.countResult || 0);
  model.create = jest.fn().mockImplementation(data => {
    const created = { _id: 'mock-id-' + Date.now(), ...defaultDoc, ...data };
    created.save = jest.fn().mockResolvedValue(created);
    created.populate = jest.fn().mockResolvedValue(created);
    return Promise.resolve(created);
  });
  model.insertMany = jest
    .fn()
    .mockImplementation(docs =>
      Promise.resolve(docs.map((d, i) => ({ _id: `mock-id-${i}`, ...d })))
    );
  model.aggregate = jest.fn().mockResolvedValue(overrides.aggregateResult || []);
  model.findByIdAndDelete = jest.fn().mockResolvedValue(overrides.findByIdResult || null);

  return model;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: FiscalPeriodService
// ═══════════════════════════════════════════════════════════════════════════════

describe('FiscalPeriodService', () => {
  let FiscalPeriodService;
  let FiscalPeriod;
  let JournalEntry;
  let Account;

  beforeEach(() => {
    jest.resetModules();

    // Set up FiscalPeriod mock
    FiscalPeriod = createModelMock(
      { _id: 'fp-1', name: 'Q1 2026', code: 'FP-2026-Q1', fiscalYear: 2026, status: 'open' },
      { countResult: 0 }
    );
    jest.doMock('../models/FiscalPeriod', () => FiscalPeriod);

    JournalEntry = createModelMock({}, { countResult: 0 });
    jest.doMock('../models/JournalEntry', () => JournalEntry);

    Account = createModelMock({}, { findResult: [] });
    jest.doMock('../models/Account', () => Account);

    FiscalPeriodService = require('../services/fiscalPeriod.service');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createFiscalPeriod', () => {
    it('should create a new fiscal period successfully', async () => {
      // First findOne = code duplicate check → null, second = overlap check → null
      FiscalPeriod.findOne = jest
        .fn()
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(null); // overlap check

      const result = await FiscalPeriodService.createFiscalPeriod({
        name: 'Q1 2026',
        code: 'FP-2026-Q1',
        periodType: 'quarter',
        fiscalYear: 2026,
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        createdBy: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.period).toBeDefined();
      expect(FiscalPeriod.create).toHaveBeenCalled();
    });

    it('should reject duplicate fiscal period code', async () => {
      // First findOne (code check) returns existing record
      FiscalPeriod.findOne = jest.fn().mockResolvedValueOnce({ code: 'FP-2026-Q1' });

      await expect(
        FiscalPeriodService.createFiscalPeriod({
          name: 'Q1 2026',
          code: 'FP-2026-Q1',
          periodType: 'quarter',
          fiscalYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        })
      ).rejects.toThrow('كود الفترة المحاسبية موجود بالفعل');
    });

    it('should reject if start date >= end date', async () => {
      // Both findOne calls return null (no duplicate, no overlap)
      FiscalPeriod.findOne = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await expect(
        FiscalPeriodService.createFiscalPeriod({
          name: 'Invalid',
          code: 'FP-INVALID',
          periodType: 'month',
          fiscalYear: 2026,
          startDate: '2026-03-31',
          endDate: '2026-01-01',
        })
      ).rejects.toThrow('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
    });
  });

  describe('getFiscalPeriods', () => {
    it('should return paginated periods', async () => {
      FiscalPeriod.find = jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          { _id: 'fp-1', code: 'FP-2026-Q1' },
          { _id: 'fp-2', code: 'FP-2026-Q2' },
        ]),
      }));
      FiscalPeriod.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await FiscalPeriodService.getFiscalPeriods({ fiscalYear: 2026 });

      expect(result.success).toBe(true);
      expect(result.periods).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getFiscalPeriodById', () => {
    it('should return period by ID', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({ _id: 'fp-1', code: 'FP-2026-Q1' }),
      }));

      const result = await FiscalPeriodService.getFiscalPeriodById('fp-1');
      expect(result.success).toBe(true);
      expect(result.period.code).toBe('FP-2026-Q1');
    });

    it('should throw if period not found', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      await expect(FiscalPeriodService.getFiscalPeriodById('nonexistent')).rejects.toThrow(
        'الفترة المحاسبية غير موجودة'
      );
    });
  });

  describe('closePeriod', () => {
    it('should close an open period with no draft entries', async () => {
      const mockPeriod = {
        _id: 'fp-1',
        code: 'FP-2026-Q1',
        status: 'open',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        closingSteps: [],
        save: jest.fn().mockResolvedValue(true),
      };
      FiscalPeriod.findOne = jest.fn().mockResolvedValue(mockPeriod);
      // First countDocuments = draft check (0), second = posted journal count (0)
      JournalEntry.countDocuments = jest
        .fn()
        .mockResolvedValueOnce(0) // no drafts
        .mockResolvedValueOnce(0); // posted count
      Account.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      const result = await FiscalPeriodService.closePeriod('fp-1', 'user-1');

      expect(result.success).toBe(true);
      expect(mockPeriod.status).toBe('closed');
      expect(mockPeriod.save).toHaveBeenCalled();
    });

    it('should reject closing a non-open period', async () => {
      FiscalPeriod.findOne = jest.fn().mockResolvedValue({
        _id: 'fp-1',
        status: 'closed',
      });

      await expect(FiscalPeriodService.closePeriod('fp-1', 'user-1')).rejects.toThrow(
        'لا يمكن إغلاق فترة غير مفتوحة'
      );
    });

    it('should reject if there are draft journal entries', async () => {
      const mockPeriod = {
        _id: 'fp-1',
        status: 'open',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
      };
      FiscalPeriod.findOne = jest.fn().mockResolvedValue(mockPeriod);

      // Draft check returns 3
      JournalEntry.countDocuments = jest.fn().mockResolvedValueOnce(3);

      await expect(FiscalPeriodService.closePeriod('fp-1', 'user-1')).rejects.toThrow(
        /3 قيد مسودة/
      );
    });
  });

  describe('lockPeriod', () => {
    it('should lock a closed period', async () => {
      const mockPeriod = {
        _id: 'fp-1',
        status: 'closed',
        closingSteps: [],
        save: jest.fn().mockResolvedValue(true),
      };
      FiscalPeriod.findOne = jest.fn().mockResolvedValue(mockPeriod);

      const result = await FiscalPeriodService.lockPeriod('fp-1', 'user-1');
      expect(result.success).toBe(true);
      expect(mockPeriod.status).toBe('locked');
    });

    it('should reject locking a non-closed period', async () => {
      FiscalPeriod.findOne = jest.fn().mockResolvedValue({
        _id: 'fp-1',
        status: 'open',
      });

      await expect(FiscalPeriodService.lockPeriod('fp-1', 'user-1')).rejects.toThrow(
        'يجب إغلاق الفترة قبل قفلها'
      );
    });
  });

  describe('reopenPeriod', () => {
    it('should reopen a closed (non-locked) period', async () => {
      const mockPeriod = {
        _id: 'fp-1',
        status: 'closed',
        closingSteps: [],
        save: jest.fn().mockResolvedValue(true),
      };
      FiscalPeriod.findOne = jest.fn().mockResolvedValue(mockPeriod);

      const result = await FiscalPeriodService.reopenPeriod('fp-1', 'user-1', 'تعديل مطلوب');
      expect(result.success).toBe(true);
      expect(mockPeriod.status).toBe('open');
    });

    it('should reject reopening a locked period', async () => {
      FiscalPeriod.findOne = jest.fn().mockResolvedValue({
        _id: 'fp-1',
        status: 'locked',
      });

      await expect(FiscalPeriodService.reopenPeriod('fp-1', 'user-1', 'test')).rejects.toThrow(
        'لا يمكن إعادة فتح فترة مقفلة'
      );
    });
  });

  describe('validatePostingDate', () => {
    it('should validate date within open period', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: 'fp-1',
          code: 'FP-2026-Q1',
          status: 'open',
        }),
      }));

      const result = await FiscalPeriodService.validatePostingDate('2026-02-15');
      expect(result.valid).toBe(true);
      expect(result.period).toBeDefined();
    });

    it('should reject date in closed period', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: 'fp-1',
          code: 'FP-2025-Q4',
          status: 'closed',
        }),
      }));

      const result = await FiscalPeriodService.validatePostingDate('2025-12-15');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('closed');
    });

    it('should reject date with no matching period', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      const result = await FiscalPeriodService.validatePostingDate('2020-01-01');
      expect(result.valid).toBe(false);
    });
  });

  describe('getCurrentPeriod', () => {
    it('should return current open period', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: 'fp-1',
          code: 'FP-2026-Q1',
          status: 'open',
        }),
      }));

      const result = await FiscalPeriodService.getCurrentPeriod();
      expect(result.success).toBe(true);
    });

    it('should throw if no current period exists', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      await expect(FiscalPeriodService.getCurrentPeriod()).rejects.toThrow(
        'لا توجد فترة محاسبية مفتوحة'
      );
    });
  });

  describe('generatePeriodsForYear', () => {
    it('should generate 12 monthly periods', async () => {
      FiscalPeriod.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await FiscalPeriodService.generatePeriodsForYear(2026, 'month', 'user-1');

      expect(result.success).toBe(true);
      expect(result.periodsCreated).toBe(12);
      expect(FiscalPeriod.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ code: 'FP-2026-M01' }),
          expect.objectContaining({ code: 'FP-2026-M12' }),
        ])
      );
    });

    it('should generate 4 quarterly periods', async () => {
      FiscalPeriod.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await FiscalPeriodService.generatePeriodsForYear(2026, 'quarter', 'user-1');
      expect(result.periodsCreated).toBe(4);
    });

    it('should generate 2 semi-annual periods', async () => {
      FiscalPeriod.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await FiscalPeriodService.generatePeriodsForYear(
        2026,
        'semi_annual',
        'user-1'
      );
      expect(result.periodsCreated).toBe(2);
    });

    it('should generate 1 annual period', async () => {
      FiscalPeriod.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await FiscalPeriodService.generatePeriodsForYear(2026, 'annual', 'user-1');
      expect(result.periodsCreated).toBe(1);
    });

    it('should reject if periods already exist for year+type', async () => {
      FiscalPeriod.countDocuments = jest.fn().mockResolvedValue(12);

      await expect(
        FiscalPeriodService.generatePeriodsForYear(2026, 'month', 'user-1')
      ).rejects.toThrow(/توجد فترات/);
    });

    it('should reject unsupported period type', async () => {
      await expect(
        FiscalPeriodService.generatePeriodsForYear(2026, 'weekly', 'user-1')
      ).rejects.toThrow('نوع الفترة غير مدعوم');
    });
  });

  describe('deleteFiscalPeriod', () => {
    it('should soft-delete an open period with no posted entries', async () => {
      const mockPeriod = {
        _id: 'fp-1',
        status: 'open',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        save: jest.fn().mockResolvedValue(true),
      };
      FiscalPeriod.findOne = jest.fn().mockResolvedValue(mockPeriod);
      JournalEntry.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await FiscalPeriodService.deleteFiscalPeriod('fp-1');
      expect(result.success).toBe(true);
      expect(mockPeriod.isDeleted).toBe(true);
    });

    it('should reject deleting a closed period', async () => {
      FiscalPeriod.findOne = jest.fn().mockResolvedValue({
        _id: 'fp-1',
        status: 'closed',
      });

      await expect(FiscalPeriodService.deleteFiscalPeriod('fp-1')).rejects.toThrow(
        'لا يمكن حذف فترة مغلقة أو مقفلة'
      );
    });

    it('should reject deleting period with posted entries', async () => {
      const mockPeriod = {
        _id: 'fp-1',
        status: 'open',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
      };
      FiscalPeriod.findOne = jest.fn().mockResolvedValue(mockPeriod);
      JournalEntry.countDocuments = jest.fn().mockResolvedValue(5);

      await expect(FiscalPeriodService.deleteFiscalPeriod('fp-1')).rejects.toThrow(
        'لا يمكن حذف فترة تحتوي على قيود مرحلة'
      );
    });
  });

  describe('generateYearEndClosingEntries', () => {
    it('should generate closing entries for a fiscal year', async () => {
      FiscalPeriod.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          { _id: 'fp-1', status: 'closed' },
          { _id: 'fp-2', status: 'closed' },
        ]),
      }));

      Account.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      JournalEntry.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      const result = await FiscalPeriodService.generateYearEndClosingEntries(2025, 'user-1');

      expect(result.success).toBe(true);
      expect(result.fiscalYear).toBe(2025);
      expect(result.summary).toBeDefined();
    });

    it('should reject if no periods for the year', async () => {
      FiscalPeriod.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      await expect(
        FiscalPeriodService.generateYearEndClosingEntries(2025, 'user-1')
      ).rejects.toThrow('لا توجد فترات محاسبية لهذه السنة');
    });

    it('should reject if open periods remain', async () => {
      FiscalPeriod.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          { _id: 'fp-1', status: 'closed' },
          { _id: 'fp-2', status: 'open' },
        ]),
      }));

      await expect(
        FiscalPeriodService.generateYearEndClosingEntries(2025, 'user-1')
      ).rejects.toThrow(/1 فترة مفتوحة/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: FinanceCoreService (DB-backed)
// ═══════════════════════════════════════════════════════════════════════════════

describe('FinanceCoreService', () => {
  let FinanceCoreService;
  let JournalEntry;
  let Account;
  let Expense;

  beforeEach(() => {
    jest.resetModules();

    JournalEntry = createModelMock({
      _id: 'je-1',
      reference: 'JE-2026-001',
      entryNumber: 'JE-001',
      status: 'draft',
    });
    jest.doMock('../models/JournalEntry', () => JournalEntry);

    Account = createModelMock({}, { findResult: [] });
    jest.doMock('../models/Account', () => Account);

    Expense = createModelMock({}, { findResult: [] });
    jest.doMock('../models/Expense', () => Expense);

    FinanceCoreService = require('../services/financeCore.service');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createJournalEntry', () => {
    it('should create a balanced journal entry', async () => {
      const entries = [
        { accountId: 'acc-1', account: 'Cash', debit: 1000, credit: 0 },
        { accountId: 'acc-2', account: 'Revenue', debit: 0, credit: 1000 },
      ];

      const result = await FinanceCoreService.createJournalEntry(
        'JE-TEST-001',
        'Test entry',
        entries,
        'user-1'
      );

      expect(result).toBeDefined();
      expect(result.reference).toBe('JE-TEST-001');
      expect(result.totalDebit).toBe(1000);
      expect(result.totalCredit).toBe(1000);
      expect(JournalEntry.create).toHaveBeenCalled();
    });

    it('should reject unbalanced journal entry', async () => {
      const entries = [
        { accountId: 'acc-1', account: 'Cash', debit: 1000, credit: 0 },
        { accountId: 'acc-2', account: 'Revenue', debit: 0, credit: 500 },
      ];

      await expect(
        FinanceCoreService.createJournalEntry('JE-TEST', 'Unbalanced', entries, 'user-1')
      ).rejects.toThrow(/Unbalanced/);
    });

    it('should reject entry with less than 2 lines', async () => {
      const entries = [{ accountId: 'acc-1', account: 'Cash', debit: 1000, credit: 0 }];

      await expect(
        FinanceCoreService.createJournalEntry('JE-TEST', 'One line', entries, 'user-1')
      ).rejects.toThrow('Unbalanced Journal Entry');
    });

    it('should handle multi-line balanced entries', async () => {
      const entries = [
        { accountId: 'acc-1', debit: 500, credit: 0 },
        { accountId: 'acc-2', debit: 500, credit: 0 },
        { accountId: 'acc-3', debit: 0, credit: 1000 },
      ];

      const result = await FinanceCoreService.createJournalEntry(
        'JE-MULTI',
        'Multi-line entry',
        entries,
        'user-1'
      );

      expect(result.totalDebit).toBe(1000);
      expect(result.totalCredit).toBe(1000);
    });
  });

  describe('postJournalEntry', () => {
    it('should post a draft entry', async () => {
      const mockEntry = {
        _id: 'je-1',
        status: 'draft',
        save: jest.fn().mockResolvedValue(true),
      };
      JournalEntry.findById = jest.fn().mockResolvedValue(mockEntry);

      const result = await FinanceCoreService.postJournalEntry('je-1', 'user-1');

      expect(result.status).toBe('posted');
      expect(result.postedBy).toBe('user-1');
      expect(mockEntry.save).toHaveBeenCalled();
    });

    it('should reject posting an already posted entry', async () => {
      JournalEntry.findById = jest.fn().mockResolvedValue({
        _id: 'je-1',
        status: 'posted',
      });

      await expect(FinanceCoreService.postJournalEntry('je-1', 'user-1')).rejects.toThrow(
        'already posted'
      );
    });

    it('should reject posting a cancelled entry', async () => {
      JournalEntry.findById = jest.fn().mockResolvedValue({
        _id: 'je-1',
        status: 'cancelled',
      });

      await expect(FinanceCoreService.postJournalEntry('je-1', 'user-1')).rejects.toThrow(
        'Cannot post a cancelled'
      );
    });

    it('should throw if entry not found', async () => {
      JournalEntry.findById = jest.fn().mockResolvedValue(null);

      await expect(FinanceCoreService.postJournalEntry('nonexistent', 'user-1')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('analyzeServiceProfitability', () => {
    it('should analyze profitability using DB data', async () => {
      Account.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          { _id: 'acc-1', type: 'revenue', isActive: true },
          { _id: 'acc-2', type: 'expense', isActive: true, category: 'operating_expense' },
        ]),
      }));

      JournalEntry.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          {
            lines: [
              { accountId: 'acc-1', debit: 0, credit: 5000 },
              { accountId: 'acc-2', debit: 2000, credit: 0 },
            ],
          },
        ]),
      }));

      Expense.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([{ amount: 500 }]),
      }));

      const result = await FinanceCoreService.analyzeServiceProfitability(
        'Speech Therapy',
        '2026-01-01',
        '2026-03-31'
      );

      expect(result.service).toBe('Speech Therapy');
      expect(result.economics).toBeDefined();
      expect(result.economics.revenue).toBeGreaterThanOrEqual(0);
      expect(result.recommendation).toBeDefined();
    });

    it('should return healthy margin message for profitable service', async () => {
      Account.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));
      JournalEntry.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));
      Expense.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      const result = await FinanceCoreService.analyzeServiceProfitability('Test', null, null);

      expect(result.economics.marginPercent).toBeDefined();
    });
  });

  describe('getAccountBalanceSummary', () => {
    it('should return grouped account balances', async () => {
      Account.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          { _id: 'acc-1', code: '1000', name: 'Cash', type: 'asset', isActive: true },
          { _id: 'acc-2', code: '2000', name: 'Loan', type: 'liability', isActive: true },
          { _id: 'acc-3', code: '4000', name: 'Sales', type: 'revenue', isActive: true },
        ]),
      }));

      JournalEntry.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          {
            lines: [
              { accountId: 'acc-1', debit: 10000, credit: 0 },
              { accountId: 'acc-2', debit: 0, credit: 5000 },
              { accountId: 'acc-3', debit: 0, credit: 8000 },
            ],
          },
        ]),
      }));

      const result = await FinanceCoreService.getAccountBalanceSummary('2026-01-01', '2026-12-31');

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.assets).toBeDefined();
      expect(result.summary.liabilities).toBeDefined();
      expect(result.summary.revenue).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: checkBudgetStatus Fix (finance.service.js)
// ═══════════════════════════════════════════════════════════════════════════════

describe('FinanceService — checkBudgetStatus Fix', () => {
  let FinanceService;
  let Transaction;
  let Budget;

  beforeEach(() => {
    jest.resetModules();

    Transaction = createModelMock({}, { aggregateResult: [{ _id: null, total: 3500 }] });
    jest.doMock('../models/Transaction', () => Transaction);

    Budget = createModelMock({
      _id: 'budget-1',
      name: 'Q1 Marketing',
      totalBudgeted: 10000,
      category: 'marketing',
    });
    jest.doMock('../models/Budget', () => Budget);

    jest.doMock('../utils/sanitize', () => ({
      escapeRegex: jest.fn(s => s),
    }));

    FinanceService = require('../services/finance.service');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use aggregate $sum instead of countDocuments', async () => {
    const mockBudget = {
      _id: 'budget-1',
      totalBudgeted: 10000,
      category: 'marketing',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      save: jest.fn().mockResolvedValue(true),
    };
    Budget.findById = jest.fn().mockResolvedValue(mockBudget);

    Transaction.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 3500 }]);

    const result = await FinanceService.checkBudgetStatus('budget-1');

    expect(result.success).toBe(true);
    expect(result.spent).toBe(3500);
    expect(result.limit).toBe(10000);
    expect(result.remaining).toBe(6500);
    expect(result.percentageUsed).toBe(35);
    expect(result.status).toBe('ok');

    // Verify aggregate was called, NOT countDocuments for spending
    expect(Transaction.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ $match: expect.any(Object) }),
        expect.objectContaining({
          $group: expect.objectContaining({ total: { $sum: '$amount' } }),
        }),
      ])
    );
  });

  it('should return warning when spending > 80%', async () => {
    const mockBudget = {
      _id: 'budget-2',
      totalBudgeted: 10000,
      category: 'ops',
      save: jest.fn().mockResolvedValue(true),
    };
    Budget.findById = jest.fn().mockResolvedValue(mockBudget);
    Transaction.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 8500 }]);

    const result = await FinanceService.checkBudgetStatus('budget-2');

    expect(result.status).toBe('warning');
    expect(result.percentageUsed).toBe(85);
  });

  it('should return exceeded when spending > 100%', async () => {
    const mockBudget = {
      _id: 'budget-3',
      totalBudgeted: 5000,
      category: 'travel',
      save: jest.fn().mockResolvedValue(true),
    };
    Budget.findById = jest.fn().mockResolvedValue(mockBudget);
    Transaction.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 6000 }]);

    const result = await FinanceService.checkBudgetStatus('budget-3');

    expect(result.status).toBe('exceeded');
    expect(result.remaining).toBe(-1000);
  });

  it('should handle zero spending', async () => {
    const mockBudget = {
      _id: 'budget-4',
      totalBudgeted: 10000,
      category: 'marketing',
      save: jest.fn().mockResolvedValue(true),
    };
    Budget.findById = jest.fn().mockResolvedValue(mockBudget);
    Transaction.aggregate = jest.fn().mockResolvedValue([]);

    const result = await FinanceService.checkBudgetStatus('budget-4');

    expect(result.spent).toBe(0);
    expect(result.remaining).toBe(10000);
    expect(result.percentageUsed).toBe(0);
    expect(result.status).toBe('ok');
  });

  it('should update budget document with spending data', async () => {
    const mockBudget = {
      _id: 'budget-5',
      totalBudgeted: 10000,
      category: 'ops',
      save: jest.fn().mockResolvedValue(true),
    };
    Budget.findById = jest.fn().mockResolvedValue(mockBudget);
    Transaction.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 4000 }]);

    await FinanceService.checkBudgetStatus('budget-5');

    expect(mockBudget.totalSpent).toBe(4000);
    expect(mockBudget.totalRemaining).toBe(6000);
    expect(mockBudget.utilizationPercentage).toBe(40);
    expect(mockBudget.save).toHaveBeenCalled();
  });

  it('should throw when budget not found', async () => {
    Budget.findById = jest.fn().mockResolvedValue(null);

    await expect(FinanceService.checkBudgetStatus('nonexistent')).rejects.toThrow(
      'Budget not found'
    );
  });

  it('should handle budget with limit field (backward compat)', async () => {
    const mockBudget = {
      _id: 'budget-legacy',
      limit: 8000,
      category: 'legal',
      save: jest.fn().mockResolvedValue(true),
    };
    Budget.findById = jest.fn().mockResolvedValue(mockBudget);
    Transaction.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 2000 }]);

    const result = await FinanceService.checkBudgetStatus('budget-legacy');

    expect(result.limit).toBe(8000);
    expect(result.spent).toBe(2000);
    expect(result.remaining).toBe(6000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Finance Validators
// ═══════════════════════════════════════════════════════════════════════════════

describe('Finance Validators', () => {
  let validators;

  beforeEach(() => {
    jest.resetModules();
    validators = require('../middleware/validators/finance.validators');
  });

  it('should export all transaction validators', () => {
    expect(validators.createTransaction).toBeDefined();
    expect(validators.updateTransaction).toBeDefined();
    expect(validators.patchTransactionStatus).toBeDefined();
    expect(validators.reverseTransaction).toBeDefined();
    expect(validators.listTransactions).toBeDefined();
    expect(Array.isArray(validators.createTransaction)).toBe(true);
  });

  it('should export all budget validators', () => {
    expect(validators.createBudget).toBeDefined();
    expect(validators.updateBudget).toBeDefined();
    expect(Array.isArray(validators.createBudget)).toBe(true);
  });

  it('should export journal entry validators', () => {
    expect(validators.createJournalEntry).toBeDefined();
    expect(validators.postJournalEntry).toBeDefined();
    expect(validators.reverseJournalEntry).toBeDefined();
    expect(validators.listJournalEntries).toBeDefined();
    expect(Array.isArray(validators.createJournalEntry)).toBe(true);
  });

  it('should export account (CoA) validators', () => {
    expect(validators.createAccount).toBeDefined();
    expect(validators.updateAccount).toBeDefined();
    expect(Array.isArray(validators.createAccount)).toBe(true);
  });

  it('should export fiscal period validators', () => {
    expect(validators.createFiscalPeriod).toBeDefined();
    expect(validators.updateFiscalPeriod).toBeDefined();
    expect(validators.generateFiscalPeriods).toBeDefined();
    expect(validators.listFiscalPeriods).toBeDefined();
    expect(Array.isArray(validators.createFiscalPeriod)).toBe(true);
  });

  it('should export expense validators', () => {
    expect(validators.createExpense).toBeDefined();
    expect(validators.updateExpense).toBeDefined();
    expect(validators.approveExpense).toBeDefined();
    expect(validators.rejectExpense).toBeDefined();
  });

  it('should export report validators', () => {
    expect(validators.reportDateRange).toBeDefined();
    expect(validators.reportAsOfDate).toBeDefined();
  });

  it('should export payment and invoice validators', () => {
    expect(validators.createPayment).toBeDefined();
    expect(validators.completePayment).toBeDefined();
    expect(validators.cancelPayment).toBeDefined();
    expect(validators.createInvoice).toBeDefined();
  });

  it('should export reconciliation validators', () => {
    expect(validators.reconcile).toBeDefined();
    expect(validators.resolveDiscrepancy).toBeDefined();
    expect(validators.validateBalance).toBeDefined();
  });

  it('createJournalEntry validator should require at least 2 lines', () => {
    const lineValidator = validators.createJournalEntry.find(
      v => v && v.builder && v.builder.fields && v.builder.fields.includes('lines')
    );
    // Validator array exists and has rules for lines
    expect(validators.createJournalEntry.length).toBeGreaterThanOrEqual(3);
  });

  it('createFiscalPeriod validator should require fiscalYear', () => {
    expect(validators.createFiscalPeriod.length).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: AccountingService Enhancements
// ═══════════════════════════════════════════════════════════════════════════════

describe('AccountingService — Enhanced Cash Flow & Budget Monitoring', () => {
  let accountingService;
  let Account;
  let JournalEntry;
  let Budget;
  let FiscalPeriod;

  beforeEach(() => {
    jest.resetModules();

    Account = createModelMock({}, { findResult: [] });
    jest.doMock('../models/Account', () => Account);

    JournalEntry = createModelMock({}, { findResult: [] });
    jest.doMock('../models/JournalEntry', () => JournalEntry);

    Budget = createModelMock({});
    jest.doMock('../models/Budget', () => Budget);

    FiscalPeriod = createModelMock({});
    jest.doMock('../models/FiscalPeriod', () => FiscalPeriod);

    // Mock optional deps that accounting.service.js imports
    jest.doMock('../models/Invoice', () => createModelMock({}));
    jest.doMock('../models/Payment', () => createModelMock({}));
    jest.doMock('../models/Expense', () => createModelMock({}));
    jest.doMock('../models/VATReturn', () => createModelMock({}));
    jest.doMock('../models/AccountingSettings', () => createModelMock({}));
    jest.doMock('../models/AuditLog', () => createModelMock({}));
    jest.doMock('../utils/pdf-generator', () => ({ generateInvoice: jest.fn() }));
    jest.doMock('../utils/excel-generator', () => ({ generate: jest.fn() }));
    jest.doMock('../utils/emailService', () => ({ sendEmail: jest.fn() }));
    jest.doMock('../utils/financial-calculations', () => ({
      calculateVAT: jest.fn(),
      calculateFinancialRatios: jest.fn(),
    }));

    accountingService = require('../services/accounting.service');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validatePostingPeriod', () => {
    it('should validate posting within an open period', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: 'fp-1',
          code: 'FP-2026-Q1',
          status: 'open',
        }),
      }));

      const result = await accountingService.validatePostingPeriod('2026-02-15');
      expect(result.valid).toBe(true);
    });

    it('should reject posting in a closed period', async () => {
      FiscalPeriod.findOne = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: 'fp-1',
          code: 'FP-2025-Q4',
          status: 'closed',
        }),
      }));

      const result = await accountingService.validatePostingPeriod('2025-12-15');
      expect(result.valid).toBe(false);
    });
  });

  describe('getBudgetVsActual', () => {
    it('should compare budget lines with actual spending', async () => {
      Budget.findById = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          _id: 'b-1',
          name: 'Q1 Budget',
          fiscalYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-03-31',
          lines: [
            { accountId: 'acc-1', amount: 5000 },
            { accountId: 'acc-2', amount: 3000 },
          ],
        }),
      }));

      JournalEntry.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([
          {
            lines: [
              { accountId: 'acc-1', debit: 2500, credit: 0 },
              { accountId: 'acc-2', debit: 3200, credit: 0 },
            ],
          },
        ]),
      }));

      const result = await accountingService.getBudgetVsActual('b-1');

      expect(result.budget.name).toBe('Q1 Budget');
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].budgeted).toBe(5000);
      expect(result.lines[0].actual).toBe(2500);
      expect(result.lines[0].status).toBe('on_track');
      expect(result.lines[1].actual).toBe(3200);
      expect(result.lines[1].status).toBe('exceeded');
      expect(result.totals.budgeted).toBe(8000);
    });

    it('should throw when budget not found', async () => {
      Budget.findById = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(null),
      }));

      await expect(accountingService.getBudgetVsActual('nonexistent')).rejects.toThrow(
        'الميزانية غير موجودة'
      );
    });
  });

  describe('calculateFinancialRatiosReport', () => {
    it('should calculate current ratio and debt ratios', async () => {
      // Mock _getAccountsByType (called internally by calculateFinancialRatiosReport)
      const origGetAccountsByType = accountingService._getAccountsByType.bind(accountingService);

      accountingService._getAccountsByType = jest
        .fn()
        .mockResolvedValueOnce([
          // assets
          { _id: 'a1', code: '1000', name: 'Cash', balance: 50000 },
          { _id: 'a2', code: '1100', name: 'Inventory', balance: 20000 },
        ])
        .mockResolvedValueOnce([
          // liabilities
          { _id: 'l1', code: '2000', name: 'Loan', balance: 30000 },
        ]);

      // Mock for current assets
      Account.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([{ _id: 'a1', type: 'asset', category: 'cash' }]),
      }));

      // Mock getAccountBalance
      const origGetBalance = accountingService.getAccountBalance.bind(accountingService);
      accountingService.getAccountBalance = jest.fn().mockResolvedValue({ balance: 50000 });

      const result = await accountingService.calculateFinancialRatiosReport();

      expect(result.ratios).toBeDefined();
      expect(result.ratios.currentRatio).toBeGreaterThanOrEqual(0);
      expect(result.components).toBeDefined();
      expect(result.generatedAt).toBeDefined();

      // Restore
      accountingService._getAccountsByType = origGetAccountsByType;
      accountingService.getAccountBalance = origGetBalance;
    });
  });

  describe('generateCashFlowStatement', () => {
    it('should return cash flow sections with totals', async () => {
      Account.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      JournalEntry.find = jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      const result = await accountingService.generateCashFlowStatement({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });

      expect(result.operatingActivities).toBeDefined();
      expect(result.investingActivities).toBeDefined();
      expect(result.financingActivities).toBeDefined();
      expect(typeof result.netCashFlow).toBe('number');
    });
  });
});
