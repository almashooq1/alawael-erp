#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
}

function info(msg) {
  console.log(`ℹ️  ${msg}`);
}

function runStep(title, fn) {
  process.stdout.write(`\n— ${title} ... `);
  try {
    const result = fn();
    console.log('PASS');
    return { pass: true, result };
  } catch (err) {
    console.log('FAIL');
    fail(err && err.message ? err.message : String(err));
    return { pass: false, error: err };
  }
}

function sanitizeError(err) {
  if (!err) return null;
  return {
    message: err.message || String(err),
    name: err.name || 'Error',
  };
}

function validateEnvStrict() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.production'), override: true });
  process.env.NODE_ENV = 'production';
  process.env.STRICT_ENV_VALIDATION = 'true';
  const { validateEnv } = require('../config/validateEnv');
  validateEnv();
}

function runDrDryRun() {
  const raw = execFileSync(process.execPath, ['scripts/dr-verify.js', '--dry-run', '--json'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const report = JSON.parse(raw);
  if (!report.success) {
    throw new Error(`DR dry-run failed: ${report.error || 'unknown_error'}`);
  }

  if (!report.backup) {
    throw new Error('DR dry-run returned no backup metadata');
  }

  const ageHours = Number(report.backup.ageHours || '0');
  if (Number.isFinite(ageHours) && ageHours > 36) {
    throw new Error(`Latest backup too old for safety gate: ${ageHours.toFixed(2)}h`);
  }

  if (Number.isFinite(ageHours) && ageHours > 6) {
    info(`Latest backup age is ${ageHours.toFixed(2)}h (warning for Gate 6 target <6h)`);
  }

  return report;
}

function computeT24() {
  // Default to the mergedAt timestamp of PR #523. Can be overridden if needed.
  const mergedAt = process.env.PR_MERGED_AT || '2026-06-17T09:19:16Z';
  const mergedUtc = new Date(mergedAt);
  if (Number.isNaN(mergedUtc.getTime())) {
    throw new Error(`Invalid PR_MERGED_AT: ${mergedAt}`);
  }

  const t24Utc = new Date(mergedUtc.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const remainMs = t24Utc.getTime() - now.getTime();

  const fmt = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });

  const fmtKsa = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Riyadh',
  });

  const remH = Math.max(0, Math.floor(remainMs / 3600000));
  const remM = Math.max(0, Math.floor((remainMs % 3600000) / 60000));

  return {
    mergedAt,
    t24Utc: fmt.format(t24Utc).replace(',', ''),
    t24Ksa: fmtKsa.format(t24Utc).replace(',', ''),
    remaining: `${remH}h ${remM}m`,
  };
}

async function postWebhook(url, payload) {
  const body = {
    text: `W1406 preflight:24h ${payload.success ? 'GREEN ✅' : 'RED ❌'}`,
    preflight24h: payload,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`webhook_http_${res.status}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const sendWebhookMode = args.includes('--send-webhook');
  const outArg = args.find(a => a.startsWith('--out='));
  const outPath = outArg ? outArg.replace('--out=', '') : null;
  const webhookArg = args.find(a => a.startsWith('--webhook='));
  const webhookUrl = webhookArg
    ? webhookArg.replace('--webhook=', '')
    : process.env.PREFLIGHT_24H_WEBHOOK_URL || '';

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  W1406 24h Verification Preflight (One Command) ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const results = [];

  results.push(runStep('Strict env validation (.env.production)', validateEnvStrict));
  const dr = runStep('DR verify --dry-run --json', runDrDryRun);
  results.push(dr);
  const t24 = runStep('Compute T+24 execution window', computeT24);
  results.push(t24);

  if (dr.pass && dr.result && dr.result.backup) {
    info(`Backup kind: ${dr.result.backup.kind}`);
    info(`Backup path: ${dr.result.backup.path}`);
    info(`Backup age : ${dr.result.backup.ageHours}h`);
  }

  if (t24.pass) {
    info(`T+24 (UTC): ${t24.result.t24Utc}`);
    info(`T+24 (KSA): ${t24.result.t24Ksa}`);
    info(`Remaining : ${t24.result.remaining}`);
  }

  const failed = results.filter(r => !r.pass).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    success: failed === 0,
    failedChecks: failed,
    checks: {
      envStrict: {
        pass: results[0]?.pass === true,
        error: sanitizeError(results[0]?.error),
      },
      drDryRun: {
        pass: dr.pass === true,
        error: sanitizeError(dr.error),
        report: dr.result || null,
      },
      t24Window: {
        pass: t24.pass === true,
        error: sanitizeError(t24.error),
        timing: t24.result || null,
      },
    },
    summary: {
      backupKind: dr.pass && dr.result && dr.result.backup ? dr.result.backup.kind : null,
      backupPath: dr.pass && dr.result && dr.result.backup ? dr.result.backup.path : null,
      backupAgeHours: dr.pass && dr.result && dr.result.backup ? dr.result.backup.ageHours : null,
      t24Utc: t24.pass && t24.result ? t24.result.t24Utc : null,
      t24Ksa: t24.pass && t24.result ? t24.result.t24Ksa : null,
      remaining: t24.pass && t24.result ? t24.result.remaining : null,
    },
  };

  if (outPath) {
    const resolved = path.isAbsolute(outPath) ? outPath : path.join(__dirname, '..', outPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(payload, null, 2) + os.EOL, 'utf8');
    info(`Saved JSON report: ${resolved}`);
  }

  if (jsonMode) {
    console.log('\nJSON_PAYLOAD_START');
    console.log(JSON.stringify(payload, null, 2));
    console.log('JSON_PAYLOAD_END');
  }

  if (sendWebhookMode || webhookArg) {
    if (!webhookUrl) {
      info('Webhook send requested, but PREFLIGHT_24H_WEBHOOK_URL is not set. Skipping.');
    } else {
      try {
        await postWebhook(webhookUrl, payload);
        info('Webhook notification sent successfully');
      } catch (err) {
        fail(`Webhook notification failed: ${err && err.message ? err.message : String(err)}`);
      }
    }
  }

  console.log('\n────────────────────────────────────────────────────');
  if (failed === 0) {
    ok('Preflight 24h is GREEN');
    process.exit(0);
  }

  fail(`Preflight 24h has ${failed} failing check(s)`);
  process.exit(1);
}

if (require.main === module) {
  main().catch(err => {
    fail(err && err.message ? err.message : String(err));
    process.exit(2);
  });
}
