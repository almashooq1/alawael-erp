/**
 * Therapist Portal Elite Service – Batch 5
 * ──────────────────────────────────────────
 * 1. Telehealth         (العلاج عن بُعد)
 * 2. Field Training      (سجل التدريب الميداني)
 * 3. Consent Management  (إدارة الموافقات)
 * 4. Quality Reports     (تقارير الجودة)
 * 5. Waiting List        (قائمة الانتظار)
 * 6. Achievement Board   (لوحة الإنجازات)
 */

const logger = console;

/* ─── In-memory stores ─── */
const telehealthStore = new Map();
const fieldTrainingStore = new Map();
const consentStore = new Map();
const qualityReportStore = new Map();
const waitingListStore = new Map();
const achievementStore = new Map();

let telehealthId = 17000;
let fieldTrainingId = 18000;
let consentId = 19000;
let qualityReportId = 20000;
let waitingListId = 21000;
let achievementId = 22000;

/* ─── Constants ─── */
const SESSION_TYPES = ['video', 'audio', 'chat', 'hybrid'];
const PLATFORMS = ['zoom', 'teams', 'internal', 'google-meet'];
const TRAINING_TYPES = ['clinical', 'observation', 'practicum', 'supervision', 'workshop'];
const CONSENT_TYPES = [
  'treatment',
  'assessment',
  'data-sharing',
  'photography',
  'research',
  'telehealth',
];
const QUALITY_CATEGORIES = [
  'clinical-audit',
  'compliance',
  'patient-safety',
  'documentation',
  'process-improvement',
];
const PRIORITY_LEVELS = ['urgent', 'high', 'medium', 'low'];
const BADGE_TYPES = [
  'milestone',
  'excellence',
  'innovation',
  'teamwork',
  'leadership',
  'dedication',
];

