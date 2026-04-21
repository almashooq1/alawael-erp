/**
 * onboardingAnalyticsService — pure math over OnboardingChecklist records.
 *
 * The HR audit flagged onboarding as having a model but no routes. The
 * model is solid — tasks with responsible party (hr/it/manager/payroll/
 * employee), per-task completedAt, and target vs actual completion
 * dates. What's missing is the read surface: "which new hires are
 * stalled?", "which onboarding steps consistently delay?", "is IT
 * bottlenecking setup?"
 *
 * Functions:
 *   • summarize(checklists)         counts + avg completion days + stalled count
 *   • byStatus(checklists)          status breakdown
 *   • taskCompletion(checklists)    per-task completion rate (reveals stalls)
 *   • byResponsible(checklists)     completion rate per owner (HR/IT/manager/etc)
 *   • stalledChecklists(checklists) past targetCompletionDate, not done
 *   • monthlyTrend(checklists)      started + completed per month
 *   • detectOverdueAlarm(checklists) trips when stalled ≥ threshold
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // Number of stalled checklists that trips the alarm.
  get overdueAlarmCount() {
    return envInt('ONBOARDING_OVERDUE_ALARM_COUNT', 3);
  },
  // Grace period before targetCompletionDate counts as a true stall.
  get graceDays() {
    return envInt('ONBOARDING_GRACE_DAYS', 3);
  },
};

const STATUS_ORDER = ['pending', 'in_progress', 'completed'];
const RESPONSIBLE_ORDER = ['hr', 'it', 'manager', 'payroll', 'employee'];

function isCompleted(c) {
  return c?.status === 'completed' || c?.actualCompletionDate != null;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function summarize(checklists, now = new Date()) {
  const stats = {
    total: checklists.length,
    byStatus: { pending: 0, in_progress: 0, completed: 0 },
    completionPercentageAvg: null,
    avgCompletionDays: null,
    stalledCount: 0,
  };
  let pctSum = 0;
  let pctCount = 0;
  let durationSum = 0;
  let durationCount = 0;
  for (const c of checklists) {
    if (c.status && c.status in stats.byStatus) stats.byStatus[c.status] += 1;
    if (typeof c.completionPercentage === 'number') {
      pctSum += c.completionPercentage;
      pctCount += 1;
    }
    if (isCompleted(c) && c.startDate && c.actualCompletionDate) {
      durationSum += daysBetween(c.startDate, c.actualCompletionDate);
      durationCount += 1;
    }
    if (
      !isCompleted(c) &&
      c.targetCompletionDate &&
      new Date(c.targetCompletionDate).getTime() + THRESHOLDS.graceDays * 86400000 <
        new Date(now).getTime()
    ) {
      stats.stalledCount += 1;
    }
  }
  if (pctCount > 0) {
    stats.completionPercentageAvg = Math.round((pctSum / pctCount) * 10) / 10;
  }
  if (durationCount > 0) {
    stats.avgCompletionDays = Math.round((durationSum / durationCount) * 10) / 10;
  }
  return stats;
}

function byStatus(checklists) {
  const map = new Map();
  for (const s of STATUS_ORDER) map.set(s, { status: s, count: 0 });
  for (const c of checklists) {
    if (c.status && map.has(c.status)) map.get(c.status).count += 1;
  }
  const total = checklists.length;
  return [...map.values()].map(row => ({
    ...row,
    pct: total > 0 ? Math.round((row.count / total) * 1000) / 10 : null,
  }));
}

/**
 * Aggregate task-level completion across all checklists. A task titled
 * "Issue laptop" that's consistently pending across 20 onboardings
 * tells you IT is a bottleneck — even if each individual checklist
 * looks fine on average.
 */
function taskCompletion(checklists) {
  const map = new Map();
  for (const c of checklists) {
    if (!Array.isArray(c.tasks)) continue;
    for (const t of c.tasks) {
      const title = (t.title || '(untitled)').trim();
      if (!map.has(title)) {
        map.set(title, {
          title,
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
        });
      }
      const row = map.get(title);
      row.total += 1;
      if (t.status === 'completed') row.completed += 1;
      else if (t.status === 'pending') row.pending += 1;
      else if (t.status === 'in_progress') row.inProgress += 1;
    }
  }
  return [...map.values()]
    .map(r => ({
      ...r,
      completionRate: r.total > 0 ? Math.round((r.completed / r.total) * 1000) / 10 : null,
    }))
    .sort((a, b) => a.completionRate - b.completionRate); // worst first — bottlenecks surface
}

function byResponsible(checklists) {
  const map = new Map();
  for (const r of RESPONSIBLE_ORDER) {
    map.set(r, { responsible: r, total: 0, completed: 0, pending: 0 });
  }
  for (const c of checklists) {
    if (!Array.isArray(c.tasks)) continue;
    for (const t of c.tasks) {
      const who = t.responsible || 'hr';
      if (!map.has(who)) {
        map.set(who, { responsible: who, total: 0, completed: 0, pending: 0 });
      }
      const row = map.get(who);
      row.total += 1;
      if (t.status === 'completed') row.completed += 1;
      if (t.status === 'pending') row.pending += 1;
    }
  }
  return [...map.values()].map(r => ({
    ...r,
    completionRate: r.total > 0 ? Math.round((r.completed / r.total) * 1000) / 10 : null,
  }));
}

function stalledChecklists(checklists, now = new Date(), limit = 50) {
  const cutoffMs = now.getTime() - THRESHOLDS.graceDays * 86400000;
  return checklists
    .filter(c => !isCompleted(c) && c.targetCompletionDate)
    .filter(c => new Date(c.targetCompletionDate).getTime() <= cutoffMs)
    .map(c => {
      const daysLate = Math.round((now - new Date(c.targetCompletionDate)) / 86400000);
      const totalTasks = Array.isArray(c.tasks) ? c.tasks.length : 0;
      const completedTasks = Array.isArray(c.tasks)
        ? c.tasks.filter(t => t.status === 'completed').length
        : 0;
      return {
        _id: c._id,
        uuid: c.uuid,
        applicationId: c.applicationId,
        startDate: c.startDate,
        targetCompletionDate: c.targetCompletionDate,
        daysLate,
        status: c.status,
        completionPercentage: c.completionPercentage,
        totalTasks,
        completedTasks,
      };
    })
    .sort((a, b) => b.daysLate - a.daysLate)
    .slice(0, limit);
}

function monthlyTrend(checklists) {
  const map = new Map();
  for (const c of checklists) {
    if (c.startDate) {
      const key = new Date(c.startDate).toISOString().slice(0, 7);
      if (!map.has(key)) map.set(key, { month: key, started: 0, completed: 0 });
      map.get(key).started += 1;
    }
    if (isCompleted(c) && c.actualCompletionDate) {
      const key = new Date(c.actualCompletionDate).toISOString().slice(0, 7);
      if (!map.has(key)) map.set(key, { month: key, started: 0, completed: 0 });
      map.get(key).completed += 1;
    }
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

function detectOverdueAlarm(checklists, now = new Date()) {
  const stalled = stalledChecklists(checklists, now, 1000);
  return {
    active: stalled.length >= THRESHOLDS.overdueAlarmCount,
    stalledCount: stalled.length,
    threshold: THRESHOLDS.overdueAlarmCount,
    graceDays: THRESHOLDS.graceDays,
  };
}

module.exports = {
  THRESHOLDS,
  summarize,
  byStatus,
  taskCompletion,
  byResponsible,
  stalledChecklists,
  monthlyTrend,
  detectOverdueAlarm,
};
