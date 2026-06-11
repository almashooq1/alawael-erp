'use strict';

/**
 * official-letters-routes-wave1224.test.js — static drift guard for the
 * official-letters route + registry mount + model contract.
 *
 * Locks the security-relevant source shape (the W1179 lesson: routes
 * written against an imagined schema ship silently broken):
 *   1. public verify endpoint is declared BEFORE authenticateToken;
 *   2. issue path snapshots the employee SERVER-SIDE (no client-trusted
 *      subject), and never spreads req.body;
 *   3. list applies branchFilter (W269);
 *   4. registry mounts both /api and /api/v1 paths;
 *   5. model keeps canonical refs (User / Branch — W324) + the revocation
 *      invariants + the atomic counter.
 */

const fs = require('fs');
const path = require('path');

const routeSrc = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'hr', 'official-letters.routes.js'),
  'utf8'
);
const modelSrc = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'OfficialLetter.js'),
  'utf8'
);
const registrySrc = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'hr.registry.js'),
  'utf8'
);

describe('W1224 official-letters route — source contract', () => {
  test('verify endpoint is PUBLIC: declared before router.use(authenticateToken)', () => {
    const verifyIdx = routeSrc.indexOf("router.get('/verify/:token'");
    const authIdx = routeSrc.indexOf('router.use(authenticateToken)');
    expect(verifyIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(-1);
    expect(verifyIdx).toBeLessThan(authIdx);
  });

  test('verify endpoint validates token shape and never exposes internal ids', () => {
    expect(routeSrc).toMatch(/\^?\[a-f0-9\]\{32\}/);
    // The verify projection must not select _id-bearing relations or payload.
    const sel = routeSrc.match(/findOne\(\{ verifyToken: token \}\)\s*\.select\('([^']+)'\)/);
    expect(sel).not.toBeNull();
    expect(sel[1]).not.toMatch(/payload/);
    expect(sel[1]).not.toMatch(/issuedBy/);
  });

  test('issue path snapshots employee server-side and never spreads req.body', () => {
    expect(routeSrc).toMatch(/mongoose\.model\('Employee'\)/);
    expect(routeSrc).toMatch(/name_ar name_en employee_number/);
    expect(routeSrc).not.toMatch(/\.\.\.req\.body/);
    expect(routeSrc).not.toMatch(/Object\.assign\([^)]*req\.body/);
  });

  test('W1231: beneficiary letters snapshot server-side from the canonical Beneficiary model', () => {
    expect(routeSrc).toMatch(/mongoose\.model\('Beneficiary'\)/);
    expect(routeSrc).toMatch(/fullNameArabic fullNameEnglish mrn/);
    expect(routeSrc).toMatch(/kind: 'beneficiary'/);
  });

  test('W1231: issue enforces caller branch on BOTH subject kinds (W269 — foreign ids read as 404)', () => {
    expect(routeSrc).toMatch(/effectiveBranchScope\(req\)/);
    expect(routeSrc).toMatch(
      /scope && emp\.branch_id && String\(emp\.branch_id\) !== String\(scope\)/
    );
    expect(routeSrc).toMatch(
      /scope && ben\.branchId && String\(ben\.branchId\) !== String\(scope\)/
    );
  });

  test('list + detail are branch-scoped via branchFilter (W269)', () => {
    const listCount = (routeSrc.match(/branchFilter\(req\)/g) || []).length;
    expect(listCount).toBeGreaterThanOrEqual(3); // list + detail + revoke
    expect(routeSrc).not.toMatch(/req\.branchId/); // W269h class
  });

  test('revoke requires a reason and stricter roles', () => {
    expect(routeSrc).toMatch(/REVOKE_ROLES/);
    expect(routeSrc).toMatch(/reason \(≥5 chars\) is required|reason.+required/);
  });

  test('all mutations are explicit-field (anti mass-assignment)', () => {
    expect(routeSrc).not.toMatch(/new OfficialLetter\(req\.body\)/);
    expect(routeSrc).not.toMatch(/create\(req\.body\)/);
  });
});

describe('W1224 registry mount', () => {
  test('hr.registry mounts both /api and /api/v1 paths', () => {
    expect(registrySrc).toMatch(/app\.use\('\/api\/hr\/official-letters', officialLettersRouter\)/);
    expect(registrySrc).toMatch(
      /app\.use\('\/api\/v1\/hr\/official-letters', officialLettersRouter\)/
    );
  });

  test('W1229: verify paths are exempt from the global Redis GET cache', () => {
    const perfSrc = fs.readFileSync(
      path.join(__dirname, '..', 'config', 'performance.js'),
      'utf8'
    );
    expect(perfSrc).toMatch(/NO_CACHE_RE/);
    expect(perfSrc).toMatch(/letter-verify/);
    expect(perfSrc).toMatch(/official-letters\\\/verify/);
  });

  test('W1228: QR verify is ALSO mounted publicly OUTSIDE /hr (app.js gates /api/v1/hr with authenticate)', () => {
    expect(routeSrc).toMatch(/module\.exports\.verifyLetterHandler = verifyLetterHandler/);
    expect(registrySrc).toMatch(
      /app\.get\('\/api\/public\/letter-verify\/:token', officialLettersRouter\.verifyLetterHandler\)/
    );
    expect(registrySrc).toMatch(
      /app\.get\('\/api\/v1\/public\/letter-verify\/:token', officialLettersRouter\.verifyLetterHandler\)/
    );
  });
});

describe('W1224 OfficialLetter model — contract', () => {
  test('canonical refs only (W324): User + Branch', () => {
    expect(modelSrc).toMatch(/ref: 'User'/);
    expect(modelSrc).toMatch(/ref: 'Branch'/);
    expect(modelSrc).not.toMatch(/ref: 'Admin'/);
    expect(modelSrc).not.toMatch(/ref: 'Center'/);
  });

  test('atomic counter uses findOneAndUpdate + $inc + upsert', () => {
    expect(modelSrc).toMatch(/OfficialLetterCounter\.findOneAndUpdate/);
    expect(modelSrc).toMatch(/\$inc: \{ seq: 1 \}/);
    expect(modelSrc).toMatch(/upsert: true/);
  });

  test('revocation invariants declared via pre-validate invalidate calls', () => {
    expect(modelSrc).toMatch(/invalidate\('revokeReason'/);
    expect(modelSrc).toMatch(/invalidate\('revokedAt'/);
    expect(modelSrc).toMatch(/invalidate\('status'/);
  });

  test('Mongoose-9 hook style: async pre-validate, no next callback (W946 class)', () => {
    expect(modelSrc).toMatch(/pre\('validate', async function \(\)/);
    expect(modelSrc).not.toMatch(/pre\('validate', function \(next\)/);
    expect(modelSrc).not.toMatch(/pre\('save', function \(next\)/);
  });

  test('unique compound index on (letterType, year, seq) + unique refNumber/verifyToken', () => {
    expect(modelSrc).toMatch(/\{ letterType: 1, year: 1, seq: 1 \}, \{ unique: true \}/);
    expect(modelSrc).toMatch(/refNumber: \{ type: String, required: true, unique: true \}/);
    expect(modelSrc).toMatch(/verifyToken: \{[\s\S]*?unique: true/);
  });

  test('no TTL on the issuance log (official records persist)', () => {
    expect(modelSrc).not.toMatch(/expireAfterSeconds|expires:/);
  });
});
