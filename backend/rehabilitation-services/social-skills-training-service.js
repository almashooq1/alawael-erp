/**
 * خدمة تدريب المهارات الاجتماعية
 * Social Skills Training Service
 * Phase 8 — برامج تدريب المهارات الاجتماعية والتواصل الاجتماعي
 */

class SocialSkillsTrainingService {
  constructor() {
    this.assessments = new Map();
    this.programs = new Map();
    this.sessions = new Map();
    this.groups = new Map();
    this.goals = new Map();
  }

  /**
   * تقييم المهارات الاجتماعية
   */
  async assessSocialSkills(beneficiaryId, data) {
    const id = `sst-a-${Date.now()}`;
    const assessment = {
      id,
      beneficiaryId,
      date: new Date().toISOString(),
      ageGroup: data.ageGroup || 'بالغ', // طفل | مراهق | بالغ
      domains: {
        verbalCommunication: {
          initiatingConversation: data.initiating ?? 3,
          maintainingConversation: data.maintaining ?? 3,
          turntaking: data.turntaking ?? 3,
          topicManagement: data.topicMgmt ?? 3,
          assertiveness: data.assertiveness ?? 3,
        },
        nonverbalCommunication: {
          eyeContact: data.eyeContact ?? 3,
          facialExpressions: data.facialExpressions ?? 3,
          bodyLanguage: data.bodyLanguage ?? 3,
          personalSpace: data.personalSpace ?? 3,
          gestureUse: data.gestureUse ?? 3,
        },
        socialInteraction: {
          peerRelationships: data.peerRelations ?? 3,
          cooperativePlay: data.cooperativePlay ?? 3,
          sharingAndTurns: data.sharing ?? 3,
          conflictResolution: data.conflictResolution ?? 3,
          empathy: data.empathy ?? 3,
        },
        emotionalRegulation: {
          emotionRecognition: data.emotionRecognition ?? 3,
          emotionExpression: data.emotionExpression ?? 3,
          copingStrategies: data.copingStrategies ?? 3,
          frustrationTolerance: data.frustrationTolerance ?? 3,
          selfRegulation: data.selfRegulation ?? 3,
        },
        communitySkills: {
          greetings: data.greetings ?? 3,
          publicBehavior: data.publicBehavior ?? 3,
          safetyAwareness: data.safetyAwareness ?? 3,
          helpSeeking: data.helpSeeking ?? 3,
          transactionSkills: data.transactionSkills ?? 3,
        },
      },
      overallScore: 0, // سيُحسب
      strengthAreas: [],
      needAreas: [],
      recommendations: [],
      assessor: data.assessorId || 'system',
      status: 'مكتمل',
    };

    // حساب النتائج
    const domainScores = {};
    for (const [domain, skills] of Object.entries(assessment.domains)) {
      const vals = Object.values(skills);
      domainScores[domain] = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    }
    const allScores = Object.values(domainScores).map(Number);
    assessment.overallScore = (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
    assessment.strengthAreas = Object.entries(domainScores)
      .filter(([, s]) => Number(s) >= 4)
      .map(([d]) => d);
    assessment.needAreas = Object.entries(domainScores)
      .filter(([, s]) => Number(s) < 3)
      .map(([d]) => d);
    assessment.recommendations = this._generateSSRec(assessment);

    this.assessments.set(id, assessment);
    return assessment;
  }

  /**
   * إنشاء برنامج تدريب فردي
   */
  async createProgram(beneficiaryId, programData) {
    const id = `sst-p-${Date.now()}`;
    const program = {
      id,
      beneficiaryId,
      assessmentId: programData.assessmentId || null,
      createdAt: new Date().toISOString(),
      title: programData.title || 'برنامج تدريب المهارات الاجتماعية',
      format: programData.format || 'فردي', // فردي | جماعي | مختلط
      targetSkills: (programData.targetSkills || []).map((s, i) => ({
        id: `sst-sk-${id}-${i + 1}`,
        skill: s.skill,
        domain: s.domain || '',
        currentLevel: s.currentLevel || 1,
        targetLevel: s.targetLevel || 4,
        strategies: s.strategies || [],
        progress: 0,
      })),
      methodology: programData.methodology || [
        'نمذجة',
        'لعب أدوار',
        'تغذية راجعة فيديو',
        'ممارسة طبيعية',
      ],
      frequency: programData.frequency || 'مرتين/أسبوع',
      totalSessions: programData.totalSessions || 16,
      completedSessions: 0,
      generalizationStrategies: programData.generalization || [
        'تطبيق في المنزل',
        'تطبيق في المجتمع',
      ],
      parentInvolvement: programData.parentInvolvement || 'تدريب على التعزيز في المنزل',
      status: 'نشط',
    };
    this.programs.set(id, program);
    return program;
  }

  /**
   * تسجيل جلسة تدريب
   */
  async recordSession(beneficiaryId, sessionData) {
    const id = `sst-s-${Date.now()}`;
    const session = {
      id,
      beneficiaryId,
      programId: sessionData.programId || null,
      date: new Date().toISOString(),
      sessionNumber: sessionData.sessionNumber || 1,
      duration: sessionData.duration || 45,
      format: sessionData.format || 'فردي',
      targetSkills: sessionData.targetSkills || [],
      activities: (sessionData.activities || []).map(a => ({
        activity: a.activity || '',
        type: a.type || 'لعب أدوار', // نمذجة, لعب أدوار, مناقشة, تطبيق واقعي
        duration: a.duration || 10,
        performance: a.performance || 'جيد',
      })),
      skillRatings: sessionData.skillRatings || {},
      engagement: sessionData.engagement || 'جيد',
      generalization: sessionData.generalization || '',
      homework: sessionData.homework || '',
      parentReport: sessionData.parentReport || '',
      notes: sessionData.notes || '',
      therapistId: sessionData.therapistId || 'system',
    };
    this.sessions.set(id, session);

    // تحديث عدد الجلسات المكتملة
    if (sessionData.programId && this.programs.has(sessionData.programId)) {
      const prog = this.programs.get(sessionData.programId);
      prog.completedSessions = (prog.completedSessions || 0) + 1;
    }

    return session;
  }

  /**
   * إنشاء مجموعة تدريب اجتماعية
   */
  async createGroup(groupData) {
    const id = `sst-g-${Date.now()}`;
    const group = {
      id,
      name: groupData.name || 'مجموعة تدريب المهارات الاجتماعية',
      ageGroup: groupData.ageGroup || 'مراهق',
      targetSkills: groupData.targetSkills || [],
      maxParticipants: groupData.maxParticipants || 8,
      participants: groupData.participants || [],
      schedule: groupData.schedule || 'أسبوعياً',
      totalSessions: groupData.totalSessions || 12,
      completedSessions: 0,
      facilitators: groupData.facilitators || [],
      curriculum: (groupData.curriculum || []).map((w, i) => ({
        week: i + 1,
        topic: w.topic || '',
        objectives: w.objectives || [],
        activities: w.activities || [],
      })),
      createdAt: new Date().toISOString(),
      status: 'نشطة',
    };
    this.groups.set(id, group);
    return group;
  }

  /**
   * تقرير التقدم
   */
  async getProgressReport(beneficiaryId) {
    const assessments = [...this.assessments.values()].filter(
      a => a.beneficiaryId === beneficiaryId
    );
    const programs = [...this.programs.values()].filter(p => p.beneficiaryId === beneficiaryId);
    const sessions = [...this.sessions.values()].filter(s => s.beneficiaryId === beneficiaryId);

    return {
      beneficiaryId,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssessments: assessments.length,
        activePrograms: programs.filter(p => p.status === 'نشط').length,
        totalSessions: sessions.length,
        latestScore:
          assessments.length > 0 ? assessments[assessments.length - 1].overallScore : null,
        groupMemberships: [...this.groups.values()].filter(g =>
          g.participants.includes(beneficiaryId)
        ).length,
      },
      activePrograms: programs.filter(p => p.status === 'نشط'),
      recentSessions: sessions.slice(-5),
      latestAssessment: assessments.length > 0 ? assessments[assessments.length - 1] : null,
    };
  }

  _generateSSRec(assessment) {
    const recs = [];
    if (assessment.needAreas.includes('verbalCommunication'))
      recs.push('تدريب مكثف على مهارات المحادثة');
    if (assessment.needAreas.includes('emotionalRegulation')) recs.push('برنامج إدارة المشاعر');
    if (assessment.needAreas.includes('socialInteraction'))
      recs.push('مجموعة تدريب مهارات اجتماعية');
    if (assessment.needAreas.includes('nonverbalCommunication'))
      recs.push('تدريب على التواصل غير اللفظي بالفيديو');
    if (assessment.needAreas.includes('communitySkills')) recs.push('ممارسة مجتمعية ميدانية');
    if (assessment.needAreas.length === 0) recs.push('برنامج صيانة وتعزيز المهارات الحالية');
    recs.push('إعادة التقييم بعد 3 أشهر');
    return recs;
  }
}

module.exports = { SocialSkillsTrainingService };
