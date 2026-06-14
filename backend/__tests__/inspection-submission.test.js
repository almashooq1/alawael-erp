'use strict';

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const {
  createInspectionSubmissionService,
} = require('../services/quality/inspectionSubmission.service');

let ownServer = null;
let InspectionSubmission;
const inspector = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'insp-test', serverSelectionTimeoutMS: 10000 });
  InspectionSubmission = require('../models/quality/InspectionSubmission.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await InspectionSubmission.deleteMany({});
});

describe('InspectionSubmissionService.submit', () => {
  test('creates submission with auto-number + computed score', async () => {
    const svc = createInspectionSubmissionService({ model: InspectionSubmission });
    const { submission } = await svc.submit(
      {
        clientUuid: 'uuid-1234',
        inspectionType: 'hand_hygiene',
        title: 'Morning ward round',
        capturedAt: '2026-05-15T08:00:00Z',
        items: [
          { itemCode: 'wash', answer: 'pass' },
          { itemCode: 'sanitiser', answer: 'pass' },
          { itemCode: 'gloves', answer: 'fail' },
          { itemCode: 'mask', answer: 'n/a' },
        ],
      },
      inspector
    );
    expect(submission.submissionNumber).toMatch(/^INS-\d{4}-\d{4}$/);
    expect(submission.overallScore).toBeCloseTo(66.67, 1);
    expect(submission.overallOutcome).toBe('fail'); // 2/3 = 66.67% < 75
  });

  test('idempotent — duplicate clientUuid returns existing record', async () => {
    const svc = createInspectionSubmissionService({ model: InspectionSubmission });
    await svc.submit(
      { clientUuid: 'uuid-dup', inspectionType: 'env', title: 't', capturedAt: '2026-05-15' },
      inspector
    );
    const second = await svc.submit(
      { clientUuid: 'uuid-dup', inspectionType: 'env', title: 't', capturedAt: '2026-05-15' },
      inspector
    );
    expect(second.duplicate).toBe(true);
    expect(await InspectionSubmission.countDocuments({})).toBe(1);
  });

  test('pass score = 100% when all items pass', async () => {
    const svc = createInspectionSubmissionService({ model: InspectionSubmission });
    const { submission } = await svc.submit(
      {
        clientUuid: 'uuid-pass',
        inspectionType: 'env',
        title: 't',
        capturedAt: '2026-05-15',
        items: [
          { itemCode: 'a', answer: 'pass' },
          { itemCode: 'b', answer: 'pass' },
          { itemCode: 'c', answer: 'pass' },
        ],
      },
      inspector
    );
    expect(submission.overallScore).toBe(100);
    expect(submission.overallOutcome).toBe('pass');
  });

  test('pass_with_actions when score ≥75 but has any fails', async () => {
    const svc = createInspectionSubmissionService({ model: InspectionSubmission });
    const { submission } = await svc.submit(
      {
        clientUuid: 'uuid-pwa',
        inspectionType: 'env',
        title: 't',
        capturedAt: '2026-05-15',
        items: [
          { itemCode: 'a', answer: 'pass' },
          { itemCode: 'b', answer: 'pass' },
          { itemCode: 'c', answer: 'pass' },
          { itemCode: 'd', answer: 'fail' },
        ],
      },
      inspector
    );
    expect(submission.overallScore).toBe(75);
    expect(submission.overallOutcome).toBe('pass_with_actions');
  });

  test('fires fail event when outcome = fail', async () => {
    const events = [];
    const dispatcher = {
      async emit(name, payload) {
        events.push({ name, payload });
      },
    };
    const svc = createInspectionSubmissionService({ model: InspectionSubmission, dispatcher });
    await svc.submit(
      {
        clientUuid: 'uuid-fail',
        inspectionType: 'env',
        title: 't',
        capturedAt: '2026-05-15',
        items: [
          { itemCode: 'a', answer: 'fail' },
          { itemCode: 'b', answer: 'fail' },
        ],
      },
      inspector
    );
    expect(events.find(e => e.name === 'quality.inspection.fail_detected')).toBeTruthy();
  });

  test('rejects when required fields missing', async () => {
    const svc = createInspectionSubmissionService({ model: InspectionSubmission });
    await expect(svc.submit({}, inspector)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('InspectionSubmissionService.bulkSubmit', () => {
  test('processes a queue of submissions, idempotent + tolerant', async () => {
    const svc = createInspectionSubmissionService({ model: InspectionSubmission });
    const results = await svc.bulkSubmit(
      [
        { clientUuid: 'u1', inspectionType: 'env', title: 't', capturedAt: '2026-05-15' },
        { clientUuid: 'u1', inspectionType: 'env', title: 't', capturedAt: '2026-05-15' }, // dup
        { clientUuid: 'u2', inspectionType: 'env', title: 't', capturedAt: '2026-05-15' },
        {
          /* bogus */
        },
      ],
      inspector
    );
    expect(results).toHaveLength(4);
    expect(results.filter(r => r.ok && !r.duplicate)).toHaveLength(2);
    expect(results.filter(r => r.duplicate)).toHaveLength(1);
    expect(results.filter(r => !r.ok)).toHaveLength(1);
  });
});

describe('InspectionSubmissionService.getDashboard', () => {
  test('counts + fail rate + avg score', async () => {
    // Pin `now` relative to the seeded capturedAt so the default 30-day
    // dashboard window always covers the test data. Without this the test
    // is a time-bomb: it silently passes only while the real clock is
    // within 30 days of the hard-coded 2026-05-15 capture date.
    const svc = createInspectionSubmissionService({
      model: InspectionSubmission,
      now: () => new Date('2026-05-20T00:00:00Z'),
    });
    await svc.submit(
      {
        clientUuid: 'u-a',
        inspectionType: 'env',
        title: 't',
        capturedAt: '2026-05-15',
        items: [
          { itemCode: 'a', answer: 'pass' },
          { itemCode: 'b', answer: 'pass' },
        ],
      },
      inspector
    );
    await svc.submit(
      {
        clientUuid: 'u-b',
        inspectionType: 'env',
        title: 't',
        capturedAt: '2026-05-15',
        items: [
          { itemCode: 'a', answer: 'fail' },
          { itemCode: 'b', answer: 'fail' },
        ],
      },
      inspector
    );
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(2);
    expect(dash.fails).toBe(1);
    expect(dash.failRate).toBe(50);
  });
});
