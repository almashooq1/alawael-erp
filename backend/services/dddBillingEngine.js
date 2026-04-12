'use strict';
/**
 * BillingEngine Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddBillingEngine.js
 */

const {
  DDDServiceCharge,
  DDDBillingAccount,
  DDDInvoice,
  DDDPayment,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  CHARGE_CATEGORIES,
  BILLING_CYCLES,
  DISCOUNT_TYPES,
  TAX_TYPES,
  CURRENCY_CODES,
  BUILTIN_SERVICE_CHARGES,
} = require('../models/DddBillingEngine');

const BaseCrudService = require('./base/BaseCrudService');

class BillingEngine extends BaseCrudService {
  constructor() {
    super('BillingEngine', {
      description: 'Invoice generation, service charges, billing cycles & payment tracking',
      version: '1.0.0',
    }, {
      serviceCharges: DDDServiceCharge,
      billingAccounts: DDDBillingAccount,
      invoices: DDDInvoice,
      payments: DDDPayment,
    })
  }

  async initialize() {
    await this._seedServiceCharges();
    this.log('Billing Engine initialised ✓');
    return true;
  }

  /** Seed built-in service charge catalogue */
  async _seedServiceCharges() {
    for (const sc of BUILTIN_SERVICE_CHARGES) {
      const exists = await DDDServiceCharge.findOne({ code: sc.code }).lean();
      if (!exists) {
        await DDDServiceCharge.create({ ...sc, taxType: 'vat', taxRate: 15 });
      }
    }
  }

  /** Generate next invoice number */
  async _nextInvoiceNumber() {
    const count = await DDDInvoice.countDocuments();
    const seq = String(count + 1).padStart(7, '0');
    return `INV-${new Date().getFullYear()}-${seq}`;
  }

  /** Generate next payment number */
  async _nextPaymentNumber() {
    const count = await DDDPayment.countDocuments();
    const seq = String(count + 1).padStart(7, '0');
    return `PAY-${new Date().getFullYear()}-${seq}`;
  }

  /** Generate next account number */
  async _nextAccountNumber() {
    const count = await DDDBillingAccount.countDocuments();
    const seq = String(count + 1).padStart(6, '0');
    return `BA-${seq}`;
  }

  /* ── Service Charge CRUD ── */
  async listServiceCharges(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDServiceCharge.find(q).sort({ category: 1, code: 1 }).lean();
  }

  async getServiceCharge(id) { return this._getById(DDDServiceCharge, id); }

  async createServiceCharge(data) { return this._create(DDDServiceCharge, data); }

  async updateServiceCharge(id, data) { return this._update(DDDServiceCharge, id, data, { runValidators: true }); }

