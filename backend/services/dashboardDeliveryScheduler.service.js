/**
 * dashboardDeliveryScheduler.service.js — scheduled snapshot
 * delivery (Phase 18 Commit 5).
 *
 * Walks the subscription registry each tick, decides which
 * subscriptions are eligible to fire based on the current UTC
 * hour / day vs their configured cadence, builds the dashboard
 * payload, renders it, and fans out through the injected notifier.
 *
 * Key design choices:
 *
 *   - **Evaluator + scheduler are separated.** `isDueNow(sub, now,
 *     lastFiredAt)` is a pure function; the scheduler only wires
 *     the tick loop + state tracking around it.
 *   - **De-duplication by window.** Each subscription tracks its
 *     `lastFiredAt`. A tick fires only if (a) `isDueNow()` is
 *     true and (b) the previous fire was in a different cadence
 *     window (so a 1-minute scheduler tick against a daily
 *     subscription only sends once).
 *   - **Fail-soft.** Render error → skipped. Notifier error → per
 *     recipient counted as failed, loop continues.
 *   - **Test-env-aware.** `NODE_ENV=test` or
 *     `DASHBOARD_DELIVERY_SCHEDULER=off` suppresses auto-start.
 */

'use strict';

const { SUBSCRIPTIONS, CADENCES } = require('../config/dashboard-subscriptions.registry');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 min

