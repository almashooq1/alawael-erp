/**
 * Unit tests for automated-backup.service.js (770L)
 * EventEmitter class — in-memory backup management system
 */

const AutomatedBackupService = require('../../services/automated-backup.service');

describe('AutomatedBackupService', () => {
  let svc;

  beforeEach(() => {
    svc = new AutomatedBackupService({ retentionDays: 7, maxBackups: 10 });
  });

  /* ════════════════════ Constructor & Initialization ════════════════════ */

  describe('constructor', () => {
    it('uses defaults when no config provided', () => {
      const s = new AutomatedBackupService();
      expect(s.config.retentionDays).toBe(30);
      expect(s.config.maxBackups).toBe(100);
      expect(s.config.compressionEnabled).toBe(true);
    });

    it('merges custom config', () => {
      expect(svc.config.retentionDays).toBe(7);
      expect(svc.config.maxBackups).toBe(10);
    });

    it('initializes default schedules', () => {
      const { schedules } = svc.listSchedules();
      expect(schedules.length).toBe(3);
      const ids = schedules.map(s => s.id);
      expect(ids).toContain('daily-mongo');
      expect(ids).toContain('weekly-full');
      expect(ids).toContain('monthly-archive');
    });

    it('initializes local storage target', () => {
      const { targets } = svc.listStorageTargets();
      expect(targets.some(t => t.id === 'local')).toBe(true);
    });

    it('adds S3 target when s3Bucket is set', () => {
      const s = new AutomatedBackupService({ s3Bucket: 'my-bucket' });
      const { targets } = s.listStorageTargets();
      expect(targets.some(t => t.id === 's3-primary')).toBe(true);
    });
  });

  /* ════════════════════ Backup Operations ════════════════════ */

  describe('createBackup', () => {
    it('creates a backup with defaults', () => {
      const b = svc.createBackup();
      expect(b).toHaveProperty('id');
      expect(b.status).toBe('completed');
      expect(b.type).toBe('full');
      expect(b.triggeredBy).toBe('manual');
      expect(b.verified).toBe(true);
      expect(b.checksum).toBeTruthy();
    });

    it('creates backup with custom options', () => {
      const b = svc.createBackup({
        type: 'mongodb',
        triggeredBy: 'schedule',
        description: 'nightly',
        targets: ['local', 's3-primary'],
        includeFiles: false,
      });
      expect(b.type).toBe('mongodb');
      expect(b.triggeredBy).toBe('schedule');
      expect(b.targets).toEqual(['local', 's3-primary']);
      expect(b.includeFiles).toBe(false);
    });

    it('emits backup:completed event', () => {
      const fn = jest.fn();
      svc.on('backup:completed', fn);
      svc.createBackup();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('updates matched schedule lastRun', () => {
      svc.createBackup({ type: 'mongodb', triggeredBy: 'schedule' });
      const { schedules } = svc.listSchedules();
      const daily = schedules.find(s => s.id === 'daily-mongo');
      expect(daily.lastRun).toBeInstanceOf(Date);
    });
  });

  describe('listBackups', () => {
    beforeEach(() => {
      svc.createBackup({ type: 'full' });
      svc.createBackup({ type: 'mongodb' });
      svc.createBackup({ type: 'full' });
    });

    it('returns all backups', () => {
      const res = svc.listBackups();
      expect(res.total).toBe(3);
      expect(res.backups.length).toBe(3);
    });

    it('filters by type', () => {
      const res = svc.listBackups({ type: 'mongodb' });
      expect(res.total).toBe(1);
    });

    it('paginates', () => {
      const res = svc.listBackups({ limit: 2, skip: 0 });
      expect(res.count).toBe(2);
      expect(res.total).toBe(3);
    });
  });

  describe('getBackup', () => {
    it('returns backup by id', () => {
      const created = svc.createBackup();
      const found = svc.getBackup(created.id);
      expect(found.id).toBe(created.id);
    });

    it('throws if not found', () => {
      expect(() => svc.getBackup('nonexistent')).toThrow('Backup not found');
    });
  });

  describe('deleteBackup', () => {
    it('removes backup and emits event', () => {
      const fn = jest.fn();
      svc.on('backup:deleted', fn);
      const b = svc.createBackup();
      const res = svc.deleteBackup(b.id);
      expect(res.deleted).toBe(true);
      expect(fn).toHaveBeenCalled();
      expect(() => svc.getBackup(b.id)).toThrow();
    });

    it('throws if not found', () => {
      expect(() => svc.deleteBackup('nope')).toThrow('Backup not found');
    });
  });

  /* ════════════════════ Schedule Management ════════════════════ */

  describe('upsertSchedule', () => {
    it('creates a new schedule', () => {
      const s = svc.upsertSchedule({
        name: 'test-sched',
        type: 'incremental',
        cron: '0 5 * * *',
      });
      expect(s.name).toBe('test-sched');
      expect(s.enabled).toBe(true);
      expect(s.status).toBe('active');
    });

    it('updates existing schedule by id', () => {
      const s = svc.upsertSchedule({ name: 'new', type: 't', cron: '0 1 * * *' });
      const updated = svc.upsertSchedule({
        id: s.id,
        name: 'updated',
        type: 't2',
        cron: '0 2 * * *',
      });
      expect(updated.name).toBe('updated');
    });

    it('throws without required fields', () => {
      expect(() => svc.upsertSchedule({ name: 'x' })).toThrow();
    });
  });

  describe('toggleSchedule', () => {
    it('disables a schedule', () => {
      const s = svc.toggleSchedule('daily-mongo', false);
      expect(s.enabled).toBe(false);
      expect(s.status).toBe('paused');
    });

    it('throws if not found', () => {
      expect(() => svc.toggleSchedule('nope', true)).toThrow('Schedule not found');
    });
  });

  describe('deleteSchedule', () => {
    it('removes schedule', () => {
      const res = svc.deleteSchedule('daily-mongo');
      expect(res.deleted).toBe(true);
      expect(svc.listSchedules().schedules.length).toBe(2);
    });

    it('throws if not found', () => {
      expect(() => svc.deleteSchedule('nope')).toThrow('Schedule not found');
    });
  });

  /* ════════════════════ Storage Targets ════════════════════ */

  describe('upsertStorageTarget', () => {
    it('creates a new target', () => {
      const t = svc.upsertStorageTarget({ name: 'GCS', type: 'gcs' });
      expect(t.name).toBe('GCS');
      expect(t.status).toBe('connected');
    });

    it('updates existing target by id', () => {
      const t = svc.upsertStorageTarget({ name: 'X', type: 'sftp' });
      const u = svc.upsertStorageTarget({ id: t.id, name: 'Y', type: 'sftp' });
      expect(u.name).toBe('Y');
    });

    it('throws without name or type', () => {
      expect(() => svc.upsertStorageTarget({ name: 'X' })).toThrow();
    });
  });

  describe('testStorageTarget', () => {
    it('returns connectivity result', () => {
      const res = svc.testStorageTarget('local');
      expect(res.status).toBe('connected');
      expect(res.latency).toBeGreaterThanOrEqual(0);
    });

    it('throws if not found', () => {
      expect(() => svc.testStorageTarget('nope')).toThrow('Storage target not found');
    });
  });

  describe('removeStorageTarget', () => {
    it('removes non-local target', () => {
      const t = svc.upsertStorageTarget({ name: 'SFTP', type: 'sftp' });
      const res = svc.removeStorageTarget(t.id);
      expect(res.deleted).toBe(true);
    });

    it('cannot remove local target', () => {
      expect(() => svc.removeStorageTarget('local')).toThrow('Cannot remove local storage target');
    });

    it('throws if not found', () => {
      expect(() => svc.removeStorageTarget('nope')).toThrow('Storage target not found');
    });
  });

  /* ════════════════════ Restore ════════════════════ */

  describe('restoreBackup', () => {
    it('creates a restore record', () => {
      const b = svc.createBackup();
      const r = svc.restoreBackup(b.id);
      expect(r.status).toBe('completed');
      expect(r.backupId).toBe(b.id);
    });

    it('supports dryRun', () => {
      const b = svc.createBackup();
      const r = svc.restoreBackup(b.id, { dryRun: true });
      expect(r.status).toBe('dry-run-completed');
    });

    it('throws if backup not found', () => {
      expect(() => svc.restoreBackup('nope')).toThrow('Backup not found');
    });

    it('emits restore:completed event', () => {
      const fn = jest.fn();
      svc.on('restore:completed', fn);
      const b = svc.createBackup();
      svc.restoreBackup(b.id);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('listRestoreHistory', () => {
    it('returns empty initially', () => {
      const res = svc.listRestoreHistory();
      expect(res.total).toBe(0);
    });

    it('returns entries after restore', () => {
      const b = svc.createBackup();
      svc.restoreBackup(b.id);
      svc.restoreBackup(b.id);
      const res = svc.listRestoreHistory();
      expect(res.total).toBe(2);
    });
  });

  /* ════════════════════ Health & Monitoring ════════════════════ */

  describe('getHealthStatus', () => {
    it('returns healthy status with no failures', () => {
      svc.createBackup();
      const h = svc.getHealthStatus();
      expect(h.status).toBe('healthy');
      expect(h.healthScore).toBe(100);
      expect(h.totalBackups).toBe(1);
    });

    it('reports formatting helpers', () => {
      svc.createBackup();
      const h = svc.getHealthStatus();
      expect(h.totalSizeFormatted).toBeTruthy();
      expect(h.avgDurationFormatted).toBeTruthy();
    });

    it('returns nextScheduledBackup info', () => {
      const h = svc.getHealthStatus();
      expect(h.nextScheduledBackup).not.toBeNull();
      expect(h.nextScheduledBackup).toHaveProperty('scheduleId');
    });
  });

  describe('getAnalytics', () => {
    it('returns analytics with no data', () => {
      const a = svc.getAnalytics();
      expect(a.totalBackups).toBe(0);
      expect(a.successRate).toBe(0);
      expect(a.dailyBreakdown).toBeInstanceOf(Array);
    });

    it('returns analytics with data', () => {
      svc.createBackup({ type: 'full' });
      svc.createBackup({ type: 'mongodb' });
      const a = svc.getAnalytics();
      expect(a.totalBackups).toBe(2);
      expect(a.successRate).toBe(100);
      expect(a.byType).toHaveProperty('full', 1);
      expect(a.byType).toHaveProperty('mongodb', 1);
    });
  });

  /* ════════════════════ Retention Cleanup ════════════════════ */

  describe('runRetentionCleanup', () => {
    it('removes old backups beyond retention', () => {
      // Create old backup
      const b = svc.createBackup();
      b.createdAt = new Date(Date.now() - 30 * 86400000); // 30 days ago
      const res = svc.runRetentionCleanup();
      expect(res.removed).toBe(1);
      expect(res.remaining).toBe(0);
    });

    it('enforces maxBackups limit', () => {
      for (let i = 0; i < 15; i++) svc.createBackup();
      const res = svc.runRetentionCleanup();
      expect(res.remaining).toBeLessThanOrEqual(10);
    });
  });

  /* ════════════════════ Verify Backup ════════════════════ */

  describe('verifyBackup', () => {
    it('returns valid verification', () => {
      const b = svc.createBackup();
      const v = svc.verifyBackup(b.id);
      expect(v.status).toBe('valid');
      expect(v.checksumMatch).toBe(true);
      expect(v.expectedChecksum).toBe(b.checksum);
    });

    it('throws if not found', () => {
      expect(() => svc.verifyBackup('nope')).toThrow('Backup not found');
    });
  });

  /* ════════════════════ Config ════════════════════ */

  describe('getConfig / updateConfig', () => {
    it('returns current config', () => {
      const c = svc.getConfig();
      expect(c.retentionDays).toBe(7);
      expect(c.maxBackups).toBe(10);
    });

    it('updates allowed config keys', () => {
      const c = svc.updateConfig({ retentionDays: 60, maxBackups: 200 });
      expect(c.retentionDays).toBe(60);
      expect(c.maxBackups).toBe(200);
    });

    it('ignores unknown keys', () => {
      svc.updateConfig({ unknownKey: 'x' });
      expect(svc.config.unknownKey).toBeUndefined();
    });

    it('re-initializes schedules when schedule config changes', () => {
      svc.updateConfig({ dailySchedule: '30 3 * * *' });
      const { schedules } = svc.listSchedules();
      const daily = schedules.find(s => s.id === 'daily-mongo');
      expect(daily.cron).toBe('30 3 * * *');
    });
  });

  /* ════════════════════ Private Helpers ════════════════════ */

  describe('_formatSize', () => {
    it('formats 0 bytes', () => {
      expect(svc._formatSize(0)).toBe('0 B');
    });

    it('formats MB', () => {
      const result = svc._formatSize(1048576);
      expect(result).toBe('1.00 MB');
    });
  });

  describe('_formatDuration', () => {
    it('formats ms', () => {
      expect(svc._formatDuration(500)).toBe('500ms');
    });

    it('formats seconds', () => {
      expect(svc._formatDuration(5000)).toBe('5s');
    });

    it('formats minutes', () => {
      expect(svc._formatDuration(125000)).toBe('2m 5s');
    });
  });
});