  /* ── Billing Account CRUD ── */
  async listBillingAccounts(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.status) q.status = filters.status;
    return DDDBillingAccount.find(q).sort({ createdAt: -1 }).lean();
  }

  async getBillingAccount(id) { return this._getById(DDDBillingAccount, id); }

  async createBillingAccount(data) {
    data.accountNumber = data.accountNumber || (await this._nextAccountNumber());
    return DDDBillingAccount.create(data);
  }

  async updateBillingAccount(id, data) { return this._update(DDDBillingAccount, id, data, { runValidators: true }); }

  /* ── Invoice CRUD ── */
  async listInvoices(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.billingAccountId) q.billingAccountId = filters.billingAccountId;
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      q.issueDate = {};
      if (filters.from) q.issueDate.$gte = new Date(filters.from);
      if (filters.to) q.issueDate.$lte = new Date(filters.to);
    }
    return DDDInvoice.find(q).sort({ issueDate: -1 }).lean();
  }

  async getInvoice(id) { return this._getById(DDDInvoice, id); }

  async createInvoice(data) {
    data.invoiceNumber = data.invoiceNumber || (await this._nextInvoiceNumber());
    // Calculate totals
    let subtotal = 0,
      totalDiscount = 0,
      totalTax = 0;
    for (const line of data.lines || []) {
      const base = line.quantity * line.unitPrice;
      const disc =
        line.discountType === 'percentage' ? base * (line.discount / 100) : line.discount || 0;
      const afterDisc = base - disc;
      const tax = afterDisc * ((line.taxRate || 15) / 100);
      line.lineTotal = Math.round((afterDisc + tax) * 100) / 100;
      subtotal += base;
      totalDiscount += disc;
      totalTax += tax;
    }
    data.subtotal = Math.round(subtotal * 100) / 100;
    data.totalDiscount = Math.round(totalDiscount * 100) / 100;
    data.totalTax = Math.round(totalTax * 100) / 100;
    data.grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;
    data.amountDue = data.grandTotal - (data.amountPaid || 0);
    return DDDInvoice.create(data);
  }

  async updateInvoice(id, data) { return this._update(DDDInvoice, id, data, { runValidators: true }); }

  async sendInvoice(id) {
    return DDDInvoice.findByIdAndUpdate(id, { status: 'sent', sentAt: new Date() }, { new: true }).lean();
  }

  async cancelInvoice(id, reason) {
    return DDDInvoice.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      { new: true }
    ).lean();
  }

  /* ── Payment CRUD ── */
  async listPayments(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.billingAccountId) q.billingAccountId = filters.billingAccountId;
    if (filters.invoiceId) q.invoiceId = filters.invoiceId;
    if (filters.status) q.status = filters.status;
    if (filters.method) q.method = filters.method;
    return DDDPayment.find(q).sort({ createdAt: -1 }).lean();
  }

  async getPayment(id) { return this._getById(DDDPayment, id); }

  async recordPayment(data) {
    data.paymentNumber = data.paymentNumber || (await this._nextPaymentNumber());
    const payment = await DDDPayment.create(data);

    // Update invoice if linked
    if (data.invoiceId) {
      const invoice = await DDDInvoice.findById(data.invoiceId);
      if (invoice) {
        invoice.amountPaid = (invoice.amountPaid || 0) + data.amount;
        invoice.amountDue = invoice.grandTotal - invoice.amountPaid;
        if (invoice.amountDue <= 0) {
          invoice.status = 'paid';
          invoice.paidAt = new Date();
        } else {
          invoice.status = 'partially_paid';
        }
        await invoice.save();
      }
    }

    // Update billing account
    if (data.billingAccountId) {
      await DDDBillingAccount.findByIdAndUpdate(data.billingAccountId, {
        $inc: { totalPaid: data.amount, currentBalance: -data.amount },
      });
    }

    return payment;
  }

  async refundPayment(id, amount, reason) {
    const payment = await DDDPayment.findById(id);
    if (!payment) throw new Error('Payment not found');
    const refundAmt = amount || payment.amount;
    payment.refundAmount = (payment.refundAmount || 0) + refundAmt;
    payment.status = payment.refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();
    return payment;
  }

  /* ── Financial Summary ── */
  async getFinancialSummary(filters = {}) {
    const match = {};
    if (filters.from || filters.to) {
      match.issueDate = {};
      if (filters.from) match.issueDate.$gte = new Date(filters.from);
      if (filters.to) match.issueDate.$lte = new Date(filters.to);
    }
    const [invoiceStats] = await DDDInvoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          totalDue: { $sum: '$amountDue' },
          count: { $sum: 1 },
        },
      },
    ]);
    const [paymentStats] = await DDDPayment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$amount' },
          totalRefunded: { $sum: '$refundAmount' },
          paymentCount: { $sum: 1 },
        },
      },
    ]);
    return {
      invoices: invoiceStats || { totalInvoiced: 0, totalPaid: 0, totalDue: 0, count: 0 },
      payments: paymentStats || { totalCollected: 0, totalRefunded: 0, paymentCount: 0 },
    };
  }

  async getOverdueInvoices() {
    return DDDInvoice.find({
      status: { $in: ['sent', 'partially_paid'] },
      dueDate: { $lt: new Date() },
    })
      .sort({ dueDate: 1 })
      .lean();
  }

  async getAccountStatement(accountId, from, to) {
    const q = { billingAccountId: accountId };
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    const invoices = await DDDInvoice.find({ ...q })
      .sort({ issueDate: 1 })
      .lean();
    const payments = await DDDPayment.find({ ...q })
      .sort({ paidAt: 1 })
      .lean();
    const account = await DDDBillingAccount.findById(accountId).lean();
    return { account, invoices, payments };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new BillingEngine();
