'use strict';

/**
 * hikvision-isapi-adapter.js — Wave 106 Phase F.
 *
 * Abstracts ALL device-level I/O so the sync worker has a single,
 * mockable interface. Two implementations:
 *
 *   1. createMockIsapiAdapter() — in-memory state per deviceCode.
 *      Used by tests + dev mode. Deterministic personId generation
 *      (sha1 of templateChecksum + employeeId) so re-runs are stable.
 *      Supports error injection via opts.failures for testing.
 *
 *   2. createIsapiAdapter() — real ISAPI calls over HTTP. Stub-level
 *      implementation that documents the wire format + auth + retries.
 *      The actual HTTP calls are wrapped so a future hardening pass
 *      can swap axios for the org's HTTP client without touching the
 *      sync worker.
 *
 * Both adapters expose the same interface:
 *
 *   listPersonIds(deviceContext)              → Promise<string[]>
 *   pushPerson(deviceContext, payload)        → Promise<{personId, checksum}>
 *   deletePerson(deviceContext, personId)     → Promise<{ok}>
 *   getPersonChecksum(deviceContext, personId)→ Promise<string>
 *   ping(deviceContext)                       → Promise<{ok, latencyMs}>
 *
 * deviceContext: { deviceCode, ip, port, protocol, authMode,
 *                  credentialsRef, capabilities }
 *
 * payload (pushPerson): { templateId, employeeRef, images[], checksum? }
 *
 * The sync worker passes the device document from the registry as
 * `deviceContext` — adapters only read the fields they need.
 */

const crypto = require('crypto');
const reg = require('./hikvision.registry');

// ═══════════════════════════════════════════════════════════════
// Mock adapter — in-memory per-device state, for tests + dev
// ═══════════════════════════════════════════════════════════════

function createMockIsapiAdapter({ failures = null, logger = console } = {}) {
  // Per-device store: deviceCode → Map<personId, {checksum, employeeRef, addedAt}>
  const store = new Map();

  // Injected failure scheme:
  //   failures = { byDevice: { 'TRM-001': { listPersonIds: 'unreachable',
  //                                          pushPerson: 'corrupt' } } }
  //   failures = { rate: { push: 0.0 } }  — random failure %
  function _shouldFail(deviceCode, op) {
    if (!failures) return null;
    if (failures.byDevice?.[deviceCode]?.[op]) {
      return failures.byDevice[deviceCode][op];
    }
    if (failures.rate?.[op] && Math.random() < failures.rate[op]) {
      return 'random-injected';
    }
    return null;
  }

  function _deviceMap(deviceCode) {
    if (!store.has(deviceCode)) store.set(deviceCode, new Map());
    return store.get(deviceCode);
  }

  async function listPersonIds(deviceContext) {
    const failKind = _shouldFail(deviceContext.deviceCode, 'listPersonIds');
    if (failKind) {
      throw _isapiError('listPersonIds', deviceContext.deviceCode, failKind);
    }
    const m = _deviceMap(deviceContext.deviceCode);
    return Array.from(m.keys());
  }

  async function pushPerson(deviceContext, payload) {
    const failKind = _shouldFail(deviceContext.deviceCode, 'pushPerson');
    if (failKind) {
      throw _isapiError('pushPerson', deviceContext.deviceCode, failKind);
    }
    if (!payload || !payload.templateId || !payload.employeeRef) {
      throw _isapiError('pushPerson', deviceContext.deviceCode, 'invalid-payload');
    }
    // Deterministic personId — same template always gets the same
    // personId on the same device, which matches Hikvision's behaviour
    // when re-pushing with the same external ref.
    const personId = `mock-pid-${_shortHash(`${deviceContext.deviceCode}|${payload.templateId}`)}`;
    const checksum = _shortHash(
      `${payload.templateId}|${payload.employeeRef}|${(payload.images || [])
        .map(i => `${i.angle}:${i.ref}`)
        .join(';')}`
    );
    const m = _deviceMap(deviceContext.deviceCode);
    m.set(personId, {
      checksum,
      employeeRef: payload.employeeRef,
      templateId: String(payload.templateId),
      addedAt: new Date().toISOString(),
    });
    return { personId, checksum };
  }

  async function deletePerson(deviceContext, personId) {
    const failKind = _shouldFail(deviceContext.deviceCode, 'deletePerson');
    if (failKind) {
      throw _isapiError('deletePerson', deviceContext.deviceCode, failKind);
    }
    const m = _deviceMap(deviceContext.deviceCode);
    if (!m.has(personId)) {
      // Idempotent — deleting a non-existent person is a no-op success.
      return { ok: true, alreadyAbsent: true };
    }
    m.delete(personId);
    return { ok: true };
  }

  async function getPersonChecksum(deviceContext, personId) {
    const failKind = _shouldFail(deviceContext.deviceCode, 'getPersonChecksum');
    if (failKind) {
      throw _isapiError('getPersonChecksum', deviceContext.deviceCode, failKind);
    }
    const m = _deviceMap(deviceContext.deviceCode);
    const entry = m.get(personId);
    if (!entry) {
      throw _isapiError('getPersonChecksum', deviceContext.deviceCode, 'not-found');
    }
    return entry.checksum;
  }

  async function ping(deviceContext) {
    const failKind = _shouldFail(deviceContext.deviceCode, 'ping');
    if (failKind) {
      throw _isapiError('ping', deviceContext.deviceCode, failKind);
    }
    return { ok: true, latencyMs: 5 };
  }

  // Test introspection — never call from production code.
  function _snapshot() {
    const out = {};
    for (const [dc, m] of store) {
      out[dc] = Array.from(m.entries()).map(([pid, entry]) => ({ personId: pid, ...entry }));
    }
    return out;
  }

  function _seedDevice(deviceCode, persons) {
    const m = _deviceMap(deviceCode);
    for (const p of persons) {
      m.set(p.personId, {
        checksum: p.checksum || _shortHash(p.personId),
        employeeRef: p.employeeRef || null,
        templateId: p.templateId || null,
        addedAt: p.addedAt || new Date().toISOString(),
      });
    }
  }

  void logger;
  return {
    listPersonIds,
    pushPerson,
    deletePerson,
    getPersonChecksum,
    ping,
    _kind: 'mock',
    _snapshot,
    _seedDevice,
  };
}

