/**
 * Analytics & Reporting Models
 * نماذج البيانات لنظام التحليلات والتقارير المتقدم
 *
 * Features:
 * - KPIs (Key Performance Indicators)
 * - Custom Reports
 * - Analytics Data
 * - Report Templates
 */

const mongoose = require('mongoose');

/**
 * مؤشر الأداء الرئيسي (KPI)
 */
const KPISchema = new mongoose.Schema(
  {
    // معلومات أساسية
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // التصنيف
    category: {
      type: String,
      required: true,
      enum: [
        'operational', // كفاءة تشغيلية
        'quality', // جودة الخدمة
        'satisfaction', // رضا المستفيدين
        'financial', // مالية
        'performance', // أداء
        'custom', // مخصص
      ],
    },

    // القيم
    value: {
      current: { type: Number, default: 0 },
      target: { type: Number, required: true },
      previous: { type: Number, default: 0 },
    },

    // الوحدة
    unit: {
      type: String,
      enum: ['percentage', 'number', 'currency', 'time', 'count'],
      default: 'number',
    },

    // الاتجاه المطلوب
    direction: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'up',
      description: 'up = كلما زاد أفضل, down = كلما قل أفضل',
    },

    // الحساب
    calculation: {
      formula: String, // صيغة الحساب
      dataSource: String, // مصدر البيانات
      refreshInterval: {
        // فترة التحديث (بالدقائق)
        type: Number,
        default: 60,
      },
      lastCalculated: Date,
    },

    // الحدود
    thresholds: {
      excellent: Number, // ممتاز
      good: Number, // جيد
      warning: Number, // تحذير
      critical: Number, // حرج
    },

    // التاريخ
    history: [
      {
        value: Number,
        date: Date,
        note: String,
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: ['excellent', 'good', 'warning', 'critical'],
      default: 'good',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // الأذونات
    visibleTo: [
      {
        type: String,
        enum: ['admin', 'manager', 'finance', 'hr', 'teacher', 'all'],
      },
    ],

    // الرسوم البيانية
    visualization: {
      type: {
        type: String,
        enum: ['line', 'bar', 'pie', 'gauge', 'number'],
        default: 'number',
      },
      color: String,
    },

    // الوصف
    description: String,
    descriptionAr: String,

    // التواريخ
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// حساب الحالة تلقائياً
KPISchema.pre('save', function (next) {
  const value = this.value.current;
  const target = this.value.target;
  const thresholds = this.thresholds;

  if (!thresholds || !thresholds.excellent) {
    return next();
  }

  // تحديد الحالة بناءً على القيمة والحدود
  if (this.direction === 'up') {
    if (value >= thresholds.excellent) {
      this.status = 'excellent';
    } else if (value >= thresholds.good) {
      this.status = 'good';
    } else if (value >= thresholds.warning) {
      this.status = 'warning';
    } else {
      this.status = 'critical';
    }
  } else {
    if (value <= thresholds.excellent) {
      this.status = 'excellent';
    } else if (value <= thresholds.good) {
      this.status = 'good';
    } else if (value <= thresholds.warning) {
      this.status = 'warning';
    } else {
      this.status = 'critical';
    }
  }

  next();
});

/**
 * قالب التقرير (Report Template)
 */
const ReportTemplateSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // التصنيف
    category: {
      type: String,
      required: true,
      enum: [
        'financial', // مالي
        'operational', // تشغيلي
        'academic', // أكاديمي
        'hr', // موارد بشرية
        'student', // طلاب
        'custom', // مخصص
      ],
    },

    // البنية
    structure: {
      // الأقسام
      sections: [
        {
          name: String,
          nameAr: String,
          order: Number,
          type: {
            type: String,
            enum: ['text', 'table', 'chart', 'kpi', 'summary'],
          },
          config: mongoose.Schema.Types.Mixed,
        },
      ],

      // الرسوم البيانية
      charts: [
        {
          type: {
            type: String,
            enum: ['line', 'bar', 'pie', 'area', 'scatter', 'mixed'],
          },
          dataSource: String,
          config: mongoose.Schema.Types.Mixed,
        },
      ],

      // المؤشرات
      kpis: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'KPI',
        },
      ],
    },

    // الفلاتر
    filters: [
      {
        field: String,
        label: String,
        labelAr: String,
        type: {
          type: String,
          enum: ['date', 'select', 'multiselect', 'text', 'number'],
        },
        options: [mongoose.Schema.Types.Mixed],
        required: Boolean,
      },
    ],

    // استعلام البيانات
    dataQuery: {
      collection: String,
      fields: [String],
      aggregation: mongoose.Schema.Types.Mixed,
      joins: [mongoose.Schema.Types.Mixed],
    },

    // التنسيق
    formatting: {
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait',
      },
      pageSize: {
        type: String,
        enum: ['A4', 'A3', 'Letter'],
        default: 'A4',
      },
      header: {
        show: { type: Boolean, default: true },
        logo: Boolean,
        title: Boolean,
        date: Boolean,
      },
      footer: {
        show: { type: Boolean, default: true },
        pageNumbers: Boolean,
        generatedBy: Boolean,
      },
    },

    // الجدولة
    schedule: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      },
      dayOfWeek: Number, // 0-6 (الأحد-السبت)
      dayOfMonth: Number, // 1-31
      time: String, // HH:mm
      recipients: [
        {
          email: String,
          name: String,
        },
      ],
    },

    // الأذونات
    permissions: {
      canView: [
        {
          type: String,
          enum: ['admin', 'manager', 'finance', 'hr', 'teacher'],
        },
      ],
      canEdit: [
        {
          type: String,
          enum: ['admin', 'manager'],
        },
      ],
      isPublic: {
        type: Boolean,
        default: false,
      },
    },

    // الحالة
    isActive: {
      type: Boolean,
      default: true,
    },

    // الإحصائيات
    stats: {
      generatedCount: { type: Number, default: 0 },
      lastGenerated: Date,
      avgGenerationTime: Number, // بالثواني
    },

    // التواريخ
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * تقرير مُنشأ (Generated Report)
 */
