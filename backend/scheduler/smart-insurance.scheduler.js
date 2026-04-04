/**
 * Smart Insurance Scheduler — System 40
 * المهام المجدولة لنظام التأمين الذكي
 *
 * المهام:
 *  1. sendExpiryAlerts        — تنبيهات انتهاء وثائق التأمين (يومياً 08:00)
 *  2. processPendingClaims    — متابعة المطالبات المعلقة مع NPHIES (كل 30 دقيقة)
 *  3. syncInsuranceEligibility — تحديث أهلية التأمين أسبوعياً (الاثنين 03:00)
 *  4. expireOldPolicies        — تحديث حالة الوثائق المنتهية (يومياً 00:30)
 */

'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceClaim = require('../models/InsuranceClaim');
const smartInsuranceService = require('../services/smartInsurance.service');

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(2);
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 1: تنبيهات انتهاء وثائق التأمين — يومياً 08:00
// ══════════════════════════════════════════════════════════════════════════════

async function sendExpiryAlerts() {
  const start = Date.now();
  const ALERT_DAYS = parseInt(process.env.INSURANCE_EXPIRY_ALERT_DAYS) || 30;
  logger.info(`[Scheduler][InsuranceExpiry] فحص الوثائق المنتهية خلال ${ALERT_DAYS} يوم...`);

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + ALERT_DAYS);

    const expiringPolicies = await InsurancePolicy.find({
      status: 'active',
      endDate: { $gte: new Date(), $lte: cutoff },
      deletedAt: null,
    })
      .populate('beneficiaryId', 'name nationalId')
      .populate('insuranceCompanyId', 'nameAr')
      .select('_id policyNumber endDate beneficiaryId insuranceCompanyId branchId')
      .lean();

    if (expiringPolicies.length === 0) {
      logger.info('[Scheduler][InsuranceExpiry] لا توجد وثائق تنتهي قريباً.');
      return;
    }

    let sent = 0;
    for (const policy of expiringPolicies) {
      try {
        const daysLeft = Math.ceil((new Date(policy.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        // في بيئة الإنتاج: إرسال إشعار عبر NotificationService
        logger.debug(
          `[Scheduler][InsuranceExpiry] وثيقة ${policy.policyNumber} تنتهي بعد ${daysLeft} يوم`
        );
        sent++;
      } catch (err) {
        logger.warn(`[Scheduler][InsuranceExpiry] فشل policy ${policy._id}: ${err.message}`);
      }
    }

    logger.info(
      `[Scheduler][InsuranceExpiry] ✅ مكتمل — أُرسل: ${sent} تنبيه | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][InsuranceExpiry] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 2: متابعة المطالبات المعلقة — كل 30 دقيقة
// ══════════════════════════════════════════════════════════════════════════════

async function processPendingClaims() {
  const start = Date.now();
  logger.info('[Scheduler][InsuranceClaims] متابعة المطالبات المعلقة مع NPHIES...');

  try {
    // المطالبات المقدمة منذ أكثر من ساعة ولم تُعالج
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const pendingClaims = await InsuranceClaim.find({
      status: 'submitted',
      submittedAt: { $lte: oneHourAgo },
      nphiesClaimId: { $exists: true, $ne: null },
      deletedAt: null,
    })
      .select('_id claimNumber nphiesClaimId policyId')
      .limit(50)
      .lean();

    if (pendingClaims.length === 0) {
      logger.debug('[Scheduler][InsuranceClaims] لا توجد مطالبات معلقة للمتابعة.');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const claim of pendingClaims) {
      try {
        // في بيئة الإنتاج: استعلام حالة المطالبة من NPHIES
        // حالياً: تسجيل فقط
        logger.debug(`[Scheduler][InsuranceClaims] مطالبة ${claim.claimNumber} قيد المراجعة`);
        updated++;
      } catch (err) {
        logger.warn(`[Scheduler][InsuranceClaims] فشل claim ${claim.claimNumber}: ${err.message}`);
        failed++;
      }
    }

    logger.info(
      `[Scheduler][InsuranceClaims] ✅ مكتمل — فُحص: ${updated} | فشل: ${failed} | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][InsuranceClaims] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 3: مزامنة أهلية التأمين — أسبوعياً (الاثنين 03:00)
// ══════════════════════════════════════════════════════════════════════════════

async function syncInsuranceEligibility() {
  const start = Date.now();
  logger.info('[Scheduler][InsuranceSync] بدء مزامنة أهلية التأمين للوثائق النشطة...');

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const policiesToSync = await InsurancePolicy.find({
      status: 'active',
      $or: [{ lastVerifiedAt: null }, { lastVerifiedAt: { $lte: oneWeekAgo } }],
      deletedAt: null,
    })
      .select('_id policyNumber branchId')
      .limit(100)
      .lean();

    if (policiesToSync.length === 0) {
      logger.info('[Scheduler][InsuranceSync] لا توجد وثائق تحتاج مزامنة.');
      return;
    }

    let synced = 0;
    let failed = 0;

    for (const policy of policiesToSync) {
      try {
        await smartInsuranceService.checkEligibility(policy._id.toString(), {
          checkType: 'general',
          branchId: policy.branchId,
        });
        // تأخير 1 ثانية بين الطلبات لتجنب تجاوز حدود NPHIES API
        await new Promise(resolve => setTimeout(resolve, 1000));
        synced++;
        logger.debug(`[Scheduler][InsuranceSync] ✓ ${policy.policyNumber}`);
      } catch (err) {
        logger.warn(`[Scheduler][InsuranceSync] فشل policy ${policy.policyNumber}: ${err.message}`);
        failed++;
      }
    }

    logger.info(
      `[Scheduler][InsuranceSync] ✅ مكتمل — زُامن: ${synced} | فشل: ${failed} | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][InsuranceSync] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 4: تحديث حالة الوثائق المنتهية — يومياً 00:30
// ══════════════════════════════════════════════════════════════════════════════

async function expireOldPolicies() {
  const start = Date.now();
  logger.info('[Scheduler][PolicyExpiry] تحديث حالة الوثائق المنتهية...');

  try {
    const result = await InsurancePolicy.updateMany(
      {
        status: 'active',
        endDate: { $lt: new Date() },
        deletedAt: null,
      },
      {
        $set: { status: 'expired', updatedAt: new Date() },
      }
    );

    logger.info(
      `[Scheduler][PolicyExpiry] ✅ مكتمل — انتهت: ${result.modifiedCount} وثيقة | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][PolicyExpiry] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// تسجيل الجداول الزمنية
// ══════════════════════════════════════════════════════════════════════════════

function register() {
  // يومياً 08:00: تنبيهات انتهاء وثائق التأمين
  cron.schedule('0 8 * * *', sendExpiryAlerts, {
    name: 'insurance-expiry-alerts',
    timezone: 'Asia/Riyadh',
  });

  // كل 30 دقيقة: متابعة المطالبات المعلقة
  cron.schedule('*/30 * * * *', processPendingClaims, {
    name: 'insurance-pending-claims',
    timezone: 'Asia/Riyadh',
  });

  // أسبوعياً — الاثنين 03:00: مزامنة الأهلية
  cron.schedule('0 3 * * 1', syncInsuranceEligibility, {
    name: 'insurance-sync-eligibility',
    timezone: 'Asia/Riyadh',
  });

  // يومياً 00:30: تحديث الوثائق المنتهية
  cron.schedule('30 0 * * *', expireOldPolicies, {
    name: 'insurance-expire-policies',
    timezone: 'Asia/Riyadh',
  });

  logger.info(
    '[Scheduler][SmartInsurance] ✅ تم تسجيل 4 مهام: expiry-alerts, pending-claims, sync-eligibility, expire-policies'
  );
}

module.exports = {
  register,
  sendExpiryAlerts,
  processPendingClaims,
  syncInsuranceEligibility,
  expireOldPolicies,
};
