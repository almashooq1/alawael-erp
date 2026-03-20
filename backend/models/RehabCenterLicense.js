/**
 * Rehabilitation Center License Model - نموذج تراخيص مراكز تأهيل ذوي الإعاقة
 * نظام شامل لإدارة جميع التراخيص والرخص والسجلات الحكومية
 * المتعلقة بمراكز تأهيل ذوي الإعاقة في المملكة العربية السعودية
 */

const mongoose = require('mongoose');

// ==================== مخطط المستندات المرفقة ====================
const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fileUrl: String,
  fileType: String,
  fileSize: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
  notes: String,
});

// ==================== مخطط سجل التجديد ====================
const renewalRecordSchema = new mongoose.Schema({
  renewalDate: { type: Date, required: true },
  previousExpiryDate: Date,
  newExpiryDate: { type: Date, required: true },
  renewalCost: { type: Number, default: 0 },
  receiptNumber: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  attachments: [attachmentSchema],
  createdAt: { type: Date, default: Date.now },
});

// ==================== مخطط التنبيهات ====================
const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'expiry_90_days',
      'expiry_60_days',
      'expiry_30_days',
      'expiry_15_days',
      'expiry_7_days',
      'expiry_3_days',
      'expiry_today',
      'expired',
      'renewal_required',
      'inspection_due',
      'document_missing',
      'compliance_issue',
      'payment_due',
      'custom',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  isRead: { type: Boolean, default: false },
  isDismissed: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
  readAt: Date,
  sentTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentVia: {
    type: [String],
    enum: ['system', 'email', 'sms', 'whatsapp', 'push'],
    default: ['system'],
  },
});

