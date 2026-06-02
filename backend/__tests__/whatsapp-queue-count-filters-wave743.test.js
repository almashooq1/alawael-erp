/**
 * W743 — org-scoped queue-count filters for the WhatsApp /analytics tiles.
 *
 * `getAnalytics` and `findPendingReview` both scope by `organizationId`, but the
 * sibling `pendingReview` / `critical` countDocuments in the /analytics route
 * did NOT — so a multi-tenant deployment over-counted across organizations. The
 * filters are now built by one pure helper that scopes by org when present.
 */
'use strict';

const { queueCountFilters } = require('../models/WhatsAppConversation');

describe('W743 — queueCountFilters', () => {
  test('scopes both counts by organizationId when an org is given', () => {
    const f = queueCountFilters('org-1');
    expect(f.pendingReview.organizationId).toBe('org-1');
    expect(f.critical.organizationId).toBe('org-1');
  });

  test('omits organizationId when no org is given (single-tenant)', () => {
    const f = queueCountFilters(undefined);
    expect(f.pendingReview).not.toHaveProperty('organizationId');
    expect(f.critical).not.toHaveProperty('organizationId');
  });

  test('pendingReview filter targets the unresolved human-review queue', () => {
    const f = queueCountFilters('org-1');
    expect(f.pendingReview.requiresHumanReview).toBe(true);
    expect(f.pendingReview.status).toEqual({ $ne: 'resolved' });
    expect(f.pendingReview.isDeleted).toBe(false);
  });

  test('critical filter targets unresolved critical conversations', () => {
    const f = queueCountFilters('org-1');
    expect(f.critical.urgencyLevel).toBe('critical');
    expect(f.critical.status).toEqual({ $ne: 'resolved' });
    expect(f.critical.isDeleted).toBe(false);
  });
});
