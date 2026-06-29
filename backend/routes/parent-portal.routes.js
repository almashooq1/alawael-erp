const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
const parentPortal = require('../services/parentPortal.service');

// W269 cross-branch isolation on every `:beneficiaryId` lookup (fail-open for
// cross-branch roles / unscoped callers; enforced for restricted staff).
// NOTE: this is a dormant legacy route (the live surface is
// parent-portal-enhanced.routes.js). Guardian↔beneficiary *ownership* — the
// correct model for guardian callers, who carry no branch scope — is a separate
// concern tracked for the live portal, not closed by branch isolation here.
router.use(auth);
router.use(requireBranchAccess);
router.param('beneficiaryId', branchScopedBeneficiaryParam);

/**
 * Parent Portal Routes
 * مسارات بوابة أولياء الأمور
 */

// Overview for a beneficiary
router.get('/overview/:beneficiaryId', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const result = await parentPortal.getBeneficiaryOverview(beneficiaryId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('[ParentPortalRoutes] Overview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Progress timeline
router.get('/progress/:beneficiaryId', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const { months } = req.query;
    const result = await parentPortal.getProgressTimeline(beneficiaryId, parseInt(months) || 6);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('[ParentPortalRoutes] Progress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Home programs
router.get('/home-programs/:beneficiaryId', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const result = await parentPortal.getHomePrograms(beneficiaryId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('[ParentPortalRoutes] Home programs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send message to team
router.post('/messages', auth, async (req, res) => {
  try {
    const { beneficiaryId, message } = req.body;
    if (!beneficiaryId || !message) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId and message are required' });
    }
    const result = await parentPortal.sendMessageToTeam(beneficiaryId, req.user.id, message);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('[ParentPortalRoutes] Message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Notifications
router.get('/notifications/:beneficiaryId', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const result = await parentPortal.getNotifications(beneficiaryId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('[ParentPortalRoutes] Notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Available reports
router.get('/reports/:beneficiaryId', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const result = await parentPortal.getAvailableReports(beneficiaryId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('[ParentPortalRoutes] Reports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
