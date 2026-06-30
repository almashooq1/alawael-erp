/**
 * documentAdvanced route↔service signature-contract guard.
 *
 * routes/documentAdvanced.routes.js is LIVE-mounted (10 services, 60+ endpoints).
 * Four endpoints were calling positional-signature service methods with the WRONG
 * argument shape, so the feature silently did nothing or always failed:
 *
 *   - watermarkService.applyWatermark(options)  ← route passed (documentId, options)
 *       → `options` became the documentId STRING; `const { documentId } = options`
 *         resolved to undefined → no document watermarked.
 *   - approvalService.submitDecision(requestId, stepId, decision)  ← route passed
 *       (workflowId, userId, decision) → `steps.find(s => s.id === stepId)` matched
 *         the user id against step ids → "خطوة الموافقة غير موجودة" on EVERY decide.
 *   - exportService.createExportJob(options)  ← route passed (documentIds, options)
 *       → `options` became the documentIds ARRAY; nothing exported.
 *   - exportService.createImportJob(options)  ← route passed (data, options)
 *       → `options` became the data payload; nothing imported.
 *
 * The fix re-shapes each call to the service's real signature. This guard locks
 * BOTH sides: the corrected call shape in the route AND the service signature it
 * targets — so a drift on either side fails CI. Static source read (no mongoose).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('documentAdvanced route↔service signature contract', () => {
  const route = read('routes/documentAdvanced.routes.js');

  describe('route passes the corrected (positional-correct) argument shapes', () => {
    test('applyWatermark is called with a SINGLE options object (documentId inside), not (documentId, options)', () => {
      expect(route).not.toMatch(/applyWatermark\(\s*req\.body\.documentId\s*,/);
      expect(route).toMatch(/applyWatermark\(\{\s*[\r\n]+\s*documentId:\s*req\.body\.documentId/);
    });

    test('submitDecision 2nd arg is the approval STEP id (req.body.stepId), never the acting user id', () => {
      expect(route).not.toMatch(/submitDecision\(\s*req\.params\.workflowId\s*,\s*userId\(req\)/);
      expect(route).toMatch(/submitDecision\(\s*req\.params\.workflowId\s*,\s*req\.body\.stepId\s*,/);
    });

    test('createExportJob is called with a SINGLE options object (documentIds inside), not (documentIds, options)', () => {
      expect(route).not.toMatch(/createExportJob\(\s*req\.body\.documentIds\s*,/);
      expect(route).toMatch(/createExportJob\(\{\s*[\r\n]+\s*documentIds:\s*req\.body\.documentIds/);
    });

    test('createImportJob is called with a SINGLE options object (data inside), not (data, options)', () => {
      expect(route).not.toMatch(/createImportJob\(\s*req\.body\.data\s*,/);
      expect(route).toMatch(/createImportJob\(\{\s*[\r\n]+\s*data:\s*req\.body\.data/);
    });

    // follow-up: 3 more methods whose calls passed positional args where the
    // service takes a single object (missed in the first pass because they had
    // no `...req.body` spread to grep for).
    test('createTemplate is called with the single data object (req.body), not (orgId, body)', () => {
      expect(route).not.toMatch(/createTemplate\(\s*req\.body\.orgId\s*,/);
      expect(route).toMatch(/createTemplate\(\s*req\.body\s*\)/);
    });

    test('createApprovalRequest is called with a SINGLE data object, not (documentId, template, …)', () => {
      expect(route).not.toMatch(/createApprovalRequest\(\s*req\.body\.documentId\s*,/);
      expect(route).toMatch(/createApprovalRequest\(\{[\s\S]*?requestedBy:\s*userId\(req\)/);
    });

    test('exportToCSV is called with a SINGLE options object (documentIds inside), not (documentIds, options)', () => {
      expect(route).not.toMatch(/exportToCSV\(\s*req\.body\.documentIds\s*,/);
      expect(route).toMatch(/exportToCSV\(\{\s*[\r\n]+\s*documentIds:\s*req\.body\.documentIds/);
    });
  });

  describe('the targeted service signatures are unchanged (the other half of the contract)', () => {
    test('documentWatermark.applyWatermark takes a single options object', () => {
      expect(read('services/documents/documentWatermark.service.js')).toMatch(
        /async applyWatermark\(\s*options\s*=\s*\{\}\s*\)/
      );
    });

    test('documentApprovalService.submitDecision takes (requestId, stepId, decision)', () => {
      expect(read('services/documentApprovalService.js')).toMatch(
        /async submitDecision\(\s*requestId\s*,\s*stepId\s*,\s*decision\s*\)/
      );
    });

    test('documentImportExport.createExportJob / createImportJob take a single options object', () => {
      const svc = read('services/documents/documentImportExport.service.js');
      expect(svc).toMatch(/async createExportJob\(\s*options\s*=\s*\{\}\s*\)/);
      expect(svc).toMatch(/async createImportJob\(\s*options\s*=\s*\{\}\s*\)/);
      // and the destructure targets the route now supplies inside the object
      expect(svc).toMatch(/const\s*\{[\s\S]*documentIds[\s\S]*\}\s*=\s*options/);
      expect(svc).toMatch(/const\s*\{\s*data\s*,[\s\S]*\}\s*=\s*options/);
    });

    test('documentWatermark.createTemplate takes a single data object', () => {
      expect(read('services/documents/documentWatermark.service.js')).toMatch(
        /async createTemplate\(\s*data\s*\)/
      );
    });

    test('documentApprovalService.createApprovalRequest takes a single data object (destructured)', () => {
      const svc = read('services/documentApprovalService.js');
      expect(svc).toMatch(/async createApprovalRequest\(\s*data\s*\)/);
      expect(svc).toMatch(/const\s*\{[\s\S]*documentId[\s\S]*requestedBy[\s\S]*\}\s*=\s*data/);
    });

    test('documentImportExport.exportToCSV takes a single options object', () => {
      expect(read('services/documents/documentImportExport.service.js')).toMatch(
        /async exportToCSV\(\s*options\s*=\s*\{\}\s*\)/
      );
    });
  });
});
