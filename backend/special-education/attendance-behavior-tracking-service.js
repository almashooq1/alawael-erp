/* eslint-disable no-unused-vars */
/**
 * Attendance and Behavior Tracking Service for Special Education
 * خدمة متابعة الحضور والسلوك للتربية الخاصة
 */

class AttendanceBehaviorTrackingService {
  constructor() {
    this.attendanceRecords = new Map();
    this.behaviorRecords = new Map();
    this.behaviorPlans = new Map();
    this.incidents = new Map();
    this.rewards = new Map();
  }

  // ==========================================
  // متابعة الحضور
  // ==========================================

  /**
   * تسجيل الحضور اليومي
   */
  async recordDailyAttendance(records) {
    const date = new Date().toISOString().split('T')[0];
    const dailyRecord = {
      id: Date.now().toString(),
      date,
      createdAt: new Date(),
      records: records.map(r => ({
        studentId: r.studentId,
        studentName: r.studentName,
        status: r.status, // present, absent, late, excused, early_dismissal
        arrivalTime: r.arrivalTime,
        departureTime: r.departureTime,
        notes: r.notes || '',
        recordedBy: r.recordedBy,
      })),
      summary: {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        excused: records.filter(r => r.status === 'excused').length,
        attendanceRate: 0,
      },
    };

    dailyRecord.summary.attendanceRate = Math.round(
      ((dailyRecord.summary.present + dailyRecord.summary.late) / dailyRecord.summary.total) * 100
    );

    this.attendanceRecords.set(dailyRecord.id, dailyRecord);
    return dailyRecord;
  }

  /**
   * الحصول على سجل حضور طالب
   */
  getStudentAttendanceHistory(studentId, startDate, endDate) {
    const records = Array.from(this.attendanceRecords.values());

    return records
      .filter(r => {
        const recordDate = new Date(r.date);
        return (
          r.records.some(rec => rec.studentId === studentId) &&
          (!startDate || recordDate >= new Date(startDate)) &&
          (!endDate || recordDate <= new Date(endDate))
        );
      })
      .map(r => {
        const studentRecord = r.records.find(rec => rec.studentId === studentId);
        return {
          date: r.date,
          ...studentRecord,
        };
      });
  }

