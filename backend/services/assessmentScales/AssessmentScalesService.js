/**
 * AssessmentScalesService.js — خدمات وحدة المقاييس والتقييمات السريرية
 * Assessment Scales & Clinical Assessments Business Logic
 *
 * يشمل: ScoringService, AssessmentService, ComparisonService, ReportService
 */

'use strict';

const mongoose = require('mongoose');
const AssessmentTool = require('../../models/assessmentScales/AssessmentTool');
const AssessmentToolDomain = require('../../models/assessmentScales/AssessmentToolDomain');
const AssessmentToolItem = require('../../models/assessmentScales/AssessmentToolItem');
const ClinicalAssessment = require('../../models/assessmentScales/ClinicalAssessment');
const AssessmentDomainScore = require('../../models/assessmentScales/AssessmentDomainScore');
const AssessmentItemResponse = require('../../models/assessmentScales/AssessmentItemResponse');
const AssessmentReport = require('../../models/assessmentScales/AssessmentReport');
const logger = require('../../utils/logger');

// ════════════════════════════════════════════════════════════════
// ScoringService — منطق حساب الدرجات
// ════════════════════════════════════════════════════════════════
class ScoringService {
  /**
   * تصنيف الدرجة المعيارية (متوسط 100، انحراف 15)
   */
  static classifyStandardScore(score, config = {}) {
    if (score === null || score === undefined) return null;
    const cutoffs = config.classification_cutoffs || null;
    if (cutoffs) {
      for (const [label, range] of Object.entries(cutoffs)) {
        if (score >= range[0] && score <= range[1]) return label;
      }
    }
    // التصنيف الافتراضي
    if (score >= 130) return 'متفوق جداً';
    if (score >= 120) return 'متفوق';
    if (score >= 110) return 'فوق المتوسط';
    if (score >= 90) return 'متوسط';
    if (score >= 80) return 'تحت المتوسط';
    if (score >= 70) return 'حدّي';
    return 'ضعيف جداً';
  }

  /**
   * تصنيف T-score (متوسط 50، انحراف 10)
   */
  static classifyTScore(score, isAdaptive = false) {
    if (score === null || score === undefined) return null;
    if (isAdaptive) {
      // مقاييس التكيف (منعكسة)
      if (score >= 40) return 'طبيعي';
      if (score >= 31) return 'عرضة للخطر';
      return 'ذو دلالة إكلينيكية (منخفض)';
    }
    // مقاييس الأعراض
    if (score >= 70) return 'مرتفع جداً (ذو دلالة إكلينيكية)';
    if (score >= 60) return 'مرتفع (عرضة للخطر)';
    if (score >= 40) return 'متوسط';
    if (score >= 30) return 'منخفض';
    return 'منخفض جداً';
  }

  /**
   * تصنيف CARS-2
   */
  static classifyCARSScore(totalScore) {
    if (totalScore < 30) return { classification: 'لا يوجد توحد', severity: 'none' };
    if (totalScore <= 36.5)
      return { classification: 'توحد خفيف إلى متوسط', severity: 'mild_moderate' };
    return { classification: 'توحد شديد', severity: 'severe' };
  }

  /**
   * تصنيف GARS-3 (حاصل التوحد AQ)
   */
  static classifyGARSScore(aq) {
    if (aq < 70) return { classification: 'احتمال منخفض جداً', severity: 'very_low' };
    if (aq < 80) return { classification: 'احتمال منخفض', severity: 'low' };
    if (aq < 90) return { classification: 'احتمال متوسط', severity: 'moderate' };
    if (aq < 100) return { classification: 'احتمال مرتفع', severity: 'high' };
    return { classification: 'احتمال مرتفع جداً', severity: 'very_high' };
  }

