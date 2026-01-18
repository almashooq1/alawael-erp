/**
 * Driver Management Service - خدمة إدارة السائقين
 *
 * إدارة السائقين والترخيص والأداء
 * ✅ Driver Management
 * ✅ License Tracking
 * ✅ Performance Monitoring
 * ✅ Violation Management
 */

const Driver = require('../models/Driver');
const logger = require('../utils/logger');

class DriverService {
  // ==================== إدارة السائقين ====================

  /**
   * إضافة سائق جديد
   */
  async addDriver(driverData) {
    try {
      const driver = new Driver(driverData);
      await driver.save();

      logger.info(`تمت إضافة سائق جديد: ${driver.personalInfo.firstName}`);
      return {
        success: true,
        message: 'تمت إضافة السائق بنجاح',
        driver,
      };
    } catch (error) {
      logger.error('خطأ في إضافة السائق:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع السائقين
   */
  async getAllDrivers(filters = {}) {
    try {
      const query = {};

      if (filters.status) query['employment.status'] = filters.status;
      if (filters.licenseStatus) {
        // يمكن إضافة منطق معقد هنا
      }
      if (filters.isActive !== undefined) query.isActive = filters.isActive;

      const drivers = await Driver.find(query)
        .populate('employment.employer')
        .populate('assignedVehicles')
        .populate('currentVehicle')
        .sort({ createdAt: -1 });

      return {
        success: true,
        count: drivers.length,
        drivers,
      };
    } catch (error) {
      logger.error('خطأ في جلب السائقين:', error);
      throw error;
    }
  }

  /**
   * الحصول على بيانات سائق معين
   */
  async getDriverDetails(driverId) {
    try {
      const driver = await Driver.findById(driverId)
        .populate('employment.employer')
        .populate('assignedVehicles')
        .populate('currentVehicle')
        .populate('documents');

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      return {
        success: true,
        driver,
      };
    } catch (error) {
      logger.error('خطأ في جلب بيانات السائق:', error);
      throw error;
    }
  }

  /**
   * تحديث بيانات السائق
   */
  async updateDriver(driverId, updateData) {
    try {
      const driver = await Driver.findByIdAndUpdate(driverId, updateData, { new: true });

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      logger.info(`تم تحديث بيانات السائق: ${driver.personalInfo.firstName}`);
      return {
        success: true,
        message: 'تم تحديث السائق بنجاح',
        driver,
      };
    } catch (error) {
      logger.error('خطأ في تحديث السائق:', error);
      throw error;
    }
  }

  /**
   * حذف سائق
   */
  async deleteDriver(driverId) {
    try {
      const driver = await Driver.findByIdAndDelete(driverId);

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      logger.info(`تم حذف السائق: ${driver.personalInfo.firstName}`);
      return {
        success: true,
        message: 'تم حذف السائق بنجاح',
      };
    } catch (error) {
      logger.error('خطأ في حذف السائق:', error);
      throw error;
    }
  }

  // ==================== إدارة الترخيص ====================

  /**
   * الحصول على حالة الترخيص
   */
  async getLicenseStatus(driverId) {
    try {
      const driver = await Driver.findById(driverId);

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      const now = new Date();
      const daysUntilExpiry = Math.floor((driver.license.expiryDate - now) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        licenseStatus: {
          licenseNumber: driver.license.licenseNumber,
          licenseClass: driver.license.licenseClass,
          issueDate: driver.license.issueDate,
          expiryDate: driver.license.expiryDate,
          status: driver.getLicenseStatus(),
          daysUntilExpiry: Math.max(daysUntilExpiry, 0),
          restrictions: driver.license.restrictions,
        },
      };
    } catch (error) {
      logger.error('خطأ في جلب حالة الترخيص:', error);
      throw error;
    }
  }

  /**
   * الحصول على السائقين الذين تقارب تواريخ انتهاء رخصهم
   */
  async getDriversWithExpiringLicenses(daysThreshold = 30) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysThreshold);

      const drivers = await Driver.find({
        'license.expiryDate': {
          $lte: targetDate,
          $gte: new Date(),
        },
        isActive: true,
      }).select('personalInfo license');

      return {
        success: true,
        count: drivers.length,
        drivers,
      };
    } catch (error) {
      logger.error('خطأ في جلب السائقين الذين تقارب تواريخ انتهاء رخصهم:', error);
      throw error;
    }
  }

