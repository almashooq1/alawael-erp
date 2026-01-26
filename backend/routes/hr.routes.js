const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee.memory');
const { protect, authorize } = require('../middleware/auth');
const { validateEmployee } = require('../middleware/validator.middleware');
const logger = require('../utils/logger');

// Middleware للتحقق من صلاحيات الموظفين
router.use(protect);

// ==================== GET ROUTES ====================

// جلب جميع الموظفين
router.get('/', async (req, res) => {
  try {
    const { department, status, search, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (department) filters.department = department;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const employees = await Employee.findAll(filters);
    const paginated = employees.slice(offset, offset + limit);

    logger.info(`Retrieved ${paginated.length} employees`);

    res.success(
      {
        data: paginated,
        total: employees.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      'Employees retrieved successfully',
    );
  } catch (error) {
    logger.error('Error retrieving employees:', error);
    res.error('Failed to retrieve employees', 500);
  }
});

// جلب موظف محدد
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.error('Employee not found', 404);
    }

    res.success(employee, 'Employee retrieved successfully');
  } catch (error) {
    logger.error('Error retrieving employee:', error);
    res.error('Failed to retrieve employee', 500);
  }
});

// جلب إحصائيات الموظفين
router.get('/analytics/summary', async (req, res) => {
  try {
    const stats = await Employee.getTotalCount();
    const departments = {};
    const allEmployees = await Employee.findAll();

    allEmployees.forEach(emp => {
      if (emp.department) {
        departments[emp.department] = (departments[emp.department] || 0) + 1;
      }
    });

    res.success(
      {
        ...stats,
        byDepartment: departments,
        averageSalary: allEmployees.reduce((sum, emp) => sum + (emp.salary || 0), 0) / allEmployees.length,
      },
      'Statistics retrieved successfully',
    );
  } catch (error) {
    logger.error('Error retrieving statistics:', error);
    res.error('Failed to retrieve statistics', 500);
  }
});

// ==================== POST ROUTES ====================

// إنشاء موظف جديد
router.post('/', validateEmployee, async (req, res) => {
  try {
    const { email } = req.body;

    // التحقق من عدم تكرار البريد الإلكتروني
    const existing = await Employee.findByEmail(email);
    if (existing) {
      return res.error('Employee with this email already exists', 400);
    }

    const employee = await Employee.create(req.body);

    logger.info(`Employee created: ${employee._id}`);

    res.success(employee, 'Employee created successfully', 201);
  } catch (error) {
    logger.error('Error creating employee:', error);
    res.error('Failed to create employee', 500);
  }
});

// ==================== PUT ROUTES ====================

// تحديث موظف
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.error('Employee not found', 404);
    }

    // إذا تم تعديل البريد، تحقق من عدم التكرار
    if (req.body.email && req.body.email !== employee.email) {
      const existing = await Employee.findByEmail(req.body.email);
      if (existing) {
        return res.error('Email already in use', 400);
      }
    }

    const updated = await Employee.updateById(req.params.id, req.body);

    logger.info(`Employee updated: ${req.params.id}`);

    res.success(updated, 'Employee updated successfully');
  } catch (error) {
    logger.error('Error updating employee:', error);
    res.error('Failed to update employee', 500);
  }
});

// ==================== DELETE ROUTES ====================

// حذف موظف
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.error('Employee not found', 404);
    }

    await Employee.deleteById(req.params.id);

    logger.info(`Employee deleted: ${req.params.id}`);

    res.success(null, 'Employee deleted successfully');
  } catch (error) {
    logger.error('Error deleting employee:', error);
    res.error('Failed to delete employee', 500);
  }
});

// تغيير حالة الموظف (نشط/غير نشط)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'on_leave'].includes(status)) {
      return res.error('Invalid status', 400);
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.error('Employee not found', 404);
    }

    const updated = await Employee.updateById(req.params.id, { status });

    logger.info(`Employee status changed: ${req.params.id} -> ${status}`);

    res.success(updated, 'Employee status updated successfully');
  } catch (error) {
    logger.error('Error updating employee status:', error);
    res.error('Failed to update employee status', 500);
  }
});

module.exports = router;

