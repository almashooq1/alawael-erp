/* eslint-disable no-unused-vars */
/**
 * Volunteer Management Service for Disability Rehabilitation
 * خدمة إدارة المتطوعين لتأهيل ذوي الإعاقة
 */

class VolunteerService {
  constructor() {
    this.volunteers = new Map();
    this.opportunities = new Map();
    this.assignments = new Map();
    this.hours = new Map();
  }

  // ==========================================
  // إدارة المتطوعين
  // ==========================================
  async registerVolunteer(volunteerData) {
    const volunteer = {
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'pending', // pending, active, inactive, suspended

      personalInfo: {
        name: volunteerData.name,
        nationalId: volunteerData.nationalId,
        phone: volunteerData.phone,
        email: volunteerData.email,
        address: volunteerData.address,
        dateOfBirth: volunteerData.dateOfBirth,
      },

      skills: {
        languages: volunteerData.languages || [],
        professional: volunteerData.professionalSkills || [],
        disabilityRelated: volunteerData.disabilitySkills || [],
        certifications: volunteerData.certifications || [],
      },

      availability: {
        days: volunteerData.availableDays || [],
        times: volunteerData.availableTimes || [],
        hoursPerWeek: volunteerData.hoursPerWeek || 4,
        startDate: volunteerData.startDate,
        endDate: volunteerData.endDate,
        flexibleSchedule: volunteerData.flexible || false,
      },

      preferences: {
        workTypes: volunteerData.preferredWorkTypes || [],
        locations: volunteerData.preferredLocations || [],
        disabilityTypes: volunteerData.preferredDisabilityTypes || [],
        ageGroups: volunteerData.preferredAgeGroups || [],
      },

      background: {
        checked: false,
        checkDate: null,
        cleared: false,
      },

      training: {
        required: [],
        completed: [],
        inProgress: [],
      },

      assignments: [],
      totalHours: 0,
      rating: 0,
      feedback: [],
    };

    this.volunteers.set(volunteer.id, volunteer);
    return volunteer;
  }

  async runBackgroundCheck(volunteerId) {
    const volunteer = this.volunteers.get(volunteerId);
    if (!volunteer) throw new Error('Volunteer not found');

    // محاكاة فحص الخلفية
    volunteer.background = {
      checked: true,
      checkDate: new Date(),
      cleared: true,
      notes: 'تم اجتياز فحص الخلفية',
    };

    return volunteer.background;
  }

  async assignRequiredTraining(volunteerId) {
    const volunteer = this.volunteers.get(volunteerId);
    if (!volunteer) throw new Error('Volunteer not found');

    const requiredTraining = [
      {
        id: 'disability_awareness',
        name: 'التوعية بالإعاقة',
        duration: '4 ساعات',
        mandatory: true,
      },
      { id: 'communication_skills', name: 'مهارات التواصل', duration: '3 ساعات', mandatory: true },
      {
        id: 'safety_first_aid',
        name: 'السلامة والإسعافات الأولية',
        duration: '6 ساعات',
        mandatory: true,
      },
      { id: 'confidentiality', name: 'السرية والخصوصية', duration: '2 ساعات', mandatory: true },
      { id: 'child_protection', name: 'حماية الأطفال', duration: '3 ساعات', mandatory: true },
    ];

    volunteer.training.required = requiredTraining;
    volunteer.training.inProgress = requiredTraining.map(t => ({ ...t, startedAt: new Date() }));

    return volunteer.training;
  }

  async completeTraining(volunteerId, trainingId) {
    const volunteer = this.volunteers.get(volunteerId);
    if (!volunteer) throw new Error('Volunteer not found');

    const training = volunteer.training.inProgress.find(t => t.id === trainingId);
    if (training) {
      training.completedAt = new Date();
      volunteer.training.completed.push(training);
      volunteer.training.inProgress = volunteer.training.inProgress.filter(
        t => t.id !== trainingId
      );
    }

    // التحقق من إكمال جميع التدريبات
    if (
      volunteer.training.inProgress.length === 0 &&
      volunteer.training.completed.length === volunteer.training.required.length
    ) {
      volunteer.status = 'active';
    }

    return volunteer.training;
  }

  // ==========================================
  // فرص التطوع
  // ==========================================
  async createOpportunity(opportunityData) {
    const opportunity = {
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'open', // open, filled, closed

      title: opportunityData.title,
      description: opportunityData.description,

      center: {
        id: opportunityData.centerId,
        name: opportunityData.centerName,
      },

      requirements: {
        skills: opportunityData.requiredSkills || [],
        training: opportunityData.requiredTraining || [],
        experience: opportunityData.requiredExperience || 'لا يوجد',
        languages: opportunityData.requiredLanguages || [],
        ageRange: opportunityData.ageRange || { min: 18, max: 65 },
      },

      details: {
        type: opportunityData.type, // direct_support, administrative, events, mentoring
        location: opportunityData.location,
        schedule: opportunityData.schedule,
        duration: opportunityData.duration,
        hoursPerWeek: opportunityData.hoursPerWeek,
        startDate: opportunityData.startDate,
        endDate: opportunityData.endDate,
      },

      targetBeneficiaries: {
        disabilityTypes: opportunityData.disabilityTypes || [],
        ageGroups: opportunityData.ageGroups || [],
        maxBeneficiaries: opportunityData.maxBeneficiaries || 10,
      },

      volunteersNeeded: opportunityData.volunteersNeeded || 1,
      volunteersAssigned: [],
      applicants: [],

      supervisor: {
        id: opportunityData.supervisorId,
        name: opportunityData.supervisorName,
      },
    };

    this.opportunities.set(opportunity.id, opportunity);
    return opportunity;
  }

