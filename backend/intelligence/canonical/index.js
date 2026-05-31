'use strict';
/**
 * Canonical Data Model — public entrypoint (Wave 285).
 *
 * Exposes:
 *   - canonical.<Entity>  → Zod schema for direct parsing
 *   - canonicalEntry(<Entity>) → full registry entry
 *   - validateBody / validateQuery / validateParams → Express middleware
 *   - registry → low-level registry API (register/get/list/names)
 *   - drift → mongoose drift detection lib
 */

const registry = require('./registry');
const validator = require('./validator.middleware');
const drift = require('./mongoose-drift.lib');

// Eagerly register every shipped schema. New schemas drop a file in
// schemas/ and add a require() line here — that's it.
const ENTRIES = [
  require('./schemas/beneficiary.canonical'),
  require('./schemas/episode-of-care.canonical'),
  require('./schemas/assessment.canonical'),
  require('./schemas/measure.canonical'),
  require('./schemas/plan-of-care.canonical'),
  require('./schemas/session.canonical'),
  require('./schemas/group-therapy-session.canonical'),
  require('./schemas/tele-rehab-session.canonical'),
  require('./schemas/arvr-session.canonical'),
  require('./schemas/behavior-incident.canonical'),
  require('./schemas/risk-profile.canonical'),
  // W356-W363 clinical-services series (2026-05-25):
  require('./schemas/seizure-event.canonical'),
  require('./schemas/safeguarding-concern.canonical'),
  require('./schemas/communication-aid-profile.canonical'),
  require('./schemas/assistive-device.canonical'),
  require('./schemas/cbahi-attestation.canonical'),
  require('./schemas/transition-plan.canonical'),
  require('./schemas/adaptive-sports-program.canonical'),
  require('./schemas/respite-booking.canonical'),
  // W368-W369 additions (2026-05-25):
  require('./schemas/beneficiary-diet-prescription.canonical'),
  require('./schemas/facility-asset.canonical'),
  // W384 family support (2026-05-25):
  require('./schemas/caregiver-support-program.canonical'),
  // W680 P&O fabrication/fitting clinic (2026-05-31):
  require('./schemas/prosthetic-orthotic-order.canonical'),
  // W681 seat allocation / daily occupancy (2026-05-31):
  require('./schemas/seat-allocation.canonical'),
  // W682 kafala / sponsorship donor↔beneficiary link (2026-05-31):
  require('./schemas/sponsorship.canonical'),
];

for (const entry of ENTRIES) registry.register(entry);

// Convenience: canonical.Beneficiary === schemas/beneficiary.canonical.schema
const canonical = Object.freeze(
  registry.list().reduce((acc, e) => {
    acc[e.name] = e.schema;
    return acc;
  }, {})
);

module.exports = {
  canonical,
  canonicalEntry: registry.get,
  registry,
  drift,
  validateBody: validator.validateBody,
  validateQuery: validator.validateQuery,
  validateParams: validator.validateParams,
  REASON_CODE: validator.REASON_CODE,
};
