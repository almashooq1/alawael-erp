/**
 * ACL HTTP Client — uniform request layer for government / external APIs.
 *
 * Features (opt-in via constructor options):
 *   - Timeouts (default 10s)
 *   - Exponential backoff retries with jitter (default 3 retries)
 *   - Circuit breaker (opens after N failures in a window)
 *   - IntegrationLog record per request (PII-redacted)
 *   - Idempotency-Key header support
 *   - Auto-park to Dead Letter Queue after final retry exhaustion
 *
 * Each adapter owns an instance with its own baseURL + config.
 */

'use strict';

const dlq = require('../../infrastructure/deadLetterQueue');
const { redact } = require('../../utils/piiRedactor');

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 3;

class CircuitBreaker {
  constructor({ failureThreshold = 5, halfOpenAfterMs = 30_000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.halfOpenAfterMs = halfOpenAfterMs;
    this.failures = 0;
    this.state = 'closed'; // 'closed' | 'open' | 'half_open'
    this.openedAt = 0;
  }
  recordSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  recordFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
  canPass() {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.halfOpenAfterMs) {
        this.state = 'half_open';
        return true;
      }
      return false;
    }
    return true; // half_open — allow a probe
  }
}

class AclClient {
  constructor({
    name,
    baseUrl,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    circuitBreaker,
    logger,
    integrationLog,
    deadLetterQueue = dlq,
    parkOnFailure = true,
  }) {
    if (!name) throw new Error('AclClient: name is required');
    this.name = name;
    this.baseUrl = (baseUrl || '').replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.circuitBreaker = circuitBreaker || new CircuitBreaker();
    this.logger = logger || console;
    this.integrationLog = integrationLog;
    this.deadLetterQueue = deadLetterQueue;
    this.parkOnFailure = parkOnFailure;
  }

  async request({ method = 'GET', path = '/', headers = {}, body, idempotencyKey, meta = {} }) {
    if (!this.circuitBreaker.canPass()) {
      const err = new Error(`Circuit breaker open for ${this.name}`);
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }

    const url = `${this.baseUrl}${path}`;
    const finalHeaders = { 'User-Agent': 'alawael-erp/1.0', ...headers };
    if (idempotencyKey) finalHeaders['Idempotency-Key'] = idempotencyKey;

    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const startedAt = Date.now();
      try {
        const result = await this._fetchWithTimeout(url, {
          method,
          headers: finalHeaders,
          body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        });
        this._log({
          method,
          url,
          status: result.status,
          startedAt,
          attempt,
          meta,
          requestBody: body,
        });
        if (result.status >= 500) {
          lastError = new Error(`HTTP ${result.status} from ${this.name}`);
          lastError.status = result.status;
        } else {
          this.circuitBreaker.recordSuccess();
          return result;
        }
      } catch (err) {
        lastError = err;
        this._log({
          method,
          url,
          status: 0,
          startedAt,
          attempt,
          meta,
          error: err.message,
          requestBody: body,
        });
      }
      if (attempt < this.retries) {
        const delay = Math.min(16_000, 2 ** attempt * 1000) + Math.floor(Math.random() * 250);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    this.circuitBreaker.recordFailure();

    if (
      this.parkOnFailure &&
      this.deadLetterQueue &&
      typeof this.deadLetterQueue.park === 'function'
    ) {
      try {
        await this.deadLetterQueue.park({
          integration: this.name,
          operation: meta.operation || null,
          method,
          endpoint: url,
          payload: redact(body),
          headers: redact(finalHeaders),
          idempotencyKey,
          correlationId: meta.correlationId || null,
          attempts: this.retries + 1,
          lastError,
          meta: redact(meta),
        });
      } catch {
        /* DLQ failure must not shadow the original error */
      }
    }

    throw lastError;
  }

  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const fetchFn = globalThis.fetch;
      if (!fetchFn) throw new Error('global fetch not available (need Node 18+)');
      const resp = await fetchFn(url, { ...options, signal: controller.signal });
      let bodyText;
      try {
        bodyText = await resp.text();
      } catch {
        bodyText = '';
      }
      return {
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries()),
        body: bodyText,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  _log(entry) {
    if (this.integrationLog && typeof this.integrationLog.record === 'function') {
      try {
        const safeEntry = {
          ...entry,
          requestBody: redact(entry.requestBody),
          meta: redact(entry.meta),
        };
        this.integrationLog.record({
          integration: this.name,
          durationMs: Date.now() - entry.startedAt,
          ...safeEntry,
        });
      } catch {
        /* never let logging fail the request */
      }
    }
    if (this.logger && this.logger.debug) {
      this.logger.debug(
        `[${this.name}] ${entry.method} ${entry.url} → ${entry.status} (attempt ${entry.attempt}, ${Date.now() - entry.startedAt}ms)${entry.error ? ' ERROR: ' + entry.error : ''}`
      );
    }
  }
}

module.exports = { AclClient, CircuitBreaker };
