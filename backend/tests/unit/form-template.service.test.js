/**
 * Unit tests — formTemplate.service.js
 * @module tests/unit/form-template.service.test
 */

/* ================================================================
   MOCK INFRASTRUCTURE
   ================================================================ */

const mockFindChain = (resolvedValue = []) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
  };
  return chain;
};

let mockTemplateFindChain = mockFindChain();
let mockSubmissionFindChain = mockFindChain();

const mockFormTemplate = {
  find: jest.fn(() => mockTemplateFindChain),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  updateOne: jest.fn().mockReturnValue({ catch: jest.fn() }),
  aggregate: jest.fn().mockResolvedValue([]),
};

const mockFormSubmission = {
  find: jest.fn(() => mockSubmissionFindChain),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
};

const mockMongoose = {
  isValidObjectId: jest.fn(() => false),
};

jest.mock('mongoose', () => mockMongoose);
jest.mock('../../models/FormTemplate', () => mockFormTemplate);
jest.mock('../../models/FormSubmission', () => mockFormSubmission);
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

const service = require('../../services/formTemplate.service');
const logger = require('../../utils/logger');

// Shorthand aliases for readability
const FormTemplate = mockFormTemplate;
const FormSubmission = mockFormSubmission;

/* ================================================================
   HELPERS
   ================================================================ */

const makeMockTemplate = (overrides = {}) => ({
  _id: 'tpl-id-1',
  templateId: 'custom-test-1',
  name: 'Test Form',
  nameEn: 'Test Form EN',
  fields: [{ name: 'fullName', label: 'الاسم', type: 'text', section: 'sec1', order: 1 }],
  sections: [{ id: 'sec1', title: 'القسم الأول', order: 1 }],
  design: { toObject: jest.fn().mockReturnValue({ theme: { primaryColor: '#1976d2' } }) },
  version: 1,
  versions: [
    {
      version: 1,
      notes: 'v1',
      changedByName: 'admin',
      createdAt: new Date(),
      fields: [{ name: 'a' }],
    },
  ],
  isActive: true,
  requiresApproval: true,
  approvalSteps: [{ role: 'manager', label: 'مدير' }],
  save: jest.fn().mockResolvedValue(true),
  saveVersion: jest.fn(),
  cloneTemplate: jest.fn().mockReturnValue({ templateId: 'clone-test', name: 'Clone' }),
  restoreVersion: jest.fn(),
  validateSubmission: jest.fn().mockReturnValue([]),
  markModified: jest.fn(),
  ...overrides,
});

const makeMockSubmission = (overrides = {}) => ({
  _id: 'sub-id-1',
  templateId: 'custom-test-1',
  templateName: 'Test Form',
  status: 'submitted',
  data: { fullName: 'أحمد' },
  submissionNumber: 'SUB-001',
  submittedBy: { userId: 'u1', name: 'أحمد' },
  approvals: [{ step: 0, role: 'manager', status: 'pending' }],
  currentApprovalStep: 0,
  comments: [],
  save: jest.fn().mockResolvedValue(true),
  approveCurrentStep: jest.fn(),
  reject: jest.fn(),
  returnForRevision: jest.fn(),
  saveRevision: jest.fn(),
  ...overrides,
});

/* ================================================================
   SETUP / TEARDOWN
   ================================================================ */

beforeEach(() => {
  jest.clearAllMocks();
  mockMongoose.isValidObjectId.mockReturnValue(false);
  mockTemplateFindChain = mockFindChain();
  mockSubmissionFindChain = mockFindChain();
  FormTemplate.find.mockReturnValue(mockTemplateFindChain);
  FormSubmission.find.mockReturnValue(mockSubmissionFindChain);
  FormTemplate.countDocuments.mockResolvedValue(0);
  FormSubmission.countDocuments.mockResolvedValue(0);
  FormTemplate.aggregate.mockResolvedValue([]);
  FormSubmission.aggregate.mockResolvedValue([]);
  FormTemplate.updateOne.mockReturnValue({ catch: jest.fn() });
});

/* ================================================================
   1. MODULE EXPORTS
   ================================================================ */

