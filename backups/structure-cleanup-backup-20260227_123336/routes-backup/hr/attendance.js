// HR Attendance Routes
const express = require('express');
const router = express.Router();

const attendanceController = require('../../controllers/HR/attendanceController');
const { authenticate, authorize } = require('../../middleware/auth');

// Create (admin, hr, manager)
router.post(
  '/',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  attendanceController.createAttendance
);
// Read all (admin, hr, manager)
router.get(
  '/',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  attendanceController.getAttendances
);
// Read one (admin, hr, manager, user)
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  attendanceController.getAttendanceById
);
// Update (admin, hr, manager)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'hr', 'manager'),
  attendanceController.updateAttendance
);
// Delete (admin, hr)
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'hr'),
  attendanceController.deleteAttendance
);

module.exports = router;
