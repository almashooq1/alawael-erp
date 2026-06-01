'use strict';

/**
 * W748 — group-broadcast PDPL consent-gate drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /contact-groups/:id/broadcast composes already-tested pieces:
 *   - partitionByEligibility (W747, consent partition)
 *   - withSendGuards (rate-limit / idempotency / DLQ, existing)
 * There is no NEW pure helper, so this guard asserts the SOURCE invariants that
 * keep the broadcast consent-safe and hardened, so a future refactor can't
 * silently drop the consent gate or the send guards. Static read only — no
 * Express boot, no mongoose.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'whatsapp.routes.js'),
  'utf8'
);

/** Extract the body of the POST /contact-groups/:id/broadcast handler. */
function broadcastBlock(src) {
  const start = src.indexOf("'/contact-groups/:id/broadcast',");
  expect(start).toBeGreaterThan(-1);
  // Stop at the next route registration after the broadcast handler.
  const after = src.indexOf('router.', start + 1);
  return src.slice(start, after === -1 ? undefined : after);
}

describe('W748 group broadcast — consent gate + send hardening', () => {
  const block = broadcastBlock(SRC);

  it('registers the broadcast route', () => {
    expect(SRC).toContain("'/contact-groups/:id/broadcast',");
  });

  it('resolves eligibility via partitionByEligibility (consent gate present)', () => {
    expect(block).toContain('partitionByEligibility');
    expect(block).toContain('Consent.canMessage');
  });

  it('fans out only over eligible members, never the full member list', () => {
    // The send loop must iterate the eligible slice, not `members`.
    expect(block).toContain('eligible.slice');
    expect(block).toMatch(/const targets = eligible\.slice\(/);
    // Guard against a regression that loops the raw member array for sending.
    expect(block).not.toMatch(/for \([^)]*members\.length/);
  });

  it('routes every send through withSendGuards (rate-limit / idempotency / DLQ)', () => {
    expect(block).toContain('withSendGuards');
  });

  it('is org-scoped (W269 isolation) and 404s on missing group', () => {
    expect(block).toContain('groupScopedFilter');
    expect(block).toContain("message: 'Group not found'");
  });

  it('uses a per-recipient idempotency key derived from broadcastId', () => {
    expect(block).toMatch(/bcast:\$\{broadcastId\}/);
  });

  it('reports blocked count so excluded recipients stay visible', () => {
    expect(block).toContain('blockedCount');
  });
});
