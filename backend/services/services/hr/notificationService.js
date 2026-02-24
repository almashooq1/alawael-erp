/**
 * HR Notification Service - خدمة الإشعارات المتقدمة
 * إدارة الإشعارات المتعددة القنوات للموارد البشرية
 */

const Notification = require('../models/notification.model');
const sendEmail = require('../services/emailService');
const sendSMS = require('../services/smsService');
const sendPush = require('../services/pushService');

class HRNotificationService {
  /**
   * إشعار دفع الراتب
   */
  static async notifyPayrollProcessed(employee, payrollData) {
    try {
      const message = {
        title: 'تم معالجة راتبك',
        body: `تم معالجة راتبك بنجاح للشهر ${payrollData.month}. الراتب الصافي: ${payrollData.netSalary} ريال`,
        channels: ['email', 'sms', 'in-app'],
        priority: 'high',
        type: 'PAYROLL_PROCESSED',
        data: {
          payrollId: payrollData._id,
          month: payrollData.month,
          netSalary: payrollData.netSalary,
        },
      };

      return await this.sendNotification(employee._id, message, employee);
    } catch (error) {
      throw new Error(`خطأ في إرسال إشعار الراتب: ${error.message}`);
    }
  }

  /**
   * إشعار تقييم الأداء
   */
  static async notifyPerformanceReview(employee, reviewData) {
    try {
      const message = {
        title: 'طلب تقييم أداء جديد',
        body: `لديك طلب تقييم أداء جديد من ${reviewData.reviewerName}. يرجى الرد في أقرب وقت`,
        channels: ['email', 'in-app', 'push'],
        priority: 'high',
        type: 'PERFORMANCE_REVIEW',
        data: {
          reviewId: reviewData._id,
          reviewerName: reviewData.reviewerName,
          deadline: reviewData.deadline,
        },
        actionUrl: `/hr/performance/${reviewData._id}`,
      };

      return await this.sendNotification(employee._id, message, employee);
    } catch (error) {
      throw new Error(`خطأ في إرسال إشعار التقييم: ${error.message}`);
    }
  }

  /**
   * إشعار تدريب جديد
   */
  static async notifyTrainingEnrollment(employee, trainingData) {
    try {
      const message = {
        title: 'تم تسجيلك في برنامج تدريبي',
        body: `تم تسجيلك في برنامج "${trainingData.title}". يبدأ في ${trainingData.startDate}`,
        channels: ['email', 'sms', 'in-app'],
        priority: 'normal',
        type: 'TRAINING_ENROLLMENT',
        data: {
          trainingId: trainingData._id,
          title: trainingData.title,
          startDate: trainingData.startDate,
          location: trainingData.location,
        },
        actionUrl: `/training/${trainingData._id}`,
      };

      return await this.sendNotification(employee._id, message, employee);
    } catch (error) {
      throw new Error(`خطأ في إشعار التدريب: ${error.message}`);
    }
  }

  /**
   * إشعار انتهاء العقد
   */
  static async notifyContractExpiring(employee, daysRemaining) {
    try {
      const message = {
        title: 'عقدك على وشك الانتهاء',
        body: `عقدك ينتهي في ${daysRemaining} أيام. يرجى التواصل مع إدارة الموارد البشرية`,
        channels: ['email', 'in-app', 'push'],
        priority: daysRemaining <= 7 ? 'high' : 'normal',
        type: 'CONTRACT_EXPIRING',
        data: {
          daysRemaining,
          contractEndDate: employee.employment?.contractEndDate,
        },
        actionUrl: '/hr/contracts',
      };

      return await this.sendNotification(employee._id, message, employee);
    } catch (error) {
      throw new Error(`خطأ في إشعار انتهاء العقد: ${error.message}`);
    }
  }

  /**
   * إشعار الإجازة المعتمدة
   */
  static async notifyLeaveApproved(employee, leaveData) {
    try {
      const message = {
        title: 'تم الموافقة على إجازتك',
        body: `تم الموافقة على طلب إجازتك من ${leaveData.startDate} إلى ${leaveData.endDate}`,
        channels: ['email', 'sms', 'in-app'],
        priority: 'normal',
        type: 'LEAVE_APPROVED',
        data: {
          leaveId: leaveData._id,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          leaveType: leaveData.type,
          days: leaveData.days,
        },
      };

      return await this.sendNotification(employee._id, message, employee);
    } catch (error) {
      throw new Error(`خطأ في إشعار الإجازة: ${error.message}`);
    }
  }

