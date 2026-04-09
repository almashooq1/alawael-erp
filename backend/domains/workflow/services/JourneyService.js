/**
 * JourneyService — خدمة إدارة رحلة المستفيد
 *
 * الطبقة العليا التي تربط محرك Workflow مع النماذج والحلقة العلاجية.
 * تنسق بين EpisodeOfCare, WorkflowEngine, WorkflowTask, WorkflowTransitionLog,
 * وCareTimeline لتوفير واجهة موحدة لرحلة المستفيد.
 *
 * @module domains/workflow/services/JourneyService
 */

const { workflowEngine } = require('../WorkflowEngine');
const WorkflowTask = require('../models/WorkflowTask');
const WorkflowTransitionLog = require('../models/WorkflowTransitionLog');
const logger = require('../../../utils/logger');

class JourneyService {
  constructor() {
    this._bindEngineEvents();
  }

  // ═════════════════════════════════════════════════════════════════
  // Public API
  // ═════════════════════════════════════════════════════════════════

  /**
   * بدء رحلة جديدة — إنشاء حلقة علاجية + انتقال للإحالة
   */
  async startJourney({ beneficiaryId, referralData, userId, branchId, organizationId }) {
    const EpisodeOfCare = require('../../episodes/models/EpisodeOfCare');

    // 1. إنشاء حلقة علاجية جديدة
    const episode = await EpisodeOfCare.create({
      beneficiaryId,
      status: 'planned',
      currentPhase: 'referral',
      priority: referralData?.priority || 'routine',
      referral: {
        source: referralData?.source || 'internal',
        referredBy: referralData?.referredBy,
        reason: referralData?.reason,
        date: new Date(),
        externalRef: referralData?.externalRef,
      },
      phases: [
        {
          name: 'referral',
          status: 'in_progress',
          startedAt: new Date(),
        },
      ],
      team: referralData?.team || [],
      branchId,
      organizationId,
      createdBy: userId,
    });

    // 2. تسجيل الانتقال في سجل التدقيق
    await WorkflowTransitionLog.create({
      beneficiaryId,
      episodeId: episode._id,
      fromPhase: 'new',
      toPhase: 'referral',
      status: 'success',
      executedBy: userId,
      reason: referralData?.reason || 'بدء رحلة جديدة',
      branchId,
      organizationId,
    });

    // 3. تسجيل في Timeline
    await this._recordTimeline({
      beneficiaryId,
      episodeId: episode._id,
      eventType: 'episode_started',
      title: 'بدء رحلة علاجية جديدة',
      description: `إحالة من: ${referralData?.source || 'داخلي'}`,
      userId,
    });

    // 4. تحديث ملف المستفيد
    const Beneficiary = require('../../core/models/Beneficiary');
    await Beneficiary.findByIdAndUpdate(beneficiaryId, {
      currentEpisodeId: episode._id,
      $inc: { totalEpisodes: 1 },
      status: 'active',
    });

    logger.info(
      `[Journey] Started new journey for beneficiary ${beneficiaryId}, episode ${episode._id}`
    );

    return {
      episode,
      message: 'تم بدء رحلة جديدة بنجاح',
    };
  }

