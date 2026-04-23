'use strict';

/**
 * complianceCalendarAlertSweeper.service.js — Phase 13 Commit 11.
 *
 * Walks stored ComplianceCalendarEvent docs and fires escalation
 * alerts for each window (90/60/30/14/7/3/1/0 days) that the event
 * has crossed since the last sweep. Uses `pendingAlertsFor()` from
 * the calendar service so the logic stays testable in isolation
 * and the "fired once" invariant lives in one place.
 *
 * Emits `compliance.calendar.alert` per (event, window) pair so
 * downstream channels (email / SMS / Slack / in-app) can fan out
 * without the sweeper knowing about them.
 *
 * Also flips overdue events whose status has drifted from an
 * earlier `upcoming`/`due_soon`/`urgent` to `overdue` once the
 * due date is in the past.
 */

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // hourly

function createComplianceCalendarAlertSweeper({
  calendarService, // ComplianceCalendarService instance (required)
  eventModel, // ComplianceCalendarEvent model (required)
  dispatcher = null,
  logger = console,
  now = () => new Date(),
  intervalMs = DEFAULT_INTERVAL_MS,
  batchSize = 200,
} = {}) {
  if (!calendarService) {
    throw new Error('complianceCalendarAlertSweeper: calendarService required');
  }
  if (!eventModel) {
    throw new Error('complianceCalendarAlertSweeper: eventModel required');
  }

  let timer = null;

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[CalendarSweeper] dispatch ${name} failed: ${err.message}`);
    }
  }

  async function tick() {
    const nowDate = now();
    const report = { scanned: 0, alertsFired: 0, flippedOverdue: 0, errors: 0 };

    // Load non-terminal events that might need attention: anything
    // still open with dueDate within 180 days ahead OR already past.
    const horizon = new Date(nowDate.getTime() + 180 * 86400000);
    const events = await eventModel
      .find({
        deleted_at: null,
        status: { $in: ['upcoming', 'due_soon', 'urgent', 'overdue', 'snoozed'] },
        dueDate: { $lte: horizon },
      })
      .limit(batchSize);

    for (const ev of events) {
      report.scanned++;
      try {
        // Flip to overdue if time has passed.
        if (ev.dueDate && ev.dueDate.getTime() < nowDate.getTime() && ev.status !== 'overdue') {
          ev.status = 'overdue';
          await ev.save();
          report.flippedOverdue++;
        }

        // Fire alerts for each window crossed but not yet recorded.
        const pending = calendarService.pendingAlertsFor(ev, undefined, nowDate);
        for (const w of pending) {
          ev.alertsFired.push({ window: w, firedAt: nowDate, channel: 'dispatcher' });
          report.alertsFired++;
          await _emit('compliance.calendar.alert', {
            eventId: String(ev._id),
            code: ev.code,
            type: ev.type,
            severity: ev.severity,
            window: w,
            dueDate: ev.dueDate,
            branchId: ev.branchId ? String(ev.branchId) : null,
          });
        }
        if (pending.length) await ev.save();
      } catch (err) {
        report.errors++;
        logger.warn(`[CalendarSweeper] event ${ev._id}: ${err.message}`);
      }
    }

    return report;
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      tick().catch(err => logger.warn(`[CalendarSweeper] tick error: ${err.message}`));
    }, intervalMs);
    if (timer.unref) timer.unref();
    logger.info(`[CalendarSweeper] started (interval ${intervalMs}ms)`);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { tick, start, stop };
}

let _default = null;
function getDefault() {
  if (!_default) {
    const calendarService = require('./complianceCalendar.service').getDefault();
    const eventModel = require('../../models/quality/ComplianceCalendarEvent.model');
    _default = createComplianceCalendarAlertSweeper({ calendarService, eventModel });
  }
  return _default;
}

module.exports = {
  createComplianceCalendarAlertSweeper,
  getDefault,
  DEFAULT_INTERVAL_MS,
};
