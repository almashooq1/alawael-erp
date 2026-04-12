'use strict';

/* ─── Mocks ────────────────────────────────────────────────────────────────── */
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: () => `uuid-${++mockUuidCounter}`,
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('dashboardConfiguration.service', () => {
  let svc;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUuidCounter = 0;
    jest.isolateModules(() => {
      svc = require('../../services/dashboardConfiguration.service');
    });
  });

  /* ─── _initializeThemes ────────────────────────────────────────────────── */
  describe('_initializeThemes', () => {
    test('has light, dark, and professional themes', () => {
      const themes = svc.getAvailableThemes();
      expect(themes.length).toBeGreaterThanOrEqual(3);
      const ids = themes.map(t => t.id);
      expect(ids).toContain('light');
      expect(ids).toContain('dark');
      expect(ids).toContain('professional');
    });
  });

  /* ─── createDashboard ──────────────────────────────────────────────────── */
  describe('createDashboard', () => {
    test('creates dashboard with required name', () => {
      const d = svc.createDashboard({ name: 'Test', userId: 'u1' });
      expect(d.id).toBeDefined();
      expect(d.name).toBe('Test');
      expect(d.userId).toBe('u1');
      expect(d.widgets).toEqual([]);
      expect(d.theme).toBe('light');
      expect(d.metadata.createdAt).toBeDefined();
    });

    test('throws when name is missing', () => {
      expect(() => svc.createDashboard({})).toThrow();
    });

    test('accepts optional description, theme, layout', () => {
      const d = svc.createDashboard({
        name: 'D2',
        userId: 'u1',
        description: 'a desc',
        theme: 'dark',
        layout: 'freeform',
      });
      expect(d.description).toBe('a desc');
      expect(d.theme).toBe('dark');
      expect(d.layout).toBe('grid');
    });

    test('emits dashboard:created event', () => {
      const spy = jest.fn();
      svc.on('dashboard:created', spy);
      svc.createDashboard({ name: 'E', userId: 'u1' });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ dashboard: expect.objectContaining({ name: 'E' }) })
      );
    });
  });

  /* ─── updateDashboard ──────────────────────────────────────────────────── */
  describe('updateDashboard', () => {
    test('updates allowed fields', () => {
      const d = svc.createDashboard({ name: 'Old', userId: 'u1' });
      const updated = svc.updateDashboard(d.id, { name: 'New', description: 'updated' });
      expect(updated.name).toBe('New');
      expect(updated.description).toBe('updated');
    });

    test('throws for non-existent dashboard', () => {
      expect(() => svc.updateDashboard('xxx', { name: 'X' })).toThrow();
    });

    test('records history after update', () => {
      const d = svc.createDashboard({ name: 'H', userId: 'u1' });
      svc.updateDashboard(d.id, { name: 'H2' });
      const hist = svc.getHistory(d.id);
      expect(hist.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ─── addWidget / removeWidget ─────────────────────────────────────────── */
  describe('addWidget / removeWidget', () => {
    test('adds widget to dashboard', () => {
      const d = svc.createDashboard({ name: 'W', userId: 'u1' });
      const updated = svc.addWidget(d.id, { type: 'chart', title: 'Revenue' });
      expect(updated.widgets).toHaveLength(1);
      expect(updated.widgets[0].type).toBe('chart');
    });

    test('removes widget by id', () => {
      const d = svc.createDashboard({ name: 'W2', userId: 'u1' });
      const after = svc.addWidget(d.id, { id: 'w1', type: 'table', title: 'T' });
      const removed = svc.removeWidget(d.id, 'w1');
      expect(removed.widgets).toHaveLength(0);
    });

    test('throws when removing non-existent widget', () => {
      const d = svc.createDashboard({ name: 'W3', userId: 'u1' });
      expect(() => svc.removeWidget(d.id, 'nonexistent')).toThrow();
    });
  });

  /* ─── reorderWidgets ───────────────────────────────────────────────────── */
  describe('reorderWidgets', () => {
    test('replaces widgets array with new order', () => {
      const d = svc.createDashboard({ name: 'R', userId: 'u1' });
      svc.addWidget(d.id, { type: 'a', title: 'A' });
      svc.addWidget(d.id, { type: 'b', title: 'B' });
      const curr = svc.getDashboard(d.id);
      const reversed = [...curr.widgets].reverse();
      const r = svc.reorderWidgets(d.id, reversed);
      expect(r.widgets[0].type).toBe('b');
    });
  });

  /* ─── getDashboard ─────────────────────────────────────────────────────── */
  describe('getDashboard', () => {
    test('returns dashboard and increments viewCount', () => {
      const d = svc.createDashboard({ name: 'V', userId: 'u1' });
      svc.getDashboard(d.id);
      const d2 = svc.getDashboard(d.id);
      expect(d2.metadata.viewCount).toBeGreaterThanOrEqual(2);
    });

    test('throws for non-existent id', () => {
      expect(() => svc.getDashboard('none')).toThrow();
    });
  });

  /* ─── getUserDashboards ────────────────────────────────────────────────── */
  describe('getUserDashboards', () => {
    test('returns dashboards for user', () => {
      svc.createDashboard({ name: 'A', userId: 'u1' });
      svc.createDashboard({ name: 'B', userId: 'u2' });
      svc.createDashboard({ name: 'C', userId: 'u1' });
      const r = svc.getUserDashboards('u1');
      expect(r).toHaveLength(2);
    });

    test('returns empty for user with no dashboards', () => {
      expect(svc.getUserDashboards('nobody')).toHaveLength(0);
    });
  });

  /* ─── deleteDashboard ──────────────────────────────────────────────────── */
  describe('deleteDashboard', () => {
    test('deletes dashboard and its data', () => {
      const d = svc.createDashboard({ name: 'D', userId: 'u1' });
      svc.deleteDashboard(d.id);
      expect(() => svc.getDashboard(d.id)).toThrow();
    });

    test('throws for non-existent', () => {
      expect(() => svc.deleteDashboard('none')).toThrow();
    });
  });

  /* ─── applyTheme ───────────────────────────────────────────────────────── */
  describe('applyTheme', () => {
    test('applies valid theme', () => {
      const d = svc.createDashboard({ name: 'T', userId: 'u1' });
      const updated = svc.applyTheme(d.id, 'dark');
      expect(updated.theme).toBe('dark');
    });

    test('throws for unknown theme', () => {
      const d = svc.createDashboard({ name: 'T2', userId: 'u1' });
      expect(() => svc.applyTheme(d.id, 'nonexistent_theme')).toThrow();
    });
  });

  /* ─── getAvailableThemes ───────────────────────────────────────────────── */
  describe('getAvailableThemes', () => {
    test('returns array of themes with id/name/colors', () => {
      const themes = svc.getAvailableThemes();
      expect(themes.length).toBeGreaterThanOrEqual(3);
      expect(themes[0]).toHaveProperty('id');
      expect(themes[0]).toHaveProperty('name');
      expect(themes[0]).toHaveProperty('colors');
    });
  });

  /* ─── snapshots: create / restore / get ────────────────────────────────── */
  describe('snapshots', () => {
    test('createSnapshot creates a snapshot', () => {
      const d = svc.createDashboard({ name: 'S', userId: 'u1' });
      svc.addWidget(d.id, { type: 'chart', title: 'C' });
      const snapId = svc.createSnapshot(d.id, 'snap1');
      expect(typeof snapId).toBe('string');
    });

    test('restoreSnapshot restores dashboard state', () => {
      const d = svc.createDashboard({ name: 'S2', userId: 'u1' });
      svc.addWidget(d.id, { type: 'chart', title: 'Original' });
      svc.createSnapshot(d.id, 'before');
      svc.addWidget(d.id, { type: 'table', title: 'Extra' });
      expect(svc.getDashboard(d.id).widgets).toHaveLength(2);

      const snaps = svc.getSnapshots(d.id);
      svc.restoreSnapshot(d.id, snaps[0].id);
      expect(svc.getDashboard(d.id).widgets).toHaveLength(1);
    });

    test('getSnapshots returns list', () => {
      const d = svc.createDashboard({ name: 'S3', userId: 'u1' });
      svc.createSnapshot(d.id, 's1');
      svc.createSnapshot(d.id, 's2');
      const snaps = svc.getSnapshots(d.id);
      expect(snaps).toHaveLength(2);
    });

    test('limits to 20 snapshots', () => {
      const d = svc.createDashboard({ name: 'S4', userId: 'u1' });
      for (let i = 0; i < 25; i++) {
        svc.createSnapshot(d.id, `snap${i}`);
      }
      expect(svc.getSnapshots(d.id).length).toBeLessThanOrEqual(20);
    });
  });

  /* ─── history / undo ───────────────────────────────────────────────────── */
  describe('history / undo', () => {
    test('getHistory returns recent entries', () => {
      const d = svc.createDashboard({ name: 'Hi', userId: 'u1' });
      svc.updateDashboard(d.id, { name: 'Hi2' });
      svc.updateDashboard(d.id, { name: 'Hi3' });
      const hist = svc.getHistory(d.id);
      expect(hist.length).toBeGreaterThanOrEqual(2);
    });

    test('undo reverts last change', () => {
      const d = svc.createDashboard({ name: 'Undo1', userId: 'u1' });
      svc.updateDashboard(d.id, { name: 'Undo2' });
      svc.undo(d.id);
      const cur = svc.getDashboard(d.id);
      expect(cur.name).toBe('Undo1');
    });

    test('undo throws when no history', () => {
      const d = svc.createDashboard({ name: 'NoUndo', userId: 'u1' });
      expect(() => svc.undo(d.id)).toThrow();
    });
  });

  /* ─── setLockStatus ────────────────────────────────────────────────────── */
  describe('setLockStatus', () => {
    test('locks dashboard', () => {
      const d = svc.createDashboard({ name: 'Lock', userId: 'u1' });
      svc.setLockStatus(d.id, true);
      expect(svc.getDashboard(d.id).locked).toBe(true);
    });

    test('unlocks dashboard', () => {
      const d = svc.createDashboard({ name: 'Lock2', userId: 'u1' });
      svc.setLockStatus(d.id, true);
      svc.setLockStatus(d.id, false);
      expect(svc.getDashboard(d.id).locked).toBe(false);
    });
  });

  /* ─── getDashboardStats ────────────────────────────────────────────────── */
  describe('getDashboardStats', () => {
    test('returns correct totals', () => {
      svc.createDashboard({ name: 'S1', userId: 'u1', isPublic: true });
      const d2 = svc.createDashboard({ name: 'S2', userId: 'u2' });
      svc.addWidget(d2.id, { type: 'chart', title: 'W' });
      svc.setLockStatus(d2.id, true);

      const stats = svc.getDashboardStats();
      expect(stats.total).toBe(2);
      expect(stats.locked).toBe(1);
      expect(stats.totalWidgets).toBe(1);
    });

    test('returns zeros for empty state', () => {
      const stats = svc.getDashboardStats();
      expect(stats.total).toBe(0);
      expect(stats.totalWidgets).toBe(0);
    });
  });
});
