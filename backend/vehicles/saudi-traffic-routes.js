/**
 * Saudi Traffic Routes - مسارات المرور السعودية
 * API Endpoints for Saudi Traffic Management
 */

const express = require('express');
const router = express.Router();
const { saudiTrafficService, trafficConfig } = require('./saudi-traffic-service');

// ============ Configuration ============

router.get('/config/license-types', (req, res) => {
  res.json({ success: true, data: trafficConfig.licenseTypes });
});

router.get('/config/violation-types', (req, res) => {
  res.json({ success: true, data: trafficConfig.violationTypes });
});

router.get('/config/inspection-centers', (req, res) => {
  res.json({ success: true, data: trafficConfig.inspectionCenters });
});

// ============ Statistics ============

router.get('/statistics', async (req, res) => {
  try {
    const stats = await saudiTrafficService.getTrafficStatistics(req.user?.tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Driver Licenses ============

router.get('/licenses', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter['license.status'] = req.query.status;
    if (req.query.type) filter['license.type'] = req.query.type;
    if (req.user?.tenantId) filter.tenantId = req.user.tenantId;
    
    const licenses = await saudiTrafficService.DriverLicense.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 100);
    
    res.json({ success: true, data: licenses, count: licenses.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/licenses/expiring', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const licenses = await saudiTrafficService.getExpiringLicenses(days);
    res.json({ success: true, data: licenses, count: licenses.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/licenses/national-id/:nationalId', async (req, res) => {
  try {
    const license = await saudiTrafficService.getLicenseByNationalId(req.params.nationalId);
    if (!license) return res.status(404).json({ success: false, error: 'License not found' });
    res.json({ success: true, data: license });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/licenses/:id', async (req, res) => {
  try {
    const license = await saudiTrafficService.DriverLicense.findById(req.params.id);
    if (!license) return res.status(404).json({ success: false, error: 'License not found' });
    res.json({ success: true, data: license });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/licenses', async (req, res) => {
  try {
    const license = await saudiTrafficService.createLicense({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: license, message: 'تم إصدار الرخصة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/licenses/:id/renew', async (req, res) => {
  try {
    const license = await saudiTrafficService.renewLicense(req.params.id, req.body);
    res.json({ success: true, data: license, message: 'تم تجديد الرخصة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Violations ============

router.get('/violations', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter['details.type'] = req.query.type;
    if (req.user?.tenantId) filter.tenantId = req.user.tenantId;
    
    const violations = await saudiTrafficService.TrafficViolation.find(filter)
      .sort({ 'details.dateTime': -1 })
      .limit(parseInt(req.query.limit) || 100);
    
    res.json({ success: true, data: violations, count: violations.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/violations/driver/:nationalId', async (req, res) => {
  try {
    const violations = await saudiTrafficService.getViolationsByDriver(req.params.nationalId);
    res.json({ success: true, data: violations, count: violations.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/violations/vehicle/:plateNumber/:plateLetters', async (req, res) => {
  try {
    const violations = await saudiTrafficService.getViolationsByVehicle(
      req.params.plateNumber,
      req.params.plateLetters
    );
    res.json({ success: true, data: violations, count: violations.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/violations/:violationId', async (req, res) => {
  try {
    const violation = await saudiTrafficService.TrafficViolation.findOne({ 
      violationId: req.params.violationId 
    });
    if (!violation) return res.status(404).json({ success: false, error: 'Violation not found' });
    res.json({ success: true, data: violation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/violations', async (req, res) => {
  try {
    const violation = await saudiTrafficService.createViolation({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: violation, message: 'تم تسجيل المخالفة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/violations/:violationId/pay', async (req, res) => {
  try {
    const violation = await saudiTrafficService.payViolation(req.params.violationId, req.body);
    res.json({ success: true, data: violation, message: 'تم سداد المخالفة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/violations/:violationId/dispute', async (req, res) => {
  try {
    const violation = await saudiTrafficService.submitDispute(req.params.violationId, req.body);
    res.json({ success: true, data: violation, message: 'تم تقديم الاعتراض' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Accidents ============

router.get('/accidents', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.region) filter['location.region'] = req.query.region;
    if (req.user?.tenantId) filter.tenantId = req.user.tenantId;
    
    const accidents = await saudiTrafficService.TrafficAccident.find(filter)
      .sort({ dateTime: -1 })
      .limit(parseInt(req.query.limit) || 100);
    
    res.json({ success: true, data: accidents, count: accidents.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accidents/vehicle/:plateNumber', async (req, res) => {
  try {
    const accidents = await saudiTrafficService.getAccidentsByVehicle(req.params.plateNumber);
    res.json({ success: true, data: accidents, count: accidents.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/accidents/:accidentId', async (req, res) => {
  try {
    const accident = await saudiTrafficService.getAccident(req.params.accidentId);
    if (!accident) return res.status(404).json({ success: false, error: 'Accident not found' });
    res.json({ success: true, data: accident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/accidents', async (req, res) => {
  try {
    const accident = await saudiTrafficService.createAccident({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: accident, message: 'تم تسجيل الحادث' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/accidents/:accidentId/status', async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const accident = await saudiTrafficService.updateAccidentStatus(
      req.params.accidentId,
      status,
      resolution
    );
    res.json({ success: true, data: accident, message: 'تم تحديث الحالة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;