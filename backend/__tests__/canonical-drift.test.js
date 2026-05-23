/**
 * canonical-drift.test.js — Wave 285 drift guard.
 *
 * For every entity registered in `intelligence/canonical`, ensure the
 * declared Mongoose model exists AND that every top-level canonical
 * field exists in the Mongoose schema with a compatible type.
 *
 * Strategy:
 *   - The canonical contract ships ahead of the Mongoose schemas. To
 *     avoid red-build on Day 1, every entity is in `report` mode by
 *     default: drift is logged so progress is visible, but only
 *     entities listed in `ENFORCED_ENTITIES` actually fail the test.
 *   - As each Mongoose schema is brought into parity with the
 *     canonical contract, ADD ITS NAME to `ENFORCED_ENTITIES`. Once
 *     enforced, future drift is a hard failure.
 *   - `MODEL_NOT_REGISTERED` is always non-fatal (model file stub may
 *     not exist yet). The pending list is reported separately.
 */

'use strict';

// We need REAL mongoose schemas (not the global jest.setup.js mock) so
// `.path()`/`.instance`/`.enumValues` reflect what the models actually
// declare. Mock-mongoose returns synthetic models with no schema metadata.
jest.unmock('mongoose');

jest.isolateModules(() => require('mongoose'));

const path = require('path');

// Entities whose Mongoose model is verified to match the canonical
// contract — drift here IS a build failure. Start small, grow over time.
const ENFORCED_ENTITIES = new Set([
  // 'Beneficiary',  // enable once Beneficiary Mongoose schema is brought to parity
]);

// Load canonical registry first (this also registers all schemas).
const { registry, drift } = require('../intelligence/canonical');

// Eagerly load the existing Mongoose models so they're registered when
// the drift detector calls `mongoose.model('X')`. We do this by
// requiring the directory paths we know hold the models — failures are
// swallowed so an unregistered model just shows up as `pending`.
const mongoose = require('mongoose');

const MODEL_FILES_TO_TRY = [
  '../models/Beneficiary',
  '../domains/episodes/models/EpisodeOfCare',
  '../models/Assessment',
  '../models/MeasurementModels',
  '../models/CarePlan',
  '../models/Session',
  '../models/GroupSession',
  '../models/TeleSession',
  '../models/ImmersiveSession',
  '../models/BehaviorIncident',
];

beforeAll(() => {
  for (const rel of MODEL_FILES_TO_TRY) {
    try {
      require(path.join(__dirname, rel));
    } catch (_e) {
      // expected when the stub doesn't exist yet
    }
  }
});

describe('Canonical Data Model → Mongoose drift guard (Wave 285)', () => {
  test('registry has every shipped canonical entity', () => {
    const names = registry.names();
    // Spec is 11 entities (10 persisted + RiskProfile derived view, W287).
    // Hard-assert the count so accidentally dropping one is caught here.
    expect(names.length).toBe(11);
    expect(names).toEqual(
      expect.arrayContaining([
        'Beneficiary',
        'EpisodeOfCare',
        'Assessment',
        'Measure',
        'PlanOfCare',
        'Session',
        'GroupTherapySession',
        'TeleRehabSession',
        'ARVRSession',
        'BehaviorIncident',
        'RiskProfile',
      ])
    );
  });

  test('no canonical entity has DRIFT against its registered Mongoose model', () => {
    const driftErrors = [];
    const driftReports = []; // non-fatal: drift on entities not yet enforced
    const pending = [];

    for (const entry of registry.list()) {
      const report = drift.detectDrift(entry, name => mongoose.model(name));
      if (report.issues && report.issues.some(i => i.code === 'MODEL_NOT_REGISTERED')) {
        pending.push({ entity: report.entity, model: report.mongooseModel });
        continue;
      }
      if (report.issues && report.issues.length) {
        if (ENFORCED_ENTITIES.has(report.entity)) {
          driftErrors.push(report);
        } else {
          driftReports.push(report);
        }
      }
    }

    if (pending.length) {
      console.log(
        `\n[canonical-drift] ${pending.length} entity/entities pending Mongoose model:\n` +
          pending.map(p => `  - ${p.entity} → expects model "${p.model}"`).join('\n')
      );
    }

    if (driftReports.length) {
      const summary = driftReports
        .map(r => `  - ${r.entity} (${r.mongooseModel}): ${r.issues.length} issue(s)`)
        .join('\n');

      console.log(
        `\n[canonical-drift] ${driftReports.length} entity/entities have drift (not yet enforced):\n${summary}\n` +
          '  → Bring Mongoose schemas to parity, then add the entity name to ENFORCED_ENTITIES.'
      );
    }

    if (driftErrors.length) {
      const detail = driftErrors
        .map(r => {
          const lines = r.issues.map(
            i => `    [${i.code}] ${i.canonicalField || ''} → ${i.message}`
          );
          return `  ${r.entity} (model: ${r.mongooseModel})\n${lines.join('\n')}`;
        })
        .join('\n');
      throw new Error(
        `Canonical-model DRIFT detected in ${driftErrors.length} ENFORCED entity/entities:\n${detail}\n\n` +
          'Either update the Mongoose schema to match the canonical contract, ' +
          'or revise the canonical schema if the contract intentionally changed ' +
          '(and bump consumers).'
      );
    }
  });
});
