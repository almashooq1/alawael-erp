/**
 * W1186 — forms approval-chain drift guard (static + pure-function).
 * ════════════════════════════════════════════════════════════════════════
 * Incident: the catalog registry defines `approvalWorkflow` {enabled, steps[]}
 * on 27 of 32 entries, but FormTemplate's DECLARED field is `approvalSteps` —
 * buildTemplateDoc wrote the phantom field, strict mode dropped it, and every
 * seeded template shipped WITHOUT its designed approval chain. All three
 * submit surfaces (legacy /form-templates, web-admin /documents-pro/forms,
 * public /public/forms) then read the same phantom on the template, so the
 * step-wise review engine never engaged. Bonus bug: review handlers assigned
 * `reviewedAt` to an undeclared FormSubmission path → silently dropped →
 * review-time analytics always zero.
 *
 * This guard locks:
 *   1. catalog service maps approvalWorkflow → approvalSteps (pure fn + doc)
 *   2. all three submit routes read approvalSteps
 *   3. FormSubmission declares reviewedAt/reviewedBy
 *   4. seed script exposes --sync-approvals backfill
 *   5. registry chains stay well-formed
 */

'use strict';

const fs = require('fs');
const path = require('path');

const B = p => path.join(__dirname, '..', p);
const read = p => fs.readFileSync(B(p), 'utf8');
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const svcSrc = read('services/formsCatalogService.js');
const seedSrc = read('scripts/seed-forms-catalog.js');
const submissionModelSrc = read('models/FormSubmission.js');
const legacyRouteSrc = read('routes/formTemplate.routes.js');
const adminRouteSrc = read('routes/forms-submission.routes.js');
const publicRouteSrc = read('routes/public-forms.routes.js');

const {
  approvalStepsFromWorkflow,
  buildTemplateDoc,
} = require('../services/formsCatalogService');
const catalog = require('../config/forms-catalog.registry');

describe('W1186 approval-chain persistence', () => {
  describe('approvalStepsFromWorkflow (pure)', () => {
    it('maps enabled workflows to ordered approvalSteps', () => {
      const steps = approvalStepsFromWorkflow({
        enabled: true,
        steps: [
          { role: 'hr_officer', label: 'HR', order: 1 },
          { role: 'direct_manager', label: 'مدير', order: 0 },
        ],
      });
      expect(steps).toHaveLength(2);
      expect(steps[0].role).toBe('direct_manager'); // sorted by order
      expect(steps[1].role).toBe('hr_officer');
      expect(steps.every(s => s.required === true)).toBe(true);
    });

    it('returns [] for disabled/missing workflows', () => {
      expect(approvalStepsFromWorkflow(undefined)).toEqual([]);
      expect(approvalStepsFromWorkflow({ enabled: false, steps: [{ role: 'x' }] })).toEqual([]);
      expect(approvalStepsFromWorkflow({ enabled: true })).toEqual([]);
    });
  });

  describe('buildTemplateDoc writes ONLY declared fields', () => {
    const entry = catalog.getById('hr.leave.annual');

    it('hr.leave.annual maps its 2-step chain onto approvalSteps', () => {
      const doc = buildTemplateDoc(entry);
      expect(doc.approvalSteps).toHaveLength(2);
      expect(doc.approvalSteps.map(s => s.role)).toEqual(['direct_manager', 'hr_officer']);
      expect(doc.requiresApproval).toBe(true);
    });

    it('no phantom approvalWorkflow key on the built doc', () => {
      const doc = buildTemplateDoc(entry);
      expect(doc).not.toHaveProperty('approvalWorkflow');
    });

    it('source: buildTemplateDoc never writes approvalWorkflow:', () => {
      const code = stripComments(svcSrc);
      expect(code).not.toMatch(/approvalWorkflow:\s/);
      expect(code).toMatch(/approvalSteps:\s*approvalStepsFromWorkflow/);
    });
  });

  describe('FormSubmission declares review-tracking fields', () => {
    it('reviewedAt + reviewedBy are schema paths (strict mode persists them)', () => {
      expect(submissionModelSrc).toMatch(/reviewedAt:\s*Date/);
      expect(submissionModelSrc).toMatch(/reviewedBy:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId/);
    });
  });

  describe('all three submit surfaces read approvalSteps', () => {
    it.each([
      ['legacy /form-templates', legacyRouteSrc],
      ['web-admin /documents-pro/forms', adminRouteSrc],
      ['public /public/forms', publicRouteSrc],
    ])('%s initializes the chain from approvalSteps', (_name, src) => {
      expect(stripComments(src)).toMatch(/\.approvalSteps/);
    });

    it('legacy route: chain submissions start under_review + step-wise review engine present', () => {
      const code = stripComments(legacyRouteSrc);
      expect(code).toMatch(/buildApprovalChain/);
      expect(code).toMatch(/approvals\.length\s*>\s*0\s*\?\s*'under_review'\s*:\s*'submitted'/);
      expect(code).toMatch(/findIndex\(a\s*=>\s*a\.status\s*===\s*'pending'\)/);
      expect(code).toMatch(/requiredRole:\s*step\.role/); // NOT_YOUR_STEP gate
      expect(code).toMatch(/reviewedAt/);
      expect(code).toMatch(/reviewedBy/);
    });
  });

  describe('seed script backfill', () => {
    it('exposes --sync-approvals (idempotent prod backfill for pre-W1186 docs)', () => {
      expect(seedSrc).toMatch(/--sync-approvals/);
      expect(seedSrc).toMatch(/approvalStepsFromWorkflow/);
      expect(seedSrc).toMatch(/skippedHasChain/); // idempotency branch
    });
  });

  describe('registry chain integrity', () => {
    const entries = catalog.listAll().map(e => catalog.getById(e.id));
    const withChain = entries.filter(e => e.approvalWorkflow && e.approvalWorkflow.enabled);

    it('a meaningful share of catalog entries define chains (band guard)', () => {
      expect(withChain.length).toBeGreaterThanOrEqual(20);
      expect(withChain.length).toBeLessThanOrEqual(entries.length);
    });

    it('every chain step has a non-empty role and a numeric-or-absent order', () => {
      for (const e of withChain) {
        expect(Array.isArray(e.approvalWorkflow.steps)).toBe(true);
        expect(e.approvalWorkflow.steps.length).toBeGreaterThan(0);
        for (const s of e.approvalWorkflow.steps) {
          expect(typeof s.role).toBe('string');
          expect(s.role.length).toBeGreaterThan(0);
          if (s.order !== undefined) expect(typeof s.order).toBe('number');
        }
      }
    });
  });
});
