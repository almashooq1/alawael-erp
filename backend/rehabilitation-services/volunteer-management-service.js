'use strict';

/**
 * خدمة إدارة التطوع والمتطوعين
 * Volunteer Management Service
 *
 * تسجيل المتطوعين وتوزيع المهام ومتابعة الساعات التطوعية
 * وتقييم أداء المتطوعين وإصدار شهادات التقدير
 */

class VolunteerManagementService {
  constructor() {
    this.volunteers = new Map();
    this.assignments = new Map();
    this.hours = new Map();
    this.evaluations = new Map();
    this.certificates = new Map();
    this.counter = { vol: 0, assign: 0, hours: 0, eval: 0, cert: 0 };
  }

  /** تسجيل متطوع */
  async registerVolunteer(data) {
    const id = `VOL-${++this.counter.vol}`;
    const volunteer = {
      id,
      name: data.name || '',
      nationalId: data.nationalId || '',
      phone: data.phone || '',
      email: data.email || '',
      skills: data.skills || [],
      availableDays: data.availableDays || [],
      availableHours: data.availableHours || [],
      languages: data.languages || ['العربية'],
      experience: data.experience || '',
      specialNeeds: data.specialNeeds || false,
      backgroundCheck: data.backgroundCheck || 'قيد_المراجعة',
      trainingCompleted: data.trainingCompleted || false,
      totalHours: 0,
      status: 'نشط',
      registrationDate: new Date(),
    };
    this.volunteers.set(id, volunteer);
    return volunteer;
  }

  /** تعيين مهمة لمتطوع */
  async assignTask(volunteerId, data) {
    const id = `VOL-TASK-${++this.counter.assign}`;
    const assignment = {
      id,
      volunteerId,
      beneficiaryId: data.beneficiaryId || null,
      taskType: data.taskType || 'مرافقة',
      description: data.description || '',
      location: data.location || 'المركز',
      scheduledDate: data.scheduledDate || new Date(),
      scheduledTime: data.scheduledTime || '09:00',
      estimatedHours: data.estimatedHours || 2,
      specialInstructions: data.specialInstructions || '',
      status: 'مجدولة',
      assignedBy: data.coordinatorId,
      date: new Date(),
    };
    this.assignments.set(id, assignment);
    return assignment;
  }

  /** تسجيل ساعات تطوعية */
  async logHours(volunteerId, data) {
    const id = `VOL-HRS-${++this.counter.hours}`;
    const record = {
      id,
      volunteerId,
      assignmentId: data.assignmentId || null,
      hoursWorked: data.hoursWorked || 0,
      taskDescription: data.taskDescription || '',
      beneficiaryFeedback: data.beneficiaryFeedback || '',
      supervisorApproval: false,
      date: data.date || new Date(),
    };
    this.hours.set(id, record);
    // Update volunteer total hours
    const vol = this.volunteers.get(volunteerId);
    if (vol) {
      vol.totalHours += record.hoursWorked;
      this.volunteers.set(volunteerId, vol);
    }
    return record;
  }

  /** تقييم متطوع */
  async evaluateVolunteer(volunteerId, data) {
    const id = `VOL-EVAL-${++this.counter.eval}`;
    const evaluation = {
      id,
      volunteerId,
      period: data.period || 'شهري',
      scores: {
        reliability: data.reliability || 0,
        communication: data.communication || 0,
        empathy: data.empathy || 0,
        initiative: data.initiative || 0,
        teamwork: data.teamwork || 0,
      },
      overallScore: Math.round(
        ((data.reliability || 0) +
          (data.communication || 0) +
          (data.empathy || 0) +
          (data.initiative || 0) +
          (data.teamwork || 0)) /
          5
      ),
      strengths: data.strengths || [],
      areasForImprovement: data.areasForImprovement || [],
      recommendation: data.recommendation || 'استمرار',
      evaluatedBy: data.supervisorId,
      date: new Date(),
    };
    this.evaluations.set(id, evaluation);
    return evaluation;
  }

  /** إصدار شهادة تقدير */
  async issueCertificate(volunteerId) {
    const vol = this.volunteers.get(volunteerId);
    if (!vol) throw new Error('المتطوع غير موجود');
    if (vol.totalHours < 20) throw new Error('لم يكمل الحد الأدنى من الساعات (20 ساعة)');
    const id = `VOL-CERT-${++this.counter.cert}`;
    const certificate = {
      id,
      volunteerId,
      volunteerName: vol.name,
      totalHours: vol.totalHours,
      certificateType: vol.totalHours >= 100 ? 'ذهبية' : vol.totalHours >= 50 ? 'فضية' : 'برونزية',
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
    this.certificates.set(id, certificate);
    return certificate;
  }

  /** تقرير المتطوعين */
  async getVolunteerReport(volunteerId) {
    const vol = this.volunteers.get(volunteerId);
    const assignments = [...this.assignments.values()].filter(a => a.volunteerId === volunteerId);
    const hours = [...this.hours.values()].filter(h => h.volunteerId === volunteerId);
    const evals = [...this.evaluations.values()].filter(e => e.volunteerId === volunteerId);
    const certs = [...this.certificates.values()].filter(c => c.volunteerId === volunteerId);
    return {
      volunteer: vol || null,
      totalAssignments: assignments.length,
      completedAssignments: assignments.filter(a => a.status === 'مكتملة').length,
      totalHoursLogged: hours.reduce((s, h) => s + h.hoursWorked, 0),
      evaluations: evals.length,
      latestEvaluation: evals[evals.length - 1] || null,
      certificates: certs,
      overallProgress:
        evals.length > 0
          ? Math.round(evals.reduce((s, e) => s + e.overallScore, 0) / evals.length)
          : 0,
      reportDate: new Date(),
    };
  }
}

module.exports = { VolunteerManagementService };
