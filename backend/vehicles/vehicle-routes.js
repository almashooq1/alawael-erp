/**
 * Vehicle Routes - مسارات المركبات
 * API Endpoints for Vehicle Management
 */

const express = require('express');
const router = express.Router();
const { vehicleManagementService } = require('./vehicle-service');

// ============ Vehicles ============

router.get('/', async (req, res) => {
  try {
    const vehicles = await vehicleManagementService.getVehicles({
      type: req.query.type,
      status: req.query.status,
      departmentId: req.query.departmentId,
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
    const stats = await vehicleManagementService.getStatistics(req.user?.tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/available', async (req, res) => {
  try {
    const vehicles = await vehicleManagementService.getAvailableVehicles({
      departmentId: req.query.departmentId,
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null,
      tenantId: req.user?.tenantId,
    });
    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vehicle = await vehicleManagementService.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const vehicle = await vehicleManagementService.createVehicle({
      ...req.body,
      createdBy: req.user?.id,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: vehicle, message: 'تم إضافة المركبة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const vehicle = await vehicleManagementService.updateVehicle(req.params.id, req.body, req.user?.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle, message: 'تم تحديث المركبة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const vehicle = await vehicleManagementService.updateVehicleStatus(
      req.params.id, req.body.status, req.user?.id, req.body.reason
    );
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: vehicle, message: 'تم تحديث حالة المركبة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Bookings ============

router.get('/:vehicleId/bookings', async (req, res) => {
  try {
    const bookings = await vehicleManagementService.getVehicleBookings(req.params.vehicleId, {
      status: req.query.status,
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null,
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const booking = await vehicleManagementService.createBooking({
      ...req.body,
      bookedBy: req.user?.id,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: booking, message: 'تم إنشاء الحجز' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/bookings/:bookingId/cancel', async (req, res) => {
  try {
    const booking = await vehicleManagementService.cancelBooking(req.params.bookingId, req.user?.id, req.body.reason);
    res.json({ success: true, data: booking, message: 'تم إلغاء الحجز' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/bookings/:bookingId/complete', async (req, res) => {
  try {
    const booking = await vehicleManagementService.completeBooking(req.params.bookingId, req.body);
    res.json({ success: true, data: booking, message: 'تم إكمال الرحلة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Maintenance ============

router.get('/:vehicleId/maintenance', async (req, res) => {
  try {
    const records = await vehicleManagementService.getMaintenanceRecords(req.params.vehicleId);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:vehicleId/maintenance', async (req, res) => {
  try {
    const record = await vehicleManagementService.addMaintenanceRecord(req.params.vehicleId, {
      ...req.body,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: record, message: 'تم إضافة سجل الصيانة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Fuel ============

router.get('/:vehicleId/fuel', async (req, res) => {
  try {
    const records = await vehicleManagementService.getFuelRecords(req.params.vehicleId, {
      startDate: req.query.startDate ? new Date(req.query.startDate) : null,
      endDate: req.query.endDate ? new Date(req.query.endDate) : null,
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:vehicleId/fuel', async (req, res) => {
  try {
    const record = await vehicleManagementService.addFuelRecord(req.params.vehicleId, {
      ...req.body,
      filledBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: record, message: 'تم تسجيل التعبئة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Drivers ============

router.post('/:vehicleId/driver', async (req, res) => {
  try {
    const vehicle = await vehicleManagementService.assignDriver(req.params.vehicleId, req.body);
    res.json({ success: true, data: vehicle, message: 'تم تعيين السائق' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:vehicleId/driver', async (req, res) => {
  try {
    const vehicle = await vehicleManagementService.removeDriver(req.params.vehicleId);
    res.json({ success: true, data: vehicle, message: 'تم إلغاء تعيين السائق' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;