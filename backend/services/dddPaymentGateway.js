'use strict';
/**
 * PaymentGateway Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddPaymentGateway.js
 */

const {
  DDDPaymentGatewayConfig,
  DDDTransaction,
  DDDPaymentPlan,
  DDDReconciliation,
  GATEWAY_PROVIDERS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  PAYMENT_PLAN_STATUSES,
  PAYMENT_PLAN_FREQUENCIES,
  RECONCILIATION_STATUSES,
  CURRENCY_CODES,
  BUILTIN_GATEWAYS,
} = require('../models/DddPaymentGateway');

const BaseCrudService = require('./base/BaseCrudService');

class PaymentGateway extends BaseCrudService {
  constructor() {
    super('PaymentGateway', {
      description: 'Payment processing, multi-gateway integration, reconciliation & payment plans',
      version: '1.0.0',
    }, {
      paymentGatewayConfigs: DDDPaymentGatewayConfig,
      transactions: DDDTransaction,
      paymentPlans: DDDPaymentPlan,
      reconciliations: DDDReconciliation,
    })
  }

  async initialize() {
    await this._seedGateways();
    this.log('Payment Gateway initialised ✓');
    return true;
  }

  async _seedGateways() {
    for (const gw of BUILTIN_GATEWAYS) {
      const exists = await DDDPaymentGatewayConfig.findOne({ code: gw.code }).lean();
      if (!exists) await DDDPaymentGatewayConfig.create(gw);
    }
  }

