/**
 * Incident Routes
 * مسارات الحوادث
 * Wraps existing incidentController
 */

const express = require('express');
const router = express.Router();
const IncidentController = require('../controllers/incidentController');
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess } = require('../middleware/branchScope.middleware');
// W277b — MFA tier-2 step-up on adverse-event lifecycle terminals.
// Mirrors the W273 pattern (biometric/payroll) for the quality domain.
// resolve / close / escalate / archive + DELETE are the rows that
// later filings, regulatory audits, and CAPA chains anchor to —
// requiring step-up keeps a compromised admin session from quietly
// closing an open incident or deleting evidence.
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const controller = IncidentController;

router.use(authenticate);
router.use(attachMfaActor);
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
// DELETE is irreversible removal of an adverse-event record — strongest gate.
router.delete('/:id', authorize(['admin']), requireMfaTier(2), (req, res) =>
  controller.deleteIncident(req, res)
);

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
// Lifecycle terminals — escalate raises severity to executive review,
// resolve/close anchor the CAPA chain, archive moves to cold storage.
router.post('/:id/escalate', authorize(['admin', 'manager']), requireMfaTier(2), (req, res) =>
  controller.escalateIncident(req, res)
);
router.post('/:id/resolve', authorize(['admin', 'manager']), requireMfaTier(2), (req, res) =>
  controller.resolveIncident(req, res)
);
router.post('/:id/close', authorize(['admin', 'manager']), requireMfaTier(2), (req, res) =>
  controller.closeIncident(req, res)
);
router.post('/:id/archive', authorize(['admin']), requireMfaTier(2), (req, res) =>
  controller.archiveIncident(req, res)
);

// Comments & attachments
router.post('/:id/comments', (req, res) => controller.addComment(req, res));
router.post('/:id/attachments', (req, res) => controller.addAttachment(req, res));

// Reports
router.get('/:id/report', (req, res) => controller.generateReport(req, res));
router.get('/:id/related', (req, res) => controller.getRelatedIncidents(req, res));

// W277i Pass 2 — audit chain forensic view + integrity verification.
// Read-only; no MFA gate (reads are always allowed at tier 1 by design).
router.get('/:id/audit-chain', (req, res) => controller.getAuditChain(req, res));

module.exports = router;
