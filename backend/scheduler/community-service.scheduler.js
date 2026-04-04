/**
 * Community Service Scheduler — System 42
 * المهام المجدولة لنظام الخدمة المجتمعية
 *
 * Jobs:
 *  - community:events-reminder     → يومياً 08:00 (تذكير فعاليات خلال 48 ساعة)
 *  - community:csr-report          → آخر يوم في الشهر 23:00
 *  - community:referrals-followup  → يومياً 09:00 (متابعة الإحالات المعلقة)
 */

'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger') || console;

let CommunityEvent, CommunityReferral, CommunityDonation, CommunityProgram;

const loadModels = () => {
  if (!CommunityEvent) {
    CommunityEvent = require('../models/CommunityEvent');
    CommunityReferral = require('../models/CommunityReferral');
    CommunityDonation = require('../models/CommunityDonation');
    CommunityProgram = require('../models/CommunityProgram');
  }
};

// ─────────────────────────────────────────────
// JOB 1: تذكير بالفعاليات القادمة خلال 48 ساعة
// يومياً الساعة 08:00
// ─────────────────────────────────────────────
const eventsReminderJob = cron.schedule(
  '0 8 * * *',
  async () => {
    const start = Date.now();
    logger.info('[community-service.scheduler] بدء: community:events-reminder');
    try {
      loadModels();

      const in48h = new Date(Date.now() + 48 * 3600 * 1000);
      const today = new Date();

      const events = await CommunityEvent.find({
        status: 'upcoming',
        eventDate: { $gte: today, $lte: in48h },
        deletedAt: null,
      }).lean();

      logger.info('[community-service.scheduler] فعاليات قادمة خلال 48 ساعة:', {
        count: events.length,
        events: events.map(e => ({ id: e._id, title: e.title, date: e.eventDate })),
        elapsed: `${Date.now() - start}ms`,
      });

      // TODO: إرسال إشعارات للمسؤولين والمسجلين
    } catch (err) {
      logger.error('[community-service.scheduler] فشل community:events-reminder:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// JOB 2: توليد تقرير المسؤولية الاجتماعية الشهري
// آخر يوم في الشهر الساعة 23:00
// ─────────────────────────────────────────────
const csrReportJob = cron.schedule(
  '0 23 28-31 * *',
  async () => {
    // تنفيذ فقط في آخر يوم من الشهر
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDate() !== 1) return; // ليس آخر يوم في الشهر

    const start = Date.now();
    logger.info('[community-service.scheduler] بدء: community:csr-report');
    try {
      loadModels();

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [programsActive, eventsCompleted, donationsSum] = await Promise.all([
        CommunityProgram.countDocuments({ status: 'active', deletedAt: null }),
        CommunityEvent.countDocuments({
          status: 'completed',
          eventDate: { $gte: monthStart, $lt: monthEnd },
          deletedAt: null,
        }),
        CommunityDonation.aggregate([
          {
            $match: {
              status: 'received',
              donationDate: { $gte: monthStart, $lt: monthEnd },
              deletedAt: null,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const report = {
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        programsActive,
        eventsCompleted,
        donationsReceived: donationsSum[0]?.total || 0,
      };

      logger.info('[community-service.scheduler] تقرير CSR الشهري:', {
        ...report,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[community-service.scheduler] فشل community:csr-report:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// JOB 3: متابعة الإحالات المعلقة منذ أكثر من 7 أيام
// يومياً الساعة 09:00
// ─────────────────────────────────────────────
const referralsFollowupJob = cron.schedule(
  '0 9 * * *',
  async () => {
    const start = Date.now();
    logger.info('[community-service.scheduler] بدء: community:referrals-followup');
    try {
      loadModels();

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

      const staleReferrals = await CommunityReferral.find({
        status: 'pending',
        referralDate: { $lte: sevenDaysAgo },
        deletedAt: null,
      })
        .select('_id beneficiaryName referralDate')
        .lean();

      if (staleReferrals.length > 0) {
        logger.warn('[community-service.scheduler] إحالات معلقة تحتاج متابعة:', {
          count: staleReferrals.length,
          referrals: staleReferrals.map(r => ({
            id: r._id,
            name: r.beneficiaryName,
            date: r.referralDate,
          })),
        });
        // TODO: إرسال إشعار لمنسق الإحالات
      }

      logger.info('[community-service.scheduler] انتهى community:referrals-followup:', {
        stale: staleReferrals.length,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[community-service.scheduler] فشل community:referrals-followup:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// تشغيل الـ Jobs
// ─────────────────────────────────────────────
const initCommunityServiceScheduler = () => {
  eventsReminderJob.start();
  csrReportJob.start();
  referralsFollowupJob.start();
  logger.info('[community-service.scheduler] ✅ تم تشغيل جميع مهام نظام الخدمة المجتمعية (3 jobs)');
};

module.exports = { initCommunityServiceScheduler };
