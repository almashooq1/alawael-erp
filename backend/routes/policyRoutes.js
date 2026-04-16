/**
 * Policy Routes
 * مسارات السياسات
 * Wraps existing policyController
 */

const express = require('express');
const router = express.Router();
const PolicyController = require('../controllers/policyController');
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const controller = PolicyController;

router.use(authenticate);
router.use(requireBranchAccess);
// CRUD
router.post('/', authorize(['admin', 'manager']), (req, res) => controller.createPolicy(req, res));
router.get('/', (req, res) => controller.getPolicies(req, res));
router.get('/active', (req, res) => controller.getActivePolicies(req, res));
router.get('/statistics', (req, res) => controller.getStatistics(req, res));
router.get('/:policyId', (req, res) => controller.getPolicy(req, res));
router.put('/:policyId', authorize(['admin', 'manager']), (req, res) =>
  controller.updatePolicy(req, res)
);
router.delete('/:policyId', authorize(['admin']), (req, res) => controller.deletePolicy(req, res));

// Approval workflow
router.post('/:policyId/submit-approval', authorize(['admin', 'manager']), (req, res) =>
  controller.submitForApproval(req, res)
);
router.post('/:policyId/approve', authorize(['admin']), (req, res) =>
  controller.approvePolicy(req, res)
);
router.post('/:policyId/reject', authorize(['admin']), (req, res) =>
  controller.rejectPolicy(req, res)
);
router.get('/approvals/pending', (req, res) => controller.getPendingApprovals(req, res));

// Acknowledgement
router.post('/:policyId/send-acknowledgement', authorize(['admin', 'manager']), (req, res) =>
  controller.sendForAcknowledgement(req, res)
);
router.post('/acknowledge', (req, res) => controller.acknowledgePolicies(req, res));
router.get('/acknowledgements/pending', (req, res) =>
  controller.getPendingAcknowledgements(req, res)
);
router.get('/acknowledgements/reports', (req, res) =>
  controller.getAcknowledgementReports(req, res)
);

module.exports = router;