const GeneratedReportSchema = new mongoose.Schema(
  {
    // المرجع
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: true,
    },

    // معلومات التقرير
    title: String,
    titleAr: String,

    // الفترة الزمنية
    period: {
      from: Date,
      to: Date,
      label: String,
      labelAr: String,
    },

    // الفلاتر المطبقة
    appliedFilters: mongoose.Schema.Types.Mixed,

    // البيانات
    data: mongoose.Schema.Types.Mixed,

    // الملف
    file: {
      format: {
        type: String,
        enum: ['pdf', 'excel', 'csv', 'json'],
        required: true,
      },
      path: String,
      size: Number, // بالبايتات
      url: String,
    },

    // الإنشاء
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generationTime: Number, // بالثواني

    // الحالة
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
    },
    error: String,

    // المشاركة
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        sharedAt: Date,
        accessType: {
          type: String,
          enum: ['view', 'download'],
          default: 'view',
        },
      },
    ],

    // الإحصائيات
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    lastViewed: Date,

    // تاريخ الانتهاء
    expiresAt: Date,

    // التواريخ
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// فهرسة للأداء
GeneratedReportSchema.index({ generatedBy: 1, createdAt: -1 });
GeneratedReportSchema.index({ template: 1, createdAt: -1 });
GeneratedReportSchema.index({ status: 1, createdAt: -1 });
GeneratedReportSchema.index({ expiresAt: 1 });

/**
 * لوحة التحكم (Dashboard)
 */
const DashboardSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },

    // التصنيف
    type: {
      type: String,
      required: true,
      enum: ['executive', 'operational', 'financial', 'academic', 'custom'],
    },

    // التخطيط
    layout: {
      columns: { type: Number, default: 12 },
      widgets: [
        {
          id: String,
          type: {
            type: String,
            enum: ['kpi', 'chart', 'table', 'text', 'iframe'],
          },
          position: {
            x: Number,
            y: Number,
            w: Number, // width in columns
            h: Number, // height in rows
          },
          config: mongoose.Schema.Types.Mixed,
          dataSource: String,
          refreshInterval: Number, // بالثواني
        },
      ],
    },

    // الفلاتر العامة
    globalFilters: [
      {
        field: String,
        label: String,
        labelAr: String,
        type: String,
        defaultValue: mongoose.Schema.Types.Mixed,
      },
    ],

    // الأذونات
    permissions: {
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      sharedWith: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          role: {
            type: String,
            enum: ['view', 'edit'],
          },
        },
      ],
      isPublic: {
        type: Boolean,
        default: false,
      },
      allowedRoles: [
        {
          type: String,
          enum: ['admin', 'manager', 'finance', 'hr', 'teacher'],
        },
      ],
    },

    // الحالة
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },

    // الإحصائيات
    stats: {
      views: { type: Number, default: 0 },
      uniqueViewers: [mongoose.Schema.Types.ObjectId],
      lastViewed: Date,
    },

    // التواريخ
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * البيانات التحليلية (Analytics Data)
 */
const AnalyticsDataSchema = new mongoose.Schema(
  {
    // التصنيف
    category: {
      type: String,
      required: true,
      enum: [
        'user_activity',
        'system_performance',
        'financial_metrics',
        'academic_metrics',
        'operational_metrics',
      ],
    },

    // النوع
    metricType: {
      type: String,
      required: true,
    },

    // القيمة
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // الأبعاد (Dimensions)
    dimensions: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      department: String,
      location: String,
      custom: mongoose.Schema.Types.Mixed,
    },

    // الطابع الزمني
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // الفترة
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
    },

    // البيانات الوصفية
    metadata: mongoose.Schema.Types.Mixed,

    // المصدر
    source: {
      type: String,
      enum: ['system', 'manual', 'import', 'api'],
    },
  },
  {
    timestamps: true,
  }
);

// فهرسة للأداء
AnalyticsDataSchema.index({ category: 1, timestamp: -1 });
AnalyticsDataSchema.index({ metricType: 1, timestamp: -1 });
AnalyticsDataSchema.index({ 'dimensions.user': 1, timestamp: -1 });

/**
 * التنبؤات (Predictions)
 */
const PredictionSchema = new mongoose.Schema(
  {
    // النوع
    type: {
      type: String,
      required: true,
      enum: ['enrollment', 'revenue', 'performance', 'churn', 'custom'],
    },

    // المؤشر المرتبط
    kpi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KPI',
    },

    // البيانات التاريخية
    historicalData: [
      {
        date: Date,
        value: Number,
      },
    ],

    // التنبؤ
    predictions: [
      {
        date: Date,
        predictedValue: Number,
        confidence: Number, // 0-100%
        lowerBound: Number,
        upperBound: Number,
      },
    ],

    // النموذج
    model: {
      type: {
        type: String,
        enum: ['linear', 'exponential', 'arima', 'neural', 'custom'],
      },
      accuracy: Number, // 0-100%
      parameters: mongoose.Schema.Types.Mixed,
    },

    // الفترة
    period: {
      from: Date,
      to: Date,
    },

    // الحالة
    status: {
      type: String,
      enum: ['calculating', 'completed', 'failed'],
      default: 'calculating',
    },

    // التواريخ
    createdAt: {
      type: Date,
      default: Date.now,
    },
    calculatedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// تصدير النماذج
module.exports = {
  KPI: mongoose.model('KPI', KPISchema),
  ReportTemplate: mongoose.model('ReportTemplate', ReportTemplateSchema),
  GeneratedReport: mongoose.model('GeneratedReport', GeneratedReportSchema),
  Dashboard: mongoose.model('Dashboard', DashboardSchema),
  AnalyticsData: mongoose.model('AnalyticsData', AnalyticsDataSchema),
  Prediction: mongoose.model('Prediction', PredictionSchema),
};
