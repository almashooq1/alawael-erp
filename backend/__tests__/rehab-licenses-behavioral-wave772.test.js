'use strict';

/**
 * rehab-licenses-behavioral-wave772.test.js — W772 behavioral guard.
 * Asserts rehab license CRUD persists via License + rehabLicenses.service.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const svc = require('../services/rehabLicenses.service');

let mongod;
let License;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w772-rehab-licenses' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  delete mongoose.models.License;
  License = require('../models/License/License');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await License.deleteMany({ entityType: svc.ENTITY_TYPE });
});

describe('W772 behavioral — rehab licenses service', () => {
  it('creates and lists a rehab_center_license document', async () => {
    const created = await svc.create(
      {
        name: 'ترخيص مركز الأمل',
        licenseNumber: 'MOH-2026-001',
        licenseType: 'disability_center',
        category: 'government_license',
        expiryDate: new Date('2027-06-01'),
        status: 'active',
      },
      new mongoose.Types.ObjectId()
    );
    expect(created.entityType).toBe('rehab_center_license');
    expect(created.licenseNumber).toBe('MOH-2026-001');

    const { data, pagination } = await svc.list({ page: 1, limit: 10 });
    expect(data).toHaveLength(1);
    expect(pagination.total).toBe(1);
    expect(data[0].licenseTypeLabel).toMatch(/تأهيل/);
  });

  it('dashboard reflects active vs expired counts', async () => {
    await svc.create(
      {
        name: 'نشط',
        licenseNumber: 'A-1',
        expiryDate: new Date('2030-01-01'),
        status: 'active',
      },
      new mongoose.Types.ObjectId()
    );
    await svc.create(
      {
        name: 'منتهي',
        licenseNumber: 'E-1',
        expiryDate: new Date('2020-01-01'),
        status: 'active',
      },
      new mongoose.Types.ObjectId()
    );
    const dash = await svc.getDashboard();
    expect(dash.total).toBe(2);
    expect(dash.expired).toBeGreaterThanOrEqual(1);
  });

  it('renew pushes renewalHistory and extends expiry', async () => {
    const lic = await svc.create(
      {
        name: 'تجديد',
        licenseNumber: 'R-1',
        expiryDate: new Date('2025-01-01'),
      },
      new mongoose.Types.ObjectId()
    );
    const renewed = await svc.renew(
      lic._id,
      { newExpiryDate: '2028-12-31', notes: 'تجديد سنوي' },
      new mongoose.Types.ObjectId()
    );
    expect(new Date(renewed.expiryDate).getFullYear()).toBe(2028);
    expect(renewed.renewalHistory.length).toBeGreaterThanOrEqual(1);
  });

  it('pushEmbedded persists notes on the license document', async () => {
    const lic = await svc.create(
      { name: 'ملاحظات', licenseNumber: 'N-1' },
      new mongoose.Types.ObjectId()
    );
    await svc.pushEmbedded(lic._id, 'notes', {
      content: 'متابعة وزارة الصحة',
      category: 'compliance',
    });
    const again = await svc.getById(lic._id);
    expect(again.notes).toHaveLength(1);
    expect(again.notes[0].content).toBe('متابعة وزارة الصحة');
  });
});
