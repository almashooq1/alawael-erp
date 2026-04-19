#!/usr/bin/env node
/**
 * cpe-attention.js — CLI snapshot of SCFHS CPE compliance.
 *
 * Walks every licensed therapist (Employee with scfhs_number) and runs
 * the pure cpeService.summarize() against their CpeRecord history.
 * Reports:
 *   • compliant        — all category minimums + total met
 *   • attention        — non-compliant AND ≤6 months from cycle end
 *   • nonCompliant     — non-compliant with >6 months left (still time)
 *
 * Designed for cron: print a digest every morning, page HR when the
 * attention count rises. Pipe `--json` into your alerting stack.
 *
 * Exit codes:
 *   0 — no therapists in attention window
 *   1 — at least one therapist needs attention (page HR)
 *   2 — internal error (DB unreachable, bad data, etc.)
 *
 * Usage:
 *   node scripts/cpe-attention.js                 # colorized table
 *   node scripts/cpe-attention.js --json          # machine-readable JSON
 *   node scripts/cpe-attention.js --quiet         # exit code only
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'cpe-attention — SCFHS CPE compliance digest',
      '',
      'Walks every licensed therapist and reports the compliance verdict.',
      'Exits with a status code suitable for cron + alerting:',
      '  0  nothing to do — no therapist in the attention window',
      '  1  at least one therapist needs HR action (6-month window)',
      '  2  internal error (DB unreachable, bad data)',
      '',
      'Usage:',
      '  node scripts/cpe-attention.js           colorized table',
      '  node scripts/cpe-attention.js --json    machine-readable JSON',
      '  node scripts/cpe-attention.js --quiet   exit-code only, no stdout',
      '  node scripts/cpe-attention.js --help    this message',
      '',
      'Env:',
      '  MONGODB_URI                       (default mongodb://localhost:27017/alawael-erp)',
      '  SCFHS_CPE_MIN_CAT1/2/3/TOTAL      per-category minimums (defaults 50/30/20/100)',
      '',
      'Operator docs: docs/runbooks/cpe-attention.md',
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
  gray: useColor ? '\x1b[90m' : '',
};

function resolveCycleEnd(employee) {
  if (employee?.scfhs_expiry) return new Date(employee.scfhs_expiry);
  const d = new Date();
  d.setFullYear(d.getFullYear() + 5);
  return d;
}

async function main() {
  const mongoose = require('mongoose');
  const Employee = require('../models/HR/Employee');
  const CpeRecord = require('../models/CpeRecord');
  const cpe = require('../services/cpeService');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const employees = await Employee.find({
    scfhs_number: { $exists: true, $ne: '' },
    status: { $ne: 'terminated' },
  })
    .select('firstName_ar lastName_ar scfhs_number scfhs_expiry')
    .lean();

  // One $in query instead of N per-employee lookups. On a typical site
  // with 50+ therapists this drops the CLI runtime from seconds to
  // sub-second, which matters when cron runs it every 5 minutes.
  const empIds = employees.map(e => e._id);
  const allRecords = empIds.length
    ? await CpeRecord.find({ employeeId: { $in: empIds } }).lean()
    : [];
  const recordsByEmp = new Map();
  for (const r of allRecords) {
    const key = String(r.employeeId);
    if (!recordsByEmp.has(key)) recordsByEmp.set(key, []);
    recordsByEmp.get(key).push(r);
  }

  const rows = [];
  for (const e of employees) {
    const cycleEnd = resolveCycleEnd(e);
    const records = recordsByEmp.get(String(e._id)) || [];
    const summary = cpe.summarize(records, cycleEnd);
    const days = cpe.daysUntilDeadline(cycleEnd);
    const needsAttention = cpe.needsAttention(summary, cycleEnd);
    let verdict;
    if (summary.compliant) verdict = 'compliant';
    else if (needsAttention) verdict = 'attention';
    else verdict = 'nonCompliant';
    rows.push({
      employeeId: String(e._id),
      name: [e.firstName_ar, e.lastName_ar].filter(Boolean).join(' ') || '—',
      scfhs: e.scfhs_number,
      daysUntilDeadline: days,
      deficit: summary.totalStatus.deficit,
      verdict,
    });
  }

  await mongoose.disconnect();

  const compliant = rows.filter(r => r.verdict === 'compliant').length;
  const attention = rows.filter(r => r.verdict === 'attention');
  const nonCompliant = rows.filter(r => r.verdict === 'nonCompliant').length;

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          total: rows.length,
          compliant,
          attention: attention.length,
          nonCompliant,
          attentionList: attention
            .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
            .slice(0, 50),
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    const checkedAt = new Date().toLocaleString('en-US', { hour12: false });
    console.log(
      `\n${c.bold}Al-Awael — CPE compliance snapshot${c.reset}  ${c.dim}${checkedAt}${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Total licensed: ${rows.length} · ${c.green}compliant ${compliant}${c.dim} · ` +
        `${c.yellow}attention ${attention.length}${c.dim} · ${c.red}non-compliant ${nonCompliant}${c.reset}\n`
    );
    if (attention.length > 0) {
      console.log(`  ${c.bold}Attention list (sorted by deadline):${c.reset}`);
      for (const r of attention.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)) {
        const days =
          r.daysUntilDeadline < 0
            ? `${c.red}OVERDUE ${-r.daysUntilDeadline}d${c.reset}`
            : `${c.yellow}${r.daysUntilDeadline}d left${c.reset}`;
        console.log(
          `    ${c.cyan}${r.name}${c.reset} ${c.gray}(${r.scfhs})${c.reset}` +
            `  ${days}  ${c.dim}deficit ${r.deficit}h${c.reset}`
        );
      }
    } else {
      console.log(`  ${c.green}No therapists in attention window — keep it up.${c.reset}`);
    }
    console.log();
  }

  return attention.length > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) {
      console.error(`${c.red}cpe-attention failed:${c.reset} ${err.message}`);
    } else {
      process.stdout.write(
        JSON.stringify({ error: err.message, checkedAt: new Date().toISOString() }) + '\n'
      );
    }
    process.exit(2);
  });
