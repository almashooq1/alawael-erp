/**
 * IntegrationLog — minimal in-memory implementation.
 *
 * In production, replace with a Mongoose-backed model that persists
 * every request/response (PII-redacted) for 7 years per ADR-009 § retention.
 */

'use strict';

class InMemoryIntegrationLog {
  constructor(max = 1000) {
    this.max = max;
    this.entries = [];
  }
  record(entry) {
    this.entries.push({ ...entry, recordedAt: new Date().toISOString() });
    if (this.entries.length > this.max) this.entries.shift();
  }
  recent(limit = 50) {
    return this.entries.slice(-limit);
  }
  clear() {
    this.entries.length = 0;
  }
}

module.exports = { InMemoryIntegrationLog };
