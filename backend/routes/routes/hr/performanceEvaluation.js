// HR Performance Evaluation Routes
const express = require('express');
const router = express.Router();

const performanceEvaluationController = require('../../controllers/HR/performanceEvaluationController');
const { authenticate, authorize } = require('../../middleware/auth');

// Create (admin, hr, manager)
router.post(
  '/',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  performanceEvaluationController.createEvaluation
);
// Read all (admin, hr, manager)
router.get(
  '/',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  performanceEvaluationController.getEvaluations
);
// Read one (admin, hr, manager, user)
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  performanceEvaluationController.getEvaluationById
);
// Update (admin, hr, manager)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  performanceEvaluationController.updateEvaluation
);
// Delete (admin, hr)
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'hr'),
  performanceEvaluationController.deleteEvaluation
);

module.exports = router;
