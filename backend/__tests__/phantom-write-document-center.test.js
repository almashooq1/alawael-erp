/**
 * Phantom-write guard — documentCenter.service.js beneficiary link (2026-06-29).
 *
 * The service used to write `doc.linkedBeneficiary = {...}` and query
 * `'linkedBeneficiary.beneficiaryId'` / `'linkedBeneficiary.episodeId'`, but the
 * Document schema (models/Document.js) never declared a `linkedBeneficiary`
 * subdoc. Mongoose strict mode silently DROPPED the write, so linking a document
 * to a beneficiary appeared to succeed but never persisted → getBeneficiaryDocuments
 * always returned []. The `check:phantom-writes` gate missed it because it targets
 * Model.create() sites, not instance assignment / query paths.
 *
 * Fix: link via the schema's real entityType:'Beneficiary' + entityId, plus a
 * newly-declared episodeId field. This guard asserts the phantom path can't return.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SVC = fs.readFileSync(
  path.join(__dirname, '../services/documentCenter.service.js'),
  'utf8'
);
const MODEL = fs.readFileSync(path.join(__dirname, '../models/Document.js'), 'utf8');

describe('documentCenter.service — no phantom linkedBeneficiary write/query', () => {
  test('no write to a linkedBeneficiary subdoc (doc.linkedBeneficiary = ...)', () => {
    expect(SVC).not.toMatch(/doc\.linkedBeneficiary\s*=/);
  });
  test('no query on the phantom linkedBeneficiary.* path', () => {
    expect(SVC).not.toMatch(/['"]linkedBeneficiary\.[a-zA-Z]/);
  });
  test('beneficiary link uses the real entityType/entityId fields', () => {
    expect(SVC).toMatch(/entityType\s*=\s*'Beneficiary'/);
    expect(SVC).toMatch(/entityId\s*=\s*String\(beneficiaryId\)/);
  });
  test('getBeneficiaryDocuments queries entityType/entityId', () => {
    const idx = SVC.indexOf('async function getBeneficiaryDocuments');
    expect(idx).toBeGreaterThan(-1);
    const fn = SVC.slice(idx, idx + 700);
    expect(fn).toMatch(/entityType:\s*'Beneficiary'/);
    expect(fn).toMatch(/entityId:\s*String\(beneficiaryId\)/);
    expect(fn).not.toMatch(/linkedBeneficiary/);
  });
});

describe('Document model declares the fields the service writes', () => {
  test('episodeId is declared in the schema (was a phantom field)', () => {
    expect(MODEL).toMatch(/episodeId\s*:\s*\{\s*type:/);
  });
  test('entityType + entityId exist', () => {
    expect(MODEL).toMatch(/entityType\s*:\s*\{\s*type:\s*String/);
    expect(MODEL).toMatch(/entityId\s*:\s*\{\s*type:\s*String/);
  });
});