/* ─── Seed Data ─── */
function seedData() {
  if (telehealthStore.size > 0) return;

  // Telehealth sessions
  [
    {
      id: 'TH-17001',
      title: 'جلسة علاج نطق عن بُعد',
      titleEn: 'Remote Speech Therapy Session',
      sessionType: 'video',
      platform: 'zoom',
      patientName: 'أحمد محمد',
      therapistName: 'د. سارة الخالدي',
      scheduledDate: '2026-03-20T10:00:00Z',
      duration: 45,
      status: 'scheduled',
      roomUrl: 'https://zoom.us/j/1234567890',
      notes: 'جلسة متابعة أسبوعية',
    },
    {
      id: 'TH-17002',
      title: 'جلسة علاج وظيفي افتراضية',
      titleEn: 'Virtual OT Session',
      sessionType: 'video',
      platform: 'teams',
      patientName: 'فاطمة علي',
      therapistName: 'د. خالد الفهد',
      scheduledDate: '2026-03-19T14:00:00Z',
      duration: 30,
      status: 'completed',
      roomUrl: 'https://teams.microsoft.com/meet/abc',
      notes: 'تم تقييم المهارات الحركية الدقيقة',
      rating: 4.5,
    },
    {
      id: 'TH-17003',
      title: 'استشارة سلوكية عن بُعد',
      titleEn: 'Remote Behavioral Consultation',
      sessionType: 'audio',
      platform: 'internal',
      patientName: 'عمر حسن',
      therapistName: 'د. نورة السعيد',
      scheduledDate: '2026-03-21T09:00:00Z',
      duration: 60,
      status: 'scheduled',
      notes: 'استشارة أولية مع ولي الأمر',
    },
  ].forEach(s => {
    s.id = String(++telehealthId);
    s.createdAt = new Date().toISOString();
    telehealthStore.set(s.id, s);
  });

  // Field Training
  [
    {
      id: 'FT-18001',
      traineeName: 'ليلى أحمد',
      traineeNameEn: 'Layla Ahmed',
      type: 'clinical',
      supervisor: 'د. سارة الخالدي',
      institution: 'جامعة الملك سعود',
      startDate: '2026-01-15',
      endDate: '2026-06-15',
      totalHours: 480,
      completedHours: 240,
      status: 'in-progress',
      evaluations: [{ date: '2026-02-15', score: 85, notes: 'أداء ممتاز في التقييمات' }],
      tasks: ['مراقبة الجلسات', 'إعداد التقارير', 'تطبيق خطط العلاج'],
    },
    {
      id: 'FT-18002',
      traineeName: 'سلطان العتيبي',
      traineeNameEn: 'Sultan Al-Otaibi',
      type: 'observation',
      supervisor: 'د. خالد الفهد',
      institution: 'جامعة الأميرة نورة',
      startDate: '2026-02-01',
      endDate: '2026-05-01',
      totalHours: 320,
      completedHours: 160,
      status: 'in-progress',
      evaluations: [],
      tasks: ['مراقبة العلاج الوظيفي', 'توثيق الملاحظات'],
    },
  ].forEach(f => {
    f.id = String(++fieldTrainingId);
    f.createdAt = new Date().toISOString();
    fieldTrainingStore.set(f.id, f);
  });

  // Consents
  [
    {
      id: 'CN-19001',
      patientName: 'أحمد محمد',
      guardianName: 'محمد أحمد الحربي',
      consentType: 'treatment',
      title: 'موافقة على العلاج الطبيعي',
      description: 'موافقة ولي الأمر على بدء برنامج العلاج الطبيعي',
      status: 'signed',
      signedDate: '2026-01-10',
      expiryDate: '2027-01-10',
      signatureMethod: 'electronic',
    },
    {
      id: 'CN-19002',
      patientName: 'فاطمة علي',
      guardianName: 'علي فاطمة الزهراني',
      consentType: 'data-sharing',
      title: 'موافقة مشاركة البيانات',
      description: 'موافقة على مشاركة التقارير مع المدرسة',
      status: 'pending',
      expiryDate: '2027-03-01',
      signatureMethod: 'paper',
    },
    {
      id: 'CN-19003',
      patientName: 'عمر حسن',
      guardianName: 'حسن عمر المالكي',
      consentType: 'telehealth',
      title: 'موافقة العلاج عن بُعد',
      description: 'موافقة على إجراء جلسات العلاج عبر الفيديو',
      status: 'signed',
      signedDate: '2026-02-20',
      expiryDate: '2026-08-20',
      signatureMethod: 'electronic',
    },
  ].forEach(c => {
    c.id = String(++consentId);
    c.createdAt = new Date().toISOString();
    consentStore.set(c.id, c);
  });

  // Quality Reports
  [
    {
      id: 'QR-20001',
      title: 'تدقيق جودة التوثيق السريري',
      titleEn: 'Clinical Documentation Audit',
      category: 'documentation',
      auditor: 'د. نورة السعيد',
      auditDate: '2026-03-01',
      status: 'completed',
      score: 92,
      maxScore: 100,
      findings: ['توثيق شامل ومنظم', 'بعض التقارير تحتاج تفاصيل أكثر'],
      recommendations: ['إضافة قسم للملاحظات الإضافية'],
      actionPlan: 'ورشة تدريبية للفريق على معايير التوثيق',
      dueDate: '2026-04-01',
    },
    {
      id: 'QR-20002',
      title: 'مراجعة الامتثال للمعايير',
      titleEn: 'Standards Compliance Review',
      category: 'compliance',
      auditor: 'مدير الجودة',
      auditDate: '2026-02-15',
      status: 'in-progress',
      score: 78,
      maxScore: 100,
      findings: ['امتثال جيد للمعايير الوطنية', 'حاجة لتحديث بعض الإجراءات'],
      recommendations: ['تحديث دليل الإجراءات'],
      actionPlan: 'مراجعة شاملة للإجراءات',
      dueDate: '2026-05-01',
    },
  ].forEach(q => {
    q.id = String(++qualityReportId);
    q.createdAt = new Date().toISOString();
    qualityReportStore.set(q.id, q);
  });

  // Waiting List
  [
    {
      id: 'WL-21001',
      patientName: 'ريم السالم',
      patientAge: 6,
      serviceType: 'علاج نطق',
      priority: 'high',
      referralDate: '2026-02-01',
      estimatedWait: '2-3 أسابيع',
      status: 'waiting',
      position: 1,
      notes: 'حالة تأخر نطقي تحتاج تدخل مبكر',
      contactPhone: '0551234567',
    },
    {
      id: 'WL-21002',
      patientName: 'يوسف القحطاني',
      patientAge: 8,
      serviceType: 'علاج وظيفي',
      priority: 'medium',
      referralDate: '2026-02-10',
      estimatedWait: '4-6 أسابيع',
      status: 'waiting',
      position: 2,
      notes: 'صعوبات في المهارات الحركية',
      contactPhone: '0559876543',
    },
    {
      id: 'WL-21003',
      patientName: 'لمى العنزي',
      patientAge: 5,
      serviceType: 'علاج سلوكي',
      priority: 'urgent',
      referralDate: '2026-03-01',
      estimatedWait: '1 أسبوع',
      status: 'contacted',
      position: 1,
      notes: 'سلوكيات تحتاج تقييم عاجل',
      contactPhone: '0553456789',
    },
  ].forEach(w => {
    w.id = String(++waitingListId);
    w.createdAt = new Date().toISOString();
    waitingListStore.set(w.id, w);
  });

  // Achievements
  [
    {
      id: 'AC-22001',
      therapistName: 'د. سارة الخالدي',
      badgeType: 'milestone',
      title: '100 جلسة مكتملة',
      titleEn: '100 Sessions Completed',
      description: 'أكملت 100 جلسة علاجية بنجاح',
      icon: '🏆',
      earnedDate: '2026-02-15',
      points: 500,
      category: 'productivity',
    },
    {
      id: 'AC-22002',
      therapistName: 'د. خالد الفهد',
      badgeType: 'excellence',
      title: 'تقييم ممتاز',
      titleEn: 'Excellent Rating',
      description: 'حصل على تقييم 5 نجوم من 20 مريض متتالي',
      icon: '⭐',
      earnedDate: '2026-03-01',
      points: 300,
      category: 'quality',
    },
    {
      id: 'AC-22003',
      therapistName: 'د. نورة السعيد',
      badgeType: 'innovation',
      title: 'مبتكر العلاج',
      titleEn: 'Treatment Innovator',
      description: 'طورت برنامج علاجي مبتكر للأطفال',
      icon: '💡',
      earnedDate: '2026-01-20',
      points: 400,
      category: 'innovation',
    },
    {
      id: 'AC-22004',
      therapistName: 'د. سارة الخالدي',
      badgeType: 'dedication',
      title: 'التزام مثالي',
      titleEn: 'Perfect Attendance',
      description: 'حضور كامل لمدة 6 أشهر متتالية',
      icon: '🎯',
      earnedDate: '2026-03-10',
      points: 250,
      category: 'commitment',
    },
  ].forEach(a => {
    a.id = String(++achievementId);
    a.createdAt = new Date().toISOString();
    achievementStore.set(a.id, a);
  });
}

