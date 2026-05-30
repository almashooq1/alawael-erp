/**
 * CDSS Service — خدمة نظام دعم القرار السريري
 *
 * Clinical Decision Support System for the rehabilitation platform.
 * Provides: alerts, clinical rules, risk assessments,
 * AI rehab suggestions, drug interaction checks, decision logs.
 */

import apiClient from './api.client';
import _logger from 'utils/logger';

const BASE = '/api/v1/cdss';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALERT_SEVERITIES = {
  critical: { label: 'حرج', color: 'error', hex: '#ef4444', priority: 1 },
  high: { label: 'مرتفع', color: 'error', hex: '#f97316', priority: 2 },
  medium: { label: 'متوسط', color: 'warning', hex: '#f59e0b', priority: 3 },
  low: { label: 'منخفض', color: 'info', hex: '#3b82f6', priority: 4 },
  info: { label: 'معلوماتي', color: 'default', hex: '#6b7280', priority: 5 },
};

export const ALERT_TYPES = {
  drug_interaction: { label: 'تفاعل دوائي', icon: 'medication' },
  contraindication: { label: 'موانع استخدام', icon: 'block' },
  dosage_warning: { label: 'تحذير جرعة', icon: 'warning' },
  assessment_overdue: { label: 'تقييم متأخر', icon: 'schedule' },
  goal_at_risk: { label: 'هدف في خطر', icon: 'flag' },
  session_missed: { label: 'جلسة فائتة', icon: 'event_busy' },
  discharge_ready: { label: 'جاهز للتخريج', icon: 'exit_to_app' },
  rehab_regression: { label: 'تراجع تأهيلي', icon: 'trending_down' },
  family_non_adherence: { label: 'عدم التزام الأسرة', icon: 'family_restroom' },
  pain_escalation: { label: 'تصاعد الألم', icon: 'healing' },
};

export const RULE_CATEGORIES = {
  safety: { label: 'السلامة السريرية', color: '#ef4444' },
  medication: { label: 'الدواء', color: '#f97316' },
  assessment: { label: 'التقييم', color: '#8b5cf6' },
  goal: { label: 'الأهداف', color: '#3b82f6' },
  compliance: { label: 'الالتزام', color: '#f59e0b' },
  quality: { label: 'الجودة', color: '#10b981' },
};

export const RISK_LEVELS = {
  very_high: { label: 'مرتفع جداً', color: 'error', score: [80, 100] },
  high: { label: 'مرتفع', color: 'error', score: [60, 79] },
  medium: { label: 'متوسط', color: 'warning', score: [40, 59] },
  low: { label: 'منخفض', color: 'success', score: [0, 39] },
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  activeAlerts: 23,
  criticalAlerts: 4,
  rulesActive: 58,
  rulesTriggeredToday: 9,
  riskAssessmentsToday: 6,
  pendingSuggestions: 11,
  avgRiskScore: 42,
  resolvedToday: 14,
  decisionLogToday: 31,
  drugChecksToday: 7,
  trend: {
    alerts: [18, 22, 15, 28, 23, 19, 23],
    riskScores: [38, 41, 45, 39, 44, 40, 42],
  },
};

