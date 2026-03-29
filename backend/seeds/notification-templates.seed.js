/**
 * Notification Templates Seed
 * قوالب الإشعارات والرسائل - Al-Awael ERP
 */

'use strict';

const templates = [
  // ─── مصادقة ومستخدمون ────────────────────────────────────
  {
    code: 'AUTH_WELCOME',
    name: { ar: 'رسالة ترحيب', en: 'Welcome Message' },
    channel: 'email',
    event: 'user.created',
    subject: { ar: 'مرحباً بك في منظومة الأوائل', en: 'Welcome to Al-Awael System' },
    body: {
      ar: 'مرحباً {{name}}،\n\nتم إنشاء حسابك بنجاح في منظومة مركز الأوائل للتأهيل.\n\nبيانات الدخول:\n- اسم المستخدم: {{username}}\n- كلمة المرور المؤقتة: {{password}}\n\nيرجى تغيير كلمة المرور فور الدخول الأول.\n\nمع التحية،\nفريق الأوائل',
      en: 'Hello {{name}},\n\nYour account has been successfully created in Al-Awael Rehabilitation Center system.\n\nLogin credentials:\n- Username: {{username}}\n- Temporary password: {{password}}\n\nPlease change your password upon first login.\n\nBest regards,\nAl-Awael Team',
    },
    variables: ['name', 'username', 'password'],
    isActive: true,
  },
  {
    code: 'AUTH_RESET_PASSWORD',
    name: { ar: 'إعادة تعيين كلمة المرور', en: 'Password Reset' },
    channel: 'email',
    event: 'user.password_reset',
    subject: { ar: 'إعادة تعيين كلمة المرور', en: 'Password Reset Request' },
    body: {
      ar: 'مرحباً {{name}}،\n\nطلبت إعادة تعيين كلمة مرورك. انقر على الرابط أدناه (صالح لمدة ساعة):\n\n{{resetLink}}\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة.',
      en: 'Hello {{name}},\n\nYou requested a password reset. Click the link below (valid for 1 hour):\n\n{{resetLink}}\n\nIf you did not request this, please ignore this email.',
    },
    variables: ['name', 'resetLink'],
    isActive: true,
  },
  {
    code: 'AUTH_LOGIN_ALERT',
    name: { ar: 'تنبيه دخول جديد', en: 'New Login Alert' },
    channel: 'email',
    event: 'user.login',
    subject: { ar: 'تم تسجيل الدخول إلى حسابك', en: 'New Login to Your Account' },
    body: {
      ar: 'مرحباً {{name}}،\n\nتم تسجيل الدخول إلى حسابك بتاريخ {{loginDate}} من جهاز {{device}}.\n\nإذا لم تكن أنت، تواصل مع الإدارة فوراً.',
      en: 'Hello {{name}},\n\nA login was detected on {{loginDate}} from device {{device}}.\n\nIf this was not you, contact administration immediately.',
    },
    variables: ['name', 'loginDate', 'device'],
    isActive: true,
  },

  // ─── المستفيدون ──────────────────────────────────────────
  {
    code: 'BEN_REGISTERED',
    name: { ar: 'تسجيل مستفيد جديد', en: 'New Beneficiary Registered' },
    channel: 'sms',
    event: 'beneficiary.created',
    body: {
      ar: 'عزيزي ولي الأمر، تم تسجيل {{beneficiaryName}} في مركز الأوائل للتأهيل. رقم الملف: {{fileNumber}}. للاستفسار: {{supportPhone}}',
      en: 'Dear guardian, {{beneficiaryName}} has been registered at Al-Awael Rehabilitation Center. File No: {{fileNumber}}. Inquiries: {{supportPhone}}',
    },
    variables: ['beneficiaryName', 'fileNumber', 'supportPhone'],
    isActive: true,
  },
  {
    code: 'BEN_APPOINTMENT_REMINDER',
    name: { ar: 'تذكير موعد', en: 'Appointment Reminder' },
    channel: 'sms',
    event: 'appointment.reminder',
    body: {
      ar: 'تذكير: موعد {{beneficiaryName}} غداً {{appointmentDate}} الساعة {{appointmentTime}} مع {{therapistName}} في {{location}}. مركز الأوائل {{supportPhone}}',
      en: 'Reminder: {{beneficiaryName}} appointment tomorrow {{appointmentDate}} at {{appointmentTime}} with {{therapistName}} at {{location}}. Al-Awael {{supportPhone}}',
    },
    variables: [
      'beneficiaryName',
      'appointmentDate',
      'appointmentTime',
      'therapistName',
      'location',
      'supportPhone',
    ],
    isActive: true,
  },
  {
    code: 'BEN_SESSION_COMPLETED',
    name: { ar: 'اكتمال جلسة العلاج', en: 'Therapy Session Completed' },
    channel: 'push',
    event: 'session.completed',
    subject: { ar: 'اكتملت جلسة {{beneficiaryName}}', en: '{{beneficiaryName}} Session Completed' },
    body: {
      ar: 'اكتملت جلسة {{sessionType}} للمستفيد {{beneficiaryName}} بتاريخ {{sessionDate}}. الجلسات المتبقية: {{remainingSessions}}.',
      en: '{{sessionType}} session for {{beneficiaryName}} completed on {{sessionDate}}. Remaining sessions: {{remainingSessions}}.',
    },
    variables: ['beneficiaryName', 'sessionType', 'sessionDate', 'remainingSessions'],
    isActive: true,
  },
  {
    code: 'BEN_WAITLIST_AVAILABLE',
    name: { ar: 'إشعار قائمة الانتظار', en: 'Waitlist Position Available' },
    channel: 'sms',
    event: 'waitlist.available',
    body: {
      ar: 'نبشركم بأنه أصبح بإمكاننا استقبال {{beneficiaryName}} في {{programName}}. يرجى التواصل خلال 72 ساعة: {{supportPhone}}',
      en: 'We are pleased to inform you that we can now accept {{beneficiaryName}} in {{programName}}. Please contact us within 72 hours: {{supportPhone}}',
    },
    variables: ['beneficiaryName', 'programName', 'supportPhone'],
    isActive: true,
  },
  {
    code: 'BEN_PLAN_REVIEW',
    name: { ar: 'مراجعة خطة التأهيل', en: 'Rehabilitation Plan Review Due' },
    channel: 'push',
    event: 'plan.review_due',
    subject: {
      ar: 'حان موعد مراجعة خطة {{beneficiaryName}}',
      en: 'Plan Review Due for {{beneficiaryName}}',
    },
    body: {
      ar: 'حان موعد مراجعة خطة التأهيل الفردية للمستفيد {{beneficiaryName}}. آخر مراجعة: {{lastReviewDate}}.',
      en: 'Individual rehabilitation plan review is due for {{beneficiaryName}}. Last review: {{lastReviewDate}}.',
    },
    variables: ['beneficiaryName', 'lastReviewDate'],
    isActive: true,
  },

  // ─── الموارد البشرية ─────────────────────────────────────
  {
    code: 'HR_LEAVE_APPROVED',
    name: { ar: 'اعتماد الإجازة', en: 'Leave Approved' },
    channel: 'push',
    event: 'leave.approved',
    subject: { ar: 'تمت الموافقة على طلب إجازتك', en: 'Your Leave Request Approved' },
    body: {
      ar: 'عزيزي {{employeeName}}، تمت الموافقة على طلب إجازتك من {{startDate}} إلى {{endDate}} ({{totalDays}} أيام). نوع الإجازة: {{leaveType}}.',
      en: 'Dear {{employeeName}}, your leave request from {{startDate}} to {{endDate}} ({{totalDays}} days) has been approved. Leave type: {{leaveType}}.',
    },
    variables: ['employeeName', 'startDate', 'endDate', 'totalDays', 'leaveType'],
    isActive: true,
  },
  {
    code: 'HR_LEAVE_REJECTED',
    name: { ar: 'رفض الإجازة', en: 'Leave Rejected' },
    channel: 'push',
    event: 'leave.rejected',
    subject: { ar: 'تم رفض طلب إجازتك', en: 'Your Leave Request Rejected' },
    body: {
      ar: 'عزيزي {{employeeName}}، تم رفض طلب إجازتك من {{startDate}} إلى {{endDate}}. السبب: {{reason}}. للاستفسار، تواصل مع قسم الموارد البشرية.',
      en: 'Dear {{employeeName}}, your leave request from {{startDate}} to {{endDate}} has been rejected. Reason: {{reason}}. For inquiries, contact HR department.',
    },
    variables: ['employeeName', 'startDate', 'endDate', 'reason'],
    isActive: true,
  },
  {
    code: 'HR_CONTRACT_EXPIRY',
    name: { ar: 'تنبيه انتهاء العقد', en: 'Contract Expiry Alert' },
    channel: 'email',
    event: 'employee.contract_expiring',
    subject: {
      ar: 'تنبيه: ينتهي عقد {{employeeName}} قريباً',
      en: 'Alert: {{employeeName}} Contract Expiring Soon',
    },
    body: {
      ar: 'تنبيه: ينتهي عقد الموظف {{employeeName}} ({{employeeId}}) بتاريخ {{expiryDate}} (خلال {{daysRemaining}} يوم). يرجى اتخاذ الإجراءات اللازمة.',
      en: 'Alert: Employee {{employeeName}} ({{employeeId}}) contract expires on {{expiryDate}} (in {{daysRemaining}} days). Please take necessary action.',
    },
    variables: ['employeeName', 'employeeId', 'expiryDate', 'daysRemaining'],
    isActive: true,
  },
  {
    code: 'HR_IQAMA_EXPIRY',
    name: { ar: 'تنبيه انتهاء الإقامة', en: 'Iqama Expiry Alert' },
    channel: 'email',
    event: 'employee.iqama_expiring',
    subject: {
      ar: 'تنبيه: تنتهي إقامة {{employeeName}} قريباً',
      en: 'Alert: {{employeeName}} Iqama Expiring Soon',
    },
    body: {
      ar: 'تنبيه: تنتهي إقامة الموظف {{employeeName}} بتاريخ {{expiryDate}} (خلال {{daysRemaining}} يوم). يرجى مراجعة قسم الموارد البشرية لتجديدها.',
      en: 'Alert: Employee {{employeeName}} iqama expires on {{expiryDate}} (in {{daysRemaining}} days). Please contact HR to renew.',
    },
    variables: ['employeeName', 'expiryDate', 'daysRemaining'],
    isActive: true,
  },
  {
    code: 'HR_PAYSLIP_READY',
    name: { ar: 'قسيمة الراتب جاهزة', en: 'Payslip Ready' },
    channel: 'push',
    event: 'payroll.payslip_ready',
    subject: { ar: 'قسيمة راتبك لشهر {{month}} جاهزة', en: 'Your Payslip for {{month}} is Ready' },
    body: {
      ar: 'عزيزي {{employeeName}}، قسيمة راتبك لشهر {{month}} جاهزة. صافي الراتب: {{netSalary}} ر.س. يمكنك الاطلاع عليها من خلال النظام.',
      en: 'Dear {{employeeName}}, your payslip for {{month}} is ready. Net salary: {{netSalary}} SAR. You can view it through the system.',
    },
    variables: ['employeeName', 'month', 'netSalary'],
    isActive: true,
  },

  // ─── المركبات والنقل ─────────────────────────────────────
  {
    code: 'VEHICLE_INSURANCE_EXPIRY',
    name: { ar: 'انتهاء تأمين المركبة', en: 'Vehicle Insurance Expiry' },
    channel: 'email',
    event: 'vehicle.insurance_expiring',
    subject: {
      ar: 'تنبيه: ينتهي تأمين المركبة {{plateNumber}}',
      en: 'Alert: Vehicle {{plateNumber}} Insurance Expiring',
    },
    body: {
      ar: 'تنبيه: ينتهي تأمين المركبة رقم {{plateNumber}} ({{vehicleModel}}) بتاريخ {{expiryDate}}. يرجى التجديد في أقرب وقت.',
      en: 'Alert: Vehicle {{plateNumber}} ({{vehicleModel}}) insurance expires on {{expiryDate}}. Please renew as soon as possible.',
    },
    variables: ['plateNumber', 'vehicleModel', 'expiryDate'],
    isActive: true,
  },
  {
    code: 'VEHICLE_MAINTENANCE_DUE',
    name: { ar: 'موعد صيانة المركبة', en: 'Vehicle Maintenance Due' },
    channel: 'push',
    event: 'vehicle.maintenance_due',
    subject: {
      ar: 'موعد صيانة المركبة {{plateNumber}}',
      en: 'Maintenance Due for Vehicle {{plateNumber}}',
    },
    body: {
      ar: 'حان موعد الصيانة الدورية للمركبة {{plateNumber}}. آخر صيانة: {{lastMaintenanceDate}}. يرجى جدولة الصيانة.',
      en: 'Periodic maintenance due for vehicle {{plateNumber}}. Last maintenance: {{lastMaintenanceDate}}. Please schedule maintenance.',
    },
    variables: ['plateNumber', 'lastMaintenanceDate'],
    isActive: true,
  },

  // ─── المالية ─────────────────────────────────────────────
  {
    code: 'FIN_INVOICE_CREATED',
    name: { ar: 'فاتورة جديدة', en: 'New Invoice Created' },
    channel: 'email',
    event: 'invoice.created',
    subject: {
      ar: 'فاتورة رقم {{invoiceNumber}} - مركز الأوائل',
      en: 'Invoice #{{invoiceNumber}} - Al-Awael Center',
    },
    body: {
      ar: 'عزيزي {{clientName}}،\n\nيسرنا إرسال فاتورة رقم {{invoiceNumber}} بتاريخ {{invoiceDate}}.\nالمبلغ الإجمالي: {{totalAmount}} ر.س (شامل ضريبة القيمة المضافة {{vatAmount}} ر.س).\n\nللاستفسار: {{supportEmail}}',
      en: 'Dear {{clientName}},\n\nPlease find invoice #{{invoiceNumber}} dated {{invoiceDate}}.\nTotal amount: {{totalAmount}} SAR (including VAT {{vatAmount}} SAR).\n\nInquiries: {{supportEmail}}',
    },
    variables: [
      'clientName',
      'invoiceNumber',
      'invoiceDate',
      'totalAmount',
      'vatAmount',
      'supportEmail',
    ],
    isActive: true,
  },
  {
    code: 'FIN_PAYMENT_RECEIVED',
    name: { ar: 'استلام دفعة', en: 'Payment Received' },
    channel: 'sms',
    event: 'payment.received',
    body: {
      ar: 'شكراً لك! تم استلام دفعتكم بمبلغ {{amount}} ر.س للفاتورة رقم {{invoiceNumber}}. مركز الأوائل للتأهيل',
      en: 'Thank you! We received your payment of {{amount}} SAR for invoice #{{invoiceNumber}}. Al-Awael Rehabilitation Center',
    },
    variables: ['amount', 'invoiceNumber'],
    isActive: true,
  },

  // ─── النظام ──────────────────────────────────────────────
  {
    code: 'SYS_BACKUP_SUCCESS',
    name: { ar: 'نجاح النسخ الاحتياطي', en: 'Backup Success' },
    channel: 'email',
    event: 'system.backup_completed',
    subject: { ar: 'تم إنجاز النسخة الاحتياطية بنجاح', en: 'Backup Completed Successfully' },
    body: {
      ar: 'تم إنجاز النسخة الاحتياطية للنظام بنجاح.\nالتاريخ: {{backupDate}}\nالحجم: {{backupSize}}\nالموقع: {{backupLocation}}',
      en: 'System backup completed successfully.\nDate: {{backupDate}}\nSize: {{backupSize}}\nLocation: {{backupLocation}}',
    },
    variables: ['backupDate', 'backupSize', 'backupLocation'],
    isActive: true,
  },
  {
    code: 'SYS_BACKUP_FAILED',
    name: { ar: 'فشل النسخ الاحتياطي', en: 'Backup Failed' },
    channel: 'email',
    event: 'system.backup_failed',
    subject: {
      ar: '⚠️ فشل النسخ الاحتياطي - يتطلب تدخلاً',
      en: '⚠️ Backup Failed - Requires Attention',
    },
    body: {
      ar: 'فشل النسخ الاحتياطي للنظام!\nالتاريخ: {{backupDate}}\nسبب الخطأ: {{errorMessage}}\n\nيرجى التحقق من النظام فوراً.',
      en: 'System backup has failed!\nDate: {{backupDate}}\nError: {{errorMessage}}\n\nPlease check the system immediately.',
    },
    variables: ['backupDate', 'errorMessage'],
    isActive: true,
  },
  {
    code: 'SYS_MAINTENANCE_SCHEDULED',
    name: { ar: 'صيانة مجدولة للنظام', en: 'Scheduled System Maintenance' },
    channel: 'push',
    event: 'system.maintenance_scheduled',
    subject: { ar: 'صيانة مجدولة للنظام', en: 'Scheduled System Maintenance' },
    body: {
      ar: 'تنبيه: سيكون النظام في وضع الصيانة يوم {{maintenanceDate}} من {{startTime}} إلى {{endTime}}. يرجى إنهاء أعمالكم قبل هذا الوقت.',
      en: 'Notice: System will be under maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}. Please complete your work before this time.',
    },
    variables: ['maintenanceDate', 'startTime', 'endTime'],
    isActive: true,
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('notificationtemplates');

  let upserted = 0;
  let skipped = 0;

  for (const tmpl of templates) {
    const result = await col.updateOne(
      { code: tmpl.code },
      {
        $setOnInsert: {
          ...tmpl,
          metadata: { isSystem: true },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
          name: tmpl.name,
          isActive: tmpl.isActive,
          body: tmpl.body,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) upserted++;
    else skipped++;
  }

  console.log(`  ✔ notification-templates: ${upserted} inserted, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  const result = await db
    .collection('notificationtemplates')
    .deleteMany({ 'metadata.isSystem': true });
  console.log(`  ✔ notification-templates: removed ${result.deletedCount} system templates`);
}

module.exports = { seed, down };
