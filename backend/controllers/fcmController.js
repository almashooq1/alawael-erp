// backend/controllers/fcmController.js
// إدارة تسجيل توكنات FCM للمستخدمين
const User = require('../models/User');

const fcmController = {
  /**
   * إضافة أو تحديث توكن FCM للمستخدم الحالي
   * POST /api/fcm/register
   * body: { token: string }
   */
  registerToken: async (req, res) => {
    try {
      const userId = req.user._id;
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'FCM token is required' });
      }
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (!user.fcmTokens.includes(token)) {
        user.fcmTokens.push(token);
        await user.save();
      }
      res.status(200).json({ success: true, message: 'FCM token registered' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'Error registering FCM token', error: error.message });
    }
  },
  /**
   * حذف توكن FCM عند تسجيل الخروج
   * POST /api/fcm/unregister
   * body: { token: string }
   */
  unregisterToken: async (req, res) => {
    try {
      const userId = req.user._id;
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'FCM token is required' });
      }
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      await user.save();
      res.status(200).json({ success: true, message: 'FCM token unregistered' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'Error unregistering FCM token', error: error.message });
    }
  },
};

module.exports = fcmController;
