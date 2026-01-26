const express = require('express');
const router = express.Router();
const SmartSupportService = require('../services/smartSupport.service');
const SmartLogisticsService = require('../services/smartLogistics.service');
const SmartAdvancedAnalyticsService = require('../services/smartAdvancedAnalytics.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

// === SUPPORT & CRM ===
router.post('/support/ticket', async (req, res) => {
  try {
    const ticket = await SmartSupportService.createTicket({ ...req.body, userId: req.user.id });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/support/nps-trigger', authorizeRole(['ADMIN', 'RECEPTION']), async (req, res) => {
  try {
    const result = await SmartSupportService.triggerSurvey(req.body.parentId, 'MANUAL_TRIGGER');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === LOGISTICS & INVENTORY ===
router.get('/logistics/reorder-check', authorizeRole(['ADMIN', 'PROCUREMENT', 'FACILITY_MANAGER']), async (req, res) => {
  try {
    const requests = await SmartLogisticsService.checkStockAndReorder();
    res.json({ success: true, purchaseRequests: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/logistics/assets/lifecycle', authorizeRole(['ADMIN', 'FINANCE', 'FACILITY_MANAGER']), async (req, res) => {
  try {
    const replacements = await SmartLogisticsService.checkAssetLifecycle();
    res.json({ success: true, needsReplacement: replacements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === BI & ANALYTICS ===
router.get('/analytics/dashboard/advanced', authorizeRole(['ADMIN', 'CEO', 'MEDICAL_DIRECTOR']), async (req, res) => {
  try {
    const [roomUtil, clinicalOutcomes, productivity] = await Promise.all([
      SmartAdvancedAnalyticsService.getRoomUtilization(),
      SmartAdvancedAnalyticsService.getImprovementIndex(),
      SmartAdvancedAnalyticsService.getTherapistProductivity(),
    ]);

    res.json({
      success: true,
      dashboard: {
        roomUtilization: roomUtil,
        clinicalImpact: clinicalOutcomes,
        staffEfficiency: productivity,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

