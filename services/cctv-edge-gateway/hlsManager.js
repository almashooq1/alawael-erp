/**
 * hlsManager — spawns ffmpeg per live session, RTSP → HLS.
 *
 * The central backend creates a CctvStreamSession + returns an HLS URL
 * pointing at /cctv/hls/<sessionId>/index.m3u8. This edge service is
 * what actually serves those segments by running ffmpeg.
 *
 * One session = one ffmpeg process. Idle reaper kills sessions whose
 * heartbeat lapses. Concurrency capped via config.hls.maxSessions.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('./config');
const log = require('./logger');

const sessions = new Map(); // sessionId → { proc, rtspUrl, startedAt, lastHeartbeatAt }

function _outDir(sessionId) {
  return path.join(config.hls.outDir, sessionId);
}

function _ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function spawnFfmpeg(sessionId, rtspUrl) {
  const dir = _outDir(sessionId);
  _ensureDir(dir);
  const m3u8 = path.join(dir, 'index.m3u8');
  const args = [
    '-loglevel', 'warning',
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', String(config.hls.segmentDurationSec),
    '-hls_list_size', String(config.hls.listSize),
    '-hls_flags', 'delete_segments+omit_endlist+independent_segments',
    '-hls_segment_filename', path.join(dir, 'seg_%05d.ts'),
    m3u8,
  ];
  const proc = spawn(config.hls.ffmpegBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stderr?.on('data', (buf) => {
    const line = buf.toString().trim();
    if (line) log.debug(`[hls:${sessionId}] ${line.slice(0, 200)}`);
  });
  proc.on('exit', (code, signal) => {
    log.info(`[hls:${sessionId}] ffmpeg exited code=${code} signal=${signal}`);
    sessions.delete(sessionId);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });
  return proc;
}

function start({ sessionId, rtspUrl }) {
  if (sessions.has(sessionId)) {
    return { ok: true, alreadyRunning: true };
  }
  if (sessions.size >= config.hls.maxSessions) {
    return { ok: false, code: 'TOO_MANY_SESSIONS' };
  }
  try {
    const proc = spawnFfmpeg(sessionId, rtspUrl);
    sessions.set(sessionId, {
      proc,
      rtspUrl,
      startedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
    });
    return { ok: true, sessionId };
  } catch (err) {
    log.warn(`[hls] spawn failed: ${err.message}`);
    return { ok: false, code: 'SPAWN_FAILED', error: err.message };
  }
}

function heartbeat(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return false;
  s.lastHeartbeatAt = Date.now();
  return true;
}

function stop(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return false;
  try {
    s.proc.kill('SIGTERM');
  } catch {
    // ignore
  }
  return true;
}

function list() {
  return [...sessions.entries()].map(([sessionId, s]) => ({
    sessionId,
    startedAt: s.startedAt,
    lastHeartbeatAt: s.lastHeartbeatAt,
    pid: s.proc.pid,
    uptimeSec: Math.round((Date.now() - s.startedAt) / 1000),
  }));
}

let reaperTimer = null;
function startReaper() {
  if (reaperTimer) return;
  reaperTimer = setInterval(() => {
    const cutoff = Date.now() - config.hls.idleTimeoutMs;
    for (const [sid, s] of sessions.entries()) {
      if (s.lastHeartbeatAt < cutoff) {
        log.info(`[hls] reaping idle session ${sid}`);
        stop(sid);
      }
    }
  }, Math.max(5000, config.hls.idleTimeoutMs / 4));
  reaperTimer.unref?.();
}

function stopReaper() {
  if (reaperTimer) clearInterval(reaperTimer);
  reaperTimer = null;
}

module.exports = { start, heartbeat, stop, list, startReaper, stopReaper, _outDir };
