const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// SMS Configuration
const smsConfig = {
  provider: process.env.SMS_PROVIDER || 'twilio', // twilio, vonage, aws-sns
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  fromNumber: process.env.SMS_FROM_NUMBER || '+1234567890',
  apiKey: process.env.VONAGE_API_KEY || '',
  apiSecret: process.env.VONAGE_API_SECRET || '',
};

/**
 * Send SMS using Twilio
 * @param {string} toNumber - Phone number with country code
 * @param {string} message - SMS message
 * @returns {Promise}
 */
const sendSMS = async (toNumber, message) => {
  try {
    if (smsConfig.provider === 'twilio') {
      return await sendTwilioSMS(toNumber, message);
    } else if (smsConfig.provider === 'vonage') {
      return await sendVonageSMS(toNumber, message);
    } else {
      throw new Error(`Unknown SMS provider: ${smsConfig.provider}`);
    }
  } catch (error) {
    console.error(`❌ Error sending SMS to ${toNumber}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS using Twilio API
 */
const sendTwilioSMS = async (toNumber, message) => {
  try {
    const twilio = require('twilio');
    const client = twilio(smsConfig.accountSid, smsConfig.authToken);

    const result = await client.messages.create({
      body: message,
      from: smsConfig.fromNumber,
      to: toNumber,
    });

    console.log(`✅ SMS sent to ${toNumber}: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    throw error;
  }
};

/**
 * Send SMS using Vonage API
 */
const sendVonageSMS = async (toNumber, message) => {
  try {
    const response = await axios.post('https://rest.nexmo.com/sms/json', null, {
      params: {
        api_key: smsConfig.apiKey,
        api_secret: smsConfig.apiSecret,
        to: toNumber,
        from: 'AlawelERP',
        text: message,
      },
    });

    if (response.data.messages[0]['status'] === '0') {
      console.log(`✅ SMS sent to ${toNumber}: ${response.data.messages[0]['message-id']}`);
      return { success: true, messageId: response.data.messages[0]['message-id'] };
    } else {
      throw new Error(`Vonage error: ${response.data.messages[0]['error-text']}`);
    }
  } catch (error) {
    throw error;
  }
};

// SMS Templates
const smsTemplates = {
  verificationCode: code => `رمز التحقق الخاص بك: ${code}. صالح لمدة 10 دقائق. - نظام الأوائل ERP`,

  employeeAlert: (name, action) => `إشعار: تم ${action} بيانات الموظف ${name}. - نظام الأوائل ERP`,

  orderConfirmation: (orderId, amount) => `تم تأكيد طلبك #${orderId} بقيمة ${amount} ريال. - نظام الأوائل ERP`,

  deliveryNotification: (orderId, date) => `سيتم توصيل طلبك #${orderId} في ${date}. - نظام الأوائل ERP`,

  paymentReminder: (amount, dueDate) => `تذكير: دفعة بقيمة ${amount} ريال تستحق في ${dueDate}. - نظام الأوائل ERP`,

  securityAlert: action => `⚠️ تنبيه أمان: ${action}. إذا لم تقم بهذا الإجراء، غير كلمة المرور فوراً. - نظام الأوائل ERP`,

  courseReminder: (courseName, startDate) => `تذكير: الدورة "${courseName}" تبدأ في ${startDate}. سجل الآن! - نظام الأوائل ERP`,

  appointmentReminder: (appointmentDate, time) => `تذكير: لديك موعد في ${appointmentDate} الساعة ${time}. - نظام الأوائل ERP`,

  reportNotification: reportTitle => `التقرير "${reportTitle}" جاهز للعرض. اضغط للعرض: ${process.env.FRONTEND_URL || 'localhost:3000'}`,

  customMessage: message => message,
};

/**
 * Send SMS with template
 * @param {string} toNumber - Phone number
 * @param {string} templateName - Template name
 * @param {object} data - Template data
 * @returns {Promise}
 */
const sendSMSWithTemplate = async (toNumber, templateName, data) => {
  try {
    const template = smsTemplates[templateName];
    if (!template) {
      throw new Error(`SMS template '${templateName}' not found`);
    }

    const message = template(data);
    return await sendSMS(toNumber, message);
  } catch (error) {
    console.error(`❌ Error sending SMS to ${toNumber}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk SMS
 * @param {array} recipients - Array of phone numbers
 * @param {string} message - SMS message
 * @returns {Promise}
 */
const sendBulkSMS = async (recipients, message) => {
  const results = [];
  for (const phoneNumber of recipients) {
    const result = await sendSMS(phoneNumber, message);
    results.push({ phoneNumber, ...result });
  }
  return results;
};

/**
 * Check SMS balance (Twilio)
 * @returns {Promise}
 */
const checkSMSBalance = async () => {
  try {
    if (smsConfig.provider === 'twilio') {
      const twilio = require('twilio');
      const client = twilio(smsConfig.accountSid, smsConfig.authToken);
      const account = await client.api.accounts(smsConfig.accountSid).fetch();

      return {
        success: true,
        balance: account.balance,
        currency: account.type,
      };
    }
    return { success: false, error: 'Balance check not supported for this provider' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSMS,
  sendSMSWithTemplate,
  sendBulkSMS,
  checkSMSBalance,
  smsTemplates,
  smsConfig,
};
