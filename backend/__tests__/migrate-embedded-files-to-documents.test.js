/**
 * Migration smoke test: ensure migrate-embedded-files-to-documents.js
 * creates Document records and links them to CaseManagement / Payment.
 *
 * Uses the real mongoose + mongodb-memory-server, bypassing jest.setup.js's
 * mongoose mock.
 */
const realMongoose = jest.requireActual('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.setTimeout(60000);
jest.unmock('mongoose');

describe('migrate-embedded-files-to-documents', () => {
  let mongod;
  let uri;
  let uploadDir;
  let caseId;
  let paymentId;
  let originalMongodbUri;

  beforeAll(async () => {
    originalMongodbUri = process.env.MONGODB_URI;
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('alawael_test');
    process.env.MONGODB_URI = uri;

    // Prepare test DB with legacy records using the REAL mongoose
    await realMongoose.connect(uri);

    const CaseManagement = require('../models/CaseManagement');
    const Payment = require('../models/Payment');

    // Create a temporary upload dir with one real file
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-test-'));
    const filePath = path.join(uploadDir, 'report.pdf');
    fs.writeFileSync(filePath, '%PDF-1.4 test content');

    const c = await CaseManagement.create({
      caseNumber: 'C-001',
      beneficiary: { name: 'Test Beneficiary' },
      medicalFiles: [
        {
          fileName: 'report.pdf',
          fileType: 'تقرير طبي',
          fileUrl: '/uploads/migrate-test/report.pdf',
          mimeType: 'application/pdf',
        },
      ],
    });
    caseId = String(c._id);

    const p = await Payment.create({
      amount: 100,
      invoiceId: new realMongoose.Types.ObjectId(),
      reference: 'PAY-001',
      paymentDate: new Date(),
      paymentMethod: 'cash',
      processedBy: new realMongoose.Types.ObjectId(),
      attachments: [
        {
          name: 'report.pdf',
          url: '/uploads/migrate-test/report.pdf',
        },
      ],
    });
    paymentId = String(p._id);

    await realMongoose.disconnect();

    // Create the expected absolute path location used by resolveFilePath.
    // resolveFilePath resolves /uploads/... relative to this test's backend root.
    const legacyDir = path.join(__dirname, '..', 'uploads', 'migrate-test');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.copyFileSync(filePath, path.join(legacyDir, 'report.pdf'));
  });

  afterAll(async () => {
    process.env.MONGODB_URI = originalMongodbUri;
    await mongod.stop();
    try {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    } catch {}
    try {
      fs.rmSync(path.join(__dirname, '..', 'uploads', 'migrate-test'), {
        recursive: true,
        force: true,
      });
    } catch {}
  });

  it('migrates embedded files to Document records', async () => {
    // Clear module cache so the migration script picks up the real mongoose
    delete require.cache[require.resolve('../scripts/migrate-embedded-files-to-documents')];
    delete require.cache[require.resolve('mongoose')];
    const { main } = require('../scripts/migrate-embedded-files-to-documents');

    await main();

    // Verify DB state using the real mongoose
    await realMongoose.connect(uri);
    const Document = require('../models/Document');
    const CaseManagement = require('../models/CaseManagement');
    const Payment = require('../models/Payment');

    const docs = await Document.find({}).lean();
    expect(docs.length).toBeGreaterThanOrEqual(1);

    const caseDoc = await CaseManagement.findById(caseId).lean();
    expect(caseDoc.medicalFiles[0].documentId).toBeDefined();
    expect(caseDoc.medicalFiles[0].fileUrl).toMatch(/\/api\/v1\/documents\/.+\/download/);

    const paymentDoc = await Payment.findById(paymentId).lean();
    expect(paymentDoc.attachments[0].documentId).toBeDefined();
    expect(paymentDoc.attachmentIds.length).toBeGreaterThanOrEqual(1);

    await realMongoose.disconnect();
  });
});
