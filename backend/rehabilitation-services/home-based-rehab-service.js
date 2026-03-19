'use strict';

/**
 * خدمة التأهيل المنزلي
 * Home-Based Rehabilitation Service
 *
 * تقديم خدمات التأهيل في المنزل وإدارة الزيارات المنزلية
 * وتقييم بيئة المنزل وتعديلاتها لملاءمة الإعاقة
 */

class HomeBasedRehabService {
  constructor() {
    this.assessments = new Map();
    this.visits = new Map();
    this.homeModifications = new Map();
    this.homePrograms = new Map();
    this.counter = { assess: 0, visit: 0, modify: 0, program: 0 };
  }

  /** تقييم بيئة المنزل */
  async assessHomeEnvironment(beneficiaryId, data) {
    const id = `HOME-ASSESS-${++this.counter.assess}`;
    const assessment = {
      id,
      beneficiaryId,
      address: data.address || '',
      homeType: data.homeType || 'شقة',
      floors: data.floors || 1,
      accessibility: {
        entrance: data.entranceAccessible || false,
        bathroom: data.bathroomAccessible || false,
        kitchen: data.kitchenAccessible || false,
        bedroom: data.bedroomAccessible || false,
        corridors: data.corridorsWidth || 0,
      },
      hazards: data.hazards || [],
      existingModifications: data.existingModifications || [],
      recommendedModifications: this._getModificationRecommendations(data),
      safetyScore: this._calculateSafetyScore(data),
      assessedBy: data.therapistId,
      date: new Date(),
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /** جدولة زيارة منزلية */
  async scheduleVisit(beneficiaryId, data) {
    const id = `HOME-VISIT-${++this.counter.visit}`;
    const visit = {
      id,
      beneficiaryId,
      type: data.type || 'علاجية',
      therapistId: data.therapistId,
      scheduledDate: data.scheduledDate || new Date(),
      scheduledTime: data.scheduledTime || '10:00',
      estimatedDuration: data.duration || 60,
      services: data.services || [],
      equipment: data.equipment || [],
      status: 'مجدولة',
      notes: data.notes || '',
      createdDate: new Date(),
    };
    this.visits.set(id, visit);
    return visit;
  }

  /** تسجيل نتائج الزيارة */
  async recordVisitResults(visitId, data) {
    const visit = this.visits.get(visitId);
    if (!visit) throw new Error('الزيارة غير موجودة');
    visit.status = 'مكتملة';
    visit.actualDuration = data.actualDuration || visit.estimatedDuration;
    visit.results = {
      servicesProvided: data.servicesProvided || [],
      patientCondition: data.patientCondition || 'مستقر',
      exercisesPerformed: data.exercisesPerformed || [],
      performance: {
        compliance: data.compliance || 0,
        improvement: data.improvement || 0,
        independence: data.independence || 0,
      },
      familyInvolvement: data.familyInvolvement || 0,
      caregiverFeedback: data.caregiverFeedback || '',
      nextVisitRecommendation: data.nextVisitDate || null,
    };
    visit.completedDate = new Date();
    this.visits.set(visitId, visit);
    return visit;
  }

  /** طلب تعديلات منزلية */
  async requestModification(beneficiaryId, data) {
    const id = `HOME-MOD-${++this.counter.modify}`;
    const modification = {
      id,
      beneficiaryId,
      assessmentId: data.assessmentId,
      modifications: data.modifications || [],
      priority: data.priority || 'متوسط',
      estimatedCost: data.estimatedCost || 0,
      fundingSource: data.fundingSource || 'غير محدد',
      status: 'قيد_المراجعة',
      requestedBy: data.therapistId,
      date: new Date(),
    };
    this.homeModifications.set(id, modification);
    return modification;
  }

  /** إنشاء برنامج تأهيل منزلي */
  async createHomeProgram(beneficiaryId, data) {
    const id = `HOME-PROG-${++this.counter.program}`;
    const program = {
      id,
      beneficiaryId,
      exercises: data.exercises || [],
      frequency: data.frequency || 'يومي',
      goals: data.goals || [],
      caregiverInstructions: data.caregiverInstructions || [],
      safetyPrecautions: data.safetyPrecautions || [],
      equipmentNeeded: data.equipmentNeeded || [],
      reviewDate: data.reviewDate || null,
      createdBy: data.therapistId,
      date: new Date(),
    };
    this.homePrograms.set(id, program);
    return program;
  }

  /** تقرير التأهيل المنزلي */
  async getHomeRehabReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const visits = [...this.visits.values()].filter(v => v.beneficiaryId === beneficiaryId);
    const mods = [...this.homeModifications.values()].filter(
      m => m.beneficiaryId === beneficiaryId
    );
    const programs = [...this.homePrograms.values()].filter(p => p.beneficiaryId === beneficiaryId);
    const completed = visits.filter(v => v.status === 'مكتملة');
    return {
      beneficiaryId,
      totalAssessments: assessments.length,
      totalVisits: visits.length,
      completedVisits: completed.length,
      pendingVisits: visits.filter(v => v.status === 'مجدولة').length,
      modifications: mods.length,
      activePrograms: programs.length,
      latestAssessment: assessments[assessments.length - 1] || null,
      overallProgress:
        completed.length > 0
          ? Math.round(
              completed.reduce((s, v) => {
                const p = v.results?.performance || {};
                return s + ((p.compliance || 0) + (p.improvement || 0) + (p.independence || 0)) / 3;
              }, 0) / completed.length
            )
          : 0,
      reportDate: new Date(),
    };
  }

  _calculateSafetyScore(data) {
    let score = 100;
    if (!data.entranceAccessible) score -= 15;
    if (!data.bathroomAccessible) score -= 20;
    if (!data.kitchenAccessible) score -= 15;
    if (!data.bedroomAccessible) score -= 15;
    if ((data.hazards || []).length > 0) score -= data.hazards.length * 5;
    return Math.max(0, score);
  }

  _getModificationRecommendations(data) {
    const recs = [];
    if (!data.entranceAccessible) recs.push('تركيب منحدر عند المدخل');
    if (!data.bathroomAccessible) recs.push('تعديل الحمام (مقابض، كرسي استحمام)');
    if (!data.kitchenAccessible) recs.push('تعديل ارتفاعات المطبخ');
    if ((data.corridorsWidth || 0) < 90) recs.push('توسيع الممرات');
    return recs;
  }
}

module.exports = { HomeBasedRehabService };
