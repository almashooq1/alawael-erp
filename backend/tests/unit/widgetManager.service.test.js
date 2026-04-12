/**
 * Unit tests for widgetManager.service.js — Widget Manager Service
 * Singleton extends EventEmitter, uuid, Logger. All in-memory Maps.
 */

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-' + (global.__wmCtr = (global.__wmCtr || 0) + 1)),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const svc = require('../../services/widgetManager.service');

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  svc.widgets.clear();
  svc.subscriptions.clear();
  svc.updateQueue.length = 0;
  svc.updateProcessing = false;
  global.__wmCtr = 0;
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('WidgetManager Service', () => {
  const baseData = {
    userId: 'u1',
    dashboardId: 'd1',
    type: 'KPI',
    title: 'My Widget',
    config: { color: 'blue' },
  };

  /* ── createWidget ────────────────────────────────────────────────── */
  describe('createWidget', () => {
    test('creates widget and stores in map', () => {
      const w = svc.createWidget(baseData);
      expect(w.id).toBe('uuid-1');
      expect(w.userId).toBe('u1');
      expect(w.dashboardId).toBe('d1');
      expect(w.type).toBe('KPI');
      expect(w.title).toBe('My Widget');
      expect(w.config.color).toBe('blue');
      expect(w.config.icon).toBe('📊');
      expect(w.status).toBe('idle');
      expect(w.metadata.version).toBe(1);
      expect(svc.widgets.size).toBe(1);
    });

    test('uses default title from widget type if not provided', () => {
      const w = svc.createWidget({ ...baseData, title: undefined });
      expect(w.title).toBe('Key Performance Indicator');
    });

    test('uses default size from widget type if not provided', () => {
      const w = svc.createWidget({ ...baseData, size: undefined });
      expect(w.size).toEqual({ width: 2, height: 1 });
    });

    test('uses default position if not provided', () => {
      const w = svc.createWidget(baseData);
      expect(w.position).toEqual({ x: 0, y: 0 });
    });

    test('uses custom position and size', () => {
      const w = svc.createWidget({
        ...baseData,
        position: { x: 5, y: 3 },
        size: { width: 4, height: 2 },
      });
      expect(w.position).toEqual({ x: 5, y: 3 });
      expect(w.size).toEqual({ width: 4, height: 2 });
    });

    test('throws for invalid widget type', () => {
      expect(() => svc.createWidget({ ...baseData, type: 'INVALID' })).toThrow(
        'Invalid widget type'
      );
    });

    test('emits widget:created event', () => {
      const listener = jest.fn();
      svc.on('widget:created', listener);
      svc.createWidget(baseData);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ widgetId: 'uuid-1' }));
      svc.removeListener('widget:created', listener);
    });

    test('creates all supported types', () => {
      const types = ['KPI', 'CHART', 'TABLE', 'GAUGE', 'CARD', 'TIMELINE', 'HEATMAP', 'CUSTOM'];
      types.forEach(type => {
        svc.createWidget({ ...baseData, type });
      });
      expect(svc.widgets.size).toBe(8);
    });
  });

  /* ── updateWidget ────────────────────────────────────────────────── */
  describe('updateWidget', () => {
    test('updates allowed fields', () => {
      const w = svc.createWidget(baseData);
      const updated = svc.updateWidget(w.id, { title: 'New Title', refreshInterval: 10000 });
      expect(updated.title).toBe('New Title');
      expect(updated.refreshInterval).toBe(10000);
      expect(updated.metadata.version).toBe(2);
    });

    test('merges config', () => {
      const w = svc.createWidget(baseData);
      svc.updateWidget(w.id, { config: { newProp: true } });
      expect(w.config.color).toBe('blue');
      expect(w.config.newProp).toBe(true);
    });

    test('throws for non-existent widget', () => {
      expect(() => svc.updateWidget('nope', {})).toThrow('Widget not found');
    });

    test('emits widget:updated', () => {
      const w = svc.createWidget(baseData);
      const listener = jest.fn();
      svc.on('widget:updated', listener);
      svc.updateWidget(w.id, { title: 'X' });
      expect(listener).toHaveBeenCalled();
      svc.removeListener('widget:updated', listener);
    });
  });

  /* ── updateWidgetData ────────────────────────────────────────────── */
  describe('updateWidgetData', () => {
    test('immediate update sets data directly', () => {
      const w = svc.createWidget(baseData);
      svc.updateWidgetData(w.id, { value: 42 }, true);
      expect(w.data).toEqual({ value: 42 });
      expect(w.status).toBe('updated');
    });

    test('queued update adds to queue', () => {
      const w = svc.createWidget(baseData);
      svc.updateWidgetData(w.id, { value: 10 }, false);
      // Queue is processed synchronously in _processQueue since setImmediate defers
      expect(w.data).toEqual({ value: 10 });
    });

    test('throws for non-existent widget', () => {
      expect(() => svc.updateWidgetData('nope', {})).toThrow('Widget not found');
    });
  });

  /* ── subscribeToWidget / unsubscribeFromWidget ───────────────────── */
  describe('Subscriptions', () => {
    test('subscribe returns subscription ID', () => {
      svc.createWidget(baseData);
      const subId = svc.subscribeToWidget('uuid-1', jest.fn());
      expect(subId).toBe('uuid-2');
      expect(svc.subscriptions.get('uuid-1')).toHaveLength(1);
    });

    test('multiple subscriptions to same widget', () => {
      svc.createWidget(baseData);
      svc.subscribeToWidget('uuid-1', jest.fn());
      svc.subscribeToWidget('uuid-1', jest.fn());
      expect(svc.subscriptions.get('uuid-1')).toHaveLength(2);
    });

    test('unsubscribe removes subscription', () => {
      svc.createWidget(baseData);
      const subId = svc.subscribeToWidget('uuid-1', jest.fn());
      svc.unsubscribeFromWidget('uuid-1', subId);
      expect(svc.subscriptions.get('uuid-1')).toHaveLength(0);
    });

    test('unsubscribe non-existent widget is safe', () => {
      expect(() => svc.unsubscribeFromWidget('nope', 'sub-1')).not.toThrow();
    });

    test('unsubscribe non-existent subscription is safe', () => {
      svc.subscribeToWidget('w1', jest.fn());
      svc.unsubscribeFromWidget('w1', 'no-such-sub');
      expect(svc.subscriptions.get('w1')).toHaveLength(1);
    });
  });

  /* ── batchUpdateWidgets ──────────────────────────────────────────── */
  describe('batchUpdateWidgets', () => {
    test('updates multiple widgets', () => {
      const w1 = svc.createWidget(baseData);
      const w2 = svc.createWidget({ ...baseData, type: 'CHART' });
      const results = svc.batchUpdateWidgets({
        [w1.id]: { value: 1 },
        [w2.id]: { value: 2 },
      });
      expect(results).toHaveLength(2);
      expect(w1.data).toEqual({ value: 1 });
      expect(w2.data).toEqual({ value: 2 });
    });

    test('skips non-existent widgets', () => {
      const w1 = svc.createWidget(baseData);
      const results = svc.batchUpdateWidgets({
        [w1.id]: { value: 1 },
        nope: { value: 2 },
      });
      expect(results).toHaveLength(1);
    });
  });

  /* ── getWidget / getDashboardWidgets / getWidgetsByType ──────────── */
  describe('Getters', () => {
    test('getWidget returns widget', () => {
      const w = svc.createWidget(baseData);
      expect(svc.getWidget(w.id)).toBe(w);
    });

    test('getWidget throws for non-existent', () => {
      expect(() => svc.getWidget('nope')).toThrow('Widget not found');
    });

    test('getDashboardWidgets filters by dashboardId', () => {
      svc.createWidget(baseData);
      svc.createWidget({ ...baseData, dashboardId: 'd2' });
      expect(svc.getDashboardWidgets('d1')).toHaveLength(1);
    });

    test('getWidgetsByType filters by type', () => {
      svc.createWidget(baseData);
      svc.createWidget({ ...baseData, type: 'CHART' });
      expect(svc.getWidgetsByType('KPI')).toHaveLength(1);
      expect(svc.getWidgetsByType('CHART')).toHaveLength(1);
    });
  });

  /* ── deleteWidget ────────────────────────────────────────────────── */
  describe('deleteWidget', () => {
    test('removes widget and subscriptions', () => {
      const w = svc.createWidget(baseData);
      svc.subscribeToWidget(w.id, jest.fn());
      svc.deleteWidget(w.id);
      expect(svc.widgets.size).toBe(0);
      expect(svc.subscriptions.has(w.id)).toBe(false);
    });

    test('emits widget:deleted', () => {
      const w = svc.createWidget(baseData);
      const listener = jest.fn();
      svc.on('widget:deleted', listener);
      svc.deleteWidget(w.id);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ widgetId: w.id }));
      svc.removeListener('widget:deleted', listener);
    });

    test('throws for non-existent', () => {
      expect(() => svc.deleteWidget('nope')).toThrow('Widget not found');
    });
  });

  /* ── reorderWidget ───────────────────────────────────────────────── */
  describe('reorderWidget', () => {
    test('updates position', () => {
      const w = svc.createWidget(baseData);
      svc.reorderWidget(w.id, { x: 10, y: 20 });
      expect(w.position).toEqual({ x: 10, y: 20 });
    });

    test('throws for non-existent', () => {
      expect(() => svc.reorderWidget('nope', { x: 0, y: 0 })).toThrow('Widget not found');
    });
  });

  /* ── resizeWidget ────────────────────────────────────────────────── */
  describe('resizeWidget', () => {
    test('updates size', () => {
      const w = svc.createWidget(baseData);
      svc.resizeWidget(w.id, { width: 5, height: 3 });
      expect(w.size).toEqual({ width: 5, height: 3 });
    });

    test('throws for size below 1x1', () => {
      const w = svc.createWidget(baseData);
      expect(() => svc.resizeWidget(w.id, { width: 0, height: 1 })).toThrow(
        'Minimum widget size is 1x1'
      );
    });

    test('throws for non-existent', () => {
      expect(() => svc.resizeWidget('nope', { width: 2, height: 2 })).toThrow('Widget not found');
    });
  });

  /* ── getWidgetStats ──────────────────────────────────────────────── */
  describe('getWidgetStats', () => {
    test('returns correct stats', () => {
      svc.createWidget(baseData);
      svc.createWidget({ ...baseData, type: 'CHART' });
      svc.subscribeToWidget('uuid-1', jest.fn());

      const stats = svc.getWidgetStats();
      expect(stats.totalWidgets).toBe(2);
      expect(stats.byType.KPI).toBe(1);
      expect(stats.byType.CHART).toBe(1);
      expect(stats.activeSubscriptions).toBe(1);
      expect(stats.queuedUpdates).toBe(0);
      expect(stats.types).toContain('KPI');
    });
  });

  /* ── getAvailableTypes ───────────────────────────────────────────── */
  describe('getAvailableTypes', () => {
    test('returns all types with metadata', () => {
      const types = svc.getAvailableTypes();
      expect(Object.keys(types)).toHaveLength(8);
      expect(types.KPI.name).toBe('Key Performance Indicator');
      expect(types.KPI.icon).toBe('📊');
    });
  });

  /* ── validateWidget ──────────────────────────────────────────────── */
  describe('validateWidget', () => {
    test('valid widget', () => {
      const result = svc.validateWidget({ type: 'KPI', title: 'Test', config: {} });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('invalid type', () => {
      const result = svc.validateWidget({ type: 'BAD', title: 'Test', config: {} });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid widget type');
    });

    test('empty title warning', () => {
      const result = svc.validateWidget({ type: 'KPI', title: '', config: {} });
      expect(result.warnings.some(w => w.includes('empty'))).toBe(true);
    });

    test('long title warning', () => {
      const result = svc.validateWidget({ type: 'KPI', title: 'A'.repeat(101), config: {} });
      expect(result.warnings.some(w => w.includes('100'))).toBe(true);
    });

    test('invalid config error', () => {
      const result = svc.validateWidget({ type: 'KPI', title: 'Test', config: 'bad' });
      expect(result.errors.some(e => e.includes('Config'))).toBe(true);
    });
  });

  /* ── cloneWidget ─────────────────────────────────────────────────── */
  describe('cloneWidget', () => {
    test('clones with new ID', () => {
      const w = svc.createWidget(baseData);
      const cloned = svc.cloneWidget(w.id);
      expect(cloned.id).not.toBe(w.id);
      expect(cloned.title).toBe('My Widget (Copy)');
      expect(cloned.type).toBe(w.type);
      expect(cloned.metadata.version).toBe(1);
      expect(svc.widgets.size).toBe(2);
    });

    test('clones with custom title', () => {
      const w = svc.createWidget(baseData);
      const cloned = svc.cloneWidget(w.id, { title: 'Cloned' });
      expect(cloned.title).toBe('Cloned');
    });

    test('throws for non-existent', () => {
      expect(() => svc.cloneWidget('nope')).toThrow('Widget not found');
    });
  });

  /* ── exportWidgets ───────────────────────────────────────────────── */
  describe('exportWidgets', () => {
    test('exports dashboard widgets config', () => {
      svc.createWidget(baseData);
      svc.createWidget({ ...baseData, dashboardId: 'd2' });
      const exported = svc.exportWidgets('d1');
      expect(exported).toHaveLength(1);
      expect(exported[0].type).toBe('KPI');
      expect(exported[0]).not.toHaveProperty('id');
      expect(exported[0]).not.toHaveProperty('data');
    });
  });
});
