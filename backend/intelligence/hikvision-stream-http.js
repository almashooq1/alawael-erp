'use strict';

/**
 * hikvision-stream-http.js — Wave 109.
 *
 * HTTP transport abstraction for ISAPI alert streams. The
 * EventStreamClient does NOT touch Node's http module directly — it
 * holds an injected `transport` with two methods:
 *
 *   request(opts) → Promise<{ status, headers, body }>
 *     body: a Node Readable that emits 'data' (Buffer) / 'end' /
 *           'error' events. Closing the body ends the stream.
 *   abort(handle) → void   (best-effort cancellation)
 *
 * Two implementations:
 *
 *   1. createMockHttpStreamer() — in-process. Tests obtain a handle
 *      via mock.connect(deviceCode) → { write(chunk), close(), error }
 *      so they can simulate device behaviour deterministically.
 *
 *   2. createRealHttpStreamer({ logger }) — wraps Node's http/https
 *      with digest auth. Production path. Kept stub-level here
 *      because the hardening pass (TLS pinning, body framing limits)
 *      belongs to a later wave.
 */

const http = require('http');
const https = require('https');
const { PassThrough } = require('stream');

// ═══════════════════════════════════════════════════════════════
// Mock streamer — used by tests + dev
// ═══════════════════════════════════════════════════════════════

function createMockHttpStreamer() {
  // deviceCode → { stream: PassThrough, status, headers, queued? }
  const connections = new Map();
  // Optional per-device failure injection set by tests.
  const failures = new Map();

  function _failKindFor(deviceCode) {
    return failures.get(deviceCode) || null;
  }

  function _key(opts) {
    // The supervisor passes deviceCode in opts.meta; fall back to URL.
    return (opts && opts.meta && opts.meta.deviceCode) || opts.url || '<unknown>';
  }

  async function request(opts = {}) {
    const key = _key(opts);
    const failKind = _failKindFor(key);
    if (failKind === 'connect-refused') {
      const err = new Error('ECONNREFUSED');
      err.code = 'ECONNREFUSED';
      throw err;
    }
    if (failKind === 'unauthorized') {
      return {
        status: 401,
        headers: { 'www-authenticate': 'Digest realm="ISAPI"' },
        body: _emptyBody(),
      };
    }
    if (failKind === 'server-error') {
      return { status: 503, headers: {}, body: _emptyBody() };
    }

    const body = new PassThrough();
    connections.set(key, { body, openedAt: new Date() });
    return { status: 200, headers: { 'content-type': 'multipart/mixed; boundary=mock' }, body };
  }

  function abort(handle) {
    // No-op for mock — the test calls close() directly via the handle
    // returned by mock.connect().
    void handle;
  }

  // ─── Test introspection / control surface ────────────────────

  function connect(deviceCode) {
    // The test calls this AFTER request() was called for that device.
    const slot = connections.get(deviceCode);
    if (!slot) {
      throw new Error(`mock.connect: no live connection for ${deviceCode}`);
    }
    return {
      write(chunkOrString) {
        const b = Buffer.isBuffer(chunkOrString)
          ? chunkOrString
          : Buffer.from(String(chunkOrString), 'utf8');
        slot.body.write(b);
      },
      close() {
        slot.body.end();
        connections.delete(deviceCode);
      },
      error(message = 'simulated transport error') {
        const err = new Error(message);
        slot.body.destroy(err);
        connections.delete(deviceCode);
      },
      isOpen() {
        return connections.has(deviceCode);
      },
    };
  }

  function injectFailure(deviceCode, kind) {
    if (kind) failures.set(deviceCode, kind);
    else failures.delete(deviceCode);
  }

  function clearFailures() {
    failures.clear();
  }

  function _snapshot() {
    return {
      openCount: connections.size,
      devices: Array.from(connections.keys()),
    };
  }

  return {
    request,
    abort,
    // mock-only:
    connect,
    injectFailure,
    clearFailures,
    _snapshot,
    _kind: 'mock',
  };
}

function _emptyBody() {
  const s = new PassThrough();
  s.end();
  return s;
}

// ═══════════════════════════════════════════════════════════════
// Real streamer — production HTTP/HTTPS path (stub-level)
// ═══════════════════════════════════════════════════════════════

function createRealHttpStreamer({ logger = console, credentialsResolver = null } = {}) {
  if (!credentialsResolver) {
    throw new Error('createRealHttpStreamer: credentialsResolver is required');
  }

  async function request(opts = {}) {
    const { method = 'GET', url, headers = {}, credentialsRef = null, signal = null } = opts;
    if (!url) throw new Error('createRealHttpStreamer: url is required');
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;

    const creds = credentialsRef ? await credentialsResolver(credentialsRef) : null;
    // NOTE: digest auth challenge/response is a two-leg dance. We do
    // basic-auth fallback here as a stub; the hardening wave swaps to
    // a proper digest negotiation per RFC 7616.
    const finalHeaders = { ...headers };
    if (creds && creds.username) {
      const tok = Buffer.from(`${creds.username}:${creds.password || ''}`).toString('base64');
      finalHeaders['Authorization'] = `Basic ${tok}`;
    }

    return new Promise((resolve, reject) => {
      const req = lib.request(
        {
          method,
          hostname: u.hostname,
          port: u.port || (isHttps ? 443 : 80),
          path: u.pathname + (u.search || ''),
          headers: finalHeaders,
        },
        res => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers || {},
            body: res, // IncomingMessage is a Readable
          });
        }
      );
      req.on('error', err => {
        logger.warn(`[stream-http] request error ${url}: ${err.message}`);
        reject(err);
      });
      if (signal) {
        signal.addEventListener('abort', () => req.destroy());
      }
      req.end();
    });
  }

  function abort(handle) {
    if (handle && typeof handle.destroy === 'function') {
      try {
        handle.destroy();
      } catch (err) {
        void err;
      }
    }
  }

  return { request, abort, _kind: 'real' };
}

module.exports = { createMockHttpStreamer, createRealHttpStreamer };