describe('Module exports', () => {
  const expectedExports = [
    'CATEGORIES',
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

  it.each(expectedExports)('exports "%s"', key => {
    expect(service[key]).toBeDefined();
  });

  it('exports exactly 27 members', () => {
    expect(Object.keys(service)).toHaveLength(27);
  });
});

/* ================================================================
   2. CATEGORIES
   ================================================================ */

describe('CATEGORIES constant', () => {
  it('has 11 items', () => {
    expect(service.CATEGORIES).toHaveLength(11);
  });

  it('each item has id, label, labelEn, icon, color', () => {
    service.CATEGORIES.forEach(cat => {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('labelEn');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('color');
    });
  });

  it('first category is "all"', () => {
    expect(service.CATEGORIES[0].id).toBe('all');
  });

  it('contains key categories', () => {
    const ids = service.CATEGORIES.map(c => c.id);
    expect(ids).toContain('beneficiary');
    expect(ids).toContain('hr');
    expect(ids).toContain('finance');
    expect(ids).toContain('custom');
  });
});

/* ================================================================
   3. TEMPLATE CRUD
   ================================================================ */

describe('Template CRUD', () => {
  // ── listTemplates ──────────────────────────────────────────
  describe('listTemplates', () => {
    it('returns templates and pagination with defaults', async () => {
      const tpls = [{ _id: '1', name: 'T1' }];
      mockTemplateFindChain = mockFindChain(tpls);
      FormTemplate.find.mockReturnValue(mockTemplateFindChain);
      FormTemplate.countDocuments.mockResolvedValue(1);

      const result = await service.listTemplates();

      expect(FormTemplate.find).toHaveBeenCalled();
      expect(result.templates).toEqual(tpls);
      expect(result.pagination).toMatchObject({ page: 1, limit: 50, total: 1, pages: 1 });
    });

    it('applies category filter', async () => {
      await service.listTemplates({ category: 'hr' });
      const filterArg = FormTemplate.find.mock.calls[0][0];
      expect(filterArg.category).toBe('hr');
    });

    it('ignores category "all"', async () => {
      await service.listTemplates({ category: 'all' });
      const filterArg = FormTemplate.find.mock.calls[0][0];
      expect(filterArg.category).toBeUndefined();
    });

    it('applies isBuiltIn filter (boolean)', async () => {
      await service.listTemplates({ isBuiltIn: true });
      const filterArg = FormTemplate.find.mock.calls[0][0];
      expect(filterArg.isBuiltIn).toBe(true);
    });

    it('applies isPublished filter', async () => {
      await service.listTemplates({ isPublished: false });
      const filterArg = FormTemplate.find.mock.calls[0][0];
      expect(filterArg.isPublished).toBe(false);
    });

    it('applies tags filter (array)', async () => {
      await service.listTemplates({ tags: ['hr', 'finance'] });
      const filterArg = FormTemplate.find.mock.calls[0][0];
      expect(filterArg.tags).toEqual({ $in: ['hr', 'finance'] });
    });

    it('applies tags filter (string)', async () => {
      await service.listTemplates({ tags: 'hr' });
      const filterArg = FormTemplate.find.mock.calls[0][0];
      expect(filterArg.tags).toEqual({ $in: ['hr'] });
    });

    it('applies search filter with $or', async () => {
      await service.listTemplates({ search: 'test' });
      const filterArg = FormTemplate.find.mock.calls[0][0];
      expect(filterArg.$or).toHaveLength(4);
    });

    it('sorts by name when sort="name"', async () => {
      await service.listTemplates({ sort: 'name' });
      expect(mockTemplateFindChain.sort).toHaveBeenCalledWith({ name: 1 });
    });

    it('sorts by newest when sort="newest"', async () => {
      await service.listTemplates({ sort: 'newest' });
      expect(mockTemplateFindChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('uses default sort (category+name)', async () => {
      await service.listTemplates({});
      expect(mockTemplateFindChain.sort).toHaveBeenCalledWith({ category: 1, name: 1 });
    });

    it('applies pagination (page/limit)', async () => {
      await service.listTemplates({ page: 3, limit: 10 });
      expect(mockTemplateFindChain.skip).toHaveBeenCalledWith(20);
      expect(mockTemplateFindChain.limit).toHaveBeenCalledWith(10);
    });

    it('computes pagination.pages correctly', async () => {
      FormTemplate.countDocuments.mockResolvedValue(25);
      const result = await service.listTemplates({ limit: 10 });
      expect(result.pagination.pages).toBe(3);
    });
  });

  // ── getTemplateById ────────────────────────────────────────
  describe('getTemplateById', () => {
    it('returns template when found by templateId', async () => {
      const tpl = makeMockTemplate();
      const findOneChain = { lean: jest.fn().mockResolvedValue(tpl) };
      FormTemplate.findOne.mockReturnValue(findOneChain);

      const result = await service.getTemplateById('custom-test-1');

      expect(FormTemplate.findOne).toHaveBeenCalled();
      expect(result).toBe(tpl);
    });

    it('returns null when not found', async () => {
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      const result = await service.getTemplateById('nonexistent');
      expect(result).toBeNull();
    });

    it('adds _id condition when isValidObjectId', async () => {
      mockMongoose.isValidObjectId.mockReturnValue(true);
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      await service.getTemplateById('507f1f77bcf86cd799439011');
      const condition = FormTemplate.findOne.mock.calls[0][0];
      expect(condition.$or).toHaveLength(2);
    });

    it('increments usageCount in background when found', async () => {
      const tpl = { _id: 'abc', templateId: 'test-1' };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });

      await service.getTemplateById('test-1');

      expect(FormTemplate.updateOne).toHaveBeenCalledWith(
        { _id: 'abc' },
        expect.objectContaining({ $inc: { usageCount: 1 } })
      );
    });

    it('does not increment usageCount when _id is falsy', async () => {
      const tpl = { _id: null, templateId: 'test-1' };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      await service.getTemplateById('test-1');
      expect(FormTemplate.updateOne).not.toHaveBeenCalled();
    });
  });

  // ── createTemplate ─────────────────────────────────────────
  describe('createTemplate', () => {
    it('creates template with valid data', async () => {
      const created = makeMockTemplate();
      FormTemplate.create.mockResolvedValue(created);

      const result = await service.createTemplate(
        { name: 'New', category: 'general' },
        { id: 'u1', name: 'User' }
      );

      expect(FormTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New',
          category: 'general',
          isBuiltIn: false,
          isPublished: false,
        })
      );
      expect(result).toBe(created);
    });

    it('generates a custom templateId', async () => {
      FormTemplate.create.mockResolvedValue({});
      await service.createTemplate({ name: 'X', category: 'hr' }, {});
      const arg = FormTemplate.create.mock.calls[0][0];
      expect(arg.templateId).toMatch(/^custom-/);
    });

    it('throws 400 when name is missing', async () => {
      await expect(service.createTemplate({ category: 'hr' })).rejects.toMatchObject({
        status: 400,
      });
    });

    it('throws 400 when category is missing', async () => {
      await expect(service.createTemplate({ name: 'X' })).rejects.toMatchObject({
        status: 400,
      });
    });

    it('applies defaults for optional fields', async () => {
      FormTemplate.create.mockResolvedValue({});
      await service.createTemplate({ name: 'X', category: 'hr' }, {});
      const arg = FormTemplate.create.mock.calls[0][0];
      expect(arg.icon).toBe('📄');
      expect(arg.color).toBe('#1976d2');
      expect(arg.fields).toEqual([]);
      expect(arg.outputFormat).toBe('pdf');
      expect(arg.allowDraft).toBe(true);
      expect(arg.requiresApproval).toBe(true);
    });

    it('passes user metadata', async () => {
      FormTemplate.create.mockResolvedValue({});
      await service.createTemplate(
        { name: 'X', category: 'hr' },
        { id: 'u5', name: 'Ali', tenantId: 't1' }
      );
      const arg = FormTemplate.create.mock.calls[0][0];
      expect(arg.createdBy).toBe('u5');
      expect(arg.createdByName).toBe('Ali');
      expect(arg.tenantId).toBe('t1');
    });
  });

  // ── updateTemplate ─────────────────────────────────────────
  describe('updateTemplate', () => {
    it('updates an existing template', async () => {
      const tpl = makeMockTemplate();
      FormTemplate.findOne.mockResolvedValue(tpl);

      const result = await service.updateTemplate(
        'custom-test-1',
        { name: 'Updated' },
        { id: 'u1' }
      );

      expect(tpl.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated');
    });

    it('throws 404 when template not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.updateTemplate('no-exist', { name: 'X' }, {})).rejects.toMatchObject({
        status: 404,
      });
    });

    it('auto-saves version when fields change', async () => {
      const tpl = makeMockTemplate({ fields: [{ name: 'old' }] });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateTemplate(
        'custom-test-1',
        { fields: [{ name: 'new' }] },
        { id: 'u1', name: 'Ali' }
      );

      expect(tpl.saveVersion).toHaveBeenCalledWith('u1', 'Ali', expect.any(String));
    });

    it('auto-saves version when design changes', async () => {
      const tpl = makeMockTemplate({ design: { theme: {} } });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateTemplate(
        'custom-test-1',
        { design: { theme: { color: 'red' } } },
        { id: 'u1' }
      );

      expect(tpl.saveVersion).toHaveBeenCalled();
    });

    it('auto-saves version when sections change', async () => {
      const tpl = makeMockTemplate({ sections: [] });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateTemplate('custom-test-1', { sections: [{ id: 's1' }] }, { id: 'u1' });

      expect(tpl.saveVersion).toHaveBeenCalled();
    });

    it('does NOT save version when only name changes', async () => {
      const tpl = makeMockTemplate();
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateTemplate('custom-test-1', { name: 'Renamed' }, { id: 'u1' });

      expect(tpl.saveVersion).not.toHaveBeenCalled();
    });

    it('only allows whitelisted fields', async () => {
      const tpl = makeMockTemplate();
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateTemplate('custom-test-1', { name: 'OK', _secret: 'hack' }, {});

      expect(tpl.name).toBe('OK');
      expect(tpl._secret).toBeUndefined();
    });

    it('sets updatedBy', async () => {
      const tpl = makeMockTemplate();
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateTemplate('custom-test-1', {}, { id: 'u9' });

      expect(tpl.updatedBy).toBe('u9');
    });

    it('uses custom _versionNotes', async () => {
      const tpl = makeMockTemplate({ fields: [{ name: 'old' }] });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateTemplate(
        'custom-test-1',
        { fields: [], _versionNotes: 'My note' },
        { id: 'u1', name: 'Ali' }
      );

      expect(tpl.saveVersion).toHaveBeenCalledWith('u1', 'Ali', 'My note');
    });
  });

  // ── deleteTemplate ─────────────────────────────────────────
  describe('deleteTemplate', () => {
    it('soft-deletes and returns template', async () => {
      const tpl = makeMockTemplate();
      FormTemplate.findOneAndUpdate.mockResolvedValue(tpl);

      const result = await service.deleteTemplate('custom-test-1');

      expect(FormTemplate.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
        { $set: { isActive: false } },
        { new: true }
      );
      expect(result).toBe(tpl);
    });

    it('throws 404 when not found', async () => {
      FormTemplate.findOneAndUpdate.mockResolvedValue(null);
      await expect(service.deleteTemplate('nope')).rejects.toMatchObject({ status: 404 });
    });

    it('includes _id condition when isValidObjectId', async () => {
      mockMongoose.isValidObjectId.mockReturnValue(true);
      FormTemplate.findOneAndUpdate.mockResolvedValue({});
      await service.deleteTemplate('507f1f77bcf86cd799439011');
      const condition = FormTemplate.findOneAndUpdate.mock.calls[0][0];
      expect(condition.$or).toHaveLength(2);
    });
  });

  // ── cloneTemplate ──────────────────────────────────────────
  describe('cloneTemplate', () => {
    it('clones a template', async () => {
      const original = makeMockTemplate();
      FormTemplate.findOne.mockResolvedValue(original);
      const clonedDoc = { templateId: 'clone-test', name: 'Clone' };
      FormTemplate.create.mockResolvedValue(clonedDoc);

      const result = await service.cloneTemplate('custom-test-1', 'Clone Name', {
        id: 'u1',
        name: 'Ali',
        tenantId: 't1',
      });

      expect(original.cloneTemplate).toHaveBeenCalledWith('Clone Name', 'u1');
      expect(FormTemplate.create).toHaveBeenCalled();
      expect(result).toBe(clonedDoc);
    });

    it('throws 404 when original not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.cloneTemplate('nope', 'X', {})).rejects.toMatchObject({ status: 404 });
    });

    it('sets createdByName and tenantId on clone', async () => {
      const original = makeMockTemplate();
      original.cloneTemplate.mockReturnValue({ templateId: 'cc', name: 'C' });
      FormTemplate.findOne.mockResolvedValue(original);
      FormTemplate.create.mockResolvedValue({});

      await service.cloneTemplate('id', 'N', { id: 'u2', name: 'Sara', tenantId: 't2' });

      const createArg = FormTemplate.create.mock.calls[0][0];
      expect(createArg.createdByName).toBe('Sara');
      expect(createArg.tenantId).toBe('t2');
    });
  });
});