  getOpportunityTypes() {
    return {
      directSupport: {
        id: 'direct_support',
        name: 'الدعم المباشر',
        nameEn: 'Direct Support',
        description: 'العمل المباشر مع المستفيدين',
        examples: ['مرافقة', 'مساعدة في الأنشطة', 'دعم تعليمي'],
      },
      administrative: {
        id: 'administrative',
        name: 'العمل الإداري',
        nameEn: 'Administrative Work',
        description: 'مهام مكتبية ودعم إداري',
        examples: ['إدخال بيانات', 'تنظيم الملفات', 'الرد على الهواتف'],
      },
      events: {
        id: 'events',
        name: 'الفعاليات',
        nameEn: 'Events & Activities',
        description: 'المشاركة في تنظيم الفعاليات',
        examples: ['المهرجانات', 'الورش', 'الرحلات'],
      },
      mentoring: {
        id: 'mentoring',
        name: 'الإرشاد والتوجيه',
        nameEn: 'Mentoring',
        description: 'تقديم الإرشاد للمستفيدين',
        examples: ['توجيه مهني', 'دعم نفسي', 'نصائح حياتية'],
      },
      transportation: {
        id: 'transportation',
        name: 'النقل والتوصيل',
        nameEn: 'Transportation',
        description: 'توصيل المستفيدين',
        examples: ['توصيل للمراكز', 'توصيل للفعاليات'],
      },
      specialSkills: {
        id: 'special_skills',
        name: 'مهارات خاصة',
        nameEn: 'Special Skills',
        description: 'استخدام مهارات متخصصة',
        examples: ['ترجمة لغة إشارة', 'علاج طبيعي', 'فنون وإبداع'],
      },
    };
  }

  // ==========================================
  // المطابقة والتعيين
  // ==========================================
  async matchVolunteerToOpportunity(volunteerId, opportunityId) {
    const volunteer = this.volunteers.get(volunteerId);
    const opportunity = this.opportunities.get(opportunityId);

    if (!volunteer || !opportunity) throw new Error('Not found');

    const matchScore = this._calculateMatchScore(volunteer, opportunity);

    return {
      volunteerId,
      opportunityId,
      score: matchScore,
      matchedSkills: this._getMatchedSkills(volunteer, opportunity),
      gaps: this._identifyGaps(volunteer, opportunity),
      recommendation:
        matchScore >= 70 ? 'recommended' : matchScore >= 50 ? 'possible' : 'not_recommended',
    };
  }

  _calculateMatchScore(volunteer, opportunity) {
    let score = 0;

    // مهارات (30%)
    const skillMatch = this._getMatchedSkills(volunteer, opportunity).length;
    score += Math.min(30, skillMatch * 10);

    // التوفر (25%)
    if (this._checkAvailability(volunteer, opportunity)) score += 25;

    // الموقع (20%)
    if (volunteer.preferences.locations.includes(opportunity.details.location)) score += 20;

    // التدريب (15%)
    const hasTraining = opportunity.requirements.training.every(t =>
      volunteer.training.completed.some(vt => vt.id === t)
    );
    if (hasTraining) score += 15;

    // التفضيلات (10%)
    if (volunteer.preferences.workTypes.includes(opportunity.details.type)) score += 10;

    return score;
  }

  _getMatchedSkills(volunteer, opportunity) {
    return opportunity.requirements.skills.filter(
      skill =>
        volunteer.skills.professional.includes(skill) ||
        volunteer.skills.disabilityRelated.includes(skill)
    );
  }

  _identifyGaps(volunteer, opportunity) {
    return opportunity.requirements.skills.filter(
      skill =>
        !volunteer.skills.professional.includes(skill) &&
        !volunteer.skills.disabilityRelated.includes(skill)
    );
  }

  _checkAvailability(_volunteer, _opportunity) {
    // التحقق من توافق الأوقات
    return true; // تبسيط
  }

