const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const TherapySession = require('../models/TherapySession'); // For performance metrics
const StaffingService = require('../services/staffing.service'); // Smart Staffing
const { authenticateToken } = require('../middleware/auth.middleware');
const AuditService = require('../services/audit.service');

router.use(authenticateToken);

// ============ EMPLOYEES ============

router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find().populate('currentShift');
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const lastEmp = await Employee.findOne({}, {}, { sort: { createdAt: -1 } });
    let nextId = 1;
    if (lastEmp && lastEmp.employeeId) {
      const parts = lastEmp.employeeId.split('-');
      if (parts.length > 2) nextId = parseInt(parts[2]) + 1;
    }
    const empId = `EMP-${new Date().getFullYear()}-${nextId.toString().padStart(3, '0')}`;

    const employee = new Employee({
      ...req.body,
      employeeId: empId,
    });

    await employee.save();
    await AuditService.log(req, 'HIRE_EMPLOYEE', 'HR', { id: employee.id, name: employee.firstName });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Smart Performance Metrics (HR + Operations Integration)
router.get('/employees/:id/performance', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Count completed sessions for restricted therapists
    // Assuming 'therapist' field in TherapySession matches Employee ID
    const completedSessions = await TherapySession.countDocuments({
      therapist: employee._id,
      status: 'COMPLETED',
    });

    const utilization = StaffingService.calculateUtilization(completedSessions);

    res.json({
      success: true,
      data: {
        employee: `${employee.firstName} ${employee.lastName}`,
        metrics: {
          totalSessionsCompleted: completedSessions,
          utilizationRate: `${utilization}%`,
          rating: 4.8, // Mock average rating
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ SHIFTS ============

router.get('/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find({ isActive: true }).populate('assignedStaff', 'firstName lastName position');
    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/shifts', async (req, res) => {
  try {
    const shift = new Shift(req.body);
    await shift.save();
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Assign Shift
router.post('/shifts/:id/assign', async (req, res) => {
  try {
    const { employeeIds } = req.body; // Array of IDs
    const shift = await Shift.findById(req.params.id);

    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    // Add to shift
    shift.assignedStaff = [...new Set([...shift.assignedStaff, ...employeeIds])];
    await shift.save();

    // Update employees
    await Employee.updateMany({ _id: { $in: employeeIds } }, { currentShift: shift._id });

    res.json({ success: true, message: 'Staff assigned' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Smart Staff Suggestion (AI-Lite)
router.get('/shifts/:id/suggestions', async (req, res) => {
  try {
    const { role } = req.query; // e.g. "Therapist" or "Nurse"
    if (!role) return res.status(400).json({ message: 'Role query param required' });

    const suggestions = await StaffingService.suggestStaff(role, req.params.id);

    res.json({ success: true, count: suggestions.length, data: suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