  /**
   * حساب إحصائيات الحضور
   */
  calculateAttendanceStats(studentId, period = 'month') {
    const records = this.getStudentAttendanceHistory(studentId);

    const stats = {
      studentId,
      period,
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
      earlyDismissal: records.filter(r => r.status === 'early_dismissal').length,
      attendanceRate: 0,
      punctualityRate: 0,
      consecutiveAbsences: 0,
      pattern: [],
    };

    if (stats.total > 0) {
      stats.attendanceRate = Math.round(
        ((stats.present + stats.late + stats.excused) / stats.total) * 100
      );
      stats.punctualityRate = Math.round((stats.present / (stats.present + stats.late)) * 100);
    }

    // حساب الغياب المتتالي
    let consecutive = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].status === 'absent') {
        consecutive++;
      } else {
        break;
      }
    }
    stats.consecutiveAbsences = consecutive;

    // تحليل نمط الغياب
    stats.pattern = this._analyzeAttendancePattern(records);

    return stats;
  }

  _analyzeAttendancePattern(records) {
    const patterns = [];
    const dayOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // تحليل حسب يوم الأسبوع
    const dayStats = {};
    records.forEach(r => {
      const day = new Date(r.date).getDay();
      if (!dayStats[day]) {
        dayStats[day] = { total: 0, absent: 0 };
      }
      dayStats[day].total++;
      if (r.status === 'absent') dayStats[day].absent++;
    });

    Object.entries(dayStats).forEach(([day, stats]) => {
      if (stats.total > 0) {
        const absenceRate = (stats.absent / stats.total) * 100;
        if (absenceRate > 30) {
          patterns.push({
            type: 'day_pattern',
            day: dayOfWeek[day],
            absenceRate: Math.round(absenceRate),
            recommendation: `يرجى متابعة غياب الطالب يوم ${dayOfWeek[day]}`,
          });
        }
      }
    });

    return patterns;
  }

  // ==========================================
  // متابعة السلوك
  // ==========================================

  /**
   * تسجيل سلوك
   */
  async recordBehavior(behaviorData) {
    const behavior = {
      id: Date.now().toString(),
      createdAt: new Date(),

      student: {
        id: behaviorData.studentId,
        name: behaviorData.studentName,
      },

      type: behaviorData.type, // positive, negative, neutral
      category: behaviorData.category, // academic, social, behavioral, emotional

      behavior: behaviorData.behavior,
      description: behaviorData.description,

      context: {
        location: behaviorData.location,
        activity: behaviorData.activity,
        time: behaviorData.time,
        trigger: behaviorData.trigger,
      },

      intensity: behaviorData.intensity, // 1-5 scale
      duration: behaviorData.duration, // in minutes

      antecedent: behaviorData.antecedent, // ما الذي حدث قبل السلوك
      consequence: behaviorData.consequence, // ما الذي حدث بعد السلوك

      intervention: {
        used: behaviorData.interventionUsed || false,
        strategy: behaviorData.interventionStrategy,
        effective: behaviorData.interventionEffective,
      },

      witnesses: behaviorData.witnesses || [],

      recordedBy: {
        id: behaviorData.recordedById,
        name: behaviorData.recordedByName,
        role: behaviorData.recordedByRole,
      },

      parentNotified: false,
      followUpRequired: behaviorData.followUpRequired || false,
      followUpNotes: [],
    };

    // تحديد ما إذا كان السلوك يتطلب إبلاغ ولي الأمر
    if (behaviorData.type === 'negative' && behaviorData.intensity >= 4) {
      behavior.parentNotified = true;
    }

    this.behaviorRecords.set(behavior.id, behavior);
    return behavior;
  }

  /**
   * إنشاء خطة إدارة سلوك
   */
  async createBehaviorPlan(planData) {
    const plan = {
      id: Date.now().toString(),
      createdAt: new Date(),
      status: 'active',

      student: {
        id: planData.studentId,
        name: planData.studentName,
      },

      behaviors: {
        target: planData.targetBehaviors || [], // السلوكيات المستهدفة للتعديل
        replacement: planData.replacementBehaviors || [], // السلوكيات البديلة
        positive: planData.positiveBehaviors || [], // السلوكيات الإيجابية لتعزيزها
      },

      function: {
        hypothesis: planData.hypothesis, // فرضية وظيفة السلوك
        triggers: planData.triggers || [], // المحفزات
        consequences: planData.maintainingConsequences || [], // النتائج المعززة
      },

      strategies: {
        antecedent: planData.antecedentStrategies || [], // استراتيجيات قبل السلوك
        teaching: planData.teachingStrategies || [], // استراتيجيات التعليم
        consequence: planData.consequenceStrategies || [], // استراتيجيات بعد السلوك
        crisis: planData.crisisStrategies || [], // استراتيجيات الأزمات
      },

      supports: {
        environmental: planData.environmentalModifications || [],
        visualSupports: planData.visualSupports || [],
        sensory: planData.sensoryStrategies || [],
      },

      reinforcement: {
        primary: planData.primaryReinforcers || [],
        secondary: planData.secondaryReinforcers || [],
        schedule: planData.reinforcementSchedule || 'continuous', // continuous, intermittent
      },

      goals: {
        shortTerm: planData.shortTermGoals || [],
        longTerm: planData.longTermGoals || [],
      },

      team: {
        caseManager: planData.caseManager,
        teacher: planData.teacher,
        specialist: planData.specialist,
        parent: planData.parent,
      },

      reviewSchedule: planData.reviewSchedule || 'monthly',
      lastReview: new Date(),
      nextReview: this._calculateNextReview(planData.reviewSchedule || 'monthly'),

      progress: {
        dataPoints: [],
        summary: {},
      },

      signatures: {
        parent: { signed: false, date: null },
        caseManager: { signed: false, date: null },
        administrator: { signed: false, date: null },
      },
    };

    this.behaviorPlans.set(plan.id, plan);
    return plan;
  }

  _calculateNextReview(schedule) {
    const date = new Date();
    switch (schedule) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date;
  }

  /**
   * تسجيل incident (حادث سلوكي خطير)
   */
  async recordIncident(incidentData) {
    const incident = {
      id: Date.now().toString(),
      createdAt: new Date(),
      severity: incidentData.severity, // minor, moderate, major, critical

      student: {
        id: incidentData.studentId,
        name: incidentData.studentName,
      },

      type: incidentData.type, // physical, verbal, property, self_injury, elopement
      description: incidentData.description,

      location: incidentData.location,
      witnesses: incidentData.witnesses || [],

      injuries: {
        student: incidentData.studentInjury || false,
        staff: incidentData.staffInjury || false,
        peer: incidentData.peerInjury || false,
        details: incidentData.injuryDetails,
      },

      intervention: {
        immediate: incidentData.immediateIntervention,
        staffInvolved: incidentData.staffInvolved || [],
        duration: incidentData.interventionDuration,
        restraint: incidentData.restraintUsed || false,
        restraintType: incidentData.restraintType,
        seclusion: incidentData.seclusionUsed || false,
      },

      notifications: {
        parent: { notified: false, time: null, by: null },
        administration: { notified: false, time: null, by: null },
        authorities: { notified: false, time: null, by: null },
      },

      followUp: {
        required: true,
        actions: incidentData.followUpActions || [],
        timeline: incidentData.followUpTimeline,
        completed: false,
      },

      documentation: {
        report: null,
        attachments: [],
        reviewedBy: null,
      },
    };

    // تحديد الإجراءات المطلوبة حسب الخطورة
    if (incidentData.severity === 'major' || incidentData.severity === 'critical') {
      incident.followUp.actions.push(
        'إبلاغ الإدارة فوراً',
        'إبلاغ ولي الأمر',
        'ملء تقرير الحادث',
        'مراجعة خطة السلوك'
      );

      if (incidentData.severity === 'critical') {
        incident.followUp.actions.push(
          'عقد اجتماع طارئ للفريق',
          'تقييم السلامة',
          'مراجعة الإجراءات'
        );
      }
    }

    this.incidents.set(incident.id, incident);
    return incident;
  }

  // ==========================================
  // نظام المكافآت والتعزيز
  // ==========================================

  /**
   * منح مكافأة
   */
  async awardReward(rewardData) {
    const reward = {
      id: Date.now().toString(),
      awardedAt: new Date(),

      student: {
        id: rewardData.studentId,
        name: rewardData.studentName,
      },

      type: rewardData.type, // points, badge, privilege, tangible
      category: rewardData.category, // academic, behavioral, social, effort

      name: rewardData.name,
      description: rewardData.description,

      reason: rewardData.reason,
      relatedBehavior: rewardData.relatedBehavior,

      value: {
        points: rewardData.points || 0,
        badge: rewardData.badge || null,
        privilege: rewardData.privilege || null,
      },

      awardedBy: {
        id: rewardData.awardedById,
        name: rewardData.awardedByName,
        role: rewardData.awardedByRole,
      },

      redeemed: false,
      redeemedAt: null,
      redeemedFor: null,
    };

    this.rewards.set(reward.id, reward);
    return reward;
  }

  /**
   * الحصول على نقاط الطالب
   */
  getStudentPoints(studentId) {
    const rewards = Array.from(this.rewards.values()).filter(
      r => r.student.id === studentId && !r.redeemed
    );

    return {
      studentId,
      totalPoints: rewards.reduce((sum, r) => sum + r.value.points, 0),
      badges: rewards.filter(r => r.value.badge).map(r => r.value.badge),
      privileges: rewards.filter(r => r.value.privilege).map(r => r.value.privilege),
      recentRewards: rewards.slice(-10),
    };
  }

  /**
   * استبدال النقاط
   */
  async redeemPoints(studentId, redemptionData) {
    const points = this.getStudentPoints(studentId);

    if (points.totalPoints < redemptionData.requiredPoints) {
      throw new Error('نقاط غير كافية');
    }

    const redemption = {
      id: Date.now().toString(),
      redeemedAt: new Date(),

      student: {
        id: studentId,
      },

      item: redemptionData.item,
      description: redemptionData.description,
      pointsUsed: redemptionData.requiredPoints,

      status: 'pending', // pending, completed, cancelled

      processedBy: null,
      processedAt: null,
    };

    // خصم النقاط
    let pointsToDeduct = redemptionData.requiredPoints;
    const rewards = Array.from(this.rewards.values()).filter(
      r => r.student.id === studentId && !r.redeemed && r.value.points > 0
    );

    for (const reward of rewards) {
      if (pointsToDeduct <= 0) break;

      if (reward.value.points <= pointsToDeduct) {
        pointsToDeduct -= reward.value.points;
        reward.redeemed = true;
        reward.redeemedAt = new Date();
        reward.redeemedFor = redemption.id;
      } else {
        reward.value.points -= pointsToDeduct;
        pointsToDeduct = 0;
      }
    }

    return redemption;
  }

  // ==========================================
  // التقارير
  // ==========================================

  /**
   * تقرير سلوك طالب
   */
  generateStudentBehaviorReport(studentId, period = 'month') {
    const behaviors = Array.from(this.behaviorRecords.values()).filter(
      b => b.student.id === studentId
    );

    const incidents = Array.from(this.incidents.values()).filter(i => i.student.id === studentId);

    const rewards = Array.from(this.rewards.values()).filter(r => r.student.id === studentId);

    return {
      studentId,
      period,
      generatedAt: new Date(),

      summary: {
        totalBehaviors: behaviors.length,
        positive: behaviors.filter(b => b.type === 'positive').length,
        negative: behaviors.filter(b => b.type === 'negative').length,
        neutral: behaviors.filter(b => b.type === 'neutral').length,

        incidents: incidents.length,
        bySeverity: {
          minor: incidents.filter(i => i.severity === 'minor').length,
          moderate: incidents.filter(i => i.severity === 'moderate').length,
          major: incidents.filter(i => i.severity === 'major').length,
          critical: incidents.filter(i => i.severity === 'critical').length,
        },

        rewards: rewards.length,
        totalPoints: rewards.reduce((sum, r) => sum + r.value.points, 0),
      },

      trends: {
        behaviorByDay: this._groupByDay(behaviors),
        behaviorByCategory: this._groupByCategory(behaviors),
        commonTriggers: this._identifyTriggers(behaviors),
      },

      recommendations: this._generateRecommendations(behaviors, incidents),
    };
  }

  _groupByDay(behaviors) {
    const days = {};
    behaviors.forEach(b => {
      const day = new Date(b.createdAt).toLocaleDateString('ar-SA', { weekday: 'long' });
      days[day] = (days[day] || 0) + 1;
    });
    return days;
  }

  _groupByCategory(behaviors) {
    const categories = {};
    behaviors.forEach(b => {
      categories[b.category] = (categories[b.category] || 0) + 1;
    });
    return categories;
  }

  _identifyTriggers(behaviors) {
    const triggers = {};
    behaviors
      .filter(b => b.context.trigger)
      .forEach(b => {
        triggers[b.context.trigger] = (triggers[b.context.trigger] || 0) + 1;
      });

    return Object.entries(triggers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));
  }

  _generateRecommendations(behaviors, incidents) {
    const recommendations = [];

    // تحليل السلوكيات السلبية
    const negativeBehaviors = behaviors.filter(b => b.type === 'negative');
    if (negativeBehaviors.length > behaviors.length * 0.3) {
      recommendations.push({
        type: 'behavior',
        priority: 'high',
        recommendation: 'يُوصى بمراجعة خطة إدارة السلوك وإضافة استراتيجيات دعم إضافية',
      });
    }

    // تحليل الحوادث
    if (incidents.filter(i => i.severity === 'major' || i.severity === 'critical').length > 0) {
      recommendations.push({
        type: 'safety',
        priority: 'critical',
        recommendation: 'يُوصى بعقد اجتماع طارئ للفريق لمراجعة إجراءات السلامة',
      });
    }

    // توصيات التعزيز الإيجابي
    const positiveBehaviors = behaviors.filter(b => b.type === 'positive');
    if (positiveBehaviors.length > behaviors.length * 0.5) {
      recommendations.push({
        type: 'reinforcement',
        priority: 'medium',
        recommendation: 'يُوصى بمواصلة استراتيجيات التعزيز الإيجابي الحالية',
      });
    }

    return recommendations;
  }
}

module.exports = { AttendanceBehaviorTrackingService };