  /**
   * نقل المستفيد للمرحلة التالية
   */
  async advancePhase({ episodeId, toPhase, userId, reason, context = {} }) {
    const EpisodeOfCare = require('../../episodes/models/EpisodeOfCare');
    const episode = await EpisodeOfCare.findById(episodeId);

    if (!episode) {
      const error = new Error('الحلقة العلاجية غير موجودة');
      error.statusCode = 404;
      throw error;
    }

    const fromPhase = episode.currentPhase;

    // Enrich context with episode data
    const enrichedContext = {
      ...context,
      userId,
      reason,
      assessmentCount: episode.assessmentIds?.length || 0,
      hasActiveCarePlan: !!episode.activeCarePlanId,
    };

    // Execute transition via engine
    const result = await workflowEngine.executeTransition(episode, toPhase, enrichedContext);

    // Calculate duration in previous phase
    const previousPhaseEntry = episode.phases?.find(p => p.name === fromPhase);
    let durationInPhase = {};
    if (previousPhaseEntry?.startedAt) {
      const ms = Date.now() - new Date(previousPhaseEntry.startedAt).getTime();
      durationInPhase = {
        days: Math.floor(ms / (1000 * 60 * 60 * 24)),
        hours: Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      };
    }

    // 1. Update episode
    const phaseUpdate = {
      currentPhase: toPhase,
    };

    // Mark previous phase as completed
    if (episode.phases) {
      const idx = episode.phases.findIndex(p => p.name === fromPhase && p.status === 'in_progress');
      if (idx !== -1) {
        episode.phases[idx].status = 'completed';
        episode.phases[idx].completedAt = new Date();
        episode.phases[idx].completedBy = userId;
      }
    }

    // Add new phase entry
    episode.phases.push({
      name: toPhase,
      status: 'in_progress',
      startedAt: new Date(),
    });

    episode.currentPhase = toPhase;
    if (toPhase === 'active_treatment') episode.status = 'active';
    if (toPhase === 'discharge') episode.status = 'finished';
    if (toPhase === 'post_discharge_followup') episode.status = 'followup';

    await episode.save();

    // 2. Transition log
    await WorkflowTransitionLog.create({
      beneficiaryId: episode.beneficiaryId,
      episodeId: episode._id,
      fromPhase,
      toPhase,
      status: 'success',
      executedBy: userId,
      reason,
      warnings: result.warnings,
      durationInPhase,
      contextSnapshot: {
        assessmentCount: enrichedContext.assessmentCount,
        sessionCount: context.sessionCount || 0,
        activeGoals: context.activeGoals || 0,
        completedGoals: context.completedGoals || 0,
        riskLevel: context.riskLevel || 'none',
      },
      branchId: episode.branchId,
      organizationId: episode.organizationId,
    });

    // 3. Timeline
    await this._recordTimeline({
      beneficiaryId: episode.beneficiaryId,
      episodeId: episode._id,
      eventType: 'phase_transition',
      title: `انتقال: ${workflowEngine.phases[fromPhase]?.label} → ${workflowEngine.phases[toPhase]?.label}`,
      description: reason || '',
      userId,
      metadata: { fromPhase, toPhase, durationInPhase },
    });

    logger.info(`[Journey] Phase advance: ${fromPhase} → ${toPhase} | Episode: ${episodeId}`);

    return {
      success: true,
      fromPhase,
      toPhase,
      warnings: result.warnings,
      episode,
    };
  }

  /**
   * تجاوز سريري (Exception) — نقل بدون قواعد عادية
   */
  async exceptionAdvance({ episodeId, toPhase, userId, reason, approvedBy }) {
    const EpisodeOfCare = require('../../episodes/models/EpisodeOfCare');
    const episode = await EpisodeOfCare.findById(episodeId);

    if (!episode) {
      const error = new Error('الحلقة العلاجية غير موجودة');
      error.statusCode = 404;
      throw error;
    }

    const fromPhase = episode.currentPhase;

    const result = await workflowEngine.executeExceptionTransition(episode, toPhase, {
      userId,
      reason,
    });

    // Update episode (force transition)
    const previousPhaseEntry = episode.phases?.find(
      p => p.name === fromPhase && p.status === 'in_progress'
    );
    if (previousPhaseEntry) {
      previousPhaseEntry.status = 'completed';
      previousPhaseEntry.completedAt = new Date();
      previousPhaseEntry.notes = `تجاوز سريري: ${reason}`;
    }

    episode.phases.push({
      name: toPhase,
      status: 'in_progress',
      startedAt: new Date(),
    });
    episode.currentPhase = toPhase;
    await episode.save();

    // Log as exception
    await WorkflowTransitionLog.create({
      beneficiaryId: episode.beneficiaryId,
      episodeId: episode._id,
      fromPhase,
      toPhase,
      status: 'exception',
      isException: true,
      exceptionReason: reason,
      exceptionApprovedBy: approvedBy || userId,
      executedBy: userId,
      reason,
      branchId: episode.branchId,
      organizationId: episode.organizationId,
    });

    // Timeline
    await this._recordTimeline({
      beneficiaryId: episode.beneficiaryId,
      episodeId: episode._id,
      eventType: 'clinical_exception',
      title: `تجاوز سريري: ${fromPhase} → ${toPhase}`,
      description: reason,
      userId,
      metadata: { fromPhase, toPhase, isException: true },
      flags: { requiresAttention: true },
    });

    logger.warn(
      `[Journey] Exception advance: ${fromPhase} → ${toPhase} | Episode: ${episodeId} | Reason: ${reason}`
    );

    return {
      success: true,
      isException: true,
      fromPhase,
      toPhase,
      episode,
    };
  }

