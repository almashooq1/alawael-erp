/**
 * Document Automation (RPA) Service — خدمة أتمتة العمليات الروبوتية
 * ──────────────────────────────────────────────────────────────
 * قواعد أتمتة ذكية، تشغيل تلقائي، سلاسل عمليات،
 * محفزات متعددة، إجراءات مخصصة، سجل التنفيذ
 *
 * @module documentAutomation.service
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Automation Rule Model ──────────────────────────────────── */
const automationRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    descriptionAr: String,
    trigger: {
      type: {
        type: String,
        enum: [
          'document.created',
          'document.updated',
          'document.deleted',
          'document.approved',
          'document.rejected',
          'document.expired',
          'document.shared',
          'document.uploaded',
          'document.classified',
          'workflow.completed',
          'schedule',
          'manual',
          'webhook',
        ],
        required: true,
      },
      conditions: {
        documentTypes: [String],
        categories: [String],
        departments: [String],
        tags: [String],
        statuses: [String],
        classifications: [String],
        customField: String,
        customOperator: { type: String, enum: ['equals', 'contains', 'gt', 'lt', 'exists'] },
        customValue: mongoose.Schema.Types.Mixed,
      },
      schedule: {
        cron: String,
        frequency: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'] },
        dayOfWeek: Number,
        dayOfMonth: Number,
        hour: Number,
        minute: Number,
        timezone: { type: String, default: 'Asia/Riyadh' },
      },
    },
    actions: [
      {
        order: { type: Number, default: 0 },
        type: {
          type: String,
          enum: [
            'classify',
            'tag',
            'move',
            'copy',
            'archive',
            'notify',
            'email',
            'assign',
            'approve',
            'reject',
            'set_field',
            'add_comment',
            'create_task',
            'webhook',
            'generate_report',
            'apply_watermark',
            'extract_ocr',
            'chain_automation',
            'delay',
            'condition',
          ],
          required: true,
        },
        config: mongoose.Schema.Types.Mixed,
        onError: {
          type: String,
          enum: ['stop', 'continue', 'retry'],
          default: 'stop',
        },
        retryCount: { type: Number, default: 0 },
        maxRetries: { type: Number, default: 3 },
      },
    ],
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 5, min: 1, max: 10 },
    maxExecutionsPerDay: { type: Number, default: 100 },
    cooldownMinutes: { type: Number, default: 0 },
    stats: {
      totalExecutions: { type: Number, default: 0 },
      successfulExecutions: { type: Number, default: 0 },
      failedExecutions: { type: Number, default: 0 },
      lastExecutedAt: Date,
      avgDuration: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'automation_rules' }
);

automationRuleSchema.index({ isActive: 1, 'trigger.type': 1 });
automationRuleSchema.index({ priority: -1 });

const AutomationRule =
  mongoose.models.AutomationRule || mongoose.model('AutomationRule', automationRuleSchema);

/* ─── Execution Log Model ────────────────────────────────────── */
const executionLogSchema = new mongoose.Schema(
  {
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationRule', index: true },
    ruleName: String,
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    trigger: {
      type: String,
      event: String,
      data: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'cancelled', 'partial'],
      default: 'running',
    },
    steps: [
      {
        actionType: String,
        order: Number,
        status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'] },
        startedAt: Date,
        completedAt: Date,
        duration: Number,
        result: mongoose.Schema.Types.Mixed,
        error: String,
      },
    ],
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    duration: Number,
    error: String,
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'automation_executions' }
);

executionLogSchema.index({ ruleId: 1, createdAt: -1 });
executionLogSchema.index({ status: 1 });

const ExecutionLog =
  mongoose.models.AutomationExecutionLog ||
  mongoose.model('AutomationExecutionLog', executionLogSchema);

