/**
 * eventPoller — long-polls Hikvision NVR ISAPI alertStream and forwards.
 *
 * The Hikvision device opens a streaming HTTP response with multipart
 * XML chunks separated by `--boundary` lines. Each chunk is one event.
 * We parse it, normalise minimal fields, and ship to central.
 *
 * On disconnect, reconnects with exponential backoff. Failures stack
 * into the Redis queue so replay can drain when central comes back.
 */
'use strict';

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');
const config = require('./config');
const log = require('./logger');
const centralClient = require('./centralClient');
const queue = require('./queue');

function parseDigestChallenge(header) {
  if (!header || !/^Digest /i.test(header)) return null;
  const fields = {};
  const re = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^,]+))/g;
  let m;
  while ((m = re.exec(header))) {
    fields[m[1].toLowerCase()] = (m[2] !== undefined ? m[2] : m[3]).trim();
  }
  return fields;
}

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function buildDigestHeader({ username, password, method, uri, challenge }) {
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop || 'auth';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const nc = '00000001';
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  return (
    `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", ` +
    `qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}", algorithm=MD5`
  );
}

function parseEventChunk(text) {
  if (!text || !text.includes('<EventNotificationAlert')) return null;
  const fields = {};
  for (const tag of ['eventType', 'channelID', 'dateTime', 'eventDescription', 'eventState', 'macAddress', 'ipAddress', 'licensePlate']) {
    const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
    if (m) fields[tag] = m[1].trim();
  }
  fields.raw = text.length > 4000 ? text.slice(0, 4000) : text;
  return fields;
}

function openStream({ nvr, onEvent, onError, onEnd }) {
  const baseUrl = `http://${nvr.ip}:${nvr.port || 80}/ISAPI/Event/notification/alertStream`;
  const u = new URL(baseUrl);
  const lib = u.protocol === 'https:' ? https : http;
  const password = process.env[nvr.passwordRef || ''] || '';

  function attempt(authHeader) {
    const opts = {
      method: 'GET',
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname,
      headers: {
        Accept: 'multipart/x-mixed-replace, application/xml, */*',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      rejectUnauthorized: false,
    };

    const req = lib.request(opts, (res) => {
      if (res.statusCode === 401 && !authHeader) {
        const ch = parseDigestChallenge(res.headers['www-authenticate']);
        if (!ch) {
          onError(new Error('challenge parse failed'));
          return;
        }
        const auth = buildDigestHeader({
          username: nvr.username || 'admin',
          password,
          method: 'GET',
          uri: u.pathname,
          challenge: ch,
        });
        res.resume();
        attempt(auth);
        return;
      }
      if (res.statusCode !== 200) {
        onError(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        const parts = buf.split(/--MIME_boundary\s*\r?\n/);
        if (parts.length > 1) {
          for (let i = 0; i < parts.length - 1; i++) {
            const ev = parseEventChunk(parts[i]);
            if (ev) onEvent(ev);
          }
          buf = parts[parts.length - 1];
        }
        if (buf.length > 200_000) buf = buf.slice(-50_000); // safety
      });
      res.on('end', () => onEnd?.());
      res.on('error', (err) => onError(err));
    });
    req.on('error', onError);
    req.end();
    return req;
  }

  return attempt(null);
}

async function _ship(nvrCode, ev) {
  const r = await centralClient.forwardEvent(nvrCode, ev);
  if (!r.ok) {
    await queue.push({ kind: 'event', nvrCode, payload: ev, ts: Date.now() });
    log.warn(`[poller] queued event after ${r.error}`);
  }
}

function start({ nvr }) {
  if (!nvr) {
    log.warn('[poller] no NVR configured; poller disabled');
    return null;
  }
  let backoff = config.poller.reconnectBackoffMs;
  let stopped = false;

  function loop() {
    if (stopped) return;
    log.info(`[poller] opening stream → ${nvr.ip}:${nvr.port}`);
    openStream({
      nvr,
      onEvent: (ev) => {
        log.debug(`[poller] event ${ev.eventType} ch=${ev.channelID}`);
        void _ship(nvr.code, ev);
      },
      onError: (err) => {
        log.warn(`[poller] stream error: ${err.message} — backoff ${backoff}ms`);
        setTimeout(() => {
          backoff = Math.min(backoff * 2, 60_000);
          loop();
        }, backoff);
      },
      onEnd: () => {
        log.info('[poller] stream ended, reconnecting…');
        backoff = config.poller.reconnectBackoffMs;
        setTimeout(loop, 1000);
      },
    });
  }

  loop();
  return {
    stop: () => {
      stopped = true;
    },
  };
}

module.exports = { start, parseEventChunk, buildDigestHeader };
