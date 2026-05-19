'use strict';

/**
 * attendance-baseline.service.js — Wave 132.
 *
 * Per-employee adaptive baseline + z-score anomaly detector. Instead
 * of "anyone arriving after 09:15 is late" (global), this asks:
 * "is THIS employee 2+ standard deviations later than their own
 * 90-day pattern?".
 *
 * Public API:
 *   refreshBaseline({ employeeId, windowDays? })
 *     — recomputes the baseline from DailyAttendanceRecord history;
 *       returns the populated baseline doc
 *
 *   refreshAllBaselines({ windowDays?, batchSize? })
 *     — sweeper for nightly cron
 *
 *   scoreDay({ employeeId, dailyRecord })
 *     — returns { ok, anomalies[], baseline, sampleSize, matured }
 *       anomalies is a list of {kind, zScore, observed, expected,
 *       severity} entries
 *
 * Statistical model:
 *   - Mean + stddev computed in one pass (Welford-style).
 *   - z = (observed − mean) / max(stddev, MIN_STDDEV_MINUTES) — we
 *     floor stddev so a perfectly consistent employee's tiny variation
 *     doesn't fire alarms on 30s drift.
 *   - |z| ≥ 2.0 = anomaly (LOW), ≥ 3.0 = HIGH severity.
 *   - Workday-pattern anomaly: showed up on a day where presence
 *     rate < 0.2 historically.
 *
 * Trust:
 *   - sampleSize < MIN_SAMPLE_SIZE → return matured=false; consumers
 *     must skip anomaly emission and fall back to global rules.
 */

const MIN_STDDEV_MINUTES = 5; // floor — tiny variation doesn't fire
const Z_LOW = 2.0;
const Z_HIGH = 3.0;
const WORKDAY_PRESENCE_THRESHOLD = 0.2;

