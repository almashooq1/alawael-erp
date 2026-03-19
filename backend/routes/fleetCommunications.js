/**
 * Fleet Communication Routes - مسارات اتصالات الأسطول
 */

const express = require('express');
const router = express.Router();
const FleetCommunicationController = require('../controllers/fleetCommunicationController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/fleet-communications
 * @desc    إنشاء رسالة جديدة
 * @access  Private
 */
router.post('/', protect, FleetCommunicationController.create);

/**
 * @route   GET /api/fleet-communications
 * @desc    جلب جميع الرسائل
 * @access  Private
 */
router.get('/', protect, FleetCommunicationController.getAll);

/**
 * @route   GET /api/fleet-communications/statistics
 * @desc    إحصائيات الاتصالات
 * @access  Private
 */
router.get('/statistics', protect, FleetCommunicationController.getStatistics);

/**
 * @route   GET /api/fleet-communications/broadcasts
 * @desc    الإعلانات العامة
 * @access  Private
 */
router.get('/broadcasts', protect, FleetCommunicationController.getBroadcasts);

/**
 * @route   GET /api/fleet-communications/sos/active
 * @desc    تنبيهات الطوارئ النشطة
 * @access  Private
 */
router.get('/sos/active', protect, FleetCommunicationController.getActiveSOS);

/**
 * @route   POST /api/fleet-communications/sos
 * @desc    إرسال تنبيه طوارئ SOS
 * @access  Private
 */
router.post('/sos', protect, FleetCommunicationController.sendSOS);

/**
 * @route   GET /api/fleet-communications/driver/:driverId/inbox
 * @desc    صندوق وارد السائق
 * @access  Private
 */
router.get('/driver/:driverId/inbox', protect, FleetCommunicationController.getDriverInbox);

/**
 * @route   GET /api/fleet-communications/:id/thread
 * @desc    سلسلة الرسائل
 * @access  Private
 */
router.get('/:id/thread', protect, FleetCommunicationController.getThread);

/**
 * @route   GET /api/fleet-communications/:id
 * @desc    جلب رسالة بالمعرف
 * @access  Private
 */
router.get('/:id', protect, FleetCommunicationController.getById);

/**
 * @route   PUT /api/fleet-communications/:id
 * @desc    تحديث رسالة
 * @access  Private
 */
router.put('/:id', protect, FleetCommunicationController.update);

/**
 * @route   DELETE /api/fleet-communications/:id
 * @desc    حذف رسالة
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', protect, authorize('admin', 'manager'), FleetCommunicationController.delete);

/**
 * @route   POST /api/fleet-communications/:id/send
 * @desc    إرسال الرسالة
 * @access  Private
 */
router.post('/:id/send', protect, FleetCommunicationController.send);

/**
 * @route   POST /api/fleet-communications/:id/read
 * @desc    تحديد كمقروء
 * @access  Private
 */
router.post('/:id/read', protect, FleetCommunicationController.markRead);

/**
 * @route   POST /api/fleet-communications/:id/acknowledge
 * @desc    تأكيد الاستلام
 * @access  Private
 */
router.post('/:id/acknowledge', protect, FleetCommunicationController.acknowledge);

/**
 * @route   POST /api/fleet-communications/:id/sos/resolve
 * @desc    حل تنبيه الطوارئ
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/sos/resolve',
  protect,
  authorize('admin', 'manager'),
  FleetCommunicationController.resolveSOS
);

/**
 * @route   POST /api/fleet-communications/:id/sos/escalate
 * @desc    تصعيد تنبيه الطوارئ
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/sos/escalate',
  protect,
  authorize('admin', 'manager'),
  FleetCommunicationController.escalateSOS
);

module.exports = router;
