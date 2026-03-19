// HR Payroll Routes
const express = require('express');
const router = express.Router();

const payrollController = require('../../controllers/HR/payrollController');
const { authenticate, authorize } = require('../../middleware/auth');

// Create (admin, hr)
router.post('/', authenticate, authorize('admin', 'hr'), payrollController.createPayroll);
// Read all (admin, hr, manager)
router.get('/', authenticate, authorize('admin', 'hr', 'manager'), payrollController.getPayrolls);
// Read one (admin, hr, manager, user)
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'hr', 'manager', 'user'),
  payrollController.getPayrollById
);
// Update (admin, hr)
router.put('/:id', authenticate, authorize('admin', 'hr'), payrollController.updatePayroll);
// Delete (admin)
router.delete('/:id', authenticate, authorize('admin'), payrollController.deletePayroll);

module.exports = router;