  /**
   * تصنيف عام بناءً على نظام التسجيل
   */
  static classify(scoringSystem, score, config = {}) {
    if (score === null || score === undefined) return null;
    switch (scoringSystem) {
      case 'standard_scores':
      case 'iq_scores':
      case 'developmental_index':
        return this.classifyStandardScore(score, config);
      case 't_scores':
        return this.classifyTScore(score, config.is_adaptive || false);
      case 'percentage':
        if (score >= 90) return 'ممتاز';
        if (score >= 75) return 'جيد جداً';
        if (score >= 60) return 'جيد';
        if (score >= 40) return 'متوسط';
        return 'يحتاج دعم';
      case 'custom':
        if (config.cutoffs) {
          for (const [label, range] of Object.entries(config.cutoffs)) {
            if (score >= range[0] && score <= range[1]) return label;
          }
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * حساب الدرجة الخام لمجال
   */
  static async calcDomainRaw(assessmentId, domainId) {
    const items = await AssessmentToolItem.find({
      domain_id: domainId,
      is_active: true,
    }).select('_id max_score is_reverse_scored');

    const itemIds = items.map(i => i._id);
    const responses = await AssessmentItemResponse.find({
      assessment_id: assessmentId,
      item_id: { $in: itemIds },
      is_skipped: { $ne: true },
      score: { $ne: null },
    }).lean();

    const responseMap = {};
    responses.forEach(r => {
      responseMap[r.item_id.toString()] = r.score;
    });

    let total = 0;
    items.forEach(item => {
      const s = responseMap[item._id.toString()];
      if (s === undefined || s === null) return;
      // التسجيل العكسي
      if (item.is_reverse_scored) {
        total += item.max_score - s;
      } else {
        total += s;
      }
    });

    return { raw: total, answered: responses.length, total: items.length };
  }
}

// ════════════════════════════════════════════════════════════════
// AssessmentService — منطق التقييم الكامل
// ════════════════════════════════════════════════════════════════
class AssessmentService {
  /**
   * إنشاء تقييم جديد
   */
  static async createAssessment(data, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // البحث عن تقييم سابق
      const previous = await ClinicalAssessment.findPreviousCompleted(
        data.beneficiary_id,
        data.tool_id
      );

      const assessmentData = {
        ...data,
        created_by: userId,
        status: 'draft',
        completion_percentage: 0,
        previous_assessment_id: previous?._id || null,
      };

      const [assessment] = await ClinicalAssessment.create([assessmentData], { session });

      // إنشاء هيكل درجات المجالات مسبقاً
      const domains = await AssessmentToolDomain.find({
        tool_id: data.tool_id,
        is_active: true,
      });

      const domainScoreDocs = domains.map(d => ({
        assessment_id: assessment._id,
        domain_id: d._id,
        items_total: 0, // سيُحدَّث لاحقاً
      }));

      if (domainScoreDocs.length > 0) {
        await AssessmentDomainScore.insertMany(domainScoreDocs, { session });
      }

      await session.commitTransaction();
      logger.info(`[AssessmentService] Created assessment ${assessment.assessment_number}`);
      return assessment;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * حفظ إجابة بند واحد (للحفظ الفوري)
   */
  static async saveItemResponse(assessmentId, itemData, userId) {
    const { item_id, score, notes, is_skipped, skip_reason, trial_data } = itemData;

    const response = await AssessmentItemResponse.findOneAndUpdate(
      { assessment_id: assessmentId, item_id },
      {
        score: is_skipped ? null : score,
        notes,
        is_skipped: !!is_skipped,
        skip_reason: is_skipped ? skip_reason : null,
        trial_data: trial_data || null,
        responded_at: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // تحديث نسبة الإكمال
    const assessment = await ClinicalAssessment.findById(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    const totalRequired = await AssessmentToolItem.countDocuments({
      tool_id: assessment.tool_id,
      is_required: true,
      is_active: true,
    });

    const answered = await AssessmentItemResponse.countAnswered(assessmentId);
    const completionPct = Math.min(100, Math.round((answered / Math.max(totalRequired, 1)) * 100));

    await ClinicalAssessment.findByIdAndUpdate(assessmentId, {
      completion_percentage: completionPct,
      last_autosave_at: new Date(),
      status: completionPct > 0 ? 'in_progress' : 'draft',
      updated_by: userId,
    });

    // حساب درجة المجال فورياً
    const item = await AssessmentToolItem.findById(item_id).select('domain_id');
    let domainScore = null;
    if (item) {
      domainScore = await AssessmentService.recalcDomainScore(assessmentId, item.domain_id);
    }

    return { response, completion_percentage: completionPct, domain_score: domainScore };
  }

  /**
   * حفظ دفعة من الإجابات (Batch)
   */
  static async batchSaveResponses(assessmentId, responses, userId) {
    const ops = responses.map(r => ({
      updateOne: {
        filter: { assessment_id: assessmentId, item_id: r.item_id },
        update: {
          $set: {
            score: r.is_skipped ? null : r.score,
            notes: r.notes || null,
            is_skipped: !!r.is_skipped,
            skip_reason: r.is_skipped ? r.skip_reason : null,
            trial_data: r.trial_data || null,
            responded_at: new Date(),
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await AssessmentItemResponse.bulkWrite(ops);
    }

    // تحديث نسبة الإكمال
    const assessment = await ClinicalAssessment.findById(assessmentId);
    const totalRequired = await AssessmentToolItem.countDocuments({
      tool_id: assessment.tool_id,
      is_required: true,
      is_active: true,
    });
    const answered = await AssessmentItemResponse.countAnswered(assessmentId);
    const completionPct = Math.min(100, Math.round((answered / Math.max(totalRequired, 1)) * 100));

    await ClinicalAssessment.findByIdAndUpdate(assessmentId, {
      completion_percentage: completionPct,
      last_autosave_at: new Date(),
      status: 'in_progress',
      updated_by: userId,
    });

    return { saved: ops.length, completion_percentage: completionPct };
  }

  /**
   * إعادة حساب درجة مجال
   */
  static async recalcDomainScore(assessmentId, domainId) {
    const domain = await AssessmentToolDomain.findById(domainId);
    if (!domain) return null;

    const items = await AssessmentToolItem.find({
      domain_id: domainId,
      is_active: true,
    }).select('_id is_required is_reverse_scored max_score');

    const itemIds = items.map(i => i._id);
    const responses = await AssessmentItemResponse.find({
      assessment_id: assessmentId,
      item_id: { $in: itemIds },
      is_skipped: { $ne: true },
      score: { $ne: null },
    }).lean();

    const responseMap = {};
    responses.forEach(r => {
      responseMap[r.item_id.toString()] = r.score;
    });

    // حساب الدرجة الخام
    let rawScore = 0;
    items.forEach(item => {
      const s = responseMap[item._id.toString()];
      if (s === undefined || s === null) return;
      rawScore += item.is_reverse_scored ? item.max_score - s : s;
    });

    const answered = responses.length;
    const total = items.length;
    const completionPct = total > 0 ? Math.round((answered / total) * 100) : 0;

    // التحويل للدرجة المعيارية
    const assessment =
      await ClinicalAssessment.findById(assessmentId).select('beneficiary_id tool_id');
    let converted = null;
    if (domain.conversion_table) {
      // سنحتاج عمر المستفيد — تبسيط: نمرر null
      converted = domain.convertRawToStandard(rawScore, null);
    }

    // تصنيف
    const tool = await AssessmentTool.findById(assessment.tool_id).select(
      'scoring_system scoring_config'
    );
    const classification =
      converted?.classification ||
      ScoringService.classify(
        tool?.scoring_system,
        converted?.standard || rawScore,
        tool?.scoring_config || {}
      );

    const updated = await AssessmentDomainScore.findOneAndUpdate(
      { assessment_id: assessmentId, domain_id: domainId },
      {
        raw_score: rawScore,
        standard_score: converted?.standard || null,
        percentile_rank: converted?.percentile || null,
        age_equivalent: converted?.age_equivalent || null,
        classification,
        items_answered: answered,
        items_total: total,
        completion_percentage: completionPct,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return updated;
  }

  /**
   * إكمال التقييم وحساب النتائج النهائية
   */
  static async completeAssessment(assessmentId, clinicalData, userId) {
    const assessment =
      await ClinicalAssessment.findById(assessmentId).populate('tool_id beneficiary_id');
    if (!assessment) throw new Error('التقييم غير موجود');

    const tool = assessment.tool_id;

    // 1. إعادة حساب درجات كل المجالات
    const domains = await AssessmentToolDomain.find({ tool_id: tool._id, is_active: true });
    await Promise.all(domains.map(d => AssessmentService.recalcDomainScore(assessmentId, d._id)));

    // 2. جمع درجات المجالات
    const domainScores = await AssessmentDomainScore.find({ assessment_id: assessmentId }).lean();
    const totalRaw = domainScores.reduce((s, ds) => s + (ds.raw_score || 0), 0);

    // 3. تصنيف الدرجة الكلية
    const config = tool.scoring_config || {};
    let overallClassification = null;
    let overallSeverity = null;

    if (tool.code === 'CARS2') {
      const cars = ScoringService.classifyCARSScore(totalRaw);
      overallClassification = cars.classification;
      overallSeverity = cars.severity;
    } else {
      const masterScore = domainScores.find(ds => ds.standard_score)?.standard_score;
      if (masterScore) {
        overallClassification = ScoringService.classify(tool.scoring_system, masterScore, config);
      }
    }

    // 4. المقارنة مع التقييم السابق
    let comparisonSummary = null;
    if (assessment.previous_assessment_id) {
      comparisonSummary = await ComparisonService.generateComparison(
        assessmentId,
        assessment.previous_assessment_id
      );
    }

    // 5. تحديث التقييم
    const updated = await ClinicalAssessment.findByIdAndUpdate(
      assessmentId,
      {
        ...clinicalData,
        total_raw_score: totalRaw,
        overall_classification: overallClassification,
        overall_severity: overallSeverity,
        comparison_summary: comparisonSummary,
        status: 'completed',
        completion_percentage: 100,
        updated_by: userId,
      },
      { new: true }
    );

    logger.info(`[AssessmentService] Assessment ${assessment.assessment_number} completed`);
    return updated;
  }

  /**
   * بيانات الرسم البياني لتطور الدرجات عبر الزمن
   */
  static async getProgressChartData(beneficiaryId, toolId) {
    const allAssessments = await ClinicalAssessment.find({
      beneficiary_id: beneficiaryId,
      tool_id: toolId,
      status: { $in: ['completed', 'approved'] },
      is_deleted: { $ne: true },
    })
      .sort({ assessment_date: 1 })
      .select('_id assessment_date total_standard_score total_raw_score overall_classification')
      .lean();

    if (allAssessments.length === 0) return { labels: [], datasets: [] };

    const assessmentIds = allAssessments.map(a => a._id);
    const domains = await AssessmentToolDomain.find({ tool_id: toolId, is_required: true })
      .sort({ sort_order: 1 })
      .lean();

    const allDomainScores = await AssessmentDomainScore.find({
      assessment_id: { $in: assessmentIds },
    }).lean();

    const scoresByAssessment = {};
    allDomainScores.forEach(ds => {
      const aid = ds.assessment_id.toString();
      if (!scoresByAssessment[aid]) scoresByAssessment[aid] = {};
      scoresByAssessment[aid][ds.domain_id.toString()] = ds.standard_score ?? ds.raw_score;
    });

    const labels = allAssessments.map(a => {
      const d = new Date(a.assessment_date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const colors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#F97316',
    ];

    const datasets = domains.map((domain, i) => ({
      label: domain.name_ar,
      data: allAssessments.map(
        a => scoresByAssessment[a._id.toString()]?.[domain._id.toString()] ?? null
      ),
      border_color: colors[i % colors.length],
    }));

    // الدرجة الكلية
    datasets.push({
      label: 'الدرجة الكلية',
      data: allAssessments.map(a => a.total_standard_score ?? a.total_raw_score),
      border_color: '#1F2937',
      is_total: true,
    });

    return { labels, datasets, assessment_ids: assessmentIds };
  }
}

// ════════════════════════════════════════════════════════════════
// ComparisonService — مقارنة التقييمات
// ════════════════════════════════════════════════════════════════
class ComparisonService {
  /**
   * توليد ملخص المقارنة بين تقييمين
   */
  static async generateComparison(currentId, previousId) {
    const [current, previous] = await Promise.all([
      ClinicalAssessment.findById(currentId).lean(),
      ClinicalAssessment.findById(previousId).lean(),
    ]);
    if (!current || !previous) return null;

    const [currentScores, previousScores] = await Promise.all([
      AssessmentDomainScore.find({ assessment_id: currentId })
        .populate('domain_id', 'name_ar code')
        .lean(),
      AssessmentDomainScore.find({ assessment_id: previousId })
        .populate('domain_id', 'name_ar code')
        .lean(),
    ]);

    const prevMap = {};
    previousScores.forEach(ps => {
      prevMap[ps.domain_id._id.toString()] = ps;
    });

    const domainChanges = [];
    let improvements = 0;
    let declines = 0;
    let maintained = 0;

    currentScores.forEach(cs => {
      const ps = prevMap[cs.domain_id._id.toString()];
      if (!ps) return;
      const currentVal = cs.standard_score ?? cs.raw_score;
      const prevVal = ps.standard_score ?? ps.raw_score;
      if (currentVal === null || prevVal === null) return;
      const change = Math.round((currentVal - prevVal) * 10) / 10;
      let direction = 'maintained';
      if (Math.abs(change) > 1) {
        direction = change > 0 ? 'improved' : 'declined';
        change > 0 ? improvements++ : declines++;
      } else {
        maintained++;
      }
      domainChanges.push({
        domain_name: cs.domain_id.name_ar,
        domain_code: cs.domain_id.code,
        previous: prevVal,
        current: currentVal,
        change,
        direction,
      });
    });

    const totalChange =
      Math.round(
        ((current.total_standard_score ?? 0) - (previous.total_standard_score ?? 0)) * 10
      ) / 10;

    let overallDirection = 'maintained';
    if (improvements > declines + maintained) overallDirection = 'improved';
    else if (declines > improvements + maintained) overallDirection = 'declined';

    const prevDate = new Date(previous.assessment_date);
    const currDate = new Date(current.assessment_date);
    const daysBetween = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

    return {
      previous_assessment_id: previousId,
      previous_date: previous.assessment_date,
      days_between: daysBetween,
      total_score_change: totalChange,
      overall_direction: overallDirection,
      domain_changes: domainChanges,
      improvements_count: improvements,
      declines_count: declines,
      maintained_count: maintained,
    };
  }
}

// ════════════════════════════════════════════════════════════════
// ReportService — توليد التقارير
// ════════════════════════════════════════════════════════════════
class ReportService {
  /**
   * توليد تقرير تقييم (JSON/نصي — يمكن توسيعه لـ PDF لاحقاً)
   */
  static async generateReport(assessmentId, userId) {
    const assessment = await ClinicalAssessment.findById(assessmentId)
      .populate('tool_id beneficiary_id assessor_id branch_id')
      .lean();
    if (!assessment) throw new Error('التقييم غير موجود');

    const domainScores = await AssessmentDomainScore.find({ assessment_id: assessmentId })
      .populate('domain_id', 'name_ar name_en code')
      .lean();

    const b = assessment.beneficiary_id;
    const t = assessment.tool_id;

    // بناء أقسام التقرير
    const sections = [
      {
        title: 'البيانات الشخصية',
        order: 1,
        content: [
          `الاسم: ${b?.full_name_ar || b?.name || 'غير محدد'}`,
          `رقم الملف: ${b?.file_number || '-'}`,
          `نوع الإعاقة: ${b?.disability_type || '-'}`,
        ].join('\n'),
      },
      {
        title: 'معلومات التقييم',
        order: 2,
        content: [
          `المقياس: ${t?.name_ar} (${t?.abbreviation})`,
          `نوع التقييم: ${assessment.assessment_type}`,
          `تاريخ التطبيق: ${new Date(assessment.assessment_date).toLocaleDateString('ar-SA')}`,
          `الأخصائي: ${assessment.assessor_id?.name || '-'}`,
          assessment.respondent_name
            ? `المُستجيب: ${assessment.respondent_name} (${assessment.respondent_relationship || ''})`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
      {
        title: 'نتائج التقييم',
        order: 3,
        content: [
          `الدرجة الخام الكلية: ${assessment.total_raw_score ?? '-'}`,
          assessment.total_standard_score
            ? `الدرجة المعيارية: ${assessment.total_standard_score}`
            : '',
          assessment.total_percentile ? `الرتبة المئينية: ${assessment.total_percentile}%` : '',
          `التصنيف: ${assessment.overall_classification || '-'}`,
          '',
          'نتائج المجالات:',
          ...domainScores.map(ds => {
            let line = `• ${ds.domain_id?.name_ar}: خام=${ds.raw_score ?? '-'}`;
            if (ds.standard_score) line += ` | معياري=${ds.standard_score}`;
            if (ds.classification) line += ` | (${ds.classification})`;
            return line;
          }),
        ]
          .filter(s => s !== null)
          .join('\n'),
      },
      {
        title: 'الملاحظات السلوكية',
        order: 4,
        content: assessment.behavioral_observations || 'لا توجد ملاحظات مسجّلة',
      },
      {
        title: 'التفسير السريري',
        order: 5,
        content: assessment.clinical_interpretation_ar || '',
      },
      {
        title: 'نقاط القوة',
        order: 6,
        content: assessment.strengths_ar || '',
      },
      {
        title: 'مجالات التطوير',
        order: 7,
        content: assessment.weaknesses_ar || '',
      },
      {
        title: 'التوصيات',
        order: 8,
        content: assessment.recommendations_ar || '',
      },
    ];

    // إضافة قسم المقارنة
    if (assessment.comparison_summary) {
      const comp = assessment.comparison_summary;
      const arrow = { improved: '↑ تحسن', declined: '↓ تراجع', maintained: '↔ ثبات' };
      sections.push({
        title: 'مقارنة مع التقييم السابق',
        order: 9,
        content: [
          `التقييم السابق بتاريخ: ${new Date(comp.previous_date).toLocaleDateString('ar-SA')}`,
          `الفترة: ${comp.days_between} يوم`,
          `الاتجاه العام: ${arrow[comp.overall_direction] || '-'}`,
          `التغيير الكلي: ${comp.total_score_change > 0 ? '+' : ''}${comp.total_score_change}`,
          '',
          ...(comp.domain_changes || []).map(
            dc =>
              `• ${dc.domain_name}: ${dc.previous} → ${dc.current} (${dc.change > 0 ? '+' : ''}${dc.change})`
          ),
        ].join('\n'),
      });
    }

    const titleAr = `تقرير تقييم ${t?.name_ar} — ${b?.full_name_ar || b?.name || ''}`;

    const report = await AssessmentReport.findOneAndUpdate(
      { assessment_id: assessmentId },
      {
        template_name: t?.code || 'DEFAULT',
        title_ar: titleAr,
        sections,
        status: 'draft',
        generated_by: userId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info(
      `[ReportService] Report ${report.report_number} generated for assessment ${assessmentId}`
    );
    return report;
  }
}

// ════════════════════════════════════════════════════════════════
// ToolLibraryService — إدارة مكتبة المقاييس
// ════════════════════════════════════════════════════════════════
class ToolLibraryService {
  /**
   * المقاييس المناسبة لمستفيد (حسب العمر والتخصص)
   */
  static async findSuitableTools(ageMonths, specialization = null, category = null) {
    const filter = {
      is_active: true,
      is_deleted: { $ne: true },
      min_age_months: { $lte: ageMonths },
      $or: [{ max_age_months: null }, { max_age_months: { $gte: ageMonths } }],
    };
    if (specialization) filter.specializations = specialization;
    if (category) filter.category = category;
    return AssessmentTool.find(filter).sort({ sort_order: 1 });
  }

  /**
   * تحميل مقياس كامل مع مجالاته وبنوده
   */
  static async getFullTool(toolId) {
    const tool = await AssessmentTool.findById(toolId).lean();
    if (!tool) return null;

    const domains = await AssessmentToolDomain.find({
      tool_id: toolId,
      parent_domain_id: null,
      is_active: true,
    })
      .sort({ sort_order: 1 })
      .lean();

    for (const domain of domains) {
      // المجالات الفرعية
      domain.children = await AssessmentToolDomain.find({
        parent_domain_id: domain._id,
        is_active: true,
      })
        .sort({ sort_order: 1 })
        .lean();

      // بنود المجال الجذر
      domain.items = await AssessmentToolItem.find({
        domain_id: domain._id,
        is_active: true,
      })
        .sort({ sort_order: 1 })
        .lean();

      // بنود المجالات الفرعية
      for (const child of domain.children) {
        child.items = await AssessmentToolItem.find({
          domain_id: child._id,
          is_active: true,
        })
          .sort({ sort_order: 1 })
          .lean();
      }
    }

    tool.domains = domains;
    return tool;
  }

  /**
   * إحصائيات المكتبة
   */
  static async getLibraryStats() {
    const [tools, totalAssessments] = await Promise.all([
      AssessmentTool.aggregate([
        { $match: { is_deleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      ClinicalAssessment.countDocuments({ is_deleted: { $ne: true } }),
    ]);

    const byCategory = {};
    tools.forEach(t => {
      byCategory[t._id] = t.count;
    });

    return {
      total_tools: Object.values(byCategory).reduce((a, b) => a + b, 0),
      by_category: byCategory,
      total_assessments_conducted: totalAssessments,
    };
  }
}

module.exports = {
  ScoringService,
  AssessmentService,
  ComparisonService,
  ReportService,
  ToolLibraryService,
};
