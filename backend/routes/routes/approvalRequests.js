// approvalRequests.js
const express = require('express');
const router = express.Router();
const ApprovalRequestController = require('../controllers/ApprovalRequestController');
const { authenticateToken } = require('../middleware/auth');

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);

// إنشاء طلب موافقة جديد
router.post('/', ApprovalRequestController.createApprovalRequest);
// جلب طلبات المستخدم الحالي
router.get('/my', ApprovalRequestController.getMyApprovalRequests);
// جلب الطلبات المعلقة للمسؤول الحالي
router.get('/pending', ApprovalRequestController.getPendingApprovals);
// اتخاذ إجراء (موافقة/رفض) على خطوة الموافقة
router.post('/:approvalId/action', ApprovalRequestController.takeApprovalAction);

module.exports = router;
