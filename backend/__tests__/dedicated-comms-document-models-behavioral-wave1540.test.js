/**
 * W1540 behavioral — proves the exact route writes that used to throw a Mongoose
 * ValidationError (HTTP 500) against the canonical Communication/Document models
 * now PERSIST against the dedicated models, and that the stats/list reads match.
 *
 * Static counterpart: dedicated-comms-document-models-wave1540.test.js
 * (the repo doctrine: pair every static drift guard with a behavioral one —
 *  static catches source shape, only a real .create() catches enum/required drift).
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CommunicationRecord;
let ElectronicDirective;
let StudentCertificate;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1540-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  CommunicationRecord = require('../models/CommunicationRecord');
  ElectronicDirective = require('../models/ElectronicDirective');
  StudentCertificate = require('../models/StudentCertificate');
  await Promise.all([
    CommunicationRecord.init(),
    ElectronicDirective.init(),
    StudentCertificate.init(),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Promise.all([
    CommunicationRecord.deleteMany({}),
    ElectronicDirective.deleteMany({}),
    StudentCertificate.deleteMany({}),
  ]);
});

const oid = () => new mongoose.Types.ObjectId();

describe('W1540 behavioral — CommunicationRecord accepts the complaint/email writes', () => {
  it('persists a complaint (channel=complaint, status=open) — was a 500 on Communication', async () => {
    const branchId = oid();
    const doc = await CommunicationRecord.create({
      channel: 'complaint',
      branchId,
      category: 'service_quality',
      subject: 'late session',
      body: 'the session started 30 minutes late',
      priority: 'medium',
      status: 'open',
      direction: 'inbound',
      sender: { userId: oid(), name: 'Guardian' },
      notes: [],
    });
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('open');
    expect(doc.channel).toBe('complaint');

    // The stats query the route runs must now find it.
    const open = await CommunicationRecord.countDocuments({
      branchId,
      channel: 'complaint',
      status: 'open',
    });
    expect(open).toBe(1);
  });

  it('persists a sent email (channel=email, direction=outbound, status=sent)', async () => {
    const doc = await CommunicationRecord.create({
      channel: 'email',
      direction: 'outbound',
      branchId: oid(),
      sender: { userId: oid(), email: 'a@x.com', name: 'Staff' },
      recipient: { email: 'b@y.com' },
      subject: 'report',
      body: 'attached',
      status: 'sent',
      sentAt: new Date(),
      sentBy: oid(),
    });
    expect(doc.status).toBe('sent');
    expect(doc.direction).toBe('outbound');
  });

  it('rejects an out-of-vocabulary status (enum still enforced)', async () => {
    await expect(
      CommunicationRecord.create({ channel: 'complaint', status: 'not_a_status' })
    ).rejects.toThrow(/status/);
  });
});

describe('W1540 behavioral — ElectronicDirective lifecycle persists', () => {
  it('creates a draft directive (was a 500 on Document)', async () => {
    const doc = await ElectronicDirective.create({
      category: 'directive',
      directiveType: 'advance_care',
      beneficiaryId: oid(),
      title: 'Advance care directive',
      content: 'do not resuscitate',
      status: 'draft',
      signatureStatus: 'pending_creation',
      branchId: oid(),
      createdBy: oid(),
      auditTrail: [{ action: 'created', performedBy: oid(), performedAt: new Date() }],
    });
    expect(doc.status).toBe('draft');
    expect(doc.category).toBe('directive');
    expect(doc.auditTrail).toHaveLength(1);
  });

  it('advances to awaiting_signature then active', async () => {
    const d = await ElectronicDirective.create({ title: 'x', beneficiaryId: oid() });
    d.status = 'awaiting_signature';
    await d.save();
    d.status = 'active';
    await d.save();
    const fresh = await ElectronicDirective.findById(d._id).lean();
    expect(fresh.status).toBe('active');
  });
});

describe('W1540 behavioral — StudentCertificate issuance persists + verifies', () => {
  it('issues a certificate with a unique verification code', async () => {
    const code = 'ABCD1234EF';
    const doc = await StudentCertificate.create({
      category: 'certificate',
      beneficiaryId: oid(),
      certificateType: 'completion',
      status: 'issued',
      verificationCode: code,
      branchId: oid(),
      issuedAt: new Date(),
      issuedBy: oid(),
      title: 'completion Certificate',
    });
    expect(doc.status).toBe('issued');

    // The public verify query must find it by code across branches.
    const found = await StudentCertificate.findOne({
      verificationCode: code,
      category: 'certificate',
    }).lean();
    expect(found).not.toBeNull();
    expect(String(found._id)).toBe(String(doc._id));
  });

  it('enforces verificationCode uniqueness', async () => {
    const code = 'DUP0000001';
    await StudentCertificate.create({ certificateType: 'attendance', verificationCode: code });
    await expect(
      StudentCertificate.create({ certificateType: 'attendance', verificationCode: code })
    ).rejects.toThrow();
  });
});
