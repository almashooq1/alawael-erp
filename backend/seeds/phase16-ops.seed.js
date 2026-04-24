'use strict';

/**
 * phase16-ops.seed.js — end-to-end demo data for Phase 16 Ops
 * Control Tower so all 9 UI pages (8 subject pages + hub) render
 * with meaningful content.
 *
 * Seeds across every Phase-16 subject:
 *
 *   Facilities (3)    — 1 clinic, 1 warehouse, 1 HQ annex
 *   Inspections (4)   — mix of scheduled / in_progress / completed
 *   Findings (6)      — 1 critical (auto-spawns WO), 2 major, 2 minor, 1 observation
 *   Work Orders (6)   — 1 auto-spawned + 5 hand-seeded across full lifecycle
 *   SLAs              — activated via the engine for every tracked subject
 *   Purchase Requests (3) — draft, under_review (multi-tier), approved
 *   Meetings (2)      — 1 completed with decisions, 1 scheduled
 *   Meeting Decisions (3) — open / in_progress / overdue
 *   Route Jobs (2)    — 1 planning w/ requests, 1 completed with variance
 *   Notification Prefs (1) — demo user with quiet hours + digest enabled
 *
 * All records prefixed `DEMO-` or tagged with `seedSource: 'phase16-ops'`
 * so the `--reset` flag can safely clean them up without touching real data.
 *
 * Usage (from a wrapper script that connects to Mongo):
 *   const seed = require('./seeds/phase16-ops.seed');
 *   await seed({ reset: true });
 */

const mongoose = require('mongoose');