function _minutesOfUtcDay(date) {
  const d = new Date(date);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function _utcWeekday(date) {
  return new Date(date).getUTCDay();
}

function _stats(values) {
  const n = values.length;
  if (n === 0) {
    return { n: 0, mean: null, stddev: null, min: null, max: null };
  }
  let sum = 0;
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const mean = sum / n;
  let sqSum = 0;
  for (const v of values) sqSum += (v - mean) * (v - mean);
  const variance = n > 1 ? sqSum / (n - 1) : 0;
  const stddev = Math.sqrt(variance);
  return { n, mean, stddev, min, max };
}

function _zScore(observed, mean, stddev) {
  if (mean == null) return null;
  const denom = Math.max(MIN_STDDEV_MINUTES, stddev || 0);
  return (observed - mean) / denom;
}

function _severityFromZ(z) {
  const abs = Math.abs(z);
  if (abs >= Z_HIGH) return 'high';
  if (abs >= Z_LOW) return 'low';
  return null;
}

function createAttendanceBaselineService({
  dailyRecordModel = null,
  baselineModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!dailyRecordModel) {
    throw new Error('attendance-baseline: dailyRecordModel required');
  }
  if (!baselineModel) {
    throw new Error('attendance-baseline: baselineModel required');
  }

  async function _loadHistory({ employeeId, windowDays }) {
    const since = new Date(now().getTime() - windowDays * 24 * 60 * 60_000);
    let cursor = dailyRecordModel.find({
      employeeId,
      shiftDate: { $gte: since },
      // Only "real" days — locked + closed + overridden (NOT open or
      // partial — those are still in flight and would skew the mean).
      status: { $in: ['closed', 'overridden', 'locked'] },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return (await cursor) || [];
    } catch (err) {
      logger.warn(`[baseline] history load failed: ${err.message}`);
      return [];
    }
  }

  async function _findExistingBaseline(employeeId) {
    try {
      const cursor = baselineModel.findOne({ employeeId });
      if (cursor && typeof cursor.then === 'function') return await cursor;
      return cursor;
    } catch (err) {
      logger.warn(`[baseline] find existing failed: ${err.message}`);
      return null;
    }
  }

  async function refreshBaseline({ employeeId, windowDays = 90 } = {}) {
    if (!employeeId) {
      return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    }
    const rows = await _loadHistory({ employeeId, windowDays });

    const checkInMins = [];
    const checkOutMins = [];
    const workedMinsArr = [];
    const dayPresence = [0, 0, 0, 0, 0, 0, 0];
    const dayObservations = [0, 0, 0, 0, 0, 0, 0];

    let earliestDate = null;
    let latestDate = null;

    for (const r of rows) {
      const sd = new Date(r.shiftDate);
      if (!earliestDate || sd < earliestDate) earliestDate = sd;
      if (!latestDate || sd > latestDate) latestDate = sd;

      const wd = _utcWeekday(sd);
      dayObservations[wd] += 1;

      if (r.checkIn && r.checkIn.eventTime) {
        checkInMins.push(_minutesOfUtcDay(r.checkIn.eventTime));
        dayPresence[wd] += 1;
      }
      if (r.checkOut && r.checkOut.eventTime) {
        checkOutMins.push(_minutesOfUtcDay(r.checkOut.eventTime));
      }
      if (typeof r.workedMinutes === 'number' && r.workedMinutes >= 0) {
        workedMinsArr.push(r.workedMinutes);
      }
    }

    const checkInStats = _stats(checkInMins);
    const checkOutStats = _stats(checkOutMins);
    const workedStats = _stats(workedMinsArr);
    const workdayPattern = dayPresence.map((p, i) =>
      dayObservations[i] > 0 ? p / dayObservations[i] : 0
    );

    const existing = await _findExistingBaseline(employeeId);
    const payload = {
      employeeId,
      checkInTime: {
        meanMinutes: checkInStats.mean,
        stddevMinutes: checkInStats.stddev,
        minMinutes: checkInStats.min,
        maxMinutes: checkInStats.max,
      },
      checkOutTime: {
        meanMinutes: checkOutStats.mean,
        stddevMinutes: checkOutStats.stddev,
        minMinutes: checkOutStats.min,
        maxMinutes: checkOutStats.max,
      },
      workedMinutes: {
        meanMinutes: workedStats.mean,
        stddevMinutes: workedStats.stddev,
        minMinutes: workedStats.min,
        maxMinutes: workedStats.max,
      },
      workdayPattern,
      sampleSize: rows.length,
      windowDays,
      lastRefreshedAt: now(),
      sampledDateRange: {
        start: earliestDate,
        end: latestDate,
      },
    };

    let saved;
    if (existing) {
      Object.assign(existing, payload);
      try {
        await existing.save();
        saved = existing;
      } catch (err) {
        logger.error('[baseline] update save failed:', err.message);
        return { ok: false, reason: 'SAVE_FAILED' };
      }
    } else {
      const doc = new baselineModel(payload);
      try {
        await doc.validate();
      } catch (err) {
        const errors = {};
        if (err && err.errors) {
          for (const [k, v] of Object.entries(err.errors)) {
            errors[k] = (v && v.message) || String(v);
          }
        }
        return { ok: false, reason: 'VALIDATION_FAILED', errors };
      }
      try {
        await doc.save();
        saved = doc;
      } catch (err) {
        logger.error('[baseline] insert save failed:', err.message);
        return { ok: false, reason: 'SAVE_FAILED' };
      }
    }

    return {
      ok: true,
      baseline: saved.toObject ? saved.toObject() : saved,
      matured: rows.length >= 10,
    };
  }

  async function refreshAllBaselines({ windowDays = 90, batchSize = 200 } = {}) {
    // List distinct employeeIds with recent activity.
    let cursor = dailyRecordModel.find(
      {
        shiftDate: {
          $gte: new Date(now().getTime() - windowDays * 24 * 60 * 60_000),
        },
      },
      { employeeId: 1 }
    );
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let rows = [];
    try {
      rows = (await cursor) || [];
    } catch (err) {
      logger.warn(`[baseline] sweeper rows failed: ${err.message}`);
      return { ok: false, reason: 'SCAN_FAILED' };
    }
    const employees = [...new Set(rows.map(r => String(r.employeeId)))];
    const refreshed = [];
    let processed = 0;
    for (const empId of employees) {
      if (processed >= batchSize) break;
      const r = await refreshBaseline({ employeeId: empId, windowDays });
      if (r.ok) refreshed.push(empId);
      processed += 1;
    }
    return {
      ok: true,
      processed,
      refreshed: refreshed.length,
      scannedEmployees: employees.length,
    };
  }

  /**
   * scoreDay({ employeeId, dailyRecord })
   *   → { ok, anomalies, baseline, sampleSize, matured }
   *
   * If the employee has no matured baseline (sampleSize <
   * MIN_SAMPLE_SIZE), returns matured=false with empty anomalies so
   * the caller knows to fall back to global rules.
   */
  async function scoreDay({ employeeId, dailyRecord } = {}) {
    if (!employeeId) return { ok: false, reason: 'EMPLOYEE_REQUIRED' };
    if (!dailyRecord) return { ok: false, reason: 'RECORD_REQUIRED' };

    const baseline = await _findExistingBaseline(employeeId);
    if (!baseline) {
      return {
        ok: true,
        matured: false,
        anomalies: [],
        baseline: null,
        sampleSize: 0,
      };
    }
    const sampleSize = baseline.sampleSize || 0;
    const MIN_SAMPLE = 10;
    if (sampleSize < MIN_SAMPLE) {
      return {
        ok: true,
        matured: false,
        anomalies: [],
        baseline: baseline.toObject ? baseline.toObject() : baseline,
        sampleSize,
      };
    }

    const anomalies = [];

    if (
      dailyRecord.checkIn &&
      dailyRecord.checkIn.eventTime &&
      baseline.checkInTime &&
      baseline.checkInTime.meanMinutes != null
    ) {
      const obs = _minutesOfUtcDay(dailyRecord.checkIn.eventTime);
      const z = _zScore(obs, baseline.checkInTime.meanMinutes, baseline.checkInTime.stddevMinutes);
      const sev = _severityFromZ(z);
      if (sev) {
        anomalies.push({
          kind: z > 0 ? 'check-in-later-than-baseline' : 'check-in-earlier-than-baseline',
          zScore: Math.round(z * 100) / 100,
          observedMinutes: obs,
          expectedMeanMinutes: baseline.checkInTime.meanMinutes,
          expectedStddevMinutes: baseline.checkInTime.stddevMinutes,
          severity: sev,
        });
      }
    }

    if (
      dailyRecord.checkOut &&
      dailyRecord.checkOut.eventTime &&
      baseline.checkOutTime &&
      baseline.checkOutTime.meanMinutes != null
    ) {
      const obs = _minutesOfUtcDay(dailyRecord.checkOut.eventTime);
      const z = _zScore(
        obs,
        baseline.checkOutTime.meanMinutes,
        baseline.checkOutTime.stddevMinutes
      );
      const sev = _severityFromZ(z);
      if (sev) {
        anomalies.push({
          kind: z > 0 ? 'check-out-later-than-baseline' : 'check-out-earlier-than-baseline',
          zScore: Math.round(z * 100) / 100,
          observedMinutes: obs,
          expectedMeanMinutes: baseline.checkOutTime.meanMinutes,
          expectedStddevMinutes: baseline.checkOutTime.stddevMinutes,
          severity: sev,
        });
      }
    }

    if (
      typeof dailyRecord.workedMinutes === 'number' &&
      baseline.workedMinutes &&
      baseline.workedMinutes.meanMinutes != null
    ) {
      const z = _zScore(
        dailyRecord.workedMinutes,
        baseline.workedMinutes.meanMinutes,
        baseline.workedMinutes.stddevMinutes
      );
      const sev = _severityFromZ(z);
      if (sev) {
        anomalies.push({
          kind: z > 0 ? 'worked-longer-than-baseline' : 'worked-shorter-than-baseline',
          zScore: Math.round(z * 100) / 100,
          observedMinutes: dailyRecord.workedMinutes,
          expectedMeanMinutes: baseline.workedMinutes.meanMinutes,
          expectedStddevMinutes: baseline.workedMinutes.stddevMinutes,
          severity: sev,
        });
      }
    }

    // Day-of-week anomaly: showed up on an unusual workday.
    if (dailyRecord.checkIn && dailyRecord.shiftDate && Array.isArray(baseline.workdayPattern)) {
      const wd = _utcWeekday(dailyRecord.shiftDate);
      const rate = baseline.workdayPattern[wd];
      if (typeof rate === 'number' && rate < WORKDAY_PRESENCE_THRESHOLD) {
        anomalies.push({
          kind: 'unusual-workday-presence',
          observedWeekday: wd,
          historicalPresenceRate: rate,
          severity: 'low',
        });
      }
    }

    return {
      ok: true,
      matured: true,
      anomalies,
      baseline: baseline.toObject ? baseline.toObject() : baseline,
      sampleSize,
    };
  }

  return {
    refreshBaseline,
    refreshAllBaselines,
    scoreDay,
    MIN_STDDEV_MINUTES,
    Z_LOW,
    Z_HIGH,
  };
}

module.exports = {
  createAttendanceBaselineService,
  MIN_STDDEV_MINUTES,
  Z_LOW,
  Z_HIGH,
};
