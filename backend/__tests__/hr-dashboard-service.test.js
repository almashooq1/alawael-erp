/**
 * hr-dashboard-service.test.js — Phase 11 Commit 4 (4.0.21).
 *
 * Integration coverage for hrDashboardService against real models on
 * mongodb-memory-server. Verifies per-section counts and graceful
 * degradation when models are missing.
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrDashboardService, HR_FLAG_IDS } = require('../services/hr/hrDashboardService');

let mongoServer;
let Certification;
let EmploymentContract;
let Employee;
let LeaveBalance;
let PerformanceReview;
let RedFlagState;
let HrChangeRequest;
let AuditLog;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-dashboard-test' });
  Certification = require('../models/hr/Certification');
  EmploymentContract = require('../models/hr/EmploymentContract');
  Employee = require('../models/HR/Employee');
  LeaveBalance = require('../models/hr/LeaveBalance');
  PerformanceReview = require('../models/hr/PerformanceReview');
  RedFlagState = require('../models/RedFlagState');
  HrChangeRequest = require('../models/hr/HrChangeRequest');
  AuditLog = require('../models/auditLog.model').AuditLog;
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await Certification.deleteMany({});
  await EmploymentContract.deleteMany({});
  await Employee.deleteMany({});
  await LeaveBalance.deleteMany({});
  await PerformanceReview.deleteMany({});
  await RedFlagState.deleteMany({});
  await HrChangeRequest.deleteMany({});
  await AuditLog.deleteMany({});
});

const MS_PER_DAY = 24 * 3600 * 1000;
const NOW = new Date('2026-04-22T12:00:00.000Z');

function buildService({ now = NOW } = {}) {
  return createHrDashboardService({
    certificationModel: Certification,
    employmentContractModel: EmploymentContract,
    employeeModel: Employee,
    leaveBalanceModel: LeaveBalance,
    performanceReviewModel: PerformanceReview,
    redFlagStateModel: RedFlagState,
    changeRequestModel: HrChangeRequest,
    auditLogModel: AuditLog,
    now: () => now,
  });
}

let empCounter = 1;
async function seedEmployee({
  branchId = new mongoose.Types.ObjectId(),
  scfhsExpiryDaysFromNow = 365,
  probationEndDaysFromNow = null,
  status = 'active',
  now = NOW,
} = {}) {
  const seq = empCounter++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `DASH-${seq}`,
    national_id: `DSH${String(seq).padStart(7, '0')}`,
    email: `dash-${seq}-${Date.now()}@t.local`,
    branch_id: branchId,
    scfhs_expiry: new Date(now.getTime() + scfhsExpiryDaysFromNow * MS_PER_DAY),
    probation_end_date:
      probationEndDaysFromNow == null
        ? null
        : new Date(now.getTime() + probationEndDaysFromNow * MS_PER_DAY),
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, branch_id: branchId };
}

async function seedCert({
  branchId = new mongoose.Types.ObjectId(),
  status = 'valid',
  isMandatory = false,
  expiryDaysFromNow = 365,
  now = NOW,
}) {
  return Certification.create({
    employee_id: new mongoose.Types.ObjectId(),
    branch_id: branchId,
    cert_type: 'first_aid',
    cert_name_ar: 'شهادة اختبار',
    is_mandatory: isMandatory,
    expiry_date: new Date(now.getTime() + expiryDaysFromNow * MS_PER_DAY),
    status,
  });
}

async function seedContract({
  branchId = new mongoose.Types.ObjectId(),
  status = 'active',
  endDateDaysFromNow = 365,
  now = NOW,
}) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(EmploymentContract.collection.collectionName).insertOne({
    _id,
    contract_number: `DASH-${_id.toString().slice(-6)}`,
    employee_id: new mongoose.Types.ObjectId(),
    branch_id: branchId,
    contract_type: 'fixed_term',
    start_date: new Date(now.getTime() - 365 * MS_PER_DAY),
    end_date: new Date(now.getTime() + endDateDaysFromNow * MS_PER_DAY),
    position: 'Therapist',
    department: 'clinical',
    basic_salary: 10000,
    status,
    deleted_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

async function seedLeaveBalance({ employeeId, year, annualRemaining, carriedOver = 0 }) {
  return LeaveBalance.create({
    employee_id: employeeId,
    year,
    annual_entitled: 21,
    annual_remaining: annualRemaining,
    carried_over_from_last_year: carriedOver,
  });
}

async function seedFlagState({
  beneficiaryId,
  flagId,
  status = 'active',
  domain = 'operational',
  severity = 'warning',
  blocking = false,
}) {
  return RedFlagState.create({
    flagId,
    beneficiaryId: beneficiaryId ? String(beneficiaryId) : new mongoose.Types.ObjectId().toString(),
    status,
    domain,
    severity,
    blocking,
    raisedAt: new Date(),
  });
}

// ─── Basic shape ────────────────────────────────────────────────

describe('buildDashboard — empty state', () => {
  it('returns a full payload with zero counts everywhere', async () => {
    const payload = await buildService().buildDashboard();

    expect(payload.generated_at).toBe(NOW.toISOString());
    expect(payload.scope).toEqual({ branchId: null });

    const s = payload.sections;
    expect(s.certifications).toEqual({
      valid: 0,
      expiring_soon: 0,
      expired: 0,
      mandatory_expired: 0,
    });
    expect(s.employment_contracts).toEqual({
      active: 0,
      expired: 0,
      terminated: 0,
      draft: 0,
      expiring_within_45d: 0,
    });
    expect(s.scfhs_licenses).toEqual({ expired: 0, expiring_within_60d: 0 });
    expect(s.leave_balance.total_balances).toBe(0);
    expect(s.leave_balance.overflow_count).toBe(0);
    expect(s.probation).toEqual({ past_probation_count: 0, review_overdue_count: 0 });
    expect(s.annual_review.active_employees).toBe(0);
    expect(s.red_flags.total_active).toBe(0);
    expect(Object.keys(s.red_flags.per_flag)).toHaveLength(HR_FLAG_IDS.length);
    expect(s.change_requests).toEqual({
      pending: 0,
      applied_last_30d: 0,
      rejected_last_30d: 0,
      cancelled_last_30d: 0,
      turnaround_days: { count: 0, p50: null, p90: null },
      top_rules: [],
    });
    expect(s.anomalies).toMatchObject({
      recent_count_7d: 0,
      pending_review_count: 0,
      by_reason: {},
      top_flagged_users: [],
      review_outcomes_30d: {
        confirmed_breach: 0,
        false_positive: 0,
        needs_investigation: 0,
        policy_exception: 0,
        unreviewed: 0,
      },
      false_positive_rate_pct: null,
      avg_turnaround_hours: null,
      turnaround_sample_size: 0,
      top_reviewers_30d: [],
      branch_scoped: false,
    });
    expect(s.anomalies.window.days).toBe(7);
  });
});

// ─── Anomalies section (C20) ────────────────────────────────────

describe('buildDashboard — anomalies', () => {
  const MS_PER_DAY_ = 24 * 3600 * 1000;

  async function seedSuspiciousEvent({
    userId,
    userRole = 'hr_officer',
    reason = 'excessive_reads',
    daysAgo = 1,
    requiresReview = true,
    outcome = null, // null = unreviewed
    reviewedHoursAfter = 4, // used only when outcome is set
    reviewerUserId = null, // when set, uses this id in review.reviewerUserId
    reviewerRole = 'hr_manager',
  } = {}) {
    const createdAt = new Date(NOW.getTime() - daysAgo * MS_PER_DAY_);
    const custom = { reason, observedCount: 150 };
    if (outcome) {
      custom.review = {
        outcome,
        reviewerUserId: reviewerUserId
          ? String(reviewerUserId)
          : String(new mongoose.Types.ObjectId()),
        reviewerRole,
        notes: outcome === 'confirmed_breach' ? null : 'ops notes',
        reviewedAt: new Date(
          createdAt.getTime() + reviewedHoursAfter * 60 * 60 * 1000
        ).toISOString(),
      };
    }
    return AuditLog.create({
      eventType: 'security.suspicious_activity',
      eventCategory: 'security',
      severity: 'high',
      status: 'success',
      userId,
      userRole,
      resource: `hr:anomaly:${reason}`,
      message: `test anomaly ${reason}`,
      metadata: { custom },
      tags: ['hr', 'hr:anomaly', reason],
      flags: { isSuspicious: true, requiresReview: outcome ? false : requiresReview },
      createdAt,
      updatedAt: createdAt,
    });
  }

  it('counts recent suspicious_activity events tagged hr:anomaly in last 7 days', async () => {
    await seedSuspiciousEvent({ userId: new mongoose.Types.ObjectId(), daysAgo: 1 });
    await seedSuspiciousEvent({ userId: new mongoose.Types.ObjectId(), daysAgo: 3 });
    await seedSuspiciousEvent({ userId: new mongoose.Types.ObjectId(), daysAgo: 6 });
    // Outside window — ignored
    await seedSuspiciousEvent({ userId: new mongoose.Types.ObjectId(), daysAgo: 14 });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.recent_count_7d).toBe(3);
  });

  it('pending_review_count counts only events still requiring review', async () => {
    await seedSuspiciousEvent({
      userId: new mongoose.Types.ObjectId(),
      daysAgo: 1,
      requiresReview: true,
    });
    await seedSuspiciousEvent({
      userId: new mongoose.Types.ObjectId(),
      daysAgo: 2,
      requiresReview: true,
    });
    await seedSuspiciousEvent({
      userId: new mongoose.Types.ObjectId(),
      daysAgo: 3,
      requiresReview: false,
    });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.recent_count_7d).toBe(3);
    expect(payload.sections.anomalies.pending_review_count).toBe(2);
  });

  it('by_reason buckets events by metadata.custom.reason', async () => {
    await seedSuspiciousEvent({
      userId: new mongoose.Types.ObjectId(),
      reason: 'excessive_reads',
      daysAgo: 1,
    });
    await seedSuspiciousEvent({
      userId: new mongoose.Types.ObjectId(),
      reason: 'excessive_reads',
      daysAgo: 2,
    });
    await seedSuspiciousEvent({
      userId: new mongoose.Types.ObjectId(),
      reason: 'excessive_exports',
      daysAgo: 1,
    });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.by_reason).toEqual({
      excessive_reads: 2,
      excessive_exports: 1,
    });
  });

  it('top_flagged_users aggregates per-user count + reasons, descending', async () => {
    const heavy = new mongoose.Types.ObjectId();
    const light = new mongoose.Types.ObjectId();
    for (let i = 0; i < 4; i++) {
      await seedSuspiciousEvent({
        userId: heavy,
        userRole: 'hr_officer',
        reason: 'excessive_reads',
        daysAgo: i,
      });
    }
    await seedSuspiciousEvent({
      userId: heavy,
      userRole: 'hr_officer',
      reason: 'excessive_exports',
      daysAgo: 1,
    });
    await seedSuspiciousEvent({
      userId: light,
      userRole: 'hr_officer',
      reason: 'excessive_reads',
      daysAgo: 2,
    });

    const payload = await buildService().buildDashboard();
    const top = payload.sections.anomalies.top_flagged_users;
    expect(top).toHaveLength(2);
    expect(top[0].user_id).toBe(String(heavy));
    expect(top[0].count).toBe(5);
    expect(top[0].reasons.sort()).toEqual(['excessive_exports', 'excessive_reads']);
    expect(top[1].user_id).toBe(String(light));
    expect(top[1].count).toBe(1);
  });

  it('caps top_flagged_users at 5', async () => {
    for (let i = 0; i < 7; i++) {
      const u = new mongoose.Types.ObjectId();
      await seedSuspiciousEvent({ userId: u, daysAgo: 1 });
      await seedSuspiciousEvent({ userId: u, daysAgo: 2 }); // 2 each
    }
    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.top_flagged_users.length).toBe(5);
  });

  it('section is null when auditLogModel is not injected', async () => {
    const svc = createHrDashboardService({
      certificationModel: Certification,
      employmentContractModel: EmploymentContract,
      employeeModel: Employee,
      leaveBalanceModel: LeaveBalance,
      performanceReviewModel: PerformanceReview,
      redFlagStateModel: RedFlagState,
      changeRequestModel: HrChangeRequest,
      // auditLogModel intentionally omitted
      now: () => NOW,
    });
    const payload = await svc.buildDashboard();
    expect(payload.sections.anomalies).toBeNull();
  });

  it('review_outcomes_30d buckets events by review.outcome', async () => {
    const u = () => new mongoose.Types.ObjectId();
    await seedSuspiciousEvent({ userId: u(), daysAgo: 1, outcome: 'confirmed_breach' });
    await seedSuspiciousEvent({ userId: u(), daysAgo: 2, outcome: 'confirmed_breach' });
    await seedSuspiciousEvent({ userId: u(), daysAgo: 3, outcome: 'false_positive' });
    await seedSuspiciousEvent({ userId: u(), daysAgo: 5, outcome: 'needs_investigation' });
    await seedSuspiciousEvent({ userId: u(), daysAgo: 7, outcome: 'policy_exception' });
    // One unreviewed within 30d window
    await seedSuspiciousEvent({ userId: u(), daysAgo: 2 });
    // Outside 30d window — ignored from outcomes bucket
    await seedSuspiciousEvent({ userId: u(), daysAgo: 50, outcome: 'confirmed_breach' });

    const payload = await buildService().buildDashboard();
    const outcomes = payload.sections.anomalies.review_outcomes_30d;
    expect(outcomes).toEqual({
      confirmed_breach: 2,
      false_positive: 1,
      needs_investigation: 1,
      policy_exception: 1,
      unreviewed: 1,
    });
  });

  it('false_positive_rate_pct computes against decided totals only', async () => {
    const u = () => new mongoose.Types.ObjectId();
    // 3 confirmed + 1 false_positive → 1 / (3+1) = 25%
    for (let i = 0; i < 3; i++) {
      await seedSuspiciousEvent({ userId: u(), daysAgo: i + 1, outcome: 'confirmed_breach' });
    }
    await seedSuspiciousEvent({ userId: u(), daysAgo: 4, outcome: 'false_positive' });
    // needs_investigation + unreviewed must NOT affect the denominator
    await seedSuspiciousEvent({ userId: u(), daysAgo: 5, outcome: 'needs_investigation' });
    await seedSuspiciousEvent({ userId: u(), daysAgo: 6 });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.false_positive_rate_pct).toBeCloseTo(25, 0);
  });

  it('false_positive_rate_pct is null when no decided events exist', async () => {
    const u = () => new mongoose.Types.ObjectId();
    await seedSuspiciousEvent({ userId: u(), daysAgo: 1, outcome: 'needs_investigation' });
    await seedSuspiciousEvent({ userId: u(), daysAgo: 2 });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.false_positive_rate_pct).toBeNull();
  });

  it('avg_turnaround_hours averages createdAt → review.reviewedAt', async () => {
    const u = () => new mongoose.Types.ObjectId();
    // 3 reviewed events with turnarounds 2h, 4h, 6h → avg 4h
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 1,
      outcome: 'confirmed_breach',
      reviewedHoursAfter: 2,
    });
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 2,
      outcome: 'false_positive',
      reviewedHoursAfter: 4,
    });
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 3,
      outcome: 'confirmed_breach',
      reviewedHoursAfter: 6,
    });
    // Unreviewed → NOT included in the average
    await seedSuspiciousEvent({ userId: u(), daysAgo: 4 });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.avg_turnaround_hours).toBeCloseTo(4, 1);
    expect(payload.sections.anomalies.turnaround_sample_size).toBe(3);
  });

  it('avg_turnaround_hours is null on empty-reviewed systems', async () => {
    const u = () => new mongoose.Types.ObjectId();
    await seedSuspiciousEvent({ userId: u(), daysAgo: 1 });
    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.avg_turnaround_hours).toBeNull();
    expect(payload.sections.anomalies.turnaround_sample_size).toBe(0);
  });

  it('top_reviewers_30d groups by reviewer with outcome breakdown', async () => {
    const u = () => new mongoose.Types.ObjectId();
    const heavyReviewer = u();
    const lightReviewer = u();

    // Heavy reviewer: 2 confirmed + 1 false_positive + 1 needs_investigation
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 1,
      outcome: 'confirmed_breach',
      reviewerUserId: heavyReviewer,
      reviewerRole: 'hr_manager',
    });
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 2,
      outcome: 'confirmed_breach',
      reviewerUserId: heavyReviewer,
      reviewerRole: 'hr_manager',
    });
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 3,
      outcome: 'false_positive',
      reviewerUserId: heavyReviewer,
      reviewerRole: 'hr_manager',
    });
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 4,
      outcome: 'needs_investigation',
      reviewerUserId: heavyReviewer,
      reviewerRole: 'hr_manager',
    });
    // Light reviewer: 1 policy_exception
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 5,
      outcome: 'policy_exception',
      reviewerUserId: lightReviewer,
      reviewerRole: 'compliance_officer',
    });
    // Unreviewed event — should NOT appear in reviewer stats
    await seedSuspiciousEvent({ userId: u(), daysAgo: 1 });

    const payload = await buildService().buildDashboard();
    const reviewers = payload.sections.anomalies.top_reviewers_30d;
    expect(reviewers).toHaveLength(2);

    // Descending by count
    expect(reviewers[0].reviewer_user_id).toBe(String(heavyReviewer));
    expect(reviewers[0].count).toBe(4);
    expect(reviewers[0].reviewer_role).toBe('hr_manager');
    expect(reviewers[0].outcomes).toEqual({
      confirmed_breach: 2,
      false_positive: 1,
      needs_investigation: 1,
      policy_exception: 0,
    });
    // FP rate on heavy: 1 / (2 + 1) = 33.3%
    expect(reviewers[0].false_positive_rate_pct).toBeCloseTo(33.3, 0);
    expect(reviewers[0].last_reviewed_at).toBeTruthy();

    // Light reviewer
    expect(reviewers[1].reviewer_user_id).toBe(String(lightReviewer));
    expect(reviewers[1].count).toBe(1);
    expect(reviewers[1].outcomes.policy_exception).toBe(1);
    // No decided outcomes → fp rate null
    expect(reviewers[1].false_positive_rate_pct).toBeNull();
  });

  it('top_reviewers_30d caps at 5', async () => {
    const u = () => new mongoose.Types.ObjectId();
    // 7 reviewers, each with 1 review
    for (let i = 0; i < 7; i++) {
      await seedSuspiciousEvent({
        userId: u(),
        daysAgo: i + 1,
        outcome: 'confirmed_breach',
        reviewerUserId: u(),
        reviewerRole: 'hr_manager',
      });
    }
    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.top_reviewers_30d).toHaveLength(5);
  });

  it('top_reviewers_30d excludes unreviewed events', async () => {
    const u = () => new mongoose.Types.ObjectId();
    // All unreviewed
    for (let i = 0; i < 5; i++) {
      await seedSuspiciousEvent({ userId: u(), daysAgo: i + 1 });
    }
    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.top_reviewers_30d).toEqual([]);
  });

  it('top_reviewers_30d excludes events outside 30d window', async () => {
    const u = () => new mongoose.Types.ObjectId();
    const r = u();
    // 45 days ago — outside window
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 45,
      outcome: 'confirmed_breach',
      reviewerUserId: r,
      reviewerRole: 'hr_manager',
    });
    // 10 days ago — inside
    await seedSuspiciousEvent({
      userId: u(),
      daysAgo: 10,
      outcome: 'confirmed_breach',
      reviewerUserId: r,
      reviewerRole: 'hr_manager',
    });
    const payload = await buildService().buildDashboard();
    const reviewers = payload.sections.anomalies.top_reviewers_30d;
    expect(reviewers).toHaveLength(1);
    expect(reviewers[0].count).toBe(1);
  });

  it('ignores events without the hr:anomaly tag', async () => {
    // Non-HR security event — should NOT count
    await AuditLog.create({
      eventType: 'security.suspicious_activity',
      eventCategory: 'security',
      severity: 'high',
      status: 'success',
      userId: new mongoose.Types.ObjectId(),
      resource: 'billing:fraud',
      message: 'non-hr',
      tags: ['billing'],
      metadata: { custom: { reason: 'fraud' } },
      flags: { isSuspicious: true, requiresReview: true },
      createdAt: new Date(NOW.getTime() - 24 * 3600 * 1000),
    });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.anomalies.recent_count_7d).toBe(0);
  });
});

// ─── Change-request analytics ───────────────────────────────────

describe('buildDashboard — change_requests', () => {
  const now = NOW;
  const MS_PER_DAY_ = 24 * 3600 * 1000;

  async function seedChangeRequest({
    branchId = new mongoose.Types.ObjectId(),
    status = 'pending',
    createdAgoDays = 0,
    appliedAgoDays = null,
    rejectedAgoDays = null,
    rules = [],
  } = {}) {
    const _id = new mongoose.Types.ObjectId();
    const createdAt = new Date(now.getTime() - createdAgoDays * MS_PER_DAY_);
    const doc = {
      _id,
      employee_id: new mongoose.Types.ObjectId(),
      branch_id: branchId,
      requestor_user_id: new mongoose.Types.ObjectId(),
      requestor_role: 'hr_manager',
      proposed_changes: { basic_salary: 15000 },
      baseline_values: { basic_salary: 10000 },
      rules_triggered: rules,
      status,
      approver_user_id: null,
      approver_role: null,
      approved_at: null,
      rejected_at: null,
      applied_at: null,
      deleted_at: null,
      createdAt,
      updatedAt: createdAt,
    };
    if (appliedAgoDays != null) {
      doc.applied_at = new Date(now.getTime() - appliedAgoDays * MS_PER_DAY_);
      doc.updatedAt = doc.applied_at;
    }
    if (rejectedAgoDays != null) {
      doc.rejected_at = new Date(now.getTime() - rejectedAgoDays * MS_PER_DAY_);
      doc.updatedAt = doc.rejected_at;
    }
    await mongoose.connection.db
      .collection(HrChangeRequest.collection.collectionName)
      .insertOne(doc);
    return doc;
  }

  it('counts pending, applied, rejected, cancelled in the last 30 days', async () => {
    await seedChangeRequest({ status: 'pending', createdAgoDays: 2 });
    await seedChangeRequest({ status: 'pending', createdAgoDays: 5 });
    await seedChangeRequest({
      status: 'applied',
      createdAgoDays: 10,
      appliedAgoDays: 9,
    });
    await seedChangeRequest({
      status: 'rejected',
      createdAgoDays: 5,
      rejectedAgoDays: 4,
    });
    // Older than 30d — should be excluded from "last_30d" counts
    await seedChangeRequest({
      status: 'applied',
      createdAgoDays: 60,
      appliedAgoDays: 45,
    });

    const payload = await buildService().buildDashboard();
    const cr = payload.sections.change_requests;
    expect(cr.pending).toBe(2);
    expect(cr.applied_last_30d).toBe(1);
    expect(cr.rejected_last_30d).toBe(1);
    expect(cr.cancelled_last_30d).toBe(0);
  });

  it('computes turnaround P50/P90 across applied requests in window', async () => {
    // Turnarounds (days): 1, 2, 5, 10, 20 → P50 = 5, P90 = 16
    await seedChangeRequest({ status: 'applied', createdAgoDays: 2, appliedAgoDays: 1 });
    await seedChangeRequest({ status: 'applied', createdAgoDays: 5, appliedAgoDays: 3 });
    await seedChangeRequest({ status: 'applied', createdAgoDays: 10, appliedAgoDays: 5 });
    await seedChangeRequest({ status: 'applied', createdAgoDays: 15, appliedAgoDays: 5 });
    await seedChangeRequest({ status: 'applied', createdAgoDays: 22, appliedAgoDays: 2 });

    const payload = await buildService().buildDashboard();
    const t = payload.sections.change_requests.turnaround_days;
    expect(t.count).toBe(5);
    expect(t.p50).toBeCloseTo(5, 0);
    expect(t.p90).toBeGreaterThan(10);
    expect(t.p90).toBeLessThan(25);
  });

  it('top_rules aggregates rule_ids across requests in window', async () => {
    await seedChangeRequest({
      status: 'applied',
      createdAgoDays: 2,
      appliedAgoDays: 1,
      rules: ['salary.increase_gt_15pct', 'compensation.material_allowance_change'],
    });
    await seedChangeRequest({
      status: 'applied',
      createdAgoDays: 3,
      appliedAgoDays: 2,
      rules: ['salary.increase_gt_15pct'],
    });
    await seedChangeRequest({
      status: 'rejected',
      createdAgoDays: 5,
      rejectedAgoDays: 4,
      rules: ['employment.termination'],
    });

    const payload = await buildService().buildDashboard();
    const topRules = payload.sections.change_requests.top_rules;
    expect(topRules.length).toBeGreaterThanOrEqual(2);
    expect(topRules[0].rule_id).toBe('salary.increase_gt_15pct');
    expect(topRules[0].count).toBe(2);
  });

  it('narrows counts by branchId', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedChangeRequest({ branchId: branchA, status: 'pending' });
    await seedChangeRequest({ branchId: branchA, status: 'pending' });
    await seedChangeRequest({ branchId: branchB, status: 'pending' });

    const payload = await buildService().buildDashboard({ branchId: branchA });
    expect(payload.sections.change_requests.pending).toBe(2);
  });

  it('returns null when changeRequestModel is missing', async () => {
    const svc = createHrDashboardService({
      certificationModel: Certification,
      employmentContractModel: EmploymentContract,
      employeeModel: Employee,
      leaveBalanceModel: LeaveBalance,
      performanceReviewModel: PerformanceReview,
      redFlagStateModel: RedFlagState,
      // changeRequestModel intentionally missing
      now: () => NOW,
    });
    const payload = await svc.buildDashboard();
    expect(payload.sections.change_requests).toBeNull();
  });
});

// ─── Certification counts ───────────────────────────────────────

describe('buildDashboard — certifications', () => {
  it('counts by stored status + mandatory expired', async () => {
    await seedCert({ status: 'valid' });
    await seedCert({ status: 'valid' });
    await seedCert({ status: 'expiring_soon' });
    await seedCert({ status: 'expired' });
    // Mandatory expired (regardless of stored status field):
    await seedCert({
      status: 'valid',
      isMandatory: true,
      expiryDaysFromNow: -2,
    });

    const payload = await buildService().buildDashboard();
    const c = payload.sections.certifications;
    expect(c.valid).toBe(3); // 2 valid + 1 mandatory-but-stale(status=valid)
    expect(c.expiring_soon).toBe(1);
    expect(c.expired).toBe(1);
    expect(c.mandatory_expired).toBe(1);
  });

  it('narrows by branchId', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedCert({ branchId: branchA, status: 'valid' });
    await seedCert({ branchId: branchA, status: 'valid' });
    await seedCert({ branchId: branchB, status: 'valid' });

    const payload = await buildService().buildDashboard({ branchId: branchA });
    expect(payload.sections.certifications.valid).toBe(2);
    expect(payload.scope.branchId).toBe(String(branchA));
  });
});

// ─── Employment contracts ───────────────────────────────────────

describe('buildDashboard — employment_contracts', () => {
  it('counts by status + expiring-within-45d bucket', async () => {
    await seedContract({ status: 'active', endDateDaysFromNow: 365 });
    await seedContract({ status: 'active', endDateDaysFromNow: 30 }); // expiring
    await seedContract({ status: 'active', endDateDaysFromNow: 10 }); // expiring
    await seedContract({ status: 'expired', endDateDaysFromNow: -5 });
    await seedContract({ status: 'terminated', endDateDaysFromNow: -100 });
    await seedContract({ status: 'draft', endDateDaysFromNow: 400 });

    const payload = await buildService().buildDashboard();
    const e = payload.sections.employment_contracts;
    expect(e.active).toBe(3);
    expect(e.expired).toBe(1);
    expect(e.terminated).toBe(1);
    expect(e.draft).toBe(1);
    expect(e.expiring_within_45d).toBe(2);
  });
});

// ─── SCFHS exposure ─────────────────────────────────────────────

describe('buildDashboard — scfhs_licenses', () => {
  it('counts expired + expiring within 60 days', async () => {
    await seedEmployee({ scfhsExpiryDaysFromNow: -5 });
    await seedEmployee({ scfhsExpiryDaysFromNow: -1 });
    await seedEmployee({ scfhsExpiryDaysFromNow: 30 });
    await seedEmployee({ scfhsExpiryDaysFromNow: 59 });
    await seedEmployee({ scfhsExpiryDaysFromNow: 120 });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.scfhs_licenses).toEqual({
      expired: 2,
      expiring_within_60d: 2,
    });
  });
});

// ─── Leave balance ──────────────────────────────────────────────

describe('buildDashboard — leave_balance', () => {
  it('counts overflowing balances for current year only', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedLeaveBalance({
      employeeId: new mongoose.Types.ObjectId(),
      year: 2026,
      annualRemaining: 30,
      carriedOver: 20,
    }); // 50 — overflow
    await seedLeaveBalance({
      employeeId: new mongoose.Types.ObjectId(),
      year: 2026,
      annualRemaining: 25,
    });
    await seedLeaveBalance({
      employeeId: new mongoose.Types.ObjectId(),
      year: 2025, // last year — ignored
      annualRemaining: 100,
    });

    const payload = await buildService({ now }).buildDashboard();
    expect(payload.sections.leave_balance.year).toBe(2026);
    expect(payload.sections.leave_balance.total_balances).toBe(2);
    expect(payload.sections.leave_balance.overflow_count).toBe(1);
  });

  it('respects custom overflowThresholdDays', async () => {
    await seedLeaveBalance({
      employeeId: new mongoose.Types.ObjectId(),
      year: 2026,
      annualRemaining: 30,
    });
    const payload = await buildService().buildDashboard({ overflowThresholdDays: 25 });
    expect(payload.sections.leave_balance.overflow_count).toBe(1);
    expect(payload.sections.leave_balance.threshold_days).toBe(25);
  });
});

// ─── Probation ──────────────────────────────────────────────────

describe('buildDashboard — probation', () => {
  it('counts past-probation employees and overdue reviews', async () => {
    const e1 = await seedEmployee({ probationEndDaysFromNow: -30 }); // overdue
    const e2 = await seedEmployee({ probationEndDaysFromNow: -10 }); // has review
    await seedEmployee({ probationEndDaysFromNow: 20 }); // not yet past

    // Valid probation review for e2 within ±30d of its probation end:
    await mongoose.connection.db.collection(PerformanceReview.collection.collectionName).insertOne({
      _id: new mongoose.Types.ObjectId(),
      review_number: 'DASH-PRV-001',
      employee_id: e2._id,
      branch_id: new mongoose.Types.ObjectId(),
      reviewer_id: new mongoose.Types.ObjectId(),
      review_period_start: new Date(NOW.getTime() - 100 * MS_PER_DAY),
      review_period_end: new Date(NOW.getTime() - 8 * MS_PER_DAY),
      review_type: 'probation',
      status: 'finalized',
      deleted_at: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.probation.past_probation_count).toBe(2);
    expect(payload.sections.probation.review_overdue_count).toBe(1); // only e1

    // Silence unused-var warning
    expect(e1._id).toBeDefined();
  });
});

// ─── Annual review ──────────────────────────────────────────────

describe('buildDashboard — annual_review', () => {
  it('counts active employees with/without fresh finalized review', async () => {
    const e1 = await seedEmployee({ status: 'active' });
    const e2 = await seedEmployee({ status: 'active' });
    await seedEmployee({ status: 'terminated' }); // excluded

    // e1 has a fresh annual review; e2 does not.
    await mongoose.connection.db.collection(PerformanceReview.collection.collectionName).insertOne({
      _id: new mongoose.Types.ObjectId(),
      review_number: 'DASH-PRV-002',
      employee_id: e1._id,
      branch_id: new mongoose.Types.ObjectId(),
      reviewer_id: new mongoose.Types.ObjectId(),
      review_period_start: new Date(NOW.getTime() - 365 * MS_PER_DAY),
      review_period_end: new Date(NOW.getTime() - 60 * MS_PER_DAY),
      review_type: 'annual',
      status: 'finalized',
      deleted_at: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const payload = await buildService().buildDashboard();
    expect(payload.sections.annual_review.active_employees).toBe(2);
    expect(payload.sections.annual_review.with_fresh_review).toBe(1);
    expect(payload.sections.annual_review.overdue).toBe(1);

    expect(e2._id).toBeDefined();
  });
});

// ─── Red-flags rollup ───────────────────────────────────────────

describe('buildDashboard — red_flags', () => {
  it('counts active HR flags per-id and totals', async () => {
    await seedFlagState({ flagId: 'operational.therapist.license.expired' });
    await seedFlagState({ flagId: 'operational.therapist.license.expired' });
    await seedFlagState({ flagId: 'operational.probation_review.overdue_7d' });
    // Non-HR flag — should NOT be included:
    await seedFlagState({ flagId: 'clinical.seizure.cluster.48h' });
    // Cooldown HR flag — should NOT be included (only `active` counts):
    await seedFlagState({
      flagId: 'operational.therapist.mandatory_cert.expired',
      status: 'cooldown',
    });

    const payload = await buildService().buildDashboard();
    const rf = payload.sections.red_flags;
    expect(rf.total_active).toBe(3);
    expect(rf.per_flag['operational.therapist.license.expired']).toBe(2);
    expect(rf.per_flag['operational.probation_review.overdue_7d']).toBe(1);
    expect(rf.per_flag['operational.therapist.mandatory_cert.expired']).toBe(0);
  });
});

// ─── Graceful degradation ───────────────────────────────────────

describe('buildDashboard — missing models degrade to null', () => {
  it('returns null section when its model is missing', async () => {
    const svc = createHrDashboardService({
      certificationModel: null,
      employmentContractModel: EmploymentContract,
      employeeModel: Employee,
      leaveBalanceModel: null,
      performanceReviewModel: null,
      redFlagStateModel: null,
      now: () => NOW,
    });
    const payload = await svc.buildDashboard();
    expect(payload.sections.certifications).toBeNull();
    expect(payload.sections.leave_balance).toBeNull();
    expect(payload.sections.probation).toBeNull();
    expect(payload.sections.annual_review).toBeNull();
    expect(payload.sections.red_flags).toBeNull();
    // The sections whose models ARE present still populate:
    expect(payload.sections.employment_contracts).toBeDefined();
    expect(payload.sections.scfhs_licenses).toBeDefined();
  });
});
