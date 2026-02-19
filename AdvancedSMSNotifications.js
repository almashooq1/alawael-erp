# 📱 نظام إشعارات SMS متقدم - نظام الفوترة الذكية

/**
 * Advanced SMS Notification System
 * نظام الإشعارات عبر الرسائل النصية
 * 
 * الميزات:
 *  - إرسال تذكيرات الدفع التلقائية
 *  - إشعارات الفواتير الجديدة
 *  - تنبيهات الفواتير المتأخرة
 *  - رسائل تأكيد الدفع
 *  - إشعارات مخصصة وذكية
 *  - جدولة الرسائل
 *  - تتبع الرسائل المرسلة
 */

const mongoose = require('mongoose');
const twilio = require('twilio'); // مكتبة Twilio للـ SMS
const SmartInvoice = require('./SmartInvoice');

// ============================================
// نموذج تخزين الإشعارات
// ============================================
const smsNotificationSchema = new mongoose.Schema({
  // معرف فريد
  _id: mongoose.Schema.Types.ObjectId,
  
  // معرف الفاتورة
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SmartInvoice'
  },
  
  // بيانات المستقبل
  recipient: {
    customerId: String,
    customerName: String,
    phoneNumber: {
      type: String,
      required: true
    },
    email: String
  },
  
  // نوع الإشعار
  notificationType: {
    type: String,
    enum: [
      'new_invoice',           // فاتورة جديدة
      'payment_reminder',      // تذكير الدفع
      'due_soon',             // موعد الاستحقاق قريب
      'overdue_alert',        // فاتورة متأخرة
      'payment_confirmation', // تأكيد الدفع
      'payment_failed',       // فشل الدفع
      'discount_available',   // خصم متاح
      'custom_message'        // رسالة مخصصة
    ],
    required: true
  },
  
  // محتوى الرسالة
  message: {
    template: String, // اسم القالب
    subject: String,
    body: String,
    variables: mongoose.Schema.Types.Mixed // متغيرات القالب
  },
  
  // حالة الإرسال
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  
  // معلومات الإرسال
  sendingInfo: {
    sentAt: Date,
    deliveredAt: Date,
    failedAt: Date,
    failureReason: String,
    messageId: String, // معرف الرسالة من Twilio
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    }
  },
  
  // الجدولة
  scheduling: {
    scheduledTime: Date,
    timezone: String,
    recurring: {
      isRecurring: Boolean,
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      endDate: Date
    }
  },
  
  // الأولوية
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // الاستجابة والتتبع
  tracking: {
    opened: Boolean,
    openedAt: Date,
    clicked: Boolean,
    clickedAt: Date,
    replied: Boolean,
    repliedAt: Date,
    replyMessage: String
  },
  
  // التحليليات
  analytics: {
    deliveryStatus: String, // 'delivered', 'failed', 'pending'
    costsInCents: Number, // تكلفة الرسالة بالسنتات
    responseRate: Number // معدل الاستجابة %
  },
  
  // بيانات إضافية
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const SMSNotification = mongoose.model('SMSNotification', smsNotificationSchema);

// ============================================
// قوالب الرسائل
// ============================================
const messageTemplates = {
  new_invoice: {
    template: 'new_invoice',
    subject: 'فاتورة جديدة',
    body: 'السلام عليكم {{customerName}}، تم إرسال فاتورة جديدة برقم {{invoiceNumber}} بقيمة {{amount}} SAR. الموعد النهائي: {{dueDate}}'
  },
  payment_reminder: {
    template: 'payment_reminder',
    subject: 'تذكير الدفع',
    body: 'تنبيه: هناك فاتورة قيد الانتظار برقم {{invoiceNumber}} بقيمة {{amount}} SAR. برجاء التسديد في أقرب وقت.'
  },
  due_soon: {
    template: 'due_soon',
    subject: 'موعد استحقاق قريب',
    body: 'انتبه: فاتورة رقم {{invoiceNumber}} ستستحق في {{daysLeft}} أيام. المبلغ: {{amount}} SAR'
  },
  overdue_alert: {
    template: 'overdue_alert',
    subject: 'فاتورة متأخرة',
    body: 'تحذير: فاتورة رقم {{invoiceNumber}} متأخرة عن الدفع بـ {{daysOverdue}} أيام. المبلغ المستحق: {{amount}} SAR'
  },
  payment_confirmation: {
    template: 'payment_confirmation',
    subject: 'تأكيد الدفع',
    body: 'تم استلام دفعتك بنجاح! المبلغ: {{amount}} SAR للفاتورة {{invoiceNumber}}. شكراً {{customerName}}'
  },
  payment_failed: {
    template: 'payment_failed',
    subject: 'فشل الدفع',
    body: 'محاولة الدفع فشلت. برجاء إعادة المحاولة أو التواصل معنا. الفاتورة: {{invoiceNumber}}'
  },
  discount_available: {
    template: 'discount_available',
    subject: 'خصم متاح',
    body: 'عرض حصري! احصل على {{discountPercent}}% خصم على الفاتورة {{invoiceNumber}} إذا دفعت قبل {{discountDate}}'
  },
  custom_message: {
    template: 'custom_message',
    subject: 'رسالة من النظام',
    body: '{{customMessage}}'
  }
};

