/**
 * Unit tests for services/digitalWallet.service.js
 * DigitalWalletService — Singleton (module.exports = new DigitalWalletService())
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockDigitalWallet = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
};

const mockWalletTransaction = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  aggregate: jest.fn(),
};

const mockDiscountCoupon = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockCouponUsage = {
  create: jest.fn(),
  countDocuments: jest.fn(),
};

const mockLoyaltyPointsTransaction = {
  create: jest.fn(),
  find: jest.fn(),
};

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-1') }));

jest.mock('mongoose', () => ({
  startSession: jest.fn().mockResolvedValue({
    withTransaction: jest.fn(async cb => cb()),
    endSession: jest.fn(),
  }),
}));

jest.mock('../../models/DigitalWallet', () => mockDigitalWallet);
jest.mock('../../models/WalletTransaction', () => mockWalletTransaction);
jest.mock('../../models/DiscountCoupon', () => mockDiscountCoupon);
jest.mock('../../models/CouponUsage', () => mockCouponUsage);
jest.mock('../../models/LoyaltyPointsTransaction', () => mockLoyaltyPointsTransaction);

const service = require('../../services/digitalWallet.service');

/* ─── helpers ───────────────────────────────────────────────────────── */

function fakeWallet(overrides = {}) {
  return {
    _id: 'w1',
    branchId: 'br1',
    walletNumber: 'WLT-12345678',
    balance: 1000,
    frozenBalance: 0,
    loyaltyPoints: 50,
    isBlocked: false,
    deletedAt: null,
    status: 'active',
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('DigitalWalletService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── createWallet ─────────────────────────────────────────────────

  describe('createWallet', () => {
    it('creates wallet when none exists', async () => {
      mockDigitalWallet.findOne.mockResolvedValue(null);
      mockDigitalWallet.create.mockResolvedValue(fakeWallet());

      const result = await service.createWallet('beneficiary', 'o1', 'br1', 'u1');

      expect(mockDigitalWallet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerType: 'beneficiary',
          ownerId: 'o1',
          balance: 0,
        })
      );
      expect(result._id).toBe('w1');
    });

    it('throws when wallet already exists', async () => {
      mockDigitalWallet.findOne.mockResolvedValue(fakeWallet());

      await expect(service.createWallet('beneficiary', 'o1', 'br1', 'u1')).rejects.toThrow(
        'توجد محفظة مسجلة'
      );
    });
  });

  // ── topUp ────────────────────────────────────────────────────────

  describe('topUp', () => {
    it('adds balance and creates transaction', async () => {
      const wallet = fakeWallet({ balance: 100 });
      mockDigitalWallet.findById.mockResolvedValue(wallet);
      mockDigitalWallet.findOneAndUpdate.mockResolvedValue({ ...wallet, balance: 600 });
      const mockTx = { _id: 'tx1', type: 'credit' };
      mockWalletTransaction.create.mockResolvedValue(mockTx);

      const result = await service.topUp('w1', 500, 'card', {}, 'u1');

      expect(result.transaction).toBeDefined();
      expect(result.wallet.balance).toBe(600);
    });

    it('throws when wallet not found', async () => {
      mockDigitalWallet.findById.mockResolvedValue(null);
      await expect(service.topUp('bad', 100, 'cash', {}, 'u')).rejects.toThrow(
        'المحفظة غير موجودة'
      );
    });

    it('throws when wallet is blocked', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ isBlocked: true }));
      await expect(service.topUp('w1', 100, 'cash', {}, 'u')).rejects.toThrow('محجوبة');
    });

    it('throws when amount <= 0', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet());
      await expect(service.topUp('w1', 0, 'cash', {}, 'u')).rejects.toThrow('أكبر من صفر');
    });

    it('throws on atomic update failure', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet());
      mockDigitalWallet.findOneAndUpdate.mockResolvedValue(null);
      await expect(service.topUp('w1', 100, 'cash', {}, 'u')).rejects.toThrow('فشل شحن');
    });
  });

  // ── debit ────────────────────────────────────────────────────────

  describe('debit', () => {
    it('debits wallet and creates transaction with loyalty points', async () => {
      const wallet = fakeWallet({ balance: 500, frozenBalance: 0 });
      mockDigitalWallet.findById.mockResolvedValue(wallet);
      mockDigitalWallet.findOneAndUpdate.mockResolvedValue({
        ...wallet,
        balance: 400,
        branchId: 'br1',
      });
      const mockTx = { _id: 'tx1', type: 'debit' };
      mockWalletTransaction.create.mockResolvedValue(mockTx);
      mockWalletTransaction.findByIdAndUpdate.mockResolvedValue({});
      mockLoyaltyPointsTransaction.create.mockResolvedValue({});

      const result = await service.debit('w1', 100, 'Payment', null, null, 'u1');

      expect(result.transaction.type).toBe('debit');
      expect(mockWalletTransaction.findByIdAndUpdate).toHaveBeenCalledWith('tx1', {
        loyaltyPointsEarned: 10,
      });
    });

    it('throws when insufficient balance', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ balance: 50, frozenBalance: 0 }));
      await expect(service.debit('w1', 100, 'desc', null, null, 'u')).rejects.toThrow(
        'الرصيد غير كافٍ'
      );
    });

    it('throws when exceeds single transaction limit', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ singleTransactionLimit: 50 }));
      await expect(service.debit('w1', 100, 'desc', null, null, 'u')).rejects.toThrow(
        'حد المعاملة'
      );
    });

    it('throws when exceeds daily limit', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ dailyLimit: 100 }));
      mockWalletTransaction.aggregate.mockResolvedValue([{ total: 80 }]);
      await expect(service.debit('w1', 50, 'desc', null, null, 'u')).rejects.toThrow('الحد اليومي');
    });

    it('throws on atomic debit failure', async () => {
      const wallet = fakeWallet();
      mockDigitalWallet.findById.mockResolvedValue(wallet);
      mockDigitalWallet.findOneAndUpdate.mockResolvedValue(null);
      await expect(service.debit('w1', 10, 'd', null, null, 'u')).rejects.toThrow('فشل الخصم');
    });
  });

  // ── transfer ─────────────────────────────────────────────────────

  describe('transfer', () => {
    it('throws when one wallet not found', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet());
      mockDigitalWallet.findOne.mockResolvedValue(null);
      await expect(service.transfer('w1', 'WLT-X', 100, 'u')).rejects.toThrow('محفظة غير موجودة');
    });

    it('throws when transferring to self', async () => {
      const w = fakeWallet();
      mockDigitalWallet.findById.mockResolvedValue(w);
      mockDigitalWallet.findOne.mockResolvedValue(w);
      await expect(service.transfer('w1', 'WLT-X', 100, 'u')).rejects.toThrow('نفس المحفظة');
    });

    it('throws when one wallet blocked', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet());
      mockDigitalWallet.findOne.mockResolvedValue(fakeWallet({ _id: 'w2', isBlocked: true }));
      await expect(service.transfer('w1', 'WLT-X', 100, 'u')).rejects.toThrow('محجوبة');
    });

    it('throws when insufficient balance', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ balance: 50, frozenBalance: 0 }));
      mockDigitalWallet.findOne.mockResolvedValue(fakeWallet({ _id: 'w2' }));
      await expect(service.transfer('w1', 'WLT-X', 100, 'u')).rejects.toThrow('الرصيد غير كافٍ');
    });
  });

  // ── applyCoupon ──────────────────────────────────────────────────

  describe('applyCoupon', () => {
    it('applies percentage coupon', async () => {
      mockDiscountCoupon.findOne.mockResolvedValue({
        _id: 'c1',
        code: 'TEST',
        type: 'percentage',
        value: 10,
        maxDiscount: 50,
        usageLimit: 100,
        usedCount: 5,
        perUserLimit: 3,
        minAmount: 0,
      });
      mockCouponUsage.countDocuments.mockResolvedValue(0);

      const result = await service.applyCoupon('test', 200, 'ben1', 'br1');

      expect(result.discount).toBe(20);
      expect(result.finalAmount).toBe(180);
    });

    it('applies fixed coupon', async () => {
      mockDiscountCoupon.findOne.mockResolvedValue({
        _id: 'c1',
        code: 'FIX',
        type: 'fixed',
        value: 30,
        maxDiscount: null,
        usageLimit: null,
        usedCount: 0,
        perUserLimit: 99,
        minAmount: 0,
      });
      mockCouponUsage.countDocuments.mockResolvedValue(0);

      const result = await service.applyCoupon('FIX', 100, 'ben1', 'br1');

      expect(result.discount).toBe(30);
      expect(result.finalAmount).toBe(70);
    });

    it('caps discount at maxDiscount', async () => {
      mockDiscountCoupon.findOne.mockResolvedValue({
        _id: 'c1',
        code: 'X',
        type: 'percentage',
        value: 50,
        maxDiscount: 25,
        usageLimit: null,
        usedCount: 0,
        perUserLimit: 99,
        minAmount: 0,
      });
      mockCouponUsage.countDocuments.mockResolvedValue(0);

      const result = await service.applyCoupon('X', 200, 'ben1', 'br1');

      expect(result.discount).toBe(25);
    });

    it('throws when coupon not found/expired', async () => {
      mockDiscountCoupon.findOne.mockResolvedValue(null);
      await expect(service.applyCoupon('BAD', 100, 'b', 'br')).rejects.toThrow('غير صالح');
    });

    it('throws when usage limit exceeded', async () => {
      mockDiscountCoupon.findOne.mockResolvedValue({
        _id: 'c1',
        usageLimit: 5,
        usedCount: 5,
        minAmount: 0,
        perUserLimit: 99,
      });
      await expect(service.applyCoupon('X', 100, 'b', 'br')).rejects.toThrow('حد استخدام');
    });

    it('throws when below minimum amount', async () => {
      mockDiscountCoupon.findOne.mockResolvedValue({
        _id: 'c1',
        usageLimit: null,
        usedCount: 0,
        minAmount: 500,
        perUserLimit: 99,
      });
      await expect(service.applyCoupon('X', 100, 'b', 'br')).rejects.toThrow('الحد الأدنى');
    });

    it('throws when per-user limit exceeded', async () => {
      mockDiscountCoupon.findOne.mockResolvedValue({
        _id: 'c1',
        usageLimit: null,
        usedCount: 0,
        minAmount: 0,
        perUserLimit: 1,
      });
      mockCouponUsage.countDocuments.mockResolvedValue(1);
      await expect(service.applyCoupon('X', 100, 'b', 'br')).rejects.toThrow('الاستخدام الشخصي');
    });
  });

  // ── recordCouponUsage ────────────────────────────────────────────

  describe('recordCouponUsage', () => {
    it('creates usage and increments coupon count', async () => {
      mockDiscountCoupon.findById.mockResolvedValue({ _id: 'c1', branchId: 'br1' });
      mockCouponUsage.create.mockResolvedValue({});
      mockDiscountCoupon.findByIdAndUpdate.mockResolvedValue({});

      await service.recordCouponUsage('c1', 'ben1', 'tx1', 20, 200, 'u1');

      expect(mockCouponUsage.create).toHaveBeenCalled();
      expect(mockDiscountCoupon.findByIdAndUpdate).toHaveBeenCalledWith('c1', {
        $inc: { usedCount: 1 },
      });
    });

    it('throws when coupon not found', async () => {
      mockDiscountCoupon.findById.mockResolvedValue(null);
      await expect(service.recordCouponUsage('bad', 'b', 'tx', 10, 100, 'u')).rejects.toThrow(
        'غير موجود'
      );
    });
  });

  // ── addLoyaltyPoints ─────────────────────────────────────────────

  describe('addLoyaltyPoints', () => {
    it('adds points and creates transaction', async () => {
      const wallet = fakeWallet({ loyaltyPoints: 10 });
      await service.addLoyaltyPoints(wallet, 5, 'payment', 'Source', 'src1', 'u1');

      expect(wallet.loyaltyPoints).toBe(15);
      expect(mockLoyaltyPointsTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'earn', points: 5 })
      );
    });
  });

  // ── redeemLoyaltyPoints ──────────────────────────────────────────

  describe('redeemLoyaltyPoints', () => {
    it('redeems points for discount', async () => {
      const wallet = fakeWallet({ loyaltyPoints: 200 });
      mockDigitalWallet.findById.mockResolvedValue(wallet);

      const discount = await service.redeemLoyaltyPoints('w1', 100, 'u1');

      expect(discount).toBe(1); // 100/100 = 1 SAR
      expect(wallet.loyaltyPoints).toBe(100);
      expect(wallet.save).toHaveBeenCalled();
    });

    it('throws when insufficient points', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ loyaltyPoints: 10 }));
      await expect(service.redeemLoyaltyPoints('w1', 50, 'u')).rejects.toThrow('نقاط غير كافية');
    });

    it('throws when wallet not found', async () => {
      mockDigitalWallet.findById.mockResolvedValue(null);
      await expect(service.redeemLoyaltyPoints('bad', 10, 'u')).rejects.toThrow(
        'المحفظة غير موجودة'
      );
    });
  });

  // ── blockWallet / unblockWallet ──────────────────────────────────

  describe('blockWallet', () => {
    it('blocks wallet', async () => {
      mockDigitalWallet.findByIdAndUpdate.mockResolvedValue(fakeWallet({ isBlocked: true }));
      const result = await service.blockWallet('w1', 'fraud', 'u1');
      expect(result.isBlocked).toBe(true);
    });

    it('throws when not found', async () => {
      mockDigitalWallet.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.blockWallet('bad', 'x', 'u')).rejects.toThrow('غير موجودة');
    });
  });

  describe('unblockWallet', () => {
    it('unblocks wallet', async () => {
      mockDigitalWallet.findByIdAndUpdate.mockResolvedValue(fakeWallet({ isBlocked: false }));
      const result = await service.unblockWallet('w1', 'u1');
      expect(result.isBlocked).toBe(false);
    });
  });

  // ── getStatement ─────────────────────────────────────────────────

  describe('getStatement', () => {
    it('returns statement with totals', async () => {
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ balance: 500 }));
      mockWalletTransaction.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { type: 'credit', amount: 300 },
          { type: 'debit', amount: 100 },
        ]),
      });
      mockWalletTransaction.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({ balanceAfter: 300 }),
      });

      const result = await service.getStatement('w1', '2025-01-01', '2025-12-31');

      expect(result.totalCredits).toBe(300);
      expect(result.totalDebits).toBe(100);
      expect(result.netChange).toBe(200);
      expect(result.openingBalance).toBe(300);
    });

    it('throws when wallet not found', async () => {
      mockDigitalWallet.findById.mockResolvedValue(null);
      await expect(service.getStatement('bad', '2025-01-01', '2025-12-31')).rejects.toThrow(
        'غير موجودة'
      );
    });
  });

  // ── expireLoyaltyPoints ──────────────────────────────────────────

  describe('expireLoyaltyPoints', () => {
    it('expires points and creates expire transaction', async () => {
      mockLoyaltyPointsTransaction.find.mockResolvedValue([
        {
          walletId: 'w1',
          points: 20,
        },
      ]);
      mockDigitalWallet.findById.mockResolvedValue(fakeWallet({ loyaltyPoints: 50 }));
      mockLoyaltyPointsTransaction.create.mockResolvedValue({});

      const count = await service.expireLoyaltyPoints();

      expect(count).toBe(1);
    });

    it('returns 0 when no expired points', async () => {
      mockLoyaltyPointsTransaction.find.mockResolvedValue([]);

      const count = await service.expireLoyaltyPoints();
      expect(count).toBe(0);
    });
  });

  // ── list ─────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated wallets', async () => {
      const chain = {
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([fakeWallet()]),
            }),
          }),
        }),
      };
      mockDigitalWallet.find.mockReturnValue(chain);
      mockDigitalWallet.countDocuments.mockResolvedValue(1);

      const result = await service.list({ branchId: 'br1', page: 1, limit: 15 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pages).toBe(1);
    });

    it('applies search filter', async () => {
      const chain = {
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
      mockDigitalWallet.find.mockReturnValue(chain);
      mockDigitalWallet.countDocuments.mockResolvedValue(0);

      await service.list({ search: 'WLT-123' });

      expect(mockDigitalWallet.find).toHaveBeenCalledWith(
        expect.objectContaining({ walletNumber: expect.objectContaining({ $regex: 'WLT-123' }) })
      );
    });
  });

  // ── getStats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns wallet statistics', async () => {
      mockDigitalWallet.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
      mockDigitalWallet.aggregate
        .mockResolvedValueOnce([{ total: 50000 }])
        .mockResolvedValueOnce([{ total: 1200 }]);

      const stats = await service.getStats('br1');

      expect(stats.totalWallets.value).toBe(10);
      expect(stats.activeWallets.value).toBe(8);
      expect(stats.totalBalance.value).toBe('50000.00');
      expect(stats.totalPoints.value).toBe(1200);
    });

    it('handles zero values', async () => {
      mockDigitalWallet.countDocuments.mockResolvedValue(0);
      mockDigitalWallet.aggregate.mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats.totalBalance.value).toBe('0.00');
      expect(stats.totalPoints.value).toBe(0);
    });
  });
});
