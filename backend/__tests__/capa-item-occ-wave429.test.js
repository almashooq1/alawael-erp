'use strict';

/**
 * W429 — anti-regression guard for CapaItem optimistic concurrency.
 *
 * Sibling of W428 (AiRecommendationBundle). The `services/quality/
 * capa.service.js` transitionCapa() path is findById → mutate status →
 * save with a pre-save hook that runs `lib.validateTransition` and
 * appends to `lifecycleHistory[]`. Without OCC, two concurrent
 * transitionCapa() calls would BOTH pass validateTransition, BOTH
 * push a lifecycleHistory entry, BOTH save — silent duplicate audit
 * trail + double-emit on quality.capa.* event bus.
 *
 * W429 enables Mongoose's built-in `optimisticConcurrency` on the
 * schema. Second concurrent save() throws VersionError instead of
 * silent overwrite.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'models', 'quality', 'CapaItem.model.js');

describe('W429 CapaItem optimistic concurrency', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('schema sets optimisticConcurrency: true', () => {
    expect(src).toMatch(/capaItemSchema\.set\(\s*['"]optimisticConcurrency['"]\s*,\s*true\s*\)/);
  });

  it('W429 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W429/);
  });

  it('still exports the canonical Mongoose model', () => {
    expect(src).toMatch(/mongoose\.model\(\s*['"]CapaItem['"]/);
  });

  it('OCC line appears AFTER the pre-save hook (so flag binds to the right schema)', () => {
    const hookIdx = src.indexOf("capaItemSchema.pre('save'");
    const occIdx = src.indexOf("capaItemSchema.set('optimisticConcurrency'");
    expect(hookIdx).toBeGreaterThan(-1);
    expect(occIdx).toBeGreaterThan(hookIdx);
  });

  it('OCC line appears BEFORE the module.exports registration', () => {
    // Use the export-statement signature to avoid false-matching the
    // earlier `mongoose.model('CapaItem')` inside the capaNumber-counter
    // pre-save hook (which is a model LOOKUP, not a registration).
    const occIdx = src.indexOf("capaItemSchema.set('optimisticConcurrency'");
    const exportIdx = src.indexOf('module.exports = mongoose.models.CapaItem');
    expect(occIdx).toBeGreaterThan(-1);
    expect(exportIdx).toBeGreaterThan(occIdx);
  });
});
