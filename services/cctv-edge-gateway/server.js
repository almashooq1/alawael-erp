/**
 * CCTV Edge Gateway — Phase 27 C11.
 *
 * Runs ONE PER BRANCH (or one centrally per cluster). Talks to the local
 * NVR via ISAPI, ships events + health up to the central backend, and
 * serves HLS segments to viewers via ffmpeg.
 *
 * Endpoints:
 *   GET  /health         — process + downstream status
 *   GET  /sessions       — list active HLS sessions
 *   POST /hls/start      — { sessionId, rtspUrl }
 *   POST /hls/heartbeat  — { sessionId }
 *   POST /hls/stop       — { sessionId }
 *   GET  /hls/:sessionId/index.m3u8 — playlist
 *   GET  /hls/:sessionId/:segment   — TS segment
 */
'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const log = require('./logger');
const eventPoller = require('./eventPoller');
const healthProber = require('./healthProber');
const replayWorker = require('./replayWorker');
const hlsManager = require('./hlsManager');
const queue = require('./queue');
const centralClient = require('./centralClient');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ─── Health ──────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const [ping, qSize] = await Promise.all([centralClient.ping(), queue.size()]);
  res.json({
    ok: true,
    branchCode: config.branchCode,
    central: ping,
    queue: { backlog: qSize },
    hls: { sessions: hlsManager.list().length, max: config.hls.maxSessions },
    cameras: config.cameras.length,
    nvr: config.nvr ? { code: config.nvr.code, ip: config.nvr.ip } : null,
    uptime: process.uptime(),
  });
});

// ─── HLS control ─────────────────────────────────────────────────────────
app.get('/sessions', (req, res) => {
  res.json({ ok: true, sessions: hlsManager.list() });
});

app.post('/hls/start', (req, res) => {
  const { sessionId, rtspUrl } = req.body || {};
  if (!sessionId || !rtspUrl) {
    return res.status(400).json({ ok: false, code: 'MISSING_PARAMS' });
  }
  const r = hlsManager.start({ sessionId, rtspUrl });
  res.status(r.ok ? 200 : 400).json(r);
});

app.post('/hls/heartbeat', (req, res) => {
  const ok = hlsManager.heartbeat(req.body?.sessionId);
  res.status(ok ? 200 : 404).json({ ok });
});

app.post('/hls/stop', (req, res) => {
  const ok = hlsManager.stop(req.body?.sessionId);
  res.json({ ok });
});

// ─── HLS static serving (manifest + segments) ────────────────────────────
const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// resolve + startsWith containment is the barrier CodeQL credits for js/path-injection.
function safeHlsFile(sessionId, name) {
  const dir = hlsManager._outDir(sessionId); // throws on invalid sessionId
  const file = path.resolve(dir, name);
  if (!file.startsWith(dir + path.sep)) return null;
  return file;
}

app.get('/hls/:sessionId/index.m3u8', (req, res) => {
  if (!SESSION_ID_RE.test(req.params.sessionId)) {
    return res.status(400).json({ ok: false, code: 'BAD_SESSION_ID' });
  }
  const file = safeHlsFile(req.params.sessionId, 'index.m3u8');
  if (!file || !fs.existsSync(file)) return res.status(404).json({ ok: false, code: 'NOT_READY' });
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
});

app.get('/hls/:sessionId/:segment', (req, res) => {
  if (!SESSION_ID_RE.test(req.params.sessionId)) {
    return res.status(400).json({ ok: false, code: 'BAD_SESSION_ID' });
  }
  const segment = req.params.segment;
  if (!/^seg_\d+\.ts$/.test(segment)) {
    return res.status(400).json({ ok: false, code: 'BAD_SEGMENT' });
  }
  const file = safeHlsFile(req.params.sessionId, segment);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ ok: false, code: 'NOT_FOUND' });
  res.setHeader('Content-Type', 'video/mp2t');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
});

// ─── Boot ────────────────────────────────────────────────────────────────
function bootWorkers() {
  if (config.poller.enabled) {
    eventPoller.start({ nvr: config.nvr });
  } else {
    log.info('[boot] event poller disabled');
  }
  healthProber.start();
  replayWorker.start();
  hlsManager.startReaper();
}

function shutdown(signal) {
  log.info(`[boot] received ${signal} — shutting down`);
  healthProber.stop();
  replayWorker.stop();
  hlsManager.stopReaper();
  for (const s of hlsManager.list()) hlsManager.stop(s.sessionId);
  queue.disconnect().finally(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref?.();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (require.main === module) {
  const port = config.server.port;
  const host = config.server.bindHost;
  app.listen(port, host, () => {
    log.info(
      `[boot] CCTV edge gateway listening on ${host}:${port} ` +
        `(branch=${config.branchCode || '?'}, central=${config.central.url})`,
    );
    bootWorkers();
  });
}

module.exports = { app, bootWorkers, shutdown };
