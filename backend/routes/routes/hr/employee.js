// HR Employee Routes
const express = require('express');
const router = express.Router();

const employeeController = require('../../controllers/HR/employeeController');
const { authenticate, authorize } = require('../../middleware/auth');

// Create (admin, hr)
router.post('/', authenticate, authorize('admin', 'hr'), employeeController.createEmployee);
// Read all (admin, hr, manager)
router.get('/', authenticate, authorize('admin', 'hr', 'manager'), employeeController.getEmployees);
// Read one (admin, hr, manager, user)
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  employeeController.getEmployeeById
);
// Update (admin, hr)
router.put('/:id', authenticate, authorize('admin', 'hr'), employeeController.updateEmployee);
// Delete (admin)
router.delete('/:id', authenticate, authorize('admin'), employeeController.deleteEmployee);

module.exports = router;
