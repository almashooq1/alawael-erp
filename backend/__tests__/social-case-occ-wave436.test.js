'use strict';

/**
 * W436 — anti-regression guard for SocialCase optimistic concurrency.
 *
 * Fifth application of the W428 OCC pattern. The `services/care/
 * socialCase.service.js` state-machine methods (recordAssessment,
 * assignWorker, activatePlan, closeCase, transitionIntervention) all
 * do findById → push statusHistory → mutate doc → SLA observe + bus
 * emit → save. Pre-W436, two concurrent transitions for the same
 * case (UI double-click, social worker + supervisor acting
 * simultaneously) would silently duplicate the audit trail + SLA
 * observe signals + downstream bus events.
 *
 * Fix: schema-level optimistic concurrency. Mongoose tracks __v; the
 * second concurrent save() throws VersionError instead of silent
 * overwrite.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'models', 'care', 'SocialCase.model.js');

describe('W436 SocialCase optimistic concurrency', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('schema sets optimisticConcurrency: true', () => {
    expect(src).toMatch(/socialCaseSchema\.set\(\s*['"]optimisticConcurrency['"]\s*,\s*true\s*\)/);
  });

  it('W436 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W436/);
  });

  it('still exports the canonical Mongoose model', () => {
    expect(src).toMatch(/mongoose\.model\(\s*['"]SocialCase['"]/);
  });

  it('OCC line appears AFTER the schema definition', () => {
    const schemaIdx = src.indexOf('socialCaseSchema = new mongoose.Schema');
    const occIdx = src.indexOf("socialCaseSchema.set('optimisticConcurrency'");
    expect(schemaIdx).toBeGreaterThan(-1);
    expect(occIdx).toBeGreaterThan(schemaIdx);
  });

  it('OCC line appears BEFORE the model registration', () => {
    // Use the export-line signature to avoid false-matching any earlier
    // `mongoose.model('SocialCase')` lookups inside the file.
    const occIdx = src.indexOf("socialCaseSchema.set('optimisticConcurrency'");
    const modelIdx = src.indexOf('mongoose.models.SocialCase');
    expect(occIdx).toBeGreaterThan(-1);
    expect(modelIdx).toBeGreaterThan(occIdx);
  });
});
