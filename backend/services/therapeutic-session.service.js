/**
 * Therapeutic Session Management Service
 * خدمة إدارة الجلسات العلاجية
 */

const mongoose = require('mongoose');
const TherapySession = require('../models/TherapySession');
const SessionDocumentation = require('../models/SessionDocumentation');
const TherapistAvailability = require('../models/TherapistAvailability');
const TherapeuticPlan = require('../models/TherapeuticPlan');
const Employee = require('../models/Employee');
const BeneficiaryFile = require('../models/BeneficiaryFile');

class TherapeuticSessionService {
  /**
   * Schedule a new therapy session
   */
  async scheduleSession(data) {
    try {
      // Validate beneficiary
      const beneficiary = await BeneficiaryFile.findById(data.beneficiary);
      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      // Validate therapist
      const therapist = await Employee.findById(data.therapist);
      if (!therapist) {
        throw new Error('Therapist not found');
      }

      // Check therapist availability
      const availabilityConflict = await this.checkTherapistAvailability(
        data.therapist,
        data.date,
        data.startTime,
        data.endTime,
      );
      if (!availabilityConflict.available) {
        throw new Error(`Therapist not available: ${availabilityConflict.reason}`);
      }

      // Check for conflicts with existing sessions
      const sessionConflict = await this.checkScheduleConflict(
        data.therapist,
        data.date,
        data.startTime,
        data.endTime,
      );
      if (sessionConflict) {
        throw new Error('Time slot conflicts with existing session');
      }

      // Get therapeutic plan if provided
      if (data.plan) {
        const plan = await TherapeuticPlan.findById(data.plan);
        if (!plan) {
          throw new Error('Therapeutic plan not found');
        }
      }

      const session = new TherapySession({
        ...data,
        status: 'SCHEDULED',
      });

      await session.save();

      return {
        success: true,
        message: 'Session scheduled successfully',
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error,
      };
    }
  }

