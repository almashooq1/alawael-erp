'use strict';

/**
 * model-event-bridge-global-plugin-wave974.test.js — W974.
 *
 * Resurrects the modelEventBridge. The W394 `wireModelEventBridge` attached
 * schema.post('save') hooks at STARTUP — after app.js had already compiled the
 * models — so they NEVER FIRED (Mongoose bakes middleware in at compile time;
 * hooks added afterwards are ignored). All 16 LIVE-registry producers were dead.
 *
 * The fix is a GLOBAL mongoose plugin registered (env-gated) BEFORE any model
 * compiles; at save-time it dispatches by `this.constructor.modelName`. This
 * test proves the mechanism end-to-end against a real in-memory Mongo using
 * synthetic models compiled UNDER THE REAL MODEL NAMES, exercising every
 * trigger kind (create-only / status-flip / status-flip-any / predicate) and
 * asserting the canonical event publishes with the mapped payload — plus the
 * env gate and the fast-skip for unmapped models.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mockPublish = jest.fn().mockResolvedValue(undefined);
jest.mock('../integration/systemIntegrationBus', () => ({
  integrationBus: { publish: (...a) => mockPublish(...a) },
}));

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Employee, Invoice, Beneficiary, ClinicalSession, RiskSnapshot, Unmapped;

function published(eventType) {
  return mockPublish.mock.calls.find(c => c[1] === eventType);
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w974-bridge' } });
  await mongoose.connect(mongod.getUri());

  // Enable + register the GLOBAL plugin BEFORE compiling any model.
  process.env.ENABLE_MODEL_EVENT_BRIDGE = 'true';
  const { registerModelEventBridgePlugin } = require('../integration/modelEventBridge');
  const res = registerModelEventBridgePlugin();
  expect(res.registered).toBe(true);

  // Synthetic schemas compiled UNDER THE REAL MAPPED NAMES (the plugin keys on
  // modelName). Fields cover what each mapping's payload() reads.
  Employee = mongoose.model(
    'Employee',
    new mongoose.Schema({
      fullName: String,
      department: String,
      position: String,
      contractType: String,
      status: { type: String, default: 'active' },
      terminationReason: String,
      baseSalary: Number,
    })
  );
  Invoice = mongoose.model(
    'Invoice',
    new mongoose.Schema({
      beneficiaryId: mongoose.Schema.Types.ObjectId,
      amount: Number,
      currency: String,
    })
  );
  Beneficiary = mongoose.model(
    'Beneficiary',
    new mongoose.Schema({
      fullNameArabic: String,
      status: { type: String, default: 'active' },
      statusReason: String,
      createdBy: String,
    })
  );
  ClinicalSession = mongoose.model(
    'ClinicalSession',
    new mongoose.Schema({
      beneficiaryId: mongoose.Schema.Types.ObjectId,
      therapistId: mongoose.Schema.Types.ObjectId,
      type: String,
      duration: Number,
      status: { type: String, default: 'scheduled' },
    })
  );
  RiskSnapshot = mongoose.model(
    'RiskSnapshot',
    new mongoose.Schema({
      beneficiaryId: mongoose.Schema.Types.ObjectId,
      overallTier: String,
      tierDelta: String,
      reason: String,
      explanation: String,
    })
  );
  Unmapped = mongoose.model('SomethingUnmapped', new mongoose.Schema({ x: String }));
});

afterEach(() => mockPublish.mockClear());

afterAll(async () => {
  delete process.env.ENABLE_MODEL_EVENT_BRIDGE;
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W974 — global plugin fires the previously-dead producers', () => {
  it('create-only: Employee.create → hr.employee.hired', async () => {
    const e = await Employee.create({ fullName: 'سالم', department: 'HR', position: 'Officer' });
    await new Promise(r => setImmediate(r));
    const call = published('employee.hired');
    expect(call).toBeTruthy();
    expect(call[0]).toBe('hr');
    expect(call[2].employeeId).toBe(String(e._id));
    expect(call[2].name).toBe('سالم');
  });

  it('create-only: Invoice.create → finance.invoice.created', async () => {
    const inv = await Invoice.create({ amount: 500, currency: 'SAR' });
    await new Promise(r => setImmediate(r));
    const call = published('invoice.created');
    expect(call).toBeTruthy();
    expect(call[0]).toBe('finance');
    expect(call[2].amount).toBe(500);
  });

  it('status-flip: ClinicalSession status→completed → medical.therapy.session_completed', async () => {
    const s = await ClinicalSession.create({ type: 'PT' });
    await new Promise(r => setImmediate(r));
    mockPublish.mockClear();
    const loaded = await ClinicalSession.findById(s._id);
    loaded.status = 'completed';
    await loaded.save();
    await new Promise(r => setImmediate(r));
    expect(published('therapy.session_completed')).toBeTruthy();
  });

  it('status-flip: Employee status→terminated → hr.employee.terminated (not on create)', async () => {
    const e = await Employee.create({ fullName: 'منى', status: 'active' });
    await new Promise(r => setImmediate(r));
    expect(published('employee.terminated')).toBeFalsy(); // create must not flip
    mockPublish.mockClear();
    const loaded = await Employee.findById(e._id);
    loaded.status = 'terminated';
    await loaded.save();
    await new Promise(r => setImmediate(r));
    expect(published('employee.terminated')).toBeTruthy();
  });

  it('status-flip-any: Beneficiary status change → beneficiary.status_changed with oldStatus', async () => {
    const b = await Beneficiary.create({ fullNameArabic: 'سارة', status: 'active' });
    await new Promise(r => setImmediate(r));
    mockPublish.mockClear();
    const loaded = await Beneficiary.findById(b._id);
    loaded.status = 'discharged';
    await loaded.save();
    await new Promise(r => setImmediate(r));
    const call = published('beneficiary.status_changed');
    expect(call).toBeTruthy();
    expect(call[2].oldStatus).toBe('active');
    expect(call[2].newStatus).toBe('discharged');
  });

  it('predicate: RiskSnapshot emits only on tier escalation', async () => {
    await RiskSnapshot.create({ overallTier: 'low', tierDelta: 'unchanged' });
    await new Promise(r => setImmediate(r));
    expect(published('risk.alert_raised')).toBeFalsy(); // predicate gates it out
    mockPublish.mockClear();
    await RiskSnapshot.create({ overallTier: 'critical', tierDelta: 'escalated' });
    await new Promise(r => setImmediate(r));
    expect(published('risk.alert_raised')).toBeTruthy();
  });

  it('unmapped model save publishes nothing (fast-skip)', async () => {
    await Unmapped.create({ x: '1' });
    await new Promise(r => setImmediate(r));
    expect(mockPublish).not.toHaveBeenCalled();
  });
});

describe('W974 — env gate', () => {
  it('registerModelEventBridgePlugin is a no-op when ENABLE_MODEL_EVENT_BRIDGE is unset', () => {
    jest.resetModules();
    const saved = process.env.ENABLE_MODEL_EVENT_BRIDGE;
    delete process.env.ENABLE_MODEL_EVENT_BRIDGE;
    const fresh = require('../integration/modelEventBridge');
    const res = fresh.registerModelEventBridgePlugin();
    expect(res.registered).toBe(false);
    expect(res.reason).toMatch(/not enabled/);
    if (saved !== undefined) process.env.ENABLE_MODEL_EVENT_BRIDGE = saved;
  });
});