// ==================== النموذج الرئيسي ====================
const rehabCenterLicenseSchema = new mongoose.Schema(
  {
    // ==================== معلومات المركز ====================
    center: {
      name: { type: String, required: [true, 'اسم المركز مطلوب'] },
      nameEn: String,
      branch: String,
      city: { type: String, required: [true, 'المدينة مطلوبة'] },
      region: String,
      district: String,
      address: String,
      postalCode: String,
      phone: String,
      email: String,
      website: String,
      managerName: String,
      managerPhone: String,
      crNumber: String, // رقم السجل التجاري
      unifiedNumber: String, // الرقم الموحد 700
    },

    // ==================== نوع الترخيص / السجل ====================
    licenseType: {
      type: String,
      required: [true, 'نوع الترخيص مطلوب'],
      enum: [
        // === التراخيص الحكومية ===
        'MHRSD_LICENSE', // ترخيص وزارة الموارد البشرية والتنمية الاجتماعية
        'MHRSD_REHAB_PERMIT', // تصريح مزاولة نشاط التأهيل
        'MOH_HEALTH_LICENSE', // ترخيص وزارة الصحة الصحي
        'MOH_CLINIC_LICENSE', // ترخيص العيادات الطبية
        'MOE_EDUCATION_LICENSE', // ترخيص وزارة التعليم
        'MOE_SPECIAL_ED_PERMIT', // تصريح التربية الخاصة
        'CIVIL_DEFENSE_CERT', // شهادة الدفاع المدني (السلامة)
        'CIVIL_DEFENSE_EVACUATION', // شهادة خطة الإخلاء
        'FOOD_LICENSE', // رخصة الغذاء والدواء (إذا يقدم وجبات)
        'TRANSPORT_LICENSE', // ترخيص نقل ذوي الإعاقة

        // === الرخص البلدية ===
        'MUNICIPAL_LICENSE', // الرخصة البلدية (بلدي)
        'MUNICIPAL_SAFETY', // شهادة السلامة البلدية
        'MUNICIPAL_SIGNBOARD', // رخصة اللوحة الإعلانية
        'MUNICIPAL_BUILDING', // رخصة البناء / الترميم
        'MUNICIPAL_OCCUPANCY', // شهادة إشغال المبنى

        // === السجلات التجارية والضريبية ===
        'COMMERCIAL_REG', // السجل التجاري (وزارة التجارة)
        'TAX_REG', // التسجيل الضريبي (هيئة الزكاة والضريبة)
        'VAT_CERT', // شهادة ضريبة القيمة المضافة
        'ZAKAT_CERT', // شهادة الزكاة
        'CHAMBER_MEMBERSHIP', // عضوية الغرفة التجارية

        // === تراخيص العمل والتوظيف ===
        'QIWA_CERT', // شهادة قوى (وزارة الموارد البشرية)
        'GOSI_CERT', // شهادة التأمينات الاجتماعية (GOSI)
        'SAUDIZATION_CERT', // شهادة نسبة السعودة (نطاقات)
        'WORK_PERMIT', // تصاريح العمل للموظفين الأجانب
        'WPS_CERT', // شهادة حماية الأجور

        // === تراخيص مهنية متخصصة ===
        'SCFHS_LICENSE', // ترخيص الهيئة السعودية للتخصصات الصحية
        'THERAPIST_LICENSE', // ترخيص مزاولة مهنة العلاج الطبيعي
        'SPEECH_THERAPY_LICENSE', // ترخيص مزاولة مهنة علاج النطق
        'OT_LICENSE', // ترخيص مزاولة مهنة العلاج الوظيفي
        'PSYCHOLOGIST_LICENSE', // ترخيص مزاولة مهنة الأخصائي النفسي
        'SOCIAL_WORKER_LICENSE', // ترخيص مزاولة مهنة الأخصائي الاجتماعي
        'SPECIAL_ED_LICENSE', // ترخيص مزاولة مهنة التربية الخاصة

        // === التأمين والضمانات ===
        'INSURANCE_MEDICAL', // تأمين طبي للموظفين
        'INSURANCE_LIABILITY', // تأمين المسؤولية تجاه المستفيدين
        'INSURANCE_PROPERTY', // تأمين الممتلكات
        'INSURANCE_VEHICLE', // تأمين مركبات نقل ذوي الإعاقة
        'BANK_GUARANTEE', // الضمان البنكي

        // === شهادات الجودة والاعتماد ===
        'CARF_ACCREDITATION', // اعتماد CARF الدولي
        'JCI_ACCREDITATION', // اعتماد JCI
        'CBAHI_ACCREDITATION', // اعتماد المجلس المركزي لاعتماد المنشآت الصحية
        'ISO_CERT', // شهادة الأيزو
        'QUALITY_CERT', // شهادة جودة أخرى

        // === تراخيص تقنية ===
        'DATA_PRIVACY_CERT', // شهادة حماية البيانات الشخصية (NDMO)
        'ELECTRONIC_SYSTEM_CERT', // ترخيص الأنظمة الإلكترونية
        'CCTV_PERMIT', // ترخيص كاميرات المراقبة

        // === أخرى ===
        'CONTRACT_AGREEMENT', // عقود واتفاقيات حكومية
        'DONATION_PERMIT', // تصريح جمع التبرعات
        'ADVERTISING_PERMIT', // تصريح الإعلانات
        'EVENT_PERMIT', // تصريح إقامة فعاليات
        'OTHER', // أخرى
      ],
    },

    // ==================== تصنيف الترخيص ====================
    category: {
      type: String,
      required: true,
      enum: [
        'government_license', // تراخيص حكومية
        'municipal_permit', // رخص بلدية
        'commercial_record', // سجلات تجارية
        'employment_cert', // شهادات عمل وتوظيف
        'professional_license', // تراخيص مهنية
        'insurance_guarantee', // تأمين وضمانات
        'quality_accreditation', // جودة واعتماد
        'tech_permit', // تراخيص تقنية
        'other', // أخرى
      ],
    },

    // ==================== الجهة المصدرة ====================
    issuingAuthority: {
      name: { type: String, required: [true, 'اسم الجهة المصدرة مطلوب'] },
      nameEn: String,
      code: String,
      department: String,
      contactPhone: String,
      contactEmail: String,
      website: String,
      portalUrl: String, // رابط البوابة الإلكترونية للجهة
    },

    // ==================== بيانات الترخيص ====================
    licenseNumber: {
      type: String,
      required: [true, 'رقم الترخيص مطلوب'],
      trim: true,
    },
    referenceNumber: String, // رقم مرجعي إضافي
    fileNumber: String, // رقم الملف لدى الجهة

    // ==================== الحالة ====================
    status: {
      type: String,
      enum: [
        'active', // ساري
        'expired', // منتهي
        'expiring_soon', // قريب الانتهاء
        'pending_renewal', // بانتظار التجديد
        'under_review', // قيد المراجعة
        'suspended', // موقوف
        'revoked', // ملغي
        'pending_issuance', // بانتظار الإصدار
        'draft', // مسودة
      ],
      default: 'active',
    },

    // ==================== التواريخ ====================
    dates: {
      issued: { type: Date, required: [true, 'تاريخ الإصدار مطلوب'] },
      expiry: { type: Date, required: [true, 'تاريخ الانتهاء مطلوب'] },
      lastRenewal: Date,
      nextRenewalDeadline: Date,
      firstIssued: Date, // تاريخ الإصدار الأول (أول مرة)
      suspendedDate: Date,
      revokedDate: Date,
    },

    // ==================== التكاليف والرسوم ====================
    costs: {
      issueFee: { type: Number, default: 0 },
      renewalFee: { type: Number, default: 0 },
      latePenaltyFee: { type: Number, default: 0 },
      annualFee: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
      paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'sadad', 'credit_card', 'cash', 'check', 'other'],
      },
      lastPaymentDate: Date,
      lastPaymentReceipt: String,
    },

    // ==================== معلومات التجديد ====================
    renewalSettings: {
      autoRenew: { type: Boolean, default: false },
      renewalPeriodMonths: { type: Number, default: 12 },
      alertBeforeDays: {
        type: [Number],
        default: [90, 60, 30, 15, 7, 3, 1],
      },
      renewalRequirements: [String],
      renewalSteps: [String],
      renewalPortalUrl: String, // رابط التجديد الإلكتروني
      estimatedProcessingDays: Number,
    },

    // ==================== سجل التجديدات ====================
    renewalHistory: [renewalRecordSchema],

    // ==================== التنبيهات ====================
    alerts: [alertSchema],

    // ==================== المستندات المرفقة ====================
    attachments: [attachmentSchema],

    // ==================== الامتثال والتفتيش ====================
    compliance: {
      status: {
        type: String,
        enum: [
          'compliant',
          'non_compliant',
          'partially_compliant',
          'under_review',
          'pending_inspection',
        ],
        default: 'compliant',
      },
      lastInspectionDate: Date,
      nextInspectionDate: Date,
      inspectionResult: {
        type: String,
        enum: ['passed', 'failed', 'conditional', 'pending'],
      },
      inspectorName: String,
      inspectorNotes: String,
      violations: [
        {
          date: Date,
          description: String,
          severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
          status: { type: String, enum: ['open', 'resolved', 'appealing', 'closed'] },
          resolutionDate: Date,
          penalty: Number,
          penaltyDescription: String,
        },
      ],
      correctiveActions: [
        {
          description: String,
          deadline: Date,
          status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'] },
          completedDate: Date,
          verifiedBy: String,
        },
      ],
    },

    // ==================== المسؤول عن المتابعة ====================
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedDepartment: String,

    // ==================== الملاحظات ====================
    notes: [
      {
        content: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        category: {
          type: String,
          enum: ['general', 'renewal', 'compliance', 'financial', 'urgent'],
          default: 'general',
        },
      },
    ],

    // ==================== الأولوية ====================
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },

    // ==================== العلامات ====================
    tags: [{ type: String, lowercase: true, trim: true }],

    // ==================== الحقول المخصصة ====================
    customFields: mongoose.Schema.Types.Mixed,

    // ==================== سجل التدقيق ====================
    auditTrail: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'updated',
            'renewed',
            'suspended',
            'revoked',
            'reactivated',
            'deleted',
            'alert_sent',
            'document_uploaded',
            'note_added',
            'compliance_check',
          ],
        },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: String,
        changes: mongoose.Schema.Types.Mixed,
        ipAddress: String,
      },
    ],

    // ==================== التفويض والتوكيل ====================
    delegation: {
      hasDelegation: { type: Boolean, default: false },
      delegateName: String,
      delegateId: String, // رقم الهوية
      delegatePhone: String,
      delegateEmail: String,
      delegationNumber: String, // رقم التفويض
      delegationType: {
        type: String,
        enum: ['full', 'renewal_only', 'pickup_only', 'financial', 'legal', 'custom'],
      },
      startDate: Date,
      endDate: Date,
      isActive: { type: Boolean, default: true },
      notes: String,
    },

    // ==================== التراخيص المرتبطة ====================
    linkedLicenses: [
      {
        licenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabCenterLicense' },
        relationship: {
          type: String,
          enum: ['prerequisite', 'dependent', 'companion', 'replaces', 'replaced_by', 'amendment'],
        },
        description: String,
      },
    ],

    // ==================== شروط وأحكام الترخيص ====================
    conditions: [
      {
        condition: { type: String, required: true },
        isMet: { type: Boolean, default: false },
        verifiedDate: Date,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],

    // ==================== قائمة المتطلبات ====================
    requirementsChecklist: [
      {
        requirement: { type: String, required: true },
        category: {
          type: String,
          enum: [
            'document',
            'payment',
            'inspection',
            'approval',
            'training',
            'equipment',
            'personnel',
            'other',
          ],
          default: 'document',
        },
        isCompleted: { type: Boolean, default: false },
        completedDate: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        attachmentUrl: String,
        notes: String,
      },
    ],

    // ==================== سجل العقوبات والغرامات ====================
    penalties: [
      {
        type: {
          type: String,
          enum: ['fine', 'warning', 'suspension', 'restriction', 'closure_threat', 'other'],
        },
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'SAR' },
        reason: String,
        issuedDate: { type: Date, default: Date.now },
        dueDate: Date,
        paidDate: Date,
        isPaid: { type: Boolean, default: false },
        referenceNumber: String,
        issuedBy: String, // الجهة المصدرة للعقوبة
        status: {
          type: String,
          enum: ['pending', 'paid', 'appealed', 'waived', 'escalated'],
          default: 'pending',
        },
        appealDetails: String,
        attachments: [attachmentSchema],
      },
    ],

    // ==================== التوقيع الإلكتروني ====================
    eSignature: {
      isSigned: { type: Boolean, default: false },
      signedBy: String,
      signedDate: Date,
      signatureRef: String,
      verificationUrl: String,
      certificateNumber: String,
    },

    // ==================== الفروع المرتبطة ====================
    branches: [
      {
        branchName: { type: String, required: true },
        branchCode: String,
        city: String,
        address: String,
        phone: String,
        managerName: String,
        isMainBranch: { type: Boolean, default: false },
        licenseCoversThisBranch: { type: Boolean, default: true },
      },
    ],

    // ==================== درجة المخاطرة ====================
    riskScore: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      level: {
        type: String,
        enum: ['very_low', 'low', 'medium', 'high', 'very_high', 'critical'],
        default: 'low',
      },
      factors: [
        {
          factor: String,
          weight: Number,
          score: Number,
        },
      ],
      lastCalculated: Date,
      autoCalculate: { type: Boolean, default: true },
    },

    // ==================== سير عمل الموافقات ====================
    approvalWorkflow: {
      currentStep: { type: Number, default: 0 },
      totalSteps: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'approved', 'rejected', 'on_hold'],
        default: 'not_started',
      },
      steps: [
        {
          stepNumber: Number,
          title: String,
          approverRole: String,
          approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'skipped'],
            default: 'pending',
          },
          approvedAt: Date,
          comments: String,
        },
      ],
    },

    // ==================== تقييمات الجهة المانحة ====================
    authorityRating: {
      lastRating: { type: Number, min: 1, max: 5 },
      ratingDate: Date,
      ratingNotes: String,
      compliancePercentage: { type: Number, min: 0, max: 100 },
    },

    // ==================== الأرشيف والنسخ ====================
    isArchived: { type: Boolean, default: false },
    archivedAt: Date,
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archiveReason: String,

    // ==================== إشعارات مخصصة ====================
    notificationPreferences: {
      enableEmail: { type: Boolean, default: true },
      enableSms: { type: Boolean, default: false },
      enableWhatsapp: { type: Boolean, default: false },
      enablePush: { type: Boolean, default: true },
      recipients: [
        {
          name: String,
          email: String,
          phone: String,
          role: String,
        },
      ],
      customAlertDays: [Number],
    },

    // ==================== المهام والتذكيرات ====================
    tasks: [
      {
        title: { type: String, required: true },
        description: String,
        taskType: {
          type: String,
          enum: [
            'renewal',
            'inspection',
            'document',
            'payment',
            'follow_up',
            'compliance',
            'general',
          ],
          default: 'general',
        },
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'],
          default: 'pending',
        },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        completedDate: Date,
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reminderDate: Date,
        reminderSent: { type: Boolean, default: false },
        recurrence: {
          type: String,
          enum: ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
          default: 'none',
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== سجل المراسلات ====================
    communications: [
      {
        type: {
          type: String,
          enum: ['letter', 'email', 'phone', 'visit', 'fax', 'portal', 'other'],
          default: 'letter',
        },
        direction: { type: String, enum: ['incoming', 'outgoing'], default: 'outgoing' },
        subject: { type: String, required: true },
        content: String,
        referenceNumber: String,
        authority: String,
        contactPerson: String,
        date: { type: Date, default: Date.now },
        responseRequired: { type: Boolean, default: false },
        responseDeadline: Date,
        responseReceived: { type: Boolean, default: false },
        responseDate: Date,
        responseContent: String,
        status: {
          type: String,
          enum: ['sent', 'received', 'pending_response', 'responded', 'closed'],
          default: 'sent',
        },
        attachments: [attachmentSchema],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== جهات الاتصال بالجهات المانحة ====================
    authorityContacts: [
      {
        authorityName: { type: String, required: true },
        contactName: String,
        position: String,
        department: String,
        email: String,
        phone: String,
        mobile: String,
        fax: String,
        address: String,
        city: String,
        portalUrl: String,
        portalUsername: String,
        preferredContact: {
          type: String,
          enum: ['email', 'phone', 'portal', 'visit', 'fax'],
          default: 'phone',
        },
        workingHours: String,
        notes: String,
        isPrimary: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
      },
    ],

    // ==================== قائمة الوثائق المطلوبة ====================
    documentChecklist: [
      {
        documentName: { type: String, required: true },
        documentType: {
          type: String,
          enum: [
            'original',
            'copy',
            'certified_copy',
            'translation',
            'notarized',
            'digital',
            'photo',
            'other',
          ],
          default: 'original',
        },
        category: {
          type: String,
          enum: [
            'identity',
            'legal',
            'financial',
            'technical',
            'safety',
            'health',
            'education',
            'other',
          ],
          default: 'other',
        },
        isRequired: { type: Boolean, default: true },
        isProvided: { type: Boolean, default: false },
        providedDate: Date,
        providedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        expiryDate: Date,
        notes: String,
        fileUrl: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedDate: Date,
        rejectionReason: String,
        status: {
          type: String,
          enum: ['pending', 'provided', 'verified', 'rejected', 'expired', 'not_applicable'],
          default: 'pending',
        },
      },
    ],

    // ==================== التعليقات والنقاشات ====================
    comments: [
      {
        content: { type: String, required: true },
        parentCommentId: { type: mongoose.Schema.Types.ObjectId },
        isInternal: { type: Boolean, default: true },
        isPinned: { type: Boolean, default: false },
        mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        reactions: [
          {
            emoji: String,
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          },
        ],
        editedAt: Date,
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== تتبع الميزانية ====================
    budget: {
      allocatedBudget: { type: Number, default: 0 },
      spentAmount: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
      fiscalYear: Number,
      budgetCategory: {
        type: String,
        enum: ['operational', 'renewal', 'compliance', 'legal', 'other'],
        default: 'operational',
      },
      expenses: [
        {
          description: { type: String, required: true },
          amount: { type: Number, required: true },
          category: {
            type: String,
            enum: [
              'issue_fee',
              'renewal_fee',
              'penalty',
              'consultation',
              'transportation',
              'documentation',
              'other',
            ],
            default: 'other',
          },
          date: { type: Date, default: Date.now },
          receiptNumber: String,
          vendor: String,
          approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          attachments: [attachmentSchema],
        },
      ],
      notes: String,
    },

    // ==================== مؤشر صحة الترخيص ====================
    healthScore: {
      score: { type: Number, min: 0, max: 100, default: 100 },
      grade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'F'],
        default: 'A',
      },
      factors: {
        expiryHealth: { type: Number, default: 100 },
        complianceHealth: { type: Number, default: 100 },
        documentHealth: { type: Number, default: 100 },
        financialHealth: { type: Number, default: 100 },
        taskHealth: { type: Number, default: 100 },
      },
      lastCalculated: Date,
    },

    // ==================== تقويم المواعيد ====================
    calendarEvents: [
      {
        title: { type: String, required: true },
        eventType: {
          type: String,
          enum: [
            'renewal_deadline',
            'inspection',
            'payment_due',
            'meeting',
            'submission',
            'hearing',
            'review',
            'training',
            'other',
          ],
          default: 'other',
        },
        startDate: { type: Date, required: true },
        endDate: Date,
        allDay: { type: Boolean, default: true },
        location: String,
        description: String,
        reminderBefore: { type: Number, default: 1 },
        reminderUnit: { type: String, enum: ['hours', 'days', 'weeks'], default: 'days' },
        isRecurring: { type: Boolean, default: false },
        recurrencePattern: String,
        attendees: [
          {
            name: String,
            email: String,
            role: String,
          },
        ],
        status: {
          type: String,
          enum: ['scheduled', 'completed', 'cancelled', 'postponed'],
          default: 'scheduled',
        },
        outcome: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== مؤشرات الأداء KPI ====================
    kpiData: {
      renewalOnTimeRate: { type: Number, default: 100 },
      complianceRate: { type: Number, default: 100 },
      documentCompletionRate: { type: Number, default: 0 },
      taskCompletionRate: { type: Number, default: 0 },
      avgRenewalDays: { type: Number, default: 0 },
      totalPenaltyAmount: { type: Number, default: 0 },
      communicationResponseRate: { type: Number, default: 0 },
      lastUpdated: Date,
    },

    // ==================== Round 4 ====================

    // ==================== نظام القوالب ====================
    templateData: {
      isTemplate: { type: Boolean, default: false },
      templateName: String,
      templateDescription: String,
      templateCategory: {
        type: String,
        enum: [
          'government_license',
          'municipal_permit',
          'commercial_record',
          'employment_cert',
          'professional_license',
          'insurance_guarantee',
          'quality_accreditation',
          'tech_permit',
          'general',
          'other',
        ],
      },
      templateTags: [String],
      usageCount: { type: Number, default: 0 },
      lastUsedAt: Date,
      createdFromTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabCenterLicense' },
    },

    // ==================== المفضلة والمتابعة ====================
    favorites: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    watchers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        watchType: {
          type: String,
          enum: ['all', 'status_change', 'expiry', 'renewal', 'compliance', 'comments'],
          default: 'all',
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== اتفاقيات مستوى الخدمة SLA ====================
    sla: {
      renewalSLA: {
        targetDays: { type: Number, default: 30 },
        warningDays: { type: Number, default: 15 },
        criticalDays: { type: Number, default: 7 },
        status: {
          type: String,
          enum: ['on_track', 'warning', 'breached', 'completed', 'not_applicable'],
          default: 'not_applicable',
        },
        breachedAt: Date,
        completedAt: Date,
      },
      responseSLA: {
        targetHours: { type: Number, default: 48 },
        warningHours: { type: Number, default: 24 },
        status: {
          type: String,
          enum: ['on_track', 'warning', 'breached', 'completed', 'not_applicable'],
          default: 'not_applicable',
        },
      },
      inspectionSLA: {
        targetDays: { type: Number, default: 90 },
        warningDays: { type: Number, default: 30 },
        lastChecked: Date,
        status: {
          type: String,
          enum: ['on_track', 'warning', 'breached', 'completed', 'not_applicable'],
          default: 'not_applicable',
        },
      },
      escalationRules: [
        {
          triggerCondition: {
            type: String,
            enum: [
              'sla_warning',
              'sla_breach',
              'overdue_task',
              'pending_approval',
              'unresolved_violation',
              'expiry_critical',
            ],
          },
          escalateTo: String,
          escalateAfterHours: { type: Number, default: 24 },
          notifyVia: {
            type: [String],
            enum: ['system', 'email', 'sms', 'whatsapp'],
            default: ['system', 'email'],
          },
          isActive: { type: Boolean, default: true },
        },
      ],
      overallCompliance: { type: Number, min: 0, max: 100, default: 100 },
      lastEvaluated: Date,
    },

    // ==================== نظام التذاكر الداخلي ====================
    tickets: [
      {
        ticketNumber: String,
        title: { type: String, required: true },
        description: String,
        ticketType: {
          type: String,
          enum: ['issue', 'request', 'inquiry', 'complaint', 'enhancement', 'urgent'],
          default: 'issue',
        },
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        status: {
          type: String,
          enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed', 'reopened'],
          default: 'open',
        },
        category: {
          type: String,
          enum: ['renewal', 'compliance', 'document', 'payment', 'technical', 'legal', 'general'],
          default: 'general',
        },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        resolution: String,
        resolutionDate: Date,
        dueDate: Date,
        responses: [
          {
            content: String,
            respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            respondedAt: { type: Date, default: Date.now },
            isInternal: { type: Boolean, default: false },
          },
        ],
        attachments: [attachmentSchema],
        createdAt: { type: Date, default: Date.now },
        updatedAt: Date,
        closedAt: Date,
        closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ==================== الإجراءات التلقائية ====================
    automationRules: [
      {
        ruleName: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        trigger: {
          event: {
            type: String,
            enum: [
              'status_change',
              'expiry_approaching',
              'task_overdue',
              'sla_breach',
              'compliance_change',
              'penalty_added',
              'document_expired',
              'budget_exceeded',
              'health_low',
              'custom',
            ],
            required: true,
          },
          conditions: mongoose.Schema.Types.Mixed,
        },
        actions: [
          {
            actionType: {
              type: String,
              enum: [
                'send_notification',
                'create_task',
                'create_ticket',
                'change_status',
                'assign_to',
                'escalate',
                'add_comment',
                'calculate_risk',
                'calculate_health',
                'custom',
              ],
            },
            parameters: mongoose.Schema.Types.Mixed,
          },
        ],
        lastTriggered: Date,
        triggerCount: { type: Number, default: 0 },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== التقارير التنفيذية ====================
    executiveSummary: {
      lastGenerated: Date,
      overallStatus: {
        type: String,
        enum: ['excellent', 'good', 'needs_attention', 'critical'],
        default: 'good',
      },
      keyMetrics: {
        complianceScore: { type: Number, default: 100 },
        renewalEfficiency: { type: Number, default: 100 },
        costEfficiency: { type: Number, default: 100 },
        riskLevel: { type: Number, default: 0 },
        taskCompletionRate: { type: Number, default: 100 },
        slaComplianceRate: { type: Number, default: 100 },
      },
      highlights: [String],
      concerns: [String],
      recommendations: [String],
    },

    // ==================== التحليلات التنبؤية ====================
    predictions: {
      renewalCostForecast: {
        nextRenewalEstimate: { type: Number, default: 0 },
        yearlyTrend: {
          type: String,
          enum: ['increasing', 'stable', 'decreasing'],
          default: 'stable',
        },
        confidence: { type: Number, min: 0, max: 100, default: 0 },
      },
      expiryRiskPrediction: {
        riskOfLapse: { type: Number, min: 0, max: 100, default: 0 },
        suggestedAction: String,
        predictedRenewalDate: Date,
      },
      complianceTrend: {
        direction: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' },
        projectedScore: { type: Number, default: 100 },
        riskFactors: [String],
      },
      costAnalysis: {
        totalCostLastYear: { type: Number, default: 0 },
        projectedCostNextYear: { type: Number, default: 0 },
        savingsOpportunities: [String],
      },
      lastCalculated: Date,
    },

    // ==================== سجل التغييرات المفصل ====================
    changeLog: [
      {
        changeDate: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changeType: {
          type: String,
          enum: [
            'field_update',
            'status_change',
            'renewal',
            'document_change',
            'compliance_update',
            'assignment_change',
            'bulk_update',
          ],
        },
        fieldName: String,
        fieldLabel: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changeReason: String,
        changeSource: {
          type: String,
          enum: ['manual', 'automatic', 'import', 'api', 'system'],
          default: 'manual',
        },
        ipAddress: String,
        sessionId: String,
      },
    ],

    // ==================== إصدارات الوثائق ====================
    documentVersions: [
      {
        documentName: { type: String, required: true },
        documentType: {
          type: String,
          enum: [
            'license_copy',
            'certificate',
            'report',
            'letter',
            'contract',
            'receipt',
            'inspection_report',
            'policy',
            'other',
          ],
          default: 'other',
        },
        versions: [
          {
            versionNumber: { type: Number, required: true },
            fileUrl: String,
            fileName: String,
            fileSize: Number,
            mimeType: String,
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            uploadedAt: { type: Date, default: Date.now },
            changeNotes: String,
            isCurrentVersion: { type: Boolean, default: true },
          },
        ],
        expiryDate: Date,
        reminderDays: { type: Number, default: 30 },
        reminderSent: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== Round 5: الإشعارات المتقدمة ====================
    scheduledNotifications: [
      {
        title: { type: String, required: true },
        message: String,
        notificationType: {
          type: String,
          enum: ['reminder', 'escalation', 'digest', 'scheduled', 'recurring', 'custom'],
          default: 'reminder',
        },
        channels: {
          type: [String],
          enum: ['system', 'email', 'sms', 'whatsapp', 'push'],
          default: ['system'],
        },
        scheduledDate: Date,
        recurringPattern: {
          type: String,
          enum: ['none', 'daily', 'weekly', 'monthly', 'quarterly'],
          default: 'none',
        },
        recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'cancelled'],
          default: 'pending',
        },
        sentAt: Date,
        templateId: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== Round 5: تقييم رضا المتعاملين ====================
    satisfactionSurveys: [
      {
        surveyType: {
          type: String,
          enum: ['renewal', 'inspection', 'general', 'support', 'process'],
          default: 'general',
        },
        respondentName: String,
        respondentRole: String,
        overallRating: { type: Number, min: 1, max: 5 },
        serviceQuality: { type: Number, min: 1, max: 5 },
        responseTime: { type: Number, min: 1, max: 5 },
        communication: { type: Number, min: 1, max: 5 },
        processClarity: { type: Number, min: 1, max: 5 },
        comments: String,
        suggestions: String,
        submittedAt: { type: Date, default: Date.now },
        isAnonymous: { type: Boolean, default: false },
      },
    ],

    // ==================== Round 5: التوقيعات الرقمية ====================
    digitalSignatures: [
      {
        signatureType: {
          type: String,
          enum: ['approval', 'review', 'acknowledgment', 'authorization', 'witness'],
          default: 'approval',
        },
        signerName: { type: String, required: true },
        signerTitle: String,
        signerEmail: String,
        signedAt: { type: Date, default: Date.now },
        signatureHash: String,
        certificateId: String,
        ipAddress: String,
        deviceInfo: String,
        isVerified: { type: Boolean, default: false },
        verifiedAt: Date,
        documentRef: String,
        notes: String,
      },
    ],

    // ==================== Round 5: الاجتماعات والمراجعات ====================
    meetings: [
      {
        meetingType: {
          type: String,
          enum: ['review', 'planning', 'inspection', 'compliance', 'emergency', 'follow_up'],
          default: 'review',
        },
        title: { type: String, required: true },
        description: String,
        date: Date,
        duration: Number, // بالدقائق
        location: String,
        isVirtual: { type: Boolean, default: false },
        meetingLink: String,
        attendees: [
          {
            name: String,
            role: String,
            email: String,
            attended: { type: Boolean, default: false },
          },
        ],
        agenda: [String],
        decisions: [
          {
            decision: String,
            assignedTo: String,
            deadline: Date,
            status: {
              type: String,
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              default: 'pending',
            },
          },
        ],
        minutes: String,
        nextMeetingDate: Date,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== Round 5: الربط الخارجي ====================
    externalIntegrations: [
      {
        systemName: { type: String, required: true },
        systemType: {
          type: String,
          enum: [
            'government_api',
            'payment_gateway',
            'notification_service',
            'erp',
            'crm',
            'custom',
          ],
          default: 'custom',
        },
        externalId: String,
        syncStatus: {
          type: String,
          enum: ['synced', 'pending', 'failed', 'not_configured'],
          default: 'not_configured',
        },
        lastSyncAt: Date,
        lastSyncResult: String,
        apiEndpoint: String,
        webhookUrl: String,
        isActive: { type: Boolean, default: true },
        metadata: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== Round 5: التدريب والتأهيل ====================
    trainingRecords: [
      {
        trainingType: {
          type: String,
          enum: ['mandatory', 'optional', 'certification', 'workshop', 'online', 'orientation'],
          default: 'mandatory',
        },
        title: { type: String, required: true },
        description: String,
        provider: String,
        employeeName: String,
        employeeId: String,
        startDate: Date,
        endDate: Date,
        duration: Number, // بالساعات
        status: {
          type: String,
          enum: ['planned', 'in_progress', 'completed', 'cancelled', 'failed'],
          default: 'planned',
        },
        score: Number,
        certificateNumber: String,
        certificateExpiry: Date,
        isRequired: { type: Boolean, default: false },
        notes: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== Round 5: ويدجت لوحة المعلومات ====================
    dashboardWidgets: {
      layout: {
        type: String,
        enum: ['default', 'compact', 'detailed', 'custom'],
        default: 'default',
      },
      widgets: [
        {
          widgetType: {
            type: String,
            enum: [
              'status_summary',
              'expiry_countdown',
              'cost_tracker',
              'compliance_gauge',
              'risk_indicator',
              'task_list',
              'recent_activity',
              'sla_status',
              'budget_chart',
              'health_score',
              'quick_actions',
              'notifications',
            ],
          },
          position: { row: Number, col: Number },
          size: { width: { type: Number, default: 1 }, height: { type: Number, default: 1 } },
          isVisible: { type: Boolean, default: true },
          settings: mongoose.Schema.Types.Mixed,
        },
      ],
      lastCustomized: Date,
      customizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    // ==================== Round 5: الإصلاح التلقائي ====================
    remediationActions: [
      {
        triggerCondition: {
          type: String,
          enum: [
            'expired',
            'sla_breach',
            'high_risk',
            'compliance_fail',
            'overdue_task',
            'budget_exceeded',
          ],
          required: true,
        },
        actionType: {
          type: String,
          enum: [
            'auto_renew_request',
            'escalate',
            'notify_manager',
            'suspend_operations',
            'create_task',
            'send_reminder',
          ],
          required: true,
        },
        description: String,
        isAutomatic: { type: Boolean, default: false },
        executed: { type: Boolean, default: false },
        executedAt: Date,
        result: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== Round 5: الموردين والمقاولين ====================
    vendors: [
      {
        vendorName: { type: String, required: true },
        vendorType: {
          type: String,
          enum: [
            'consultancy',
            'legal',
            'inspection',
            'maintenance',
            'documentation',
            'training',
            'other',
          ],
          default: 'other',
        },
        contactPerson: String,
        phone: String,
        email: String,
        contractNumber: String,
        contractStart: Date,
        contractEnd: Date,
        contractValue: Number,
        rating: { type: Number, min: 1, max: 5 },
        status: {
          type: String,
          enum: ['active', 'inactive', 'suspended', 'expired'],
          default: 'active',
        },
        services: [String],
        notes: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ==================== Round 5: الشكاوى والمقترحات ====================
    complaints: [
      {
        complaintNumber: String,
        complaintType: {
          type: String,
          enum: ['service_quality', 'delay', 'communication', 'process', 'staff', 'other'],
          default: 'other',
        },
        subject: { type: String, required: true },
        description: String,
        submittedBy: String,
        submittedAt: { type: Date, default: Date.now },
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        status: {
          type: String,
          enum: ['open', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected'],
          default: 'open',
        },
        assignedTo: String,
        resolution: String,
        resolvedAt: Date,
        satisfactionRating: { type: Number, min: 1, max: 5 },
        isSuggestion: { type: Boolean, default: false },
        responses: [
          {
            responder: String,
            message: String,
            respondedAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],

    // ==================== التحكم ====================
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== Virtual Fields ====================

// عدد الأيام حتى الانتهاء
rehabCenterLicenseSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.dates?.expiry) return null;
  const today = new Date();
  const expiry = new Date(this.dates.expiry);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
});

// حالة الانتهاء النصية
rehabCenterLicenseSchema.virtual('expiryLabel').get(function () {
  const days = this.daysUntilExpiry;
  if (days === null) return 'غير محدد';
  if (days < 0) return 'منتهي الصلاحية';
  if (days === 0) return 'ينتهي اليوم';
  if (days <= 3) return 'ينتهي خلال أيام';
  if (days <= 7) return 'ينتهي هذا الأسبوع';
  if (days <= 15) return 'ينتهي قريباً جداً';
  if (days <= 30) return 'ينتهي خلال شهر';
  if (days <= 60) return 'ينتهي خلال شهرين';
  if (days <= 90) return 'ينتهي خلال 3 أشهر';
  return 'ساري المفعول';
});

// نسبة الصلاحية المتبقية
rehabCenterLicenseSchema.virtual('validityPercentage').get(function () {
  if (!this.dates?.issued || !this.dates?.expiry) return 0;
  const issued = new Date(this.dates.issued);
  const expiry = new Date(this.dates.expiry);
  const total = expiry - issued;
  const remaining = expiry - new Date();
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
});

// اسم نوع الترخيص بالعربي
rehabCenterLicenseSchema.virtual('licenseTypeLabel').get(function () {
  const labels = {
    MHRSD_LICENSE: 'ترخيص وزارة الموارد البشرية',
    MHRSD_REHAB_PERMIT: 'تصريح مزاولة نشاط التأهيل',
    MOH_HEALTH_LICENSE: 'ترخيص صحي - وزارة الصحة',
    MOH_CLINIC_LICENSE: 'ترخيص العيادات الطبية',
    MOE_EDUCATION_LICENSE: 'ترخيص وزارة التعليم',
    MOE_SPECIAL_ED_PERMIT: 'تصريح التربية الخاصة',
    CIVIL_DEFENSE_CERT: 'شهادة الدفاع المدني',
    CIVIL_DEFENSE_EVACUATION: 'شهادة خطة الإخلاء',
    FOOD_LICENSE: 'رخصة الغذاء والدواء',
    TRANSPORT_LICENSE: 'ترخيص نقل ذوي الإعاقة',
    MUNICIPAL_LICENSE: 'الرخصة البلدية',
    MUNICIPAL_SAFETY: 'شهادة السلامة البلدية',
    MUNICIPAL_SIGNBOARD: 'رخصة اللوحة الإعلانية',
    MUNICIPAL_BUILDING: 'رخصة البناء',
    MUNICIPAL_OCCUPANCY: 'شهادة إشغال المبنى',
    COMMERCIAL_REG: 'السجل التجاري',
    TAX_REG: 'التسجيل الضريبي',
    VAT_CERT: 'شهادة ضريبة القيمة المضافة',
    ZAKAT_CERT: 'شهادة الزكاة',
    CHAMBER_MEMBERSHIP: 'عضوية الغرفة التجارية',
    QIWA_CERT: 'شهادة قوى',
    GOSI_CERT: 'شهادة التأمينات الاجتماعية',
    SAUDIZATION_CERT: 'شهادة نسبة السعودة',
    WORK_PERMIT: 'تصاريح العمل',
    WPS_CERT: 'شهادة حماية الأجور',
    SCFHS_LICENSE: 'ترخيص التخصصات الصحية',
    THERAPIST_LICENSE: 'ترخيص علاج طبيعي',
    SPEECH_THERAPY_LICENSE: 'ترخيص علاج نطق',
    OT_LICENSE: 'ترخيص علاج وظيفي',
    PSYCHOLOGIST_LICENSE: 'ترخيص أخصائي نفسي',
    SOCIAL_WORKER_LICENSE: 'ترخيص أخصائي اجتماعي',
    SPECIAL_ED_LICENSE: 'ترخيص تربية خاصة',
    INSURANCE_MEDICAL: 'تأمين طبي',
    INSURANCE_LIABILITY: 'تأمين مسؤولية',
    INSURANCE_PROPERTY: 'تأمين ممتلكات',
    INSURANCE_VEHICLE: 'تأمين مركبات',
    BANK_GUARANTEE: 'ضمان بنكي',
    CARF_ACCREDITATION: 'اعتماد CARF',
    JCI_ACCREDITATION: 'اعتماد JCI',
    CBAHI_ACCREDITATION: 'اعتماد CBAHI',
    ISO_CERT: 'شهادة الأيزو',
    QUALITY_CERT: 'شهادة جودة',
    DATA_PRIVACY_CERT: 'شهادة حماية البيانات',
    ELECTRONIC_SYSTEM_CERT: 'ترخيص أنظمة إلكترونية',
    CCTV_PERMIT: 'ترخيص كاميرات مراقبة',
    CONTRACT_AGREEMENT: 'عقد / اتفاقية حكومية',
    DONATION_PERMIT: 'تصريح جمع تبرعات',
    ADVERTISING_PERMIT: 'تصريح إعلانات',
    EVENT_PERMIT: 'تصريح فعاليات',
    OTHER: 'أخرى',
  };
  return labels[this.licenseType] || this.licenseType;
});

// ==================== Indexes ====================
rehabCenterLicenseSchema.index({ licenseNumber: 1, licenseType: 1 });
rehabCenterLicenseSchema.index({ 'center.name': 1 });
rehabCenterLicenseSchema.index({ 'center.crNumber': 1 });
rehabCenterLicenseSchema.index({ status: 1, 'dates.expiry': 1 });
rehabCenterLicenseSchema.index({ 'dates.expiry': 1 });
rehabCenterLicenseSchema.index({ category: 1 });
rehabCenterLicenseSchema.index({ licenseType: 1 });
rehabCenterLicenseSchema.index({ isActive: 1, isDeleted: 1 });
rehabCenterLicenseSchema.index({ priority: 1 });
rehabCenterLicenseSchema.index({ assignedTo: 1 });
rehabCenterLicenseSchema.index({ createdAt: -1 });
rehabCenterLicenseSchema.index({ 'riskScore.level': 1 });
rehabCenterLicenseSchema.index({ isArchived: 1 });
rehabCenterLicenseSchema.index({ 'penalties.status': 1 });
rehabCenterLicenseSchema.index({ 'approvalWorkflow.status': 1 });
rehabCenterLicenseSchema.index({ 'center.city': 1, 'center.region': 1 });

rehabCenterLicenseSchema.index({ 'tasks.status': 1, 'tasks.dueDate': 1 });
rehabCenterLicenseSchema.index({ 'communications.date': -1 });
rehabCenterLicenseSchema.index({ 'documentChecklist.status': 1 });
rehabCenterLicenseSchema.index({ 'calendarEvents.startDate': 1 });
rehabCenterLicenseSchema.index({ 'healthScore.score': 1 });
rehabCenterLicenseSchema.index({ 'budget.fiscalYear': 1 });

// Full text search
rehabCenterLicenseSchema.index({
  'center.name': 'text',
  licenseNumber: 'text',
  'issuingAuthority.name': 'text',
  tags: 'text',
});

// Round 4 indexes
rehabCenterLicenseSchema.index({
  'templateData.isTemplate': 1,
  'templateData.templateCategory': 1,
});
rehabCenterLicenseSchema.index({ 'favorites.userId': 1 });
rehabCenterLicenseSchema.index({ 'watchers.userId': 1 });
rehabCenterLicenseSchema.index({ 'sla.overallCompliance': 1 });
rehabCenterLicenseSchema.index({ 'tickets.status': 1, 'tickets.priority': 1 });
rehabCenterLicenseSchema.index({ 'changeLog.changeDate': -1 });
rehabCenterLicenseSchema.index({ 'documentVersions.expiryDate': 1 });

// ==================== Methods ====================

rehabCenterLicenseSchema.methods.isExpired = function () {
  return new Date() > new Date(this.dates.expiry);
};

rehabCenterLicenseSchema.methods.isExpiringSoon = function (days = 30) {
  const d = this.daysUntilExpiry;
  return d !== null && d > 0 && d <= days;
};

rehabCenterLicenseSchema.methods.addAuditEntry = function (action, userId, details, changes, ip) {
  this.auditTrail.push({
    action,
    performedBy: userId,
    performedAt: new Date(),
    details,
    changes,
    ipAddress: ip,
  });
  return this;
};

rehabCenterLicenseSchema.methods.renew = function (newExpiryDate, renewalData = {}) {
  const previousExpiry = this.dates.expiry;
  this.renewalHistory.push({
    renewalDate: new Date(),
    previousExpiryDate: previousExpiry,
    newExpiryDate,
    renewalCost: renewalData.cost || 0,
    receiptNumber: renewalData.receiptNumber,
    status: 'approved',
    processedBy: renewalData.userId,
    notes: renewalData.notes,
  });
  this.dates.expiry = newExpiryDate;
  this.dates.lastRenewal = new Date();
  this.status = 'active';
  return this;
};

/** حساب درجة المخاطرة تلقائياً */
rehabCenterLicenseSchema.methods.calculateRiskScore = function () {
  const factors = [];
  let totalScore = 0;
  let totalWeight = 0;

  // عامل 1: وقت الانتهاء
  const days = this.daysUntilExpiry;
  if (days !== null) {
    let expiryScore = 0;
    if (days < 0) expiryScore = 100;
    else if (days <= 7) expiryScore = 90;
    else if (days <= 15) expiryScore = 75;
    else if (days <= 30) expiryScore = 60;
    else if (days <= 60) expiryScore = 40;
    else if (days <= 90) expiryScore = 25;
    else expiryScore = 5;
    factors.push({ factor: 'قرب الانتهاء', weight: 35, score: expiryScore });
    totalScore += expiryScore * 35;
    totalWeight += 35;
  }

  // عامل 2: المخالفات
  const openViolations = (this.compliance?.violations || []).filter(
    v => v.status === 'open'
  ).length;
  const violationScore = Math.min(100, openViolations * 25);
  factors.push({ factor: 'المخالفات المفتوحة', weight: 25, score: violationScore });
  totalScore += violationScore * 25;
  totalWeight += 25;

  // عامل 3: الغرامات المعلقة
  const pendingPenalties = (this.penalties || []).filter(p => p.status === 'pending').length;
  const penaltyScore = Math.min(100, pendingPenalties * 30);
  factors.push({ factor: 'الغرامات المعلقة', weight: 20, score: penaltyScore });
  totalScore += penaltyScore * 20;
  totalWeight += 20;

  // عامل 4: الامتثال
  let complianceScore = 0;
  if (this.compliance?.status === 'non_compliant') complianceScore = 100;
  else if (this.compliance?.status === 'partially_compliant') complianceScore = 60;
  else if (this.compliance?.status === 'under_review') complianceScore = 40;
  else complianceScore = 0;
  factors.push({ factor: 'حالة الامتثال', weight: 20, score: complianceScore });
  totalScore += complianceScore * 20;
  totalWeight += 20;

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  let level = 'very_low';
  if (finalScore >= 80) level = 'critical';
  else if (finalScore >= 65) level = 'very_high';
  else if (finalScore >= 50) level = 'high';
  else if (finalScore >= 35) level = 'medium';
  else if (finalScore >= 15) level = 'low';

  this.riskScore = {
    score: finalScore,
    level,
    factors,
    lastCalculated: new Date(),
    autoCalculate: true,
  };
  return this.riskScore;
};

/** التحقق من استيفاء جميع المتطلبات */
rehabCenterLicenseSchema.methods.checkRequirementsComplete = function () {
  if (!this.requirementsChecklist || this.requirementsChecklist.length === 0)
    return { complete: true, percentage: 100 };
  const total = this.requirementsChecklist.length;
  const completed = this.requirementsChecklist.filter(r => r.isCompleted).length;
  return {
    complete: total === completed,
    percentage: Math.round((completed / total) * 100),
    total,
    completed,
    pending: total - completed,
  };
};

/** التحقق من استيفاء جميع الشروط */
rehabCenterLicenseSchema.methods.checkConditionsMet = function () {
  if (!this.conditions || this.conditions.length === 0) return { met: true, percentage: 100 };
  const total = this.conditions.length;
  const met = this.conditions.filter(c => c.isMet).length;
  return {
    met: total === met,
    percentage: Math.round((met / total) * 100),
    total,
    metCount: met,
    unmet: total - met,
  };
};

/** حساب مؤشر صحة الترخيص */
rehabCenterLicenseSchema.methods.calculateHealthScore = function () {
  const factors = {};

  // 1. صحة تاريخ الانتهاء (30%)
  const days = this.daysUntilExpiry;
  if (days === null) factors.expiryHealth = 50;
  else if (days < 0) factors.expiryHealth = 0;
  else if (days <= 7) factors.expiryHealth = 15;
  else if (days <= 30) factors.expiryHealth = 40;
  else if (days <= 60) factors.expiryHealth = 60;
  else if (days <= 90) factors.expiryHealth = 80;
  else factors.expiryHealth = 100;

  // 2. صحة الامتثال (25%)
  if (this.compliance?.status === 'compliant') factors.complianceHealth = 100;
  else if (this.compliance?.status === 'partially_compliant') factors.complianceHealth = 50;
  else if (this.compliance?.status === 'non_compliant') factors.complianceHealth = 0;
  else factors.complianceHealth = 75;

  // 3. صحة الوثائق (20%)
  const docs = this.documentChecklist || [];
  if (docs.length === 0) factors.documentHealth = 100;
  else {
    const verified = docs.filter(
      d => d.status === 'verified' || d.status === 'not_applicable'
    ).length;
    factors.documentHealth = Math.round((verified / docs.length) * 100);
  }

  // 4. الصحة المالية (15%)
  const pendingPens = (this.penalties || []).filter(p => p.status === 'pending').length;
  const budgetUsed =
    this.budget?.allocatedBudget > 0
      ? (this.budget.spentAmount / this.budget.allocatedBudget) * 100
      : 0;
  factors.financialHealth = Math.max(0, 100 - pendingPens * 20 - (budgetUsed > 100 ? 30 : 0));

  // 5. صحة المهام (10%)
  const tasks = this.tasks || [];
  if (tasks.length === 0) factors.taskHealth = 100;
  else {
    const overdue = tasks.filter(
      t =>
        t.status === 'overdue' ||
        (t.status === 'pending' && t.dueDate && new Date(t.dueDate) < new Date())
    ).length;
    factors.taskHealth = Math.max(0, 100 - overdue * 25);
  }

  // الحساب النهائي
  const score = Math.round(
    factors.expiryHealth * 0.3 +
      factors.complianceHealth * 0.25 +
      factors.documentHealth * 0.2 +
      factors.financialHealth * 0.15 +
      factors.taskHealth * 0.1
  );

  let grade = 'A';
  if (score < 40) grade = 'F';
  else if (score < 55) grade = 'D';
  else if (score < 70) grade = 'C';
  else if (score < 85) grade = 'B';

  this.healthScore = { score, grade, factors, lastCalculated: new Date() };
  return this.healthScore;
};

/** حساب مؤشرات الأداء KPI */
rehabCenterLicenseSchema.methods.calculateKPIs = function () {
  const kpi = {};

  // نسبة التجديد في الوقت المحدد
  const renewals = this.renewalHistory || [];
  if (renewals.length > 0) {
    const onTime = renewals.filter(r => {
      if (!r.previousExpiryDate || !r.renewalDate) return true;
      return new Date(r.renewalDate) <= new Date(r.previousExpiryDate);
    }).length;
    kpi.renewalOnTimeRate = Math.round((onTime / renewals.length) * 100);
  } else kpi.renewalOnTimeRate = 100;

  // نسبة الامتثال
  kpi.complianceRate =
    this.compliance?.status === 'compliant'
      ? 100
      : this.compliance?.status === 'partially_compliant'
        ? 50
        : 0;

  // نسبة اكتمال الوثائق
  const docs = this.documentChecklist || [];
  kpi.documentCompletionRate =
    docs.length > 0
      ? Math.round((docs.filter(d => d.status === 'verified').length / docs.length) * 100)
      : 0;

  // نسبة إنجاز المهام
  const tasks = this.tasks || [];
  kpi.taskCompletionRate =
    tasks.length > 0
      ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
      : 0;

  // متوسط أيام التجديد
  if (renewals.length > 0) {
    const totalDays = renewals.reduce((sum, r) => {
      if (!r.previousExpiryDate || !r.renewalDate) return sum;
      const diff = Math.abs(new Date(r.renewalDate) - new Date(r.previousExpiryDate));
      return sum + Math.ceil(diff / (1000 * 60 * 60 * 24));
    }, 0);
    kpi.avgRenewalDays = Math.round(totalDays / renewals.length);
  } else kpi.avgRenewalDays = 0;

  // إجمالي الغرامات
  kpi.totalPenaltyAmount = (this.penalties || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  // نسبة الرد على المراسلات
  const comms = (this.communications || []).filter(c => c.responseRequired);
  kpi.communicationResponseRate =
    comms.length > 0
      ? Math.round((comms.filter(c => c.responseReceived).length / comms.length) * 100)
      : 0;

  kpi.lastUpdated = new Date();
  this.kpiData = kpi;
  return this.kpiData;
};

/** حساب SLA وتحديث حالته */
rehabCenterLicenseSchema.methods.evaluateSLA = function () {
  const now = new Date();
  const sla = this.sla || {};

  // SLA التجديد
  if (this.dates?.expiry) {
    const days = this.daysUntilExpiry;
    if (days !== null && days >= 0) {
      const target = sla.renewalSLA?.targetDays || 30;
      const warning = sla.renewalSLA?.warningDays || 15;
      const critical = sla.renewalSLA?.criticalDays || 7;
      if (days <= critical) {
        sla.renewalSLA = {
          ...sla.renewalSLA,
          status: 'breached',
          breachedAt: sla.renewalSLA?.breachedAt || now,
        };
      } else if (days <= warning) {
        sla.renewalSLA = { ...sla.renewalSLA, status: 'warning' };
      } else if (days <= target) {
        sla.renewalSLA = { ...sla.renewalSLA, status: 'on_track' };
      } else {
        sla.renewalSLA = { ...sla.renewalSLA, status: 'on_track' };
      }
    }
  }

  // SLA التفتيش
  if (this.compliance?.nextInspectionDate) {
    const inspDays = Math.ceil(
      (new Date(this.compliance.nextInspectionDate) - now) / (1000 * 60 * 60 * 24)
    );
    const _target = sla.inspectionSLA?.targetDays || 90;
    const warning = sla.inspectionSLA?.warningDays || 30;
    if (inspDays < 0)
      sla.inspectionSLA = { ...sla.inspectionSLA, status: 'breached', lastChecked: now };
    else if (inspDays <= warning)
      sla.inspectionSLA = { ...sla.inspectionSLA, status: 'warning', lastChecked: now };
    else sla.inspectionSLA = { ...sla.inspectionSLA, status: 'on_track', lastChecked: now };
  }

  // حساب الامتثال الكلي
  const slaStatuses = [
    sla.renewalSLA?.status,
    sla.responseSLA?.status,
    sla.inspectionSLA?.status,
  ].filter(s => s && s !== 'not_applicable');
  if (slaStatuses.length > 0) {
    const scores = slaStatuses.map(s =>
      s === 'completed' ? 100 : s === 'on_track' ? 80 : s === 'warning' ? 50 : 0
    );
    sla.overallCompliance = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  sla.lastEvaluated = now;
  this.sla = sla;
  return this.sla;
};

/** توليد التقرير التنفيذي */
rehabCenterLicenseSchema.methods.generateExecutiveSummary = function () {
  const summary = { highlights: [], concerns: [], recommendations: [], keyMetrics: {} };
  const days = this.daysUntilExpiry;

  // المؤشرات
  summary.keyMetrics.complianceScore =
    this.compliance?.status === 'compliant'
      ? 100
      : this.compliance?.status === 'partially_compliant'
        ? 50
        : 0;
  summary.keyMetrics.renewalEfficiency = this.kpiData?.renewalOnTimeRate || 100;
  summary.keyMetrics.riskLevel = this.riskScore?.score || 0;
  summary.keyMetrics.taskCompletionRate = this.kpiData?.taskCompletionRate || 100;
  summary.keyMetrics.slaComplianceRate = this.sla?.overallCompliance || 100;

  const budget = this.budget || {};
  summary.keyMetrics.costEfficiency =
    budget.allocatedBudget > 0
      ? Math.max(0, Math.round((1 - budget.spentAmount / budget.allocatedBudget) * 100))
      : 100;

  // النقاط البارزة
  if (this.status === 'active' && days > 90) summary.highlights.push('الترخيص ساري ومستقر');
  if (summary.keyMetrics.complianceScore === 100) summary.highlights.push('الامتثال كامل');
  if ((this.tasks || []).filter(t => t.status === 'completed').length > 0)
    summary.highlights.push('توجد مهام مكتملة');
  if (this.healthScore?.grade === 'A') summary.highlights.push('صحة الترخيص ممتازة');

  // المخاوف
  if (days !== null && days <= 30 && days >= 0) summary.concerns.push(`ينتهي خلال ${days} يوم`);
  if (days !== null && days < 0) summary.concerns.push('الترخيص منتهي الصلاحية');
  if ((this.penalties || []).filter(p => p.status === 'pending').length > 0)
    summary.concerns.push('توجد غرامات معلقة');
  if (
    this.riskScore?.level === 'high' ||
    this.riskScore?.level === 'very_high' ||
    this.riskScore?.level === 'critical'
  )
    summary.concerns.push('مستوى المخاطرة مرتفع');
  if ((this.tickets || []).filter(t => t.status === 'open').length > 0)
    summary.concerns.push('توجد تذاكر مفتوحة');

  // التوصيات
  if (days !== null && days <= 60 && days > 0)
    summary.recommendations.push('ابدأ إجراءات التجديد الآن');
  if (summary.keyMetrics.complianceScore < 100)
    summary.recommendations.push('معالجة قضايا الامتثال المعلقة');
  if (budget.spentAmount > budget.allocatedBudget * 0.9 && budget.allocatedBudget > 0)
    summary.recommendations.push('مراجعة الميزانية المخصصة');
  if ((this.tasks || []).filter(t => t.status === 'overdue').length > 0)
    summary.recommendations.push('متابعة المهام المتأخرة');

  const overallStatus =
    summary.concerns.length === 0
      ? 'excellent'
      : summary.concerns.length <= 1
        ? 'good'
        : summary.concerns.length <= 2
          ? 'needs_attention'
          : 'critical';

  this.executiveSummary = { ...summary, overallStatus, lastGenerated: new Date() };
  return this.executiveSummary;
};

/** حساب التحليلات التنبؤية */
rehabCenterLicenseSchema.methods.calculatePredictions = function () {
  const predictions = {};
  const renewals = this.renewalHistory || [];
  const penalties = this.penalties || [];

  // توقع تكلفة التجديد
  if (renewals.length >= 2) {
    const costs = renewals.filter(r => r.renewalCost > 0).map(r => r.renewalCost);
    if (costs.length >= 2) {
      const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
      const lastCost = costs[costs.length - 1];
      const trend =
        lastCost > avg * 1.1 ? 'increasing' : lastCost < avg * 0.9 ? 'decreasing' : 'stable';
      predictions.renewalCostForecast = {
        nextRenewalEstimate: Math.round(
          lastCost * (trend === 'increasing' ? 1.1 : trend === 'decreasing' ? 0.95 : 1)
        ),
        yearlyTrend: trend,
        confidence: Math.min(90, 50 + costs.length * 10),
      };
    }
  }
  if (!predictions.renewalCostForecast) {
    predictions.renewalCostForecast = {
      nextRenewalEstimate: this.costs?.renewalFee || 0,
      yearlyTrend: 'stable',
      confidence: 30,
    };
  }

  // توقع خطر الانقطاع
  const days = this.daysUntilExpiry;
  let riskOfLapse = 0;
  if (days !== null) {
    if (days < 0) riskOfLapse = 100;
    else if (days <= 7) riskOfLapse = 85;
    else if (days <= 15) riskOfLapse = 65;
    else if (days <= 30) riskOfLapse = 45;
    else if (days <= 60) riskOfLapse = 20;
    else riskOfLapse = 5;
  }
  const lateRenewals = renewals.filter(
    r =>
      r.previousExpiryDate &&
      r.renewalDate &&
      new Date(r.renewalDate) > new Date(r.previousExpiryDate)
  ).length;
  if (lateRenewals > 0) riskOfLapse = Math.min(100, riskOfLapse + lateRenewals * 10);

  predictions.expiryRiskPrediction = {
    riskOfLapse: Math.min(100, riskOfLapse),
    suggestedAction:
      riskOfLapse > 70
        ? 'تجديد عاجل مطلوب'
        : riskOfLapse > 40
          ? 'بدء إجراءات التجديد'
          : 'مراقبة دورية',
    predictedRenewalDate: this.dates?.expiry
      ? new Date(new Date(this.dates.expiry).getTime() - 30 * 24 * 60 * 60 * 1000)
      : null,
  };

  // اتجاه الامتثال
  const violations = this.compliance?.violations || [];
  const recentViolations = violations.filter(
    v => new Date(v.date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  ).length;
  const olderViolations = violations.filter(
    v => new Date(v.date) <= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  ).length;
  predictions.complianceTrend = {
    direction:
      recentViolations > olderViolations
        ? 'declining'
        : recentViolations < olderViolations
          ? 'improving'
          : 'stable',
    projectedScore: Math.max(0, 100 - recentViolations * 15),
    riskFactors: [],
  };
  if (recentViolations > 0)
    predictions.complianceTrend.riskFactors.push(`${recentViolations} مخالفة خلال العام الأخير`);
  if (penalties.filter(p => p.status === 'pending').length > 0)
    predictions.complianceTrend.riskFactors.push('غرامات معلقة');

  // تحليل التكاليف
  const expenses = this.budget?.expenses || [];
  const lastYearExpenses = expenses.filter(
    e => new Date(e.date) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );
  const totalLastYear = lastYearExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  predictions.costAnalysis = {
    totalCostLastYear: totalLastYear,
    projectedCostNextYear: Math.round(totalLastYear * 1.05),
    savingsOpportunities: [],
  };
  if (this.costs?.latePenaltyFee > 0)
    predictions.costAnalysis.savingsOpportunities.push('تجنب غرامات التأخير بالتجديد المبكر');
  if (totalLastYear > (this.budget?.allocatedBudget || 0))
    predictions.costAnalysis.savingsOpportunities.push('مراجعة وتحسين الميزانية المخصصة');

  predictions.lastCalculated = new Date();
  this.predictions = predictions;
  return this.predictions;
};

/** تسجيل تغيير في السجل المفصل */
rehabCenterLicenseSchema.methods.addChangeLogEntry = function (
  fieldName,
  fieldLabel,
  oldValue,
  newValue,
  userId,
  changeType,
  reason,
  source
) {
  if (!this.changeLog) this.changeLog = [];
  this.changeLog.push({
    changeDate: new Date(),
    changedBy: userId,
    changeType: changeType || 'field_update',
    fieldName,
    fieldLabel,
    oldValue,
    newValue,
    changeReason: reason || '',
    changeSource: source || 'manual',
  });
  return this;
};

// ==================== Statics Round 4 ====================

/** قوالب التراخيص */
rehabCenterLicenseSchema.statics.getTemplates = async function (category) {
  const query = { 'templateData.isTemplate': true, isActive: true, isDeleted: false };
  if (category) query['templateData.templateCategory'] = category;
  return this.find(query)
    .select('templateData licenseType category issuingAuthority center.name')
    .sort({ 'templateData.usageCount': -1 })
    .lean();
};

/** مفضلات المستخدم */
rehabCenterLicenseSchema.statics.getUserFavorites = async function (userId) {
  return this.find({ 'favorites.userId': userId, isActive: true, isDeleted: false })
    .select('licenseNumber licenseType category center.name status dates healthScore')
    .sort({ 'dates.expiry': 1 })
    .lean();
};

/** قائمة متابعة المستخدم */
rehabCenterLicenseSchema.statics.getUserWatchlist = async function (userId) {
  return this.find({ 'watchers.userId': userId, isActive: true, isDeleted: false })
    .select('licenseNumber licenseType category center.name status dates healthScore')
    .sort({ 'dates.expiry': 1 })
    .lean();
};

/** إحصائيات التذاكر */
rehabCenterLicenseSchema.statics.getTicketStatistics = async function () {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'tickets.0': { $exists: true } } },
    { $unwind: '$tickets' },
    {
      $group: {
        _id: '$tickets.status',
        count: { $sum: 1 },
        byPriority: { $push: '$tickets.priority' },
      },
    },
  ]);
};

/** تذاكر مفتوحة */
rehabCenterLicenseSchema.statics.getOpenTickets = async function () {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'tickets.0': { $exists: true } } },
    { $unwind: '$tickets' },
    { $match: { 'tickets.status': { $in: ['open', 'in_progress', 'waiting', 'reopened'] } } },
    {
      $project: {
        licenseNumber: 1,
        'center.name': 1,
        ticket: '$tickets',
      },
    },
    { $sort: { 'tickets.priority': -1, 'tickets.createdAt': 1 } },
  ]);
};

/** إحصائيات SLA */
rehabCenterLicenseSchema.statics.getSLAStatistics = async function () {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalLicenses: { $sum: 1 },
        avgSLACompliance: { $avg: '$sla.overallCompliance' },
        renewalBreached: {
          $sum: { $cond: [{ $eq: ['$sla.renewalSLA.status', 'breached'] }, 1, 0] },
        },
        renewalWarning: { $sum: { $cond: [{ $eq: ['$sla.renewalSLA.status', 'warning'] }, 1, 0] } },
        inspectionBreached: {
          $sum: { $cond: [{ $eq: ['$sla.inspectionSLA.status', 'breached'] }, 1, 0] },
        },
      },
    },
  ]);
};

/** وثائق منتهية الصلاحية */
rehabCenterLicenseSchema.statics.getExpiringDocuments = async function (days = 30) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'documentVersions.0': { $exists: true } } },
    { $unwind: '$documentVersions' },
    {
      $match: {
        'documentVersions.expiryDate': { $gte: now, $lte: future },
        'documentVersions.isActive': true,
      },
    },
    {
      $project: {
        licenseNumber: 1,
        'center.name': 1,
        document: '$documentVersions',
      },
    },
    { $sort: { 'documentVersions.expiryDate': 1 } },
  ]);
};

/** التقرير التنفيذي الشامل */
rehabCenterLicenseSchema.statics.getExecutiveReport = async function () {
  const licenses = await this.find({ isActive: true, isDeleted: false });
  let totalCompliance = 0,
    totalRisk = 0,
    totalHealth = 0,
    totalSLA = 0;
  const statusDist = {};
  const concerns = [];
  const count = licenses.length;

  for (const lic of licenses) {
    totalCompliance += lic.executiveSummary?.keyMetrics?.complianceScore || 0;
    totalRisk += lic.riskScore?.score || 0;
    totalHealth += lic.healthScore?.score || 0;
    totalSLA += lic.sla?.overallCompliance || 100;
    statusDist[lic.status] = (statusDist[lic.status] || 0) + 1;
    if (lic.status === 'expired') concerns.push(`${lic.licenseNumber} - منتهي`);
    if (lic.riskScore?.level === 'critical') concerns.push(`${lic.licenseNumber} - مخاطرة حرجة`);
  }

  const avg = v => (count > 0 ? Math.round(v / count) : 0);

  return {
    totalLicenses: count,
    statusDistribution: statusDist,
    averages: {
      complianceScore: avg(totalCompliance),
      riskScore: avg(totalRisk),
      healthScore: avg(totalHealth),
      slaCompliance: avg(totalSLA),
    },
    topConcerns: concerns.slice(0, 10),
    generatedAt: new Date(),
  };
};

// ==================== Statics ====================

rehabCenterLicenseSchema.statics.findExpired = function () {
  return this.find({
    'dates.expiry': { $lt: new Date() },
    isActive: true,
    isDeleted: false,
  });
};

rehabCenterLicenseSchema.statics.findExpiringSoon = function (days = 30) {
  const today = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  return this.find({
    'dates.expiry': { $gte: today, $lte: future },
    status: { $nin: ['expired', 'revoked', 'suspended'] },
    isActive: true,
    isDeleted: false,
  });
};

rehabCenterLicenseSchema.statics.getStatistics = async function () {
  const now = new Date();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in60 = new Date();
  in60.setDate(in60.getDate() + 60);
  const in90 = new Date();
  in90.setDate(in90.getDate() + 90);

  const [stats] = await this.aggregate([
    { $match: { isActive: true, isDeleted: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
        pendingRenewal: { $sum: { $cond: [{ $eq: ['$status', 'pending_renewal'] }, 1, 0] } },
        expiringIn30: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ['$dates.expiry', now] }, { $lte: ['$dates.expiry', in30] }] },
              1,
              0,
            ],
          },
        },
        expiringIn60: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ['$dates.expiry', now] }, { $lte: ['$dates.expiry', in60] }] },
              1,
              0,
            ],
          },
        },
        expiringIn90: {
          $sum: {
            $cond: [
              { $and: [{ $gte: ['$dates.expiry', now] }, { $lte: ['$dates.expiry', in90] }] },
              1,
              0,
            ],
          },
        },
        totalCost: { $sum: '$costs.totalPaid' },
      },
    },
  ]);

  const byCategory = await this.aggregate([
    { $match: { isActive: true, isDeleted: false } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byType = await this.aggregate([
    { $match: { isActive: true, isDeleted: false } },
    { $group: { _id: '$licenseType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byStatus = await this.aggregate([
    { $match: { isActive: true, isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return {
    summary: stats || {
      total: 0,
      active: 0,
      expired: 0,
      suspended: 0,
      pendingRenewal: 0,
      expiringIn30: 0,
      expiringIn60: 0,
      expiringIn90: 0,
      totalCost: 0,
    },
    byCategory,
    byType,
    byStatus,
  };
};

/** البحث عن تراخيص عالية المخاطرة */
rehabCenterLicenseSchema.statics.findHighRisk = function (minScore = 50) {
  return this.find({
    'riskScore.score': { $gte: minScore },
    isActive: true,
    isDeleted: false,
  }).sort({ 'riskScore.score': -1 });
};

/** البحث عن التراخيص حسب المدينة */
rehabCenterLicenseSchema.statics.findByCity = function (city) {
  return this.find({
    'center.city': { $regex: city, $options: 'i' },
    isActive: true,
    isDeleted: false,
  });
};

/** إحصائيات حسب المنطقة */
rehabCenterLicenseSchema.statics.getRegionStatistics = async function () {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false } },
    {
      $group: {
        _id: { city: '$center.city', region: '$center.region' },
        count: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/** إحصائيات التجديدات */
rehabCenterLicenseSchema.statics.getRenewalStatistics = async function (year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false } },
    { $unwind: '$renewalHistory' },
    { $match: { 'renewalHistory.renewalDate': { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $month: '$renewalHistory.renewalDate' },
        count: { $sum: 1 },
        totalCost: { $sum: '$renewalHistory.renewalCost' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

/** إحصائيات الغرامات */
rehabCenterLicenseSchema.statics.getPenaltyStatistics = async function () {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'penalties.0': { $exists: true } } },
    { $unwind: '$penalties' },
    {
      $group: {
        _id: '$penalties.status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$penalties.amount' },
      },
    },
  ]);
};

/** إحصائيات المهام */
rehabCenterLicenseSchema.statics.getTaskStatistics = async function () {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'tasks.0': { $exists: true } } },
    { $unwind: '$tasks' },
    {
      $group: {
        _id: '$tasks.status',
        count: { $sum: 1 },
      },
    },
  ]);
};

/** إحصائيات الوثائق */
rehabCenterLicenseSchema.statics.getDocumentStatistics = async function () {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'documentChecklist.0': { $exists: true } } },
    { $unwind: '$documentChecklist' },
    {
      $group: {
        _id: '$documentChecklist.status',
        count: { $sum: 1 },
      },
    },
  ]);
};

