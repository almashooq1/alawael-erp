/**
 * Email Service - خدمة البريد الإلكتروني
 * Enterprise Email for Alawael ERP
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Email Configuration
 */
const emailConfig = {
  // Provider
  provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp, sendgrid, mailgun
  
  // SMTP Configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  },
  
  // SendGrid Configuration
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@alawael-erp.com',
  },
  
  // Mailgun Configuration
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    fromEmail: process.env.MAILGUN_FROM_EMAIL || 'noreply@alawael-erp.com',
  },
  
  // Default settings
  defaults: {
    from: {
      name: process.env.EMAIL_FROM_NAME || 'نظام الأهداف ERP',
      address: process.env.EMAIL_FROM_ADDRESS || 'noreply@alawael-erp.com',
    },
    replyTo: process.env.EMAIL_REPLY_TO,
  },
  
  // Template directory
  templatesDir: process.env.EMAIL_TEMPLATES_DIR || './templates/emails',
  
  // Rate limiting
  rateLimit: {
    maxPerMinute: 100,
    maxPerHour: 1000,
  },
};

/**
 * Email Template Schema
 */
const EmailTemplateSchema = {
  templateId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  htmlContent: { type: String, required: true },
  textContent: String,
  variables: [String],
  category: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
};

/**
 * Email Log Schema
 */
const EmailLogSchema = {
  emailId: { type: String, required: true, unique: true },
  to: [{ type: String, required: true }],
  cc: [String],
  bcc: [String],
  subject: { type: String, required: true },
  template: String,
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'],
    default: 'pending',
  },
  provider: String,
  providerId: String,
  error: String,
  metadata: {
    userId: String,
    tenantId: String,
    correlationId: String,
  },
  timestamps: {
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    failedAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
};

