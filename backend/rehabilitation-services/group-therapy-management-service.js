'use strict';

/**
 * خدمة إدارة العلاج الجماعي
 * Group Therapy Management Service
 *
 * إنشاء وإدارة مجموعات العلاج وجدولة الجلسات الجماعية
 * ومتابعة تقدم المشاركين والتفاعل بين الأعضاء
 */

class GroupTherapyManagementService {
  constructor() {
    this.groups = new Map();
    this.sessions = new Map();
    this.enrollments = new Map();
    this.interactions = new Map();
    this.counter = { group: 0, session: 0, enroll: 0, interact: 0 };
  }

  /** إنشاء مجموعة علاجية */
  async createGroup(data) {
    const id = `GRP-${++this.counter.group}`;
    const group = {
      id,
      name: data.name || 'مجموعة علاجية',
      type: data.type || 'دعم_نفسي',
      therapyFocus: data.therapyFocus || 'عام',
      maxMembers: data.maxMembers || 10,
      currentMembers: 0,
      ageRange: data.ageRange || { min: 0, max: 100 },
      schedule: {
        day: data.day || 'الأحد',
        time: data.time || '10:00',
        frequency: data.frequency || 'أسبوعي',
        durationMinutes: data.durationMinutes || 90,
      },
      facilitator: data.facilitatorId,
      coFacilitator: data.coFacilitatorId || null,
      goals: data.goals || [],
      status: 'نشطة',
      createdDate: new Date(),
    };
    this.groups.set(id, group);
    return group;
  }

  /** تسجيل مستفيد في مجموعة */
  async enrollMember(groupId, data) {
    const id = `GRP-ENR-${++this.counter.enroll}`;
    const group = this.groups.get(groupId);
    if (group && group.currentMembers >= group.maxMembers) {
      throw new Error('المجموعة مكتملة العدد');
    }
    const enrollment = {
      id,
      groupId,
      beneficiaryId: data.beneficiaryId,
      enrollmentDate: new Date(),
      goals: data.individualGoals || [],
      status: 'نشط',
      attendance: 0,
      totalSessions: 0,
    };
    this.enrollments.set(id, enrollment);
    if (group) {
      group.currentMembers++;
      this.groups.set(groupId, group);
    }
    return enrollment;
  }

  /** تسجيل جلسة جماعية */
  async recordGroupSession(groupId, data) {
    const id = `GRP-SESS-${++this.counter.session}`;
    const session = {
      id,
      groupId,
      sessionNumber: data.sessionNumber || 1,
      topic: data.topic || '',
      activities: data.activities || [],
      attendees: data.attendees || [],
      absentees: data.absentees || [],
      groupDynamics: {
        participation: data.participation || 0,
        cohesion: data.cohesion || 0,
        communication: data.communication || 0,
        support: data.support || 0,
      },
      outcomes: data.outcomes || [],
      duration: data.duration || 90,
      facilitatorNotes: data.notes || '',
      facilitatorId: data.facilitatorId,
      date: new Date(),
    };
    this.sessions.set(id, session);
    // Update enrollment attendance
    (data.attendees || []).forEach(bId => {
      const enrollment = [...this.enrollments.values()].find(
        e => e.groupId === groupId && e.beneficiaryId === bId
      );
      if (enrollment) {
        enrollment.attendance++;
        enrollment.totalSessions++;
        this.enrollments.set(enrollment.id, enrollment);
      }
    });
    return session;
  }

  /** تسجيل تفاعل بين الأعضاء */
  async recordInteraction(groupId, data) {
    const id = `GRP-INT-${++this.counter.interact}`;
    const interaction = {
      id,
      groupId,
      sessionId: data.sessionId,
      type: data.type || 'تعاوني',
      participants: data.participants || [],
      description: data.description || '',
      quality: data.quality || 'إيجابي',
      notes: data.notes || '',
      date: new Date(),
    };
    this.interactions.set(id, interaction);
    return interaction;
  }

  /** تقرير المجموعة */
  async getGroupReport(groupId) {
    const group = this.groups.get(groupId) || {};
    const sessions = [...this.sessions.values()].filter(s => s.groupId === groupId);
    const enrollments = [...this.enrollments.values()].filter(e => e.groupId === groupId);
    const interactions = [...this.interactions.values()].filter(i => i.groupId === groupId);
    return {
      group,
      totalSessions: sessions.length,
      totalMembers: enrollments.length,
      activeMembers: enrollments.filter(e => e.status === 'نشط').length,
      totalInteractions: interactions.length,
      avgAttendance:
        enrollments.length > 0
          ? Math.round(
              enrollments.reduce(
                (s, e) => s + (e.totalSessions > 0 ? (e.attendance / e.totalSessions) * 100 : 0),
                0
              ) / enrollments.length
            )
          : 0,
      overallProgress:
        sessions.length > 0
          ? Math.round(
              sessions.reduce(
                (s, t) =>
                  s +
                  (t.groupDynamics.participation +
                    t.groupDynamics.cohesion +
                    t.groupDynamics.communication +
                    t.groupDynamics.support) /
                    4,
                0
              ) / sessions.length
            )
          : 0,
      reportDate: new Date(),
    };
  }
}

module.exports = { GroupTherapyManagementService };
