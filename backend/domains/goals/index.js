/**
 * Goals & Measures Domain — نطاق الأهداف والمقاييس
 * @module domains/goals
 */

const { BaseDomainModule } = require('../_base/BaseDomainModule');
const { BaseRepository } = require('../_base/BaseRepository');
const { BaseService } = require('../_base/BaseService');
const { TherapeuticGoal } = require('./models/TherapeuticGoal');
const { Measure } = require('./models/Measure');
require('./models/MeasureApplication'); // Register MeasureApplication model
const measuresRoutes = require('./routes/measures.routes');
const logger = require('../../utils/logger');

// ─── Goal Repository ──────────────────────────────────────────────────────────

class GoalRepository extends BaseRepository {
  constructor() {
    super(TherapeuticGoal, { softDelete: true, deletedField: 'isDeleted' });
  }

  async findForBeneficiary(beneficiaryId, options = {}) {
    return this.findPaginated({
      filter: { beneficiaryId, isDeleted: { $ne: true } },
      page: options.page || 1,
      limit: options.limit || 30,
      sort: { priority: 1, createdAt: -1 },
      populate: [{ path: 'assignedTo', select: 'firstName lastName' }],
    });
  }

  async findForEpisode(episodeId) {
    return this.model
      .find({ episodeId, isDeleted: { $ne: true } })
      .sort({ type: 1, priority: 1 })
      .populate('assignedTo', 'firstName lastName')
      .lean({ virtuals: true });
  }

  async getGoalTree(beneficiaryId, episodeId) {
    return TherapeuticGoal.getGoalTree(beneficiaryId, episodeId);
  }

  async getStatistics(filter) {
    return TherapeuticGoal.getStatistics(filter);
  }

  async getOverdue(branchId) {
    const match = {
      isDeleted: { $ne: true },
      status: 'active',
      targetDate: { $lt: new Date() },
    };
    if (branchId) match.branchId = branchId;
    return this.model
      .find(match)
      .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
      .populate('assignedTo', 'firstName lastName')
      .sort({ targetDate: 1 })
      .lean({ virtuals: true });
  }
}

// ─── Measure Repository ───────────────────────────────────────────────────────

class MeasureRepository extends BaseRepository {
  constructor() {
    super(Measure, { softDelete: true, deletedField: 'isDeleted' });
  }

  async findApplicable(ageInMonths, disabilityType, category) {
    return Measure.findApplicable(ageInMonths, disabilityType, category);
  }

  async findByCategory(category) {
    return this.model
      .find({ category, status: 'active', isDeleted: { $ne: true } })
      .sort({ name: 1 })
      .lean();
  }

  async findByCode(code) {
    return this.model.findOne({ code, isDeleted: { $ne: true } }).lean();
  }
}

// ─── Goal Service ─────────────────────────────────────────────────────────────

class GoalService extends BaseService {
  constructor(repository) {
    super(repository, { name: 'GoalService', cache: { enabled: true, ttl: 60 } });
  }

  async beforeCreate(data, context) {
    if (context.userId) {
      data.createdBy = context.userId;
      data.assignedTo = data.assignedTo || context.userId;
    }
    if (context.branchId) data.branchId = context.branchId;
  }

  async afterCreate(entity) {
    logger.info(
      `[GoalService] Goal ${entity.goalNumber} created for beneficiary ${entity.beneficiaryId}`
    );
    this.emit('goalCreated', { goalId: entity._id, beneficiaryId: entity.beneficiaryId });
  }

  async getForBeneficiary(beneficiaryId, options) {
    return this.repository.findForBeneficiary(beneficiaryId, options);
  }

  async getForEpisode(episodeId) {
    return this.repository.findForEpisode(episodeId);
  }

  async getGoalTree(beneficiaryId, episodeId) {
    return this.repository.getGoalTree(beneficiaryId, episodeId);
  }

  async getStatistics(filter) {
    return this.repository.getStatistics(filter);
  }

  async getOverdue(branchId) {
    return this.repository.getOverdue(branchId);
  }

  async recordProgress(goalId, entry) {
    const goal = await this.repository.model.findById(goalId);
    if (!goal) {
      const e = new Error('الهدف غير موجود');
      e.statusCode = 404;
      throw e;
    }
    const result = await goal.recordProgress(entry);
    this._invalidateCache();
    this.emit('progressRecorded', { goalId, entry });
    return result;
  }

  async achieveGoal(goalId, userId) {
    const result = await this.repository.updateById(goalId, {
      status: 'achieved',
      currentProgress: 100,
      achievedDate: new Date(),
      lastModifiedBy: userId,
    });
    this._invalidateCache();
    this.emit('goalAchieved', { goalId });
    return result;
  }
}

// ─── Measure Service ──────────────────────────────────────────────────────────

class MeasureService extends BaseService {
  constructor(repository) {
    super(repository, { name: 'MeasureService', cache: { enabled: true, ttl: 300 } });
  }

