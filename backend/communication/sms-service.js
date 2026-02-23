/**
 * SMS Service - خدمة الرسائل النصية
 * Enterprise SMS for Alawael ERP
 */

const crypto = require('crypto');

/**
 * SMS Configuration
 */
const smsConfig = {
  // Provider
  provider: process.env.SMS_PROVIDER || 'twilio', // twilio, nexmo, local
  
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },
  
  // Nexmo/Vonage Configuration
  nexmo: {
    apiKey: process.env.NEXMO_API_KEY,
    apiSecret: process.env.NEXMO_API_SECRET,
    fromNumber: process.env.NEXMO_FROM_NUMBER || 'Alawael',
  },
  
  // Local Saudi Provider (e.g., Unifonic)
  local: {
    apiUrl: process.env.SMS_API_URL,
    apiKey: process.env.SMS_API_KEY,
    senderName: process.env.SMS_SENDER_NAME || 'Alawael',
  },
  
  // Default settings
  defaults: {
    countryCode: '966',
    senderName: process.env.SMS_SENDER_NAME || 'Alawael',
  },
  
  // Rate limiting
  rateLimit: {
    maxPerMinute: 30,
    maxPerHour: 500,
    maxPerDay: 5000,
  },
  
  // OTP settings
  otp: {
    length: 6,
    expirySeconds: 300, // 5 minutes
    maxAttempts: 3,
  },
};

/**
 * SMS Log Schema
 */
const SMSLogSchema = {
  smsId: { type: String, required: true, unique: true },
  to: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['otp', 'notification', 'alert', 'marketing', 'transactional'],
    default: 'notification',
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'rejected'],
    default: 'pending',
  },
  provider: String,
  providerId: String,
  segments: Number,
  cost: Number,
  error: String,
  metadata: {
    userId: String,
    tenantId: String,
    correlationId: String,
    ipAddress: String,
  },
  timestamps: {
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    failedAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
};

/**
 * SMS Service Class
 */
class SMSService {
  constructor() {
    this.client = null;
    this.SMSLog = null;
    this.provider = smsConfig.provider;
    this.otpStore = new Map();
  }
  
  /**
   * Initialize SMS service
   */
  async initialize(connection) {
    // Create client based on provider
    switch (this.provider) {
      case 'twilio':
        this.client = this.createTwilioClient();
        break;
      case 'nexmo':
        this.client = this.createNexmoClient();
        break;
      default:
        this.client = this.createLocalClient();
    }
    
    // Initialize SMS Log model
    if (connection) {
      const mongoose = require('mongoose');
      this.SMSLog = connection.model('SMSLog', new mongoose.Schema(SMSLogSchema));
    }
    
    console.log(`✅ SMS service initialized (${this.provider})`);
  }
  
  /**
   * Create Twilio client
   */
  createTwilioClient() {
    const twilio = require('twilio');
    return {
      type: 'twilio',
      client: twilio(smsConfig.twilio.accountSid, smsConfig.twilio.authToken),
      from: smsConfig.twilio.fromNumber,
    };
  }
  
  /**
   * Create Nexmo client
   */
  createNexmoClient() {
    return {
      type: 'nexmo',
      apiKey: smsConfig.nexmo.apiKey,
      apiSecret: smsConfig.nexmo.apiSecret,
      from: smsConfig.nexmo.fromNumber,
    };
  }
  
  /**
   * Create local Saudi provider client
   */
  createLocalClient() {
    return {
      type: 'local',
      apiUrl: smsConfig.local.apiUrl,
      apiKey: smsConfig.local.apiKey,
      senderName: smsConfig.local.senderName,
    };
  }
  
