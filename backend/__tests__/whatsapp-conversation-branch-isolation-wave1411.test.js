/**
 * W1411 — WhatsApp conversation BRANCH isolation (closes the W1407 leak).
 *
 * W1407 finding: `/conversations` (+ pending-review, byId read/resolve/assign/
 * mark-read, insights, analytics) scoped by `req.user.organizationId` — a field
 * this branch-scoped platform NEVER sets. So the scope was always undefined →
 * the filters fell back to unscoped → ANY authenticated user could read every
 * branch's WhatsApp conversations + message PII (fails OPEN).
 *
 * Fix: scope by `branchId` via `effectiveBranchScope(req)`; the webhook derives
 * the conversation's `branchId` from the matched beneficiary; unmatched inbound
 * → branchId null (visible only to cross-branch roles = fail-closed).
 *
 * This guard pairs the pure-helper behavior with a source drift check so the
 * never-set-organizationId scoping cannot silently return.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { byIdScopedFilter, queueCountFilters } = require('../models/WhatsAppConversation');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'whatsapp.routes.js'),
  'utf8'
);
const WEBHOOK_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'whatsapp', 'whatsappWebhook.service.js'),
  'utf8'
);
const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'WhatsAppConversation.js'),
  'utf8'
);

describe('W1411 — pure helpers scope by branchId (not the never-set organizationId)', () => {
  test('byIdScopedFilter scopes by branchId', () => {
    expect(byIdScopedFilter('id1', 'branch-1')).toEqual({ _id: 'id1', branchId: 'branch-1' });
    expect(byIdScopedFilter('id1', null)).toEqual({ _id: 'id1' });
    expect(byIdScopedFilter('id1', 'branch-1')).not.toHaveProperty('organizationId');
  });

  test('queueCountFilters scopes by branchId', () => {
    const f = queueCountFilters('branch-2');
    expect(f.pendingReview.branchId).toBe('branch-2');
    expect(f.critical.branchId).toBe('branch-2');
    expect(f.pendingReview).not.toHaveProperty('organizationId');
  });

  // NOTE: findPendingReview + getAnalytics are mongoose schema STATICS. Under
  // jest.setup.js the mongoose model is mocked, so statics aren't attached and
  // can't be invoked here — their branchId scoping is asserted via the source
  // drift guard below (q.branchId / match.branchId in the model source).
});

describe('W1411 — source drift guard (the org-scoped leak cannot return)', () => {
  test('routes import + use effectiveBranchScope for conversation scoping', () => {
    expect(ROUTES_SRC).toContain('effectiveBranchScope');
    // list endpoint scopes by branchId from effectiveBranchScope
    expect(ROUTES_SRC).toMatch(/filter\.branchId\s*=\s*branchScope/);
    // by-id routes pass the branch scope, not the never-set org
    expect(ROUTES_SRC).toContain('byIdScopedFilter(req.params.id, effectiveBranchScope(req))');
  });

  test('routes no longer scope conversations by req.user.organizationId', () => {
    expect(ROUTES_SRC).not.toContain('byIdScopedFilter(req.params.id, req.user?.organizationId)');
    expect(ROUTES_SRC).not.toContain('findPendingReview(req.user?.organizationId)');
    expect(ROUTES_SRC).not.toMatch(/filter\.organizationId\s*=\s*req\.user/);
  });

  test('webhook derives + persists branchId from the matched beneficiary', () => {
    expect(WEBHOOK_SRC).toContain('getBeneficiaryModel');
    expect(WEBHOOK_SRC).toMatch(/branchId,\s*\/\/ W1407/);
  });

  test('all 4 model scoping helpers filter by branchId (not organizationId)', () => {
    expect(MODEL_SRC).toMatch(/filter\.branchId\s*=\s*branchScope/); // byIdScopedFilter
    expect(MODEL_SRC).toMatch(/q\.branchId\s*=\s*branchScope/); // findPendingReview
    expect(MODEL_SRC).toMatch(/base\.branchId\s*=\s*branchScope/); // queueCountFilters
    expect(MODEL_SRC).toMatch(/match\.branchId\s*=\s*new mongoose\.Types\.ObjectId/); // getAnalytics
    // the never-set organizationId must no longer be a scoping key in any helper
    expect(MODEL_SRC).not.toMatch(/\.organizationId\s*=\s*(orgId|branchScope)\b/);
  });
});
