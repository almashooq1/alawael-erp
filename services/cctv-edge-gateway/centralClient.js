/**
 * centralClient — forwards events from this edge to the central backend.
 *
 * Two delivery channels:
 *   • forwardEvent(payload) — POST /api/v1/cctv/webhooks/nvr/:nvrCode
 *     with X-Hikvision-Signature: sha256=<hex> over the raw body.
 *   • forwardHealth(payload) — POST a health probe row directly via
 *     the admin probe endpoint.
 *
 * Retries with exponential backoff. On final failure, the caller is
 * expected to enqueue to Redis for a later replay.
 */
'use strict';

const crypto = require('crypto');
const axios = require('axios');
const config = require('./config');
const log = require('./logger');

function sign(secret, raw) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

async function _post(path, payload, headers = {}) {
  const url = `${config.central.url.replace(/\/+$/, '')}${path}`;
  const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
  const sig = config.central.hmacSecret ? sign(config.central.hmacSecret, raw) : '';
  const reqHeaders = {
    'Content-Type': 'application/json',
    'X-Hikvision-Signature': sig,
    'X-Edge-Branch': config.branchCode,
    ...headers,
  };
  return axios.post(url, raw, {
    headers: reqHeaders,
    timeout: config.central.timeoutMs,
    validateStatus: (s) => s >= 200 && s < 500,
  });
}

async function _withRetry(fn, label) {
  let lastErr = null;
  for (let attempt = 1; attempt <= config.central.retryMaxAttempts; attempt++) {
    try {
      const res = await fn();
      if (res.status >= 200 && res.status < 300) return { ok: true, status: res.status, data: res.data };
      lastErr = new Error(`HTTP ${res.status}`);
      log.warn(`[central:${label}] attempt ${attempt} → ${res.status}`);
    } catch (err) {
      lastErr = err;
      log.warn(`[central:${label}] attempt ${attempt} threw: ${err.message}`);
    }
    if (attempt < config.central.retryMaxAttempts) {
      const wait = config.central.retryBaseMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return { ok: false, error: lastErr?.message || 'unknown' };
}

async function forwardEvent(nvrCode, payload) {
  return _withRetry(
    () => _post(`/api/v1/cctv/webhooks/nvr/${encodeURIComponent(nvrCode)}`, payload),
    `event:${nvrCode}`,
  );
}

async function forwardHealth(payload) {
  return _withRetry(
    () => _post(`/api/v1/cctv/webhooks/health`, payload),
    `health:${config.branchCode}`,
  );
}

async function ping() {
  try {
    const r = await axios.get(`${config.central.url}/api/v1/health`, {
      timeout: 3000,
      validateStatus: () => true,
    });
    return { reachable: r.status >= 200 && r.status < 500, status: r.status };
  } catch (err) {
    return { reachable: false, error: err.message };
  }
}

module.exports = { forwardEvent, forwardHealth, ping, sign };
