/**
 * Therapeutic Session Controller
 * التحكم في الجلسات العلاجية
 */

const therapeuticSessionService = require('../services/therapeutic-session.service');

class TherapeuticSessionController {
  /**
   * Schedule a new session
   * POST /api/therapy-sessions
   */
  async scheduleSession(req, res) {
    try {
      const result = await therapeuticSessionService.scheduleSession(req.body);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all sessions for a therapist
   * GET /api/therapy-sessions/therapist/:therapistId
   */
  async getTherapistSessions(req, res) {
    try {
      const { therapistId } = req.params;
      const { startDate, endDate, status } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const result = await therapeuticSessionService.getTherapistSessions(
        therapistId,
        startDate,
        endDate,
        status,
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all sessions for a beneficiary
   * GET /api/therapy-sessions/beneficiary/:beneficiaryId
   */
  async getBeneficiarySessions(req, res) {
    try {
      const { beneficiaryId } = req.params;
      const { planId } = req.query;

      const result = await therapeuticSessionService.getBeneficiarySessions(
        beneficiaryId,
        planId,
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get a single session
   * GET /api/therapy-sessions/:sessionId
   */
  async getSession(req, res) {
    try {
      const TherapySession = require('../models/TherapySession');
      const session = await TherapySession.findById(req.params.sessionId)
        .populate('beneficiary', 'firstName lastName')
        .populate('therapist', 'firstName lastName specialization')
        .populate('plan', 'goals status');

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update session status
   * PATCH /api/therapy-sessions/:sessionId/status
   */
  async updateSessionStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      const result = await therapeuticSessionService.updateSessionStatus(sessionId, status);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Document a completed session
   * POST /api/therapy-sessions/:sessionId/documentation
   */
  async documentSession(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await therapeuticSessionService.documentSession(sessionId, req.body);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Reschedule a session
   * PATCH /api/therapy-sessions/:sessionId/reschedule
   */
  async rescheduleSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { date, startTime, endTime } = req.body;

      if (!date || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'date, startTime, and endTime are required',
        });
      }

      const result = await therapeuticSessionService.rescheduleSession(
        sessionId,
        date,
        startTime,
        endTime,
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get session statistics for a therapist
   * GET /api/therapy-sessions/stats/therapist/:therapistId
   */
  async getSessionStatistics(req, res) {
    try {
      const { therapistId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const result = await therapeuticSessionService.getSessionStatistics(
        therapistId,
        startDate,
        endDate,
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Check therapist availability
   * GET /api/therapy-sessions/availability/:therapistId
   */
  async checkAvailability(req, res) {
    try {
      const { therapistId } = req.params;
      const { date, startTime, endTime } = req.query;

      if (!date || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'date, startTime, and endTime are required',
        });
      }

      const result = await therapeuticSessionService.checkTherapistAvailability(
        therapistId,
        date,
        startTime,
        endTime,
      );

      return res.status(result.available ? 200 : 409).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get upcoming sessions for beneficiary
   * GET /api/therapy-sessions/upcoming/:beneficiaryId
   */
  async getUpcomingSessions(req, res) {
    try {
      const { beneficiaryId } = req.params;
      const { daysAhead = 30 } = req.query;

      const result = await therapeuticSessionService.getUpcomingSessions(beneficiaryId, daysAhead);

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Set therapist availability
   * POST /api/therapy-sessions/availability/:therapistId
   */
  async setTherapistAvailability(req, res) {
    try {
      const { therapistId } = req.params;

      const result = await therapeuticSessionService.setTherapistAvailability(
        therapistId,
        req.body,
      );

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get therapist availability
   * GET /api/therapy-sessions/availability/:therapistId
   */
  async getTherapistAvailability(req, res) {
    try {
      const { therapistId } = req.params;

      const result = await therapeuticSessionService.getTherapistAvailability(therapistId);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get session documentation
   * GET /api/therapy-sessions/:sessionId/documentation
   */
  async getSessionDocumentation(req, res) {
    try {
      const SessionDocumentation = require('../models/SessionDocumentation');
      const doc = await SessionDocumentation.findOne({ session: req.params.sessionId })
        .populate('therapist', 'firstName lastName')
        .populate('beneficiary', 'firstName lastName')
        .populate('documentedBy', 'firstName lastName');

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: 'Documentation not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: doc,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Bulk reschedule sessions (useful for therapist sick leave, etc.)
   * POST /api/therapy-sessions/bulk-reschedule
   */
  async bulkReschedule(req, res) {
    try {
      const { sessionIds, newDate, newStartTime, newEndTime } = req.body;

      if (!sessionIds || !Array.isArray(sessionIds) || !newDate) {
        return res.status(400).json({
          success: false,
          message: 'sessionIds (array), newDate are required',
        });
      }

      const results = [];
      for (const sessionId of sessionIds) {
        const result = await therapeuticSessionService.rescheduleSession(
          sessionId,
          newDate,
          newStartTime,
          newEndTime,
        );
        results.push({
          sessionId,
          ...result,
        });
      }

      const successful = results.filter((r) => r.success).length;

      return res.status(200).json({
        success: true,
        message: `${successful}/${sessionIds.length} sessions rescheduled successfully`,
        data: results,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Cancel a session
   * POST /api/therapy-sessions/:sessionId/cancel
   */
  async cancelSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { reason, cancelledBy = 'CENTER' } = req.body;

      const status = cancelledBy === 'PATIENT' ? 'CANCELLED_BY_PATIENT' : 'CANCELLED_BY_CENTER';

      const result = await therapeuticSessionService.updateSessionStatus(sessionId, status);

      // Optionally store cancellation reason
      if (result.success && reason) {
        const TherapySession = require('../models/TherapySession');
        await TherapySession.findByIdAndUpdate(sessionId, {
          cancellationReason: reason,
        });
      }

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark session as attended
   * POST /api/therapy-sessions/:sessionId/attend
   */
  async markAttendance(req, res) {
    try {
      const TherapySession = require('../models/TherapySession');
      const { sessionId } = req.params;
      const { arrivalTime, rating } = req.body;

      const session = await TherapySession.findByIdAndUpdate(
        sessionId,
        {
          status: 'COMPLETED',
          attendance: {
            isPresent: true,
            arrivalTime: arrivalTime || new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          rating: rating || null,
        },
        { new: true },
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Attendance recorded',
        data: session,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Mark session as no-show
   * POST /api/therapy-sessions/:sessionId/no-show
   */
  async markNoShow(req, res) {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;

      const result = await therapeuticSessionService.updateSessionStatus(
        sessionId,
        'NO_SHOW',
      );

      if (result.success && reason) {
        const TherapySession = require('../models/TherapySession');
        await TherapySession.findByIdAndUpdate(sessionId, {
          noShowReason: reason,
        });
      }

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new TherapeuticSessionController();
