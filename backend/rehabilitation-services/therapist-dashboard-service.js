/**
 * 📈 لوحة تحكم المعالج — Therapist Performance Dashboard Service
 * الإصدار 6.0.0
 * يشمل: عبء العمل، نتائج المستفيدين، إحصائيات الأداء، معدل الحضور، تقييمات الرضا
 */

class TherapistDashboardService {
  constructor() {
    this.therapists = new Map();
    this.caseloads = new Map();
    this.performanceRecords = new Map();
    this.goals = new Map();
  }

  /* ─── تسجيل معالج ─── */
  async registerTherapist(therapistData) {
    const therapist = {
      id: therapistData.id || `thp-${Date.now()}`,
      name: therapistData.name,
      nameAr: therapistData.nameAr || therapistData.name,
      specializations: therapistData.specializations || [],
      certifications: therapistData.certifications || [],
      yearsOfExperience: therapistData.yearsOfExperience || 0,
      maxCaseload: therapistData.maxCaseload || 15,
      workingDays: therapistData.workingDays || [
        'الأحد',
        'الاثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
      ],
      workingHours: therapistData.workingHours || { start: '08:00', end: '16:00' },
      status: 'active',
      registeredAt: new Date(),
    };
    this.therapists.set(therapist.id, therapist);
    return therapist;
  }

  /* ─── إسناد مستفيد لمعالج ─── */
  async assignBeneficiary(therapistId, beneficiaryId, serviceType) {
    const therapist = this.therapists.get(therapistId);
    if (!therapist) return { success: false, error: 'المعالج غير مسجل' };

    const key = therapistId;
    const caseload = this.caseloads.get(key) || [];

    if (caseload.length >= therapist.maxCaseload) {
      return { success: false, error: 'بلغ الحد الأقصى لعدد المستفيدين' };
    }

    const existing = caseload.find(
      c => c.beneficiaryId === beneficiaryId && c.serviceType === serviceType
    );
    if (existing) return { success: false, error: 'المستفيد مُسند مسبقاً لهذه الخدمة' };

    caseload.push({
      beneficiaryId,
      serviceType,
      assignedAt: new Date(),
      status: 'active',
    });
    this.caseloads.set(key, caseload);
    return { success: true, currentCaseload: caseload.length, maxCaseload: therapist.maxCaseload };
  }

  /* ─── تسجيل أداء المعالج ─── */
  async recordPerformance(therapistId, performanceData) {
    const record = {
      id: `perf-${Date.now()}`,
      therapistId,
      period: performanceData.period || new Date().toISOString().slice(0, 7), // YYYY-MM
      metrics: {
        sessionsCompleted: performanceData.sessionsCompleted || 0,
        sessionsCancelled: performanceData.sessionsCancelled || 0,
        noShows: performanceData.noShows || 0,
        avgSessionDuration: performanceData.avgSessionDuration || 45,
        documentationCompleteness: performanceData.documentationCompleteness || 100,
        avgBeneficiaryProgress: performanceData.avgBeneficiaryProgress || 0,
        goalsAchieved: performanceData.goalsAchieved || 0,
        totalGoals: performanceData.totalGoals || 0,
        satisfactionScore: performanceData.satisfactionScore || 0,
        punctuality: performanceData.punctuality || 100,
      },
      observations: performanceData.observations || '',
      date: new Date(),
    };

    const key = `${therapistId}_performance`;
    const records = this.performanceRecords.get(key) || [];
    records.push(record);
    this.performanceRecords.set(key, records);
    return record;
  }

  /* ─── لوحة المعلومات الشاملة ─── */
  async getDashboard(therapistId) {
    const therapist = this.therapists.get(therapistId);
    if (!therapist) return { error: 'المعالج غير مسجل' };

    const caseload = this.caseloads.get(therapistId) || [];
    const activeCaseload = caseload.filter(c => c.status === 'active');
    const performanceRecords = this.performanceRecords.get(`${therapistId}_performance`) || [];
    const goals = this.goals.get(therapistId) || [];

    return {
      therapist: {
        id: therapist.id,
        name: therapist.nameAr,
        specializations: therapist.specializations,
        status: therapist.status,
      },
      caseload: {
        total: activeCaseload.length,
        max: therapist.maxCaseload,
        utilization: Math.round((activeCaseload.length / therapist.maxCaseload) * 100),
        byService: this._groupCaseloadByService(activeCaseload),
        beneficiaries: activeCaseload.map(c => ({
          beneficiaryId: c.beneficiaryId,
          serviceType: c.serviceType,
          since: c.assignedAt,
        })),
      },
      performance: this._calcPerformanceSummary(performanceRecords),
      goals: {
        total: goals.length,
        completed: goals.filter(g => g.status === 'completed').length,
        inProgress: goals.filter(g => g.status === 'in_progress').length,
        list: goals,
      },
      workload: this._calcWorkload(therapistId, activeCaseload),
      alerts: this._checkTherapistAlerts(therapist, activeCaseload, performanceRecords),
    };
  }