  /**
   * الحصول على حالة رحلة المستفيد الحالية
   */
  async getJourneyStatus(episodeId) {
    const EpisodeOfCare = require('../../episodes/models/EpisodeOfCare');
    const episode = await EpisodeOfCare.findById(episodeId)
      .populate('beneficiaryId', 'name fileNumber personalInfo')
      .populate('team.userId', 'name role');

    if (!episode) return null;

    const progress = workflowEngine.calculateJourneyProgress(episode);
    const availableTransitions = workflowEngine.getAvailableTransitions(episode.currentPhase);
    const delays = workflowEngine.detectDelays(episode);
    const alerts = workflowEngine.getPhaseAlerts(episode);

    // Pending tasks
    const pendingTasks = await WorkflowTask.find({
      episodeId,
      status: { $in: ['pending', 'in_progress'] },
    }).sort({ priority: -1, dueDate: 1 });

    // Journey history
    const history = await WorkflowTransitionLog.getJourneyHistory(episodeId);

    return {
      episode,
      progress,
      currentPhase: {
        name: episode.currentPhase,
        definition: workflowEngine.getPhaseDefinition(episode.currentPhase),
      },
      availableTransitions,
      delays,
      alerts,
      pendingTasks,
      history,
    };
  }

  /**
   * التحقق من إمكانية الانتقال
   */
  async checkTransition(episodeId, toPhase, context = {}) {
    const EpisodeOfCare = require('../../episodes/models/EpisodeOfCare');
    const episode = await EpisodeOfCare.findById(episodeId);
    if (!episode) return { valid: false, errors: ['الحلقة العلاجية غير موجودة'] };

    return workflowEngine.validateTransition(episode, episode.currentPhase, toPhase, context);
  }

  /**
   * الحصول على لوحة تحكم المهام للمستخدم
   */
  async getTaskDashboard(userId, filters = {}) {
    const query = { assignedTo: userId };
    if (filters.status) query.status = filters.status;
    else query.status = { $in: ['pending', 'in_progress'] };

    const tasks = await WorkflowTask.find(query)
      .populate('beneficiaryId', 'name fileNumber')
      .populate('episodeId', 'currentPhase')
      .sort({ priority: -1, dueDate: 1 })
      .limit(filters.limit || 50);

    const overdue = tasks.filter(t => t.isOverdue);
    const summary = await WorkflowTask.getTasksDashboard({ assignedTo: userId });

    return { tasks, overdue, summary };
  }

  /**
   * إكمال مهمة
   */
  async completeTask(taskId, userId, notes, result) {
    const task = await WorkflowTask.findById(taskId);
    if (!task) {
      const error = new Error('المهمة غير موجودة');
      error.statusCode = 404;
      throw error;
    }

    await task.complete(userId, notes, result);

    // Timeline
    await this._recordTimeline({
      beneficiaryId: task.beneficiaryId,
      episodeId: task.episodeId,
      eventType: 'task_completed',
      title: `إكمال مهمة: ${task.title}`,
      userId,
    });

    return task;
  }

