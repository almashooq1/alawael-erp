/* eslint-disable no-unused-vars */
/**
 * خدمة تحسين الاستعلامات - Query Optimizer Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 * لتحسين أداء الاستعلامات وتقليل زمن التنفيذ
 */

const EventEmitter = require('events');

class QueryOptimizerService extends EventEmitter {
  constructor() {
    super();

    // سجل الاستعلامات البطيئة
    this.slowQueries = [];

    // إحصائيات الاستعلامات
    this.queryStats = new Map();

    // الاقتراحات
    this.suggestions = [];

    // التكوين
    this.config = {
      slowQueryThreshold: 100, // مللي ثانية
      maxSlowQueries: 100,
      analyzeInterval: 60000, // دقيقة
      enableAutoOptimize: true,
    };

    // أنماط التحسين
    this.optimizationPatterns = [
      {
        pattern: /find\(\s*\{\s*\}\s*\)/g,
        issue: 'استعلام بدون فلترة',
        suggestion: 'أضف شروط البحث لتقليل النتائج',
      },
      {
        pattern: /\.select\(\s*\)/g,
        issue: 'استعلام بدون تحديد حقول',
        suggestion: 'استخدم .select() لتحديد الحقول المطلوبة فقط',
      },
      {
        pattern: /\.skip\(\s*\d{4,}\s*\)/g,
        issue: 'تخطي عدد كبير من السجلات',
        suggestion: 'استخدم الفهرسة أو التصفح بالمؤشر',
      },
      {
        pattern: /\$where/g,
        issue: 'استخدام $where',
        suggestion: 'تجنب $where لأنه بطيء، استخدم عوامل التشغيل العادية',
      },
      {
        pattern: /\.sort\(\s*\{\s*\w+\s*:\s*1\s*\}\s*\)/g,
        issue: 'ترتيب بدون فهرس',
        suggestion: 'أضف فهرس للحقل المُرتب',
      },
    ];
  }

  // تحليل استعلام
  analyzeQuery(query, duration, model = 'unknown') {
    const queryInfo = {
      query: this.serializeQuery(query),
      duration,
      model,
      timestamp: new Date(),
      isSlow: duration > this.config.slowQueryThreshold,
    };

    // تسجيل الاستعلام البطيء
    if (queryInfo.isSlow) {
      this.recordSlowQuery(queryInfo);
    }

    // تحديث الإحصائيات
    this.updateStats(queryInfo);

    // تحليل الأنماط
    const patterns = this.detectPatterns(query);
    if (patterns.length > 0) {
      queryInfo.patterns = patterns;
      this.generateSuggestions(queryInfo, patterns);
    }

    this.emit('query-analyzed', queryInfo);
    return queryInfo;
  }

  // تسويل الاستعلام
  serializeQuery(query) {
    if (typeof query === 'string') return query;
    try {
      return JSON.stringify(query);
    } catch {
      return String(query);
    }
  }

  // تسجيل الاستعلام البطيء
  recordSlowQuery(queryInfo) {
    this.slowQueries.unshift(queryInfo);

    if (this.slowQueries.length > this.config.maxSlowQueries) {
      this.slowQueries.pop();
    }

    this.emit('slow-query', queryInfo);
  }

