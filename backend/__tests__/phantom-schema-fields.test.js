/**
 * Phantom schema-field guards (2026-06-29 phantom sweep — gate blind spots).
 *
 * Mongoose strict mode silently DROPS a write to an undeclared field and a query
 * on an undeclared path ALWAYS returns empty. The `check:phantom-writes` gate
 * only catches Model.create() sites; these were instance-assign / findByIdAndUpdate
 * / dotted-path-query phantoms it can't see. Each fix either declares the missing
 * field (so the existing write persists) or points the code at the real field.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const read = p => fs.readFileSync(path.join(__dirname, p), 'utf8');

const DOC_MODEL = read('../models/Document.js');
const LEAVE_MODEL = read('../models/leave.model.js');
const ALERT_MODEL = read('../domains/goals/models/MeasureAlert.js');
const BEN_CORE = read('../services/beneficiaryCore.service.js');
const BULK = read('../services/documents/documentBulk.service.js');
const RETENTION = read('../services/documents/documentRetention.service.js');

describe('MeasureAlert — recommendation-bundle idempotency link declared', () => {
  test('linkedRecommendationBundleId is a real schema field', () => {
    // was undeclared → updateOne dropped it → `: null` matched all → duplicate AI bundles
    expect(ALERT_MODEL).toMatch(/linkedRecommendationBundleId:\s*\{\s*[\s\S]*?type:/);
  });
});

describe('Leave — approval/rejection audit declared', () => {
  test.each(['approvedDate', 'approvalNotes', 'rejectedBy', 'rejectedDate', 'rejectionReason'])(
    'leave schema declares %s',
    field => {
      expect(LEAVE_MODEL).toMatch(new RegExp(`${field}:\\s*\\{?`));
    }
  );
});

describe('Document — previously-phantom fields now declared', () => {
  test('episodeId declared', () => {
    expect(DOC_MODEL).toMatch(/episodeId:\s*\{\s*type:/);
  });
  test('soft-delete audit (deletedAt/deletedBy) declared', () => {
    expect(DOC_MODEL).toMatch(/deletedAt:\s*\{\s*type:\s*Date/);
    expect(DOC_MODEL).toMatch(/deletedBy:\s*\{\s*type:/);
  });
  test('retentionPolicy subdoc (reviewRequired/legalHold/legalHold*) declared', () => {
    const i = DOC_MODEL.indexOf('retentionPolicy:');
    expect(i).toBeGreaterThan(-1);
    const block = DOC_MODEL.slice(i, i + 320);
    expect(block).toMatch(/reviewRequired/);
    expect(block).toMatch(/legalHold:/);
    expect(block).toMatch(/legalHoldReason/);
  });
  test('sharedWith[].sharedBy declared', () => {
    expect(DOC_MODEL).toMatch(/sharedBy:\s*\{\s*type:/);
  });
});

describe('Document code paths point at real fields', () => {
  test('beneficiaryCore 360 docs query uses entityType/entityId + status (not metadata.beneficiaryId/isDeleted)', () => {
    const i = BEN_CORE.indexOf('async _getDocuments');
    const fn = BEN_CORE.slice(i, i + 800);
    expect(fn).toMatch(/entityType:\s*'Beneficiary'/);
    expect(fn).not.toMatch(/metadata\.beneficiaryId/);
  });
  test('bulk soft-delete writes status:محذوف, not phantom isDeleted', () => {
    const i = BULK.indexOf('bulkDelete');
    const fn = BULK.slice(i, i + 600);
    expect(fn).toMatch(/status:\s*'محذوف'/);
    expect(fn).not.toMatch(/isDeleted:\s*true/);
  });
  test('bulk archive/restore use Arabic enum values, not english archived/active', () => {
    expect(BULK).not.toMatch(/status:\s*'archived'/);
    expect(BULK).not.toMatch(/status:\s*'active'/);
    expect(BULK).toMatch(/status:\s*'مؤرشف'/);
    expect(BULK).toMatch(/status:\s*'نشط'/);
  });
  test('bulk workflow-status write targets the string field, not a phantom subdoc path', () => {
    const i = BULK.indexOf('bulkUpdateStatus');
    const fn = BULK.slice(i, i + 900);
    expect(fn).toMatch(/workflowStatus:\s*status/);
  });
  test('retention sweeper auto-delete writes status:محذوف, not phantom isDeleted', () => {
    expect(RETENTION).not.toMatch(/isDeleted:\s*true/);
    expect(RETENTION).toMatch(/status:\s*'محذوف'/);
  });
});
