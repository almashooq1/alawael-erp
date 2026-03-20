/**
 * Benchmarking Report Model — نموذج تقرير المقارنة المعيارية
 *
 * Comparative benchmarking between centers, programs, and against
 * national/international standards.
 */
const mongoose = require('mongoose');

const benchmarkingReportSchema = new mongoose.Schema(
  {
    // ─── Core ──────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'عنوان التقرير مطلوب'],
      trim: true,
    },
    titleAr: String,
    reportType: {
      type: String,
      enum: [
        'internal', // مقارنة داخلية بين الأقسام
        'inter-center', // بين المراكز
        'national', // مقارنة وطنية
        'international', // مقارنة دولية
        'temporal', // مقارنة زمنية (نفس المركز)
        'program-comparison', // مقارنة بين البرامج
      ],
      required: true,
      index: true,
    },

    // ─── Period ────────────────────────────────────────────────────────
    period: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
      periodType: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi-annual', 'annual', 'custom'],
        default: 'quarterly',
      },
    },

    // ─── Our Center Data ───────────────────────────────────────────────
    centerData: {
      centerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
      centerName: String,
      indicators: [
        {
          indicatorId: String,
          name: String,
          nameAr: String,
          category: {
            type: String,
            enum: [
              'clinical-outcomes', // النتائج السريرية
              'patient-satisfaction', // رضا المرضى
              'operational-efficiency', // الكفاءة التشغيلية
              'safety', // السلامة
              'staff-competency', // كفاءة الكوادر
              'cost-efficiency', // كفاءة التكلفة
              'accessibility', // إمكانية الوصول
              'innovation', // الابتكار
              'research-output', // مخرجات البحث
            ],
          },
          value: Number,
          unit: String,
          target: Number,
          benchmark: Number, // industry/national standard
          percentile: Number, // where we stand (0-100)
          trend: {
            type: String,
            enum: ['improving', 'stable', 'declining'],
          },
          historicalValues: [{ period: String, value: Number }],
        },
      ],
    },

    // ─── Comparison Centers ────────────────────────────────────────────
    comparisonData: [
      {
        centerName: String,
        centerType: String, // e.g., 'government', 'private', 'NGO'
        country: String,
        region: String,
        anonymous: { type: Boolean, default: true },
        indicators: [
          {
            indicatorId: String,
            value: Number,
            percentile: Number,
          },
        ],
      },
    ],

    // ─── National/International Standards ──────────────────────────────
    standardBenchmarks: [
      {
        standardName: String, // e.g., 'CARF', 'JCI', 'Saudi MOH', 'WHO'
        standardBody: String,
        indicators: [
          {
            indicatorId: String,
            targetValue: Number,
            minimumValue: Number,
            bestPracticeValue: Number,
          },
        ],
      },
    ],

    // ─── Analysis ──────────────────────────────────────────────────────
    analysis: {
      overallScore: Number, // composite 0-100
      overallPercentile: Number, // percentile among compared centers
      strengths: [
        {
          indicatorId: String,
          description: String,
          descriptionAr: String,
          percentileRank: Number,
        },
      ],
      areasForImprovement: [
        {
          indicatorId: String,
          description: String,
          descriptionAr: String,
          currentValue: Number,
          targetValue: Number,
          gap: Number,
          priority: { type: String, enum: ['high', 'medium', 'low'] },
        },
      ],
      recommendations: [
        {
          area: String,
          recommendation: String,
          recommendationAr: String,
          expectedImpact: String,
          timeline: String,
          resources: String,
        },
      ],
    },

    // ─── Visualization Data ────────────────────────────────────────────
    charts: {
      radarChartData: mongoose.Schema.Types.Mixed,
      barChartData: mongoose.Schema.Types.Mixed,
      trendLineData: mongoose.Schema.Types.Mixed,
      heatmapData: mongoose.Schema.Types.Mixed,
    },

    // ─── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'in-review', 'approved', 'published', 'archived'],
      default: 'draft',
      index: true,
    },

    // ─── Metadata ──────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
benchmarkingReportSchema.index({ reportType: 1, status: 1 });
benchmarkingReportSchema.index({ 'period.from': 1, 'period.to': 1 });
benchmarkingReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BenchmarkingReport', benchmarkingReportSchema);
