'use strict';

/**
 * W412 — anti-regression guard for parent-portal-v2 certificate ownership-leak.
 *
 * `routes/parent-portal-v2.routes.js` exposes two endpoints for retrieving a
 * BlockchainCertificate by ID under a child's namespace:
 *   GET /children/:id/certificates/:certId
 *   GET /children/:id/certificates/:certId/pdf
 *
 * Pre-W412 both endpoints returned 403 + "الشهادة لا تخص هذا الطفل" (the
 * certificate doesn't belong to this child) when the certId pointed to a
 * real certificate whose recipient.nationalId did not match the URL's
 * child. The existing not-found path returned 404 + "الشهادة غير موجودة"
 * (certificate not found). The two-code split lets an attacker iterating
 * certIds learn which IDs exist as certificates for OTHER children.
 *
 * W412 unifies the ownership-fail path with the not-found path: both now
 * return 404 + "الشهادة غير موجودة" so the response is identical regardless
 * of whether (a) the certId is invalid, (b) the cert exists but belongs to
 * another child, or (c) the cert was soft-deleted.
 *
 * Same doctrine as W411 (parent-portal-v1 13-site sweep) and the
 * 5ca905fde / W410 cross-tenant audit.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'routes', 'parent-portal-v2.routes.js');

describe('W412 parent-portal-v2 certificate ownership-leak anti-regression guard', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('no "الشهادة لا تخص هذا الطفل" 403 message remains', () => {
    // The pre-W412 distinguishing message must NEVER come back. Returning
    // it as part of any future code path re-opens the side channel.
    expect(src).not.toMatch(/الشهادة لا تخص هذا الطفل/);
  });

  it('certificate detail + pdf endpoints still mount', () => {
    expect(src).toMatch(/router\.get\(['"][^'"]*certificates\/:certId['"]/);
    expect(src).toMatch(/router\.get\(['"][^'"]*certificates\/:certId\/pdf['"]/);
  });

  it('the W412 marker comment landed (catches accidental revert)', () => {
    expect(src).toMatch(/W412: unify with 404/);
  });

  it('ownership-fail path now returns 404 + canonical not-found message', () => {
    // After W412 there should be at least 2 occurrences of the 404 + not-found
    // message inside an `if (cert.recipient` block — one per endpoint.
    const matches = src.match(/status\(404\)\.json\(\{\s*success:\s*false,\s*message:\s*'الشهادة غير موجودة'\s*\}\)/g);
    expect(matches).toBeTruthy();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
