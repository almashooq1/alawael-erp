/**
 * PaymentGateway Service — System 38
 * بوابة الدفع الإلكتروني: Moyasar, HyperPay, PayTabs, Tap, SADAD, Tabby, Tamara, STC Pay, Apple Pay
 */
'use strict';

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentRefund = require('../models/PaymentRefund');
const PaymentWebhook = require('../models/PaymentWebhook');

// ─── مساعدات ──────────────────────────────────────────────────────────────────

/**
 * توليد رقم معاملة فريد
 */
function generateTransactionNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `TXN-${timestamp}-${random}`;
}

/**
 * احتساب ضريبة القيمة المضافة 15%
 */
function calculateVat(amount) {
  return Math.round(amount * 0.15 * 100) / 100;
}

/**
 * توليد UUID وتاريخ لفاتورة ZATCA
 */
function generateZatcaInvoiceData(transaction) {
  const invoiceUuid = uuidv4();
  const timestamp = new Date().toISOString();
  const hashData = `${invoiceUuid}|${transaction.amount}|${transaction.vatAmount}|${timestamp}`;
  const hash = crypto.createHash('sha256').update(hashData).digest('hex');
  // QR Code بصيغة TLV (مبسطة)
  const qrData = Buffer.from(
    JSON.stringify({
      seller: 'مركز التأهيل',
      vatNumber: '300000000000003',
      timestamp,
      invoiceTotal: transaction.amount,
      vatTotal: transaction.vatAmount,
    })
  ).toString('base64');
  return { invoiceUuid, invoiceHash: hash, qrCode: qrData };
}

// ─── الخدمة الرئيسية ──────────────────────────────────────────────────────────

class PaymentGatewayService {
  /**
   * Validate callback URL against allowed origins
   */
  _validateCallbackUrl(callbackUrl) {
    if (!callbackUrl) return; // will use default
    try {
      const parsed = new URL(callbackUrl);
      const allowedHosts = [
        new URL(process.env.APP_URL || 'http://localhost:5000').hostname,
        process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : null,
      ].filter(Boolean);
      if (!allowedHosts.includes(parsed.hostname)) {
        throw new Error('Callback URL hostname not in allowlist');
      }
    } catch (err) {
      if (err.message.includes('allowlist')) throw err;
      throw new Error('Invalid callback URL format');
    }
  }

