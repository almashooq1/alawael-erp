/**
 * Secure Messaging Service
 * خدمة الرسائل الآمنة والمشفرة
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// ==================== MESSAGE ENCRYPTION ====================

class MessageEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(String(process.env.ENCRYPTION_KEY || 'encryption_key_123'))
      .digest();
  }

  // Encrypt message
  encrypt(plainText) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt message
  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Generate message hash for verification
  generateHash(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  // Verify message integrity
  verifyHash(message, hash) {
    const messageHash = this.generateHash(message);
    return messageHash === hash;
  }
}

// ==================== NOTIFICATION SERVICE ====================

class NotificationService {
  constructor() {
    // Email configuration
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // SMS configuration (Twilio)
    this.twilio = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  // Send Email Notification
  async sendEmailNotification(to, subject, htmlContent, textContent) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@system.com',
        to,
        subject,
        html: htmlContent,
        text: textContent,
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send SMS Notification
  async sendSMSNotification(phoneNumber, message) {
    try {
      if (!process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('Twilio phone number not configured');
      }

      const response = await this.twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      return {
        success: true,
        messageId: response.sid,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send In-App Notification
  async sendInAppNotification(beneficiaryId, title, body, data = {}) {
    try {
      // Implementation would save to database
      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('In-app notification error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send Multi-Channel Notification
  async sendMultiChannelNotification(beneficiary, notification) {
    const results = {};

    // Email
    if (beneficiary.notificationPreferences.email && notification.channels.includes('email')) {
      results.email = await this.sendEmailNotification(
        beneficiary.email,
        notification.title,
        this.generateEmailTemplate(notification),
        notification.body
      );
    }

    // SMS
    if (beneficiary.notificationPreferences.sms && notification.channels.includes('sms')) {
      results.sms = await this.sendSMSNotification(beneficiary.phone, notification.body);
    }

    // In-App
    if (beneficiary.notificationPreferences.inApp && notification.channels.includes('in_app')) {
      results.inApp = await this.sendInAppNotification(
        beneficiary._id,
        notification.title,
        notification.body
      );
    }

    return results;
  }

  // Generate Email Template
  generateEmailTemplate(notification) {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 5px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { padding: 20px; }
          .button { display: inline-block; background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          .footer { background-color: #ecf0f1; padding: 10px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${notification.title}</h2>
          </div>
          <div class="content">
            <p>${notification.body}</p>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="button">عرض المزيد</a>` : ''}
          </div>
          <div class="footer">
            <p>© 2026 نظام المستفيدين الذكي - Smart Beneficiary System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// ==================== MESSAGE VALIDATION ====================

class MessageValidator {
  static validateMessageContent(message) {
    const errors = [];

    if (!message.body || message.body.trim().length === 0) {
      errors.push('Message body cannot be empty');
    }

    if (message.body.length > 5000) {
      errors.push('Message body is too long (max 5000 characters)');
    }

    if (message.attachments && message.attachments.length > 5) {
      errors.push('Maximum 5 attachments allowed');
    }

    // Check for spam patterns
    if (this.containsSpamPatterns(message.body)) {
      errors.push('Message contains spam patterns');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static containsSpamPatterns(text) {
    const spamPatterns = [
      /https?:\/\//gi, // URLs
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Emails
      /([a-z])\1{4,}/gi, // Repeated characters
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  static validateAttachment(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds limit (10MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true };
  }
}

// ==================== MESSAGE ACCESS LOG ====================

class MessageAccessLogger {
  static async logAccess(userId, messageId, action) {
    try {
      // Log would be saved to database
      const logEntry = {
        userId,
        messageId,
        action, // 'viewed', 'downloaded', 'forwarded', 'deleted'
        timestamp: new Date(),
        ipAddress: '', // Would be captured from request
      };

      return logEntry;
    } catch (error) {
      console.error('Access log error:', error);
    }
  }

  static async getAccessHistory(messageId) {
    try {
      // Retrieve from database
      return [];
    } catch (error) {
      console.error('Failed to retrieve access history:', error);
    }
  }
}

// ==================== ABUSE DETECTION ====================

class AbuseDetectionService {
  static async detectAbuse(beneficiaryId) {
    const suspiciousPatterns = [];

    // Check message sending rate
    // Example: More than 100 messages in 1 hour
    suspiciousPatterns.push(await this.checkSendingRate(beneficiaryId));

    // Check recipient patterns
    // Example: Sending to many unique recipients in short time
    suspiciousPatterns.push(await this.checkRecipientPatterns(beneficiaryId));

    // Check content patterns
    // Example: Spam keywords or suspicious links
    suspiciousPatterns.push(await this.checkContentPatterns(beneficiaryId));

    const flaggedPatterns = suspiciousPatterns.filter(p => p.flagged);

    return {
      riskLevel:
        flaggedPatterns.length === 0 ? 'low' : flaggedPatterns.length === 1 ? 'medium' : 'high',
      patterns: flaggedPatterns,
      timestamp: new Date(),
    };
  }

  static async checkSendingRate(beneficiaryId) {
    // Implementation would query database
    return { flagged: false, pattern: 'sending_rate' };
  }

  static async checkRecipientPatterns(beneficiaryId) {
    // Implementation would query database
    return { flagged: false, pattern: 'recipient_pattern' };
  }

  static async checkContentPatterns(beneficiaryId) {
    // Implementation would query database
    return { flagged: false, pattern: 'content_pattern' };
  }
}

// ==================== EXPORTS ====================

module.exports = {
  MessageEncryptionService,
  NotificationService,
  MessageValidator,
  MessageAccessLogger,
  AbuseDetectionService,
};
