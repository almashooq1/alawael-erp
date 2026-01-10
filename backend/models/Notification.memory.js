const fs = require('fs');
const path = require('path');

// قاعدة بيانات الاشعارات
const notificationsPath = path.join(__dirname, '../data/notifications.json');

function readNotifications() {
  try {
    if (!fs.existsSync(notificationsPath)) {
      const initial = { notifications: [] };
      fs.writeFileSync(notificationsPath, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(notificationsPath, 'utf8'));
  } catch (error) {
    console.error('Error reading notifications:', error);
    return { notifications: [] };
  }
}

function writeNotifications(data) {
  try {
    fs.writeFileSync(notificationsPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing notifications:', error);
    return false;
  }
}

class Notification {
  static generateId() {
    return 'NOTIF-' + Date.now();
  }

  static create(data) {
    const data_obj = readNotifications();
    const notification = {
      _id: this.generateId(),
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type, // info, warning, error, success
      status: 'unread',
      channels: data.channels || ['in-app'], // in-app, email, sms
      recipient: data.recipient,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    data_obj.notifications.push(notification);
    writeNotifications(data_obj);
    return notification;
  }

  static findByUserId(userId) {
    const data = readNotifications();
    return data.notifications.filter(n => n.userId === userId);
  }

  static markAsRead(notifId) {
    const data = readNotifications();
    const notif = data.notifications.find(n => n._id === notifId);
    if (notif) {
      notif.status = 'read';
      notif.readAt = new Date().toISOString();
    }
    writeNotifications(data);
    return notif;
  }

  static getUnreadCount(userId) {
    const data = readNotifications();
    return data.notifications.filter(n => n.userId === userId && n.status === 'unread').length;
  }
}

// ==================== EMAIL SERVICE ====================

// في بيئة الإنتاج، استخدم nodemailer أو SendGrid
class EmailService {
  static async sendWelcomeEmail(user) {
    // محاكاة إرسال بريد ترحيبي
    const notification = Notification.create({
      userId: user._id,
      title: 'أهلاً وسهلاً',
      message: `مرحباً ${user.fullName}، تم تسجيلك بنجاح`,
      type: 'success',
      channels: ['in-app', 'email'],
      recipient: user.email,
    });
    return notification;
  }

  static async sendPasswordReset(user, resetLink) {
    const notification = Notification.create({
      userId: user._id,
      title: 'إعادة تعيين كلمة المرور',
      message: `اضغط على الرابط لإعادة تعيين كلمة مرورك: ${resetLink}`,
      type: 'info',
      channels: ['email'],
      recipient: user.email,
    });
    return notification;
  }

  static async sendLeaveApproval(employee, leave) {
    const message =
      leave.status === 'approved' ? `تم الموافقة على طلب إجازتك من ${leave.fromDate} إلى ${leave.toDate}` : `تم رفض طلب إجازتك`;

    const notification = Notification.create({
      userId: employee._id,
      title: 'حالة طلب الإجازة',
      message: message,
      type: leave.status === 'approved' ? 'success' : 'error',
      channels: ['in-app', 'email'],
      recipient: employee.email,
    });
    return notification;
  }

  static async sendAttendanceReminder(employee) {
    const notification = Notification.create({
      userId: employee._id,
      title: 'تذكير بتسجيل الحضور',
      message: 'لم تقم بتسجيل حضورك اليوم. يرجى تسجيل حضورك الآن.',
      type: 'warning',
      channels: ['in-app', 'sms'],
      recipient: employee.phone || employee.email,
    });
    return notification;
  }
}

// ==================== SMS SERVICE ====================

class SMSService {
  static async sendOTP(phone, otp) {
    // محاكاة إرسال رمز التحقق
    console.log(`📱 OTP للرقم ${phone}: ${otp}`);
    return {
      success: true,
      message: `تم إرسال الرمز إلى ${phone}`,
      code: otp,
    };
  }

  static async sendBulkSMS(recipients, message) {
    // إرسال رسالة جماعية
    const results = recipients.map(recipient => ({
      recipient,
      status: 'sent',
      timestamp: new Date().toISOString(),
    }));
    return results;
  }

  static async sendAttendanceAlert(phone, employeeName) {
    const message = `${employeeName}، لم تسجل حضورك اليوم. يرجى التسجيل فوراً.`;
    console.log(`📱 SMS إلى ${phone}: ${message}`);
    return { success: true };
  }
}

// ==================== PUSH NOTIFICATIONS ====================

class PushNotificationService {
  static async sendPushNotification(userId, title, body, data = {}) {
    // محاكاة إرسال إشعار فوري
    const notification = Notification.create({
      userId,
      title,
      message: body,
      type: data.type || 'info',
      channels: ['in-app'],
      ...data,
    });
    return notification;
  }

  static async sendToMultiple(userIds, title, body, data = {}) {
    const notifications = userIds.map(userId => this.sendPushNotification(userId, title, body, data));
    return notifications;
  }
}

// ==================== NOTIFICATION PREFERENCES ====================

class NotificationPreferences {
  static generateId() {
    return 'PREF-' + Date.now();
  }

  static create(userId, preferences) {
    const pref = {
      _id: this.generateId(),
      userId,
      emailNotifications: preferences.emailNotifications !== false,
      smsNotifications: preferences.smsNotifications || false,
      pushNotifications: preferences.pushNotifications !== false,
      leaveUpdates: preferences.leaveUpdates !== false,
      attendanceReminders: preferences.attendanceReminders !== false,
      newHireAlerts: preferences.newHireAlerts !== false,
      expenseApprovals: preferences.expenseApprovals !== false,
      quietHours: preferences.quietHours || null, // { start: '22:00', end: '08:00' }
      createdAt: new Date().toISOString(),
    };
    return pref;
  }
}

module.exports = {
  Notification,
  EmailService,
  SMSService,
  PushNotificationService,
  NotificationPreferences,
  readNotifications,
  writeNotifications,
};
