'use strict';

/**
 * Measures Library Service — خدمة مكتبة المقاييس الموحدة
 * ══════════════════════════════════════════════════════════════════
 * مكتبة مركزية لأدوات التقييم السريري المعتمدة.
 * تربط كل مقياس بـ:
 *  - التخصص العلاجي (rehabilitation discipline)
 *  - الفئة العمرية والجمهور المستهدف
 *  - الاستخدام الفعلي (ClinicalAssessment records)
 *  - معايير التسجيل والتفسير
 * ══════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Lazy model loaders ────────────────────────────────────────────
const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  MeasureRevision: () => {
    try {
      return mongoose.model('MeasureRevision');
    } catch {
      try {
        require('../domains/goals/models/MeasureRevision');
        return mongoose.model('MeasureRevision');
      } catch {
        return null;
      }
    }
  },
  Assessment: () => {
    try {
      return mongoose.model('ClinicalAssessment');
    } catch {
      return null;
    }
  },
  Beneficiary: () => {
    try {
      return mongoose.model('Beneficiary');
    } catch {
      return null;
    }
  },
};

async function safeQuery(modelFn, queryFn, fallback = []) {
  const Model = modelFn();
  if (!Model) return fallback;
  try {
    return await queryFn(Model);
  } catch (err) {
    logger.warn('[MeasuresLibrary] query failed: %s', err.message);
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════════════
class MeasuresLibrarySvc {
  // ───────────────────────────────────────────────────────────────
  // 1. LIST — قائمة المقاييس
  // ───────────────────────────────────────────────────────────────

  async list({
    page = 1,
    limit = 20,
    search = '',
    category = '',
    type = '',
    targetPopulation = '',
    isActive = '',
    sort = 'name',
  } = {}) {
    const Measure = M.Measure();
    if (!Measure) return { items: [], total: 0, page, limit };

    const filter = {};
    if (isActive === 'true' || isActive === true) filter.isActive = true;
    else if (isActive === 'false' || isActive === false) filter.isActive = false;
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (targetPopulation) filter.targetPopulation = targetPopulation;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { name_ar: rx }, { code: rx }, { abbreviation: rx }];
    }

    const [items, total] = await Promise.all([
      Measure.find(filter)
        .select(
          'code name name_ar abbreviation category type targetPopulation ageRange scoringType isActive usageCount createdAt'
        )
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .catch(() => []),
      Measure.countDocuments(filter).catch(() => 0),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ───────────────────────────────────────────────────────────────
  // 2. GET ONE — تفاصيل مقياس
  // ───────────────────────────────────────────────────────────────

  async getOne(id) {
    const Measure = M.Measure();
    if (!Measure) return null;

    // support both _id and code
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { code: id };

    const measure = await Measure.findOne(filter)
      .lean()
      .catch(() => null);
    if (!measure) return null;

    // Usage stats
    const usageStats = await safeQuery(
      M.Assessment,
      m =>
        m
          .aggregate([
            { $match: { tool: measure.code } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                avgScore: { $avg: '$score' },
                lastUsed: { $max: '$createdAt' },
              },
            },
          ])
          .catch(() => []),
      []
    );

    return {
      ...measure,
      usageStats: usageStats[0] || { total: 0, avgScore: null, lastUsed: null },
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 3. CREATE — إضافة مقياس جديد
  // ───────────────────────────────────────────────────────────────

  async create(data, actorId) {
    const Measure = M.Measure();
    if (!Measure) throw new Error('Measure model unavailable');

    // تحقق من عدم تكرار الكود
    const exists = await Measure.findOne({ code: data.code })
      .lean()
      .catch(() => null);
    if (exists) throw new Error(`كود المقياس '${data.code}' موجود بالفعل`);

    const doc = new Measure({ ...data, createdBy: actorId });
    await doc.save();

    // W210: write a 'create' revision (post-save hook only handles edits)
    const MeasureRevision = M.MeasureRevision();
    if (MeasureRevision) {
      try {
        await MeasureRevision.create({
          measureCode: doc.code,
          toVersion: doc.version || null,
          changeType: 'create',
          revisedBy: actorId || null,
          revisedAt: new Date(),
        });
      } catch (err) {
        logger.warn('[MeasuresLibrary] revision write failed on create: %s', err.message);
      }
    }
    return doc.toObject();
  }

  // ───────────────────────────────────────────────────────────────
  // W210: Lifecycle — publish / deprecate / retire
  // ───────────────────────────────────────────────────────────────

  async publish(id, actorId) {
    const Measure = M.Measure();
    if (!Measure) throw new Error('Measure model unavailable');
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { code: id };
    const doc = await Measure.findOne(filter);
    if (!doc) return null;
    await doc.publish(actorId);
    return doc.toObject();
  }

  async deprecate(id, actorId, { supersededBy, reason } = {}) {
    const Measure = M.Measure();
    if (!Measure) throw new Error('Measure model unavailable');
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { code: id };
    const doc = await Measure.findOne(filter);
    if (!doc) return null;
    await doc.deprecate(actorId, { supersededBy, reason });
    return doc.toObject();
  }

  async retire(id, actorId, { reason } = {}) {
    const Measure = M.Measure();
    if (!Measure) throw new Error('Measure model unavailable');
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { code: id };
    const doc = await Measure.findOne(filter);
    if (!doc) return null;
    await doc.retire(actorId, { reason });
    return doc.toObject();
  }

  // ───────────────────────────────────────────────────────────────
  // W210: Eligibility — for Smart Engine + UI selectors
  // ───────────────────────────────────────────────────────────────

  async eligibleFor(beneficiary, opts = {}) {
    const Measure = M.Measure();
    if (!Measure) return [];
    return Measure.findEligibleFor(beneficiary, opts);
  }

  async listRevisions(measureCode, { limit = 50 } = {}) {
    const MeasureRevision = M.MeasureRevision();
    if (!MeasureRevision) return [];
    return MeasureRevision.find({ measureCode })
      .sort({ revisedAt: -1 })
      .limit(limit)
      .lean()
      .catch(() => []);
  }

  async dueForReview() {
    const Measure = M.Measure();
    if (!Measure) return [];
    return Measure.findDueForReview();
  }

  // ───────────────────────────────────────────────────────────────
  // 4. UPDATE — تحديث مقياس
  // ───────────────────────────────────────────────────────────────

  async update(id, data, actorId) {
    const Measure = M.Measure();
    if (!Measure) throw new Error('Measure model unavailable');

    const FORBIDDEN = ['code', '_id', 'createdBy', 'createdAt'];
    FORBIDDEN.forEach(k => delete data[k]);
    data.updatedBy = actorId;

    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { code: id };
    return Measure.findOneAndUpdate(filter, { $set: data }, { new: true }).lean();
  }

  // ───────────────────────────────────────────────────────────────
  // 5. DASHBOARD — إحصائيات المكتبة
  // ───────────────────────────────────────────────────────────────

  async getDashboard() {
    const Measure = M.Measure();
    if (!Measure) return this._emptyDashboard();

    const [total, active, byCategory, byType, recentlyAdded, mostUsed] = await Promise.all([
      Measure.countDocuments({}).catch(() => 0),
      Measure.countDocuments({ isActive: true }).catch(() => 0),
      Measure.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).catch(() => []),
      Measure.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).catch(() => []),
      Measure.find({})
        .select('code name name_ar category isActive createdAt')
        .sort('-createdAt')
        .limit(8)
        .lean()
        .catch(() => []),
      Measure.find({})
        .select('code name name_ar category usageCount')
        .sort('-usageCount')
        .limit(10)
        .lean()
        .catch(() => []),
    ]);

    // Assessment usage totals
    const assessmentUsage = await safeQuery(
      M.Assessment,
      m =>
        m
          .aggregate([
            { $group: { _id: '$tool', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ])
          .catch(() => []),
      []
    );

    return {
      stats: { total, active, inactive: total - active },
      byCategory: byCategory.map(c => ({ category: c._id || 'غير محدد', count: c.count })),
      byType: byType.map(t => ({ type: t._id || 'غير محدد', count: t.count })),
      recentlyAdded,
      mostUsed,
      assessmentUsage,
      generatedAt: new Date(),
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 6. SUGGEST — اقتراح مقاييس حسب التشخيص والسن
  // ───────────────────────────────────────────────────────────────

  async suggest({ beneficiaryId, disabilityType = '', ageMonths = 0, category = '' } = {}) {
    const Measure = M.Measure();
    if (!Measure) return [];

    const filter = { isActive: true };
    if (category) filter.category = category;

    // فلتر الجمهور المستهدف
    if (disabilityType) {
      const pop = this._disabilityToPopulation(disabilityType);
      if (pop) filter.targetPopulation = { $in: [pop, 'all'] };
    }

    // فلتر العمر
    if (ageMonths > 0) {
      const ageYears = ageMonths / 12;
      filter.$or = [
        { 'ageRange.min': { $exists: false } },
        {
          'ageRange.min': { $lte: ageYears },
          'ageRange.max': { $gte: ageYears },
        },
      ];
    }

    return Measure.find(filter)
      .select('code name name_ar abbreviation category type ageRange targetPopulation scoringType')
      .sort('-usageCount')
      .limit(15)
      .lean()
      .catch(() => []);
  }

  // ───────────────────────────────────────────────────────────────
  // 7. GET SCORING GUIDE — دليل التسجيل
  // ───────────────────────────────────────────────────────────────

  async getScoringGuide(id) {
    const Measure = M.Measure();
    if (!Measure) return null;

    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { code: id };
    return Measure.findOne(filter)
      .select(
        'code name name_ar scoringType minScore maxScore scoringRules domains administrationGuide scoringInstructions'
      )
      .lean()
      .catch(() => null);
  }

  // ── Private helpers ───────────────────────────────────────────

  _disabilityToPopulation(disabilityType) {
    const map = {
      autism: 'autism',
      intellectual: 'intellectual_disability',
      cerebral_palsy: 'cerebral_palsy',
      down_syndrome: 'down_syndrome',
      language_delay: 'language_delay',
      learning_disability: 'learning_disability',
      physical: 'physical_disability',
    };
    for (const [key, val] of Object.entries(map)) {
      if (disabilityType.toLowerCase().includes(key)) return val;
    }
    return 'all';
  }

  _emptyDashboard() {
    return {
      stats: { total: 0, active: 0, inactive: 0 },
      byCategory: [],
      byType: [],
      recentlyAdded: [],
      mostUsed: [],
      assessmentUsage: [],
      generatedAt: new Date(),
    };
  }
}

module.exports = new MeasuresLibrarySvc();
