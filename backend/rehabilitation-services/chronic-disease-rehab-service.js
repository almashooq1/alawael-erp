'use strict';

/**
 * خدمة تأهيل الأمراض المزمنة
 * Chronic Disease Rehabilitation Service
 *
 * برامج تأهيل للأمراض المزمنة المصاحبة للإعاقة مثل السكري
 * وأمراض القلب والجهاز التنفسي والتهاب المفاصل
 */

class ChronicDiseaseRehabService {
  constructor() {
    this.assessments = new Map();
    this.programs = new Map();
    this.sessions = new Map();
    this.vitals = new Map();
    this.counter = { assess: 0, program: 0, session: 0, vital: 0 };
  }

  /** تقييم الأمراض المزمنة */
  async assessChronic(beneficiaryId, data) {
    const id = `CHRON-ASSESS-${++this.counter.assess}`;
    const assessment = {
      id,
      beneficiaryId,
      conditions: data.conditions || [],
      medications: data.medications || [],
      functionalLimitations: data.functionalLimitations || [],
      painLevel: data.painLevel || 0,
      fatigueLevel: data.fatigueLevel || 0,
      riskFactors: data.riskFactors || [],
      labResults: data.labResults || {},
      qualityOfLife: {
        physical: data.physicalQoL || 0,
        emotional: data.emotionalQoL || 0,
        social: data.socialQoL || 0,
      },
      assessedBy: data.physicianId,
      date: new Date(),
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  /** إنشاء برنامج تأهيلي */
  async createProgram(beneficiaryId, data) {
    const id = `CHRON-PROG-${++this.counter.program}`;
    const program = {
      id,
      beneficiaryId,
      assessmentId: data.assessmentId,
      conditionFocus: data.conditionFocus || 'عام',
      goals: data.goals || [],
      exercises: data.exercises || [],
      dietaryPlan: data.dietaryPlan || null,
      medicationSchedule: data.medicationSchedule || [],
      frequency: data.frequency || 'أسبوعي',
      duration: data.durationWeeks || 12,
      restrictions: data.restrictions || [],
      status: 'نشط',
      createdBy: data.physicianId,
      date: new Date(),
    };
    this.programs.set(id, program);
    return program;
  }

  /** تسجيل جلسة تأهيلية */
  async recordSession(beneficiaryId, data) {
    const id = `CHRON-SESS-${++this.counter.session}`;
    const session = {
      id,
      beneficiaryId,
      programId: data.programId,
      type: data.type || 'تمرين',
      exercisesCompleted: data.exercisesCompleted || [],
      performance: {
        endurance: data.endurance || 0,
        strength: data.strength || 0,
        flexibility: data.flexibility || 0,
        compliance: data.compliance || 0,
      },
      vitalsBefore: data.vitalsBefore || {},
      vitalsAfter: data.vitalsAfter || {},
      painLevel: data.painLevel || 0,
      duration: data.duration || 45,
      notes: data.notes || '',
      therapistId: data.therapistId,
      date: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  /** تسجيل مؤشرات حيوية */
  async recordVitals(beneficiaryId, data) {
    const id = `CHRON-VIT-${++this.counter.vital}`;
    const record = {
      id,
      beneficiaryId,
      bloodPressure: data.bloodPressure || null,
      heartRate: data.heartRate || null,
      bloodSugar: data.bloodSugar || null,
      oxygenSaturation: data.oxygenSaturation || null,
      weight: data.weight || null,
      temperature: data.temperature || null,
      notes: data.notes || '',
      recordedBy: data.nurseId,
      date: new Date(),
    };
    this.vitals.set(id, record);
    return record;
  }

  /** تقرير تأهيل الأمراض المزمنة */
  async getChronicReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const programs = [...this.programs.values()].filter(p => p.beneficiaryId === beneficiaryId);
    const sessions = [...this.sessions.values()].filter(s => s.beneficiaryId === beneficiaryId);
    const vitals = [...this.vitals.values()].filter(v => v.beneficiaryId === beneficiaryId);
    return {
      beneficiaryId,
      totalAssessments: assessments.length,
      activePrograms: programs.filter(p => p.status === 'نشط').length,
      totalSessions: sessions.length,
      vitalRecords: vitals.length,
      latestVitals: vitals[vitals.length - 1] || null,
      overallProgress:
        sessions.length > 0
          ? Math.round(
              sessions.reduce(
                (s, t) =>
                  s +
                  (t.performance.endurance +
                    t.performance.strength +
                    t.performance.flexibility +
                    t.performance.compliance) /
                    4,
                0
              ) / sessions.length
            )
          : 0,
      reportDate: new Date(),
    };
  }
}

module.exports = { ChronicDiseaseRehabService };
