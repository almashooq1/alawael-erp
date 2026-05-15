/**
 * httpAgentPool — lazy keep-alive agents per (host:port).
 *
 * At high event volume, opening a fresh TCP connection per ISAPI call
 * dominates latency (~30ms TLS handshake vs ~3ms keep-alive reuse).
 * This pool keeps one agent per origin with `maxSockets` capped so a
 * single misbehaving NVR can't starve us.
 *
 * Env:
 *   HIKVISION_AGENT_MAX_SOCKETS      per-origin socket cap (default 8)
 *   HIKVISION_AGENT_MAX_FREE_SOCKETS retained idle sockets (default 4)
 *   HIKVISION_AGENT_KEEPALIVE_MS     keep-alive timer (default 30000)
 *   HIKVISION_AGENT_SOCKET_TIMEOUT   per-socket timeout (default 15000)
 */
'use strict';

const http = require('http');
const https = require('https');

function _env() {
  return (typeof process !== 'undefined' && process.env) || {};
}
function maxSockets() {
  return parseInt(_env().HIKVISION_AGENT_MAX_SOCKETS, 10) || 8;
}
function maxFreeSockets() {
  return parseInt(_env().HIKVISION_AGENT_MAX_FREE_SOCKETS, 10) || 4;
}
function keepAliveMs() {
  return parseInt(_env().HIKVISION_AGENT_KEEPALIVE_MS, 10) || 30_000;
}
function socketTimeoutMs() {
  return parseInt(_env().HIKVISION_AGENT_SOCKET_TIMEOUT, 10) || 15_000;
}

const httpAgents = new Map();
const httpsAgents = new Map();

function _key(host, port, secure) {
  return `${secure ? 'https' : 'http'}://${host}:${port}`;
}

function for_(host, port, secure) {
  const map = secure ? httpsAgents : httpAgents;
  const key = _key(host, port, secure);
  let agent = map.get(key);
  if (!agent) {
    const Ctor = secure ? https.Agent : http.Agent;
    agent = new Ctor({
      keepAlive: true,
      keepAliveMsecs: keepAliveMs(),
      maxSockets: maxSockets(),
      maxFreeSockets: maxFreeSockets(),
      timeout: socketTimeoutMs(),
      rejectUnauthorized: false,
    });
    map.set(key, agent);
  }
  return agent;
}

function snapshot() {
  const out = {};
  for (const [k, a] of httpAgents.entries()) {
    out[k] = _stats(a);
  }
  for (const [k, a] of httpsAgents.entries()) {
    out[k] = _stats(a);
  }
  return {
    origins: httpAgents.size + httpsAgents.size,
    maxSockets: maxSockets(),
    maxFreeSockets: maxFreeSockets(),
    keepAliveMs: keepAliveMs(),
    agents: out,
  };
}

function _stats(agent) {
  return {
    activeSockets: Object.values(agent.sockets || {}).reduce((n, arr) => n + (arr?.length || 0), 0),
    freeSockets: Object.values(agent.freeSockets || {}).reduce(
      (n, arr) => n + (arr?.length || 0),
      0
    ),
    queued: Object.values(agent.requests || {}).reduce((n, arr) => n + (arr?.length || 0), 0),
  };
}

function destroyAll() {
  for (const a of httpAgents.values()) a.destroy?.();
  for (const a of httpsAgents.values()) a.destroy?.();
  httpAgents.clear();
  httpsAgents.clear();
}

module.exports = { for: for_, snapshot, destroyAll };
