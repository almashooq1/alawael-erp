const mongoose = require('mongoose');
const PaymentServiceClass = require('../services/payment-gateway.service');
const paymentService = new PaymentServiceClass();
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const Subscription = require('../models/subscription.model');

// Mock Mongoose Models
jest.mock('../models/payment.model');
jest.mock('../models/invoice.model');
jest.mock('../models/subscription.model');

describe('Payment Gateway Service', () => {
  let saveMock;

  beforeEach(() => {
    saveMock = jest.fn().mockResolvedValue(true);
    Payment.mockImplementation(() => ({ save: saveMock }));
    Invoice.mockImplementation(() => ({ save: saveMock }));
    Subscription.mockImplementation(() => ({ save: saveMock }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const items = [{ description: 'Test Item', total: 100 }];
      const invoice = await paymentService.createInvoice('user123', items, 'Test Note');

      expect(Invoice).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
      expect(invoice).toBeDefined();
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      // Mock processStripePayment within the service if needed,
      // but since it's a unit test of the logic we can mock the internal call or the DB
      // Ideally we would mock the payment processing too.
      // For this test we assume processStripePayment works or mock it if it's called.

      // We might need to mock the internal processStripePayment call
      const originalProcess = paymentService.processStripePayment;
      paymentService.processStripePayment = jest.fn().mockResolvedValue({ success: true });

      const sub = await paymentService.createSubscription('user123', 'basic', 'monthly');

      expect(Subscription).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
      expect(paymentService.processStripePayment).toHaveBeenCalled();

      // Restore
      paymentService.processStripePayment = originalProcess;
    });
  });
});
