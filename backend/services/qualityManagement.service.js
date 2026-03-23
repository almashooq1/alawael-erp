/**
 * Quality Management Service — خدمة إدارة الجودة (ISO / CBAHI)
 * Phase 20 — تدقيق، مؤشرات جودة، تقارير اعتماد تلقائية
 *
 * Features:
 *   - Audit management (plan, schedule, execute, track findings)
 *   - Quality indicators (KPIs) per department / standard
 *   - Accreditation report generation (CBAHI / JCI / ISO 9001)
 *   - Non-conformance (NC) tracking with CAPA workflow
 *   - Document control (policies, SOPs, work instructions)
 *   - Risk register linked to standards
 *   - Corrective & preventive actions lifecycle
 *   - Dashboard with compliance scores & readiness
 */

const logger = console;

/* ═══════════════════ Reference Data ═══════════════════ */

const STANDARDS = [
  { id: 'cbahi', nameAr: 'معايير سباهي', nameEn: 'CBAHI', version: '4.0', totalClauses: 285 },
  {
    id: 'jci',
    nameAr: 'اللجنة الدولية المشتركة',
    nameEn: 'JCI',
    version: '7th',
    totalClauses: 320,
  },
  {
    id: 'iso9001',
    nameAr: 'آيزو 9001',
    nameEn: 'ISO 9001:2015',
    version: '2015',
    totalClauses: 142,
  },
  {
    id: 'iso45001',
    nameAr: 'آيزو 45001',
    nameEn: 'ISO 45001:2018',
    version: '2018',
    totalClauses: 98,
  },
  {
    id: 'iso14001',
    nameAr: 'آيزو 14001',
    nameEn: 'ISO 14001:2015',
    version: '2015',
    totalClauses: 76,
  },
];

const AUDIT_TYPES = [
  { id: 'internal', nameAr: 'تدقيق داخلي', nameEn: 'Internal Audit' },
  { id: 'external', nameAr: 'تدقيق خارجي', nameEn: 'External Audit' },
  { id: 'surveillance', nameAr: 'تدقيق مراقبة', nameEn: 'Surveillance Audit' },
  { id: 'mock', nameAr: 'تدقيق تجريبي', nameEn: 'Mock Audit' },
  { id: 'follow_up', nameAr: 'تدقيق متابعة', nameEn: 'Follow-up Audit' },
];

const AUDIT_STATUSES = [
  { id: 'planned', nameAr: 'مخطط', nameEn: 'Planned' },
  { id: 'in_progress', nameAr: 'قيد التنفيذ', nameEn: 'In Progress' },
  { id: 'completed', nameAr: 'مكتمل', nameEn: 'Completed' },
  { id: 'cancelled', nameAr: 'ملغى', nameEn: 'Cancelled' },
];

const FINDING_SEVERITIES = [
  { id: 'critical', nameAr: 'حرج', nameEn: 'Critical', weight: 10 },
  { id: 'major', nameAr: 'رئيسي', nameEn: 'Major', weight: 5 },
  { id: 'minor', nameAr: 'ثانوي', nameEn: 'Minor', weight: 2 },
  { id: 'observation', nameAr: 'ملاحظة', nameEn: 'Observation', weight: 1 },
  { id: 'opportunity', nameAr: 'فرصة تحسين', nameEn: 'Opportunity for Improvement', weight: 0 },
];

const NC_STATUSES = [
  { id: 'open', nameAr: 'مفتوح', nameEn: 'Open' },
  { id: 'root_cause_analysis', nameAr: 'تحليل السبب الجذري', nameEn: 'Root Cause Analysis' },
  { id: 'action_planned', nameAr: 'إجراء مخطط', nameEn: 'Action Planned' },
  { id: 'in_progress', nameAr: 'قيد التنفيذ', nameEn: 'In Progress' },
  { id: 'verification', nameAr: 'تحقق', nameEn: 'Verification' },
  { id: 'closed', nameAr: 'مغلق', nameEn: 'Closed' },
];

const CAPA_TYPES = [
  { id: 'corrective', nameAr: 'إجراء تصحيحي', nameEn: 'Corrective Action' },
  { id: 'preventive', nameAr: 'إجراء وقائي', nameEn: 'Preventive Action' },
];

const RISK_LEVELS = [
  { id: 'very_high', nameAr: 'عالي جداً', nameEn: 'Very High', color: '#d32f2f' },
  { id: 'high', nameAr: 'عالي', nameEn: 'High', color: '#f44336' },
  { id: 'medium', nameAr: 'متوسط', nameEn: 'Medium', color: '#ff9800' },
  { id: 'low', nameAr: 'منخفض', nameEn: 'Low', color: '#4caf50' },
  { id: 'very_low', nameAr: 'منخفض جداً', nameEn: 'Very Low', color: '#81c784' },
];

const DOC_TYPES = [
  { id: 'policy', nameAr: 'سياسة', nameEn: 'Policy' },
  { id: 'sop', nameAr: 'إجراء تشغيل قياسي', nameEn: 'Standard Operating Procedure' },
  { id: 'work_instruction', nameAr: 'تعليمات عمل', nameEn: 'Work Instruction' },
  { id: 'form', nameAr: 'نموذج', nameEn: 'Form/Template' },
  { id: 'manual', nameAr: 'دليل', nameEn: 'Manual' },
  { id: 'record', nameAr: 'سجل', nameEn: 'Record' },
];

const DEPARTMENTS = [
  'rehabilitation',
  'medical',
  'nursing',
  'pharmacy',
  'laboratory',
  'hr',
  'finance',
  'it',
  'administration',
  'quality',
  'safety',
  'nutrition',
];

/* ═══════════════════ Counter ═══════════════════ */
let _counter = 1000;
const nextId = () => `qm-${++_counter}`;
const now = () => new Date().toISOString();

/* ═══════════════════ Service Class ═══════════════════ */