// ═══════════════════════════════════════════════════════════════
// Real adapter — stub showing the ISAPI wire format
// ═══════════════════════════════════════════════════════════════

/**
 * Real ISAPI adapter. Each method maps to a documented Hikvision ISAPI
 * route. Auth is digest by default (terminals) — basic / token are
 * configurable per device via `device.authMode`.
 *
 * Endpoints (target firmware: ISAPI 2.x face library):
 *   GET    /ISAPI/Intelligent/FDLib/FDSearch    — list persons
 *   POST   /ISAPI/Intelligent/FDLib/FDSetUp     — push person + face URL
 *   POST   /ISAPI/Intelligent/FDLib/FDModify    — update person
 *   POST   /ISAPI/Intelligent/FDLib/FDSearch/Delete — delete person
 *
 * The adapter delegates the actual HTTP call to opts.httpClient (axios
 * by default) so a future hardening wave can swap in a circuit-breaker
 * + retry wrapper without touching the sync worker.
 */
function createIsapiAdapter({
  httpClient = null,
  credentialsResolver = null, // (credentialsRef) → { username, password }
  timeoutMs = reg.SYNC_DEFAULTS.REQUEST_TIMEOUT_MS,
  logger = console,
} = {}) {
  if (!httpClient || typeof httpClient.request !== 'function') {
    throw new Error('createIsapiAdapter: httpClient with request() is required');
  }
  if (!credentialsResolver || typeof credentialsResolver !== 'function') {
    throw new Error('createIsapiAdapter: credentialsResolver is required');
  }

  async function _call(deviceContext, method, path, body) {
    if (!deviceContext.credentialsRef) {
      const err = new Error(`SYNC_CREDENTIALS_MISSING: ${deviceContext.deviceCode}`);
      err.code = reg.REASON.SYNC_CREDENTIALS_MISSING;
      throw err;
    }
    const creds = await credentialsResolver(deviceContext.credentialsRef);
    const url = `${deviceContext.protocol === 'sdk' ? 'http' : 'http'}://${deviceContext.ip}:${deviceContext.port || 80}${path}`;
    try {
      const res = await httpClient.request({
        method,
        url,
        timeout: timeoutMs,
        auth: {
          username: creds.username,
          password: creds.password,
          mode: deviceContext.authMode || 'digest',
        },
        data: body,
      });
      return res.data;
    } catch (err) {
      const ee = new Error(
        `ISAPI_REQUEST_FAILED: ${deviceContext.deviceCode} ${method} ${path} — ${err.message}`
      );
      ee.code = reg.REASON.ISAPI_REQUEST_FAILED;
      ee.cause = err;
      throw ee;
    }
  }

  async function listPersonIds(deviceContext) {
    const res = await _call(deviceContext, 'POST', '/ISAPI/Intelligent/FDLib/FDSearch', {
      searchID: `sync-${Date.now()}`,
      maxResults: reg.TEMPLATE_DEFAULTS.MAX_LIBRARY_CAPACITY,
    });
    // Expected shape (per Hikvision spec):
    //   { FDLibSearch: { matchList: [{ FPID: 'pid', ... }, ...] } }
    const matches = res?.FDLibSearch?.matchList || [];
    return matches.map(m => String(m.FPID || m.personID)).filter(Boolean);
  }

  async function pushPerson(deviceContext, payload) {
    if (!payload?.templateId || !payload?.employeeRef) {
      const err = new Error(`ISAPI_RESPONSE_INVALID: pushPerson payload`);
      err.code = reg.REASON.ISAPI_RESPONSE_INVALID;
      throw err;
    }
    const res = await _call(deviceContext, 'POST', '/ISAPI/Intelligent/FDLib/FDSetUp', {
      faceURL: (payload.images || []).map(i => i.ref),
      modelData: payload.checksum || null,
      externalID: String(payload.employeeRef),
      templateRef: String(payload.templateId),
    });
    const personId = String(res?.FPID || res?.personID || '');
    const checksum = String(res?.modelData || res?.checksum || '');
    if (!personId) {
      const err = new Error(`ISAPI_RESPONSE_INVALID: pushPerson returned no personId`);
      err.code = reg.REASON.ISAPI_RESPONSE_INVALID;
      throw err;
    }
    return { personId, checksum };
  }

  async function deletePerson(deviceContext, personId) {
    const res = await _call(deviceContext, 'PUT', '/ISAPI/Intelligent/FDLib/FDSearch/Delete', {
      FPID: [{ value: String(personId) }],
    });
    return { ok: true, raw: res };
  }

  async function getPersonChecksum(deviceContext, personId) {
    const res = await _call(deviceContext, 'POST', '/ISAPI/Intelligent/FDLib/FDSearch', {
      FPID: [{ value: String(personId) }],
    });
    const entry = res?.FDLibSearch?.matchList?.[0];
    return String(entry?.modelData || entry?.checksum || '');
  }

  async function ping(deviceContext) {
    const t = Date.now();
    await _call(deviceContext, 'GET', '/ISAPI/System/deviceInfo');
    return { ok: true, latencyMs: Date.now() - t };
  }

  void logger;
  return {
    listPersonIds,
    pushPerson,
    deletePerson,
    getPersonChecksum,
    ping,
    _kind: 'real',
  };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function _shortHash(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);
}

function _isapiError(operation, deviceCode, kind) {
  const err = new Error(`ISAPI ${operation} failed on ${deviceCode}: ${kind}`);
  if (kind === 'unreachable') err.code = reg.REASON.SYNC_DEVICE_UNREACHABLE;
  else if (kind === 'invalid-payload') err.code = reg.REASON.ISAPI_RESPONSE_INVALID;
  else err.code = reg.REASON.ISAPI_REQUEST_FAILED;
  err.operation = operation;
  err.deviceCode = deviceCode;
  err.kind = kind;
  return err;
}

module.exports = { createMockIsapiAdapter, createIsapiAdapter };
