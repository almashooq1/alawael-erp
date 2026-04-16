'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
    'aggregate',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.save = jest.fn().mockResolvedValue(true);
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDServiceCharge = makeModel();
const mockDDDBillingAccount = makeModel();
const mockDDDInvoice = makeModel();
const mockDDDPayment = makeModel();

jest.mock('../../models/DddBillingEngine', () => ({
  DDDServiceCharge: mockDDDServiceCharge,
  DDDBillingAccount: mockDDDBillingAccount,
  DDDInvoice: mockDDDInvoice,
  DDDPayment: mockDDDPayment,
  INVOICE_STATUSES: ['draft', 'sent', 'paid', 'cancelled', 'partially_paid'],
  PAYMENT_METHODS: ['cash', 'card', 'transfer', 'insurance'],
  CHARGE_CATEGORIES: ['consultation', 'therapy', 'equipment'],
  BILLING_CYCLES: ['monthly', 'quarterly', 'annual'],
  DISCOUNT_TYPES: ['percentage', 'fixed'],
  TAX_TYPES: ['vat', 'none'],
  CURRENCY_CODES: ['SAR', 'USD'],
  BUILTIN_SERVICE_CHARGES: [
    { code: 'SC-PT', name: 'Physical Therapy', amount: 200 },
    { code: 'SC-OT', name: 'Occupational Therapy', amount: 250 },
  ],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const service = require('../../services/dddBillingEngine');

beforeEach(() => {
  [mockDDDServiceCharge, mockDDDBillingAccount, mockDDDInvoice, mockDDDPayment].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddBillingEngine', () => {
  /* ── initialize ── */
  describe('initialize', () => {
    it('seeds builtin service charges', async () => {
      mockDDDServiceCharge.findOne.mockReturnThis();
      mockDDDServiceCharge.lean.mockResolvedValue(null);
      mockDDDServiceCharge.create.mockResolvedValue({});
      const r = await service.initialize();
      expect(r).toBe(true);
      expect(mockDDDServiceCharge.create).toHaveBeenCalledTimes(2);
    });

    it('skips existing charges', async () => {
      mockDDDServiceCharge.findOne.mockReturnThis();
      mockDDDServiceCharge.lean.mockResolvedValue({ _id: 'x' });
      await service.initialize();
      expect(mockDDDServiceCharge.create).not.toHaveBeenCalled();
    });
  });

  /* ── Service Charges ── */
  describe('listServiceCharges', () => {
    it('returns charges sorted', async () => {
      mockDDDServiceCharge.find.mockReturnThis();
      mockDDDServiceCharge.sort.mockReturnThis();
      mockDDDServiceCharge.lean.mockResolvedValue([{ code: 'SC-PT' }]);
      const r = await service.listServiceCharges({});
      expect(r).toHaveLength(1);
    });

    it('applies category and isActive filters', async () => {
      mockDDDServiceCharge.find.mockReturnThis();
      mockDDDServiceCharge.sort.mockReturnThis();
      mockDDDServiceCharge.lean.mockResolvedValue([]);
      await service.listServiceCharges({ category: 'therapy', isActive: true });
      expect(mockDDDServiceCharge.find).toHaveBeenCalledWith({
        category: 'therapy',
        isActive: true,
      });
    });
  });

  describe('getServiceCharge', () => {
    it('returns charge via _getById', async () => {
      mockDDDServiceCharge.findById.mockReturnThis();
      mockDDDServiceCharge.lean.mockResolvedValue({ _id: 'sc1' });
      expect(await service.getServiceCharge('sc1')).toEqual({ _id: 'sc1' });
    });
  });

  describe('createServiceCharge', () => {
    it('creates via _create', async () => {
      mockDDDServiceCharge.create.mockResolvedValue({ _id: 'sc1' });
      expect(await service.createServiceCharge({ code: 'NEW' })).toHaveProperty('_id');
    });
  });

  /* ── Billing Accounts ── */
  describe('listBillingAccounts', () => {
    it('returns accounts sorted', async () => {
      mockDDDBillingAccount.find.mockReturnThis();
      mockDDDBillingAccount.sort.mockReturnThis();
      mockDDDBillingAccount.lean.mockResolvedValue([{ _id: 'ba1' }]);
      expect(await service.listBillingAccounts({})).toHaveLength(1);
    });

    it('applies beneficiaryId and status filters', async () => {
      mockDDDBillingAccount.find.mockReturnThis();
      mockDDDBillingAccount.sort.mockReturnThis();
      mockDDDBillingAccount.lean.mockResolvedValue([]);
      await service.listBillingAccounts({ beneficiaryId: 'b1', status: 'active' });
      expect(mockDDDBillingAccount.find).toHaveBeenCalledWith({
        beneficiaryId: 'b1',
        status: 'active',
      });
    });
  });

  describe('createBillingAccount', () => {
    it('creates with auto account number', async () => {
      mockDDDBillingAccount.countDocuments.mockResolvedValue(5);
      mockDDDBillingAccount.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createBillingAccount({ beneficiaryId: 'b1' });
      expect(r.accountNumber).toBe('BA-000006');
    });

    it('keeps provided accountNumber', async () => {
      mockDDDBillingAccount.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createBillingAccount({ accountNumber: 'CUSTOM' });
      expect(r.accountNumber).toBe('CUSTOM');
    });
  });

  /* ── Invoices ── */
  describe('listInvoices', () => {
    it('returns invoices sorted', async () => {
      mockDDDInvoice.find.mockReturnThis();
      mockDDDInvoice.sort.mockReturnThis();
      mockDDDInvoice.lean.mockResolvedValue([{ _id: 'inv1' }]);
      expect(await service.listInvoices({})).toHaveLength(1);
    });

    it('applies date range filter', async () => {
      mockDDDInvoice.find.mockReturnThis();
      mockDDDInvoice.sort.mockReturnThis();
      mockDDDInvoice.lean.mockResolvedValue([]);
      await service.listInvoices({ from: '2024-01-01', to: '2024-12-31' });
      expect(mockDDDInvoice.find).toHaveBeenCalled();
    });
  });

  describe('createInvoice', () => {
    it('creates with auto invoice number and calculates totals', async () => {
      mockDDDInvoice.countDocuments.mockResolvedValue(0);
      mockDDDInvoice.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createInvoice({
        lines: [{ quantity: 2, unitPrice: 100, discount: 0, taxRate: 15 }],
      });
      expect(r.invoiceNumber).toMatch(/^INV-/);
      expect(r.subtotal).toBe(200);
      expect(r.totalTax).toBe(30);
      expect(r.grandTotal).toBe(230);
      expect(r.amountDue).toBe(230);
    });

    it('applies percentage discount', async () => {
      mockDDDInvoice.countDocuments.mockResolvedValue(0);
      mockDDDInvoice.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createInvoice({
        lines: [
          { quantity: 1, unitPrice: 100, discountType: 'percentage', discount: 10, taxRate: 15 },
        ],
      });
      expect(r.totalDiscount).toBe(10);
      expect(r.subtotal).toBe(100);
      expect(r.grandTotal).toBe(103.5); // 100 - 10 + 13.5
    });

    it('handles empty lines', async () => {
      mockDDDInvoice.countDocuments.mockResolvedValue(0);
      mockDDDInvoice.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createInvoice({});
      expect(r.subtotal).toBe(0);
      expect(r.grandTotal).toBe(0);
    });
  });

  describe('sendInvoice', () => {
    it('sets status to sent', async () => {
      mockDDDInvoice.findByIdAndUpdate.mockReturnThis();
      mockDDDInvoice.lean.mockResolvedValue({ _id: 'inv1', status: 'sent' });
      expect((await service.sendInvoice('inv1')).status).toBe('sent');
    });
  });

  describe('cancelInvoice', () => {
    it('cancels with reason', async () => {
      mockDDDInvoice.findByIdAndUpdate.mockReturnThis();
      mockDDDInvoice.lean.mockResolvedValue({ _id: 'inv1', status: 'cancelled' });
      expect((await service.cancelInvoice('inv1', 'error')).status).toBe('cancelled');
    });
  });

  /* ── Payments ── */
  describe('listPayments', () => {
    it('returns payments sorted', async () => {
      mockDDDPayment.find.mockReturnThis();
      mockDDDPayment.sort.mockReturnThis();
      mockDDDPayment.lean.mockResolvedValue([]);
      expect(await service.listPayments({})).toEqual([]);
    });

    it('applies all filters', async () => {
      mockDDDPayment.find.mockReturnThis();
      mockDDDPayment.sort.mockReturnThis();
      mockDDDPayment.lean.mockResolvedValue([]);
      await service.listPayments({
        beneficiaryId: 'b1',
        invoiceId: 'inv1',
        method: 'cash',
        status: 'completed',
      });
      expect(mockDDDPayment.find).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'cash', status: 'completed' })
      );
    });
  });

  describe('recordPayment', () => {
    it('creates payment with auto number', async () => {
      mockDDDPayment.countDocuments.mockResolvedValue(0);
      mockDDDPayment.create.mockResolvedValue({ _id: 'pay1', paymentNumber: 'PAY-2026-0000001' });
      const r = await service.recordPayment({ amount: 100 });
      expect(r.paymentNumber).toMatch(/^PAY-/);
    });

    it('updates linked invoice to paid when fully paid', async () => {
      mockDDDPayment.countDocuments.mockResolvedValue(0);
      mockDDDPayment.create.mockResolvedValue({ _id: 'pay1' });
      const invoice = { grandTotal: 100, amountPaid: 0, save: jest.fn().mockResolvedValue(true) };
      mockDDDInvoice.findById.mockResolvedValue(invoice);
      mockDDDBillingAccount.findByIdAndUpdate.mockResolvedValue({});

      await service.recordPayment({ amount: 100, invoiceId: 'inv1', billingAccountId: 'ba1' });
      expect(invoice.status).toBe('paid');
      expect(invoice.save).toHaveBeenCalled();
    });

    it('updates linked invoice to partially_paid', async () => {
      mockDDDPayment.countDocuments.mockResolvedValue(0);
      mockDDDPayment.create.mockResolvedValue({ _id: 'pay1' });
      const invoice = { grandTotal: 200, amountPaid: 0, save: jest.fn().mockResolvedValue(true) };
      mockDDDInvoice.findById.mockResolvedValue(invoice);

      await service.recordPayment({ amount: 50, invoiceId: 'inv1' });
      expect(invoice.status).toBe('partially_paid');
    });

    it('skips invoice update when not linked', async () => {
      mockDDDPayment.countDocuments.mockResolvedValue(0);
      mockDDDPayment.create.mockResolvedValue({ _id: 'pay1' });
      await service.recordPayment({ amount: 50 });
      expect(mockDDDInvoice.findById).not.toHaveBeenCalled();
    });
  });

  describe('refundPayment', () => {
    it('refunds full amount', async () => {
      const payment = { _id: 'pay1', amount: 100, save: jest.fn().mockResolvedValue(true) };
      mockDDDPayment.findById.mockResolvedValue(payment);
      const r = await service.refundPayment('pay1', null, 'error');
      expect(r.refundAmount).toBe(100);
      expect(r.status).toBe('refunded');
    });

    it('refunds partial amount', async () => {
      const payment = { _id: 'pay1', amount: 100, save: jest.fn().mockResolvedValue(true) };
      mockDDDPayment.findById.mockResolvedValue(payment);
      const r = await service.refundPayment('pay1', 30, 'adjustment');
      expect(r.refundAmount).toBe(30);
      expect(r.status).toBe('partially_refunded');
    });

    it('throws when payment not found', async () => {
      mockDDDPayment.findById.mockResolvedValue(null);
      await expect(service.refundPayment('bad')).rejects.toThrow('Payment not found');
    });
  });

  /* ── Financial Summary ── */
  describe('getFinancialSummary', () => {
    it('returns aggregated financial data', async () => {
      mockDDDInvoice.aggregate.mockResolvedValue([
        { totalInvoiced: 1000, totalPaid: 500, totalDue: 500, count: 10 },
      ]);
      mockDDDPayment.aggregate.mockResolvedValue([
        { totalCollected: 500, totalRefunded: 50, paymentCount: 8 },
      ]);
      const r = await service.getFinancialSummary({});
      expect(r.invoices.totalInvoiced).toBe(1000);
      expect(r.payments.totalCollected).toBe(500);
    });

    it('returns zeros when no data', async () => {
      mockDDDInvoice.aggregate.mockResolvedValue([]);
      mockDDDPayment.aggregate.mockResolvedValue([]);
      const r = await service.getFinancialSummary({});
      expect(r.invoices.totalInvoiced).toBe(0);
      expect(r.payments.totalCollected).toBe(0);
    });
  });

  describe('getOverdueInvoices', () => {
    it('returns overdue invoices', async () => {
      mockDDDInvoice.find.mockReturnThis();
      mockDDDInvoice.sort.mockReturnThis();
      mockDDDInvoice.lean.mockResolvedValue([{ _id: 'inv1' }]);
      expect(await service.getOverdueInvoices()).toHaveLength(1);
    });
  });

  describe('getAccountStatement', () => {
    it('returns account + invoices + payments', async () => {
      mockDDDInvoice.find.mockReturnThis();
      mockDDDInvoice.sort.mockReturnThis();
      mockDDDInvoice.lean.mockResolvedValue([]);
      mockDDDPayment.find.mockReturnThis();
      mockDDDPayment.sort.mockReturnThis();
      mockDDDPayment.lean.mockResolvedValue([]);
      mockDDDBillingAccount.findById.mockReturnThis();
      mockDDDBillingAccount.lean.mockResolvedValue({ _id: 'ba1' });

      const r = await service.getAccountStatement('ba1');
      expect(r).toHaveProperty('account');
      expect(r).toHaveProperty('invoices');
      expect(r).toHaveProperty('payments');
    });
  });
});
