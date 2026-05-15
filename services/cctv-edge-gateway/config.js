/**
 * Edge gateway config.
 *
 * Two sources merged (later wins):
 *   1. Environment variables (CENTRAL_URL, BRANCH_CODE, …)
 *   2. Per-branch JSON file at $CONFIG_FILE (default ./config.local.json)
 *
 * The JSON file lists the NVR + cameras for THIS branch. Edge instances
 * are stateless beyond that file — events flow to central, recordings
 * stay on the NVR disk, HLS is per-session.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function loadFile(file) {
  if (!file) return {};
  const abs = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) return {};
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[edge-config] cannot parse ${abs}: ${err.message}`);
    return {};
  }
}

const fileCfg = loadFile(process.env.CONFIG_FILE || './config.local.json');

const config = {
  branchCode: (process.env.BRANCH_CODE || fileCfg.branchCode || '').toUpperCase(),
  central: {
    url: process.env.CENTRAL_URL || fileCfg.central?.url || 'http://localhost:5000',
    hmacSecret: process.env.CENTRAL_HMAC_SECRET || fileCfg.central?.hmacSecret || '',
    timeoutMs: parseInt(process.env.CENTRAL_TIMEOUT_MS, 10) || 10_000,
    retryMaxAttempts: parseInt(process.env.CENTRAL_RETRY_MAX, 10) || 5,
    retryBaseMs: parseInt(process.env.CENTRAL_RETRY_BASE_MS, 10) || 1000,
  },
  redis: {
    url: process.env.REDIS_URL || fileCfg.redis?.url || 'redis://127.0.0.1:6379/11',
    queueKey: process.env.REDIS_QUEUE_KEY || 'cctv:edge:events',
    queueMax: parseInt(process.env.REDIS_QUEUE_MAX, 10) || 10_000,
  },
  hls: {
    outDir: process.env.HLS_OUT_DIR || '/tmp/hls',
    segmentDurationSec: parseInt(process.env.HLS_SEGMENT_SEC, 10) || 2,
    listSize: parseInt(process.env.HLS_LIST_SIZE, 10) || 5,
    ffmpegBin: process.env.FFMPEG_BIN || 'ffmpeg',
    maxSessions: parseInt(process.env.HLS_MAX_SESSIONS, 10) || 30,
    idleTimeoutMs: parseInt(process.env.HLS_IDLE_MS, 10) || 60_000,
  },
  probe: {
    cameraIntervalMs: parseInt(process.env.PROBE_CAMERA_MS, 10) || 30_000,
    nvrIntervalMs: parseInt(process.env.PROBE_NVR_MS, 10) || 60_000,
    timeoutMs: parseInt(process.env.PROBE_TIMEOUT_MS, 10) || 5000,
  },
  poller: {
    enabled: (process.env.POLLER_ENABLED ?? '1') === '1',
    longPollSec: parseInt(process.env.POLLER_LONG_POLL_SEC, 10) || 25,
    reconnectBackoffMs: parseInt(process.env.POLLER_BACKOFF_MS, 10) || 5000,
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3291,
    bindHost: process.env.BIND_HOST || '0.0.0.0',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  nvr: fileCfg.nvr || null, // { code, ip, port, username, passwordRef }
  cameras: Array.isArray(fileCfg.cameras) ? fileCfg.cameras : [],
};

if (!config.branchCode) {
  // eslint-disable-next-line no-console
  console.warn('[edge-config] BRANCH_CODE is not set — events will be unrouteable.');
}
if (!config.central.hmacSecret) {
  // eslint-disable-next-line no-console
  console.warn('[edge-config] CENTRAL_HMAC_SECRET is not set — webhook will be rejected.');
}

module.exports = config;
