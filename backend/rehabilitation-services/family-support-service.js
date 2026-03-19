/* eslint-disable no-unused-vars */
/**
 * Family Support Service for Disability Rehabilitation
 * خدمة دعم الأسرة لتأهيل ذوي الإعاقة
 */

class FamilySupportService {
  constructor() {
    this.families = new Map();
    this.counseling = new Map();
    this.training = new Map();
  }

  /**
   * تسجيل الأسرة
   */
  async registerFamily(beneficiaryId, familyData) {
    const family = {
      id: Date.now().toString(),
      beneficiaryId,
      members: familyData.members.map(member => ({
        id: Date.now().toString() + Math.random(),
        name: member.name,
        relationship: member.relationship, // father, mother, sibling, spouse
        age: member.age,
        phone: member.phone,
        email: member.email,
        isPrimaryCaregiver: member.isPrimaryCaregiver || false,
        role: member.role || 'support',
      })),
      primaryCaregiver: familyData.members.find(m => m.isPrimaryCaregiver)?.id,
      socioeconomicStatus: familyData.socioeconomicStatus,
      housingType: familyData.housingType, // owned, rented, government
      location: {
        city: familyData.city,
        district: familyData.district,
        address: familyData.address,
      },
      supportNeeds: [],
      engagementLevel: 'initial',
      createdAt: new Date(),
    };

    this.families.set(family.id, family);
    return family;
  }

  /**
   * تقييم احتياجات الأسرة
   */
  async assessFamilyNeeds(familyId) {
    const family = this.families.get(familyId);
    if (!family) throw new Error('الأسرة غير موجودة');

    const needs = {
      financial: {
        score: 0,
        needs: [],
        recommendations: [],
      },
      psychological: {
        score: 0,
        needs: [],
        recommendations: [],
      },
      educational: {
        score: 0,
        needs: [],
        recommendations: [],
      },
      social: {
        score: 0,
        needs: [],
        recommendations: [],
      },
      practical: {
        score: 0,
        needs: [],
        recommendations: [],
      },
    };

    // تحديد الاحتياجات المالية
    if (family.socioeconomicStatus === 'low') {
      needs.financial.needs.push('الدعم المالي');
      needs.financial.needs.push('التأمين الصحي');
      needs.financial.recommendations.push('ربط الأسرة بالضمان الاجتماعي');
    }

    // تحديد الاحتياجات النفسية
    const caregiver = family.members.find(m => m.isPrimaryCaregiver);
    if (caregiver) {
      needs.psychological.needs.push('الدعم النفسي لمقدم الرعاية');
      needs.psychological.recommendations.push('إدراج الأسرة في برنامج الدعم الأسري');
    }

    // تحديد الاحتياجات التعليمية
    needs.educational.needs.push('تدريب على رعاية ذوي الإعاقة');
    needs.educational.needs.push('التعريف بحقوق ذوي الإعاقة');
    needs.educational.recommendations.push('تسجيل الأسرة في ورش التدريب');

    family.supportNeeds = needs;
    return needs;
  }

  /**
   * جلسة إرشاد أسري
   */
  async scheduleCounseling(familyId, counselingData) {
    const session = {
      id: Date.now().toString(),
      familyId,
      type: counselingData.type, // individual, family, group
      topic: counselingData.topic,
      scheduledDate: counselingData.date,
      counselor: counselingData.counselor,
      duration: counselingData.duration || 60,
      location: counselingData.location || 'center',
      participants: counselingData.participants || [],
      status: 'scheduled',
      notes: null,
      followUp: null,
    };

    this.counseling.set(session.id, session);
    return session;
  }

  /**
   * تسجيل نتائج الجلسة
   */
  async recordCounselingSession(sessionId, results) {
    const session = this.counseling.get(sessionId);
    if (!session) throw new Error('الجلسة غير موجودة');

    session.status = 'completed';
    session.notes = results.notes;
    session.outcomes = results.outcomes;
    session.followUp = {
      required: results.requiresFollowUp,
      recommendedDate: results.followUpDate,
      topics: results.followUpTopics || [],
    };

    return session;
  }