/**
 * Email Service Class
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.EmailLog = null;
    this.provider = emailConfig.provider;
  }
  
  /**
   * Initialize email service
   */
  async initialize(connection) {
    // Create transporter based on provider
    switch (this.provider) {
      case 'sendgrid':
        this.transporter = this.createSendGridTransporter();
        break;
      case 'mailgun':
        this.transporter = this.createMailgunTransporter();
        break;
      default:
        this.transporter = this.createSMTPTransporter();
    }
    
    // Initialize Email Log model
    if (connection) {
      const mongoose = require('mongoose');
      this.EmailLog = connection.model('EmailLog', new mongoose.Schema(EmailLogSchema));
    }
    
    // Load templates
    await this.loadTemplates();
    
    console.log(`✅ Email service initialized (${this.provider})`);
  }
  
  /**
   * Create SMTP transporter
   */
  createSMTPTransporter() {
    return nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: emailConfig.smtp.auth,
      pool: true,
      maxConnections: 5,
      rateLimit: emailConfig.rateLimit.maxPerMinute,
    });
  }
  
  /**
   * Create SendGrid transporter
   */
  createSendGridTransporter() {
    const sgTransport = require('nodemailer-sendgrid');
    
    return nodemailer.createTransport(
      sgTransport({
        apiKey: emailConfig.sendgrid.apiKey,
      })
    );
  }
  
  /**
   * Create Mailgun transporter
   */
  createMailgunTransporter() {
    const mailgunTransport = require('nodemailer-mailgun-transport');
    
    return nodemailer.createTransport(
      mailgunTransport({
        auth: {
          api_key: emailConfig.mailgun.apiKey,
          domain: emailConfig.mailgun.domain,
        },
      })
    );
  }
  
  /**
   * Load email templates
   */
  async loadTemplates() {
    try {
      const templatesPath = path.resolve(emailConfig.templatesDir);
      const files = await fs.readdir(templatesPath).catch(() => []);
      
      for (const file of files) {
        if (file.endsWith('.html')) {
          const templateName = file.replace('.html', '');
          const content = await fs.readFile(path.join(templatesPath, file), 'utf-8');
          
          this.templates.set(templateName, {
            name: templateName,
            html: content,
          });
        }
      }
      
      console.log(`✅ Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.warn('⚠️ No email templates directory found');
    }
  }
  
  /**
   * Send email
   */
  async send(options) {
    const {
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      template,
      variables,
      metadata = {},
    } = options;
    
    // Generate email ID
    const emailId = this.generateEmailId();
    
    // Build email data
    const mailOptions = {
      from: emailConfig.defaults.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      attachments,
      replyTo: emailConfig.defaults.replyTo,
    };
    
    // Apply template if specified
    if (template) {
      const rendered = await this.renderTemplate(template, variables || {});
      mailOptions.subject = rendered.subject || subject;
      mailOptions.html = rendered.html;
      mailOptions.text = rendered.text;
    }
    
    // Log email
    if (this.EmailLog) {
      await this.EmailLog.create({
        emailId,
        to: Array.isArray(to) ? to : [to],
        cc,
        bcc,
        subject: mailOptions.subject,
        template,
        status: 'pending',
        provider: this.provider,
        metadata,
        timestamps: { queuedAt: new Date() },
      });
    }
    
    try {
      const result = await this.transporter.sendMail(mailOptions);
      
      // Update log
      if (this.EmailLog) {
        await this.EmailLog.updateOne(
          { emailId },
          {
            status: 'sent',
            providerId: result.messageId,
            'timestamps.sentAt': new Date(),
          }
        );
      }
      
      return {
        success: true,
        emailId,
        messageId: result.messageId,
      };
    } catch (error) {
      // Update log with error
      if (this.EmailLog) {
        await this.EmailLog.updateOne(
          { emailId },
          {
            status: 'failed',
            error: error.message,
            'timestamps.failedAt': new Date(),
          }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Send bulk emails
   */
  async sendBulk(recipients, options) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.send({
          ...options,
          to: recipient.email,
          variables: { ...options.variables, ...recipient.variables },
        });
        
        results.push({ email: recipient.email, ...result });
      } catch (error) {
        results.push({
          email: recipient.email,
          success: false,
          error: error.message,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Render email template
   */
  async renderTemplate(templateName, variables) {
    // Check in-memory templates first
    let template = this.templates.get(templateName);
    
    // If not found, try to load from database
    if (!template) {
      // Load from database if available
      template = await this.loadTemplateFromDB(templateName);
    }
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }
    
    // Render variables
    let html = template.html;
    let subject = template.subject || '';
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
      subject = subject.replace(regex, value);
    }
    
    return {
      html,
      subject,
      text: template.text,
    };
  }
  
  /**
   * Load template from database
   */
  async loadTemplateFromDB(templateName) {
    // This would load from a Template collection
    // For now, return null
    return null;
  }
  
  /**
   * Generate email ID
   */
  generateEmailId() {
    const crypto = require('crypto');
    return `eml_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }
  
  /**
   * Verify transporter connection
   */
  async verify() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get email statistics
   */
  async getStats(options = {}) {
    if (!this.EmailLog) return null;
    
    const { startDate, endDate, tenantId } = options;
    
    const match = {};
    if (tenantId) match['metadata.tenantId'] = tenantId;
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await this.EmailLog.aggregate([
      { $match: match },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
      }},
    ]);
    
    const total = await this.EmailLog.countDocuments(match);
    
    return {
      total,
      byStatus: stats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
    };
  }
  
  /**
   * Close connections
   */
  async close() {
    if (this.transporter && this.transporter.close) {
      this.transporter.close();
    }
  }
}

// Singleton instance
const emailService = new EmailService();

/**
 * Pre-defined Email Templates
 */
