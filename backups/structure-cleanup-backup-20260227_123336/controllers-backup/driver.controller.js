/**
 * Driver Controller - متحكم السائقين
 * يدير جميع عمليات إدارة السائقين
 */

const Driver = require('../models/Driver');
const User = require('../models/User');
const DriverManagementService = require('../services/driverManagement.service');

class DriverController {
  /**
   * إنشاء سائق جديد
   * POST /api/drivers
   */
  static async createDriver(req, res) {
    try {
      const {
        userId,
        firstName,
        lastName,
        email,
        personalPhone,
        employeeId,
        hireDate,
        licenseNumber,
        licenseType,
        licenseExpiryDate,
        ...otherData
      } = req.body;

      // التحقق من وجود المستخدم
      const user = await User.findById(userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'المستخدم غير موجود',
        });
      }

      // التحقق من عدم وجود سائق بنفس رقم الموظف
      const existingDriver = await Driver.findOne({ employeeId });
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: 'رقم الموظف موجود بالفعل',
        });
      }

      // إنشاء السائق
      const driver = new Driver({
        userId,
        firstName,
        lastName,
        email,
        personalPhone,
        employeeId,
        hireDate,
        licenseDetails: {
          licenseNumber,
          licenseType,
          expiryDate: licenseExpiryDate,
          isValid: true,
        },
        ...otherData,
      });

      await driver.save();

      // تحديث دور المستخدم
      await User.findByIdAndUpdate(userId, { role: 'driver' });

      res.status(201).json({
        success: true,
        message: 'تم إنشاء السائق بنجاح',
        data: driver,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إنشاء السائق',
        error: error.message,
      });
    }
  }

  /**
   * جلب جميع السائقين
   * GET /api/drivers
   */
  static async getAllDrivers(req, res) {
    try {
      const { status, search, page = 1, limit = 20, sortBy = '-createdAt' } = req.query;

      const query = { isActive: true };

      if (status) query.status = status;

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const drivers = await Driver.find(query)
        .populate('userId', 'name email phone')
        .populate('manager', 'name email')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort(sortBy);

      const count = await Driver.countDocuments(query);
      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          drivers,
          total: count,
          currentPage: parseInt(page),
          totalPages: totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب السائقين',
        error: error.message,
      });
    }
  }

  /**
   * جلب سائق بواسطة ID
   * GET /api/drivers/:id
   */
  static async getDriver(req, res) {
    try {
      const { id } = req.params;

      const driver = await Driver.findById(id)
        .populate('userId', 'name email phone')
        .populate('manager', 'name email')
        .populate('assignedVehicles.vehicle', 'vehicleNumber plateNumber type');

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      res.json({
        success: true,
        data: driver,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب السائق',
        error: error.message,
      });
    }
  }

  /**
   * تحديث بيانات السائق
   * PUT /api/drivers/:id
   */
  static async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // لا يمكن تحديث المعرف
      delete updates.userId;
      delete updates.employeeId;

      const driver = await Driver.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('userId', 'name email phone')
        .populate('manager', 'name email');

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      res.json({
        success: true,
        message: 'تم تحديث السائق بنجاح',
        data: driver,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث السائق',
        error: error.message,
      });
    }
  }

  /**
   * حذف سائق (إلغاء تفعيل)
   * DELETE /api/drivers/:id
   */
  static async deleteDriver(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const driver = await Driver.findByIdAndUpdate(
        id,
        {
          isActive: false,
          status: 'inactive',
          deactivationDate: new Date(),
          deactivationReason: reason,
        },
        { new: true }
      );

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      res.json({
        success: true,
        message: 'تم إلغاء تفعيل السائق',
        data: driver,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل حذف السائق',
        error: error.message,
      });
    }
  }

  /**
   * جلب تقييم أداء السائق الشامل
   * GET /api/drivers/:id/performance
   */
  static async getPerformance(req, res) {
    try {
      const { id } = req.params;

      // تحديث جميع درجات الأداء
      const report = await DriverManagementService.generateComprehensiveReport(id);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب تقرير الأداء',
        error: error.message,
      });
    }
  }

  /**
   * إضافة انتهاك للسائق
   * POST /api/drivers/:id/violations
   */
  static async addViolation(req, res) {
    try {
      const { id } = req.params;
      const { violationType, _description, severity } = req.body;

      const driver = await Driver.findById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      await driver.addViolation(violationType);

      // تحديث درجة الأمان
      await DriverManagementService.calculateSafetyScore(id);

      res.json({
        success: true,
        message: 'تم تسجيل الانتهاك',
        data: {
          driver: driver.fullName,
          violationType,
          severity,
          totalViolations: driver.violations.totalViolations,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل تسجيل الانتهاك',
        error: error.message,
      });
    }
  }

  /**
   * جلب قائمة الانتهاكات
   * GET /api/drivers/:id/violations
   */
  static async getViolations(req, res) {
    try {
      const { id } = req.params;

      const driver = await Driver.findById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      res.json({
        success: true,
        data: {
          driverName: driver.fullName,
          violations: driver.violations,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب الانتهاكات',
        error: error.message,
      });
    }
  }

  /**
   * إضافة شهادة للسائق
   * POST /api/drivers/:id/certifications
   */
  static async addCertification(req, res) {
    try {
      const { id } = req.params;
      const { name, issueDate, expiryDate, certificateNumber, provider } = req.body;

      const driver = await Driver.findById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      driver.certifications.push({
        name,
        issueDate,
        expiryDate,
        certificateNumber,
        provider,
        isActive: true,
      });

      await driver.save();

      res.json({
        success: true,
        message: 'تم إضافة الشهادة بنجاح',
        data: driver.certifications,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إضافة الشهادة',
        error: error.message,
      });
    }
  }

  /**
   * تعيين سيارة للسائق
   * POST /api/drivers/:id/assign-vehicle
   */
  static async assignVehicle(req, res) {
    try {
      const { id } = req.params;
      const { vehicleId } = req.body;

      const driver = await Driver.findById(id);
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      // إضافة السيارة إلى قائمة السيارات المخصصة
      driver.assignedVehicles.push({
        vehicle: vehicleId,
        assignmentDate: new Date(),
        status: 'active',
      });

      await driver.save();

      res.json({
        success: true,
        message: 'تم تعيين السيارة للسائق',
        data: driver.assignedVehicles,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تعيين السيارة',
        error: error.message,
      });
    }
  }

  /**
   * جلب السائقين الذين يحتاجون تدريب
   * GET /api/drivers/training/needs
   */
  static async getDriversNeedingTraining(req, res) {
    try {
      const drivers = await DriverManagementService.getDriversNeedingTraining();

      res.json({
        success: true,
        data: {
          drivers,
          total: drivers.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب السائقين الذين يحتاجون تدريب',
        error: error.message,
      });
    }
  }

  /**
   * جلب أفضل السائقين
   * GET /api/drivers/top/performers
   */
  static async getTopPerformers(req, res) {
    try {
      const { limit = 10 } = req.query;

      const drivers = await DriverManagementService.getTopPerformers(parseInt(limit));

      res.json({
        success: true,
        data: {
          drivers,
          total: drivers.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب أفضل السائقين',
        error: error.message,
      });
    }
  }

  /**
   * التنبؤ برخصات القيادة التي ستنتهي قريباً
   * GET /api/drivers/predictions/expiring-licenses
   */
  static async getExpiringLicenses(req, res) {
    try {
      const licenses = await DriverManagementService.predictExpiringLicenses();

      res.json({
        success: true,
        data: {
          licenses,
          total: licenses.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب رخصات القيادة التي ستنتهي',
        error: error.message,
      });
    }
  }

  /**
   * جلب التنبؤ بمعدل الغياب
   * GET /api/drivers/:id/predictions/absence
   */
  static async getAbsencePrediction(req, res) {
    try {
      const { id } = req.params;

      const prediction = await DriverManagementService.predictAbsenceRate(id);

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب التنبؤ بمعدل الغياب',
        error: error.message,
      });
    }
  }

  /**
   * جلب اتجاه الأداء
   * GET /api/drivers/:id/predictions/trend
   */
  static async getPerformanceTrend(req, res) {
    try {
      const { id } = req.params;

      const trend = await DriverManagementService.predictPerformanceTrend(id);

      res.json({
        success: true,
        data: trend,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب اتجاه الأداء',
        error: error.message,
      });
    }
  }

  /**
   * جلب  إحصائيات عامة عن السائقين
   * GET /api/drivers/analytics/overview
   */
  static async getAnalyticsOverview(req, res) {
    try {
      const totalDrivers = await Driver.countDocuments();
      const activeDrivers = await Driver.countDocuments({ isActive: true, status: 'active' });
      const onLeaveDrivers = await Driver.countDocuments({ status: 'on_leave' });
      const suspendedDrivers = await Driver.countDocuments({ status: 'suspended' });

      // متوسط درجات الأداء
      const avgPerformance = await Driver.aggregate([
        {
          $group: {
            _id: null,
            avgSafety: { $avg: '$performance.safetyScore' },
            avgReliability: { $avg: '$performance.reliabilityScore' },
            avgCustomerService: { $avg: '$performance.customerServiceScore' },
            avgOverall: { $avg: '$performance.overallRating' },
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          totalDrivers,
          activeDrivers,
          onLeaveDrivers,
          suspendedDrivers,
          performance: avgPerformance[0] || {},
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب الإحصائيات',
        error: error.message,
      });
    }
  }
}

module.exports = DriverController;
