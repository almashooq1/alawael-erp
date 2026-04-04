/**
 * Recruitment Scheduler — System 43
 * المهام المجدولة لنظام التوظيف الداخلي
 *
 * Jobs:
 *  - recruitment:close-expired     → يومياً 00:30 (إغلاق الوظائف منتهية الصلاحية)
 *  - recruitment:interview-reminders → يومياً 07:30 (تذكيرات المقابلات خلال 24 ساعة)
 *  - recruitment:expire-offers     → يومياً 01:00 (انتهاء صلاحية عروض العمل)
 *  - recruitment:nitaqat-report    → أول يوم كل شهر 09:00 (تقرير نطاقات)
 */

'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger') || console;

let JobPosting, JobOffer, RecruitmentInterview;

const loadModels = () => {
  if (!JobPosting) {
    JobPosting = require('../models/JobPosting');
    JobOffer = require('../models/JobOffer');
    RecruitmentInterview = require('../models/RecruitmentInterview');
  }
};

// ─────────────────────────────────────────────
// JOB 1: إغلاق الوظائف منتهية الصلاحية
// يومياً الساعة 00:30
// ─────────────────────────────────────────────
const closeExpiredJob = cron.schedule(
  '30 0 * * *',
  async () => {
    const start = Date.now();
    logger.info('[recruitment.scheduler] بدء: recruitment:close-expired');
    try {
      loadModels();

      const result = await JobPosting.updateMany(
        {
          status: 'published',
          applicationDeadline: { $lt: new Date() },
          deletedAt: null,
        },
        { status: 'closed' }
      );

      logger.info('[recruitment.scheduler] وظائف مغلقة:', {
        count: result.modifiedCount,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[recruitment.scheduler] فشل recruitment:close-expired:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// JOB 2: إرسال تذكيرات المقابلات خلال 24 ساعة
// يومياً الساعة 07:30
// ─────────────────────────────────────────────
const interviewRemindersJob = cron.schedule(
  '30 7 * * *',
  async () => {
    const start = Date.now();
    logger.info('[recruitment.scheduler] بدء: recruitment:interview-reminders');
    try {
      loadModels();

      const now = new Date();
      const in24h = new Date(Date.now() + 24 * 3600 * 1000);

      const interviews = await RecruitmentInterview.find({
        status: 'scheduled',
        scheduledAt: { $gte: now, $lte: in24h },
        deletedAt: null,
      })
        .populate('applicationId', 'applicantName applicantEmail')
        .lean();

      logger.info('[recruitment.scheduler] مقابلات خلال 24 ساعة:', {
        count: interviews.length,
        interviews: interviews.map(i => ({
          id: i._id,
          type: i.interviewType,
          at: i.scheduledAt,
          applicant: i.applicationId?.applicantName,
        })),
        elapsed: `${Date.now() - start}ms`,
      });

      // TODO: إرسال إشعارات SMS/Email للمتقدمين والمحاورين
    } catch (err) {
      logger.error('[recruitment.scheduler] فشل recruitment:interview-reminders:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// JOB 3: تحديث حالة عروض العمل المنتهية الصلاحية
// يومياً الساعة 01:00
// ─────────────────────────────────────────────
const expireOffersJob = cron.schedule(
  '0 1 * * *',
  async () => {
    const start = Date.now();
    logger.info('[recruitment.scheduler] بدء: recruitment:expire-offers');
    try {
      loadModels();

      const result = await JobOffer.updateMany(
        {
          status: 'sent',
          offerExpiry: { $lt: new Date() },
          deletedAt: null,
        },
        { status: 'expired' }
      );

      logger.info('[recruitment.scheduler] عروض منتهية الصلاحية:', {
        count: result.modifiedCount,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[recruitment.scheduler] فشل recruitment:expire-offers:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// JOB 4: توليد تقرير نطاقات الشهري
// أول يوم كل شهر الساعة 09:00
// ─────────────────────────────────────────────
const nitaqatReportJob = cron.schedule(
  '0 9 1 * *',
  async () => {
    const start = Date.now();
    logger.info('[recruitment.scheduler] بدء: recruitment:nitaqat-report');
    try {
      const JobApplication = require('../models/JobApplication');

      const [total, saudis, withDisability] = await Promise.all([
        JobApplication.countDocuments({ status: 'hired', deletedAt: null }),
        JobApplication.countDocuments({ status: 'hired', isSaudi: true, deletedAt: null }),
        JobApplication.countDocuments({ status: 'hired', hasDisability: true, deletedAt: null }),
      ]);

      const saudiPercent = total > 0 ? Math.round((saudis / total) * 100 * 10) / 10 : 0;
      let nitaqatBand;
      if (saudiPercent >= 75) nitaqatBand = 'platinum';
      else if (saudiPercent >= 50) nitaqatBand = 'green';
      else if (saudiPercent >= 25) nitaqatBand = 'yellow';
      else nitaqatBand = 'red';

      logger.info('[recruitment.scheduler] تقرير نطاقات الشهري:', {
        totalHired: total,
        saudiHired: saudis,
        saudiPercent,
        nitaqatBand,
        withDisability,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[recruitment.scheduler] فشل recruitment:nitaqat-report:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// تشغيل الـ Jobs
// ─────────────────────────────────────────────
const initRecruitmentScheduler = () => {
  closeExpiredJob.start();
  interviewRemindersJob.start();
  expireOffersJob.start();
  nitaqatReportJob.start();
  logger.info('[recruitment.scheduler] ✅ تم تشغيل جميع مهام نظام التوظيف (4 jobs)');
};

module.exports = { initRecruitmentScheduler };
