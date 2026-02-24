/**
 * Widget Template Service
 * خدمة قوالب الويدجت
 * 
 * المسؤوليات:
 * - إدارة قوالب الويدجط المسبقة
 * - مشاركة القوالب مع المستخدمين الآخرين
 * - التصنيفات والبحث عن القوالب
 * - استيراد القوالب في الوحات الجديدة
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class WidgetTemplateService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Pre-built templates
    this.templates = new Map();

    // Shared templates from users
    this.sharedTemplates = new Map();

    // Template categories
    this.categories = [
      'sales',
      'management',
      'finance',
      'hr',
      'operations',
      'logistics',
      'support',
      'analytics',
      'custom'
    ];

    // Initialize built-in templates
    this._initializeBuiltInTemplates();
  }

  /**
   * Initialize built-in templates
   * تهيئة القوالب المدمجة
   * 
   * @private
   */
  _initializeBuiltInTemplates() {
    const builtInTemplates = [
      {
        id: 'template-sales-dashboard',
        name: 'Sales Dashboard',
        category: 'sales',
        description: 'Complete sales overview with KPIs',
        icon: '📊',
        widgets: [
          {
            type: 'KPI',
            title: 'Total Revenue',
            config: { metric: 'revenue', currency: 'USD' },
            position: { x: 0, y: 0 },
            size: { width: 2, height: 1 }
          },
          {
            type: 'CHART',
            title: 'Sales Trend',
            config: { chartType: 'line', period: 'monthly' },
            position: { x: 2, y: 0 },
            size: { width: 3, height: 2 }
          },
          {
            type: 'TABLE',
            title: 'Top Products',
            config: { sortBy: 'revenue', limit: 10 },
            position: { x: 0, y: 1 },
            size: { width: 2, height: 2 }
          }
        ]
      },
      {
        id: 'template-hr-dashboard',
        name: 'HR Dashboard',
        category: 'hr',
        description: 'Employee management and monitoring',
        icon: '👥',
        widgets: [
          {
            type: 'KPI',
            title: 'Total Employees',
            config: { metric: 'employeeCount' },
            position: { x: 0, y: 0 },
            size: { width: 1, height: 1 }
          },
          {
            type: 'KPI',
            title: 'Attendance Rate',
            config: { metric: 'attendanceRate', unit: '%' },
            position: { x: 1, y: 0 },
            size: { width: 1, height: 1 }
          },
          {
            type: 'GAUGE',
            title: 'Team Satisfaction',
            config: { minValue: 0, maxValue: 100 },
            position: { x: 2, y: 0 },
            size: { width: 2, height: 2 }
          }
        ]
      },
      {
        id: 'template-finance-dashboard',
        name: 'Finance Dashboard',
        category: 'finance',
        description: 'Financial metrics and reports',
        icon: '💰',
        widgets: [
          {
            type: 'KPI',
            title: 'Total Balance',
            config: { metric: 'balance', currency: 'USD' },
            position: { x: 0, y: 0 },
            size: { width: 2, height: 1 }
          },
          {
            type: 'CHART',
            title: 'Cash Flow',
            config: { chartType: 'bar', period: 'monthly' },
            position: { x: 2, y: 0 },
            size: { width: 3, height: 2 }
          },
          {
            type: 'HEATMAP',
            title: 'Expense Distribution',
            config: { colorScheme: 'viridis' },
            position: { x: 0, y: 1 },
            size: { width: 2, height: 2 }
          }
        ]
      },
      {
        id: 'template-operations-dashboard',
        name: 'Operations Dashboard',
        category: 'operations',
        description: 'Operational metrics and monitoring',
        icon: '⚙️',
        widgets: [
          {
            type: 'KPI',
            title: 'Active Tasks',
            config: { metric: 'activeTasks' },
            position: { x: 0, y: 0 },
            size: { width: 1, height: 1 }
          },
          {
            type: 'TIMELINE',
            title: 'Project Timeline',
            config: { showMilestones: true },
            position: { x: 1, y: 0 },
            size: { width: 3, height: 2 }
          }
        ]
      }
    ];

    builtInTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    this.logger.info(`Initialized ${builtInTemplates.length} built-in templates`);
  }

  /**
   * Get all templates
   * الحصول على جميع القوالب
   * 
   * @param {Object} filter - Filter options
   * @returns {Array} Templates
   */
  getAllTemplates(filter = {}) {
    try {
      let templates = Array.from(this.templates.values());

      // Filter by category
      if (filter.category) {
        templates = templates.filter(t => t.category === filter.category);
      }

      // Filter by search term
      if (filter.search) {
        const term = filter.search.toLowerCase();
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
        );
      }

      // Sort by name
      templates.sort((a, b) => a.name.localeCompare(b.name));

      return templates;
    } catch (error) {
      this.logger.error(`Error getting all templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get template by ID
   * الحصول على قالب بـ ID
   * 
   * @param {String} templateId - Template ID
   * @returns {Object} Template
   */
  getTemplate(templateId) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      return template;
    } catch (error) {
      this.logger.error(`Error getting template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create custom template
   * إنشاء قالب مخصص
   * 
   * @param {Object} templateData - Template data
   * @returns {Object} Created template
   */
  createTemplate(templateData) {
    try {
      const {
        userId,
        name,
        category,
        description,
        icon,
        widgets,
        isPublic = false
      } = templateData;

      // Validate required fields
      if (!name) throw new Error('Template name is required');
      if (!category || !this.categories.includes(category)) {
        throw new Error(`Invalid category: ${category}`);
      }

      const templateId = `template-${uuidv4()}`;

      const template = {
        id: templateId,
        userId,
        name,
        category,
        description: description || '',
        icon: icon || '📦',
        widgets: widgets || [],
        isPublic,
        isBuiltIn: false,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          rating: 0,
          reviews: []
        }
      };

      this.templates.set(templateId, template);
      this.emit('template:created', { templateId, template });

      this.logger.info(`Template created: ${templateId}`);
      return template;
    } catch (error) {
      this.logger.error(`Error creating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update template
   * تحديث قالب
   * 
   * @param {String} templateId - Template ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated template
   */
  updateTemplate(templateId, updates) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (template.isBuiltIn) {
        throw new Error('Cannot modify built-in templates');
      }

      const allowedFields = ['name', 'category', 'description', 'icon', 'widgets', 'isPublic'];

      allowedFields.forEach(field => {
        if (field in updates) {
          template[field] = updates[field];
        }
      });

      template.metadata.updatedAt = new Date();

      this.emit('template:updated', { templateId, updates });
      this.logger.info(`Template updated: ${templateId}`);
      return template;
    } catch (error) {
      this.logger.error(`Error updating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete template
   * حذف قالب
   * 
   * @param {String} templateId - Template ID
   */
  deleteTemplate(templateId) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (template.isBuiltIn) {
        throw new Error('Cannot delete built-in templates');
      }

      this.templates.delete(templateId);
      this.emit('template:deleted', { templateId });

      this.logger.info(`Template deleted: ${templateId}`);
    } catch (error) {
      this.logger.error(`Error deleting template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get templates by category
   * الحصول على القوالب حسب الفئة
   * 
   * @param {String} category - Category name
   * @returns {Array} Templates
   */
  getByCategory(category) {
    try {
      if (!this.categories.includes(category)) {
        throw new Error(`Invalid category: ${category}`);
      }

      const templates = Array.from(this.templates.values()).filter(
        t => t.category === category
      );

      return templates.sort((a, b) => 
        (b.metadata.usageCount || 0) - (a.metadata.usageCount || 0)
      );
    } catch (error) {
      this.logger.error(`Error getting templates by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Share template
   * مشاركة قالب
   * 
   * @param {String} templateId - Template ID
   * @param {Array} userIds - User IDs to share with
   */
  shareTemplate(templateId, userIds) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const shareId = uuidv4();

      this.sharedTemplates.set(shareId, {
        id: shareId,
        templateId,
        sharedBy: template.userId,
        sharedWith: userIds,
        sharedAt: new Date(),
        permissions: ['view', 'duplicate']
      });

      this.emit('template:shared', { templateId, userIds, shareId });
      this.logger.info(`Template shared: ${templateId} with ${userIds.length} users`);

      return shareId;
    } catch (error) {
      this.logger.error(`Error sharing template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get shared templates for user
   * الحصول على القوالب المشتركة للمستخدم
   * 
   * @param {String} userId - User ID
   * @returns {Array} Shared templates
   */
  getSharedTemplates(userId) {
    try {
      const sharedTemplates = [];

      this.sharedTemplates.forEach(share => {
        if (share.sharedWith.includes(userId)) {
          const template = this.templates.get(share.templateId);
          if (template) {
            sharedTemplates.push({
              ...template,
              sharedBy: share.sharedBy,
              sharedAt: share.sharedAt
            });
          }
        }
      });

      return sharedTemplates;
    } catch (error) {
      this.logger.error(`Error getting shared templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rate template
   * تقييم قالب
   * 
   * @param {String} templateId - Template ID
   * @param {Object} rating - Rating { score, review, userId }
   */
  rateTemplate(templateId, rating) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const { score, review, userId } = rating;

      if (score < 1 || score > 5) {
        throw new Error('Rating score must be between 1-5');
      }

      template.metadata.reviews.push({
        userId,
        score,
        review: review || '',
        timestamp: new Date()
      });

      // Calculate average rating
      const avgRating = template.metadata.reviews.reduce((sum, r) => sum + r.score, 0) /
        template.metadata.reviews.length;
      template.metadata.rating = avgRating;

      this.emit('template:rated', { templateId, score, avgRating });
      this.logger.info(`Template rated: ${templateId} with score ${score}`);
    } catch (error) {
      this.logger.error(`Error rating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track template usage
   * تتبع استخدام القالب
   * 
   * @param {String} templateId - Template ID
   */
  trackUsage(templateId) {
    try {
      const template = this.templates.get(templateId);
      if (!template) return;

      template.metadata.usageCount = (template.metadata.usageCount || 0) + 1;
      this.emit('template:used', { templateId });
    } catch (error) {
      this.logger.error(`Error tracking template usage: ${error.message}`);
    }
  }

  /**
   * Get popular templates
   * الحصول على القوالب الشهيرة
   * 
   * @param {Number} limit - Result limit
   * @returns {Array} Popular templates
   */
  getPopularTemplates(limit = 10) {
    try {
      const templates = Array.from(this.templates.values())
        .sort((a, b) => (b.metadata.usageCount || 0) - (a.metadata.usageCount || 0))
        .slice(0, limit);

      return templates;
    } catch (error) {
      this.logger.error(`Error getting popular templates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get categories list
   * الحصول على قائمة الفئات
   * 
   * @returns {Array} Categories
   */
  getCategories() {
    try {
      return this.categories.map(category => {
        const count = Array.from(this.templates.values()).filter(
          t => t.category === category
        ).length;

        return { name: category, count };
      });
    } catch (error) {
      this.logger.error(`Error getting categories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Duplicate template
   * نسخ قالب
   * 
   * @param {String} templateId - Template ID to duplicate
   * @param {Object} newData - New template data
   * @returns {Object} New template
   */
  duplicateTemplate(templateId, newData = {}) {
    try {
      const original = this.templates.get(templateId);
      if (!original) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const duplicated = {
        id: `template-${uuidv4()}`,
        ...original,
        name: newData.name || `${original.name} (Copy)`,
        isBuiltIn: false,
        metadata: {
          ...original.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          rating: 0,
          reviews: []
        }
      };

      this.templates.set(duplicated.id, duplicated);
      this.emit('template:duplicated', { original: templateId, duplicated: duplicated.id });

      return duplicated;
    } catch (error) {
      this.logger.error(`Error duplicating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export template
   * تصدير قالب
   * 
   * @param {String} templateId - Template ID
   * @returns {Object} Exportable template
   */
  exportTemplate(templateId) {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      return {
        name: template.name,
        category: template.category,
        description: template.description,
        icon: template.icon,
        widgets: template.widgets
      };
    } catch (error) {
      this.logger.error(`Error exporting template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get template stats
   * الحصول على إحصائيات القالب
   * 
   * @returns {Object} Statistics
   */
  getTemplateStats() {
    try {
      const templates = Array.from(this.templates.values());
      const stats = {
        total: templates.length,
        builtIn: templates.filter(t => t.isBuiltIn).length,
        custom: templates.filter(t => !t.isBuiltIn).length,
        byCategory: {},
        topRated: [],
        mostUsed: []
      };

      // By category
      this.categories.forEach(category => {
        stats.byCategory[category] = templates.filter(t => t.category === category).length;
      });

      // Top rated
      stats.topRated = templates
        .filter(t => t.metadata.rating > 0)
        .sort((a, b) => (b.metadata.rating || 0) - (a.metadata.rating || 0))
        .slice(0, 5)
        .map(t => ({ id: t.id, name: t.name, rating: t.metadata.rating }));

      // Most used
      stats.mostUsed = templates
        .sort((a, b) => (b.metadata.usageCount || 0) - (a.metadata.usageCount || 0))
        .slice(0, 5)
        .map(t => ({ id: t.id, name: t.name, usageCount: t.metadata.usageCount }));

      return stats;
    } catch (error) {
      this.logger.error(`Error getting template stats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new WidgetTemplateService();
