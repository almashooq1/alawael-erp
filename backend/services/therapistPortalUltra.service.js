/**
 * Therapist Portal Ultra Service — خدمات بوابة المعالج الفائقة (الدفعة الرابعة)
 *
 * خدمات جديدة:
 * ─── سجل الإحالات (Referral Management)
 * ─── العلاج الجماعي (Group Therapy)
 * ─── إدارة المعدات (Equipment Management)
 * ─── مؤشرات الأداء (Performance KPIs)
 * ─── بروتوكولات السلامة (Safety Protocols)
 * ─── البحث السريري (Clinical Research)
 *
 * @version 1.0.0
 */

// ─── Lazy model loaders ──────────────────────────────────────────────────────
let _TherapySession, _Beneficiary, _CaseManagement;

const _getTherapySession = () => {
  if (!_TherapySession) _TherapySession = require('../models/TherapySession');
  return _TherapySession;
};
const _getBeneficiary = () => {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
};
const _getCaseManagement = () => {
  if (!_CaseManagement) _CaseManagement = require('../models/CaseManagement');
  return _CaseManagement;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const _startOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const _endOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
};

// ─── In-memory stores ────────────────────────────────────────────────────────
const referralsStore = new Map();
const groupTherapyStore = new Map();
const equipmentStore = new Map();
const kpiStore = new Map();
const safetyStore = new Map();
const researchStore = new Map();

let _referralId = 11000;
let _groupId = 12000;
let _equipmentId = 13000;
let _kpiId = 14000;
let _safetyId = 15000;
let _researchId = 16000;

// ─── Seed data ───────────────────────────────────────────────────────────────
const REFERRAL_TYPES = [
  { id: 'internal', nameAr: 'إحالة داخلية', nameEn: 'Internal Referral' },
  { id: 'external', nameAr: 'إحالة خارجية', nameEn: 'External Referral' },
  { id: 'specialist', nameAr: 'إحالة لأخصائي', nameEn: 'Specialist Referral' },
  { id: 'emergency', nameAr: 'إحالة طارئة', nameEn: 'Emergency Referral' },
];

const EQUIPMENT_CATEGORIES = [
  { id: 'mobility', nameAr: 'أجهزة التنقل', nameEn: 'Mobility Devices', icon: '🦽' },
  { id: 'sensory', nameAr: 'أدوات حسية', nameEn: 'Sensory Tools', icon: '👁️' },
  { id: 'exercise', nameAr: 'معدات تمارين', nameEn: 'Exercise Equipment', icon: '🏋️' },
  { id: 'assistive', nameAr: 'أجهزة مساعدة', nameEn: 'Assistive Devices', icon: '🦾' },
  { id: 'diagnostic', nameAr: 'أجهزة تشخيص', nameEn: 'Diagnostic Tools', icon: '🔬' },
  { id: 'therapeutic', nameAr: 'أدوات علاجية', nameEn: 'Therapeutic Tools', icon: '💊' },
];

const SAFETY_CATEGORIES = [
  { id: 'fall-prevention', nameAr: 'الوقاية من السقوط', nameEn: 'Fall Prevention' },
  { id: 'infection-control', nameAr: 'مكافحة العدوى', nameEn: 'Infection Control' },
  { id: 'patient-handling', nameAr: 'تداول المرضى', nameEn: 'Patient Handling' },
  { id: 'emergency-response', nameAr: 'الاستجابة للطوارئ', nameEn: 'Emergency Response' },
  { id: 'medication-safety', nameAr: 'سلامة الأدوية', nameEn: 'Medication Safety' },
  { id: 'equipment-safety', nameAr: 'سلامة المعدات', nameEn: 'Equipment Safety' },
];

const RESEARCH_FIELDS = [
  { id: 'physical-rehab', nameAr: 'التأهيل البدني', nameEn: 'Physical Rehabilitation' },
  { id: 'neuro-rehab', nameAr: 'التأهيل العصبي', nameEn: 'Neuro Rehabilitation' },
  { id: 'speech-lang', nameAr: 'النطق واللغة', nameEn: 'Speech & Language' },
  { id: 'occupational', nameAr: 'العلاج الوظيفي', nameEn: 'Occupational Therapy' },
  { id: 'behavioral', nameAr: 'العلاج السلوكي', nameEn: 'Behavioral Therapy' },
  { id: 'pediatric', nameAr: 'تأهيل الأطفال', nameEn: 'Pediatric Rehab' },
];

