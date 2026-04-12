/**
 * Unit Tests — documentTemplates.engine.js
 * DB-dependent class instance — mongoose globally mocked by jest.setup.js
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mongoose = require('mongoose');

// The module exports an INSTANCE (not the class)
const engine = require('../../services/documents/documentTemplates.engine');

// ─── helpers ───
const fakeTemplate = (overrides = {}) => ({
  _id: 'tpl1',
  name: 'قالب تقرير طبي',
  nameEn: 'Medical Report Template',
  category: 'تقارير',
  slug: 'medical-report',
  description: 'نموذج تقرير طبي',
  version: 1,
  isSystem: false,
  isActive: true,
  isPublic: false,
  usageCount: 5,
  lastUsedAt: new Date(),
  tags: ['طبي'],
  department: 'التأهيل',
  variables: [
    { key: 'beneficiaryName', label: 'اسم المستفيد', type: 'text', required: true, order: 1 },
    { key: 'date', label: 'التاريخ', type: 'date', required: false, order: 2 },
  ],
  sections: [],
  content: '<p>{{beneficiaryName}} - {{date}}</p>',
  contentFormat: 'html',
  styling: { direction: 'rtl' },
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockChain = resolveVal => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolveVal),
  populate: jest.fn().mockReturnThis(),
});

// ─── setup ───
let Model;

beforeEach(() => {
  jest.clearAllMocks();
  Model = mongoose.model('DocumentTemplate');
});

// ═══════════════════════════════════════
//  getTemplates
// ═══════════════════════════════════════
describe('documentTemplates.getTemplates', () => {
  it('returns templates with categories', async () => {
    const tpl = fakeTemplate();
    Model.find.mockReturnValue(mockChain([tpl]));
    Model.aggregate.mockResolvedValue([{ _id: 'تقارير', count: 1 }]);

    const r = await engine.getTemplates({});
    expect(r.success).toBe(true);
    expect(r.templates).toHaveLength(1);
    expect(r.templates[0].name).toBe('قالب تقرير طبي');
    expect(r.categories).toHaveLength(1);
  });

  it('returns empty when no templates', async () => {
    Model.find.mockReturnValue(mockChain([]));
    Model.aggregate.mockResolvedValue([]);

    const r = await engine.getTemplates({});
    expect(r.templates).toHaveLength(0);
  });

  it('applies category filter', async () => {
    Model.find.mockReturnValue(mockChain([]));
    Model.aggregate.mockResolvedValue([]);

    await engine.getTemplates({ category: 'عقود' });
    expect(Model.find).toHaveBeenCalledWith(expect.objectContaining({ category: 'عقود' }));
  });
});

// ═══════════════════════════════════════
//  getTemplate
// ═══════════════════════════════════════
describe('documentTemplates.getTemplate', () => {
  it('returns formatted template', async () => {
    const tpl = fakeTemplate();
    Model.findById.mockReturnValue(mockChain(tpl));

    const r = await engine.getTemplate('tpl1');
    expect(r.id).toBe('tpl1');
    expect(r.name).toBe('قالب تقرير طبي');
    expect(r.content).toBeDefined(); // full=true includes content
  });

  it('returns null when not found', async () => {
    Model.findById.mockReturnValue(mockChain(null));
    const r = await engine.getTemplate('bad');
    expect(r).toBeNull();
  });
});

// ═══════════════════════════════════════
//  createTemplate
// ═══════════════════════════════════════
describe('documentTemplates.createTemplate', () => {
  it.skip('creates and returns success (needs constructor mock)', async () => {
    const saved = fakeTemplate();
    // DocumentTemplate constructor is called internally via `new DocumentTemplate(...)`
    // The mock model from jest.setup.js returns a constructor that produces mock instances
    const mockInstance = {
      ...saved,
      save: jest.fn().mockResolvedValue(saved),
      toObject: jest.fn().mockReturnValue(saved),
    };
    // Override the model constructor to return our mock instance
    const origModel = mongoose.model('DocumentTemplate');
    const ctor = jest.fn().mockReturnValue(mockInstance);
    Object.assign(ctor, origModel);
    mongoose.model.mockImplementation(name => {
      if (name === 'DocumentTemplate') return ctor;
      return origModel;
    });

    const r = await engine.createTemplate({ name: 'قالب جديد' }, 'u1');
    expect(r.success).toBe(true);
    expect(r.template).toBeDefined();
  });
});

// ═══════════════════════════════════════
//  updateTemplate
// ═══════════════════════════════════════
describe('documentTemplates.updateTemplate', () => {
  it('updates and returns success', async () => {
    const tpl = fakeTemplate();
    tpl.save = jest.fn().mockResolvedValue(tpl);
    tpl.toObject = jest.fn().mockReturnValue(tpl);
    Model.findById.mockResolvedValue(tpl);

    const r = await engine.updateTemplate('tpl1', { name: 'تحديث' }, 'u1');
    expect(r.success).toBe(true);
    expect(tpl.save).toHaveBeenCalled();
  });

  it('throws when not found', async () => {
    Model.findById.mockResolvedValue(null);
    await expect(engine.updateTemplate('bad', {}, 'u1')).rejects.toThrow('القالب غير موجود');
  });

  it('throws for system templates', async () => {
    const tpl = fakeTemplate({ isSystem: true });
    Model.findById.mockResolvedValue(tpl);
    await expect(engine.updateTemplate('tpl1', {}, 'u1')).rejects.toThrow('قوالب النظام');
  });
});

// ═══════════════════════════════════════
//  deleteTemplate
// ═══════════════════════════════════════
describe('documentTemplates.deleteTemplate', () => {
  it('soft-deletes by setting isActive=false', async () => {
    const tpl = fakeTemplate();
    tpl.save = jest.fn().mockResolvedValue(tpl);
    Model.findById.mockResolvedValue(tpl);

    const r = await engine.deleteTemplate('tpl1');
    expect(r.success).toBe(true);
    expect(tpl.isActive).toBe(false);
    expect(tpl.save).toHaveBeenCalled();
  });

  it('throws when not found', async () => {
    Model.findById.mockResolvedValue(null);
    await expect(engine.deleteTemplate('bad')).rejects.toThrow();
  });

  it('throws for system templates', async () => {
    Model.findById.mockResolvedValue(fakeTemplate({ isSystem: true }));
    await expect(engine.deleteTemplate('tpl1')).rejects.toThrow('قوالب النظام');
  });
});

// ═══════════════════════════════════════
//  generateFromTemplate
// ═══════════════════════════════════════
describe('documentTemplates.generateFromTemplate', () => {
  it('substitutes variables and returns content', async () => {
    const tpl = fakeTemplate();
    Model.findById.mockReturnValue(mockChain(tpl));
    Model.findByIdAndUpdate.mockResolvedValue(tpl);

    const r = await engine.generateFromTemplate(
      'tpl1',
      { beneficiaryName: 'أحمد', date: '2025-06-01' },
      'u1'
    );
    expect(r.success).toBe(true);
    expect(r.generatedContent).toContain('أحمد');
    expect(r.generatedContent).toContain('2025-06-01');
    expect(r.templateName).toBe('قالب تقرير طبي');
  });

  it('returns missing fields on required variable missing', async () => {
    const tpl = fakeTemplate();
    Model.findById.mockReturnValue(mockChain(tpl));

    const r = await engine.generateFromTemplate('tpl1', {}, 'u1');
    expect(r.success).toBe(false);
    expect(r.missingFields).toContain('اسم المستفيد');
  });

  it('throws when template not found', async () => {
    Model.findById.mockReturnValue(mockChain(null));
    await expect(engine.generateFromTemplate('bad', {}, 'u1')).rejects.toThrow();
  });
});

// ═══════════════════════════════════════
//  previewTemplate
// ═══════════════════════════════════════
describe('documentTemplates.previewTemplate', () => {
  it('returns preview with default values', async () => {
    const tpl = fakeTemplate();
    Model.findById.mockReturnValue(mockChain(tpl));

    const r = await engine.previewTemplate('tpl1');
    expect(r.success).toBe(true);
    expect(r.preview).toBeDefined();
  });

  it('throws when template not found', async () => {
    Model.findById.mockReturnValue(mockChain(null));
    await expect(engine.previewTemplate('bad')).rejects.toThrow();
  });
});

// ═══════════════════════════════════════
//  duplicateTemplate
// ═══════════════════════════════════════
describe('documentTemplates.duplicateTemplate', () => {
  it.skip('creates a copy with modified name (needs constructor mock)', async () => {
    const tpl = fakeTemplate();
    Model.findById.mockReturnValue(mockChain(tpl));

    const saved = { ...tpl, name: `نسخة من ${tpl.name}` };
    const mockInstance = {
      ...saved,
      save: jest.fn().mockResolvedValue(saved),
      toObject: jest.fn().mockReturnValue(saved),
    };
    const origModel = mongoose.model('DocumentTemplate');
    const ctor = jest.fn().mockReturnValue(mockInstance);
    Object.assign(ctor, origModel);
    mongoose.model.mockImplementation(name => {
      if (name === 'DocumentTemplate') return ctor;
      return origModel;
    });

    const r = await engine.duplicateTemplate('tpl1', 'u1');
    expect(r.success).toBe(true);
    expect(r.template.name).toContain('نسخة');
  });
});

// ═══════════════════════════════════════
//  getTemplateStats
// ═══════════════════════════════════════
describe('documentTemplates.getTemplateStats', () => {
  it('returns aggregated stats', async () => {
    Model.countDocuments.mockResolvedValue(10);
    Model.aggregate.mockResolvedValue([{ _id: 'تقارير', count: 5, totalUsage: 20 }]);
    Model.find.mockReturnValue(mockChain([]));

    const r = await engine.getTemplateStats();
    expect(r.success).toBe(true);
    expect(r.stats.total).toBe(10);
  });
});

// ═══════════════════════════════════════
//  _formatTemplate
// ═══════════════════════════════════════
describe('documentTemplates._formatTemplate', () => {
  it('formats template with category info', () => {
    const raw = fakeTemplate();
    const r = engine._formatTemplate(raw);
    expect(r.id).toBe('tpl1');
    expect(r.name).toBe('قالب تقرير طبي');
    expect(r.category.key).toBe('تقارير');
    expect(r.category.icon).toBe('📊');
    expect(r.variablesCount).toBe(2);
    expect(r.requiredVariables).toBe(1);
  });

  it('includes content when full=true', () => {
    const raw = fakeTemplate();
    const r = engine._formatTemplate(raw, true);
    expect(r.content).toBeDefined();
    expect(r.variables).toBeDefined();
    expect(r.styling).toBeDefined();
  });

  it('omits content when full=false', () => {
    const raw = fakeTemplate();
    const r = engine._formatTemplate(raw, false);
    expect(r.content).toBeUndefined();
  });
});
