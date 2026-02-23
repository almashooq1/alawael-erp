const Schedule = require('../models/Schedule');
const logger = require('../utils/logger');

class ScheduleManagementService {
  /**
   * Get all schedules
   */
  async getAllSchedules(query = {}) {
    try {
      let mongoQuery = {};

      // Filter by status
      if (query.status) {
        mongoQuery.status = query.status;
      }

      // Filter by type
      if (query.type) {
        mongoQuery.type = query.type;
      }

      // Filter by resource
      if (query.resourceId) {
        mongoQuery.resourceId = query.resourceId;
      }

      // Search by title
      if (query.search) {
        mongoQuery.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } }
        ];
      }

      const schedules = await Schedule.find(mongoQuery)
        .populate('createdBy', 'firstName lastName email')
        .populate('confirmedBy', 'firstName lastName email')
        .sort({ startDate: 1 });

      return schedules;
    } catch (error) {
      logger.error('Error in getAllSchedules:', error);
      throw error;
    }
  }

  /**
   * Create new schedule
   */
  async createSchedule(data) {
    try {
      const schedule = new Schedule({
        title: data.title,
        description: data.description || '',
        startDate: data.startDate,
        endDate: data.endDate || null,
        resourceId: data.resourceId,
        type: data.type || 'event',
        createdBy: data.createdBy,
        status: 'pending',
        attendees: [],
        reminders: []
      });

      const saved = await schedule.save();
      logger.info(`Schedule created: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error in createSchedule:', error);
      throw error;
    }
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(scheduleId) {
    try {
      const schedule = await Schedule.findById(scheduleId)
        .populate('createdBy', 'firstName lastName email')
        .populate('confirmedBy', 'firstName lastName email');

      return schedule || null;
    } catch (error) {
      logger.error('Error in getScheduleById:', error);
      throw error;
    }
  }

  /**
   * Update schedule
   */
  async updateSchedule(scheduleId, updates) {
    try {
      const schedule = await Schedule.findByIdAndUpdate(
        scheduleId,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('createdBy', 'firstName lastName email')
        .populate('confirmedBy', 'firstName lastName email');

      if (!schedule) return null;

      logger.info(`Schedule updated: ${scheduleId}`);
      return schedule;
    } catch (error) {
      logger.error('Error in updateSchedule:', error);
      throw error;
    }
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId) {
    try {
      const result = await Schedule.findByIdAndDelete(scheduleId);

      if (!result) return false;

      logger.info(`Schedule deleted: ${scheduleId}`);
      return true;
    } catch (error) {
      logger.error('Error in deleteSchedule:', error);
      throw error;
    }
  }

  /**
   * Get schedules by resource
   */
  async getSchedulesByResource(resourceId) {
    try {
      const schedules = await Schedule.find({ resourceId })
        .populate('createdBy', 'firstName lastName email')
        .sort({ startDate: 1 });

      return schedules;
    } catch (error) {
      logger.error('Error in getSchedulesByResource:', error);
      throw error;
    }
  }

  /**
   * Get schedules by date range
   */
  async getSchedulesByDateRange(startDate, endDate) {
    try {
      const schedules = await Schedule.find({
        startDate: { $gte: startDate, $lte: endDate }
      })
        .populate('createdBy', 'firstName lastName email')
        .sort({ startDate: 1 });

      return schedules;
    } catch (error) {
      logger.error('Error in getSchedulesByDateRange:', error);
      throw error;
    }
  }

  /**
   * Confirm schedule
   */
  async confirmSchedule(scheduleId, userId) {
    try {
      const schedule = await Schedule.findByIdAndUpdate(
        scheduleId,
        {
          $set: {
            status: 'confirmed',
            confirmedBy: userId,
            confirmedAt: new Date()
          }
        },
        { new: true, runValidators: true }
      ).populate('createdBy', 'firstName lastName email')
        .populate('confirmedBy', 'firstName lastName email');

      if (!schedule) return null;

      logger.info(`Schedule confirmed: ${scheduleId} by ${userId}`);
      return schedule;
    } catch (error) {
      logger.error('Error in confirmSchedule:', error);
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    try {
      const totalSchedules = await Schedule.countDocuments();
      const upcomingSchedules = await Schedule.countDocuments({
        startDate: { $gt: new Date() }
      });
      const confirmedSchedules = await Schedule.countDocuments({
        status: 'confirmed'
      });

      return {
        status: 'healthy',
        totalSchedules,
        upcomingSchedules,
        confirmedSchedules,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Error in getHealthStatus:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export singleton
const scheduleManagementService = new ScheduleManagementService();

module.exports = {
  ScheduleManagementService,
  scheduleManagementService,
  scheduleService: scheduleManagementService
};