// Seed referrals
const SEED_REFERRALS = [
  {
    id: ++_referralId,
    patientName: 'أحمد محمد',
    patientId: 'P-1001',
    type: 'internal',
    fromTherapist: 'د. سارة',
    toTherapist: 'د. خالد',
    department: 'العلاج الطبيعي',
    reason: 'تحتاج حالته متابعة من أخصائي العلاج الطبيعي',
    priority: 'high',
    status: 'pending',
    notes: 'حالة متقدمة تحتاج تقييم شامل',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
  },
  {
    id: ++_referralId,
    patientName: 'فاطمة علي',
    patientId: 'P-1002',
    type: 'specialist',
    fromTherapist: 'د. خالد',
    toTherapist: 'د. نورا',
    department: 'علاج النطق',
    reason: 'تحسّن ملحوظ يحتاج متابعة نطق',
    priority: 'medium',
    status: 'accepted',
    notes: 'إحالة للمتابعة بعد تقدم إيجابي',
    createdAt: new Date('2026-03-03'),
    updatedAt: new Date('2026-03-04'),
  },
  {
    id: ++_referralId,
    patientName: 'عمر حسن',
    patientId: 'P-1003',
    type: 'external',
    fromTherapist: 'د. نورا',
    toTherapist: 'مستشفى الملك فيصل',
    department: 'جراحة العظام',
    reason: 'حاجة لتقييم جراحي',
    priority: 'urgent',
    status: 'pending',
    notes: 'مطلوب تقرير طبي مفصل',
    createdAt: new Date('2026-03-05'),
    updatedAt: new Date('2026-03-05'),
  },
];
SEED_REFERRALS.forEach(r => referralsStore.set(r.id, r));

// Seed group therapy
const SEED_GROUPS = [
  {
    id: ++_groupId,
    name: 'مجموعة التواصل الاجتماعي',
    type: 'social-skills',
    therapistId: 'T-001',
    therapistName: 'د. سارة',
    maxParticipants: 8,
    participants: [
      { id: 'P-1001', name: 'أحمد محمد', joinedAt: new Date('2026-02-01') },
      { id: 'P-1002', name: 'فاطمة علي', joinedAt: new Date('2026-02-01') },
      { id: 'P-1004', name: 'ليلى أحمد', joinedAt: new Date('2026-02-15') },
    ],
    schedule: { day: 'الأحد', time: '10:00', duration: 60 },
    status: 'active',
    goals: 'تحسين مهارات التواصل الاجتماعي للأطفال',
    activities: ['لعب الأدوار', 'قصص تفاعلية', 'تمارين جماعية'],
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-01'),
  },
  {
    id: ++_groupId,
    name: 'مجموعة التأهيل الحركي',
    type: 'motor-skills',
    therapistId: 'T-002',
    therapistName: 'د. خالد',
    maxParticipants: 6,
    participants: [
      { id: 'P-1003', name: 'عمر حسن', joinedAt: new Date('2026-02-10') },
      { id: 'P-1005', name: 'محمد سعيد', joinedAt: new Date('2026-02-10') },
    ],
    schedule: { day: 'الثلاثاء', time: '11:00', duration: 45 },
    status: 'active',
    goals: 'تحسين المهارات الحركية الدقيقة والكبرى',
    activities: ['تمارين توازن', 'ألعاب حركية', 'تمارين تقوية'],
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-03-01'),
  },
  {
    id: ++_groupId,
    name: 'مجموعة النطق واللغة',
    type: 'speech',
    therapistId: 'T-003',
    therapistName: 'د. نورا',
    maxParticipants: 5,
    participants: [{ id: 'P-1006', name: 'سلمى يوسف', joinedAt: new Date('2026-02-20') }],
    schedule: { day: 'الأربعاء', time: '09:00', duration: 45 },
    status: 'active',
    goals: 'تطوير مهارات النطق والتواصل اللفظي',
    activities: ['تمارين نطق', 'ألعاب لغوية', 'قراءة تفاعلية'],
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-03-01'),
  },
];
SEED_GROUPS.forEach(g => groupTherapyStore.set(g.id, g));