  async assignVolunteer(volunteerId, opportunityId) {
    const volunteer = this.volunteers.get(volunteerId);
    const opportunity = this.opportunities.get(opportunityId);

    if (!volunteer || !opportunity) throw new Error('Not found');
    if (volunteer.status !== 'active') throw new Error('Volunteer not active');
    if (opportunity.volunteersAssigned.length >= opportunity.volunteersNeeded) {
      throw new Error('Opportunity is full');
    }

    const assignment = {
      id: Date.now().toString(),
      volunteerId,
      opportunityId,
      assignedAt: new Date(),
      status: 'active',
      supervisor: opportunity.supervisor,
      schedule: this._createSchedule(volunteer, opportunity),
      hoursLogged: [],
      totalHours: 0,
      feedback: [],
    };

    volunteer.assignments.push(assignment.id);
    opportunity.volunteersAssigned.push({ volunteerId, assignedAt: new Date() });

    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  _createSchedule(volunteer, opportunity) {
    return {
      days: volunteer.availability.days,
      times: volunteer.availability.times,
      startDate: opportunity.details.startDate,
      endDate: opportunity.details.endDate,
      notes: 'جدول مبدئي - يُعدل حسب الحاجة',
    };
  }

  // ==========================================
  // تسجيل الساعات
  // ==========================================
  async logHours(assignmentId, hoursData) {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    const log = {
      id: Date.now().toString(),
      date: hoursData.date,
      hours: hoursData.hours,
      activities: hoursData.activities,
      notes: hoursData.notes,
      approved: false,
      approvedBy: null,
      approvedAt: null,
    };

    assignment.hoursLogged.push(log);
    return log;
  }

  async approveHours(assignmentId, logId, supervisorId) {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    const log = assignment.hoursLogged.find(l => l.id === logId);
    if (!log) throw new Error('Log not found');

    log.approved = true;
    log.approvedBy = supervisorId;
    log.approvedAt = new Date();

    // تحديث إجمالي الساعات
    assignment.totalHours = assignment.hoursLogged
      .filter(l => l.approved)
      .reduce((sum, l) => sum + l.hours, 0);

    // تحديث ساعات المتطوع
    const volunteer = this.volunteers.get(assignment.volunteerId);
    if (volunteer) {
      volunteer.totalHours = Array.from(this.assignments.values())
        .filter(a => a.volunteerId === volunteer.id)
        .reduce((sum, a) => sum + a.totalHours, 0);
    }

    return log;
  }

  // ==========================================
  // التقارير
  // ==========================================
  async generateVolunteerReport(period = 'monthly') {
    const volunteers = Array.from(this.volunteers.values());
    const opportunities = Array.from(this.opportunities.values());
    const _assignments = Array.from(this.assignments.values());

    return {
      period,
      generatedAt: new Date(),

      summary: {
        totalVolunteers: volunteers.length,
        activeVolunteers: volunteers.filter(v => v.status === 'active').length,
        pendingVolunteers: volunteers.filter(v => v.status === 'pending').length,
        totalHoursThisPeriod: volunteers.reduce((sum, v) => sum + v.totalHours, 0),
        totalOpportunities: opportunities.length,
        openOpportunities: opportunities.filter(o => o.status === 'open').length,
      },

      byType: this._groupVolunteersByType(volunteers),
      byLocation: this._groupVolunteersByLocation(volunteers),

      topPerformers: volunteers
        .filter(v => v.totalHours > 0)
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 10)
        .map(v => ({ name: v.personalInfo.name, hours: v.totalHours, rating: v.rating })),

      needsAttention: {
        pendingBackgroundCheck: volunteers.filter(v => !v.background.checked).length,
        pendingTraining: volunteers.filter(v => v.training.inProgress.length > 0).length,
        lowActivity: volunteers.filter(v => v.status === 'active' && v.totalHours === 0).length,
      },

      recommendations: [
        'زيادة جهود استقطاب المتطوعين',
        'تنظيم دورات تدريبية إضافية',
        'تحسين نظام مكافآت المتطوعين',
      ],
    };
  }

  _groupVolunteersByType(volunteers) {
    const types = {};
    for (const v of volunteers) {
      for (const type of v.preferences.workTypes) {
        types[type] = (types[type] || 0) + 1;
      }
    }
    return types;
  }

  _groupVolunteersByLocation(volunteers) {
    const locations = {};
    for (const v of volunteers) {
      for (const loc of v.preferences.locations) {
        locations[loc] = (locations[loc] || 0) + 1;
      }
    }
    return locations;
  }

  // ==========================================
  // نظام المكافآت
  // ==========================================
  getRewardLevels() {
    return [
      { level: 'bronze', name: 'البرونزي', minHours: 0, maxHours: 49, badge: '🥉' },
      { level: 'silver', name: 'الفضي', minHours: 50, maxHours: 99, badge: '🥈' },
      { level: 'gold', name: 'الذهبي', minHours: 100, maxHours: 199, badge: '🥇' },
      { level: 'platinum', name: 'البلاتيني', minHours: 200, maxHours: 499, badge: '💎' },
      { level: 'diamond', name: 'الماسي', minHours: 500, maxHours: Infinity, badge: '👑' },
    ];
  }

  getVolunteerLevel(totalHours) {
    const levels = this.getRewardLevels();
    return levels.find(l => totalHours >= l.minHours && totalHours <= l.maxHours) || levels[0];
  }
}

module.exports = { VolunteerService };
