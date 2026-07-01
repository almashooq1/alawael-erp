'use strict';

/**
 * cctv-child-video-branch-isolation-wave1578.test.js — W1578 (static drift guard)
 *
 * P0: cross-branch access to CHILD camera recordings / events / live+snapshot.
 * CCTV models key on `branchCode` (String), so branchFilter(req) is a phantom
 * no-op → fix uses callerCctvBranchCode(req) (resolves branchId→Branch.code) +
 * requireBranchAccess on the routers, plus role-gates on live/snapshot.
 *
 * Static (source-regex) only — no jest.unmock/DB — not sprint-enumerated.
 * (Behavioral coverage — seed 2 branchCodes, restricted user 403 on foreign
 * camera/recording/event — is a follow-up.)
 */

const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const HELPER = read('middleware/cctvBranchScope.js');
const REC = read('routes/cctv/recordings.routes.js');
const EVT = read('routes/cctv/events.routes.js');
const STR = read('routes/cctv/streams.routes.js');

describe('W1578 — CCTV branchCode resolver helper', () => {
  test('resolves branchId → Branch.code and gives a visibility check', () => {
    expect(HELPER).toMatch(/callerCctvBranchCode/);
    expect(HELPER).toMatch(/branchCodeVisible/);
    expect(HELPER).toMatch(/mongoose\.model\('Branch'\)/);
    expect(HELPER).toMatch(/allBranches/); // cross-branch → null (no restriction)
  });
});

describe('W1578 — recordings/events routers are branch-scoped', () => {
  test.each([
    ['recordings', REC],
    ['events', EVT],
    ['streams', STR],
  ])('%s router applies requireBranchAccess + imports the resolver', (_name, src) => {
    expect(src).toMatch(/require\('\.\.\/\.\.\/middleware\/branchScope\.middleware'\)/);
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(src).toMatch(/callerCctvBranchCode/);
  });

  test('recordings :id asserts branch (no bare findById passthrough)', () => {
    expect(REC).toMatch(/branchCodeVisible\(callerCode, r\.branchCode\)/);
  });

  test('events :eventId asserts branch', () => {
    expect(EVT).toMatch(/branchCodeVisible\(callerCode, ev\.branchCode\)/);
  });
});

describe('W1578 — streams live/snapshot/playback are role-gated + branch-checked', () => {
  test('live is role-gated, forces requireGrant, and branch-checks the camera', () => {
    // role gate present on /live
    expect(STR).toMatch(/router\.post\(\s*'\/live',\s*requireRole\(/);
    // client can no longer skip the grant
    expect(STR).not.toMatch(/requireGrant: req\.body\.requireGrant/);
    expect(STR).toMatch(/requireGrant: true/);
    expect(STR).toMatch(/loadCameraInScope/);
  });

  test('snapshot is role-gated + branch-checked', () => {
    expect(STR).toMatch(/'\/snapshot\/:cameraId',\s*\n?\s*requireRole\(/);
    // no bare getById-without-branch-check on the snapshot path
    expect(STR).toMatch(/loadCameraInScope\(req, res, req\.params\.cameraId\)/);
  });

  test('loadCameraInScope denies cross-branch (403) and missing (404)', () => {
    expect(STR).toMatch(/CROSS_BRANCH_DENIED/);
    expect(STR).toMatch(/branchCodeVisible\(callerCode, cam\.branchCode\)/);
  });
});
