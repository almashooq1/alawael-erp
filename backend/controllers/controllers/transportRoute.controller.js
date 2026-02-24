/**
 * Transport Route Controller - إدارة مسارات النقل
 */

const TransportRoute = require('../models/TransportRoute');
const RouteOptimizationService = require('../services/routeOptimization.service');

class TransportRouteController {
  /**
   * إنشاء مسار جديد
   * POST /api/transport-routes
   */
  static async createRoute(req, res) {
    try {
      // Validate coordinates in stops
      if (req.body.stops && Array.isArray(req.body.stops)) {
        for (const stop of req.body.stops) {
          if (stop.location && stop.location.coordinates) {
            const [lon, lat] = stop.location.coordinates;
            // Validate latitude (-90 to 90) and longitude (-180 to 180)
            if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
              return res.status(400).json({
                success: false,
                message: `Invalid coordinates for stop ${stop.stopNumber}: latitude must be between -90 and 90, longitude between -180 and 180`,
              });
            }
          }
        }
      }

      const route = new TransportRoute(req.body);

      // Auto-calculate total distance if stops exist
      if (route.stops && route.stops.length > 1) {
        let totalDistance = 0;
        for (let i = 0; i < route.stops.length - 1; i++) {
          const coords1 = route.stops[i].location.coordinates;
          const coords2 = route.stops[i + 1].location.coordinates;
          const distance = TransportRouteController.calculateHaversineDistance(coords1, coords2);
          totalDistance += distance;
        }
        route.totalDistance = Math.round(totalDistance * 10) / 10; // Round to 1 decimal place
      } else if (route.stops && route.stops.length === 1) {
        // Single stop or no distance
        route.totalDistance = route.totalDistance || 0;
      }

      await route.save();

      res.status(201).json({
        success: true,
        message: 'تم إنشاء المسار بنجاح',
        data: route,
      });
    } catch (error) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`,
          error: error.message,
        });
      }

      res.status(400).json({
        success: false,
        message: 'فشل إنشاء المسار',
        error: error.message,
      });
    }
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   */
  static calculateHaversineDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const deltaLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  /**
   * جلب جميع المسارات
   * GET /api/transport-routes
   */
  static async getAllRoutes(req, res) {
    try {
      const { status, type, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const query = {};

      if (status) query.status = status;
      if (type) query.type = type;
      
      // Search by route name or code
      if (search) {
        query.$or = [
          { routeName: { $regex: search, $options: 'i' } },
          { routeCode: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sortObj = {};
      const sortDirection = sortOrder === 'asc' ? 1 : -1;
      sortObj[sortBy] = sortDirection;

      const routes = await TransportRoute.find(query)
        .populate('assignedVehicle', 'vehicleNumber plateNumber type')
        .populate('assignedDriver', 'name email phone')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort(sortObj);

      const count = await TransportRoute.countDocuments(query);
      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          routes,
          total: count,
          currentPage: parseInt(page),
          totalPages: totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب المسارات',
        error: error.message,
      });
    }
  }

  /**
   * جلب مسار بواسطة ID
   * GET /api/transport-routes/:id
   */
  static async getRouteById(req, res) {
    try {
      const route = await TransportRoute.findById(req.params.id)
        .populate('assignedVehicle')
        .populate('assignedDriver', 'name email phone')
        .populate('passengers.user', 'name email phone');

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      res.json({
        success: true,
        data: route,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب المسار',
        error: error.message,
      });
    }
  }

  /**
   * جلب نقاط قريبة من المسار
   * GET /api/transport-routes/:id/nearby
   */
  static async getNearbyPoints(req, res) {
    try {
      const { latitude, longitude, radius = 5000 } = req.query;

      // Validate coordinates
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'latitude و longitude مطلوبان',
        });
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          success: false,
          message: 'إحداثيات غير صحيحة',
        });
      }

      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      // Find stops near the given coordinates
      const nearbyPoints = route.stops.filter(stop => {
        if (!stop.location || !stop.location.coordinates) return false;
        const [stopLon, stopLat] = stop.location.coordinates;
        
        // Simple distance calculation (Haversine formula)
        const R = 6371000; // Earth radius in meters
        const dLat = (stopLat - lat) * Math.PI / 180;
        const dLon = (stopLon - lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(stopLat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= radius;
      });

      res.json({
        success: true,
        data: {
          nearbyPoints,
          totalStops: route.stops.length,
          foundCount: nearbyPoints.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب النقاط القريبة',
        error: error.message,
      });
    }
  }

  /**
   * تحديث مسار
   * PUT /api/transport-routes/:id
   */
  static async updateRoute(req, res) {
    try {
      const route = await TransportRoute.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      res.json({
        success: true,
        message: 'تم تحديث المسار بنجاح',
        data: route,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث المسار',
        error: error.message,
      });
    }
  }

  /**
   * حذف مسار
   * DELETE /api/transport-routes/:id
   */
  static async deleteRoute(req, res) {
    try {
      const route = await TransportRoute.findByIdAndDelete(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      res.json({
        success: true,
        message: 'تم حذف المسار بنجاح',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل حذف المسار',
        error: error.message,
      });
    }
  }

  /**
   * تحديث حالة المسار
   * PATCH /api/transport-routes/:id/status
   */
  static async updateRouteStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ['active', 'inactive', 'maintenance', 'archived'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'حالة المسار غير صحيحة',
        });
      }

      const route = await TransportRoute.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      res.json({
        success: true,
        message: 'تم تحديث حالة المسار بنجاح',
        data: route,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل تحديث حالة المسار',
        error: error.message,
      });
    }
  }

  /**
   * تحسين المسار
   * POST /api/transport-routes/:id/optimize
   */
  static async optimizeRoute(req, res) {
    try {
      const route = await TransportRoute.findById(req.params.id).populate('assignedVehicle');

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      const options = req.body.options || {};
      const optimization = await RouteOptimizationService.optimizeRoute(route, options);

      if (!optimization) {
        return res.status(500).json({
          success: false,
          message: 'فشل حساب تحسين المسار',
        });
      }

      // تحديث بيانات التحسين
      if (!route.optimization) {
        route.optimization = {};
      }
      
      route.optimization.lastOptimized = new Date();
      route.optimization.optimizationScore = optimization.score || 0;
      route.optimization.suggestedChanges = (optimization.suggestions || []).map(s => ({
        type: s.type || 'unknown',
        description: s.description || '',
        estimatedImprovement: s.estimatedImprovement || 0,
        status: 'pending',
      }));

      await route.save();

      res.json({
        success: true,
        message: 'تم تحسين المسار بنجاح',
        data: {
          score: optimization.score,
          suggestions: optimization.suggestions,
          route: route,
        },
      });
    } catch (error) {
      console.error('Optimize error:', error.message);
      res.status(400).json({
        success: false,
        message: 'فشل تحسين المسار',
        error: error.message,
      });
    }
  }

  /**
   * إضافة راكب للمسار
   * POST /api/transport-routes/:id/passengers
   */
  static async addPassenger(req, res) {
    try {
      const { userId, pickupStop, dropoffStop, preferences } = req.body;

      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      const result = route.addPassenger(userId, pickupStop, dropoffStop, preferences);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      await route.save();

      res.status(201).json({
        success: true,
        message: 'تم إضافة الراكب بنجاح',
        data: route,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إضافة الراكب',
        error: error.message,
      });
    }
  }

  /**
   * إزالة راكب من المسار
   * DELETE /api/transport-routes/:id/passengers/:userId
   */
  static async removePassenger(req, res) {
    try {
      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      route.removePassenger(req.params.userId);
      await route.save();

      res.json({
        success: true,
        message: 'تم إزالة الراكب بنجاح',
        data: route,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إزالة الراكب',
        error: error.message,
      });
    }
  }

  /**
   * تحديث حالة الرحلة
   * POST /api/transport-routes/:id/trip-status
   */
  static async updateTripStatus(req, res) {
    try {
      const { status, delayMinutes } = req.body;

      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      route.updateTripStatus(status, delayMinutes);
      await route.save();

      res.json({
        success: true,
        message: 'تم تحديث حالة الرحلة بنجاح',
        data: {
          statistics: route.statistics,
          status: route.status,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث حالة الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * إضافة تقييم للمسار
   * POST /api/transport-routes/:id/rating
   */
  static async addRating(req, res) {
    try {
      const { userId, rating, comment } = req.body;

      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      route.addRating(userId, rating, comment);
      await route.save();

      res.status(201).json({
        success: true,
        message: 'تم إضافة التقييم بنجاح',
        data: {
          averageRating: route.averageRating,
          totalRatings: route.totalRatings,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إضافة التقييم',
        error: error.message,
      });
    }
  }

  /**
   * البحث عن مسارات قريبة
   * GET /api/transport-routes/nearby
   */
  static async findNearbyRoutes(req, res) {
    try {
      const { longitude, latitude, maxDistance = 1000 } = req.query;

      if (!longitude || !latitude) {
        return res.status(400).json({
          success: false,
          message: 'الإحداثيات مطلوبة',
        });
      }

      const routes = await TransportRoute.findNearbyRoutes(
        parseFloat(longitude),
        parseFloat(latitude),
        parseInt(maxDistance)
      );

      res.json({
        success: true,
        data: routes,
        count: routes.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل البحث عن المسارات',
        error: error.message,
      });
    }
  }

  /**
   * البحث عن مسارات متاحة
   * GET /api/transport-routes/available
   */
  static async findAvailableRoutes(req, res) {
    try {
      const { date, type } = req.query;

      const routes = await TransportRoute.findAvailable(date ? new Date(date) : new Date(), type);

      res.json({
        success: true,
        data: routes,
        count: routes.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل البحث عن المسارات المتاحة',
        error: error.message,
      });
    }
  }

  /**
   * جلب إحصائيات جميع المسارات
   * GET /api/transport-routes/statistics
   */
  static async getAllRoutesStatistics(req, res) {
    try {
      const routes = await TransportRoute.find();

      const statistics = {
        total: routes.length,
        active: routes.filter(r => r.status === 'active').length,
        inactive: routes.filter(r => r.status === 'inactive').length,
        byType: {
          morning: routes.filter(r => r.type === 'morning').length,
          afternoon: routes.filter(r => r.type === 'afternoon').length,
          evening: routes.filter(r => r.type === 'evening').length,
          special: routes.filter(r => r.type === 'special').length,
        },
        totalDistance: routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0),
        averageDistance: routes.length > 0 
          ? routes.reduce((sum, r) => sum + (r.totalDistance || 0), 0) / routes.length
          : 0,
      };

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب إحصائيات المسارات',
        error: error.message,
      });
    }
  }

  /**
   * اقتراح مسارات بديلة
   * POST /api/transport-routes/:id/alternatives
   */
  static async suggestAlternatives(req, res) {
    try {
      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      const { passengerNeeds } = req.body;
      const alternatives = await RouteOptimizationService.suggestAlternativeRoutes(
        route,
        passengerNeeds
      );

      res.json({
        success: true,
        message: 'تم إنشاء المسارات البديلة بنجاح',
        data: alternatives,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل إنشاء المسارات البديلة',
        error: error.message,
      });
    }
  }

  /**
   * إحصائيات المسار
   * GET /api/transport-routes/:id/statistics
   */
  static async getRouteStatistics(req, res) {
    try {
      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      const stats = {
        basic: {
          routeName: route.routeName,
          routeCode: route.routeCode,
          type: route.type,
          status: route.status,
        },
        capacity: {
          total: route.capacity.total,
          current: route.capacity.current,
          available: route.calculateAvailableCapacity(),
          utilizationRate: ((route.capacity.current / route.capacity.total) * 100).toFixed(2),
        },
        performance: {
          totalTrips: route.statistics.totalTrips,
          completedTrips: route.statistics.completedTrips,
          cancelledTrips: route.statistics.cancelledTrips,
          completionRate: (
            (route.statistics.completedTrips / (route.statistics.totalTrips || 1)) *
            100
          ).toFixed(2),
          onTimePercentage: route.statistics.onTimePercentage,
          averageDelay: route.statistics.averageDelayMinutes,
        },
        optimization: {
          score: route.optimization.optimizationScore,
          lastOptimized: route.optimization.lastOptimized,
          pendingSuggestions: route.optimization.suggestedChanges.filter(
            s => s.status === 'pending'
          ).length,
        },
        passengers: {
          totalServed: route.statistics.totalPassengersServed,
          current: route.passengerCount,
          stops: route.stopCount,
        },
        rating: {
          average: route.averageRating,
          total: route.totalRatings,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب إحصائيات المسار',
        error: error.message,
      });
    }
  }

  /**
   * تعيين مركبة للمسار
   * POST /api/transport-routes/:id/assign-vehicle
   */
  static async assignVehicle(req, res) {
    try {
      const { vehicleId } = req.body;

      const route = await TransportRoute.findById(req.params.id);

      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'المسار غير موجود',
        });
      }

      route.assignedVehicle = vehicleId;
      await route.save();

      await route.populate('assignedVehicle', 'vehicleNumber plateNumber type capacity');

      res.json({
        success: true,
        message: 'تم تعيين المركبة بنجاح',
        data: route,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تعيين المركبة',
        error: error.message,
      });
    }
  }
}

module.exports = TransportRouteController;
