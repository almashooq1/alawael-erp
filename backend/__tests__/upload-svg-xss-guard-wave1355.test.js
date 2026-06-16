/**
 * W1355 — Stored-XSS via SVG upload drift guard (ratchet-down).
 *
 * THREAT (THREAT_MODEL.md §4 residual risk #6):
 *   An upload route that ALLOWS `image/svg+xml` (or `text/html`) in its MIME
 *   allowlist but does NOT run the canonical post-multer content validator
 *   `validateUploadedFile` (utils/uploadValidator.js — magic-bytes check +
 *   BLOCKED_MIMES that rejects svg/html) is a stored-XSS vector when the file
 *   is later served from the application origin (e.g. nginx `/uploads/*`).
 *   An SVG can carry `<script>` that executes in the app's own origin.
 *
 * This guard does NOT change runtime behavior. It STATICALLY scans
 * `backend/routes/**.js` and fails when an upload route allows an
 * executable-in-browser MIME without wiring `validateUploadedFile`.
 *
 * Two known offenders are baselined (KNOWN_UNVALIDATED_SVG_UPLOAD_ROUTES).
 * Per the repo ratchet-down pattern:
 *   (1) any NEW such route (not in the baseline) FAILS — stops the vuln class
 *       from spreading;
 *   (2) a STALE baseline entry (file gone, now wires the validator, or no
 *       longer allows the dangerous MIME) FAILS — forcing its removal from the
 *       baseline in the SAME commit that remediates the route.
 *
 * Remediation of a baselined route (a behavior change → product decision, so
 * deferred from autonomous work): call `validateUploadedFile` after
 * `upload.single(...)` AND drop `image/svg+xml` from the allowlist — matching
 * the sibling routes `medicalFiles.js` + `media.routes.js`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const VALIDATOR_PATH = path.join(__dirname, '..', 'utils', 'uploadValidator.js');

// Quoted MIME literals that execute as script when served same-origin.
const DANGEROUS_MIME_LITERALS = ["'image/svg+xml'", '"image/svg+xml"'];

// Files that currently ALLOW a dangerous MIME in an upload allowlist WITHOUT
// wiring validateUploadedFile. Each is a documented residual risk (#6).
// Ratchet DOWN only — never add. Remediating a file removes it from here.
//
// NOTE (W1356 accuracy): this guard tracks the UPLOAD-side validator only.
// Of the two baselined routes, `documents.routes.js` is ALSO mitigated at the
// SERVE side (W462: its /preview + /download force Content-Disposition:
// attachment + sandbox CSP for svg/html), as is files.routes.js (W463). The
// genuinely-exposed route is `uploads.routes.js` — served by nginx statically
// (/uploads/*), so no Node disposition guard applies. Both stay baselined here
// because wiring the upload-side validator is still the canonical defense; the
// serve-side guard is a separate, complementary layer. See THREAT_MODEL §4 #6.
const KNOWN_UNVALIDATED_SVG_UPLOAD_ROUTES = new Set(['documents.routes.js', 'uploads.routes.js']);

/** Recursively collect *.js files under a directory. */
function collectJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** True when the source uses a multer upload handler. */
function usesMulterUpload(src) {
  return /\bmulter\s*\(/.test(src) && /\bupload\.(single|array|fields|any)\s*\(/.test(src);
}

/** True when the source contains a quoted dangerous MIME literal. */
function allowsDangerousMime(src) {
  return DANGEROUS_MIME_LITERALS.some(lit => src.includes(lit));
}

/** True when the source wires the canonical content validator. */
function wiresValidator(src) {
  return src.includes('validateUploadedFile');
}

/** Pure classifier — exported for self-testing. */
function isUnvalidatedSvgUploadRoute(src) {
  return usesMulterUpload(src) && allowsDangerousMime(src) && !wiresValidator(src);
}

describe('W1355 stored-XSS via SVG upload — drift guard', () => {
  const offenders = [];
  beforeAll(() => {
    for (const file of collectJsFiles(ROUTES_DIR)) {
      const src = fs.readFileSync(file, 'utf8');
      if (isUnvalidatedSvgUploadRoute(src)) {
        offenders.push(path.basename(file));
      }
    }
  });

  test('no NEW upload route allows a dangerous MIME without validateUploadedFile', () => {
    const novel = offenders.filter(f => !KNOWN_UNVALIDATED_SVG_UPLOAD_ROUTES.has(f));
    expect(novel).toEqual([]);
  });

  test('every baseline entry is still a real offender (ratchet-down)', () => {
    const stale = [...KNOWN_UNVALIDATED_SVG_UPLOAD_ROUTES].filter(f => !offenders.includes(f));
    expect(stale).toEqual([]);
  });

  test('canonical validator still blocks image/svg+xml (remediation path valid)', () => {
    const src = fs.readFileSync(VALIDATOR_PATH, 'utf8');
    // BLOCKED_MIMES must keep svg so wiring the validator actually neutralizes it.
    expect(src).toMatch(/BLOCKED_MIMES/);
    expect(src).toMatch(/['"]image\/svg\+xml['"]/);
  });

  test('classifier is precise (pure-function self-test)', () => {
    const allowsAndValidates =
      "const m = multer({}); upload.single('f'); 'image/svg+xml'; validateUploadedFile;";
    const allowsNoValidate = "multer({}); upload.single('f'); 'image/svg+xml';";
    const noUpload = "'image/svg+xml';"; // ext map only, no multer upload
    const safeUpload = "multer({}); upload.single('f'); 'image/png';";

    expect(isUnvalidatedSvgUploadRoute(allowsNoValidate)).toBe(true);
    expect(isUnvalidatedSvgUploadRoute(allowsAndValidates)).toBe(false);
    expect(isUnvalidatedSvgUploadRoute(noUpload)).toBe(false);
    expect(isUnvalidatedSvgUploadRoute(safeUpload)).toBe(false);
  });
});

module.exports = {
  isUnvalidatedSvgUploadRoute,
  usesMulterUpload,
  allowsDangerousMime,
  wiresValidator,
  KNOWN_UNVALIDATED_SVG_UPLOAD_ROUTES,
};
