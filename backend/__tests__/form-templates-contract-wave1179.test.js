/**
 * W1179 — form-templates contract drift guard
 * ════════════════════════════════════════════════════════════════════════
 * Locks routes/formTemplate.routes.js to the REAL model vocabulary.
 *
 * Incident: the previous revision of the router queried fields that exist on
 * NEITHER models/FormTemplate.js NOR models/FormSubmission.js
 * (`title` / `status` / `branchId` / `isDeleted` on FormTemplate;
 * `formTemplateId` / `responses` / `formTitle` / plain-ObjectId `submittedBy`
 * on FormSubmission). FormTemplate has no `branchId`, so for any
 * branch-scoped user the list/detail filters matched ZERO documents — the 35
 * published "ready forms" (نماذج جاهزة) seeded in prod since 2026-04-25 were
 * invisible — and POST /:id/submit always threw ValidationError because the
 * required `data` field was never set. The legacy-frontend service layer
 * compounded it by unwrapping `r?.templates` while the backend envelope is
 * `{ success, data, pagination }`, zeroing the list even for HQ admins.
 *
 * Static analysis only (reads source as text; no DB, no app boot).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_PATH = path.join(__dirname, '..', 'routes', 'formTemplate.routes.js');
const TEMPLATE_MODEL_PATH = path.join(__dirname, '..', 'models', 'FormTemplate.js');
const SUBMISSION_MODEL_PATH = path.join(__dirname, '..', 'models', 'FormSubmission.js');
const FRONTEND_SERVICE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'src',
  'services',
  'formTemplatesService.js'
);

const routeSrc = fs.readFileSync(ROUTE_PATH, 'utf8');
const templateModelSrc = fs.readFileSync(TEMPLATE_MODEL_PATH, 'utf8');
const submissionModelSrc = fs.readFileSync(SUBMISSION_MODEL_PATH, 'utf8');

// The route's doc-comment narrates the OLD broken vocabulary; strip comments
// so phantom-field assertions only see executable code.
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const routeCode = stripComments(routeSrc);

describe('W1179 form-templates route ↔ model contract', () => {
  describe('model ground truth (guards the guard)', () => {
    it('FormTemplate uses name/isPublished/isActive and has NO branchId field', () => {
      expect(templateModelSrc).toMatch(/name:\s*\{\s*type:\s*String,\s*required:\s*true/);
      expect(templateModelSrc).toMatch(/isPublished:\s*\{\s*type:\s*Boolean/);
      expect(templateModelSrc).toMatch(/isActive:\s*\{\s*type:\s*Boolean/);
      expect(templateModelSrc).not.toMatch(/branchId/);
      expect(templateModelSrc).not.toMatch(/isDeleted/);
    });

    it('FormSubmission uses templateId(String)/data(Mixed)/submittedBy.userId', () => {
      expect(submissionModelSrc).toMatch(/templateId:\s*\{\s*type:\s*String,\s*required:\s*true/);
      expect(submissionModelSrc).toMatch(
        /data:\s*\{\s*type:\s*mongoose\.Schema\.Types\.Mixed,\s*required:\s*true/
      );
      expect(submissionModelSrc).toMatch(/submittedBy:\s*\{\s*userId:/);
      expect(submissionModelSrc).not.toMatch(/formTemplateId/);
      expect(submissionModelSrc).not.toMatch(/branchId/);
    });
  });

  describe('route must NOT query phantom fields', () => {
    it('never filters FormTemplate/FormSubmission by branchId (models have none)', () => {
      expect(routeCode).not.toMatch(/branchId:\s*req\.user/);
    });

    it('never uses the phantom FormSubmission fields formTemplateId/formTitle', () => {
      expect(routeCode).not.toMatch(/formTemplateId/);
      expect(routeCode).not.toMatch(/formTitle/);
    });

    it('never filters templates by the non-existent status/isDeleted fields', () => {
      expect(routeCode).not.toMatch(/isDeleted/);
      expect(routeCode).not.toMatch(/status:\s*\{\s*\$ne:\s*'deleted'\s*\}/);
      expect(routeCode).not.toMatch(/status:\s*'published'\s*,/); // template lookups gate on isPublished
    });
  });

  describe('route must use the real vocabulary', () => {
    it('publication gating goes through isPublished', () => {
      expect(routeSrc).toMatch(/isPublished:\s*true/);
      expect(routeSrc).toMatch(/isPublished:\s*!existing\.isPublished/);
    });

    it('soft-delete goes through isActive=false', () => {
      expect(routeSrc).toMatch(/isActive:\s*false/);
      expect(routeSrc).toMatch(/isActive:\s*\{\s*\$ne:\s*false\s*\}/);
    });

    it('submit accepts both { data } (legacy frontend) and { responses } payloads', () => {
      expect(routeSrc).toMatch(/body\.data\s*\|\|\s*body\.responses/);
    });

    it('submit validates required fields by fields[].name (not .key)', () => {
      expect(routeSrc).toMatch(/data\[field\.name\]/);
      expect(routeSrc).not.toMatch(/responses\[field\.key\]/);
    });

    it('FormSubmission.create uses templateId slug + data + embedded submittedBy', () => {
      expect(routeSrc).toMatch(/templateId:\s*template\.templateId/);
      expect(routeSrc).toMatch(/templateName:\s*template\.name/);
      expect(routeSrc).toMatch(/submittedBy:\s*\{\s*userId:\s*req\.user\._id/);
    });

    it('templates resolvable by _id OR templateId slug (catalog ids)', () => {
      expect(routeSrc).toMatch(/function findTemplate/);
      expect(routeSrc).toMatch(/templateId:\s*idOrSlug/);
    });
  });

  // Route declarations may be single- or multi-line ("router.get(\n  '/x',") —
  // match with whitespace-tolerant regexes, not string literals.
  const declRe = (method, routePath) =>
    new RegExp(`router\\.${method}\\(\\s*'${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);

  describe('endpoint surface the legacy frontend depends on', () => {
    it.each([
      ['get', '/categories', 'category tabs'],
      ['get', '/stats', 'stat cards'],
      ['get', '/submissions/my', 'my-submissions tab'],
      ['get', '/submissions/pending', 'review queue tab'],
      ['patch', '/submissions/:subId/status', 'approve/reject actions'],
      ['post', '/:id/submit', 'fill-form dialog'],
      ['patch', '/:id/publish', 'publish toggle'],
    ])('declares router.%s(%s) (%s)', (method, routePath) => {
      expect(routeSrc).toMatch(declRe(method, routePath));
    });

    it('declares static paths BEFORE the /:id catch-all', () => {
      const idRoute = routeSrc.search(declRe('get', '/:id'));
      expect(idRoute).toBeGreaterThan(-1);
      for (const routePath of [
        '/categories',
        '/stats',
        '/submissions/my',
        '/submissions/pending',
      ]) {
        const at = routeSrc.search(declRe('get', routePath));
        expect(at).toBeGreaterThan(-1);
        expect(at).toBeLessThan(idRoute);
      }
    });

    it('keeps authenticate + requireBranchAccess mounted', () => {
      expect(routeSrc).toMatch(/router\.use\(authenticate\)/);
      expect(routeSrc).toMatch(/router\.use\(requireBranchAccess\)/);
    });

    it('submission detail is ownership-or-reviewer guarded (no open IDOR)', () => {
      expect(routeSrc).toMatch(/isOwner/);
      expect(routeSrc).toMatch(/canReview\(req\)/);
    });
  });

  describe('legacy frontend service unwraps the { success, data } envelope', () => {
    const feSrc = fs.existsSync(FRONTEND_SERVICE_PATH)
      ? fs.readFileSync(FRONTEND_SERVICE_PATH, 'utf8')
      : null;

    const itIfFe = feSrc ? it : it.skip;

    itIfFe('getTemplates maps r?.data first', () => {
      expect(feSrc).toMatch(/r\?\.data\s*\|\|\s*r\?\.templates/);
    });

    itIfFe('approve/reject go through PATCH /submissions/:id/status', () => {
      expect(feSrc).toMatch(/submissions\/\$\{submissionId\}\/status/);
      expect(feSrc).toMatch(/status:\s*'approved'/);
      expect(feSrc).toMatch(/status:\s*'rejected'/);
      expect(feSrc).not.toMatch(/\/approve`/);
      expect(feSrc).not.toMatch(/\/reject`/);
    });

    itIfFe('submissions lists map r?.data into { submissions }', () => {
      expect(feSrc).toMatch(/submissions:\s*r\?\.data\s*\|\|\s*r\?\.submissions/);
    });
  });
});
