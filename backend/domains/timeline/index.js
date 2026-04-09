/**
 * Timeline Domain — الخط الزمني الطولي
 * @module domains/timeline
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { BaseRepository } = require('../_base/BaseRepository');
const { CareTimeline } = require('./models/CareTimeline');
const logger = require('../../utils/logger');

// ─── Repository ───────────────────────────────────────────────────────────────

class TimelineRepository extends BaseRepository {
  constructor() {
    super(CareTimeline);
  }

  async getTimeline(beneficiaryId, options) {
    return CareTimeline.getTimeline(beneficiaryId, options);
  }

  async getEventSummary(beneficiaryId, episodeId) {
    return CareTimeline.getEventSummary(beneficiaryId, episodeId);
  }

  async recordEvent(eventData) {
    return CareTimeline.recordEvent(eventData);
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class TimelineService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * تسجيل حدث في الخط الزمني
   */
  async record({
    beneficiaryId,
    episodeId,
    eventType,
    category,
    severity = 'info',
    title,
    title_ar,
    description,
    description_ar,
    relatedEntity,
    performedBy,
    performedByRole,
    performedByName,
    metadata = {},
    previousValue,
    newValue,
    branchId,
    visibleTo = ['all'],
  }) {
    const event = await this.repository.recordEvent({
      beneficiaryId,
      episodeId,
      eventType,
      category,
      severity,
      title,
      title_ar,
      description,
      description_ar,
      relatedEntity,
      performedBy,
      performedByRole,
      performedByName,
      occurredAt: new Date(),
      metadata,
      previousValue,
      newValue,
      branchId,
      visibleTo,
    });

    logger.info(`[Timeline] ${eventType} recorded for beneficiary ${beneficiaryId}`);
    return event;
  }

  /**
   * جلب الخط الزمني لمستفيد
   */
  async getTimeline(beneficiaryId, options = {}) {
    return this.repository.getTimeline(beneficiaryId, options);
  }

  /**
   * ملخص الأحداث
   */
  async getEventSummary(beneficiaryId, episodeId) {
    return this.repository.getEventSummary(beneficiaryId, episodeId);
  }

  /**
   * أحداث حلقة علاجية محددة
   */
  async getEpisodeTimeline(episodeId, options = {}) {
    return this.repository.findPaginated({
      filter: { episodeId, isVisible: true },
      page: options.page || 1,
      limit: options.limit || 50,
      sort: { occurredAt: -1 },
    });
  }

  // ─── Convenience Event Recorders ──────────────────────────────────

  async recordAssessment(beneficiaryId, episodeId, assessmentId, performedBy, metadata = {}) {
    return this.record({
      beneficiaryId,
      episodeId,
      eventType: 'assessment_completed',
      category: 'clinical',
      severity: 'success',
      title: 'Assessment Completed',
      title_ar: 'تم إكمال التقييم',
      relatedEntity: { type: 'Assessment', id: assessmentId },
      performedBy,
      metadata,
    });
  }

  async recordSessionCompleted(beneficiaryId, episodeId, sessionId, performedBy, metadata = {}) {
    return this.record({
      beneficiaryId,
      episodeId,
      eventType: 'session_completed',
      category: 'clinical',
      severity: 'success',
      title: 'Session Completed',
      title_ar: 'تم إكمال الجلسة',
      relatedEntity: { type: 'Session', id: sessionId },
      performedBy,
      metadata,
    });
  }

  async recordGoalAchieved(beneficiaryId, episodeId, goalId, performedBy, metadata = {}) {
    return this.record({
      beneficiaryId,
      episodeId,
      eventType: 'goal_achieved',
      category: 'clinical',
      severity: 'success',
      title: 'Goal Achieved',
      title_ar: 'تم تحقيق الهدف',
      relatedEntity: { type: 'Goal', id: goalId },
      performedBy,
      metadata,
    });
  }

  async recordRiskFlagRaised(beneficiaryId, episodeId, flagData, performedBy) {
    return this.record({
      beneficiaryId,
      episodeId,
      eventType: 'risk_flag_raised',
      category: 'quality',
      severity: flagData.severity === 'critical' ? 'critical' : 'warning',
      title: 'Risk Flag Raised',
      title_ar: 'تم رفع تنبيه مخاطر',
      performedBy,
      metadata: flagData,
    });
  }

  async recordPhaseAdvanced(beneficiaryId, episodeId, newPhase, performedBy) {
    return this.record({
      beneficiaryId,
      episodeId,
      eventType: 'phase_advanced',
      category: 'administrative',
      severity: 'info',
      title: `Phase advanced to: ${newPhase}`,
      title_ar: `تم التقدم للمرحلة: ${newPhase}`,
      relatedEntity: { type: 'EpisodeOfCare', id: episodeId },
      performedBy,
      metadata: { newPhase },
    });
  }

  async recordFamilyContact(beneficiaryId, episodeId, interactionData, performedBy) {
    return this.record({
      beneficiaryId,
      episodeId,
      eventType: 'family_contact',
      category: 'family',
      severity: 'info',
      title: 'Family Contact',
      title_ar: 'تواصل أسري',
      performedBy,
      metadata: interactionData,
      visibleTo: ['all', 'family'],
    });
  }
}

// ─── Domain Module ────────────────────────────────────────────────────────────

class TimelineDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'timeline',
      version: '2.0.0',
      description: 'الخط الزمني الطولي — سجل موحد لكل أحداث رحلة المستفيد',
      dependencies: ['core', 'episodes'],
    });
    this.repository = null;
    this.service = null;
  }

  async initialize() {
    this.repository = new TimelineRepository();
    this.service = new TimelineService(this.repository);

    this.addHealthCheck('timeline-collection', async () => {
      const count = await this.repository.count();
      return { status: 'healthy', totalEvents: count };
    });

    await super.initialize();
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const svc = this.service;

    // الخط الزمني لمستفيد
    router.get('/beneficiary/:beneficiaryId', async (req, res, next) => {
      try {
        const result = await svc.getTimeline(req.params.beneficiaryId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    // ملخص الأحداث
    router.get('/beneficiary/:beneficiaryId/summary', async (req, res, next) => {
      try {
        const summary = await svc.getEventSummary(req.params.beneficiaryId, req.query.episodeId);
        res.json({ success: true, data: summary });
      } catch (e) {
        next(e);
      }
    });

    // أحداث حلقة محددة
    router.get('/episode/:episodeId', async (req, res, next) => {
      try {
        const result = await svc.getEpisodeTimeline(req.params.episodeId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    // تسجيل حدث يدوي
    router.post('/', async (req, res, next) => {
      try {
        const event = await svc.record({
          ...req.body,
          performedBy: req.user?._id,
        });
        res.status(201).json({ success: true, data: event });
      } catch (e) {
        next(e);
      }
    });
  }
}

module.exports = new TimelineDomain();
