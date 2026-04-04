/**
 * Wallet Scheduler — System 39
 * المهام المجدولة للمحفظة الرقمية
 *
 * المهام:
 *  1. expireLoyaltyPoints — إنهاء صلاحية نقاط الولاء المنتهية (يومياً 01:00)
 *  2. sendLowBalanceAlerts — تنبيهات الرصيد المنخفض (يومياً 09:00)
 */

'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger');
const DigitalWallet = require('../models/DigitalWallet');
const LoyaltyPointsTransaction = require('../models/LoyaltyPointsTransaction');

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(2);
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 1: إنهاء صلاحية نقاط الولاء المنتهية — يومياً 01:00
// ══════════════════════════════════════════════════════════════════════════════

async function expireLoyaltyPoints() {
  const start = Date.now();
  logger.info('[Scheduler][LoyaltyExpiry] بدء إنهاء صلاحية نقاط الولاء المنتهية...');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // إيجاد معاملات النقاط المكتسبة والمنتهية
    const expiredPoints = await LoyaltyPointsTransaction.find({
      type: 'earn',
      expiresAt: { $lt: today },
      deletedAt: null,
    })
      .select('_id walletId points branchId')
      .limit(1000)
      .lean();

    if (expiredPoints.length === 0) {
      logger.info('[Scheduler][LoyaltyExpiry] لا توجد نقاط منتهية الصلاحية.');
      return;
    }

    let expired = 0;
    let skipped = 0;

    for (const pts of expiredPoints) {
      try {
        const wallet = await DigitalWallet.findById(pts.walletId);
        if (!wallet || wallet.loyaltyPoints < pts.points) {
          skipped++;
          continue;
        }

        const balanceBefore = wallet.loyaltyPoints;
        await DigitalWallet.findByIdAndUpdate(pts.walletId, {
          $inc: { loyaltyPoints: -pts.points },
        });

        await LoyaltyPointsTransaction.create({
          branchId: pts.branchId,
          walletId: pts.walletId,
          type: 'expire',
          points: pts.points,
          balanceBefore,
          balanceAfter: balanceBefore - pts.points,
          description: 'انتهاء صلاحية النقاط',
          createdAt: new Date(),
        });

        // تحديث سجل النقاط الأصلي لتجنب التكرار
        await LoyaltyPointsTransaction.findByIdAndUpdate(pts._id, {
          expiresAt: null, // إزالة تاريخ الانتهاء بعد المعالجة
        });

        expired++;
      } catch (err) {
        logger.warn(`[Scheduler][LoyaltyExpiry] فشل wallet ${pts.walletId}: ${err.message}`);
        skipped++;
      }
    }

    logger.info(
      `[Scheduler][LoyaltyExpiry] ✅ مكتمل — انتهت: ${expired} | تجاوز: ${skipped} | الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][LoyaltyExpiry] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// المهمة 2: تنبيهات الرصيد المنخفض — يومياً 09:00
// ══════════════════════════════════════════════════════════════════════════════

async function sendLowBalanceAlerts() {
  const start = Date.now();
  const LOW_BALANCE_THRESHOLD = 50; // SAR
  logger.info(
    `[Scheduler][WalletAlert] فحص المحافظ ذات الرصيد المنخفض (< ${LOW_BALANCE_THRESHOLD} SAR)...`
  );

  try {
    const lowBalanceWallets = await DigitalWallet.find({
      status: 'active',
      isBlocked: false,
      balance: { $gt: 0, $lt: LOW_BALANCE_THRESHOLD },
      deletedAt: null,
    })
      .select('_id walletNumber balance ownerId ownerType branchId')
      .limit(500)
      .lean();

    if (lowBalanceWallets.length === 0) {
      logger.info('[Scheduler][WalletAlert] لا توجد محافظ بالرصيد المنخفض.');
      return;
    }

    // في بيئة الإنتاج: إرسال إشعارات للمستخدمين عبر NotificationService
    // حالياً: تسجيل فقط
    logger.info(
      `[Scheduler][WalletAlert] ✅ ${lowBalanceWallets.length} محفظة برصيد منخفض — الوقت: ${elapsed(start)}s`
    );
  } catch (err) {
    logger.error(`[Scheduler][WalletAlert] ❌ خطأ: ${err.message}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// تسجيل الجداول الزمنية
// ══════════════════════════════════════════════════════════════════════════════

function register() {
  // يومياً 01:00: إنهاء صلاحية نقاط الولاء
  cron.schedule('0 1 * * *', expireLoyaltyPoints, {
    name: 'wallet-expire-loyalty',
    timezone: 'Asia/Riyadh',
  });

  // يومياً 09:00: تنبيهات الرصيد المنخفض
  cron.schedule('0 9 * * *', sendLowBalanceAlerts, {
    name: 'wallet-low-balance-alert',
    timezone: 'Asia/Riyadh',
  });

  logger.info('[Scheduler][Wallet] ✅ تم تسجيل 2 مهام: expire-loyalty, low-balance-alert');
}

module.exports = { register, expireLoyaltyPoints, sendLowBalanceAlerts };