seedData();

/* ═══════════════════════════════════════
   1. Telehealth (العلاج عن بُعد)
   ═══════════════════════════════════════ */
class TherapistPortalEliteService {
  // ── Telehealth ──
  async getTelehealthSessions(query = {}) {
    let items = [...telehealthStore.values()];
    if (query.status) items = items.filter(i => i.status === query.status);
    if (query.platform) items = items.filter(i => i.platform === query.platform);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        i => i.title?.includes(s) || i.patientName?.includes(s) || i.therapistName?.includes(s)
      );
    }
    const scheduled = items.filter(i => i.status === 'scheduled').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const cancelled = items.filter(i => i.status === 'cancelled').length;
    return { data: items, stats: { total: items.length, scheduled, completed, cancelled } };
  }

  async createTelehealthSession(data) {
    const id = String(++telehealthId);
    const session = {
      id,
      ...data,
      status: data.status || 'scheduled',
      createdAt: new Date().toISOString(),
    };
    telehealthStore.set(id, session);
    return session;
  }

  async updateTelehealthSession(id, data) {
    const item = telehealthStore.get(id);
    if (!item) throw new Error('Telehealth session not found');
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return item;
  }

  async updateTelehealthStatus(id, status) {
    const item = telehealthStore.get(id);
    if (!item) throw new Error('Telehealth session not found');
    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (status === 'completed') item.completedAt = new Date().toISOString();
    return item;
  }

  async deleteTelehealthSession(id) {
    if (!telehealthStore.has(id)) throw new Error('Telehealth session not found');
    telehealthStore.delete(id);
    return { success: true };
  }

  // ── Field Training ──
  async getFieldTraining(query = {}) {
    let items = [...fieldTrainingStore.values()];
    if (query.status) items = items.filter(i => i.status === query.status);
    if (query.type) items = items.filter(i => i.type === query.type);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        i => i.traineeName?.includes(s) || i.supervisor?.includes(s) || i.institution?.includes(s)
      );
    }
    const active = items.filter(i => i.status === 'in-progress').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const totalHours = items.reduce((sum, i) => sum + (i.completedHours || 0), 0);
    return { data: items, stats: { total: items.length, active, completed, totalHours } };
  }

  async createFieldTraining(data) {
    const id = String(++fieldTrainingId);
    const item = {
      id,
      ...data,
      evaluations: data.evaluations || [],
      tasks: data.tasks || [],
      completedHours: 0,
      status: 'in-progress',
      createdAt: new Date().toISOString(),
    };
    fieldTrainingStore.set(id, item);
    return item;
  }

  async updateFieldTraining(id, data) {
    const item = fieldTrainingStore.get(id);
    if (!item) throw new Error('Field training not found');
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return item;
  }

  async addTrainingEvaluation(id, evalData) {
    const item = fieldTrainingStore.get(id);
    if (!item) throw new Error('Field training not found');
    const evaluation = {
      id: Date.now(),
      ...evalData,
      date: evalData.date || new Date().toISOString(),
    };
    item.evaluations = item.evaluations || [];
    item.evaluations.push(evaluation);
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async logTrainingHours(id, hours) {
    const item = fieldTrainingStore.get(id);
    if (!item) throw new Error('Field training not found');
    item.completedHours = (item.completedHours || 0) + Number(hours);
    if (item.completedHours >= item.totalHours) item.status = 'completed';
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async deleteFieldTraining(id) {
    if (!fieldTrainingStore.has(id)) throw new Error('Field training not found');
    fieldTrainingStore.delete(id);
    return { success: true };
  }

  // ── Consent Management ──
  async getConsents(query = {}) {
    let items = [...consentStore.values()];
    if (query.status) items = items.filter(i => i.status === query.status);
    if (query.consentType) items = items.filter(i => i.consentType === query.consentType);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        i => i.patientName?.includes(s) || i.guardianName?.includes(s) || i.title?.includes(s)
      );
    }
    const signed = items.filter(i => i.status === 'signed').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const expired = items.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date()).length;
    return { data: items, stats: { total: items.length, signed, pending, expired } };
  }

  async createConsent(data) {
    const id = String(++consentId);
    const item = {
      id,
      ...data,
      status: data.status || 'pending',
      createdAt: new Date().toISOString(),
    };
    consentStore.set(id, item);
    return item;
  }

  async updateConsent(id, data) {
    const item = consentStore.get(id);
    if (!item) throw new Error('Consent not found');
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return item;
  }

  async signConsent(id, signatureData) {
    const item = consentStore.get(id);
    if (!item) throw new Error('Consent not found');
    item.status = 'signed';
    item.signedDate = new Date().toISOString();
    item.signatureMethod = signatureData?.method || 'electronic';
    item.signedBy = signatureData?.signedBy;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async revokeConsent(id) {
    const item = consentStore.get(id);
    if (!item) throw new Error('Consent not found');
    item.status = 'revoked';
    item.revokedDate = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async deleteConsent(id) {
    if (!consentStore.has(id)) throw new Error('Consent not found');
    consentStore.delete(id);
    return { success: true };
  }

  // ── Quality Reports ──
  async getQualityReports(query = {}) {
    let items = [...qualityReportStore.values()];
    if (query.category) items = items.filter(i => i.category === query.category);
    if (query.status) items = items.filter(i => i.status === query.status);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(i => i.title?.includes(s) || i.auditor?.includes(s));
    }
    const avgScore =
      items.length > 0
        ? Math.round(items.reduce((sum, i) => sum + (i.score || 0), 0) / items.length)
        : 0;
    const completedAudits = items.filter(i => i.status === 'completed').length;
    const pendingActions = items.filter(i => i.status === 'in-progress').length;
    return {
      data: items,
      stats: { total: items.length, avgScore, completedAudits, pendingActions },
    };
  }

  async createQualityReport(data) {
    const id = String(++qualityReportId);
    const item = {
      id,
      ...data,
      findings: data.findings || [],
      recommendations: data.recommendations || [],
      status: data.status || 'in-progress',
      createdAt: new Date().toISOString(),
    };
    qualityReportStore.set(id, item);
    return item;
  }

  async updateQualityReport(id, data) {
    const item = qualityReportStore.get(id);
    if (!item) throw new Error('Quality report not found');
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return item;
  }

  async addFinding(id, finding) {
    const item = qualityReportStore.get(id);
    if (!item) throw new Error('Quality report not found');
    item.findings = item.findings || [];
    item.findings.push(finding);
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async deleteQualityReport(id) {
    if (!qualityReportStore.has(id)) throw new Error('Quality report not found');
    qualityReportStore.delete(id);
    return { success: true };
  }

  // ── Waiting List ──
  async getWaitingList(query = {}) {
    let items = [...waitingListStore.values()];
    if (query.status) items = items.filter(i => i.status === query.status);
    if (query.priority) items = items.filter(i => i.priority === query.priority);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(i => i.patientName?.includes(s) || i.serviceType?.includes(s));
    }
    items.sort((a, b) => {
      const prio = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (prio[a.priority] || 9) - (prio[b.priority] || 9);
    });
    const waiting = items.filter(i => i.status === 'waiting').length;
    const contacted = items.filter(i => i.status === 'contacted').length;
    const admitted = items.filter(i => i.status === 'admitted').length;
    return { data: items, stats: { total: items.length, waiting, contacted, admitted } };
  }

  async addToWaitingList(data) {
    const id = String(++waitingListId);
    const item = {
      id,
      ...data,
      status: data.status || 'waiting',
      position: waitingListStore.size + 1,
      createdAt: new Date().toISOString(),
    };
    waitingListStore.set(id, item);
    return item;
  }

  async updateWaitingListItem(id, data) {
    const item = waitingListStore.get(id);
    if (!item) throw new Error('Waiting list item not found');
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return item;
  }

  async updateWaitingStatus(id, status) {
    const item = waitingListStore.get(id);
    if (!item) throw new Error('Waiting list item not found');
    item.status = status;
    if (status === 'admitted') item.admittedDate = new Date().toISOString();
    if (status === 'contacted') item.contactedDate = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async removeFromWaitingList(id) {
    if (!waitingListStore.has(id)) throw new Error('Waiting list item not found');
    waitingListStore.delete(id);
    return { success: true };
  }

  // ── Achievement Board ──
  async getAchievements(query = {}) {
    let items = [...achievementStore.values()];
    if (query.badgeType) items = items.filter(i => i.badgeType === query.badgeType);
    if (query.category) items = items.filter(i => i.category === query.category);
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(i => i.therapistName?.includes(s) || i.title?.includes(s));
    }
    const totalPoints = items.reduce((sum, i) => sum + (i.points || 0), 0);
    const uniqueTherapists = new Set(items.map(i => i.therapistName)).size;
    const badgeCounts = {};
    items.forEach(i => {
      badgeCounts[i.badgeType] = (badgeCounts[i.badgeType] || 0) + 1;
    });
    return {
      data: items,
      stats: { total: items.length, totalPoints, uniqueTherapists, badgeCounts },
    };
  }

  async createAchievement(data) {
    const id = String(++achievementId);
    const item = {
      id,
      ...data,
      earnedDate: data.earnedDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    achievementStore.set(id, item);
    return item;
  }

  async updateAchievement(id, data) {
    const item = achievementStore.get(id);
    if (!item) throw new Error('Achievement not found');
    Object.assign(item, data, { updatedAt: new Date().toISOString() });
    return item;
  }

  async deleteAchievement(id) {
    if (!achievementStore.has(id)) throw new Error('Achievement not found');
    achievementStore.delete(id);
    return { success: true };
  }
}

module.exports = new TherapistPortalEliteService();