const MOCK_ALERTS = [
  {
    _id: 'a1',
    severity: 'critical',
    type: 'drug_interaction',
    message: 'تفاعل دوائي خطير: باكلوفين + مضادات الاكتئاب — خطر إضعاف الجهاز العصبي المركزي',
    beneficiaryName: 'أحمد محمد العتيبي',
    beneficiaryId: 'BNF-00412',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: 'active',
    ruleCode: 'DR-INT-001',
  },
  {
    _id: 'a2',
    severity: 'high',
    type: 'rehab_regression',
    message: 'تراجع ملحوظ في قياسات القوة العضلية للطرف العلوي بنسبة 18% عن آخر 3 جلسات',
    beneficiaryName: 'فاطمة سالم الشهري',
    beneficiaryId: 'BNF-00389',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    status: 'active',
    ruleCode: 'REGR-02',
  },
  {
    _id: 'a3',
    severity: 'high',
    type: 'assessment_overdue',
    message: 'تقييم FIM متأخر 14 يوماً — يُلزم البروتوكول بالتقييم كل 30 يوماً',
    beneficiaryName: 'يوسف عبد الله القحطاني',
    beneficiaryId: 'BNF-00501',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: 'active',
    ruleCode: 'ASSESS-OVD-003',
  },
  {
    _id: 'a4',
    severity: 'medium',
    type: 'goal_at_risk',
    message: 'هدف التنقل المستقل لن يُحقق بحسب المسار الحالي — الوتيرة 34% من المستهدف',
    beneficiaryName: 'نورة خالد الغامدي',
    beneficiaryId: 'BNF-00298',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'acknowledged',
    ruleCode: 'GOAL-RISK-007',
  },
  {
    _id: 'a5',
    severity: 'medium',
    type: 'session_missed',
    message: 'غياب عن 3 جلسات متتالية — ضرورة التواصل مع الأسرة لتقييم المعوقات',
    beneficiaryName: 'محمد راشد الدوسري',
    beneficiaryId: 'BNF-00345',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'active',
    ruleCode: 'SESS-ABS-002',
  },
  {
    _id: 'a6',
    severity: 'low',
    type: 'family_non_adherence',
    message: 'لم يُسجَّل أي تطبيق للواجبات المنزلية منذ أسبوعين — التزام الأسرة منخفض',
    beneficiaryName: 'سارة عمر الزهراني',
    beneficiaryId: 'BNF-00267',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    status: 'active',
    ruleCode: 'FAM-ADHC-001',
  },
  {
    _id: 'a7',
    severity: 'info',
    type: 'discharge_ready',
    message: 'المستفيد يستوفي 92% من معايير التخريج — يُنصح بمراجعة خطة الانتقال',
    beneficiaryName: 'عبد الرحمن الحربي',
    beneficiaryId: 'BNF-00192',
    triggeredAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    status: 'active',
    ruleCode: 'DISCH-READY-001',
  },
];

const MOCK_RULES = [
  {
    _id: 'r1',
    code: 'DR-INT-001',
    name: 'تفاعل باكلوفين + مضادات الاكتئاب',
    category: 'medication',
    severity: 'critical',
    condition: 'baclofen_prescribed AND antidepressant_prescribed',
    action: 'إشعار فوري + وقف الصرف + مراجعة طبيب',
    isActive: true,
    triggerCount: 3,
    lastTriggered: '2026-05-14',
    evidenceLevel: 'A',
  },
  {
    _id: 'r2',
    code: 'REGR-02',
    name: 'كشف التراجع في القوة العضلية',
    category: 'assessment',
    severity: 'high',
    condition: 'muscle_strength_decline > 15% in 3 sessions',
    action: 'إشعار المعالج + إعادة تقييم الخطة العلاجية',
    isActive: true,
    triggerCount: 7,
    lastTriggered: '2026-05-15',
    evidenceLevel: 'B',
  },
  {
    _id: 'r3',
    code: 'ASSESS-OVD-003',
    name: 'تنبيه تأخر التقييم الوظيفي FIM',
    category: 'assessment',
    severity: 'high',
    condition: 'days_since_last_FIM > 30',
    action: 'إشعار للمعالج + تسجيل في سجل الجودة',
    isActive: true,
    triggerCount: 12,
    lastTriggered: '2026-05-15',
    evidenceLevel: 'B',
  },
  {
    _id: 'r4',
    code: 'GOAL-RISK-007',
    name: 'الأهداف العلاجية في خطر',
    category: 'goal',
    severity: 'medium',
    condition: 'goal_progress_rate < 40% AND days_to_deadline < 14',
    action: 'إشعار للمعالج + اقتراح تعديل الهدف أو تكثيف الجلسات',
    isActive: true,
    triggerCount: 21,
    lastTriggered: '2026-05-14',
    evidenceLevel: 'C',
  },
  {
    _id: 'r5',
    code: 'SESS-ABS-002',
    name: 'غياب متتالي عن الجلسات',
    category: 'compliance',
    severity: 'medium',
    condition: 'consecutive_missed_sessions >= 3',
    action: 'إشعار المعالج والمشرف + تواصل أسري إلزامي',
    isActive: true,
    triggerCount: 9,
    lastTriggered: '2026-05-13',
    evidenceLevel: 'B',
  },
  {
    _id: 'r6',
    code: 'FAM-ADHC-001',
    name: 'انخفاض التزام الأسرة',
    category: 'compliance',
    severity: 'low',
    condition: 'homework_compliance_rate < 30% AND weeks_elapsed >= 2',
    action: 'إشعار للأخصائي الاجتماعي + جلسة تدريب أسري',
    isActive: true,
    triggerCount: 15,
    lastTriggered: '2026-05-12',
    evidenceLevel: 'C',
  },
  {
    _id: 'r7',
    code: 'DISCH-READY-001',
    name: 'جاهزية التخريج',
    category: 'quality',
    severity: 'info',
    condition: 'discharge_criteria_met >= 90%',
    action: 'اقتراح مراجعة خطة الانتقال + إشعار الفريق متعدد التخصصات',
    isActive: true,
    triggerCount: 5,
    lastTriggered: '2026-05-15',
    evidenceLevel: 'A',
  },
];

