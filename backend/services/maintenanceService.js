const Maintenance = require('../models/Maintenance');
const MaintenancePrediction = require('../models/MaintenancePrediction');
const logger = require('../utils/logger');

/**
 * MaintenanceService
 * Manages asset maintenance schedules, records, and predictions
 */
class MaintenanceService {

  // ============ SCHEDULE MANAGEMENT ============

  /**
   * Get all maintenance schedules
   */
  async getAllSchedules(query = {}) {
    try {
      let mongoQuery = {};

      if (query.assetId) {
        mongoQuery.assetId = query.assetId;
      }
      if (query.status) {
        mongoQuery.status = query.status;
      }
      if (query.type) {
        mongoQuery.type = query.type;
      }

      const schedules = await Maintenance.find(mongoQuery)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('assetId', 'name location')
        .sort({ scheduledDate: 1 });

      return schedules;
    } catch (error) {
      logger.error('Error getting schedules:', error);
      throw error;
    }
  }

  /**
   * Create maintenance schedule
   */
  async createSchedule(data) {
    try {
      const maintenance = new Maintenance({
        title: data.title,
        description: data.description,
        assetId: data.assetId,
        type: data.type,
        category: data.category,
        scheduledDate: data.scheduledDate,
        estimatedDuration: data.estimatedDuration,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        priority: data.priority || 'medium',
        status: 'scheduled'
      });

      const saved = await maintenance.save();
      logger.info(`Schedule created: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error creating schedule:', error);
      throw error;
    }
  }

  /**
   * Get specific schedule by ID
   */
  async getScheduleById(scheduleId) {
    try {
      const schedule = await Maintenance.findById(scheduleId)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('assetId', 'name location');
      return schedule || null;
    } catch (error) {
      logger.error('Error getting schedule:', error);
      throw error;
    }
  }

  /**
   * Update maintenance schedule
   */
  async updateSchedule(scheduleId, data) {
    try {
      const schedule = await Maintenance.findByIdAndUpdate(
        scheduleId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('assignedTo', 'firstName lastName email')
       .populate('createdBy', 'firstName lastName email')
       .populate('assetId', 'name location');

      if (!schedule) return null;

      logger.info(`Schedule updated: ${scheduleId}`);
      return schedule;
    } catch (error) {
      logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  /**
   * Delete maintenance schedule
   */
  async deleteSchedule(scheduleId) {
    try {
      const deleted = await Maintenance.findByIdAndDelete(scheduleId);

      if (!deleted) return null;

      logger.info(`Schedule deleted: ${scheduleId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting schedule:', error);
      throw error;
    }
  }

  /**
   * Complete maintenance record
   */
  async completeSchedule(scheduleId, data) {
    try {
      const maintenance = await Maintenance.findByIdAndUpdate(
        scheduleId,
        {
          status: 'completed',
          completionDate: new Date(),
          workCompleted: data.workCompleted,
          actualDuration: data.actualDuration,
          actualCost: data.actualCost,
          partsReplaced: data.partsReplaced || [],
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!maintenance) return null;

      logger.info(`Schedule completed: ${scheduleId}`);
      return maintenance;
    } catch (error) {
      logger.error('Error completing schedule:', error);
      throw error;
    }
  }

  // ============ PREDICTION & ANALYTICS ============

  /**
   * Predict next maintenance needs for asset
   */
  async predictMaintenanceNeeds(assetId) {
    try {
      // Validate assetId is not empty
      if (!assetId) {
        return {
          assetId: null,
          prediction: 'invalid-id',
          message: 'Asset ID is required'
        };
      }

      // Get recent maintenance history
      let maintenance = [];
      try {
        maintenance = await Maintenance.find({ assetId, status: 'completed' })
          .sort({ completionDate: -1 })
          .limit(10);
      } catch (dbError) {
        // If assetId is not a valid ObjectId format, return graceful response
        if (dbError.name === 'CastError') {
          // Return a prediction response indicating no data available
          return {
            assetId,
            prediction: 'insufficient-data',
            message: 'Asset not found or invalid asset ID format',
            confidence: 0,
            daysUntilMaintenance: null,
            recommendedMaintenanceTypes: []
          };
        } else {
          throw dbError;
        }
      }

      if (maintenance.length < 1) {
        return {
          assetId,
          prediction: 'insufficient-data',
          message: 'Not enough maintenance history to predict'
        };
      }

      // Calculate maintenance cycle
      const cycle = this._calculateMaintenanceCycle(maintenance);
      const lastMaintenance = maintenance[0].completionDate || new Date();

      // Predict next maintenance date
      const nextDate = new Date(lastMaintenance);
      nextDate.setDate(nextDate.getDate() + (cycle || 90));

      const daysUntil = Math.floor((nextDate - new Date()) / (1000 * 60 * 60 * 24));

      const prediction = new MaintenancePrediction({
        assetId,
        predictionType: daysUntil <= 0 ? 'maintenance-needed' : 'failure',
        predictedDate: nextDate,
        confidence: Math.min(85 + Math.floor(maintenance.length * 2), 98),
        riskLevel: daysUntil <= 7 ? 'critical' : daysUntil <= 30 ? 'high' : 'medium',
        reason: `Next maintenance predicted based on ${maintenance.length} historical records`,
        indicators: this._generateIndicators(maintenance),
        historicalData: {
          failureCount: maintenance.length,
          averageInterval: `${cycle || 90} days`,
          lastMaintenanceDate: lastMaintenance,
          usageHours: Math.random() * 10000
        },
        recommendedAction: daysUntil <= 7 ? 'Schedule immediately' : 'Schedule within next week',
        estimatedCost: this._estimateMaintenanceCost(maintenance),
        urgency: daysUntil <= 7 ? 'immediate' : daysUntil <= 30 ? 'high' : 'medium',
        status: 'open'
      });

      const saved = await prediction.save();
      return {
        assetId,
        lastMaintenance,
        maintenanceCycleDays: cycle || 90,
        predictedNextMaintenanceDate: nextDate,
        daysUntilMaintenance: daysUntil,
        urgency: daysUntil <= 7 ? 'critical' : daysUntil <= 30 ? 'high' : 'normal',
        recommendedMaintenanceTypes: this._getRecommendedTypes(maintenance),
        estimatedCost: this._estimateMaintenanceCost(maintenance),
        confidence: saved.confidence,
        predictionId: saved._id
      };
    } catch (error) {
      logger.error('Error predicting maintenance:', error);
      throw error;
    }
  }

  /**
   * Get asset maintenance history
   */
  async getAssetMaintenanceHistory(assetId) {
    try {
      // Validate assetId is not empty
      if (!assetId) {
        return {
          success: false,
          message: 'Asset ID is required',
          records: []
        };
      }

      let records = [];
      try {
        records = await Maintenance.find({ assetId })
          .populate('assignedTo', 'firstName lastName email')
          .sort({ completionDate: -1 });
      } catch (dbError) {
        // If assetId is not a valid ObjectId format, return graceful response
        if (dbError.name === 'CastError') {
          // Return an empty history for invalid asset IDs
          return {
            success: false,
            message: 'Asset not found or invalid asset ID format',
            records: []
          };
        } else {
          throw dbError;
        }
      }

      if (records.length === 0) return null;

      const totalCost = records.reduce((sum, r) => sum + (r.actualCost || 0), 0);
      const completedRecords = records.filter(r => r.status === 'completed');

      return {
        assetId,
        totalRecords: records.length,
        completedRecords: completedRecords.length,
        totalCost: Math.round(totalCost),
        lastMaintenance: records[0]?.completionDate || records[0]?.scheduledDate,
        upcomingSchedules: records.filter(r => r.status === 'scheduled'),
        recentRecords: completedRecords.slice(0, 10),
        avgMaintenanceCycle: this._calculateMaintenanceCycle(completedRecords),
        avgCost: Math.round(completedRecords.length > 0 ? totalCost / completedRecords.length : 0)
      };
    } catch (error) {
      logger.error('Error getting history:', error);
      throw error;
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Calculate average maintenance cycle in days
   */
  _calculateMaintenanceCycle(records) {
    if (records.length < 2) return null;

    const cycles = [];
    for (let i = 0; i < records.length - 1; i++) {
      const date1 = new Date(records[i].completionDate);
      const date2 = new Date(records[i + 1].completionDate);
      const diff = (date1 - date2) / (1000 * 60 * 60 * 24);
      if (diff > 0) cycles.push(diff);
    }

    if (cycles.length === 0) return null;
    const average = cycles.reduce((a, b) => a + b, 0) / cycles.length;
    return Math.round(average);
  }

  /**
   * Get recommended maintenance types based on history
   */
  _getRecommendedTypes(records) {
    const types = {};
    records.forEach(r => {
      if (!types[r.type]) {
        types[r.type] = 0;
      }
      types[r.type]++;
    });

    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => ({ type, frequency: count }));
  }

  /**
   * Estimate maintenance cost
   */
  _estimateMaintenanceCost(records) {
    const completed = records.filter(r => r.actualCost);
    if (completed.length === 0) return 0;

    const cost = completed.reduce((sum, r) => sum + r.actualCost, 0) / completed.length;
    return Math.round(cost);
  }

  /**
   * Generate indicators for prediction
   */
  _generateIndicators(records) {
    return [
      {
        name: 'Maintenance Frequency',
        value: `${records.length} times`,
        threshold: '10 times',
        status: records.length > 5 ? 'warning' : 'normal'
      },
      {
        name: 'Average Cost',
        value: `$${this._estimateMaintenanceCost(records)}`,
        threshold: '$500',
        status: this._estimateMaintenanceCost(records) > 500 ? 'warning' : 'normal'
      },
      {
        name: 'Time Since Maintenance',
        value: records[0]?.completionDate ?
          `${Math.floor((new Date() - new Date(records[0].completionDate)) / (1000 * 60 * 60 * 24))} days` :
          'unknown',
        threshold: '30 days',
        status: 'normal'
      }
    ];
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const [schedulesCount, recordsCount, predictionsCount] = await Promise.all([
        Maintenance.countDocuments({ status: 'scheduled' }),
        Maintenance.countDocuments({ status: 'completed' }),
        MaintenancePrediction.countDocuments()
      ]);

      return {
        service: 'MaintenanceService',
        status: 'operational',
        schedulesCount,
        recordsCount,
        predictionsCount
      };
    } catch (error) {
      logger.error('Error getting health status:', error);
      return {
        service: 'MaintenanceService',
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export service and singleton instance
const maintenanceService = new MaintenanceService();

module.exports = {
  MaintenanceService,
  maintenanceService
};
