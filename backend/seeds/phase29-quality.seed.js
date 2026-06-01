'use strict';

/**
 * phase29-quality.seed.js — World-Class QMS demo seed.
 *
 * Populates realistic records across every Phase 29 module so the
 * dashboards render meaningfully on a fresh install. Every record
 * carries a `DEMO-Q29-*` marker so `--reset` can clear them without
 * touching production data.
 *
 * Public entry: `module.exports({ dryRun, reset })` — same shape as
 * the other Phase seeds. Caller is responsible for connecting to
 * Mongo and disconnecting afterwards.
 */

const mongoose = require('mongoose');

function safeRequire(p) {
  try {
    return require(p);
  } catch (_) {
    return null;
  }
}

async function main({ dryRun = false, reset = false } = {}) {
  const FmeaWorksheet = safeRequire('../models/quality/FmeaWorksheet.model');
  const RcaInvestigation = safeRequire('../models/quality/RcaInvestigation.model');
  const SpcChart = safeRequire('../models/quality/SpcChart.model');
  const A3Report = safeRequire('../models/quality/A3Report.model');
  const StandardsTraceability = safeRequire('../models/quality/StandardsTraceability.model');
  const ControlledDocument = safeRequire('../models/quality/ControlledDocument.model');
  const SupplierScar = safeRequire('../models/quality/SupplierScar.model');
  const CalibrationAsset = safeRequire('../models/quality/CalibrationAsset.model');
  const ChangeRequest = safeRequire('../models/quality/ChangeRequest.model');
  const AuditScope = safeRequire('../models/quality/AuditScope.model');
  const AuditOccurrence = safeRequire('../models/quality/AuditOccurrence.model');
  const CoqEntry = safeRequire('../models/quality/CoqEntry.model');
  const InspectionSubmission = safeRequire('../models/quality/InspectionSubmission.model');

  const facilitator = new mongoose.Types.ObjectId();
  const owner = new mongoose.Types.ObjectId();
  const vendorA = new mongoose.Types.ObjectId();
  const _reviewer = new mongoose.Types.ObjectId();
  const _approver = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();

  const summary = {
    fmea: 0,
    rca: 0,
    spc: 0,
    a3: 0,
    standards: 0,
    docs: 0,
    scars: 0,
    calibration: 0,
    changeRequests: 0,
    audits: 0,
    coqEntries: 0,
    inspections: 0,
  };

  if (reset && !dryRun) {
    console.log('Clearing existing DEMO-Q29-* records…');
    const _filter = { createdBy: facilitator };
    if (FmeaWorksheet) await FmeaWorksheet.deleteMany({ title: /^DEMO-Q29/ });
    if (RcaInvestigation) await RcaInvestigation.deleteMany({ title: /^DEMO-Q29/ });
    if (SpcChart) await SpcChart.deleteMany({ title: /^DEMO-Q29/ });
    if (A3Report) await A3Report.deleteMany({ title: /^DEMO-Q29/ });
    if (StandardsTraceability) await StandardsTraceability.deleteMany({ notes: /^DEMO-Q29/ });
    if (ControlledDocument) await ControlledDocument.deleteMany({ title: /^DEMO-Q29/ });
    if (SupplierScar) await SupplierScar.deleteMany({ title: /^DEMO-Q29/ });
    if (CalibrationAsset) await CalibrationAsset.deleteMany({ name: /^DEMO-Q29/ });
    if (ChangeRequest) await ChangeRequest.deleteMany({ title: /^DEMO-Q29/ });
    if (AuditScope) await AuditScope.deleteMany({ name: /^DEMO-Q29/ });
    if (AuditOccurrence) await AuditOccurrence.deleteMany({ summary: /^DEMO-Q29/ });
    if (CoqEntry) await CoqEntry.deleteMany({ description: /^DEMO-Q29/ });
    if (InspectionSubmission) await InspectionSubmission.deleteMany({ title: /^DEMO-Q29/ });
  }

  if (dryRun) {
    console.log('Dry run — would create the following:');
    return {
      dryRun: true,
      planned: {
        fmea: 2,
        rca: 2,
        spc: 3,
        a3: 2,
        scars: 3,
        calibration: 4,
        audits: 2,
        changeRequests: 2,
        coqEntries: 8,
        inspections: 4,
      },
    };
  }

  // ── 1. FMEA worksheet (HFMEA — falls prevention) ────────────────

  if (FmeaWorksheet) {
    const ws = await FmeaWorksheet.create({
      type: 'hfmea',
      scale: 'hfmea_5',
      title: 'DEMO-Q29 — HFMEA: منع السقوط في صالة العلاج',
      scope: 'من دخول المستفيد إلى الصالة وحتى مغادرتها',
      branchId,
      facilitatorUserId: facilitator,
      team: [
        { userId: facilitator, nameSnapshot: 'مدير الجودة', role: 'quality_manager' },
        { userId: owner, nameSnapshot: 'الطبيب المسؤول', role: 'medical_director' },
      ],
      rows: [
        {
          rowNumber: 1,
          functionAr: 'تأمين أرضية الصالة قبل الجلسة',
          failureMode: 'وجود ماء أو زيت متطاير',
          failureEffect: 'سقوط المستفيد وإصابة محتملة',
          severity: 4,
          probability: 2,
          hazardScore: 8,
          actionPriority: 'high',
          decisionTree: {},
          actions: [],
        },
        {
          rowNumber: 2,
          functionAr: 'مساعدة المستفيد على النهوض',
          failureMode: 'عدم وجود مرافق',
          failureEffect: 'سقوط أثناء النهوض',
          severity: 3,
          probability: 3,
          hazardScore: 9,
          actionPriority: 'high',
          decisionTree: {},
          actions: [],
        },
      ],
      status: 'draft',
      createdBy: facilitator,
    });
    summary.fmea++;
    console.log(`✓ FMEA worksheet ${ws.fmeaNumber}`);
  }

  // ── 2. RCA investigation ─────────────────────────────────────────

  if (RcaInvestigation) {
    const ishikawa = new Map();
    for (const cat of [
      'people',
      'process',
      'environment',
      'equipment',
      'policy',
      'communication',
      'patient_factors',
    ]) {
      ishikawa.set(cat, []);
    }
    ishikawa.get('people').push({ text: 'لم يلتزم الطاقم بفحص الأرضية' });
    ishikawa.get('environment').push({ text: 'تسرّب صنبور المياه' });
    ishikawa.get('process').push({ text: 'جدول التنظيف غير محدد' });

    const rca = await RcaInvestigation.create({
      title: 'DEMO-Q29 — RCA: سقوط مستفيد 30 أبريل',
      eventDate: new Date('2026-04-30'),
      eventDescription:
        'سقط المستفيد أثناء الانتقال بين الأجهزة في صالة العلاج الرئيسية. لم يبلغ عن إصابة جسيمة لكن استلزم متابعة طبية ليومين.',
      severity: 3,
      branchId,
      facilitatorUserId: facilitator,
      ishikawaVariant: 'healthcare',
      ishikawa,
      fiveWhys: [
        {
          level: 1,
          question: 'لماذا سقط المستفيد؟',
          answer: 'لأن الأرضية كانت مبللة',
          isRootCause: false,
        },
        {
          level: 2,
          question: 'لماذا كانت مبللة؟',
          answer: 'لأن نظافة الصالة تأخرت',
          isRootCause: false,
        },
        {
          level: 3,
          question: 'لماذا تأخرت؟',
          answer: 'لأن جدول التنظيف غير محدد',
          isRootCause: true,
        },
      ],
      status: 'analysis',
      createdBy: facilitator,
    });
    summary.rca++;
    console.log(`✓ RCA ${rca.rcaNumber}`);
  }

  // ── 3. SPC charts (3 — c, p, imr) ───────────────────────────────

  if (SpcChart) {
    const cChart = await SpcChart.create({
      title: 'DEMO-Q29 — c-chart: شكاوى يومية',
      chartType: 'c',
      metric: 'عدد الشكاوى',
      unit: 'count',
      branchId,
      measurements: Array.from({ length: 12 }, (_, i) => ({
        collectedAt: new Date(2026, 3, i + 1),
        count: [3, 5, 4, 3, 6, 4, 5, 4, 3, 5, 4, 6][i],
      })),
      status: 'active',
      createdBy: facilitator,
    });

    const pChart = await SpcChart.create({
      title: 'DEMO-Q29 — p-chart: نسبة عدم الالتزام بالموعد',
      chartType: 'p',
      metric: 'نسبة عدم الالتزام',
      unit: '%',
      branchId,
      measurements: Array.from({ length: 10 }, (_, i) => ({
        collectedAt: new Date(2026, 3, i + 1),
        defective: [2, 3, 1, 4, 2, 3, 2, 1, 3, 2][i],
        sampleSize: 50,
      })),
      status: 'active',
      createdBy: facilitator,
    });

    const imrChart = await SpcChart.create({
      title: 'DEMO-Q29 — I-MR: زمن الاستجابة الإسعافي (دقيقة)',
      chartType: 'imr',
      metric: 'زمن الاستجابة',
      unit: 'دقيقة',
      usl: 8,
      lsl: 2,
      branchId,
      measurements: [5.5, 5.6, 5.4, 5.5, 5.7, 5.5, 5.6, 5.5, 5.4, 5.6, 5.5, 5.7].map((v, i) => ({
        collectedAt: new Date(2026, 3, i + 1),
        values: [v],
      })),
      status: 'active',
      createdBy: facilitator,
    });
    summary.spc += 3;
    console.log(
      `✓ SPC charts: ${cChart.chartNumber}, ${pChart.chartNumber}, ${imrChart.chartNumber}`
    );
  }

  // ── 4. A3 Report ────────────────────────────────────────────────

  if (A3Report) {
    const sections = new Map();
    sections.set(
      'background',
      'تكرار شكاوى من تأخر استقبال المستفيدين الجدد خلال الربع الأول من 2026.'
    );
    sections.set(
      'current_state',
      'متوسط زمن استقبال 25 دقيقة، 8 من 10 مستفيدين يصرّحون بعدم الرضا.'
    );
    sections.set('goal', 'تقليص زمن الاستقبال إلى ≤10 دقائق بنهاية يونيو 2026.');
    const a3 = await A3Report.create({
      title: 'DEMO-Q29 — A3: تقليل زمن استقبال المستفيدين',
      problemStatement: 'زمن استقبال طويل يؤدي إلى انخفاض رضا الأسر والمستفيدين.',
      branchId,
      facilitatorUserId: facilitator,
      sections,
      actions: [],
      status: 'draft',
      createdBy: facilitator,
    });
    summary.a3++;
    console.log(`✓ A3 report ${a3.reportNumber}`);
  }

  // ── 5. Standards traceability — ISO 9001 §9.3 + JCI IPSG.1 ──────

  if (StandardsTraceability) {
    for (const item of [
      { standardCode: 'iso_9001_2015', clauseCode: '9.3', status: 'evidence_attached' },
      { standardCode: 'iso_9001_2015', clauseCode: '7.2', status: 'audit_passed' },
      { standardCode: 'iso_9001_2015', clauseCode: '8.4', status: 'in_progress' },
      { standardCode: 'jci_7th_ed', clauseCode: 'IPSG.1', status: 'evidence_attached' },
      { standardCode: 'cbahi_hc_4th_ed', clauseCode: 'IC.5', status: 'evidence_attached' },
    ]) {
      try {
        await StandardsTraceability.create({
          ...item,
          branchId,
          notes: 'DEMO-Q29',
          createdBy: facilitator,
        });
        summary.standards++;
      } catch (err) {
        if (!String(err.message).includes('duplicate key')) throw err;
      }
    }
    console.log(`✓ Standards traceability: ${summary.standards} records`);
  }

  // ── 6. Controlled Document ──────────────────────────────────────

  if (ControlledDocument) {
    const doc = await ControlledDocument.create({
      title: 'DEMO-Q29 — سياسة سلامة المستفيدين',
      type: 'policy',
      description:
        'وثيقة محكومة تجريبية لتوضيح آلية التوقيع الإلكتروني المتوافق مع 21 CFR Part 11.',
      branchId,
      ownerUserId: owner,
      versions: [],
      createdBy: facilitator,
    });
    summary.docs++;
    console.log(`✓ Controlled document ${doc.documentNumber}`);
  }

  // ── 7. Supplier SCARs ───────────────────────────────────────────

  if (SupplierScar) {
    for (const sev of ['minor', 'major', 'critical']) {
      await SupplierScar.create({
        vendorId: vendorA,
        branchId,
        title: `DEMO-Q29 — SCAR ${sev} على مورد المستلزمات`,
        description: `مشكلة جودة في الشحنة الأخيرة بدرجة ${sev}.`,
        severity: sev,
        responseDueBy: new Date(
          Date.now() + (sev === 'critical' ? 7 : sev === 'major' ? 14 : 30) * 86400000
        ),
        status: 'open',
        createdBy: facilitator,
      });
      summary.scars++;
    }
    console.log(`✓ Supplier SCARs: 3 (minor/major/critical)`);
  }

  // ── 8. Calibration assets ───────────────────────────────────────

  if (CalibrationAsset) {
    for (const cfg of [
      { name: 'DEMO-Q29 — ميزان حرارة A1', type: 'thermometer', freq: 6, unit: 'months' },
      { name: 'DEMO-Q29 — ميزان طبي B2', type: 'scale', freq: 12, unit: 'months' },
      { name: 'DEMO-Q29 — جهاز سكر C3', type: 'glucometer', freq: 3, unit: 'months' },
      { name: 'DEMO-Q29 — ثلاجة أدوية D4', type: 'refrigerator', freq: 12, unit: 'months' },
    ]) {
      const _asset = await CalibrationAsset.create({
        name: cfg.name,
        type: cfg.type,
        calibrationFrequency: cfg.freq,
        calibrationFrequencyUnit: cfg.unit,
        branchId,
        lastCalibratedAt: new Date(Date.now() - 86400000 * 30),
        nextDueDate: new Date(Date.now() + 86400000 * 60),
        status: 'active',
        createdBy: facilitator,
      });
      summary.calibration++;
    }
    console.log(`✓ Calibration assets: 4`);
  }

  // ── 9. Change Request ───────────────────────────────────────────

  if (ChangeRequest) {
    const cr = await ChangeRequest.create({
      title: 'DEMO-Q29 — تحديث سياسة إعطاء الأدوية',
      rationale: 'مواكبة آخر إرشادات وزارة الصحة 2026 + تقليل أخطاء الأدوية بنسبة 30%.',
      type: 'process',
      branchId,
      requestedBy: facilitator,
      ownerUserId: owner,
      riskLevel: 'high',
      cabRequired: true,
      status: 'draft',
      createdBy: facilitator,
    });
    summary.changeRequests++;
    console.log(`✓ Change request ${cr.crNumber}`);
  }

  // ── 10. Audit scopes + occurrences ──────────────────────────────

  if (AuditScope && AuditOccurrence) {
    const scope = await AuditScope.create({
      name: 'DEMO-Q29 — مكافحة العدوى',
      riskLevel: 'high',
      department: 'IPC',
      branchId,
      active: true,
      createdBy: facilitator,
    });
    const occ = await AuditOccurrence.create({
      scopeId: scope._id,
      type: 'internal',
      plannedFor: new Date(Date.now() + 86400000 * 15),
      summary: 'DEMO-Q29',
      status: 'planned',
      branchId,
      autoGenerated: true,
      createdBy: facilitator,
    });
    summary.audits++;
    console.log(`✓ Audit scope + occurrence ${occ.auditNumber}`);
  }

  // ── 11. CoQ entries — 8 across categories ───────────────────────

  if (CoqEntry) {
    const year = new Date().getFullYear();
    for (const entry of [
      {
        category: 'prevention',
        amount: 5000,
        description: 'DEMO-Q29 تدريب على FMEA',
        period: { year, month: 4 },
      },
      {
        category: 'prevention',
        amount: 3000,
        description: 'DEMO-Q29 ورشة JCI',
        period: { year, month: 4 },
      },
      {
        category: 'appraisal',
        amount: 8000,
        description: 'DEMO-Q29 معايرة سنوية',
        period: { year, month: 4 },
      },
      {
        category: 'appraisal',
        amount: 4000,
        description: 'DEMO-Q29 تدقيق داخلي',
        period: { year, month: 4 },
      },
      {
        category: 'internal_failure',
        amount: 2000,
        description: 'DEMO-Q29 إعادة معالجة شكاوى',
        period: { year, month: 4 },
      },
      {
        category: 'internal_failure',
        amount: 1500,
        description: 'DEMO-Q29 توقّف معدات',
        period: { year, month: 4 },
      },
      {
        category: 'external_failure',
        amount: 800,
        description: 'DEMO-Q29 تعويض شكوى',
        period: { year, month: 4 },
      },
      {
        category: 'external_failure',
        amount: 200,
        description: 'DEMO-Q29 معالجة شكوى رسمية',
        period: { year, month: 4 },
      },
    ]) {
      await CoqEntry.create({ ...entry, branchId, createdBy: facilitator });
      summary.coqEntries++;
    }
    console.log(`✓ CoQ entries: 8`);
  }

  // ── 12. Inspection submissions ──────────────────────────────────

  if (InspectionSubmission) {
    for (let i = 0; i < 4; i++) {
      await InspectionSubmission.create({
        clientUuid: `demo-q29-uuid-${i}-${Date.now()}`,
        inspectionType: 'hand_hygiene',
        title: 'DEMO-Q29 جولة نظافة أيدي',
        branchId,
        inspectorUserId: facilitator,
        capturedAt: new Date(Date.now() - 86400000 * (i + 1)),
        submittedAt: new Date(),
        items: [
          { itemCode: 'wash', answer: i % 2 === 0 ? 'pass' : 'fail' },
          { itemCode: 'sanitiser', answer: 'pass' },
          { itemCode: 'gloves', answer: 'pass' },
        ],
        overallScore: i % 2 === 0 ? 100 : 66.67,
        overallOutcome: i % 2 === 0 ? 'pass' : 'fail',
        createdBy: facilitator,
      });
      summary.inspections++;
    }
    console.log(`✓ Inspection submissions: 4`);
  }

  console.log('\n📊 Phase 29 demo seed summary:');
  for (const [k, v] of Object.entries(summary)) {
    console.log(`   ${k.padEnd(18)}: ${v}`);
  }

  return summary;
}

module.exports = main;
