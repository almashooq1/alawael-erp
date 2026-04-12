/**
 * Unit tests for dashboardConfiguration.service.js
 * Singleton EventEmitter with in-memory Maps — NO Mongoose
 */

jest.mock('uuid', () => ({ v4: () => `uuid-${global.__dcUuid++}` }));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

beforeAll(() => {
  global.__dcUuid = 1;
});
afterAll(() => {
  delete global.__dcUuid;
});

const svc = require('../../services/dashboardConfiguration.service');

/* ── helper ── */
function mkDashboard(overrides = {}) {
  return svc.createDashboard({
    userId: 'user-1',
    name: `Dashboard ${global.__dcUuid}`,
    description: 'desc',
    theme: 'light',
    widgets: [],
    ...overrides,
  });
}

beforeEach(() => {
  // reset internal state between tests
  svc.dashboards.clear();
  svc.history.clear();
  svc.snapshots.clear();
  global.__dcUuid = 100;
});

/* ════════════════════════════════════════════════════════════════
 * 1. createDashboard
 * ════════════════════════════════════════════════════════════════ */
describe('DashboardConfigurationService', () => {
  describe('createDashboard', () => {
    it('creates dashboard with all fields', () => {
      const d = mkDashboard({ name: 'Test DB' });
      expect(d.id).toBeDefined();
      expect(d.name).toBe('Test DB');
      expect(d.theme).toBe('light');
      expect(d.gridSize).toBe(12);
      expect(d.autoRefresh).toBe(true);
      expect(d.refreshInterval).toBe(30000);
      expect(d.locked).toBe(false);
      expect(d.metadata.viewCount).toBe(0);
      expect(d.permissions.canEdit).toContain('user-1');
    });

    it('throws when name is missing', () => {
      expect(() => svc.createDashboard({ userId: 'u' })).toThrow('Dashboard name is required');
    });

    it('initialises history for the dashboard', () => {
      const d = mkDashboard();
      const h = svc.history.get(d.id);
      expect(h).toHaveLength(1);
      expect(h[0].version).toBe(1);
    });

    it('emits dashboard:created event', () => {
      const spy = jest.fn();
      svc.on('dashboard:created', spy);
      mkDashboard();
      expect(spy).toHaveBeenCalledTimes(1);
      svc.removeListener('dashboard:created', spy);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 2. updateDashboard
   * ════════════════════════════════════════════════════════════════ */
  describe('updateDashboard', () => {
    it('updates allowed fields', () => {
      const d = mkDashboard();
      const updated = svc.updateDashboard(d.id, {
        name: 'New',
        description: 'new desc',
        theme: 'dark',
      });
      expect(updated.name).toBe('New');
      expect(updated.description).toBe('new desc');
      expect(updated.theme).toBe('dark');
    });

    it('throws for non-existent dashboard', () => {
      expect(() => svc.updateDashboard('fake', {})).toThrow('Dashboard not found');
    });

    it('adds history entry', () => {
      const d = mkDashboard();
      svc.updateDashboard(d.id, { name: 'v2' });
      const h = svc.history.get(d.id);
      expect(h.length).toBeGreaterThanOrEqual(2);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 3. Widget management
   * ════════════════════════════════════════════════════════════════ */
  describe('addWidget / removeWidget / reorderWidgets', () => {
    it('adds a widget', () => {
      const d = mkDashboard();
      svc.addWidget(d.id, { id: 'w1', type: 'chart' });
      expect(d.widgets).toHaveLength(1);
      expect(d.widgets[0].id).toBe('w1');
    });

    it('throws when adding widget to missing dashboard', () => {
      expect(() => svc.addWidget('nope', {})).toThrow('Dashboard not found');
    });

    it('removes a widget', () => {
      const d = mkDashboard();
      svc.addWidget(d.id, { id: 'w1', type: 'chart' });
      svc.removeWidget(d.id, 'w1');
      expect(d.widgets).toHaveLength(0);
    });

    it('throws when removing non-existent widget', () => {
      const d = mkDashboard();
      expect(() => svc.removeWidget(d.id, 'w-x')).toThrow('Widget not found');
    });

    it('reorders widgets', () => {
      const d = mkDashboard();
      svc.addWidget(d.id, { id: 'w1' });
      svc.addWidget(d.id, { id: 'w2' });
      svc.reorderWidgets(d.id, [{ id: 'w2' }, { id: 'w1' }]);
      expect(d.widgets[0].id).toBe('w2');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 4. getDashboard
   * ════════════════════════════════════════════════════════════════ */
  describe('getDashboard', () => {
    it('returns dashboard and increments viewCount', () => {
      const d = mkDashboard();
      expect(d.metadata.viewCount).toBe(0);
      const got = svc.getDashboard(d.id);
      expect(got.metadata.viewCount).toBe(1);
    });

    it('throws for missing dashboard', () => {
      expect(() => svc.getDashboard('nope')).toThrow('Dashboard not found');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 5. getUserDashboards
   * ════════════════════════════════════════════════════════════════ */
  describe('getUserDashboards', () => {
    it('returns dashboards for user', () => {
      mkDashboard({ userId: 'u1', name: 'A' });
      mkDashboard({ userId: 'u2', name: 'B' });
      const res = svc.getUserDashboards('u1');
      expect(res).toHaveLength(1);
      expect(res[0].userId).toBe('u1');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 6. deleteDashboard
   * ════════════════════════════════════════════════════════════════ */
  describe('deleteDashboard', () => {
    it('deletes dashboard and its history/snapshots', () => {
      const d = mkDashboard();
      svc.deleteDashboard(d.id);
      expect(svc.dashboards.has(d.id)).toBe(false);
      expect(svc.history.has(d.id)).toBe(false);
    });

    it('throws for missing dashboard', () => {
      expect(() => svc.deleteDashboard('nope')).toThrow('Dashboard not found');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 7. Themes
   * ════════════════════════════════════════════════════════════════ */
  describe('applyTheme / getAvailableThemes', () => {
    it('applies theme', () => {
      const d = mkDashboard();
      svc.applyTheme(d.id, 'dark');
      expect(d.theme).toBe('dark');
    });

    it('throws for missing theme', () => {
      const d = mkDashboard();
      expect(() => svc.applyTheme(d.id, 'neon')).toThrow('Theme not found');
    });

    it('returns available themes', () => {
      const themes = svc.getAvailableThemes();
      expect(themes.length).toBeGreaterThanOrEqual(3);
      expect(themes.map(t => t.id)).toEqual(
        expect.arrayContaining(['light', 'dark', 'professional'])
      );
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 8. Snapshots
   * ════════════════════════════════════════════════════════════════ */
  describe('Snapshots', () => {
    it('creates and lists snapshots', () => {
      const d = mkDashboard();
      const snapId = svc.createSnapshot(d.id, 'v1-snap');
      expect(snapId).toBeDefined();
      const list = svc.getSnapshots(d.id);
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('v1-snap');
    });

    it('restores a snapshot', () => {
      const d = mkDashboard({ name: 'Original' });
      const snapId = svc.createSnapshot(d.id, 'snap');
      svc.updateDashboard(d.id, { name: 'Changed' });
      expect(d.name).toBe('Changed');
      svc.restoreSnapshot(d.id, snapId);
      expect(d.name).toBe('Original');
    });

    it('throws when no snapshots exist', () => {
      const d = mkDashboard();
      expect(() => svc.restoreSnapshot(d.id, 'x')).toThrow('No snapshots found');
    });

    it('throws for missing snapshot id', () => {
      const d = mkDashboard();
      svc.createSnapshot(d.id);
      expect(() => svc.restoreSnapshot(d.id, 'bad-id')).toThrow('Snapshot not found');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 9. History & Undo
   * ════════════════════════════════════════════════════════════════ */
  describe('getHistory / undo', () => {
    it('returns history entries', () => {
      const d = mkDashboard();
      svc.updateDashboard(d.id, { name: 'v2' });
      const h = svc.getHistory(d.id, 10);
      expect(h.length).toBeGreaterThanOrEqual(2);
      expect(h[0].version).toBe(1);
    });

    it('undoes last change', () => {
      const d = mkDashboard({ name: 'Original' });
      svc.updateDashboard(d.id, { name: 'Changed' });
      svc.undo(d.id);
      expect(d.name).toBe('Original');
    });

    it('throws when no undo history available', () => {
      const d = mkDashboard();
      // only 1 history entry (creation), need at least 2
      svc.history.set(d.id, [svc.history.get(d.id)[0]]);
      expect(() => svc.undo(d.id)).toThrow('No undo history available');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 10. Lock
   * ════════════════════════════════════════════════════════════════ */
  describe('setLockStatus', () => {
    it('locks and unlocks dashboard', () => {
      const d = mkDashboard();
      svc.setLockStatus(d.id, true);
      expect(d.locked).toBe(true);
      svc.setLockStatus(d.id, false);
      expect(d.locked).toBe(false);
    });

    it('throws for missing dashboard', () => {
      expect(() => svc.setLockStatus('nope', true)).toThrow('Dashboard not found');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 11. getDashboardStats
   * ════════════════════════════════════════════════════════════════ */
  describe('getDashboardStats', () => {
    it('returns aggregate statistics', () => {
      mkDashboard({ isPublic: true });
      mkDashboard({ isPublic: false });
      const stats = svc.getDashboardStats();
      expect(stats.total).toBe(2);
      expect(stats.public).toBe(1);
      expect(stats.private).toBe(1);
    });

    it('returns 0 averageWidgets when no dashboards', () => {
      const stats = svc.getDashboardStats();
      expect(stats.total).toBe(0);
      expect(stats.averageWidgetsPerDashboard).toBe(0);
    });
  });
});
