/**
 * Therapist Portal Extended Service — خدمات بوابة المعالج الموسّعة
 *
 * خدمات جديدة لبوابة المعالج:
 * ─── الخطط العلاجية (Treatment Plans)
 * ─── التقييمات والمقاييس (Assessments)
 * ─── الوصفات والتوصيات العلاجية (Prescriptions)
 * ─── التطوير المهني (Professional Development)
 * ─── التحليلات المتقدمة (Advanced Analytics)
 * ─── الاستشارات والإحالات (Consultations & Referrals)
 *
 * @version 1.0.0
 */

// ─── Lazy model loaders ──────────────────────────────────────────────────────
let _TherapySession, _TherapeuticPlan, _SessionDocumentation, _CaseManagement;
let _Beneficiary, _Document, _Message;

const getTherapySession = () => {
  if (!_TherapySession) _TherapySession = require('../models/TherapySession');
  return _TherapySession;
};
const getPlan = () => {
  if (!_TherapeuticPlan) _TherapeuticPlan = require('../models/TherapeuticPlan');
  return _TherapeuticPlan;
};
const getDocumentation = () => {
  if (!_SessionDocumentation) _SessionDocumentation = require('../models/SessionDocumentation');
  return _SessionDocumentation;
};
const _getCaseManagement = () => {
  if (!_CaseManagement) _CaseManagement = require('../models/CaseManagement');
  return _CaseManagement;
};
const _getBeneficiary = () => {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
};
const _getDocument = () => {
  if (!_Document) _Document = require('../models/Document');
  return _Document;
};
const { escapeRegex } = require('../utils/sanitize');
const _getMessage = () => {
  if (!_Message) _Message = require('../models/message.model');
  return _Message;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const startOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const _endOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
};
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfWeek = (d = new Date()) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const daysAgo = n => {
  const dt = new Date();
  dt.setDate(dt.getDate() - n);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

// ─── In-memory stores for lightweight features ─────────────────────────────
const prescriptionsStore = new Map();
const consultationsStore = new Map();
const professionalDevStore = new Map();
const assessmentsStore = new Map();

let _prescriptionIdCounter = 1000;
let _consultationIdCounter = 2000;
let _pdIdCounter = 3000;
let _assessmentIdCounter = 4000;

class TherapistPortalExtendedService {
  // ═══════════════════════════════════════════════════════════════════════════
  //  الخطط العلاجية — Treatment Plans
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * جلب جميع الخطط العلاجية المعينة للمعالج
   */
  async getTreatmentPlans(therapistId, query = {}) {
    const Plan = getPlan();
    const filter = { assignedTherapists: therapistId };

    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { title: { $regex: escapeRegex(query.search), $options: 'i' } },
        { description: { $regex: escapeRegex(query.search), $options: 'i' } },
      ];
    }

    const plans = await Plan.find(filter)
      .populate('beneficiary', 'name mrn dateOfBirth')
      .sort({ updatedAt: -1 })
      .lean();

    const stats = {
      total: plans.length,
      active: plans.filter(p => p.status === 'active' || p.status === 'نشطة').length,
      completed: plans.filter(p => p.status === 'completed' || p.status === 'مكتملة').length,
      pending: plans.filter(p => p.status === 'pending' || p.status === 'معلقة').length,
      totalGoals: plans.reduce((sum, p) => sum + (p.goals?.length || 0), 0),
      achievedGoals: plans.reduce(
        (sum, p) => sum + (p.goals?.filter(g => g.status === 'ACHIEVED').length || 0),
        0
      ),
    };

    return { plans, stats };
  }

  /**
   * جلب تفاصيل خطة علاجية واحدة
   */
  async getTreatmentPlanDetail(therapistId, planId) {
    const Plan = getPlan();
    const Session = getTherapySession();

    const plan = await Plan.findOne({ _id: planId, assignedTherapists: therapistId })
      .populate('beneficiary', 'name mrn dateOfBirth gender')
      .lean();

    if (!plan) return null;

    // جلب الجلسات المرتبطة
    const relatedSessions = await Session.find({
      therapist: therapistId,
      beneficiary: plan.beneficiary?._id,
      date: {
        $gte: plan.startDate || daysAgo(90),
        $lte: plan.endDate || new Date(),
      },
    })
      .select('date status sessionType rating duration')
      .sort({ date: -1 })
      .limit(20)
      .lean();

    return { ...plan, relatedSessions };
  }

  /**
   * إنشاء خطة علاجية جديدة
   */
  async createTreatmentPlan(therapistId, planData) {
    const Plan = getPlan();
    const plan = new Plan({
      ...planData,
      assignedTherapists: [therapistId],
      createdBy: therapistId,
      status: planData.status || 'active',
    });
    await plan.save();
    return plan.toJSON();
  }

  /**
   * تحديث خطة علاجية
   */
  async updateTreatmentPlan(therapistId, planId, updates) {
    const Plan = getPlan();
    const plan = await Plan.findOneAndUpdate(
      { _id: planId, assignedTherapists: therapistId },
      { $set: updates },
      { new: true }
    ).lean();
    return plan;
  }

  /**
   * تحديث تقدم هدف في خطة علاجية
   */
  async updateGoalProgress(therapistId, planId, goalId, progressData) {
    const Plan = getPlan();
    const plan = await Plan.findOne({ _id: planId, assignedTherapists: therapistId });
    if (!plan) return null;

    const goal = plan.goals?.id(goalId);
    if (goal) {
      Object.assign(goal, progressData);
      goal.lastUpdated = new Date();
      goal.updatedBy = therapistId;
      await plan.save();
    }
    return plan.toJSON();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التقييمات والمقاييس — Assessments & Scales
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * جلب التقييمات للمعالج
   */
  async getAssessments(therapistId, _query = {}) {
    // جلب من الذاكرة + نماذج التقييم المعيارية
    const stored = [...assessmentsStore.values()].filter(a => a.therapistId === therapistId);

    const standardScales = [
      {
        id: 'BERG',
        name: 'مقياس بيرغ للتوازن',
        nameEn: 'Berg Balance Scale',
        category: 'physical',
        maxScore: 56,
        items: 14,
        description: 'تقييم التوازن الوظيفي لدى كبار السن والمرضى',
      },
      {
        id: 'FIM',
        name: 'مقياس الاستقلالية الوظيفية',
        nameEn: 'Functional Independence Measure',
        category: 'functional',
        maxScore: 126,
        items: 18,
        description: 'تقييم مستوى الاستقلالية في الأنشطة اليومية',
      },
      {
        id: 'VAS',
        name: 'مقياس الألم البصري',
        nameEn: 'Visual Analog Scale',
        category: 'pain',
        maxScore: 10,
        items: 1,
        description: 'تقييم شدة الألم من 0 إلى 10',
      },
      {
        id: 'GMFM',
        name: 'مقياس الوظيفة الحركية الكبرى',
        nameEn: 'Gross Motor Function Measure',
        category: 'motor',
        maxScore: 100,
        items: 88,
        description: 'تقييم الوظيفة الحركية الكبرى للأطفال',
      },
      {
        id: 'CARS',
        name: 'مقياس تقييم التوحد في الطفولة',
        nameEn: 'Childhood Autism Rating Scale',
        category: 'behavioral',
        maxScore: 60,
        items: 15,
        description: 'تقييم درجة التوحد لدى الأطفال',
      },
      {
        id: 'ADOS',
        name: 'جدول الملاحظة التشخيصية للتوحد',
        nameEn: 'Autism Diagnostic Observation Schedule',
        category: 'diagnostic',
        maxScore: 30,
        items: 5,
        description: 'أداة تشخيصية معيارية لاضطرابات طيف التوحد',
      },
      {
        id: 'PEDI',
        name: 'مقياس تقييم الإعاقة للأطفال',
        nameEn: 'Pediatric Evaluation of Disability Inventory',
        category: 'disability',
        maxScore: 100,
        items: 197,
        description: 'تقييم شامل لمهارات الأطفال ذوي الإعاقة',
      },
      {
        id: 'SSP',
        name: 'الملف الحسي المختصر',
        nameEn: 'Short Sensory Profile',
        category: 'sensory',
        maxScore: 190,
        items: 38,
        description: 'تقييم المعالجة الحسية والاستجابات',
      },
    ];

    // إحصائيات التقييمات
    const stats = {
      totalAssessments: stored.length,
      thisMonth: stored.filter(a => new Date(a.createdAt) >= startOfMonth()).length,
      thisWeek: stored.filter(a => new Date(a.createdAt) >= startOfWeek()).length,
      averageScore: stored.length
        ? Math.round(stored.reduce((s, a) => s + (a.scorePercent || 0), 0) / stored.length)
        : 0,
      byCategory: {},
    };

    // تصنيف حسب الفئة
    stored.forEach(a => {
      stats.byCategory[a.category] = (stats.byCategory[a.category] || 0) + 1;
    });

    return {
      assessments: stored,
      standardScales,
      stats,
    };
  }

  /**
   * إجراء تقييم جديد
   */
  async createAssessment(therapistId, assessmentData) {
    const id = `ASMT-${++_assessmentIdCounter}`;
    const assessment = {
      id,
      therapistId,
      ...assessmentData,
      scorePercent:
        assessmentData.maxScore > 0
          ? Math.round((assessmentData.score / assessmentData.maxScore) * 100)
          : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assessmentsStore.set(id, assessment);
    return assessment;
  }

  /**
   * جلب تقييم محدد بالتفصيل
   */
  async getAssessmentDetail(therapistId, assessmentId) {
    const assessment = assessmentsStore.get(assessmentId);
    if (!assessment || assessment.therapistId !== therapistId) return null;
    return assessment;
  }

  /**
   * حذف تقييم
   */
  async deleteAssessment(therapistId, assessmentId) {
    const assessment = assessmentsStore.get(assessmentId);
    if (!assessment || assessment.therapistId !== therapistId) return false;
    assessmentsStore.delete(assessmentId);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  الوصفات والتوصيات العلاجية — Prescriptions & Recommendations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * جلب الوصفات العلاجية
   */
  async getPrescriptions(therapistId, query = {}) {
    const stored = [...prescriptionsStore.values()].filter(p => p.therapistId === therapistId);

    let filtered = stored;
    if (query.status) filtered = filtered.filter(p => p.status === query.status);
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.patientName?.toLowerCase().includes(s) ||
          p.diagnosis?.toLowerCase().includes(s) ||
          p.prescriptionType?.toLowerCase().includes(s)
      );
    }

    const stats = {
      total: stored.length,
      active: stored.filter(p => p.status === 'active').length,
      completed: stored.filter(p => p.status === 'completed').length,
      pendingReview: stored.filter(p => p.status === 'pending_review').length,
      thisMonth: stored.filter(p => new Date(p.createdAt) >= startOfMonth()).length,
    };

    return {
      prescriptions: filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      stats,
    };
  }

  /**
   * إنشاء وصفة علاجية جديدة
   */
  async createPrescription(therapistId, prescriptionData) {
    const id = `RX-${++_prescriptionIdCounter}`;
    const prescription = {
      id,
      therapistId,
      ...prescriptionData,
      status: prescriptionData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prescriptionsStore.set(id, prescription);
    return prescription;
  }

  /**
   * تحديث وصفة علاجية
   */
  async updatePrescription(therapistId, prescriptionId, updates) {
    const prescription = prescriptionsStore.get(prescriptionId);
    if (!prescription || prescription.therapistId !== therapistId) return null;
    Object.assign(prescription, updates, { updatedAt: new Date().toISOString() });
    prescriptionsStore.set(prescriptionId, prescription);
    return prescription;
  }

  /**
   * حذف وصفة
   */
  async deletePrescription(therapistId, prescriptionId) {
    const prescription = prescriptionsStore.get(prescriptionId);
    if (!prescription || prescription.therapistId !== therapistId) return false;
    prescriptionsStore.delete(prescriptionId);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التطوير المهني — Professional Development
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * جلب أنشطة التطوير المهني
   */
  async getProfessionalDev(therapistId, _query = {}) {
    const stored = [...professionalDevStore.values()].filter(pd => pd.therapistId === therapistId);

    const categories = [
      { id: 'courses', name: 'دورات تدريبية', nameEn: 'Training Courses', icon: 'school' },
      {
        id: 'certifications',
        name: 'شهادات مهنية',
        nameEn: 'Certifications',
        icon: 'card_membership',
      },
      { id: 'conferences', name: 'مؤتمرات', nameEn: 'Conferences', icon: 'groups' },
      { id: 'workshops', name: 'ورش عمل', nameEn: 'Workshops', icon: 'build' },
      { id: 'research', name: 'أبحاث', nameEn: 'Research', icon: 'science' },
      {
        id: 'supervision',
        name: 'إشراف سريري',
        nameEn: 'Clinical Supervision',
        icon: 'supervisor_account',
      },
    ];

    const stats = {
      totalActivities: stored.length,
      totalHours: stored.reduce((sum, pd) => sum + (pd.hours || 0), 0),
      completedActivities: stored.filter(pd => pd.status === 'completed').length,
      inProgress: stored.filter(pd => pd.status === 'in_progress').length,
      certificates: stored.filter(pd => pd.category === 'certifications').length,
      thisYear: stored.filter(pd => new Date(pd.date) >= new Date(new Date().getFullYear(), 0, 1))
        .length,
      cpdPoints: stored.reduce((sum, pd) => sum + (pd.cpdPoints || 0), 0),
      targetCpdPoints: 40,
    };

    // التوصيات
    const recommendations = [
      {
        title: 'دورة العلاج السلوكي المعرفي المتقدم',
        provider: 'الجمعية السعودية للعلاج النفسي',
        hours: 30,
        cpdPoints: 15,
        deadline: '2026-06-30',
        category: 'courses',
      },
      {
        title: 'شهادة BCBA المهنية',
        provider: 'BACB',
        hours: 40,
        cpdPoints: 20,
        deadline: '2026-12-31',
        category: 'certifications',
      },
      {
        title: 'مؤتمر التأهيل الشامل السنوي',
        provider: 'وزارة الصحة',
        hours: 16,
        cpdPoints: 8,
        deadline: '2026-09-15',
        category: 'conferences',
      },
    ];

    return {
      activities: stored.sort((a, b) => new Date(b.date) - new Date(a.date)),
      categories,
      stats,
      recommendations,
    };
  }

  /**
   * إضافة نشاط تطوير مهني
   */
  async addProfessionalDev(therapistId, activityData) {
    const id = `PD-${++_pdIdCounter}`;
    const activity = {
      id,
      therapistId,
      ...activityData,
      status: activityData.status || 'in_progress',
      createdAt: new Date().toISOString(),
    };
    professionalDevStore.set(id, activity);
    return activity;
  }

  /**
   * تحديث نشاط
   */
  async updateProfessionalDev(therapistId, activityId, updates) {
    const activity = professionalDevStore.get(activityId);
    if (!activity || activity.therapistId !== therapistId) return null;
    Object.assign(activity, updates, { updatedAt: new Date().toISOString() });
    professionalDevStore.set(activityId, activity);
    return activity;
  }

  /**
   * حذف نشاط
   */
  async deleteProfessionalDev(therapistId, activityId) {
    const activity = professionalDevStore.get(activityId);
    if (!activity || activity.therapistId !== therapistId) return false;
    professionalDevStore.delete(activityId);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التحليلات المتقدمة — Advanced Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تحليلات شاملة للمعالج
   */
  async getAdvancedAnalytics(therapistId, query = {}) {
    const Session = getTherapySession();
    const Plan = getPlan();
    const Doc = getDocumentation();

    const period = parseInt(query.period) || 90;
    const fromDate = daysAgo(period);

    const [sessions, plans, docs] = await Promise.all([
      Session.find({
        therapist: therapistId,
        date: { $gte: fromDate },
      })
        .select('date status sessionType rating duration startTime beneficiary notes')
        .lean(),
      Plan.find({
        assignedTherapists: therapistId,
        updatedAt: { $gte: fromDate },
      })
        .select('goals status beneficiary startDate endDate')
        .lean(),
      Doc.find({
        therapist: therapistId,
        createdAt: { $gte: fromDate },
      })
        .select('soapNote outcomeMeasures createdAt')
        .lean(),
    ]);

    // ─── Outcome Analytics ────────────────────────────────────────────────
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const cancelledSessions = sessions.filter(s =>
      ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER', 'NO_SHOW'].includes(s.status)
    );

    // Session distribution by type
    const sessionsByType = {};
    sessions.forEach(s => {
      const t = s.sessionType || 'غير محدد';
      sessionsByType[t] = (sessionsByType[t] || 0) + 1;
    });

    // Sessions by status
    const sessionsByStatus = {};
    sessions.forEach(s => {
      sessionsByStatus[s.status] = (sessionsByStatus[s.status] || 0) + 1;
    });

    // Weekly trend (last 12 weeks)
    const weeklyTrend = [];
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - w * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSessions = sessions.filter(
        s => new Date(s.date) >= weekStart && new Date(s.date) < weekEnd
      );
      weeklyTrend.push({
        week: weekStart.toISOString().split('T')[0],
        total: weekSessions.length,
        completed: weekSessions.filter(s => s.status === 'COMPLETED').length,
        cancelled: weekSessions.filter(s =>
          ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'].includes(s.status)
        ).length,
      });
    }

    // Rating distribution
    const ratings = completedSessions.filter(s => s.rating).map(s => s.rating);
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      const rounded = Math.round(r);
      if (ratingDistribution[rounded] !== undefined) ratingDistribution[rounded]++;
    });

    // Peak hours analysis
    const hourlyDistribution = {};
    sessions.forEach(s => {
      const hour = s.startTime || 'غير محدد';
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    // Goal achievement rate
    const allGoals = plans.flatMap(p => p.goals || []);
    const goalStats = {
      total: allGoals.length,
      achieved: allGoals.filter(g => g.status === 'ACHIEVED').length,
      inProgress: allGoals.filter(g => g.status === 'IN_PROGRESS').length,
      notStarted: allGoals.filter(g => g.status === 'NOT_STARTED' || !g.status).length,
      achievementRate: allGoals.length
        ? Math.round((allGoals.filter(g => g.status === 'ACHIEVED').length / allGoals.length) * 100)
        : 0,
    };

    // Patient diversity
    const uniquePatients = [...new Set(sessions.map(s => String(s.beneficiary)))];

    // Documentation quality
    const docQuality = {
      totalNotes: docs.length,
      withOutcomes: docs.filter(d => d.outcomeMeasures?.length > 0).length,
      completenessRate: docs.length
        ? Math.round(
            (docs.filter(
              d =>
                d.soapNote?.subjective &&
                d.soapNote?.objective &&
                d.soapNote?.assessment &&
                d.soapNote?.plan
            ).length /
              docs.length) *
              100
          )
        : 0,
    };

    return {
      period: `${period} يوم`,
      summary: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        cancelledSessions: cancelledSessions.length,
        completionRate: sessions.length
          ? Math.round((completedSessions.length / sessions.length) * 100)
          : 0,
        averageRating: ratings.length
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : 0,
        totalPatients: uniquePatients.length,
        totalPlans: plans.length,
      },
      sessionsByType,
      sessionsByStatus,
      weeklyTrend,
      ratingDistribution,
      hourlyDistribution,
      goalStats,
      docQuality,
    };
  }

  /**
   * تقرير الإنتاجية
   */
  async getProductivityReport(therapistId) {
    const Session = getTherapySession();
    const _now = new Date();

    const [today, thisWeek, thisMonth, last30, last90] = await Promise.all([
      Session.countDocuments({
        therapist: therapistId,
        status: 'COMPLETED',
        date: { $gte: startOfDay() },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: 'COMPLETED',
        date: { $gte: startOfWeek() },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: 'COMPLETED',
        date: { $gte: startOfMonth() },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: 'COMPLETED',
        date: { $gte: daysAgo(30) },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: 'COMPLETED',
        date: { $gte: daysAgo(90) },
      }),
    ]);

    return {
      today,
      thisWeek,
      thisMonth,
      last30Days: last30,
      last90Days: last90,
      dailyAverage: Math.round((last30 / 30) * 10) / 10,
      weeklyAverage: Math.round((last90 / 13) * 10) / 10,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  الاستشارات والإحالات — Consultations & Referrals
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * جلب الاستشارات
   */
  async getConsultations(therapistId, query = {}) {
    const stored = [...consultationsStore.values()].filter(
      c => c.therapistId === therapistId || c.consultantId === therapistId
    );

    let filtered = stored;
    if (query.status) filtered = filtered.filter(c => c.status === query.status);
    if (query.type) filtered = filtered.filter(c => c.consultationType === query.type);

    const stats = {
      total: stored.length,
      pending: stored.filter(c => c.status === 'pending').length,
      accepted: stored.filter(c => c.status === 'accepted').length,
      completed: stored.filter(c => c.status === 'completed').length,
      asRequester: stored.filter(c => c.therapistId === therapistId).length,
      asConsultant: stored.filter(c => c.consultantId === therapistId).length,
    };

    return {
      consultations: filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      stats,
    };
  }

  /**
   * إنشاء استشارة جديدة
   */
  async createConsultation(therapistId, consultationData) {
    const id = `CONS-${++_consultationIdCounter}`;
    const consultation = {
      id,
      therapistId,
      ...consultationData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
    };
    consultationsStore.set(id, consultation);
    return consultation;
  }

  /**
   * الرد على استشارة
   */
  async respondToConsultation(therapistId, consultationId, responseData) {
    const consultation = consultationsStore.get(consultationId);
    if (!consultation) return null;
    if (consultation.therapistId !== therapistId && consultation.consultantId !== therapistId) {
      return null;
    }

    consultation.responses.push({
      responderId: therapistId,
      message: responseData.message,
      attachments: responseData.attachments || [],
      createdAt: new Date().toISOString(),
    });
    consultation.status = responseData.status || consultation.status;
    consultation.updatedAt = new Date().toISOString();
    consultationsStore.set(consultationId, consultation);
    return consultation;
  }

  /**
   * تحديث حالة استشارة
   */
  async updateConsultationStatus(therapistId, consultationId, status) {
    const consultation = consultationsStore.get(consultationId);
    if (!consultation) return null;
    if (consultation.therapistId !== therapistId && consultation.consultantId !== therapistId) {
      return null;
    }
    consultation.status = status;
    consultation.updatedAt = new Date().toISOString();
    consultationsStore.set(consultationId, consultation);
    return consultation;
  }

  /**
   * حذف استشارة
   */
  async deleteConsultation(therapistId, consultationId) {
    const consultation = consultationsStore.get(consultationId);
    if (!consultation || consultation.therapistId !== therapistId) return false;
    consultationsStore.delete(consultationId);
    return true;
  }
}

module.exports = new TherapistPortalExtendedService();