  /**
   * الحصول على تقدم جميع الحلقات النشطة (لوحة تحكم)
   */
  async getActiveJourneysDashboard(filters = {}) {
    const EpisodeOfCare = require('../../episodes/models/EpisodeOfCare');

    const query = { status: { $in: ['planned', 'active'] } };
    if (filters.branchId) query.branchId = filters.branchId;

    const episodes = await EpisodeOfCare.find(query)
      .populate('beneficiaryId', 'name fileNumber personalInfo')
      .sort({ updatedAt: -1 })
      .limit(filters.limit || 100);

    const journeys = episodes.map(ep => ({
      episodeId: ep._id,
      beneficiary: ep.beneficiaryId,
      currentPhase: ep.currentPhase,
      phaseLabel: workflowEngine.phases[ep.currentPhase]?.label,
      progress: workflowEngine.calculateJourneyProgress(ep),
      delays: workflowEngine.detectDelays(ep),
      status: ep.status,
    }));

    const phaseSummary = {};
    journeys.forEach(j => {
      phaseSummary[j.currentPhase] = (phaseSummary[j.currentPhase] || 0) + 1;
    });

    return {
      total: journeys.length,
      journeys,
      phaseSummary,
      delayed: journeys.filter(j => j.delays.length > 0),
    };
  }

  /**
   * تحليلات الرحلات — متوسط المدة لكل مرحلة
   */
  async getJourneyAnalytics(filters = {}) {
    const avgPhaseTime = await WorkflowTransitionLog.getAveragePhaseTime(filters);
    const exceptionStats = await WorkflowTransitionLog.getExceptionStats(filters);

    return {
      averagePhaseTime: avgPhaseTime,
      exceptionStats,
      phases: workflowEngine.getAllPhases(),
    };
  }

  /**
   * الحصول على جميع المراحل القياسية (للعرض في UI)
   */
  getPhaseDefinitions() {
    return workflowEngine.getAllPhases();
  }

  // ═════════════════════════════════════════════════════════════════
  // Private
  // ═════════════════════════════════════════════════════════════════

  /**
   * ربط أحداث محرك Workflow بإنشاء المهام والإشعارات
   */
  _bindEngineEvents() {
    workflowEngine.on('task:create', async taskData => {
      try {
        await WorkflowTask.create({
          beneficiaryId: taskData.beneficiaryId,
          episodeId: taskData.episodeId,
          type: taskData.type,
          title: taskData.title,
          assignedRole: taskData.assignTo,
          phase: taskData.phase,
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueInDays
            ? new Date(Date.now() + taskData.dueInDays * 24 * 60 * 60 * 1000)
            : undefined,
          isAutoGenerated: true,
        });
        logger.info(`[Journey] Auto-task created: ${taskData.title}`);
      } catch (err) {
        logger.error(`[Journey] Failed to create auto-task: ${err.message}`);
      }
    });

    workflowEngine.on('notification:send', notification => {
      // TODO: ربط مع خدمة الإشعارات (Socket.IO / Email / SMS)
      logger.info(`[Journey] Notification queued: ${notification.type} → ${notification.to}`);
    });
  }

  /**
   * تسجيل حدث في Timeline
   */
  async _recordTimeline({
    beneficiaryId,
    episodeId,
    eventType,
    title,
    description,
    userId,
    metadata,
    flags,
  }) {
    try {
      const CareTimeline = require('../../timeline/models/CareTimeline');
      await CareTimeline.create({
        beneficiaryId,
        episodeId,
        eventType,
        title,
        description,
        performedBy: userId,
        metadata,
        flags: flags || {},
        category: eventType.startsWith('clinical') ? 'clinical' : 'administrative',
      });
    } catch (err) {
      // Non-blocking — timeline failure should not break workflow
      logger.error(`[Journey] Timeline recording failed: ${err.message}`);
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const journeyService = new JourneyService();

module.exports = { JourneyService, journeyService };
