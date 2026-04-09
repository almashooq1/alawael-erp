/**
 * Episodes Domain — نطاق الحلقات العلاجية
 * @module domains/episodes
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { BaseRepository } = require('../_base/BaseRepository');
const { BaseService } = require('../_base/BaseService');
const { EpisodeOfCare } = require('./models/EpisodeOfCare');
const logger = require('../../utils/logger');

// ─── Repository ───────────────────────────────────────────────────────────────

class EpisodeRepository extends BaseRepository {
  constructor() {
    super(EpisodeOfCare, { softDelete: true, deletedField: 'isDeleted' });
  }

  async findActiveForBeneficiary(beneficiaryId) {
    return EpisodeOfCare.getActiveForBeneficiary(beneficiaryId);
  }

  async findAllForBeneficiary(beneficiaryId, { page = 1, limit = 10 } = {}) {
    return this.findPaginated({
      filter: { beneficiaryId, isDeleted: { $ne: true } },
      page,
      limit,
      sort: { startDate: -1 },
    });
  }

  async findByTherapist(therapistId, { page = 1, limit = 20 } = {}) {
    return this.findPaginated({
      filter: {
        $or: [
          { leadTherapistId: therapistId },
          { 'careTeam.userId': therapistId, 'careTeam.isActive': true },
        ],
        status: 'active',
        isDeleted: { $ne: true },
      },
      page,
      limit,
      sort: { startDate: -1 },
      populate: [
        {
          path: 'beneficiaryId',
          select: 'firstName lastName fullNameArabic mrn disability status',
        },
      ],
    });
  }

  async findByPhase(phase, branchId) {
    const filter = { currentPhase: phase, status: 'active', isDeleted: { $ne: true } };
    if (branchId) filter.branchId = branchId;
    return this.model
      .find(filter)
      .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
      .populate('leadTherapistId', 'firstName lastName')
      .sort({ startDate: 1 })
      .lean({ virtuals: true });
  }

  async getStatistics(branchId) {
    return EpisodeOfCare.getStatistics(branchId);
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class EpisodeService extends BaseService {
  constructor(repository) {
    super(repository, { name: 'EpisodeService', cache: { enabled: true, ttl: 60 } });
  }

  async beforeCreate(data, context) {
    // Verify no active episode exists for this beneficiary (of same type)
    const activeEpisode = await this.repository.findActiveForBeneficiary(data.beneficiaryId);
    if (activeEpisode && data.type !== 'crisis') {
      const error = new Error('يوجد حلقة علاجية نشطة بالفعل لهذا المستفيد');
      error.statusCode = 409;
      throw error;
    }
    if (context.userId) {
      data.createdBy = context.userId;
      data.lastModifiedBy = context.userId;
    }
    if (context.branchId) data.branchId = context.branchId;
  }

  async afterCreate(entity, _context) {
    logger.info(
      `[EpisodeService] New episode created: ${entity.episodeNumber} for beneficiary ${entity.beneficiaryId}`
    );
    this.emit('episodeCreated', { episodeId: entity._id, beneficiaryId: entity.beneficiaryId });
  }

  async getActiveEpisode(beneficiaryId) {
    const episode = await this.repository.findActiveForBeneficiary(beneficiaryId);
    if (!episode) {
      const error = new Error('لا توجد حلقة علاجية نشطة لهذا المستفيد');
      error.statusCode = 404;
      throw error;
    }
    return episode;
  }

  async getAllForBeneficiary(beneficiaryId, options) {
    return this.repository.findAllForBeneficiary(beneficiaryId, options);
  }

  async getByTherapist(therapistId, options) {
    return this.repository.findByTherapist(therapistId, options);
  }

  async getByPhase(phase, branchId) {
    return this.repository.findByPhase(phase, branchId);
  }

  async advancePhase(episodeId, userId) {
    const episode = await this.repository.model.findById(episodeId);
    if (!episode) {
      const error = new Error('الحلقة العلاجية غير موجودة');
      error.statusCode = 404;
      throw error;
    }
    const result = await episode.advancePhase(userId);
    this._invalidateCache();
    this.emit('phaseAdvanced', {
      episodeId,
      beneficiaryId: episode.beneficiaryId,
      newPhase: result.currentPhase,
    });
    return result;
  }

  async addTeamMember(episodeId, member) {
    const episode = await this.repository.model.findById(episodeId);
    if (!episode) {
      const error = new Error('الحلقة غير موجودة');
      error.statusCode = 404;
      throw error;
    }
    const result = await episode.addTeamMember(member);
    this._invalidateCache();
    this.emit('teamMemberAdded', { episodeId, member });
    return result;
  }

  async removeTeamMember(episodeId, userId) {
    const episode = await this.repository.model.findById(episodeId);
    if (!episode) {
      const error = new Error('الحلقة غير موجودة');
      error.statusCode = 404;
      throw error;
    }
    return episode.removeTeamMember(userId);
  }

  async suspendEpisode(episodeId, reason, userId) {
    const episode = await this.repository.model.findById(episodeId);
    if (!episode) {
      const error = new Error('الحلقة غير موجودة');
      error.statusCode = 404;
      throw error;
    }
    const result = await episode.suspend(reason, userId);
    this._invalidateCache();
    this.emit('episodeSuspended', { episodeId, reason });
    return result;
  }

  async resumeEpisode(episodeId, userId) {
    const episode = await this.repository.model.findById(episodeId);
    if (!episode) {
      const error = new Error('الحلقة غير موجودة');
      error.statusCode = 404;
      throw error;
    }
    const result = await episode.resume(userId);
    this._invalidateCache();
    this.emit('episodeResumed', { episodeId });
    return result;
  }

  async dischargeEpisode(episodeId, data) {
    const episode = await this.repository.model.findById(episodeId);
    if (!episode) {
      const error = new Error('الحلقة غير موجودة');
      error.statusCode = 404;
      throw error;
    }
    const result = await episode.discharge(data);
    this._invalidateCache();
    this.emit('episodeDischarged', {
      episodeId,
      beneficiaryId: episode.beneficiaryId,
      reason: data.reason,
    });
    return result;
  }

  async getStatistics(branchId) {
    return this.repository.getStatistics(branchId);
  }
}

// ─── Domain Module ────────────────────────────────────────────────────────────

class EpisodesDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'episodes',
      version: '2.0.0',
      description: 'الحلقات العلاجية — Episode of Care: مسارات التأهيل الموحدة',
      dependencies: ['core'],
    });
    this.repository = null;
    this.service = null;
  }

  async initialize() {
    this.repository = new EpisodeRepository();
    this.service = new EpisodeService(this.repository);

    this.addHealthCheck('episodes-collection', async () => {
      const count = await this.repository.count();
      return { status: 'healthy', totalEpisodes: count };
    });

    await super.initialize();
  }

  registerRoutes(router) {
    super.registerRoutes(router);
    const svc = this.service;

    // قائمة الحلقات
    router.get('/', async (req, res, next) => {
      try {
        const result = await svc.list({
          filter: {
            isDeleted: { $ne: true },
            ...(req.query.branchId && { branchId: req.query.branchId }),
          },
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          sort: { startDate: -1 },
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    // إحصائيات
    router.get('/statistics', async (req, res, next) => {
      try {
        const stats = await svc.getStatistics(req.query.branchId);
        res.json({ success: true, data: stats });
      } catch (e) {
        next(e);
      }
    });

    // حلقات مرحلة معينة
    router.get('/phase/:phase', async (req, res, next) => {
      try {
        const data = await svc.getByPhase(req.params.phase, req.query.branchId);
        res.json({ success: true, data, total: data.length });
      } catch (e) {
        next(e);
      }
    });

    // حلقات أخصائي
    router.get('/therapist/:therapistId', async (req, res, next) => {
      try {
        const result = await svc.getByTherapist(req.params.therapistId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    // حلقات مستفيد
    router.get('/beneficiary/:beneficiaryId', async (req, res, next) => {
      try {
        const result = await svc.getAllForBeneficiary(req.params.beneficiaryId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    // الحلقة النشطة لمستفيد
    router.get('/beneficiary/:beneficiaryId/active', async (req, res, next) => {
      try {
        const episode = await svc.getActiveEpisode(req.params.beneficiaryId);
        res.json({ success: true, data: episode });
      } catch (e) {
        next(e);
      }
    });

    // حلقة واحدة
    router.get('/:id', async (req, res, next) => {
      try {
        const episode = await svc.getById(req.params.id, {
          populate: [
            {
              path: 'beneficiaryId',
              select: 'firstName lastName fullNameArabic mrn disability status',
            },
            { path: 'leadTherapistId', select: 'firstName lastName' },
            { path: 'careTeam.userId', select: 'firstName lastName' },
          ],
        });
        res.json({ success: true, data: episode });
      } catch (e) {
        next(e);
      }
    });

    // إنشاء حلقة
    router.post('/', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id, branchId: req.user?.branchId };
        const episode = await svc.create(req.body, context);
        res.status(201).json({ success: true, data: episode });
      } catch (e) {
        next(e);
      }
    });

    // تحديث حلقة
    router.put('/:id', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id };
        const updated = await svc.update(req.params.id, req.body, context);
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    });

    // تقدم المرحلة
    router.post('/:id/advance-phase', async (req, res, next) => {
      try {
        const result = await svc.advancePhase(req.params.id, req.user?._id);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    // إضافة عضو للفريق
    router.post('/:id/team', async (req, res, next) => {
      try {
        const result = await svc.addTeamMember(req.params.id, req.body);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    // إزالة عضو من الفريق
    router.delete('/:id/team/:userId', async (req, res, next) => {
      try {
        const result = await svc.removeTeamMember(req.params.id, req.params.userId);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    // تعليق الحلقة
    router.post('/:id/suspend', async (req, res, next) => {
      try {
        const result = await svc.suspendEpisode(req.params.id, req.body.reason, req.user?._id);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    // استئناف الحلقة
    router.post('/:id/resume', async (req, res, next) => {
      try {
        const result = await svc.resumeEpisode(req.params.id, req.user?._id);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    // خروج / إنهاء الحلقة
    router.post('/:id/discharge', async (req, res, next) => {
      try {
        const result = await svc.dischargeEpisode(req.params.id, {
          ...req.body,
          dischargedBy: req.user?._id,
        });
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });
  }
}

module.exports = new EpisodesDomain();
