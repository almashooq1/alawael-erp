/**
 * Beneficiary360Service — خدمة شاشة المستفيد 360°
 *
 * تجمع البيانات من جميع الدومينات (8 domains) وتعيدها كلوحة تحكم موحدة
 * مقسّمة إلى Widgets مصممة حسب الدور الوظيفي.
 *
 * Widgets:
 *  1. summary        — الملخص التنفيذي
 *  2. journey        — مرحلة الرحلة الحالية والتقدم
 *  3. timeline       — الخط الزمني الطولي
 *  4. assessments    — آخر التقييمات والمقاييس
 *  5. goals          — الأهداف الذكية
 *  6. carePlan       — خطة الرعاية الحالية
 *  7. sessions       — الجلسات (قادمة + أخيرة)
 *  8. family         — بيانات الأسرة والتواصل
 *  9. alerts         — التنبيهات والمخاطر
 * 10. progress       — مؤشرات التقدم عبر الزمن
 *
 * @module domains/core/services/beneficiary360.service
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

class Beneficiary360Service {
  /**
   * جلب لوحة 360° كاملة
   *
   * @param {string} beneficiaryId
   * @param {Object} options
   * @param {string} [options.role] — الدور الوظيفي (يحدد أولوية الأقسام)
   * @param {string[]} [options.widgets] — قائمة widgets محددة (إن لم تُحدد تُعاد كلها)
   * @param {number} [options.timelineLimit=20]
   * @param {number} [options.sessionsLimit=10]
   * @returns {Object} dashboard data
   */
  async getDashboard(beneficiaryId, options = {}) {
    const { role, widgets, timelineLimit = 20, sessionsLimit = 10 } = options;

    // ── 1. Load beneficiary (required) ──────────────────────────────
    const Beneficiary = this._model('Beneficiary');
    const beneficiary = await Beneficiary.findById(beneficiaryId)
      .populate('currentEpisodeId')
      .lean({ virtuals: true });

    if (!beneficiary) {
      const err = new Error('المستفيد غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // ── 2. Determine which widgets to build ─────────────────────────
    const allWidgets = [
      'summary',
      'journey',
      'timeline',
      'assessments',
      'goals',
      'carePlan',
      'sessions',
      'family',
      'alerts',
      'progress',
    ];
    const requestedWidgets =
      widgets && widgets.length > 0 ? widgets.filter(w => allWidgets.includes(w)) : allWidgets;

    // ── 3. Build widgets in parallel ────────────────────────────────
    const dashboard = {
      beneficiaryId,
      generatedAt: new Date(),
      role: role || 'general',
    };

    const builders = {
      summary: () => this._buildSummary(beneficiary),
      journey: () => this._buildJourney(beneficiary),
      timeline: () =>
        this._buildTimeline(beneficiaryId, beneficiary.currentEpisodeId?._id, timelineLimit),
      assessments: () => this._buildAssessments(beneficiaryId, beneficiary.currentEpisodeId?._id),
      goals: () => this._buildGoals(beneficiaryId, beneficiary.currentEpisodeId?._id),
      carePlan: () => this._buildCarePlan(beneficiaryId, beneficiary.currentEpisodeId?._id),
      sessions: () =>
        this._buildSessions(beneficiaryId, beneficiary.currentEpisodeId?._id, sessionsLimit),
      family: () => this._buildFamily(beneficiary),
      alerts: () => this._buildAlerts(beneficiary),
      progress: () => this._buildProgress(beneficiaryId),
    };

    const results = await Promise.allSettled(
      requestedWidgets.map(async w => {
        const start = Date.now();
        const data = await builders[w]();
        return { widget: w, data, ms: Date.now() - start };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        dashboard[result.value.widget] = result.value.data;
      } else {
        logger.warn(`[360] Widget failed: ${result.reason?.message}`);
        // Return empty widget instead of failing the whole dashboard
      }
    }

    // ── 4. Role-based prioritization ────────────────────────────────
    dashboard._widgetPriority = this._getWidgetPriority(role);

    return dashboard;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Widget Builders
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Widget 1: الملخص التنفيذي
   */
  _buildSummary(b) {
    return {
      id: b._id,
      fileNumber: b.fileNumber || b.mrn,
      mrn: b.mrn,
      nationalId: b.nationalId,
      name:
        b.personalInfo?.fullNameAr ||
        `${b.personalInfo?.firstName?.ar || b.firstName || ''} ${b.personalInfo?.lastName?.ar || b.lastName || ''}`.trim(),
      nameEn:
        b.personalInfo?.fullNameEn ||
        `${b.personalInfo?.firstName?.en || ''} ${b.personalInfo?.lastName?.en || ''}`.trim(),
      photo: b.personalInfo?.photo,
      gender: b.personalInfo?.gender || b.gender,
      dateOfBirth: b.personalInfo?.dateOfBirth || b.dateOfBirth,
      age: b.age,
      ageInMonths: b.ageInMonths,
      status: b.status,
      overallRiskLevel: b.overallRiskLevel || 'none',
      disability: {
        type: b.disability?.type,
        severity: b.disability?.severity,
        primaryDiagnosis: b.disability?.primaryDiagnosis,
        icdCode: b.disability?.icdCode,
      },
      currentEpisodeId: b.currentEpisodeId?._id || b.currentEpisodeId,
      totalEpisodes: b.totalEpisodes || 0,
      registeredAt: b.createdAt,
      branchId: b.branchId,
    };
  }

  /**
   * Widget 2: رحلة المستفيد والتقدم
   */
  async _buildJourney(b) {
    const episode = b.currentEpisodeId;
    if (!episode || !episode._id) {
      return { hasActiveEpisode: false };
    }

    try {
      const { workflowEngine } = require('../../workflow/WorkflowEngine');

      const progress = workflowEngine.calculateJourneyProgress(episode);
      const available = workflowEngine.getAvailableTransitions(episode.currentPhase);
      const delays = workflowEngine.detectDelays(episode);
      const phaseDef = workflowEngine.getPhaseDefinition(episode.currentPhase);

      return {
        hasActiveEpisode: true,
        episodeId: episode._id,
        currentPhase: episode.currentPhase,
        phaseLabel: phaseDef?.label,
        phaseLabel_en: phaseDef?.label_en,
        phaseDescription: phaseDef?.description,
        progress,
        phases: (episode.phases || []).map(p => ({
          name: p.name,
          label: workflowEngine.getPhaseDefinition(p.name)?.label,
          status: p.status,
          startedAt: p.startedAt,
          completedAt: p.completedAt,
        })),
        availableTransitions: available,
        delays,
        status: episode.status,
        startDate: episode.createdAt,
        priority: episode.priority,
        team: episode.team,
      };
    } catch (err) {
      logger.warn(`[360] Journey widget error: ${err.message}`);
      return { hasActiveEpisode: true, episodeId: episode._id, error: 'workflow unavailable' };
    }
  }

  /**
   * Widget 3: الخط الزمني الطولي
   */
  async _buildTimeline(beneficiaryId, episodeId, limit) {
    const CareTimeline = this._model('CareTimeline');
    if (!CareTimeline) return { events: [], total: 0 };

    const filter = { beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId) };

    const [events, total] = await Promise.all([
      CareTimeline.find(filter)
        .sort({ eventDate: -1, createdAt: -1 })
        .limit(limit)
        .populate('performedBy', 'name firstName lastName role')
        .lean(),
      CareTimeline.countDocuments(filter),
    ]);

    return {
      events: events.map(e => ({
        id: e._id,
        eventType: e.eventType,
        category: e.category,
        title: e.title,
        description: e.description,
        performedBy: e.performedBy,
        eventDate: e.eventDate || e.createdAt,
        flags: e.flags,
      })),
      total,
      showing: events.length,
    };
  }

  /**
   * Widget 4: آخر التقييمات والمقاييس
   */
  async _buildAssessments(beneficiaryId, episodeId) {
    const ClinicalAssessment = this._model('ClinicalAssessment');
    if (!ClinicalAssessment) return { recent: [], count: 0 };

    const filter = { beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId) };

    const [recent, count] = await Promise.all([
      ClinicalAssessment.find(filter)
        .sort({ assessmentDate: -1 })
        .limit(5)
        .populate('measureId', 'name nameAr category')
        .populate('assessorId', 'name firstName lastName role')
        .lean(),
      ClinicalAssessment.countDocuments(filter),
    ]);

    // Group latest by type
    const latestByType = {};
    for (const a of recent) {
      if (!latestByType[a.type]) {
        latestByType[a.type] = a;
      }
    }

    return {
      recent: recent.map(a => ({
        id: a._id,
        type: a.type,
        measure: a.measureId?.nameAr || a.measureId?.name,
        assessor: a.assessorId,
        date: a.assessmentDate,
        totalScore: a.scoring?.totalScore,
        status: a.status,
        domainScores: a.scoring?.domainScores?.map(d => ({
          domain: d.domainName,
          raw: d.rawScore,
          standard: d.standardScore,
        })),
        trend: a.trendAnalysis,
      })),
      count,
      latestByType,
    };
  }

  /**
   * Widget 5: الأهداف الذكية وحالتها
   */
  async _buildGoals(beneficiaryId, episodeId) {
    const TherapeuticGoal = this._model('TherapeuticGoal');
    if (!TherapeuticGoal) return { active: [], completed: [], counts: {} };

    const filter = { beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId) };

    const goals = await TherapeuticGoal.find(filter).sort({ createdAt: -1 }).limit(30).lean();

    const active = goals.filter(g => g.status === 'active' || g.status === 'in_progress');
    const completed = goals.filter(g => g.status === 'achieved' || g.status === 'completed');
    const onHold = goals.filter(g => g.status === 'on_hold');

    // Group by category
    const byCategory = {};
    active.forEach(g => {
      const cat = g.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({
        id: g._id,
        title: g.title,
        level: g.level,
        progress: g.progressPercentage || 0,
        target: g.targetValue,
        current: g.currentValue,
        trend: g.trendAnalysis?.direction,
        targetDate: g.targetDate,
      });
    });

    return {
      active: active.map(g => ({
        id: g._id,
        title: g.title,
        category: g.category,
        level: g.level,
        progress: g.progressPercentage || 0,
        trend: g.trendAnalysis?.direction,
      })),
      completed: completed.length,
      onHold: onHold.length,
      total: goals.length,
      byCategory,
      averageProgress:
        active.length > 0
          ? Math.round(active.reduce((s, g) => s + (g.progressPercentage || 0), 0) / active.length)
          : 0,
    };
  }

  /**
   * Widget 6: خطة الرعاية الحالية
   */
  async _buildCarePlan(beneficiaryId, episodeId) {
    const UnifiedCarePlan = this._model('UnifiedCarePlan');
    if (!UnifiedCarePlan) return null;

    const filter = { beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId) };
    if (episodeId) filter.episodeId = episodeId;

    const plan = await UnifiedCarePlan.findOne(filter).sort({ createdAt: -1 }).lean();

    if (!plan) return { hasPlan: false };

    // Count goals and interventions per section
    const sections = {};
    const sectionKeys = [
      'educational',
      'therapeutic',
      'lifeSkills',
      'behavioral',
      'multidisciplinary',
    ];
    for (const key of sectionKeys) {
      const section = plan[key];
      if (section) {
        sections[key] = {
          goalsCount: section.goals?.length || 0,
          interventionsCount: section.interventions?.length || 0,
          frequency: section.frequency,
          specialist: section.specialist,
        };
      }
    }

    return {
      hasPlan: true,
      id: plan._id,
      status: plan.status,
      startDate: plan.startDate,
      endDate: plan.endDate,
      sections,
      totalGoals: Object.values(sections).reduce((s, sec) => s + sec.goalsCount, 0),
      totalInterventions: Object.values(sections).reduce((s, sec) => s + sec.interventionsCount, 0),
      nextReviewDate: plan.nextReviewDate,
      approvalStatus: plan.approvalStatus,
    };
  }

  /**
   * Widget 7: الجلسات القادمة والأخيرة
   */
  async _buildSessions(beneficiaryId, episodeId, limit) {
    const ClinicalSession = this._model('ClinicalSession');
    if (!ClinicalSession) return { upcoming: [], recent: [], counts: {} };

    const bid = new mongoose.Types.ObjectId(beneficiaryId);
    const now = new Date();

    const [upcoming, recent, counts] = await Promise.all([
      // القادمة
      ClinicalSession.find({
        beneficiaryId: bid,
        scheduledDate: { $gte: now },
        status: { $in: ['scheduled', 'confirmed'] },
      })
        .sort({ scheduledDate: 1 })
        .limit(limit)
        .populate('therapistId', 'name firstName lastName')
        .lean(),

      // الأخيرة
      ClinicalSession.find({
        beneficiaryId: bid,
        status: { $in: ['completed', 'documented'] },
      })
        .sort({ scheduledDate: -1 })
        .limit(limit)
        .populate('therapistId', 'name firstName lastName')
        .lean(),

      // إحصائيات
      ClinicalSession.aggregate([
        { $match: { beneficiaryId: bid } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countsMap = {};
    counts.forEach(c => {
      countsMap[c._id] = c.count;
    });

    const mapSession = s => ({
      id: s._id,
      type: s.type,
      scheduledDate: s.scheduledDate,
      duration: s.duration,
      therapist: s.therapistId,
      status: s.status,
      attendanceStatus: s.attendance?.status,
    });

    return {
      upcoming: upcoming.map(mapSession),
      recent: recent.map(mapSession),
      counts: countsMap,
      totalCompleted: countsMap.completed || 0,
      totalScheduled: countsMap.scheduled || 0,
      attendanceRate:
        (countsMap.completed || 0) + (countsMap.no_show || 0) > 0
          ? Math.round(
              ((countsMap.completed || 0) /
                ((countsMap.completed || 0) + (countsMap.no_show || 0))) *
                100
            )
          : null,
    };
  }

  /**
   * Widget 8: بيانات الأسرة والتواصل
   */
  _buildFamily(b) {
    const guardians = (b.familyMembers || []).filter(m => m.isGuardian);
    const emergencyContacts = b.emergencyContacts || [];

    return {
      guardians: guardians.map(g => ({
        name: g.name,
        relation: g.relation,
        phone: g.phone,
        email: g.email,
        isGuardian: true,
      })),
      emergencyContacts: emergencyContacts.map(c => ({
        name: c.name,
        relation: c.relation,
        phone: c.phone,
        isPrimary: c.isPrimary,
      })),
      portalAccess: {
        enabled: b.portal?.isActive || false,
        lastLogin: b.portal?.lastLoginAt,
      },
      totalFamilyMembers: (b.familyMembers || []).length,
    };
  }

  /**
   * Widget 9: التنبيهات والمخاطر والمهام المعلقة
   */
  async _buildAlerts(b) {
    const alerts = [];

    // 1. Risk flags
    const activeRisks = (b.riskFlags || []).filter(f => !f.resolvedAt);
    activeRisks.forEach(r => {
      alerts.push({
        type: 'risk',
        severity: r.severity || 'medium',
        title: r.type,
        description: r.description,
        raisedAt: r.raisedAt,
      });
    });

    // 2. Journey delays
    if (b.currentEpisodeId?._id) {
      try {
        const { workflowEngine } = require('../../workflow/WorkflowEngine');

        const episode = b.currentEpisodeId;
        const phaseAlerts = workflowEngine.getPhaseAlerts(episode);
        phaseAlerts.forEach(a => {
          alerts.push({
            type: a.type,
            severity: a.severity,
            title: a.message,
            phase: a.phase,
          });
        });
      } catch (e) {
        /* workflow may not be available */
      }
    }

    // 3. Pending workflow tasks
    try {
      const WorkflowTask = this._model('WorkflowTask');
      if (WorkflowTask && b.currentEpisodeId?._id) {
        const pendingTasks = await WorkflowTask.find({
          beneficiaryId: b._id,
          status: { $in: ['pending', 'in_progress'] },
        })
          .sort({ priority: -1, dueDate: 1 })
          .limit(5)
          .lean();

        pendingTasks.forEach(t => {
          alerts.push({
            type: 'task',
            severity: t.isOverdue ? 'high' : t.priority === 'urgent' ? 'high' : 'info',
            title: t.title,
            taskId: t._id,
            dueDate: t.dueDate,
            isOverdue: t.dueDate && new Date() > t.dueDate,
          });
        });
      }
    } catch (e) {
      /* tasks may not exist yet */
    }

    // 4. No active episode warning
    if (!b.currentEpisodeId && b.status === 'active') {
      alerts.push({
        type: 'system',
        severity: 'warning',
        title: 'لا توجد حلقة علاجية نشطة',
        description: 'المستفيد نشط بدون حلقة علاجية — يجب بدء رحلة جديدة',
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, warning: 2, medium: 3, info: 4, low: 5 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

    return {
      items: alerts,
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length,
      overallRiskLevel: b.overallRiskLevel || 'none',
    };
  }

  /**
   * Widget 10: مؤشرات التقدم عبر الزمن
   */
  async _buildProgress(beneficiaryId) {
    const ClinicalAssessment = this._model('ClinicalAssessment');
    if (!ClinicalAssessment) return { dataPoints: [], trends: {} };

    // Get assessments over time (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const assessments = await ClinicalAssessment.find({
      beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
      assessmentDate: { $gte: twelveMonthsAgo },
      'scoring.totalScore': { $exists: true },
    })
      .sort({ assessmentDate: 1 })
      .select('assessmentDate type scoring.totalScore scoring.domainScores trendAnalysis')
      .lean();

    // Build data points for charting
    const dataPoints = assessments.map(a => ({
      date: a.assessmentDate,
      type: a.type,
      totalScore: a.scoring?.totalScore,
      domains: (a.scoring?.domainScores || []).reduce((map, d) => {
        map[d.domainName] = d.standardScore || d.rawScore;
        return map;
      }, {}),
    }));

    // Calculate overall trend
    let trend = 'stable';
    if (dataPoints.length >= 2) {
      const first = dataPoints[0].totalScore;
      const last = dataPoints[dataPoints.length - 1].totalScore;
      if (last > first * 1.05) trend = 'improving';
      else if (last < first * 0.95) trend = 'declining';
    }

    // Goal progress over time
    let goalProgress = [];
    try {
      const TherapeuticGoal = this._model('TherapeuticGoal');
      if (TherapeuticGoal) {
        const goals = await TherapeuticGoal.find({
          beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
          status: { $in: ['active', 'in_progress', 'achieved', 'completed'] },
        })
          .select('title category progressPercentage progressHistory createdAt')
          .lean();

        goalProgress = goals.map(g => ({
          title: g.title,
          category: g.category,
          currentProgress: g.progressPercentage || 0,
          history: (g.progressHistory || []).slice(-10).map(h => ({
            date: h.date || h.recordedAt,
            value: h.value,
          })),
        }));
      }
    } catch (e) {
      /* goals model may not exist */
    }

    return {
      assessmentDataPoints: dataPoints,
      assessmentTrend: trend,
      totalAssessments: dataPoints.length,
      goalProgress,
      period: {
        from: twelveMonthsAgo,
        to: new Date(),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Role-based widget prioritization
  // ═══════════════════════════════════════════════════════════════════

  _getWidgetPriority(role) {
    const priorities = {
      lead_therapist: [
        'summary',
        'goals',
        'assessments',
        'sessions',
        'progress',
        'carePlan',
        'journey',
        'alerts',
        'timeline',
        'family',
      ],
      therapist: [
        'summary',
        'sessions',
        'goals',
        'carePlan',
        'assessments',
        'progress',
        'alerts',
        'journey',
        'family',
        'timeline',
      ],
      supervisor: [
        'summary',
        'journey',
        'alerts',
        'progress',
        'assessments',
        'goals',
        'carePlan',
        'sessions',
        'timeline',
        'family',
      ],
      coordinator: [
        'summary',
        'journey',
        'alerts',
        'sessions',
        'family',
        'carePlan',
        'goals',
        'assessments',
        'timeline',
        'progress',
      ],
      physician: [
        'summary',
        'assessments',
        'progress',
        'carePlan',
        'goals',
        'alerts',
        'sessions',
        'journey',
        'timeline',
        'family',
      ],
      social_worker: [
        'summary',
        'family',
        'alerts',
        'journey',
        'sessions',
        'carePlan',
        'goals',
        'assessments',
        'timeline',
        'progress',
      ],
      admin: [
        'summary',
        'journey',
        'alerts',
        'sessions',
        'progress',
        'assessments',
        'goals',
        'carePlan',
        'family',
        'timeline',
      ],
      family: [
        'summary',
        'progress',
        'goals',
        'sessions',
        'carePlan',
        'family',
        'alerts',
        'journey',
        'timeline',
        'assessments',
      ],
      general: [
        'summary',
        'journey',
        'alerts',
        'assessments',
        'goals',
        'carePlan',
        'sessions',
        'progress',
        'family',
        'timeline',
      ],
    };
    return priorities[role] || priorities.general;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Safe model lookup — returns null if model not registered
   */
  _model(name) {
    try {
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

// Singleton
const beneficiary360Service = new Beneficiary360Service();

module.exports = { Beneficiary360Service, beneficiary360Service };
