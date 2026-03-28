/**
 * CarePlan Service — خدمة خطط الرعاية
 *
 * Business logic for IEP (educational), therapeutic, and life-skills plans.
 * Each beneficiary may have one active CarePlan at a time.
 */

const CarePlan = require('../models/CarePlan');
const logger = require('../utils/logger');

class CarePlanService {
  /* ────────────────────────── CREATE ─────────────────────────── */

  /**
   * Create a new care plan for a beneficiary.
   * Auto-generates a plan number: CP-YYYY-NNNN
   */
  async create(data, userId) {
    // Ensure no duplicate active plan for same beneficiary
    const existing = await CarePlan.findOne({
      beneficiary: data.beneficiary,
      status: 'ACTIVE',
    });
    if (existing) {
      throw Object.assign(new Error('يوجد خطة رعاية نشطة بالفعل لهذا المستفيد'), { status: 409 });
    }

    // Generate plan number
    const year = new Date().getFullYear();
    const count = await CarePlan.countDocuments({
      planNumber: new RegExp(`^CP-${year}-`),
    });
    data.planNumber = `CP-${year}-${String(count + 1).padStart(4, '0')}`;
    data.createdBy = userId;

    const plan = await CarePlan.create(data);
    logger.info(`CarePlan created: ${plan.planNumber} for beneficiary ${data.beneficiary}`);
    return plan;
  }

  /* ────────────────────────── READ ───────────────────────────── */