/** إحصائيات الميزانية */
rehabCenterLicenseSchema.statics.getBudgetStatistics = async function (fiscalYear) {
  const match = { isActive: true, isDeleted: false };
  if (fiscalYear) match['budget.fiscalYear'] = fiscalYear;
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        totalAllocated: { $sum: '$budget.allocatedBudget' },
        totalSpent: { $sum: '$budget.spentAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalSpent: -1 } },
  ]);
};

/** الحصول على المهام المتأخرة */
rehabCenterLicenseSchema.statics.getOverdueTasks = async function () {
  const now = new Date();
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'tasks.0': { $exists: true } } },
    { $unwind: '$tasks' },
    {
      $match: {
        'tasks.status': { $in: ['pending', 'in_progress'] },
        'tasks.dueDate': { $lt: now },
      },
    },
    {
      $project: {
        licenseNumber: 1,
        'center.name': 1,
        task: '$tasks',
      },
    },
    { $sort: { 'tasks.dueDate': 1 } },
  ]);
};

/** الأحداث القادمة في التقويم */
rehabCenterLicenseSchema.statics.getUpcomingEvents = async function (days = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, 'calendarEvents.0': { $exists: true } } },
    { $unwind: '$calendarEvents' },
    {
      $match: {
        'calendarEvents.startDate': { $gte: now, $lte: futureDate },
        'calendarEvents.status': 'scheduled',
      },
    },
    {
      $project: {
        licenseNumber: 1,
        'center.name': 1,
        event: '$calendarEvents',
      },
    },
    { $sort: { 'calendarEvents.startDate': 1 } },
  ]);
};

