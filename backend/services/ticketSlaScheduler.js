/**
 * Ticket SLA Scheduler — جدولة فحص SLA تذاكر الدعم الفني
 * البرومبت 22: نظام التذاكر والدعم الفني
 *
 * يُشغّل كل 15 دقيقة:
 *  - فحص تذاكر تجاوزت SLA الاستجابة → تعليم + تصعيد
 *  - فحص تذاكر تجاوزت SLA الحل → تعليم + تصعيد
 *  - إرسال إشعارات للمدراء عبر Socket.IO
 */

const logger = require('../utils/logger');

let schedulerStarted = false;

// ─── SLA Config الافتراضية (بالساعات) ────────────────────────────────────────
const SLA_CONFIG = {
  critical: { response: 1, resolution: 4 },
  high: { response: 4, resolution: 24 },
  medium: { response: 8, resolution: 48 },
  low: { response: 24, resolution: 72 },
};

/**
 * حساب deadline SLA لتذكرة جديدة
 */
function calculateSlaDeadlines(priority, createdAt) {
  const config = SLA_CONFIG[priority] || SLA_CONFIG.medium;
  const created = new Date(createdAt);
  return {
    slaResponseDeadline: new Date(created.getTime() + config.response * 60 * 60 * 1000),
    slaResolutionDeadline: new Date(created.getTime() + config.resolution * 60 * 60 * 1000),
  };
}

/**
 * فحص التذاكر التي تجاوزت SLA الاستجابة
 */
async function checkResponseBreaches() {
  try {
    const AdvancedTicket = require('../models/AdvancedTicket');
    const now = new Date();

    // تذاكر مفتوحة لم تُستجب بعد وتجاوزت وقت SLA
    const breached = await AdvancedTicket.find({
      status: { $in: ['open', 'in_progress'] },
      'sla.firstResponseAt': null,
      'sla.isBreached': false,
      createdAt: {
        $lt: new Date(
          now.getTime() - 1 * 60 * 60 * 1000 // تحقق الأقدم من ساعة
        ),
      },
    }).populate('assignee', 'name email');

    let count = 0;

    for (const ticket of breached) {
      const config = SLA_CONFIG[ticket.priority] || SLA_CONFIG.medium;
      const responseDeadline = new Date(
        ticket.createdAt.getTime() + config.response * 60 * 60 * 1000
      );

      if (now > responseDeadline) {
        await AdvancedTicket.findByIdAndUpdate(ticket._id, {
          'sla.isBreached': true,
        });

        logger.warn(`[SLA-Scheduler] Response SLA breached: ${ticket.ticketId}`, {
          priority: ticket.priority,
          assignee: ticket.assigneeName,
          created: ticket.createdAt,
          deadline: responseDeadline,
        });

        // تصعيد التذكرة
        await escalateTicket(ticket, 'response_sla_breach');
        count++;
      }
    }

    return count;
  } catch (err) {
    logger.error('[SLA-Scheduler] checkResponseBreaches failed', { error: err.message });
    return 0;
  }
}

/**
 * فحص التذاكر التي تجاوزت SLA الحل
 */
async function checkResolutionBreaches() {
  try {
    const AdvancedTicket = require('../models/AdvancedTicket');
    const now = new Date();

    // تذاكر لم تُحل بعد
    const openTickets = await AdvancedTicket.find({
      status: { $nin: ['resolved', 'closed'] },
    }).populate('assignee', 'name email');

    let count = 0;

    for (const ticket of openTickets) {
      const config = SLA_CONFIG[ticket.priority] || SLA_CONFIG.medium;
      const resolutionDeadline = new Date(
        ticket.createdAt.getTime() + config.resolution * 60 * 60 * 1000
      );

      if (now > resolutionDeadline) {
        const alreadyEscalated = ticket.escalations && ticket.escalations.length > 0;

        if (!alreadyEscalated) {
          logger.warn(`[SLA-Scheduler] Resolution SLA breached: ${ticket.ticketId}`, {
            priority: ticket.priority,
            assignee: ticket.assigneeName,
            created: ticket.createdAt,
            deadline: resolutionDeadline,
          });

          await escalateTicket(ticket, 'resolution_sla_breach');
          count++;
        }
      }
    }

    return count;
  } catch (err) {
    logger.error('[SLA-Scheduler] checkResolutionBreaches failed', { error: err.message });
    return 0;
  }
}

/**
 * تصعيد تذكرة وإشعار المدراء
 */
