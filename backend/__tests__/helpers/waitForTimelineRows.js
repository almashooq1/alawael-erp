'use strict';

/**
 * CI-load-safe polling helpers for CareTimeline core-linkage tests.
 *
 * Background: the legacy `settle()` helper (a fixed 60 ms timeout) was
 * repeatedly flaky under GitHub Actions runner pressure because async DDD
 * subscribers sometimes needed longer to write the unified-core row. These
 * helpers poll the actual DB state instead of guessing on timing.
 */

const { CareTimeline } = require('../../domains/timeline/models/CareTimeline');

async function waitForRows(query, expectedLength, { intervalMs = 25, timeoutMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await CareTimeline.find(query).lean();
    if (rows.length >= expectedLength) return rows;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return CareTimeline.find(query).lean();
}

async function waitForCount(query, expectedCount, { intervalMs = 25, timeoutMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await CareTimeline.countDocuments(query);
    if (count === expectedCount) return count;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return CareTimeline.countDocuments(query);
}

module.exports = { waitForRows, waitForCount };