function cadenceWindowKey(cadence, dateMs) {
  const d = new Date(dateMs);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hr = d.getUTCHours();
  switch (cadence) {
    case 'hourly':
      return `${y}-${mo}-${day}-${hr}`;
    case 'daily':
      return `${y}-${mo}-${day}`;
    case 'weekly': {
      const tmp = new Date(Date.UTC(y, d.getUTCMonth(), day));
      const dayOfWeek = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${tmp.getUTCFullYear()}-W${week}`;
    }
    case 'monthly':
      return `${y}-${mo}`;
    default:
      return `${y}-${mo}-${day}`;
  }
}

function isDueNow(sub, nowMs, lastFiredAt) {
  if (!sub || !CADENCES.includes(sub.cadence)) return false;
  const d = new Date(nowMs);
  const hour = d.getUTCHours();
  const sendHour = typeof sub.sendAtUtcHour === 'number' ? sub.sendAtUtcHour : 0;
  if (sub.cadence === 'daily' && hour < sendHour) return false;
  if (sub.cadence === 'weekly') {
    if (hour < sendHour) return false;
    const sendDay = typeof sub.sendOnUtcDay === 'number' ? sub.sendOnUtcDay : 0;
    if (d.getUTCDay() !== sendDay) return false;
  }
  if (sub.cadence === 'monthly') {
    if (hour < sendHour) return false;
    const sendDom = typeof sub.sendOnUtcDayOfMonth === 'number' ? sub.sendOnUtcDayOfMonth : 1;
    if (d.getUTCDate() !== sendDom) return false;
  }

  // Dedup: don't re-fire in the same cadence window.
  if (lastFiredAt) {
    const nowWin = cadenceWindowKey(sub.cadence, nowMs);
    const prevWin = cadenceWindowKey(sub.cadence, lastFiredAt);
    if (nowWin === prevWin) return false;
  }
  return true;
}

function buildDeliveryScheduler({
  subscriptions = SUBSCRIPTIONS,
  buildDashboard, // async ({ dashboardId }) → payload
  renderer, // { render(payload) → {subject,html,text,markdown} }
  notifier, // { notify(opts) → Promise }
  resolveRecipients, // async (roles) → [{ userId, email, phone }, ...]
  intervalMs = DEFAULT_INTERVAL_MS,
  clock = { now: () => Date.now() },
  logger = console,
} = {}) {
  if (typeof buildDashboard !== 'function') {
    throw new Error('deliveryScheduler: buildDashboard is required');
  }
  if (!renderer || typeof renderer.render !== 'function') {
    throw new Error('deliveryScheduler: renderer.render is required');
  }
  if (!notifier || typeof notifier.notify !== 'function') {
    throw new Error('deliveryScheduler: notifier.notify is required');
  }
  if (typeof resolveRecipients !== 'function') {
    throw new Error('deliveryScheduler: resolveRecipients is required');
  }

  const state = {
    running: false,
    intervalHandle: null,
    ticks: 0,
    lastTickAt: null,
    totalFired: 0,
    totalSent: 0,
    lastErrors: [],
    lastFiredBySubId: new Map(),
  };

  async function fireOne(sub) {
    let payload;
    try {
      payload = await buildDashboard({ dashboardId: sub.dashboardId });
    } catch (err) {
      state.lastErrors.push({ subId: sub.id, stage: 'build', error: err.message });
      return { sent: 0, skipped: true, reason: 'build-failed' };
    }
    if (!payload || !payload.dashboard) {
      state.lastErrors.push({ subId: sub.id, stage: 'build', error: 'empty payload' });
      return { sent: 0, skipped: true, reason: 'empty-payload' };
    }

    let rendered;
    try {
      rendered = renderer.render(payload);
    } catch (err) {
      state.lastErrors.push({ subId: sub.id, stage: 'render', error: err.message });
      return { sent: 0, skipped: true, reason: 'render-failed' };
    }

    let recipients;
    try {
      recipients = await resolveRecipients(sub.recipientRoles || []);
    } catch (err) {
      state.lastErrors.push({ subId: sub.id, stage: 'resolve', error: err.message });
      return { sent: 0, skipped: true, reason: 'resolve-failed' };
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return { sent: 0, skipped: true, reason: 'no-recipients' };
    }

    const subject = sub.subjectOverride || rendered.subject;
    const body =
      sub.format === 'markdown'
        ? rendered.markdown
        : sub.format === 'text'
          ? rendered.text
          : rendered.html;

    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await notifier.notify({
          to: { email: recipient.email || '', phone: recipient.phone || '' },
          channels: sub.channels || ['email'],
          subject,
          body,
          priority: 'normal',
          templateKey: `dashboard.subscription.${sub.id}`,
          userId: recipient.userId || null,
          metadata: {
            dashboardId: sub.dashboardId,
            subscriptionId: sub.id,
            cadence: sub.cadence,
            format: sub.format,
          },
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        if (logger && logger.warn) {
          logger.warn(
            `[deliveryScheduler] notify failed for ${sub.id}/${recipient.userId || recipient.email}: ${err.message}`
          );
        }
      }
    }

    state.lastFiredBySubId.set(sub.id, clock.now());
    state.totalFired += 1;
    state.totalSent += sent;
    return { sent, failed, skipped: false, recipients: recipients.length };
  }

  async function runOnce() {
    const now = clock.now();
    state.ticks += 1;
    state.lastTickAt = now;
    state.lastErrors = [];
    const fired = [];

    for (const sub of subscriptions) {
      const lastFiredAt = state.lastFiredBySubId.get(sub.id) || null;
      if (!isDueNow(sub, now, lastFiredAt)) continue;
      const res = await fireOne(sub);
      fired.push({ subId: sub.id, ...res });
    }

    return { ticks: state.ticks, fired };
  }

  function start() {
    if (state.running) return false;
    state.running = true;
    runOnce().catch(err => {
      if (logger && logger.warn)
        logger.warn(`[deliveryScheduler] initial tick failed: ${err.message}`);
    });
    state.intervalHandle = setInterval(() => {
      runOnce().catch(err => {
        if (logger && logger.warn) logger.warn(`[deliveryScheduler] tick failed: ${err.message}`);
      });
    }, intervalMs);
    if (typeof state.intervalHandle.unref === 'function') {
      state.intervalHandle.unref();
    }
    return true;
  }

  function stop() {
    if (!state.running) return false;
    state.running = false;
    if (state.intervalHandle) {
      clearInterval(state.intervalHandle);
      state.intervalHandle = null;
    }
    return true;
  }

  function status() {
    const lastFired = {};
    for (const [k, v] of state.lastFiredBySubId.entries()) lastFired[k] = v;
    return {
      running: state.running,
      intervalMs,
      ticks: state.ticks,
      lastTickAt: state.lastTickAt,
      totalFired: state.totalFired,
      totalSent: state.totalSent,
      lastErrors: state.lastErrors.slice(),
      lastFiredBySubId: lastFired,
      subscriptionsWatched: subscriptions.length,
    };
  }

  return { start, stop, runOnce, status, _internals: { isDueNow, cadenceWindowKey } };
}

module.exports = {
  buildDeliveryScheduler,
  isDueNow,
  cadenceWindowKey,
  DEFAULT_INTERVAL_MS,
};
