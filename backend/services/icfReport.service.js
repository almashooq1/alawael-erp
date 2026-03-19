/**
 * ICF Report Service — خدمة تقارير التقييم الوظيفي ICF
 *
 * تقارير شاملة ومقارنة دورية ومؤسسية بمعايير ICF الدولية
 */

const { ICFAssessment, ICFBenchmark } = require('../models/ICFAssessment');
const logger = require('../utils/logger');

/* ─── Domain Labels ────────────────────────────────────────────────────────── */

const DOMAIN_LABELS = {
  bodyFunctions: { en: 'Body Functions', ar: 'وظائف الجسم', prefix: 'b' },
  bodyStructures: { en: 'Body Structures', ar: 'هياكل الجسم', prefix: 's' },
  activitiesParticipation: {
    en: 'Activities & Participation',
    ar: 'الأنشطة والمشاركة',
    prefix: 'd',
  },
  environmentalFactors: { en: 'Environmental Factors', ar: 'العوامل البيئية', prefix: 'e' },
};

const SEVERITY_LABELS = {
  0: { en: 'No problem', ar: 'لا مشكلة', range: '0-4%' },
  1: { en: 'Mild', ar: 'خفيفة', range: '5-24%' },
  2: { en: 'Moderate', ar: 'متوسطة', range: '25-49%' },
  3: { en: 'Severe', ar: 'شديدة', range: '50-95%' },
  4: { en: 'Complete', ar: 'كاملة', range: '96-100%' },
};

const CHAPTER_LABELS = {
  bodyFunctions: {
    chapter1_mental: { en: 'Mental Functions', ar: 'الوظائف العقلية' },
    chapter2_sensory: { en: 'Sensory Functions & Pain', ar: 'الوظائف الحسية والألم' },
    chapter3_voice: { en: 'Voice & Speech', ar: 'وظائف الصوت والكلام' },
    chapter4_cardiovascular: {
      en: 'Cardiovascular, Immune & Respiratory',
      ar: 'الجهاز الدوري والمناعة والتنفسي',
    },
    chapter5_digestive: {
      en: 'Digestive, Metabolic & Endocrine',
      ar: 'الجهاز الهضمي والاستقلاب والغدد',
    },
    chapter6_genitourinary: {
      en: 'Genitourinary & Reproductive',
      ar: 'الجهاز البولي التناسلي والتكاثر',
    },
    chapter7_neuromusculoskeletal: {
      en: 'Neuromusculoskeletal & Movement',
      ar: 'الجهاز العضلي الهيكلي والحركة',
    },
    chapter8_skin: { en: 'Skin & Related Structures', ar: 'الجلد والهياكل المتصلة' },
  },
  bodyStructures: {
    chapter1_nervous: { en: 'Nervous System', ar: 'الجهاز العصبي' },
    chapter2_eye_ear: { en: 'Eye, Ear & Related', ar: 'العين والأذن' },
    chapter3_voice_speech: { en: 'Voice & Speech Structures', ar: 'هياكل الصوت والكلام' },
    chapter4_cardiovascular: {
      en: 'Cardiovascular, Immune & Respiratory',
      ar: 'الجهاز الدوري والمناعة والتنفسي',
    },
    chapter5_digestive: { en: 'Digestive System', ar: 'الجهاز الهضمي' },
    chapter6_genitourinary: { en: 'Genitourinary System', ar: 'الجهاز البولي التناسلي' },
    chapter7_movement: { en: 'Movement Structures', ar: 'هياكل الحركة' },
    chapter8_skin: { en: 'Skin', ar: 'الجلد' },
  },
  activitiesParticipation: {
    chapter1_learning: { en: 'Learning & Applying Knowledge', ar: 'التعلم وتطبيق المعرفة' },
    chapter2_tasks: { en: 'General Tasks & Demands', ar: 'المهام والمطالب العامة' },
    chapter3_communication: { en: 'Communication', ar: 'التواصل' },
    chapter4_mobility: { en: 'Mobility', ar: 'التنقل' },
    chapter5_selfCare: { en: 'Self-Care', ar: 'العناية بالذات' },
    chapter6_domesticLife: { en: 'Domestic Life', ar: 'الحياة المنزلية' },
    chapter7_interpersonal: { en: 'Interpersonal Interactions', ar: 'التفاعلات والعلاقات الشخصية' },
    chapter8_majorLife: { en: 'Major Life Areas', ar: 'مجالات الحياة الرئيسية' },
    chapter9_community: { en: 'Community & Civic Life', ar: 'حياة المجتمع والحياة المدنية' },
  },
  environmentalFactors: {
    chapter1_products: { en: 'Products & Technology', ar: 'المنتجات والتكنولوجيا' },
    chapter2_natural: { en: 'Natural Environment', ar: 'البيئة الطبيعية' },
    chapter3_support: { en: 'Support & Relationships', ar: 'الدعم والعلاقات' },
    chapter4_attitudes: { en: 'Attitudes', ar: 'المواقف' },
    chapter5_services: { en: 'Services, Systems & Policies', ar: 'الخدمات والأنظمة والسياسات' },
  },
};

