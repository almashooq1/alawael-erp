/**
 * W743 / W1407 — BRANCH-scoped queue-count filters for the WhatsApp /analytics tiles.
 *
 * `getAnalytics`, `findPendingReview`, and these `pendingReview` / `critical`
 * countDocuments filters all scope by the same tenant key so the tiles match.
 * Originally that key was `organizationId` — never set on this branch-scoped
 * platform, so the tiles counted ALL branches (W1407). Now scoped by `branchId`
 * (from effectiveBranchScope) when a branch scope is present.
 */
'use strict';

const { queueCountFilters } = require('../models/WhatsAppConversation');

describe('W743/W1407 — queueCountFilters (branch-scoped)', () => {
  test('scopes both counts by branchId when a branch scope is given', () => {
    const f = queueCountFilters('branch-1');
    expect(f.pendingReview.branchId).toBe('branch-1');
    expect(f.critical.branchId).toBe('branch-1');
  });

  test('omits branchId when no scope is given (cross-branch role)', () => {
    const f = queueCountFilters(undefined);
    expect(f.pendingReview).not.toHaveProperty('branchId');
    expect(f.critical).not.toHaveProperty('branchId');
  });

  test('never scopes by the never-set organizationId field', () => {
    const f = queueCountFilters('branch-1');
    expect(f.pendingReview).not.toHaveProperty('organizationId');
    expect(f.critical).not.toHaveProperty('organizationId');
  });

  test('pendingReview filter targets the unresolved human-review queue', () => {
    const f = queueCountFilters('branch-1');
    expect(f.pendingReview.requiresHumanReview).toBe(true);
    expect(f.pendingReview.status).toEqual({ $ne: 'resolved' });
    expect(f.pendingReview.isDeleted).toBe(false);
  });

  test('critical filter targets unresolved critical conversations', () => {
    const f = queueCountFilters('branch-1');
    expect(f.critical.urgencyLevel).toBe('critical');
    expect(f.critical.status).toEqual({ $ne: 'resolved' });
    expect(f.critical.isDeleted).toBe(false);
  });
});
