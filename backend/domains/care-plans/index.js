/**
 * Care Plans Domain — نطاق خطط الرعاية
 * @module domains/care-plans
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { BaseRepository } = require('../_base/BaseRepository');
const { BaseService } = require('../_base/BaseService');
const { UnifiedCarePlan } = require('./models/UnifiedCarePlan');
const logger = require('../../utils/logger');

class CarePlanRepository extends BaseRepository {
  constructor() {
    super(UnifiedCarePlan, { softDelete: true, deletedField: 'isDeleted' });
  }

  async findForBeneficiary(beneficiaryId, options = {}) {
    return this.findPaginated({
      filter: { beneficiaryId, isDeleted: { $ne: true } },
      page: options.page || 1,
      limit: options.limit || 10,
      sort: { createdAt: -1 },
    });
  }

  async findActiveForEpisode(episodeId) {
    return UnifiedCarePlan.getActiveForEpisode(episodeId);
  }

  async getOverdueReviews(branchId) {
    return UnifiedCarePlan.getOverdueReviews(branchId);
  }
}

class CarePlanService extends BaseService {
  constructor(repository) {
    super(repository, { name: 'CarePlanService', cache: { enabled: true, ttl: 60 } });
  }

  async beforeCreate(data, context) {
    if (context.userId) {
      data.createdBy = context.userId;
      data.lastModifiedBy = context.userId;
    }
    if (context.branchId) data.branchId = context.branchId;
  }

  async afterCreate(entity, _context) {
    logger.info(
      `[CarePlanService] Plan ${entity.planNumber} created for beneficiary ${entity.beneficiaryId}`
    );
    this.emit('carePlanCreated', {
      planId: entity._id,
      beneficiaryId: entity.beneficiaryId,
      episodeId: entity.episodeId,
    });
  }

  async getForBeneficiary(beneficiaryId, options) {
    return this.repository.findForBeneficiary(beneficiaryId, options);
  }

  async getActiveForEpisode(episodeId) {
    return this.repository.findActiveForEpisode(episodeId);
  }

  async getOverdueReviews(branchId) {
    return this.repository.getOverdueReviews(branchId);
  }

  async approve(planId, userId, comments) {
    const result = await this.repository.updateById(planId, {
      status: 'active',
      approvedBy: userId,
      approvedAt: new Date(),
      $push: { approvals: { userId, status: 'approved', date: new Date(), comments } },
    });
    this._invalidateCache();
    this.emit('carePlanApproved', { planId });
    return result;
  }

  async addReview(planId, reviewData) {
    const plan = await this.repository.model.findById(planId);
    if (!plan) {
      const e = new Error('الخطة غير موجودة');
      e.statusCode = 404;
      throw e;
    }
    plan.reviews.push(reviewData);
    if (reviewData.nextReviewDate) plan.nextReviewDate = reviewData.nextReviewDate;
    plan.status = reviewData.decision === 'discharge' ? 'completed' : 'active';
    const result = await plan.save();
    this._invalidateCache();
    this.emit('carePlanReviewed', { planId, decision: reviewData.decision });
    return result;
  }
}

class CarePlansDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'care-plans',
      version: '2.0.0',
      description: 'خطط الرعاية الموحدة — تعليمية وعلاجية ومهارات حياتية',
      dependencies: ['core', 'episodes'],
    });
  }

  async initialize() {
    this.repository = new CarePlanRepository();
    this.service = new CarePlanService(this.repository);
    this.addHealthCheck('care-plans-collection', async () => {
      const count = await this.repository.count();
      return { status: 'healthy', totalPlans: count };
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
          sort: { createdAt: -1 },
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/overdue-reviews', async (req, res, next) => {
      try {
        const data = await svc.getOverdueReviews(req.query.branchId);
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

    router.get('/episode/:episodeId/active', async (req, res, next) => {
      try {
        const plan = await svc.getActiveForEpisode(req.params.episodeId);
        res.json({ success: true, data: plan });
      } catch (e) {
        next(e);
      }
    });

    router.get('/:id', async (req, res, next) => {
      try {
        const data = await svc.getById(req.params.id, {
          populate: [
            { path: 'beneficiaryId', select: 'firstName lastName fullNameArabic mrn' },
            { path: 'approvedBy', select: 'firstName lastName' },
            { path: 'createdBy', select: 'firstName lastName' },
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
        const plan = await svc.create(req.body, context);
        res.status(201).json({ success: true, data: plan });
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
        const r = await svc.approve(req.params.id, req.user?._id, req.body.comments);
        res.json({ success: true, data: r });
      } catch (e) {
        next(e);
      }
    });

    router.post('/:id/review', async (req, res, next) => {
      try {
        const r = await svc.addReview(req.params.id, { ...req.body, reviewedBy: req.user?._id });
        res.json({ success: true, data: r });
      } catch (e) {
        next(e);
      }
    });
  }
}

module.exports = new CarePlansDomain();
