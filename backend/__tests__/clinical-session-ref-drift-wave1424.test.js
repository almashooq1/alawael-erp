'use strict';

/**
 * W1424 — Clinical session ref drift guard.
 *
 * `backend/models/Session.js` is the USER AUTH session tracker (userId, token,
 * expiresAt). Clinical models must NOT reference it for therapy/clinical
 * sessions. The canonical clinical session model is `ClinicalSession`
 * (`domains/sessions/models/ClinicalSession.js`); the legacy scheduling read
 * model is `TherapySession` (`models/TherapySession.js`).
 *
 * Pre-W1424: 5 clinical/insurance models used `ref: 'Session'`, which would
 * populate() to login sessions instead of clinical sessions.
 *
 * Guard: no file under `backend/models/` (except the auth Session model itself)
 * may contain `ref: 'Session'`.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models');
const SESSION_MODEL = path.join(MODELS_DIR, 'Session.js');

function walkJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(fullPath);
    }
  }
  return out;
}

describe('W1424 clinical session ref drift guard', () => {
  it("no model outside the auth Session model references ref: 'Session'", () => {
    const files = walkJsFiles(MODELS_DIR).filter(p => p !== SESSION_MODEL);
    const violations = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      if (source.includes("ref: 'Session'")) {
        violations.push(path.relative(MODELS_DIR, file));
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Clinical/insurance models must reference ClinicalSession or TherapySession, not the auth Session model. ` +
          `Violations in: ${violations.join(', ')}`
      );
    }
    expect(violations).toEqual([]);
  });
});