const EmailTemplates = {
  // Welcome email
  WELCOME: {
    name: 'welcome',
    subject: 'مرحباً بك في نظام الأهداف ERP',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>مرحباً {{name}}!</h2>
        <p>نرحب بك في نظام الأهداف ERP. تم إنشاء حسابك بنجاح.</p>
        <p>يمكنك الآن تسجيل الدخول باستخدام:</p>
        <ul>
          <li>البريد الإلكتروني: {{email}}</li>
        </ul>
        <p>مع تحياتنا،<br>فريق نظام الأهداف</p>
      </div>
    `,
  },
  
  // Password reset
  PASSWORD_RESET: {
    name: 'password-reset',
    subject: 'إعادة تعيين كلمة المرور',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.</p>
        <p>انقر على الرابط أدناه لإعادة تعيين كلمة المرور:</p>
        <a href="{{resetLink}}">إعادة تعيين كلمة المرور</a>
        <p>هذا الرابط صالح لمدة 24 ساعة.</p>
        <p>إذا لم تطلب هذا، يرجى تجاهل هذا البريد.</p>
      </div>
    `,
  },
  
  // Invoice email
  INVOICE: {
    name: 'invoice',
    subject: 'فاتورة رقم {{invoiceNumber}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>فاتورة ضريبية</h2>
        <p>عزيزي {{customerName}}،</p>
        <p>المرفق فاتورتك رقم {{invoiceNumber}} بتاريخ {{invoiceDate}}.</p>
        <p>المبلغ الإجمالي: {{totalAmount}} ر.س</p>
        <p>يرجى السداد قبل تاريخ {{dueDate}}.</p>
        <p>شكراً لتعاملكم معنا.</p>
      </div>
    `,
  },
  
  // Leave request
  LEAVE_REQUEST: {
    name: 'leave-request',
    subject: 'طلب إجازة جديد',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>طلب إجازة جديد</h2>
        <p>الموظف: {{employeeName}}</p>
        <p>نوع الإجازة: {{leaveType}}</p>
        <p>من: {{startDate}}</p>
        <p>إلى: {{endDate}}</p>
        <p>السبب: {{reason}}</p>
        <a href="{{approvalLink}}">مراجعة الطلب</a>
      </div>
    `,
  },
  
  // Notification
  NOTIFICATION: {
    name: 'notification',
    subject: '{{title}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>{{title}}</h2>
        <p>{{message}}</p>
        {{#if actionLink}}
        <a href="{{actionLink}}">{{actionText}}</a>
        {{/if}}
      </div>
    `,
  },
  
  // Report
  REPORT: {
    name: 'report',
    subject: 'تقرير {{reportName}}',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>{{reportName}}</h2>
        <p>تقرير من {{startDate}} إلى {{endDate}}</p>
        <p>المرفق يحتوي على التفاصيل الكاملة.</p>
      </div>
    `,
  },
};

/**
 * Email Helper Functions
 */
const sendWelcomeEmail = async (user) => {
  return emailService.send({
    to: user.email,
    template: 'welcome',
    variables: {
      name: user.name,
      email: user.email,
    },
    metadata: { userId: user.id },
  });
};

const sendPasswordResetEmail = async (user, resetLink) => {
  return emailService.send({
    to: user.email,
    template: 'password-reset',
    variables: {
      name: user.name,
      resetLink,
    },
    metadata: { userId: user.id },
  });
};

const sendInvoiceEmail = async (invoice, customer) => {
  return emailService.send({
    to: customer.email,
    template: 'invoice',
    variables: {
      customerName: customer.name,
      invoiceNumber: invoice.number,
      invoiceDate: invoice.date,
      totalAmount: invoice.total,
      dueDate: invoice.dueDate,
    },
    attachments: invoice.pdf ? [{
      filename: `invoice-${invoice.number}.pdf`,
      content: invoice.pdf,
    }] : undefined,
    metadata: { tenantId: invoice.tenantId },
  });
};

const sendNotificationEmail = async (to, title, message, options = {}) => {
  return emailService.send({
    to,
    subject: title,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>${title}</h2>
        <p>${message}</p>
        ${options.actionLink ? `<a href="${options.actionLink}">${options.actionText || 'عرض التفاصيل'}</a>` : ''}
      </div>
    `,
    metadata: options.metadata,
  });
};

module.exports = {
  EmailService,
  emailService,
  EmailTemplates,
  emailConfig,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInvoiceEmail,
  sendNotificationEmail,
};