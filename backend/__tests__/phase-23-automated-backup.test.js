/**
 * AL-AWAEL ERP — Phase 23: Automated Backup System Tests
 * نظام النسخ الاحتياطي التلقائي
 *
 * 58 tests covering service + routes
 */

const request = require('supertest');
const express = require('express');

/* ── mock auth middleware ──────────────────────────────────────────────── */
jest.mock('../middleware/auth', () => ({
  authenticate: (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

/* ── bootstrap ────────────────────────────────────────────────────────── */
let app, AutomatedBackupService;

beforeAll(() => {
  AutomatedBackupService = require('../services/automated-backup.service');

  app = express();
  app.use(express.json());

  // mount routes
  const backupRoutes = require('../routes/automated-backup.routes');
  app.use('/api/automated-backup', backupRoutes);
});

/* ══════════════════════════════════════════════════════════════════════
   SERVICE UNIT TESTS
   ══════════════════════════════════════════════════════════════════════ */
describe('Phase 23 — AutomatedBackupService', () => {
  let svc;

  beforeEach(() => {
    svc = new AutomatedBackupService({ retentionDays: 10, maxBackups: 5 });
  });

  /* ── Construction ── */
  test('constructor sets default config', () => {
    expect(svc.config.retentionDays).toBe(10);
    expect(svc.config.maxBackups).toBe(5);
    expect(svc.config.compressionEnabled).toBe(true);
  });

  test('initialises default schedules', () => {
    expect(svc.schedules.length).toBe(3);
    expect(svc.schedules[0].id).toBe('daily-mongo');
  });

  test('initialises local storage target', () => {
    expect(svc.storageTargets.length).toBeGreaterThanOrEqual(1);
    expect(svc.storageTargets[0].type).toBe('local');
  });

  /* ── Backups ── */
  test('createBackup returns a backup object', () => {
    const b = svc.createBackup({ type: 'full', description: 'Test' });
    expect(b).toHaveProperty('id');
    expect(b.type).toBe('full');
    expect(b.status).toBe('completed');
    expect(b.checksum).toBeTruthy();
  });

  test('createBackup adds to backups list', () => {
    svc.createBackup();
    svc.createBackup();
    expect(svc.backups.length).toBe(2);
  });

  test('listBackups returns paginated results', () => {
    svc.createBackup();
    svc.createBackup();
    svc.createBackup();
    const res = svc.listBackups({ limit: 2 });
    expect(res.total).toBe(3);
    expect(res.count).toBe(2);
  });

  test('listBackups filters by type', () => {
    svc.createBackup({ type: 'full' });
    svc.createBackup({ type: 'mongodb' });
    const res = svc.listBackups({ type: 'mongodb' });
    expect(res.total).toBe(1);
  });

  test('getBackup finds by id', () => {
    const b = svc.createBackup();
    const found = svc.getBackup(b.id);
    expect(found.id).toBe(b.id);
  });

  test('getBackup throws for unknown id', () => {
    expect(() => svc.getBackup('nope')).toThrow('Backup not found');
  });

  test('deleteBackup removes backup', () => {
    const b = svc.createBackup();
    const res = svc.deleteBackup(b.id);
    expect(res.deleted).toBe(true);
    expect(svc.backups.length).toBe(0);
  });

  test('deleteBackup throws for unknown id', () => {
    expect(() => svc.deleteBackup('nope')).toThrow('Backup not found');
  });

  test('verifyBackup returns valid result', () => {
    const b = svc.createBackup();
    const v = svc.verifyBackup(b.id);
    expect(v.status).toBe('valid');
    expect(v.checksumMatch).toBe(true);
  });

  /* ── Schedules ── */
  test('upsertSchedule creates new schedule', () => {
    const s = svc.upsertSchedule({ name: 'Test', type: 'full', cron: '0 5 * * *' });
    expect(s).toHaveProperty('id');
    expect(svc.schedules.length).toBe(4);
  });

  test('upsertSchedule updates existing schedule', () => {
    const s = svc.upsertSchedule({ id: 'daily-mongo', name: 'Updated', type: 'mongodb', cron: '0 1 * * *' });
    expect(s.name).toBe('Updated');
    expect(svc.schedules.length).toBe(3);
  });

  test('upsertSchedule requires name/type/cron', () => {
    expect(() => svc.upsertSchedule({})).toThrow();
  });

  test('toggleSchedule disables schedule', () => {
    const s = svc.toggleSchedule('daily-mongo', false);
    expect(s.enabled).toBe(false);
    expect(s.status).toBe('paused');
  });

  test('toggleSchedule throws for unknown', () => {
    expect(() => svc.toggleSchedule('nope', true)).toThrow();
  });

  test('deleteSchedule removes schedule', () => {
    svc.deleteSchedule('monthly-archive');
    expect(svc.schedules.length).toBe(2);
  });

  test('listSchedules returns all', () => {
    const res = svc.listSchedules();
    expect(res.total).toBe(3);
  });

  /* ── Storage Targets ── */
  test('upsertStorageTarget adds new target', () => {
    const t = svc.upsertStorageTarget({ name: 'S3', type: 's3', bucket: 'test' });
    expect(t.type).toBe('s3');
    expect(svc.storageTargets.length).toBeGreaterThanOrEqual(2);
  });

  test('upsertStorageTarget requires name and type', () => {
    expect(() => svc.upsertStorageTarget({})).toThrow();
  });

  test('testStorageTarget returns connected', () => {
    const res = svc.testStorageTarget('local');
    expect(res.status).toBe('connected');
  });

  test('removeStorageTarget prevents removing local', () => {
    expect(() => svc.removeStorageTarget('local')).toThrow('Cannot remove local');
  });

  test('removeStorageTarget removes non-local', () => {
    svc.upsertStorageTarget({ id: 's3x', name: 'S3X', type: 's3' });
    const r = svc.removeStorageTarget('s3x');
    expect(r.deleted).toBe(true);
  });

  /* ── Restore ── */
  test('restoreBackup creates restore record', () => {
    const b = svc.createBackup();
    const r = svc.restoreBackup(b.id);
    expect(r.status).toBe('completed');
    expect(svc.restoreHistory.length).toBe(1);
  });

  test('restoreBackup dry-run mode', () => {
    const b = svc.createBackup();
    const r = svc.restoreBackup(b.id, { dryRun: true });
    expect(r.status).toBe('dry-run-completed');
  });

  test('restoreBackup throws for unknown', () => {
    expect(() => svc.restoreBackup('nope')).toThrow('Backup not found');
  });

  test('listRestoreHistory returns records', () => {
    const b = svc.createBackup();
    svc.restoreBackup(b.id);
    const res = svc.listRestoreHistory();
    expect(res.total).toBe(1);
  });

  /* ── Health ── */
  test('getHealthStatus returns health object', () => {
    const h = svc.getHealthStatus();
    expect(h).toHaveProperty('status');
    expect(h).toHaveProperty('healthScore');
    expect(h).toHaveProperty('totalBackups');
    expect(h).toHaveProperty('activeSchedules');
  });

  test('healthScore is 100 when no failures', () => {
    svc.createBackup();
    const h = svc.getHealthStatus();
    expect(h.healthScore).toBe(100);
  });

  /* ── Analytics ── */
  test('getAnalytics returns period data', () => {
    svc.createBackup({ type: 'full' });
    svc.createBackup({ type: 'mongodb' });
    const a = svc.getAnalytics({ days: 7 });
    expect(a.totalBackups).toBe(2);
    expect(a).toHaveProperty('byType');
    expect(a).toHaveProperty('successRate');
  });

  /* ── Retention ── */
  test('runRetentionCleanup enforces maxBackups', () => {
    for (let i = 0; i < 8; i++) svc.createBackup();
    expect(svc.backups.length).toBe(8);
    const r = svc.runRetentionCleanup();
    expect(r.remaining).toBeLessThanOrEqual(5);
  });

  /* ── Config ── */
  test('getConfig returns current config', () => {
    const c = svc.getConfig();
    expect(c.retentionDays).toBe(10);
    expect(c).toHaveProperty('s3Bucket');
  });

  test('updateConfig updates allowed fields', () => {
    const c = svc.updateConfig({ retentionDays: 60, maxBackups: 200, hackField: 'x' });
    expect(c.retentionDays).toBe(60);
    expect(c.maxBackups).toBe(200);
  });
});

/* ══════════════════════════════════════════════════════════════════════
   API ROUTE INTEGRATION TESTS
   ══════════════════════════════════════════════════════════════════════ */
describe('Phase 23 — Automated Backup API Routes', () => {
  let createdId;

  /* ── Backup CRUD ── */
  test('POST /api/automated-backup creates backup', async () => {
    const res = await request(app)
      .post('/api/automated-backup')
      .send({ type: 'full', description: 'API test' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    createdId = res.body.data.id;
  });

  test('GET /api/automated-backup lists backups', async () => {
    const res = await request(app).get('/api/automated-backup');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.backups)).toBe(true);
  });

  test('GET /api/automated-backup/:id returns detail', async () => {
    const res = await request(app).get(`/api/automated-backup/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdId);
  });

  test('POST /api/automated-backup/:id/verify verifies', async () => {
    const res = await request(app).post(`/api/automated-backup/${createdId}/verify`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('valid');
  });

  test('DELETE /api/automated-backup/:id deletes', async () => {
    // Create a new one to delete
    const c = await request(app).post('/api/automated-backup').send({ type: 'mongodb' });
    const id = c.body.data.id;
    const res = await request(app).delete(`/api/automated-backup/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  /* ── Schedules ── */
  test('GET /api/automated-backup/schedules/list returns schedules', async () => {
    const res = await request(app).get('/api/automated-backup/schedules/list');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.schedules)).toBe(true);
  });

  test('POST /api/automated-backup/schedules creates schedule', async () => {
    const res = await request(app)
      .post('/api/automated-backup/schedules')
      .send({ name: 'Custom', type: 'full', cron: '0 6 * * *' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Custom');
  });

  test('PUT /api/automated-backup/schedules/:id/toggle toggles', async () => {
    const res = await request(app)
      .put('/api/automated-backup/schedules/daily-mongo/toggle')
      .send({ enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
  });

  /* ── Storage Targets ── */
  test('GET /api/automated-backup/storage/targets lists targets', async () => {
    const res = await request(app).get('/api/automated-backup/storage/targets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.targets)).toBe(true);
  });

  test('POST /api/automated-backup/storage/targets adds target', async () => {
    const res = await request(app)
      .post('/api/automated-backup/storage/targets')
      .send({ name: 'GCS Bucket', type: 'gcs', bucket: 'my-bucket' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('gcs');
  });

  test('POST /api/automated-backup/storage/targets/:id/test tests connectivity', async () => {
    const res = await request(app).post('/api/automated-backup/storage/targets/local/test');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('connected');
  });

  /* ── Restore ── */
  test('POST /api/automated-backup/restore/:id restores', async () => {
    const res = await request(app)
      .post(`/api/automated-backup/restore/${createdId}`)
      .send({ dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('dry-run-completed');
  });

  test('GET /api/automated-backup/restore/history lists restores', async () => {
    const res = await request(app).get('/api/automated-backup/restore/history');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
  });

  /* ── Health & Analytics ── */
  test('GET /api/automated-backup/health returns health', async () => {
    const res = await request(app).get('/api/automated-backup/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('healthScore');
  });

  test('GET /api/automated-backup/analytics returns analytics', async () => {
    const res = await request(app).get('/api/automated-backup/analytics');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalBackups');
  });

  test('POST /api/automated-backup/cleanup runs cleanup', async () => {
    const res = await request(app).post('/api/automated-backup/cleanup');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('remaining');
  });

  /* ── Config ── */
  test('GET /api/automated-backup/config returns config', async () => {
    const res = await request(app).get('/api/automated-backup/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('retentionDays');
  });

  test('PUT /api/automated-backup/config updates config', async () => {
    const res = await request(app)
      .put('/api/automated-backup/config')
      .send({ retentionDays: 90 });
    expect(res.status).toBe(200);
    expect(res.body.data.retentionDays).toBe(90);
  });
});
