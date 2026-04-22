#!/usr/bin/env node
/**
 * break-glass-digest.js — Phase-7 Commit 5 operational digest.
 *
 * Scans BreakGlassSession rows and classifies into:
 *   • live          — session is active (within expiresAt) and
 *                     co-signed — routine operational state, no alarm
 *   • awaitingCoSign — session started, co-sign window still open,
 *                     no co-sign yet → reminder for L2+ reviewer
 *   • coSignOverdue — past coSignRequiredBy, still no co-sign →
 *                     HIGH severity, investigate
 *   • unreviewed    — expired, has co-sign but no final reviewedAt
 *                     → quality/compliance review still pending
 *   • abuseRisk     — user has ≥3 sessions in 30-day window
 *                     (monthlyLimit guard as a hint to block further
 *                     requests + trigger HR conversation)
 *
 * The classification is a pure function so it can be unit-tested
 * without a live mongo. The CLI wraps it + a mongo query.
 *
 * Exit codes (consistent with other digests):
 *   0  no alarm — all sessions either live-cosigned, awaiting sign
 *      within window, or fully closed+reviewed
 *   1  ≥1 coSignOverdue OR unreviewed OR abuseRisk
 *   2  internal error
 *
 * Options:
 *   --window=N-days    (default: 30) — how far back to look
 *   --json             — machine-readable output
 *   --quiet            — stderr-only on alarm
 */

