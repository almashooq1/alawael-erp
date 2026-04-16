/**
 * Unit tests for services/paymentService.js
 * Payment Gateway Integration Service (DB-backed)
 */

/* ─── mock setup ────────────────────────────────────────────────────── */

const mockPaymentCreate = jest.fn();
const mockPaymentFindOne = jest.fn();
const mockPaymentFind = jest.fn();

const mockInvoiceCreate = jest.fn();
const mockInvoiceFindById = jest.fn();

const mockPaymentMethodCreate = jest.fn();
const mockPaymentMethodFind = jest.fn();
const mockPaymentMethodUpdateMany = jest.fn();
const mockPaymentMethodDeleteOne = jest.fn();

jest.mock('mongoose', () => {
  const SchemaClass = jest.fn();
  SchemaClass.Types = { ObjectId: 'ObjectId' };

  const SchemaConstructor = jest.fn().mockReturnValue({});
  SchemaConstructor.Types = { ObjectId: 'ObjectId' };

  const PaymentMethodMock = {
    create: (...args) => mockPaymentMethodCreate(...args),
    find: (...args) => mockPaymentMethodFind(...args),
    updateMany: (...args) => mockPaymentMethodUpdateMany(...args),
    deleteOne: (...args) => mockPaymentMethodDeleteOne(...args),
  };

  return {
    Schema: SchemaConstructor,
    model: jest.fn(() => PaymentMethodMock),
    models: {},
  };
});

jest.mock('../../models/payment.model', () => ({
  create: (...args) => mockPaymentCreate(...args),
  findOne: (...args) => mockPaymentFindOne(...args),
  find: (...args) => mockPaymentFind(...args),
}));

jest.mock('../../models/invoice.model', () => ({
  create: (...args) => mockInvoiceCreate(...args),
  findById: (...args) => mockInvoiceFindById(...args),
}));

jest.mock('../../services/audit-logger', () => ({
  log: jest.fn().mockResolvedValue(undefined),
}));

