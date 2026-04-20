#!/usr/bin/env node
/**
 * utilization-digest.js — weekly therapist productivity snapshot.
 *
 * Exit codes:
 *   0 — all therapists above utilization floor
 *   1 — at least one below UTILIZATION_FLOOR (default 50%)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'utilization-digest — Therapist productivity snapshot (last 30d)',
      '',
      'Exit codes:',
      '  0  all therapists above floor',
      '  1  at least one below UTILIZATION_FLOOR (default 50%)',
      '  2  internal error',
      '',
      'Usage: node scripts/utilization-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI, UTILIZATION_FLOOR, THERAPIST_CAPACITY_MINUTES',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');
const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

const FLOOR = parseFloat(process.env.UTILIZATION_FLOOR) || 50;

async function main() {
  const mongoose = require('mongoose');
  const TherapySession = require('../models/TherapySession');
  const SessionAttendance = require('../models/SessionAttendance');
  const Employee = require('../models/HR/Employee');
  const util = require('../services/therapistUtilizationService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const cutoff = new Date(Date.now() - 30 * 86400000);
  const [sessions, attendance] = await Promise.all([
    TherapySession.find({ date: { $gte: cutoff } })
      .select('_id therapist beneficiary status duration')
      .lean(),
    SessionAttendance.find({ scheduledDate: { $gte: cutoff } })
      .select('sessionId status billable')
      .lean(),
  ]);
  const byTherapist = util.summarizeByTherapist(sessions, util.indexAttendance(attendance));

  const ids = Object.keys(byTherapist).filter(id => mongoose.isValidObjectId(id));
  const emps = ids.length
    ? await Employee.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar employee_code')
        .lean()
    : [];
  const eMap = new Map(emps.map(e => [String(e._id), e]));

  const below = [];
  for (const [id, stats] of Object.entries(byTherapist)) {
    const rate = util.utilizationRate(stats);
    if (rate != null && rate < FLOOR) {
      const e = eMap.get(id);
      below.push({
        therapistId: id,
        name: e ? [e.firstName_ar, e.lastName_ar].filter(Boolean).join(' ') : '—',
        employeeCode: e?.employee_code || null,
        utilizationRate: rate,
        billableMinutes: stats.billableMinutes,
      });
    }
  }
  below.sort((a, b) => a.utilizationRate - b.utilizationRate);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          floor: FLOOR,
          totalTherapists: ids.length,
          belowFloor: below,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Utilization digest${c.reset}  ${c.dim}floor ${FLOOR}%${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Therapists tracked: ${ids.length} · Below floor: ${c.yellow}${below.length}${c.reset}\n`
    );
    if (below.length > 0) {
      for (const t of below) {
        console.log(
          `    ${c.cyan}${t.name}${c.reset}  ${c.yellow}${t.utilizationRate}%${c.reset}  ${c.dim}${t.billableMinutes}min billable${c.reset}`
        );
      }
      console.log();
    } else {
      console.log(`  ${c.green}All therapists above floor.${c.reset}\n`);
    }
  }
  return below.length > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}utilization-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