  /**
   * Check therapist availability
   */
  async checkTherapistAvailability(therapistId, date, startTime, endTime) {
    try {
      const availability = await TherapistAvailability.findOne({ therapist: therapistId });
      if (!availability) {
        return { available: true }; // No availability record = always available
      }

      const dayOfWeek = this.getDayOfWeek(date);
      const slot = availability.recurringSchedule.find(
        (s) => s.dayOfWeek === dayOfWeek && s.isActive,
      );

      if (!slot) {
        return {
          available: false,
          reason: `Therapist not available on ${dayOfWeek}`,
        };
      }

      // Check if time is within slot
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);
      const reqStart = this.timeToMinutes(startTime);
      const reqEnd = this.timeToMinutes(endTime);

      if (reqStart < slotStart || reqEnd > slotEnd) {
        return {
          available: false,
          reason: `Requested time ${startTime}-${endTime} is outside available hours ${slot.startTime}-${slot.endTime}`,
        };
      }

      // Check break times
      if (slot.breakStart && slot.breakEnd) {
        const breakStart = this.timeToMinutes(slot.breakStart);
        const breakEnd = this.timeToMinutes(slot.breakEnd);
        if (
          (reqStart >= breakStart && reqStart < breakEnd) ||
          (reqEnd > breakStart && reqEnd <= breakEnd)
        ) {
          return {
            available: false,
            reason: `Requested time conflicts with break time ${slot.breakStart}-${slot.breakEnd}`,
          };
        }
      }

      // Check daily session limit
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const sessionsToday = await TherapySession.countDocuments({
        therapist: therapistId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
      });

      if (sessionsToday >= availability.preferences.maxSessionsPerDay) {
        return {
          available: false,
          reason: `Therapist has reached maximum sessions per day (${availability.preferences.maxSessionsPerDay})`,
        };
      }

      return { available: true };
    } catch (error) {
      return { available: true }; // Default to available if error checking
    }
  }

  /**
   * Check for schedule conflicts
   */
  async checkScheduleConflict(therapistId, date, startTime, endTime) {
    try {
      const availability = await TherapistAvailability.findOne({ therapist: therapistId });
      const minBreak = availability?.preferences?.minBreakBetweenSessions || 15;

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const existingSessions = await TherapySession.findOne({
        therapist: therapistId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          },
        ],
      });

      return !!existingSessions;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId, status, notes = null) {
    try {
      const validStatuses = [
        'SCHEDULED',
        'CONFIRMED',
        'COMPLETED',
        'CANCELLED_BY_PATIENT',
        'CANCELLED_BY_CENTER',
        'NO_SHOW',
      ];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const session = await TherapySession.findByIdAndUpdate(
        sessionId,
        { status },
        { new: true },
      );

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        success: true,
        message: `Session status updated to ${status}`,
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Document session with SOAP notes
   */
  async documentSession(sessionId, documentationData) {
    try {
      const session = await TherapySession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'COMPLETED') {
        throw new Error('Can only document completed sessions');
      }

      // Check if documentation already exists
      let doc = await SessionDocumentation.findOne({ session: sessionId });

      if (doc) {
        // Track edit history
        doc.edits = doc.edits || [];
        doc.edits.push({
          editedAt: new Date(),
          editedBy: documentationData.therapist,
          changesSummary: 'Session documentation updated',
        });
      } else {
        doc = new SessionDocumentation({
          session: sessionId,
          beneficiary: session.beneficiary,
          therapist: session.therapist,
          plan: session.plan,
        });
      }

      // Update documentation
      if (documentationData.soapNote) {
        doc.soapNote = documentationData.soapNote;
      }
      if (documentationData.documentation) {
        doc.documentation = documentationData.documentation;
      }
      if (documentationData.goalsAddressed) {
        doc.goalsAddressed = documentationData.goalsAddressed;
      }
      if (documentationData.attachments) {
        doc.attachments = documentationData.attachments;
      }
      if (documentationData.riskFlags) {
        doc.riskFlags = documentationData.riskFlags;
      }

      doc.documentedAt = new Date();
      doc.documentedBy = documentationData.therapist;
      doc.quality.isComplete = true;

      await doc.save();

      return {
        success: true,
        message: 'Session documented successfully',
        data: doc,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get sessions for a therapist in a date range
   */
  async getTherapistSessions(therapistId, startDate, endDate, status = null) {
    try {
      const query = {
        therapist: therapistId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      };

      if (status) {
        query.status = status;
      }

      const sessions = await TherapySession.find(query)
        .populate('beneficiary', 'firstName lastName')
        .populate('therapist', 'firstName lastName')
        .populate('plan', 'status startDate endDate')
        .sort({ date: 1, startTime: 1 });

      // Get documentation status
      const sessionsWithDocs = await Promise.all(
        sessions.map(async (session) => {
          const doc = await SessionDocumentation.findOne({ session: session._id });
          return {
            ...session.toObject(),
            documented: !!doc,
            documentedAt: doc?.documentedAt,
          };
        }),
      );

      return {
        success: true,
        data: sessionsWithDocs,
        count: sessionsWithDocs.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get sessions for a beneficiary
   */
  async getBeneficiarySessions(beneficiaryId, planId = null) {
    try {
      const query = { beneficiary: beneficiaryId };
      if (planId) {
        query.plan = planId;
      }

      const sessions = await TherapySession.find(query)
        .populate('therapist', 'firstName lastName specialization')
        .populate('plan', 'startDate endDate status')
        .sort({ date: -1 });

      return {
        success: true,
        data: sessions,
        count: sessions.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Reschedule a session
   */
  async rescheduleSession(sessionId, newDate, newStartTime, newEndTime) {
    try {
      const session = await TherapySession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (['COMPLETED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'].includes(session.status)) {
        throw new Error('Cannot reschedule a completed or cancelled session');
      }

      // Check availability for new time
      const availability = await this.checkTherapistAvailability(
        session.therapist,
        newDate,
        newStartTime,
        newEndTime,
      );
      if (!availability.available) {
        throw new Error(`New time not available: ${availability.reason}`);
      }

      // Check for conflicts
      const conflict = await this.checkScheduleConflict(
        session.therapist,
        newDate,
        newStartTime,
        newEndTime,
      );
      if (conflict) {
        throw new Error('New time slot conflicts with existing session');
      }

      session.date = newDate;
      session.startTime = newStartTime;
      session.endTime = newEndTime;
      session.status = 'SCHEDULED'; // Reset status

      await session.save();

      return {
        success: true,
        message: 'Session rescheduled successfully',
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get therapy session statistics
   */
  async getSessionStatistics(therapistId, startDate, endDate) {
    try {
      const query = {
        therapist: therapistId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      };

      const total = await TherapySession.countDocuments(query);
      const completed = await TherapySession.countDocuments({ ...query, status: 'COMPLETED' });
      const cancelled = await TherapySession.countDocuments({
        ...query,
        status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
      });
      const noShow = await TherapySession.countDocuments({ ...query, status: 'NO_SHOW' });
      const scheduled = await TherapySession.countDocuments({
        ...query,
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      });

      // Get average rating
      const ratingAgg = await TherapySession.aggregate([
        {
          $match: {
            ...query,
            rating: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            minRating: { $min: '$rating' },
            maxRating: { $max: '$rating' },
          },
        },
      ]);

      const ratingStats = ratingAgg[0] || {
        avgRating: 0,
        minRating: 0,
        maxRating: 0,
      };

      return {
        success: true,
        data: {
          total,
          completed,
          cancelled,
          noShow,
          scheduled,
          completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
          cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(2) : 0,
          noShowRate: total > 0 ? ((noShow / total) * 100).toFixed(2) : 0,
          avgRating: ratingStats.avgRating.toFixed(2),
          minRating: ratingStats.minRating,
          maxRating: ratingStats.maxRating,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Helper: Convert time string to minutes
   */
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Get day of week from date
   */
  getDayOfWeek(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[new Date(date).getDay()];
  }

  /**
   * Get upcoming sessions for a beneficiary
   */
  async getUpcomingSessions(beneficiaryId, daysAhead = 30) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + daysAhead);

      const sessions = await TherapySession.find({
        beneficiary: beneficiaryId,
        date: { $gte: today, $lte: endDate },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      })
        .populate('therapist', 'firstName lastName')
        .populate('plan', 'goals')
        .sort({ date: 1, startTime: 1 });

      return {
        success: true,
        data: sessions,
        count: sessions.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Set therapist availability
   */
  async setTherapistAvailability(therapistId, availabilityData) {
    try {
      let availability = await TherapistAvailability.findOne({ therapist: therapistId });

      if (!availability) {
        availability = new TherapistAvailability({
          therapist: therapistId,
          ...availabilityData,
        });
      } else {
        Object.assign(availability, availabilityData);
      }

      await availability.save();

      return {
        success: true,
        message: 'Therapist availability updated',
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get therapist availability
   */
  async getTherapistAvailability(therapistId) {
    try {
      const availability = await TherapistAvailability.findOne({ therapist: therapistId }).populate(
        'therapist',
        'firstName lastName specialization',
      );

      if (!availability) {
        return {
          success: false,
          message: 'No availability record found for this therapist',
        };
      }

      return {
        success: true,
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

module.exports = new TherapeuticSessionService();
