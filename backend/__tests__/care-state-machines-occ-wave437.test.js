'use strict';

/**
 * W437 — anti-regression guard for the 4-model OCC batch on care
 * state machines (PsychRiskFlag / CareLead / Inquiry / HomeVisit).
 *
 * Sixth batch in the W428-OCC pattern arc. The care/ services do
 * findById → push history → mutate status → side-effects + bus emit
 * → save across these 4 models. OCC closes the silent duplicate
 * audit + downstream double-fire race under concurrent transitions.
 *
 * Lighter-weight than W428-W431/W436 because none of these have
 * load-bearing pre-save hooks — atomic findOneAndUpdate would also
 * have worked, but OCC is the minimal-touch fix (single line per
 * model, no service refactor).
 */

const fs = require('fs');
const path = require('path');

const MODELS = [
  { name: 'PsychRiskFlag', file: 'PsychRiskFlag.model.js', schema: 'psychRiskFlagSchema' },
  { name: 'CareLead', file: 'Lead.model.js', schema: 'leadSchema' },
  { name: 'Inquiry', file: 'Inquiry.model.js', schema: 'inquirySchema' },
  { name: 'HomeVisit', file: 'HomeVisit.model.js', schema: 'homeVisitSchema' },
];

describe('W437 care state-machine OCC batch', () => {
  for (const { name, file, schema } of MODELS) {
    describe(`${name} (${file})`, () => {
      let src;
      beforeAll(() => {
        src = fs.readFileSync(path.join(__dirname, '..', 'models', 'care', file), 'utf8');
      });

      it('schema sets optimisticConcurrency: true', () => {
        const re = new RegExp(
          `${schema}\\.set\\(\\s*['"]optimisticConcurrency['"]\\s*,\\s*true\\s*\\)`
        );
        expect(src).toMatch(re);
      });

      it('W437 marker comment present', () => {
        expect(src).toMatch(/W437/);
      });

      it('OCC line precedes the model registration', () => {
        const occIdx = src.indexOf(`${schema}.set('optimisticConcurrency'`);
        const regIdx = src.indexOf(`mongoose.models.${name}`);
        expect(occIdx).toBeGreaterThan(-1);
        expect(regIdx).toBeGreaterThan(occIdx);
      });
    });
  }
});