// Seed equipment
const SEED_EQUIPMENT = [
  {
    id: ++_equipmentId,
    name: 'جهاز المشي الكهربائي',
    nameEn: 'Treadmill',
    category: 'exercise',
    serialNumber: 'EQ-2026-001',
    status: 'available',
    condition: 'excellent',
    location: 'غرفة العلاج الطبيعي 1',
    lastMaintenance: new Date('2026-02-15'),
    nextMaintenance: new Date('2026-05-15'),
    purchaseDate: new Date('2025-06-01'),
    notes: 'جهاز جديد - ضمان لمدة سنتين',
    bookedBy: null,
    bookedUntil: null,
  },
  {
    id: ++_equipmentId,
    name: 'كرة التوازن العلاجية',
    nameEn: 'Therapy Ball',
    category: 'therapeutic',
    serialNumber: 'EQ-2026-002',
    status: 'in-use',
    condition: 'good',
    location: 'غرفة العلاج الوظيفي',
    lastMaintenance: new Date('2026-01-20'),
    nextMaintenance: new Date('2026-04-20'),
    purchaseDate: new Date('2024-09-01'),
    notes: '',
    bookedBy: 'د. خالد',
    bookedUntil: new Date('2026-03-10'),
  },
  {
    id: ++_equipmentId,
    name: 'جهاز تحفيز كهربائي',
    nameEn: 'Electrical Stimulator',
    category: 'diagnostic',
    serialNumber: 'EQ-2026-003',
    status: 'maintenance',
    condition: 'fair',
    location: 'المخزن',
    lastMaintenance: new Date('2026-03-01'),
    nextMaintenance: new Date('2026-03-15'),
    purchaseDate: new Date('2023-03-01'),
    notes: 'بحاجة لاستبدال الأقطاب',
    bookedBy: null,
    bookedUntil: null,
  },
  {
    id: ++_equipmentId,
    name: 'أدوات حسية متعددة',
    nameEn: 'Sensory Kit',
    category: 'sensory',
    serialNumber: 'EQ-2026-004',
    status: 'available',
    condition: 'excellent',
    location: 'غرفة التكامل الحسي',
    lastMaintenance: null,
    nextMaintenance: null,
    purchaseDate: new Date('2026-01-15'),
    notes: 'مجموعة كاملة للتكامل الحسي',
    bookedBy: null,
    bookedUntil: null,
  },
];
SEED_EQUIPMENT.forEach(e => equipmentStore.set(e.id, e));

// Seed safety protocols
const SEED_SAFETY = [
  {
    id: ++_safetyId,
    title: 'بروتوكول الوقاية من السقوط',
    category: 'fall-prevention',
    severity: 'high',
    status: 'active',
    description: 'إجراءات وقائية لمنع سقوط المرضى أثناء الجلسات العلاجية',
    steps: [
      'تقييم خطر السقوط قبل كل جلسة',
      'التأكد من نظافة الأرضية وعدم وجود عوائق',
      'استخدام أحزمة الأمان عند الحاجة',
      'المراقبة المستمرة أثناء التمارين',
    ],
    incidents: [],
    lastReview: new Date('2026-02-01'),
    nextReview: new Date('2026-05-01'),
    createdBy: 'إدارة الجودة',
    createdAt: new Date('2025-12-01'),
  },
  {
    id: ++_safetyId,
    title: 'بروتوكول مكافحة العدوى',
    category: 'infection-control',
    severity: 'critical',
    status: 'active',
    description: 'إجراءات مكافحة العدوى في غرف العلاج',
    steps: [
      'غسل اليدين قبل وبعد كل مريض',
      'تعقيم المعدات بعد كل استخدام',
      'ارتداء القفازات والكمامات',
      'التهوية الجيدة لغرف العلاج',
    ],
    incidents: [
      {
        id: 1,
        date: new Date('2026-02-20'),
        description: 'عدم توفر معقمات كافية',
        action: 'تم تزويد الغرف بمعقمات إضافية',
        resolved: true,
      },
    ],
    lastReview: new Date('2026-03-01'),
    nextReview: new Date('2026-04-01'),
    createdBy: 'إدارة الجودة',
    createdAt: new Date('2025-11-01'),
  },
];
SEED_SAFETY.forEach(s => safetyStore.set(s.id, s));

