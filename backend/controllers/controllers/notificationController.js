      /**
       * تسجيل أو تحديث FCM Token للمستخدم الحالي
       * POST /api/notifications/register-fcm
       */
      registerFcmToken: async (req, res) => {
        try {
          const { fcmToken } = req.body;
          if (!fcmToken) return res.status(400).json({ success: false, message: 'fcmToken مطلوب' });
          const user = await User.findById(req.user._id);
          if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
          if (!user.fcmTokens) user.fcmTokens = [];
          if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
            await user.save();
          }
          res.json({ success: true, message: 'تم تسجيل FCM Token بنجاح' });
        } catch (err) {
          res.status(500).json({ success: false, error: err.message });
        }
      },
    /**
     * جلب تفضيلات الإشعارات للمستخدم الحالي
     * GET /api/notifications/preferences
     */
    getNotificationPreferences: async (req, res) => {
      try {
        const user = await User.findById(req.user._id).lean();
        if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        res.json({
          success: true,
          preferences: user.notificationChannels || {},
          granular: user.notificationPreferences || {},
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    },

    /**
     * تحديث تفضيلات الإشعارات للمستخدم الحالي
     * PUT /api/notifications/preferences
     */
    updateNotificationPreferences: async (req, res) => {
      try {
        const { notificationChannels, notificationPreferences } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        if (notificationChannels) user.notificationChannels = notificationChannels;
        if (notificationPreferences) user.notificationPreferences = notificationPreferences;
        await user.save();
        res.json({ success: true, message: 'تم تحديث التفضيلات بنجاح' });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
  const { generateBarcodeBase64 } = require('../utils/barcode');
  const ArchiveService = require('../services/archiveService');
  const ESignatureService = require('../services/eSignatureService');
  /**
   * تحديد إشعار كغير مقروء
   * PUT /api/notifications/:id/unread
   */
  markAsUnread: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const notification = await Notification.findOne({ _id: id, userId });
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'الإشعار غير موجود',
        });
      }
      await notification.markAsUnread();
      res.status(200).json({
        success: true,
        message: 'تم تحديد الإشعار كغير مقروء',
        data: { notification },
      });
    } catch (error) {
      console.error('Error in markAsUnread:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديد الإشعار كغير مقروء',
        error: error.message,
      });
    }
  },
const Notification = require('../models/Notification');
const User = require('../models/User');
const NotificationAnalytics = require('../models/NotificationAnalytics');
const { generateNotificationPDF } = require('../services/pdfExportService');

/**
 * Controller لإدارة الإشعارات
 */
