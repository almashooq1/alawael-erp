/**
 * Payment Gateway Scheduler — System 38
 * المهام المجدولة لبوابة الدفع الإلكتروني
 *
 * المهام:
 *  1. retryFailedPayments    — إعادة محاولة المدفوعات الفاشلة (كل 15 دقيقة)
 *  2. reportPendingZATCA     — إرسال الفواتير لنظام ZATCA (يومياً 02:00)
 *  3. expireOldTransactions  — إنهاء صلاحية المعاملات المنتهية (يومياً 01:30)
 */

'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger');
const PaymentTransaction = require('../models/PaymentTransaction');
const paymentGatewayService = require('../services/paymentGateway.service');

// ─── مساعد: قياس وقت التنفيذ ──────────────────────────────────────────────────
function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(2);
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 1: إعادة محاولة المدفوعات الفاشلة — كل 15 دقيقة
// ══════════════════════════════════════════════════════════════════════════════

async function retryFailedPayments() {
  const start = Date.now();
  logger.info('[Scheduler][PaymentRetry] بدء إعادة محاولة المدفوعات الفاشلة...');

  try {
    const results = await paymentGatewayService.retryFailedPayments();
    logger.info(
      `[Scheduler][PaymentRetry] ✅ مكتمل — أعيدت: ${results.retried} | فشلت: ${results.failed} | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][PaymentRetry] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 2: إرسال الفواتير المعلقة لنظام ZATCA — يومياً الساعة 02:00
// ══════════════════════════════════════════════════════════════════════════════

async function reportPendingZATCA() {
  const start = Date.now();
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const targetDate = date.toISOString().split('T')[0];

  logger.info(`[Scheduler][ZATCA] بدء إرسال فواتير ${targetDate} لنظام ZATCA...`);

  try {
    const pendingTxns = await PaymentTransaction.find({
      status: 'paid',
      zatcaReported: { $ne: true },
      zatcaInvoiceUuid: { $exists: true, $ne: null },
      deletedAt: null,
    })
      .select('_id transactionNumber zatcaInvoiceUuid zatcaInvoiceHash')
      .limit(500)
      .lean();

    if (pendingTxns.length === 0) {
      logger.info('[Scheduler][ZATCA] لا توجد فواتير معلقة للإرسال.');
      return;
    }

    let reported = 0;
    let failed = 0;

    for (const tx of pendingTxns) {
      try {
        // في بيئة الإنتاج: إرسال الفاتورة عبر ZATCA API
        // حالياً: تحديث حالة الإرسال مباشرة (mock)
        await PaymentTransaction.findByIdAndUpdate(tx._id, {
          zatcaReported: true,
          zatcaReportedAt: new Date(),
        });
        reported++;
        logger.debug(`[Scheduler][ZATCA] ✓ ${tx.transactionNumber}`);
      } catch (err) {
        failed++;
        logger.warn(`[Scheduler][ZATCA] فشل: ${tx.transactionNumber} — ${err.message}`);
      }
    }

    logger.info(
      `[Scheduler][ZATCA] ✅ مكتمل — أُرسل: ${reported} | فشل: ${failed} | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][ZATCA] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 3: إنهاء صلاحية المعاملات المنتهية — يومياً الساعة 01:30
// ══════════════════════════════════════════════════════════════════════════════

async function expireOldTransactions() {
  const start = Date.now();
  logger.info('[Scheduler][PaymentExpiry] بدء إنهاء صلاحية المعاملات المنتهية...');

  try {
    const result = await PaymentTransaction.updateMany(
      {
        status: 'pending',
        expiresAt: { $lte: new Date() },
        deletedAt: null,
      },
      {
        $set: { status: 'expired', updatedAt: new Date() },
      }
    );

    logger.info(
      `[Scheduler][PaymentExpiry] ✅ مكتمل — انتهت صلاحية: ${result.modifiedCount} معاملة | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][PaymentExpiry] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// تسجيل الجداول الزمنية
// ══════════════════════════════════════════════════════════════════════════════

function register() {
  // كل 15 دقيقة: إعادة محاولة المدفوعات الفاشلة
  cron.schedule('*/15 * * * *', retryFailedPayments, {
    name: 'payment-retry-failed',
    timezone: 'Asia/Riyadh',
  });

  // يومياً 02:00: إرسال الفواتير لـ ZATCA
  cron.schedule('0 2 * * *', reportPendingZATCA, {
    name: 'zatca-daily-report',
    timezone: 'Asia/Riyadh',
  });

  // يومياً 01:30: إنهاء صلاحية المعاملات المنتهية
  cron.schedule('30 1 * * *', expireOldTransactions, {
    name: 'payment-expire-old',
    timezone: 'Asia/Riyadh',
  });

  logger.info(
    '[Scheduler][PaymentGateway] ✅ تم تسجيل 3 مهام: retry-failed, zatca-report, expire-old'
  );
}

module.exports = { register, retryFailedPayments, reportPendingZATCA, expireOldTransactions };