/* ─── Default Automation Templates ───────────────────────────── */
const DEFAULT_TEMPLATES = [
  {
    name: 'Auto-Classify New Documents',
    nameAr: 'تصنيف تلقائي للمستندات الجديدة',
    descriptionAr: 'تصنيف كل مستند جديد تلقائياً باستخدام الذكاء الاصطناعي',
    trigger: { type: 'document.created', conditions: {} },
    actions: [
      {
        order: 1,
        type: 'classify',
        config: { method: 'ai', applyToDocument: true },
        onError: 'continue',
      },
      {
        order: 2,
        type: 'tag',
        config: { source: 'classification', autoTags: true },
        onError: 'continue',
      },
    ],
    priority: 8,
  },
  {
    name: 'Archive Expired Documents',
    nameAr: 'أرشفة المستندات المنتهية',
    descriptionAr: 'نقل المستندات المنتهية الصلاحية تلقائياً إلى الأرشيف',
    trigger: { type: 'document.expired', conditions: {} },
    actions: [
      {
        order: 1,
        type: 'archive',
        config: { policy: 'auto', includeMetadata: true },
        onError: 'stop',
      },
      {
        order: 2,
        type: 'notify',
        config: { recipients: ['owner', 'admin'], template: 'doc_archived' },
        onError: 'continue',
      },
    ],
    priority: 7,
  },
  {
    name: 'Notify on Confidential Share',
    nameAr: 'إشعار عند مشاركة مستند سري',
    descriptionAr: 'إرسال إشعار للمدير عند مشاركة أي مستند سري',
    trigger: {
      type: 'document.shared',
      conditions: { classifications: ['confidential', 'top_secret'] },
    },
    actions: [
      {
        order: 1,
        type: 'notify',
        config: { recipients: ['department_head', 'security_officer'], urgency: 'high' },
        onError: 'stop',
      },
      {
        order: 2,
        type: 'add_comment',
        config: { text: 'تم إشعار المدير بعملية المشاركة', system: true },
        onError: 'continue',
      },
    ],
    priority: 9,
  },
  {
    name: 'OCR on Upload',
    nameAr: 'استخراج نص تلقائي عند الرفع',
    descriptionAr: 'تشغيل OCR تلقائياً عند رفع مستند صورة أو PDF',
    trigger: {
      type: 'document.uploaded',
      conditions: { documentTypes: ['image', 'scanned_pdf'] },
    },
    actions: [
      {
        order: 1,
        type: 'extract_ocr',
        config: { languages: ['ar', 'en'], extractTables: true },
        onError: 'continue',
      },
      {
        order: 2,
        type: 'classify',
        config: { method: 'ai', useOCRText: true },
        onError: 'continue',
      },
    ],
    priority: 6,
  },
  {
    name: 'Watermark on Approval',
    nameAr: 'علامة مائية عند الاعتماد',
    descriptionAr: 'إضافة علامة مائية "نسخة رسمية" عند اعتماد المستند',
    trigger: { type: 'document.approved', conditions: {} },
    actions: [
      {
        order: 1,
        type: 'apply_watermark',
        config: { profile: 'official_copy', dynamic: true },
        onError: 'continue',
      },
      {
        order: 2,
        type: 'set_field',
        config: { field: 'isOfficial', value: true },
        onError: 'continue',
      },
    ],
    priority: 5,
  },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentAutomationService {
  constructor() {
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    for (const tpl of DEFAULT_TEMPLATES) {
      await AutomationRule.findOneAndUpdate(
        { name: tpl.name },
        { $setOnInsert: { ...tpl, isActive: false } },
        { upsert: true }
      );
    }
    this._initialized = true;
  }

  /* ─── Process Event ───────────────────────────────────────── */
  async processEvent(eventName, eventData = {}) {
    await this.init();
    const rules = await AutomationRule.find({
      'trigger.type': eventName,
      isActive: true,
    })
      .sort({ priority: -1 })
      .lean();

    const results = [];
    for (const rule of rules) {
      if (!this._matchConditions(rule.trigger.conditions, eventData)) continue;

      // Cooldown check
      if (rule.cooldownMinutes > 0 && rule.stats.lastExecutedAt) {
        const cooldownEnd = new Date(
          rule.stats.lastExecutedAt.getTime() + rule.cooldownMinutes * 60000
        );
        if (new Date() < cooldownEnd) continue;
      }

      const result = await this.executeRule(rule._id, eventData);
      results.push({ ruleId: rule._id, ruleName: rule.nameAr || rule.name, ...result });
    }

    return { success: true, processed: results.length, results };
  }

  _matchConditions(conditions, data) {
    if (!conditions) return true;
    if (conditions.documentTypes?.length && !conditions.documentTypes.includes(data.documentType))
      return false;
    if (conditions.categories?.length && !conditions.categories.includes(data.category))
      return false;
    if (conditions.departments?.length && !conditions.departments.includes(data.department))
      return false;
    if (
      conditions.classifications?.length &&
      !conditions.classifications.includes(data.classification)
    )
      return false;
    if (conditions.statuses?.length && !conditions.statuses.includes(data.status)) return false;
    if (conditions.tags?.length && !conditions.tags.some(t => data.tags?.includes(t))) return false;
    return true;
  }

  /* ─── Execute Rule ────────────────────────────────────────── */
  async executeRule(ruleId, eventData = {}) {
    const start = Date.now();
    const rule = await AutomationRule.findById(ruleId).lean();
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };

    const execution = new ExecutionLog({
      ruleId: rule._id,
      ruleName: rule.nameAr || rule.name,
      documentId: eventData.documentId,
      trigger: { type: rule.trigger.type, event: eventData.event, data: eventData },
      status: 'running',
      steps: rule.actions.map(a => ({
        actionType: a.type,
        order: a.order,
        status: 'pending',
      })),
      triggeredBy: eventData.userId,
    });
    await execution.save();

    let allSuccess = true;
    const sortedActions = [...rule.actions].sort((a, b) => a.order - b.order);

    for (let i = 0; i < sortedActions.length; i++) {
      const action = sortedActions[i];
      const stepStart = Date.now();
      execution.steps[i].status = 'running';
      execution.steps[i].startedAt = new Date();

      try {
        const result = await this._executeAction(action, eventData, rule);
        execution.steps[i].status = 'completed';
        execution.steps[i].result = result;
      } catch (err) {
        execution.steps[i].status = 'failed';
        execution.steps[i].error = err.message;
        allSuccess = false;

        if (action.onError === 'stop') break;
        if (action.onError === 'retry' && action.retryCount < action.maxRetries) {
          // Simple retry
          try {
            const result = await this._executeAction(action, eventData, rule);
            execution.steps[i].status = 'completed';
            execution.steps[i].result = result;
            allSuccess = true;
          } catch (retryErr) {
            execution.steps[i].error = retryErr.message;
            if (action.onError === 'stop') break;
          }
        }
      }

      execution.steps[i].completedAt = new Date();
      execution.steps[i].duration = Date.now() - stepStart;
    }

    execution.status = allSuccess
      ? 'completed'
      : execution.steps.some(s => s.status === 'completed')
        ? 'partial'
        : 'failed';
    execution.completedAt = new Date();
    execution.duration = Date.now() - start;
    await execution.save();

    // Update rule stats
    await AutomationRule.findByIdAndUpdate(ruleId, {
      $inc: {
        'stats.totalExecutions': 1,
        [`stats.${allSuccess ? 'successfulExecutions' : 'failedExecutions'}`]: 1,
      },
      $set: { 'stats.lastExecutedAt': new Date() },
    });

    return {
      success: allSuccess,
      executionId: execution._id,
      status: execution.status,
      duration: execution.duration,
      stepsCompleted: execution.steps.filter(s => s.status === 'completed').length,
      totalSteps: execution.steps.length,
    };
  }

  async _executeAction(action, eventData) {
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 100));

    switch (action.type) {
      case 'classify':
        return { classified: true, category: 'auto' };
      case 'tag':
        return { tagged: true, tags: action.config?.tags || ['auto'] };
      case 'archive':
        return { archived: true };
      case 'notify':
        return { notified: true, recipients: action.config?.recipients };
      case 'email':
        return { sent: true, template: action.config?.template };
      case 'set_field':
        return { fieldSet: true, field: action.config?.field, value: action.config?.value };
      case 'add_comment':
        return { commented: true, text: action.config?.text };
      case 'apply_watermark':
        return { watermarked: true, profile: action.config?.profile };
      case 'extract_ocr':
        return { ocrStarted: true };
      case 'delay':
        await new Promise(resolve => setTimeout(resolve, (action.config?.seconds || 1) * 1000));
        return { delayed: true };
      default:
        return { executed: true, type: action.type };
    }
  }

  /* ─── Manual Execute ──────────────────────────────────────── */
  async manualExecute(ruleId, data = {}) {
    return this.executeRule(ruleId, {
      ...data,
      event: 'manual',
    });
  }

  /* ─── Rules CRUD ──────────────────────────────────────────── */
  async getRules(options = {}) {
    await this.init();
    const { isActive, triggerType, page = 1, limit = 20 } = options;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (triggerType) filter['trigger.type'] = triggerType;

    const [rules, total] = await Promise.all([
      AutomationRule.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AutomationRule.countDocuments(filter),
    ]);

    return { success: true, rules, total, page, limit };
  }

  async getRule(ruleId) {
    const rule = await AutomationRule.findById(ruleId).lean();
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };
    return { success: true, rule };
  }

  async createRule(data) {
    const rule = new AutomationRule(data);
    await rule.save();
    return { success: true, rule };
  }

  async updateRule(ruleId, updates) {
    const rule = await AutomationRule.findByIdAndUpdate(
      ruleId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };
    return { success: true, rule };
  }

  async deleteRule(ruleId) {
    await AutomationRule.findByIdAndDelete(ruleId);
    return { success: true };
  }

  async toggleRule(ruleId) {
    const rule = await AutomationRule.findById(ruleId);
    if (!rule) return { success: false, error: 'القاعدة غير موجودة' };
    rule.isActive = !rule.isActive;
    await rule.save();
    return { success: true, rule };
  }

  /* ─── Execution History ───────────────────────────────────── */
  async getExecutions(options = {}) {
    const { ruleId, status, page = 1, limit = 20 } = options;
    const filter = {};
    if (ruleId) filter.ruleId = ruleId;
    if (status) filter.status = status;

    const [executions, total] = await Promise.all([
      ExecutionLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ExecutionLog.countDocuments(filter),
    ]);

    return { success: true, executions, total, page, limit };
  }

  async getExecution(executionId) {
    const execution = await ExecutionLog.findById(executionId).lean();
    if (!execution) return { success: false, error: 'التنفيذ غير موجود' };
    return { success: true, execution };
  }

  /* ─── Stats ───────────────────────────────────────────────── */
  async getStats() {
    const [totalRules, activeRules, totalExec, byStatus, recentExec] = await Promise.all([
      AutomationRule.countDocuments(),
      AutomationRule.countDocuments({ isActive: true }),
      ExecutionLog.countDocuments(),
      ExecutionLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ExecutionLog.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('ruleName status duration createdAt')
        .lean(),
    ]);

    return {
      success: true,
      stats: {
        totalRules,
        activeRules,
        totalExecutions: totalExec,
        byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
        recentExecutions: recentExec,
      },
    };
  }
}

module.exports = new DocumentAutomationService();
