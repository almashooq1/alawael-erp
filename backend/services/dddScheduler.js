/**
 * DDD Scheduled Jobs — المهام المجدولة للدومينات العلاجية
 *
 * Cron-based scheduled tasks for:
 *  - KPI snapshot calculation (daily)
 *  - Alert generation (every 4 hours)
 *  - Overdue task detection (daily)
 *  - Session reminder generation (hourly)
 *  - Quality audit scheduling (weekly)
 *  - Data cleanup/archival (daily)
 *
 * Uses node-cron for scheduling with Asia/Riyadh timezone.
 *
 * @module services/dddScheduler
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let cron;
try {
  cron = require('node-cron');
} catch {
  cron = null;
}

const activeTasks = [];

// ═══════════════════════════════════════════════════════════════════════════════
//  Job Definitions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1. Calculate and store KPI snapshots (daily at 02:00)
 */
async function jobKPISnapshots() {
  const KPISnapshot = mongoose.models.KPISnapshot;
  const KPIDefinition = mongoose.models.KPIDefinition;
  if (!KPISnapshot || !KPIDefinition) return;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 1);

  const kpis = await KPIDefinition.find({}).lean();
  let snapshotsCreated = 0;

  for (const kpi of kpis) {
    try {
      let value = 0;

      // Calculate value based on calculation method
      if (kpi.calculationMethod === 'count') {
        const Model = mongoose.models[kpi.sourceModel];
        if (Model) {
          const filter = { createdAt: { $gte: periodStart, $lt: periodEnd } };
          if (Model.schema.paths.isDeleted) filter.isDeleted = { $ne: true };
          value = await Model.countDocuments(filter);
        }
      }

      await KPISnapshot.create({
        kpiId: kpi.kpiId,
        value,
        period: 'daily',
        periodStart,
        periodEnd,
        calculatedAt: now,
      });
      snapshotsCreated++;
    } catch (err) {
      logger.warn(`[DDD-Scheduler] KPI snapshot error for ${kpi.kpiId}: ${err.message}`);
    }
  }

  logger.info(`[DDD-Scheduler] KPI snapshots: ${snapshotsCreated}/${kpis.length} created`);
}

/**
 * 2. Generate alerts for overdue tasks (daily at 07:00)
 */
async function jobOverdueTaskAlerts() {
  const WorkflowTask = mongoose.models.WorkflowTask;
  const DecisionAlert = mongoose.models.DecisionAlert;
  if (!WorkflowTask || !DecisionAlert) return;

  const now = new Date();
  const overdueTasks = await WorkflowTask.find({
    status: { $in: ['pending', 'in-progress'] },
    dueDate: { $lt: now },
    isDeleted: { $ne: true },
  }).lean();

  let alertsCreated = 0;

  for (const task of overdueTasks) {
    try {
      // Check if alert already exists for this task
      const existing = await DecisionAlert.findOne({
        'metadata.taskId': task._id,
        status: 'active',
      });

      if (!existing) {
        await DecisionAlert.create({
          title: `مهمة متأخرة: ${task.title}`,
          titleEn: `Overdue task: ${task.titleEn || task.title}`,
          severity: task.priority === 'urgent' ? 'critical' : 'high',
          domain: 'workflow',
          status: 'active',
          beneficiary: task.beneficiary,
          description: `Task overdue since ${task.dueDate.toISOString().split('T')[0]}`,
          metadata: { taskId: task._id },
        });
        alertsCreated++;
      }
    } catch (err) {
      logger.warn(`[DDD-Scheduler] Overdue alert error: ${err.message}`);
    }
  }

  logger.info(
    `[DDD-Scheduler] Overdue tasks: ${overdueTasks.length} found, ${alertsCreated} alerts created`
  );
}

/**
 * 3. Session reminders — 24h before (hourly check)
 */
async function jobSessionReminders() {
  const ClinicalSession = mongoose.models.ClinicalSession;
  const CareTimeline = mongoose.models.CareTimeline;
  if (!ClinicalSession) return;

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const upcoming = await ClinicalSession.find({
    scheduledDate: { $gte: in24h, $lt: in25h },
    status: 'scheduled',
    isDeleted: { $ne: true },
  }).lean();

  let remindersCreated = 0;

  for (const session of upcoming) {
    try {
      if (CareTimeline) {
        await CareTimeline.create({
          beneficiary: session.beneficiary,
          episode: session.episode,
          eventType: 'session_reminder',
          title: `تذكير: جلسة ${session.sessionType} غداً`,
          description: `Session reminder — ${session.scheduledDate.toISOString().split('T')[0]}`,
          occurredAt: now,
          source: 'scheduler',
        });
        remindersCreated++;
      }
    } catch (err) {
      logger.warn(`[DDD-Scheduler] Session reminder error: ${err.message}`);
    }
  }

  if (remindersCreated > 0) {
    logger.info(`[DDD-Scheduler] Session reminders: ${remindersCreated} created`);
  }
}

/**
 * 4. Episode phase timeout detection (daily at 08:00)
 *    Flag episodes stuck in a phase beyond threshold
 */