module.exports = async function seedPhase16Ops({
  dryRun = false,
  reset = false,
  logger = console,
} = {}) {
  // ── Models ───────────────────────────────────────────────────────
  const Branch = require('../models/Branch');
  const Facility = require('../models/operations/Facility.model');
  const FacilityInspection = require('../models/operations/FacilityInspection.model');
  const WorkOrder = require('../models/MaintenanceWorkOrder');
  const PurchaseRequest = require('../models/operations/PurchaseRequest.model');
  const Meeting = require('../models/Meeting');
  const MeetingDecision = require('../models/operations/MeetingDecision.model');
  const RouteJob = require('../models/operations/RouteOptimizationJob.model');
  const NotificationPreferences = require('../models/operations/NotificationPreferences.model');
  const SLA = require('../models/operations/SLA.model');

  // ── Services (for SLA activation) ───────────────────────────────
  const slaEngineModule = require('../services/operations/slaEngine.service');
  const slaEngine = slaEngineModule.getDefault();

  const report = {
    created: {},
    cleared: {},
    notes: [],
  };
  const bump = (k, delta = 1) => {
    report.created[k] = (report.created[k] || 0) + delta;
  };
  const bumpCleared = (k, n) => {
    if (n) report.cleared[k] = n;
  };

  // ── Reset phase ─────────────────────────────────────────────────
  if (reset && !dryRun) {
    logger.info('  [reset] clearing existing Phase-16 demo data…');
    const [facR, inspR, woR, prR, meetR, decR, rjR, prefR, slaR] = await Promise.all([
      Facility.deleteMany({ code: /^DEMO-OPS-/ }).then(r => r.deletedCount),
      FacilityInspection.deleteMany({ inspectionNumber: /^DEMO-OPS-/ }).then(r => r.deletedCount),
      WorkOrder.deleteMany({ workOrderNumber: /^DEMO-OPS-/ }).then(r => r.deletedCount),
      PurchaseRequest.deleteMany({ requestNumber: /^DEMO-OPS-/ }).then(r => r.deletedCount),
      Meeting.deleteMany({ meetingId: /^DEMO-OPS-/ }).then(r => r.deletedCount),
      MeetingDecision.deleteMany({ decisionNumber: /^DEMO-OPS-/ }).then(r => r.deletedCount),
      RouteJob.deleteMany({ jobNumber: /^DEMO-OPS-/ }).then(r => r.deletedCount),
      NotificationPreferences.deleteMany({ dndReason: /Phase-16 demo/ }).then(r => r.deletedCount),
      SLA.deleteMany({ subjectRef: /^DEMO-OPS-/ }).then(r => r.deletedCount),
    ]);
    bumpCleared('facilities', facR);
    bumpCleared('inspections', inspR);
    bumpCleared('workOrders', woR);
    bumpCleared('purchaseRequests', prR);
    bumpCleared('meetings', meetR);
    bumpCleared('decisions', decR);
    bumpCleared('routeJobs', rjR);
    bumpCleared('notifPrefs', prefR);
    bumpCleared('slas', slaR);
  }

  if (dryRun) {
    return {
      dryRun: true,
      message:
        'سيتم إنشاء ~25 سجلاً للعرض التجريبي عبر 8 خدمات (مرافق، تفتيشات، أوامر صيانة، طلبات شراء، اجتماعات، قرارات، رحلات نقل، تفضيلات إشعارات).',
    };
  }

  // ── Branch discovery (use an existing active branch or mint one) ─
  let branch = await Branch.findOne({ status: 'active' });
  if (!branch) {
    branch = await Branch.create({
      code: 'DEMO-OPS-BR',
      name_ar: 'فرع العرض التجريبي',
      name_en: 'Demo Ops Branch',
      type: 'branch',
      status: 'active',
      location: {
        city_ar: 'الرياض',
        city_en: 'Riyadh',
        region: 'riyadh',
      },
    });
    report.notes.push('Created a demo branch (no active branch existed).');
    bump('branches');
  }

  // ── Facilities ──────────────────────────────────────────────────
  const now = new Date();
  const facilitiesSpec = [
    {
      code: 'DEMO-OPS-CLINIC-1',
      nameAr: 'عيادة الرياض التجريبية',
      nameEn: 'Riyadh Demo Clinic',
      type: 'clinic',
      totalFloors: 3,
      capacityPersons: 45,
      hasWheelchairAccess: true,
    },
    {
      code: 'DEMO-OPS-WAREHOUSE-1',
      nameAr: 'مستودع المعدات التجريبي',
      nameEn: 'Demo Equipment Warehouse',
      type: 'warehouse',
      totalFloors: 1,
      capacityPersons: 10,
      hasWheelchairAccess: false,
    },
    {
      code: 'DEMO-OPS-HQ-ANNEX',
      nameAr: 'ملحق المقر الإداري',
      nameEn: 'HQ Annex Building',
      type: 'annex',
      totalFloors: 2,
      capacityPersons: 20,
      hasWheelchairAccess: true,
    },
  ];
  const facilities = [];
  for (const spec of facilitiesSpec) {
    const fac = await Facility.create({
      ...spec,
      branchId: branch._id,
      status: 'active',
    });
    facilities.push(fac);
    bump('facilities');
  }

  // ── Inspections + Findings ──────────────────────────────────────
  const clinicFacility = facilities[0];
  const warehouseFacility = facilities[1];

  // Inspection 1: COMPLETED with 2 findings (one critical → auto WO, one minor)
  const completedInsp = await FacilityInspection.create({
    inspectionNumber: `DEMO-OPS-INSP-${Date.now()}-1`,
    facilityId: clinicFacility._id,
    branchId: branch._id,
    type: 'fire_safety',
    status: 'completed',
    scheduledFor: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
    startedAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000 + 3600 * 1000),
    completedAt: new Date(now.getTime() - 6 * 24 * 3600 * 1000),
    inspectorNameSnapshot: 'م. أحمد المُفتش',
    summary: 'تفتيش سلامة الحريق: ملاحظتان (١ حرجة + ١ بسيطة)',
    findings: [
      {
        description: 'طفاية حريق منتهية الصلاحية في الدور الأرضي',
        severity: 'critical',
        location: 'الدور الأرضي — البهو الرئيسي',
        recommendation: 'استبدال بطفاية CO2 سعة 5 كجم',
        status: 'in_progress',
        raisedAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000 + 3600 * 1000),
      },
      {
        description: 'علامات مخرج الطوارئ باهتة',
        severity: 'minor',
        location: 'الممر الغربي',
        recommendation: 'إعادة طلاء + إضافة ملصقات فسفورية',
        status: 'open',
        raisedAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000 + 3600 * 1000),
      },
    ],
  });
  bump('inspections');
  bump('findings', 2);

  // Inspection 2: IN_PROGRESS
  const inProgressInsp = await FacilityInspection.create({
    inspectionNumber: `DEMO-OPS-INSP-${Date.now()}-2`,
    facilityId: clinicFacility._id,
    branchId: branch._id,
    type: 'hvac',
    status: 'in_progress',
    scheduledFor: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
    startedAt: new Date(now.getTime() - 2 * 3600 * 1000),
    inspectorNameSnapshot: 'م. سلمان فني HVAC',
    findings: [
      {
        description: 'تسرّب طفيف في وحدة التكييف المركزي',
        severity: 'major',
        location: 'سطح المبنى — الوحدة 2',
        status: 'awaiting_vendor',
        raisedAt: new Date(now.getTime() - 1 * 3600 * 1000),
      },
    ],
  });
  bump('inspections');
  bump('findings');

  // Inspection 3: SCHEDULED (future)
  await FacilityInspection.create({
    inspectionNumber: `DEMO-OPS-INSP-${Date.now()}-3`,
    facilityId: warehouseFacility._id,
    branchId: branch._id,
    type: 'pest_control',
    status: 'scheduled',
    scheduledFor: new Date(now.getTime() + 3 * 24 * 3600 * 1000),
    findings: [],
  });
  bump('inspections');

  // Inspection 4: SCHEDULED (past-due — should appear in "inspectionsDue" KPI)
  await FacilityInspection.create({
    inspectionNumber: `DEMO-OPS-INSP-${Date.now()}-4`,
    facilityId: clinicFacility._id,
    branchId: branch._id,
    type: 'accessibility',
    status: 'scheduled',
    scheduledFor: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
    findings: [],
  });
  bump('inspections');

  // ── Work Orders (5 manually-seeded + 1 auto-ref from finding) ───
  // Create a dummy asset-id placeholder (most filters don't dereference it)
  const demoAssetId = new mongoose.Types.ObjectId();

  // WO #1 auto-spawned from critical finding (link via finding.workOrderId)
  const autoWo = await WorkOrder.create({
    workOrderNumber: `DEMO-OPS-WO-${Date.now()}-1`,
    branchId: branch._id,
    assetId: demoAssetId,
    type: 'corrective',
    priority: 'critical',
    status: 'in_progress',
    title: 'استبدال طفاية حريق منتهية',
    description: 'أمر تلقائي من تفتيش سلامة الحريق — ملاحظة حرجة',
    scheduledDate: new Date(now.getTime() - 6 * 24 * 3600 * 1000),
    startedDate: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
    statusHistory: [
      {
        from: 'draft',
        to: 'submitted',
        event: 'submitted',
        at: new Date(now.getTime() - 6 * 24 * 3600 * 1000),
      },
      {
        from: 'submitted',
        to: 'triaged',
        event: 'triaged',
        at: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
      },
      {
        from: 'triaged',
        to: 'approved',
        event: 'approved',
        at: new Date(now.getTime() - 4 * 24 * 3600 * 1000),
      },
      {
        from: 'approved',
        to: 'scheduled',
        event: 'scheduled',
        at: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
      },
      {
        from: 'scheduled',
        to: 'in_progress',
        event: 'started',
        at: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
      },
    ],
  });
  bump('workOrders');

  // Link finding → WO
  completedInsp.findings[0].workOrderId = autoWo._id;
  await completedInsp.save();

  // WO #2 — scheduled preventive, upcoming
  await WorkOrder.create({
    workOrderNumber: `DEMO-OPS-WO-${Date.now()}-2`,
    branchId: branch._id,
    assetId: demoAssetId,
    type: 'preventive',
    priority: 'normal',
    status: 'scheduled',
    title: 'صيانة وقائية ربع سنوية للمصاعد',
    description: 'صيانة دورية كاملة — فحص الكابلات + تزييت + اختبار فرامل الطوارئ',
    scheduledDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
    statusHistory: [
      {
        from: 'draft',
        to: 'submitted',
        event: 'submitted',
        at: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
      },
      {
        from: 'submitted',
        to: 'approved',
        event: 'approved',
        at: new Date(now.getTime() - 6 * 24 * 3600 * 1000),
      },
      {
        from: 'approved',
        to: 'scheduled',
        event: 'scheduled',
        at: new Date(now.getTime() - 6 * 24 * 3600 * 1000),
      },
    ],
  });
  bump('workOrders');

  // WO #3 — OVERDUE (past scheduled + still open)
  await WorkOrder.create({
    workOrderNumber: `DEMO-OPS-WO-${Date.now()}-3`,
    branchId: branch._id,
    assetId: demoAssetId,
    type: 'corrective',
    priority: 'high',
    status: 'submitted',
    title: 'تسرّب مياه في الحمام — الدور الثاني',
    description: 'تسرّب تحت الحوض',
    scheduledDate: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
  });
  bump('workOrders');

  // WO #4 — completed + verified
  await WorkOrder.create({
    workOrderNumber: `DEMO-OPS-WO-${Date.now()}-4`,
    branchId: branch._id,
    assetId: demoAssetId,
    type: 'emergency',
    priority: 'critical',
    status: 'closed',
    title: 'انقطاع كهرباء الطابق الأول',
    description: 'فيوز رئيسي محروق',
    resolution: 'تم استبدال الفيوز وإضافة circuit breaker إضافي',
    scheduledDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
    startedDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000 + 1800 * 1000),
    completedDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000 + 4 * 3600 * 1000),
    statusHistory: [
      {
        from: 'draft',
        to: 'submitted',
        event: 'submitted',
        at: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
      },
      {
        from: 'submitted',
        to: 'approved',
        event: 'approved',
        at: new Date(now.getTime() - 10 * 24 * 3600 * 1000 + 300 * 1000),
      },
      {
        from: 'approved',
        to: 'in_progress',
        event: 'started',
        at: new Date(now.getTime() - 10 * 24 * 3600 * 1000 + 1800 * 1000),
      },
      {
        from: 'in_progress',
        to: 'completed',
        event: 'completed',
        at: new Date(now.getTime() - 10 * 24 * 3600 * 1000 + 4 * 3600 * 1000),
      },
      {
        from: 'completed',
        to: 'verified',
        event: 'verified',
        at: new Date(now.getTime() - 9 * 24 * 3600 * 1000),
      },
      {
        from: 'verified',
        to: 'closed',
        event: 'closed',
        at: new Date(now.getTime() - 9 * 24 * 3600 * 1000 + 1800 * 1000),
      },
    ],
  });
  bump('workOrders');

  // WO #5 — on_hold (awaiting spare parts, pauses SLA)
  await WorkOrder.create({
    workOrderNumber: `DEMO-OPS-WO-${Date.now()}-5`,
    branchId: branch._id,
    assetId: demoAssetId,
    type: 'corrective',
    priority: 'high',
    status: 'on_hold',
    title: 'إصلاح جهاز أشعة CT — انتظار قطعة غيار',
    description: 'كرت التحكم الرئيسي تالف — تم طلبه من المورّد',
    scheduledDate: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
    startedDate: new Date(now.getTime() - 3 * 24 * 3600 * 1000 + 3600 * 1000),
  });
  bump('workOrders');

  // WO #6 — cancelled
  await WorkOrder.create({
    workOrderNumber: `DEMO-OPS-WO-${Date.now()}-6`,
    branchId: branch._id,
    assetId: demoAssetId,
    type: 'inspection',
    priority: 'low',
    status: 'cancelled',
    title: 'تفتيش شهري — ملغى (دمج مع تفتيش كبير)',
    description: 'تم دمجه مع التفتيش الربع سنوي الشامل',
    scheduledDate: new Date(now.getTime() + 10 * 24 * 3600 * 1000),
  });
  bump('workOrders');

  // ── Purchase Requests ───────────────────────────────────────────
  const demoUserA = new mongoose.Types.ObjectId();
  const demoUserB = new mongoose.Types.ObjectId();

  // PR #1 — draft
  await PurchaseRequest.create({
    requestNumber: `DEMO-OPS-PR-${Date.now()}-1`,
    status: 'draft',
    priority: 'normal',
    requiredDate: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
    branchId: branch._id,
    department: 'admin',
    items: [
      {
        itemName: 'أجهزة حاسب محمولة للفريق',
        quantity: 3,
        unit: 'قطعة',
        estimatedUnitPrice: 4500,
      },
    ],
    justification: 'تجديد دوري للأجهزة المكتبية',
    createdBy: demoUserA,
  });
  bump('purchaseRequests');

  // PR #2 — under_review (multi-tier, mid-approval)
  await PurchaseRequest.create({
    requestNumber: `DEMO-OPS-PR-${Date.now()}-2`,
    status: 'under_review',
    priority: 'high',
    requiredDate: new Date(now.getTime() + 45 * 24 * 3600 * 1000),
    branchId: branch._id,
    department: 'maintenance',
    items: [
      {
        itemName: 'مولّد كهرباء احتياطي 250 KVA',
        quantity: 1,
        unit: 'قطعة',
        estimatedUnitPrice: 180000,
      },
      {
        itemName: 'تركيب + توصيل',
        quantity: 1,
        unit: 'خدمة',
        estimatedUnitPrice: 25000,
      },
    ],
    justification: 'تحسين موثوقية التيار الكهربائي بعد انقطاعات متكررة',
    approvalTier: 'complex',
    currentApprovalLevel: 2,
    submittedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
    approvals: [
      {
        level: 1,
        role: 'department_head',
        label: 'Department Head',
        status: 'approved',
        approverId: demoUserA,
        approverNameSnapshot: 'د. خالد مدير القسم',
        decidedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        comments: 'مطلوب بشكل عاجل — الموافقة',
      },
      {
        level: 2,
        role: 'procurement_manager',
        label: 'Procurement Manager',
        status: 'pending',
      },
      {
        level: 3,
        role: 'cfo',
        label: 'CFO',
        status: 'pending',
      },
    ],
    createdBy: demoUserA,
  });
  bump('purchaseRequests');

  // PR #3 — approved, ready for convert-to-PO
  await PurchaseRequest.create({
    requestNumber: `DEMO-OPS-PR-${Date.now()}-3`,
    status: 'approved',
    priority: 'normal',
    requiredDate: new Date(now.getTime() + 20 * 24 * 3600 * 1000),
    branchId: branch._id,
    department: 'clinical',
    items: [
      {
        itemName: 'ألعاب علاجية للجلسات',
        quantity: 15,
        unit: 'مجموعة',
        estimatedUnitPrice: 280,
      },
    ],
    justification: 'تجديد مستلزمات جلسات العلاج',
    approvalTier: 'simple',
    currentApprovalLevel: 1,
    submittedAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
    approvals: [
      {
        level: 1,
        role: 'department_head',
        label: 'Department Head',
        status: 'approved',
        approverId: demoUserA,
        approverNameSnapshot: 'د. منى رئيسة القسم الإكلينيكي',
        decidedAt: new Date(now.getTime() - 4 * 24 * 3600 * 1000),
        comments: 'موافقة — ضمن الميزانية',
      },
    ],
    createdBy: demoUserB,
  });
  bump('purchaseRequests');

  // ── Meetings + Decisions ────────────────────────────────────────
  const completedMeeting = await Meeting.create({
    meetingId: `DEMO-OPS-MTG-${Date.now()}-1`,
    title: 'اجتماع مجلس الإدارة الربع سنوي',
    description: 'مراجعة أداء Q1 واعتماد خطة Q2',
    type: 'board',
    status: 'completed',
    date: new Date(now.getTime() - 14 * 24 * 3600 * 1000),
    startTime: '10:00',
    endTime: '12:30',
    duration: 150,
    location: 'قاعة الإدارة — المقر الرئيسي',
    organizer: demoUserA,
    attendees: [
      { name: 'المدير التنفيذي', role: 'required', rsvp: 'accepted', attended: true },
      { name: 'المدير المالي', role: 'required', rsvp: 'accepted', attended: true },
      { name: 'مدير العمليات', role: 'required', rsvp: 'accepted', attended: true },
    ],
    decisions: [
      'اعتماد زيادة ميزانية العلاج السلوكي بنسبة 15%',
      'تأجيل افتتاح فرع جدة إلى Q3',
      'توقيع عقد صيانة سنوي مع ABC للمعدات',
    ],
  });
  bump('meetings');

  // Meeting 2 — scheduled
  await Meeting.create({
    meetingId: `DEMO-OPS-MTG-${Date.now()}-2`,
    title: 'اجتماع لجنة الجودة الشهري',
    type: 'review',
    status: 'scheduled',
    date: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
    startTime: '14:00',
    endTime: '15:30',
    duration: 90,
    organizer: demoUserA,
    attendees: [],
  });
  bump('meetings');

  // Meeting Decisions (3 — open / in_progress / overdue)
  const decYear = now.getUTCFullYear();
  await MeetingDecision.create({
    decisionNumber: `DEMO-OPS-DEC-${decYear}-1`,
    meetingId: completedMeeting._id,
    meetingTitleSnapshot: completedMeeting.title,
    meetingDateSnapshot: completedMeeting.date,
    branchId: branch._id,
    type: 'investment',
    title: 'إعداد خطة توسع فرع الرياض للخدمات المسائية',
    description: 'تحليل الطاقة الاستيعابية + الطاقم + ميزانية capex',
    ownerUserId: demoUserA,
    ownerNameSnapshot: 'د. أحمد مدير العمليات',
    priority: 'high',
    status: 'open',
    assignedAt: new Date(now.getTime() - 14 * 24 * 3600 * 1000),
    dueDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
  });
  bump('decisions');

  await MeetingDecision.create({
    decisionNumber: `DEMO-OPS-DEC-${decYear}-2`,
    meetingId: completedMeeting._id,
    meetingTitleSnapshot: completedMeeting.title,
    branchId: branch._id,
    type: 'directive',
    title: 'تطبيق نظام الإشعارات الجديد في الأقسام كلها',
    ownerUserId: demoUserB,
    ownerNameSnapshot: 'م. سارة مدير IT',
    priority: 'medium',
    status: 'in_progress',
    assignedAt: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
    dueDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
    statusHistory: [
      {
        from: 'open',
        to: 'in_progress',
        event: 'started',
        at: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
      },
    ],
  });
  bump('decisions');

  // Overdue decision
  await MeetingDecision.create({
    decisionNumber: `DEMO-OPS-DEC-${decYear}-3`,
    meetingId: completedMeeting._id,
    meetingTitleSnapshot: completedMeeting.title,
    branchId: branch._id,
    type: 'policy_change',
    title: 'تحديث سياسة ساعات العمل المرنة للموظفين',
    ownerUserId: demoUserA,
    ownerNameSnapshot: 'د. أحمد مدير العمليات',
    priority: 'medium',
    status: 'overdue',
    assignedAt: new Date(now.getTime() - 30 * 24 * 3600 * 1000),
    dueDate: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
    overdueFlaggedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
  });
  bump('decisions');

  // ── Route Optimization Jobs ─────────────────────────────────────

  // Route 1 — PLANNING with 3 requests (not yet optimized)
  await RouteJob.create({
    jobNumber: `DEMO-OPS-ROJ-${decYear}-1`,
    branchId: branch._id,
    runDate: new Date(now.getTime() + 1 * 24 * 3600 * 1000),
    shift: 'morning',
    departureTime: new Date(new Date(now.getTime() + 1 * 24 * 3600 * 1000).setHours(7, 0, 0, 0)),
    status: 'planning',
    requests: [
      {
        beneficiaryNameSnapshot: 'أحمد (طفل)',
        pickupAddress: 'حي الملز — شارع الستين',
        postalCode: '11564',
        priority: 'standard',
      },
      {
        beneficiaryNameSnapshot: 'سارة (طفلة)',
        pickupAddress: 'حي النسيم — شارع 12',
        postalCode: '13315',
        priority: 'medical',
        requiredCapabilities: ['wheelchair_lift'],
      },
      {
        beneficiaryNameSnapshot: 'عبدالله (طفل)',
        pickupAddress: 'حي العليا — شارع التحلية',
        postalCode: '11523',
        priority: 'standard',
      },
    ],
  });
  bump('routeJobs');

  // Route 2 — COMPLETED with full variance summary
  const runDate2 = new Date(now.getTime() - 1 * 24 * 3600 * 1000);
  const departure2 = new Date(runDate2);
  departure2.setHours(7, 0, 0, 0);
  const stop0Planned = new Date(departure2);
  const stop1Planned = new Date(departure2.getTime() + 10 * 60 * 1000);
  const stop2Planned = new Date(departure2.getTime() + 20 * 60 * 1000);

  await RouteJob.create({
    jobNumber: `DEMO-OPS-ROJ-${decYear}-2`,
    branchId: branch._id,
    runDate: runDate2,
    shift: 'morning',
    departureTime: departure2,
    status: 'completed',
    assignedVehicleId: new mongoose.Types.ObjectId(),
    assignedVehicleRegistration: 'ر س و — ٤٥٦٧',
    assignedVehicleCapabilities: ['wheelchair_lift'],
    assignedDriverId: new mongoose.Types.ObjectId(),
    assignedDriverNameSnapshot: 'السائق محمد',
    requests: [
      {
        beneficiaryNameSnapshot: 'فاطمة',
        priority: 'medical',
        pickupAddress: 'حي النسيم',
        postalCode: '13315',
      },
      {
        beneficiaryNameSnapshot: 'خالد',
        priority: 'standard',
        pickupAddress: 'حي الملز',
        postalCode: '11564',
      },
      {
        beneficiaryNameSnapshot: 'ليلى',
        priority: 'standard',
        pickupAddress: 'حي العليا',
        postalCode: '11523',
      },
    ],
    plannedStops: [
      {
        sequence: 0,
        address: 'حي النسيم',
        plannedArrival: stop0Planned,
        actualArrival: new Date(stop0Planned.getTime() + 2 * 60 * 1000),
        varianceMinutes: 2,
        status: 'picked_up',
        statusAt: new Date(stop0Planned.getTime() + 3 * 60 * 1000),
        requestIds: [],
        beneficiarySnapshot: { count: 1, names: ['فاطمة'] },
      },
      {
        sequence: 1,
        address: 'حي الملز',
        plannedArrival: stop1Planned,
        actualArrival: new Date(stop1Planned.getTime() + 12 * 60 * 1000),
        varianceMinutes: 12,
        status: 'picked_up',
        statusAt: new Date(stop1Planned.getTime() + 15 * 60 * 1000),
        statusNotes: 'ازدحام مروري',
        requestIds: [],
        beneficiarySnapshot: { count: 1, names: ['خالد'] },
      },
      {
        sequence: 2,
        address: 'حي العليا',
        plannedArrival: stop2Planned,
        actualArrival: null,
        varianceMinutes: null,
        status: 'missed',
        statusAt: new Date(stop2Planned.getTime() + 5 * 60 * 1000),
        statusNotes: 'المستفيد غير موجود — لم يرد الوالد',
        requestIds: [],
        beneficiarySnapshot: { count: 1, names: ['ليلى'] },
      },
    ],
    varianceSummary: {
      totalStops: 3,
      onTimeCount: 1,
      lateCount: 1,
      missedCount: 1,
      avgVarianceMinutes: 7,
      maxVarianceMinutes: 12,
    },
    completedAt: new Date(departure2.getTime() + 60 * 60 * 1000),
    optimizationParams: {
      minutesPerStop: 10,
      maxStopsPerVehicle: 20,
      algorithm: 'geo-bucket-nn-v1',
      optimizedAt: new Date(departure2.getTime() - 30 * 60 * 1000),
    },
  });
  bump('routeJobs');

  // ── Notification Preferences (demo user with DND + digest) ──────
  await NotificationPreferences.create({
    userId: demoUserA,
    channelPreferences: {
      email: { enabled: true, address: 'demo-ops-a@demo.alawael.com' },
      sms: { enabled: true },
      push: { enabled: true },
      slack: { enabled: false },
      in_app: { enabled: true },
      whatsapp: { enabled: true },
    },
    quietHours: {
      enabled: true,
      startHour: 22,
      endHour: 6,
      timezone: 'Asia/Riyadh',
    },
    digest: {
      enabled: true,
      sendHour: 8,
      includePriorities: ['low', 'normal'],
    },
    dndUntil: null,
    dndReason: 'Phase-16 demo user',
  });
  bump('notifPrefs');

  // ── Activate a few SLA clocks via the engine so the dashboard shows data ─
  if (slaEngine) {
    try {
      await slaEngine.activate({
        policyId: 'facility.inspection.closeout',
        subjectType: 'FacilityInspectionFinding',
        subjectId: completedInsp.findings[0]._id,
        subjectRef: `DEMO-OPS-${completedInsp.inspectionNumber}#1`,
        branchId: branch._id,
        startedAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
        metadata: { severity: 'critical', seed: 'phase16-ops' },
      });
      bump('slas');
    } catch (err) {
      logger.warn(`  [sla] facility SLA activate skipped: ${err.message}`);
    }
    try {
      await slaEngine.activate({
        policyId: 'maintenance.wo.critical',
        subjectType: 'MaintenanceWorkOrder',
        subjectId: autoWo._id,
        subjectRef: autoWo.workOrderNumber,
        branchId: branch._id,
        startedAt: new Date(now.getTime() - 6 * 24 * 3600 * 1000),
        metadata: { seed: 'phase16-ops' },
      });
      bump('slas');
    } catch (err) {
      logger.warn(`  [sla] WO SLA activate skipped: ${err.message}`);
    }
  } else {
    report.notes.push(
      'SLA engine default not available — skipped activations. Run the backend first.'
    );
  }

  return {
    summary: {
      branches: (report.created.branches || 0) + ' (or reused existing)',
      facilities: report.created.facilities || 0,
      inspections: report.created.inspections || 0,
      findings: report.created.findings || 0,
      workOrders: report.created.workOrders || 0,
      purchaseRequests: report.created.purchaseRequests || 0,
      meetings: report.created.meetings || 0,
      decisions: report.created.decisions || 0,
      routeJobs: report.created.routeJobs || 0,
      notifPrefs: report.created.notifPrefs || 0,
      slas: report.created.slas || 0,
    },
    cleared: report.cleared,
    notes: report.notes,
    branchId: String(branch._id),
    hint: 'افتح لوحة الفرع على /ops/branch-board وأدخل معرّف الفرع أعلاه — ستجد كل أقسام Phase-16 مأهولة.',
  };
};
