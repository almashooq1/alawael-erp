/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * Email Integration Service — خدمة تكامل البريد الإلكتروني
 * ═══════════════════════════════════════════════════════════════
 *
 * Unified professional email hub connecting ALL project systems:
 *  - Authentication (2FA, password reset, email verification)
 *  - Appointments & Therapy Sessions (reminders, confirmations)
 *  - HR / Employee Affairs (leave, salary, attendance, documents)
 *  - Finance (invoices, payments, receipts)
 *  - Supply Chain (order confirmations, delivery updates)
 *  - Government Integration (document status updates)
 *  - Reports & Analytics (scheduled reports, alerts)
 *  - System Notifications (general purpose)
 *
 * Architecture:
 *  - Nodemailer primary (SMTP/Gmail)
 *  - SendGrid fallback (if configured)
 *  - MongoDB queue for retry & scheduling
 *  - Professional Arabic HTML templates with company branding
 *  - Rate limiting & tracking
 *  - WebSocket real-time notifications on send/delivery
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// 📧 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const EMAIL_CONFIG = {
  smtp: {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || '',
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    enabled: !!process.env.SENDGRID_API_KEY,
  },
  defaults: {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@alawael-erp.com',
    fromName: process.env.EMAIL_FROM_NAME || 'نظام الأوائل ERP',
    replyTo: process.env.EMAIL_REPLY_TO || '',
  },
  rateLimit: {
    maxPerMinute: 30,
    maxPerHour: 500,
    maxPerDay: 5000,
  },
  retry: {
    maxAttempts: 3,
    delayMs: 5000,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// ═══════════════════════════════════════════════════════════════
// 📧 COMPANY BRANDING
// ═══════════════════════════════════════════════════════════════

const BRAND = {
  name: 'مركز الأوائل للتأهيل',
  nameEn: 'Al-Awael Rehabilitation Center',
  logo: process.env.COMPANY_LOGO_URL || '',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  textColor: '#333333',
  bgColor: '#f8f9fa',
  footerColor: '#6c757d',
  year: new Date().getFullYear(),
};

// ═══════════════════════════════════════════════════════════════
// 📧 HTML TEMPLATE ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Professional HTML email wrapper with company branding
 */
function wrapInLayout(title, bodyHtml, options = {}) {
  const { showFooterLinks = true, preheader = '' } = options;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: ${BRAND.bgColor}; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.secondaryColor}); padding: 30px 30px 25px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; margin: 0; font-weight: 600; }
    .header .subtitle { color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 6px; }
    .body { padding: 30px; color: ${BRAND.textColor}; line-height: 1.8; font-size: 15px; }
    .body h2 { color: ${BRAND.primaryColor}; font-size: 20px; margin: 0 0 15px; }
    .body p { margin: 0 0 12px; }
    .info-card { background: ${BRAND.bgColor}; border-radius: 8px; padding: 20px; margin: 20px 0; border-right: 4px solid ${BRAND.primaryColor}; }
    .info-card .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef; }
    .info-card .row:last-child { border-bottom: none; }
    .info-card .label { color: ${BRAND.footerColor}; font-size: 13px; }
    .info-card .value { color: ${BRAND.textColor}; font-weight: 600; font-size: 14px; }
    .btn { display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, ${BRAND.primaryColor}, ${BRAND.secondaryColor}); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 15px 0; }
    .btn:hover { opacity: 0.9; }
    .btn-secondary { background: #28a745; }
    .btn-danger { background: #dc3545; }
    .btn-warning { background: #ffc107; color: ${BRAND.textColor} !important; }
    .alert { padding: 15px 20px; border-radius: 8px; margin: 15px 0; font-size: 14px; }
    .alert-info { background: #e3f2fd; color: #1565c0; border-right: 4px solid #1565c0; }
    .alert-success { background: #e8f5e9; color: #2e7d32; border-right: 4px solid #2e7d32; }
    .alert-warning { background: #fff3e0; color: #e65100; border-right: 4px solid #e65100; }
    .alert-danger { background: #ffebee; color: #c62828; border-right: 4px solid #c62828; }
    .divider { height: 1px; background: #e9ecef; margin: 25px 0; }
    .footer { background: ${BRAND.bgColor}; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { color: ${BRAND.footerColor}; font-size: 12px; margin: 4px 0; }
    .footer a { color: ${BRAND.primaryColor}; text-decoration: none; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #e8f5e9; color: #2e7d32; }
    .badge-warning { background: #fff3e0; color: #e65100; }
    .badge-danger { background: #ffebee; color: #c62828; }
    .badge-info { background: #e3f2fd; color: #1565c0; }
    table.data-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
    table.data-table th { background: ${BRAND.primaryColor}; color: #fff; padding: 10px 12px; text-align: right; }
    table.data-table td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; }
    table.data-table tr:nth-child(even) { background: ${BRAND.bgColor}; }
    @media (max-width: 600px) {
      .container { margin: 0; border-radius: 0; }
      .body { padding: 20px; }
      .header { padding: 20px; }
    }
  </style>
</head>
<body style="margin:0;padding:20px 10px;background:${BRAND.bgColor};">
  ${preheader ? `<div style="display:none;font-size:1px;color:${BRAND.bgColor};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="container">
    <div class="header">
      ${BRAND.logo ? `<img src="${BRAND.logo}" alt="${BRAND.name}" style="max-height:50px;margin-bottom:10px;">` : ''}
      <h1>${BRAND.name}</h1>
      <div class="subtitle">${BRAND.nameEn}</div>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      ${showFooterLinks ? `<p><a href="${EMAIL_CONFIG.frontendUrl}">الموقع الإلكتروني</a> | <a href="${EMAIL_CONFIG.frontendUrl}/support">الدعم الفني</a></p>` : ''}
      <p>© ${BRAND.year} ${BRAND.name}. جميع الحقوق محفوظة.</p>
      <p style="font-size:11px;color:#aaa;">هذه رسالة آلية. في حال عدم الرغبة بالاستلام، تواصل مع الدعم الفني.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build info card HTML from key-value pairs
 */
function buildInfoCard(items) {
  const rows = items
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([label, value]) =>
        `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`
    )
    .join('');
  return `<div class="info-card">${rows}</div>`;
}

/**
 * Build CTA button
 */
function buildButton(text, url, type = 'primary') {
  const cls = type === 'primary' ? 'btn' : `btn btn-${type}`;
  return `<div style="text-align:center;"><a href="${url}" class="${cls}">${text}</a></div>`;
}

// ═══════════════════════════════════════════════════════════════
// 📧 EMAIL TEMPLATES (Arabic Professional)
// ═══════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES = {
  // ── Authentication ─────────────────────────────────────────

  WELCOME: user => ({
    subject: `مرحباً بك في ${BRAND.name} - ${user.name || user.fullName || 'مستخدم جديد'}`,
    html: wrapInLayout(
      'ترحيب',
      `
      <h2>مرحباً بك! 👋</h2>
      <p>عزيزي/عزيزتي <strong>${user.name || user.fullName}</strong>،</p>
      <p>يسعدنا انضمامك إلى ${BRAND.name}. تم إنشاء حسابك بنجاح في نظام إدارة المركز.</p>
      ${buildInfoCard([
        ['البريد الإلكتروني', user.email],
        ['الدور', user.role || 'مستخدم'],
        ['تاريخ التسجيل', new Date().toLocaleDateString('ar-SA')],
      ])}
      <p>يمكنك الآن تسجيل الدخول والبدء في استخدام النظام:</p>
      ${buildButton('تسجيل الدخول', `${EMAIL_CONFIG.frontendUrl}/login`)}
      <div class="alert alert-info">💡 ننصح بتفعيل المصادقة الثنائية (2FA) لتعزيز أمان حسابك.</div>
    `,
      { preheader: `مرحباً ${user.name || user.fullName} - تم إنشاء حسابك بنجاح` }
    ),
  }),

  PASSWORD_RESET: (user, resetToken) => ({
    subject: 'إعادة تعيين كلمة المرور — نظام الأوائل',
    html: wrapInLayout(
      'إعادة تعيين كلمة المرور',
      `
      <h2>إعادة تعيين كلمة المرور 🔑</h2>
      <p>مرحباً <strong>${user.name || user.fullName || user.username || ''}</strong>،</p>
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط على الزر أدناه:</p>
      ${buildButton('إعادة تعيين كلمة المرور', `${EMAIL_CONFIG.frontendUrl}/reset-password/${resetToken}`)}
      <div class="alert alert-warning">⚠️ هذا الرابط صالح لمدة <strong>ساعة واحدة</strong> فقط.</div>
      <p style="font-size:13px;color:${BRAND.footerColor};">إذا لم تطلب هذا الإجراء، تجاهل هذا البريد. حسابك آمن.</p>
    `,
      { preheader: 'تعليمات إعادة تعيين كلمة المرور' }
    ),
  }),

  EMAIL_VERIFICATION: (user, verificationToken) => ({
    subject: 'تأكيد بريدك الإلكتروني — نظام الأوائل',
    html: wrapInLayout(
      'تأكيد البريد',
      `
      <h2>تأكيد البريد الإلكتروني ✉️</h2>
      <p>مرحباً <strong>${user.name || user.fullName || ''}</strong>،</p>
      <p>لإكمال تسجيلك، يرجى تأكيد بريدك الإلكتروني بالضغط على الزر أدناه:</p>
      ${buildButton('تأكيد البريد الإلكتروني', `${EMAIL_CONFIG.frontendUrl}/verify-email/${verificationToken}`, 'secondary')}
    `,
      { preheader: 'أكد بريدك الإلكتروني لإكمال التسجيل' }
    ),
  }),

  OTP_CODE: (user, otp, expiry = 5) => ({
    subject: `رمز التحقق: ${otp}`,
    html: wrapInLayout(
      'رمز التحقق',
      `
      <h2>رمز التحقق 🔐</h2>
      <p>مرحباً <strong>${user.name || user.username || ''}</strong>،</p>
      <p>رمز التحقق الخاص بك هو:</p>
      <div style="text-align:center;margin:25px 0;">
        <div style="display:inline-block;background:${BRAND.bgColor};border:2px dashed ${BRAND.primaryColor};border-radius:12px;padding:20px 40px;">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:${BRAND.primaryColor};">${otp}</span>
        </div>
      </div>
      <div class="alert alert-warning">⏱️ هذا الرمز صالح لمدة <strong>${expiry} دقائق</strong>. لا تشاركه مع أي شخص.</div>
    `,
      { preheader: `رمز التحقق: ${otp}` }
    ),
  }),

  TWO_FA_ENABLED: (email, username) => ({
    subject: 'تم تفعيل المصادقة الثنائية — نظام الأوائل',
    html: wrapInLayout(
      'المصادقة الثنائية',
      `
      <h2>تم تفعيل المصادقة الثنائية ✅</h2>
      <p>مرحباً <strong>${username || email}</strong>،</p>
      <p>تم تفعيل المصادقة الثنائية (2FA) على حسابك بنجاح.</p>
      <div class="alert alert-success">🛡️ حسابك الآن محمي بطبقة أمان إضافية. ستحتاج لإدخال رمز التحقق عند كل تسجيل دخول.</div>
      ${buildInfoCard([
        ['الحساب', email],
        ['الحالة', 'مفعّل ✅'],
        ['التاريخ', new Date().toLocaleDateString('ar-SA')],
      ])}
      <p style="font-size:13px;color:${BRAND.footerColor};">إذا لم تقم بهذا الإجراء، يرجى التواصل مع الدعم الفني فوراً.</p>
    `
    ),
  }),

  TWO_FA_DISABLED: (email, username) => ({
    subject: 'تم إلغاء المصادقة الثنائية — نظام الأوائل',
    html: wrapInLayout(
      'المصادقة الثنائية',
      `
      <h2>تم إلغاء المصادقة الثنائية ⚠️</h2>
      <p>مرحباً <strong>${username || email}</strong>،</p>
      <p>تم إلغاء تفعيل المصادقة الثنائية (2FA) على حسابك.</p>
      <div class="alert alert-warning">⚠️ حسابك الآن أقل أماناً. ننصح بإعادة تفعيل المصادقة الثنائية.</div>
      ${buildButton('إعادة تفعيل 2FA', `${EMAIL_CONFIG.frontendUrl}/settings/security`)}
    `
    ),
  }),

  // ── Appointments & Therapy ─────────────────────────────────

  APPOINTMENT_REMINDER: appointment => ({
    subject: `تذكير بموعد: ${appointment.type || 'جلسة علاجية'} — ${_formatDate(appointment.date)}`,
    html: wrapInLayout(
      'تذكير بموعد',
      `
      <h2>تذكير بموعدك القادم 📅</h2>
      <p>عزيزي/عزيزتي <strong>${appointment.patientName || appointment.beneficiaryName || ''}</strong>،</p>
      <p>نذكّرك بموعدك القادم في ${BRAND.name}:</p>
      ${buildInfoCard([
        ['نوع الموعد', appointment.type || appointment.sessionType || 'جلسة علاجية'],
        ['التاريخ', _formatDate(appointment.date)],
        ['الوقت', appointment.startTime || _formatTime(appointment.time)],
        ['المعالج', appointment.therapistName || appointment.doctorName || ''],
        ['المكان', appointment.location || appointment.room || 'المركز الرئيسي'],
      ])}
      <div class="alert alert-info">📌 يرجى الحضور قبل الموعد بـ 15 دقيقة. في حالة عدم القدرة على الحضور، يرجى الإلغاء مسبقاً.</div>
      ${buildButton('عرض تفاصيل الموعد', `${EMAIL_CONFIG.frontendUrl}/appointments`)}
    `,
      { preheader: `تذكير: موعدك يوم ${_formatDate(appointment.date)}` }
    ),
  }),

  APPOINTMENT_CONFIRMATION: appointment => ({
    subject: `تأكيد الموعد — ${_formatDate(appointment.date)}`,
    html: wrapInLayout(
      'تأكيد موعد',
      `
      <h2>تم تأكيد موعدك ✅</h2>
      <p>عزيزي/عزيزتي <strong>${appointment.patientName || appointment.beneficiaryName || ''}</strong>،</p>
      <p>تم تأكيد موعدك بنجاح:</p>
      ${buildInfoCard([
        ['نوع الموعد', appointment.type || 'جلسة علاجية'],
        ['التاريخ', _formatDate(appointment.date)],
        ['الوقت', appointment.startTime || _formatTime(appointment.time)],
        ['المعالج', appointment.therapistName || appointment.doctorName || ''],
        ['الحالة', '<span class="badge badge-success">مؤكد</span>'],
      ])}
    `
    ),
  }),

  APPOINTMENT_CANCELLATION: (appointment, reason) => ({
    subject: 'إلغاء موعد — نظام الأوائل',
    html: wrapInLayout(
      'إلغاء موعد',
      `
      <h2>تم إلغاء الموعد ❌</h2>
      <p>عزيزي/عزيزتي <strong>${appointment.patientName || appointment.beneficiaryName || ''}</strong>،</p>
      <p>نأسف لإبلاغك بأنه تم إلغاء موعدك:</p>
      ${buildInfoCard([
        ['التاريخ الأصلي', _formatDate(appointment.date)],
        ['المعالج', appointment.therapistName || appointment.doctorName || ''],
        ['سبب الإلغاء', reason || 'غير محدد'],
      ])}
      <p>لحجز موعد جديد:</p>
      ${buildButton('حجز موعد جديد', `${EMAIL_CONFIG.frontendUrl}/appointments/new`)}
    `
    ),
  }),

  SESSION_SUMMARY: (session, guardian) => ({
    subject: `ملخص الجلسة العلاجية — ${_formatDate(session.date)}`,
    html: wrapInLayout(
      'ملخص جلسة',
      `
      <h2>ملخص الجلسة العلاجية 📋</h2>
      <p>عزيزي/عزيزتي <strong>${guardian?.name || 'ولي الأمر'}</strong>،</p>
      <p>نرفق لكم ملخص الجلسة العلاجية للمستفيد <strong>${session.beneficiaryName || session.patientName || ''}</strong>:</p>
      ${buildInfoCard([
        ['التاريخ', _formatDate(session.date)],
        ['نوع الجلسة', session.sessionType || session.type || ''],
        ['المعالج', session.therapistName || ''],
        ['المدة', session.duration ? `${session.duration} دقيقة` : ''],
        ['الحالة', session.status || 'مكتملة'],
      ])}
      ${session.notes ? `<div class="info-card"><p style="margin:0;"><strong>ملاحظات المعالج:</strong></p><p style="margin:8px 0 0;">${session.notes}</p></div>` : ''}
      ${session.recommendations ? `<div class="alert alert-info">📝 <strong>التوصيات:</strong> ${session.recommendations}</div>` : ''}
      ${buildButton('عرض التفاصيل الكاملة', `${EMAIL_CONFIG.frontendUrl}/sessions`)}
    `,
      { preheader: `ملخص جلسة ${_formatDate(session.date)}` }
    ),
  }),

  // ── HR / Employee Affairs ──────────────────────────────────

  LEAVE_REQUEST: (employee, leave) => ({
    subject: `طلب إجازة: ${employee.name || employee.firstName || ''} — ${leave.type || leave.leaveType || ''}`,
    html: wrapInLayout(
      'طلب إجازة',
      `
      <h2>طلب إجازة جديد 🏖️</h2>
      <p>تم تقديم طلب إجازة جديد:</p>
      ${buildInfoCard([
        ['الموظف', employee.name || `${employee.firstName} ${employee.lastName}`],
        ['نوع الإجازة', leave.type || leave.leaveType || ''],
        ['من', _formatDate(leave.startDate)],
        ['إلى', _formatDate(leave.endDate)],
        ['المدة', leave.duration ? `${leave.duration} يوم` : ''],
        ['السبب', leave.reason || ''],
      ])}
      ${leave.approvalLink ? buildButton('مراجعة الطلب', leave.approvalLink) : buildButton('مراجعة الطلب', `${EMAIL_CONFIG.frontendUrl}/hr/leaves`)}
    `,
      { preheader: `طلب إجازة من ${employee.name || employee.firstName}` }
    ),
  }),

  LEAVE_STATUS_UPDATE: (employee, leave) => ({
    subject: `تحديث حالة الإجازة: ${leave.status === 'approved' || leave.status === 'مقبولة' ? 'مقبولة ✅' : 'مرفوضة ❌'}`,
    html: wrapInLayout(
      'تحديث إجازة',
      `
      <h2>تحديث حالة طلب الإجازة</h2>
      <p>عزيزي/عزيزتي <strong>${employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`}</strong>،</p>
      <p>تم تحديث حالة طلب إجازتك:</p>
      ${buildInfoCard([
        ['نوع الإجازة', leave.type || leave.leaveType || ''],
        ['من', _formatDate(leave.startDate)],
        ['إلى', _formatDate(leave.endDate)],
        ['الحالة', _leaveStatusBadge(leave.status)],
        ['ملاحظات', leave.reviewNotes || leave.reason || ''],
      ])}
    `
    ),
  }),

  SALARY_NOTIFICATION: (employee, salary) => ({
    subject: `إشعار الراتب — ${salary.month || _getCurrentMonth()}`,
    html: wrapInLayout(
      'إشعار الراتب',
      `
      <h2>إشعار صرف الراتب 💰</h2>
      <p>عزيزي/عزيزتي <strong>${employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`}</strong>،</p>
      <p>نعلمك بأنه تم صرف راتبك عن شهر <strong>${salary.month || _getCurrentMonth()}</strong>.</p>
      ${buildInfoCard([
        ['الراتب الأساسي', salary.base ? `${salary.base} ر.س` : ''],
        ['البدلات', salary.allowances ? `${salary.allowances} ر.س` : ''],
        ['الخصومات', salary.deductions ? `${salary.deductions} ر.س` : ''],
        [
          'صافي الراتب',
          salary.net || salary.amount ? `<strong>${salary.net || salary.amount} ر.س</strong>` : '',
        ],
      ])}
      <div class="alert alert-success">✅ تم تحويل المبلغ إلى حسابك البنكي المسجل لدينا.</div>
      ${buildButton('عرض كشف الراتب', `${EMAIL_CONFIG.frontendUrl}/hr/payslip`)}
    `,
      { preheader: `تم صرف راتبك عن شهر ${salary.month || _getCurrentMonth()}` }
    ),
  }),

  ATTENDANCE_ALERT: (employee, alert) => ({
    subject: `تنبيه حضور: ${employee.name || ''}`,
    html: wrapInLayout(
      'تنبيه حضور',
      `
      <h2>تنبيه حضور ⏰</h2>
      <p>عزيزي/عزيزتي <strong>${employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`}</strong>،</p>
      <div class="alert alert-${alert.type === 'absence' ? 'danger' : 'warning'}">
        ${alert.type === 'absence' ? '❌' : '⚠️'} ${alert.message || `تم تسجيل ${alert.type === 'absence' ? 'غياب' : 'تأخير'} بتاريخ ${_formatDate(alert.date)}`}
      </div>
      ${buildInfoCard([
        ['التاريخ', _formatDate(alert.date)],
        ['النوع', alert.type === 'absence' ? 'غياب' : alert.type === 'late' ? 'تأخير' : alert.type],
        ['الوقت المسجل', alert.checkInTime || ''],
        ['ملاحظات', alert.notes || ''],
      ])}
    `
    ),
  }),

  DOCUMENT_READY: (user, doc) => ({
    subject: `مستند جاهز: ${doc.name || doc.documentName || doc.type || 'مستند'}`,
    html: wrapInLayout(
      'مستند جاهز',
      `
      <h2>مستندك جاهز 📄</h2>
      <p>عزيزي/عزيزتي <strong>${user.name || ''}</strong>،</p>
      <p>نود إبلاغك بأن المستند التالي أصبح جاهزاً:</p>
      ${buildInfoCard([
        ['اسم المستند', doc.name || doc.documentName || ''],
        ['النوع', doc.type || doc.documentType || ''],
        ['التاريخ', _formatDate(doc.date || new Date())],
      ])}
      ${doc.downloadLink ? buildButton('تحميل المستند', doc.downloadLink, 'secondary') : buildButton('عرض المستندات', `${EMAIL_CONFIG.frontendUrl}/documents`)}
    `
    ),
  }),

  // ── Finance ────────────────────────────────────────────────

  INVOICE: (invoice, customer) => ({
    subject: `فاتورة رقم ${invoice.number || invoice.invoiceNumber || ''} — ${BRAND.name}`,
    html: wrapInLayout(
      'فاتورة',
      `
      <h2>فاتورة ضريبية 🧾</h2>
      <p>عزيزي/عزيزتي <strong>${customer?.name || invoice.customerName || ''}</strong>،</p>
      <p>مرفق فاتورتكم من ${BRAND.name}:</p>
      ${buildInfoCard([
        ['رقم الفاتورة', invoice.number || invoice.invoiceNumber || ''],
        ['التاريخ', _formatDate(invoice.date || invoice.invoiceDate)],
        ['تاريخ الاستحقاق', _formatDate(invoice.dueDate)],
        [
          'المبلغ الإجمالي',
          `<strong>${invoice.amount || invoice.total || invoice.totalAmount || 0} ر.س</strong>`,
        ],
        ['الحالة', invoice.status || 'معلقة'],
      ])}
      ${invoice.items && invoice.items.length ? _buildInvoiceItemsTable(invoice.items) : ''}
      <div class="alert alert-info">💳 يرجى السداد قبل تاريخ الاستحقاق المحدد أعلاه.</div>
      ${buildButton('سداد الفاتورة', `${EMAIL_CONFIG.frontendUrl}/finance/invoices`)}
    `,
      {
        preheader: `فاتورة رقم ${invoice.number || invoice.invoiceNumber} — ${invoice.amount || invoice.total} ر.س`,
      }
    ),
  }),

  PAYMENT_CONFIRMATION: payment => ({
    subject: `تأكيد الدفع — ${payment.amount || ''} ر.س`,
    html: wrapInLayout(
      'تأكيد دفع',
      `
      <h2>تم استلام الدفعة ✅</h2>
      <p>عزيزي/عزيزتي <strong>${payment.customerName || payment.name || ''}</strong>،</p>
      <p>تم استلام دفعتك بنجاح. شكراً لك!</p>
      ${buildInfoCard([
        ['رقم العملية', payment.transactionId || payment.receiptNumber || ''],
        ['المبلغ', `<strong>${payment.amount} ر.س</strong>`],
        ['طريقة الدفع', payment.method || ''],
        ['التاريخ', _formatDate(payment.date || new Date())],
        ['رقم الفاتورة', payment.invoiceNumber || ''],
      ])}
      <div class="alert alert-success">✅ تم تسجيل الدفعة وتحديث حسابك.</div>
    `
    ),
  }),

  PAYMENT_REMINDER: invoice => ({
    subject: `تذكير بالسداد — فاتورة رقم ${invoice.number || invoice.invoiceNumber || ''}`,
    html: wrapInLayout(
      'تذكير سداد',
      `
      <h2>تذكير بالسداد 🔔</h2>
      <p>عزيزي/عزيزتي <strong>${invoice.customerName || ''}</strong>،</p>
      <p>نود تذكيرك بأن الفاتورة التالية لم يتم سدادها بعد:</p>
      ${buildInfoCard([
        ['رقم الفاتورة', invoice.number || invoice.invoiceNumber || ''],
        ['المبلغ المستحق', `<strong>${invoice.amount || invoice.totalAmount || 0} ر.س</strong>`],
        ['تاريخ الاستحقاق', _formatDate(invoice.dueDate)],
        ['أيام التأخير', invoice.overdueDays ? `${invoice.overdueDays} يوم` : ''],
      ])}
      <div class="alert alert-danger">⚠️ يرجى السداد في أقرب وقت لتجنب الرسوم الإضافية.</div>
      ${buildButton('سداد الآن', `${EMAIL_CONFIG.frontendUrl}/finance/pay`)}
    `,
      {
        preheader: `تذكير: فاتورة رقم ${invoice.number || invoice.invoiceNumber} — ${invoice.amount} ر.س`,
      }
    ),
  }),

  // ── Supply Chain ───────────────────────────────────────────

  ORDER_CONFIRMATION: order => ({
    subject: `تأكيد الطلب رقم ${order.orderId || order.orderNumber || order._id || ''}`,
    html: wrapInLayout(
      'تأكيد طلب',
      `
      <h2>تم تأكيد طلبك ✅</h2>
      <p>تم تأكيد طلبك بنجاح:</p>
      ${buildInfoCard([
        ['رقم الطلب', order.orderId || order.orderNumber || ''],
        ['التاريخ', _formatDate(order.date || new Date())],
        ['المبلغ الإجمالي', order.totalAmount ? `${order.totalAmount} ر.س` : ''],
        ['التسليم المتوقع', _formatDate(order.deliveryDate || order.expectedDate)],
        ['الحالة', '<span class="badge badge-success">مؤكد</span>'],
      ])}
      ${order.items && order.items.length ? _buildOrderItemsTable(order.items) : ''}
      ${buildButton('تتبع الطلب', `${EMAIL_CONFIG.frontendUrl}/orders/${order.orderId || order._id || ''}`)}
    `
    ),
  }),

  ORDER_STATUS_UPDATE: order => {
    const statusMap = {
      processing: { text: 'قيد المعالجة', badge: 'info', icon: '🔄' },
      shipped: { text: 'تم الشحن', badge: 'info', icon: '🚚' },
      delivered: { text: 'تم التسليم', badge: 'success', icon: '✅' },
      cancelled: { text: 'ملغي', badge: 'danger', icon: '❌' },
    };
    const s = statusMap[order.status] || {
      text: order.status || 'محدث',
      badge: 'info',
      icon: '📦',
    };

    return {
      subject: `تحديث الطلب رقم ${order.orderId || order.orderNumber || ''} — ${s.text}`,
      html: wrapInLayout(
        'تحديث طلب',
        `
        <h2>${s.icon} تحديث حالة الطلب</h2>
        <p>تم تحديث حالة طلبك:</p>
        ${buildInfoCard([
          ['رقم الطلب', order.orderId || order.orderNumber || ''],
          ['الحالة الجديدة', `<span class="badge badge-${s.badge}">${s.text}</span>`],
          ['التاريخ', _formatDate(new Date())],
          ['ملاحظات', order.notes || ''],
        ])}
        ${buildButton('عرض تفاصيل الطلب', `${EMAIL_CONFIG.frontendUrl}/orders/${order.orderId || order._id || ''}`)}
      `
      ),
    };
  },

  // ── Government Integration ─────────────────────────────────

  GOV_DOCUMENT_UPDATE: (user, doc) => {
    const statusMap = {
      submitted: { text: 'تم التقديم', badge: 'info', icon: '📤' },
      under_review: { text: 'قيد المراجعة', badge: 'warning', icon: '🔍' },
      approved: { text: 'معتمد', badge: 'success', icon: '✅' },
      rejected: { text: 'مرفوض', badge: 'danger', icon: '❌' },
      completed: { text: 'مكتمل', badge: 'success', icon: '🏁' },
    };
    const s = statusMap[doc.status] || { text: doc.status || 'محدث', badge: 'info', icon: '📄' };

    return {
      subject: `تحديث المعاملة الحكومية: ${doc.name || doc.documentName || ''} — ${s.text}`,
      html: wrapInLayout(
        'معاملة حكومية',
        `
        <h2>${s.icon} تحديث المعاملة الحكومية</h2>
        <p>عزيزي/عزيزتي <strong>${user.name || ''}</strong>،</p>
        <p>تم تحديث حالة معاملتك الحكومية:</p>
        ${buildInfoCard([
          ['اسم المعاملة', doc.name || doc.documentName || ''],
          ['الجهة', doc.authority || doc.entity || ''],
          ['الحالة', `<span class="badge badge-${s.badge}">${s.text}</span>`],
          ['رقم المرجع', doc.referenceNumber || ''],
          ['التاريخ', _formatDate(new Date())],
        ])}
        ${doc.notes ? `<div class="alert alert-info">📝 ${doc.notes}</div>` : ''}
      `
      ),
    };
  },

  // ── Reports & Analytics ────────────────────────────────────

  REPORT_READY: report => ({
    subject: `التقرير جاهز: ${report.title || report.name || ''}`,
    html: wrapInLayout(
      'تقرير',
      `
      <h2>تقريرك جاهز 📊</h2>
      <p>تم إنشاء التقرير التالي بنجاح:</p>
      ${buildInfoCard([
        ['اسم التقرير', report.title || report.name || ''],
        ['الفترة', report.period || ''],
        ['تاريخ الإنشاء', _formatDate(report.date || new Date())],
        ['النوع', report.type || ''],
      ])}
      ${report.summary ? `<div class="info-card"><p style="margin:0;"><strong>الملخص:</strong></p><p style="margin:8px 0 0;">${report.summary}</p></div>` : ''}
      ${report.downloadLink ? buildButton('تحميل التقرير', report.downloadLink, 'secondary') : buildButton('عرض التقرير', `${EMAIL_CONFIG.frontendUrl}/reports`)}
    `,
      { preheader: `التقرير ${report.title || report.name} جاهز` }
    ),
  }),

  ALERT_NOTIFICATION: alert => ({
    subject: `${alert.severity === 'critical' ? '🚨' : '⚠️'} تنبيه: ${alert.title || alert.type || ''}`,
    html: wrapInLayout(
      'تنبيه',
      `
      <h2>${alert.severity === 'critical' ? '🚨 تنبيه حرج' : '⚠️ تنبيه'}</h2>
      <div class="alert alert-${alert.severity === 'critical' ? 'danger' : 'warning'}">
        <strong>${alert.title || alert.type || 'تنبيه النظام'}</strong><br>
        ${alert.message || ''}
      </div>
      ${buildInfoCard([
        [
          'الأولوية',
          alert.severity === 'critical'
            ? '<span class="badge badge-danger">حرج</span>'
            : '<span class="badge badge-warning">تحذير</span>',
        ],
        ['الوقت', new Date().toLocaleString('ar-SA')],
        ['المصدر', alert.source || 'النظام'],
      ])}
      ${alert.actionUrl ? buildButton('عرض التفاصيل', alert.actionUrl) : ''}
    `
    ),
  }),

  // ── General Notification ──────────────────────────────────

  NOTIFICATION: notification => ({
    subject: notification.subject || notification.title || 'إشعار من نظام الأوائل',
    html: wrapInLayout(
      'إشعار',
      `
      <h2>${notification.title || 'إشعار'}</h2>
      <p>${notification.message || notification.body || ''}</p>
      ${notification.details ? `<div class="info-card">${notification.details}</div>` : ''}
      ${notification.actionUrl ? buildButton(notification.actionText || 'عرض المزيد', notification.actionUrl) : ''}
    `,
      { preheader: notification.message ? notification.message.substring(0, 100) : '' }
    ),
  }),
};

// ═══════════════════════════════════════════════════════════════
// 📧 EMAIL INTEGRATION SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class EmailIntegrationService {
  constructor() {
    this.transporter = null;
    this.QueueModel = null;
    this.wsManager = null;
    this.rateLimits = { minute: [], hour: [], day: [] };
    this.initialized = false;
    this.provider = 'smtp';
    this.stats = { sent: 0, failed: 0, queued: 0 };
  }

  /**
   * Initialize the service with DB connection and WebSocket
   */
  async initialize(connection, wsManager) {
    try {
      // Setup transporter
      this._createTransporter();

      // Setup WebSocket
      if (wsManager) {
        this.wsManager = wsManager;
      }

      // Setup Queue model if DB connection available
      if (connection) {
        const mongoose = require('mongoose');
        const QueueSchema = new mongoose.Schema({
          type: { type: String, required: true },
          to: { type: String, required: true },
          subject: String,
          html: String,
          text: String,
          template: String,
          variables: mongoose.Schema.Types.Mixed,
          attachments: [mongoose.Schema.Types.Mixed],
          status: {
            type: String,
            enum: ['pending', 'processing', 'sent', 'failed'],
            default: 'pending',
          },
          priority: { type: Number, default: 5, min: 1, max: 10 },
          scheduledFor: Date,
          attempts: { type: Number, default: 0 },
          maxAttempts: { type: Number, default: EMAIL_CONFIG.retry.maxAttempts },
          lastError: String,
          metadata: mongoose.Schema.Types.Mixed,
          createdAt: { type: Date, default: Date.now },
          sentAt: Date,
        });
        QueueSchema.index({ status: 1, scheduledFor: 1, priority: -1 });

        this.QueueModel =
          connection.models.EmailQueue || connection.model('EmailQueue', QueueSchema);
      }

      this.initialized = true;
      logger.info(`[EmailIntegration] Initialized (provider: ${this.provider})`);
    } catch (error) {
      logger.error('[EmailIntegration] Initialization error:', error.message);
    }
  }

  /**
   * Create nodemailer transporter
   */
  _createTransporter() {
    // Check SendGrid first
    if (EMAIL_CONFIG.sendgrid.enabled && EMAIL_CONFIG.sendgrid.apiKey) {
      try {
        const sgTransport = require('nodemailer-sendgrid');
        this.transporter = nodemailer.createTransport(
          sgTransport({ apiKey: EMAIL_CONFIG.sendgrid.apiKey })
        );
        this.provider = 'sendgrid';
        return;
      } catch (e) {
        logger.warn('[EmailIntegration] SendGrid transport not available, falling back to SMTP');
      }
    }

    // SMTP default
    if (EMAIL_CONFIG.smtp.auth.user && EMAIL_CONFIG.smtp.auth.pass) {
      this.transporter = nodemailer.createTransport(EMAIL_CONFIG.smtp);
      this.provider = 'smtp';
    } else {
      // Dev mode — create test account or stub
      logger.warn('[EmailIntegration] No email credentials configured — running in mock mode');
      this.provider = 'mock';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📧 CORE SEND METHOD
  // ═══════════════════════════════════════════════════════════

  /**
   * Send an email with tracking and retry
   */
  async send(options) {
    const {
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      template,
      variables,
      attachments,
      metadata = {},
      priority = 5,
    } = options;

    if (!to) return { success: false, error: 'NO_RECIPIENT' };

    // Rate limit check
    if (!this._checkRateLimit()) {
      return this.enqueue({
        to,
        subject,
        html,
        text,
        template,
        variables,
        attachments,
        metadata,
        priority,
      });
    }

    // Build mail options
    const mailOptions = {
      from: `"${EMAIL_CONFIG.defaults.fromName}" <${EMAIL_CONFIG.defaults.from}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || _stripHtml(html || ''),
    };

    if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
    if (attachments) mailOptions.attachments = attachments;
    if (EMAIL_CONFIG.defaults.replyTo) mailOptions.replyTo = EMAIL_CONFIG.defaults.replyTo;

    // Apply template
    if (template && EMAIL_TEMPLATES[template]) {
      const rendered =
        typeof EMAIL_TEMPLATES[template] === 'function'
          ? EMAIL_TEMPLATES[template](variables || {})
          : EMAIL_TEMPLATES[template];
      mailOptions.subject = mailOptions.subject || rendered.subject;
      mailOptions.html = rendered.html;
      mailOptions.text = mailOptions.text || _stripHtml(rendered.html);
    }

    // Send
    try {
      let result;

      if (this.provider === 'mock' || !this.transporter) {
        // Mock mode for dev/test
        result = { messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 8)}` };
        logger.info(`[EmailIntegration] Mock email to ${to}: ${mailOptions.subject}`);
      } else {
        result = await this.transporter.sendMail(mailOptions);
      }

      this.stats.sent++;
      this._trackRateLimit();

      // WebSocket notification
      this._emitRealtime('email:sent', {
        to,
        subject: mailOptions.subject,
        messageId: result.messageId,
        provider: this.provider,
      });

      logger.info(
        `[EmailIntegration] Email sent to ${to} via ${this.provider} — ${result.messageId}`
      );

      return {
        success: true,
        messageId: result.messageId,
        provider: this.provider,
      };
    } catch (error) {
      this.stats.failed++;
      logger.error(`[EmailIntegration] Failed to send to ${to}: ${error.message}`);

      // Auto-queue for retry
      if (metadata.autoRetry !== false) {
        return this.enqueue({
          to,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text,
          attachments,
          metadata,
          priority,
        });
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send using a predefined template
   */
  async sendTemplate(to, templateName, data, options = {}) {
    if (!to) return { success: false, error: 'NO_RECIPIENT' };

    const templateFn = EMAIL_TEMPLATES[templateName];
    if (!templateFn) return { success: false, error: `TEMPLATE_NOT_FOUND: ${templateName}` };

    const rendered = typeof templateFn === 'function' ? templateFn(data) : templateFn;

    return this.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      metadata: { template: templateName, ...options.metadata },
      ...options,
    });
  }

  /**
   * Send bulk emails
   */
  async sendBulk(recipients, templateOrOptions) {
    const results = [];

    for (const recipient of recipients) {
      const email = typeof recipient === 'string' ? recipient : recipient.email || recipient.to;
      if (!email) {
        results.push({ email: 'unknown', success: false, error: 'NO_EMAIL' });
        continue;
      }

      try {
        let result;
        if (typeof templateOrOptions === 'string') {
          // Template name
          result = await this.sendTemplate(email, templateOrOptions, recipient);
        } else {
          // Options object
          result = await this.send({
            to: email,
            ...templateOrOptions,
            variables: { ...templateOrOptions.variables, ...recipient.variables },
          });
        }
        results.push({ email, ...result });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    return {
      total: recipients.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 📧 SYSTEM-SPECIFIC METHODS
  // ═══════════════════════════════════════════════════════════

  // ── Authentication ─────────────────────────────────────────

  async sendWelcomeEmail(user) {
    return this.sendTemplate(user.email, 'WELCOME', user);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const rendered = EMAIL_TEMPLATES.PASSWORD_RESET(user, resetToken);
    return this.send({
      to: user.email,
      ...rendered,
      metadata: { type: 'password-reset', userId: user.id || user._id },
    });
  }

  async sendEmailVerification(user, verificationToken) {
    const rendered = EMAIL_TEMPLATES.EMAIL_VERIFICATION(user, verificationToken);
    return this.send({
      to: user.email,
      ...rendered,
      metadata: { type: 'email-verification', userId: user.id || user._id },
    });
  }

  async sendOTPEmail(user, otp, expiry = 5) {
    const rendered = EMAIL_TEMPLATES.OTP_CODE(user, otp, expiry);
    return this.send({ to: user.email, ...rendered, priority: 10, metadata: { type: 'otp' } });
  }

  async send2FAEnabledEmail(email, username) {
    const rendered = EMAIL_TEMPLATES.TWO_FA_ENABLED(email, username);
    return this.send({ to: email, ...rendered, metadata: { type: '2fa-enabled' } });
  }

  async send2FADisabledEmail(email, username) {
    const rendered = EMAIL_TEMPLATES.TWO_FA_DISABLED(email, username);
    return this.send({ to: email, ...rendered, metadata: { type: '2fa-disabled' } });
  }

  // ── Appointments & Therapy ────────────────────────────────

  async sendAppointmentReminder(appointment) {
    const email = appointment.email || appointment.patient?.email || appointment.beneficiary?.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    return this.sendTemplate(email, 'APPOINTMENT_REMINDER', appointment);
  }

  async sendAppointmentConfirmation(appointment) {
    const email = appointment.email || appointment.patient?.email || appointment.beneficiary?.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    return this.sendTemplate(email, 'APPOINTMENT_CONFIRMATION', appointment);
  }

  async sendAppointmentCancellation(appointment, reason) {
    const email = appointment.email || appointment.patient?.email || appointment.beneficiary?.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.APPOINTMENT_CANCELLATION(appointment, reason);
    return this.send({ to: email, ...rendered, metadata: { type: 'appointment-cancellation' } });
  }

  async sendSessionSummary(session, guardian) {
    const email = guardian?.email || session.guardianEmail;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.SESSION_SUMMARY(session, guardian);
    return this.send({ to: email, ...rendered, metadata: { type: 'session-summary' } });
  }

  async sendSessionReminder(session) {
    const email = session.email || session.patient?.email || session.beneficiary?.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    // Reuse appointment reminder template
    return this.sendTemplate(email, 'APPOINTMENT_REMINDER', session);
  }

  // ── HR / Employee Affairs ─────────────────────────────────

  async sendLeaveRequest(employee, leave) {
    // Send to HR/manager
    const hrEmail = leave.managerEmail || process.env.HR_EMAIL || '';
    if (!hrEmail) return { success: false, error: 'NO_HR_EMAIL' };
    const rendered = EMAIL_TEMPLATES.LEAVE_REQUEST(employee, leave);
    return this.send({ to: hrEmail, ...rendered, metadata: { type: 'leave-request' } });
  }

  async sendLeaveStatusUpdate(employee, leave) {
    const email = employee.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.LEAVE_STATUS_UPDATE(employee, leave);
    return this.send({ to: email, ...rendered, metadata: { type: 'leave-status' } });
  }

  async sendSalaryNotification(employee, salary) {
    const email = employee.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.SALARY_NOTIFICATION(employee, salary);
    return this.send({ to: email, ...rendered, metadata: { type: 'salary' } });
  }

  async sendAttendanceAlert(employee, alert) {
    const email = employee.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.ATTENDANCE_ALERT(employee, alert);
    return this.send({ to: email, ...rendered, metadata: { type: 'attendance-alert' } });
  }

  async sendDocumentReady(user, doc) {
    const email = user.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.DOCUMENT_READY(user, doc);
    return this.send({ to: email, ...rendered, metadata: { type: 'document-ready' } });
  }

  async sendEmployeeNotification(employee, action) {
    const email = employee.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.NOTIFICATION({
      title: `إشعار: تم ${action} بيانات الموظف`,
      message: `تم ${action} بيانات الموظف ${employee.name || `${employee.firstName} ${employee.lastName}`} بنجاح.`,
    });
    return this.send({ to: email, ...rendered, metadata: { type: 'employee-notification' } });
  }

  // ── Finance ────────────────────────────────────────────────

  async sendInvoiceEmail(invoice, customer) {
    const email = customer?.email || invoice.email || invoice.customerEmail;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.INVOICE(invoice, customer);
    const attachments = invoice.pdf
      ? [
          {
            filename: `invoice-${invoice.number || invoice.invoiceNumber}.pdf`,
            content: invoice.pdf,
          },
        ]
      : undefined;
    return this.send({ to: email, ...rendered, attachments, metadata: { type: 'invoice' } });
  }

  async sendPaymentConfirmation(payment) {
    const email = payment.email || payment.customerEmail;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.PAYMENT_CONFIRMATION(payment);
    return this.send({ to: email, ...rendered, metadata: { type: 'payment-confirmation' } });
  }

  async sendPaymentReminder(invoice) {
    const email = invoice.email || invoice.customerEmail;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.PAYMENT_REMINDER(invoice);
    return this.send({ to: email, ...rendered, metadata: { type: 'payment-reminder' } });
  }

  // ── Supply Chain ───────────────────────────────────────────

  async sendOrderConfirmation(order) {
    const email = order.email || order.customer?.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.ORDER_CONFIRMATION(order);
    return this.send({ to: email, ...rendered, metadata: { type: 'order-confirmation' } });
  }

  async sendOrderStatusUpdate(order) {
    const email = order.email || order.customer?.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.ORDER_STATUS_UPDATE(order);
    return this.send({ to: email, ...rendered, metadata: { type: 'order-status' } });
  }

  // ── Government Integration ────────────────────────────────

  async sendGovDocumentUpdate(user, doc) {
    const email = user.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.GOV_DOCUMENT_UPDATE(user, doc);
    return this.send({ to: email, ...rendered, metadata: { type: 'gov-document' } });
  }

  // ── Reports & Analytics ───────────────────────────────────

  async sendReportReady(report, recipientEmail) {
    const email = recipientEmail || report.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.REPORT_READY(report);
    const attachments = report.attachment ? [report.attachment] : undefined;
    return this.send({ to: email, ...rendered, attachments, metadata: { type: 'report' } });
  }

  async sendAlertNotification(alert, recipientEmail) {
    const email = recipientEmail || alert.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const rendered = EMAIL_TEMPLATES.ALERT_NOTIFICATION(alert);
    return this.send({
      to: email,
      ...rendered,
      priority: alert.severity === 'critical' ? 10 : 7,
      metadata: { type: 'alert' },
    });
  }

  // ── General Notification ──────────────────────────────────

  async sendNotification(to, notification) {
    if (!to) return { success: false, error: 'NO_RECIPIENT' };
    if (typeof notification === 'string') {
      notification = { title: 'إشعار', message: notification };
    }
    const rendered = EMAIL_TEMPLATES.NOTIFICATION(notification);
    return this.send({ to, ...rendered, metadata: { type: 'notification' } });
  }

  // ═══════════════════════════════════════════════════════════
  // 📧 QUEUE & RETRY
  // ═══════════════════════════════════════════════════════════

  async enqueue(options) {
    if (!this.QueueModel) {
      logger.warn('[EmailIntegration] No queue model available, dropping email');
      return { success: false, error: 'NO_QUEUE' };
    }

    try {
      await this.QueueModel.create({
        type: options.template || 'direct',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        variables: options.variables,
        attachments: options.attachments,
        status: 'pending',
        priority: options.priority || 5,
        scheduledFor: options.scheduledFor,
        metadata: options.metadata,
      });

      this.stats.queued++;
      logger.info(`[EmailIntegration] Queued email to ${options.to}`);
      return { success: true, status: 'QUEUED' };
    } catch (error) {
      logger.error(`[EmailIntegration] Queue error: ${error.message}`);
      return { success: false, error: 'QUEUE_ERROR' };
    }
  }

  async processQueue() {
    if (!this.QueueModel) return { processed: 0 };

    const pendingEmails = await this.QueueModel.find({
      status: 'pending',
      $or: [{ scheduledFor: { $lte: new Date() } }, { scheduledFor: null }],
    })
      .sort({ priority: -1, createdAt: 1 })
      .limit(10);

    let processed = 0;
    for (const email of pendingEmails) {
      if (email.attempts >= email.maxAttempts) {
        await this.QueueModel.updateOne({ _id: email._id }, { status: 'failed' });
        continue;
      }

      await this.QueueModel.updateOne(
        { _id: email._id },
        { status: 'processing', $inc: { attempts: 1 } }
      );

      const result = await this.send({
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: email.attachments,
        metadata: { ...email.metadata, autoRetry: false },
      });

      if (result.success) {
        await this.QueueModel.updateOne({ _id: email._id }, { status: 'sent', sentAt: new Date() });
        processed++;
      } else {
        await this.QueueModel.updateOne(
          { _id: email._id },
          {
            status: 'pending',
            lastError: result.error,
          }
        );
      }
    }

    return { processed, total: pendingEmails.length };
  }

  // ═══════════════════════════════════════════════════════════
  // 📧 RATE LIMITING
  // ═══════════════════════════════════════════════════════════

  _checkRateLimit() {
    const now = Date.now();
    this.rateLimits.minute = this.rateLimits.minute.filter(t => now - t < 60000);
    this.rateLimits.hour = this.rateLimits.hour.filter(t => now - t < 3600000);
    this.rateLimits.day = this.rateLimits.day.filter(t => now - t < 86400000);

    return (
      this.rateLimits.minute.length < EMAIL_CONFIG.rateLimit.maxPerMinute &&
      this.rateLimits.hour.length < EMAIL_CONFIG.rateLimit.maxPerHour &&
      this.rateLimits.day.length < EMAIL_CONFIG.rateLimit.maxPerDay
    );
  }

  _trackRateLimit() {
    const now = Date.now();
    this.rateLimits.minute.push(now);
    this.rateLimits.hour.push(now);
    this.rateLimits.day.push(now);
  }

  // ═══════════════════════════════════════════════════════════
  // 📧 WEBSOCKET REAL-TIME
  // ═══════════════════════════════════════════════════════════

  _emitRealtime(event, data) {
    if (!this.wsManager) return;
    try {
      this.wsManager.broadcast(event, data);
    } catch (e) {
      // silent
    }
  }

  notifySendResult(to, result) {
    this._emitRealtime('email:send-result', { to, ...result });
  }

  // ═══════════════════════════════════════════════════════════
  // 📧 STATISTICS & HEALTH
  // ═══════════════════════════════════════════════════════════

  async getStats() {
    const queueStats = this.QueueModel
      ? await this.QueueModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).catch(
          () => []
        )
      : [];

    return {
      provider: this.provider,
      initialized: this.initialized,
      sent: this.stats.sent,
      failed: this.stats.failed,
      queued: this.stats.queued,
      queue: queueStats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      rateLimit: {
        minuteUsed: this.rateLimits.minute.length,
        hourUsed: this.rateLimits.hour.length,
        dayUsed: this.rateLimits.day.length,
      },
    };
  }

  async verify() {
    if (this.provider === 'mock' || !this.transporter) {
      return { success: true, message: 'Mock mode — no verification needed' };
    }
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service verified', provider: this.provider };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 📧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function _formatDate(date) {
  if (!date) return 'غير محدد';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'غير محدد';
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'غير محدد';
  }
}

function _formatTime(time) {
  if (!time) return '';
  if (typeof time === 'string' && time.includes(':')) return time;
  try {
    return new Date(time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function _getCurrentMonth() {
  return new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
}

function _stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _leaveStatusBadge(status) {
  const map = {
    approved: '<span class="badge badge-success">مقبولة ✅</span>',
    rejected: '<span class="badge badge-danger">مرفوضة ❌</span>',
    pending: '<span class="badge badge-warning">معلقة ⏳</span>',
    مقبولة: '<span class="badge badge-success">مقبولة ✅</span>',
    مرفوضة: '<span class="badge badge-danger">مرفوضة ❌</span>',
    معلقة: '<span class="badge badge-warning">معلقة ⏳</span>',
  };
  return map[status] || `<span class="badge badge-info">${status}</span>`;
}

function _buildInvoiceItemsTable(items) {
  if (!items || !items.length) return '';
  const rows = items
    .map(
      item =>
        `<tr><td>${item.description || item.name || ''}</td><td>${item.quantity || 1}</td><td>${item.price || item.unitPrice || 0} ر.س</td><td>${(item.quantity || 1) * (item.price || item.unitPrice || 0)} ر.س</td></tr>`
    )
    .join('');
  return `
    <table class="data-table">
      <thead><tr><th>البند</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function _buildOrderItemsTable(items) {
  if (!items || !items.length) return '';
  const rows = items
    .map(
      item =>
        `<tr><td>${item.name || item.description || ''}</td><td>${item.quantity || 1}</td><td>${item.price || 0} ر.س</td></tr>`
    )
    .join('');
  return `
    <table class="data-table">
      <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ═══════════════════════════════════════════════════════════════
// 📧 SINGLETON & EXPORTS
// ═══════════════════════════════════════════════════════════════

const emailIntegration = new EmailIntegrationService();

module.exports = {
  EmailIntegrationService,
  emailIntegration,
  EMAIL_TEMPLATES,
  EMAIL_CONFIG,
  wrapInLayout,
  buildInfoCard,
  buildButton,
};