  /* ── Sequence generators ── */
  async _nextTxnNumber() {
    const count = await DDDTransaction.countDocuments();
    return `TXN-${new Date().getFullYear()}-${String(count + 1).padStart(8, '0')}`;
  }
  async _nextPlanNumber() {
    const count = await DDDPaymentPlan.countDocuments();
    return `PP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  async _nextReconciliationNumber() {
    const count = await DDDReconciliation.countDocuments();
    return `REC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  /* ── Gateway Config CRUD ── */
  async listGateways(filters = {}) {
    const q = {};
    if (filters.provider) q.provider = filters.provider;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDPaymentGatewayConfig.find(q).sort({ name: 1 }).lean();
  }
  async getGateway(id) { return this._getById(DDDPaymentGatewayConfig, id); }
  async createGateway(data) { return this._create(DDDPaymentGatewayConfig, data); }
  async updateGateway(id, data) { return this._update(DDDPaymentGatewayConfig, id, data, { runValidators: true }); }

  /* ── Transaction Processing ── */
  async listTransactions(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.gatewayId) q.gatewayId = filters.gatewayId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      q.initiatedAt = {};
      if (filters.from) q.initiatedAt.$gte = new Date(filters.from);
      if (filters.to) q.initiatedAt.$lte = new Date(filters.to);
    }
    return DDDTransaction.find(q).sort({ initiatedAt: -1 }).lean();
  }

  async getTransaction(id) { return this._getById(DDDTransaction, id); }

  async initiateTransaction(data) {
    data.transactionNumber = data.transactionNumber || (await this._nextTxnNumber());

    // Calculate fees
    if (data.gatewayId) {
      const gw = await DDDPaymentGatewayConfig.findById(data.gatewayId).lean();
      if (gw && gw.fees) {
        data.fees = (gw.fees.fixedFee || 0) + data.amount * ((gw.fees.percentageFee || 0) / 100);
        data.fees = Math.round(data.fees * 100) / 100;
      }
    }
    data.netAmount = data.amount - (data.fees || 0);
    return DDDTransaction.create(data);
  }

  async completeTransaction(id, response = {}) {
    return DDDTransaction.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        completedAt: new Date(),
        gatewayRef: response.gatewayRef,
        authCode: response.authCode,
        gatewayResponse: response,
      },
      { new: true }
    ).lean();
  }

  async failTransaction(id, errorCode, errorMessage) {
    return DDDTransaction.findByIdAndUpdate(
      id,
      {
        status: 'failed',
        failedAt: new Date(),
        errorCode,
        errorMessage,
      },
      { new: true }
    ).lean();
  }

  async refundTransaction(id, amount, reason) {
    const original = await DDDTransaction.findById(id);
    if (!original) throw new Error('Transaction not found');
    const refundTxn = await this.initiateTransaction({
      type: amount && amount < original.amount ? 'partial_refund' : 'refund',
      amount: amount || original.amount,
      currency: original.currency,
      beneficiaryId: original.beneficiaryId,
      billingAccountId: original.billingAccountId,
      invoiceId: original.invoiceId,
      gatewayId: original.gatewayId,
      parentTransactionId: original._id,
      metadata: { reason, originalTransactionNumber: original.transactionNumber },
    });
    return refundTxn;
  }

  /* ── Payment Plans ── */
  async listPaymentPlans(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.status) q.status = filters.status;
    return DDDPaymentPlan.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPaymentPlan(id) { return this._getById(DDDPaymentPlan, id); }

  async createPaymentPlan(data) {
    data.planNumber = data.planNumber || (await this._nextPlanNumber());
    data.remainingAmount = data.totalAmount - (data.downPayment || 0);
    data.totalRemaining = data.remainingAmount;

    // Generate installments
    const installmentAmount =
      Math.round((data.remainingAmount / data.numberOfInstallments) * 100) / 100;
    const installments = [];
    let currentDate = new Date(data.startDate);

    for (let i = 1; i <= data.numberOfInstallments; i++) {
      const dueDate = new Date(currentDate);
      const isLast = i === data.numberOfInstallments;
      const amt = isLast
        ? data.remainingAmount - installmentAmount * (data.numberOfInstallments - 1)
        : installmentAmount;

      installments.push({
        installmentNumber: i,
        dueDate,
        amount: Math.round(amt * 100) / 100,
      });

      // Advance date based on frequency
      switch (data.frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'bi_weekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'bi_monthly':
          currentDate.setMonth(currentDate.getMonth() + 2);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        default:
          currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    data.installments = installments;
    data.endDate = installments[installments.length - 1]?.dueDate;
    return DDDPaymentPlan.create(data);
  }

  async activatePaymentPlan(id, approvedBy) {
    return DDDPaymentPlan.findByIdAndUpdate(
      id,
      {
        status: 'active',
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  async recordInstallmentPayment(planId, installmentNumber, transactionId, amount) {
    const plan = await DDDPaymentPlan.findById(planId);
    if (!plan) throw new Error('Payment plan not found');
    const inst = plan.installments.find(i => i.installmentNumber === installmentNumber);
    if (!inst) throw new Error('Installment not found');

    inst.paidAmount = (inst.paidAmount || 0) + amount;
    inst.status = inst.paidAmount >= inst.amount ? 'paid' : 'partial';
    inst.paidAt = new Date();
    inst.transactionId = transactionId;

    plan.totalPaid = plan.installments.reduce((s, i) => s + (i.paidAmount || 0), 0);
    plan.totalRemaining = plan.remainingAmount - plan.totalPaid;

    const allPaid = plan.installments.every(i => i.status === 'paid' || i.status === 'waived');
    if (allPaid) plan.status = 'completed';

    await plan.save();
    return plan;
  }

  async getOverdueInstallments() {
    const plans = await DDDPaymentPlan.find({ status: 'active' }).lean();
    const overdue = [];
    const now = new Date();
    for (const plan of plans) {
      for (const inst of plan.installments || []) {
        if (inst.status === 'pending' && new Date(inst.dueDate) < now) {
          overdue.push({
            planId: plan._id,
            planNumber: plan.planNumber,
            beneficiaryId: plan.beneficiaryId,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            dueDate: inst.dueDate,
            daysOverdue: Math.floor((now - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24)),
          });
        }
      }
    }
    return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  /* ── Reconciliation ── */
  async listReconciliations(filters = {}) {
    const q = {};
    if (filters.gatewayId) q.gatewayId = filters.gatewayId;
    if (filters.status) q.status = filters.status;
    return DDDReconciliation.find(q).sort({ createdAt: -1 }).lean();
  }
  async getReconciliation(id) { return this._getById(DDDReconciliation, id); }

  async createReconciliation(data) {
    data.batchNumber = data.batchNumber || (await this._nextReconciliationNumber());
    // Count transactions in period
    const txns = await DDDTransaction.find({
      gatewayId: data.gatewayId,
      initiatedAt: { $gte: new Date(data.periodFrom), $lte: new Date(data.periodTo) },
      status: 'completed',
    }).lean();
    data.totalTransactions = txns.length;
    data.systemTotal = txns.reduce((s, t) => s + (t.amount || 0), 0);
    return DDDReconciliation.create(data);
  }

  async resolveDiscrepancy(reconciliationId, discrepancyIndex, resolution, userId) {
    const rec = await DDDReconciliation.findById(reconciliationId);
    if (!rec) throw new Error('Reconciliation not found');
    if (rec.discrepancies[discrepancyIndex]) {
      rec.discrepancies[discrepancyIndex].resolved = true;
      rec.discrepancies[discrepancyIndex].resolvedBy = userId;
      rec.discrepancies[discrepancyIndex].resolvedAt = new Date();
      rec.discrepancies[discrepancyIndex].resolution = resolution;
    }
    const allResolved = rec.discrepancies.every(d => d.resolved);
    if (allResolved) {
      rec.status = 'resolved';
      rec.completedAt = new Date();
    }
    await rec.save();
    return rec;
  }

  /* ── Revenue Analytics ── */
  async getRevenueAnalytics(from, to) {
    const match = { status: 'completed', type: 'payment' };
    if (from || to) {
      match.completedAt = {};
      if (from) match.completedAt.$gte = new Date(from);
      if (to) match.completedAt.$lte = new Date(to);
    }

    const [byGateway] = await DDDTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$gatewayId',
          total: { $sum: '$amount' },
          fees: { $sum: '$fees' },
          count: { $sum: 1 },
        },
      },
    ]).then(r => [r]);

    const [daily] = await DDDTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).then(r => [r]);

    const totalRevenue = await DDDTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          fees: { $sum: '$fees' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      byGateway: byGateway || [],
      daily: daily || [],
      totals: totalRevenue[0] || { total: 0, fees: 0, count: 0 },
    };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new PaymentGateway();