/* ================================================================
   4. DESIGN MANAGEMENT
   ================================================================ */

describe('Design management', () => {
  // ── updateDesign ───────────────────────────────────────────
  describe('updateDesign', () => {
    it('deep-merges design data and saves', async () => {
      const tpl = makeMockTemplate();
      FormTemplate.findOne.mockResolvedValue(tpl);

      const result = await service.updateDesign(
        'custom-test-1',
        { theme: { color: 'red' } },
        { id: 'u1', name: 'Ali' }
      );

      expect(tpl.saveVersion).toHaveBeenCalledWith('u1', 'Ali', 'تحديث التصميم');
      expect(tpl.save).toHaveBeenCalled();
      expect(result).toBe(tpl);
    });

    it('handles null initial design', async () => {
      const tpl = makeMockTemplate({ design: null });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateDesign('id', { a: 1 }, {});

      expect(tpl.design).toEqual({ a: 1 });
    });

    it('throws 404 when not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.updateDesign('x', {}, {})).rejects.toMatchObject({ status: 404 });
    });

    it('performs deep merge (nested objects)', async () => {
      const tpl = makeMockTemplate({
        design: { toObject: jest.fn().mockReturnValue({ theme: { fontSize: 14 } }) },
      });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateDesign('id', { theme: { color: 'blue' } }, {});

      expect(tpl.design).toMatchObject({ theme: { fontSize: 14, color: 'blue' } });
    });
  });

  // ── setLogo ────────────────────────────────────────────────
  describe('setLogo', () => {
    it('merges logo data into design.logo', async () => {
      const tpl = makeMockTemplate({ design: { logo: { url: 'old.png' } } });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.setLogo('id', { url: 'new.png', width: 100 }, { id: 'u1' });

      expect(tpl.design.logo).toMatchObject({ url: 'new.png', width: 100 });
      expect(tpl.markModified).toHaveBeenCalledWith('design');
      expect(tpl.save).toHaveBeenCalled();
    });

    it('initializes design when null', async () => {
      const tpl = makeMockTemplate({ design: null });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.setLogo('id', { url: 'logo.png' }, {});

      expect(tpl.design.logo).toMatchObject({ url: 'logo.png' });
    });

    it('throws 404 when not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.setLogo('x', {}, {})).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── setSecondaryLogo ───────────────────────────────────────
  describe('setSecondaryLogo', () => {
    it('merges secondaryLogo data', async () => {
      const tpl = makeMockTemplate({ design: {} });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.setSecondaryLogo('id', { url: 'sec.png' }, { id: 'u1' });

      expect(tpl.design.secondaryLogo).toMatchObject({ url: 'sec.png' });
      expect(tpl.markModified).toHaveBeenCalledWith('design');
    });

    it('throws 404 when not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.setSecondaryLogo('x', {}, {})).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── updateHeader / updateFooter ────────────────────────────
  describe('updateHeader', () => {
    it('delegates to updateDesignSection for header', async () => {
      const tpl = makeMockTemplate({ design: {} });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateHeader('id', { title: 'New Header' }, { id: 'u1' });

      expect(tpl.design.header).toMatchObject({ title: 'New Header' });
      expect(tpl.save).toHaveBeenCalled();
    });

    it('throws 404 when not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.updateHeader('x', {}, {})).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('updateFooter', () => {
    it('delegates to updateDesignSection for footer', async () => {
      const tpl = makeMockTemplate({ design: {} });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateFooter('id', { text: 'Footer text' }, { id: 'u1' });

      expect(tpl.design.footer).toMatchObject({ text: 'Footer text' });
      expect(tpl.save).toHaveBeenCalled();
    });

    it('merges with existing section data', async () => {
      const tpl = makeMockTemplate({ design: { footer: { old: 'data' } } });
      FormTemplate.findOne.mockResolvedValue(tpl);

      await service.updateFooter('id', { text: 'new' }, {});

      expect(tpl.design.footer).toMatchObject({ old: 'data', text: 'new' });
    });

    it('throws 404 when not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.updateFooter('x', {}, {})).rejects.toMatchObject({ status: 404 });
    });
  });
});

/* ================================================================
   5. VERSIONING
   ================================================================ */

describe('Versioning', () => {
  describe('getVersionHistory', () => {
    it('returns current version and mapped versions array', async () => {
      const tpl = {
        templateId: 'custom-test-1',
        name: 'Test',
        version: 3,
        versions: [
          {
            version: 1,
            notes: 'v1',
            changedByName: 'Ali',
            createdAt: new Date(),
            fields: [{ a: 1 }],
          },
          { version: 2, notes: 'v2', changedByName: 'Sara', createdAt: new Date(), fields: [] },
        ],
      };
      const chain = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(tpl) };
      FormTemplate.findOne.mockReturnValue(chain);

      const result = await service.getVersionHistory('custom-test-1');

      expect(result.currentVersion).toBe(3);
      expect(result.versions).toHaveLength(2);
      expect(result.versions[0]).toMatchObject({
        version: 1,
        notes: 'v1',
        changedBy: 'Ali',
        fieldCount: 1,
      });
    });

    it('throws 404 when not found', async () => {
      const chain = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) };
      FormTemplate.findOne.mockReturnValue(chain);

      await expect(service.getVersionHistory('nope')).rejects.toMatchObject({ status: 404 });
    });

    it('handles empty versions array', async () => {
      const tpl = { version: 1, versions: undefined };
      const chain = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(tpl) };
      FormTemplate.findOne.mockReturnValue(chain);

      const result = await service.getVersionHistory('id');
      expect(result.versions).toEqual([]);
    });
  });

  describe('restoreVersion', () => {
    it('saves current version, restores old, and saves', async () => {
      const tpl = makeMockTemplate();
      FormTemplate.findOne.mockResolvedValue(tpl);

      const result = await service.restoreVersion('custom-test-1', 2, { id: 'u1', name: 'Ali' });

      expect(tpl.saveVersion).toHaveBeenCalledWith('u1', 'Ali', expect.stringContaining('2'));
      expect(tpl.restoreVersion).toHaveBeenCalledWith(2);
      expect(tpl.updatedBy).toBe('u1');
      expect(tpl.save).toHaveBeenCalled();
      expect(result).toBe(tpl);
    });

    it('throws 404 when not found', async () => {
      FormTemplate.findOne.mockResolvedValue(null);
      await expect(service.restoreVersion('x', 1, {})).rejects.toMatchObject({ status: 404 });
    });
  });
});

/* ================================================================
   6. SUBMISSIONS
   ================================================================ */

describe('Submissions', () => {
  // ── submitForm ─────────────────────────────────────────────
  describe('submitForm', () => {
    it('submits with string templateId', async () => {
      const tpl = {
        _id: 'tid',
        templateId: 'custom-test-1',
        name: 'T',
        version: 1,
        requiresApproval: true,
        approvalSteps: [{ role: 'mgr', label: 'Mgr' }],
      };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      const sub = makeMockSubmission();
      FormSubmission.create.mockResolvedValue(sub);

      const result = await service.submitForm(
        'custom-test-1',
        { fullName: 'X' },
        { id: 'u1', name: 'Ali' },
        { skipValidation: true }
      );

      expect(result).toBe(sub);
      expect(FormSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: 'custom-test-1', status: 'submitted' })
      );
    });

    it('submits with template object directly', async () => {
      const tpl = {
        _id: 'tid',
        templateId: 'inline',
        name: 'Inline',
        version: 1,
        requiresApproval: false,
        approvalSteps: [],
      };
      FormSubmission.create.mockResolvedValue(makeMockSubmission());

      const result = await service.submitForm(tpl, {}, {}, { skipValidation: true });

      expect(FormTemplate.findOne).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('sets status="draft" when isDraft option', async () => {
      const tpl = { templateId: 't1', name: 'T', requiresApproval: true, approvalSteps: [] };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      FormSubmission.create.mockResolvedValue({});

      await service.submitForm('t1', {}, {}, { isDraft: true, skipValidation: true });

      expect(FormSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft' })
      );
    });

    it('sets status="approved" when !requiresApproval and !isDraft', async () => {
      const tpl = { templateId: 't1', name: 'T', requiresApproval: false, approvalSteps: [] };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      FormSubmission.create.mockResolvedValue({});

      await service.submitForm('t1', {}, {}, { skipValidation: true });

      expect(FormSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' })
      );
    });

    it('builds approval chain from approvalSteps', async () => {
      const tpl = {
        templateId: 't1',
        name: 'T',
        requiresApproval: true,
        approvalSteps: [
          { role: 'mgr', label: 'M' },
          { role: 'dir', label: 'D' },
        ],
      };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      FormSubmission.create.mockResolvedValue({});

      await service.submitForm('t1', {}, {}, { skipValidation: true });

      const arg = FormSubmission.create.mock.calls[0][0];
      expect(arg.approvals).toHaveLength(2);
      expect(arg.approvals[0]).toMatchObject({ step: 0, role: 'mgr', status: 'pending' });
      expect(arg.approvals[1]).toMatchObject({ step: 1, role: 'dir', status: 'pending' });
    });

    it('throws 404 when template not found', async () => {
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(service.submitForm('missing', {}, {})).rejects.toMatchObject({ status: 404 });
    });

    it('validates submission data and throws 400 on errors', async () => {
      const tpl = {
        templateId: 'val-test',
        name: 'V',
        requiresApproval: false,
        approvalSteps: [],
        validateSubmission: jest.fn().mockReturnValue([{ field: 'name', message: 'required' }]),
      };
      // lean() resolves to tpl which already has validateSubmission → no second findOne needed
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });

      await expect(service.submitForm('val-test', {}, {}, {})).rejects.toMatchObject({
        status: 400,
        validationErrors: expect.any(Array),
      });
    });

    it('skips validation when skipValidation option', async () => {
      const tpl = { templateId: 't1', name: 'T', requiresApproval: false, approvalSteps: [] };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      const mockSub = { _id: 'sub-ok' };
      FormSubmission.create.mockResolvedValue(mockSub);

      const result = await service.submitForm('t1', {}, {}, { skipValidation: true });
      expect(result).toBe(mockSub);
    });

    it('increments usageCount on the template', async () => {
      const tpl = {
        _id: 'tid',
        templateId: 't1',
        name: 'T',
        requiresApproval: false,
        approvalSteps: [],
      };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      FormSubmission.create.mockResolvedValue({});

      await service.submitForm('t1', {}, {}, { skipValidation: true });

      expect(FormTemplate.updateOne).toHaveBeenCalledWith(
        { _id: 'tid' },
        expect.objectContaining({ $inc: { usageCount: 1 } })
      );
    });

    it('maps submittedBy from user and options', async () => {
      const tpl = { templateId: 't1', name: 'T', requiresApproval: false, approvalSteps: [] };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      FormSubmission.create.mockResolvedValue({});

      await service.submitForm(
        't1',
        {},
        { id: 'u1', name: 'Ali', email: 'a@b.com', role: 'admin', phone: '0500' },
        { skipValidation: true, department: 'IT' }
      );

      const arg = FormSubmission.create.mock.calls[0][0];
      expect(arg.submittedBy).toMatchObject({
        userId: 'u1',
        name: 'Ali',
        email: 'a@b.com',
        department: 'IT',
        role: 'admin',
        phone: '0500',
      });
    });

    it('passes priority and dueDate options', async () => {
      const tpl = { templateId: 't1', name: 'T', requiresApproval: false, approvalSteps: [] };
      FormTemplate.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(tpl) });
      FormSubmission.create.mockResolvedValue({});
      const due = new Date('2026-12-31');

      await service.submitForm(
        't1',
        {},
        {},
        { skipValidation: true, priority: 'urgent', dueDate: due }
      );

      const arg = FormSubmission.create.mock.calls[0][0];
      expect(arg.priority).toBe('urgent');
      expect(arg.dueDate).toBe(due);
    });
  });

  // ── getUserSubmissions ─────────────────────────────────────
  describe('getUserSubmissions', () => {
    it('returns submissions and pagination', async () => {
      const subs = [makeMockSubmission()];
      mockSubmissionFindChain = mockFindChain(subs);
      FormSubmission.find.mockReturnValue(mockSubmissionFindChain);
      FormSubmission.countDocuments.mockResolvedValue(1);

      const result = await service.getUserSubmissions('u1');

      expect(result.submissions).toEqual(subs);
      expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
    });

    it('applies status filter', async () => {
      await service.getUserSubmissions('u1', { status: 'approved' });
      const filterArg = FormSubmission.find.mock.calls[0][0];
      expect(filterArg.status).toBe('approved');
    });

    it('applies templateId filter', async () => {
      await service.getUserSubmissions('u1', { templateId: 't1' });
      const filterArg = FormSubmission.find.mock.calls[0][0];
      expect(filterArg.templateId).toBe('t1');
    });

    it('applies pagination', async () => {
      await service.getUserSubmissions('u1', { page: 2, limit: 5 });
      expect(mockSubmissionFindChain.skip).toHaveBeenCalledWith(5);
      expect(mockSubmissionFindChain.limit).toHaveBeenCalledWith(5);
    });
  });

  // ── getPendingSubmissions ──────────────────────────────────
  describe('getPendingSubmissions', () => {
    it('filters status in submitted/under_review', async () => {
      await service.getPendingSubmissions();
      const filterArg = FormSubmission.find.mock.calls[0][0];
      expect(filterArg.status).toEqual({ $in: ['submitted', 'under_review'] });
    });

    it('adds role elemMatch when role provided', async () => {
      await service.getPendingSubmissions({ role: 'manager' });
      const filterArg = FormSubmission.find.mock.calls[0][0];
      expect(filterArg.approvals).toEqual({ $elemMatch: { role: 'manager', status: 'pending' } });
    });

    it('sorts by priority desc, createdAt asc', async () => {
      await service.getPendingSubmissions();
      expect(mockSubmissionFindChain.sort).toHaveBeenCalledWith({ priority: -1, createdAt: 1 });
    });

    it('applies pagination', async () => {
      FormSubmission.countDocuments.mockResolvedValue(100);
      const result = await service.getPendingSubmissions({ page: 2, limit: 10 });
      expect(result.pagination).toMatchObject({ page: 2, limit: 10, total: 100, pages: 10 });
    });
  });

  // ── getSubmissionById ──────────────────────────────────────
  describe('getSubmissionById', () => {
    it('returns submission when found', async () => {
      const sub = makeMockSubmission();
      FormSubmission.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(sub) });

      const result = await service.getSubmissionById('sub-id-1');
      expect(result).toBe(sub);
    });

    it('throws 404 when not found', async () => {
      FormSubmission.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(service.getSubmissionById('nope')).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── approveSubmission ──────────────────────────────────────
  describe('approveSubmission', () => {
    it('calls approveCurrentStep and saves', async () => {
      const sub = makeMockSubmission();
      FormSubmission.findById.mockResolvedValue(sub);

      const result = await service.approveSubmission(
        'sub-id-1',
        { id: 'u1', name: 'Ali' },
        'Looks good'
      );

      expect(sub.approveCurrentStep).toHaveBeenCalledWith('u1', 'Ali', 'Looks good');
      expect(sub.save).toHaveBeenCalled();
      expect(result).toBe(sub);
    });

    it('uses default approver name', async () => {
      const sub = makeMockSubmission();
      FormSubmission.findById.mockResolvedValue(sub);

      await service.approveSubmission('sub-id-1', { id: 'u1' }, 'ok');

      expect(sub.approveCurrentStep).toHaveBeenCalledWith('u1', 'مسؤول', 'ok');
    });

    it('throws 404 when not found', async () => {
      FormSubmission.findById.mockResolvedValue(null);
      await expect(service.approveSubmission('x', {}, '')).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── rejectSubmission ───────────────────────────────────────
  describe('rejectSubmission', () => {
    it('calls reject and saves', async () => {
      const sub = makeMockSubmission();
      FormSubmission.findById.mockResolvedValue(sub);

      await service.rejectSubmission('sub-id-1', { id: 'u1', name: 'Ali' }, 'Rejected reason');

      expect(sub.reject).toHaveBeenCalledWith('u1', 'Ali', 'Rejected reason');
      expect(sub.save).toHaveBeenCalled();
    });

    it('uses default name when none provided', async () => {
      const sub = makeMockSubmission();
      FormSubmission.findById.mockResolvedValue(sub);

      await service.rejectSubmission('sub-id-1', { id: 'u1' }, 'no');

      expect(sub.reject).toHaveBeenCalledWith('u1', 'مسؤول', 'no');
    });

    it('throws 404 when not found', async () => {
      FormSubmission.findById.mockResolvedValue(null);
      await expect(service.rejectSubmission('x', {}, '')).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── returnSubmission ───────────────────────────────────────
  describe('returnSubmission', () => {
    it('calls returnForRevision and saves', async () => {
      const sub = makeMockSubmission();
      FormSubmission.findById.mockResolvedValue(sub);

      await service.returnSubmission('sub-id-1', { id: 'u1', name: 'Ali' }, 'Fix field X');

      expect(sub.returnForRevision).toHaveBeenCalledWith('u1', 'Ali', 'Fix field X');
      expect(sub.save).toHaveBeenCalled();
    });

    it('throws 404 when not found', async () => {
      FormSubmission.findById.mockResolvedValue(null);
      await expect(service.returnSubmission('x', {}, '')).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── resubmitForm ───────────────────────────────────────────
  describe('resubmitForm', () => {
    it('resubmits when status is "returned"', async () => {
      const sub = makeMockSubmission({
        status: 'returned',
        approvals: [{ step: 0, status: 'pending' }],
      });
      FormSubmission.findById.mockResolvedValue(sub);

      const result = await service.resubmitForm(
        'sub-id-1',
        { fullName: 'New' },
        { id: 'u1', name: 'Ali' },
        'Fixed'
      );

      expect(sub.saveRevision).toHaveBeenCalledWith({ fullName: 'New' }, 'u1', 'Ali', 'Fixed');
      expect(sub.status).toBe('submitted');
      expect(sub.currentApprovalStep).toBe(0);
      expect(sub.save).toHaveBeenCalled();
      expect(result).toBe(sub);
    });

    it('resubmits when status is "draft"', async () => {
      const sub = makeMockSubmission({ status: 'draft', approvals: [] });
      FormSubmission.findById.mockResolvedValue(sub);

      await service.resubmitForm('sub-id-1', {}, {});

      expect(sub.status).toBe('submitted');
    });

    it('resets all approval statuses to pending', async () => {
      const approvals = [
        {
          step: 0,
          status: 'approved',
          approvedBy: 'x',
          approverName: 'x',
          comment: 'ok',
          date: new Date(),
        },
        { step: 1, status: 'pending' },
      ];
      const sub = makeMockSubmission({ status: 'returned', approvals });
      FormSubmission.findById.mockResolvedValue(sub);

      await service.resubmitForm('sub-id-1', {}, { id: 'u1' });

      sub.approvals.forEach(a => {
        expect(a.status).toBe('pending');
        expect(a.approvedBy).toBeUndefined();
        expect(a.approverName).toBeUndefined();
        expect(a.comment).toBeUndefined();
        expect(a.date).toBeUndefined();
      });
    });

    it('throws 400 when status is "submitted"', async () => {
      const sub = makeMockSubmission({ status: 'submitted' });
      FormSubmission.findById.mockResolvedValue(sub);

      await expect(service.resubmitForm('sub-id-1', {}, {})).rejects.toMatchObject({ status: 400 });
    });

    it('throws 400 when status is "approved"', async () => {
      const sub = makeMockSubmission({ status: 'approved' });
      FormSubmission.findById.mockResolvedValue(sub);

      await expect(service.resubmitForm('sub-id-1', {}, {})).rejects.toMatchObject({ status: 400 });
    });

    it('throws 404 when not found', async () => {
      FormSubmission.findById.mockResolvedValue(null);
      await expect(service.resubmitForm('x', {}, {})).rejects.toMatchObject({ status: 404 });
    });

    it('uses default reason', async () => {
      const sub = makeMockSubmission({ status: 'returned', approvals: [] });
      FormSubmission.findById.mockResolvedValue(sub);

      await service.resubmitForm('sub-id-1', {}, { id: 'u1', name: 'Ali' });

      expect(sub.saveRevision).toHaveBeenCalledWith({}, 'u1', 'Ali', 'إعادة إرسال');
    });
  });

  // ── addComment ─────────────────────────────────────────────
  describe('addComment', () => {
    it('pushes comment and saves', async () => {
      const comments = [];
      comments.push = jest.fn();
      const sub = makeMockSubmission({ comments });
      FormSubmission.findById.mockResolvedValue(sub);

      await service.addComment(
        'sub-id-1',
        { id: 'u1', name: 'Ali', role: 'admin' },
        'Hello',
        'note',
        true
      );

      expect(comments.push).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          userName: 'Ali',
          text: 'Hello',
          type: 'note',
          isInternal: true,
        })
      );
      expect(sub.save).toHaveBeenCalled();
    });

    it('uses default type and isInternal', async () => {
      const comments = [];
      comments.push = jest.fn();
      const sub = makeMockSubmission({ comments });
      FormSubmission.findById.mockResolvedValue(sub);

      await service.addComment('sub-id-1', { id: 'u1' }, 'text');

      expect(comments.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'comment', isInternal: false })
      );
    });

    it('throws 404 when not found', async () => {
      FormSubmission.findById.mockResolvedValue(null);
      await expect(service.addComment('x', {}, 'text')).rejects.toMatchObject({ status: 404 });
    });
  });
});

/* ================================================================
   7. STATS
   ================================================================ */

describe('Stats', () => {
  describe('getCategories', () => {
    it('returns categories with counts from aggregation', async () => {
      FormTemplate.aggregate.mockResolvedValue([
        { _id: 'hr', count: 5 },
        { _id: 'finance', count: 3 },
      ]);

      const result = await service.getCategories();

      expect(result).toHaveLength(11);
      const allCat = result.find(c => c.id === 'all');
      expect(allCat.count).toBe(8);
      expect(result.find(c => c.id === 'hr').count).toBe(5);
      expect(result.find(c => c.id === 'finance').count).toBe(3);
      expect(result.find(c => c.id === 'medical').count).toBe(0);
    });

    it('handles aggregation error gracefully (all counts = 0)', async () => {
      FormTemplate.aggregate.mockRejectedValue(new Error('DB error'));

      const result = await service.getCategories();

      result.forEach(cat => {
        expect(cat.count).toBe(0);
      });
    });
  });

  describe('getStats', () => {
    it('returns complete stats object', async () => {
      FormTemplate.countDocuments.mockResolvedValue(10);
      FormSubmission.countDocuments
        .mockResolvedValueOnce(50) // totalSubmissions
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(30); // approved
      mockSubmissionFindChain = mockFindChain([{ _id: 'r1' }]);
      FormSubmission.find.mockReturnValue(mockSubmissionFindChain);
      FormTemplate.aggregate.mockResolvedValue([{ _id: 'hr', count: 5, avgUsage: 2.5 }]);
      FormSubmission.aggregate.mockResolvedValue([{ _id: '2026-03', count: 12 }]);

      const result = await service.getStats();

      expect(result.stats).toMatchObject({
        totalTemplates: 10,
        totalSubmissions: 50,
        pendingSubmissions: 5,
        approvedSubmissions: 30,
        rejectedSubmissions: 15,
      });
      expect(result.recentSubmissions).toEqual([{ _id: 'r1' }]);
      expect(result.categoryBreakdown).toHaveLength(1);
      expect(result.monthlyTrend).toHaveLength(1);
    });

    it('handles countDocuments errors (returns 0)', async () => {
      FormTemplate.countDocuments.mockRejectedValue(new Error('err'));
      FormSubmission.countDocuments.mockRejectedValue(new Error('err'));
      mockSubmissionFindChain = mockFindChain([]);
      // lean() already resolves to []
      mockSubmissionFindChain.lean.mockReturnValue({ catch: jest.fn().mockReturnValue([]) });
      FormSubmission.find.mockReturnValue(mockSubmissionFindChain);

      const result = await service.getStats();

      expect(result.stats.totalTemplates).toBe(0);
    });

    it('handles aggregate errors gracefully', async () => {
      FormTemplate.countDocuments.mockResolvedValue(0);
      FormSubmission.countDocuments.mockResolvedValue(0);
      mockSubmissionFindChain = mockFindChain([]);
      mockSubmissionFindChain.lean.mockReturnValue({ catch: jest.fn().mockReturnValue([]) });
      FormSubmission.find.mockReturnValue(mockSubmissionFindChain);
      FormTemplate.aggregate.mockRejectedValue(new Error('agg error'));
      FormSubmission.aggregate.mockRejectedValue(new Error('agg error'));

      const result = await service.getStats();

      expect(result.categoryBreakdown).toEqual([]);
      expect(result.monthlyTrend).toEqual([]);
    });

    it('passes options.filter to submissions query', async () => {
      FormTemplate.countDocuments.mockResolvedValue(0);
      FormSubmission.countDocuments.mockResolvedValue(0);
      mockSubmissionFindChain = mockFindChain([]);
      mockSubmissionFindChain.lean.mockReturnValue({ catch: jest.fn().mockReturnValue([]) });
      FormSubmission.find.mockReturnValue(mockSubmissionFindChain);

      await service.getStats({ filter: { tenantId: 't1' } });

      // totalSubmissions uses options.filter
      expect(FormSubmission.countDocuments).toHaveBeenCalledWith({ tenantId: 't1' });
    });

    it('calculates rejectedSubmissions as max(0, total - pending - approved)', async () => {
      FormTemplate.countDocuments.mockResolvedValue(0);
      FormSubmission.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(5); // approved
      mockSubmissionFindChain = mockFindChain([]);
      mockSubmissionFindChain.lean.mockReturnValue({ catch: jest.fn().mockReturnValue([]) });
      FormSubmission.find.mockReturnValue(mockSubmissionFindChain);

      const result = await service.getStats();

      expect(result.stats.rejectedSubmissions).toBe(2);
    });

    it('rejects cannot go negative', async () => {
      FormTemplate.countDocuments.mockResolvedValue(0);
      FormSubmission.countDocuments
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(4); // approved > total-pending
      mockSubmissionFindChain = mockFindChain([]);
      mockSubmissionFindChain.lean.mockReturnValue({ catch: jest.fn().mockReturnValue([]) });
      FormSubmission.find.mockReturnValue(mockSubmissionFindChain);

      const result = await service.getStats();

      expect(result.stats.rejectedSubmissions).toBe(0);
    });
  });
});

/* ================================================================
   8. RENDERING — renderSubmissionHtml
   ================================================================ */

describe('renderSubmissionHtml', () => {
  const baseTemplate = {
    name: 'Test Form',
    nameEn: 'Test Form EN',
    fields: [],
    sections: [],
    design: {},
  };
  const baseSubmission = { data: {}, submissionNumber: 'SUB-001', notes: '' };

  it('returns an HTML string', () => {
    const html = service.renderSubmissionHtml(baseTemplate, baseSubmission);
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes template name in title', () => {
    const html = service.renderSubmissionHtml(baseTemplate, baseSubmission);
    expect(html).toContain('<title>Test Form</title>');
  });

  it('defaults to RTL direction', () => {
    const html = service.renderSubmissionHtml(baseTemplate, baseSubmission);
    expect(html).toContain('dir="rtl"');
  });

  it('supports LTR direction', () => {
    const tpl = { ...baseTemplate, design: { page: { direction: 'ltr' } } };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('dir="ltr"');
  });

  it('renders watermark when enabled', () => {
    const tpl = {
      ...baseTemplate,
      design: { watermark: { enabled: true, text: 'DRAFT' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('class="watermark"');
    expect(html).toContain('DRAFT');
  });

  it('does not render watermark when disabled', () => {
    const tpl = {
      ...baseTemplate,
      design: { watermark: { enabled: false, text: 'DRAFT' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).not.toContain('class="watermark"');
  });

  it('renders stamps', () => {
    const tpl = {
      ...baseTemplate,
      design: { stamps: [{ label: 'APPROVED', position: 'top-right', color: '#4CAF50' }] },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('class="stamp top-right"');
    expect(html).toContain('APPROVED');
  });

  it('renders multiple stamps', () => {
    const tpl = {
      ...baseTemplate,
      design: {
        stamps: [
          { label: 'S1', position: 'top-right' },
          { label: 'S2', position: 'bottom-left' },
        ],
      },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('S1');
    expect(html).toContain('S2');
  });

  it('renders header with title', () => {
    const tpl = {
      ...baseTemplate,
      design: { header: { title: 'My Title' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('class="form-header"');
    expect(html).toContain('My Title');
  });

  it('renders header with subtitle', () => {
    const tpl = {
      ...baseTemplate,
      design: { header: { title: 'T', subtitle: 'Sub' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('Sub');
  });

  it('skips header when header.enabled=false', () => {
    const tpl = {
      ...baseTemplate,
      design: { header: { enabled: false } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).not.toContain('class="form-header"');
  });

  it('renders logo when logo.url present', () => {
    const tpl = {
      ...baseTemplate,
      design: { logo: { url: 'https://example.com/logo.png', width: 120, height: 60 } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('logo-container');
    expect(html).toContain('https://example.com/logo.png');
  });

  it('renders secondary logo', () => {
    const tpl = {
      ...baseTemplate,
      design: { secondaryLogo: { url: 'https://example.com/sec.png' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('https://example.com/sec.png');
  });

  it('renders header customHtml when present', () => {
    const tpl = {
      ...baseTemplate,
      design: { header: { customHtml: '<div class="custom">Custom</div>' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('<div class="custom">Custom</div>');
  });

  it('renders reference number if present', () => {
    const sub = { ...baseSubmission, submissionNumber: 'REF-123' };
    const html = service.renderSubmissionHtml(baseTemplate, sub);
    expect(html).toContain('REF-123');
  });

  it('renders text field values', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'fullName', label: 'الاسم', type: 'text', order: 1 }],
    };
    const sub = { ...baseSubmission, data: { fullName: 'أحمد' } };
    const html = service.renderSubmissionHtml(tpl, sub);
    expect(html).toContain('أحمد');
    expect(html).toContain('الاسم');
  });

  it('renders checkbox field as yes/no', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'agree', label: 'موافق', type: 'checkbox', order: 1 }],
    };
    const htmlYes = service.renderSubmissionHtml(tpl, { data: { agree: true } });
    expect(htmlYes).toContain('✅');

    const htmlNo = service.renderSubmissionHtml(tpl, { data: { agree: false } });
    expect(htmlNo).toContain('❌');
  });

  it('renders toggle field as yes/no', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 't', label: 'Toggle', type: 'toggle', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { t: true } });
    expect(html).toContain('✅');
  });

  it('renders select field with option label', () => {
    const tpl = {
      ...baseTemplate,
      fields: [
        {
          name: 'color',
          label: 'اللون',
          type: 'select',
          options: [{ value: 'red', label: 'أحمر' }],
          order: 1,
        },
      ],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { color: 'red' } });
    expect(html).toContain('أحمر');
  });

  it('renders radio field with option label', () => {
    const tpl = {
      ...baseTemplate,
      fields: [
        {
          name: 'choice',
          label: 'اختيار',
          type: 'radio',
          options: [{ value: 'a', label: 'Option A' }],
          order: 1,
        },
      ],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { choice: 'a' } });
    expect(html).toContain('Option A');
  });

  it('renders date field formatted', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'd', label: 'تاريخ', type: 'date', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { d: '2026-01-15' } });
    // Just check it renders something (locale-dependent)
    expect(html).toContain('تاريخ');
  });

  it('renders rating field with stars', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'r', label: 'تقييم', type: 'rating', maxRating: 5, order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { r: 3 } });
    expect(html).toContain('⭐⭐⭐');
  });

  it('renders file field', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'f', label: 'ملف', type: 'file', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { f: 'doc.pdf' } });
    expect(html).toContain('📎');
    expect(html).toContain('doc.pdf');
  });

  it('renders signature field with image', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 's', label: 'توقيع', type: 'signature', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { s: 'data:image/png;base64,abc' } });
    expect(html).toContain('data:image/png;base64,abc');
  });

  it('renders empty value as dash placeholder', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'x', label: 'حقل', type: 'text', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: {} });
    expect(html).toContain('—');
  });

  it('renders header field type as h3', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'h', label: 'Section Header', type: 'header', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: {} });
    expect(html).toContain('<h3');
    expect(html).toContain('Section Header');
  });

  it('renders divider field type as hr', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'd', label: '', type: 'divider', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: {} });
    expect(html).toContain('<hr');
  });

  it('renders paragraph field type as p', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'p', label: 'Instructions text', type: 'paragraph', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: {} });
    expect(html).toContain('<p');
    expect(html).toContain('Instructions text');
  });

  it('renders sections with section titles', () => {
    const tpl = {
      ...baseTemplate,
      sections: [{ id: 'sec1', title: 'القسم 1', order: 1 }],
      fields: [{ name: 'f1', label: 'Field1', type: 'text', section: 'sec1', order: 1 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { f1: 'val' } });
    expect(html).toContain('section-title');
    expect(html).toContain('القسم 1');
  });

  it('renders un-sectioned fields after sections', () => {
    const tpl = {
      ...baseTemplate,
      sections: [{ id: 'sec1', title: 'S1', order: 1 }],
      fields: [
        { name: 'f1', label: 'In Section', type: 'text', section: 'sec1', order: 1 },
        { name: 'f2', label: 'No Section', type: 'text', order: 2 },
      ],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { f1: 'a', f2: 'b' } });
    expect(html).toContain('In Section');
    expect(html).toContain('No Section');
  });

  it('renders notes section', () => {
    const sub = { ...baseSubmission, data: {}, notes: 'Important note' };
    const html = service.renderSubmissionHtml(baseTemplate, sub);
    expect(html).toContain('ملاحظات');
    expect(html).toContain('Important note');
  });

  it('renders footer with text', () => {
    const tpl = {
      ...baseTemplate,
      design: { footer: { text: 'Footer copyright' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('form-footer');
    expect(html).toContain('Footer copyright');
  });

  it('skips footer when footer.enabled=false', () => {
    const tpl = {
      ...baseTemplate,
      design: { footer: { enabled: false } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    // The CSS class exists in <style>, but the actual <div class="form-footer"> should not be rendered
    expect(html).not.toContain('<div class="form-footer">');
  });

  it('renders footer contactInfo', () => {
    const tpl = {
      ...baseTemplate,
      design: { footer: { contactInfo: 'email@test.com' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('email@test.com');
  });

  it('renders footer customHtml', () => {
    const tpl = {
      ...baseTemplate,
      design: { footer: { customHtml: '<b>Custom Footer</b>' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('<b>Custom Footer</b>');
  });

  it('renders signature fields in footer', () => {
    const tpl = {
      ...baseTemplate,
      design: {
        footer: {
          showSignatureFields: true,
          signatureFields: [{ label: 'المدير', role: 'Director' }, { label: 'الموظف' }],
        },
      },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('signature-area');
    expect(html).toContain('المدير');
    expect(html).toContain('Director');
    expect(html).toContain('الموظف');
  });

  it('renders page numbers when enabled', () => {
    const tpl = {
      ...baseTemplate,
      design: { footer: { showPageNumbers: true } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('صفحة 1 من 1');
  });

  it('renders customCss', () => {
    const tpl = {
      ...baseTemplate,
      design: { customCss: '.custom-class { color: red; }' },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('.custom-class { color: red; }');
  });

  it('handles null submission gracefully', () => {
    const html = service.renderSubmissionHtml(baseTemplate, null);
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('escapes HTML in field values', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'x', label: 'Input', type: 'text', order: 1 }],
    };
    const sub = { data: { x: '<script>alert("xss")</script>' } };
    const html = service.renderSubmissionHtml(tpl, sub);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('respects field gridSize for width', () => {
    const tpl = {
      ...baseTemplate,
      fields: [{ name: 'x', label: 'Half', type: 'text', order: 1, gridSize: 6 }],
    };
    const html = service.renderSubmissionHtml(tpl, { data: { x: 'v' } });
    expect(html).toContain('48%'); // Math.round((6/12)*100) - 2 = 48
  });

  it('uses LTR header title when direction=ltr and titleEn available', () => {
    const tpl = {
      ...baseTemplate,
      nameEn: 'English Name',
      design: { page: { direction: 'ltr' }, header: { title: 'Arabic', titleEn: 'English' } },
    };
    const html = service.renderSubmissionHtml(tpl, baseSubmission);
    expect(html).toContain('English');
  });
});

/* ================================================================
   9. SEEDING — seedBuiltInTemplates
   ================================================================ */

describe('seedBuiltInTemplates', () => {
  it('seeds templates and returns count', async () => {
    FormTemplate.findOneAndUpdate.mockResolvedValue({});

    const count = await service.seedBuiltInTemplates([
      { templateId: 'tpl-1', name: 'T1' },
      { templateId: 'tpl-2', name: 'T2' },
    ]);

    expect(count).toBe(2);
    expect(FormTemplate.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('2'));
  });

  it('uses upsert with $setOnInsert', async () => {
    FormTemplate.findOneAndUpdate.mockResolvedValue({});

    await service.seedBuiltInTemplates([{ templateId: 'tpl-x', name: 'X' }]);

    expect(FormTemplate.findOneAndUpdate).toHaveBeenCalledWith(
      { templateId: 'tpl-x' },
      {
        $setOnInsert: expect.objectContaining({
          templateId: 'tpl-x',
          isBuiltIn: true,
          isActive: true,
        }),
      },
      { upsert: true, new: true }
    );
  });

  it('returns 0 for empty array', async () => {
    const count = await service.seedBuiltInTemplates([]);
    expect(count).toBe(0);
  });

  it('returns 0 for null input', async () => {
    const count = await service.seedBuiltInTemplates(null);
    expect(count).toBe(0);
  });

  it('returns 0 for undefined input', async () => {
    const count = await service.seedBuiltInTemplates(undefined);
    expect(count).toBe(0);
  });

  it('handles individual template seed errors and continues', async () => {
    FormTemplate.findOneAndUpdate
      .mockRejectedValueOnce(new Error('Duplicate'))
      .mockResolvedValueOnce({});

    const count = await service.seedBuiltInTemplates([
      { templateId: 'fail', name: 'Fail' },
      { templateId: 'ok', name: 'OK' },
    ]);

    expect(count).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fail'));
  });

  it('logs info with seeded count', async () => {
    FormTemplate.findOneAndUpdate.mockResolvedValue({});
    await service.seedBuiltInTemplates([{ templateId: 't1', name: 'A' }]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1'));
  });
});