class QualityManagementService {
  constructor() {
    this.audits = new Map();
    this.findings = new Map();
    this.nonConformances = new Map();
    this.capaActions = new Map();
    this.qualityIndicators = new Map();
    this.indicatorRecords = new Map();
    this.documents = new Map();
    this.riskRegister = new Map();
    this.accreditationReports = new Map();
    this.auditLog = [];
    this._seed();
  }

  /* ── Seed ── */
  _seed() {
    const base = '2026-01-01T00:00:00.000Z';

    /* Audits */
    const seedAudits = [
      {
        id: nextId(),
        titleAr: 'تدقيق داخلي سباهي Q1',
        titleEn: 'CBAHI Internal Audit Q1',
        type: 'internal',
        standard: 'cbahi',
        department: 'rehabilitation',
        status: 'completed',
        scheduledDate: '2026-01-15',
        completedDate: '2026-01-18',
        leadAuditor: 'أحمد المحمدي',
        auditors: ['أحمد المحمدي', 'فاطمة السالم'],
        scope: 'مراجعة معايير سباهي للتأهيل',
        findingsCount: 3,
        complianceScore: 87,
        createdAt: base,
      },
      {
        id: nextId(),
        titleAr: 'تدقيق مراقبة آيزو 9001',
        titleEn: 'ISO 9001 Surveillance Audit',
        type: 'surveillance',
        standard: 'iso9001',
        department: 'quality',
        status: 'planned',
        scheduledDate: '2026-04-10',
        completedDate: null,
        leadAuditor: 'هيئة المواصفات',
        auditors: ['مدقق خارجي 1', 'مدقق خارجي 2'],
        scope: 'مراجعة نظام إدارة الجودة',
        findingsCount: 0,
        complianceScore: null,
        createdAt: base,
      },
      {
        id: nextId(),
        titleAr: 'تدقيق تجريبي JCI',
        titleEn: 'JCI Mock Audit',
        type: 'mock',
        standard: 'jci',
        department: 'medical',
        status: 'in_progress',
        scheduledDate: '2026-03-01',
        completedDate: null,
        leadAuditor: 'خالد العتيبي',
        auditors: ['خالد العتيبي', 'نورة القحطاني'],
        scope: 'تدقيق تجريبي شامل لمعايير JCI',
        findingsCount: 5,
        complianceScore: 72,
        createdAt: base,
      },
    ];
    seedAudits.forEach(a => this.audits.set(a.id, a));

    /* Findings */
    const seedFindings = [
      {
        id: nextId(),
        auditId: seedAudits[0].id,
        clauseRef: 'CBAHI-LD.1',
        titleAr: 'عدم وجود خطة استراتيجية محدثة',
        titleEn: 'No updated strategic plan',
        severity: 'major',
        description: 'الخطة الاستراتيجية لم تحدث منذ عامين',
        evidence: 'مراجعة الوثائق',
        responsiblePerson: 'مدير الجودة',
        dueDate: '2026-02-28',
        status: 'open',
        createdAt: base,
      },
      {
        id: nextId(),
        auditId: seedAudits[0].id,
        clauseRef: 'CBAHI-PC.3',
        titleAr: 'نقص في توثيق خطط الرعاية',
        titleEn: 'Insufficient care plan documentation',
        severity: 'minor',
        description: 'بعض ملفات المرضى تفتقر لخطط رعاية موثقة',
        evidence: 'عينة ملفات',
        responsiblePerson: 'رئيس التمريض',
        dueDate: '2026-03-15',
        status: 'open',
        createdAt: base,
      },
      {
        id: nextId(),
        auditId: seedAudits[0].id,
        clauseRef: 'CBAHI-FMS.2',
        titleAr: 'صيانة معدات متأخرة',
        titleEn: 'Delayed equipment maintenance',
        severity: 'observation',
        description: 'بعض المعدات تجاوزت موعد الصيانة الدورية',
        evidence: 'سجل الصيانة',
        responsiblePerson: 'مدير الصيانة',
        dueDate: '2026-02-15',
        status: 'open',
        createdAt: base,
      },
      {
        id: nextId(),
        auditId: seedAudits[2].id,
        clauseRef: 'JCI-IPSG.1',
        titleAr: 'خطأ في تحديد هوية المريض',
        titleEn: 'Patient identification error',
        severity: 'critical',
        description: 'لا يتم التحقق من هوية المريض بأسلوبين',
        evidence: 'مراقبة ميدانية',
        responsiblePerson: 'مدير الجودة الطبية',
        dueDate: '2026-03-20',
        status: 'open',
        createdAt: base,
      },
      {
        id: nextId(),
        auditId: seedAudits[2].id,
        clauseRef: 'JCI-MMU.4',
        titleAr: 'تخزين أدوية عالية الخطورة',
        titleEn: 'High-alert medication storage',
        severity: 'major',
        description: 'عدم فصل الأدوية عالية الخطورة بشكل كافي',
        evidence: 'جولة ميدانية',
        responsiblePerson: 'مدير الصيدلية',
        dueDate: '2026-04-01',
        status: 'open',
        createdAt: base,
      },
    ];
    seedFindings.forEach(f => this.findings.set(f.id, f));

    /* Non-conformances */
    const seedNCs = [
      {
        id: nextId(),
        titleAr: 'عدم مطابقة في إجراءات مكافحة العدوى',
        titleEn: 'Infection control procedure non-conformance',
        standard: 'cbahi',
        clauseRef: 'CBAHI-IPC.2',
        department: 'nursing',
        severity: 'major',
        status: 'root_cause_analysis',
        rootCause: '',
        description: 'عدم التزام بإجراءات مكافحة العدوى في وحدة العناية',
        reportedBy: 'فاطمة السالم',
        reportedDate: '2026-02-01',
        dueDate: '2026-03-15',
        closedDate: null,
        createdAt: base,
      },
      {
        id: nextId(),
        titleAr: 'عدم مطابقة في توثيق التدريب',
        titleEn: 'Training documentation non-conformance',
        standard: 'iso9001',
        clauseRef: 'ISO-7.2',
        department: 'hr',
        severity: 'minor',
        status: 'closed',
        rootCause: 'نقص في نظام إدارة التدريب',
        description: 'سجلات التدريب غير مكتملة لبعض الموظفين',
        reportedBy: 'أحمد المحمدي',
        reportedDate: '2026-01-10',
        dueDate: '2026-02-10',
        closedDate: '2026-02-08',
        createdAt: base,
      },
    ];
    seedNCs.forEach(nc => this.nonConformances.set(nc.id, nc));

    /* CAPA */
    const seedCAPAs = [
      {
        id: nextId(),
        ncId: seedNCs[0].id,
        type: 'corrective',
        titleAr: 'تحديث إجراءات مكافحة العدوى',
        titleEn: 'Update infection control procedures',
        description: 'مراجعة وتحديث جميع إجراءات مكافحة العدوى',
        responsiblePerson: 'مشرفة مكافحة العدوى',
        dueDate: '2026-03-10',
        status: 'in_progress',
        completionPercent: 60,
        verifiedBy: null,
        verifiedDate: null,
        createdAt: base,
      },
      {
        id: nextId(),
        ncId: seedNCs[0].id,
        type: 'preventive',
        titleAr: 'برنامج تدريب مكافحة العدوى',
        titleEn: 'Infection control training program',
        description: 'تنظيم برنامج تدريبي شامل لجميع الممرضين',
        responsiblePerson: 'مدير التدريب',
        dueDate: '2026-03-30',
        status: 'action_planned',
        completionPercent: 20,
        verifiedBy: null,
        verifiedDate: null,
        createdAt: base,
      },
      {
        id: nextId(),
        ncId: seedNCs[1].id,
        type: 'corrective',
        titleAr: 'استكمال سجلات التدريب',
        titleEn: 'Complete training records',
        description: 'إدخال جميع سجلات التدريب المفقودة',
        responsiblePerson: 'منسق التدريب',
        dueDate: '2026-02-05',
        status: 'closed',
        completionPercent: 100,
        verifiedBy: 'أحمد المحمدي',
        verifiedDate: '2026-02-08',
        createdAt: base,
      },
    ];
    seedCAPAs.forEach(c => this.capaActions.set(c.id, c));

    /* Quality Indicators */
    const seedIndicators = [
      {
        id: nextId(),
        code: 'QI-HAI-001',
        nameAr: 'معدل العدوى المكتسبة بالمستشفى',
        nameEn: 'Hospital-Acquired Infection Rate',
        standard: 'cbahi',
        department: 'nursing',
        unit: '%',
        target: 2.0,
        threshold: { red: 5, yellow: 3, green: 2 },
        frequency: 'monthly',
        isActive: true,
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QI-FALL-001',
        nameAr: 'معدل السقوط',
        nameEn: 'Patient Fall Rate',
        standard: 'jci',
        department: 'nursing',
        unit: 'per 1000 patient days',
        target: 1.5,
        threshold: { red: 4, yellow: 2.5, green: 1.5 },
        frequency: 'monthly',
        isActive: true,
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QI-MED-001',
        nameAr: 'معدل أخطاء الأدوية',
        nameEn: 'Medication Error Rate',
        standard: 'jci',
        department: 'pharmacy',
        unit: '%',
        target: 0.5,
        threshold: { red: 2, yellow: 1, green: 0.5 },
        frequency: 'monthly',
        isActive: true,
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QI-DOC-001',
        nameAr: 'نسبة اكتمال التوثيق الطبي',
        nameEn: 'Medical Documentation Completeness',
        standard: 'cbahi',
        department: 'medical',
        unit: '%',
        target: 95,
        threshold: { red: 80, yellow: 90, green: 95 },
        frequency: 'monthly',
        isActive: true,
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QI-SAT-001',
        nameAr: 'رضا المرضى',
        nameEn: 'Patient Satisfaction Score',
        standard: 'cbahi',
        department: 'quality',
        unit: '%',
        target: 90,
        threshold: { red: 70, yellow: 80, green: 90 },
        frequency: 'quarterly',
        isActive: true,
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QI-MORT-001',
        nameAr: 'معدل الوفيات',
        nameEn: 'Mortality Rate',
        standard: 'jci',
        department: 'medical',
        unit: '%',
        target: 1.0,
        threshold: { red: 3, yellow: 2, green: 1 },
        frequency: 'monthly',
        isActive: true,
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QI-HAND-001',
        nameAr: 'نسبة التزام نظافة اليدين',
        nameEn: 'Hand Hygiene Compliance Rate',
        standard: 'cbahi',
        department: 'nursing',
        unit: '%',
        target: 90,
        threshold: { red: 60, yellow: 80, green: 90 },
        frequency: 'monthly',
        isActive: true,
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QI-WAIT-001',
        nameAr: 'متوسط وقت الانتظار',
        nameEn: 'Average Wait Time',
        standard: 'iso9001',
        department: 'administration',
        unit: 'minutes',
        target: 15,
        threshold: { red: 45, yellow: 30, green: 15 },
        frequency: 'weekly',
        isActive: true,
        createdAt: base,
      },
    ];
    seedIndicators.forEach(qi => this.qualityIndicators.set(qi.id, qi));

    /* Indicator Records (monthly data) */
    const months = ['2026-01', '2026-02', '2026-03'];
    seedIndicators.forEach(qi => {
      months.forEach(m => {
        const val = qi.target + (Math.random() - 0.5) * qi.target * 0.4;
        const rec = {
          id: nextId(),
          indicatorId: qi.id,
          period: m,
          value: Math.round(val * 100) / 100,
          notes: '',
          recordedBy: 'نظام آلي',
          recordedAt: `${m}-15T00:00:00.000Z`,
        };
        this.indicatorRecords.set(rec.id, rec);
      });
    });

    /* Documents */
    const seedDocs = [
      {
        id: nextId(),
        code: 'QMS-POL-001',
        titleAr: 'سياسة الجودة',
        titleEn: 'Quality Policy',
        type: 'policy',
        standard: 'iso9001',
        department: 'quality',
        version: '3.0',
        status: 'approved',
        approvedBy: 'المدير العام',
        approvedDate: '2026-01-01',
        reviewDate: '2027-01-01',
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QMS-SOP-001',
        titleAr: 'إجراء التدقيق الداخلي',
        titleEn: 'Internal Audit Procedure',
        type: 'sop',
        standard: 'iso9001',
        department: 'quality',
        version: '2.1',
        status: 'approved',
        approvedBy: 'مدير الجودة',
        approvedDate: '2026-01-15',
        reviewDate: '2027-01-15',
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QMS-WI-001',
        titleAr: 'تعليمات مكافحة العدوى',
        titleEn: 'Infection Control Work Instructions',
        type: 'work_instruction',
        standard: 'cbahi',
        department: 'nursing',
        version: '1.5',
        status: 'under_review',
        approvedBy: null,
        approvedDate: null,
        reviewDate: '2026-04-01',
        createdAt: base,
      },
      {
        id: nextId(),
        code: 'QMS-FRM-001',
        titleAr: 'نموذج تقرير التدقيق',
        titleEn: 'Audit Report Form',
        type: 'form',
        standard: 'iso9001',
        department: 'quality',
        version: '1.0',
        status: 'approved',
        approvedBy: 'مدير الجودة',
        approvedDate: '2025-12-01',
        reviewDate: '2026-12-01',
        createdAt: base,
      },
    ];
    seedDocs.forEach(d => this.documents.set(d.id, d));

    /* Risk Register */
    const seedRisks = [
      {
        id: nextId(),
        titleAr: 'خطر العدوى المكتسبة',
        titleEn: 'Hospital-Acquired Infection Risk',
        standard: 'cbahi',
        department: 'nursing',
        likelihood: 3,
        impact: 5,
        riskLevel: 'very_high',
        riskScore: 15,
        mitigation: 'تطبيق بروتوكولات مكافحة العدوى',
        owner: 'مشرفة مكافحة العدوى',
        status: 'active',
        reviewDate: '2026-06-01',
        createdAt: base,
      },
      {
        id: nextId(),
        titleAr: 'خطر أخطاء الأدوية',
        titleEn: 'Medication Error Risk',
        standard: 'jci',
        department: 'pharmacy',
        likelihood: 2,
        impact: 5,
        riskLevel: 'high',
        riskScore: 10,
        mitigation: 'نظام التحقق المزدوج',
        owner: 'مدير الصيدلية',
        status: 'active',
        reviewDate: '2026-06-01',
        createdAt: base,
      },
      {
        id: nextId(),
        titleAr: 'خطر فقدان البيانات',
        titleEn: 'Data Loss Risk',
        standard: 'iso9001',
        department: 'it',
        likelihood: 2,
        impact: 4,
        riskLevel: 'medium',
        riskScore: 8,
        mitigation: 'نسخ احتياطية يومية',
        owner: 'مدير تقنية المعلومات',
        status: 'mitigated',
        reviewDate: '2026-07-01',
        createdAt: base,
      },
    ];
    seedRisks.forEach(r => this.riskRegister.set(r.id, r));

    this.auditLog.push(
      {
        id: nextId(),
        action: 'system_init',
        entityType: 'system',
        details: 'تهيئة نظام إدارة الجودة',
        userId: 'system',
        timestamp: base,
      },
      {
        id: nextId(),
        action: 'seed_data',
        entityType: 'system',
        details: 'بيانات أولية للنظام',
        userId: 'system',
        timestamp: base,
      }
    );

    logger.info(
      `[QualityManagement] Seeded: ${this.audits.size} audits, ${this.findings.size} findings, ${this.nonConformances.size} NCs, ${this.capaActions.size} CAPAs, ${this.qualityIndicators.size} indicators, ${this.documents.size} docs, ${this.riskRegister.size} risks`
    );
  }

