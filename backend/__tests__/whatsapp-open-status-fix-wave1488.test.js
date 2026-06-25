'use strict';

/**
 * W1488 — drift guard for the whatsapp-enhanced "open conversations" KPI fix
 * (W1481 bug class). The stats endpoint counted status:'open' but
 * WhatsAppConversation's status enum is [active, resolved, pending_review,
 * escalated, archived] — 'open' is not in it → the KPI was always 0. "Open" =
 * non-terminal = not resolved and not archived.
 *
 * NOTE: this is the ONLY clean/isolated fix from the enum-literal audit. The
 * other findings (admin-communications, student-complaints, email-v2 — all on
 * `Communication`; electronic-directives/student-certificates on `Document`) are
 * pervasive schema-drift (wrong FIELDS too: channel/direction that don't exist),
 * needing per-route rewrites against current schemas with domain knowledge — see
 * the W1486 commit + agent memory; NOT auto-fixed (would surface wrong data).
 */

const fs = require('fs');
const path = require('path');

const route = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'whatsapp-enhanced.routes.js'),
  'utf8'
);
const model = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'WhatsAppConversation.js'),
  'utf8'
);

describe('W1488 whatsapp open-conversations KPI fix', () => {
  test("open count no longer uses the non-enum literal status:'open'", () => {
    expect(route).not.toMatch(/status:\s*'open'/);
  });

  test('open count uses non-terminal filter ($nin resolved/archived)', () => {
    expect(route).toMatch(/status:\s*\{\s*\$nin:\s*\[\s*'resolved',\s*'archived'\s*\]\s*\}/);
  });

  test('WhatsAppConversation enum has resolved/archived (terminals) and NOT open', () => {
    expect(model).toMatch(/enum:\s*\[[^\]]*'resolved'[^\]]*'archived'/);
    expect(model).not.toMatch(/enum:\s*\[[^\]]*'open'/);
  });
});
