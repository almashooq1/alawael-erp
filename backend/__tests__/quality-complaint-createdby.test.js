'use strict';

/**
 * quality-complaint-createdby.test.js
 *
 * routes/quality-enhanced.routes.js POST /complaints called
 * `svc.createComplaint(req.body, req.user._id)`, but the service was
 * `createComplaint(data)` — it DROPPED the 2nd arg, so the authenticated user who
 * entered the complaint was never recorded (and the Complaint schema had no
 * submitter field at all — only the complainant, which is client-supplied). For a
 * compliance/quality system that's a missing audit trail.
 *
 * Fix: add a server-set `createdBy` field + use the already-passed arg. Static: the
 * method accepts createdBy and the schema declares it. Behavioral: createdBy is
 * recorded, and it is server-authoritative (a client-supplied createdBy can't override).
 */

const fs = require('fs');
const path = require('path');

describe('quality complaint createdBy (static)', () => {
  const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  test('the service accepts + writes createdBy; the schema declares it; the route passes req.user._id', () => {
    const svc = read('services/quality/quality-enhanced.service.js');
    expect(svc).toMatch(/async createComplaint\(\s*data\s*,\s*createdBy/);
    expect(svc).toMatch(/createdBy \? \{ createdBy \} : \{\}/);
    expect(read('models/quality/Complaint.model.js')).toMatch(/createdBy:\s*\{[^}]*ref:\s*'User'/);
    expect(read('routes/quality-enhanced.routes.js')).toMatch(/createComplaint\(req\.body,\s*req\.user\._id\)/);
  });
});

describe('quality complaint createdBy (behavioral)', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let mongod;
  let svc;

  beforeAll(async () => {
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'quality-complaint' } });
    await mongoose.connect(mongod.getUri());
    svc = require('../services/quality/quality-enhanced.service');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  const base = () => ({
    complainantName: 'أحمد',
    description: 'شكوى تجريبية',
    category: 'service_quality',
    source: 'external',
    branchId: new mongoose.Types.ObjectId(),
  });

  test('records the submitting user as createdBy', async () => {
    const user = new mongoose.Types.ObjectId();
    const c = await svc.createComplaint({ ...base(), priority: 'high' }, user);
    expect(String(c.createdBy)).toBe(String(user));
    expect(c.complaintNumber).toMatch(/^CMP-/);
    expect(c.status).toBe('open');
  });

  test('createdBy is server-authoritative — a client-supplied createdBy cannot override it', async () => {
    const realUser = new mongoose.Types.ObjectId();
    const forged = new mongoose.Types.ObjectId();
    const c = await svc.createComplaint({ ...base(), priority: 'low', createdBy: forged }, realUser);
    expect(String(c.createdBy)).toBe(String(realUser)); // not the forged one
  });
});
