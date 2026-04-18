/**
 * adapter-audit-ttl-guard.test.js — PDPL retention TTL is wired.
 *
 * The AdapterAudit model is supposed to auto-purge rows after 730
 * days (or PDPL_AUDIT_TTL_DAYS). That relies on two things on the
 * schema source:
 *
 *   1. An `expiresAt` Date field computed from the retention window.
 *   2. A TTL index: `{ expiresAt: 1 }` with `expireAfterSeconds: 0`.
 *
 * If anyone removes either, Mongo stops purging silently and the DB
 * grows unbounded — plus PDPL's "don't hold PII beyond the retention
 * window" rule is violated. This test reads the source, not a live
 * connection, so it runs in any jest env.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'AdapterAudit.js'), 'utf8');

describe('AdapterAudit PDPL TTL guard', () => {
  it('has an expiresAt field with a default computed from retention', () => {
    expect(SRC).toMatch(/expiresAt\s*:\s*\{[\s\S]*?type:\s*Date[\s\S]*?default:\s*\(\)/);
  });

  it('declares a Mongo TTL index on expiresAt with expireAfterSeconds: 0', () => {
    // Structural check — matches Mongoose's index({field: 1}, { expireAfterSeconds: 0 }).
    expect(SRC).toMatch(
      /index\s*\(\s*\{\s*expiresAt\s*:\s*1\s*\}\s*,\s*\{\s*expireAfterSeconds\s*:\s*0\s*\}\s*\)/
    );
  });

  it('retention window is configurable via PDPL_AUDIT_TTL_DAYS env', () => {
    expect(SRC).toMatch(/process\.env\.PDPL_AUDIT_TTL_DAYS/);
  });

  it('default retention is 730 days (Saudi PDPL baseline)', () => {
    expect(SRC).toMatch(/PDPL_AUDIT_TTL_DAYS[\s\S]*?\|\|\s*730\b/);
  });
});
