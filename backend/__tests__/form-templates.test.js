/**
 * Form Template System — Comprehensive Tests
 * Tests the professional form template system including:
 *   - FormTemplate model (design schema, versioning, validation, cloning)
 *   - FormSubmission model (approval workflow, revisions, comments)
 *   - formTemplate.service (CRUD, design, versioning, submissions, stats, rendering)
 *   - formTemplate.controller (HTTP handler wiring)
 *   - Route structure (auth middleware applied)
 *
 * Uses real mongoose for model/schema tests, isolated from global mock.
 *
 * @created 2026-03-14
 */

/* eslint-disable no-unused-vars */

// ─── Unmock mongoose for this file so models load with real schemas ──
jest.unmock('mongoose');

// ─── Mocks ──────────────────────────────────────────────────────────

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ─── Constants & Fixtures ───────────────────────────────────────────

const SAMPLE_FIELDS = [
  { name: 'fullName', label: 'الاسم الكامل', type: 'text', required: true, gridSize: 6 },
  { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true, gridSize: 6 },
  {
    name: 'department',
    label: 'القسم',
    type: 'select',
    required: true,
    gridSize: 6,
    options: [
      { label: 'تأهيل', value: 'rehab' },
      { label: 'إدارة', value: 'admin' },
    ],
  },
  { name: 'birthDate', label: 'تاريخ الميلاد', type: 'date', gridSize: 6 },
  { name: 'notes', label: 'ملاحظات', type: 'textarea', gridSize: 12 },
  { name: 'rating', label: 'التقييم', type: 'rating', maxRating: 5, gridSize: 6 },
  { name: 'divider1', label: 'فاصل', type: 'divider' },
  { name: 'agree', label: 'موافقة', type: 'checkbox', gridSize: 6 },
];

const SAMPLE_SECTIONS = [
  { id: 'personal', title: 'البيانات الشخصية', order: 1, collapsible: true },
  { id: 'work', title: 'بيانات العمل', order: 2, columns: 2 },
];

const SAMPLE_DESIGN = {
  logo: { url: 'https://example.com/logo.png', width: 120, height: 60, position: 'center' },
  secondaryLogo: {
    url: 'https://example.com/partner.png',
    width: 80,
    height: 40,
    position: 'left',
  },
  header: {
    enabled: true,
    title: 'مركز الأوائل للتأهيل',
    titleEn: 'Al-Awael Rehab Center',
    subtitle: 'نموذج طلب',
    backgroundColor: '#1565C0',
    textColor: '#ffffff',
    showDate: true,
    showReferenceNumber: true,
  },
  footer: {
    enabled: true,
    text: 'هاتف: 0112345678',
    showPageNumbers: true,
    showSignatureFields: true,
    signatureFields: [
      { label: 'المدير', role: 'admin', position: 'right' },
      { label: 'مقدم الطلب', role: 'employee', position: 'left' },
    ],
    contactInfo: 'info@alawael.org',
  },
  watermark: { enabled: true, text: 'مسودة', opacity: 0.08, rotation: -30, fontSize: 60 },
  page: {
    size: 'A4',
    orientation: 'portrait',
    direction: 'rtl',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  },
  theme: {
    primaryColor: '#1565C0',
    secondaryColor: '#DC004E',
    accentColor: '#FF9800',
    fontFamily: 'Cairo, sans-serif',
    fontSize: 14,
    borderRadius: 8,
    fieldSpacing: 16,
  },
  stamps: [{ label: 'معتمد', type: 'approved', color: '#4CAF50', position: 'top-right' }],
  customCss: '.custom { color: red; }',
};

const SAMPLE_APPROVAL_STEPS = [
  { role: 'department_head', label: 'رئيس القسم', order: 1 },
  { role: 'admin', label: 'الإدارة', order: 2 },
];

// ═══════════════════════════════════════════════════════════════════
// 📋 TEST SUITES
// ═══════════════════════════════════════════════════════════════════