const notificationController = {
  /**
   * تصدير خطاب/إشعار كـ PDF مع رقم وباركود
   * GET /api/notifications/:id/export-pdf
   */
  exportNotificationPDF: async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);
      if (!notification) return res.status(404).json({ message: 'Notification not found' });

      // توليد PDF
      const pdfBuffer = await generateNotificationPDF({
        title: notification.title || 'خطاب رسمي',
        message: notification.message || '',
        serialNumber: notification.serialNumber,
        barcodeBase64: notification.barcode,
        archiveStatus: notification.archiveStatus,
        signatureStatus: notification.signatureStatus,
        stampStatus: notification.stampStatus,
      });
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=notification_${notification.serialNumber || notification._id}.pdf`,
      });
      res.send(pdfBuffer);
    } catch (err) {
      res.status(500).json({ message: 'PDF export failed', error: err.message });
    }
  },
  /**
   * الحصول على جميع إشعارات المستخدم الحالي
   * GET /api/notifications
   */
  getMyNotifications: async (req, res) => {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const userId = req.user._id;

      const query = { userId };
      if (unreadOnly === 'true') {
        query.isRead = false;
      }


      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('senderId', 'name email')
        .lean();

      // Log delivery analytics for fetched notifications (in-app)
      for (const notif of notifications) {
        await NotificationAnalytics.create({
          notificationId: notif._id,
          userId,
          event: 'delivered',
          channel: 'in-app',
          timestamp: new Date(),
        });
      }

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      res.status(200).json({
        success: true,
        message: 'تم جلب الإشعارات بنجاح',
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
          unreadCount,
        },
      });
    } catch (error) {
      console.error('Error in getMyNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الإشعارات',
        error: error.message,
      });
    }
  },

  /**
   * الحصول على عدد الإشعارات غير المقروءة
   * GET /api/notifications/unread/count
   */
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user._id;

      const count = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب عدد الإشعارات',
        error: error.message,
      });
    }
  },

  /**
   * تحديد إشعار واحد كمقروء
   * PUT /api/notifications/:id/read
   */
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const notification = await Notification.findOne({ _id: id, userId });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'الإشعار غير موجود',
        });
      }


      await notification.markAsRead();
      // Log analytics event for read
      await NotificationAnalytics.create({
        notificationId: notification._id,
        userId,
        event: 'read',
        channel: 'in-app',
        timestamp: new Date(),
      });
  /**
   * تسجيل حدث النقر على الإشعار (API endpoint)
   * POST /api/notifications/:id/click
   */
  logClickEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const notification = await Notification.findOne({ _id: id, userId });
      if (!notification) {
        return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
      }
      await NotificationAnalytics.create({
        notificationId: notification._id,
        userId,
        event: 'clicked',
        channel: 'in-app',
        timestamp: new Date(),
      });
      res.status(200).json({ success: true, message: 'تم تسجيل حدث النقر' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في تسجيل حدث النقر', error: error.message });
    }
  },

      res.status(200).json({
        success: true,
        message: 'تم تحديد الإشعار كمقروء',
        data: { notification },
      });
    } catch (error) {
      console.error('Error in markAsRead:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديد الإشعار كمقروء',
        error: error.message,
      });
    }
  },

  /**
   * تحديد جميع الإشعارات كمقروءة
   * PUT /api/notifications/read-all
   */
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user._id;

      const result = await Notification.updateMany(
        { userId, isRead: false },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        }
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديد جميع الإشعارات كمقروءة',
        data: { modifiedCount: result.modifiedCount },
      });
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديد الإشعارات كمقروءة',
        error: error.message,
      });
    }
  },

  /**
   * حذف إشعار واحد
   * DELETE /api/notifications/:id
   */
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const notification = await Notification.findOneAndDelete({ _id: id, userId });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'الإشعار غير موجود',
        });
      }

      res.status(200).json({
        success: true,
        message: 'تم حذف الإشعار بنجاح',
      });
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الإشعار',
        error: error.message,
      });
    }
  },

  /**
   * حذف جميع الإشعارات المقروءة
   * DELETE /api/notifications/read
   */
  deleteReadNotifications: async (req, res) => {
    try {
      const userId = req.user._id;

      const result = await Notification.deleteMany({
        userId,
        isRead: true,
      });

      res.status(200).json({
        success: true,
        message: 'تم حذف الإشعارات المقروءة بنجاح',
        data: { deletedCount: result.deletedCount },
      });
    } catch (error) {
      console.error('Error in deleteReadNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الإشعارات',
        error: error.message,
      });
    }
  },

  /**
   * إنشاء إشعار جديد (للإداريين فقط)
   * POST /api/notifications
   */
  createNotification: async (req, res) => {
    try {
      const { userId, title, message, type, link, priority, metadata } = req.body;
      const senderId = req.user._id;

      // التحقق من الحقول المطلوبة
      if (!userId || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'الحقول المطلوبة: userId, title, message',
        });
      }

      // التحقق من وجود المستخدم
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود',
        });
      }


      // توليد رقم تسلسلي مميز (مثال: Y2026-00000123)
      const serialNumber = `Y${new Date().getFullYear()}-${Math.floor(Math.random()*1e8).toString().padStart(8, '0')}`;
      // توليد باركود
      const barcode = generateBarcodeBase64(serialNumber);

      // إنشاء الإشعار
      const notification = await Notification.createNotification({
        userId,
        title,
        message,
        type: type || 'info',
        link,
        priority: priority || 'normal',
        metadata: metadata || {},
        senderId,
        serialNumber,
        barcode,
      });

      // إرسال عبر WebSocket
      const websocketService = require('../services/websocket.service');
      await websocketService.sendNotificationToUser(userId, notification);

      // إرسال Push Notification عبر FCM إذا كان لدى المستخدم توكنات FCM وقناة push مفعلة
      try {
        const fcmService = require('../services/fcmService');
        const user = await User.findById(userId);
        const channels = user.notificationChannels || {};
        if (user.fcmTokens && user.fcmTokens.length > 0 && (channels.push || channels.mobile)) {
          await fcmService.sendPushNotification(user.fcmTokens, {
            title: notification.title,
            body: notification.message,
            data: {
              notificationId: notification._id.toString(),
              link: notification.link || '',
              type: notification.type || '',
            },
          });
        }
      } catch (err) {
        console.error('FCM push error:', err.message);
      }


      // أرشفة الإشعار
      try {
        const archiveRes = await ArchiveService.archiveDocument({
          documentType: 'notification',
          documentId: notification._id,
          content: notification,
          meta: { userId, senderId },
        });
        notification.archiveStatus = archiveRes.success ? 'archived' : 'failed';
        notification.archiveId = archiveRes.archive?.id;
        await notification.save();
      } catch (err) {
        notification.archiveStatus = 'failed';
        await notification.save();
        console.error('Archive error:', err.message);
      }

      // توقيع إلكتروني (اختياري حسب نوع الإشعار)
      if (type === 'official' || type === 'signed') {
        try {
          const signRes = await ESignatureService.signDocument({
            documentId: notification._id,
            content: notification,
            signer: senderId,
            reason: 'إشعار رسمي/موقع',
          });
          notification.signatureStatus = signRes.success ? 'signed' : 'failed';
          notification.signatureId = signRes.signature?.id;
          await notification.save();
        } catch (err) {
          notification.signatureStatus = 'failed';
          await notification.save();
          console.error('eSignature error:', err.message);
        }
      }

      // ختم إلكتروني (اختياري حسب نوع الإشعار)
      if (type === 'stamped' || type === 'official') {
        try {
          const stampRes = await ESignatureService.stampDocument({
            documentId: notification._id,
            content: notification,
            stampType: 'official',
            meta: { userId, senderId },
          });
          notification.stampStatus = stampRes.success ? 'stamped' : 'failed';
          notification.stampId = stampRes.stamp?.id;
          await notification.save();
        } catch (err) {
          notification.stampStatus = 'failed';
          await notification.save();
          console.error('eStamp error:', err.message);
        }
      }

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الإشعار بنجاح',
        data: { notification },
      });
    } catch (error) {
      console.error('Error in createNotification:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء الإشعار',
        error: error.message,
      });
    }
  },

  /**
   * إنشاء إشعار لعدة مستخدمين (للإداريين فقط)
   * POST /api/notifications/bulk
   */
  createBulkNotifications: async (req, res) => {
    try {
      const { userIds, title, message, type, link, priority } = req.body;
      const senderId = req.user._id;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'userIds مطلوب ويجب أن يكون مصفوفة',
        });
      }

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'title و message مطلوبان',
        });
      }

      const notificationData = {
        title,
        message,
        type: type || 'info',
        link,
        priority: priority || 'normal',
        senderId,
      };

      const notifications = await Notification.createBulkNotifications(userIds, notificationData);

      // إرسال عبر WebSocket لجميع المستخدمين
      const websocketService = require('../services/websocket.service');
      await websocketService.sendBulkNotifications(userIds, notificationData);

      res.status(201).json({
        success: true,
        message: `تم إنشاء ${notifications.length} إشعار بنجاح`,
        data: { count: notifications.length },
      });
    } catch (error) {
      console.error('Error in createBulkNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء الإشعارات',
        error: error.message,
      });
    }
  },

  /**
   * حذف الإشعارات القديمة (مهمة صيانة)
   * DELETE /api/notifications/cleanup
   */
  cleanupOldNotifications: async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const result = await Notification.deleteOldNotifications(parseInt(days));

      res.status(200).json({
        success: true,
        message: `تم حذف الإشعارات القديمة (أكثر من ${days} يوم)`,
        data: { deletedCount: result.deletedCount },
      });
    } catch (error) {
      console.error('Error in cleanupOldNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الإشعارات القديمة',
        error: error.message,
      });
    }
  },
};

module.exports = notificationController;
