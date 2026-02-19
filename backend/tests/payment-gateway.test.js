const mongoose = require('mongoose');
const PaymentServiceClass = require('../services/payment-gateway.service');
const paymentService = new PaymentServiceClass();
const Payment = require('../models/payment.model');
const Subscription = require('../models/subscription.model');
const Invoice = require('../models/invoice.model');

// Mock specific Mongoose methods used in service
jest.mock('../models/payment.model');
jest.mock('../models/subscription.model');

jest.mock('../models/invoice.model', () => {
  // Return a constructor function that jest can spy on
  const InvoiceMock = jest.fn(function (data) {
    // Copy all data properties to this instance using Object.assign
    Object.assign(this, data);
  });

  // Add prototype method
  InvoiceMock.prototype.save = jest.fn(async function () {
    return this;
  });

  return InvoiceMock;
});

describe('Payment Gateway Service', () => {
  let mockUserId;

  beforeAll(() => {
    mockUserId = new mongoose.Types.ObjectId();
    // Setup mock implementations for save
    Payment.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(true),
      transactionId: 'tx_123',
      amount: 100,
      currency: 'SAR',
      status: 'processing',
    }));

    Subscription.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(true),
      plan: 'basic',
      status: 'active',
    }));
  });

  beforeEach(() => {
    // Re-setup Invoice mock implementation in each test since afterEach clears it
    Invoice.mockImplementation(function (data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should process Stripe payment (mock)', async () => {
    const result = await paymentService.processStripePayment(mockUserId, 100, 'SAR');
    expect(result.success).toBe(true);
    expect(result.paymentId).toBeDefined();
    expect(Payment).toHaveBeenCalled();
  });

  test('should process Mock PayPal payment', async () => {
    const result = await paymentService.processPayPalPayment(mockUserId, 50, 'Test Payment');
    expect(result.success).toBe(true);
    expect(result.paymentId).toBeDefined();
    // PayPal uses callback style in the actual service, but our mock environment handles it via the service logic
  });

  test('should process Razorpay payment (mock)', async () => {
    const result = await paymentService.processRazorpayPayment(mockUserId, 200, 'Test Order');
    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();
    expect(Payment).toHaveBeenCalled();
  });

  test('should process installment plan', async () => {
    const result = await paymentService.processInstallmentPayment(mockUserId, 300, 3);
    expect(result.success).toBe(true);
    expect(result.monthlyAmount).toBe(100);
    expect(result.months).toBe(3);
    expect(result.installments.length).toBe(3);
  });

  test('should create a subscription', async () => {
    const result = await paymentService.createSubscription(mockUserId, 'basic', 'monthly');
    expect(result).toBeDefined();
    expect(Subscription).toHaveBeenCalled();
    // Since price > 0, it should also trigger a payment
    expect(Payment).toHaveBeenCalled();
  });

  test('should create an invoice', async () => {
    const items = [{ description: 'Item 1', quantity: 1, unitPrice: 100, total: 100 }];
    const result = await paymentService.createInvoice(mockUserId, items);
    expect(result).toBeDefined();
    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(15); // 15% tax
    expect(result.total).toBe(115);
    expect(Invoice).toHaveBeenCalled();
  });
});