  // ==================== إدارة المخالفات والنقاط ====================

  /**
   * تسجيل مخالفة للسائق
   */
  async recordViolation(driverId, violationData) {
    try {
      const driver = await Driver.findById(driverId);

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      await driver.addViolation({
        date: new Date(),
        ...violationData,
      });

      logger.info(`تم تسجيل مخالفة للسائق: ${driver.personalInfo.firstName}`);

      return {
        success: true,
        message: 'تم تسجيل المخالفة بنجاح',
        driver,
        currentPoints: driver.violationPoints.currentPoints,
        status: driver.violationPoints.status,
      };
    } catch (error) {
      logger.error('خطأ في تسجيل المخالفة:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل المخالفات
   */
  async getViolationHistory(driverId) {
    try {
      const driver = await Driver.findById(driverId).select('violations violationPoints personalInfo');

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      return {
        success: true,
        history: {
          driverName: `${driver.personalInfo.firstName} ${driver.personalInfo.lastName}`,
          totalViolations: driver.violations.length,
          currentPoints: driver.violationPoints.currentPoints,
          status: driver.violationPoints.status,
          violations: driver.violations.sort((a, b) => b.date - a.date),
        },
      };
    } catch (error) {
      logger.error('خطأ في جلب سجل المخالفات:', error);
      throw error;
    }
  }

  /**
   * الحصول على السائقين الممنوعين من القيادة
   */
  async getSuspendedDrivers() {
    try {
      const drivers = await Driver.find({
        'violationPoints.status': 'ممنوع',
        isActive: true,
      }).select('personalInfo violationPoints');

      return {
        success: true,
        count: drivers.length,
        drivers,
      };
    } catch (error) {
      logger.error('خطأ في جلب السائقين الممنوعين:', error);
      throw error;
    }
  }

  /**
   * إعادة تعيين النقاط السنوية
   */
  async resetAnnualPoints(driverId) {
    try {
      const driver = await Driver.findById(driverId);

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      driver.violationPoints.currentPoints = 0;
      driver.violationPoints.status = 'آمن';
      driver.violationPoints.resetDate = new Date();

      await driver.save();

      logger.info(`تم إعادة تعيين نقاط السائق: ${driver.personalInfo.firstName}`);

      return {
        success: true,
        message: 'تم إعادة تعيين النقاط بنجاح',
        driver,
      };
    } catch (error) {
      logger.error('خطأ في إعادة تعيين النقاط:', error);
      throw error;
    }
  }

  // ==================== إدارة الحوادث ====================

  /**
   * تسجيل حادثة
   */
  async recordAccident(driverId, accidentData) {
    try {
      const driver = await Driver.findById(driverId);

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      await driver.recordAccident({
        date: new Date(),
        ...accidentData,
      });

      logger.info(`تم تسجيل حادثة للسائق: ${driver.personalInfo.firstName}`);

      return {
        success: true,
        message: 'تم تسجيل الحادثة بنجاح',
        driver,
      };
    } catch (error) {
      logger.error('خطأ في تسجيل الحادثة:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل الحوادث
   */
  async getAccidentHistory(driverId) {
    try {
      const driver = await Driver.findById(driverId).select('accidents personalInfo');

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      return {
        success: true,
        history: {
          driverName: `${driver.personalInfo.firstName} ${driver.personalInfo.lastName}`,
          totalAccidents: driver.accidents.length,
          accidents: driver.accidents.sort((a, b) => b.date - a.date),
        },
      };
    } catch (error) {
      logger.error('خطأ في جلب سجل الحوادث:', error);
      throw error;
    }
  }

  // ==================== إدارة الأداء ====================

  /**
   * الحصول على تقييم الأداء
   */
  async getPerformanceRating(driverId) {
    try {
      const driver = await Driver.findById(driverId).select('performance personalInfo');

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      return {
        success: true,
        performance: {
          driverName: `${driver.personalInfo.firstName} ${driver.personalInfo.lastName}`,
          overallRating: driver.performance.rating,
          totalTrips: driver.performance.totalTrips,
          onTimePercentage: driver.performance.onTimePercentage,
          safetyScore: driver.performance.safetyScore,
          customerRating: driver.performance.customerRating,
          recentReviews: driver.performance.reviews.slice(-5),
        },
      };
    } catch (error) {
      logger.error('خطأ في جلب تقييم الأداء:', error);
      throw error;
    }
  }

  /**
   * تحديث تقييم الأداء
   */
  async updatePerformanceRating(driverId, rating, review) {
    try {
      const driver = await Driver.findById(driverId);

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      driver.performance.reviews.push({
        date: new Date(),
        rating,
        comment: review,
      });

      // حساب متوسط التقييم
      const avgRating = driver.performance.reviews.reduce((sum, r) => sum + r.rating, 0) / driver.performance.reviews.length;
      driver.performance.customerRating = avgRating.toFixed(2);

      await driver.save();

      logger.info(`تم تحديث تقييم الأداء للسائق: ${driver.personalInfo.firstName}`);

      return {
        success: true,
        message: 'تم تحديث التقييم بنجاح',
        driver,
      };
    } catch (error) {
      logger.error('خطأ في تحديث التقييم:', error);
      throw error;
    }
  }

  // ==================== إدارة التدريب ====================

  /**
   * الحصول على حالة التدريب والشهادات
   */
  async getTrainingStatus(driverId) {
    try {
      const driver = await Driver.findById(driverId).select('training personalInfo');

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      return {
        success: true,
        training: {
          driverName: `${driver.personalInfo.firstName} ${driver.personalInfo.lastName}`,
          defensiveDriving: {
            completed: driver.training.defensiveDriving.completed,
            certificateDate: driver.training.defensiveDriving.certificateDate,
            expiryDate: driver.training.defensiveDriving.expiryDate,
            needsRenewal: driver.training.defensiveDriving.expiryDate && new Date() > driver.training.defensiveDriving.expiryDate,
          },
          safetyTraining: {
            completed: driver.training.safetyTraining.completed,
            certificateDate: driver.training.safetyTraining.certificateDate,
          },
          firstAid: {
            completed: driver.training.firstAid.completed,
            certificateDate: driver.training.firstAid.certificateDate,
            expiryDate: driver.training.firstAid.expiryDate,
            needsRenewal: driver.training.firstAid.expiryDate && new Date() > driver.training.firstAid.expiryDate,
          },
          otherCertificates: driver.training.otherCertificates,
        },
      };
    } catch (error) {
      logger.error('خطأ في جلب حالة التدريب:', error);
      throw error;
    }
  }

  /**
   * الحصول على السائقين الذين يحتاجون تدريب
   */
  async getDriversNeedingTraining() {
    try {
      const now = new Date();

      const drivers = await Driver.find({
        $or: [
          { 'training.defensiveDriving.completed': false },
          { 'training.defensiveDriving.expiryDate': { $lte: now } },
          { 'training.safetyTraining.completed': false },
        ],
        isActive: true,
      }).select('personalInfo training');

      return {
        success: true,
        count: drivers.length,
        drivers,
      };
    } catch (error) {
      logger.error('خطأ في جلب السائقين الذين يحتاجون تدريب:', error);
      throw error;
    }
  }

  // ==================== تقارير ====================

  /**
   * الحصول على تقرير شامل عن السائق
   */
  async getComprehensiveReport(driverId) {
    try {
      const driver = await Driver.findById(driverId)
        .populate('assignedVehicles', 'registrationNumber plateNumber')
        .populate('currentVehicle', 'registrationNumber plateNumber');

      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      return {
        success: true,
        report: {
          personalInfo: driver.personalInfo,
          license: {
            licenseNumber: driver.license.licenseNumber,
            licenseClass: driver.license.licenseClass,
            status: driver.getLicenseStatus(),
            expiryDate: driver.license.expiryDate,
          },
          violations: {
            totalViolations: driver.violations.length,
            currentPoints: driver.violationPoints.currentPoints,
            pointsStatus: driver.violationPoints.status,
          },
          accidents: {
            totalAccidents: driver.accidents.length,
          },
          performance: {
            overallRating: driver.performance.rating,
            totalTrips: driver.performance.totalTrips,
            safetyScore: driver.performance.safetyScore,
            customerRating: driver.performance.customerRating,
          },
          employment: {
            status: driver.employment.status,
            hireDate: driver.employment.hireDate,
            position: driver.employment.position,
          },
          assignedVehicles: driver.assignedVehicles,
          currentVehicle: driver.currentVehicle,
        },
      };
    } catch (error) {
      logger.error('خطأ في جلب التقرير الشامل:', error);
      throw error;
    }
  }
}

module.exports = DriverService;
