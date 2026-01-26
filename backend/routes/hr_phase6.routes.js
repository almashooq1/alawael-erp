const express = require('express');
const router = express.Router();
const hrService = require('../services/hrPhase6Service');
const { authenticateToken: protect, authorizeRole: authorize } = require('../middleware/auth.middleware');

// Middleware to ensure user is authenticated
// In real scenario, add '' for write operations
router.use(protect);

// --- Payroll Routes ---
router.post('/payroll/generate', async (req, res) => {
  try {
    const { month, year } = req.body;
    const payrolls = await hrService.generatePayroll(month, year);
    res.json({ message: 'Payroll generated successfully', count: payrolls.length, data: payrolls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/payroll', async (req, res) => {
  try {
    const { month, year } = req.query;
    const payrolls = await hrService.getPayrollRecords(month, year);
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Attendance Routes ---
router.post('/attendance/checkin', async (req, res) => {
  try {
    // Assuming req.user is populated by protect middleware
    // If testing without auth, provide employeeId in body
    const employeeId = req.user?.employeeId || req.body.employeeId;
    const record = await hrService.checkIn(employeeId, req.body.location);
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/attendance/checkout', async (req, res) => {
  try {
    const employeeId = req.user?.employeeId || req.body.employeeId;
    const record = await hrService.checkOut(employeeId);
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    const records = await hrService.getAttendance(date);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- Leave Routes ---
router.post('/leaves', async (req, res) => {
  try {
    const leaveData = { ...req.body, employeeId: req.user?._id || req.body.employeeId };
    const leave = await hrService.requestLeave(leaveData);
    res.status(201).json(leave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/leaves', async (req, res) => {
  try {
    const { status } = req.query;
    const leaves = await hrService.getLeaves(status);
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/leaves/:id/approve', async (req, res) => {
  try {
    const leave = await hrService.approveLeave(req.params.id, req.user?._id);
    res.json(leave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// --- Performance Routes ---
router.post('/performance', async (req, res) => {
  try {
    const review = await hrService.createAppraisal(req.body);
    res.json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/performance/:employeeId', async (req, res) => {
  try {
    const reviews = await hrService.getEmployeePerformance(req.params.employeeId);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