// ============================================
// خدمة الإشعارات المتقدمة
// ============================================
class AdvancedSMSService {
  /**
   * تهيئة عميل Twilio
   */
  static initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioClient = twilio(accountSid, authToken);
    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  /**
   * إرسال إشعار فاتورة جديدة
   */
  static async sendNewInvoiceNotification(invoiceId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);
      
      if (!invoice || !invoice.customer.phone) {
        throw new Error('لا توجد فاتورة أو رقم هاتف');
      }

      const message = this.replaceVariables(messageTemplates.new_invoice, {
        customerName: invoice.customer.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        dueDate: invoice.dueDate.toLocaleDateString('ar-SA')
      });

      const notification = await this.sendSMS(
        invoice.customer.phone,
        message.body,
        'new_invoice',
        invoiceId,
        invoice.customer
      );

      return notification;
    } catch (error) {
      console.error('❌ خطأ إرسال إشعار فاتورة جديدة:', error);
      throw error;
    }
  }

  /**
   * إرسال تذكير الدفع
   */
  static async sendPaymentReminder(invoiceId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);
      
      if (!invoice || !invoice.customer.phone) {
        throw new Error('لا توجد فاتورة أو رقم هاتف');
      }

      const remainingBalance = invoice.totalAmount - (invoice.paidAmount || 0);
      
      if (remainingBalance <= 0) {
        return; // لا ترسل تذكير للفواتير المدفوعة
      }

      const message = this.replaceVariables(messageTemplates.payment_reminder, {
        invoiceNumber: invoice.invoiceNumber,
        amount: remainingBalance
      });

      const notification = await this.sendSMS(
        invoice.customer.phone,
        message.body,
        'payment_reminder',
        invoiceId,
        invoice.customer
      );

      return notification;
    } catch (error) {
      console.error('❌ خطأ إرسال تذكير الدفع:', error);
      throw error;
    }
  }

  /**
   * إرسال تنبيه الفاتورة المتأخرة
   */
  static async sendOverdueAlert(invoiceId) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);
      
      if (!invoice || !invoice.customer.phone) {
        throw new Error('لا توجد فاتورة أو رقم هاتف');
      }

      if (!invoice.isOverdue) {
        return; // الفاتورة ليست متأخرة
      }

      const daysOverdue = Math.floor(
        (new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)
      );

      const message = this.replaceVariables(messageTemplates.overdue_alert, {
        invoiceNumber: invoice.invoiceNumber,
        daysOverdue: daysOverdue,
        amount: invoice.totalAmount - (invoice.paidAmount || 0)
      });

      const notification = await this.sendSMS(
        invoice.customer.phone,
        message.body,
        'overdue_alert',
        invoiceId,
        invoice.customer,
        'urgent' // أولوية عالية للمتأخرات
      );

      return notification;
    } catch (error) {
      console.error('❌ خطأ إرسال تنبيه متأخر:', error);
      throw error;
    }
  }

  /**
   * إرسال تأكيد الدفع
   */
  static async sendPaymentConfirmation(invoiceId, paymentAmount) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);
      
      if (!invoice || !invoice.customer.phone) {
        throw new Error('لا توجد فاتورة أو رقم هاتف');
      }

      const message = this.replaceVariables(messageTemplates.payment_confirmation, {
        amount: paymentAmount,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name
      });

      const notification = await this.sendSMS(
        invoice.customer.phone,
        message.body,
        'payment_confirmation',
        invoiceId,
        invoice.customer
      );

      return notification;
    } catch (error) {
      console.error('❌ خطأ إرسال تأكيد الدفع:', error);
      throw error;
    }
  }

  /**
   * إرسال رسالة مخصصة
   */
  static async sendCustomMessage(phoneNumber, customMessage, invoiceId = null) {
    try {
      const notification = await this.sendSMS(
        phoneNumber,
        customMessage,
        'custom_message',
        invoiceId
      );

      return notification;
    } catch (error) {
      console.error('❌ خطأ إرسال رسالة مخصصة:', error);
      throw error;
    }
  }

  /**
   * الدالة الأساسية لإرسال SMS
   */
  static async sendSMS(phoneNumber, message, notificationType, invoiceId, customer = {}, priority = 'normal') {
    try {
      // صياغة الرقم بصيغة صحيحة
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // إرسال عبر Twilio
      const smsMessage = await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to: formattedPhone
      });

      // حفظ في قاعدة البيانات
      const notification = new SMSNotification({
        invoiceId: invoiceId,
        recipient: {
          customerId: customer._id || 'unknown',
          customerName: customer.name || 'Unknown',
          phoneNumber: formattedPhone,
          email: customer.email
        },
        notificationType,
        message: {
          template: notificationType,
          body: message
        },
        status: 'sent',
        priority,
        sendingInfo: {
          sentAt: new Date(),
          messageId: smsMessage.sid,
          attempts: 1
        },
        analytics: {
          deliveryStatus: 'pending',
          costsInCents: 50 // تقديري (حسب Twilio)
        }
      });

      await notification.save();

      console.log(`✅ تم إرسال SMS إلى ${formattedPhone}: ${smsMessage.sid}`);
      return notification;
    } catch (error) {
      console.error('❌ خطأ إرسال SMS:', error.message);
      throw error;
    }
  }

  /**
   * جدولة الإشعارات
   */
  static async scheduleNotification(invoiceId, notificationType, scheduledTime, recurring = null) {
    try {
      const invoice = await SmartInvoice.findById(invoiceId);
      
      const notification = new SMSNotification({
        invoiceId,
        recipient: {
          customerId: invoice.customer._id,
          customerName: invoice.customer.name,
          phoneNumber: invoice.customer.phone
        },
        notificationType,
        message: messageTemplates[notificationType],
        status: 'scheduled',
        scheduling: {
          scheduledTime,
          timezone: process.env.TIMEZONE || 'Asia/Riyadh',
          recurring
        }
      });

      await notification.save();

      console.log(`✅ تم جدولة الإشعار للوقت: ${scheduledTime}`);
      return notification;
    } catch (error) {
      console.error('❌ خطأ جدولة الإشعار:', error);
      throw error;
    }
  }

  /**
   * معالجة الإشعارات المجدولة
   */
  static async processScheduledNotifications() {
    try {
      const now = new Date();
      
      const scheduledNotifications = await SMSNotification.find({
        status: 'scheduled',
        'scheduling.scheduledTime': { $lte: now }
      });

      for (let notification of scheduledNotifications) {
        // إرسال الإشعار
        const invoice = await SmartInvoice.findById(notification.invoiceId);
        
        const message = this.replaceVariables(notification.message, {
          customerName: notification.recipient.customerName,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          dueDate: invoice.dueDate.toLocaleDateString('ar-SA')
        });

        await this.sendSMS(
          notification.recipient.phoneNumber,
          message.body,
          notification.notificationType,
          notification.invoiceId
        );

        // تحديث الحالة
        notification.status = 'sent';
        notification.sendingInfo.sentAt = now;
        await notification.save();

        console.log(`✅ تم إرسال الإشعار المجدول: ${notification._id}`);
      }

      return scheduledNotifications.length;
    } catch (error) {
      console.error('❌ خطأ معالجة الإشعارات المجدولة:', error);
      throw error;
    }
  }

  /**
   * استبدال المتغيرات في الرسالة
   */
  static replaceVariables(template, variables) {
    let body = template.body;
    
    for (let [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, value);
    }

    return {
      ...template,
      body
    };
  }

  /**
   * صياغة الرقم بشكل صحيح
   */
  static formatPhoneNumber(phoneNumber) {
    // إزالة الأحرف غير الرقمية
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // إزالة الأصفار الأمامية
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // إضافة كود الدول (+966 للسعودية)
    if (!cleaned.startsWith('+966')) {
      cleaned = '+966' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * جلب سجل الإشعارات
   */
  static async getNotificationHistory(invoiceId, limit = 50) {
    try {
      const notifications = await SMSNotification.find({ invoiceId })
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return notifications;
    } catch (error) {
      console.error('❌ خطأ جلب السجل:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الإشعارات
   */
  static async getNotificationStats(startDate, endDate) {
    try {
      const stats = await SMSNotification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        totalSent: stats.reduce((sum, s) => sum + s.count, 0),
        delivered: stats.find(s => s._id === 'delivered')?.count || 0,
        failed: stats.find(s => s._id === 'failed')?.count || 0,
        pending: stats.find(s => s._id === 'pending')?.count || 0,
        scheduled: stats.find(s => s._id === 'scheduled')?.count || 0
      };
    } catch (error) {
      console.error('❌ خطأ جلب الإحصائيات:', error);
      throw error;
    }
  }
}

// ============================================
// تصدير
// ============================================
module.exports = {
  SMSNotification,
  AdvancedSMSService,
  messageTemplates
};