// Seed research
const SEED_RESEARCH = [
  {
    id: ++_researchId,
    title: 'فعالية العلاج المائي في تأهيل الأطفال',
    titleEn: 'Effectiveness of Aquatic Therapy in Pediatric Rehabilitation',
    field: 'physical-rehab',
    status: 'in-progress',
    principal: 'د. سارة الأحمد',
    team: ['د. خالد المنصور', 'أ. نورا العلي'],
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    abstract:
      'دراسة مقارنة لتقييم فعالية العلاج المائي مقابل العلاج التقليدي في تحسين المهارات الحركية لدى الأطفال المصابين بالشلل الدماغي',
    methodology: 'دراسة عشوائية محكومة مع مجموعة ضابطة',
    sampleSize: 30,
    findings: '',
    publications: [],
    tags: ['علاج مائي', 'أطفال', 'شلل دماغي'],
    createdAt: new Date('2025-12-15'),
    updatedAt: new Date('2026-03-01'),
  },
  {
    id: ++_researchId,
    title: 'التدخل المبكر في اضطرابات النطق',
    titleEn: 'Early Intervention in Speech Disorders',
    field: 'speech-lang',
    status: 'completed',
    principal: 'د. نورا العلي',
    team: ['د. سارة الأحمد'],
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-12-31'),
    abstract: 'تقييم أثر التدخل المبكر في تحسين مخرجات النطق لدى الأطفال من عمر 2-4 سنوات',
    methodology: 'دراسة طولية تتبعية',
    sampleSize: 25,
    findings: 'أظهرت النتائج تحسناً بنسبة 67% في مهارات النطق للمجموعة التجريبية',
    publications: ['مجلة التأهيل العربية - عدد يناير 2026'],
    tags: ['تدخل مبكر', 'نطق', 'أطفال'],
    createdAt: new Date('2025-05-01'),
    updatedAt: new Date('2026-01-15'),
  },
];
SEED_RESEARCH.forEach(r => researchStore.set(r.id, r));

// ═════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═════════════════════════════════════════════════════════════════════════════
class TherapistPortalUltraService {
  // ─── Referral Management ─────────────────────────────────────────────────
  async getReferrals(_therapistId) {
    const all = [...referralsStore.values()];
    return {
      success: true,
      data: all.sort((a, b) => b.createdAt - a.createdAt),
      stats: {
        total: all.length,
        pending: all.filter(r => r.status === 'pending').length,
        accepted: all.filter(r => r.status === 'accepted').length,
        completed: all.filter(r => r.status === 'completed').length,
        urgent: all.filter(r => r.priority === 'urgent').length,
      },
      referralTypes: REFERRAL_TYPES,
    };
  }

