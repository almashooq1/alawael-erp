'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../services/ops-alerter', () => ({ sendOpsAlert: jest.fn() }));

const mockFs = {
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
};
jest.mock('fs', () => mockFs);

describe('scripts/dr-verify', () => {
  let mod;

  beforeEach(() => {
    jest.resetModules();
    mockFs.existsSync.mockReset();
    mockFs.readdirSync.mockReset();
    mockFs.statSync.mockReset();
    mod = require('../../scripts/dr-verify');
  });

  describe('findLatestBackup', () => {
    test('returns null when neither dir exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(mod.findLatestBackup()).toBeNull();
    });

    test('picks the most recent archive across both dirs', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(dir => {
        if (dir.includes('mongodb')) return ['backup_full_2026-01-01']; // dir-style
        return ['mongodb-backup-2026-04-01.gz', 'mongodb-backup-2026-05-01.gz']; // archive-style
      });
      mockFs.statSync.mockImplementation(p => {
        if (p.includes('2026-05-01')) return { isDirectory: () => false, mtimeMs: 5e12, size: 100 };
        if (p.includes('2026-04-01')) return { isDirectory: () => false, mtimeMs: 4e12, size: 90 };
        return { isDirectory: () => true, mtimeMs: 3e12, size: 0 };
      });

      const latest = mod.findLatestBackup();
      expect(latest).toBeTruthy();
      expect(latest.kind).toBe('archive');
      expect(latest.path).toContain('2026-05-01');
    });

    test('recognizes directory-style dumps', () => {
      mockFs.existsSync.mockImplementation(p => p.includes('mongodb'));
      mockFs.readdirSync.mockReturnValue(['backup_full_2026-04-01']);
      mockFs.statSync.mockReturnValue({ isDirectory: () => true, mtimeMs: 1e12, size: 0 });

      const latest = mod.findLatestBackup();
      expect(latest.kind).toBe('dir');
    });

    test('marks .gz.enc archives as archive-encrypted kind', () => {
      mockFs.existsSync.mockImplementation(p => !p.includes('mongodb'));
      mockFs.readdirSync.mockReturnValue(['mongodb-backup-2026-05-02.gz.enc']);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
        mtimeMs: Date.now(),
        size: 4096,
      });

      const latest = mod.findLatestBackup();
      expect(latest.kind).toBe('archive-encrypted');
      expect(latest.path).toContain('.gz.enc');
    });
  });

  describe('CRITICAL_COLLECTIONS', () => {
    test('includes the must-have collections', () => {
      const names = mod.CRITICAL_COLLECTIONS.map(c => c.name);
      expect(names).toEqual(
        expect.arrayContaining(['users', 'beneficiaries', 'branches', 'roles'])
      );
    });

    test('users has min >= 1 (cluster cannot work with zero users)', () => {
      const users = mod.CRITICAL_COLLECTIONS.find(c => c.name === 'users');
      expect(users.min).toBeGreaterThanOrEqual(1);
    });
  });

  describe('runVerification', () => {
    test('reports no_backup_found when no backups exist', async () => {
      // mongorestore check passes (or fails — either way no_backup_found wins
      // because findLatestBackup runs after the tool check). Fake tool present
      // by mocking child_process.execSync to no-op.
      jest.resetModules();
      jest.doMock('child_process', () => ({
        execFile: jest.fn(),
        execSync: jest.fn(),
      }));
      jest.doMock('fs', () => ({
        ...mockFs,
        existsSync: jest.fn(() => false),
      }));
      const fresh = require('../../scripts/dr-verify');

      const report = await fresh.runVerification({ dryRun: true });
      expect(report.success).toBe(false);
      expect(report.error).toBe('no_backup_found');
    });

    test('flags stale backup (>36h) before attempting restore', async () => {
      jest.resetModules();
      jest.doMock('child_process', () => ({
        execFile: jest.fn(),
        execSync: jest.fn(),
      }));
      const oldMtime = Date.now() - 48 * 3600 * 1000;
      jest.doMock('fs', () => ({
        existsSync: jest.fn(() => true),
        readdirSync: jest.fn(() => ['mongodb-backup-old.gz']),
        statSync: jest.fn(() => ({ isDirectory: () => false, mtimeMs: oldMtime, size: 100 })),
      }));
      const fresh = require('../../scripts/dr-verify');

      const report = await fresh.runVerification({ dryRun: true });
      expect(report.success).toBe(false);
      expect(report.error).toMatch(/backup_stale/);
      expect(report.backup).toBeTruthy();
    });

    test('dry-run on healthy backup returns success without restoring', async () => {
      jest.resetModules();
      jest.doMock('child_process', () => ({
        execFile: jest.fn(),
        execSync: jest.fn(),
      }));
      const fresh = Date.now() - 60 * 1000;
      jest.doMock('fs', () => ({
        existsSync: jest.fn(() => true),
        readdirSync: jest.fn(() => ['mongodb-backup-fresh.gz']),
        statSync: jest.fn(() => ({ isDirectory: () => false, mtimeMs: fresh, size: 1024 })),
      }));
      const m = require('../../scripts/dr-verify');

      const report = await m.runVerification({ dryRun: true });
      expect(report.success).toBe(true);
      expect(report.restored).toBe(false);
      expect(report.backup.path).toContain('mongodb-backup-fresh.gz');
    });
  });
});
