/**
 * Sessions Domain — نطاق الجلسات العلاجية
 * @module domains/sessions
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { BaseRepository } = require('../_base/BaseRepository');
const { BaseService } = require('../_base/BaseService');
const { ClinicalSession } = require('./models/ClinicalSession');
const logger = require('../../utils/logger');

class SessionRepository extends BaseRepository {
  constructor() {
    super(ClinicalSession, { softDelete: true, deletedField: 'isDeleted' });
  }

  async findForBeneficiary(beneficiaryId, options = {}) {
    return this.findPaginated({
      filter: { beneficiaryId, isDeleted: { $ne: true } },
      page: options.page || 1,
      limit: options.limit || 20,
      sort: { scheduledDate: -1 },
      populate: [{ path: 'therapistId', select: 'firstName lastName' }],
    });
  }

  async findForEpisode(episodeId, options = {}) {
    return this.findPaginated({
      filter: { episodeId, isDeleted: { $ne: true } },
      page: options.page || 1,
      limit: options.limit || 20,
      sort: { scheduledDate: -1 },
      populate: [{ path: 'therapistId', select: 'firstName lastName' }],
    });
  }

  async getTherapistSchedule(therapistId, startDate, endDate) {
    return ClinicalSession.getTherapistSchedule(therapistId, startDate, endDate);
  }

  async getStatistics(filter) {
    return ClinicalSession.getStatistics(filter);
  }

  async getTodaySessions(branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = {
      scheduledDate: { $gte: today, $lt: tomorrow },
      isDeleted: { $ne: true },
      status: { $nin: ['cancelled'] },
    };
    if (branchId) filter.branchId = branchId;

    return this.model
      .find(filter)
      .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
      .populate('therapistId', 'firstName lastName')
      .sort({ scheduledDate: 1 })
      .lean({ virtuals: true });
  }
}

class SessionService extends BaseService {
  constructor(repository) {
    super(repository, { name: 'SessionService', cache: { enabled: true, ttl: 30 } });
  }

  async beforeCreate(data, context) {
    if (context.userId) {
      data.createdBy = context.userId;
      data.therapistId = data.therapistId || context.userId;
    }
    if (context.branchId) data.branchId = context.branchId;
  }

  async afterCreate(entity, _context) {
    logger.info(
      `[SessionService] Session ${entity.sessionNumber} scheduled for ${entity.scheduledDate}`
    );
    this.emit('sessionScheduled', {
      sessionId: entity._id,
      beneficiaryId: entity.beneficiaryId,
      episodeId: entity.episodeId,
    });
  }

  async getForBeneficiary(beneficiaryId, options) {
    return this.repository.findForBeneficiary(beneficiaryId, options);
  }

  async getForEpisode(episodeId, options) {
    return this.repository.findForEpisode(episodeId, options);
  }

  async getTherapistSchedule(therapistId, startDate, endDate) {
    return this.repository.getTherapistSchedule(therapistId, startDate, endDate);
  }

  async getTodaySessions(branchId) {
    return this.repository.getTodaySessions(branchId);
  }

  async getStatistics(filter) {
    return this.repository.getStatistics(filter);
  }

  async completeSession(sessionId, completionData, userId) {
    const session = await this.repository.model.findById(sessionId);
    if (!session) {
      const e = new Error('الجلسة غير موجودة');
      e.statusCode = 404;
      throw e;
    }

    session.status = 'completed';
    session.actualEndTime = new Date();
    session.lastModifiedBy = userId;
    if (completionData.subjective) session.subjective = completionData.subjective;
    if (completionData.objective) session.objective = completionData.objective;
    if (completionData.assessment) session.assessment = completionData.assessment;
    if (completionData.plan) session.plan = completionData.plan;
    if (completionData.goalProgress) session.goalProgress = completionData.goalProgress;
    if (completionData.activities) session.activities = completionData.activities;
    if (completionData.homeProgram) session.homeProgram = completionData.homeProgram;

    const result = await session.save();
    this._invalidateCache();
    this.emit('sessionCompleted', {
      sessionId,
      beneficiaryId: session.beneficiaryId,
      episodeId: session.episodeId,
    });
    return result;
  }

  async cancelSession(sessionId, reason, userId) {
    const session = await this.repository.model.findById(sessionId);
    if (!session) {
      const e = new Error('الجلسة غير موجودة');
      e.statusCode = 404;
      throw e;
    }

    session.status = 'cancelled';
    session.cancellation = { cancelledAt: new Date(), cancelledBy: userId, reason };
    session.lastModifiedBy = userId;

    const result = await session.save();
    this._invalidateCache();
    this.emit('sessionCancelled', { sessionId, reason });
    return result;
  }

  async markNoShow(sessionId, userId) {
    const result = await this.repository.updateById(sessionId, {
      status: 'no_show',
      'attendance.status': 'absent',
      lastModifiedBy: userId,
    });
    this._invalidateCache();
    this.emit('sessionNoShow', { sessionId });
    return result;
  }

  async startSession(sessionId, userId) {
    const result = await this.repository.updateById(sessionId, {
      status: 'in_progress',
      actualStartTime: new Date(),
      'attendance.checkinTime': new Date(),
      'attendance.status': 'present',
      lastModifiedBy: userId,
    });
    this._invalidateCache();
    return result;
  }
}

class SessionsDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'sessions',
      version: '2.0.0',
      description: 'الجلسات العلاجية — فردية وجماعية وعن بعد',
      dependencies: ['core', 'episodes', 'care-plans'],
    });
  }

  async initialize() {
    this.repository = new SessionRepository();
    this.service = new SessionService(this.repository);
    this.addHealthCheck('sessions-collection', async () => {
      const count = await this.repository.count();
      return { status: 'healthy', totalSessions: count };
    });
    await super.initialize();
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const svc = this.service;

    router.get('/', async (req, res, next) => {
      try {
        const result = await svc.list({
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          sort: { scheduledDate: -1 },
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/today', async (req, res, next) => {
      try {
        const data = await svc.getTodaySessions(req.query.branchId);
        res.json({ success: true, data, total: data.length });
      } catch (e) {
        next(e);
      }
    });

    router.get('/statistics', async (req, res, next) => {
      try {
        const stats = await svc.getStatistics(req.query);
        res.json({ success: true, data: stats });
      } catch (e) {
        next(e);
      }
    });

    router.get('/therapist/:therapistId/schedule', async (req, res, next) => {
      try {
        const data = await svc.getTherapistSchedule(
          req.params.therapistId,
          req.query.startDate,
          req.query.endDate
        );
        res.json({ success: true, data, total: data.length });
      } catch (e) {
        next(e);
      }
    });

    router.get('/beneficiary/:beneficiaryId', async (req, res, next) => {
      try {
        const result = await svc.getForBeneficiary(req.params.beneficiaryId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/episode/:episodeId', async (req, res, next) => {
      try {
        const result = await svc.getForEpisode(req.params.episodeId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/:id', async (req, res, next) => {
      try {
        const data = await svc.getById(req.params.id, {
          populate: [
            { path: 'beneficiaryId', select: 'firstName lastName fullNameArabic mrn' },
            { path: 'therapistId', select: 'firstName lastName' },
            { path: 'goalProgress.goalId', select: 'title status targetValue' },
          ],
        });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.post('/', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id, branchId: req.user?.branchId };
        const session = await svc.create(req.body, context);
        res.status(201).json({ success: true, data: session });
      } catch (e) {
        next(e);
      }
    });

    router.put('/:id', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id };
        const updated = await svc.update(req.params.id, req.body, context);
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    });

    router.post('/:id/start', async (req, res, next) => {
      try {
        const r = await svc.startSession(req.params.id, req.user?._id);
        res.json({ success: true, data: r });
      } catch (e) {
        next(e);
      }
    });

    router.post('/:id/complete', async (req, res, next) => {
      try {
        const r = await svc.completeSession(req.params.id, req.body, req.user?._id);
        res.json({ success: true, data: r });
      } catch (e) {
        next(e);
      }
    });

    router.post('/:id/cancel', async (req, res, next) => {
      try {
        const r = await svc.cancelSession(req.params.id, req.body.reason, req.user?._id);
        res.json({ success: true, data: r });
      } catch (e) {
        next(e);
      }
    });

    router.post('/:id/no-show', async (req, res, next) => {
      try {
        const r = await svc.markNoShow(req.params.id, req.user?._id);
        res.json({ success: true, data: r });
      } catch (e) {
        next(e);
      }
    });
  }
}

module.exports = new SessionsDomain();
