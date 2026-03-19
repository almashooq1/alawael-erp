/* eslint-disable no-unused-vars */
/**
 * Center Administration Routes
 * مسارات إدارة المراكز
 */

const express = require('express');
const router = express.Router();
const { centerAdministrationService, centerConfig } = require('./center-service');

// ============ Configuration ============

router.get('/config/types', (req, res) => {
  res.json({ success: true, data: centerConfig.centerTypes });
});

router.get('/config/statuses', (req, res) => {
  res.json({ success: true, data: centerConfig.centerStatuses });
});

router.get('/config/departments', (req, res) => {
  res.json({ success: true, data: centerConfig.departments });
});

router.get('/config/roles', (req, res) => {
  res.json({ success: true, data: centerConfig.staffRoles });
});

router.get('/config/shifts', (req, res) => {
  res.json({ success: true, data: centerConfig.shiftTypes });
});

// ============ Center Management ============

router.get('/centers', async (req, res) => {
  try {
    const centers = await centerAdministrationService.getCenters(req.query);
    res.json({ success: true, data: centers, count: centers.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/centers/:centerId', async (req, res) => {
  try {
    const center = await centerAdministrationService.getCenter(req.params.centerId);
    if (!center) return res.status(404).json({ success: false, error: 'Center not found' });
    res.json({ success: true, data: center });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/centers', async (req, res) => {
  try {
    const center = await centerAdministrationService.createCenter({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: center, message: 'تم إنشاء المركز' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.put('/centers/:centerId', async (req, res) => {
  try {
    const center = await centerAdministrationService.updateCenter(req.params.centerId, req.body);
    if (!center) return res.status(404).json({ success: false, error: 'Center not found' });
    res.json({ success: true, data: center, message: 'تم تحديث المركز' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/centers/:centerId/branches', async (req, res) => {
  try {
    const center = await centerAdministrationService.addBranch(req.params.centerId, req.body);
    res.json({ success: true, data: center, message: 'تم إضافة الفرع' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ Staff Management ============

router.get('/staff/center/:centerId', async (req, res) => {
  try {
    const options = {
      department: req.query.department,
      role: req.query.role,
      status: req.query.status,
    };
    const staff = await centerAdministrationService.getStaffByCenter(req.params.centerId, options);
    res.json({ success: true, data: staff, count: staff.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/staff/:staffId', async (req, res) => {
  try {
    const staff = await centerAdministrationService.getStaff(req.params.staffId);
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const staff = await centerAdministrationService.createStaff({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: staff, message: 'تم تسجيل الموظف' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.put('/staff/:staffId', async (req, res) => {
  try {
    const staff = await centerAdministrationService.updateStaff(req.params.staffId, req.body);
    if (!staff) return res.status(404).json({ success: false, error: 'Staff not found' });
    res.json({ success: true, data: staff, message: 'تم تحديث بيانات الموظف' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/staff/:staffId/attendance', async (req, res) => {
  try {
    const { status } = req.body;
    const staff = await centerAdministrationService.recordStaffAttendance(
      req.params.staffId,
      status
    );
    res.json({ success: true, data: staff, message: 'تم تسجيل الحضور' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/staff/:staffId/training', async (req, res) => {
  try {
    const staff = await centerAdministrationService.addStaffTraining(req.params.staffId, req.body);
    res.json({ success: true, data: staff, message: 'تم إضافة التدريب' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/staff/:staffId/leave', async (req, res) => {
  try {
    const staff = await centerAdministrationService.addStaffLeave(req.params.staffId, req.body);
    res.json({ success: true, data: staff, message: 'تم تسجيل الإجازة' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ Resource Management ============

router.get('/resources/center/:centerId', async (req, res) => {
  try {
    const resources = await centerAdministrationService.getResourcesByCenter(req.params.centerId);
    res.json({ success: true, data: resources, count: resources.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/resources/:resourceId', async (req, res) => {
  try {
    const resource = await centerAdministrationService.getResource(req.params.resourceId);
    if (!resource) return res.status(404).json({ success: false, error: 'Resource not found' });
    res.json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/resources', async (req, res) => {
  try {
    const resource = await centerAdministrationService.createResource({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: resource, message: 'تم إضافة المورد' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.put('/resources/:resourceId', async (req, res) => {
  try {
    const resource = await centerAdministrationService.updateResource(
      req.params.resourceId,
      req.body
    );
    if (!resource) return res.status(404).json({ success: false, error: 'Resource not found' });
    res.json({ success: true, data: resource, message: 'تم تحديث المورد' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/resources/:resourceId/maintenance', async (req, res) => {
  try {
    const resource = await centerAdministrationService.scheduleMaintenance(
      req.params.resourceId,
      req.body
    );
    res.json({ success: true, data: resource, message: 'تم جدولة الصيانة' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ Dashboard & Reports ============

router.get('/dashboard/:centerId', async (req, res) => {
  try {
    const data = await centerAdministrationService.getDashboardData(req.params.centerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/reports/staff/:centerId', async (req, res) => {
  try {
    const report = await centerAdministrationService.getStaffReport(req.params.centerId);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
