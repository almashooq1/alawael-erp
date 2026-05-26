'use strict';

/**
 * W428 — anti-regression guard for AiRecommendationBundle optimistic
 * concurrency.
 *
 * Continuation of the W424/W425/W426/W427 race-fix arc. The approve /
 * reject / discard paths in `services/aiRecommendation.service.js` are
 * findById → mutate → save with a pre-save hook that runs
 * `lib.validateTransition` and appends to `history[]`. Pre-W428 had no
 * optimistic-concurrency guard, so two concurrent approve() calls
 * would BOTH pass validateTransition (both see status='PENDING_REVIEW'),
 * BOTH append a history entry, BOTH save — duplicate audit trail and
 * double-fire on downstream events.
 *
 * Atomic-state-flip via findOneAndUpdate (the W427 pattern) would
 * bypass the existing pre-save hook (Mongoose pre('save') doesn't
 * trigger on findOneAndUpdate by default) and lose the
 * validateTransition + history-append logic. So instead W428 enables
 * Mongoose's built-in `optimisticConcurrency` on the schema — second
 * concurrent save() throws VersionError, surfaces as 500 to the
 * caller (with full stack to logger.error), and the second user gets
 * a "someone else just modified this — please refresh" signal.
 *
 * This guard prevents accidental removal of the schema flag.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'models', 'AiRecommendationBundle.js');

describe('W428 AiRecommendationBundle optimistic concurrency', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('schema sets optimisticConcurrency: true', () => {
    expect(src).toMatch(
      /aiRecommendationBundleSchema\.set\(\s*['"]optimisticConcurrency['"]\s*,\s*true\s*\)/
    );
  });

  it('W428 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W428/);
  });

  it('still exports the canonical Mongoose model', () => {
    // Sanity — make sure the schema flag didn't break the module export.
    expect(src).toMatch(/mongoose\.model\(\s*['"]AiRecommendationBundle['"]/);
  });

  describe('source structural sanity', () => {
    it('optimisticConcurrency line appears AFTER the schema definition', () => {
      const schemaIdx = src.indexOf('aiRecommendationBundleSchema = new mongoose.Schema');
      const occIdx = src.indexOf("aiRecommendationBundleSchema.set('optimisticConcurrency'");
      expect(schemaIdx).toBeGreaterThan(-1);
      expect(occIdx).toBeGreaterThan(schemaIdx);
    });

    it('optimisticConcurrency line appears BEFORE the model registration', () => {
      const occIdx = src.indexOf("aiRecommendationBundleSchema.set('optimisticConcurrency'");
      const modelIdx = src.indexOf("mongoose.model('AiRecommendationBundle'");
      expect(occIdx).toBeGreaterThan(-1);
      expect(modelIdx).toBeGreaterThan(occIdx);
    });
  });
});