  // تحديث الإحصائيات
  updateStats(queryInfo) {
    const key = queryInfo.model;

    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        slowCount: 0,
      });
    }

    const stats = this.queryStats.get(key);
    stats.count++;
    stats.totalDuration += queryInfo.duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.maxDuration = Math.max(stats.maxDuration, queryInfo.duration);
    stats.minDuration = Math.min(stats.minDuration, queryInfo.duration);

    if (queryInfo.isSlow) {
      stats.slowCount++;
    }
  }

  // اكتشاف الأنماط
  detectPatterns(query) {
    const queryStr = this.serializeQuery(query);
    const detected = [];

    for (const { pattern, issue, suggestion } of this.optimizationPatterns) {
      if (pattern.test(queryStr)) {
        detected.push({ issue, suggestion });
      }
    }

    return detected;
  }

  // توليد الاقتراحات
  generateSuggestions(queryInfo, patterns) {
    for (const pattern of patterns) {
      const suggestion = {
        query: queryInfo.query,
        model: queryInfo.model,
        issue: pattern.issue,
        suggestion: pattern.suggestion,
        duration: queryInfo.duration,
        timestamp: new Date(),
      };

      // تجنب التكرار
      const exists = this.suggestions.some(
        s => s.query === suggestion.query && s.issue === suggestion.issue
      );

      if (!exists) {
        this.suggestions.unshift(suggestion);
        this.emit('suggestion-generated', suggestion);
      }
    }
  }

  // اقتراح فهارس
  suggestIndexes(model, fields) {
    const suggestions = [];

    for (const field of fields) {
      suggestions.push({
        model,
        field,
        index: { [field]: 1 },
        reason: 'تحسين أداء البحث والترتيب',
      });
    }

    return suggestions;
  }

  // تحسين استعلام تلقائياً
  optimizeQuery(query, options = {}) {
    let optimizedQuery = { ...query };
    const optimizations = [];

    // تحسين 1: إضافة حد للنتائج
    if (!optimizedQuery.limit && options.defaultLimit) {
      optimizedQuery.limit = options.defaultLimit;
      optimizations.push('تم إضافة حد للنتائج');
    }

    // تحسين 2: تحويل التواريخ
    if (optimizedQuery.createdAt || optimizedQuery.updatedAt) {
      // التواريخ محولة بالفعل
    }

    // تحسين 3: تبسيط الشروط
    if (optimizedQuery.$and) {
      const simplified = this.simplifyConditions(optimizedQuery.$and);
      if (simplified) {
        optimizedQuery = { ...optimizedQuery, ...simplified };
        delete optimizedQuery.$and;
        optimizations.push('تم تبسيط شروط $and');
      }
    }

    return { optimizedQuery, optimizations };
  }

  // تبسيط الشروط
  simplifyConditions(conditions) {
    const simplified = {};

    for (const cond of conditions) {
      for (const [key, value] of Object.entries(cond)) {
        if (!simplified[key]) {
          simplified[key] = value;
        } else if (Array.isArray(simplified[key])) {
          simplified[key].push(value);
        } else {
          simplified[key] = [simplified[key], value];
        }
      }
    }

    return Object.keys(simplified).length > 0 ? simplified : null;
  }

  // الحصول على تقرير الأداء
  getPerformanceReport() {
    const models = [];

    for (const [model, stats] of this.queryStats) {
      models.push({
        model,
        queries: stats.count,
        avgDuration: `${stats.avgDuration.toFixed(2)}ms`,
        maxDuration: `${stats.maxDuration}ms`,
        minDuration: stats.minDuration === Infinity ? 'N/A' : `${stats.minDuration}ms`,
        slowQueries: stats.slowCount,
        slowPercentage: `${((stats.slowCount / stats.count) * 100).toFixed(1)}%`,
      });
    }

    return {
      summary: {
        totalQueries: Array.from(this.queryStats.values()).reduce((sum, s) => sum + s.count, 0),
        slowQueriesCount: this.slowQueries.length,
        suggestionsCount: this.suggestions.length,
        modelsCount: this.queryStats.size,
      },
      models,
      slowQueries: this.slowQueries.slice(0, 10),
      suggestions: this.suggestions.slice(0, 10),
    };
  }

  // الحصول على الاستعلامات البطيئة
  getSlowQueries(limit = 20) {
    return this.slowQueries.slice(0, limit);
  }

  // الحصول على الاقتراحات
  getSuggestions(limit = 20) {
    return this.suggestions.slice(0, limit);
  }

  // مسح السجلات
  clearRecords() {
    this.slowQueries = [];
    this.queryStats.clear();
    this.suggestions = [];
    this.emit('records-cleared');
  }

  // middlware للتحليل
  middleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;

        if (req.path.includes('/api/')) {
          this.analyzeQuery(
            { method: req.method, path: req.path, query: req.query },
            duration,
            'API'
          );
        }
      });

      next();
    };
  }

  // تغليف نموذج Mongoose
  wrapModel(model) {
    const originalFind = model.find.bind(model);
    const originalFindOne = model.findOne.bind(model);
    const originalAggregate = model.aggregate.bind(model);

    model.find = async (...args) => {
      const start = Date.now();
      const result = await originalFind(...args);
      const duration = Date.now() - start;

      this.analyzeQuery(args[0], duration, model.modelName);
      return result;
    };

    model.findOne = async (...args) => {
      const start = Date.now();
      const result = await originalFindOne(...args);
      const duration = Date.now() - start;

      this.analyzeQuery(args[0], duration, model.modelName);
      return result;
    };

    model.aggregate = async (...args) => {
      const start = Date.now();
      const result = await originalAggregate(...args);
      const duration = Date.now() - start;

      this.analyzeQuery(args[0], duration, `${model.modelName}_aggregate`);
      return result;
    };

    return model;
  }
}

module.exports = new QueryOptimizerService();
