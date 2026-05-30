'use strict';

/**
 * beneficiary-lifecycle-bootstrap-wiring-wave589.test.js — Wave 589.
 *
 * Static drift guard on `startup/beneficiaryLifecycleBootstrap.js`.
 *
 * W583 wired the lifecycle side-effect handlers; W584 promoted
 * `release-care-team`; W587 made a real-data handler's self-skip (its backing
 * Mongoose model not injected) OBSERVABLE at runtime. This guard closes the
 * loop at BUILD time: it pins the exact wiring that keeps those handlers from
 * silently self-skipping in production.
 *
 * If a future refactor drops the `Appointment` / `EpisodeOfCare` require,
 * stops passing the models into the handler factory, reverts the service to
 * `sideEffectHandlers: {}` (the W583 silent-no-op regression), or removes
 * `enforceMfa: true`, this suite fails in CI BEFORE the regression ships —
 * instead of being discovered as a W587 self-skip warning in a live log.
 *
 * Pure source analysis: reads the bootstrap file as text. No Express boot, no
 * Mongo, no mocking — the contract under test is the wiring source itself.
 */

const fs = require('fs');
const path = require('path');

const BOOTSTRAP_PATH = path.join(
  __dirname,
  '..',
  'startup',
  'beneficiaryLifecycleBootstrap.js'
);

/** @type {string} */
let src;

beforeAll(() => {
  src = fs.readFileSync(BOOTSTRAP_PATH, 'utf8');
});

describe('W589 lifecycle bootstrap wiring — real-data side-effect models', () => {
  test('bootstrap file exists and is non-trivial', () => {
    expect(src.length).toBeGreaterThan(500);
  });

  test('requires the Appointment model (source for end-active-schedules)', () => {
    expect(src).toMatch(/require\(\s*['"]\.\.\/models\/Appointment['"]\s*\)/);
  });

  test('requires the EpisodeOfCare model (source for close-open-episodes + release-care-team)', () => {
    expect(src).toMatch(
      /require\(\s*['"]\.\.\/domains\/episodes\/models\/EpisodeOfCare['"]\s*\)/
    );
  });

  test('constructs the side-effect handler factory with both injected models', () => {
    // The factory call must receive appointmentModel + episodeModel so the
    // real-data handlers do not self-skip (W587) in production.
    const factoryCall = src.match(
      /createBeneficiaryLifecycleSideEffectHandlers\(\{([\s\S]*?)\}\)/
    );
    expect(factoryCall).toBeTruthy();
    const args = factoryCall[1];
    expect(args).toMatch(/\bappointmentModel\b/);
    expect(args).toMatch(/\bepisodeModel\b/);
  });

  test('provides an eventSink so deferred ops are not silent', () => {
    const factoryCall = src.match(
      /createBeneficiaryLifecycleSideEffectHandlers\(\{([\s\S]*?)\}\)/
    );
    expect(factoryCall[1]).toMatch(/\beventSink\b/);
  });
});

describe('W589 lifecycle service construction — no silent-no-op regression', () => {
  test('service is built with the wired handler map, NOT an empty object', () => {
    // W583 regression sentinel: `sideEffectHandlers: {}` would make every
    // declared side-effect a silent no-op again. Strip comments first so the
    // historical `sideEffectHandlers: {}` mention in the W583 doc-comment does
    // not trip the negative assertion.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/\/\/[^\n]*/g, ''); // line comments
    expect(codeOnly).toMatch(/sideEffectHandlers:\s*lifecycleSideEffectHandlers/);
    expect(codeOnly).not.toMatch(/sideEffectHandlers:\s*\{\s*\}/);
  });

  test('enforceMfa is true on the constructed lifecycle service', () => {
    expect(src).toMatch(/enforceMfa:\s*true/);
  });
});
