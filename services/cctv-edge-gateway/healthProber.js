/**
 * healthProber — TCP-ping each camera + the NVR every N seconds.
 *
 * The deeper ISAPI status check is done centrally; this edge probe just
 * confirms reachability so we surface link-down quickly when an IP
 * camera reboots or the local switch loses a port.
 */
'use strict';

const net = require('net');
const config = require('./config');
const log = require('./logger');
const centralClient = require('./centralClient');
const queue = require('./queue');

function tcpPing(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      done = true;
      socket.destroy();
      resolve({ reachable: true, latencyMs: Date.now() - start });
    });
    socket.once('timeout', () => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ reachable: false, error: 'timeout' });
    });
    socket.once('error', (err) => {
      if (done) return;
      done = true;
      resolve({ reachable: false, error: err.message });
    });
    socket.connect(port, host);
  });
}

async function probeOne(target, kind) {
  const port = target.port || (kind === 'nvr' ? 80 : 554);
  const r = await tcpPing(target.ip, port, config.probe.timeoutMs);
  const payload = {
    targetKind: kind,
    branchCode: config.branchCode,
    code: target.code,
    ip: target.ip,
    port,
    reachable: r.reachable,
    latencyMs: r.latencyMs,
    error: r.error,
    checkedAt: new Date().toISOString(),
  };
  const ship = await centralClient.forwardHealth(payload);
  if (!ship.ok) {
    await queue.push({ kind: 'health', payload, ts: Date.now() });
  }
  return payload;
}

let cameraTimer = null;
let nvrTimer = null;

function start() {
  if (cameraTimer || nvrTimer) return;

  const cameras = Array.isArray(config.cameras) ? config.cameras : [];
  const nvr = config.nvr;

  cameraTimer = setInterval(async () => {
    for (const cam of cameras) {
      try {
        await probeOne(cam, 'camera');
      } catch (err) {
        log.debug(`[health] camera ${cam.code} probe error: ${err.message}`);
      }
    }
  }, config.probe.cameraIntervalMs);
  cameraTimer.unref?.();

  if (nvr) {
    nvrTimer = setInterval(async () => {
      try {
        await probeOne(nvr, 'nvr');
      } catch (err) {
        log.debug(`[health] nvr probe error: ${err.message}`);
      }
    }, config.probe.nvrIntervalMs);
    nvrTimer.unref?.();
  }

  log.info(
    `[health] prober started — ${cameras.length} cameras every ${config.probe.cameraIntervalMs}ms` +
      (nvr ? `, NVR every ${config.probe.nvrIntervalMs}ms` : ''),
  );
}

function stop() {
  if (cameraTimer) clearInterval(cameraTimer);
  if (nvrTimer) clearInterval(nvrTimer);
  cameraTimer = null;
  nvrTimer = null;
}

module.exports = { start, stop, probeOne };
