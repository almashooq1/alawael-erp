'use strict';
/**
 * W1616 — follow-up to W1614: two more create sites that spread the client body into a model with
 * approval attribution, previously excluded (biometric #957 fixed only its by-id writes; notification
 * was in-flight in #950). Both now on main.
 *
 * - biometric  POST /overtime — OvertimeRequest.create used stripUpdateMeta (blocks role/pw) which
 *   does NOT strip approvedBy/approvedAt → a caller could create an overtime pre-stamped "approved by X".
 * - notification POST /broadcasts — BroadcastMessage.create spread bare ...req.body (approvedBy).
 * Both wrapped in stripApprovalAttribution (W1614 helper).
 */
const fs = require('fs');
const path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');

describe('W1616 create-site approval attribution stripped', () => {
  test('biometric OvertimeRequest.create composes stripApprovalAttribution over stripUpdateMeta', () => {
    const src = R('biometric-attendance.routes.js');
    const i = src.indexOf('OvertimeRequest.create');
    expect(i).toBeGreaterThan(-1);
    const region = src.slice(i, i + 140);
    expect(region).toMatch(/\.\.\.\s*stripApprovalAttribution\(stripUpdateMeta\(req\.body\)\)/);
  });

  test('notification BroadcastMessage.create wraps body in stripApprovalAttribution, no bare ...req.body', () => {
    const src = R('notification-enhanced.routes.js');
    expect(src).toMatch(/stripApprovalAttribution/);
    const i = src.indexOf('BroadcastMessage.create');
    expect(i).toBeGreaterThan(-1);
    const region = src.slice(i, i + 140);
    expect(region).toMatch(/\.\.\.\s*stripApprovalAttribution\(req\.body\)/);
    expect(region).not.toMatch(/\.\.\.\s*req\.body\b/);
  });
});
