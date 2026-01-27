"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_center_1 = require("../src/modules/notification-center");
const router = express_1.default.Router();
const center = new notification_center_1.NotificationCenter();
// قائمة الإشعارات
router.get('/list', (req, res) => {
    const userId = req.query.userId;
    res.json(center.listNotifications(userId));
});
// إضافة إشعار يدوي
router.post('/add', (req, res) => {
    const { userId, title, message, channel } = req.body;
    if (!userId || !title || !message || !channel)
        return res.status(400).json({ error: 'بيانات ناقصة' });
    const notif = center.sendNotification({ userId, title, message, channel });
    res.json(notif);
});
exports.default = router;
