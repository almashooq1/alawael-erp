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
// W1156 — golden-thread structural traversal (first consumer of the W1149/W1151
// reverse-traversal indexes); exposed as the `goldenThread` widget.
const goldenThreadService = require('../../../services/goldenThread.service');

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
      'goldenThread',
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
      // W1156 — connected golden-thread graph (goal↔measure↔session↔assessment),
      // NOT a parallel widget: each goal carries its sessions + source assessment.
      goldenThread: () => goldenThreadService.traceByBeneficiary(beneficiaryId),
    };

    const results = await Promise.allSettled(
      requestedWidgets.map(async w => {
        const start = Date.now();
        if (!Object.hasOwn(builders, w)) return { widget: w, error: 'unknown_widget' };
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
      // W1563 — PDPL: mask national id in the 360 summary (this surface has no role gate).
      nationalId: b.nationalId ? '•••••' + String(b.nationalId).slice(-4) : null,
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
        // W1557 — CareTimeline's date field + indexes are `occurredAt`, not `eventDate`.
        .sort({ occurredAt: -1, createdAt: -1 })
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
        eventDate: e.occurredAt || e.createdAt,
        flags: e.flags,
      })),
      total,
      showing: events.length,
    };
  }

  /**
   * Widget 4: آخر التقييمات والمقاييس
   */
  async _buildAssessments(beneficiaryId, _episodeId) {
    const ClinicalAssessment = this._model('ClinicalAssessment');
    if (!ClinicalAssessment) return { recent: [], count: 0 };

    // W1557 — the ClinicalAssessment schema keys on `beneficiary` (NOT beneficiaryId)
    // and stores flat `score` + `scoreBreakdown[].domain/score` + `tool`/`therapist`/
    // `category` (NO scoring.*/measureId/assessorId/type). The prior query + shape were
    // phantom → this widget returned EMPTY for every real beneficiary.
    const filter = { beneficiary: new mongoose.Types.ObjectId(beneficiaryId) };

    const [recent, count] = await Promise.all([
      ClinicalAssessment.find(filter)
        .sort({ assessmentDate: -1 })
        .limit(5)
        .populate('therapist', 'name firstName lastName role')
        .lean(),
      ClinicalAssessment.countDocuments(filter),
    ]);

    // Group latest by category
    const latestByType = {};
    for (const a of recent) {
      if (a.category && !latestByType[a.category]) {
        latestByType[a.category] = a;
      }
    }

    return {
      recent: recent.map(a => ({
        id: a._id,
        type: a.category,
        measure: a.tool,
        assessor: a.therapist,
        date: a.assessmentDate,
        totalScore: a.score,
        status: a.status,
        domainScores: a.scoreBreakdown?.map(d => ({
          domain: d.domain,
          score: d.score,
        })),
      })),
      count,
      latestByType,
    };
  }

  /**
   * Widget 5: الأهداف الذكية وحالتها
   */
  async _buildGoals(beneficiaryId, _episodeId) {
    const TherapeuticGoal = this._model('TherapeuticGoal');
    if (!TherapeuticGoal) return { active: [], completed: [], counts: {} };

    // W1557 — TherapeuticGoal: progress is `currentProgress` (not progressPercentage);
    // exclude soft-deleted; align status buckets to the real enum
    // (active/achieved/partially_achieved/not_achieved/discontinued/deferred/...).
    const filter = {
      beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
      isDeleted: { $ne: true },
    };

    const goals = await TherapeuticGoal.find(filter).sort({ createdAt: -1 }).limit(30).lean();

    const active = goals.filter(g => g.status === 'active');
    const completed = goals.filter(
      g => g.status === 'achieved' || g.status === 'partially_achieved'
    );
    const onHold = goals.filter(g => g.status === 'deferred' || g.status === 'discontinued');

    // Group by category
    const byCategory = {};
    active.forEach(g => {
      const cat = g.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({
        id: g._id,
        title: g.title,
        level: g.level,
        progress: g.currentProgress || 0,
        targetDate: g.targetDate,
      });
    });

    return {
      active: active.map(g => ({
        id: g._id,
        title: g.title,
        category: g.category,
        level: g.level,
        progress: g.currentProgress || 0,
      })),
      completed: completed.length,
      onHold: onHold.length,
      total: goals.length,
      byCategory,
      averageProgress:
        active.length > 0
          ? Math.round(active.reduce((s, g) => s + (g.currentProgress || 0), 0) / active.length)
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

    // W1567 — count goals/interventions per DOMAIN sub-section. UnifiedCarePlan nests
    // sections as plan.<group>.domains.<name> (each a sectionSchema with goals/
    // interventions/frequency/specialistId), NOT plan.<key>.goals — the old
    // ['educational','therapeutic','lifeSkills','behavioral','multidisciplinary'] loop read
    // .goals on the wrapper (always undefined → every count 0) and 'behavioral'/
    // 'multidisciplinary' aren't even top-level keys. Global goals/interventions live at the
    // plan root. approvalStatus is not a field — derived from the approvals[] array.
    const sections = {};
    let totalGoals = (plan.globalGoals || []).length;
    let totalInterventions = (plan.globalInterventions || []).length;
    for (const group of ['educational', 'therapeutic', 'lifeSkills']) {
      const domains = plan[group]?.domains;
      if (!domains) continue;
      for (const [name, section] of Object.entries(domains)) {
        if (!section) continue;
        const goalsCount = section.goals?.length || 0;
        const interventionsCount = section.interventions?.length || 0;
        sections[`${group}.${name}`] = {
          name: section.name || name,
          goalsCount,
          interventionsCount,
          frequency: section.frequency,
          specialistId: section.specialistId || null,
        };
        totalGoals += goalsCount;
        totalInterventions += interventionsCount;
      }
    }

    const approvals = plan.approvals || [];
    const approvalStatus =
      approvals.length === 0
        ? 'none'
        : approvals.some(a => a.status === 'rejected')
          ? 'rejected'
          : approvals.every(a => a.status === 'approved')
            ? 'approved'
            : 'pending';

    return {
      hasPlan: true,
      id: plan._id,
      status: plan.status,
      startDate: plan.startDate,
      endDate: plan.endDate,
      sections,
      totalGoals,
      totalInterventions,
      nextReviewDate: plan.nextReviewDate,
      approvalStatus,
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
        // W1567 — 'documented' is not a ClinicalSession.status enum value (completion is
        // 'completed'; documentation is tracked separately via documentedAt) → matched none.
        status: { $in: ['completed'] },
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
      specialty: s.specialty, // W1567 — clinical discipline (was omitted from the widget)
      scheduledDate: s.scheduledDate,
      // W1567 — schema has scheduledDurationMinutes (planned) + actualDurationMinutes
      // (completed); there is no `duration` field, so the widget showed a blank duration.
      duration: s.actualDurationMinutes ?? s.scheduledDurationMinutes,
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
      } catch {
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
    } catch {
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

    // W1557 — real schema: keyed on `beneficiary`, flat `score`, `scoreBreakdown[].domain/score`.
    const assessments = await ClinicalAssessment.find({
      beneficiary: new mongoose.Types.ObjectId(beneficiaryId),
      assessmentDate: { $gte: twelveMonthsAgo },
      score: { $exists: true },
    })
      .sort({ assessmentDate: 1 })
      .select('assessmentDate category score scoreBreakdown')
      .lean();

    // Build data points for charting
    const dataPoints = assessments.map(a => ({
      date: a.assessmentDate,
      type: a.category,
      totalScore: a.score,
      domains: (a.scoreBreakdown || []).reduce((map, d) => {
        map[d.domain] = d.score;
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
          isDeleted: { $ne: true },
          status: { $in: ['active', 'achieved', 'partially_achieved'] },
        })
          .select('title category currentProgress progressHistory createdAt')
          .lean();

        goalProgress = goals.map(g => ({
          title: g.title,
          category: g.category,
          currentProgress: g.currentProgress || 0,
          history: (g.progressHistory || []).slice(-10).map(h => ({
            date: h.date || h.recordedAt,
            value: h.value,
          })),
        }));
      }
    } catch {
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
