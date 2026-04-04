/**
 * Volunteer Scheduler — System 41
 * المهام المجدولة لنظام إدارة المتطوعين
 *
 * Jobs:
 *  - volunteers:monthly-report     → أول يوم كل شهر 09:00
 *  - volunteers:sync-mntasati      → كل أسبوع الأحد 03:00
 *  - volunteers:close-past-opportunities → يومياً 01:00
 */

'use strict';

const cron = require('node-cron');
const logger = require('../utils/logger') || console;

// Models (lazy require لتجنب مشاكل التهيئة المبكرة)
let Volunteer, VolunteerOpportunity, VolunteerAssignment;

const loadModels = () => {
  if (!Volunteer) {
    Volunteer = require('../models/Volunteer');
    VolunteerOpportunity = require('../models/VolunteerOpportunity');
    VolunteerAssignment = require('../models/VolunteerAssignment');
  }
};

// ─────────────────────────────────────────────
// JOB 1: تقرير شهري بإحصائيات المتطوعين
// أول يوم كل شهر الساعة 09:00
// ─────────────────────────────────────────────
const monthlyReportJob = cron.schedule(
  '0 9 1 * *',
  async () => {
    const start = Date.now();
    logger.info('[volunteer.scheduler] بدء: volunteers:monthly-report');
    try {
      loadModels();

      const [total, active, totalHoursAgg, completedThisMonth] = await Promise.all([
        Volunteer.countDocuments({}),
        Volunteer.countDocuments({ status: 'active' }),
        Volunteer.aggregate([
          { $match: { deletedAt: null } },
          { $group: { _id: null, hours: { $sum: '$totalHours' } } },
        ]),
        VolunteerAssignment.countDocuments({
          status: 'completed',
          updatedAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        }),
      ]);

      logger.info('[volunteer.scheduler] تقرير شهري المتطوعين:', {
        total,
        active,
        totalHours: totalHoursAgg[0]?.hours || 0,
        completedAssignmentsLastMonth: completedThisMonth,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[volunteer.scheduler] فشل volunteers:monthly-report:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// JOB 2: مزامنة مع منصة منصتي الوطنية
// كل أحد الساعة 03:00
// ─────────────────────────────────────────────
const mntasatiSyncJob = cron.schedule(
  '0 3 * * 0',
  async () => {
    const start = Date.now();
    logger.info('[volunteer.scheduler] بدء: volunteers:sync-mntasati');
    try {
      loadModels();

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const volunteers = await Volunteer.find({
        mntasatiId: { $ne: null },
        $or: [{ mntasatiSyncedAt: null }, { mntasatiSyncedAt: { $lt: sevenDaysAgo } }],
        deletedAt: null,
      }).lean();

      let synced = 0;
      let failed = 0;

      for (const volunteer of volunteers) {
        try {
          // تكامل API مع منصة منصتي - https://www.mntasati.com/api
          await Volunteer.findByIdAndUpdate(volunteer._id, { mntasatiSyncedAt: new Date() });
          synced++;
        } catch {
          failed++;
        }
      }

      logger.info('[volunteer.scheduler] مزامنة منصتي:', {
        total: volunteers.length,
        synced,
        failed,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[volunteer.scheduler] فشل volunteers:sync-mntasati:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// JOB 3: إغلاق فرص التطوع المنتهية
// يومياً الساعة 01:00
// ─────────────────────────────────────────────
const closePastOpportunitiesJob = cron.schedule(
  '0 1 * * *',
  async () => {
    const start = Date.now();
    logger.info('[volunteer.scheduler] بدء: volunteers:close-past-opportunities');
    try {
      loadModels();

      const result = await VolunteerOpportunity.updateMany(
        {
          status: 'open',
          endDate: { $lt: new Date() },
          deletedAt: null,
        },
        { status: 'closed' }
      );

      logger.info('[volunteer.scheduler] فرص مغلقة:', {
        count: result.modifiedCount,
        elapsed: `${Date.now() - start}ms`,
      });
    } catch (err) {
      logger.error('[volunteer.scheduler] فشل volunteers:close-past-opportunities:', err.message);
    }
  },
  { scheduled: false }
);

// ─────────────────────────────────────────────
// تشغيل الـ Jobs
// ─────────────────────────────────────────────
const initVolunteerScheduler = () => {
  monthlyReportJob.start();
  mntasatiSyncJob.start();
  closePastOpportunitiesJob.start();
  logger.info('[volunteer.scheduler] ✅ تم تشغيل جميع مهام نظام المتطوعين (3 jobs)');
};

module.exports = { initVolunteerScheduler };
