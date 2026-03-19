/**
 * خدمة علاج اضطرابات النوم
 * Sleep Therapy Service
 * Phase 8 — تقييم وعلاج اضطرابات النوم لدى المستفيدين
 */

class SleepTherapyService {
  constructor() {
    this.assessments = new Map();
    this.plans = new Map();
    this.logs = new Map();
    this.sessions = new Map();
  }

  /**
   * تقييم النوم الشامل
   */
  async assessSleep(beneficiaryId, data) {
    const id = `sleep-a-${Date.now()}`;

    // حساب مؤشر جودة النوم بيتسبرغ (PSQI) المبسط
    const psqiScore = this._calculatePSQI(data);

    const assessment = {
      id,
      beneficiaryId,
      date: new Date().toISOString(),
      sleepHistory: {
        bedtime: data.bedtime || '22:00',
        wakeTime: data.wakeTime || '06:00',
        sleepLatency: data.sleepLatency ?? 30, // دقائق للنوم
        wakeAfterOnset: data.wakeAfterOnset ?? 0, // استيقاظ أثناء النوم
        totalSleepTime: data.totalSleepTime ?? 7, // ساعات
        sleepEfficiency: data.totalSleepTime
          ? ((data.totalSleepTime / (data.timeInBed || 8)) * 100).toFixed(1)
          : null,
        napFrequency: data.napFrequency || 'نادراً',
        napDuration: data.napDuration || 0,
      },
      sleepDisorders: {
        insomnia: data.insomnia || false,
        sleepApnea: data.sleepApnea || false,
        restlessLegs: data.restlessLegs || false,
        narcolepsy: data.narcolepsy || false,
        parasomnia: data.parasomnia || false,
        circadianRhythmDisorder: data.circadianDisorder || false,
        painRelated: data.painRelated || false,
        medicationRelated: data.medicationRelated || false,
      },
      environmentalFactors: {
        roomTemperature: data.roomTemp || 'مناسبة',
        lightExposure: data.lightExposure || 'معتدل',
        noiseLevel: data.noiseLevel || 'هادئ',
        screenUseBefore: data.screenTime || 0, // دقائق قبل النوم
        caffeineIntake: data.caffeine || 'لا يوجد',
        exerciseTiming: data.exerciseTiming || 'لا يوجد',
      },
      disabilityRelatedFactors: {
        painDisturbance: data.painDisturbance ?? false,
        spasticityDisturbance: data.spasticityDisturbance ?? false,
        positioningIssues: data.positioningIssues ?? false,
        respiratoryIssues: data.respiratoryIssues ?? false,
        medicationSideEffects: data.medicationSideEffects || [],
        assistiveDeviceIssues: data.deviceIssues || false,
      },
      psqiScore,
      psqiInterpretation:
        psqiScore <= 5 ? 'جودة نوم جيدة' : psqiScore <= 10 ? 'جودة نوم ضعيفة' : 'اضطراب نوم شديد',
      impactOnRehabilitation: data.rehabImpact || 'متوسط',
      recommendations: this._generateSleepRec(data, psqiScore),
      assessor: data.assessorId || 'system',
      status: 'مكتمل',
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /**
   * إنشاء خطة علاج النوم
   */
  async createSleepPlan(beneficiaryId, planData) {
    const id = `sleep-p-${Date.now()}`;
    const plan = {
      id,
      beneficiaryId,
      assessmentId: planData.assessmentId || null,
      createdAt: new Date().toISOString(),
      diagnosis: planData.diagnosis || 'اضطراب نوم غير محدد',
      goals: planData.goals || ['تحسين كفاءة النوم', 'تقليل وقت الاستغراق'],
      // تدخلات نظافة النوم
      sleepHygiene: {
        fixedSchedule: planData.fixedSchedule || { bedtime: '22:00', wakeTime: '06:00' },
        screenCutoff: planData.screenCutoff || 60, // دقائق قبل النوم
        caffeineCutoff: planData.caffeineCutoff || '14:00',
        exerciseTime: planData.exerciseTime || 'صباحاً',
        bedtimeRoutine: planData.bedtimeRoutine || ['استرخاء', 'قراءة', 'تمارين تنفس'],
        environmentalChanges: planData.environmentalChanges || [],
      },
      // العلاج السلوكي المعرفي للأرق (CBT-I)
      cbti: {
        enabled: planData.cbtiEnabled || false,
        sleepRestriction: planData.sleepRestriction || null,
        stimulusControl: planData.stimulusControl || [],
        cognitiveRestructuring: planData.cognitiveRestructuring || false,
        relaxationTraining: planData.relaxationTraining || [],
      },
      // تعديلات خاصة بالإعاقة
      disabilityAdaptations: {
        positioning: planData.positioning || [],
        assistiveDevices: planData.assistiveDevices || [],
        painManagement: planData.painManagement || [],
        medicationTiming: planData.medicationTiming || [],
      },
      reviewSchedule: planData.reviewSchedule || 'كل أسبوعين',
      status: 'نشطة',
    };
    this.plans.set(id, plan);
    return plan;
  }

  /**
   * تسجيل يوميات النوم
   */
  async logSleepDiary(beneficiaryId, logData) {
    const id = `sleep-d-${Date.now()}`;
    const entry = {
      id,
      beneficiaryId,
      date: logData.date || new Date().toISOString(),
      bedtime: logData.bedtime || '',
      lightsOff: logData.lightsOff || '',
      sleepLatency: logData.sleepLatency ?? null,
      numberOfAwakenings: logData.awakenings ?? 0,
      wakeAfterSleepOnset: logData.waso ?? 0,
      finalWakeTime: logData.finalWake || '',
      outOfBedTime: logData.outOfBed || '',
      totalSleepTime: logData.totalSleep ?? null,
      sleepQuality: logData.sleepQuality ?? null, // 1-5
      restfulness: logData.restfulness ?? null, // 1-5
      daytimeSleepiness: logData.daytimeSleepiness ?? null, // 1-5
      naps: logData.naps || [],
      notes: logData.notes || '',
    };
    this.logs.set(id, entry);
    return entry;
  }

  /**
   * تسجيل جلسة علاج النوم
   */
  async recordSession(beneficiaryId, sessionData) {
    const id = `sleep-s-${Date.now()}`;
    const session = {
      id,
      beneficiaryId,
      planId: sessionData.planId || null,
      date: new Date().toISOString(),
      sessionType: sessionData.sessionType || 'CBT-I', // CBT-I, استرخاء, تعليم نظافة النوم
      duration: sessionData.duration || 45,
      topicsCovered: sessionData.topicsCovered || [],
      techniquesIntroduced: sessionData.techniques || [],
      sleepRestrictionAdjustment: sessionData.sleepRestriction || null,
      homeworkAssigned: sessionData.homework || [],
      previousHomeworkReview: sessionData.homeworkReview || '',
      patientProgress: sessionData.progress || '',
      notes: sessionData.notes || '',
      therapistId: sessionData.therapistId || 'system',
    };
    this.sessions.set(id, session);
    return session;
  }

  /**
   * تقرير النوم
   */
  async getSleepReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const plans = [...this.plans.values()].filter(p => p.beneficiaryId === beneficiaryId);
    const logs = [...this.logs.values()].filter(l => l.beneficiaryId === beneficiaryId);
    const sessions = [...this.sessions.values()].filter(s => s.beneficiaryId === beneficiaryId);

    const avgSleepQuality =
      logs.length > 0
        ? (logs.reduce((s, l) => s + (l.sleepQuality || 0), 0) / logs.length).toFixed(1)
        : null;
    const avgTotalSleep =
      logs.length > 0
        ? (logs.reduce((s, l) => s + (l.totalSleepTime || 0), 0) / logs.length).toFixed(1)
        : null;

    return {
      beneficiaryId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssessments: assessments.length,
        activePlans: plans.filter(p => p.status === 'نشطة').length,
        totalSessions: sessions.length,
        diaryEntries: logs.length,
        averageSleepQuality: avgSleepQuality,
        averageTotalSleep: avgTotalSleep,
        latestPSQI: assessments.length > 0 ? assessments[assessments.length - 1].psqiScore : null,
      },
      recentLogs: logs.slice(-7),
      recentSessions: sessions.slice(-5),
      activePlan: plans.find(p => p.status === 'نشطة') || null,
    };
  }

