/**
 * ============================================
 * TWO-FACTOR AUTHENTICATION SERVICE (2FA)
 * خدمة المصادقة الثنائية
 * ============================================
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const crypto = require('crypto');

class TwoFactorAuthService {
  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  /**
   * 1️⃣ GOOGLE AUTHENTICATOR METHOD
   */

  // Generate secret for Google Authenticator
  generateGoogleAuthSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `ERP System (${userEmail})`,
      issuer: 'ERP System',
      length: 32
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url
    };
  }

  // Generate QR Code Image
  async generateQRCodeImage(otpauthUrl) {
    try {
      const qrCodeImage = await QRCode.toDataURL(otpauthUrl);
      return qrCodeImage;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  // Verify Google Authenticator Token
  verifyGoogleAuthToken(secret, token) {
    try {
      const isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
      return isValid;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * 2️⃣ SMS OTP METHOD
   */

  // Generate SMS OTP
  generateSmsOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    return {
      code: otp,
      expiresAt: expiresAt,
      hash: this.hashOTP(otp)
    };
  }

  // Send SMS OTP
  async sendSmsOTP(phoneNumber, otp) {
    try {
      const message = await this.twilioClient.messages.create({
        body: `Your ERP System verification code is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      return {
        success: true,
        messageId: message.sid
      };
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  // Verify SMS OTP
  verifySmsOTP(providedOTP, storedHash, expiresAt) {
    // Check expiration
    if (new Date() > new Date(expiresAt)) {
      return {
        valid: false,
        reason: 'OTP expired'
      };
    }

    // Verify hash
    const providedHash = this.hashOTP(providedOTP);
    if (providedHash !== storedHash) {
      return {
        valid: false,
        reason: 'Invalid OTP'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * 3️⃣ EMAIL OTP METHOD
   */

  // Generate Email OTP
  generateEmailOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    return {
      code: otp,
      expiresAt: expiresAt,
      hash: this.hashOTP(otp)
    };
  }

  // Send Email OTP
  async sendEmailOTP(email, otp, userName) {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px;">
              <h2 style="color: #333;">تحقق من هويتك</h2>
              <p style="color: #666;">مرحباً ${userName}،</p>
              <p style="color: #666;">رمز التحقق الخاص بك هو:</p>
              
              <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
              </div>
              
              <p style="color: #999; font-size: 12px;">ينتهي صلاح هذا الرمز في 10 دقائق</p>
              <p style="color: #666;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">نظام إدارة المؤسسات (ERP)</p>
            </div>
          </body>
        </html>
      `;

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'رمز التحقق - ERP System | Verification Code',
        html: htmlContent
      });

      return {
        success: true,
        message: 'OTP sent to email'
      };
    } catch (error) {
      throw new Error(`Failed to send email OTP: ${error.message}`);
    }
  }

  // Verify Email OTP
  verifyEmailOTP(providedOTP, storedHash, expiresAt) {
    // Check expiration
    if (new Date() > new Date(expiresAt)) {
      return {
        valid: false,
        reason: 'OTP expired'
      };
    }

    // Verify hash
    const providedHash = this.hashOTP(providedOTP);
    if (providedHash !== storedHash) {
      return {
        valid: false,
        reason: 'Invalid OTP'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * 4️⃣ BACKUP CODES
   */

  // Generate Backup Codes
  generateBackupCodes(count = 10) {
    const backupCodes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push({
        code: code,
        used: false,
        usedAt: null
      });
    }
    return backupCodes;
  }

  // Verify and Use Backup Code
  verifyBackupCode(backupCodes, providedCode) {
    const codeEntry = backupCodes.find(
      b => b.code === providedCode && !b.used
    );

    if (!codeEntry) {
      return {
        valid: false,
        reason: 'Invalid or already used backup code'
      };
    }

    return {
      valid: true,
      codeEntry: codeEntry
    };
  }

  /**
   * HELPER METHODS
   */

  // Hash OTP for storage
  hashOTP(otp) {
    return crypto
      .createHash('sha256')
      .update(otp + process.env.JWT_SECRET)
      .digest('hex');
  }

  // Create 2FA Setup Response
  async createSetupResponse(userEmail, method = 'google') {
    if (method === 'google') {
      const { secret, qrCode } = this.generateGoogleAuthSecret(userEmail);
      const qrCodeImage = await this.generateQRCodeImage(qrCode);
      
      return {
        method: 'google',
        secret: secret,
        qrCodeUrl: qrCodeImage,
        backupCodes: this.generateBackupCodes()
      };
    }
    
    if (method === 'sms' || method === 'email') {
      return {
        method: method,
        backupCodes: this.generateBackupCodes()
      };
    }
  }

  // Get 2FA Status
  get2FAStatus(user) {
    return {
      enabled: user.twoFactorEnabled || false,
      method: user.twoFactorMethod || null,
      backupCodesRemaining: user.backupCodes?.filter(b => !b.used).length || 0,
      lastVerified: user.lastTwoFactorVerified || null
    };
  }
}

module.exports = new TwoFactorAuthService();