  /**
   * List care plans with filtering, pagination, and populate.
   */
  async list(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      beneficiary,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (search) {
      filter.$or = [
        { planNumber: new RegExp(search, 'i') },
        { 'educational.domains.academic.notes': new RegExp(search, 'i') },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      CarePlan.find(filter)
        .populate('beneficiary', 'name fullName')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CarePlan.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single care plan by ID.
   */
  async getById(id) {
    const plan = await CarePlan.findById(id)
      .populate('beneficiary', 'name fullName email phone')
      .populate('educational.domains.academic.specialist', 'name fullName')
      .populate('educational.domains.classroom.specialist', 'name fullName')
      .populate('educational.domains.communication.specialist', 'name fullName')
      .populate('therapeutic.domains.speech.specialist', 'name fullName')
      .populate('therapeutic.domains.occupational.specialist', 'name fullName')
      .populate('therapeutic.domains.physical.specialist', 'name fullName')
      .populate('therapeutic.domains.behavioral.specialist', 'name fullName')
      .populate('therapeutic.domains.psychological.specialist', 'name fullName')
      .populate('lifeSkills.domains.selfCare.specialist', 'name fullName')
      .populate('lifeSkills.domains.homeSkills.specialist', 'name fullName')
      .populate('lifeSkills.domains.social.specialist', 'name fullName')
      .lean();

    if (!plan) {
      throw Object.assign(new Error('خطة الرعاية غير موجودة'), { status: 404 });
    }
    return plan;
  }

  /**
   * Get the active care plan for a beneficiary.
   */
  async getActivePlan(beneficiaryId) {
    const plan = await CarePlan.findOne({
      beneficiary: beneficiaryId,
      status: 'ACTIVE',
    })
      .populate('beneficiary', 'name fullName')
      .lean();

    if (!plan) {
      throw Object.assign(new Error('لا توجد خطة رعاية نشطة لهذا المستفيد'), { status: 404 });
    }
    return plan;
  }

  /* ────────────────────────── UPDATE ─────────────────────────── */

  /**
   * Update a care plan (only DRAFT or ACTIVE).
   */
  async update(id, data, userId) {
    const plan = await CarePlan.findById(id);
    if (!plan) {
      throw Object.assign(new Error('خطة الرعاية غير موجودة'), { status: 404 });
    }
    if (plan.status === 'ARCHIVED') {
      throw Object.assign(new Error('لا يمكن تعديل خطة مؤرشفة'), { status: 400 });
    }

    // Prevent changing beneficiary
    delete data.beneficiary;
    delete data.planNumber;

    Object.assign(plan, data);
    plan.updatedBy = userId;
    await plan.save();

    logger.info(`CarePlan updated: ${plan.planNumber} by user ${userId}`);
    return plan;
  }

  /**
   * Activate a DRAFT care plan.
   */
  async activate(id, userId) {
    const plan = await CarePlan.findById(id);
    if (!plan) {
      throw Object.assign(new Error('خطة الرعاية غير موجودة'), { status: 404 });
    }
    if (plan.status !== 'DRAFT') {
      throw Object.assign(new Error('يمكن تفعيل المسودات فقط'), { status: 400 });
    }

    // Deactivate any existing active plan for same beneficiary
    await CarePlan.updateMany(
      { beneficiary: plan.beneficiary, status: 'ACTIVE' },
      { $set: { status: 'ARCHIVED' } }
    );

    plan.status = 'ACTIVE';
    plan.activatedBy = userId;
    plan.activatedAt = new Date();
    await plan.save();

    logger.info(`CarePlan activated: ${plan.planNumber}`);
    return plan;
  }

  /**
   * Archive a care plan.
   */
  async archive(id, userId) {
    const plan = await CarePlan.findById(id);
    if (!plan) {
      throw Object.assign(new Error('خطة الرعاية غير موجودة'), { status: 404 });
    }

    plan.status = 'ARCHIVED';
    plan.archivedBy = userId;
    plan.archivedAt = new Date();
    await plan.save();

    logger.info(`CarePlan archived: ${plan.planNumber}`);
    return plan;
  }

  /* ────────────────────────── DELETE ─────────────────────────── */

  /**
   * Soft-delete — archive. Hard-delete only for DRAFT.
   */
  async delete(id) {
    const plan = await CarePlan.findById(id);
    if (!plan) {
      throw Object.assign(new Error('خطة الرعاية غير موجودة'), { status: 404 });
    }
    if (plan.status !== 'DRAFT') {
      throw Object.assign(new Error('يمكن حذف المسودات فقط — أرشف الخطط النشطة بدلاً من ذلك'), {
        status: 400,
      });
    }

    await CarePlan.findByIdAndDelete(id);
    logger.info(`CarePlan deleted: ${plan.planNumber}`);
    return { message: 'تم حذف خطة الرعاية بنجاح' };
  }

  /* ────────────────────────── STATS ──────────────────────────── */

  /**
   * Dashboard statistics for care plans.
   */
  async getStatistics() {
    const [statusCounts, recentPlans, needReview] = await Promise.all([
      CarePlan.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CarePlan.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('beneficiary', 'name fullName')
        .lean(),
      CarePlan.countDocuments({
        status: 'ACTIVE',
        reviewDate: { $lte: new Date() },
      }),
    ]);

    const stats = { DRAFT: 0, ACTIVE: 0, ARCHIVED: 0 };
    statusCounts.forEach(s => {
      stats[s._id] = s.count;
    });

    return {
      total: stats.DRAFT + stats.ACTIVE + stats.ARCHIVED,
      ...stats,
      needReview,
      recentPlans,
    };
  }

  /**
   * Update goal progress within a care plan.
   */
  async updateGoalProgress(planId, sectionPath, goalIndex, progress) {
    const plan = await CarePlan.findById(planId);
    if (!plan) {
      throw Object.assign(new Error('خطة الرعاية غير موجودة'), { status: 404 });
    }

    // sectionPath e.g. "educational.domains.academic"
    const parts = sectionPath.split('.');
    let section = plan;
    for (const part of parts) {
      section = section[part];
      if (!section) {
        throw Object.assign(new Error(`القسم غير موجود: ${sectionPath}`), { status: 400 });
      }
    }

    if (!section.goals || !section.goals[goalIndex]) {
      throw Object.assign(new Error('الهدف غير موجود'), { status: 400 });
    }

    section.goals[goalIndex].progress = Math.min(100, Math.max(0, progress));
    if (progress >= 100) {
      section.goals[goalIndex].status = 'ACHIEVED';
    } else if (progress > 0) {
      section.goals[goalIndex].status = 'IN_PROGRESS';
    }

    await plan.save();
    logger.info(`CarePlan ${plan.planNumber}: goal [${sectionPath}][${goalIndex}] → ${progress}%`);
    return plan;
  }
}

module.exports = new CarePlanService();
