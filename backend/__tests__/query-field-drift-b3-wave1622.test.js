'use strict';
/**
 * W1622 — query field-name drift, batch 3 (continuation of W1620 #980 / W1621 #982). Verified against
 * each model's real schema paths.
 *
 * - branch-enhanced: `Branch.find({ isActive: true })` — Branch has no `isActive`; its field is `status`
 *   (enum active|inactive|maintenance|opening_soon). The active-branches list matched nothing. → status:'active'.
 * - parentPortal: PortalNotification has `guardianId`, not `recipientId`. Four sites keyed the recipient
 *   as `recipientId` → the notification LIST + unread count + mark-all-read + mark-selected-read all
 *   matched nothing (parent saw no notifications, couldn't mark read). → guardianId. (The Message-send
 *   feature's own `recipientId` is a different model and is left untouched.)
 */
const fs = require('fs');
const path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');

describe('W1622 query field-drift batch 3', () => {
  test('branch-enhanced active-branch list queries status, not isActive', () => {
    const s = R('branch-enhanced.routes.js');
    expect(s).not.toMatch(/Branch\.find\(\{ isActive: true \}\)/);
    expect(s).toMatch(/Branch\.find\(\{ status: 'active' \}\)/);
  });

  test('parentPortal PortalNotification queries key on guardianId, not recipientId', () => {
    const s = R('parentPortal.routes.js');
    // the 4 PortalNotification recipient filters now use guardianId
    expect(s).toMatch(/const query = \{ guardianId \};/);
    expect(s).toMatch(/\{ guardianId, isRead: false \}/);
    expect(s).toMatch(/\{ _id: \{ \$in: ids \}, guardianId \}/);
    // no recipientId left inside a PortalNotification query filter
    expect(s).not.toMatch(/recipientId: guardianId/);
  });
});