jest.mock(
  '../../services/notification.service',
  () => ({
    send: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true }
);

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ─── require service (singleton) ───────────────────────────────────── */

let paymentService;

beforeAll(() => {
  // The service uses: mongoose.models.PaymentMethod || mongoose.model(...)
  // Our mock's mongoose.model() returns an object with the needed statics.
  paymentService = require('../../services/paymentService');
});

/* ─── helpers ───────────────────────────────────────────────────────── */

function makeMockPayment(overrides = {}) {
  return {
    _id: 'pay1',
    transactionId: 'stripe_123',
    userId: 'u1',
    amount: 100,
    currency: 'SAR',
    status: 'pending',
    paymentMethod: 'card',
    stripePaymentIntentId: 'stripe_123',
    createdAt: new Date(),
    completedAt: null,
    cardDetails: {},
    metadata: new Map(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── initializeStripePayment ──────────────────────────────────────

  describe('initializeStripePayment', () => {
    it('creates pending payment and returns success', async () => {
      mockPaymentCreate.mockResolvedValue({
        _id: 'p1',
        stripePaymentIntentId: 'pi_test',
      });

      const result = await paymentService.initializeStripePayment('u1', 200, 'SAR');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(200);
      expect(result.currency).toBe('SAR');
      expect(mockPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 200, paymentMethod: 'card', status: 'pending' })
      );
    });

    it('returns error for invalid amount', async () => {
      const result = await paymentService.initializeStripePayment('u1', 0);

      expect(result.success).toBe(false);
    });

    it('returns error for negative amount', async () => {
      const result = await paymentService.initializeStripePayment('u1', -10);

      expect(result.success).toBe(false);
    });
  });

  // ── confirmStripePayment ─────────────────────────────────────────

  describe('confirmStripePayment', () => {
    it('confirms payment and sets completed status', async () => {
      const mockPay = makeMockPayment();
      mockPaymentFindOne.mockResolvedValue(mockPay);

      const result = await paymentService.confirmStripePayment('stripe_123', 'pm_1234');

      expect(result.success).toBe(true);
      expect(mockPay.status).toBe('completed');
      expect(mockPay.save).toHaveBeenCalled();
    });

    it('returns error when payment not found', async () => {
      mockPaymentFindOne.mockResolvedValue(null);

      const result = await paymentService.confirmStripePayment('bad', 'pm');

      expect(result.success).toBe(false);
    });
  });

  // ── initializePayPalPayment ──────────────────────────────────────

  describe('initializePayPalPayment', () => {
    it('creates PayPal payment and returns approval URL', async () => {
      mockPaymentCreate.mockResolvedValue({ _id: 'p2' });

      const result = await paymentService.initializePayPalPayment('u1', 150);

      expect(result.success).toBe(true);
      expect(result.approvalUrl).toContain('paypal.com');
    });

    it('returns error for zero amount', async () => {
      const result = await paymentService.initializePayPalPayment('u1', 0);

      expect(result.success).toBe(false);
    });
  });

  // ── initializeKNETPayment ────────────────────────────────────────

  describe('initializeKNETPayment', () => {
    it('creates KNET payment and returns redirect URL', async () => {
      mockPaymentCreate.mockResolvedValue({ _id: 'p3' });

      const result = await paymentService.initializeKNETPayment('u1', 300);

      expect(result.success).toBe(true);
      expect(result.redirectUrl).toContain('knet.gateway.com');
    });
  });

  // ── getPaymentStatus ─────────────────────────────────────────────

  describe('getPaymentStatus', () => {
    it('returns payment status', async () => {
      mockPaymentFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          transactionId: 'tx1',
          status: 'completed',
          paymentMethod: 'card',
          amount: 100,
          currency: 'SAR',
          createdAt: new Date(),
          completedAt: new Date(),
        }),
      });

      const result = await paymentService.getPaymentStatus('tx1');

      expect(result.success).toBe(true);
      expect(result.payment.status).toBe('completed');
    });

    it('returns error when not found', async () => {
      mockPaymentFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await paymentService.getPaymentStatus('bad');

      expect(result.success).toBe(false);
    });
  });

  // ── createInvoice ────────────────────────────────────────────────

  describe('createInvoice', () => {
    it('creates invoice with items', async () => {
      mockInvoiceCreate.mockResolvedValue({
        _id: 'inv1',
        invoiceNumber: 'INV-123',
        total: 200,
      });

      const result = await paymentService.createInvoice('u1', [
        { description: 'Item 1', price: 100, quantity: 2 },
      ]);

      expect(result.success).toBe(true);
      expect(result.invoiceNumber).toBe('INV-123');
    });

    it('returns error for empty items', async () => {
      const result = await paymentService.createInvoice('u1', []);

      expect(result.success).toBe(false);
    });

    it('applies tax and discount from metadata', async () => {
      mockInvoiceCreate.mockResolvedValue({
        _id: 'inv2',
        invoiceNumber: 'INV-456',
        total: 115,
      });

      const result = await paymentService.createInvoice('u1', [{ price: 100, quantity: 1 }], {
        tax: 15,
        discount: 0,
      });

      expect(result.success).toBe(true);
      expect(mockInvoiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({ tax: 15, discount: 0 })
      );
    });
  });

  // ── sendInvoice ──────────────────────────────────────────────────

  describe('sendInvoice', () => {
    it('marks invoice as sent', async () => {
      const mockInv = {
        _id: 'inv1',
        userId: 'u1',
        invoiceNumber: 'INV-001',
        status: 'draft',
        notes: '',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockInvoiceFindById.mockResolvedValue(mockInv);

      const result = await paymentService.sendInvoice('inv1', 'test@example.com');

      expect(result.success).toBe(true);
      expect(mockInv.status).toBe('sent');
      expect(result.sentTo).toBe('test@example.com');
    });

    it('returns error when invoice not found', async () => {
      mockInvoiceFindById.mockResolvedValue(null);

      const result = await paymentService.sendInvoice('bad', 'test@example.com');

      expect(result.success).toBe(false);
    });
  });

  // ── savePaymentMethod ────────────────────────────────────────────

  describe('savePaymentMethod', () => {
    it('saves method and returns result', async () => {
      mockPaymentMethodCreate.mockResolvedValue({
        _id: 'pm1',
        isDefault: false,
      });

      const result = await paymentService.savePaymentMethod('u1', {
        type: 'card',
        lastFour: '4242',
        expiryDate: '12/26',
      });

      expect(result.success).toBe(true);
      expect(result.methodId).toBe('pm1');
    });

    it('clears other defaults when isDefault is true', async () => {
      mockPaymentMethodCreate.mockResolvedValue({
        _id: 'pm2',
        isDefault: true,
      });
      mockPaymentMethodUpdateMany.mockResolvedValue(undefined);

      const result = await paymentService.savePaymentMethod('u1', {
        type: 'card',
        lastFour: '1111',
        isDefault: true,
      });

      expect(result.success).toBe(true);
      expect(mockPaymentMethodUpdateMany).toHaveBeenCalled();
    });
  });

  // ── getSavedPaymentMethods ───────────────────────────────────────

  describe('getSavedPaymentMethods', () => {
    it('returns user methods', async () => {
      const sortFn = jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: 'pm1' }]) });
      mockPaymentMethodFind.mockReturnValue({ sort: sortFn });

      const result = await paymentService.getSavedPaymentMethods('u1');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  // ── deletePaymentMethod ──────────────────────────────────────────

  describe('deletePaymentMethod', () => {
    it('deletes method', async () => {
      mockPaymentMethodDeleteOne.mockResolvedValue(undefined);

      const result = await paymentService.deletePaymentMethod('pm1');

      expect(result.success).toBe(true);
    });
  });

  // ── refundPayment ────────────────────────────────────────────────

  describe('refundPayment', () => {
    it('refunds completed payment', async () => {
      const mockPay = makeMockPayment({ status: 'completed' });
      mockPaymentFindOne.mockResolvedValue(mockPay);

      const result = await paymentService.refundPayment('stripe_123', 'User requested');

      expect(result.success).toBe(true);
      expect(mockPay.status).toBe('refunded');
      expect(result.amount).toBe(100);
    });

    it('returns error for non-completed payment', async () => {
      const mockPay = makeMockPayment({ status: 'pending' });
      mockPaymentFindOne.mockResolvedValue(mockPay);

      const result = await paymentService.refundPayment('stripe_123');

      expect(result.success).toBe(false);
    });

    it('returns error when payment not found', async () => {
      mockPaymentFindOne.mockResolvedValue(null);

      const result = await paymentService.refundPayment('bad');

      expect(result.success).toBe(false);
    });
  });

  // ── getPaymentHistory ────────────────────────────────────────────

  describe('getPaymentHistory', () => {
    it('returns payment history', async () => {
      const limitFn = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      mockPaymentFind.mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: limitFn }) });

      const result = await paymentService.getPaymentHistory('u1');

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
  });

  // ── getPaymentStats ──────────────────────────────────────────────

  describe('getPaymentStats', () => {
    it('calculates payment statistics', async () => {
      mockPaymentFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { status: 'completed', amount: 100, paymentMethod: 'card' },
          { status: 'completed', amount: 200, paymentMethod: 'paypal' },
          { status: 'pending', amount: 50, paymentMethod: 'card' },
        ]),
      });

      const result = await paymentService.getPaymentStats('u1');

      expect(result.success).toBe(true);
      expect(result.stats.totalPayments).toBe(3);
      expect(result.stats.completedPayments).toBe(2);
      expect(result.stats.totalAmount).toBe(300);
      expect(result.stats.averageAmount).toBe(150);
      expect(result.stats.byProvider.card).toBe(2);
      expect(result.stats.byProvider.paypal).toBe(1);
    });

    it('handles zero completed payments', async () => {
      mockPaymentFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await paymentService.getPaymentStats('u1');

      expect(result.success).toBe(true);
      expect(result.stats.averageAmount).toBe(0);
    });
  });

  // ── handleStripeWebhook ──────────────────────────────────────────

  describe('handleStripeWebhook', () => {
    it('updates payment on succeeded event', async () => {
      const mockPay = makeMockPayment();
      mockPaymentFindOne.mockResolvedValue(mockPay);

      const result = await paymentService.handleStripeWebhook(
        {
          data: { object: { id: 'stripe_123', status: 'succeeded' } },
        },
        'sig'
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('returns error for invalid payload', async () => {
      const result = await paymentService.handleStripeWebhook({}, 'sig');

      expect(result.success).toBe(false);
    });
  });

  // ── handlePayPalWebhook ──────────────────────────────────────────

  describe('handlePayPalWebhook', () => {
    it('updates payment on completed event', async () => {
      const mockPay = makeMockPayment();
      mockPaymentFindOne.mockResolvedValue(mockPay);

      const result = await paymentService.handlePayPalWebhook({
        resource: { id: 'paypal_123', status: 'COMPLETED' },
      });

      expect(result.success).toBe(true);
    });

    it('returns error for missing resource', async () => {
      const result = await paymentService.handlePayPalWebhook({});

      expect(result.success).toBe(false);
    });
  });

  // ── handleKNETWebhook ────────────────────────────────────────────

  describe('handleKNETWebhook', () => {
    it('updates payment on webhook', async () => {
      const mockPay = makeMockPayment();
      mockPaymentFindOne.mockResolvedValue(mockPay);

      const result = await paymentService.handleKNETWebhook({
        paymentId: 'knet_123',
        status: 'completed',
      });

      expect(result.success).toBe(true);
    });

    it('returns error for missing ref', async () => {
      const result = await paymentService.handleKNETWebhook({});

      expect(result.success).toBe(false);
    });
  });

  // ── updatePaymentStatus ──────────────────────────────────────────

  describe('updatePaymentStatus', () => {
    it('updates status and notifies', async () => {
      const mockPay = makeMockPayment();
      mockPaymentFindOne.mockResolvedValue(mockPay);

      const result = await paymentService.updatePaymentStatus('tx1', 'completed', 'card');

      expect(result.success).toBe(true);
      expect(mockPay.status).toBe('completed');
      expect(mockPay.completedAt).toBeInstanceOf(Date);
    });

    it('sets completedAt only on first completion', async () => {
      const existing = new Date('2025-01-01');
      const mockPay = makeMockPayment({ completedAt: existing });
      mockPaymentFindOne.mockResolvedValue(mockPay);

      await paymentService.updatePaymentStatus('tx1', 'completed', 'card');

      // completedAt should remain the original value
      expect(mockPay.completedAt).toBe(existing);
    });

    it('returns error when payment not found', async () => {
      mockPaymentFindOne.mockResolvedValue(null);

      const result = await paymentService.updatePaymentStatus('bad', 'completed');

      expect(result.success).toBe(false);
    });
  });
});