  /* ─── تقرير أداء الفريق ─── */
  async getTeamReport() {
    const therapists = Array.from(this.therapists.values()).filter(t => t.status === 'active');
    const teamData = therapists.map(t => {
      const caseload = (this.caseloads.get(t.id) || []).filter(c => c.status === 'active');
      const records = this.performanceRecords.get(`${t.id}_performance`) || [];
      const latest = records[records.length - 1];

      return {
        id: t.id,
        name: t.nameAr,
        specializations: t.specializations,
        caseloadCount: caseload.length,
        caseloadUtilization: Math.round((caseload.length / t.maxCaseload) * 100),
        avgSatisfaction: latest?.metrics?.satisfactionScore || 0,
        sessionsThisMonth: latest?.metrics?.sessionsCompleted || 0,
        goalsAchievementRate: latest?.metrics?.totalGoals
          ? Math.round((latest.metrics.goalsAchieved / latest.metrics.totalGoals) * 100)
          : 0,
      };
    });

    return {
      teamSize: therapists.length,
      totalActiveBeneficiaries: teamData.reduce((s, t) => s + t.caseloadCount, 0),
      avgCaseloadUtilization: teamData.length
        ? Math.round(teamData.reduce((s, t) => s + t.caseloadUtilization, 0) / teamData.length)
        : 0,
      avgSatisfaction: this._avg(teamData.map(t => t.avgSatisfaction)),
      therapists: teamData,
      topPerformers: teamData.sort((a, b) => b.avgSatisfaction - a.avgSatisfaction).slice(0, 5),
      overloaded: teamData.filter(t => t.caseloadUtilization > 90),
      underutilized: teamData.filter(t => t.caseloadUtilization < 40),
    };
  }

  /* ─── تحديد أهداف المعالج ─── */
  async setTherapistGoal(therapistId, goalData) {
    const goal = {
      id: `tg-${Date.now()}`,
      therapistId,
      title: goalData.title,
      description: goalData.description || '',
      target: goalData.target,
      current: goalData.current || 0,
      metric: goalData.metric, // sessions_count / satisfaction_score / goals_achieved / documentation_rate
      deadline: goalData.deadline,
      status: 'in_progress',
      createdAt: new Date(),
    };

    const goals = this.goals.get(therapistId) || [];
    goals.push(goal);
    this.goals.set(therapistId, goals);
    return goal;
  }

  /* ─── تحديث تقدم الهدف ─── */
  async updateGoalProgress(therapistId, goalId, progress) {
    const goals = this.goals.get(therapistId) || [];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return { success: false, error: 'الهدف غير موجود' };

    goal.current = progress;
    if (progress >= goal.target) goal.status = 'completed';
    goal.updatedAt = new Date();
    this.goals.set(therapistId, goals);
    return { success: true, goal };
  }

  /* ─── مساعدات ─── */
  _groupCaseloadByService(caseload) {
    const groups = {};
    caseload.forEach(c => {
      groups[c.serviceType] = (groups[c.serviceType] || 0) + 1;
    });
    return groups;
  }

  _calcPerformanceSummary(records) {
    if (records.length === 0) return { message: 'لا توجد سجلات أداء' };

    const latest = records[records.length - 1];
    const metrics = records.map(r => r.metrics);

    return {
      latest: latest.metrics,
      trends: {
        sessions: this._calcTrend(metrics.map(m => m.sessionsCompleted)),
        satisfaction: this._calcTrend(metrics.map(m => m.satisfactionScore)),
        beneficiaryProgress: this._calcTrend(metrics.map(m => m.avgBeneficiaryProgress)),
        documentation: this._calcTrend(metrics.map(m => m.documentationCompleteness)),
      },
      averages: {
        avgSessions: this._avg(metrics.map(m => m.sessionsCompleted)),
        avgSatisfaction: this._avg(metrics.map(m => m.satisfactionScore)),
        avgProgress: this._avg(metrics.map(m => m.avgBeneficiaryProgress)),
        avgPunctuality: this._avg(metrics.map(m => m.punctuality)),
      },
    };
  }

  _calcWorkload(therapistId, caseload) {
    const estimatedWeeklyHours = caseload.length * 1.5; // 1.5 ساعة لكل مستفيد
    const therapist = this.therapists.get(therapistId);
    const availableHours = therapist
      ? (therapist.workingDays?.length || 5) * this._calcDailyHours(therapist.workingHours)
      : 40;

    return {
      activeBeneficiaries: caseload.length,
      estimatedWeeklyHours: Math.round(estimatedWeeklyHours * 10) / 10,
      availableWeeklyHours: availableHours,
      utilization: Math.round((estimatedWeeklyHours / availableHours) * 100),
      status:
        estimatedWeeklyHours > availableHours * 0.9
          ? 'overloaded'
          : estimatedWeeklyHours > availableHours * 0.6
            ? 'optimal'
            : 'available',
    };
  }

  _calcDailyHours(workingHours) {
    if (!workingHours?.start || !workingHours?.end) return 8;
    const [sh, sm] = workingHours.start.split(':').map(Number);
    const [eh, em] = workingHours.end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  }

  _checkTherapistAlerts(therapist, caseload, records) {
    const alerts = [];
    if (caseload.length >= therapist.maxCaseload)
      alerts.push({ type: 'caseload_full', message: 'وصل عدد المستفيدين للحد الأقصى' });
    if (caseload.length > therapist.maxCaseload * 0.9)
      alerts.push({ type: 'caseload_near_full', message: 'اقترب عدد المستفيدين من الحد الأقصى' });
    if (records.length > 0) {
      const latest = records[records.length - 1];
      if ((latest.metrics?.documentationCompleteness || 100) < 80)
        alerts.push({ type: 'documentation', message: 'اكتمال التوثيق أقل من 80%' });
      if ((latest.metrics?.satisfactionScore || 100) < 60)
        alerts.push({ type: 'satisfaction', message: 'رضا المستفيدين أقل من 60%' });
    }
    return alerts;
  }

  _avg(arr) {
    const v = arr.filter(x => x != null && !isNaN(x));
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
  }
  _calcTrend(arr) {
    if (arr.length < 3) return 'insufficient_data';
    const f = this._avg(arr.slice(0, 3));
    const l = this._avg(arr.slice(-3));
    return l - f > 2 ? 'improving' : l - f < -2 ? 'declining' : 'stable';
  }
}

module.exports = { TherapistDashboardService };
