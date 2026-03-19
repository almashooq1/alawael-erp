// HR Leave Routes
const express = require('express');
const router = express.Router();

const leaveController = require('../../controllers/HR/leaveController');
const { authenticate, authorize } = require('../../middleware/auth');

// Create (admin, hr, manager, user)
router.post(
  '/',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  leaveController.createLeave
);
// Read all (admin, hr, manager)
router.get('/', authenticate, authorize('admin', 'hr', 'manager'), leaveController.getLeaves);
// Read one (admin, hr, manager, user)
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  leaveController.getLeaveById
);
// Update (admin, hr, manager)
router.put('/:id', authenticate, authorize('admin', 'hr', 'manager'), leaveController.updateLeave);
// Delete (admin, hr)
router.delete('/:id', authenticate, authorize('admin', 'hr'), leaveController.deleteLeave);

module.exports = router;
