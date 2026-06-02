/**
 * W744 — org-scoped by-ID filter for WhatsApp conversation routes.
 *
 * The path-based `/conversations/:id` (read), `/resolve`, `/assign`,
 * `/mark-read` and `/ai/insights/:conversationId` endpoints used
 * `findById` / `findByIdAndUpdate`, which ignore organization boundaries — a
 * foreign-org staff member could read/mutate another tenant's conversation by
 * id (W269 cross-tenant isolation doctrine). The filter now carries the org so
 * a cross-org id yields a clean 404 (no existence leak).
 */
'use strict';

const { byIdScopedFilter } = require('../models/WhatsAppConversation');

describe('W744 — byIdScopedFilter', () => {
  test('adds organizationId to the filter when an org is given', () => {
    expect(byIdScopedFilter('abc', 'org-1')).toEqual({ _id: 'abc', organizationId: 'org-1' });
  });

  test('omits organizationId for single-tenant / system callers', () => {
    const f = byIdScopedFilter('abc', undefined);
    expect(f).toEqual({ _id: 'abc' });
    expect(f).not.toHaveProperty('organizationId');
  });

  test('always targets the requested id', () => {
    expect(byIdScopedFilter('xyz', 'org-9')._id).toBe('xyz');
    expect(byIdScopedFilter('xyz', null)._id).toBe('xyz');
  });
});
