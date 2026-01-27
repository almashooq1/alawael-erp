import express from 'express';
import { NotificationCenter } from '../src/modules/notification-center';
const router = express.Router();

const center = new NotificationCenter();

// قائمة الإشعارات
router.get('/list', (req, res) => {
  const userId = req.query.userId as string | undefined;
  res.json(center.listNotifications(userId));
});

// إضافة إشعار يدوي
router.post('/add', (req, res) => {
  const { userId, title, message, channel } = req.body;
  if (!userId || !title || !message || !channel) return res.status(400).json({ error: 'بيانات ناقصة' });
  const notif = center.sendNotification({ userId, title, message, channel });
  res.json(notif);
});

export default router;