'use strict';

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const QUIET = args.includes('--quiet');
const windowArg = args.find(a => a.startsWith('--window='));
const WINDOW_DAYS = windowArg ? parseInt(windowArg.split('=')[1], 10) || 30 : 30;
const ABUSE_THRESHOLD = 3;

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    [
      'break-glass-digest — Phase-7 break-glass review + abuse monitor',
      '',
      'Exit codes:',
      '  0  no alarms',
      '  1  ≥1 coSign-overdue / unreviewed / abuseRisk',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/break-glass-digest.js',
      '  node scripts/break-glass-digest.js --window=7 --json',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const useColor = !JSON_MODE && !QUIET && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

/**
 * Pure classifier. `sessions` is expected to be recent-first or any
 * order — this function doesn't care about order. Returns:
 *   {
 *     live: [...],
 *     awaitingCoSign: [...],
 *     coSignOverdue: [...],
 *     unreviewed: [...],
 *     abuseRisk: { userId, count }[],
 *     stats: { ... }
 *   }
 *
 * Exported for unit testing.
 */
function buildReviewPlan(sessions, now = new Date(), abuseThreshold = ABUSE_THRESHOLD) {
  const plan = {
    live: [],
    awaitingCoSign: [],
    coSignOverdue: [],
    unreviewed: [],
    abuseRisk: [],
  };
  const perUserCount = new Map();
  const t = now.getTime();

  for (const s of sessions) {
    const userId = String(s.userId);
    perUserCount.set(userId, (perUserCount.get(userId) || 0) + 1);

    const summary = {
      id: String(s._id || s.id || ''),
      userId,
      scope: s.scope,
      branchId: s.branchId ? String(s.branchId) : null,
      activatedAt: s.activatedAt,
      expiresAt: s.expiresAt,
      coSignRequiredBy: s.coSignRequiredBy,
      coSignedAt: s.coSignedAt,
      closedAt: s.closedAt,
      reviewedAt: s.reviewedAt,
      purpose:
        typeof s.purpose === 'string' && s.purpose.length > 80
          ? s.purpose.slice(0, 77) + '...'
          : s.purpose,
    };

    const expired = s.expiresAt ? new Date(s.expiresAt).getTime() <= t : false;
    const coSignWindowClosed = s.coSignRequiredBy
      ? new Date(s.coSignRequiredBy).getTime() <= t
      : false;
    const closed = !!s.closedAt;
    const coSigned = !!s.coSignedAt;

    if (!expired && !closed) {
      // Session still within its window
      if (coSigned) {
        plan.live.push(summary);
      } else if (!coSignWindowClosed) {
        plan.awaitingCoSign.push(summary);
      } else {
        plan.coSignOverdue.push(summary);
      }
    } else {
      // Session ended (expired or manually closed)
      if (!coSigned) {
        plan.coSignOverdue.push(summary); // never signed, now too late
      } else if (!s.reviewedAt) {
        plan.unreviewed.push(summary);
      }
      // else: fully closed + co-signed + reviewed → no action
    }
  }

  for (const [userId, count] of perUserCount.entries()) {
    if (count >= abuseThreshold) {
      plan.abuseRisk.push({ userId, count });
    }
  }

  return {
    ...plan,
    stats: {
      totalInWindow: sessions.length,
      uniqueUsers: perUserCount.size,
      live: plan.live.length,
      awaitingCoSign: plan.awaitingCoSign.length,
      coSignOverdue: plan.coSignOverdue.length,
      unreviewed: plan.unreviewed.length,
      abuseRisk: plan.abuseRisk.length,
    },
  };
}

async function main() {
  const mongoose = require('mongoose');
  const { model: BreakGlassSession } = require('../authorization/break-glass/session.model');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);
  const sessions = await BreakGlassSession.find({ activatedAt: { $gte: since } })
    .sort({ activatedAt: -1 })
    .lean();

  const plan = buildReviewPlan(sessions);
  await mongoose.disconnect();

  const hasAlarm =
    plan.coSignOverdue.length > 0 || plan.unreviewed.length > 0 || plan.abuseRisk.length > 0;

  const payload = {
    checkedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    abuseThreshold: ABUSE_THRESHOLD,
    stats: plan.stats,
    coSignOverdue: plan.coSignOverdue,
    unreviewed: plan.unreviewed,
    abuseRisk: plan.abuseRisk,
    // Live + awaitingCoSign excluded from the top-level payload (they
    // show up in the human summary but aren't alarm data).
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (!QUIET) {
    console.log(`\n${c.bold}break-glass-digest${c.reset}\n`);
    console.log(
      `  ${c.dim}Window: ${c.cyan}${WINDOW_DAYS} days${c.reset}  ` +
        `${c.dim}Sessions: ${c.cyan}${plan.stats.totalInWindow}${c.reset}  ` +
        `${c.dim}Users: ${c.cyan}${plan.stats.uniqueUsers}${c.reset}\n`
    );
    console.log(
      `  ${c.green}live${c.reset}             ${plan.stats.live}` +
        `  ${c.yellow}awaiting-cosign${c.reset}  ${plan.stats.awaitingCoSign}\n` +
        `  ${c.red}cosign-overdue${c.reset}   ${plan.stats.coSignOverdue}` +
        `  ${c.red}unreviewed${c.reset}       ${plan.stats.unreviewed}` +
        `  ${c.red}abuse-risk${c.reset}       ${plan.stats.abuseRisk}\n`
    );

    if (plan.coSignOverdue.length > 0) {
      console.log(`  ${c.red}Co-sign overdue (top 10):${c.reset}`);
      for (const s of plan.coSignOverdue.slice(0, 10)) {
        console.log(
          `    ${c.red}✗${c.reset} ${c.dim}${s.id.slice(-8)}${c.reset} ` +
            `user=${c.yellow}${s.userId.slice(-6)}${c.reset} scope=${s.scope}`
        );
      }
      console.log();
    }
    if (plan.unreviewed.length > 0) {
      console.log(`  ${c.red}Unreviewed post-expiry (top 10):${c.reset}`);
      for (const s of plan.unreviewed.slice(0, 10)) {
        console.log(
          `    ${c.red}?${c.reset} ${c.dim}${s.id.slice(-8)}${c.reset} ` +
            `user=${c.yellow}${s.userId.slice(-6)}${c.reset} scope=${s.scope}`
        );
      }
      console.log();
    }
    if (plan.abuseRisk.length > 0) {
      console.log(`  ${c.red}Abuse risk (≥${ABUSE_THRESHOLD} in ${WINDOW_DAYS}d):${c.reset}`);
      for (const r of plan.abuseRisk.slice(0, 10)) {
        console.log(
          `    ${c.red}!${c.reset} user=${c.yellow}${r.userId.slice(-6)}${c.reset} count=${r.count}`
        );
      }
      console.log();
    }
  } else if (hasAlarm) {
    process.stderr.write(
      `break-glass-digest: ${plan.stats.coSignOverdue} overdue, ` +
        `${plan.stats.unreviewed} unreviewed, ${plan.stats.abuseRisk} abuse-risk\n`
    );
  }

  return hasAlarm ? 1 : 0;
}

module.exports = { buildReviewPlan, ABUSE_THRESHOLD };

if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(err => {
      if (!JSON_MODE) console.error(`${c.red}break-glass-digest failed:${c.reset} ${err.message}`);
      else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
      process.exit(2);
    });
}
