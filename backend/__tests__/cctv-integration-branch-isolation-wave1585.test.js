'use strict';

/**
 * cctv-integration-branch-isolation-wave1585.test.js — W1585 (static drift guard)
 *
 * Final CCTV branch-isolation slice (after #873 recordings/events/streams and
 * #880 cameras/nvr). The cctv-integration dashboard router delegated to
 * cctvIntegration.service with NO branch enforcement:
 *   - /cameras + /analytics trusted the caller-supplied ?branchId
 *   - /cameras/:id/feed + /recordings returned any camera's feed/clips (no check)
 *   - /alerts returned all branches' security alerts
 * The service keys on branchCode (String) — the ?branchId param is actually used
 * as a branchCode (service line `{ branchCode: branchId }`).
 *
 * Fix: requireBranchAccess + callerCctvBranchCode; pin list/analytics/alerts to
 * the caller's branchCode; assertCameraBranch on feed + recordings; and a new
 * optional branchCode filter on getSecurityAlerts.
 *
 * Static only — not sprint-enumerated. (Deferred: /face-recognition + /attendance
 * are beneficiary-scoped — a separate concern.)
 */

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'cctv', 'cctv-integration.routes.js'),
  'utf8'
);
const SVC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'cctvIntegration.service.js'),
  'utf8'
);

describe('W1585 — cctv-integration router is branch-scoped', () => {
  test('applies requireBranchAccess + uses the branchCode resolver', () => {
    expect(ROUTE).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTE).toMatch(/callerCctvBranchCode/);
    expect(ROUTE).toMatch(/require\('\.\.\/\.\.\/middleware\/cctvBranchScope'\)/);
  });

  test('feed + recordings assert the camera is in the caller branch', () => {
    expect(ROUTE).toMatch(/async function assertCameraBranch/);
    expect(ROUTE).toMatch(/assertCameraBranch\(req, res, req\.params\.cameraId\)/); // feed
    expect(ROUTE).toMatch(/assertCameraBranch\(req, res, req\.query\.cameraId\)/); // recordings
    expect(ROUTE).toMatch(/CROSS_BRANCH_DENIED/);
  });

  test('list / analytics / alerts pin to caller branchCode (no bare ?branchId trust)', () => {
    expect(ROUTE).toMatch(/getCameraList\(callerCode \|\| req\.query\.branchId\)/);
    expect(ROUTE).toMatch(/getAnalytics\(\s*callerCode \|\| req\.query\.branchId/);
    expect(ROUTE).toMatch(/callerCode \|\| req\.query\.branchCode/); // alerts
    expect(ROUTE).not.toMatch(/getCameraList\(req\.query\.branchId\)/);
  });
});

describe('W1585 — getSecurityAlerts accepts a branchCode filter', () => {
  test('service signature + query filter added', () => {
    expect(SVC).toMatch(/function getSecurityAlerts\(startDate, endDate, branchCode\)/);
    expect(SVC).toMatch(/if \(branchCode\) query\.branchCode = String\(branchCode\)\.toUpperCase\(\)/);
  });
});
