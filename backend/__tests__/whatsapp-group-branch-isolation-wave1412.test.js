/**
 * W1412 — WhatsApp contact-group BRANCH isolation (W1407 fast-follow).
 *
 * Same fail-open class as the W1411 conversations fix: WhatsAppContactGroup's
 * `groupScopedFilter` / `listScopedFilter` scoped by `req.user.organizationId`
 * — a field this branch-scoped platform never sets — so every group route fell
 * back to unscoped → any authenticated user could read/mutate any branch's
 * contact groups (phone-number lists). Now scoped by `branchId` via
 * `effectiveBranchScope(req)`; groups carry a `branchId` derived from the
 * creating user's branch; unmatched → null (cross-branch-admin-only = fail-closed).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { groupScopedFilter, listScopedFilter } = require('../models/WhatsAppContactGroup');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'whatsapp.routes.js'),
  'utf8'
);
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'WhatsAppContactGroup.js'),
  'utf8'
);

describe('W1412 — pure helpers scope by branchId (not the never-set organizationId)', () => {
  test('groupScopedFilter scopes by branchId', () => {
    expect(groupScopedFilter('g1', 'branch-1')).toEqual({
      _id: 'g1',
      isDeleted: false,
      branchId: 'branch-1',
    });
    expect(groupScopedFilter('g1', null)).toEqual({ _id: 'g1', isDeleted: false });
    expect(groupScopedFilter('g1', 'branch-1')).not.toHaveProperty('organizationId');
  });

  test('listScopedFilter scopes by branchId', () => {
    expect(listScopedFilter('branch-2')).toEqual({ isDeleted: false, branchId: 'branch-2' });
    expect(listScopedFilter('branch-2')).not.toHaveProperty('organizationId');
    expect(listScopedFilter(null)).toEqual({ isDeleted: false });
  });
});

describe('W1412 — source drift guard (the org-scoped group leak cannot return)', () => {
  test('group routes scope by effectiveBranchScope, not req.user.organizationId', () => {
    expect(ROUTES_SRC).toContain('effectiveBranchScope');
    // no group endpoint reads the never-set organizationId into a local scope var
    expect(ROUTES_SRC).not.toMatch(/const orgId = req\.user\?\.organizationId/);
    // groups are created with a branchId, not organizationId
    expect(ROUTES_SRC).toMatch(/branchId: branchScope,\s*\/\/ W1412/);
  });

  test('model declares a branchId field + scoping helpers filter by branchId', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{/);
    expect(MODEL_SRC).toMatch(/filter\.branchId\s*=\s*branchScope/);
    // organizationId is no longer a scoping key in the helpers
    expect(MODEL_SRC).not.toMatch(/filter\.organizationId\s*=\s*(orgId|branchScope)\b/);
  });
});