// Pre-save: auto-update status + risk score + health score + KPIs
rehabCenterLicenseSchema.pre('save', function () {
  if (this.dates?.expiry) {
    const days = this.daysUntilExpiry;
    if (days < 0 && this.status !== 'revoked' && this.status !== 'suspended') {
      this.status = 'expired';
    } else if (days >= 0 && days <= 30 && this.status === 'active') {
      this.status = 'expiring_soon';
    }
  }
  // حساب درجة المخاطرة تلقائياً
  if (this.riskScore?.autoCalculate !== false) {
    try {
      this.calculateRiskScore();
    } catch (_) {
      /* ignore */
    }
  }
  // حساب مؤشر صحة الترخيص
  try {
    this.calculateHealthScore();
  } catch (_) {
    /* ignore */
  }
  // تقييم SLA
  try {
    this.evaluateSLA();
  } catch (_) {
    /* ignore */
  }
  // تحديث حالة المهام المتأخرة
  try {
    const now = new Date();
    (this.tasks || []).forEach(t => {
      if (t.status === 'pending' && t.dueDate && new Date(t.dueDate) < now) {
        t.status = 'overdue';
      }
    });
  } catch (_) {
    /* ignore */
  }
});

module.exports = mongoose.model('RehabCenterLicense', rehabCenterLicenseSchema);