  _calculatePSQI(data) {
    let score = 0;
    if ((data.sleepLatency || 0) > 30) score += 2;
    else if ((data.sleepLatency || 0) > 15) score += 1;
    if ((data.totalSleepTime || 8) < 5) score += 3;
    else if ((data.totalSleepTime || 8) < 6) score += 2;
    else if ((data.totalSleepTime || 8) < 7) score += 1;
    if (data.sleepApnea) score += 2;
    if (data.painRelated) score += 2;
    if ((data.wakeAfterOnset || 0) > 30) score += 2;
    else if ((data.wakeAfterOnset || 0) > 15) score += 1;
    return Math.min(score, 21);
  }

  _generateSleepRec(data, psqi) {
    const recs = [];
    if (psqi > 10) recs.push('إحالة لطبيب اضطرابات النوم');
    if (data.sleepApnea) recs.push('فحص دراسة النوم (PSG)');
    if ((data.sleepLatency || 0) > 30) recs.push('تطبيق تقنية تقييد النوم');
    if ((data.screenTime || 0) > 30) recs.push('تقليل وقت الشاشة قبل النوم');
    if (data.painRelated) recs.push('تنسيق مع فريق إدارة الألم');
    recs.push('بدء يوميات نوم لمدة أسبوعين');
    recs.push('تطبيق نظافة نوم أساسية');
    return recs;
  }
}

module.exports = { SleepTherapyService };