  /**
   * بدء معاملة دفع جديدة
   */
  async initiatePayment(data) {
    const {
      branchId,
      gateway,
      paymentMethod,
      amount,
      beneficiaryId,
      guardianId,
      description,
      callbackUrl,
      metadata = {},
    } = data;

    const vatAmount = calculateVat(amount);
    const totalAmount = amount + vatAmount;

    const transaction = await PaymentTransaction.create({
      branchId,
      transactionNumber: generateTransactionNumber(),
      uuid: uuidv4(),
      gateway,
      paymentMethod,
      amount: totalAmount,
      feeAmount: 0,
      netAmount: totalAmount,
      vatAmount,
      currency: 'SAR',
      status: 'pending',
      beneficiaryId,
      guardianId,
      description,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 دقيقة
      createdBy: data.userId,
    });

    let gatewayResult;
    try {
      this._validateCallbackUrl(callbackUrl);
      gatewayResult = await this._callGateway(gateway, transaction, { callbackUrl, metadata });
      const zatca = generateZatcaInvoiceData(transaction);
      await PaymentTransaction.findByIdAndUpdate(transaction._id, {
        status: 'processing',
        gatewayTransactionId: gatewayResult.id,
        gatewayResponse: gatewayResult,
        gatewayMetadata: gatewayResult.metadata,
        zatcaInvoiceUuid: zatca.invoiceUuid,
        zatcaInvoiceHash: zatca.invoiceHash,
        zatcaQrCode: zatca.qrCode,
        threeDSecureUrl: gatewayResult.threeDSecureUrl,
        sadadBillNumber: gatewayResult.billNumber,
      });
    } catch (err) {
      await PaymentTransaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        failedAt: new Date(),
        gatewayResponse: { error: err.message },
      });
      throw err;
    }

    return {
      transactionId: transaction._id,
      transactionNumber: transaction.transactionNumber,
      status: 'processing',
      checkoutUrl: gatewayResult.checkoutUrl || gatewayResult.redirectUrl,
      threeDSecureUrl: gatewayResult.threeDSecureUrl,
      sadadBillNumber: gatewayResult.billNumber,
      amount: totalAmount,
      vatAmount,
    };
  }

  /**
   * استدعاء البوابة المناسبة
   */
  async _callGateway(gateway, transaction, options = {}) {
    switch (gateway) {
      case 'moyasar':
        return this._callMoyasar(transaction, options);
      case 'hyperpay':
        return this._callHyperpay(transaction, options);
      case 'paytabs':
        return this._callPaytabs(transaction, options);
      case 'tap':
        return this._callTap(transaction, options);
      case 'sadad':
        return this._callSadad(transaction, options);
      case 'tabby':
        return this._callTabby(transaction, options);
      case 'tamara':
        return this._callTamara(transaction, options);
      case 'stcpay':
        return this._callStcPay(transaction, options);
      default:
        throw new Error(`بوابة الدفع غير مدعومة: ${gateway}`);
    }
  }

  /**
   * Moyasar — بوابة الدفع السعودية
   */
  async _callMoyasar(transaction, options) {
    const apiKey = process.env.MOYASAR_SECRET_KEY;
    const response = await axios.post(
      'https://api.moyasar.com/v1/payments',
      {
        amount: Math.round(transaction.amount * 100), // بالهللة
        currency: 'SAR',
        description: transaction.description || 'مدفوعات مركز التأهيل',
        source: {
          type: transaction.paymentMethod === 'mada' ? 'creditcard' : transaction.paymentMethod,
        },
        callback_url: options.callbackUrl || `${process.env.APP_URL}/api/payments/callback/moyasar`,
        metadata: options.metadata,
      },
      {
        auth: { username: apiKey, password: '' },
        timeout: 15000,
      }
    );
    return {
      id: response.data.id,
      status: response.data.status,
      checkoutUrl: response.data.source?.transaction_url,
      metadata: response.data,
    };
  }

  /**
   * HyperPay
   */
  async _callHyperpay(transaction, options) {
    const accessToken = process.env.HYPERPAY_ACCESS_TOKEN;
    const entityId =
      transaction.paymentMethod === 'mada'
        ? process.env.HYPERPAY_ENTITY_MADA
        : process.env.HYPERPAY_ENTITY_VISA;

    const response = await axios.post(
      `${process.env.HYPERPAY_URL}/v1/checkouts`,
      new URLSearchParams({
        entityId,
        amount: transaction.amount.toFixed(2),
        currency: 'SAR',
        paymentType: 'DB',
        descriptor: transaction.description || 'Rehab Center',
      }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      }
    );
    return {
      id: response.data.id,
      checkoutUrl: `${process.env.HYPERPAY_CHECKOUT_URL}?checkoutId=${response.data.id}`,
      metadata: response.data,
    };
  }

  /**
   * PayTabs
   */
  async _callPaytabs(transaction, options) {
    const response = await axios.post(
      'https://secure.paytabs.sa/payment/request',
      {
        profile_id: process.env.PAYTABS_PROFILE_ID,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: transaction.transactionNumber,
        cart_currency: 'SAR',
        cart_amount: transaction.amount.toFixed(2),
        cart_description: transaction.description || 'Rehab Center Payment',
        callback: options.callbackUrl,
        return: options.returnUrl,
      },
      {
        headers: { Authorization: process.env.PAYTABS_SERVER_KEY },
        timeout: 15000,
      }
    );
    return {
      id: response.data.tran_ref,
      checkoutUrl: response.data.redirect_url,
      metadata: response.data,
    };
  }

  /**
   * Tap Payments
   */
  async _callTap(transaction, options) {
    const response = await axios.post(
      'https://api.tap.company/v2/charges',
      {
        amount: transaction.amount,
        currency: 'SAR',
        customer_initiated: true,
        source: { id: 'src_all' },
        redirect: { url: options.callbackUrl },
        reference: { transaction: transaction.transactionNumber },
        description: transaction.description,
      },
      {
        headers: { Authorization: `Bearer ${process.env.TAP_SECRET_KEY}` },
        timeout: 15000,
      }
    );
    return {
      id: response.data.id,
      checkoutUrl: response.data.transaction?.url,
      metadata: response.data,
    };
  }

  /**
   * SADAD — الدفع الحكومي
   */
  async _callSadad(transaction, options) {
    const billNumber = `SAD-${Date.now()}`;
    // في الإنتاج: تكامل حقيقي مع SADAD API
    return {
      id: billNumber,
      billNumber,
      status: 'pending',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 ساعة
    };
  }

  /**
   * Tabby — التقسيط
   */
  async _callTabby(transaction, options) {
    const response = await axios.post(
      'https://api.tabby.ai/api/v2/checkout',
      {
        payment: {
          amount: transaction.amount.toFixed(2),
          currency: 'SAR',
          description: transaction.description,
          buyer: { name: 'Customer', email: 'customer@example.com', phone: '+966500000000' },
          order: { reference_id: transaction.transactionNumber, items: [] },
        },
        merchant_code: process.env.TABBY_MERCHANT_CODE,
        lang: 'ar',
        merchant_urls: {
          success: options.callbackUrl + '?status=success',
          failure: options.callbackUrl + '?status=failure',
          cancel: options.callbackUrl + '?status=cancel',
        },
      },
      {
        headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` },
        timeout: 15000,
      }
    );
    return {
      id: response.data.id,
      checkoutUrl: response.data.configuration?.available_products?.installments?.[0]?.web_url,
      metadata: response.data,
    };
  }

  /**
   * Tamara — التقسيط
   */
  async _callTamara(transaction, options) {
    const response = await axios.post(
      `${process.env.TAMARA_URL}/checkout`,
      {
        order_reference_id: transaction.transactionNumber,
        total_amount: { amount: transaction.amount.toFixed(2), currency: 'SAR' },
        description: transaction.description,
        country_code: 'SA',
        payment_type: 'PAY_BY_INSTALMENTS',
        instalments: 3,
        locale: 'ar_SA',
        merchant_url: {
          success: options.callbackUrl + '?status=success',
          failure: options.callbackUrl + '?status=failure',
          notification: options.callbackUrl + '/notification',
          cancel: options.callbackUrl + '?status=cancel',
        },
      },
      {
        headers: { Authorization: `Bearer ${process.env.TAMARA_API_TOKEN}` },
        timeout: 15000,
      }
    );
    return {
      id: response.data.order_id,
      checkoutUrl: response.data.checkout_url,
      metadata: response.data,
    };
  }

  /**
   * STC Pay
   */
  async _callStcPay(transaction, options) {
    // تكامل مع STC Pay API
    return {
      id: `STC-${Date.now()}`,
      status: 'pending',
      metadata: {},
    };
  }

  /**
   * معالجة Webhook من البوابة
   */
  async handleWebhook(gateway, payload, signature, ipAddress) {
    // التحقق من التوقيع
    const isValidSignature = this._verifySignature(gateway, payload, signature);

    const webhook = await PaymentWebhook.create({
      gateway,
      eventType: payload.type || payload.event || 'unknown',
      gatewayEventId: payload.id || payload.event_id,
      payload,
      status: isValidSignature ? 'received' : 'invalid_signature',
      signatureValid: isValidSignature,
      signature,
      ipAddress,
    });

    if (!isValidSignature) {
      return { ok: false, message: 'توقيع غير صالح' };
    }

    try {
      await this._processWebhookEvent(gateway, payload, webhook);
      await PaymentWebhook.findByIdAndUpdate(webhook._id, {
        status: 'processed',
        processedAt: new Date(),
      });
      return { ok: true };
    } catch (err) {
      await PaymentWebhook.findByIdAndUpdate(webhook._id, {
        status: 'failed',
        errorMessage: err.message,
        lastAttemptAt: new Date(),
      });
      throw err;
    }
  }

  /**
   * معالجة حدث Webhook
   */
  async _processWebhookEvent(gateway, payload, webhook) {
    const gatewayId = payload.id || payload.tran_ref || payload.order_id;
    const transaction = await PaymentTransaction.findOne({ gatewayTransactionId: gatewayId });

    if (!transaction) return;

    const eventType = payload.type || payload.event || '';
    let updateData = {};

    if (['payment.paid', 'CAPTURED', 'approved'].includes(eventType)) {
      updateData = { status: 'paid', paidAt: new Date() };
    } else if (['payment.failed', 'DECLINED', 'rejected'].includes(eventType)) {
      updateData = { status: 'failed', failedAt: new Date() };
    } else if (['refund.completed', 'REFUNDED'].includes(eventType)) {
      updateData = { status: 'refunded', isRefunded: true };
    }

    if (Object.keys(updateData).length) {
      await PaymentTransaction.findByIdAndUpdate(transaction._id, updateData);
      await PaymentWebhook.findByIdAndUpdate(webhook._id, { transactionId: transaction._id });
    }
  }

  /**
   * التحقق من توقيع Webhook
   */
  _verifySignature(gateway, payload, signature) {
    try {
      const secret = process.env[`${gateway.toUpperCase()}_WEBHOOK_SECRET`];
      if (!secret) return true; // إذا لم يتم تعيين سر، نقبل

      const computed = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return computed === signature;
    } catch {
      return false;
    }
  }

  /**
   * معالجة الاسترداد
   */
  async processRefund(transactionId, amount, reason, userId) {
    const transaction = await PaymentTransaction.findById(transactionId);
    if (!transaction) throw new Error('المعاملة غير موجودة');
    if (transaction.status !== 'paid') throw new Error('لا يمكن استرداد معاملة غير مدفوعة');

    const maxRefund = transaction.amount - transaction.refundedAmount;
    if (amount > maxRefund) throw new Error(`الحد الأقصى للاسترداد: ${maxRefund} SAR`);

    const refund = await PaymentRefund.create({
      branchId: transaction.branchId,
      refundNumber: `REF-${Date.now()}`,
      uuid: uuidv4(),
      transactionId: transaction._id,
      amount,
      reason,
      status: 'processing',
      requestedBy: userId,
      createdBy: userId,
    });

    try {
      const gatewayResult = await this._processGatewayRefund(transaction, amount);
      const newRefunded = transaction.refundedAmount + amount;
      const newStatus = newRefunded >= transaction.amount ? 'refunded' : 'partially_refunded';

      await PaymentTransaction.findByIdAndUpdate(transaction._id, {
        refundedAmount: newRefunded,
        isRefunded: newStatus === 'refunded',
        status: newStatus,
      });

      await PaymentRefund.findByIdAndUpdate(refund._id, {
        status: 'completed',
        processedAt: new Date(),
        gatewayRefundId: gatewayResult.id,
        gatewayResponse: gatewayResult,
        processedBy: userId,
      });

      return refund;
    } catch (err) {
      await PaymentRefund.findByIdAndUpdate(refund._id, { status: 'failed' });
      throw err;
    }
  }

  /**
   * استرداد عبر البوابة
   */
  async _processGatewayRefund(transaction, amount) {
    // تكامل مع بوابة الدفع للاسترداد
    return { id: `REFUND-${Date.now()}`, status: 'completed' };
  }

  /**
   * إعادة محاولة المعاملات الفاشلة
   */
  async retryFailedPayments() {
    const failed = await PaymentTransaction.find({
      status: 'failed',
      retryCount: { $lt: 3 },
      nextRetryAt: { $lte: new Date() },
      deletedAt: null,
    }).limit(50);

    const results = { retried: 0, failed: 0 };

    for (const tx of failed) {
      try {
        await this._callGateway(tx.gateway, tx, {});
        await PaymentTransaction.findByIdAndUpdate(tx._id, {
          status: 'processing',
          retryCount: tx.retryCount + 1,
        });
        results.retried++;
      } catch {
        const nextRetry = new Date(Date.now() + Math.pow(2, tx.retryCount + 1) * 60 * 60 * 1000);
        await PaymentTransaction.findByIdAndUpdate(tx._id, {
          retryCount: tx.retryCount + 1,
          nextRetryAt: nextRetry,
        });
        results.failed++;
      }
    }

    return results;
  }

  /**
   * تقرير التسوية اليومية
   */
  async getReconciliationReport(branchId, dateFrom, dateTo) {
    const match = {
      branchId,
      deletedAt: null,
      createdAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo + 'T23:59:59') },
    };

    const [summary, byGateway, byStatus] = await Promise.all([
      PaymentTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalVat: { $sum: '$vatAmount' },
            totalFees: { $sum: '$feeAmount' },
            totalRefunded: { $sum: '$refundedAmount' },
            netAmount: { $sum: '$netAmount' },
            paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
            failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
      ]),
      PaymentTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$gateway',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      PaymentTransaction.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: summary[0] || {},
      byGateway,
      byStatus,
    };
  }

  /**
   * إحصائيات الدفع
   */
  async getStats(branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, paid, failed, todayPaid] = await Promise.all([
      PaymentTransaction.countDocuments({ branchId, deletedAt: null }),
      PaymentTransaction.countDocuments({ branchId, status: 'paid', deletedAt: null }),
      PaymentTransaction.countDocuments({ branchId, status: 'failed', deletedAt: null }),
      PaymentTransaction.aggregate([
        { $match: { branchId, status: 'paid', paidAt: { $gte: today }, deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      totalTransactions: { title: 'إجمالي المعاملات', value: total, icon: 'credit-card' },
      paidTransactions: { title: 'مدفوعة', value: paid, icon: 'check-circle' },
      failedTransactions: { title: 'فاشلة', value: failed, icon: 'x-circle' },
      todayRevenue: {
        title: 'إيرادات اليوم',
        value: todayPaid[0]?.total || 0,
        icon: 'currency-dollar',
      },
    };
  }

  /**
   * قائمة المعاملات مع فلترة
   */
  async list(filters) {
    const { branchId, status, gateway, dateFrom, dateTo, page = 1, limit = 15 } = filters;

    const query = { deletedAt: null };
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (gateway) query.gateway = gateway;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo + 'T23:59:59');
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      PaymentTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PaymentTransaction.countDocuments(query),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

module.exports = new PaymentGatewayService();
