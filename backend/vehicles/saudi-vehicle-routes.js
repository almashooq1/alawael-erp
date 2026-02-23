/**
 * Saudi Vehicle Routes - مسارات المركبات السعودية
 * API Endpoints for Saudi Vehicle Management
 */

const express = require('express');
const router = express.Router();
const { saudiVehicleService, saudiConfig } = require('./saudi-vehicle-service');

// ============ Configuration ============

router.get('/config/regions', (req, res) => {
  res.json({ success: true, data: saudiConfig.regions });
});

router.get('/config/plate-types', (req, res) => {
  res.json({ success: true, data: saudiConfig.plateTypes });
});

router.get('/config/fuel-types', (req, res) => {
  res.json({ success: true, data: saudiConfig.fuelTypes });
});

router.get('/config/insurance-companies', (req, res) => {
  res.json({ success: true, data: saudiConfig.insuranceCompanies });
});

// ============ Vehicles ============

router.get('/', async (req, res) => {
  try {
    const vehicles = await saudiVehicleService.getVehicles({
      region: req.query.region,
      plateType: req.query.plateType,
      status: req.query.status,
      tenantId: req.user?.tenantId,
      limit: parseInt(req.query.limit) || 100,
    });
    res.json({ success: true, data: vehicles, count: vehicles.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const stats = await saudiVehicleService.getFleetStatistics(req.user?.tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/expiring-documents', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const expiring = await saudiVehicleService.getExpiringDocuments(days);
    res.json({ success: true, data: expiring });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/plate/:number/:letters/:region', async (req, res) => {
  try {
    const { number, letters, region } = req.params;
    const vehicle = await saudiVehicleService.getVehicleByPlate(number, letters.split(''), region);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.createVehicle({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: vehicle, message: 'تم إضافة المركبة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.updateVehicle(req.params.id, req.body);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle, message: 'تم تحديث المركبة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Violations (مخالفات ساهر) ============

router.get('/:id/violations', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle.violations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/violations', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.addViolation(req.params.id, req.body);
    res.status(201).json({ success: true, data: vehicle, message: 'تم إضافة المخالفة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/violations/:violationId/pay', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.payViolation(req.params.id, req.params.violationId, req.body);
    res.json({ success: true, data: vehicle, message: 'تم سداد المخالفة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Trips (الرحلات) ============

router.get('/:id/trips', async (req, res) => {
  try {
    const trips = await saudiVehicleService.getVehicleTrips(req.params.id, {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/trips', async (req, res) => {
  try {
    const trip = await saudiVehicleService.createTrip({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: trip, message: 'تم إنشاء الرحلة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/trips/:tripId/start', async (req, res) => {
  try {
    const trip = await saudiVehicleService.startTrip(req.params.tripId, req.body);
    res.json({ success: true, data: trip, message: 'تم بدء الرحلة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/trips/:tripId/complete', async (req, res) => {
  try {
    const trip = await saudiVehicleService.completeTrip(req.params.tripId, req.body);
    res.json({ success: true, data: trip, message: 'تم إكمال الرحلة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Fuel (الوقود) ============

router.get('/:id/fuel', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle.fuelLog });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/fuel/statistics', async (req, res) => {
  try {
    const stats = await saudiVehicleService.getFuelStatistics(req.params.id, req.query.period);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/fuel', async (req, res) => {
  try {
    const vehicle = await saudiVehicleService.addFuelLog(req.params.id, {
      ...req.body,
      filledBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: vehicle, message: 'تم تسجيل التعبئة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;