  _log(action, entityType, entityId, details, userId) {
    this.auditLog.push({
      id: nextId(),
      action,
      entityType,
      entityId,
      details,
      userId,
      timestamp: now(),
    });
  }

  /* ═══ Dashboard ═══ */
  getDashboard() {
    const audits = [...this.audits.values()];
    const findings = [...this.findings.values()];
    const ncs = [...this.nonConformances.values()];
    const capas = [...this.capaActions.values()];
    const indicators = [...this.qualityIndicators.values()].filter(q => q.isActive);
    const risks = [...this.riskRegister.values()];

    const openFindings = findings.filter(f => f.status === 'open').length;
    const criticalFindings = findings.filter(
      f => f.severity === 'critical' && f.status === 'open'
    ).length;
    const openNCs = ncs.filter(n => n.status !== 'closed').length;
    const overdueActions = capas.filter(
      c => c.status !== 'closed' && new Date(c.dueDate) < new Date()
    ).length;
    const highRisks = risks.filter(
      r => r.riskLevel === 'very_high' || r.riskLevel === 'high'
    ).length;

    /* compliance per standard */
    const complianceByStandard = STANDARDS.map(s => {
      const stdAudits = audits.filter(a => a.standard === s.id && a.complianceScore != null);
      const avg = stdAudits.length
        ? Math.round(stdAudits.reduce((sum, a) => sum + a.complianceScore, 0) / stdAudits.length)
        : null;
      return {
        standard: s.id,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        averageCompliance: avg,
        auditCount: stdAudits.length,
      };
    });

    /* indicator performance */
    const latestRecords = this._getLatestRecords();
    const indicatorPerformance = {
      onTarget: latestRecords.filter(r => {
        const qi = this.qualityIndicators.get(r.indicatorId);
        return qi && r.value <= qi.threshold.green;
      }).length,
      warning: latestRecords.filter(r => {
        const qi = this.qualityIndicators.get(r.indicatorId);
        return qi && r.value > qi.threshold.green && r.value <= qi.threshold.yellow;
      }).length,
      critical: latestRecords.filter(r => {
        const qi = this.qualityIndicators.get(r.indicatorId);
        return qi && r.value > qi.threshold.yellow;
      }).length,
      total: indicators.length,
    };

    return {
      summary: {
        totalAudits: audits.length,
        completedAudits: audits.filter(a => a.status === 'completed').length,
        plannedAudits: audits.filter(a => a.status === 'planned').length,
        openFindings,
        criticalFindings,
        openNonConformances: openNCs,
        overdueActions,
        highRisks,
        totalDocuments: this.documents.size,
      },
      complianceByStandard,
      indicatorPerformance,
      recentAudits: audits.slice(-5).reverse(),
      recentFindings: findings.slice(-5).reverse(),
      upcomingAudits: audits.filter(a => a.status === 'planned').slice(0, 5),
    };
  }

