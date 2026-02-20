/**
 * مسارات التعاون في الوقت الفعلي
 * Real-Time Collaboration Routes
 */

const express = require('express');
const router = express.Router();
const RealtimeCollaborationController = require('../controllers/realtimeCollaboration.controller');
const { protect, authorize } = require('../middleware/auth');

// جميع المسارات تتطلب المصادقة
router.use(protect);

// ========== إدارة جلسات التعاون ==========

/**
 * @route   POST /api/collaboration/sessions
 * @desc    إنشاء جلسة تعاون جديدة
 * @access  Private
 */
router.post('/sessions', RealtimeCollaborationController.createSession);

/**
 * @route   POST /api/collaboration/sessions/:sessionId/join
 * @desc    الانضمام إلى جلسة تعاون
 * @access  Private
 */
router.post('/sessions/:sessionId/join', RealtimeCollaborationController.joinSession);

/**
 * @route   POST /api/collaboration/sessions/:sessionId/leave
 * @desc    مغادرة جلسة التعاون
 * @access  Private
 */
router.post('/sessions/:sessionId/leave', RealtimeCollaborationController.leaveSession);

// ========== إدارة التغييرات ==========

/**
 * @route   POST /api/collaboration/sessions/:sessionId/changes
 * @desc    تطبيق تغيير على المستند
 * @access  Private
 */
router.post('/sessions/:sessionId/changes', RealtimeCollaborationController.applyChange);

/**
 * @route   POST /api/collaboration/sessions/:sessionId/undo
 * @desc    التراجع عن التغيير الأخير
 * @access  Private
 */
router.post('/sessions/:sessionId/undo', RealtimeCollaborationController.undo);

/**
 * @route   POST /api/collaboration/sessions/:sessionId/redo
 * @desc    إعادة التغيير المتراجع عنه
 * @access  Private
 */
router.post('/sessions/:sessionId/redo', RealtimeCollaborationController.redo);

// ========== إدارة الموضع والحضور ==========

/**
 * @route   PATCH /api/collaboration/sessions/:sessionId/presence
 * @desc    تحديث موضع المؤشر والتحديد
 * @access  Private
 */
router.patch('/sessions/:sessionId/presence', RealtimeCollaborationController.updatePresence);

/**
 * @route   PATCH /api/collaboration/sessions/:sessionId/typing
 * @desc    تحديث حالة الكتابة
 * @access  Private
 */
router.patch('/sessions/:sessionId/typing', RealtimeCollaborationController.updateTypingStatus);

/**
 * @route   GET /api/collaboration/sessions/:sessionId/users
 * @desc    الحصول على جميع المستخدمين النشطين
 * @access  Private
 */
router.get('/sessions/:sessionId/users', RealtimeCollaborationController.getActiveUsers);

// ========== إدارة التعليقات ==========

/**
 * @route   POST /api/collaboration/sessions/:sessionId/comments
 * @desc    إضافة تعليق على المستند
 * @access  Private
 */
router.post('/sessions/:sessionId/comments', RealtimeCollaborationController.addComment);

/**
 * @route   POST /api/collaboration/comments/:commentId/replies
 * @desc    الرد على تعليق
 * @access  Private
 */
router.post('/comments/:commentId/replies', RealtimeCollaborationController.replyToComment);

// ========== الإحصائيات والتصدير ==========

/**
 * @route   GET /api/collaboration/sessions/:sessionId/snapshot
 * @desc    الحصول على نسخة المستند عند نقطة زمنية معينة
 * @access  Private
 */
router.get('/sessions/:sessionId/snapshot', RealtimeCollaborationController.getDocumentSnapshot);

/**
 * @route   GET /api/collaboration/sessions/:sessionId/stats
 * @desc    الحصول على إحصائيات الجلسة
 * @access  Private
 */
router.get('/sessions/:sessionId/stats', RealtimeCollaborationController.getSessionStats);

/**
 * @route   GET /api/collaboration/sessions/:sessionId/export
 * @desc    تصدير سجل التغييرات
 * @access  Private
 */
router.get('/sessions/:sessionId/export', RealtimeCollaborationController.exportChangeHistory);

module.exports = router;