  /**
   * Send SMS
   */
  async send(options) {
    const {
      to,
      message,
      type = 'notification',
      metadata = {},
    } = options;
    
    // Format phone number
    const formattedPhone = this.formatPhoneNumber(to);
    
    // Generate SMS ID
    const smsId = this.generateSMSId();
    
    // Log SMS
    if (this.SMSLog) {
      await this.SMSLog.create({
        smsId,
        to: formattedPhone,
        message,
        type,
        status: 'pending',
        provider: this.provider,
        metadata,
        timestamps: { queuedAt: new Date() },
      });
    }
    
    try {
      let result;
      
      switch (this.client.type) {
        case 'twilio':
          result = await this.sendViaTwilio(formattedPhone, message);
          break;
        case 'nexmo':
          result = await this.sendViaNexmo(formattedPhone, message);
          break;
        default:
          result = await this.sendViaLocal(formattedPhone, message);
      }
      
      // Update log
      if (this.SMSLog) {
        await this.SMSLog.updateOne(
          { smsId },
          {
            status: 'sent',
            providerId: result.id,
            segments: result.segments,
            cost: result.cost,
            'timestamps.sentAt': new Date(),
          }
        );
      }
      
      return {
        success: true,
        smsId,
        messageId: result.id,
      };
    } catch (error) {
      // Update log with error
      if (this.SMSLog) {
        await this.SMSLog.updateOne(
          { smsId },
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
   * Send via Twilio
   */
  async sendViaTwilio(to, message) {
    const result = await this.client.client.messages.create({
      body: message,
      from: this.client.from,
      to: `+${to}`,
    });
    
    return {
      id: result.sid,
      segments: result.numSegments,
      cost: parseFloat(result.price) || 0,
    };
  }
  
  /**
   * Send via Nexmo
   */
  async sendViaNexmo(to, message) {
    const axios = require('axios');
    
    const response = await axios.get('https://rest.nexmo.com/sms/json', {
      params: {
        api_key: this.client.apiKey,
        api_secret: this.client.apiSecret,
        from: this.client.from,
        to: to,
        text: message,
      },
    });
    
    const data = response.data;
    
    if (data.messages && data.messages[0].status !== '0') {
      throw new Error(data.messages[0]['error-text']);
    }
    
    return {
      id: data.messages[0]['message-id'],
      segments: 1,
      cost: 0,
    };
  }
  
  /**
   * Send via local Saudi provider
   */
  async sendViaLocal(to, message) {
    const axios = require('axios');
    
    const response = await axios.post(this.client.apiUrl, {
      userName: this.client.apiKey,
      numbers: to,
      userSender: this.client.senderName,
      msg: message,
    });
    
    return {
      id: response.data.messageId || crypto.randomBytes(8).toString('hex'),
      segments: Math.ceil(message.length / 70),
      cost: 0,
    };
  }
  
  /**
   * Send bulk SMS
   */
  async sendBulk(recipients, message, options = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.send({
          to: recipient.phone || recipient,
          message: typeof message === 'function' ? message(recipient) : message,
          type: options.type || 'notification',
          metadata: options.metadata,
        });
        
        results.push({ phone: recipient.phone || recipient, ...result });
      } catch (error) {
        results.push({
          phone: recipient.phone || recipient,
          success: false,
          error: error.message,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Send OTP
   */
  async sendOTP(phoneNumber, options = {}) {
    const { purpose = 'verification', length = smsConfig.otp.length } = options;
    
    // Generate OTP
    const otp = this.generateOTP(length);
    
    // Store OTP
    const otpKey = `${phoneNumber}:${purpose}`;
    this.otpStore.set(otpKey, {
      otp,
      attempts: 0,
      expiresAt: Date.now() + smsConfig.otp.expirySeconds * 1000,
    });
    
    // Send SMS
    const message = `رمز التحقق الخاص بك هو: ${otp}\nصالح لمدة ${smsConfig.otp.expirySeconds / 60} دقيقة`;
    
    await this.send({
      to: phoneNumber,
      message,
      type: 'otp',
      metadata: { purpose },
    });
    
    return {
      success: true,
      expiresIn: smsConfig.otp.expirySeconds,
    };
  }
  
  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber, otp, options = {}) {
    const { purpose = 'verification' } = options;
    
    const otpKey = `${phoneNumber}:${purpose}`;
    const stored = this.otpStore.get(otpKey);
    
    if (!stored) {
      return { success: false, error: 'OTP not found or expired' };
    }
    
    // Check if expired
    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(otpKey);
      return { success: false, error: 'OTP expired' };
    }
    
    // Check attempts
    if (stored.attempts >= smsConfig.otp.maxAttempts) {
      this.otpStore.delete(otpKey);
      return { success: false, error: 'Max attempts exceeded' };
    }
    
    // Verify OTP
    if (stored.otp !== otp) {
      stored.attempts++;
      return {
        success: false,
        error: 'Invalid OTP',
        attemptsRemaining: smsConfig.otp.maxAttempts - stored.attempts,
      };
    }
    
    // OTP is valid, delete it
    this.otpStore.delete(otpKey);
    
    return { success: true };
  }
  
  /**
   * Generate OTP
   */
  generateOTP(length) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }
  
  /**
   * Format phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    
    // Add country code if not present
    if (!cleaned.startsWith(smsConfig.defaults.countryCode)) {
      cleaned = smsConfig.defaults.countryCode + cleaned;
    }
    
    return cleaned;
  }
  
  /**
   * Generate SMS ID
   */
  generateSMSId() {
    return `sms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  /**
   * Get SMS statistics
   */
  async getStats(options = {}) {
    if (!this.SMSLog) return null;
    
    const { startDate, endDate, tenantId } = options;
    
    const match = {};
    if (tenantId) match['metadata.tenantId'] = tenantId;
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await this.SMSLog.aggregate([
      { $match: match },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCost: { $sum: '$cost' },
      }},
    ]);
    
    const byType = await this.SMSLog.aggregate([
      { $match: match },
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
      }},
    ]);
    
    const total = await this.SMSLog.countDocuments(match);
    
    return {
      total,
      byStatus: stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, cost: s.totalCost };
        return acc;
      }, {}),
      byType: byType.reduce((acc, t) => {
        acc[t._id] = t.count;
        return acc;
      }, {}),
    };
  }
}

// Singleton instance
const smsService = new SMSService();

/**
 * Pre-defined SMS Templates
 */
const SMSTemplates = {
  // OTP
  OTP: (otp) => `رمز التحقق: ${otp}`,
  
  // Welcome
  WELCOME: (name) => `مرحباً ${name}، تم تسجيلك في نظام الأهداف بنجاح.`,
  
  // Password Reset
  PASSWORD_RESET: (code) => `رمز إعادة تعيين كلمة المرور: ${code}`,
  
  // Leave Approval
  LEAVE_APPROVED: (date) => `تم الموافقة على طلب إجازتك بتاريخ ${date}.`,
  LEAVE_REJECTED: (date, reason) => `تم رفض طلب إجازتك بتاريخ ${date}. السبب: ${reason}`,
  
  // Salary
  SALARY_CREDITED: (amount) => `تم صرف راتبك بقيمة ${amount} ر.س.`,
  
  // Attendance
  CHECK_IN: (time) => `تم تسجيل حضورك الساعة ${time}.`,
  CHECK_OUT: (time, hours) => `تم تسجيل انصرافك الساعة ${time}. ساعات العمل: ${hours}.`,
  
  // Notification
  ALERT: (message) => `تنبيه: ${message}`,
  REMINDER: (title, date) => `تذكير: ${title} - ${date}`,
  
  // Invoice
  INVOICE_DUE: (invoiceNo, amount, dueDate) => 
    `تذكير: الفاتورة رقم ${invoiceNo} بقيمة ${amount} ر.س تستحق في ${dueDate}.`,
};

/**
 * SMS Helper Functions
 */
const sendOTP = async (phoneNumber, purpose) => {
  return smsService.sendOTP(phoneNumber, { purpose });
};

const verifyOTP = async (phoneNumber, otp, purpose) => {
  return smsService.verifyOTP(phoneNumber, otp, { purpose });
};

const sendAlert = async (phoneNumber, message) => {
  return smsService.send({
    to: phoneNumber,
    message: SMSTemplates.ALERT(message),
    type: 'alert',
  });
};

const sendReminder = async (phoneNumber, title, date) => {
  return smsService.send({
    to: phoneNumber,
    message: SMSTemplates.REMINDER(title, date),
    type: 'notification',
  });
};

module.exports = {
  SMSService,
  smsService,
  SMSTemplates,
  smsConfig,
  sendOTP,
  verifyOTP,
  sendAlert,
  sendReminder,
};