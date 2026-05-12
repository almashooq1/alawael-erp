/**
 * build-info.routes.js — runtime identity of this process.
 *
 * Mount at /api/build-info (public, no auth — carries no secrets).
 *
 * Useful for:
 *   • 'Which version is serving this request right now?' during a
 *     blue/green deploy or a rolling restart
 *   • Correlating prod incidents to a specific commit SHA without
 *     SSHing in to read /app/CHANGELOG.md
 *   • Verifying `kubectl rollout status` has actually flipped traffic
 *     to the new replica set
 *
 * All fields are resolved at module-load time (cached). A process
 * restart is the correct way to see new values — that's what the
 * endpoint is *for*.
 */

'use strict';

const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const router = express.Router();

function resolveGitSha() {
  // Production containers usually inject this at build time. Treat empty
  // string the same as missing — some deploy scripts set GIT_SHA="" when
  // they can't resolve the real SHA.
  if (process.env.GIT_SHA && process.env.GIT_SHA.trim()) {
    return process.env.GIT_SHA.trim();
  }
  // Rsync deploys (where the VPS dir has no .git) write the SHA to a
  // plain-text BUILD_SHA file next to package.json. Try that next so the
  // endpoint reports the deployed commit instead of falling through to
  // a stale env var or 'unknown'.
  try {
    const buildShaPath = path.join(__dirname, '..', 'BUILD_SHA');
    const sha = fs.readFileSync(buildShaPath, 'utf8').trim();
    if (sha) return sha;
  } catch {
    // file absent — fine, fall through to git
  }
  try {
    return execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
      cwd: __dirname,
      timeout: 2000, // don't block startup on a hung git process
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

function resolveGitShaShort() {
  const full = resolveGitSha();
  return full === 'unknown' ? 'unknown' : full.slice(0, 8);
}

function resolveBuildTime() {
  const v = process.env.BUILD_TIME;
  return v && v.trim() ? v.trim() : 'unknown';
}

// Resolve once at load, not per-request. A prod restart flushes.
const GIT_SHA = resolveGitSha();
const GIT_SHA_SHORT = resolveGitShaShort();
const BUILD_TIME = resolveBuildTime();
const STARTED_AT = new Date().toISOString();

router.get('/', (_req, res) => {
  const uptimeSec = Math.round(process.uptime());
  res.json({
    success: true,
    commit: GIT_SHA,
    commitShort: GIT_SHA_SHORT,
    buildTime: BUILD_TIME,
    startedAt: STARTED_AT,
    uptimeSec,
    uptimeHuman: humanizeUptime(uptimeSec),
    node: process.version,
    platform: process.platform,
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
  });
});

function humanizeUptime(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86_400)}d ${Math.floor((s % 86_400) / 3600)}h`;
}

module.exports = router;
// Exposed for tests; not part of the public HTTP surface.
module.exports._internal = { resolveGitSha, resolveGitShaShort, resolveBuildTime, humanizeUptime };