  _getLatestRecords() {
    const latest = new Map();
    for (const r of this.indicatorRecords.values()) {
      const existing = latest.get(r.indicatorId);
      if (!existing || r.period > existing.period) latest.set(r.indicatorId, r);
    }
    return [...latest.values()];
  }

  /* ═══ Reference Data ═══ */
  getStandards() {
    return STANDARDS;
  }
  getAuditTypes() {
    return AUDIT_TYPES;
  }
  getAuditStatuses() {
    return AUDIT_STATUSES;
  }
  getFindingSeverities() {
    return FINDING_SEVERITIES;
  }
  getNcStatuses() {
    return NC_STATUSES;
  }
  getCapaTypes() {
    return CAPA_TYPES;
  }
  getRiskLevels() {
    return RISK_LEVELS;
  }
  getDocTypes() {
    return DOC_TYPES;
  }
  getDepartments() {
    return DEPARTMENTS;
  }

  /* ═══ Audits CRUD ═══ */
  listAudits(filters = {}) {
    let list = [...this.audits.values()];
    if (filters.standard) list = list.filter(a => a.standard === filters.standard);
    if (filters.type) list = list.filter(a => a.type === filters.type);
    if (filters.status) list = list.filter(a => a.status === filters.status);
    if (filters.department) list = list.filter(a => a.department === filters.department);
    return list;
  }