describe('Form Template System — Professional Implementation', () => {
  // ─────────────────────────────────────────────────────────────────
  // 1. FormTemplate Model
  // ─────────────────────────────────────────────────────────────────

  describe('1. FormTemplate Model', () => {
    const mongoose = require('mongoose');
    let FormTemplate;

    beforeAll(() => {
      FormTemplate = require('../models/FormTemplate');
    });

    test('should export a Mongoose model', () => {
      expect(FormTemplate).toBeDefined();
      expect(FormTemplate.modelName).toBe('FormTemplate');
    });

    test('schema should have all required paths', () => {
      const paths = Object.keys(FormTemplate.schema.paths);
      const required = [
        'templateId',
        'name',
        'category',
        'fields',
        'sections',
        'design',
        'isActive',
        'isBuiltIn',
        'version',
        'versions',
        'requiresApproval',
        'approvalSteps',
        'permissions.canView',
        'tags',
        'createdBy',
        'tenantId',
      ];
      for (const field of required) {
        expect(paths).toContain(field);
      }
    });

    test('category enum should include all 10 categories', () => {
      const catEnum = FormTemplate.schema.path('category').enumValues;
      expect(catEnum).toEqual(
        expect.arrayContaining([
          'beneficiary',
          'hr',
          'administration',
          'finance',
          'general',
          'medical',
          'therapy',
          'legal',
          'reports',
          'custom',
        ])
      );
      expect(catEnum.length).toBe(10);
    });

    test('field type enum should support 25+ types', () => {
      // Grab enum from nested schema
      const fieldSchema = FormTemplate.schema.path('fields');
      expect(fieldSchema).toBeDefined();
      const itemSchema = fieldSchema.schema || (fieldSchema.caster && fieldSchema.caster.schema);
      expect(itemSchema).toBeDefined();
      const typeEnum = itemSchema.path('type').enumValues;
      expect(typeEnum.length).toBeGreaterThanOrEqual(25);
      expect(typeEnum).toContain('text');
      expect(typeEnum).toContain('signature');
      expect(typeEnum).toContain('rating');
      expect(typeEnum).toContain('slider');
      expect(typeEnum).toContain('table');
      expect(typeEnum).toContain('repeater');
      expect(typeEnum).toContain('calculated');
      expect(typeEnum).toContain('rich_text');
      expect(typeEnum).toContain('location');
      expect(typeEnum).toContain('toggle');
      expect(typeEnum).toContain('color');
    });

    test('design schema should have logo, header, footer, watermark, page, theme', () => {
      const designPath = FormTemplate.schema.path('design');
      expect(designPath).toBeDefined();
      const designSchema = designPath.schema;
      expect(designSchema).toBeDefined();
      const designPaths = Object.keys(designSchema.paths);
      expect(designPaths).toContain('logo.url');
      expect(designPaths).toContain('logo.base64');
      expect(designPaths).toContain('logo.width');
      expect(designPaths).toContain('logo.position');
      expect(designPaths).toContain('header.enabled');
      expect(designPaths).toContain('header.title');
      expect(designPaths).toContain('header.backgroundColor');
      expect(designPaths).toContain('footer.enabled');
      expect(designPaths).toContain('footer.text');
      expect(designPaths).toContain('footer.showSignatureFields');
      expect(designPaths).toContain('watermark.enabled');
      expect(designPaths).toContain('watermark.text');
      expect(designPaths).toContain('page.size');
      expect(designPaths).toContain('page.orientation');
      expect(designPaths).toContain('page.direction');
      expect(designPaths).toContain('theme.primaryColor');
      expect(designPaths).toContain('theme.fontFamily');
    });

    test('should have saveVersion method', () => {
      const doc = new FormTemplate({ templateId: 't-1', name: 'Test', category: 'general' });
      expect(typeof doc.saveVersion).toBe('function');
    });

    test('saveVersion should increment version and push to versions array', () => {
      const doc = new FormTemplate({
        templateId: 't-1',
        name: 'Test',
        category: 'general',
        fields: SAMPLE_FIELDS,
        design: SAMPLE_DESIGN,
      });
      expect(doc.version).toBe(1);
      expect(doc.versions.length).toBe(0);

      doc.saveVersion('user-1', 'Admin', 'First save');
      expect(doc.version).toBe(2);
      expect(doc.versions.length).toBe(1);
      expect(doc.versions[0].version).toBe(1);
      expect(doc.versions[0].notes).toBe('First save');
    });

    test('restoreVersion should restore fields from snapshot', () => {
      const doc = new FormTemplate({
        templateId: 't-2',
        name: 'Test',
        category: 'general',
        fields: [{ name: 'f1', label: 'Field 1', type: 'text' }],
      });
      doc.saveVersion('u1', 'Admin', 'v1');
      doc.fields = [{ name: 'f2', label: 'Field 2', type: 'number' }];
      doc.saveVersion('u1', 'Admin', 'v2');

      doc.restoreVersion(1);
      expect(doc.fields[0].name).toBe('f1');
      expect(doc.fields[0].type).toBe('text');
    });

    test('restoreVersion should throw for non-existent version', () => {
      const doc = new FormTemplate({ templateId: 't-3', name: 'Test', category: 'general' });
      expect(() => doc.restoreVersion(99)).toThrow();
    });

    test('cloneTemplate should create a new template object', () => {
      const doc = new FormTemplate({
        templateId: 'orig-1',
        name: 'Original',
        category: 'hr',
        fields: SAMPLE_FIELDS,
        design: SAMPLE_DESIGN,
        isBuiltIn: true,
      });
      const cloned = doc.cloneTemplate('نسخة', 'user-1');
      expect(cloned.templateId).not.toBe('orig-1');
      expect(cloned.templateId).toMatch(/^custom-/);
      expect(cloned.name).toBe('نسخة');
      expect(cloned.isBuiltIn).toBe(false);
      expect(cloned.version).toBe(1);
      expect(cloned.versions).toEqual([]);
    });

    test('cloneTemplate with no name should generate default name', () => {
      const doc = new FormTemplate({ templateId: 'orig-2', name: 'إجازة', category: 'hr' });
      const cloned = doc.cloneTemplate(null, 'user-1');
      expect(cloned.name).toBe('نسخة من إجازة');
    });

    test('validateSubmission should catch missing required fields', () => {
      const doc = new FormTemplate({
        templateId: 't-v1',
        name: 'Test',
        category: 'general',
        fields: SAMPLE_FIELDS,
      });
      const errors = doc.validateSubmission({});
      const requiredFields = SAMPLE_FIELDS.filter(
        f => f.required && !['header', 'divider', 'paragraph', 'spacer'].includes(f.type)
      );
      expect(errors.length).toBe(requiredFields.length);
    });

    test('validateSubmission should pass when all required fields provided', () => {
      const doc = new FormTemplate({
        templateId: 't-v2',
        name: 'Test',
        category: 'general',
        fields: SAMPLE_FIELDS,
      });
      const errors = doc.validateSubmission({
        fullName: 'أحمد محمد',
        email: 'test@test.com',
        department: 'rehab',
      });
      expect(errors.length).toBe(0);
    });

    test('validateSubmission should enforce minLength / maxLength', () => {
      const doc = new FormTemplate({
        templateId: 't-v3',
        name: 'Test',
        category: 'general',
        fields: [
          {
            name: 'code',
            label: 'Code',
            type: 'text',
            required: true,
            validation: { minLength: 3, maxLength: 5 },
          },
        ],
      });
      const errors = doc.validateSubmission({ code: 'AB' });
      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe('code');
    });

    test('validateSubmission should enforce min / max numbers', () => {
      const doc = new FormTemplate({
        templateId: 't-v4',
        name: 'Test',
        category: 'general',
        fields: [
          {
            name: 'age',
            label: 'Age',
            type: 'number',
            required: true,
            validation: { min: 0, max: 150 },
          },
        ],
      });
      expect(doc.validateSubmission({ age: -1 }).length).toBe(1);
      expect(doc.validateSubmission({ age: 200 }).length).toBe(1);
      expect(doc.validateSubmission({ age: 25 }).length).toBe(0);
    });

    test('validateSubmission should enforce pattern', () => {
      const doc = new FormTemplate({
        templateId: 't-v5',
        name: 'Test',
        category: 'general',
        fields: [
          {
            name: 'nid',
            label: 'ID',
            type: 'text',
            required: true,
            validation: { pattern: '^\\d{10}$', patternMessage: 'ID must be 10 digits' },
          },
        ],
      });
      const errors = doc.validateSubmission({ nid: '12345' });
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('ID must be 10 digits');
      expect(doc.validateSubmission({ nid: '1234567890' }).length).toBe(0);
    });

    test('fieldCount virtual should exclude layout fields', () => {
      const doc = new FormTemplate({
        templateId: 't-vc',
        name: 'Test',
        category: 'general',
        fields: SAMPLE_FIELDS,
      });
      const layoutFields = SAMPLE_FIELDS.filter(f =>
        ['header', 'divider', 'paragraph', 'spacer'].includes(f.type)
      );
      expect(doc.fieldCount).toBe(SAMPLE_FIELDS.length - layoutFields.length);
    });

    test('sectionCount virtual should count sections', () => {
      const doc = new FormTemplate({
        templateId: 't-sc',
        name: 'Test',
        category: 'general',
        sections: SAMPLE_SECTIONS,
      });
      expect(doc.sectionCount).toBe(2);
    });

    test('statics should be defined', () => {
      expect(typeof FormTemplate.findByCategory).toBe('function');
      expect(typeof FormTemplate.search).toBe('function');
      expect(typeof FormTemplate.findByTemplateId).toBe('function');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. FormSubmission Model
  // ─────────────────────────────────────────────────────────────────

  describe('2. FormSubmission Model', () => {
    let FormSubmission;

    beforeAll(() => {
      FormSubmission = require('../models/FormSubmission');
    });

    test('should export a Mongoose model', () => {
      expect(FormSubmission).toBeDefined();
      expect(FormSubmission.modelName).toBe('FormSubmission');
    });

    test('schema should have all required paths', () => {
      const paths = Object.keys(FormSubmission.schema.paths);
      const required = [
        'templateId',
        'submissionNumber',
        'submittedBy.userId',
        'data',
        'status',
        'approvals',
        'attachments',
        'revisions',
        'comments',
        'priority',
        'dueDate',
        'tenantId',
      ];
      for (const field of required) {
        expect(paths).toContain(field);
      }
    });

    test('status enum should include 8 states', () => {
      const statusEnum = FormSubmission.schema.path('status').enumValues;
      expect(statusEnum).toEqual(
        expect.arrayContaining([
          'draft',
          'submitted',
          'under_review',
          'approved',
          'rejected',
          'cancelled',
          'returned',
          'archived',
        ])
      );
    });

    test('priority enum should include 4 levels', () => {
      const priorityEnum = FormSubmission.schema.path('priority').enumValues;
      expect(priorityEnum).toEqual(expect.arrayContaining(['low', 'normal', 'high', 'urgent']));
    });

    test('should have approval workflow methods', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        approvals: [
          { role: 'head', status: 'pending' },
          { role: 'admin', status: 'pending' },
        ],
      });
      expect(typeof doc.approveCurrentStep).toBe('function');
      expect(typeof doc.reject).toBe('function');
      expect(typeof doc.returnForRevision).toBe('function');
      expect(typeof doc.saveRevision).toBe('function');
    });

    test('approveCurrentStep should approve first pending step', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        status: 'submitted',
        approvals: [
          { step: 0, role: 'head', status: 'pending' },
          { step: 1, role: 'admin', status: 'pending' },
        ],
      });
      doc.approveCurrentStep('user-1', 'Manager', 'OK');
      expect(doc.approvals[0].status).toBe('approved');
      expect(doc.approvals[0].approverName).toBe('Manager');
      expect(doc.approvals[1].status).toBe('pending');
      expect(doc.status).toBe('under_review');
    });

    test('approveCurrentStep should set approved when all steps done', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        status: 'under_review',
        approvals: [{ step: 0, role: 'head', status: 'approved', date: new Date() }],
      });
      // Add one more pending
      doc.approvals.push({ step: 1, role: 'admin', status: 'pending' });
      doc.approveCurrentStep('user-2', 'Director', 'Approved');
      expect(doc.status).toBe('approved');
      expect(doc.approvedAt).toBeDefined();
    });

    test('approveCurrentStep should throw if no pending step', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        approvals: [{ role: 'head', status: 'approved' }],
      });
      expect(() => doc.approveCurrentStep('u1', 'X', '')).toThrow();
    });

    test('reject should set status to rejected', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        status: 'submitted',
        approvals: [{ role: 'head', status: 'pending' }],
      });
      doc.reject('user-1', 'Manager', 'Not acceptable');
      expect(doc.status).toBe('rejected');
      expect(doc.rejectionReason).toBe('Not acceptable');
      expect(doc.rejectedAt).toBeDefined();
      expect(doc.approvals[0].status).toBe('rejected');
    });

    test('returnForRevision should set status and add comment', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        status: 'submitted',
        comments: [],
      });
      doc.returnForRevision('user-1', 'Manager', 'Fix the date');
      expect(doc.status).toBe('returned');
      expect(doc.returnReason).toBe('Fix the date');
      expect(doc.comments.length).toBe(1);
      expect(doc.comments[0].type).toBe('request_change');
    });

    test('saveRevision should track changes', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { name: 'Old', age: 30 },
        revisions: [],
        currentRevision: 1,
      });
      doc.saveRevision({ name: 'New', age: 30 }, 'user-1', 'Employee', 'Updated name');
      expect(doc.revisions.length).toBe(1);
      expect(doc.revisions[0].changedFields).toEqual(['name']);
      expect(doc.revisions[0].reason).toBe('Updated name');
      expect(doc.currentRevision).toBe(2);
      expect(doc.data.name).toBe('New');
    });

    test('saveRevision should skip if no changes', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { name: 'Same' },
        revisions: [],
        currentRevision: 1,
      });
      doc.saveRevision({ name: 'Same' }, 'u1', 'X', 'No change');
      expect(doc.revisions.length).toBe(0);
      expect(doc.currentRevision).toBe(1);
    });

    test('isOverdue virtual should detect overdue submissions', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        status: 'submitted',
        dueDate: new Date(Date.now() - 86400000), // Yesterday
      });
      expect(doc.isOverdue).toBe(true);

      doc.dueDate = new Date(Date.now() + 86400000); // Tomorrow
      expect(doc.isOverdue).toBe(false);

      doc.status = 'approved';
      doc.dueDate = new Date(Date.now() - 86400000);
      expect(doc.isOverdue).toBe(false); // Closed statuses aren't overdue
    });

    test('pendingApprovalCount virtual', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        approvals: [
          { role: 'head', status: 'approved' },
          { role: 'admin', status: 'pending' },
          { role: 'director', status: 'pending' },
        ],
      });
      expect(doc.pendingApprovalCount).toBe(2);
    });

    test('statics should be defined', () => {
      expect(typeof FormSubmission.findByUser).toBe('function');
      expect(typeof FormSubmission.findPending).toBe('function');
      expect(typeof FormSubmission.getStats).toBe('function');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. Built-in Templates Data
  // ─────────────────────────────────────────────────────────────────

  describe('3. Built-in Templates Data', () => {
    let BUILT_IN_TEMPLATES;

    beforeAll(() => {
      BUILT_IN_TEMPLATES = require('../data/builtInFormTemplates');
    });

    test('should export an array of 48 templates', () => {
      expect(Array.isArray(BUILT_IN_TEMPLATES)).toBe(true);
      expect(BUILT_IN_TEMPLATES.length).toBe(48);
    });

    test('every template should have required fields', () => {
      for (const tpl of BUILT_IN_TEMPLATES) {
        expect(tpl.templateId).toBeTruthy();
        expect(tpl.name).toBeTruthy();
        expect(tpl.category).toBeTruthy();
        expect(Array.isArray(tpl.fields)).toBe(true);
        expect(tpl.fields.length).toBeGreaterThan(0);
      }
    });

    test('template IDs should be unique', () => {
      const ids = BUILT_IN_TEMPLATES.map(t => t.templateId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('categories should be valid', () => {
      const validCategories = ['beneficiary', 'hr', 'administration', 'finance', 'general'];
      for (const tpl of BUILT_IN_TEMPLATES) {
        expect(validCategories).toContain(tpl.category);
      }
    });

    test('should have beneficiary category templates', () => {
      const beneficiary = BUILT_IN_TEMPLATES.filter(t => t.category === 'beneficiary');
      expect(beneficiary.length).toBeGreaterThan(0);
      expect(beneficiary.some(t => t.templateId === 'beneficiary-identification')).toBe(true);
    });

    test('should have HR category templates', () => {
      const hr = BUILT_IN_TEMPLATES.filter(t => t.category === 'hr');
      expect(hr.length).toBeGreaterThan(0);
      expect(hr.some(t => t.templateId === 'hr-leave-request')).toBe(true);
    });

    test('should have admin category templates', () => {
      const admin = BUILT_IN_TEMPLATES.filter(t => t.category === 'administration');
      expect(admin.length).toBeGreaterThan(0);
    });

    test('should have finance category templates', () => {
      const finance = BUILT_IN_TEMPLATES.filter(t => t.category === 'finance');
      expect(finance.length).toBeGreaterThan(0);
    });

    test('should have general category templates', () => {
      const general = BUILT_IN_TEMPLATES.filter(t => t.category === 'general');
      expect(general.length).toBeGreaterThan(0);
    });

    test('each field should have name, label, and type', () => {
      for (const tpl of BUILT_IN_TEMPLATES) {
        for (const field of tpl.fields) {
          expect(field.name).toBeTruthy();
          expect(field.label).toBeTruthy();
          expect(field.type).toBeTruthy();
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. Service — Categories & Constants
  // ─────────────────────────────────────────────────────────────────

  describe('4. Service — Categories & Constants', () => {
    let service;

    beforeAll(() => {
      service = require('../services/formTemplate.service');
    });

    test('should export CATEGORIES array with 11 entries (including "all")', () => {
      expect(Array.isArray(service.CATEGORIES)).toBe(true);
      expect(service.CATEGORIES.length).toBe(11);
      expect(service.CATEGORIES[0].id).toBe('all');
      expect(service.CATEGORIES.find(c => c.id === 'custom')).toBeDefined();
    });

    test('each category should have id, label, labelEn, icon, color', () => {
      for (const cat of service.CATEGORIES) {
        expect(cat.id).toBeTruthy();
        expect(cat.label).toBeTruthy();
        expect(cat.labelEn).toBeTruthy();
        expect(cat.icon).toBeTruthy();
        expect(cat.color).toBeTruthy();
      }
    });

    test('should export all expected service functions', () => {
      const expectedFns = [
        'listTemplates',
        'getTemplateById',
        'createTemplate',
        'updateTemplate',
        'deleteTemplate',
        'cloneTemplate',
        'updateDesign',
        'setLogo',
        'setSecondaryLogo',
        'updateHeader',
        'updateFooter',
        'getVersionHistory',
        'restoreVersion',
        'submitForm',
        'getUserSubmissions',
        'getPendingSubmissions',
        'getSubmissionById',
        'approveSubmission',
        'rejectSubmission',
        'returnSubmission',
        'resubmitForm',
        'addComment',
        'getCategories',
        'getStats',
        'renderSubmissionHtml',
        'seedBuiltInTemplates',
      ];
      for (const fn of expectedFns) {
        expect(typeof service[fn]).toBe('function');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. Service — HTML Rendering
  // ─────────────────────────────────────────────────────────────────

  describe('5. Service — HTML Rendering', () => {
    let service;

    beforeAll(() => {
      service = require('../services/formTemplate.service');
    });

    test('renderSubmissionHtml should generate valid HTML with design elements', () => {
      const template = {
        name: 'نموذج اختبار',
        nameEn: 'Test Form',
        fields: SAMPLE_FIELDS,
        sections: [],
        design: SAMPLE_DESIGN,
      };
      const submission = {
        submissionNumber: 'SUB-2026-12345',
        data: {
          fullName: 'أحمد',
          email: 'ahmad@test.com',
          department: 'rehab',
          rating: 4,
          agree: true,
        },
        notes: 'ملاحظة اختبار',
      };

      const html = service.renderSubmissionHtml(template, submission);
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('dir="rtl"');
    });

    test('should include logo in rendered HTML', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('https://example.com/logo.png');
      expect(html).toContain('https://example.com/partner.png');
    });

    test('should include header title and subtitle', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('مركز الأوائل للتأهيل');
      expect(html).toContain('نموذج طلب');
    });

    test('should include footer text and signature fields', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('هاتف: 0112345678');
      expect(html).toContain('المدير');
      expect(html).toContain('مقدم الطلب');
      expect(html).toContain('info@alawael.org');
    });

    test('should include watermark when enabled', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('مسودة');
      expect(html).toContain('watermark');
    });

    test('should include stamps', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('معتمد');
      expect(html).toContain('#4CAF50');
    });

    test('should include custom CSS', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('.custom { color: red; }');
    });

    test('should render field values correctly', () => {
      const template = {
        name: 'Test',
        fields: SAMPLE_FIELDS,
        sections: [],
        design: {},
      };
      const html = service.renderSubmissionHtml(template, {
        data: {
          fullName: 'محمد',
          department: 'rehab',
          rating: 3,
          agree: true,
          birthDate: '2000-01-01',
        },
      });
      expect(html).toContain('محمد');
      expect(html).toContain('تأهيل'); // select label lookup
      expect(html).toContain('⭐⭐⭐'); // rating stars
      expect(html).toContain('✅'); // checkbox true
    });

    test('should render with sections when present', () => {
      const fields = SAMPLE_FIELDS.map(f => ({ ...f, section: 'personal' }));
      const template = {
        name: 'Test',
        fields,
        sections: SAMPLE_SECTIONS,
        design: {},
      };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('البيانات الشخصية');
    });

    test('should render reference number and date', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, {
        data: {},
        submissionNumber: 'SUB-2026-99999',
      });
      expect(html).toContain('SUB-2026-99999');
      expect(html).toContain('التاريخ');
    });

    test('should handle missing design gracefully', () => {
      const template = { name: 'Test', fields: SAMPLE_FIELDS };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test');
    });

    test('should render LTR when direction is ltr', () => {
      const template = {
        name: 'Test',
        fields: [],
        design: { page: { direction: 'ltr' }, header: { titleEn: 'English Title' } },
      };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('dir="ltr"');
      expect(html).toContain('English Title');
    });

    test('should handle page numbers in footer', () => {
      const template = {
        name: 'Test',
        fields: [],
        design: { footer: { enabled: true, showPageNumbers: true } },
      };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('صفحة 1 من 1');
    });

    test('should use custom header HTML when provided', () => {
      const template = {
        name: 'Test',
        fields: [],
        design: {
          header: { enabled: true, customHtml: '<div class="custom-header">Custom</div>' },
        },
      };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('<div class="custom-header">Custom</div>');
    });

    test('should use custom footer HTML when provided', () => {
      const template = {
        name: 'Test',
        fields: [],
        design: {
          footer: { enabled: true, customHtml: '<div class="custom-footer">Footer</div>' },
        },
      };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('<div class="custom-footer">Footer</div>');
    });

    test('should apply theme colors in CSS', () => {
      const template = { name: 'Test', fields: [], design: SAMPLE_DESIGN };
      const html = service.renderSubmissionHtml(template, { data: {} });
      expect(html).toContain('#1565C0'); // primary
      expect(html).toContain('Cairo, sans-serif'); // font
    });

    test('should escape HTML in field values', () => {
      const template = {
        name: 'Test',
        fields: [{ name: 'xss', label: 'Test', type: 'text' }],
        design: {},
      };
      const html = service.renderSubmissionHtml(template, {
        data: { xss: '<script>alert("xss")</script>' },
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. Controller — Export Verification
  // ─────────────────────────────────────────────────────────────────

  describe('6. Controller — Export Verification', () => {
    let ctrl;

    beforeAll(() => {
      ctrl = require('../controllers/formTemplate.controller');
    });

    test('should export all expected handler functions', () => {
      const expectedHandlers = [
        'listTemplates',
        'getCategories',
        'getStats',
        'getTemplate',
        'createTemplate',
        'updateTemplate',
        'deleteTemplate',
        'cloneTemplate',
        'updateDesign',
        'setLogo',
        'setSecondaryLogo',
        'updateHeader',
        'updateFooter',
        'getVersionHistory',
        'restoreVersion',
        'submitForm',
        'getMySubmissions',
        'getPendingSubmissions',
        'getSubmission',
        'approveSubmission',
        'rejectSubmission',
        'returnSubmission',
        'resubmitForm',
        'addComment',
        'previewTemplate',
        'renderSubmission',
      ];
      for (const handler of expectedHandlers) {
        expect(typeof ctrl[handler]).toBe('function');
      }
    });

    test('each handler should be an async function', () => {
      for (const [key, fn] of Object.entries(ctrl)) {
        expect(fn.constructor.name).toBe('AsyncFunction');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. Routes — Structure Verification
  // ─────────────────────────────────────────────────────────────────

  describe('7. Routes — Structure Verification', () => {
    let router;

    beforeAll(() => {
      router = require('../routes/formTemplates.routes');
    });

    test('should export an Express router', () => {
      expect(router).toBeDefined();
      // Express routers have a stack
      expect(Array.isArray(router.stack)).toBe(true);
    });

    test('should have route entries', () => {
      expect(router.stack.length).toBeGreaterThan(0);
    });

    test('should include expected HTTP methods and paths', () => {
      const routes = [];
      for (const layer of router.stack) {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
          routes.push({ methods, path: layer.route.path });
        }
      }

      // Check critical routes exist
      const findRoute = (method, path) =>
        routes.some(r => r.methods.includes(method) && r.path === path);
      expect(findRoute('GET', '/')).toBe(true);
      expect(findRoute('GET', '/categories')).toBe(true);
      expect(findRoute('GET', '/stats')).toBe(true);
      expect(findRoute('GET', '/:id')).toBe(true);
      expect(findRoute('POST', '/')).toBe(true);
      expect(findRoute('PUT', '/:id')).toBe(true);
      expect(findRoute('DELETE', '/:id')).toBe(true);
      expect(findRoute('POST', '/:id/submit')).toBe(true);
      expect(findRoute('POST', '/:id/clone')).toBe(true);
      expect(findRoute('PUT', '/:id/design')).toBe(true);
      expect(findRoute('PUT', '/:id/logo')).toBe(true);
      expect(findRoute('PUT', '/:id/header')).toBe(true);
      expect(findRoute('PUT', '/:id/footer')).toBe(true);
      expect(findRoute('GET', '/:id/versions')).toBe(true);
      expect(findRoute('GET', '/:id/preview')).toBe(true);
      expect(findRoute('GET', '/submissions/my')).toBe(true);
      expect(findRoute('GET', '/submissions/pending')).toBe(true);
      expect(findRoute('PUT', '/submissions/:submissionId/approve')).toBe(true);
      expect(findRoute('PUT', '/submissions/:submissionId/reject')).toBe(true);
      expect(findRoute('PUT', '/submissions/:submissionId/return')).toBe(true);
    });

    test('authenticated routes should have auth middleware', () => {
      const protectedRoutes = [
        { method: 'post', path: '/' },
        { method: 'put', path: '/:id' },
        { method: 'delete', path: '/:id' },
        { method: 'post', path: '/:id/submit' },
        { method: 'put', path: '/:id/design' },
      ];

      for (const { method, path } of protectedRoutes) {
        const layer = router.stack.find(
          l => l.route && l.route.path === path && l.route.methods[method]
        );
        if (layer) {
          // Auth middleware shows as additional stack entries on the route
          expect(layer.route.stack.length).toBeGreaterThan(1);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. Design Schema — Comprehensive Validation
  // ─────────────────────────────────────────────────────────────────

  describe('8. Design Schema — Comprehensive Validation', () => {
    let FormTemplate;

    beforeAll(() => {
      FormTemplate = require('../models/FormTemplate');
    });

    test('should accept full design object', () => {
      const doc = new FormTemplate({
        templateId: 'd-1',
        name: 'Design Test',
        category: 'general',
        design: SAMPLE_DESIGN,
      });
      expect(doc.design.logo.url).toBe('https://example.com/logo.png');
      expect(doc.design.logo.width).toBe(120);
      expect(doc.design.logo.position).toBe('center');
      expect(doc.design.header.title).toBe('مركز الأوائل للتأهيل');
      expect(doc.design.header.backgroundColor).toBe('#1565C0');
      expect(doc.design.footer.text).toBe('هاتف: 0112345678');
      expect(doc.design.footer.showSignatureFields).toBe(true);
      expect(doc.design.watermark.enabled).toBe(true);
      expect(doc.design.watermark.text).toBe('مسودة');
      expect(doc.design.page.size).toBe('A4');
      expect(doc.design.page.direction).toBe('rtl');
      expect(doc.design.theme.primaryColor).toBe('#1565C0');
      expect(doc.design.theme.fontFamily).toBe('Cairo, sans-serif');
    });

    test('should use defaults for empty design', () => {
      const doc = new FormTemplate({
        templateId: 'd-2',
        name: 'No Design',
        category: 'general',
      });
      expect(doc.design).toBeDefined();
    });

    test('logo position enum should only accept left/center/right', () => {
      const designSchema = FormTemplate.schema.path('design').schema;
      const posEnum = designSchema.path('logo.position').enumValues;
      expect(posEnum).toEqual(['left', 'center', 'right']);
    });

    test('page size enum should accept A4, A3, letter, legal', () => {
      const designSchema = FormTemplate.schema.path('design').schema;
      const sizeEnum = designSchema.path('page.size').enumValues;
      expect(sizeEnum).toEqual(expect.arrayContaining(['A4', 'A3', 'letter', 'legal']));
    });

    test('page orientation enum should accept portrait/landscape', () => {
      const designSchema = FormTemplate.schema.path('design').schema;
      const orientEnum = designSchema.path('page.orientation').enumValues;
      expect(orientEnum).toEqual(['portrait', 'landscape']);
    });

    test('page direction enum should accept rtl/ltr', () => {
      const designSchema = FormTemplate.schema.path('design').schema;
      const dirEnum = designSchema.path('page.direction').enumValues;
      expect(dirEnum).toEqual(['rtl', 'ltr']);
    });

    test('stamp type enum should include standard types', () => {
      const designSchema = FormTemplate.schema.path('design').schema;
      const stampSchema = designSchema.path('stamps');
      const nestedSchema = stampSchema.schema || (stampSchema.caster && stampSchema.caster.schema);
      expect(nestedSchema).toBeDefined();
      const typeEnum = nestedSchema.path('type').enumValues;
      expect(typeEnum).toEqual(
        expect.arrayContaining([
          'approved',
          'rejected',
          'draft',
          'confidential',
          'urgent',
          'custom',
        ])
      );
    });

    test('secondary logo should have separate settings', () => {
      const doc = new FormTemplate({
        templateId: 'd-3',
        name: 'Dual Logo',
        category: 'general',
        design: {
          logo: { url: 'primary.png', width: 120, position: 'center' },
          secondaryLogo: { url: 'partner.png', width: 80, position: 'left' },
        },
      });
      expect(doc.design.logo.url).toBe('primary.png');
      expect(doc.design.secondaryLogo.url).toBe('partner.png');
      expect(doc.design.logo.width).toBe(120);
      expect(doc.design.secondaryLogo.width).toBe(80);
    });

    test('signature fields in footer should store label, role, position', () => {
      const doc = new FormTemplate({
        templateId: 'd-4',
        name: 'Signatures',
        category: 'general',
        design: {
          footer: {
            showSignatureFields: true,
            signatureFields: [
              { label: 'المدير', role: 'admin', position: 'right' },
              { label: 'المقدم', role: 'employee', position: 'left' },
            ],
          },
        },
      });
      expect(doc.design.footer.signatureFields.length).toBe(2);
      expect(doc.design.footer.signatureFields[0].label).toBe('المدير');
      expect(doc.design.footer.signatureFields[1].position).toBe('left');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. Conditional Logic & Advanced Fields
  // ─────────────────────────────────────────────────────────────────

  describe('9. Conditional Logic & Advanced Fields', () => {
    let FormTemplate;

    beforeAll(() => {
      FormTemplate = require('../models/FormTemplate');
    });

    test('field should accept conditional logic', () => {
      const doc = new FormTemplate({
        templateId: 'cl-1',
        name: 'Conditional',
        category: 'general',
        fields: [
          {
            name: 'otherReason',
            label: 'سبب آخر',
            type: 'textarea',
            conditional: { field: 'reason', operator: 'equals', value: 'other', action: 'show' },
          },
        ],
      });
      const cond = doc.fields[0].conditional;
      expect(cond.field).toBe('reason');
      expect(cond.operator).toBe('equals');
      expect(cond.action).toBe('show');
    });

    test('conditional operators should include all expected values', () => {
      const fieldSchema = FormTemplate.schema.path('fields');
      const innerSchema = fieldSchema.schema || (fieldSchema.caster && fieldSchema.caster.schema);
      const condSchema = innerSchema.path('conditional');
      const condInner = condSchema.schema;
      const opEnum = condInner.path('operator').enumValues;
      expect(opEnum).toEqual(
        expect.arrayContaining([
          'equals',
          'not_equals',
          'contains',
          'greater_than',
          'less_than',
          'in',
          'not_in',
          'is_empty',
          'is_not_empty',
        ])
      );
    });

    test('table field should have columns definition', () => {
      const doc = new FormTemplate({
        templateId: 'tbl-1',
        name: 'Table',
        category: 'general',
        fields: [
          {
            name: 'items',
            label: 'العناصر',
            type: 'table',
            columns: [
              { name: 'item', label: 'العنصر', type: 'text' },
              { name: 'qty', label: 'الكمية', type: 'number' },
              { name: 'price', label: 'السعر', type: 'number' },
            ],
          },
        ],
      });
      expect(doc.fields[0].columns.length).toBe(3);
      expect(doc.fields[0].columns[0].name).toBe('item');
    });

    test('calculated field should store formula', () => {
      const doc = new FormTemplate({
        templateId: 'calc-1',
        name: 'Calc',
        category: 'finance',
        fields: [
          {
            name: 'total',
            label: 'الإجمالي',
            type: 'calculated',
            formula: '{qty} * {price}',
          },
        ],
      });
      expect(doc.fields[0].formula).toBe('{qty} * {price}');
    });

    test('slider field should store min/max/step', () => {
      const doc = new FormTemplate({
        templateId: 'slider-1',
        name: 'Slider',
        category: 'general',
        fields: [
          {
            name: 'satisfaction',
            label: 'الرضا',
            type: 'slider',
            sliderMin: 0,
            sliderMax: 100,
            sliderStep: 5,
          },
        ],
      });
      expect(doc.fields[0].sliderMin).toBe(0);
      expect(doc.fields[0].sliderMax).toBe(100);
      expect(doc.fields[0].sliderStep).toBe(5);
    });

    test('rating field should store maxRating', () => {
      const doc = new FormTemplate({
        templateId: 'rate-1',
        name: 'Rating',
        category: 'general',
        fields: [{ name: 'stars', label: 'التقييم', type: 'rating', maxRating: 10 }],
      });
      expect(doc.fields[0].maxRating).toBe(10);
    });

    test('file field should store accepted types and max size', () => {
      const doc = new FormTemplate({
        templateId: 'file-1',
        name: 'File',
        category: 'general',
        fields: [
          {
            name: 'doc',
            label: 'مستند',
            type: 'file',
            acceptedFileTypes: ['.pdf', '.docx'],
            maxFileSize: 5242880,
          },
        ],
      });
      expect(doc.fields[0].acceptedFileTypes).toEqual(['.pdf', '.docx']);
      expect(doc.fields[0].maxFileSize).toBe(5242880);
    });

    test('field style should store visual properties', () => {
      const doc = new FormTemplate({
        templateId: 'style-1',
        name: 'Styled',
        category: 'general',
        fields: [
          {
            name: 'title',
            label: 'عنوان',
            type: 'header',
            style: { fontSize: '24px', fontWeight: 'bold', color: '#1976d2', textAlign: 'center' },
          },
        ],
      });
      expect(doc.fields[0].style.fontSize).toBe('24px');
      expect(doc.fields[0].style.color).toBe('#1976d2');
    });

    test('section should support multi-column layout', () => {
      const doc = new FormTemplate({
        templateId: 'sec-1',
        name: 'Sections',
        category: 'general',
        sections: [{ id: 's1', title: 'قسم', columns: 3, collapsible: true, collapsed: false }],
      });
      expect(doc.sections[0].columns).toBe(3);
      expect(doc.sections[0].collapsible).toBe(true);
    });

    test('section should support conditional logic', () => {
      const doc = new FormTemplate({
        templateId: 'sec-2',
        name: 'Conditional Section',
        category: 'general',
        sections: [
          {
            id: 's1',
            title: 'Extra',
            conditional: { field: 'type', operator: 'equals', value: 'advanced', action: 'show' },
          },
        ],
      });
      expect(doc.sections[0].conditional.field).toBe('type');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 10. Versioning & Permissions
  // ─────────────────────────────────────────────────────────────────

  describe('10. Versioning & Permissions', () => {
    let FormTemplate;

    beforeAll(() => {
      FormTemplate = require('../models/FormTemplate');
    });

    test('multiple versions should be tracked', () => {
      const doc = new FormTemplate({
        templateId: 'ver-1',
        name: 'Versioned',
        category: 'general',
        fields: [{ name: 'f1', label: 'V1', type: 'text' }],
      });

      // V1 snapshot
      doc.saveVersion('u1', 'Admin', 'Version 1');
      doc.fields = [{ name: 'f2', label: 'V2', type: 'number' }];

      // V2 snapshot
      doc.saveVersion('u1', 'Admin', 'Version 2');
      doc.fields = [{ name: 'f3', label: 'V3', type: 'email' }];

      expect(doc.version).toBe(3);
      expect(doc.versions.length).toBe(2);
      expect(doc.versions[0].version).toBe(1);
      expect(doc.versions[1].version).toBe(2);
    });

    test('version restore should bring back old fields', () => {
      const doc = new FormTemplate({
        templateId: 'ver-2',
        name: 'Restore',
        category: 'general',
        fields: [{ name: 'original', label: 'Original', type: 'text' }],
        design: { header: { title: 'Original Title' } },
      });

      doc.saveVersion('u1', 'Admin', 'Before change');
      doc.fields = [{ name: 'changed', label: 'Changed', type: 'number' }];
      doc.design = { header: { title: 'Changed Title' } };

      doc.restoreVersion(1);
      expect(doc.fields[0].name).toBe('original');
    });

    test('permissions should store role arrays', () => {
      const doc = new FormTemplate({
        templateId: 'perm-1',
        name: 'Perms',
        category: 'general',
        permissions: {
          canView: ['admin', 'employee', 'department_head'],
          canSubmit: ['employee'],
          canEdit: ['admin'],
          canDelete: ['admin'],
        },
      });
      expect(doc.permissions.canView).toEqual(['admin', 'employee', 'department_head']);
      expect(doc.permissions.canSubmit).toEqual(['employee']);
    });

    test('approval steps should have role/label/order', () => {
      const doc = new FormTemplate({
        templateId: 'appr-1',
        name: 'Approval',
        category: 'general',
        approvalSteps: SAMPLE_APPROVAL_STEPS,
      });
      expect(doc.approvalSteps.length).toBe(2);
      expect(doc.approvalSteps[0].role).toBe('department_head');
      expect(doc.approvalSteps[1].order).toBe(2);
    });

    test('approval step should support autoApproveAfterDays', () => {
      const doc = new FormTemplate({
        templateId: 'auto-1',
        name: 'Auto',
        category: 'general',
        approvalSteps: [{ role: 'head', autoApproveAfterDays: 3 }],
      });
      expect(doc.approvalSteps[0].autoApproveAfterDays).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 11. Edge Cases & Error Handling
  // ─────────────────────────────────────────────────────────────────

  describe('11. Edge Cases & Error Handling', () => {
    let FormTemplate, FormSubmission;

    beforeAll(() => {
      FormTemplate = require('../models/FormTemplate');
      FormSubmission = require('../models/FormSubmission');
    });

    test('empty fields array should be valid', () => {
      const doc = new FormTemplate({
        templateId: 'edge-1',
        name: 'Empty Fields',
        category: 'general',
        fields: [],
      });
      expect(doc.fields.length).toBe(0);
      expect(doc.fieldCount).toBe(0);
    });

    test('validateSubmission with empty data and no required fields', () => {
      const doc = new FormTemplate({
        templateId: 'edge-2',
        name: 'Optional',
        category: 'general',
        fields: [{ name: 'notes', label: 'Notes', type: 'text', required: false }],
      });
      expect(doc.validateSubmission({}).length).toBe(0);
    });

    test('submission with no approvals should work', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        approvals: [],
      });
      expect(doc.approvals.length).toBe(0);
    });

    test('reject with no pending approval should still set rejected', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { a: 1 },
        status: 'submitted',
        approvals: [],
      });
      doc.reject('u1', 'Admin', 'No good');
      expect(doc.status).toBe('rejected');
    });

    test('multiple revisions should track correctly', () => {
      const doc = new FormSubmission({
        templateId: 't-1',
        data: { x: 1 },
        revisions: [],
        currentRevision: 1,
      });
      doc.saveRevision({ x: 2 }, 'u1', 'User', 'Change 1');
      doc.saveRevision({ x: 3 }, 'u1', 'User', 'Change 2');
      expect(doc.revisions.length).toBe(2);
      expect(doc.currentRevision).toBe(3);
      expect(doc.data.x).toBe(3);
    });
  });
});
