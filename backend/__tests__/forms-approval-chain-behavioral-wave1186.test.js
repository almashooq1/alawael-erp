'use strict';

/**
 * forms-approval-chain-behavioral-wave1186.test.js — W1186.
 *
 * BEHAVIORAL counterpart to forms-approval-chain-wave1186 (static): real
 * Express + supertest + MongoMemoryServer + the REAL FormTemplate /
 * FormSubmission models. Only auth/rbac/branch middlewares + notification
 * side-channels are mocked. Proves end-to-end:
 *
 *   1. Catalog instantiation PERSISTS approvalSteps (the W1186 strict-mode fix)
 *   2. Submit on a chained template → under_review + approvals[] initialized
 *   3. Step-role reviewer (NOT in REVIEW_ROLES) can act on their own step
 *   4. Wrong-role reviewer is rejected (403 NOT_YOUR_STEP)
 *   5. Final step approval → approved + approvedAt + reviewedAt PERSISTED
 *   6. Rejection is terminal + requires reviewNote
 *   7. No-chain template → plain 'submitted'
 *   8. Required-field validation by fields[].name
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));
jest.mock('../middleware/rbac.v2.middleware', () => ({
  requireRole:
    (...roles) =>
    (req, res, next) => {
      const role = req.user && req.user.role;
      if (role === 'super_admin' || roles.includes(role)) return next();
      return res.status(403).json({ success: false, message: 'forbidden' });
    },
}));
jest.mock('../services/unifiedNotifier', () => ({ notify: jest.fn().mockResolvedValue({}) }));
jest.mock('../routes/push.routes', () => ({ sendToAdmins: jest.fn().mockResolvedValue({}) }));

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let FormTemplate;
let FormSubmission;
let app;

const uid = () => new mongoose.Types.ObjectId();
const ADMIN = { _id: uid(), role: 'admin', name: 'مدير النظام', email: 'admin@test' };
const STAFF = { _id: uid(), role: 'therapist', name: 'أخصائي', email: 'staff@test' };
const DIRECT_MANAGER = { _id: uid(), role: 'direct_manager', name: 'المدير المباشر', email: 'dm@test' };
const HR_OFFICER = { _id: uid(), role: 'hr_officer', name: 'الموارد البشرية', email: 'hr@test' };

const CHAIN_TEMPLATE = {
  templateId: 'test.leave.annual',
  name: 'طلب إجازة (اختبار)',
  category: 'hr',
  isActive: true,
  isPublished: true,
  requiresApproval: true,
  approvalSteps: [
    { role: 'direct_manager', label: 'المدير المباشر', order: 0 },
    { role: 'hr_officer', label: 'الموارد البشرية', order: 1 },
  ],
  fields: [
    { name: 'from_date', label: 'من تاريخ', type: 'date', required: true },
    { name: 'reason', label: 'السبب', type: 'textarea', required: false },
  ],
};

const PLAIN_TEMPLATE = {
  templateId: 'test.simple.note',
  name: 'ملاحظة بسيطة (اختبار)',
  category: 'general',
  isActive: true,
  isPublished: true,
  requiresApproval: false,
  approvalSteps: [],
  fields: [{ name: 'note', label: 'الملاحظة', type: 'textarea', required: true }],
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1186-forms-chain' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  FormTemplate = require('../models/FormTemplate');
  FormSubmission = require('../models/FormSubmission');
  app = express();
  app.use(express.json());
  app.use('/api/v1/form-templates', require('../routes/formTemplate.routes'));
});

beforeEach(async () => {
  mockAuthState.user = STAFF;
  await FormTemplate.deleteMany({});
  await FormSubmission.deleteMany({});
  await FormTemplate.create(CHAIN_TEMPLATE);
  await FormTemplate.create(PLAIN_TEMPLATE);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

async function submitChainForm() {
  return request(app)
    .post('/api/v1/form-templates/test.leave.annual/submit')
    .send({ data: { from_date: '2026-07-01', reason: 'سنوية' } });
}

describe('W1186 — catalog instantiation persists approval chains', () => {
  it('instantiate() writes approvalSteps through the strict-mode schema', async () => {
    const { createFormsCatalogService } = require('../services/formsCatalogService');
    const service = createFormsCatalogService({ formTemplateModel: FormTemplate });
    const { template, created } = await service.instantiate('hr.leave.annual');
    expect(created).toBe(true);
    // Re-fetch raw from the DB — proves persistence, not just the in-memory doc
    const raw = await FormTemplate.findOne({ templateId: 'hr.leave.annual' }).lean();
    expect(raw.approvalSteps).toHaveLength(2);
    expect(raw.approvalSteps.map(s => s.role)).toEqual(['direct_manager', 'hr_officer']);
    expect(raw.requiresApproval).toBe(true);
    expect(template.name).toBe('طلب إجازة سنوية');
  });
});

describe('W1186 — submit initializes the chain', () => {
  it('chained template → 201, under_review, approvals[] from approvalSteps', async () => {
    const res = await submitChainForm();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('under_review');
    expect(res.body.data.approvals).toHaveLength(2);
    expect(res.body.data.approvals[0]).toMatchObject({ role: 'direct_manager', status: 'pending' });
    expect(res.body.data.submissionNumber).toMatch(/^SUB-/);
  });

  it('no-chain template → plain submitted, empty approvals', async () => {
    const res = await request(app)
      .post('/api/v1/form-templates/test.simple.note/submit')
      .send({ data: { note: 'مرحبا' } });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('submitted');
    expect(res.body.data.approvals).toHaveLength(0);
  });

  it('missing required field (by fields[].name) → 400', async () => {
    const res = await request(app)
      .post('/api/v1/form-templates/test.leave.annual/submit')
      .send({ data: { reason: 'بدون تاريخ' } });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/من تاريخ/);
  });
});

describe('W1186 — step-wise review engine', () => {
  let subId;

  beforeEach(async () => {
    const res = await submitChainForm();
    subId = res.body.data._id;
  });

  function review(user, body) {
    mockAuthState.user = user;
    return request(app).patch(`/api/v1/form-templates/submissions/${subId}/status`).send(body);
  }

  it('step-role reviewer (direct_manager, outside REVIEW_ROLES) approves step 1 → still under_review', async () => {
    const res = await review(DIRECT_MANAGER, { status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('under_review');
    expect(res.body.data.currentApprovalStep).toBe(1);
    expect(res.body.data.approvals[0].status).toBe('approved');
    expect(res.body.data.approvals[1].status).toBe('pending');
  });

  it('wrong role on the pending step → 403 with requiredRole', async () => {
    const res = await review(STAFF, { status: 'approved' });
    expect(res.status).toBe(403);
    expect(res.body.requiredRole).toBe('direct_manager');
  });

  it('full chain: dm approves, hr approves → approved + approvedAt + reviewedAt PERSISTED', async () => {
    await review(DIRECT_MANAGER, { status: 'approved' });
    const res = await review(HR_OFFICER, { status: 'approved', reviewNote: 'مستوفٍ' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    // Raw DB re-read — the W1186 declared-field fix (pre-fix: silently dropped)
    const raw = await FormSubmission.findById(subId).lean();
    expect(raw.status).toBe('approved');
    expect(raw.approvedAt).toBeTruthy();
    expect(raw.reviewedAt).toBeTruthy();
    expect(String(raw.reviewedBy)).toBe(String(HR_OFFICER._id));
    expect(raw.comments).toHaveLength(1);
  });

  it('admin (manage role) can act on any step', async () => {
    const res = await review(ADMIN, { status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.approvals[0].status).toBe('approved');
  });

  it('rejection is terminal + records reason; reviewNote required', async () => {
    const missing = await review(DIRECT_MANAGER, { status: 'rejected' });
    expect(missing.status).toBe(400);
    const res = await review(DIRECT_MANAGER, { status: 'rejected', reviewNote: 'بيانات ناقصة' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    const raw = await FormSubmission.findById(subId).lean();
    expect(raw.rejectionReason).toBe('بيانات ناقصة');
    expect(raw.rejectedAt).toBeTruthy();
    expect(raw.approvals[0].status).toBe('rejected');
  });

  it('non-chain direct status set still requires a reviewer role', async () => {
    // Drain the chain first so the direct path engages
    await review(DIRECT_MANAGER, { status: 'approved' });
    await review(HR_OFFICER, { status: 'approved' });
    const res = await review(STAFF, { status: 'archived' });
    expect(res.status).toBe(403);
    const ok = await review(ADMIN, { status: 'archived' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('archived');
  });
});

describe('W1186b — queue + detail visibility for step-role reviewers', () => {
  let subId;

  beforeEach(async () => {
    const res = await submitChainForm();
    subId = res.body.data._id;
  });

  function asUser(user) {
    mockAuthState.user = user;
  }

  it('step-role reviewer sees the pending queue scoped to their role', async () => {
    asUser(HR_OFFICER);
    const res = await request(app).get('/api/v1/form-templates/submissions/pending');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0]._id)).toBe(String(subId));
  });

  it('a role with no step anywhere gets an empty queue (not the whole queue)', async () => {
    asUser(STAFF); // therapist — owner, but no step role
    const res = await request(app).get('/api/v1/form-templates/submissions/pending');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('manage role still sees the full queue', async () => {
    asUser(ADMIN);
    const res = await request(app).get('/api/v1/form-templates/submissions/pending');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('step-role reviewer can open the submission detail; unrelated role cannot', async () => {
    asUser(DIRECT_MANAGER);
    const ok = await request(app).get(`/api/v1/form-templates/submissions/${subId}`);
    expect(ok.status).toBe(200);
    asUser({ _id: uid(), role: 'driver', name: 'سائق', email: 'driver@test' });
    const no = await request(app).get(`/api/v1/form-templates/submissions/${subId}`);
    expect(no.status).toBe(403);
  });
});
