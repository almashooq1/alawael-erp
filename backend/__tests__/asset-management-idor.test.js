/**
 * Asset-management IDOR / state-machine / value-integrity guards (2026-06-29 hunt).
 * Every tenant-scoped model declares camelCase branchId; most handlers use
 * branchFilter(req)/scopedById/mergeTenantFilter. These lock the depreciation
 * surface (was fully unscoped), the dashboard Asset counts, the transfer state
 * machine, and the net-book-value floor.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/asset-management.routes.js'), 'utf8');
const DEP_MODEL = fs.readFileSync(
  path.join(__dirname, '../models/AssetDepreciationSchedule.js'),
  'utf8'
);

describe('asset depreciation — branch isolation + state machine', () => {
  test('GET /depreciation is branch-scoped', () => {
    const i = SRC.indexOf("router.get('/depreciation'");
    const block = SRC.slice(i, i + 500);
    expect(block).toMatch(/const filter = mergeTenantFilter\(req\)/);
  });
  test('POST /depreciation verifies asset ownership + stamps branchId', () => {
    const i = SRC.indexOf("router.post('/depreciation'");
    const block = SRC.slice(i, i + 1300);
    expect(block).toMatch(/Asset\.findOne\(\{ _id: assetId, \.\.\.scope \}\)/);
    expect(block).toMatch(/req\.branchScope\?\.branchId\) depPayload\.branchId/);
  });
  test('PATCH /depreciation/:id/post scopes by branch + requires status scheduled', () => {
    const i = SRC.indexOf("/depreciation/:id/post");
    const block = SRC.slice(i, i + 700);
    expect(block).toMatch(/findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\), status: 'scheduled' \}/);
    expect(block).not.toMatch(/AssetDepreciationSchedule\.findByIdAndUpdate\(\s*req\.params\.id/);
  });
});

describe('asset dashboard — Asset counts are branch-scoped', () => {
  test('the five Asset.countDocuments include the tenant filter', () => {
    const i = SRC.indexOf("router.get('/dashboard'");
    const block = SRC.slice(i, i + 1400);
    expect(block).toMatch(/Asset\.countDocuments\(tenant\)/);
    expect(block).toMatch(/Asset\.countDocuments\(\{ \.\.\.tenant, status: 'active' \}\)/);
    expect(block).toMatch(/Asset\.countDocuments\(\{ \.\.\.tenant, status: 'maintenance' \}\)/);
    expect(block).not.toMatch(/Asset\.countDocuments\(\),/);
  });
});

describe('asset transfer — state machine + ownership move', () => {
  test('approve only a pending transfer', () => {
    const i = SRC.indexOf("/transfers/:id/approve");
    const block = SRC.slice(i, i + 500);
    expect(block).toMatch(/\.\.\.scopedById\(req, req\.params\.id\), status: 'pending'/);
  });
  test('reject only a pending transfer', () => {
    const i = SRC.indexOf("/transfers/:id/reject");
    const block = SRC.slice(i, i + 500);
    expect(block).toMatch(/\.\.\.scopedById\(req, req\.params\.id\), status: 'pending'/);
  });
  test('receive requires approved status and moves the asset branchId', () => {
    const i = SRC.indexOf("/transfers/:id/receive");
    const block = SRC.slice(i, i + 1300);
    expect(block).toMatch(/transfer\.status !== 'approved'/);
    expect(block).toMatch(/branchId: transfer\.toBranchId/);
  });
});

describe('asset depreciation — value integrity', () => {
  test('netBookValue has a min:0 floor', () => {
    expect(DEP_MODEL).toMatch(/netBookValue: \{ type: Number, required: true, min: 0 \}/);
  });
});