const MOCK_RISK_ASSESSMENTS = [
  {
    _id: 'ra1',
    beneficiaryName: 'أحمد محمد العتيبي',
    beneficiaryId: 'BNF-00412',
    overallScore: 78,
    riskLevel: 'very_high',
    domains: [
      { domain: 'سلامة الدواء', score: 92, flag: true },
      { domain: 'الالتزام بالعلاج', score: 65, flag: true },
      { domain: 'التقدم الوظيفي', score: 70, flag: false },
      { domain: 'الدعم الأسري', score: 55, flag: false },
    ],
    generatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    generatedBy: 'AI-Auto',
  },
  {
    _id: 'ra2',
    beneficiaryName: 'نورة خالد الغامدي',
    beneficiaryId: 'BNF-00298',
    overallScore: 61,
    riskLevel: 'high',
    domains: [
      { domain: 'سلامة الدواء', score: 20, flag: false },
      { domain: 'الالتزام بالعلاج', score: 72, flag: false },
      { domain: 'التقدم الوظيفي', score: 34, flag: true },
      { domain: 'الدعم الأسري', score: 80, flag: false },
    ],
    generatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    generatedBy: 'Dr. سلمى العمري',
  },
];

const MOCK_REHAB_SUGGESTIONS = [
  {
    _id: 's1',
    beneficiaryId: 'BNF-00389',
    beneficiaryName: 'فاطمة سالم الشهري',
    diagnosis: 'إصابة نخاع شوكي ناقصة C5-C6',
    suggestedPlan: {
      sessions: 3,
      frequency: 'أسبوعياً',
      modalities: ['تدريب القوة العضلية', 'العلاج المائي', 'تدريب الأنشطة اليومية'],
      goals: [
        'تحسين قوة الطرف العلوي +20%',
        'الاستقلالية في الإطعام',
        'تقليل الألم بمقياس VAS بـ 2 درجة',
      ],
      duration: '8 أسابيع',
      evidenceBased: true,
      referencedGuideline: 'SCIRE Clinical Practice Guideline 2024',
    },
    confidenceScore: 88,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    _id: 's2',
    beneficiaryId: 'BNF-00501',
    beneficiaryName: 'يوسف عبد الله القحطاني',
    diagnosis: 'إعاقة ذهنية متوسطة + اضطراب طيف التوحد',
    suggestedPlan: {
      sessions: 5,
      frequency: 'يومياً',
      modalities: ['التدخل السلوكي المكثف ABA', 'التكامل الحسي', 'تدريب المهارات الاجتماعية'],
      goals: [
        'خفض السلوكيات التكيفية السلبية 40%',
        'تحقيق 3 تواصلات وظيفية يومية',
        'تطوير 5 مهارات حياة مستقلة',
      ],
      duration: '12 أسبوعاً',
      evidenceBased: true,
      referencedGuideline: 'AOTA OT Practice Guidelines 2023',
    },
    confidenceScore: 82,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

const MOCK_DRUG_LIBRARY = [
  {
    _id: 'd1',
    name: 'باكلوفين',
    category: 'مرخيات العضلات',
    interactions: ['بنزوديازيبين', 'مضادات الاكتئاب', 'المسكنات الأفيونية'],
    contraindications: ['فشل كلوي حاد'],
    highRisk: true,
  },
  {
    _id: 'd2',
    name: 'ريفاستيجمين',
    category: 'مضادات الخرف',
    interactions: ['مضادات الكولين', 'بيتا حاصرات'],
    contraindications: ['تضيق المسالك البولية'],
    highRisk: false,
  },
  {
    _id: 'd3',
    name: 'ميثيل فينيديت',
    category: 'منبهات الجهاز العصبي',
    interactions: ['مضادات الاكتئاب ثلاثية الحلقات', 'مثبطات MAO'],
    contraindications: ['أمراض القلب الشديدة'],
    highRisk: true,
  },
  {
    _id: 'd4',
    name: 'بريدنيزون',
    category: 'كورتيكوستيرويدات',
    interactions: ['مضادات التخثر', 'NSAIDs'],
    contraindications: ['عدوى نشطة'],
    highRisk: false,
  },
  {
    _id: 'd5',
    name: 'غابابنتين',
    category: 'مضادات الاختلاج',
    interactions: ['مورفين', 'كيتامين', 'أوكسيكودون'],
    contraindications: ['مرضى غسيل الكلى'],
    highRisk: false,
  },
];

const MOCK_DECISION_LOG = [
  {
    _id: 'l1',
    action: 'override',
    alertCode: 'SESS-ABS-002',
    clinician: 'د. هاني القرشي',
    reason: 'المستفيد في إجازة طارئة — تم التأكيد مع الأسرة',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    _id: 'l2',
    action: 'accept',
    alertCode: 'REGR-02',
    clinician: 'د. سلمى العمري',
    reason: 'قبول اقتراح تكثيف الجلسات إلى 5/أسبوع',
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
  },
  {
    _id: 'l3',
    action: 'resolve',
    alertCode: 'DR-INT-001',
    clinician: 'الدكتور حسن الفيفي',
    reason: 'تم إيقاف الدواء المتعارض وبدء بديل آمن',
    timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    _id: 'l4',
    action: 'reject',
    alertCode: 'GOAL-RISK-007',
    clinician: 'أ. ريم المطيري',
    reason: 'تأخير الهدف بأسبوعين بموافقة الأسرة',
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
  {
    _id: 'l5',
    action: 'override',
    alertCode: 'FAM-ADHC-001',
    clinician: 'أ. تركي السعد',
    reason: 'الأسرة في ظروف خاصة — جدولة جلسة تدريب قريبة',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
];

// ─── API Helpers ──────────────────────────────────────────────────────────────

const withMock = async (apiFn, mockData) => {
  try {
    return await apiFn();
  } catch {
    return mockData;
  }
};

// ─── Backend → Frontend shape adapters ──────────────────────────────────────────
//
// The canonical backend (66666 `/api/v1/cdss`) returns a different shape than
// this dashboard was written against:
//   • lists    → { data: [...], total, page, limit }   (this file expected bare arrays)
//   • stats    → { stats: { activeAlerts: { value }, … } } (expected flat numbers)
//   • severity → enum ['info','warning','critical','emergency'] (UI uses critical/high/medium/low/info)
//   • field names differ on every entity (messageAr, genericName, drugInteractions, …)
// These adapters translate the live response into the shape the UI renders, so
// the page shows REAL data instead of silently falling back to demo data. Each
// adapter is fully defensive (optional chaining + Array.isArray guards) so a
// surprising payload can never throw during render.

// Pull the list out of either a bare array or the paginated envelope.
const pickList = body => {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    for (const key of [
      'data',
      'items',
      'results',
      'alerts',
      'rules',
      'drugs',
      'suggestions',
      'logs',
      'assessments',
    ]) {
      if (Array.isArray(body[key])) return body[key];
    }
  }
  return [];
};

// backend severity enum → UI severity bucket
const SEVERITY_MAP = {
  emergency: 'critical',
  critical: 'critical',
  warning: 'medium',
  info: 'info',
  // pass-through for values the UI already understands
  high: 'high',
  medium: 'medium',
  low: 'low',
};
const mapSeverity = s => SEVERITY_MAP[s] || 'info';

// backend rule category enum → UI category bucket (RULE_CATEGORIES keys)
const CATEGORY_MAP = {
  drug_interaction: 'medication',
  contraindication: 'medication',
  allergy: 'safety',
  lab_alert: 'assessment',
  lab_critical: 'assessment',
  risk_assessment: 'assessment',
  risk_flag: 'assessment',
  guideline: 'quality',
  protocol: 'compliance',
};
const mapCategory = c => CATEGORY_MAP[c] || c || 'safety';

const refName = ref =>
  ref && typeof ref === 'object' ? ref.fullNameAr || ref.fullName || ref.name || '' : '';

const toText = v => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    return v
      .map(x =>
        x && typeof x === 'object'
          ? [x.field, x.operator, x.value].filter(p => p !== undefined).join(' ') ||
            x.message ||
            x.type ||
            JSON.stringify(x)
          : String(x)
      )
      .join(' AND ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const toStringArray = v => {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.map(x =>
    x && typeof x === 'object'
      ? x.drug_code || x.goal || x.type || x.name || x.label || x.value || JSON.stringify(x)
      : String(x)
  );
};

const adaptStats = body => {
  const s = body?.stats || body || {};
  const num = x => {
    const v = x && typeof x === 'object' ? x.value : x;
    return typeof v === 'number' ? v : 0;
  };
  return {
    activeAlerts: num(s.activeAlerts),
    criticalAlerts: num(s.criticalAlerts),
    pendingSuggestions: num(s.pendingSuggestions),
    rulesActive: num(s.activeRules ?? s.rulesActive),
    rulesTriggeredToday: num(s.rulesTriggeredToday),
    highRiskPatients: num(s.highRiskPatients),
    riskAssessmentsToday: num(s.riskAssessmentsToday),
    decisionLogToday: num(s.decisionLogToday),
    resolvedToday: num(s.resolvedToday),
    drugChecksToday: num(s.drugChecksToday),
    avgRiskScore: num(s.avgRiskScore),
    trend: s.trend, // backend may omit; chart degrades gracefully to zeros
  };
};

const adaptAlert = a => ({
  _id: a?._id || a?.id,
  severity: mapSeverity(a?.severity),
  type: a?.alertType || a?.type,
  message: a?.messageAr || a?.message || '',
  beneficiaryName: refName(a?.beneficiaryId) || a?.beneficiaryName || '—',
  beneficiaryId:
    (a?.beneficiaryId && typeof a.beneficiaryId === 'object'
      ? a.beneficiaryId._id
      : a?.beneficiaryId) || '',
  triggeredAt: a?.triggeredAt || a?.createdAt,
  status: a?.status || 'active',
  ruleCode:
    (a?.ruleId && typeof a.ruleId === 'object' ? a.ruleId.code || a.ruleId.name : a?.ruleCode) ||
    a?.alertType ||
    '',
});

const adaptRule = r => ({
  _id: r?._id || r?.id,
  code: r?.code || '',
  name: r?.nameAr || r?.name || '',
  category: mapCategory(r?.category),
  severity: mapSeverity(r?.severity),
  condition: toText(r?.conditions ?? r?.condition),
  action: toText(r?.actions ?? r?.action),
  isActive: r?.isActive !== false,
  triggerCount: typeof r?.triggerCount === 'number' ? r.triggerCount : 0,
  evidenceLevel: r?.evidenceLevel || r?.guidelineSource || '—',
});

const adaptDrug = d => ({
  _id: d?._id || d?.id,
  code: d?.code || '',
  name: d?.genericNameAr || d?.genericName || d?.name || '',
  category: d?.drugClassAr || d?.drugClass || d?.category || '',
  interactions: toStringArray(d?.drugInteractions ?? d?.interactions),
  contraindications: toStringArray(d?.contraindications),
  highRisk: d?.highRisk !== undefined ? !!d.highRisk : !!d?.isControlled,
});

const adaptSuggestion = s => {
  const plan = s?.suggestedPlan || {};
  const conf = typeof s?.confidenceScore === 'number' ? s.confidenceScore : 0;
  return {
    _id: s?._id || s?.id,
    beneficiaryId:
      (s?.beneficiaryId && typeof s.beneficiaryId === 'object'
        ? s.beneficiaryId._id
        : s?.beneficiaryId) || '',
    beneficiaryName: refName(s?.beneficiaryId) || s?.beneficiaryName || '—',
    diagnosis: s?.diagnosis || plan.diagnosis || 'غير محدد',
    suggestedPlan: {
      sessions: s?.suggestedFrequency?.sessionsPerWeek ?? plan.sessions ?? 0,
      frequency: plan.frequency || 'أسبوعياً',
      modalities: toStringArray(s?.suggestedInterventions ?? plan.modalities),
      goals: toStringArray(s?.suggestedGoals ?? plan.goals),
      duration:
        plan.duration || (s?.estimatedDurationWeeks ? `${s.estimatedDurationWeeks} أسابيع` : ''),
      evidenceBased:
        plan.evidenceBased ??
        !!(Array.isArray(s?.evidenceReferences) && s.evidenceReferences.length),
      referencedGuideline: plan.referencedGuideline || s?.guidelineSource || '',
    },
    // backend stores 0–1; UI renders a percentage
    confidenceScore: conf > 0 && conf <= 1 ? Math.round(conf * 100) : Math.round(conf),
    status: s?.status || 'pending',
  };
};

const DECISION_ACTION_MAP = {
  alert_override: 'override',
  suggestion_accepted: 'accept',
  suggestion_rejected: 'reject',
  risk_acknowledged: 'acknowledge',
  rule_evaluated: 'evaluate',
};
const adaptDecision = l => ({
  _id: l?._id || l?.id,
  action: DECISION_ACTION_MAP[l?.decisionType] || l?.action || l?.decisionType || '',
  alertCode: l?.alertCode || l?.contextType || '',
  clinician: refName(l?.userId) || l?.clinician || '',
  reason: l?.rationale || l?.outcome || l?.reason || '',
  timestamp: l?.decisionAt || l?.timestamp || l?.createdAt,
});

const adaptList = (body, fn) => {
  try {
    return pickList(body).map(fn);
  } catch {
    return [];
  }
};

// ─── Exported API Functions ───────────────────────────────────────────────────

export const getStats = () =>
  withMock(() => apiClient.get(`${BASE}/stats`).then(r => adaptStats(r.data)), MOCK_STATS);

export const getAlerts = (params = {}) =>
  withMock(
    () => apiClient.get(`${BASE}/alerts`, { params }).then(r => adaptList(r.data, adaptAlert)),
    MOCK_ALERTS
  );

export const acknowledgeAlert = id =>
  withMock(() => apiClient.patch(`${BASE}/alerts/${id}/acknowledge`).then(r => r.data), {
    success: true,
  });

export const overrideAlert = (id, reason) =>
  withMock(
    () =>
      apiClient
        .patch(`${BASE}/alerts/${id}/override`, { overrideReason: reason })
        .then(r => r.data),
    { success: true }
  );

export const resolveAlert = id =>
  withMock(() => apiClient.patch(`${BASE}/alerts/${id}/resolve`).then(r => r.data), {
    success: true,
  });

export const getRules = (params = {}) =>
  withMock(
    () => apiClient.get(`${BASE}/rules`, { params }).then(r => adaptList(r.data, adaptRule)),
    MOCK_RULES
  );

// Map the dashboard's flat rule form back onto the backend ClinicalRule schema
// (nameAr / conditions / actions are required server-side).
const toBackendRule = data => ({
  code: data.code,
  name: data.name,
  nameAr: data.nameAr || data.name,
  category: data.category,
  severity: data.severity,
  description: data.action || '',
  descriptionAr: data.action || '',
  conditions: data.condition ? [{ expression: data.condition }] : [],
  actions: data.action ? [{ message: data.action }] : [],
  isActive: data.isActive !== false,
});

export const createRule = data =>
  withMock(
    () =>
      apiClient
        .post(`${BASE}/rules`, toBackendRule(data))
        .then(r => adaptRule(r.data?.data || r.data)),
    { ...data, _id: Date.now().toString() }
  );

export const updateRule = (id, data) =>
  withMock(
    () =>
      apiClient
        .put(`${BASE}/rules/${id}`, toBackendRule(data))
        .then(r => adaptRule(r.data?.data || r.data)),
    { ...data, _id: id }
  );

export const getRiskAssessments = (params = {}) =>
  withMock(
    () => apiClient.get(`${BASE}/risk-assessments`, { params }).then(r => pickList(r.data)),
    MOCK_RISK_ASSESSMENTS
  );

export const generateAutoRiskAssessment = (beneficiaryId, assessmentType = 'fall_risk') =>
  withMock(
    () =>
      apiClient
        .post(`${BASE}/risk-assessments/auto`, { beneficiaryId, assessmentType })
        .then(r => r.data?.data || r.data),
    MOCK_RISK_ASSESSMENTS[0]
  );

export const getRehabSuggestions = (params = {}) =>
  withMock(
    () =>
      apiClient
        .get(`${BASE}/rehab-suggestions`, { params })
        .then(r => adaptList(r.data, adaptSuggestion)),
    MOCK_REHAB_SUGGESTIONS
  );

export const acceptRehabSuggestion = id =>
  withMock(() => apiClient.patch(`${BASE}/rehab-suggestions/${id}/accept`).then(r => r.data), {
    success: true,
  });

export const rejectRehabSuggestion = (id, reason) =>
  withMock(
    () => apiClient.patch(`${BASE}/rehab-suggestions/${id}/reject`, { reason }).then(r => r.data),
    { success: true }
  );

export const getDrugLibrary = (params = {}) =>
  withMock(
    () => apiClient.get(`${BASE}/drugs`, { params }).then(r => adaptList(r.data, adaptDrug)),
    MOCK_DRUG_LIBRARY
  );

// `drugRefs` are the selected drugs' codes (falling back to ids for demo data).
export const checkDrugInteractions = drugRefs =>
  withMock(
    () =>
      apiClient.post(`${BASE}/drugs/check-interactions`, { drugCodes: drugRefs }).then(r => {
        const interactions = Array.isArray(r.data?.interactions) ? r.data.interactions : [];
        return { interactions, safe: !r.data?.hasCritical && interactions.length === 0 };
      }),
    { interactions: [], safe: true }
  );

export const getDecisionLog = (params = {}) =>
  withMock(
    () =>
      apiClient.get(`${BASE}/decision-log`, { params }).then(r => adaptList(r.data, adaptDecision)),
    MOCK_DECISION_LOG
  );

export const evaluateRules = (beneficiaryId, contextType = 'manual', contextData = {}) =>
  withMock(
    () =>
      apiClient
        .post(`${BASE}/alerts/evaluate`, { beneficiaryId, contextType, contextData })
        .then(r => ({
          triggered: r.data?.data?.length ?? 0,
          alerts: adaptList(r.data, adaptAlert),
        })),
    { triggered: 2, alerts: MOCK_ALERTS.slice(0, 2) }
  );
