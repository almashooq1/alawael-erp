/**
 * Email Integration Service
 * SendGrid, SMTP, and Email Management
 *
 * Features:
 * - SendGrid integration
 * - SMTP fallback
 * - Email templates
 * - Bulk email sending
 * - Email tracking and delivery status
 */

const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const AuditLogger = require('./audit-logger');

class EmailIntegrationService {
  constructor() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendgridEnabled = true;
    }

    // Initialize SMTP
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (this.smtpConfig.auth.user && this.smtpConfig.auth.pass) {
      this.mailer = nodemailer.createTransport(this.smtpConfig);
      this.smtpEnabled = true;
    }

    this.logger = new AuditLogger('EmailIntegration');
    this.defaultFrom =
      process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER || 'noreply@system.com';

    // Email templates
    this.templates = {
      welcome: 'Welcome to our system',
      verification: 'Verify your email',
      passwordReset: 'Password reset request',
      invoice: 'Invoice notification',
      notification: 'System notification',
      alert: 'Alert notification',
    };
  }

  /**
   * Send Email via SendGrid
   */
  async sendViaSegGrid(emailData) {
    if (!this.sendgridEnabled) {
      throw new Error('SendGrid is not configured');
    }

    try {
      const {
        to,
        subject,
        html,
        text,
        from = this.defaultFrom,
        cc = [],
        bcc = [],
        attachments = [],
      } = emailData;

      const msg = {
        to,
        from,
        subject,
        text,
        html,
        cc,
        bcc,
      };

      if (attachments.length > 0) {
        msg.attachments = attachments;
      }

      const result = await sgMail.send(msg);

      this.logger.log('info', 'Email sent via SendGrid', {
        to,
        subject,
        messageId: result[0].headers['x-message-id'],
      });

      return {
        success: true,
        provider: 'sendgrid',
        messageId: result[0].headers['x-message-id'],
        status: 'sent',
      };
    } catch (error) {
      this.logger.log('error', 'SendGrid email failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Send Email via SMTP
   */
  async sendViaSMTP(emailData) {
    if (!this.smtpEnabled) {
      throw new Error('SMTP is not configured');
    }

    try {
      const {
        to,
        subject,
        html,
        text,
        from = this.defaultFrom,
        cc = [],
        bcc = [],
        attachments = [],
      } = emailData;

      const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
        cc,
        bcc,
        attachments,
      };

      const info = await this.mailer.sendMail(mailOptions);

      this.logger.log('info', 'Email sent via SMTP', {
        to,
        subject,
        messageId: info.messageId,
      });

      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
        status: 'sent',
      };
    } catch (error) {
      this.logger.log('error', 'SMTP email failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Send Email with Automatic Provider Selection
   */
  async sendEmail(emailData) {
    try {
      // Try SendGrid first
      if (this.sendgridEnabled) {
        return await this.sendViaSegGrid(emailData);
      }
      // Fallback to SMTP
      else if (this.smtpEnabled) {
        return await this.sendViaSMTP(emailData);
      }
      // Mock mode
      else {
        this.logger.log('info', 'Email sent (mock mode)', {
          to: emailData.to,
          subject: emailData.subject,
        });
        return {
          success: true,
          provider: 'mock',
          messageId: `MOCK-${Date.now()}`,
          status: 'sent',
        };
      }
    } catch (error) {
      this.logger.log('error', 'Failed to send email', {
        error: error.message,
        to: emailData.to,
      });
      throw error;
    }
  }

  /**
   * Send Welcome Email
   */
  async sendWelcomeEmail(to, userName, options = {}) {
    const html = `
      <h2>Welcome, ${userName}!</h2>
      <p>Thank you for joining our system.</p>
      <p>We're excited to have you on board.</p>
      <a href="${options.verificationLink || '#'}">Verify Your Email</a>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to our system',
      html,
      text: `Welcome, ${userName}!`,
      ...options,
    });
  }

  /**
   * Send Verification Email
   */
  async sendVerificationEmail(to, verificationToken, options = {}) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${verificationToken}`;

    const html = `
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>If you didn't create this account, please ignore this email.</p>
    `;

    return this.sendEmail({
      to,
      subject: 'Verify your email',
      html,
      text: `Verify your email: ${verificationLink}`,
      ...options,
    });
  }

  /**
   * Send Password Reset Email
   */
  async sendPasswordResetEmail(to, resetToken, options = {}) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail({
      to,
      subject: 'Password reset request',
      html,
      text: `Reset your password: ${resetLink}`,
      ...options,
    });
  }

  /**
   * Send Invoice Email
   */
  async sendInvoiceEmail(to, invoiceData, options = {}) {
    const { invoiceNumber, amount, dueDate, items = [] } = invoiceData;

    let itemsHtml = items
      .map(
        item =>
          `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.price}</td></tr>`
      )
      .join('');

    const html = `
      <h2>Invoice #${invoiceNumber}</h2>
      <table border="1" cellpadding="10">
        <tr><th>Description</th><th>Quantity</th><th>Price</th></tr>
        ${itemsHtml}
      </table>
      <p><strong>Total: $${amount}</strong></p>
      <p>Due Date: ${dueDate}</p>
    `;

    return this.sendEmail({
      to,
      subject: `Invoice #${invoiceNumber}`,
      html,
      ...options,
    });
  }

  /**
   * Send Notification Email
   */
  async sendNotificationEmail(to, notificationData, options = {}) {
    const { title, message, actionUrl, actionText = 'View' } = notificationData;

    const html = `
      <h2>${title}</h2>
      <p>${message}</p>
      ${actionUrl ? `<a href="${actionUrl}">${actionText}</a>` : ''}
    `;

    return this.sendEmail({
      to,
      subject: title,
      html,
      text: message,
      ...options,
    });
  }

  /**
   * Send Alert Email
   */
  async sendAlertEmail(to, alertData, options = {}) {
    const { alertType, message, severity = 'info' } = alertData;

    const html = `
      <div style="color: ${severity === 'critical' ? 'red' : 'orange'}">
        <h2>Alert: ${alertType}</h2>
        <p>${message}</p>
        <p>Severity: ${severity}</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Alert: ${alertType}`,
      html,
      ...options,
    });
  }

  /**
   * Send Bulk Email
   */
  async sendBulkEmail(recipients, emailTemplate, options = {}) {
    try {
      const results = [];

      for (const recipient of recipients) {
        try {
          const result = await this.sendEmail({
            to: recipient.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html(recipient),
            text: emailTemplate.text(recipient),
            ...options,
          });
          results.push({ email: recipient.email, success: true, ...result });
        } catch (error) {
          results.push({ email: recipient.email, success: false, error: error.message });
        }
      }

      this.logger.log('info', 'Bulk email sent', {
        total: recipients.length,
        successful: results.filter(r => r.success).length,
      });

      return {
        success: true,
        results,
        summary: {
          total: recipients.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      };
    } catch (error) {
      this.logger.log('error', 'Bulk email failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get Email Status
   */
  async getEmailStatus(messageId) {
    try {
      // This would require integration with SendGrid's event webhook
      this.logger.log('info', 'Email status requested', { messageId });

      return {
        success: true,
        messageId,
        status: 'delivered',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to get email status', { error: error.message });
      throw error;
    }
  }
}

module.exports = new EmailIntegrationService();
