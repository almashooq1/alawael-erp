'use strict';

/**
 * Document Templates Engine — محرك قوالب المستندات
 * ═══════════════════════════════════════════════════════════════
 * نظام متكامل لإدارة قوالب المستندات، استبدال المتغيرات،
 * القوالب العربية، وإنشاء مستندات جديدة من القوالب
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط قالب المستند
// ─────────────────────────────────────────────

const DocumentTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: String,
    slug: { type: String, unique: true },

    // التصنيف
    category: {
      type: String,
      enum: [
        'عقود',
        'رسائل_رسمية',
        'تقارير',
        'فواتير',
        'طلبات',
        'محاضر',
        'سياسات',
        'نماذج',
        'أخرى',
      ],
      default: 'أخرى',
    },
    subcategory: String,

    // الوصف
    description: String,
    descriptionEn: String,

    // المحتوى
    content: { type: String, default: '' },
    contentFormat: {
      type: String,
      enum: ['text', 'html', 'markdown', 'json'],
      default: 'text',
    },

    // المتغيرات القابلة للتعبئة
    variables: [
      {
        key: { type: String, required: true }, // {{company_name}}
        label: String, // اسم الشركة
        labelEn: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'textarea', 'currency', 'email', 'phone'],
          default: 'text',
        },
        defaultValue: mongoose.Schema.Types.Mixed,
        options: [String], // للقوائم المنسدلة
        required: { type: Boolean, default: false },
        validation: String, // regex
        placeholder: String,
        order: { type: Number, default: 0 },
      },
    ],

    // أقسام القالب
    sections: [
      {
        name: String,
        content: String,
        order: Number,
        isOptional: { type: Boolean, default: false },
      },
    ],

    // الأنماط و التنسيق
    styling: {
      direction: { type: String, enum: ['rtl', 'ltr'], default: 'rtl' },
      fontFamily: { type: String, default: 'Arial, sans-serif' },
      fontSize: { type: Number, default: 14 },
      headerTemplate: String,
      footerTemplate: String,
      pageSize: { type: String, default: 'A4' },
      margins: {
        top: { type: Number, default: 20 },
        bottom: { type: Number, default: 20 },
        left: { type: Number, default: 25 },
        right: { type: Number, default: 25 },
      },
    },

    // البيانات الوصفية
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false }, // قوالب النظام
    isPublic: { type: Boolean, default: false },

    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,

    tags: [String],
    department: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'document_templates',
  }
);

DocumentTemplateSchema.index({ category: 1, isActive: 1 });
DocumentTemplateSchema.index({ slug: 1 });
DocumentTemplateSchema.index({ tags: 1 });
DocumentTemplateSchema.index({ name: 'text', description: 'text' });

const DocumentTemplate =
  mongoose.models.DocumentTemplate || mongoose.model('DocumentTemplate', DocumentTemplateSchema);

// ─────────────────────────────────────────────
// القوالب الافتراضية العربية
// ─────────────────────────────────────────────

const DEFAULT_TEMPLATES = [
  {
    name: 'عقد عمل',
    nameEn: 'Employment Contract',
    slug: 'employment-contract',
    category: 'عقود',
    description: 'نموذج عقد عمل شامل مع جميع البنود الأساسية',
    content: `بسم الله الرحمن الرحيم

عقد عمل

الطرف الأول (صاحب العمل): {{company_name}}
العنوان: {{company_address}}
السجل التجاري: {{commercial_register}}

الطرف الثاني (الموظف): {{employee_name}}
رقم الهوية: {{id_number}}
الجنسية: {{nationality}}

المادة الأولى: تم الاتفاق بين الطرفين على أن يعمل الطرف الثاني لدى الطرف الأول في وظيفة {{job_title}} بإدارة {{department}}.

المادة الثانية: مدة العقد {{contract_duration}} ابتداءً من {{start_date}}.

المادة الثالثة: يتقاضى الطرف الثاني راتباً شهرياً إجمالياً قدره {{salary}} {{currency}}.

المادة الرابعة: فترة التجربة {{probation_period}}.

المادة الخامسة: يلتزم الطرف الثاني بالعمل {{working_hours}} ساعات يومياً.

{{additional_terms}}

تحرر هذا العقد من نسختين لكل طرف نسخة واحدة.

توقيع الطرف الأول: _________________     التاريخ: {{sign_date}}
توقيع الطرف الثاني: _________________     التاريخ: {{sign_date}}`,
    variables: [
      { key: 'company_name', label: 'اسم الشركة', type: 'text', required: true, order: 1 },
      { key: 'company_address', label: 'عنوان الشركة', type: 'text', required: true, order: 2 },
      { key: 'commercial_register', label: 'السجل التجاري', type: 'text', order: 3 },
      { key: 'employee_name', label: 'اسم الموظف', type: 'text', required: true, order: 4 },
      { key: 'id_number', label: 'رقم الهوية', type: 'text', required: true, order: 5 },
      { key: 'nationality', label: 'الجنسية', type: 'text', order: 6 },
      { key: 'job_title', label: 'المسمى الوظيفي', type: 'text', required: true, order: 7 },
      { key: 'department', label: 'القسم', type: 'text', order: 8 },
      {
        key: 'contract_duration',
        label: 'مدة العقد',
        type: 'text',
        defaultValue: 'سنة واحدة',
        order: 9,
      },
      { key: 'start_date', label: 'تاريخ البدء', type: 'date', required: true, order: 10 },
      { key: 'salary', label: 'الراتب', type: 'currency', required: true, order: 11 },
      {
        key: 'currency',
        label: 'العملة',
        type: 'select',
        options: ['ريال', 'دولار', 'درهم', 'دينار'],
        defaultValue: 'ريال',
        order: 12,
      },
      {
        key: 'probation_period',
        label: 'فترة التجربة',
        type: 'text',
        defaultValue: 'ثلاثة أشهر',
        order: 13,
      },
      { key: 'working_hours', label: 'ساعات العمل', type: 'number', defaultValue: 8, order: 14 },
      { key: 'additional_terms', label: 'بنود إضافية', type: 'textarea', order: 15 },
      { key: 'sign_date', label: 'تاريخ التوقيع', type: 'date', order: 16 },
    ],
  },
  {
    name: 'رسالة رسمية',
    nameEn: 'Official Letter',
    slug: 'official-letter',
    category: 'رسائل_رسمية',
    description: 'نموذج رسالة رسمية للمراسلات الخارجية',
    content: `بسم الله الرحمن الرحيم

التاريخ: {{date}}
الرقم المرجعي: {{reference_number}}

السيد / السيدة: {{recipient_name}}
المنصب: {{recipient_title}}
{{recipient_organization}}

الموضوع: {{subject}}

السلام عليكم ورحمة الله وبركاته،

{{greeting}}

{{body}}

{{closing}}

وتفضلوا بقبول فائق الاحترام والتقدير،

{{sender_name}}
{{sender_title}}
{{sender_organization}}

المرفقات: {{attachments}}`,
    variables: [
      { key: 'date', label: 'التاريخ', type: 'date', required: true, order: 1 },
      { key: 'reference_number', label: 'الرقم المرجعي', type: 'text', order: 2 },
      { key: 'recipient_name', label: 'اسم المستلم', type: 'text', required: true, order: 3 },
      { key: 'recipient_title', label: 'منصب المستلم', type: 'text', order: 4 },
      { key: 'recipient_organization', label: 'جهة المستلم', type: 'text', order: 5 },
      { key: 'subject', label: 'الموضوع', type: 'text', required: true, order: 6 },
      {
        key: 'greeting',
        label: 'تحية الافتتاح',
        type: 'textarea',
        defaultValue: 'يسرنا أن نتقدم لسيادتكم بخالص التحية والتقدير،',
        order: 7,
      },
      { key: 'body', label: 'نص الرسالة', type: 'textarea', required: true, order: 8 },
      {
        key: 'closing',
        label: 'الخاتمة',
        type: 'textarea',
        defaultValue: 'نأمل منكم التكرم بالاطلاع واتخاذ اللازم.',
        order: 9,
      },
      { key: 'sender_name', label: 'اسم المرسل', type: 'text', required: true, order: 10 },
      { key: 'sender_title', label: 'منصب المرسل', type: 'text', order: 11 },
      { key: 'sender_organization', label: 'جهة المرسل', type: 'text', order: 12 },
      { key: 'attachments', label: 'المرفقات', type: 'textarea', order: 13 },
    ],
  },
  {
    name: 'محضر اجتماع',
    nameEn: 'Meeting Minutes',
    slug: 'meeting-minutes',
    category: 'محاضر',
    description: 'نموذج محضر اجتماع رسمي',
    content: `محضر اجتماع

موضوع الاجتماع: {{meeting_subject}}
التاريخ: {{meeting_date}}
الوقت: من {{start_time}} إلى {{end_time}}
المكان: {{location}}

الحضور:
{{attendees}}

رئيس الاجتماع: {{chairman}}
مقرر الاجتماع: {{secretary}}

جدول الأعمال:
{{agenda}}

ملخص المناقشات:
{{discussions}}

القرارات:
{{decisions}}

الإجراءات المطلوبة:
{{action_items}}

الاجتماع القادم: {{next_meeting}}

توقيع رئيس الاجتماع: _________________
توقيع المقرر: _________________`,
    variables: [
      { key: 'meeting_subject', label: 'موضوع الاجتماع', type: 'text', required: true, order: 1 },
      { key: 'meeting_date', label: 'تاريخ الاجتماع', type: 'date', required: true, order: 2 },
      { key: 'start_time', label: 'وقت البدء', type: 'text', order: 3 },
      { key: 'end_time', label: 'وقت الانتهاء', type: 'text', order: 4 },
      { key: 'location', label: 'المكان', type: 'text', order: 5 },
      { key: 'attendees', label: 'الحضور', type: 'textarea', required: true, order: 6 },
      { key: 'chairman', label: 'رئيس الاجتماع', type: 'text', required: true, order: 7 },
      { key: 'secretary', label: 'مقرر الاجتماع', type: 'text', order: 8 },
      { key: 'agenda', label: 'جدول الأعمال', type: 'textarea', order: 9 },
      { key: 'discussions', label: 'ملخص المناقشات', type: 'textarea', order: 10 },
      { key: 'decisions', label: 'القرارات', type: 'textarea', required: true, order: 11 },
      { key: 'action_items', label: 'الإجراءات المطلوبة', type: 'textarea', order: 12 },
      { key: 'next_meeting', label: 'الاجتماع القادم', type: 'text', order: 13 },
    ],
  },
  {
    name: 'تقرير شهري',
    nameEn: 'Monthly Report',
    slug: 'monthly-report',
    category: 'تقارير',
    description: 'نموذج تقرير شهري للأنشطة والإنجازات',
    content: `تقرير شهري

القسم / الإدارة: {{department}}
الشهر: {{report_month}} / {{report_year}}
معد التقرير: {{author_name}}
التاريخ: {{date}}

1. ملخص تنفيذي:
{{executive_summary}}

2. الإنجازات الرئيسية:
{{achievements}}

3. التحديات والمعوقات:
{{challenges}}

4. مؤشرات الأداء الرئيسية:
{{kpis}}

5. الميزانية والمصروفات:
- الميزانية المعتمدة: {{approved_budget}} {{currency}}
- المصروف الفعلي: {{actual_spending}} {{currency}}
- نسبة الاستهلاك: {{budget_utilization}}%

6. خطة الشهر القادم:
{{next_month_plan}}

7. توصيات:
{{recommendations}}

التوقيع: _________________
التاريخ: {{sign_date}}`,
    variables: [
      { key: 'department', label: 'القسم', type: 'text', required: true, order: 1 },
      {
        key: 'report_month',
        label: 'الشهر',
        type: 'select',
        options: [
          'يناير',
          'فبراير',
          'مارس',
          'أبريل',
          'مايو',
          'يونيو',
          'يوليو',
          'أغسطس',
          'سبتمبر',
          'أكتوبر',
          'نوفمبر',
          'ديسمبر',
        ],
        required: true,
        order: 2,
      },
      { key: 'report_year', label: 'السنة', type: 'number', order: 3 },
      { key: 'author_name', label: 'معد التقرير', type: 'text', required: true, order: 4 },
      { key: 'date', label: 'التاريخ', type: 'date', order: 5 },
      {
        key: 'executive_summary',
        label: 'الملخص التنفيذي',
        type: 'textarea',
        required: true,
        order: 6,
      },
      { key: 'achievements', label: 'الإنجازات', type: 'textarea', order: 7 },
      { key: 'challenges', label: 'التحديات', type: 'textarea', order: 8 },
      { key: 'kpis', label: 'مؤشرات الأداء', type: 'textarea', order: 9 },
      { key: 'approved_budget', label: 'الميزانية المعتمدة', type: 'currency', order: 10 },
      { key: 'actual_spending', label: 'المصروف الفعلي', type: 'currency', order: 11 },
      {
        key: 'currency',
        label: 'العملة',
        type: 'select',
        options: ['ريال', 'دولار', 'درهم'],
        defaultValue: 'ريال',
        order: 12,
      },
      { key: 'budget_utilization', label: 'نسبة الاستهلاك', type: 'number', order: 13 },
      { key: 'next_month_plan', label: 'خطة الشهر القادم', type: 'textarea', order: 14 },
      { key: 'recommendations', label: 'التوصيات', type: 'textarea', order: 15 },
      { key: 'sign_date', label: 'تاريخ التوقيع', type: 'date', order: 16 },
    ],
  },
  {
    name: 'طلب شراء',
    nameEn: 'Purchase Request',
    slug: 'purchase-request',
    category: 'طلبات',
    description: 'نموذج طلب شراء مواد أو خدمات',
    content: `طلب شراء

رقم الطلب: {{request_number}}
التاريخ: {{date}}
القسم الطالب: {{department}}
مقدم الطلب: {{requester_name}}
درجة الاستعجال: {{urgency}}

الأصناف المطلوبة:
{{items}}

السبب / المبرر: {{justification}}

التكلفة التقديرية: {{estimated_cost}} {{currency}}
بند الميزانية: {{budget_item}}

الموردون المقترحون:
{{suggested_suppliers}}

ملاحظات: {{notes}}

توقيع مقدم الطلب: _________________
توقيع مدير القسم: _________________
توقيع المالية: _________________

الحالة: {{status}}`,
    variables: [
      { key: 'request_number', label: 'رقم الطلب', type: 'text', order: 1 },
      { key: 'date', label: 'التاريخ', type: 'date', required: true, order: 2 },
      { key: 'department', label: 'القسم', type: 'text', required: true, order: 3 },
      { key: 'requester_name', label: 'مقدم الطلب', type: 'text', required: true, order: 4 },
      {
        key: 'urgency',
        label: 'درجة الاستعجال',
        type: 'select',
        options: ['عادي', 'متوسط', 'عاجل', 'طارئ'],
        defaultValue: 'عادي',
        order: 5,
      },
      { key: 'items', label: 'الأصناف المطلوبة', type: 'textarea', required: true, order: 6 },
      { key: 'justification', label: 'المبرر', type: 'textarea', order: 7 },
      { key: 'estimated_cost', label: 'التكلفة التقديرية', type: 'currency', order: 8 },
      {
        key: 'currency',
        label: 'العملة',
        type: 'select',
        options: ['ريال', 'دولار', 'درهم'],
        defaultValue: 'ريال',
        order: 9,
      },
      { key: 'budget_item', label: 'بند الميزانية', type: 'text', order: 10 },
      { key: 'suggested_suppliers', label: 'الموردون المقترحون', type: 'textarea', order: 11 },
      { key: 'notes', label: 'ملاحظات', type: 'textarea', order: 12 },
      {
        key: 'status',
        label: 'الحالة',
        type: 'select',
        options: ['مسودة', 'قيد المراجعة', 'معتمد', 'مرفوض'],
        defaultValue: 'مسودة',
        order: 13,
      },
    ],
  },
];

// ─────────────────────────────────────────────
// محرك القوالب
// ─────────────────────────────────────────────

class DocumentTemplatesEngine {
  /**
   * تهيئة القوالب الافتراضية
   */
  async initializeDefaults() {
    try {
      for (const tmpl of DEFAULT_TEMPLATES) {
        const exists = await DocumentTemplate.findOne({ slug: tmpl.slug });
        if (!exists) {
          await new DocumentTemplate({ ...tmpl, isSystem: true, isActive: true }).save();
          logger.info(`[Templates] تم إنشاء قالب: ${tmpl.name}`);
        }
      }
      return { success: true, message: 'تم تهيئة القوالب الافتراضية' };
    } catch (err) {
      logger.error(`[Templates] خطأ في التهيئة: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب جميع القوالب
   */
  async getTemplates(filters = {}) {
    try {
      const query = { isActive: true };
      if (filters.category) query.category = filters.category;
      if (filters.department) query.department = filters.department;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } },
        ];
      }

      const templates = await DocumentTemplate.find(query)
        .select('-content -sections')
        .populate('createdBy', 'name')
        .sort({ usageCount: -1, name: 1 })
        .lean();

      // إحصائيات الفئات
      const categoryStats = await DocumentTemplate.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      return {
        success: true,
        templates: templates.map(t => this._formatTemplate(t)),
        total: templates.length,
        categories: categoryStats.map(c => ({ category: c._id, count: c.count })),
      };
    } catch (err) {
      logger.error(`[Templates] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب قالب واحد بالتفصيل
   */
  async getTemplate(templateId) {
    try {
      const template = await DocumentTemplate.findById(templateId)
        .populate('createdBy', 'name email')
        .lean();

      if (!template) return null;

      // ترتيب المتغيرات
      if (template.variables) {
        template.variables.sort((a, b) => (a.order || 0) - (b.order || 0));
      }

      return this._formatTemplate(template, true);
    } catch (err) {
      logger.error(`[Templates] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إنشاء قالب جديد
   */
  async createTemplate(data, userId) {
    try {
      const slug =
        data.slug ||
        data.name
          .replace(/\s+/g, '-')
          .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
          .toLowerCase() +
          '-' +
          Date.now().toString(36);

      const template = new DocumentTemplate({
        ...data,
        slug,
        createdBy: userId,
        updatedBy: userId,
      });

      await template.save();
      logger.info(`[Templates] إنشاء قالب: ${data.name}`);

      return { success: true, template: this._formatTemplate(template.toObject()) };
    } catch (err) {
      logger.error(`[Templates] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تحديث قالب
   */
  async updateTemplate(templateId, data, userId) {
    try {
      const template = await DocumentTemplate.findById(templateId);
      if (!template) throw new Error('القالب غير موجود');
      if (template.isSystem) throw new Error('لا يمكن تعديل قوالب النظام');

      Object.assign(template, data, { updatedBy: userId, version: template.version + 1 });
      await template.save();

      return { success: true, template: this._formatTemplate(template.toObject()) };
    } catch (err) {
      logger.error(`[Templates] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * حذف قالب
   */
  async deleteTemplate(templateId) {
    try {
      const template = await DocumentTemplate.findById(templateId);
      if (!template) throw new Error('القالب غير موجود');
      if (template.isSystem) throw new Error('لا يمكن حذف قوالب النظام');

      template.isActive = false;
      await template.save();

      return { success: true, message: 'تم حذف القالب' };
    } catch (err) {
      logger.error(`[Templates] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إنشاء مستند من قالب — العملية الأساسية
   */
  async generateFromTemplate(templateId, variableValues, userId, options = {}) {
    try {
      const template = await DocumentTemplate.findById(templateId).lean();
      if (!template) throw new Error('القالب غير موجود');

      // التحقق من المتغيرات المطلوبة
      const missingRequired = (template.variables || [])
        .filter(v => v.required && !variableValues[v.key])
        .map(v => v.label || v.key);

      if (missingRequired.length > 0) {
        return {
          success: false,
          error: 'متغيرات مطلوبة ناقصة',
          missingFields: missingRequired,
        };
      }

      // استبدال المتغيرات
      let content = template.content || '';
      for (const variable of template.variables || []) {
        const value = variableValues[variable.key] || variable.defaultValue || '';
        const regex = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
        content = content.replace(regex, String(value));
      }

      // تنظيف المتغيرات غير المستبدلة
      content = content.replace(/\{\{[^}]+\}\}/g, '___________');

      // تحديث عداد الاستخدام
      await DocumentTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: 1 },
        lastUsedAt: new Date(),
      });

      const result = {
        success: true,
        generatedContent: content,
        templateName: template.name,
        templateCategory: template.category,
        format: template.contentFormat,
        styling: template.styling,
        metadata: {
          templateId: template._id,
          templateVersion: template.version,
          generatedAt: new Date(),
          generatedBy: userId,
          variablesUsed: Object.keys(variableValues),
        },
      };

      // إنشاء مستند تلقائياً إذا طُلب
      if (options.createDocument) {
        try {
          const Document = mongoose.model('Document');
          const newDoc = new Document({
            title:
              options.documentTitle ||
              `${template.name} - ${new Date().toLocaleDateString('ar-SA')}`,
            description: template.description || '',
            category: template.category,
            tags: [...(template.tags || []), 'من_قالب'],
            extractedText: content,
            createdBy: userId,
            metadata: {
              templateId: template._id,
              templateName: template.name,
            },
          });
          await newDoc.save();
          result.documentId = newDoc._id;
        } catch (e) {
          logger.warn(`[Templates] فشل إنشاء المستند: ${e.message}`);
        }
      }

      logger.info(`[Templates] إنشاء مستند من قالب: ${template.name}`);
      return result;
    } catch (err) {
      logger.error(`[Templates] خطأ في الإنشاء: ${err.message}`);
      throw err;
    }
  }

  /**
   * معاينة القالب بقيم افتراضية
   */
  async previewTemplate(templateId) {
    try {
      const template = await DocumentTemplate.findById(templateId).lean();
      if (!template) throw new Error('القالب غير موجود');

      const defaultValues = {};
      for (const v of template.variables || []) {
        defaultValues[v.key] = v.defaultValue || v.placeholder || `[${v.label || v.key}]`;
      }

      let content = template.content || '';
      for (const [key, val] of Object.entries(defaultValues)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
      }

      return {
        success: true,
        preview: content,
        styling: template.styling,
      };
    } catch (err) {
      logger.error(`[Templates] خطأ في المعاينة: ${err.message}`);
      throw err;
    }
  }

  /**
   * نسخ قالب
   */
  async duplicateTemplate(templateId, userId) {
    try {
      const original = await DocumentTemplate.findById(templateId).lean();
      if (!original) throw new Error('القالب غير موجود');

      delete original._id;
      delete original.createdAt;
      delete original.updatedAt;

      const dup = new DocumentTemplate({
        ...original,
        name: `نسخة من ${original.name}`,
        slug: `${original.slug}-copy-${Date.now().toString(36)}`,
        isSystem: false,
        usageCount: 0,
        createdBy: userId,
        updatedBy: userId,
      });

      await dup.save();
      return { success: true, template: this._formatTemplate(dup.toObject()) };
    } catch (err) {
      logger.error(`[Templates] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إحصائيات القوالب
   */
  async getTemplateStats() {
    try {
      const [total, byCategory, topUsed, recentlyUsed] = await Promise.all([
        DocumentTemplate.countDocuments({ isActive: true }),
        DocumentTemplate.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 }, totalUsage: { $sum: '$usageCount' } } },
          { $sort: { totalUsage: -1 } },
        ]),
        DocumentTemplate.find({ isActive: true })
          .sort({ usageCount: -1 })
          .limit(5)
          .select('name category usageCount')
          .lean(),
        DocumentTemplate.find({ isActive: true, lastUsedAt: { $ne: null } })
          .sort({ lastUsedAt: -1 })
          .limit(5)
          .select('name category lastUsedAt')
          .lean(),
      ]);

      return {
        success: true,
        stats: {
          total,
          byCategory,
          topUsed,
          recentlyUsed,
        },
      };
    } catch (err) {
      logger.error(`[Templates] خطأ: ${err.message}`);
      throw err;
    }
  }

  _formatTemplate(template, full = false) {
    const categoryLabels = {
      عقود: { label: 'عقود', icon: '📄', color: '#3B82F6' },
      رسائل_رسمية: { label: 'رسائل رسمية', icon: '✉️', color: '#8B5CF6' },
      تقارير: { label: 'تقارير', icon: '📊', color: '#10B981' },
      فواتير: { label: 'فواتير', icon: '🧾', color: '#F59E0B' },
      طلبات: { label: 'طلبات', icon: '📝', color: '#EF4444' },
      محاضر: { label: 'محاضر', icon: '📋', color: '#6366F1' },
      سياسات: { label: 'سياسات', icon: '📑', color: '#14B8A6' },
      نماذج: { label: 'نماذج', icon: '📃', color: '#F97316' },
      أخرى: { label: 'أخرى', icon: '📂', color: '#6B7280' },
    };

    const result = {
      id: template._id,
      name: template.name,
      nameEn: template.nameEn,
      slug: template.slug,
      category: {
        key: template.category,
        ...(categoryLabels[template.category] || categoryLabels['أخرى']),
      },
      description: template.description,
      variablesCount: (template.variables || []).length,
      requiredVariables: (template.variables || []).filter(v => v.required).length,
      isSystem: template.isSystem,
      isPublic: template.isPublic,
      version: template.version,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt,
      tags: template.tags,
      department: template.department,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
    };

    if (full) {
      result.content = template.content;
      result.contentFormat = template.contentFormat;
      result.variables = template.variables;
      result.sections = template.sections;
      result.styling = template.styling;
    }

    return result;
  }
}

module.exports = new DocumentTemplatesEngine();
module.exports.DocumentTemplate = DocumentTemplate;
