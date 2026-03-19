/**
 * خدمة إدارة الألم
 * Pain Management Service
 * Phase 8 — إدارة الألم المزمن وبرامج العلاج متعددة التخصصات
 */

class PainManagementService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.sessions = new Map();
    this.logs = new Map();
  }

  /**
   * تقييم الألم الشامل
   */
  async assessPain(beneficiaryId, assessmentData) {
    const id = `pain-a-${Date.now()}`;
    const assessment = {
      id,
      beneficiaryId,
      date: new Date().toISOString(),
      // مقاييس الألم
      painScaleVAS: assessmentData.vasScore ?? null, // 0-10
      painScaleNRS: assessmentData.nrsScore ?? null, // 0-10
      painLocation: assessmentData.locations || [],
      painType: assessmentData.painType || 'غير محدد', // حاد | مزمن | عصبي | عضلي
      painCharacter: assessmentData.character || [], // حارق، نابض، طاعن، ضاغط
      painFrequency: assessmentData.frequency || 'مستمر',
      painDuration: assessmentData.duration || '',
      aggravatingFactors: assessmentData.aggravatingFactors || [],
      relievingFactors: assessmentData.relievingFactors || [],
      // التأثير الوظيفي
      functionalImpact: {
        mobility: assessmentData.mobilityImpact ?? 5,
        sleep: assessmentData.sleepImpact ?? 5,
        mood: assessmentData.moodImpact ?? 5,
        dailyActivities: assessmentData.dailyActivitiesImpact ?? 5,
        socialParticipation: assessmentData.socialImpact ?? 5,
        overallQuality: assessmentData.qualityOfLife ?? 5,
      },
      // الأدوية الحالية
      currentMedications: assessmentData.medications || [],
      previousTreatments: assessmentData.previousTreatments || [],
      psychologicalFactors: {
        anxiety: assessmentData.anxietyLevel ?? 'لا يوجد',
        depression: assessmentData.depressionLevel ?? 'لا يوجد',
        catastrophizing: assessmentData.catastrophizing ?? false,
        fearAvoidance: assessmentData.fearAvoidance ?? false,
      },
      recommendations: this._generatePainRec(assessmentData),
      assessor: assessmentData.assessorId || 'system',
      status: 'مكتمل',
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة إدارة الألم
   */
  async createPainPlan(beneficiaryId, planData) {
    const id = `pain-p-${Date.now()}`;
    const plan = {
      id,
      beneficiaryId,
      assessmentId: planData.assessmentId || null,
      createdAt: new Date().toISOString(),
      diagnosis: planData.diagnosis || '',
      painLevel: planData.currentPainLevel || 0,
      goalPainLevel: planData.goalPainLevel || 3,
      // مكونات الخطة متعددة التخصصات
      pharmacological: {
        medications: planData.medications || [],
        schedule: planData.medicationSchedule || '',
        sideEffectMonitoring: planData.sideEffectMonitoring || [],
      },
      physicalTherapy: {
        exercises: planData.exercises || [],
        frequency: planData.exerciseFrequency || '3 مرات/أسبوع',
        modalities: planData.modalities || [], // TENS, حرارة, برودة, ليزر
      },
      psychological: {
        cbtSessions: planData.cbtSessions || false,
        relaxationTraining: planData.relaxationTraining || false,
        mindfulness: planData.mindfulness || false,
        biofeedback: planData.biofeedback || false,
      },
      complementary: {
        acupuncture: planData.acupuncture || false,
        massage: planData.massage || false,
        hydrotherapy: planData.hydrotherapy || false,
        yoga: planData.yoga || false,
      },
      lifestyle: {
        sleepHygiene: planData.sleepHygiene || [],
        activityPacing: planData.activityPacing || '',
        ergonomicAdvice: planData.ergonomicAdvice || [],
        dietaryRecommendations: planData.dietaryRec || [],
      },
      reviewSchedule: planData.reviewSchedule || 'كل أسبوعين',
      teamMembers: planData.teamMembers || [],
      status: 'نشطة',
    };
    this.plans.set(id, plan);
    return plan;
  }

  /**
   * تسجيل جلسة إدارة ألم
   */
  async recordSession(beneficiaryId, sessionData) {
    const id = `pain-s-${Date.now()}`;
    const session = {
      id,
      beneficiaryId,
      planId: sessionData.planId || null,
      date: new Date().toISOString(),
      sessionType: sessionData.sessionType || 'علاج طبيعي',
      duration: sessionData.duration || 45,
      painBefore: sessionData.painBefore ?? null,
      painAfter: sessionData.painAfter ?? null,
      treatmentProvided: sessionData.treatment || [],
      modalitiesUsed: sessionData.modalities || [],
      exercisesPerformed: sessionData.exercises || [],
      patientResponse: sessionData.response || 'جيد',
      sideEffects: sessionData.sideEffects || [],
      homeProgram: sessionData.homeProgram || [],
      notes: sessionData.notes || '',
      therapistId: sessionData.therapistId || 'system',
      nextAppointment: sessionData.nextAppointment || null,
    };
    this.sessions.set(id, session);
    return session;
  }

  /**
   * تسجيل يوميات الألم
   */
  async logPainDiary(beneficiaryId, logData) {
    const id = `pain-d-${Date.now()}`;
    const entry = {
      id,
      beneficiaryId,
      date: logData.date || new Date().toISOString(),
      time: logData.time || new Date().toLocaleTimeString('ar-SA'),
      painLevel: logData.painLevel ?? 0,
      location: logData.location || '',
      activity: logData.activity || '',
      trigger: logData.trigger || '',
      medicationTaken: logData.medicationTaken || null,
      reliefMethod: logData.reliefMethod || '',
      reliefEffectiveness: logData.reliefEffectiveness ?? null, // 0-10
      mood: logData.mood || 'مستقر',
      sleepQuality: logData.sleepQuality ?? null, // 0-10
      notes: logData.notes || '',
    };
    this.logs.set(id, entry);
    return entry;
  }

  /**
   * تقرير إدارة الألم
   */
  async getPainReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const plans = [...this.plans.values()].filter(p => p.beneficiaryId === beneficiaryId);
    const sessions = [...this.sessions.values()].filter(s => s.beneficiaryId === beneficiaryId);
    const logs = [...this.logs.values()].filter(l => l.beneficiaryId === beneficiaryId);

    const avgPain =
      logs.length > 0
        ? (logs.reduce((sum, l) => sum + (l.painLevel || 0), 0) / logs.length).toFixed(1)
        : null;
    const painTrend =
      logs.length >= 3 ? this._calculateTrend(logs.map(l => l.painLevel)) : 'بيانات غير كافية';

    return {
      beneficiaryId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssessments: assessments.length,
        activePlans: plans.filter(p => p.status === 'نشطة').length,
        totalSessions: sessions.length,
        diaryEntries: logs.length,
        averagePainLevel: avgPain,
        painTrend,
        lastAssessment: assessments.length > 0 ? assessments[assessments.length - 1].date : null,
      },
      recentSessions: sessions.slice(-5),
      recentDiary: logs.slice(-7),
      activePlan: plans.find(p => p.status === 'نشطة') || null,
    };
  }

  _generatePainRec(data) {
    const recs = [];
    if ((data.vasScore || 0) >= 7) recs.push('مراجعة طبية عاجلة لتعديل الأدوية');
    if (data.catastrophizing) recs.push('جلسات علاج سلوكي معرفي (CBT)');
    if (data.sleepImpact >= 7) recs.push('تقييم اضطرابات النوم');
    if (data.mobilityImpact >= 6) recs.push('برنامج تمارين تدريجي');
    recs.push('يوميات ألم يومية لمتابعة الأنماط');
    recs.push('خطة إدارة ألم متعددة التخصصات');
    return recs;
  }

  _calculateTrend(values) {
    if (values.length < 3) return 'غير كاف';
    const recent = values.slice(-3);
    const earlier = values.slice(0, 3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    if (recentAvg < earlierAvg - 1) return 'تحسن';
    if (recentAvg > earlierAvg + 1) return 'تدهور';
    return 'مستقر';
  }
}

module.exports = { PainManagementService };