  async getApplicable(ageInMonths, disabilityType, category) {
    return this.repository.findApplicable(ageInMonths, disabilityType, category);
  }

  async getByCategory(category) {
    return this.repository.findByCategory(category);
  }

  async getByCode(code) {
    return this.repository.findByCode(code);
  }
}

// ─── Domain Module ────────────────────────────────────────────────────────────

class GoalsDomain extends BaseDomainModule {
  constructor() {
    super({
      name: 'goals',
      version: '2.0.0',
      description: 'الأهداف العلاجية ومكتبة المقاييس — SMART Goals + Measures Library',
      dependencies: ['core', 'episodes'],
    });
  }

  async initialize() {
    this.goalRepository = new GoalRepository();
    this.goalService = new GoalService(this.goalRepository);
    this.measureRepository = new MeasureRepository();
    this.measureService = new MeasureService(this.measureRepository);

    this.addHealthCheck('goals-collection', async () => {
      const goalCount = await this.goalRepository.count();
      const measureCount = await this.measureRepository.count();
      return { status: 'healthy', totalGoals: goalCount, totalMeasures: measureCount };
    });

    await super.initialize();
  }

  registerRoutes(router) {
    super.registerRoutes(router);

    // Advanced Measures Library routes (apply, history, scoring, recommendations)
    router.use('/', measuresRoutes);

    const goalSvc = this.goalService;
    const measureSvc = this.measureService;

    // ── Goals Routes ──────────────────────────────────────────────────

    router.get('/goals', async (req, res, next) => {
      try {
        const result = await goalSvc.list({
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          sort: { createdAt: -1 },
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/statistics', async (req, res, next) => {
      try {
        const stats = await goalSvc.getStatistics(req.query);
        res.json({ success: true, data: stats });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/overdue', async (req, res, next) => {
      try {
        const data = await goalSvc.getOverdue(req.query.branchId);
        res.json({ success: true, data, total: data.length });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/beneficiary/:beneficiaryId', async (req, res, next) => {
      try {
        const result = await goalSvc.getForBeneficiary(req.params.beneficiaryId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/beneficiary/:beneficiaryId/tree', async (req, res, next) => {
      try {
        const tree = await goalSvc.getGoalTree(req.params.beneficiaryId, req.query.episodeId);
        res.json({ success: true, data: tree });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/episode/:episodeId', async (req, res, next) => {
      try {
        const data = await goalSvc.getForEpisode(req.params.episodeId);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/:id', async (req, res, next) => {
      try {
        const data = await goalSvc.getById(req.params.id, {
          populate: [
            { path: 'beneficiaryId', select: 'firstName lastName fullNameArabic mrn' },
            { path: 'assignedTo', select: 'firstName lastName' },
            { path: 'parentGoalId', select: 'title status' },
            { path: 'childGoals' },
          ],
        });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.post('/goals', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id, branchId: req.user?.branchId };
        const goal = await goalSvc.create(req.body, context);
        res.status(201).json({ success: true, data: goal });
      } catch (e) {
        next(e);
      }
    });

    router.put('/goals/:id', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id };
        const updated = await goalSvc.update(req.params.id, req.body, context);
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    });

    router.post('/goals/:id/progress', async (req, res, next) => {
      try {
        const entry = { ...req.body, recordedBy: req.user?._id, date: new Date() };
        const result = await goalSvc.recordProgress(req.params.id, entry);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    router.post('/goals/:id/achieve', async (req, res, next) => {
      try {
        const result = await goalSvc.achieveGoal(req.params.id, req.user?._id);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    // ── Measures Routes ───────────────────────────────────────────────

    router.get('/measures', async (req, res, next) => {
      try {
        const result = await measureSvc.list({
          filter: { status: 'active', isDeleted: { $ne: true } },
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 50,
          sort: { category: 1, name: 1 },
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/measures/applicable', async (req, res, next) => {
      try {
        const { ageInMonths, disabilityType, category } = req.query;
        const data = await measureSvc.getApplicable(
          parseInt(ageInMonths),
          disabilityType,
          category
        );
        res.json({ success: true, data, total: data.length });
      } catch (e) {
        next(e);
      }
    });

    router.get('/measures/category/:category', async (req, res, next) => {
      try {
        const data = await measureSvc.getByCategory(req.params.category);
        res.json({ success: true, data, total: data.length });
      } catch (e) {
        next(e);
      }
    });

    router.get('/measures/code/:code', async (req, res, next) => {
      try {
        const data = await measureSvc.getByCode(req.params.code);
        if (!data) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.get('/measures/:id', async (req, res, next) => {
      try {
        const data = await measureSvc.getById(req.params.id);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.post('/measures', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id };
        const measure = await measureSvc.create(req.body, context);
        res.status(201).json({ success: true, data: measure });
      } catch (e) {
        next(e);
      }
    });

    router.put('/measures/:id', async (req, res, next) => {
      try {
        const context = { userId: req.user?._id };
        const updated = await measureSvc.update(req.params.id, req.body, context);
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    });
  }
}

module.exports = new GoalsDomain();
