/**
 * adapterAuditLogger.js — PDPL-safe audit writer for gov adapter calls.
 *
 * Three design rules:
 *  1. NEVER block the adapter response on audit write failure. If Mongo
 *     is down, the verify still succeeds and we fall back to console
 *     logging. Audit = nice-to-have, verification = critical.
 *  2. Hash PII targets (national IDs, iqamas, license numbers) with
 *     SHA-256 before persisting. The audit row must NOT itself be a
 *     PII store — it's a "someone-accessed-this-record" trail.
 *  3. Fire-and-forget by default. Callers shouldn't await unless they
 *     really need write confirmation (e.g. in tests).
 *
 * Usage:
 *   const audit = require('./adapterAuditLogger');
 *
 *   await audit.record({
 *     actor: req.user,
 *     provider: 'gosi',
 *     operation: 'verify',
 *     mode: result.mode,
 *     target: nationalId,
 *     targetKind: 'nationalId',
 *     status: result.status,
 *     latencyMs: result.latencyMs,
 *     ipHash: audit.hashIp(req.ip),
 *     entityRef: { kind: 'Employee', id: emp._id },
 *   });
 */

'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');
const rateLimiter = require('./adapterRateLimiter');
const metricsRegistry = require('./adapterMetricsRegistry');

class RateLimitError extends Error {
  constructor(details) {
    super(details.reason || `rate limit exceeded for ${details.provider}`);
    this.name = 'RateLimitError';
    this.code = 'RATE_LIMITED';
    this.retryAfterMs = details.retryAfterMs;
    this.scope = details.scope;
    this.provider = details.provider;
    this.statusCode = 429;
  }
}

function hashString(s, salt = process.env.JWT_SECRET || 'alawael-pdpl-salt') {
  if (!s) return '';
  return crypto.createHash('sha256').update(`${s}:${salt}`).digest('hex').slice(0, 32);
}

function hashIp(ip) {
  return hashString(ip || '');
}

async function record(entry) {
  // In-memory counters first — these are what Prometheus scrapes. Even
  // if the Mongo write below fails, Grafana still sees the attempt.
  const success = entry.success !== false && !['error', 'unknown'].includes(entry.status);
  metricsRegistry.recordCall({
    provider: entry.provider,
    status: entry.status,
    success,
    latencyMs: entry.latencyMs,
  });

  try {
    const AdapterAudit = require('../models/AdapterAudit');
    const row = {
      actorUserId: entry.actor?.id || entry.actor?._id,
      actorEmail: entry.actor?.email,
      actorRole: entry.actor?.role,
      provider: entry.provider,
      operation: entry.operation,
      mode: entry.mode,
      targetHash: entry.target ? hashString(String(entry.target)) : undefined,
      targetKind: entry.targetKind,
      status: entry.status || 'unknown',
      latencyMs: entry.latencyMs,
      success,
      errorMessage: entry.errorMessage,
      ipHash: entry.ipHash,
      userAgent: entry.userAgent ? String(entry.userAgent).slice(0, 200) : undefined,
      correlationId: entry.correlationId,
      entityRef: entry.entityRef,
    };
    // Non-blocking write
    await AdapterAudit.create(row);
  } catch (err) {
    // Audit failures must never break the main flow.
    logger.warn('[adapter-audit] write failed — fallback to console', {
      provider: entry.provider,
      operation: entry.operation,
      status: entry.status,
      err: err?.message,
    });
  }
}

/**
 * Helper: wrap an adapter call with auto-audit. Returns the adapter's
 * result unchanged; audit write happens in parallel (not awaited).
 *
 *   const result = await audit.wrap({ req, provider: 'gosi', operation: 'verify',
 *     target: nid, targetKind: 'nationalId' }, () => gosi.verify({ nationalId: nid }));
 */
async function wrap(context, fn) {
  const start = Date.now();
  // Rate-limit check BEFORE the network call — protects cost & quota.
  // Skip only if explicitly opted out (e.g. for test-connection pings).
  if (context.provider && !context.skipRateLimit) {
    const rl = rateLimiter.take(context.provider, {
      actorId: context.req?.user?.id,
      actorEmail: context.req?.user?.email,
      ipHash: context.req ? hashIp(context.req.ip) : undefined,
    });
    if (!rl.allowed) {
      // Audit the rejection so ops sees cost attempts
      record({
        actor: context.req?.user,
        provider: context.provider,
        operation: context.operation,
        target: context.target,
        targetKind: context.targetKind,
        status: 'rate_limited',
        success: false,
        errorMessage: rl.reason,
        ipHash: context.req ? hashIp(context.req.ip) : undefined,
        userAgent: context.req?.get?.('user-agent'),
        correlationId: context.correlationId || context.req?.id,
        entityRef: context.entityRef,
      }).catch(() => {
        /* ignore */
      });
      throw new RateLimitError({ ...rl, provider: context.provider });
    }
  }
  try {
    const result = await fn();
    // Fire-and-forget — don't await the audit write
    record({
      actor: context.req?.user,
      provider: context.provider,
      operation: context.operation,
      mode: result?.mode,
      target: context.target,
      targetKind: context.targetKind,
      status: result?.status,
      latencyMs: result?.latencyMs ?? Date.now() - start,
      errorMessage: result?.errorMessage || result?.message,
      success: result?.status !== 'unknown' && result?.status !== 'error',
      ipHash: context.req ? hashIp(context.req.ip) : undefined,
      userAgent: context.req?.get?.('user-agent'),
      entityRef: context.entityRef,
    }).catch(() => {
      /* already logged inside record() */
    });
    return result;
  } catch (err) {
    record({
      actor: context.req?.user,
      provider: context.provider,
      operation: context.operation,
      target: context.target,
      targetKind: context.targetKind,
      status: 'error',
      latencyMs: Date.now() - start,
      errorMessage: err?.message,
      success: false,
      ipHash: context.req ? hashIp(context.req.ip) : undefined,
      userAgent: context.req?.get?.('user-agent'),
      entityRef: context.entityRef,
    }).catch(() => {
      /* already logged */
    });
    throw err;
  }
}

module.exports = { record, wrap, hashString, hashIp, RateLimitError };
