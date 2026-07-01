'use strict';

/**
 * W1424d — whatsapp-enhanced.routes.js branch-isolation + mass-assignment guard.
 *
 * This sibling router previously scoped every query by `req.user.branchId` (a
 * field NO middleware sets → always undefined → `{branchId: undefined}` matched
 * only null-branch docs for EVERY caller), and spread `...req.body` into a
 * NotificationTemplate create (mass-assignment). The W269/W1407 isolation that
 * protects whatsapp.routes.js was never applied here. This static guard locks the
 * fix: effectiveBranchScope everywhere, no req.user.branchId, no req.body spread.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'whatsapp-enhanced.routes.js'),
  'utf8'
);

// Strip comments so the forbidden-pattern checks match CODE only — the file's own
// header comment documents the anti-patterns it fixed (`req.user.branchId`,
// `...req.body`), which must not trip the guard.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1424d whatsapp-enhanced.routes branch isolation (static)', () => {
  test('NEVER reads req.user.branchId in code (always undefined — leaks / null-only)', () => {
    expect(CODE).not.toMatch(/req\.user\.branchId/);
  });

  test('imports + uses effectiveBranchScope (canonical scope helper)', () => {
    expect(CODE).toMatch(/effectiveBranchScope/);
    expect(CODE).toMatch(/require\(['"]\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test('no `...req.body` mass-assignment anywhere in code', () => {
    expect(CODE).not.toMatch(/\.\.\.req\.body/);
  });

  test('validates ObjectId on :id routes before DB lookup', () => {
    expect(CODE).toMatch(/isValidObjectId/);
  });

  test('still applies authenticate + requireBranchAccess router-wide', () => {
    expect(CODE).toMatch(/router\.use\(authenticate\)/);
    expect(CODE).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('POST /template-requests whitelists fields explicitly (no spread)', () => {
    const start = CODE.indexOf("router.post('/template-requests");
    const end = CODE.indexOf("router.patch('/template-requests");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = CODE.slice(start, end);
    expect(block).toMatch(/const\s*\{\s*name,\s*language,\s*body/);
    expect(block).not.toMatch(/\.\.\.req\.body/);
  });
});