async function jobEpisodePhaseTimeouts() {
  const EpisodeOfCare = mongoose.models.EpisodeOfCare;
  const DecisionAlert = mongoose.models.DecisionAlert;
  if (!EpisodeOfCare || !DecisionAlert) return;

  // Phase → max days threshold
  const PHASE_THRESHOLDS = {
    referral: 7,
    screening: 14,
    intake: 14,
    assessment: 21,
    planning: 14,
    'active-treatment': 180,
    review: 14,
    'discharge-planning': 30,
  };

  const now = new Date();
  let alertsCreated = 0;

  for (const [phase, maxDays] of Object.entries(PHASE_THRESHOLDS)) {
    const threshold = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

    const stuckEpisodes = await EpisodeOfCare.find({
      phase,
      updatedAt: { $lt: threshold },
      isDeleted: { $ne: true },
    }).lean();

    for (const ep of stuckEpisodes) {
      try {
        const existing = await DecisionAlert.findOne({
          'metadata.episodeId': ep._id,
          'metadata.alertType': 'phase-timeout',
          status: 'active',
        });

        if (!existing) {
          await DecisionAlert.create({
            title: `حلقة رعاية متأخرة في مرحلة ${phase}`,
            titleEn: `Episode stuck in ${phase} phase (>${maxDays} days)`,
            severity: 'medium',
            domain: 'episodes',
            status: 'active',
            beneficiary: ep.beneficiary,
            metadata: { episodeId: ep._id, alertType: 'phase-timeout', phase, maxDays },
          });
          alertsCreated++;
        }
      } catch (err) {
        logger.warn(`[DDD-Scheduler] Phase timeout alert error: ${err.message}`);
      }
    }
  }

  if (alertsCreated > 0) {
    logger.info(`[DDD-Scheduler] Phase timeout alerts: ${alertsCreated} created`);
  }
}

/**
 * 5. Cleanup resolved alerts older than 90 days (daily at 03:00)
 */
async function jobCleanupResolvedAlerts() {
  const DecisionAlert = mongoose.models.DecisionAlert;
  if (!DecisionAlert) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const result = await DecisionAlert.deleteMany({
    status: { $in: ['resolved', 'dismissed'] },
    updatedAt: { $lt: cutoff },
  });

  if (result.deletedCount > 0) {
    logger.info(`[DDD-Scheduler] Cleanup: ${result.deletedCount} old alerts removed`);
  }
}

/**
 * 6. Automation log cleanup — keep last 30 days (daily at 03:30)
 */
async function jobCleanupAutomationLogs() {
  const AutomationLog = mongoose.models.AutomationLog;
  if (!AutomationLog) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const result = await AutomationLog.deleteMany({ createdAt: { $lt: cutoff } });

  if (result.deletedCount > 0) {
    logger.info(`[DDD-Scheduler] Cleanup: ${result.deletedCount} automation logs removed`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Scheduler Initialization
// ═══════════════════════════════════════════════════════════════════════════════

const JOB_SCHEDULE = [
  { name: 'KPI Snapshots', cron: '0 2 * * *', fn: jobKPISnapshots },
  { name: 'Overdue Task Alerts', cron: '0 7 * * *', fn: jobOverdueTaskAlerts },
  { name: 'Session Reminders', cron: '0 * * * *', fn: jobSessionReminders },
  { name: 'Episode Phase Timeouts', cron: '0 8 * * *', fn: jobEpisodePhaseTimeouts },
  { name: 'Cleanup Resolved Alerts', cron: '0 3 * * *', fn: jobCleanupResolvedAlerts },
  { name: 'Cleanup Automation Logs', cron: '30 3 * * *', fn: jobCleanupAutomationLogs },
];

/**
 * Start all DDD scheduled jobs.
 * Call during app startup.
 */
function initializeDDDScheduler() {
  if (!cron) {
    logger.warn('[DDD-Scheduler] node-cron not available — scheduled jobs disabled');
    return;
  }

  for (const job of JOB_SCHEDULE) {
    try {
      const task = cron.schedule(
        job.cron,
        async () => {
          const start = Date.now();
          try {
            await job.fn();
            logger.debug(`[DDD-Scheduler] ${job.name} completed in ${Date.now() - start}ms`);
          } catch (err) {
            logger.error(`[DDD-Scheduler] ${job.name} failed: ${err.message}`);
          }
        },
        { timezone: 'Asia/Riyadh', scheduled: true }
      );

      activeTasks.push({ name: job.name, cron: job.cron, task });
    } catch (err) {
      logger.error(`[DDD-Scheduler] Failed to schedule ${job.name}: ${err.message}`);
    }
  }

  logger.info(`[DDD-Scheduler] Initialized — ${activeTasks.length} jobs scheduled`);
}

/**
 * Stop all scheduled jobs.
 */
function stopDDDScheduler() {
  for (const t of activeTasks) {
    try {
      t.task.stop();
    } catch {
      // ignore
    }
  }
  activeTasks.length = 0;
  logger.info('[DDD-Scheduler] All jobs stopped');
}

/**
 * Get scheduler status.
 */
function getSchedulerStatus() {
  return {
    active: activeTasks.length > 0,
    jobs: JOB_SCHEDULE.map(j => ({
      name: j.name,
      cron: j.cron,
      scheduled: activeTasks.some(t => t.name === j.name),
    })),
  };
}

/**
 * Run a specific job manually by name.
 */
async function runJobManually(jobName) {
  const job = JOB_SCHEDULE.find(j => j.name === jobName);
  if (!job) throw new Error(`Job not found: ${jobName}`);

  const start = Date.now();
  await job.fn();
  return { job: jobName, executionTimeMs: Date.now() - start };
}

module.exports = {
  initializeDDDScheduler,
  stopDDDScheduler,
  getSchedulerStatus,
  runJobManually,
  JOB_SCHEDULE,
  // Individual jobs for testing
  jobKPISnapshots,
  jobOverdueTaskAlerts,
  jobSessionReminders,
  jobEpisodePhaseTimeouts,
  jobCleanupResolvedAlerts,
  jobCleanupAutomationLogs,
};
