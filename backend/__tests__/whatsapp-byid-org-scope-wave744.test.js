/**
 * W744 / W1407 — BRANCH-scoped by-ID filter for WhatsApp conversation routes.
 *
 * The path-based `/conversations/:id` (read), `/resolve`, `/assign`,
 * `/mark-read` and `/ai/insights/:conversationId` endpoints scope by id only.
 * Originally the filter carried `organizationId` — but this branch-scoped
 * platform never sets `req.user.organizationId`, so the scope was always
 * undefined → the filter fell back to id-only → ANY authenticated user could
 * read/mutate another branch's conversation (W1407 cross-tenant PII leak).
 * The filter now carries `branchId` (from effectiveBranchScope), so a
 * foreign-branch id yields a clean 404 (no existence leak). Cross-branch roles
 * pass null/undefined scope → id-only (intended).
 */
'use strict';

const { byIdScopedFilter } = require('../models/WhatsAppConversation');

describe('W744/W1407 — byIdScopedFilter (branch-scoped)', () => {
  test('adds branchId to the filter when a branch scope is given', () => {
    expect(byIdScopedFilter('abc', 'branch-1')).toEqual({ _id: 'abc', branchId: 'branch-1' });
  });

  test('omits branchId for cross-branch / system callers (null/undefined scope)', () => {
    const f = byIdScopedFilter('abc', undefined);
    expect(f).toEqual({ _id: 'abc' });
    expect(f).not.toHaveProperty('branchId');
    expect(byIdScopedFilter('abc', null)).toEqual({ _id: 'abc' });
  });

  test('never scopes by the never-set organizationId field', () => {
    expect(byIdScopedFilter('abc', 'branch-1')).not.toHaveProperty('organizationId');
  });

  test('always targets the requested id', () => {
    expect(byIdScopedFilter('xyz', 'branch-9')._id).toBe('xyz');
    expect(byIdScopedFilter('xyz', null)._id).toBe('xyz');
  });
});