  getAudit(id) {
    return this.audits.get(id) || null;
  }

  createAudit(data, userId) {
    const audit = {
      id: nextId(),
      ...data,
      findingsCount: 0,
      complianceScore: null,
      createdAt: now(),
    };
    this.audits.set(audit.id, audit);
    this._log('create', 'audit', audit.id, `إنشاء تدقيق: ${data.titleAr}`, userId);
    return audit;
  }

  updateAudit(id, data, userId) {
    const audit = this.audits.get(id);
    if (!audit) return null;
    Object.assign(audit, data, { updatedAt: now() });
    this._log('update', 'audit', id, `تحديث تدقيق: ${audit.titleAr}`, userId);
    return audit;
  }

  deleteAudit(id, userId) {
    const audit = this.audits.get(id);
    if (!audit) return null;
    this.audits.delete(id);
    this._log('delete', 'audit', id, `حذف تدقيق: ${audit.titleAr}`, userId);
    return audit;
  }

  /* ═══ Findings CRUD ═══ */
  listFindings(filters = {}) {
    let list = [...this.findings.values()];
    if (filters.auditId) list = list.filter(f => f.auditId === filters.auditId);
    if (filters.severity) list = list.filter(f => f.severity === filters.severity);
    if (filters.status) list = list.filter(f => f.status === filters.status);
    return list;
  }

  getFinding(id) {
    return this.findings.get(id) || null;
  }

  createFinding(data, userId) {
    const finding = { id: nextId(), ...data, status: 'open', createdAt: now() };
    this.findings.set(finding.id, finding);
    /* update audit findingsCount */
    const audit = this.audits.get(data.auditId);
    if (audit)
      audit.findingsCount = [...this.findings.values()].filter(
        f => f.auditId === data.auditId
      ).length;
    this._log('create', 'finding', finding.id, `إنشاء ملاحظة: ${data.titleAr}`, userId);
    return finding;
  }

  updateFinding(id, data, userId) {
    const finding = this.findings.get(id);
    if (!finding) return null;
    Object.assign(finding, data, { updatedAt: now() });
    this._log('update', 'finding', id, `تحديث ملاحظة: ${finding.titleAr}`, userId);
    return finding;
  }

  closeFinding(id, userId) {
    const finding = this.findings.get(id);
    if (!finding) return null;
    finding.status = 'closed';
    finding.closedAt = now();
    this._log('close', 'finding', id, `إغلاق ملاحظة: ${finding.titleAr}`, userId);
    return finding;
  }

  /* ═══ Non-Conformances CRUD ═══ */
  listNonConformances(filters = {}) {
    let list = [...this.nonConformances.values()];
    if (filters.standard) list = list.filter(nc => nc.standard === filters.standard);
    if (filters.status) list = list.filter(nc => nc.status === filters.status);
    if (filters.department) list = list.filter(nc => nc.department === filters.department);
    if (filters.severity) list = list.filter(nc => nc.severity === filters.severity);
    return list;
  }

  getNonConformance(id) {
    return this.nonConformances.get(id) || null;
  }

  createNonConformance(data, userId) {
    const nc = {
      id: nextId(),
      ...data,
      status: 'open',
      reportedDate: now().split('T')[0],
      closedDate: null,
      createdAt: now(),
    };
    this.nonConformances.set(nc.id, nc);
    this._log('create', 'nc', nc.id, `إنشاء عدم مطابقة: ${data.titleAr}`, userId);
    return nc;
  }

  updateNonConformance(id, data, userId) {
    const nc = this.nonConformances.get(id);
    if (!nc) return null;
    Object.assign(nc, data, { updatedAt: now() });
    if (data.status === 'closed') nc.closedDate = now().split('T')[0];
    this._log('update', 'nc', id, `تحديث عدم مطابقة: ${nc.titleAr}`, userId);
    return nc;
  }

  deleteNonConformance(id, userId) {
    const nc = this.nonConformances.get(id);
    if (!nc) return null;
    this.nonConformances.delete(id);
    this._log('delete', 'nc', id, `حذف عدم مطابقة: ${nc.titleAr}`, userId);
    return nc;
  }

