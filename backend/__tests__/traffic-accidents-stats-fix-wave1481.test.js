'use strict';

/**
 * W1481 — drift guard for the traffic-accidents /stats/overview fix.
 *
 * BUG (pre-W1481): GET /api/v1/traffic-accidents/stats/overview computed
 *   - `open` via countDocuments({ status: 'open' }) — but 'open' is NOT in the
 *     TrafficAccident status enum (pending|investigating|resolved|disputed) → always 0.
 *   - `bySeverity` via aggregate({ _id: '$severity' }) — there is NO top-level
 *     `severity` field (severity lives only nested in vehicles[].damage + injuries[])
 *     → meaningless [{ _id: null, count: total }].
 *
 * FIX: `open` = non-terminal statuses { $in: ['pending','investigating'] };
 *      group by the real top-level `status` field (byStatus), not the phantom severity.
 *
 * Static source-shape guard (no Mongo) — keeps the corrected aggregation from regressing.
 */

const fs = require('fs');
const path = require('path');

const ROUTE = path.join(__dirname, '..', 'routes', 'trafficAccidents.js');
const MODEL = path.join(__dirname, '..', 'models', 'Traffic', 'TrafficAccident.js');

describe('W1481 traffic-accidents /stats/overview fix', () => {
  const src = fs.readFileSync(ROUTE, 'utf8');

  test('does NOT count the phantom status "open" (not in the enum)', () => {
    expect(src).not.toMatch(/countDocuments\(\s*\{\s*status:\s*'open'\s*\}\s*\)/);
  });

  test('counts non-terminal statuses for the "open" KPI', () => {
    expect(src).toMatch(/\$in:\s*\[\s*'pending',\s*'investigating'\s*\]/);
  });

  test('does NOT group by the non-existent top-level $severity', () => {
    expect(src).not.toMatch(/_id:\s*'\$severity'/);
  });

  test('groups by the real top-level $status field (byStatus)', () => {
    expect(src).toMatch(/_id:\s*'\$status'/);
    expect(src).toMatch(/byStatus/);
    expect(src).not.toMatch(/data:\s*\{\s*total,\s*open,\s*bySeverity/);
  });

  test('the model status enum confirms the corrected values (no "open")', () => {
    const model = fs.readFileSync(MODEL, 'utf8');
    expect(model).toMatch(
      /ACCIDENT_STATUS_TYPES\s*=\s*\[\s*'pending',\s*'investigating',\s*'resolved',\s*'disputed'\s*\]/
    );
    // sanity: 'open' is not a declared accident status
    expect(model).not.toMatch(/ACCIDENT_STATUS_TYPES\s*=\s*\[[^\]]*'open'/);
  });
});
