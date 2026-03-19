/* eslint-disable no-unused-vars */
/**
 * Case Management Service for Disability Rehabilitation
 * خدمة إدارة الحالات لتأهيل ذوي الإعاقة
 */

class CaseManagementService {
  constructor() {
    this.cases = new Map();
    this.workflows = new Map();
    this.transitions = new Map();
    this.followUps = new Map();
  }

  /**
   * إنشاء حالة جديدة
   */
  async createCase(beneficiaryId, caseData) {
    const case_ = {
      id: Date.now().toString(),
      beneficiaryId,
      createdAt: new Date(),
      status: 'new',
      priority: caseData.priority || 'medium',
      type: caseData.type, // physical, cognitive, developmental, multiple
      category: caseData.category, // initial, follow_up, transfer
      referral: {
        source: caseData.referralSource,
        reason: caseData.referralReason,
        date: caseData.referralDate,
        documents: caseData.referralDocuments || [],
      },
      assignedTeam: [],
      services: [],
      timeline: [],
      goals: [],
      notes: [],
      statusHistory: [
        {
          status: 'new',
          date: new Date(),
          changedBy: 'system',
          reason: 'إنشاء الحالة',
        },
      ],
    };

    this.cases.set(case_.id, case_);
    return case_;
  }

  /**
   * تعيين فريق متعدد التخصصات
   */
  async assignTeam(caseId, teamData) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    case_.assignedTeam = [
      {
        role: 'case_manager',
        name: teamData.caseManager,
        responsibilities: ['تنسيق الخدمات', 'متابعة التقدم', 'التواصل مع الأسرة'],
      },
      {
        role: 'physical_therapist',
        name: teamData.physicalTherapist,
        responsibilities: ['العلاج الطبيعي', 'تقييم الحركة'],
      },
      {
        role: 'occupational_therapist',
        name: teamData.occupationalTherapist,
        responsibilities: ['العلاج الوظيفي', 'تقييم المهارات اليومية'],
      },
      {
        role: 'speech_therapist',
        name: teamData.speechTherapist,
        responsibilities: ['علاج التخاطب', 'تقييم التواصل'],
      },
      {
        role: 'psychologist',
        name: teamData.psychologist,
        responsibilities: ['الدعم النفسي', 'التقييم السلوكي'],
      },
      {
        role: 'social_worker',
        name: teamData.socialWorker,
        responsibilities: ['الدعم الاجتماعي', 'ربط الأسرة بالخدمات'],
      },
    ];

    return case_;
  }

  /**
   * تحديث حالة الحالة
   */
  async updateStatus(caseId, newStatus, reason, changedBy) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const validStatuses = [
      'new',
      'under_assessment',
      'in_treatment',
      'on_hold',
      'completed',
      'closed',
    ];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('حالة غير صالحة');
    }

    case_.status = newStatus;
    case_.statusHistory.push({
      status: newStatus,
      date: new Date(),
      changedBy,
      reason,
    });

    return case_;
  }

  /**
   * إضافة هدف علاجي
   */
  async addGoal(caseId, goalData) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const goal = {
      id: Date.now().toString(),
      description: goalData.description,
      category: goalData.category, // short_term, medium_term, long_term
      targetDate: goalData.targetDate,
      metrics: goalData.metrics,
      milestones: [],
      progress: 0,
      status: 'active',
      createdAt: new Date(),
    };

    case_.goals.push(goal);
    return goal;
  }

  /**
   * تسجيل موعد متابعة
   */
  async scheduleFollowUp(caseId, followUpData) {
    const followUp = {
      id: Date.now().toString(),
      caseId,
      scheduledDate: followUpData.date,
      type: followUpData.type, // assessment, therapy, review, family_meeting
      participants: followUpData.participants,
      location: followUpData.location,
      agenda: followUpData.agenda,
      status: 'scheduled',
      reminders: [],
      notes: null,
    };

    this.followUps.set(followUp.id, followUp);
    return followUp;
  }

  /**
   * إضافة ملاحظة
   */
  async addNote(caseId, noteData) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    const note = {
      id: Date.now().toString(),
      content: noteData.content,
      author: noteData.author,
      role: noteData.role,
      timestamp: new Date(),
      type: noteData.type, // observation, intervention, recommendation
      isPrivate: noteData.isPrivate || false,
    };

    case_.notes.push(note);
    return note;
  }

  /**
   * تقرير حالة شامل
   */
  async generateCaseReport(caseId) {
    const case_ = this.cases.get(caseId);
    if (!case_) throw new Error('الحالة غير موجودة');

    return {
      caseInfo: {
        id: case_.id,
        beneficiaryId: case_.beneficiaryId,
        status: case_.status,
        priority: case_.priority,
        type: case_.type,
      },
      timeline: case_.statusHistory,
      team: case_.assignedTeam,
      goals: case_.goals.map(g => ({
        description: g.description,
        progress: g.progress,
        status: g.status,
      })),
      services: case_.services,
      recentNotes: case_.notes.slice(-5),
      followUps: Array.from(this.followUps.values()).filter(f => f.caseId === caseId),
      summary: {
        totalDays: Math.floor((new Date() - case_.createdAt) / (1000 * 60 * 60 * 24)),
        goalsCompleted: case_.goals.filter(g => g.status === 'completed').length,
        goalsInProgress: case_.goals.filter(g => g.status === 'active').length,
      },
    };
  }

  /**
   * لوحة تحكم إدارة الحالات
   */
  async getDashboardStats() {
    const allCases = Array.from(this.cases.values());

    return {
      total: allCases.length,
      byStatus: {
        new: allCases.filter(c => c.status === 'new').length,
        underAssessment: allCases.filter(c => c.status === 'under_assessment').length,
        inTreatment: allCases.filter(c => c.status === 'in_treatment').length,
        onHold: allCases.filter(c => c.status === 'on_hold').length,
        completed: allCases.filter(c => c.status === 'completed').length,
        closed: allCases.filter(c => c.status === 'closed').length,
      },
      byPriority: {
        high: allCases.filter(c => c.priority === 'high').length,
        medium: allCases.filter(c => c.priority === 'medium').length,
        low: allCases.filter(c => c.priority === 'low').length,
      },
      upcomingFollowUps: Array.from(this.followUps.values())
        .filter(f => new Date(f.scheduledDate) > new Date())
        .slice(0, 10),
    };
  }
}

module.exports = { CaseManagementService };