  /* ═══ CAPA CRUD ═══ */
  listCAPAs(filters = {}) {
    let list = [...this.capaActions.values()];
    if (filters.ncId) list = list.filter(c => c.ncId === filters.ncId);
    if (filters.type) list = list.filter(c => c.type === filters.type);
    if (filters.status) list = list.filter(c => c.status === filters.status);
    return list;
  }

  getCAPA(id) {
    return this.capaActions.get(id) || null;
  }

  createCAPA(data, userId) {
    const capa = {
      id: nextId(),
      ...data,
      completionPercent: 0,
      verifiedBy: null,
      verifiedDate: null,
      createdAt: now(),
    };
    this.capaActions.set(capa.id, capa);
    this._log('create', 'capa', capa.id, `إنشاء إجراء ${data.type}: ${data.titleAr}`, userId);
    return capa;
  }

  updateCAPA(id, data, userId) {
    const capa = this.capaActions.get(id);
    if (!capa) return null;
    Object.assign(capa, data, { updatedAt: now() });
    this._log('update', 'capa', id, `تحديث إجراء: ${capa.titleAr}`, userId);
    return capa;
  }

  verifyCAPA(id, verifiedBy) {
    const capa = this.capaActions.get(id);
    if (!capa) return null;
    capa.status = 'closed';
    capa.completionPercent = 100;
    capa.verifiedBy = verifiedBy;
    capa.verifiedDate = now();
    this._log('verify', 'capa', id, `التحقق من إجراء: ${capa.titleAr}`, verifiedBy);
    return capa;
  }

  /* ═══ Quality Indicators CRUD ═══ */
  listIndicators(filters = {}) {
    let list = [...this.qualityIndicators.values()];
    if (filters.standard) list = list.filter(qi => qi.standard === filters.standard);
    if (filters.department) list = list.filter(qi => qi.department === filters.department);
    if (filters.isActive !== undefined)
      list = list.filter(
        qi => qi.isActive === (filters.isActive === 'true' || filters.isActive === true)
      );
    return list;
  }

  getIndicator(id) {
    return this.qualityIndicators.get(id) || null;
  }

  createIndicator(data, userId) {
    const qi = { id: nextId(), ...data, isActive: true, createdAt: now() };
    this.qualityIndicators.set(qi.id, qi);
    this._log('create', 'indicator', qi.id, `إنشاء مؤشر: ${data.nameAr}`, userId);
    return qi;
  }

  updateIndicator(id, data, userId) {
    const qi = this.qualityIndicators.get(id);
    if (!qi) return null;
    Object.assign(qi, data, { updatedAt: now() });
    this._log('update', 'indicator', id, `تحديث مؤشر: ${qi.nameAr}`, userId);
    return qi;
  }

  deleteIndicator(id, userId) {
    const qi = this.qualityIndicators.get(id);
    if (!qi) return null;
    this.qualityIndicators.delete(id);
    this._log('delete', 'indicator', id, `حذف مؤشر: ${qi.nameAr}`, userId);
    return qi;
  }

  /* ═══ Indicator Records ═══ */
  getIndicatorRecords(indicatorId, filters = {}) {
    let list = [...this.indicatorRecords.values()].filter(r => r.indicatorId === indicatorId);
    if (filters.period) list = list.filter(r => r.period === filters.period);
    return list.sort((a, b) => a.period.localeCompare(b.period));
  }

  addIndicatorRecord(indicatorId, data, userId) {
    const qi = this.qualityIndicators.get(indicatorId);
    if (!qi) return null;
    const rec = { id: nextId(), indicatorId, ...data, recordedAt: now() };
    this.indicatorRecords.set(rec.id, rec);
    this._log('record', 'indicator', indicatorId, `تسجيل قيمة: ${data.value}`, userId);
    return rec;
  }

  getIndicatorTrend(indicatorId) {
    const qi = this.qualityIndicators.get(indicatorId);
    if (!qi) return null;
    const records = this.getIndicatorRecords(indicatorId);
    return { indicator: qi, records, target: qi.target, threshold: qi.threshold };
  }

  /* ═══ Documents CRUD ═══ */
  listDocuments(filters = {}) {
    let list = [...this.documents.values()];
    if (filters.type) list = list.filter(d => d.type === filters.type);
    if (filters.standard) list = list.filter(d => d.standard === filters.standard);
    if (filters.department) list = list.filter(d => d.department === filters.department);
    if (filters.status) list = list.filter(d => d.status === filters.status);
    return list;
  }

  getDocument(id) {
    return this.documents.get(id) || null;
  }

  createDocument(data, userId) {
    const doc = {
      id: nextId(),
      ...data,
      status: 'draft',
      approvedBy: null,
      approvedDate: null,
      createdAt: now(),
    };
    this.documents.set(doc.id, doc);
    this._log('create', 'document', doc.id, `إنشاء وثيقة: ${data.titleAr}`, userId);
    return doc;
  }

  updateDocument(id, data, userId) {
    const doc = this.documents.get(id);
    if (!doc) return null;
    Object.assign(doc, data, { updatedAt: now() });
    this._log('update', 'document', id, `تحديث وثيقة: ${doc.titleAr}`, userId);
    return doc;
  }

  approveDocument(id, approvedBy) {
    const doc = this.documents.get(id);
    if (!doc) return null;
    doc.status = 'approved';
    doc.approvedBy = approvedBy;
    doc.approvedDate = now().split('T')[0];
    this._log('approve', 'document', id, `اعتماد وثيقة: ${doc.titleAr}`, approvedBy);
    return doc;
  }

  deleteDocument(id, userId) {
    const doc = this.documents.get(id);
    if (!doc) return null;
    this.documents.delete(id);
    this._log('delete', 'document', id, `حذف وثيقة: ${doc.titleAr}`, userId);
    return doc;
  }

