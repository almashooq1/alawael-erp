'use strict';

/**
 * W413 — anti-regression guard for transport-module + speech ownership-leak.
 *
 * Continuation of the W411/W412 cross-tenant existence-probe sweep. After the
 * parent-portal surface closed, a broader grep for `status(403)` + Arabic
 * "ليست لك" (not yours) / "ليست من" / English "do not own" / "cross-branch"
 * surfaced two more route files with the same pattern:
 *
 *   - `routes/transport-module.routes.js` (3 sites): each `POST /trips/:id/X`
 *     endpoint did `findOne({_id, deleted_at: null})` then a 403 + "غير
 *     مصرح: هذه الرحلة ليست لك" (you don't own this trip) if the caller
 *     wasn't the assigned driver. A non-driver iterating trip IDs could
 *     enumerate which IDs are real trips for OTHER drivers via the 403/404
 *     status-code split.
 *
 *   - `routes/speech.routes.js` (1 site): GET /recordings/:id returned 403 +
 *     SPEECH_CROSS_BRANCH_DENIED for cross-branch reads, distinguishing them
 *     from the existing 404 SPEECH_RECORDING_NOT_FOUND.
 *
 * All 4 sites converted to the unified 404 + canonical not-found code
 * (existing 404 strings preserved so legitimate not-found responses are
 * indistinguishable from cross-tenant denial).
 *
 * NOT in W413 (deliberately skipped):
 *   - `routes/risk-sweep.routes.js` (2 sites with CROSS_BRANCH_FORBIDDEN):
 *     LIST endpoint where the 403 fires only when a beneficiary's snapshots
 *     span multiple branches AND caller is tier-1. Silent-filtering would
 *     hide a cross-branch event from operators who legitimately need to
 *     know. Explicit 403 is by design for ops visibility.
 */

const fs = require('fs');
const path = require('path');

const TRANSPORT_FILE = path.join(__dirname, '..', 'routes', 'transport-module.routes.js');
const SPEECH_FILE = path.join(__dirname, '..', 'routes', 'speech.routes.js');

describe('W413 transport-module + speech ownership-leak anti-regression', () => {
  describe('transport-module.routes.js — trip ownership', () => {
    let src;
    beforeAll(() => {
      src = fs.readFileSync(TRANSPORT_FILE, 'utf8');
    });

    it('no "غير مصرح: هذه الرحلة ليست لك" 403 message remains', () => {
      expect(src).not.toMatch(/غير مصرح: هذه الرحلة ليست لك/);
    });

    it('the W413 marker comment landed (catches accidental revert)', () => {
      expect(src).toMatch(/W413: unify with 404/);
    });

    it('non-driver path returns 404 + canonical not-found message', () => {
      const matches = src.match(
        /status\(404\)\.json\(\{ success: false, message: 'الرحلة غير موجودة' \}\)/g
      );
      expect(matches).toBeTruthy();
      // At least 3 occurrences (original 404 + 3 W413 conversions); allow more
      // in case the file gains other not-found returns over time.
      expect(matches.length).toBeGreaterThanOrEqual(4);
    });

    it('file still mounts at least 10 endpoints (sanity — no accidental wipe)', () => {
      const endpoints = src.match(/router\.(get|post|patch|put|delete)\(/g) || [];
      expect(endpoints.length).toBeGreaterThanOrEqual(10);
      // Trip resources still referenced (multi-line route definitions)
      expect(src).toMatch(/['"]\/trips\/:id/);
    });
  });

  describe('speech.routes.js — recording cross-branch', () => {
    let src;
    beforeAll(() => {
      src = fs.readFileSync(SPEECH_FILE, 'utf8');
    });

    it('no "SPEECH_CROSS_BRANCH_DENIED" 403 code remains', () => {
      // The pre-W413 distinguisher code must NEVER return — its presence
      // immediately re-opens the existence-probe side channel.
      expect(src).not.toMatch(/SPEECH_CROSS_BRANCH_DENIED/);
    });

    it('cross-branch path returns 404 + SPEECH_RECORDING_NOT_FOUND', () => {
      // Both the legitimate not-found and the cross-branch denial now share
      // the same response shape, so there should be ≥2 occurrences.
      const matches = src.match(
        /status\(404\)\.json\(\{ success: false, code: 'SPEECH_RECORDING_NOT_FOUND' \}\)/g
      );
      expect(matches).toBeTruthy();
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /recordings/:id endpoint still mounts', () => {
      expect(src).toMatch(/router\.get\(['"]\/recordings\/:id['"]/);
    });
  });
});
