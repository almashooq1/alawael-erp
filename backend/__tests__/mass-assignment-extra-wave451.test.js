/**
 * W451 — extend the W450 mass-assignment cleanup to 2 more surfaces:
 *
 *   waitlist-admin.routes.js   PATCH /:id was a bare
 *                              `findByIdAndUpdate(req.params.id, req.body)`.
 *                              WaitingListEntry carries branchId, so the
 *                              risk class is identical to W450:
 *                              mass-assignment + tenant-takeover.
 *                              Fix: branchFilter load + stripUpdateMeta
 *                              + delete body.branchId.
 *
 *   cctv/ai.routes.js          POST + PATCH on /faces, /anpr, /zones
 *                              passed `req.body` directly into
 *                              CctvFaceIdentity.create / .findByIdAndUpdate.
 *                              No branchId on these models (global
 *                              registries), so just sanitize — no
 *                              tenant-takeover. Risk: admin/security
 *                              can mass-assign _id/__v/__proto__ into
 *                              a biometric face record.
 */

const fs = require('fs');
const path = require('path');

describe('W451 — mass-assignment cleanup (extension of W450)', () => {
  describe('waitlist-admin.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'waitlist-admin.routes.js'),
      'utf8'
    );

    test('imports stripUpdateMeta + branchFilter', () => {
      expect(src).toMatch(/stripUpdateMeta/);
      expect(src).toMatch(/branchFilter/);
      expect(src).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
      expect(src).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
    });

    test('router.use(requireBranchAccess) is wired', () => {
      expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    });

    test('PATCH /:id uses findOneAndUpdate with branchFilter + stripUpdateMeta', () => {
      expect(src).toMatch(
        /WaitingListEntry\.findOneAndUpdate\(\s*\{\s*_id:\s*req\.params\.id,\s*\.\.\.branchFilter\(req\)\s*\}/
      );
      expect(src).toMatch(/stripUpdateMeta\(\s*req\.body/);
      expect(src).toMatch(/delete\s+body\.branchId/);
    });

    test('NO bare WaitingListEntry.findByIdAndUpdate(req.params.id, req.body remains', () => {
      expect(src).not.toMatch(
        /WaitingListEntry\.findByIdAndUpdate\(\s*req\.params\.id,\s*req\.body/
      );
    });

    test('status transitions + DELETE use findOneAndUpdate/Delete with branchFilter', () => {
      expect(src).toMatch(
        /WaitingListEntry\.findOneAndUpdate\(\s*\{\s*_id:\s*id,\s*\.\.\.branchFilter\(req\)\s*\}/
      );
      expect(src).toMatch(/WaitingListEntry\.findOneAndDelete\([\s\S]*branchFilter\(req\)/);
      expect(src).not.toMatch(/WaitingListEntry\.findByIdAndDelete\(/);
    });

    test('list/overview/prioritized queries merge branchFilter(req)', () => {
      expect(src).toMatch(/buildFilter\(req\.query,\s*req\)/);
      expect(src).toMatch(/WaitingListEntry\.find\(branchFilter\(req\)\)/);
      expect(src).toMatch(
        /WaitingListEntry\.find\(\{\s*status:\s*'waiting',\s*\.\.\.branchFilter\(req\)\s*\}\)/
      );
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/waitlist-admin.routes')).not.toThrow();
    });
  });

  describe('cctv/ai.routes.js', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'cctv', 'ai.routes.js'),
      'utf8'
    );

    test('imports stripUpdateMeta', () => {
      expect(src).toMatch(/stripUpdateMeta/);
      expect(src).toMatch(/require\(['"]\.\.\/\.\.\/utils\/sanitize['"]\)/);
    });

    test('POST /faces, /anpr, /zones sanitize req.body before create', () => {
      // CctvFaceIdentity.create wraps stripUpdateMeta(req.body)
      expect(src).toMatch(/CctvFaceIdentity\.create\(stripUpdateMeta/);
      expect(src).toMatch(/CctvAnpr\.create\(stripUpdateMeta/);
      expect(src).toMatch(/CctvZone\.create\(stripUpdateMeta/);
    });

    test('PATCH /faces/:id and /zones/:id sanitize req.body before update', () => {
      expect(src).toMatch(/CctvFaceIdentity\.findByIdAndUpdate\([\s\S]*?stripUpdateMeta/);
      expect(src).toMatch(/CctvZone\.findByIdAndUpdate\([\s\S]*?stripUpdateMeta/);
    });

    test('NO bare CctvFaceIdentity.findByIdAndUpdate(req.params.id, req.body) remains', () => {
      expect(src).not.toMatch(
        /CctvFaceIdentity\.findByIdAndUpdate\(req\.params\.id,\s*req\.body\b/
      );
      expect(src).not.toMatch(/CctvZone\.findByIdAndUpdate\(req\.params\.id,\s*req\.body\b/);
    });

    test('module loads without throwing', () => {
      expect(() => require('../routes/cctv/ai.routes')).not.toThrow();
    });
  });
});