class ICFReportService {
  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Full Assessment Report — تقرير تقييم شامل
   * ═══════════════════════════════════════════════════════════════════════ */

  static async generateFullReport(assessmentId) {
    const assessment = await ICFAssessment.findById(assessmentId)
      .populate('beneficiaryId', 'name nameAr fileNumber dateOfBirth gender')
      .populate('assessorId', 'name nameAr role specialization')
      .populate('reviewerId', 'name nameAr role')
      .populate('programId', 'name nameAr')
      .lean();

    if (!assessment) throw new Error('التقييم غير موجود');

    const report = {
      meta: {
        reportType: 'ICF Full Assessment Report',
        reportTypeAr: 'تقرير التقييم الوظيفي الشامل وفق ICF',
        generatedAt: new Date(),
        icfVersion: assessment.icfVersion,
        standard: 'WHO International Classification of Functioning, Disability and Health',
        standardAr: 'التصنيف الدولي للأداء الوظيفي والإعاقة والصحة — منظمة الصحة العالمية',
      },

      assessmentInfo: {
        number: assessment.assessmentNumber,
        title: assessment.title,
        titleAr: assessment.titleAr,
        type: assessment.assessmentType,
        date: assessment.assessmentDate,
        status: assessment.status,
        duration: assessment.duration,
      },

      beneficiary: assessment.beneficiaryId,
      assessor: assessment.assessorId,
      reviewer: assessment.reviewerId,
      program: assessment.programId,

      healthCondition: assessment.healthCondition,
      personalFactors: assessment.personalFactors,

      // ── Domain Reports ──
      domains: this._buildDomainReports(assessment),

      // ── Scores Summary ──
      scores: {
        overallFunctioningScore: assessment.overallFunctioningScore,
        overallSeverity: assessment.overallSeverity,
        overallSeverityAr: this._getSeverityLabel(assessment.overallSeverity, 'ar'),
        domainScores: (assessment.domainScores || []).map(ds => ({
          ...ds,
          domainLabel: DOMAIN_LABELS[ds.domain] || {},
        })),
      },

      // ── Gap Analysis ──
      gapAnalysis: assessment.gapAnalysis,

      // ── Benchmarking ──
      benchmarking: assessment.benchmarking,

      // ── Comparison ──
      comparison: assessment.comparison,

      // ── Goals & Recommendations ──
      goals: assessment.goals,
      recommendations: assessment.recommendations,

      // ── Clinical Summary ──
      clinicalSummary: assessment.clinicalSummary,

      // ── ICF Profile (Visual) ──
      icfProfile: this._buildICFProfile(assessment),
    };

    return report;
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Comparative Report — تقرير مقارن دوري
   * ═══════════════════════════════════════════════════════════════════════ */

  static async generateComparativeReport(beneficiaryId, options = {}) {
    const { fromDate, toDate, limit: maxAssessments = 10 } = options;

    const query = {
      beneficiaryId,
      isDeleted: false,
      status: { $in: ['completed', 'reviewed', 'approved'] },
    };
    if (fromDate || toDate) {
      query.assessmentDate = {};
      if (fromDate) query.assessmentDate.$gte = new Date(fromDate);
      if (toDate) query.assessmentDate.$lte = new Date(toDate);
    }

    const assessments = await ICFAssessment.find(query)
      .populate('beneficiaryId', 'name nameAr fileNumber')
      .populate('assessorId', 'name nameAr')
      .sort({ assessmentDate: 1 })
      .limit(Number(maxAssessments))
      .lean();

    if (assessments.length === 0) {
      return { message: 'لا توجد تقييمات مكتملة لهذا المستفيد', data: null };
    }

    const report = {
      meta: {
        reportType: 'ICF Comparative Report',
        reportTypeAr: 'تقرير مقارن دوري وفق ICF',
        generatedAt: new Date(),
        standard: 'WHO ICF International Standards',
      },

      beneficiary: assessments[0].beneficiaryId,
      periodFrom: assessments[0].assessmentDate,
      periodTo: assessments[assessments.length - 1].assessmentDate,
      totalAssessments: assessments.length,

      // ── Overall Trend ──
      overallTrend: this._calculateOverallTrend(assessments),

      // ── Domain Trends ──
      domainTrends: this._calculateDomainTrends(assessments),

      // ── Assessment Timeline ──
      timeline: assessments.map((a, idx) => ({
        index: idx + 1,
        number: a.assessmentNumber,
        type: a.assessmentType,
        date: a.assessmentDate,
        score: a.overallFunctioningScore,
        severity: a.overallSeverity,
        assessor: a.assessorId?.nameAr || a.assessorId?.name,
        domainScores: (a.domainScores || []).reduce((acc, ds) => {
          acc[ds.domain] = {
            qualifier: ds.averageQualifier,
            items: ds.assessedItems,
          };
          return acc;
        }, {}),
      })),

      // ── Period Summary ──
      periodSummary: this._buildPeriodSummary(assessments),

      // ── Recommendations Based on Trend ──
      trendRecommendations: this._generateTrendRecommendations(assessments),
    };

    return report;
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Organization Report — تقرير مؤسسي
   * ═══════════════════════════════════════════════════════════════════════ */

  static async generateOrganizationReport(options = {}) {
    const { organization, fromDate, toDate } = options;

    const match = { isDeleted: false, status: { $in: ['completed', 'reviewed', 'approved'] } };
    if (organization) match.organization = organization;
    if (fromDate || toDate) {
      match.assessmentDate = {};
      if (fromDate) match.assessmentDate.$gte = new Date(fromDate);
      if (toDate) match.assessmentDate.$lte = new Date(toDate);
    }

    // Aggregate statistics
    const [overview] = await ICFAssessment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          avgScore: { $avg: '$overallFunctioningScore' },
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
          avgScore: { $round: ['$avgScore', 1] },
          minScore: 1,
          maxScore: 1,
          totalBeneficiaries: { $size: '$uniqueBeneficiaries' },
          totalAssessors: { $size: '$uniqueAssessors' },
        },
      },
    ]);

    // Severity distribution
    const severityDist = await ICFAssessment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$overallSeverity',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Domain averages
    const domainAvgs = await ICFAssessment.aggregate([
      { $match: match },
      { $unwind: '$domainScores' },
      {
        $group: {
          _id: '$domainScores.domain',
          avgQualifier: { $avg: '$domainScores.averageQualifier' },
          maxQualifier: { $max: '$domainScores.averageQualifier' },
          minQualifier: { $min: '$domainScores.averageQualifier' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgQualifier: -1 } },
    ]);

    // Monthly trends
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
    ]);

    // Type distribution
    const typeDist = await ICFAssessment.aggregate([
      { $match: match },
      { $group: { _id: '$assessmentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Top areas of concern (highest average qualifiers)
    const topConcerns = domainAvgs
      .filter(d => d.avgQualifier > 1.5)
      .map(d => ({
        domain: d._id,
        domainAr: DOMAIN_LABELS[d._id]?.ar,
        avgQualifier: Math.round(d.avgQualifier * 100) / 100,
        severity: this._qualifierToSeverity(d.avgQualifier),
      }));

    return {
      meta: {
        reportType: 'ICF Organization Report',
        reportTypeAr: 'تقرير التقييم الوظيفي المؤسسي وفق ICF',
        generatedAt: new Date(),
        period: { from: fromDate || 'all', to: toDate || 'all' },
      },
      overview: overview || {
        totalAssessments: 0,
        avgScore: 0,
        totalBeneficiaries: 0,
        totalAssessors: 0,
      },
      severityDistribution: severityDist.map(s => ({
        severity: s._id,
        severityAr: this._getSeverityLabel(s._id, 'ar'),
        count: s.count,
      })),
      domainAverages: domainAvgs.map(d => ({
        domain: d._id,
        domainAr: DOMAIN_LABELS[d._id]?.ar,
        average: Math.round(d.avgQualifier * 100) / 100,
        min: Math.round(d.minQualifier * 100) / 100,
        max: Math.round(d.maxQualifier * 100) / 100,
        assessmentCount: d.count,
      })),
      monthlyTrend: monthlyTrend.map(m => ({
        year: m._id.year,
        month: m._id.month,
        count: m.count,
        avgScore: Math.round(m.avgScore * 10) / 10,
      })),
      typeDistribution: typeDist,
      topConcerns,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════ *
   *  Private Helpers
   * ═══════════════════════════════════════════════════════════════════════ */

  static _buildDomainReports(assessment) {
    const reports = {};

    for (const [domainKey, labels] of Object.entries(DOMAIN_LABELS)) {
      const domainData = assessment[domainKey];
      if (!domainData) continue;

      const chapters = CHAPTER_LABELS[domainKey] || {};
      const chapterReports = [];

      for (const [chapterKey, chapterLabel] of Object.entries(chapters)) {
        const items = domainData[chapterKey] || [];
        if (items.length === 0) continue;

        const assessed = items.filter(i => i.qualifier !== 8 && i.qualifier !== 9);
        const avgQ =
          assessed.length > 0 ? assessed.reduce((s, i) => s + i.qualifier, 0) / assessed.length : 0;

        chapterReports.push({
          chapter: chapterKey,
          label: chapterLabel,
          totalItems: items.length,
          assessedItems: assessed.length,
          averageQualifier: Math.round(avgQ * 100) / 100,
          severity: this._qualifierToSeverity(avgQ),
          items: items.map(item => ({
            code: item.code,
            title: item.title,
            titleAr: item.titleAr,
            qualifier: item.qualifier,
            qualifierLabel: SEVERITY_LABELS[item.qualifier] || {},
            notes: item.notes,
            ...(domainKey === 'activitiesParticipation'
              ? {
                  performance: item.performanceQualifier,
                  capacity: item.capacityQualifier,
                  gap:
                    item.performanceQualifier != null && item.capacityQualifier != null
                      ? item.performanceQualifier - item.capacityQualifier
                      : null,
                }
              : {}),
            ...(domainKey === 'environmentalFactors'
              ? { isBarrier: item.isBarrier, isFacilitator: item.isFacilitator }
              : {}),
          })),
        });
      }

      reports[domainKey] = {
        label: labels,
        chapters: chapterReports,
        domainScore: assessment.domainScores?.find(ds => ds.domain === domainKey),
      };
    }

    return reports;
  }

  static _buildICFProfile(assessment) {
    const profile = {
      description: 'ICF Functioning Profile — Visual representation of functioning levels',
      descriptionAr: 'ملف الأداء الوظيفي ICF — تمثيل مرئي لمستويات الوظائف',
      domains: [],
    };

    for (const [domainKey, labels] of Object.entries(DOMAIN_LABELS)) {
      const ds = assessment.domainScores?.find(d => d.domain === domainKey);
      if (!ds) continue;

      profile.domains.push({
        domain: domainKey,
        label: labels.ar,
        labelEn: labels.en,
        prefix: labels.prefix,
        averageQualifier: ds.averageQualifier,
        assessedItems: ds.assessedItems,
        // بار تشارت بصري (0-4 bars)
        barLevel: Math.round(ds.averageQualifier),
        barPercent: Math.round((ds.averageQualifier / 4) * 100),
        severity: this._qualifierToSeverity(ds.averageQualifier),
        distribution: ds.severityDistribution,
      });
    }

    return profile;
  }

  static _calculateOverallTrend(assessments) {
    if (assessments.length < 2) {
      return { trend: 'insufficient_data', trendAr: 'بيانات غير كافية' };
    }

    const first = assessments[0];
    const last = assessments[assessments.length - 1];
    const firstScore = first.overallFunctioningScore || 0;
    const lastScore = last.overallFunctioningScore || 0;
    const delta = lastScore - firstScore;

    let trend, trendAr;
    if (delta > 5) {
      trend = 'improving';
      trendAr = 'تحسن';
    } else if (delta < -5) {
      trend = 'declining';
      trendAr = 'تراجع';
    } else {
      trend = 'stable';
      trendAr = 'مستقر';
    }

    return {
      trend,
      trendAr,
      firstScore,
      lastScore,
      delta,
      deltaPercent: firstScore > 0 ? Math.round((delta / firstScore) * 100) : 0,
      periodDays: Math.round(
        (new Date(last.assessmentDate) - new Date(first.assessmentDate)) / (1000 * 60 * 60 * 24)
      ),
    };
  }

  static _calculateDomainTrends(assessments) {
    const domains = [
      'bodyFunctions',
      'bodyStructures',
      'activitiesParticipation',
      'environmentalFactors',
    ];
    const trends = {};

    for (const domain of domains) {
      const points = assessments
        .map(a => ({
          date: a.assessmentDate,
          number: a.assessmentNumber,
          score: a.domainScores?.find(ds => ds.domain === domain),
        }))
        .filter(p => p.score);

      if (points.length < 2) {
        trends[domain] = { trend: 'insufficient_data', points: points.length };
        continue;
      }

      const first = points[0].score.averageQualifier;
      const last = points[points.length - 1].score.averageQualifier;
      const change = last - first;

      // في ICF: أقل = أفضل
      let trend;
      if (change < -0.3) trend = 'improving';
      else if (change > 0.3) trend = 'declining';
      else trend = 'stable';

      trends[domain] = {
        domain,
        domainAr: DOMAIN_LABELS[domain]?.ar,
        trend,
        trendAr: trend === 'improving' ? 'تحسن' : trend === 'declining' ? 'تراجع' : 'مستقر',
        firstValue: Math.round(first * 100) / 100,
        lastValue: Math.round(last * 100) / 100,
        change: Math.round(change * 100) / 100,
        dataPoints: points.map(p => ({
          date: p.date,
          qualifier: p.score.averageQualifier,
        })),
      };
    }

    return trends;
  }

  static _buildPeriodSummary(assessments) {
    if (assessments.length === 0) return null;

    const first = assessments[0];
    const last = assessments[assessments.length - 1];

    const improved = [];
    const declined = [];
    const stable = [];

    const domains = [
      'bodyFunctions',
      'bodyStructures',
      'activitiesParticipation',
      'environmentalFactors',
    ];
    for (const domain of domains) {
      const firstDS = first.domainScores?.find(ds => ds.domain === domain);
      const lastDS = last.domainScores?.find(ds => ds.domain === domain);
      if (!firstDS || !lastDS) continue;

      const change = lastDS.averageQualifier - firstDS.averageQualifier;
      const entry = {
        domain,
        domainAr: DOMAIN_LABELS[domain]?.ar,
        from: firstDS.averageQualifier,
        to: lastDS.averageQualifier,
        change: Math.round(change * 100) / 100,
      };

      if (change < -0.3) improved.push(entry);
      else if (change > 0.3) declined.push(entry);
      else stable.push(entry);
    }

    return {
      summaryAr: `خلال فترة ${assessments.length} تقييمات: تحسن في ${improved.length} مجالات، استقرار في ${stable.length} مجالات، تراجع في ${declined.length} مجالات`,
      summary: `Over ${assessments.length} assessments: improved in ${improved.length}, stable in ${stable.length}, declined in ${declined.length} domains`,
      improved,
      declined,
      stable,
    };
  }

  static _generateTrendRecommendations(assessments) {
    if (assessments.length < 2) return [];

    const recommendations = [];
    const last = assessments[assessments.length - 1];
    const prev = assessments[assessments.length - 2];

    const domains = [
      'bodyFunctions',
      'bodyStructures',
      'activitiesParticipation',
      'environmentalFactors',
    ];

    for (const domain of domains) {
      const lastDS = last.domainScores?.find(ds => ds.domain === domain);
      const prevDS = prev.domainScores?.find(ds => ds.domain === domain);
      if (!lastDS || !prevDS) continue;

      const change = lastDS.averageQualifier - prevDS.averageQualifier;

      if (change > 0.5) {
        recommendations.push({
          domain,
          domainAr: DOMAIN_LABELS[domain]?.ar,
          type: 'warning',
          message: `Decline detected in ${DOMAIN_LABELS[domain]?.en}. Review intervention plan.`,
          messageAr: `تم رصد تراجع في ${DOMAIN_LABELS[domain]?.ar}. يرجى مراجعة خطة التدخل.`,
        });
      } else if (change < -0.5) {
        recommendations.push({
          domain,
          domainAr: DOMAIN_LABELS[domain]?.ar,
          type: 'success',
          message: `Significant improvement in ${DOMAIN_LABELS[domain]?.en}. Continue current approach.`,
          messageAr: `تحسن ملحوظ في ${DOMAIN_LABELS[domain]?.ar}. يُنصح بالاستمرار بالنهج الحالي.`,
        });
      }

      // فجوة الأداء-القدرة
      if (domain === 'activitiesParticipation' && lastDS.performanceCapacityGap > 1) {
        recommendations.push({
          domain,
          domainAr: DOMAIN_LABELS[domain]?.ar,
          type: 'info',
          message: 'Performance-capacity gap detected. Environmental modifications may help.',
          messageAr: 'تم رصد فجوة بين الأداء والقدرة. قد تساعد التعديلات البيئية.',
        });
      }
    }

    // عوامل بيئية
    const envDS = last.domainScores?.find(ds => ds.domain === 'environmentalFactors');
    if (envDS && envDS.barrierCount > envDS.facilitatorCount) {
      recommendations.push({
        domain: 'environmentalFactors',
        domainAr: 'العوامل البيئية',
        type: 'warning',
        message:
          'More barriers than facilitators identified. Focus on environmental interventions.',
        messageAr: 'عوائق بيئية أكثر من المُيسّرات. يرجى التركيز على التدخلات البيئية.',
      });
    }

    return recommendations;
  }

  static _qualifierToSeverity(avgQualifier) {
    if (avgQualifier <= 0.5) return { level: 0, en: 'No problem', ar: 'لا مشكلة' };
    if (avgQualifier <= 1.5) return { level: 1, en: 'Mild', ar: 'خفيفة' };
    if (avgQualifier <= 2.5) return { level: 2, en: 'Moderate', ar: 'متوسطة' };
    if (avgQualifier <= 3.5) return { level: 3, en: 'Severe', ar: 'شديدة' };
    return { level: 4, en: 'Complete', ar: 'كاملة' };
  }

  static _getSeverityLabel(severity, lang = 'ar') {
    const map = {
      noProblem: { en: 'No Problem', ar: 'لا مشكلة' },
      mild: { en: 'Mild', ar: 'خفيفة' },
      moderate: { en: 'Moderate', ar: 'متوسطة' },
      severe: { en: 'Severe', ar: 'شديدة' },
      complete: { en: 'Complete', ar: 'كاملة' },
    };
    return map[severity]?.[lang] || severity;
  }
}

module.exports = ICFReportService;