  async createReferral(data, _therapistId) {
    const referral = {
      id: ++_referralId,
      ...data,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    referralsStore.set(referral.id, referral);
    return { success: true, data: referral };
  }

  async updateReferral(id, data) {
    const referral = referralsStore.get(Number(id));
    if (!referral) throw new Error('الإحالة غير موجودة');
    Object.assign(referral, data, { updatedAt: new Date() });
    return { success: true, data: referral };
  }

  async updateReferralStatus(id, status) {
    const referral = referralsStore.get(Number(id));
    if (!referral) throw new Error('الإحالة غير موجودة');
    referral.status = status;
    referral.updatedAt = new Date();
    return { success: true, data: referral };
  }

  async deleteReferral(id) {
    const deleted = referralsStore.delete(Number(id));
    if (!deleted) throw new Error('الإحالة غير موجودة');
    return { success: true, message: 'تم حذف الإحالة بنجاح' };
  }

  // ─── Group Therapy ───────────────────────────────────────────────────────
  async getGroups(_therapistId) {
    const all = [...groupTherapyStore.values()];
    return {
      success: true,
      data: all.sort((a, b) => b.updatedAt - a.updatedAt),
      stats: {
        total: all.length,
        active: all.filter(g => g.status === 'active').length,
        totalParticipants: all.reduce((sum, g) => sum + g.participants.length, 0),
        avgParticipants: all.length
          ? Math.round(all.reduce((sum, g) => sum + g.participants.length, 0) / all.length)
          : 0,
      },
    };
  }

  async createGroup(data, _therapistId) {
    const group = {
      id: ++_groupId,
      ...data,
      participants: data.participants || [],
      activities: data.activities || [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    groupTherapyStore.set(group.id, group);
    return { success: true, data: group };
  }

  async updateGroup(id, data) {
    const group = groupTherapyStore.get(Number(id));
    if (!group) throw new Error('المجموعة غير موجودة');
    Object.assign(group, data, { updatedAt: new Date() });
    return { success: true, data: group };
  }

  async addParticipant(groupId, participant) {
    const group = groupTherapyStore.get(Number(groupId));
    if (!group) throw new Error('المجموعة غير موجودة');
    if (group.participants.length >= group.maxParticipants) {
      throw new Error('المجموعة ممتلئة');
    }
    group.participants.push({ ...participant, joinedAt: new Date() });
    group.updatedAt = new Date();
    return { success: true, data: group };
  }

  async removeParticipant(groupId, participantId) {
    const group = groupTherapyStore.get(Number(groupId));
    if (!group) throw new Error('المجموعة غير موجودة');
    group.participants = group.participants.filter(p => p.id !== participantId);
    group.updatedAt = new Date();
    return { success: true, data: group };
  }

  async deleteGroup(id) {
    const deleted = groupTherapyStore.delete(Number(id));
    if (!deleted) throw new Error('المجموعة غير موجودة');
    return { success: true, message: 'تم حذف المجموعة بنجاح' };
  }

  // ─── Equipment Management ────────────────────────────────────────────────
  async getEquipment(_therapistId) {
    const all = [...equipmentStore.values()];
    return {
      success: true,
      data: all,
      stats: {
        total: all.length,
        available: all.filter(e => e.status === 'available').length,
        inUse: all.filter(e => e.status === 'in-use').length,
        maintenance: all.filter(e => e.status === 'maintenance').length,
      },
      categories: EQUIPMENT_CATEGORIES,
    };
  }

  async createEquipment(data) {
    const item = {
      id: ++_equipmentId,
      ...data,
      status: data.status || 'available',
      condition: data.condition || 'good',
      bookedBy: null,
      bookedUntil: null,
      createdAt: new Date(),
    };
    equipmentStore.set(item.id, item);
    return { success: true, data: item };
  }

  async updateEquipment(id, data) {
    const item = equipmentStore.get(Number(id));
    if (!item) throw new Error('المعدة غير موجودة');
    Object.assign(item, data);
    return { success: true, data: item };
  }

  async bookEquipment(id, therapistName, until) {
    const item = equipmentStore.get(Number(id));
    if (!item) throw new Error('المعدة غير موجودة');
    if (item.status !== 'available') throw new Error('المعدة غير متاحة حالياً');
    item.status = 'in-use';
    item.bookedBy = therapistName;
    item.bookedUntil = new Date(until);
    return { success: true, data: item };
  }

  async returnEquipment(id) {
    const item = equipmentStore.get(Number(id));
    if (!item) throw new Error('المعدة غير موجودة');
    item.status = 'available';
    item.bookedBy = null;
    item.bookedUntil = null;
    return { success: true, data: item };
  }

  async deleteEquipment(id) {
    const deleted = equipmentStore.delete(Number(id));
    if (!deleted) throw new Error('المعدة غير موجودة');
    return { success: true, message: 'تم حذف المعدة بنجاح' };
  }

  // ─── Performance KPIs ────────────────────────────────────────────────────
  async getKPIs(therapistId) {
    // Build KPIs from seed + stored data
    const stored = [...kpiStore.values()].filter(
      k => !therapistId || k.therapistId === therapistId
    );

    const defaultKPIs = {
      sessionsCompleted: { current: 124, target: 150, unit: 'جلسة' },
      patientSatisfaction: { current: 92, target: 95, unit: '%' },
      goalsAchieved: { current: 38, target: 50, unit: 'هدف' },
      documentationRate: { current: 98, target: 100, unit: '%' },
      attendanceRate: { current: 96, target: 98, unit: '%' },
      referralResponseTime: { current: 2.3, target: 1, unit: 'يوم' },
    };

    const monthlyTrend = [
      { month: 'يناير', sessions: 28, satisfaction: 90, goals: 8 },
      { month: 'فبراير', sessions: 32, satisfaction: 91, goals: 10 },
      { month: 'مارس', sessions: 34, satisfaction: 93, goals: 12 },
      { month: 'أبريل', sessions: 30, satisfaction: 92, goals: 8 },
    ];

    return {
      success: true,
      data: {
        kpis: defaultKPIs,
        customKPIs: stored,
        monthlyTrend,
        overallScore: 87,
        rank: 'ممتاز',
      },
      stats: {
        totalKPIs: Object.keys(defaultKPIs).length + stored.length,
        onTarget: 4,
        belowTarget: 2,
      },
    };
  }

  async createCustomKPI(data, therapistId) {
    const kpi = {
      id: ++_kpiId,
      ...data,
      therapistId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    kpiStore.set(kpi.id, kpi);
    return { success: true, data: kpi };
  }

  async updateKPI(id, data) {
    const kpi = kpiStore.get(Number(id));
    if (!kpi) throw new Error('مؤشر الأداء غير موجود');
    Object.assign(kpi, data, { updatedAt: new Date() });
    return { success: true, data: kpi };
  }

  async deleteKPI(id) {
    const deleted = kpiStore.delete(Number(id));
    if (!deleted) throw new Error('مؤشر الأداء غير موجود');
    return { success: true, message: 'تم حذف مؤشر الأداء بنجاح' };
  }

  // ─── Safety Protocols ────────────────────────────────────────────────────
  async getSafetyProtocols(_therapistId) {
    const all = [...safetyStore.values()];
    return {
      success: true,
      data: all.sort((a, b) => b.createdAt - a.createdAt),
      stats: {
        total: all.length,
        active: all.filter(s => s.status === 'active').length,
        totalIncidents: all.reduce((sum, s) => sum + (s.incidents?.length || 0), 0),
        criticalCount: all.filter(s => s.severity === 'critical').length,
      },
      categories: SAFETY_CATEGORIES,
    };
  }

  async createSafetyProtocol(data) {
    const protocol = {
      id: ++_safetyId,
      ...data,
      incidents: [],
      status: 'active',
      createdAt: new Date(),
    };
    safetyStore.set(protocol.id, protocol);
    return { success: true, data: protocol };
  }

  async updateSafetyProtocol(id, data) {
    const protocol = safetyStore.get(Number(id));
    if (!protocol) throw new Error('البروتوكول غير موجود');
    Object.assign(protocol, data);
    return { success: true, data: protocol };
  }

  async reportIncident(protocolId, incident) {
    const protocol = safetyStore.get(Number(protocolId));
    if (!protocol) throw new Error('البروتوكول غير موجود');
    const newIncident = {
      id: protocol.incidents.length + 1,
      ...incident,
      date: new Date(),
      resolved: false,
    };
    protocol.incidents.push(newIncident);
    return { success: true, data: protocol };
  }

  async resolveIncident(protocolId, incidentId) {
    const protocol = safetyStore.get(Number(protocolId));
    if (!protocol) throw new Error('البروتوكول غير موجود');
    const incident = protocol.incidents.find(i => i.id === Number(incidentId));
    if (!incident) throw new Error('الحادثة غير موجودة');
    incident.resolved = true;
    incident.resolvedAt = new Date();
    return { success: true, data: protocol };
  }

  async deleteSafetyProtocol(id) {
    const deleted = safetyStore.delete(Number(id));
    if (!deleted) throw new Error('البروتوكول غير موجود');
    return { success: true, message: 'تم حذف البروتوكول بنجاح' };
  }

  // ─── Clinical Research ───────────────────────────────────────────────────
  async getResearch(_therapistId) {
    const all = [...researchStore.values()];
    return {
      success: true,
      data: all.sort((a, b) => b.updatedAt - a.updatedAt),
      stats: {
        total: all.length,
        inProgress: all.filter(r => r.status === 'in-progress').length,
        completed: all.filter(r => r.status === 'completed').length,
        published: all.reduce((sum, r) => sum + (r.publications?.length || 0), 0),
      },
      fields: RESEARCH_FIELDS,
    };
  }

  async createResearch(data, _therapistId) {
    const research = {
      id: ++_researchId,
      ...data,
      status: 'planning',
      publications: [],
      findings: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    researchStore.set(research.id, research);
    return { success: true, data: research };
  }

  async updateResearch(id, data) {
    const research = researchStore.get(Number(id));
    if (!research) throw new Error('البحث غير موجود');
    Object.assign(research, data, { updatedAt: new Date() });
    return { success: true, data: research };
  }

  async addPublication(researchId, publication) {
    const research = researchStore.get(Number(researchId));
    if (!research) throw new Error('البحث غير موجود');
    research.publications.push(publication);
    research.updatedAt = new Date();
    return { success: true, data: research };
  }

  async deleteResearch(id) {
    const deleted = researchStore.delete(Number(id));
    if (!deleted) throw new Error('البحث غير موجود');
    return { success: true, message: 'تم حذف البحث بنجاح' };
  }
}

module.exports = new TherapistPortalUltraService();
