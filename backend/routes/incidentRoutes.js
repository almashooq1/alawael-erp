/**
 * Incident Routes
 * مسارات الحوادث
 * Wraps existing incidentController
 */

const express = require('express');
const router = express.Router();
const IncidentController = require('../controllers/incidentController');
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const controller = IncidentController;

router.use(authenticate);
router.use(requireBranchAccess);
// CRUD
router.post('/', authorize(['admin', 'manager']), (req, res) =>
  controller.createIncident(req, res)
);
router.get('/', (req, res) => controller.getAllIncidents(req, res));
router.get('/search', (req, res) => controller.searchIncidents(req, res));
router.get('/statistics', (req, res) => controller.getStatistics(req, res));
router.get('/pending', (req, res) => controller.getPendingIncidents(req, res));
router.get('/critical', (req, res) => controller.getCriticalIncidents(req, res));
router.get('/:id', (req, res) => controller.getIncidentById(req, res));
router.put('/:id', authorize(['admin', 'manager']), (req, res) =>
  controller.updateIncident(req, res)
);
router.delete('/:id', authorize(['admin']), (req, res) => controller.deleteIncident(req, res));

// Status management
router.patch('/:id/status', authorize(['admin', 'manager']), (req, res) =>
  controller.updateStatus(req, res)
);
router.post('/:id/assign', authorize(['admin', 'manager']), (req, res) =>
  controller.assignIncident(req, res)
);
router.post('/:id/responder', authorize(['admin', 'manager']), (req, res) =>
  controller.addResponder(req, res)
);
router.post('/:id/escalate', authorize(['admin', 'manager']), (req, res) =>
  controller.escalateIncident(req, res)
);
router.post('/:id/resolve', authorize(['admin', 'manager']), (req, res) =>
  controller.resolveIncident(req, res)
);
router.post('/:id/close', authorize(['admin', 'manager']), (req, res) =>
  controller.closeIncident(req, res)
);
router.post('/:id/archive', authorize(['admin']), (req, res) =>
  controller.archiveIncident(req, res)
);

// Comments & attachments
router.post('/:id/comments', (req, res) => controller.addComment(req, res));
router.post('/:id/attachments', (req, res) => controller.addAttachment(req, res));

// Reports
router.get('/:id/report', (req, res) => controller.generateReport(req, res));
router.get('/:id/related', (req, res) => controller.getRelatedIncidents(req, res));

module.exports = router;
