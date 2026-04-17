/**
 * 🤝 CRM Advanced Routes — مسارات إدارة علاقات العملاء المتقدمة
 * AlAwael ERP — Full CRUD + Pipeline + Reports
 *
 * Endpoints:
 *   /contacts     — CRUD + stats + interactions
 *   /deals        — CRUD + pipeline + stages
 *   /follow-ups   — CRUD + complete + upcoming
 *   /leads        — CRUD + pipeline + convert
 *   /reports      — dashboard, conversion, activity, revenue
 *   /activities   — activity log
 *   /seed         — demo data
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { crmAdvancedService } = require('../../services/crm-advanced.service');
const logger = require('../../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────
const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('CRM route error:', err.message);
    const status = err.message.includes('غير موجود') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
};

const getUserInfo = req => ({
  userId: req.user?.userId || req.user?._id || req.user?.id,
  userName: req.user?.name || req.user?.fullName || 'مستخدم النظام',
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD & REPORTS — لوحة التحكم والتقارير
// ═══════════════════════════════════════════════════════════════

// GET /crm/dashboard — Dashboard stats
router.get(
  '/dashboard',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.getDashboardStats();
  })
);

// GET /crm/reports/dashboard — alias
router.get(
  '/reports/dashboard',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.getDashboardStats();
  })
);

// GET /crm/reports/conversion
router.get(
  '/reports/conversion',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getConversionReport(req.query);
  })
);

// GET /crm/reports/activity
router.get(
  '/reports/activity',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getActivityReport(req.query);
  })
);

// GET /crm/reports/revenue
router.get(
  '/reports/revenue',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getRevenueReport(req.query);
  })
);

// GET /crm/analytics — alias for dashboard
router.get(
  '/analytics',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.getDashboardStats();
  })
);

// ═══════════════════════════════════════════════════════════════
// CONTACTS — جهات الاتصال
// ═══════════════════════════════════════════════════════════════

// GET /crm/contacts/stats
router.get(
  '/contacts/stats',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.getContactStats();
  })
);

// GET /crm/contacts
router.get(
  '/contacts',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getContacts(req.query);
  })
);

// GET /crm/contacts/:id
router.get(
  '/contacts/:id',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getContactById(req.params.id);
  })
);

// POST /crm/contacts
router.post(
  '/contacts',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.createContact(req.body, userId, userName);
  })
);

// PUT /crm/contacts/:id
router.put(
  '/contacts/:id',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.updateContact(req.params.id, req.body, userId, userName);
  })
);

// DELETE /crm/contacts/:id
router.delete(
  '/contacts/:id',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.deleteContact(req.params.id, userId, userName);
  })
);

// POST /crm/contacts/:id/interactions
router.post(
  '/contacts/:id/interactions',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.addInteraction(req.params.id, req.body, userId, userName);
  })
);

// ═══════════════════════════════════════════════════════════════
// DEALS — الصفقات
// ═══════════════════════════════════════════════════════════════

// GET /crm/pipeline
router.get(
  '/pipeline',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.getPipeline();
  })
);

// GET /crm/deals
router.get(
  '/deals',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getDeals(req.query);
  })
);

// GET /crm/deals/:id
router.get(
  '/deals/:id',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getDealById(req.params.id);
  })
);

// POST /crm/deals
router.post(
  '/deals',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.createDeal(req.body, userId, userName);
  })
);

// PUT /crm/deals/:id
router.put(
  '/deals/:id',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.updateDeal(req.params.id, req.body, userId, userName);
  })
);

// DELETE /crm/deals/:id
router.delete(
  '/deals/:id',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.deleteDeal(req.params.id, userId, userName);
  })
);

// PATCH /crm/deals/:id/stage
router.patch(
  '/deals/:id/stage',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.updateDealStage(req.params.id, req.body.stage, userId, userName);
  })
);

// ═══════════════════════════════════════════════════════════════
// FOLLOW-UPS — المتابعات
// ═══════════════════════════════════════════════════════════════

// GET /crm/follow-ups/upcoming
router.get(
  '/follow-ups/upcoming',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getUpcomingFollowUps(req.query.days);
  })
);

// GET /crm/follow-ups/overdue
router.get(
  '/follow-ups/overdue',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.getOverdueFollowUps();
  })
);

// GET /crm/follow-ups
router.get(
  '/follow-ups',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getFollowUps(req.query);
  })
);

// POST /crm/follow-ups
router.post(
  '/follow-ups',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.createFollowUp(req.body, userId, userName);
  })
);

// PUT /crm/follow-ups/:id
router.put(
  '/follow-ups/:id',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.updateFollowUp(req.params.id, req.body, userId, userName);
  })
);

// PATCH /crm/follow-ups/:id/complete
router.patch(
  '/follow-ups/:id/complete',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.completeFollowUp(
      req.params.id,
      req.body.notes,
      req.body.result,
      userId,
      userName
    );
  })
);

// ═══════════════════════════════════════════════════════════════
// LEADS — العملاء المحتملين
// ═══════════════════════════════════════════════════════════════

// GET /crm/leads/pipeline
router.get(
  '/leads/pipeline',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.getLeadsPipeline();
  })
);

// GET /crm/leads
router.get(
  '/leads',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getLeads(req.query);
  })
);

// GET /crm/leads/:id
router.get(
  '/leads/:id',
  authenticateToken,
  wrap(async req => {
    const Lead = require('mongoose').model('Lead');
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) throw new Error('العميل المحتمل غير موجود');
    return lead;
  })
);

// POST /crm/leads
router.post(
  '/leads',
  authenticateToken,
  wrap(async req => {
    const { userId } = getUserInfo(req);
    return crmAdvancedService.createLead(req.body, userId);
  })
);

// PUT /crm/leads/:id
router.put(
  '/leads/:id',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.updateLead(req.params.id, req.body);
  })
);

// DELETE /crm/leads/:id
router.delete(
  '/leads/:id',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.deleteLead(req.params.id);
  })
);

// PATCH /crm/leads/:id/stage
router.patch(
  '/leads/:id/stage',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.updateLeadStage(req.params.id, req.body.stage);
  })
);

// POST /crm/leads/:id/convert
router.post(
  '/leads/:id/convert',
  authenticateToken,
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return crmAdvancedService.convertLeadToContact(req.params.id, userId, userName);
  })
);

// ═══════════════════════════════════════════════════════════════
// ACTIVITIES — الأنشطة
// ═══════════════════════════════════════════════════════════════

// GET /crm/activities
router.get(
  '/activities',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getActivities(req.query);
  })
);

// ═══════════════════════════════════════════════════════════════
// CUSTOMERS — العملاء (Legacy model support)
// ═══════════════════════════════════════════════════════════════

router.get(
  '/customers',
  authenticateToken,
  wrap(async req => {
    // Map to contacts
    return crmAdvancedService.getContacts(req.query);
  })
);

router.get(
  '/customers/:id',
  authenticateToken,
  wrap(async req => {
    return crmAdvancedService.getContactById(req.params.id);
  })
);

// ═══════════════════════════════════════════════════════════════
// SEED — بيانات تجريبية
// ═══════════════════════════════════════════════════════════════

// POST /crm/seed
router.post(
  '/seed',
  authenticateToken,
  wrap(async _req => {
    return crmAdvancedService.seedDemoData();
  })
);

module.exports = router;
