/**
 * ICF Functional Assessment Service — خدمة التقييم الوظيفي وفق ICF
 *
 * خدمات CRUD + حساب الدرجات + تحليل الفجوات + المقارنة الدورية + المعايرة الدولية
 */

const { ICFAssessment, ICFCodeReference, ICFBenchmark } = require('../models/ICFAssessment');
const logger = require('../utils/logger');

class ICFAssessmentService {
  /* ═══════════════════════════════════════════════════════════════════════ *
   *  CRUD Operations
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * إنشاء تقييم ICF جديد
   */
  static async create(data, userId) {
    const assessment = new ICFAssessment({
      ...data,
      createdBy: userId,
      updatedBy: userId,
    });

    // حساب الدرجات تلقائياً
    assessment.calculateScores();

    // تحليل فجوة الأداء-القدرة
    this._calculateGapAnalysis(assessment);

    await assessment.save();

    logger.info(`ICF Assessment created: ${assessment.assessmentNumber} by user ${userId}`);
    return assessment;
  }

  /**
   * جلب تقييم واحد
   */
  static async getById(id) {
    const assessment = await ICFAssessment.findOne({ _id: id, isDeleted: false })
      .populate('beneficiaryId', 'name nameAr fileNumber')
      .populate('assessorId', 'name nameAr role')
      .populate('reviewerId', 'name nameAr role')
      .populate('programId', 'name nameAr')
      .populate('previousAssessmentId', 'assessmentNumber assessmentDate overallFunctioningScore')
      .lean();

    if (!assessment) {
      throw new Error('التقييم غير موجود');
    }
    return assessment;
  }

  /**
   * قائمة التقييمات مع فلاتر وتصنيف
   */
  static async list(filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sort = '-assessmentDate' } = pagination;
    const query = { isDeleted: false };

    if (filters.beneficiaryId) query.beneficiaryId = filters.beneficiaryId;
    if (filters.assessorId) query.assessorId = filters.assessorId;
    if (filters.assessmentType) query.assessmentType = filters.assessmentType;
    if (filters.status) query.status = filters.status;
    if (filters.icfVersion) query.icfVersion = filters.icfVersion;
    if (filters.organization) query.organization = filters.organization;
    if (filters.programId) query.programId = filters.programId;

    if (filters.fromDate || filters.toDate) {
      query.assessmentDate = {};
      if (filters.fromDate) query.assessmentDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.assessmentDate.$lte = new Date(filters.toDate);
    }

    if (filters.minScore != null) {
      query.overallFunctioningScore = {
        ...(query.overallFunctioningScore || {}),
        $gte: Number(filters.minScore),
      };
    }
    if (filters.maxScore != null) {
      query.overallFunctioningScore = {
        ...(query.overallFunctioningScore || {}),
        $lte: Number(filters.maxScore),
      };
    }

