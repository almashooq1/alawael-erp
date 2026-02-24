/**
 * Tenant Controller
 * متحكم الالتزام
 * 
 * REST endpoints for tenant management
 * نقاط نهاية الويب لإدارة الالتزام
 */

const { Router } = require('express');
const Logger = require('../utils/logger');
const tenantService = require('../services/tenant.service');
const tenantIsolation = require('../services/tenantIsolation.service');

const router = Router();

// ==================== TENANT CRUD ====================

/**
 * Create new tenant
 * إنشاء التزام جديد
 * 
 * POST /api/tenants
 * Body: { name, email, planType, slug, subdomain }
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, planType = 'starter', slug, subdomain } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'نام وبريد إلكتروني مطلوبان | Name and email required'
      });
    }

    // Create tenant
    const tenant = tenantService.createTenant({
      name,
      email,
      planType,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      subdomain: subdomain || slug || name.toLowerCase().replace(/\s+/g, '-'),
      createdBy: req.user?.id,
      metadata: {
        timezone: req.body.timezone || 'UTC',
        language: req.body.language || 'ar'
      }
    });

    // Initialize isolation container
    tenantIsolation.initializeTenantContainer(tenant.id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الالتزام بنجاح | Tenant created successfully',
      data: tenant
    });
  } catch (error) {
    Logger.error(`Error creating tenant: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء الالتزام | Failed to create tenant',
      error: error.message
    });
  }
});

/**
 * Get all tenants
 * الحصول على جميع الالتزامات
 * 
 * GET /api/tenants
 * Query: { status, planType, search, limit, offset }
 */
router.get('/', async (req, res) => {
  try {
    const { status, planType, search, limit = 20, offset = 0 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (planType) filters.planType = planType;
    if (search) filters.search = search;

    const tenants = tenantService.getAllTenants(filters);
    const paginated = tenants.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total: tenants.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < tenants.length
      }
    });
  } catch (error) {
    Logger.error(`Error fetching tenants: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الالتزامات | Failed to fetch tenants',
      error: error.message
    });
  }
});

/**
 * Get single tenant
 * الحصول على التزام واحد
 * 
 * GET /api/tenants/:tenantId
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const tenant = tenantService.getTenant(req.params.tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    Logger.error(`Error fetching tenant: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الالتزام | Failed to fetch tenant',
      error: error.message
    });
  }
});

/**
 * Update tenant
 * تحديث الالتزام
 * 
 * PUT /api/tenants/:tenantId
 * Body: { name, email, subdomain, metadata }
 */
router.put('/:tenantId', async (req, res) => {
  try {
    const updated = tenantService.updateTenant(req.params.tenantId, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الالتزام بنجاح | Tenant updated successfully',
      data: updated
    });
  } catch (error) {
    Logger.error(`Error updating tenant: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الالتزام | Failed to update tenant',
      error: error.message
    });
  }
});

/**
 * Delete tenant
 * حذف الالتزام
 * 
 * DELETE /api/tenants/:tenantId
 */
router.delete('/:tenantId', async (req, res) => {
  try {
    const deleted = tenantService.deleteTenant(req.params.tenantId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    // Cleanup isolation data
    tenantIsolation.cleanupTenantData(req.params.tenantId);

    res.json({
      success: true,
      message: 'تم حذف الالتزام بنجاح | Tenant deleted successfully'
    });
  } catch (error) {
    Logger.error(`Error deleting tenant: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الالتزام | Failed to delete tenant',
      error: error.message
    });
  }
});

// ==================== TENANT SUSPENSION ====================

/**
 * Suspend tenant
 * إيقاف الالتزام
 * 
 * POST /api/tenants/:tenantId/suspend
 * Body: { reason }
 */
router.post('/:tenantId/suspend', async (req, res) => {
  try {
    const suspended = tenantService.suspendTenant(
      req.params.tenantId,
      req.body.reason || 'No reason provided'
    );

    if (!suspended) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'تم إيقاف الالتزام بنجاح | Tenant suspended successfully',
      data: suspended
    });
  } catch (error) {
    Logger.error(`Error suspending tenant: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إيقاف الالتزام | Failed to suspend tenant',
      error: error.message
    });
  }
});

/**
 * Reactivate tenant
 * إعادة تنشيط الالتزام
 * 
 * POST /api/tenants/:tenantId/reactivate
 */
router.post('/:tenantId/reactivate', async (req, res) => {
  try {
    const reactivated = tenantService.reactivateTenant(req.params.tenantId);

    if (!reactivated) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'تم إعادة تنشيط الالتزام بنجاح | Tenant reactivated successfully',
      data: reactivated
    });
  } catch (error) {
    Logger.error(`Error reactivating tenant: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إعادة تنشيط الالتزام | Failed to reactivate tenant',
      error: error.message
    });
  }
});

// ==================== TENANT USERS ====================

/**
 * Add user to tenant
 * إضافة مستخدم إلى الالتزام
 * 
 * POST /api/tenants/:tenantId/users
 * Body: { userId, role }
 */
router.post('/:tenantId/users', async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب | User ID required'
      });
    }

    const added = tenantService.addUserToTenant(req.params.tenantId, userId, role);

    if (!added) {
      return res.status(400).json({
        success: false,
        message: 'فشل في إضافة المستخدم | Failed to add user'
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة المستخدم بنجاح | User added successfully',
      data: { tenantId: req.params.tenantId, userId, role }
    });
  } catch (error) {
    Logger.error(`Error adding user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إضافة المستخدم | Failed to add user',
      error: error.message
    });
  }
});

/**
 * Get tenant users
 * الحصول على مستخدمي الالتزام
 * 
 * GET /api/tenants/:tenantId/users
 */
router.get('/:tenantId/users', async (req, res) => {
  try {
    const users = tenantService.getTenantUsers(req.params.tenantId);

    if (!users) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    Logger.error(`Error fetching tenant users: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب مستخدمي الالتزام | Failed to fetch users',
      error: error.message
    });
  }
});

