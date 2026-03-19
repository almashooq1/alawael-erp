/* eslint-disable no-unused-vars */
/**
 * Physical Therapy Service for Disability Rehabilitation
 * خدمة العلاج الطبيعي لتأهيل ذوي الإعاقة
 */

class PhysicalTherapyService {
  constructor() {
    this.exercises = new Map();
    this.sessions = new Map();
    this.progress = new Map();
  }

  /**
   * إنشاء خطة علاج طبيعي مخصصة
   */
  async createTreatmentPlan(beneficiaryId, assessment) {
    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      goals: assessment.goals || [],
      exercises: this._recommendExercises(assessment.disabilityType),
      frequency: assessment.frequency || '3 times per week',
      duration: assessment.duration || '12 weeks',
      status: 'active',
    };

    this.exercises.set(plan.id, plan);
    return plan;
  }

  /**
   * توصية تمارين حسب نوع الإعاقة
   */
  _recommendExercises(disabilityType) {
    const exerciseMap = {
      motor: [
        { name: 'تمارين الحركة', reps: 10, sets: 3 },
        { name: 'تمارين التوازن', reps: 15, sets: 2 },
        { name: 'تمارين القوة', reps: 12, sets: 3 },
      ],
      sensory: [
        { name: 'تمارين التناسق الحسي', reps: 10, sets: 2 },
        { name: 'تمارين الوعي المكاني', reps: 8, sets: 3 },
      ],
      cognitive: [
        { name: 'تمارين التآزر', reps: 10, sets: 2 },
        { name: 'تمارين الاستجابة', reps: 12, sets: 3 },
      ],
    };
    return exerciseMap[disabilityType] || exerciseMap['motor'];
  }

  /**
   * تسجيل جلسة علاج
   */
  async recordSession(beneficiaryId, sessionData) {
    const session = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      therapist: sessionData.therapist,
      exercises: sessionData.exercises,
      notes: sessionData.notes,
      progress: sessionData.progress,
      nextSession: sessionData.nextSession,
    };

    this.sessions.set(session.id, session);
    this._updateProgress(beneficiaryId, sessionData.progress);
    return session;
  }

  /**
   * تحديث التقدم
   */
  _updateProgress(beneficiaryId, progressData) {
    const current = this.progress.get(beneficiaryId) || { overall: 0, sessions: [] };
    current.sessions.push({
      date: new Date(),
      progress: progressData,
    });
    current.overall = this._calculateOverallProgress(current.sessions);
    this.progress.set(beneficiaryId, current);
  }

  /**
   * حساب التقدم الإجمالي
   */
  _calculateOverallProgress(sessions) {
    if (sessions.length === 0) return 0;
    const total = sessions.reduce((sum, s) => sum + s.progress, 0);
    return Math.round(total / sessions.length);
  }

  /**
   * الحصول على تقرير التقدم
   */
  async getProgressReport(beneficiaryId) {
    return this.progress.get(beneficiaryId) || { overall: 0, sessions: [] };
  }
}

module.exports = { PhysicalTherapyService };