  /**
   * برنامج تدريب الأسرة
   */
  async createFamilyTrainingProgram(familyId, programData) {
    const program = {
      id: Date.now().toString(),
      familyId,
      name: programData.name,
      description: programData.description,
      modules: [
        {
          id: 1,
          title: 'فهم الإعاقة',
          topics: ['تعريف الإعاقة', 'التأثير على الحياة اليومية', 'التحديات الشائعة'],
          duration: 3,
          completed: false,
        },
        {
          id: 2,
          title: 'مهارات الرعاية',
          topics: ['الرعاية اليومية', 'التعامل مع الطوارئ', 'النظافة الشخصية'],
          duration: 4,
          completed: false,
        },
        {
          id: 3,
          title: 'التواصل الفعال',
          topics: ['التواصل مع ذوي الإعاقة', 'التواصل مع الفريق الطبي', 'التواصل مع المجتمع'],
          duration: 3,
          completed: false,
        },
        {
          id: 4,
          title: 'الدعم النفسي',
          topics: ['التعامل مع الضغط', 'الاهتمام بالذات', 'بناء شبكة دعم'],
          duration: 3,
          completed: false,
        },
        {
          id: 5,
          title: 'الحقوق والموارد',
          topics: ['حقوق ذوي الإعاقة', 'الخدمات المتاحة', 'كيفية الحصول على الدعم'],
          duration: 2,
          completed: false,
        },
      ],
      startDate: new Date(),
      endDate: null,
      progress: 0,
      status: 'active',
    };

    this.training.set(program.id, program);
    return program;
  }

  /**
   * تحديث تقدم التدريب
   */
  async updateTrainingProgress(programId, moduleId, completed) {
    const program = this.training.get(programId);
    if (!program) throw new Error('البرنامج غير موجود');

    const module = program.modules.find(m => m.id === moduleId);
    if (module) {
      module.completed = completed;
    }

    // حساب التقدم الإجمالي
    const completedModules = program.modules.filter(m => m.completed).length;
    program.progress = (completedModules / program.modules.length) * 100;

    if (program.progress === 100) {
      program.status = 'completed';
      program.endDate = new Date();
    }

    return program;
  }

  /**
   * تقييم مشاركة الأسرة
   */
  async evaluateFamilyEngagement(familyId) {
    const family = this.families.get(familyId);
    if (!family) throw new Error('الأسرة غير موجودة');

    const sessions = Array.from(this.counseling.values()).filter(s => s.familyId === familyId);

    const programs = Array.from(this.training.values()).filter(p => p.familyId === familyId);

    const evaluation = {
      familyId,
      evaluationDate: new Date(),
      metrics: {
        sessionAttendance: {
          scheduled: sessions.length,
          attended: sessions.filter(s => s.status === 'completed').length,
          rate:
            sessions.length > 0
              ? (sessions.filter(s => s.status === 'completed').length / sessions.length) * 100
              : 0,
        },
        trainingProgress: {
          programsEnrolled: programs.length,
          programsCompleted: programs.filter(p => p.status === 'completed').length,
          averageProgress:
            programs.length > 0
              ? programs.reduce((sum, p) => sum + p.progress, 0) / programs.length
              : 0,
        },
        engagementLevel: 'moderate',
      },
      recommendations: [],
    };

    // تحديد مستوى المشاركة
    const avgScore =
      (evaluation.metrics.sessionAttendance.rate +
        evaluation.metrics.trainingProgress.averageProgress) /
      2;

    if (avgScore >= 80) {
      evaluation.metrics.engagementLevel = 'high';
      family.engagementLevel = 'high';
    } else if (avgScore >= 50) {
      evaluation.metrics.engagementLevel = 'moderate';
      family.engagementLevel = 'moderate';
    } else {
      evaluation.metrics.engagementLevel = 'low';
      family.engagementLevel = 'low';
      evaluation.recommendations.push('تحسين التواصل مع الأسرة');
      evaluation.recommendations.push('تقديم دعم إضافي');
    }

    return evaluation;
  }

  /**
   * الحصول على موارد الدعم
   */
  async getSupportResources(familyId) {
    const family = this.families.get(familyId);
    if (!family) throw new Error('الأسرة غير موجودة');

    return {
      financial: [
        { name: 'الضمان الاجتماعي', eligibility: true, contact: '9200' },
        { name: 'دعم ذوي الإعاقة', eligibility: true, contact: 'وزارة الموارد البشرية' },
        {
          name: 'التأمين الصحي',
          eligibility: family.socioeconomicStatus === 'low',
          contact: '966',
        },
      ],
      educational: [
        { name: 'ورش تدريب الأسرة', schedule: 'شهرياً', location: 'المركز' },
        { name: 'برامج التوعية', schedule: 'أسبوعياً', location: 'أونلاين' },
      ],
      psychological: [
        { name: 'الإرشاد الأسري', available: true, booking: 'حجز مسبق' },
        { name: 'مجموعات الدعم', available: true, schedule: 'أسبوعياً' },
      ],
      community: [
        { name: 'جمعيات ذوي الإعاقة', contact: 'معلومات محلية' },
        { name: 'برامج التطوع', contact: 'المركز' },
      ],
    };
  }
}

module.exports = { FamilySupportService };