/**
 * Remove user from tenant
 * إزالة مستخدم من الالتزام
 * 
 * DELETE /api/tenants/:tenantId/users/:userId
 */
router.delete('/:tenantId/users/:userId', async (req, res) => {
  try {
    const removed = tenantService.removeUserFromTenant(
      req.params.tenantId,
      req.params.userId
    );

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم أو الالتزام غير موجود | User or tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'تم إزالة المستخدم بنجاح | User removed successfully'
    });
  } catch (error) {
    Logger.error(`Error removing user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إزالة المستخدم | Failed to remove user',
      error: error.message
    });
  }
});

// ==================== TENANT SETTINGS ====================

/**
 * Get tenant settings
 * الحصول على إعدادات الالتزام
 * 
 * GET /api/tenants/:tenantId/settings
 */
router.get('/:tenantId/settings', async (req, res) => {
  try {
    const settings = tenantService.getTenantSettings(req.params.tenantId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    Logger.error(`Error fetching settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإعدادات | Failed to fetch settings',
      error: error.message
    });
  }
});

/**
 * Update tenant settings
 * تحديث إعدادات الالتزام
 * 
 * PUT /api/tenants/:tenantId/settings
 * Body: { setting changes }
 */
router.put('/:tenantId/settings', async (req, res) => {
  try {
    const updated = tenantService.updateTenantSettings(
      req.params.tenantId,
      req.body
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح | Settings updated successfully',
      data: updated
    });
  } catch (error) {
    Logger.error(`Error updating settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الإعدادات | Failed to update settings',
      error: error.message
    });
  }
});

// ==================== TENANT QUOTAS ====================

/**
 * Get tenant quota
 * الحصول على حصة الالتزام
 * 
 * GET /api/tenants/:tenantId/quota
 */
router.get('/:tenantId/quota', async (req, res) => {
  try {
    const quota = tenantService.getTenantQuota(req.params.tenantId);

    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      data: quota
    });
  } catch (error) {
    Logger.error(`Error fetching quota: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الحصة | Failed to fetch quota',
      error: error.message
    });
  }
});

/**
 * Record API call
 * تسجيل استدعاء API
 * 
 * POST /api/tenants/:tenantId/api-calls
 */
router.post('/:tenantId/api-calls', async (req, res) => {
  try {
    const tenant = tenantService.getTenant(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    tenantService.recordApiCall(req.params.tenantId);

    res.json({
      success: true,
      message: 'تم تسجيل استدعاء API | API call recorded'
    });
  } catch (error) {
    Logger.error(`Error recording API call: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تسجيل استدعاء API | Failed to record API call',
      error: error.message
    });
  }
});

/**
 * Record storage usage
 * تسجيل استخدام التخزين
 * 
 * POST /api/tenants/:tenantId/storage
 * Body: { sizeGB }
 */
router.post('/:tenantId/storage', async (req, res) => {
  try {
    const { sizeGB } = req.body;

    if (sizeGB === undefined) {
      return res.status(400).json({
        success: false,
        message: 'حجم التخزين مطلوب | Storage size required'
      });
    }

    tenantService.recordStorageUsage(req.params.tenantId, sizeGB);

    res.json({
      success: true,
      message: 'تم تسجيل استخدام التخزين | Storage usage recorded',
      data: { sizeGB }
    });
  } catch (error) {
    Logger.error(`Error recording storage: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تسجيل التخزين | Failed to record storage',
      error: error.message
    });
  }
});

// ==================== TENANT PLANS ====================

/**
 * Upgrade tenant plan
 * ترقية خطة الالتزام
 * 
 * POST /api/tenants/:tenantId/upgrade
 * Body: { newPlan }
 */
router.post('/:tenantId/upgrade', async (req, res) => {
  try {
    const { newPlan } = req.body;

    if (!newPlan) {
      return res.status(400).json({
        success: false,
        message: 'الخطة الجديدة مطلوبة | New plan required'
      });
    }

    const tenant = tenantService.getTenant(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    const updated = tenantService.updateTenant(req.params.tenantId, {
      planType: newPlan,
      upgradedAt: new Date()
    });

    res.json({
      success: true,
      message: `تم ترقية الخطة إلى ${newPlan} بنجاح | Plan upgraded to ${newPlan}`,
      data: updated
    });
  } catch (error) {
    Logger.error(`Error upgrading plan: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في ترقية الخطة | Failed to upgrade plan',
      error: error.message
    });
  }
});

// ==================== TENANT ISOLATION ====================

/**
 * Get isolation report
 * الحصول على تقرير العزل
 * 
 * GET /api/tenants/:tenantId/isolation
 */
router.get('/:tenantId/isolation', async (req, res) => {
  try {
    const report = tenantIsolation.getTenantIsolationReport(req.params.tenantId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'الالتزام غير موجود | Tenant not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    Logger.error(`Error getting isolation report: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب التقرير | Failed to fetch report',
      error: error.message
    });
  }
});

// ==================== STATISTICS ====================

/**
 * Get tenant statistics
 * الحصول على إحصائيات الالتزام
 * 
 * GET /api/tenants/stats/all
 */
router.get('/stats/all', async (req, res) => {
  try {
    const tenantStats = tenantService.getStatistics();
    const isolationStats = tenantIsolation.getStatistics();

    res.json({
      success: true,
      data: {
        tenants: tenantStats,
        isolation: isolationStats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    Logger.error(`Error fetching statistics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات | Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;