  /**
   * إشعار الترقية
   */
  static async notifyPromotion(employee, promotionData) {
    try {
      const message = {
        title: 'تهانينا! تم ترقيتك',
        body: `تم ترقيتك إلى منصب ${promotionData.newPosition} مع راتب جديد ${promotionData.newSalary} ريال`,
        channels: ['email', 'sms', 'in-app'],
        priority: 'high',
        type: 'PROMOTION',
        data: {
          promotionId: promotionData._id,
          newPosition: promotionData.newPosition,
          newSalary: promotionData.newSalary,
          effectiveDate: promotionData.effectiveDate,
        },
      };

      return await this.sendNotification(employee._id, message, employee);
    } catch (error) {
      throw new Error(`خطأ في إشعار الترقية: ${error.message}`);
    }
  }

  /**
   * إرسال إشعار عام
   */
  static async sendNotification(employeeId, message, employee = null) {
    try {
      const notification = new Notification({
        employeeId,
        title: message.title,
        body: message.body,
        type: message.type,
        priority: message.priority,
        channels: message.channels,
        data: message.data,
        actionUrl: message.actionUrl,
        isRead: false,
        createdAt: new Date(),
      });

      await notification.save();

      // إرسال عبر القنوات المختلفة
      const results = {};

      if (message.channels.includes('in-app')) {
        results.inApp = { success: true, timestamp: new Date() };
      }

      if (message.channels.includes('email') && employee?.email) {
        try {
          const emailResult = await sendEmail({
            to: employee.email,
            subject: message.title,
            body: message.body,
            type: message.type,
            data: message.data,
            actionUrl: message.actionUrl,
          });
          results.email = emailResult;
        } catch (err) {
          results.email = { success: false, error: err.message };
        }
      }

      if (message.channels.includes('sms') && employee?.phone) {
        try {
          const smsResult = await sendSMS({
            to: employee.phone,
            message: message.title + ': ' + message.body,
          });
          results.sms = smsResult;
        } catch (err) {
          results.sms = { success: false, error: err.message };
        }
      }

      if (message.channels.includes('push') && employee?.fcmToken) {
        try {
          const pushResult = await sendPush({
            to: employee.fcmToken,
            notification: {
              title: message.title,
              body: message.body,
            },
            data: message.data,
          });
          results.push = pushResult;
        } catch (err) {
          results.push = { success: false, error: err.message };
        }
      }

      return {
        notificationId: notification._id,
        deliveryStatus: results,
        message: 'تم إرسال الإشعار بنجاح',
      };
    } catch (error) {
      throw new Error(`خطأ في إرسال الإشعار: ${error.message}`);
    }
  }

  /**
   * جلب إشعارات الموظف
   */
  static async getEmployeeNotifications(employeeId, options = {}) {
    try {
      const { limit = 20, page = 1, unreadOnly = false } = options;

      let query = { employeeId };
      if (unreadOnly) query.isRead = false;

      const skip = (page - 1) * limit;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        employeeId,
        isRead: false,
      });

      return {
        notifications,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      throw new Error(`خطأ في جلب الإشعارات: ${error.message}`);
    }
  }

  /**
   * تعليم الإشعار كمقروء
   */
  static async markAsRead(notificationId) {
    try {
      return await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true, readAt: new Date() },
        { new: true }
      );
    } catch (error) {
      throw new Error(`خطأ في تعليم الإشعار: ${error.message}`);
    }
  }

  /**
   * تعليم جميع الإشعارات كمقروءة
   */
  static async markAllAsRead(employeeId) {
    try {
      return await Notification.updateMany(
        { employeeId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      throw new Error(`خطأ في تعليم الإشعارات: ${error.message}`);
    }
  }

  /**
   * حذف الإشعار
   */
  static async deleteNotification(notificationId) {
    try {
      return await Notification.findByIdAndDelete(notificationId);
    } catch (error) {
      throw new Error(`خطأ في حذف الإشعار: ${error.message}`);
    }
  }

  /**
   * إرسال إشعارات جماعية
   */
  static async sendBulkNotification(employeeIds, message) {
    try {
      const results = [];

      for (const empId of employeeIds) {
        try {
          const result = await this.sendNotification(empId, message);
          results.push({ employeeId: empId, success: true, ...result });
        } catch (err) {
          results.push({ employeeId: empId, success: false, error: err.message });
        }
      }

      return {
        totalSent: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    } catch (error) {
      throw new Error(`خطأ في إرسال الإشعارات الجماعية: ${error.message}`);
    }
  }

  /**
   * إعدادات تفضيلات الإشعارات
   */
  static async updateNotificationPreferences(employeeId, preferences) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { employeeId },
        {
          $set: {
            preferences: {
              emailNotifications: preferences.emailNotifications !== false,
              smsNotifications: preferences.smsNotifications !== false,
              pushNotifications: preferences.pushNotifications !== false,
              inAppNotifications: preferences.inAppNotifications !== false,
              notificationTypes: preferences.notificationTypes || {},
            },
          },
        },
        { new: true, upsert: true }
      );

      return notification;
    } catch (error) {
      throw new Error(`خطأ في تحديث التفضيلات: ${error.message}`);
    }
  }
}

module.exports = HRNotificationService;