    if (filters.severity) query.overallSeverity = filters.severity;

    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { assessmentNumber: regex },
        { title: regex },
        { titleAr: regex },
        { 'healthCondition.diagnosis': regex },
        { 'healthCondition.diagnosisAr': regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      ICFAssessment.find(query)
        .select(
          'assessmentNumber title titleAr assessmentType status beneficiaryId assessorId assessmentDate overallFunctioningScore overallSeverity domainScores healthCondition.diagnosis'
        )
        .populate('beneficiaryId', 'name nameAr fileNumber')
        .populate('assessorId', 'name nameAr')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ICFAssessment.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * تحديث تقييم
   */
  static async update(id, data, userId) {
    const assessment = await ICFAssessment.findOne({ _id: id, isDeleted: false });
    if (!assessment) throw new Error('التقييم غير موجود');

    // لا يمكن تعديل تقييم تمت الموافقة عليه
    if (assessment.status === 'approved') {
      throw new Error('لا يمكن تعديل تقييم تمت الموافقة عليه');
    }

    Object.assign(assessment, data, { updatedBy: userId });

    // إعادة حساب الدرجات
    assessment.calculateScores();
    this._calculateGapAnalysis(assessment);

    await assessment.save();
    logger.info(`ICF Assessment updated: ${assessment.assessmentNumber} by user ${userId}`);
    return assessment;
  }

  /**
   * حذف تقييم (Soft Delete)
   */
  static async delete(id, userId) {
    const assessment = await ICFAssessment.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, isActive: false, updatedBy: userId },
      { new: true }
    );
    if (!assessment) throw new Error('التقييم غير موجود');
    logger.info(`ICF Assessment deleted: ${assessment.assessmentNumber} by user ${userId}`);
    return assessment;
  }

  /**
   * تغيير حالة التقييم
   */
  static async changeStatus(id, newStatus, userId, notes) {
    const assessment = await ICFAssessment.findOne({ _id: id, isDeleted: false });
    if (!assessment) throw new Error('التقييم غير موجود');

    const transitions = {
      draft: ['inProgress'],
      inProgress: ['completed', 'draft'],
      completed: ['reviewed', 'inProgress'],
      reviewed: ['approved', 'completed'],
      approved: ['archived'],
    };

    if (!transitions[assessment.status]?.includes(newStatus)) {
      throw new Error(`لا يمكن الانتقال من "${assessment.status}" إلى "${newStatus}"`);
    }

    assessment.status = newStatus;
    assessment.updatedBy = userId;

    if (newStatus === 'completed') assessment.completedDate = new Date();
    if (newStatus === 'reviewed') {
      assessment.reviewedDate = new Date();
      assessment.reviewerId = userId;
    }
    if (newStatus === 'approved') assessment.approvedDate = new Date();

    await assessment.save();
    logger.info(`ICF Assessment ${assessment.assessmentNumber} status → ${newStatus}`);
    return assessment;
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Gap Analysis — تحليل فجوة الأداء والقدرة
   * ═══════════════════════════════════════════════════════════════════════ */

  static _calculateGapAnalysis(assessment) {
    const ap = assessment.activitiesParticipation;
    if (!ap) return;

    const obj = ap.toObject ? ap.toObject() : ap;
    const items = [];
    for (const chapter of Object.values(obj)) {
      if (Array.isArray(chapter)) {
        items.push(
          ...chapter.filter(i => i.performanceQualifier != null && i.capacityQualifier != null)
        );
      }
    }

    if (items.length === 0) return;

    const avgPerf = items.reduce((s, i) => s + i.performanceQualifier, 0) / items.length;
    const avgCap = items.reduce((s, i) => s + i.capacityQualifier, 0) / items.length;
    const avgGap = avgPerf - avgCap;

    const significantGaps = items
      .map(i => ({
        code: i.code,
        title: i.title,
        performance: i.performanceQualifier,
        capacity: i.capacityQualifier,
        gap: i.performanceQualifier - i.capacityQualifier,
      }))
      .filter(g => Math.abs(g.gap) >= 1)
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

    // Generate recommendations for significant gaps
    significantGaps.forEach(g => {
      if (g.gap > 0) {
        g.recommendation = `Environmental modification needed to reduce performance barriers for ${g.code}`;
        g.recommendationAr = `تعديل بيئي مطلوب لتقليل عوائق الأداء لـ ${g.code}`;
      } else {
        g.recommendation = `Capacity building program recommended for ${g.code}`;
        g.recommendationAr = `برنامج بناء قدرات موصى به لـ ${g.code}`;
      }
    });

    assessment.gapAnalysis = {
      averagePerformance: Math.round(avgPerf * 100) / 100,
      averageCapacity: Math.round(avgCap * 100) / 100,
      averageGap: Math.round(avgGap * 100) / 100,
      significantGaps,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Periodic Comparison — المقارنة الدورية
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * مقارنة تقييم مع تقييم سابق
   */
  static async compareWithPrevious(assessmentId) {
    const current = await ICFAssessment.findById(assessmentId);
    if (!current) throw new Error('التقييم غير موجود');

    // العثور على آخر تقييم سابق لنفس المستفيد
    const previous = current.previousAssessmentId
      ? await ICFAssessment.findById(current.previousAssessmentId)
      : await ICFAssessment.findOne({
          beneficiaryId: current.beneficiaryId,
          _id: { $ne: current._id },
          isDeleted: false,
          status: { $in: ['completed', 'reviewed', 'approved'] },
          assessmentDate: { $lt: current.assessmentDate },
        }).sort({ assessmentDate: -1 });

    if (!previous) {
      return { message: 'لا يوجد تقييم سابق للمقارنة', comparison: null };
    }

    const domainChanges = [];
    const domains = [
      'bodyFunctions',
      'bodyStructures',
      'activitiesParticipation',
      'environmentalFactors',
    ];
    const domainArMap = {
      bodyFunctions: 'وظائف الجسم',
      bodyStructures: 'هياكل الجسم',
      activitiesParticipation: 'الأنشطة والمشاركة',
      environmentalFactors: 'العوامل البيئية',
    };

    for (const domain of domains) {
      const currScore = current.domainScores?.find(s => s.domain === domain);
      const prevScore = previous.domainScores?.find(s => s.domain === domain);

      if (currScore && prevScore) {
        const change = currScore.averageQualifier - prevScore.averageQualifier;
        const changePercent =
          prevScore.averageQualifier !== 0
            ? Math.round((change / prevScore.averageQualifier) * 100)
            : 0;

        let direction = 'stable';
        // أقل = أفضل في مقياس ICF (0 = لا مشكلة)
        if (change < -0.2) direction = 'improved';
        else if (change > 0.2) direction = 'declined';

        domainChanges.push({
          domain,
          domainAr: domainArMap[domain],
          previousScore: prevScore.averageQualifier,
          currentScore: currScore.averageQualifier,
          change: Math.round(change * 100) / 100,
          changePercent,
          direction,
        });
      }
    }

    const significantChanges = domainChanges
      .filter(d => d.direction !== 'stable')
      .map(
        d =>
          `${d.domainAr || d.domain}: ${d.direction === 'improved' ? 'تحسن' : 'تراجع'} بنسبة ${Math.abs(d.changePercent)}%`
      );

    const overallPrev = previous.overallFunctioningScore || 0;
    const overallCurr = current.overallFunctioningScore || 0;
    let overallChange = 'stable';
    if (overallCurr - overallPrev > 3) overallChange = 'improved';
    else if (overallCurr - overallPrev < -3) overallChange = 'declined';

    const comparison = {
      comparedWithId: previous._id,
      comparedDate: new Date(),
      overallChange,
      domainChanges,
      significantChanges,
      summary: `Overall functioning: ${overallPrev}% → ${overallCurr}% (${overallChange})`,
      summaryAr: `الأداء الوظيفي الكلي: ${overallPrev}% ← ${overallCurr}% (${overallChange === 'improved' ? 'تحسن' : overallChange === 'declined' ? 'تراجع' : 'مستقر'})`,
    };

    // حفظ المقارنة
    current.comparison = comparison;
    current.previousAssessmentId = previous._id;
    await current.save();

    return {
      current: {
        id: current._id,
        number: current.assessmentNumber,
        date: current.assessmentDate,
        score: current.overallFunctioningScore,
      },
      previous: {
        id: previous._id,
        number: previous.assessmentNumber,
        date: previous.assessmentDate,
        score: previous.overallFunctioningScore,
      },
      comparison,
    };
  }

  /**
   * تاريخ التقييمات لمستفيد (Timeline)
   */
  static async getBeneficiaryTimeline(beneficiaryId) {
    const assessments = await ICFAssessment.find({
      beneficiaryId,
      isDeleted: false,
      status: { $in: ['completed', 'reviewed', 'approved'] },
    })
      .select(
        'assessmentNumber assessmentType assessmentDate overallFunctioningScore overallSeverity domainScores gapAnalysis.averageGap status'
      )
      .sort({ assessmentDate: 1 })
      .lean();

    // Build trend data
    const trend = assessments.map((a, idx) => ({
      index: idx + 1,
      assessmentNumber: a.assessmentNumber,
      date: a.assessmentDate,
      type: a.assessmentType,
      overallScore: a.overallFunctioningScore,
      severity: a.overallSeverity,
      domains: (a.domainScores || []).reduce((acc, d) => {
        acc[d.domain] = d.averageQualifier;
        return acc;
      }, {}),
      gapAverage: a.gapAnalysis?.averageGap,
      changeFromPrevious:
        idx > 0
          ? (a.overallFunctioningScore || 0) - (assessments[idx - 1].overallFunctioningScore || 0)
          : null,
    }));

    return {
      beneficiaryId,
      totalAssessments: assessments.length,
      trend,
      latestScore:
        assessments.length > 0 ? assessments[assessments.length - 1].overallFunctioningScore : null,
      earliestScore: assessments.length > 0 ? assessments[0].overallFunctioningScore : null,
      overallTrend:
        assessments.length >= 2
          ? (assessments[assessments.length - 1].overallFunctioningScore || 0) >
            (assessments[0].overallFunctioningScore || 0)
            ? 'improving'
            : 'declining'
          : 'insufficient_data',
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  International Benchmarking — المقارنة بالمعايير الدولية
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * مقارنة درجات التقييم بمعايير ICF الدولية
   */
  static async benchmarkAssessment(assessmentId, population = 'general') {
    const assessment = await ICFAssessment.findById(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    const allCodes = assessment.getAllCodes();
    const uniqueCodes = [...new Set(allCodes.map(c => c.code))];

    const benchmarks = await ICFBenchmark.find({
      code: { $in: uniqueCodes },
      population,
      isActive: true,
    }).lean();

    const benchmarkMap = {};
    benchmarks.forEach(b => {
      benchmarkMap[b.code] = b;
    });

    const domainBenchmarks = [];
    const domainCodes = {};

    allCodes.forEach(item => {
      const domain = item.domain;
      if (!domainCodes[domain]) domainCodes[domain] = [];
      domainCodes[domain].push(item);
    });

    for (const [domain, items] of Object.entries(domainCodes)) {
      const assessed = items.filter(i => i.qualifier !== 8 && i.qualifier !== 9);
      if (assessed.length === 0) continue;

      const avgScore = assessed.reduce((s, i) => s + i.qualifier, 0) / assessed.length;

      // العثور على معايير المقارنة لهذا المجال
      const domainBenchmarkData = assessed
        .filter(i => benchmarkMap[i.code])
        .map(i => benchmarkMap[i.code]);

      if (domainBenchmarkData.length === 0) {
        domainBenchmarks.push({
          domain,
          assessedScore: Math.round(avgScore * 100) / 100,
          benchmarkMean: null,
          interpretation: 'No benchmark data available',
          interpretationAr: 'لا تتوفر بيانات معيارية',
        });
        continue;
      }

      const benchMean =
        domainBenchmarkData.reduce((s, b) => s + b.mean, 0) / domainBenchmarkData.length;
      const benchMedian =
        domainBenchmarkData.reduce((s, b) => s + (b.median || b.mean), 0) /
        domainBenchmarkData.length;
      const benchSD =
        domainBenchmarkData.reduce((s, b) => s + (b.standardDeviation || 1), 0) /
        domainBenchmarkData.length;

      const zScore = benchSD > 0 ? (avgScore - benchMean) / benchSD : 0;

      // حساب الترتيب المئوي التقريبي
      // z-score → percentile (approximate using empirical rule)
      let percentileRank;
      if (zScore <= -2) percentileRank = 2;
      else if (zScore <= -1) percentileRank = 16;
      else if (zScore <= 0) percentileRank = 50;
      else if (zScore <= 1) percentileRank = 84;
      else if (zScore <= 2) percentileRank = 98;
      else percentileRank = 99;

      // التفسير (أقل = أفضل في ICF)
      let interpretation, interpretationAr;
      if (zScore <= -1) {
        interpretation = 'Better than benchmark (lower impairment)';
        interpretationAr = 'أفضل من المعيار (إعاقة أقل)';
      } else if (zScore <= 0.5) {
        interpretation = 'Within normal range';
        interpretationAr = 'ضمن المدى الطبيعي';
      } else if (zScore <= 1) {
        interpretation = 'Slightly below benchmark';
        interpretationAr = 'أقل قليلاً من المعيار';
      } else {
        interpretation = 'Significantly below benchmark (higher impairment)';
        interpretationAr = 'أقل بشكل ملحوظ من المعيار (إعاقة أعلى)';
      }

      domainBenchmarks.push({
        domain,
        assessedScore: Math.round(avgScore * 100) / 100,
        benchmarkMean: Math.round(benchMean * 100) / 100,
        benchmarkMedian: Math.round(benchMedian * 100) / 100,
        benchmarkSD: Math.round(benchSD * 100) / 100,
        percentileRank,
        zScore: Math.round(zScore * 100) / 100,
        interpretation,
        interpretationAr,
      });
    }

    assessment.benchmarking = {
      referencePopulation: population,
      dataSource: 'ICF International Benchmarks',
      comparisonDate: new Date(),
      domainBenchmarks,
    };
    await assessment.save();

    return assessment.benchmarking;
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Statistics & Analytics — الإحصائيات والتحليلات
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * إحصائيات عامة
   */
  static async getStatistics(filters = {}) {
    const match = { isDeleted: false };
    if (filters.organization) match.organization = filters.organization;
    if (filters.fromDate || filters.toDate) {
      match.assessmentDate = {};
      if (filters.fromDate) match.assessmentDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) match.assessmentDate.$lte = new Date(filters.toDate);
    }

    const [stats] = await ICFAssessment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          avgFunctioningScore: { $avg: '$overallFunctioningScore' },
          minScore: { $min: '$overallFunctioningScore' },
          maxScore: { $max: '$overallFunctioningScore' },
          uniqueBeneficiaries: { $addToSet: '$beneficiaryId' },
          uniqueAssessors: { $addToSet: '$assessorId' },
        },
      },
      {
        $project: {
          _id: 0,
          totalAssessments: 1,
          avgFunctioningScore: { $round: ['$avgFunctioningScore', 1] },
          minScore: 1,
          maxScore: 1,
          uniqueBeneficiaries: { $size: '$uniqueBeneficiaries' },
          uniqueAssessors: { $size: '$uniqueAssessors' },
        },
      },
    ]);

    const byType = await ICFAssessment.aggregate([
      { $match: match },
      { $group: { _id: '$assessmentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const bySeverity = await ICFAssessment.aggregate([
      { $match: match },
      { $group: { _id: '$overallSeverity', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const byStatus = await ICFAssessment.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const monthlyTrend = await ICFAssessment.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$assessmentDate' },
            month: { $month: '$assessmentDate' },
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$overallFunctioningScore' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 24 },
    ]);

    return {
      summary: stats || { totalAssessments: 0, avgFunctioningScore: 0 },
      byType,
      bySeverity,
      byStatus,
      monthlyTrend,
    };
  }

  /**
   * توزيع الدرجات حسب المجالات لمجموعة تقييمات
   */
  static async getDomainDistribution(filters = {}) {
    const match = { isDeleted: false, 'domainScores.0': { $exists: true } };
    if (filters.organization) match.organization = filters.organization;

    const result = await ICFAssessment.aggregate([
      { $match: match },
      { $unwind: '$domainScores' },
      {
        $group: {
          _id: '$domainScores.domain',
          avgQualifier: { $avg: '$domainScores.averageQualifier' },
          count: { $sum: 1 },
          avgItems: { $avg: '$domainScores.assessedItems' },
        },
      },
      { $sort: { avgQualifier: -1 } },
    ]);

    return result.map(r => ({
      domain: r._id,
      averageQualifier: Math.round(r.avgQualifier * 100) / 100,
      assessmentCount: r.count,
      avgItemsAssessed: Math.round(r.avgItems),
    }));
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  ICF Code Reference — مرجع رموز ICF
   * ═══════════════════════════════════════════════════════════════════════ */

  /**
   * البحث في رموز ICF
   */
  static async searchCodes(query = {}) {
    const filter = { isActive: true };
    if (query.component) filter.component = query.component;
    if (query.chapter) filter.chapter = Number(query.chapter);
    if (query.level) filter.level = Number(query.level);
    if (query.parentCode) filter.parentCode = query.parentCode;

    if (query.search) {
      const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ code: regex }, { title: regex }, { titleAr: regex }, { description: regex }];
    }

    const codes = await ICFCodeReference.find(filter)
      .sort({ code: 1 })
      .limit(Number(query.limit) || 50)
      .lean();

    return codes;
  }

  /**
   * جلب شجرة رموز ICF حسب المكون
   */
  static async getCodeTree(component) {
    const codes = await ICFCodeReference.find({
      component,
      isActive: true,
    })
      .sort({ code: 1 })
      .lean();

    // بناء الشجرة
    const tree = [];
    const codeMap = {};
    codes.forEach(c => {
      codeMap[c.code] = { ...c, children: [] };
    });

    codes.forEach(c => {
      if (c.parentCode && codeMap[c.parentCode]) {
        codeMap[c.parentCode].children.push(codeMap[c.code]);
      } else {
        tree.push(codeMap[c.code]);
      }
    });

    return tree;
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Benchmark Management — إدارة المعايير
   * ═══════════════════════════════════════════════════════════════════════ */

  static async createBenchmark(data) {
    const benchmark = new ICFBenchmark(data);
    await benchmark.save();
    return benchmark;
  }

  static async listBenchmarks(filters = {}) {
    const query = { isActive: true };
    if (filters.population) query.population = filters.population;
    if (filters.code) query.code = filters.code;
    return ICFBenchmark.find(query).sort({ code: 1 }).lean();
  }

  static async importBenchmarks(benchmarks) {
    const ops = benchmarks.map(b => ({
      updateOne: {
        filter: { code: b.code, population: b.population },
        update: { $set: b },
        upsert: true,
      },
    }));
    const result = await ICFBenchmark.bulkWrite(ops);
    return {
      matched: result.matchedCount,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    };
  }
}

module.exports = ICFAssessmentService;
