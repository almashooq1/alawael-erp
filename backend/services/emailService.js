const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Email configuration
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true' || false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password',
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Email templates
const emailTemplates = {
  welcomeEmail: user => ({
    subject: `مرحباً بك في نظام الأوائل ERP - ${user.fullName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">مرحباً بك! 👋</h2>
        <p>مرحباً بك <strong>${user.fullName}</strong> في نظام الأوائل ERP.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>بيانات دخولك:</h3>
          <p><strong>البريد الإلكتروني:</strong> ${user.email}</p>
          <p><strong>الرابط:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">http://localhost:3000</a></p>
        </div>
        
        <p>يمكنك الآن تسجيل الدخول واستخدام جميع مزايا النظام.</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>© 2026 نظام الأوائل ERP. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    `,
  }),

  passwordReset: (user, resetToken) => ({
    subject: 'إعادة تعيين كلمة المرور - نظام الأوائل ERP',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">إعادة تعيين كلمة المرور</h2>
        <p>مرحباً ${user.fullName}،</p>
        
        <p>تلقينا طلباً لإعادة تعيين كلمة مرورك. اضغط على الرابط أدناه:</p>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}"
             style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            إعادة تعيين كلمة المرور
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          أو انسخ واذهب إلى: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}
        </p>
        
        <p style="color: #d32f2f;">⚠️ هذا الرابط سينتهي بعد ساعة واحدة</p>
        
        <p>إذا لم تطلب هذا الإجراء، تجاهل هذا البريد.</p>
      </div>
    `,
  }),

  emailVerification: (user, verificationToken) => ({
    subject: 'تأكيد بريدك الإلكتروني - نظام الأوائل ERP',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">تأكيد بريدك الإلكتروني</h2>
        <p>مرحباً ${user.fullName}،</p>
        
        <p>اضغط على الرابط أدناه لتأكيد بريدك الإلكتروني:</p>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}"
             style="background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            تأكيد البريد الإلكتروني
          </a>
        </div>
      </div>
    `,
  }),

  employeeNotification: (employee, action) => ({
    subject: `إشعار: تم ${action} بيانات الموظف`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">إشعار الموظفين</h2>
        <p>تم ${action} بيانات الموظف: <strong>${employee.name}</strong></p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <p><strong>الاسم:</strong> ${employee.name}</p>
          <p><strong>البريد الإلكتروني:</strong> ${employee.email}</p>
          <p><strong>المنصب:</strong> ${employee.position}</p>
          <p><strong>القسم:</strong> ${employee.department}</p>
        </div>
      </div>
    `,
  }),

  invoiceEmail: invoice => ({
    subject: `الفاتورة رقم ${invoice.number}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">فاتورة جديدة</h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>رقم الفاتورة:</strong> ${invoice.number}</p>
          <p><strong>التاريخ:</strong> ${invoice.date}</p>
          <p><strong>المبلغ:</strong> ${invoice.amount} ريال</p>
          <p><strong>الحالة:</strong> ${invoice.status}</p>
        </div>
        
        <p>يمكنك تحميل الفاتورة من خلال صفحة المستندات في النظام.</p>
      </div>
    `,
  }),

  reportEmail: report => ({
    subject: `التقرير: ${report.title}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">تقرير جديد</h2>
        <p>التقرير: <strong>${report.title}</strong></p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
          <p><strong>الفترة:</strong> ${report.period}</p>
          <p><strong>التاريخ:</strong> ${report.date}</p>
          <p><strong>الملخص:</strong> ${report.summary}</p>
        </div>
        
        <p>انقر <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reports">هنا</a> لعرض التقرير كاملاً.</p>
      </div>
    `,
  }),

  notificationEmail: notification => ({
    subject: notification.subject,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">${notification.title}</h2>
        <p>${notification.message}</p>
        
        ${
          notification.actionUrl
            ? `
          <div style="margin: 30px 0;">
            <a href="${notification.actionUrl}"
               style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              ${notification.actionText || 'اعرض المزيد'}
            </a>
          </div>
        `
            : ''
        }
      </div>
    `,
  }),
};

/**
 * Send Email
 * @param {string} to - Recipient email
 * @param {string} templateName - Template name
 * @param {object} data - Template data
 * @returns {Promise}
 */
const sendEmail = async (to, templateName, data) => {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"نظام الأوائل ERP" <${emailConfig.auth.user}>`,
      to,
      ...template(data),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk emails
 * @param {array} recipients - Array of emails
 * @param {string} templateName - Template name
 * @param {object} data - Template data
 * @returns {Promise}
 */
const sendBulkEmail = async (recipients, templateName, data) => {
  const results = [];
  for (const email of recipients) {
    const result = await sendEmail(email, templateName, data);
    results.push({ email, ...result });
  }
  return results;
};

/**
 * Verify email service connection
 * @returns {Promise}
 */
const verifyEmailService = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready to send emails');
    return { success: true, message: 'Email service verified' };
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  verifyEmailService,
  emailTemplates,
  transporter,
};
