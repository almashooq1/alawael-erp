'use strict';

/**
 * W431 — anti-regression guard for ReportApprovalRequest optimistic
 * concurrency.
 *
 * Fourth application of the W428 OCC pattern. The model exposes
 * instance methods approve(), reject(), markDispatched(), expire(),
 * cancel() — each calls _transition() which validates the state
 * machine, pushes a stateHistory entry, and flips `state`. Two
 * concurrent approve() calls would silently duplicate the audit
 * trail and double-fire downstream (dispatch pipeline, notification).
 *
 * For confidential reports specifically, this is high-impact: a
 * report could be dispatched twice if the dispatch worker also raced.
 *
 * W431 enables Mongoose's `optimisticConcurrency: true` on the
 * schema. Second concurrent save() throws VersionError; the route
 * layer surfaces it as a 500 / 409.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'models', 'ReportApprovalRequest.js');

describe('W431 ReportApprovalRequest optimistic concurrency', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('schema sets optimisticConcurrency: true', () => {
    expect(src).toMatch(
      /ReportApprovalRequestSchema\.set\(\s*['"]optimisticConcurrency['"]\s*,\s*true\s*\)/
    );
  });

  it('W431 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W431/);
  });

  it('still lazy-registers the canonical model via the getter', () => {
    expect(src).toMatch(/get model\(\)/);
    expect(src).toMatch(/mongoose\.model\(['"]ReportApprovalRequest['"]/);
  });

  it('OCC line appears AFTER the schema definition', () => {
    const schemaIdx = src.indexOf('ReportApprovalRequestSchema = new mongoose.Schema');
    const occIdx = src.indexOf("ReportApprovalRequestSchema.set('optimisticConcurrency'");
    expect(schemaIdx).toBeGreaterThan(-1);
    expect(occIdx).toBeGreaterThan(schemaIdx);
  });

  it('OCC line appears BEFORE module.exports (so flag is set before lazy model registration)', () => {
    const occIdx = src.indexOf("ReportApprovalRequestSchema.set('optimisticConcurrency'");
    const exportIdx = src.indexOf('module.exports = {');
    expect(occIdx).toBeGreaterThan(-1);
    expect(exportIdx).toBeGreaterThan(occIdx);
  });

  it('OCC line appears AFTER the instance methods (approve / reject / etc.)', () => {
    // Sanity — make sure we didn't move OCC into the middle of the
    // method definitions (would still work but is structurally odd).
    const approveIdx = src.indexOf('methods.approve');
    const occIdx = src.indexOf("ReportApprovalRequestSchema.set('optimisticConcurrency'");
    expect(approveIdx).toBeGreaterThan(-1);
    expect(occIdx).toBeGreaterThan(approveIdx);
  });
});
