/**
 * Assessments Domain — نطاق التقييمات السريرية
 * @module domains/assessments
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { BaseRepository } = require('../_base/BaseRepository');
const { BaseService } = require('../_base/BaseService');
const { ClinicalAssessment } = require('./models/ClinicalAssessment');
const logger = require('../../utils/logger');

class AssessmentRepository extends BaseRepository {
  constructor() {
    super(ClinicalAssessment, { softDelete: true, deletedField: 'isDeleted' });
  }

  async findForBeneficiary(beneficiaryId, options = {}) {
    return this.findPaginated({
      filter: { beneficiaryId, isDeleted: { $ne: true } },
      page: options.page || 1,
      limit: options.limit || 20,
      sort: { assessmentDate: -1 },
      populate: [
        { path: 'assessorId', select: 'firstName lastName' },
        { path: 'measureId', select: 'name name_ar' },
      ],
    });
  }

  async findForEpisode(episodeId) {
    return this.model
      .find({ episodeId, isDeleted: { $ne: true } })
      .sort({ assessmentDate: -1 })
      .populate('assessorId', 'firstName lastName')
      .lean({ virtuals: true });
  }

  async getTrend(beneficiaryId, episodeId, options) {
    return ClinicalAssessment.getTrendForBeneficiary(beneficiaryId, episodeId, options);
  }

  async getOverdue(branchId) {
    return ClinicalAssessment.getOverdueAssessments(branchId);
  }
}

class AssessmentService extends BaseService {
  constructor(repository) {
    super(repository, { name: 'AssessmentService', cache: { enabled: true, ttl: 60 } });
  }

  async beforeCreate(data, context) {
    if (context.userId) {
      data.createdBy = context.userId;
      data.assessorId = data.assessorId || context.userId;
    }
    if (context.branchId) data.branchId = context.branchId;

    // Fetch previous assessment for trend
    const [previous] = await this.repository.model
      .find({
        beneficiaryId: data.beneficiaryId,
        isDeleted: { $ne: true },
      })
      .sort({ assessmentDate: -1 })
      .limit(1)
      .select('totalScore')
      .lean();

    if (previous) {
      data.previousScore = previous.totalScore;
    }
  }

  async afterCreate(entity, _context) {
    logger.info(
      `[AssessmentService] Assessment ${entity.assessmentNumber} created for beneficiary ${entity.beneficiaryId}`
    );
    this.emit('assessmentCreated', {
      assessmentId: entity._id,
      beneficiaryId: entity.beneficiaryId,
      episodeId: entity.episodeId,
    });
  }

  async getForBeneficiary(beneficiaryId, options) {
    return this.repository.findForBeneficiary(beneficiaryId, options);
  }

  async getForEpisode(episodeId) {
    return this.repository.findForEpisode(episodeId);
  }

  async getTrend(beneficiaryId, episodeId, options) {
    return this.repository.getTrend(beneficiaryId, episodeId, options);
  }

  async getOverdue(branchId) {
    return this.repository.getOverdue(branchId);
  }

  async approve(assessmentId, reviewerId, reviewNotes) {
    const result = await this.repository.updateById(assessmentId, {
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes,
      completedDate: new Date(),
    });
    this._invalidateCache();
    this.emit('assessmentApproved', { assessmentId });
    return result;
  }
}

class AssessmentsDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'assessments',
      version: '2.0.0',
      description: 'التقييمات السريرية — تقييمات موحدة مرتبطة بالمستفيد والحلقة',
      dependencies: ['core', 'episodes'],
    });
  }

  async initialize() {
    this.repository = new AssessmentRepository();
    this.service = new AssessmentService(this.repository);
    this.addHealthCheck('assessments-collection', async () => {
      const count = await this.repository.count();
      return { status: 'healthy', totalAssessments: count };
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
          sort: { assessmentDate: -1 },
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/overdue', async (req, res, next) => {
      try {
        const data = await svc.getOverdue(req.query.branchId);
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

    router.get('/beneficiary/:beneficiaryId/trend', async (req, res, next) => {
      try {
        const data = await svc.getTrend(req.params.beneficiaryId, req.query.episodeId, req.query);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.get('/episode/:episodeId', async (req, res, next) => {
      try {
        const data = await svc.getForEpisode(req.params.episodeId);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.get('/:id', async (req, res, next) => {
      try {
        const data = await svc.getById(req.params.id, {
          populate: [
            { path: 'beneficiaryId', select: 'firstName lastName fullNameArabic mrn' },
            { path: 'assessorId', select: 'firstName lastName' },
            { path: 'reviewedBy', select: 'firstName lastName' },
            { path: 'goalAlignment.goalId', select: 'title status targetValue' },
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
        const assessment = await svc.create(req.body, context);
        res.status(201).json({ success: true, data: assessment });
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

    router.post('/:id/approve', async (req, res, next) => {
      try {
        const result = await svc.approve(req.params.id, req.user?._id, req.body.reviewNotes);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });
  }
}

module.exports = new AssessmentsDomain();
