/**
 * absenceDetectionBootstrap.js — W402 wiring for the absence-detection sweeper.
 *
 * Schedules a daily call to absenceDetectionSweeper.sweepAbsenceDetection
 * over yesterday's HRAttendanceRecord rows. Env-gated to keep
 * dev / test boots quiet.
 *
 * Enable in production by setting:
 *   ENABLE_ABSENCE_DETECTION_SWEEPER=true
 * Optional comma-separated override of the status filter:
 *   ABSENCE_DETECTION_STATUSES=absent,on_leave,sick
 *
 * Daily 24h cadence (initial tick after 90s grace so other bootstraps
 * settle). Skips silently when Mongo isn't yet connected.
 *
 * Usage from backend/app.js after Mongo connect (placed near other
 * scheduled-job bootstraps):
 *
 *   const { bootstrapAbsenceDetection } = require('./startup/absenceDetectionBootstrap');
 *   bootstrapAbsenceDetection({ logger });
 */

'use strict';

const mongoose = require('mongoose');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TICK_MS = DAY_MS;

function parseStatuses() {
  const raw = process.env.ABSENCE_DETECTION_STATUSES;
  if (!raw) return ['absent'];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function startAbsenceDetectionScheduler({ logger, tickMs = DEFAULT_TICK_MS } = {}) {
  const { sweepAbsenceDetection } = require('../services/hr/absenceDetectionSweeper');
  const HRAttendanceRecord = require('../models/HR/AttendanceRecord');
  const statuses = parseStatuses();

  async function tick() {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      const { integrationBus } = require('../integration/systemIntegrationBus');
      const res = await sweepAbsenceDetection({
        AttendanceRecordModel: HRAttendanceRecord,
        integrationBus,
        statuses,
        logger,
      });
      if (res?.emitted > 0) {
        logger.info?.(
          `[absenceDetectionBootstrap] sweep: emitted=${res.emitted} scanned=${res.scanned} statuses=${statuses.join('|')}`
        );
      }
    } catch (err) {
      logger.warn?.('[absenceDetectionBootstrap] sweep failed', { error: err.message });
    }
  }

  const handle = setInterval(tick, tickMs);
  if (handle.unref) handle.unref();
  const initial = setTimeout(tick, 90000);
  if (initial.unref) initial.unref();

  return {
    stop() {
      clearInterval(handle);
      clearTimeout(initial);
    },
    _tick: tick,
  };
}

function bootstrapAbsenceDetection({ logger = console, isTestEnv = false } = {}) {
  if (isTestEnv) return { scheduler: null };
  if (process.env.ENABLE_ABSENCE_DETECTION_SWEEPER !== 'true') {
    return { scheduler: null };
  }
  let scheduler = null;
  try {
    scheduler = startAbsenceDetectionScheduler({ logger });
    logger.info?.('[absenceDetectionBootstrap] absence-detection sweeper started (24h cadence)');
  } catch (err) {
    logger.warn?.('[absenceDetectionBootstrap] sweeper not started', { error: err.message });
  }
  return { scheduler };
}

module.exports = {
  bootstrapAbsenceDetection,
  startAbsenceDetectionScheduler,
  parseStatuses,
};
