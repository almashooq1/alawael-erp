/**
 * ZKTeco Device Routes - مسارات API لإدارة أجهزة ZKTeco
 * إدارة الأجهزة، المزامنة، ربط المستخدمين
 */

const express = require('express');
const router = express.Router();
const ZKTecoService = require('../services/hr/zktecoService');
const { safeError } = require('../utils/safeError');
const {
  authenticateToken: authMiddleware,
  requireRole: roleMiddleware,
} = require('../middleware/auth');

// جميع المسارات تتطلب تسجيل الدخول
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════════════════════
//  إدارة الأجهزة (Device Management) — CRUD
// ════════════════════════════════════════════════════════════════════════════════

/**
 * الحصول على جميع الأجهزة
 * GET /api/zkteco/devices
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await ZKTecoService.getAllDevices();
    res.json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأجهزة',
      error: safeError(error),
    });
  }
});

/**
 * الحصول على إحصائيات الأجهزة
 * GET /api/zkteco/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await ZKTecoService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: safeError(error),
    });
  }
});

/**
 * الحصول على جهاز بالمعرف
 * GET /api/zkteco/devices/:id
 */
router.get('/devices/:id', async (req, res) => {
  try {
    const device = await ZKTecoService.getDevice(req.params.id);
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * إضافة جهاز جديد
 * POST /api/zkteco/devices
 */
router.post('/devices', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const device = await ZKTecoService.addDevice(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'تم إضافة الجهاز بنجاح',
      data: device,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * تعديل جهاز
 * PUT /api/zkteco/devices/:id
 */
router.put('/devices/:id', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const device = await ZKTecoService.updateDevice(req.params.id, req.body, req.user.id);
    res.json({
      success: true,
      message: 'تم تحديث الجهاز بنجاح',
      data: device,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * حذف جهاز
 * DELETE /api/zkteco/devices/:id
 */
router.delete('/devices/:id', roleMiddleware('admin'), async (req, res) => {
  try {
    await ZKTecoService.deleteDevice(req.params.id);
    res.json({
      success: true,
      message: 'تم حذف الجهاز بنجاح',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  الاتصال بالأجهزة (Connection Management)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * الاتصال بجهاز
 * POST /api/zkteco/devices/:id/connect
 */
router.post('/devices/:id/connect', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const result = await ZKTecoService.connectDevice(req.params.id);
    res.json({
      success: true,
      message: 'تم الاتصال بالجهاز بنجاح',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * قطع الاتصال عن جهاز
 * POST /api/zkteco/devices/:id/disconnect
 */
router.post('/devices/:id/disconnect', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    await ZKTecoService.disconnectDevice(req.params.id);
    res.json({
      success: true,
      message: 'تم قطع الاتصال',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * اختبار الاتصال بعنوان IP
 * POST /api/zkteco/test-connection
 */
router.post('/test-connection', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const { ipAddress, port } = req.body;
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'عنوان IP مطلوب' });
    }
    const result = await ZKTecoService.testConnection(ipAddress, port || 4370);
    res.json({ success: result.success, ...result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * جلب الوقت من الجهاز
 * GET /api/zkteco/devices/:id/time
 */
router.get('/devices/:id/time', async (req, res) => {
  try {
    const time = await ZKTecoService.getDeviceTime(req.params.id);
    res.json({ success: true, data: time });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  المزامنة (Synchronization)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * مزامنة سجلات الحضور من جهاز محدد
 * POST /api/zkteco/devices/:id/sync
 */
router.post('/devices/:id/sync', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const result = await ZKTecoService.syncAttendanceLogs(req.params.id, 'manual', req.user.id);
    res.json({
      success: true,
      message:
        result.status === 'success'
          ? 'تمت المزامنة بنجاح'
          : result.status === 'partial'
            ? 'تمت المزامنة جزئياً'
            : 'فشلت المزامنة',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * مزامنة جميع الأجهزة
 * POST /api/zkteco/sync-all
 */
router.post('/sync-all', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const results = await ZKTecoService.syncAllDevices(req.user.id);
    const successCount = results.filter(r => r.status === 'success').length;
    res.json({
      success: true,
      message: `تمت المزامنة: ${successCount}/${results.length} جهاز`,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * جلب سجلات المزامنة لجهاز
 * GET /api/zkteco/devices/:id/sync-history
 */
router.get('/devices/:id/sync-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await ZKTecoService.getSyncHistory(req.params.id, limit);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * تفعيل/تعطيل المزامنة التلقائية
 * POST /api/zkteco/devices/:id/auto-sync
 */
router.post('/devices/:id/auto-sync', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const { enabled, interval } = req.body;
    const result = await ZKTecoService.toggleAutoSync(req.params.id, enabled, interval);
    res.json({
      success: true,
      message: enabled ? 'تم تفعيل المزامنة التلقائية' : 'تم تعطيل المزامنة التلقائية',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  إدارة مستخدمي الجهاز (Device Users)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * جلب مستخدمي الجهاز
 * GET /api/zkteco/devices/:id/users
 */
router.get('/devices/:id/users', async (req, res) => {
  try {
    const users = await ZKTecoService.getDeviceUsers(req.params.id);
    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

/**
 * ربط مستخدم الجهاز بموظف
 * POST /api/zkteco/devices/:id/users/:userId/map
 */
router.post(
  '/devices/:id/users/:userId/map',
  roleMiddleware('admin', 'hr_manager'),
  async (req, res) => {
    try {
      const result = await ZKTecoService.mapDeviceUser(
        req.params.id,
        parseInt(req.params.userId),
        req.body
      );
      res.json({
        success: true,
        message: 'تم ربط المستخدم بالموظف بنجاح',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: safeError(error),
      });
    }
  }
);

/**
 * إلغاء ربط مستخدم
 * DELETE /api/zkteco/devices/:id/users/:userId/map
 */
router.delete(
  '/devices/:id/users/:userId/map',
  roleMiddleware('admin', 'hr_manager'),
  async (req, res) => {
    try {
      const result = await ZKTecoService.unmapDeviceUser(
        req.params.id,
        parseInt(req.params.userId)
      );
      res.json({
        success: true,
        message: 'تم إلغاء ربط المستخدم',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: safeError(error),
      });
    }
  }
);

/**
 * جلب سجلات الحضور الخام من الجهاز
 * GET /api/zkteco/devices/:id/raw-logs
 */
router.get('/devices/:id/raw-logs', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const logs = await ZKTecoService.getRawAttendanceLogs(req.params.id, { fromDate, toDate });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: safeError(error),
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  مراقبة الصحة (Health Monitoring)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * فحص صحة الاتصالات النشطة
 * POST /api/zkteco/health-check
 */
router.post('/health-check', roleMiddleware('admin', 'hr_manager'), async (req, res) => {
  try {
    const results = await ZKTecoService.healthCheck();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: safeError(error) });
  }
});

/**
 * حالة الاتصالات الحالية
 * GET /api/zkteco/connections
 */
router.get('/connections', async (req, res) => {
  try {
    const status = ZKTecoService.getConnectionsStatus();
    res.json({ success: true, data: status, count: status.length });
  } catch (error) {
    res.status(500).json({ success: false, message: safeError(error) });
  }
});

/**
 * إحصائيات مفصلة مع صحة الاتصالات
 * GET /api/zkteco/detailed-stats
 */
router.get('/detailed-stats', async (req, res) => {
  try {
    const stats = await ZKTecoService.getDetailedStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: safeError(error) });
  }
});

module.exports = router;
