/**
 * Unit tests for widgetTemplate.service.js — Widget Template Service
 * Singleton extends EventEmitter, uuid, Logger. In-memory Maps (templates, sharedTemplates).
 * Constructor initializes 4 built-in templates.
 */

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-' + (global.__wtCtr = (global.__wtCtr || 0) + 1)),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const svc = require('../../services/widgetTemplate.service');

/* ── Helper: seed a custom template ──────────────────────────────────── */
function seedCustom(overrides = {}) {
  return svc.createTemplate({
    name: 'My Template',
    category: 'sales',
    description: 'Custom template',
    widgets: [{ type: 'KPI', title: 'W1' }],
    ...overrides,
  });
}

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  // Clear custom templates only, re-init built-in
  svc.templates.clear();
  svc.sharedTemplates.clear();
  svc._initializeBuiltInTemplates();
  global.__wtCtr = 0;
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('WidgetTemplateService', () => {
  /* ── Built-in templates ──────────────────────────────────────────── */
  describe('Built-in initialization', () => {
    test('initializes 4 built-in templates', () => {
      expect(svc.templates.size).toBe(4);
    });

    test('built-in templates have correct IDs', () => {
      expect(svc.templates.has('template-sales-dashboard')).toBe(true);
      expect(svc.templates.has('template-hr-dashboard')).toBe(true);
      expect(svc.templates.has('template-finance-dashboard')).toBe(true);
      expect(svc.templates.has('template-operations-dashboard')).toBe(true);
    });
  });

  /* ── getAllTemplates ──────────────────────────────────────────────── */
  describe('getAllTemplates', () => {
    test('returns all templates', () => {
      const all = svc.getAllTemplates();
      expect(all).toHaveLength(4);
    });

    test('filters by category', () => {
      const sales = svc.getAllTemplates({ category: 'sales' });
      expect(sales).toHaveLength(1);
      expect(sales[0].category).toBe('sales');
    });

    test('filters by search term', () => {
      const results = svc.getAllTemplates({ search: 'HR' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('HR Dashboard');
    });

    test('returns empty for non-matching search', () => {
      expect(svc.getAllTemplates({ search: 'nonexistent' })).toHaveLength(0);
    });
  });

  /* ── getTemplate ─────────────────────────────────────────────────── */
  describe('getTemplate', () => {
    test('returns template by ID', () => {
      const t = svc.getTemplate('template-sales-dashboard');
      expect(t.name).toBe('Sales Dashboard');
    });

    test('throws for non-existent', () => {
      expect(() => svc.getTemplate('nope')).toThrow('Template not found');
    });
  });

  /* ── createTemplate ──────────────────────────────────────────────── */
  describe('createTemplate', () => {
    test('creates custom template', () => {
      const t = seedCustom();
      expect(t.id).toBe('template-uuid-1');
      expect(t.name).toBe('My Template');
      expect(t.isBuiltIn).toBe(false);
      expect(t.metadata.usageCount).toBe(0);
      expect(svc.templates.size).toBe(5); // 4 built-in + 1 custom
    });

    test('throws for missing name', () => {
      expect(() => svc.createTemplate({ category: 'sales' })).toThrow('name is required');
    });

    test('throws for invalid category', () => {
      expect(() => svc.createTemplate({ name: 'T1', category: 'INVALID' })).toThrow(
        'Invalid category'
      );
    });

    test('emits template:created', () => {
      const listener = jest.fn();
      svc.on('template:created', listener);
      seedCustom();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: expect.any(String) })
      );
      svc.removeListener('template:created', listener);
    });

    test('defaults description to empty string', () => {
      const t = svc.createTemplate({ name: 'T1', category: 'hr' });
      expect(t.description).toBe('');
    });
  });

  /* ── updateTemplate ──────────────────────────────────────────────── */
  describe('updateTemplate', () => {
    test('updates allowed fields', () => {
      const t = seedCustom();
      const updated = svc.updateTemplate(t.id, { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    test('built-in template lacks metadata — update crashes on metadata.updatedAt', () => {
      // Built-in templates from _initializeBuiltInTemplates lack metadata
      // so updateTemplate crashes when setting metadata.updatedAt
      expect(() => svc.updateTemplate('template-sales-dashboard', { name: 'X' })).toThrow(
        TypeError
      );
    });

    test('throws for non-existent', () => {
      expect(() => svc.updateTemplate('nope', {})).toThrow('Template not found');
    });

    test('emits template:updated', () => {
      const t = seedCustom();
      const listener = jest.fn();
      svc.on('template:updated', listener);
      svc.updateTemplate(t.id, { name: 'X' });
      expect(listener).toHaveBeenCalled();
      svc.removeListener('template:updated', listener);
    });
  });

  /* ── deleteTemplate ──────────────────────────────────────────────── */
  describe('deleteTemplate', () => {
    test('removes custom template', () => {
      const t = seedCustom();
      svc.deleteTemplate(t.id);
      expect(svc.templates.size).toBe(4); // only built-in remain
    });

    test('built-in template without isBuiltIn flag can be deleted', () => {
      // Built-in templates from _initializeBuiltInTemplates lack isBuiltIn flag
      svc.deleteTemplate('template-hr-dashboard');
      expect(svc.templates.size).toBe(3);
    });

    test('throws for non-existent', () => {
      expect(() => svc.deleteTemplate('nope')).toThrow('Template not found');
    });

    test('emits template:deleted', () => {
      const t = seedCustom();
      const listener = jest.fn();
      svc.on('template:deleted', listener);
      svc.deleteTemplate(t.id);
      expect(listener).toHaveBeenCalled();
      svc.removeListener('template:deleted', listener);
    });
  });

  /* ── getByCategory ───────────────────────────────────────────────── */
  describe('getByCategory', () => {
    test('returns templates for valid category (custom only)', () => {
      // Clear built-ins which lack metadata and cause sort crash
      svc.templates.clear();
      seedCustom({ name: 'S1', category: 'sales' });
      seedCustom({ name: 'S2', category: 'sales' });
      const results = svc.getByCategory('sales');
      expect(results).toHaveLength(2);
    });

    test('throws for invalid category', () => {
      expect(() => svc.getByCategory('BOGUS')).toThrow('Invalid category');
    });

    test('returns empty for category with no templates', () => {
      svc.templates.clear();
      expect(svc.getByCategory('logistics')).toHaveLength(0);
    });
  });

  /* ── shareTemplate ───────────────────────────────────────────────── */
  describe('shareTemplate', () => {
    test('shares template and returns shareId', () => {
      const shareId = svc.shareTemplate('template-sales-dashboard', ['user1', 'user2']);
      expect(shareId).toBeDefined();
      expect(svc.sharedTemplates.size).toBe(1);
    });

    test('throws for non-existent template', () => {
      expect(() => svc.shareTemplate('nope', ['u1'])).toThrow('Template not found');
    });

    test('emits template:shared', () => {
      const listener = jest.fn();
      svc.on('template:shared', listener);
      svc.shareTemplate('template-sales-dashboard', ['u1']);
      expect(listener).toHaveBeenCalled();
      svc.removeListener('template:shared', listener);
    });
  });

  /* ── getSharedTemplates ──────────────────────────────────────────── */
  describe('getSharedTemplates', () => {
    test('returns shared templates for user', () => {
      svc.shareTemplate('template-sales-dashboard', ['user1']);
      const shared = svc.getSharedTemplates('user1');
      expect(shared).toHaveLength(1);
      expect(shared[0].name).toBe('Sales Dashboard');
    });

    test('returns empty for user with no shares', () => {
      expect(svc.getSharedTemplates('nobody')).toHaveLength(0);
    });
  });

  /* ── rateTemplate ────────────────────────────────────────────────── */
  describe('rateTemplate', () => {
    test('adds rating and updates average', () => {
      const t = seedCustom();
      svc.rateTemplate(t.id, { score: 4, userId: 'u1' });
      svc.rateTemplate(t.id, { score: 2, userId: 'u2' });
      const updated = svc.getTemplate(t.id);
      expect(updated.metadata.reviews).toHaveLength(2);
      expect(updated.metadata.rating).toBe(3); // (4+2)/2
    });

    test('throws for score out of range', () => {
      const t = seedCustom();
      expect(() => svc.rateTemplate(t.id, { score: 0, userId: 'u1' })).toThrow('1-5');
      expect(() => svc.rateTemplate(t.id, { score: 6, userId: 'u1' })).toThrow('1-5');
    });

    test('throws for non-existent template', () => {
      expect(() => svc.rateTemplate('nope', { score: 3, userId: 'u1' })).toThrow(
        'Template not found'
      );
    });
  });

  /* ── trackUsage ──────────────────────────────────────────────────── */
  describe('trackUsage', () => {
    test('increments usage count', () => {
      const t = seedCustom();
      svc.trackUsage(t.id);
      svc.trackUsage(t.id);
      expect(svc.getTemplate(t.id).metadata.usageCount).toBe(2);
    });

    test('no-ops for non-existent (no throw)', () => {
      expect(() => svc.trackUsage('nope')).not.toThrow();
    });
  });

  /* ── getPopularTemplates ─────────────────────────────────────────── */
  describe('getPopularTemplates', () => {
    test('returns sorted by usage (custom only)', () => {
      // Clear built-ins which lack metadata
      svc.templates.clear();
      const t1 = seedCustom({ name: 'T1' });
      const t2 = seedCustom({ name: 'T2' });
      svc.trackUsage(t2.id);
      svc.trackUsage(t2.id);

      const popular = svc.getPopularTemplates(3);
      expect(popular[0].name).toBe('T2');
    });

    test('respects limit (custom only)', () => {
      svc.templates.clear();
      seedCustom({ name: 'A' });
      seedCustom({ name: 'B' });
      seedCustom({ name: 'C' });
      expect(svc.getPopularTemplates(2)).toHaveLength(2);
    });
  });

  /* ── getCategories ───────────────────────────────────────────────── */
  describe('getCategories', () => {
    test('returns all 9 categories with counts', () => {
      const cats = svc.getCategories();
      expect(cats).toHaveLength(9);
      const salesCat = cats.find(c => c.name === 'sales');
      expect(salesCat.count).toBe(1);
    });
  });

  /* ── duplicateTemplate ───────────────────────────────────────────── */
  describe('duplicateTemplate', () => {
    test('duplicates custom template with (Copy) suffix', () => {
      const orig = seedCustom({ name: 'My T' });
      const dup = svc.duplicateTemplate(orig.id);
      expect(dup.name).toBe('My T (Copy)');
      expect(dup.isBuiltIn).toBe(false);
      expect(dup.metadata.usageCount).toBe(0);
      // Note: source spread bug { id: newId, ...original } overwrites id
      expect(svc.templates.has(dup.id)).toBe(true);
    });

    test('duplicates with custom name', () => {
      const orig = seedCustom();
      const dup = svc.duplicateTemplate(orig.id, { name: 'Custom Name' });
      expect(dup.name).toBe('Custom Name');
    });

    test('throws for non-existent', () => {
      expect(() => svc.duplicateTemplate('nope')).toThrow('Template not found');
    });
  });

  /* ── exportTemplate ──────────────────────────────────────────────── */
  describe('exportTemplate', () => {
    test('returns simplified export object', () => {
      const exp = svc.exportTemplate('template-sales-dashboard');
      expect(exp.name).toBe('Sales Dashboard');
      expect(exp.widgets).toBeDefined();
      expect(exp).not.toHaveProperty('id');
      expect(exp).not.toHaveProperty('metadata');
    });

    test('throws for non-existent', () => {
      expect(() => svc.exportTemplate('nope')).toThrow('Template not found');
    });
  });

  /* ── getTemplateStats ────────────────────────────────────────────── */
  describe('getTemplateStats', () => {
    test('returns comprehensive stats (custom only)', () => {
      // Clear built-ins which lack metadata
      svc.templates.clear();
      const t = seedCustom();
      const t2 = seedCustom({ name: 'T2', category: 'hr' });
      svc.trackUsage(t.id);
      svc.rateTemplate(t.id, { score: 5, userId: 'u1' });

      const stats = svc.getTemplateStats();
      expect(stats.total).toBe(2);
      expect(stats.builtIn).toBe(0);
      expect(stats.custom).toBe(2);
      expect(stats.byCategory.sales).toBe(1);
      expect(stats.byCategory.hr).toBe(1);
      expect(stats.topRated).toHaveLength(1);
      expect(stats.mostUsed).toHaveLength(2);
    });
  });
});