  /* ═══ Risk Register CRUD ═══ */
  listRisks(filters = {}) {
    let list = [...this.riskRegister.values()];
    if (filters.standard) list = list.filter(r => r.standard === filters.standard);
    if (filters.department) list = list.filter(r => r.department === filters.department);
    if (filters.riskLevel) list = list.filter(r => r.riskLevel === filters.riskLevel);
    if (filters.status) list = list.filter(r => r.status === filters.status);
    return list.sort((a, b) => b.riskScore - a.riskScore);
  }

  getRisk(id) {
    return this.riskRegister.get(id) || null;
  }

  createRisk(data, userId) {
    const riskScore = (data.likelihood || 1) * (data.impact || 1);
    let riskLevel = 'very_low';
    if (riskScore >= 15) riskLevel = 'very_high';
    else if (riskScore >= 10) riskLevel = 'high';
    else if (riskScore >= 6) riskLevel = 'medium';
    else if (riskScore >= 3) riskLevel = 'low';
    const risk = {
      id: nextId(),
      ...data,
      riskScore,
      riskLevel,
      status: 'active',
      createdAt: now(),
    };
    this.riskRegister.set(risk.id, risk);
    this._log('create', 'risk', risk.id, `إنشاء خطر: ${data.titleAr}`, userId);
    return risk;
  }

  updateRisk(id, data, userId) {
    const risk = this.riskRegister.get(id);
    if (!risk) return null;
    Object.assign(risk, data, { updatedAt: now() });
    if (data.likelihood != null && data.impact != null) {
      risk.riskScore = data.likelihood * data.impact;
      if (risk.riskScore >= 15) risk.riskLevel = 'very_high';
      else if (risk.riskScore >= 10) risk.riskLevel = 'high';
      else if (risk.riskScore >= 6) risk.riskLevel = 'medium';
      else if (risk.riskScore >= 3) risk.riskLevel = 'low';
      else risk.riskLevel = 'very_low';
    }
    this._log('update', 'risk', id, `تحديث خطر: ${risk.titleAr}`, userId);
    return risk;
  }

  deleteRisk(id, userId) {
    const risk = this.riskRegister.get(id);
    if (!risk) return null;
    this.riskRegister.delete(id);
    this._log('delete', 'risk', id, `حذف خطر: ${risk.titleAr}`, userId);
    return risk;
  }

  /* ═══ Accreditation Reports ═══ */
  generateAccreditationReport(data, userId) {
    const standard = STANDARDS.find(s => s.id === data.standard);
    if (!standard) return null;

    const audits = [...this.audits.values()].filter(a => a.standard === data.standard);
    const findings = [...this.findings.values()].filter(f => {
      const audit = this.audits.get(f.auditId);
      return audit && audit.standard === data.standard;
    });
    const ncs = [...this.nonConformances.values()].filter(nc => nc.standard === data.standard);
    const indicators = [...this.qualityIndicators.values()].filter(
      qi => qi.standard === data.standard
    );
    const docs = [...this.documents.values()].filter(d => d.standard === data.standard);
    const risks = [...this.riskRegister.values()].filter(r => r.standard === data.standard);

    const completedAudits = audits.filter(a => a.complianceScore != null);
    const avgCompliance = completedAudits.length
      ? Math.round(
          completedAudits.reduce((s, a) => s + a.complianceScore, 0) / completedAudits.length
        )
      : 0;

    const openFindings = findings.filter(f => f.status === 'open');
    const closedFindings = findings.filter(f => f.status === 'closed');
    const openNCs = ncs.filter(nc => nc.status !== 'closed');
    const closedNCs = ncs.filter(nc => nc.status === 'closed');

    const report = {
      id: nextId(),
      standard: data.standard,
      standardInfo: standard,
      titleAr: `تقرير اعتماد ${standard.nameAr}`,
      titleEn: `${standard.nameEn} Accreditation Report`,
      generatedAt: now(),
      generatedBy: userId,
      period: data.period || `${new Date().getFullYear()}`,
      overallCompliance: avgCompliance,
      readinessLevel:
        avgCompliance >= 90
          ? 'ready'
          : avgCompliance >= 75
            ? 'nearly_ready'
            : avgCompliance >= 50
              ? 'in_progress'
              : 'not_ready',
      auditSummary: {
        total: audits.length,
        completed: completedAudits.length,
        averageScore: avgCompliance,
      },
      findingsSummary: {
        total: findings.length,
        open: openFindings.length,
        closed: closedFindings.length,
        bySeverity: {
          critical: findings.filter(f => f.severity === 'critical').length,
          major: findings.filter(f => f.severity === 'major').length,
          minor: findings.filter(f => f.severity === 'minor').length,
          observation: findings.filter(f => f.severity === 'observation').length,
        },
      },
      ncSummary: { total: ncs.length, open: openNCs.length, closed: closedNCs.length },
      indicatorSummary: {
        total: indicators.length,
        active: indicators.filter(qi => qi.isActive).length,
      },
      documentSummary: {
        total: docs.length,
        approved: docs.filter(d => d.status === 'approved').length,
        underReview: docs.filter(d => d.status === 'under_review').length,
      },
      riskSummary: {
        total: risks.length,
        high: risks.filter(r => r.riskLevel === 'very_high' || r.riskLevel === 'high').length,
      },
      recommendations: this._generateRecommendations(openFindings, openNCs, risks, avgCompliance),
    };

    this.accreditationReports.set(report.id, report);
    this._log(
      'generate',
      'accreditation_report',
      report.id,
      `إنشاء تقرير اعتماد: ${standard.nameAr}`,
      userId
    );
    return report;
  }

