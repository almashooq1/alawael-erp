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
const {
  effectiveBranchScope,
  enforceBeneficiaryBranch,
  assertBranchMatch,
} = require('../../middleware/assertBranchMatch');
const { branchFilter } = require('../../middleware/branchScope.middleware');

// W1569 — server-owned fields a POST/PUT /goals caller must NOT self-set on the
// canonical TherapeuticGoal (branchId → server-derived; goalNumber/progress/audit →
// server-managed; achieved state via the /achieve endpoint).
const GOAL_PROTECTED_FIELDS = new Set([
  '_id',
  'branchId',
  'goalNumber',
  'createdBy',
  'lastModifiedBy',
  'currentProgress',
  'achievedDate',
  'isDeleted',
]);
function stripGoalFields(body) {
  if (!body || typeof body !== 'object') return {};
  const clean = {};
  for (const k of Object.keys(body)) {
    if (!GOAL_PROTECTED_FIELDS.has(k)) clean[k] = body[k];
  }
  return clean;
}

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

  async findForEpisode(episodeId, branchScope = {}) {
    return this.model
      .find({ episodeId, isDeleted: { $ne: true }, ...branchScope })
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
    this.emit('goal.created', {
      goalId: entity._id,
      beneficiaryId: entity.beneficiaryId,
      episodeId: entity.episodeId,
      goalNumber: entity.goalNumber,
    });
  }

  async getForBeneficiary(beneficiaryId, options) {
    return this.repository.findForBeneficiary(beneficiaryId, options);
  }

  async getForEpisode(episodeId, branchScope = {}) {
    return this.repository.findForEpisode(episodeId, branchScope);
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
    // W380: canonical contract event (was ad-hoc 'goalAchieved' pre-W380).
    // Envelope per GOAL_EVENTS.ACHIEVED. result is the updated doc; falls back
    // gracefully if some fields are absent.
    this.emit('goal.achieved', {
      goalId,
      beneficiaryId: result?.beneficiaryId,
      goalType: result?.domain || result?.category,
      achievementDate: result?.achievedDate || new Date(),
    });
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
          filter: { ...branchFilter(req), isDeleted: { $ne: true } },
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
        const stats = await goalSvc.getStatistics({
          beneficiaryId: req.query.beneficiaryId,
          episodeId: req.query.episodeId,
          branchId: effectiveBranchScope(req) || req.query.branchId,
        });
        res.json({ success: true, data: stats });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/overdue', async (req, res, next) => {
      try {
        const data = await goalSvc.getOverdue(effectiveBranchScope(req) || req.query.branchId);
        res.json({ success: true, data, total: data.length });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/beneficiary/:beneficiaryId', async (req, res, next) => {
      try {
        await enforceBeneficiaryBranch(req, req.params.beneficiaryId);
        const result = await goalSvc.getForBeneficiary(req.params.beneficiaryId, req.query);
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/beneficiary/:beneficiaryId/tree', async (req, res, next) => {
      try {
        await enforceBeneficiaryBranch(req, req.params.beneficiaryId);
        const tree = await goalSvc.getGoalTree(req.params.beneficiaryId, req.query.episodeId);
        res.json({ success: true, data: tree });
      } catch (e) {
        next(e);
      }
    });

    router.get('/goals/episode/:episodeId', async (req, res, next) => {
      try {
        const data = await goalSvc.getForEpisode(req.params.episodeId, branchFilter(req));
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
        if (!data) {
          const e = new Error('الهدف غير موجود');
          e.statusCode = 404;
          throw e;
        }
        assertBranchMatch(req, data.branchId, 'goal');
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    });

    router.post('/goals', async (req, res, next) => {
      try {
        // W1569 — server-derived branch (req.user.branchId is never populated) +
        // mass-assignment strip on the raw body.
        const context = { userId: req.user?._id, branchId: effectiveBranchScope(req) };
        const goal = await goalSvc.create(stripGoalFields(req.body), context);
        res.status(201).json({ success: true, data: goal });
      } catch (e) {
        next(e);
      }
    });

    router.put('/goals/:id', async (req, res, next) => {
      try {
        const existing = await goalSvc.getById(req.params.id);
        if (!existing) {
          const e = new Error('الهدف غير موجود');
          e.statusCode = 404;
          throw e;
        }
        assertBranchMatch(req, existing.branchId, 'goal');
        const context = { userId: req.user?._id };
        const updated = await goalSvc.update(req.params.id, stripGoalFields(req.body), context);
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    });

    router.post('/goals/:id/progress', async (req, res, next) => {
      try {
        const existing = await goalSvc.getById(req.params.id);
        if (!existing) {
          const e = new Error('الهدف غير موجود');
          e.statusCode = 404;
          throw e;
        }
        assertBranchMatch(req, existing.branchId, 'goal');
        const entry = { ...req.body, recordedBy: req.user?._id, date: new Date() };
        const result = await goalSvc.recordProgress(req.params.id, entry);
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    });

    router.post('/goals/:id/achieve', async (req, res, next) => {
      try {
        const existingGoal = await goalSvc.getById(req.params.id);
        if (!existingGoal) {
          const e = new Error('الهدف غير موجود');
          e.statusCode = 404;
          throw e;
        }
        assertBranchMatch(req, existingGoal.branchId, 'goal');
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
