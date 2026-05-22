'use strict';

// Backend's default jest setup mocks mongoose; this test inspects
// real schema paths so we MUST unmock first (same convention as the
// rest of the wave-tests in this repo — see access-review-wave38 etc).
jest.unmock('mongoose');

/**
 * incident-report-branch-required-wave277h.test.js — Wave 277h.
 *
 * Closes the gap surfaced by this session's quality audit:
 * `models/quality/IncidentReport.js` (legacy adverse-event model) had
 * `branch_id` declared but OPTIONAL. Adverse-event records that lack a
 * branch attribution are invisible to cross-branch isolation queries
 * (W269 policy) — a row with branch_id=null is potentially visible
 * across every branch.
 *
 * W277h makes `branch_id` required + indexed. Mirrors the Phase 29
 * `Incident.model.js` (in same directory) which has required branchId
 * since W96. Forward-only — any legacy row missing branch_id needs a
 * one-time backfill before deploy.
 *
 * Audit-correction note: the original quality audit flagged 4 models
 * as "missing branchId" — actually 3 of them have `branch_id` and are
 * correctly optional by design:
 *   - QualityStandard: tenant/org-wide (CBAHI/JCI standards apply
 *     across all branches) — never branch-scoped
 *   - QualityIndicator: definitions; can be org-wide OR branch-specific
 *   - QualityMeasurement: measurements; can be branch row OR org
 *     aggregate
 * Only IncidentReport actually warrants the required flag.
 *
 * No DB needed — validation is purely Mongoose-schema-level.
 */

// Isolate to keep mongoose state clean between tests
beforeEach(() => {
  jest.resetModules();
});

describe('Wave 277h — IncidentReport.branch_id required', () => {
  test('schema declares branch_id as required + indexed', () => {
    const IncidentReport = require('../models/quality/IncidentReport');
    const path = IncidentReport.schema.path('branch_id');
    expect(path).toBeTruthy();
    expect(path.isRequired).toBe(true);
    // Either an index option or an explicit index declaration counts.
    const opts = path.options || {};
    const indexes = IncidentReport.schema.indexes ? IncidentReport.schema.indexes() : [];
    const declaredIndexElsewhere = indexes.some(
      ([fields]) => fields && Object.prototype.hasOwnProperty.call(fields, 'branch_id')
    );
    expect(opts.index === true || declaredIndexElsewhere).toBe(true);
  });

  test('validation rejects a row without branch_id', async () => {
    const IncidentReport = require('../models/quality/IncidentReport');
    const doc = new IncidentReport({
      title: 'Fall in PT room',
      description: 'Beneficiary fell during transfer',
      incident_type: 'fall',
      severity: 'moderate',
      incident_date: new Date(),
      reported_by: new (require('mongoose').Types.ObjectId)(),
    });
    let err = null;
    try {
      await doc.validate();
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    // Mongoose validator reports the missing required path under `errors.branch_id`.
    expect(err.errors && err.errors.branch_id).toBeTruthy();
  });

  test('validation passes when branch_id is set', async () => {
    const mongoose = require('mongoose');
    const IncidentReport = require('../models/quality/IncidentReport');
    const doc = new IncidentReport({
      title: 'Equipment failure',
      description: 'IV pump alarm continuous',
      incident_type: 'equipment_failure',
      severity: 'minor',
      incident_date: new Date(),
      reported_by: new mongoose.Types.ObjectId(),
      branch_id: new mongoose.Types.ObjectId(),
    });
    await expect(doc.validate()).resolves.toBeUndefined();
  });
});

// ─── Audit-correction sentinel ────────────────────────────────────
//
// Documents the audit-correction finding: the other 3 models that
// were FLAGGED as "missing branchId" are correctly designed without
// the required flag. If a future contributor mass-applies required
// branchId to all quality models, this sentinel fails — forcing them
// to re-justify the change per-model.

describe('Wave 277h — audit-correction sentinel: 3 quality models intentionally have OPTIONAL branch_id', () => {
  test('QualityStandard has NO branch_id (tenant/org-wide accreditation standards)', () => {
    const QualityStandard = require('../models/quality/QualityStandard.model');
    const path = QualityStandard.schema.path('branch_id');
    expect(path).toBeFalsy();
  });

  test('QualityIndicator has OPTIONAL branch_id (can be org-wide OR branch-specific)', () => {
    const QualityIndicator = require('../models/quality/QualityIndicator');
    const path = QualityIndicator.schema.path('branch_id');
    expect(path).toBeTruthy();
    expect(path.isRequired).toBeFalsy();
  });

  test('QualityMeasurement has OPTIONAL branch_id (can be branch row OR org aggregate)', () => {
    const QualityMeasurement = require('../models/quality/QualityMeasurement');
    const path = QualityMeasurement.schema.path('branch_id');
    expect(path).toBeTruthy();
    expect(path.isRequired).toBeFalsy();
  });
});
