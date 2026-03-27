/* eslint-disable no-unused-vars */ /**
 * 🗂️ Advanced Intelligent Archiving System
 * نظام الأرشفة الإلكترونية الذكي المتقدم
 *
 * نظام شامل لإدارة وأرشفة المستندات بذكاء
 * يتضمن:
 * - تصنيف تلقائي ذكي
 * - ضغط وتحسين الأداء
 * - فهرسة متقدمة
 * - بحث ذكي
 * - استرجاع سريع
 * - نسخ احتياطية ذكية
 * - إدارة النسخ
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class AdvancedArchivingSystem {
  constructor() {
    // المستندات المؤرشفة
    this.archives = new Map();

    // الفهرس الذكي
    this.indexer = new Map();

    // معلومات الضغط
    this.compressionInfo = new Map();

    // سجل النشاط
    this.activityLog = [];

    // إحصائيات الأرشفة
    this.statistics = {
      totalArchived: 0,
      totalCompressed: 0,
      totalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      averageCompressionTime: 0,
      archiveCount: 0,
      categories: {},
    };

    // فئات التصنيف الذكي
    this.categories = this.initializeCategories();

    // قوالب الأرشفة
    this.templates = this.initializeTemplates();

    // سياسات الاحتفاظ
    this.retentionPolicies = this.initializeRetentionPolicies();
  }

  /**
   * تهيئة فئات التصنيف الذكي
   */
  initializeCategories() {
    return {
      // الوثائق المالية
      FINANCIAL: {
        keywords: [
          'فاتورة',
          'دفع',
          'صرف',
          'إيرادات',
          'مصروفات',
          'ميزانية',
          'تقرير مالي',
          'وثيقة مالية',
          'مالية',
        ],
        priority: 'high',
        retention: 2555, // 7 سنوات
        icon: '💰',
      },
      // الموارد البشرية
      HR: {
        keywords: ['موظف', 'عقد', 'إجازة', 'تقييم', 'مكافأة', 'تدريب', 'أداء'],
        priority: 'high',
        retention: 1825, // 5 سنوات
        icon: '👥',
      },
      // العقود والاتفاقيات
      CONTRACTS: {
        keywords: ['عقد', 'اتفاقية', 'شروط', 'بنود', 'توقيع', 'التزام'],
        priority: 'critical',
        retention: 3650, // 10 سنوات
        icon: '📋',
      },
      // الأرشيف التاريخي
      HISTORICAL: {
        keywords: ['تاريخي', 'أرشيف', 'سابق', 'قديم', 'ماضي'],
        priority: 'low',
        retention: 7300, // 20 سنة
        icon: '📚',
      },
      // المشاريع
      PROJECTS: {
        keywords: ['مشروع', 'إنجاز', 'مراحل', 'تقدم', 'نتائج'],
        priority: 'medium',
        retention: 1095, // 3 سنوات
        icon: '🎯',
      },
      // التقارير
      REPORTS: {
        keywords: ['تقرير', 'تحليل', 'إحصائيات', 'بيانات', 'نتائج'],
        priority: 'medium',
        retention: 1825, // 5 سنوات
        icon: '📊',
      },
      // القانونية والامتثال
      LEGAL: {
        keywords: ['قانوني', 'امتثال', 'تدقيق', 'نظام', 'سياسة', 'تشريع'],
        priority: 'critical',
        retention: 3650, // 10 سنوات
        icon: '⚖️',
      },
      // الصحة والسلامة
      SAFETY: {
        keywords: ['سلامة', 'صحة', 'احتياطات', 'حوادث', 'وقاية'],
        priority: 'high',
        retention: 2555, // 7 سنوات
        icon: '🛡️',
      },
      // التسويق والمبيعات
      MARKETING: {
        keywords: ['تسويق', 'مبيعات', 'حملة', 'عملاء', 'منتجات'],
        priority: 'medium',
        retention: 730, // سنة واحدة
        icon: '📢',
      },
      // تكنولوجيا المعلومات
      IT: {
        keywords: ['نظام', 'برنامج', 'شبكة', 'أمان', 'نسخ احتياطية'],
        priority: 'high',
        retention: 1095, // 3 سنوات
        icon: '💻',
      },
    };
  }

  /**
   * تهيئة قوالب الأرشفة
   */
  initializeTemplates() {
    return {
      MONTHLY_FINANCIAL: {
        pattern: 'MM_YYYY_Financial',
        frequency: 'monthly',
        compression: 'high',
        retention: 2555,
      },
      QUARTERLY_REPORT: {
        pattern: 'Q_YYYY_Report',
        frequency: 'quarterly',
        compression: 'medium',
        retention: 1825,
      },
      ANNUAL_ARCHIVE: {
        pattern: 'YYYY_Annual',
        frequency: 'yearly',
        compression: 'maximum',
        retention: 3650,
      },
      PROJECT_CLOSURE: {
        pattern: 'PROJECT_YYYY_FINAL',
        frequency: 'on-demand',
        compression: 'high',
        retention: 1095,
      },
    };
  }

  /**
   * تهيئة سياسات الاحتفاظ بالمستندات
   */
  initializeRetentionPolicies() {
    return {
      default: {
        duration: 1095, // 3 سنوات
        action: 'archive', // archive أو delete
      },
      compliance: {
        duration: 2555, // 7 سنوات
        action: 'archive',
      },
      legal: {
        duration: 3650, // 10 سنوات
        action: 'archive',
      },
      temporary: {
        duration: 30, // شهر واحد
        action: 'delete',
      },
    };
  }

  /**
   * تصنيف ذكي للمستندات
   * @param {Object} document - المستند
   * @returns {Object} فئة التصنيف والثقة
   */
  smartClassify(document) {
    const { name, content, type, tags } = document;
    const fullText = `${name} ${content || ''} ${(tags || []).join(' ')}`.toLowerCase();

    let bestMatch = null;
    let highestScore = 0;

    for (const [category, info] of Object.entries(this.categories)) {
      let score = 0;
      const keywords = info.keywords;

      // حساب النقاط بناءً على الكلمات الرئيسية
      keywords.forEach(keyword => {
        // البحث عن الكلمة بشكل أكثر مرونة (مع ال التعريف)
        const simpleRegex = new RegExp(keyword, 'gi');
        const matches = fullText.match(simpleRegex) || [];
        score += matches.length * 10;
      });

      // النقاط الإضافية للنوع
      if (type && this.isTypeMatch(type, category)) {
        score += 20;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          category,
          confidence: Math.min(100, (score > 0 ? 50 : 0) + Math.min(50, score / 2)),
          score: highestScore,
          icon: info.icon,
          priority: info.priority,
          retention: info.retention,
        };
      }
    }

    return (
      bestMatch || {
        category: 'UNCATEGORIZED',
        confidence: 0,
        icon: '📄',
        priority: 'medium',
        retention: 1095,
      }
    );
  }

  /**
   * التحقق من توافق النوع مع الفئة
   */
  isTypeMatch(type, category) {
    const typeMapping = {
      pdf: ['FINANCIAL', 'CONTRACTS', 'REPORTS', 'LEGAL'],
      xlsx: ['FINANCIAL', 'REPORTS'],
      docx: ['CONTRACTS', 'REPORTS', 'HR'],
      jpg: ['MARKETING', 'PROJECTS'],
      zip: ['PROJECTS', 'ARCHIVES'],
    };

    const matches = typeMapping[type] || [];
    return matches.includes(category);
  }

  /**
   * أرشفة مستند مع ضغط ذكي
   * @param {Object} document - المستند
   * @returns {Object} معلومات الأرشفة
   */
  async archiveDocument(document) {
    const startTime = Date.now();
    const archiveId = this.generateId();

    try {
      // التحقق من البيانات المطلوبة
      if (!document || !document.name) {
        throw new Error('Document name is required');
      }

      // التصنيف الذكي
      const classification = this.smartClassify(document);

      // تقدير حجم المستند إذا لم يكن محدداً
      const documentSize = document.size || (document.content ? document.content.length : 0);
      const docWithSize = { ...document, size: documentSize };

      // الضغط الذكي
      const compressed = await this.intelligentCompress(docWithSize);

      // إنشاء معلومات الأرشفة
      const archiveInfo = {
        id: archiveId,
        originalId: document.id,
        name: document.name,
        originalSize: documentSize,
        compressedSize: compressed.size,
        compressionRatio: this.calculateCompressionRatio(documentSize, compressed.size),
        compressed: true,
        data: compressed.data,
        hash: this.calculateHash(compressed.data),
        classification,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          owner: document.owner,
          tags: document.tags || [],
          description: document.description,
        },
        versions: [
          {
            versionId: this.generateId(),
            timestamp: new Date(),
            size: compressed.size,
            hash: this.calculateHash(compressed.data),
            compressionLevel: compressed.level,
          },
        ],
        accessLog: [],
        retentionPolicy: classification.retention,
        expirationDate: this.calculateExpirationDate(classification.retention),
        verified: true,
        integrityChecks: 0,
      };

      // حفظ الأرشفة
      this.archives.set(archiveId, archiveInfo);

      // تحديث الفهرس
      this.updateIndex(archiveInfo);

      // تسجيل النشاط
      this.logActivity({
        type: 'ARCHIVE_CREATED',
        archiveId,
        documentName: document.name,
        classification: classification.category,
        compressionRatio: archiveInfo.compressionRatio,
        timestamp: new Date(),
      });

      // تحديث الإحصائيات
      this.updateStatistics(archiveInfo);

      const duration = Date.now() - startTime;

      return {
        success: true,
        archiveId,
        classification,
        compressionInfo: {
          originalSize: archiveInfo.originalSize,
          compressedSize: archiveInfo.compressedSize,
          ratio: archiveInfo.compressionRatio,
          saved: archiveInfo.originalSize - archiveInfo.compressedSize,
        },
        processingTime: duration,
        message: `تم أرشفة المستند بنجاح مع نسبة ضغط ${archiveInfo.compressionRatio.toFixed(2)}%`,
      };
    } catch (error) {
      this.logActivity({
        type: 'ARCHIVE_ERROR',
        error: 'حدث خطأ داخلي',
        timestamp: new Date(),
      });

      return {
        success: false,
        error: 'حدث خطأ داخلي',
        archiveId,
      };
    }
  }

  /**
   * ضغط ذكي للمستندات بناءً على النوع والحجم
   */
  async intelligentCompress(document) {
    // استخراج البيانات من document
    const data = document.data || document.content;
    const type = document.type || 'txt';
    const size =
      document.size ||
      (data ? (typeof data === 'string' ? data.length : JSON.stringify(data).length) : 0);

    // تحديد مستوى الضغط بناءً على الحجم والنوع
    let compressionLevel = 6; // افتراضي
    let method = 'gzip';

    if (size >= 9 * 1024 * 1024) {
      compressionLevel = 9; // ضغط أقصى للملفات الكبيرة جداً
    } else if (size >= 5 * 1024 * 1024) {
      compressionLevel = 8; // ضغط عالي جداً
    } else if (size >= 900 * 1024) {
      compressionLevel = 7; // ضغط عالي للملفات الكبيرة
    }

    // أنواع الملفات التي لا تحتاج ضغط
    const noCompressTypes = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'zip', 'rar'];
    const extension = type.split('/').pop().split('.').pop().toLowerCase();
    if (noCompressTypes.includes(extension)) {
      compressionLevel = 1; // ضغط بسيط جداً
      method = 'store';
    }

    return new Promise((resolve, reject) => {
      try {
        // التحقق من صحة البيانات
        if (!data) {
          reject(new Error('Invalid data for compression'));
        }

        const buffer =
          typeof data === 'string' ? Buffer.from(data) : Buffer.from(JSON.stringify(data));
        const compressed = zlib.gzipSync(buffer);

        resolve({
          success: true,
          data: compressed,
          size: compressed.length,
          level: compressionLevel,
          method,
          ratio: compressed.length / size,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * حساب نسبة الضغط
   */
  calculateCompressionRatio(originalSize, compressedSize) {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  /**
   * حساب بصمة التجزئة للتحقق من السلامة
   */
  calculateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * حساب تاريخ انتهاء الأرشفة
   */
  calculateExpirationDate(retentionDaysOrDoc, options = {}) {
    const date = new Date();
    let days = 365; // default

    // Handle both old style (just days) and new style (doc with options)
    if (typeof retentionDaysOrDoc === 'number') {
      days = retentionDaysOrDoc;
    } else if (options && options.retentionDays) {
      days = options.retentionDays;
    } else if (
      retentionDaysOrDoc &&
      typeof retentionDaysOrDoc === 'object' &&
      retentionDaysOrDoc.retentionDays
    ) {
      days = retentionDaysOrDoc.retentionDays;
    }

    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * تحديث الفهرس الذكي
   */
  updateIndex(archiveInfo) {
    const { id, name, classification, metadata } = archiveInfo;

    // فهرس بالمعرف
    this.indexer.set(`id:${id}`, { type: 'id', value: id });

    // فهرس باسم المستند
    name
      .toLowerCase()
      .split(/\s+/)
      .forEach(word => {
        const key = `name:${word}`;
        if (!this.indexer.has(key)) {
          this.indexer.set(key, []);
        }
        this.indexer.get(key).push(id);
      });

    // فهرس بالفئة
    const catKey = `category:${classification.category}`;
    if (!this.indexer.has(catKey)) {
      this.indexer.set(catKey, []);
    }
    this.indexer.get(catKey).push(id);

    // فهرس بالوسوم
    (metadata.tags || []).forEach(tag => {
      const tagKey = `tag:${tag.toLowerCase()}`;
      if (!this.indexer.has(tagKey)) {
        this.indexer.set(tagKey, []);
      }
      this.indexer.get(tagKey).push(id);
    });
  }

  /**
   * البحث الذكي المتقدم
   * @param {string} query - استعلام البحث
   * @param {Object} filters - المرشحات
   * @returns {Array} نتائج البحث
   */
  smartSearch(query, filters = {}) {
    const results = new Map();
    const queryLower = query.toLowerCase();

    // البحث في الفهرس
    for (const [key, value] of this.indexer.entries()) {
      if (key.includes(queryLower)) {
        const archiveIds = Array.isArray(value) ? value : [value];
        archiveIds.forEach(id => {
          const archive = this.archives.get(id);
          if (!results.has(id) && archive) {
            results.set(id, {
              archive,
              relevance: this.calculateRelevance(archive, query),
              matchType: key.split(':')[0],
            });
          }
        });
      }
    }

    // تطبيق المرشحات
    let filtered = Array.from(results.values());

    if (filters.category) {
      filtered = filtered.filter(r => r.archive.classification.category === filters.category);
    }

    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(r => {
        const created = new Date(r.archive.metadata.createdAt);
        if (filters.startDate && created < new Date(filters.startDate)) return false;
        if (filters.endDate && created > new Date(filters.endDate)) return false;
        return true;
      });
    }

    if (filters.minSize || filters.maxSize) {
      filtered = filtered.filter(r => {
        if (filters.minSize && r.archive.originalSize < filters.minSize) return false;
        if (filters.maxSize && r.archive.originalSize > filters.maxSize) return false;
        return true;
      });
    }

    // ترتيب حسب الأهمية
    filtered.sort((a, b) => b.relevance - a.relevance);

    return filtered.slice(0, 50); // حد أقصى 50 نتيجة
  }

  /**
   * حساب درجة الأهمية (Relevance)
   */
  calculateRelevance(archive, query) {
    let score = 0;
    const queryLower = query.toLowerCase();
    const name = archive.name.toLowerCase();

    // مطابقة تامة
    if (name === queryLower) score += 100;
    // يحتوي على الاستعلام
    else if (name.includes(queryLower)) score += 50;
    // البحث في الكلمات
    else {
      const words = queryLower.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const matching = words.filter(w => nameWords.some(nw => nw.includes(w)));
      score += matching.length * 10;
    }

    // نقاط إضافية بناءً على أولوية الفئة
    const priorityScore = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 0,
    };
    score += priorityScore[archive.classification.priority] || 0;

    // نقاط إضافية للمستندات الحديثة
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(archive.metadata.createdAt)) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreated < 30) score += 20;
    else if (daysSinceCreated < 90) score += 10;

    return score;
  }

  /**
   * استرجاع مستند من الأرشيف
   */
  async retrieveArchive(archiveId, options = {}) {
    const archive = this.archives.get(archiveId);

    if (!archive) {
      return {
        success: false,
        error: 'المرشيف غير موجود',
        archiveId,
      };
    }

    try {
      // التحقق من السلامة
      if (!options.skipVerification) {
        const currentHash = this.calculateHash(archive.data);
        if (currentHash !== archive.hash) {
          return {
            success: false,
            error: 'فشل التحقق من سلامة المستند',
            archiveId,
          };
        }
        archive.integrityChecks++;
      }

      // فك الضغط
      const decompressed = await this.decompress(archive.data);

      // تسجيل الوصول
      archive.accessLog.push({
        timestamp: new Date(),
        user: options.userId || 'system',
        action: 'RETRIEVE',
      });

      // تحديث تاريخ الوصول
      archive.metadata.lastAccessedAt = new Date();

      this.logActivity({
        type: 'ARCHIVE_ACCESSED',
        archiveId,
        user: options.userId,
        timestamp: new Date(),
      });

      return {
        success: true,
        archiveId,
        data: decompressed,
        metadata: archive.metadata,
        originalSize: archive.originalSize,
        retrievedAt: new Date(),
        integrityVerified: !options.skipVerification,
        message: 'تم استرجاع المستند بنجاح',
      };
    } catch (error) {
      return {
        success: false,
        error: 'حدث خطأ داخلي',
        archiveId,
      };
    }
  }

  /**
   * فك الضغط
   */
  decompress(data) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decompressed);
      });
    });
  }

  /**
   * إنشاء نسخة احتياطية ذكية
   */
  createSmartBackup(options = {}) {
    const { includeMetadata = true, includeAccessLog = false, compression = 'high' } = options;

    const backup = {
      id: this.generateId(),
      timestamp: new Date(),
      archiveCount: this.archives.size,
      totalSize: this.calculateTotalSize(),
      archives: [],
    };

    for (const [id, archive] of this.archives) {
      const backupArchive = {
        id,
        name: archive.name,
        hash: archive.hash,
        compressedSize: archive.compressedSize,
        classification: archive.classification.category,
        data: archive.data,
      };

      if (includeMetadata) {
        backupArchive.metadata = archive.metadata;
      }

      if (includeAccessLog) {
        backupArchive.accessLog = archive.accessLog;
      }

      backup.archives.push(backupArchive);
    }

    this.logActivity({
      type: 'BACKUP_CREATED',
      backupId: backup.id,
      archiveCount: backup.archiveCount,
      timestamp: new Date(),
    });

    return {
      success: true,
      backupId: backup.id,
      summary: {
        archiveCount: backup.archiveCount,
        totalSize: backup.totalSize,
        timestamp: backup.timestamp,
        compressionLevel: compression,
      },
    };
  }

  /**
   * حساب الحجم الإجمالي
   */
  calculateTotalSize() {
    let total = 0;
    for (const archive of this.archives.values()) {
      total += archive.originalSize;
    }
    return total;
  }

  /**
   * تنظيف الأرشيفات المنتهية
   */
  cleanupExpiredArchives() {
    const now = new Date();
    const deleted = [];
    const archived = [];

    for (const [id, archive] of this.archives) {
      if (archive.expirationDate < now) {
        deleted.push({
          id,
          name: archive.name,
          policy: archive.retentionPolicy,
        });

        this.archives.delete(id);
        // حذف من الفهرس أيضاً
        this.removeFromIndex(id);
      }
    }

    this.logActivity({
      type: 'CLEANUP_COMPLETED',
      deletedCount: deleted.length,
      timestamp: new Date(),
    });

    return {
      success: true,
      deleted: deleted.length,
      deletedCount: deleted.length,
      details: deleted,
      message: `تم حذف ${deleted.length} أرشيف منتهي الصلاحية`,
    };
  }

  /**
   * حذف من الفهرس
   */
  removeFromIndex(archiveId) {
    for (const [key, value] of this.indexer) {
      if (Array.isArray(value)) {
        const index = value.indexOf(archiveId);
        if (index > -1) {
          value.splice(index, 1);
          if (value.length === 0) {
            this.indexer.delete(key);
          }
        }
      }
    }
  }

  /**
   * الحصول على الإحصائيات المتقدمة
   */
  getAdvancedStatistics() {
    const stats = {
      generalStats: {
        totalArchives: this.archives.size,
        totalSize: this.calculateTotalSize(),
        totalCompressed: Array.from(this.archives.values()).reduce(
          (sum, a) => sum + a.compressedSize,
          0
        ),
        averageCompressionRatio: this.calculateAverageCompression(),
        totalSpaceSaved:
          this.calculateTotalSize() -
          Array.from(this.archives.values()).reduce((sum, a) => sum + a.compressedSize, 0),
      },
      byCategory: {},
      byPriority: {},
      recentActivity: this.activityLog.slice(-20),
      retentionAnalysis: this.analyzeRetention(),
    };

    // إحصائيات حسب الفئة
    for (const archive of this.archives.values()) {
      const cat = archive.classification.category;
      if (!stats.byCategory[cat]) {
        stats.byCategory[cat] = { count: 0, size: 0, compressed: 0 };
      }
      stats.byCategory[cat].count++;
      stats.byCategory[cat].size += archive.originalSize;
      stats.byCategory[cat].compressed += archive.compressedSize;
    }

    // إحصائيات حسب الأولوية
    for (const archive of this.archives.values()) {
      const pri = archive.classification.priority;
      if (!stats.byPriority[pri]) {
        stats.byPriority[pri] = { count: 0, size: 0 };
      }
      stats.byPriority[pri].count++;
      stats.byPriority[pri].size += archive.originalSize;
    }

    return stats;
  }

  /**
   * حساب نسبة الضغط المتوسطة
   */
  calculateAverageCompression() {
    if (this.archives.size === 0) return 0;

    const totalOriginal = this.calculateTotalSize();
    const totalCompressed = Array.from(this.archives.values()).reduce(
      (sum, a) => sum + a.compressedSize,
      0
    );

    if (totalOriginal === 0) return 0;
    // Return compression ratio (0-1), where 1 means no compression, 0.5 means 50% reduction
    const ratio = Math.max(0, totalCompressed / totalOriginal);
    return Math.round(ratio * 100) / 100; // Return as decimal (e.g., 0.75)
  }

  /**
   * تحليل سياسات الاحتفاظ
   */
  analyzeRetention() {
    const analysis = {
      expiringsoon: [],
      expired: [],
      byPolicy: {},
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const archive of this.archives.values()) {
      const expDate = archive.expirationDate;

      if (expDate < now) {
        analysis.expired.push({
          id: archive.id,
          name: archive.name,
          expiredDaysAgo: Math.floor((now - expDate) / (1000 * 60 * 60 * 24)),
        });
      } else if (expDate < thirtyDaysFromNow) {
        analysis.expiringsoon.push({
          id: archive.id,
          name: archive.name,
          daysRemaining: Math.floor((expDate - now) / (1000 * 60 * 60 * 24)),
        });
      }

      const policy = archive.retentionPolicy;
      if (!analysis.byPolicy[policy]) {
        analysis.byPolicy[policy] = [];
      }
      analysis.byPolicy[policy].push(archive.id);
    }

    return analysis;
  }

  /**
   * تحديث الإحصائيات
   */
  updateStatistics(archiveInfo) {
    this.statistics.totalArchived++;
    this.statistics.totalSize += archiveInfo.originalSize;
    this.statistics.totalCompressed += archiveInfo.compressedSize;
    this.statistics.compressionRatio = this.calculateAverageCompression();
    this.statistics.archiveCount = this.archives.size;

    const cat = archiveInfo.classification.category;
    if (!this.statistics.categories[cat]) {
      this.statistics.categories[cat] = 0;
    }
    this.statistics.categories[cat]++;
  }

  /**
   * تسجيل النشاط
   */
  logActivity(activity) {
    this.activityLog.push({
      ...activity,
      timestamp: new Date(),
    });

    // الاحتفاظ بآخر 1000 نشاط فقط
    if (this.activityLog.length > 1000) {
      this.activityLog = this.activityLog.slice(-1000);
    }
  }

  /**
   * توليد معرّف فريد
   */
  generateId() {
    return `arch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * الحصول على معلومات أرشيف
   */
  getArchiveInfo(archiveId) {
    const archive = this.archives.get(archiveId);
    if (!archive) return null;

    return {
      id: archive.id,
      name: archive.name,
      classification: archive.classification,
      sizes: {
        original: archive.originalSize,
        compressed: archive.compressedSize,
        ratio: archive.compressionRatio,
      },
      metadata: archive.metadata,
      retention: {
        policy: archive.retentionPolicy,
        expirationDate: archive.expirationDate,
        daysRemaining: Math.floor((archive.expirationDate - new Date()) / (1000 * 60 * 60 * 24)),
      },
      integrity: {
        hash: archive.hash,
        verified: archive.verified,
        checksCount: archive.integrityChecks,
      },
      accessCount: archive.accessLog.length,
      lastAccess: archive.accessLog[archive.accessLog.length - 1]?.timestamp || null,
      versions: archive.versions.length,
    };
  }
}

module.exports = AdvancedArchivingSystem;
module.exports.instance = new AdvancedArchivingSystem();
