/**
 * Tenant Routes
 * مسارات الالتزام
 * 
 * API Routes for multi-tenant support
 * مسارات API لدعم متعدد الالتزام
 */

const express = require('express');
const tenantController = require('../controllers/tenant.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * POST /api/tenants
 * Create new tenant
 * 
 * Required body:
 * {
 *   "name": "Company Name",
 *   "email": "admin@company.com",
 *   "planType": "starter|professional|enterprise",
 *   "slug": "company-slug",
 *   "subdomain": "company",
 *   "timezone": "UTC",
 *   "language": "ar"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": { tenant object }
 * }
 */
router.post('/', tenantController.post('/'));

// ==================== PROTECTED ROUTES ====================

/**
 * GET /api/tenants
 * Get all tenants
 * Query params: status, planType, search, limit, offset
 * Auth: Required
 */
router.get('/', authenticateToken, tenantController.get('/'));

/**
 * GET /api/tenants/:tenantId
 * Get single tenant
 * Auth: Required
 */
router.get('/:tenantId', authenticateToken, tenantController.get('/:tenantId'));

/**
 * PUT /api/tenants/:tenantId
 * Update tenant
 * 
 * Body:
 * {
 *   "name": "New Name",
 *   "email": "newemail@company.com",
 *   "subdomain": "new-subdomain",
 *   "metadata": { custom properties }
 * }
 * 
 * Auth: Required (Owner or Admin)
 */
router.put('/:tenantId', authenticateToken, tenantController.put('/:tenantId'));

/**
 * DELETE /api/tenants/:tenantId
 * Delete tenant (soft delete to archive)
 * Auth: Required (Owner or Admin)
 */
router.delete('/:tenantId', authenticateToken, tenantController.delete('/:tenantId'));

/**
 * POST /api/tenants/:tenantId/suspend
 * Suspend tenant
 * 
 * Body:
 * {
 *   "reason": "Suspension reason"
 * }
 * 
 * Auth: Required (Admin)
 */
router.post('/:tenantId/suspend', authenticateToken, tenantController.post('/:tenantId/suspend'));

/**
 * POST /api/tenants/:tenantId/reactivate
 * Reactivate suspended tenant
 * Auth: Required (Admin)
 */
router.post('/:tenantId/reactivate', authenticateToken, tenantController.post('/:tenantId/reactivate'));

// ==================== USER MANAGEMENT ====================

/**
 * POST /api/tenants/:tenantId/users
 * Add user to tenant
 * 
 * Body:
 * {
 *   "userId": "user-id",
 *   "role": "owner|admin|manager|member|viewer"
 * }
 * 
 * Auth: Required (Manager or Admin)
 */
router.post('/:tenantId/users', authenticateToken, tenantController.post('/:tenantId/users'));

/**
 * GET /api/tenants/:tenantId/users
 * Get all users in tenant
 * Auth: Required (Member or higher)
 */
router.get('/:tenantId/users', authenticateToken, tenantController.get('/:tenantId/users'));

/**
 * DELETE /api/tenants/:tenantId/users/:userId
 * Remove user from tenant
 * Auth: Required (Manager or Admin)
 */
router.delete('/:tenantId/users/:userId', authenticateToken, tenantController.delete('/:tenantId/users/:userId'));

// ==================== SETTINGS ====================

/**
 * GET /api/tenants/:tenantId/settings
 * Get tenant settings
 * Auth: Required (Owner or Admin)
 */
router.get('/:tenantId/settings', authenticateToken, tenantController.get('/:tenantId/settings'));

/**
 * PUT /api/tenants/:tenantId/settings
 * Update tenant settings
 * 
 * Body can include:
 * {
 *   "brandingColor": "#FF5733",
 *   "logo": "logo-url",
 *   "emailFrom": "noreply@company.com",
 *   "twoFactorRequired": true,
 *   "sessionTimeout": 3600,
 *   "dataRetention": 365,
 *   ...
 * }
 * 
 * Auth: Required (Owner or Admin)
 */
router.put('/:tenantId/settings', authenticateToken, tenantController.put('/:tenantId/settings'));

// ==================== QUOTAS & USAGE ====================

/**
 * GET /api/tenants/:tenantId/quota
 * Get current quota usage
 * 
 * Response example:
 * {
 *   "maxUsers": 10,
 *   "usedUsers": 5,
 *   "maxStorage": 10,
 *   "usedStorage": 3.5,
 *   "maxApiCalls": 10000,
 *   "usedApiCalls": 2345
 * }
 * 
 * Auth: Required
 */
router.get('/:tenantId/quota', authenticateToken, tenantController.get('/:tenantId/quota'));

/**
 * POST /api/tenants/:tenantId/api-calls
 * Record API call for quota tracking
 * Auth: Required
 */
router.post('/:tenantId/api-calls', tenantController.post('/:tenantId/api-calls'));

/**
 * POST /api/tenants/:tenantId/storage
 * Record storage usage
 * 
 * Body:
 * {
 *   "sizeGB": 1.5
 * }
 * 
 * Auth: Required
 */
router.post('/:tenantId/storage', authenticateToken, tenantController.post('/:tenantId/storage'));

// ==================== PLANS ====================

/**
 * POST /api/tenants/:tenantId/upgrade
 * Upgrade tenant plan
 * 
 * Body:
 * {
 *   "newPlan": "professional" or "enterprise"
 * }
 * 
 * Auth: Required (Owner or Admin)
 */
router.post('/:tenantId/upgrade', authenticateToken, tenantController.post('/:tenantId/upgrade'));

// ==================== DATA ISOLATION ====================

/**
 * GET /api/tenants/:tenantId/isolation
 * Get tenant isolation report
 * 
 * Response:
 * {
 *   "tenantId": "tenant-123",
 *   "totalItems": 150,
 *   "breakdown": {
 *     "users": 5,
 *     "resources": 20,
 *     "documents": 125
 *   }
 * }
 * 
 * Auth: Required (Admin)
 */
router.get('/:tenantId/isolation', authenticateToken, tenantController.get('/:tenantId/isolation'));

// ==================== STATISTICS ====================

/**
 * GET /api/tenants/stats/all
 * Get all tenant statistics
 * 
 * Response:
 * {
 *   "tenants": { total, active, suspended, ... },
 *   "isolation": { violations, unauthorized, ... }
 * }
 * 
 * Auth: Required (Super Admin)
 */
router.get('/stats/all', authenticateToken, tenantController.get('/stats/all'));

module.exports = router;
