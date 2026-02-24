/**
 * Vehicle Controller - إدارة المركبات
 */

const Vehicle = require('../models/Vehicle');

class VehicleController {
  /**
   * إنشاء مركبة جديدة
   * POST /api/vehicles
   */
  static async createVehicle(req, res) {
    try {
      // Validate year range (1990 to current year)
      const currentYear = new Date().getFullYear();
      if (req.body.year && (req.body.year < 1990 || req.body.year > currentYear)) {
        return res.status(400).json({
          success: false,
          message: `Year must be between 1990 and ${currentYear}`,
        });
      }

      // Check for duplicate plate number
      const existingVehicle = await Vehicle.findOne({ plateNumber: req.body.plateNumber });
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: `Vehicle with plate number ${req.body.plateNumber} already exists`,
        });
      }

      const vehicle = new Vehicle(req.body);
      await vehicle.save();

      res.status(201).json({
        success: true,
        message: 'تم إنشاء المركبة بنجاح',
        data: vehicle,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إنشاء المركبة',
        error: error.message,
      });
    }
  }

  /**
   * جلب جميع المركبات
   * GET /api/vehicles
   */
  static async getAllVehicles(req, res) {
    try {
      const { status, type, search, page = 1, limit = 20 } = req.query;
      const query = {};

      if (status) query.status = status;
      if (type) query.type = type;

      // Search by plate number
      if (search) {
        query.plateNumber = { $regex: search, $options: 'i' };
      }

      const vehicles = await Vehicle.find(query)
        .populate('currentDriver', 'name email phone')
        .populate('currentRoute', 'routeName routeCode')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const count = await Vehicle.countDocuments(query);
      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          vehicles,
          total: count,
          currentPage: parseInt(page),
          totalPages: totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب المركبات',
        error: error.message,
      });
    }
  }

  /**
   * جلب مركبة بواسطة ID
   * GET /api/vehicles/:id
   */
  static async getVehicleById(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id)
        .populate('currentDriver', 'name email phone')
        .populate('driver', 'name email phone')
        .populate('currentRoute')
        .populate('assignedPassengers', 'name email phone');

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      res.json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب المركبة',
        error: error.message,
      });
    }
  }

  /**
   * تحديث مركبة
   * PUT /api/vehicles/:id
   */
  static async updateVehicle(req, res) {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      res.json({
        success: true,
        message: 'تم تحديث المركبة بنجاح',
        data: vehicle,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث المركبة',
        error: error.message,
      });
    }
  }

  /**
   * حذف مركبة
   * DELETE /api/vehicles/:id
   */
  static async deleteVehicle(req, res) {
    try {
      const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      res.json({
        success: true,
        message: 'Vehicle deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل حذف المركبة',
        error: error.message,
      });
    }
  }

  /**
   * تحديث موقع GPS للمركبة
   * PATCH /api/vehicles/:id/gps
   */
  static async updateGPS(req, res) {
    try {
      const { longitude, latitude, speed, heading } = req.body;

      // Validate coordinates
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'latitude و longitude مطلوبان',
        });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'إحداثيات GPS غير صحيحة',
        });
      }

      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      const location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };

      // تحديث الموقع
      await vehicle.updateGPSLocation(location, speed, heading);

      res.json({
        success: true,
        message: 'تم تحديث الموقع بنجاح',
        data: {
          currentLocation: vehicle.gpsDevice.currentLocation,
          currentSpeed: vehicle.currentSpeed,
          heading: vehicle.gpsDevice.heading,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث الموقع',
        error: error.message,
      });
    }
  }

  /**
   * إضافة إنذار طوارئ
   * POST /api/vehicles/:id/emergency
   */
  static async addEmergencyAlert(req, res) {
    try {
      const { type, severity, description, location } = req.body;

      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      await vehicle.addEmergencyAlert({
        type,
        severity,
        description,
        location: {
          type: 'Point',
          coordinates: location.coordinates,
        },
      });

      res.status(201).json({
        success: true,
        message: 'تم إضافة إنذار الطوارئ بنجاح',
        data: vehicle.safety.emergencyAlerts[vehicle.safety.emergencyAlerts.length - 1],
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إضافة إنذار الطوارئ',
        error: error.message,
      });
    }
  }

  /**
   * تحديث استهلاك الوقود
   * POST /api/vehicles/:id/fuel
   */
  static async updateFuel(req, res) {
    try {
      const { distance, refill } = req.body;

      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      if (distance) {
        await vehicle.updateFuelConsumption(distance);
      }

      if (refill) {
        vehicle.fuelConsumption.currentFuelLevel = Math.min(
          vehicle.fuelConsumption.tankCapacity,
          vehicle.fuelConsumption.currentFuelLevel + refill.liters
        );

        vehicle.fuelConsumption.lastRefill = {
          date: new Date(),
          liters: refill.liters,
          cost: refill.cost,
          location: refill.location,
        };

        await vehicle.save();
      }

      res.json({
        success: true,
        message: 'تم تحديث بيانات الوقود بنجاح',
        data: {
          currentLevel: vehicle.fuelConsumption.currentFuelLevel,
          status: vehicle.fuelStatus,
          lastRefill: vehicle.fuelConsumption.lastRefill,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث بيانات الوقود',
        error: error.message,
      });
    }
  }

  /**
   * البحث عن مركبات قريبة
   * GET /api/vehicles/nearby
   */
  static async findNearbyVehicles(req, res) {
    try {
      const { longitude, latitude, maxDistance = 5000 } = req.query;

      if (!longitude || !latitude) {
        return res.status(400).json({
          success: false,
          message: 'الإحداثيات مطلوبة',
        });
      }

      const vehicles = await Vehicle.findNearby(
        parseFloat(longitude),
        parseFloat(latitude),
        parseInt(maxDistance)
      );

      res.json({
        success: true,
        data: vehicles,
        count: vehicles.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل البحث عن المركبات',
        error: error.message,
      });
    }
  }

  /**
   * البحث عن مركبات متاحة
   * GET /api/vehicles/available
   */
  static async findAvailableVehicles(req, res) {
    try {
      const { capacity } = req.query;

      const vehicles = await Vehicle.findAvailable(capacity ? parseInt(capacity) : undefined);

      res.json({
        success: true,
        data: vehicles,
        count: vehicles.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل البحث عن المركبات المتاحة',
        error: error.message,
      });
    }
  }

  /**
   * إحصائيات المركبة
   * GET /api/vehicles/:id/statistics
   */
  static async getVehicleStatistics(req, res) {
    try {
      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      const stats = {
        basic: {
          vehicleNumber: vehicle.vehicleNumber,
          type: vehicle.type,
          status: vehicle.status,
        },
        performance: {
          totalDistance: vehicle.statistics.totalDistanceCovered,
          averageSpeed: vehicle.statistics.averageSpeed,
          totalTrips: vehicle.statistics.tripCount,
        },
        fuel: {
          currentLevel: vehicle.fuelConsumption.currentFuelLevel,
          status: vehicle.fuelStatus,
          totalConsumed: vehicle.statistics.totalFuelConsumed,
          averageConsumption: vehicle.fuelConsumption.averageConsumption,
        },
        maintenance: {
          status: vehicle.maintenanceStatus,
          nextDate: vehicle.maintenance.nextMaintenanceDate,
          totalCost: vehicle.statistics.totalMaintenanceCost,
          odometer: vehicle.maintenance.odometer,
        },
        safety: {
          activeAlerts: vehicle.safety.emergencyAlerts.filter(a => !a.resolved).length,
          totalIncidents: vehicle.safety.totalIncidents,
          lastInspection: vehicle.safety.lastInspectionDate,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب إحصائيات المركبة',
        error: error.message,
      });
    }
  }

  /**
   * تعيين سائق للمركبة
   * POST /api/vehicles/:id/assign-driver
   */
  static async assignDriver(req, res) {
    try {
      const { driverId } = req.body;

      const vehicle = await Vehicle.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      vehicle.currentDriver = driverId;
      await vehicle.save();

      await vehicle.populate('currentDriver', 'name email phone');

      res.json({
        success: true,
        message: 'تم تعيين السائق بنجاح',
        data: vehicle,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تعيين السائق',
        error: error.message,
      });
    }
  }

  /**
   * جلب إحصائيات المركبات
   * GET /api/vehicles/statistics
   */
  static async listVehicleStatistics(req, res) {
    try {
      const vehicles = await Vehicle.find();

      const statistics = {
        total: vehicles.length,
        active: vehicles.filter(v => v.status === 'active').length,
        maintenance: vehicles.filter(v => v.status === 'maintenance').length,
        outOfService: vehicles.filter(v => v.status === 'inactive').length,
        byType: {
          bus: vehicles.filter(v => v.type === 'bus').length,
          van: vehicles.filter(v => v.type === 'van').length,
          car: vehicles.filter(v => v.type === 'car').length,
          truck: vehicles.filter(v => v.type === 'truck').length,
        },
        lowFuelCount: vehicles.filter(
          v => (v.fuelLevel || v.fuelConsumption?.currentFuelLevel || 100) < 20
        ).length,
      };

      res.json({
        success: true,
        message: 'تم جلب إحصائيات المركبات بنجاح',
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب إحصائيات المركبات',
        error: error.message,
      });
    }
  }

  /**
   * جلب المركبات منخفضة الوقود
   * GET /api/vehicles/low-fuel
   */
  static async getLowFuelVehicles(req, res) {
    try {
      const { threshold = 20 } = req.query;

      const vehicles = await Vehicle.find({
        $or: [
          { 'fuelConsumption.currentFuelLevel': { $lt: parseInt(threshold) } },
          { fuelLevel: { $lt: parseInt(threshold) } },
        ],
      });

      res.json({
        success: true,
        message: 'تم جلب المركبات منخفضة الوقود بنجاح',
        data: vehicles,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب المركبات منخفضة الوقود',
        error: error.message,
      });
    }
  }

  /**
   * إضافة سجل صيانة
   * POST /api/vehicles/:id/maintenance
   */
  static async addMaintenanceRecord(req, res) {
    try {
      const { id } = req.params;
      const { type, description, cost, workshop } = req.body;

      // Validate required fields
      if (!type || !description) {
        return res.status(400).json({
          success: false,
          message: 'نوع الصيانة والوصف مطلوبان',
        });
      }

      // Find the vehicle first
      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'المركبة غير موجودة',
        });
      }

      // Create maintenance record object
      const maintenanceRecord = {
        date: new Date(),
        type,
        description,
        cost: cost || 0,
        workshop: workshop || 'Unknown',
      };

      // Add to maintenanceHistory array
      if (!vehicle.maintenanceHistory) {
        vehicle.maintenanceHistory = [];
      }
      vehicle.maintenanceHistory.push(maintenanceRecord);

      // Update maintenance date
      if (!vehicle.maintenance) {
        vehicle.maintenance = {};
      }
      vehicle.maintenance.lastMaintenanceDate = new Date();

      // Save the vehicle
      const updatedVehicle = await vehicle.save();

      res.status(201).json({
        success: true,
        message: 'تم إضافة سجل الصيانة بنجاح',
        data: updatedVehicle,
      });
    } catch (error) {
      console.error('Maintenance error details:', error.message);
      res.status(400).json({
        success: false,
        message: 'فشل إضافة سجل الصيانة',
        error: error.message,
      });
    }
  }
}

module.exports = VehicleController;