  _generateRecommendations(openFindings, openNCs, risks, compliance) {
    const recs = [];
    const criticalFindings = openFindings.filter(f => f.severity === 'critical');
    if (criticalFindings.length > 0)
      recs.push({
        priority: 'critical',
        textAr: `معالجة ${criticalFindings.length} ملاحظة حرجة فوراً`,
        textEn: `Address ${criticalFindings.length} critical findings immediately`,
      });
    if (openNCs.length > 0)
      recs.push({
        priority: 'high',
        textAr: `إغلاق ${openNCs.length} عدم مطابقة مفتوح`,
        textEn: `Close ${openNCs.length} open non-conformances`,
      });
    const highRisks = risks.filter(r => r.riskLevel === 'very_high' || r.riskLevel === 'high');
    if (highRisks.length > 0)
      recs.push({
        priority: 'high',
        textAr: `متابعة ${highRisks.length} خطر عالي/حرج`,
        textEn: `Follow up on ${highRisks.length} high/critical risks`,
      });
    if (compliance < 80)
      recs.push({
        priority: 'medium',
        textAr: 'رفع مستوى الامتثال من خلال تدقيقات إضافية',
        textEn: 'Improve compliance through additional audits',
      });
    if (recs.length === 0)
      recs.push({
        priority: 'info',
        textAr: 'المنشأة في حالة جاهزية جيدة للاعتماد',
        textEn: 'Facility is in good readiness for accreditation',
      });
    return recs;
  }

  listAccreditationReports(filters = {}) {
    let list = [...this.accreditationReports.values()];
    if (filters.standard) list = list.filter(r => r.standard === filters.standard);
    return list.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  getAccreditationReport(id) {
    return this.accreditationReports.get(id) || null;
  }

  exportAccreditationReport(id, format = 'json') {
    const report = this.accreditationReports.get(id);
    if (!report) return null;
    if (format === 'csv') {
      const rows = [
        ['Field', 'Value'],
        ['Standard', report.standardInfo.nameEn],
        ['Period', report.period],
        ['Overall Compliance', `${report.overallCompliance}%`],
        ['Readiness', report.readinessLevel],
        ['Total Audits', report.auditSummary.total],
        ['Open Findings', report.findingsSummary.open],
        ['Closed Findings', report.findingsSummary.closed],
        ['Critical Findings', report.findingsSummary.bySeverity.critical],
        ['Open NCs', report.ncSummary.open],
        ['Total Risks', report.riskSummary.total],
        ['High Risks', report.riskSummary.high],
      ];
      return {
        format: 'csv',
        content: rows.map(r => r.join(',')).join('\n'),
        filename: `accreditation-${report.standard}-${report.period}.csv`,
      };
    }
    return {
      format: 'json',
      content: report,
      filename: `accreditation-${report.standard}-${report.period}.json`,
    };
  }

  /* ═══ Statistics ═══ */
  getStatistics() {
    const audits = [...this.audits.values()];
    const findings = [...this.findings.values()];
    const ncs = [...this.nonConformances.values()];
    const capas = [...this.capaActions.values()];
    const indicators = [...this.qualityIndicators.values()];
    const docs = [...this.documents.values()];
    const risks = [...this.riskRegister.values()];

    return {
      audits: {
        total: audits.length,
        completed: audits.filter(a => a.status === 'completed').length,
        planned: audits.filter(a => a.status === 'planned').length,
        inProgress: audits.filter(a => a.status === 'in_progress').length,
      },
      findings: {
        total: findings.length,
        open: findings.filter(f => f.status === 'open').length,
        closed: findings.filter(f => f.status === 'closed').length,
        critical: findings.filter(f => f.severity === 'critical').length,
      },
      nonConformances: {
        total: ncs.length,
        open: ncs.filter(n => n.status !== 'closed').length,
        closed: ncs.filter(n => n.status === 'closed').length,
      },
      capaActions: {
        total: capas.length,
        open: capas.filter(c => c.status !== 'closed').length,
        closed: capas.filter(c => c.status === 'closed').length,
        overdue: capas.filter(c => c.status !== 'closed' && new Date(c.dueDate) < new Date())
          .length,
      },
      indicators: { total: indicators.length, active: indicators.filter(q => q.isActive).length },
      documents: {
        total: docs.length,
        approved: docs.filter(d => d.status === 'approved').length,
        underReview: docs.filter(d => d.status === 'under_review').length,
        draft: docs.filter(d => d.status === 'draft').length,
      },
      risks: {
        total: risks.length,
        veryHigh: risks.filter(r => r.riskLevel === 'very_high').length,
        high: risks.filter(r => r.riskLevel === 'high').length,
        medium: risks.filter(r => r.riskLevel === 'medium').length,
        low: risks.filter(r => r.riskLevel === 'low').length,
      },
    };
  }

  /* ═══ Compliance Matrix ═══ */
  getComplianceMatrix(standardId) {
    const standard = STANDARDS.find(s => s.id === standardId);
    if (!standard) return null;

    const audits = [...this.audits.values()].filter(a => a.standard === standardId);
    const findings = [...this.findings.values()].filter(f => {
      const audit = this.audits.get(f.auditId);
      return audit && audit.standard === standardId;
    });
    const ncs = [...this.nonConformances.values()].filter(nc => nc.standard === standardId);
    const docs = [...this.documents.values()].filter(d => d.standard === standardId);

    const clauseRefs = [
      ...new Set([...findings.map(f => f.clauseRef), ...ncs.map(nc => nc.clauseRef)]),
    ];

    return {
      standard,
      totalClauses: standard.totalClauses,
      assessedClauses: clauseRefs.length,
      coverage:
        clauseRefs.length > 0 ? Math.round((clauseRefs.length / standard.totalClauses) * 100) : 0,
      audits: audits.length,
      findings: findings.length,
      nonConformances: ncs.length,
      documents: docs.length,
      clauses: clauseRefs.map(ref => ({
        ref,
        findings: findings.filter(f => f.clauseRef === ref).length,
        openFindings: findings.filter(f => f.clauseRef === ref && f.status === 'open').length,
        ncs: ncs.filter(nc => nc.clauseRef === ref).length,
      })),
    };
  }

  /* ═══ Audit Log ═══ */
  getAuditLog(filters = {}) {
    let list = [...this.auditLog];
    if (filters.entityType) list = list.filter(l => l.entityType === filters.entityType);
    const limit = filters.limit ? parseInt(filters.limit, 10) : 50;
    return list.slice(-limit).reverse();
  }
}

/* ── Singleton ── */
module.exports = new QualityManagementService();
