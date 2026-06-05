/**
 * Wave 930 — regression guard: POST /api/v1/icf-assessments must inject the
 * authenticated user as `assessorId`.
 *
 * Bug class (same family as the W926 beneficiary fix): the web-admin form never
 * sends `assessorId`, but `models/icf/ICFAssessment.model.js` marks it
 * `required: true`. The route did `M.create(stripUpdateMeta(req.body))` with no
 * injection → ValidationError → 500 → "data not saved". Fix derives assessorId
 * from req.user (server-side; the assessor IS the logged-in user).
 *
 * Static source guard (pure-unit, no DB).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'icf-assessments.routes.js');

describe('W930 — icf-assessments create injects assessorId', () => {
  const src = fs.readFileSync(ROUTE_FILE, 'utf8');

  it('route file is readable', () => {
    expect(src.length).toBeGreaterThan(500);
  });

  it('the POST / create handler derives assessorId from the authenticated user', () => {
    const postIdx = src.indexOf("router.post(\n  '/'");
    const idx = postIdx > -1 ? postIdx : src.indexOf("router.post('/'");
    expect(idx).toBeGreaterThan(-1);
    // Bound the handler to the next router.<verb>( after the create POST.
    const rest = src.slice(idx + 5);
    const nextRouter = rest.search(/router\.(post|get|put|delete|patch)\(/);
    const body = rest.slice(0, nextRouter > -1 ? nextRouter : undefined);
    expect(body).toMatch(/assessorId/);
    expect(body).toMatch(/req\.user\?\.id/);
    // Must not overwrite an explicitly provided assessorId.
    expect(body).toMatch(/!payload\.assessorId/);
  });
});