async function escalateTicket(ticket, reason) {
  try {
    const AdvancedTicket = require('../models/AdvancedTicket');
    const mongoose = require('mongoose');

    const currentLevel = ticket.escalations ? ticket.escalations.length : 0;
    const nextLevel = currentLevel + 1;

    // البحث عن مدير للتصعيد إليه
    const User = mongoose.models.User;
    let escalateTo = null;
    let escalateToName = 'الإدارة';

    if (User) {
      const manager = await User.findOne({
        role: { $in: ['admin', 'manager', 'it_manager'] },
        isActive: true,
      }).select('_id name email');

      if (manager) {
        escalateTo = manager._id;
        escalateToName = manager.name;
      }
    }

    // إضافة سجل التصعيد
    await AdvancedTicket.findByIdAndUpdate(ticket._id, {
      $push: {
        escalations: {
          level: nextLevel,
          escalatedTo: escalateTo,
          escalatedToName: escalateToName,
          reason:
            reason === 'response_sla_breach' ? 'تجاوز وقت SLA الاستجابة' : 'تجاوز وقت SLA الحل',
          escalatedAt: new Date(),
        },
        comments: {
          authorName: 'النظام',
          content: `⚠️ تم تصعيد التذكرة تلقائياً إلى المستوى ${nextLevel} بسبب: ${
            reason === 'response_sla_breach' ? 'تجاوز وقت SLA الاستجابة' : 'تجاوز وقت SLA الحل'
          }`,
          isInternal: true,
        },
      },
      status: 'escalated',
    });

    // إرسال إشعار عبر Socket.IO إن كان متاحاً
    try {
      const { getIO } = require('../utils/socketManager');
      const io = getIO();
      if (io) {
        io.to('role:admin').to('role:manager').emit('ticket:sla_breach', {
          ticketId: ticket.ticketId,
          title: ticket.title,
          priority: ticket.priority,
          reason,
          escalationLevel: nextLevel,
          escalatedTo: escalateToName,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Socket.IO قد لا يكون متاحاً في بعض السياقات
    }

    logger.info(`[SLA-Scheduler] Ticket ${ticket.ticketId} escalated to level ${nextLevel}`, {
      reason,
      escalatedTo: escalateToName,
    });
  } catch (err) {
    logger.error(`[SLA-Scheduler] Failed to escalate ticket ${ticket.ticketId}`, {
      error: err.message,
    });
  }
}

/**
 * تعيين SLA Deadlines لتذاكر لا تملك deadlines
 */
async function assignMissingSlaDeadlines() {
  try {
    const AdvancedTicket = require('../models/AdvancedTicket');

    const ticketsWithoutSla = await AdvancedTicket.find({
      $or: [{ 'sla.responseTime': null }, { 'sla.responseTime': { $exists: false } }],
      status: { $nin: ['resolved', 'closed'] },
    }).limit(50);

    for (const ticket of ticketsWithoutSla) {
      const config = SLA_CONFIG[ticket.priority] || SLA_CONFIG.medium;
      await AdvancedTicket.findByIdAndUpdate(ticket._id, {
        'sla.responseTime': config.response,
        'sla.resolutionTime': config.resolution,
      });
    }

    if (ticketsWithoutSla.length > 0) {
      logger.info(`[SLA-Scheduler] Assigned SLA to ${ticketsWithoutSla.length} tickets`);
    }
  } catch (err) {
    logger.error('[SLA-Scheduler] assignMissingSlaDeadlines failed', { error: err.message });
  }
}

/**
 * إحصائيات SLA السريعة
 */
async function getSlaStats() {
  try {
    const AdvancedTicket = require('../models/AdvancedTicket');

    const [total, breached, critical, escalated] = await Promise.all([
      AdvancedTicket.countDocuments({ status: { $nin: ['resolved', 'closed'] } }),
      AdvancedTicket.countDocuments({
        'sla.isBreached': true,
        status: { $nin: ['resolved', 'closed'] },
      }),
      AdvancedTicket.countDocuments({
        priority: 'critical',
        status: { $nin: ['resolved', 'closed'] },
      }),
      AdvancedTicket.countDocuments({ status: 'escalated' }),
    ]);

    return { total, breached, critical, escalated };
  } catch {
    return { total: 0, breached: 0, critical: 0, escalated: 0 };
  }
}

/**
 * تشغيل كل فحوصات SLA
 */
async function runSlaChecks() {
  const startTime = Date.now();
  logger.info('[SLA-Scheduler] Running SLA checks...');

  try {
    // تعيين SLA للتذاكر الجديدة أولاً
    await assignMissingSlaDeadlines();

    // فحص الانتهاكات
    const [responseBreach, resolutionBreach] = await Promise.all([
      checkResponseBreaches(),
      checkResolutionBreaches(),
    ]);

    const stats = await getSlaStats();

    logger.info(
      `[SLA-Scheduler] SLA check complete — Response breaches: ${responseBreach}, Resolution breaches: ${resolutionBreach}`,
      {
        duration_ms: Date.now() - startTime,
        stats,
      }
    );

    return {
      response_breaches: responseBreach,
      resolution_breaches: resolutionBreach,
      stats,
      checked_at: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[SLA-Scheduler] SLA checks failed', { error: err.message });
    return { error: err.message };
  }
}

/**
 * بدء تشغيل جدولة SLA (كل 15 دقيقة)
 */
function startSlaScheduler() {
  if (schedulerStarted) {
    logger.warn('[SLA-Scheduler] SLA Scheduler already running');
    return;
  }

  schedulerStarted = true;
  logger.info('[SLA-Scheduler] SLA Scheduler started (every 15 minutes)');

  // تشغيل فوري عند البدء
  setTimeout(() => {
    runSlaChecks().catch(err =>
      logger.error('[SLA-Scheduler] Initial run failed', { error: err.message })
    );
  }, 5000); // انتظار 5 ثواني لاكتمال اتصال قاعدة البيانات

  // تشغيل كل 15 دقيقة
  setInterval(
    () => {
      runSlaChecks().catch(err =>
        logger.error('[SLA-Scheduler] Scheduled run failed', { error: err.message })
      );
    },
    15 * 60 * 1000 // 15 دقيقة
  );
}

/**
 * تشغيل يدوي (من API endpoint)
 */
async function manualSlaRun() {
  logger.info('[SLA-Scheduler] Manual SLA run triggered');
  return await runSlaChecks();
}

module.exports = {
  startSlaScheduler,
  manualSlaRun,
  runSlaChecks,
  calculateSlaDeadlines,
  getSlaStats,
  SLA_CONFIG,
};
