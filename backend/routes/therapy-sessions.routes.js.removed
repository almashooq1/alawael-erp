/**
 * Therapeutic Session Management Routes
 * مسارات إدارة الجلسات العلاجية
 */

const express = require('express');
const router = express.Router();
const therapySessionController = require('../controllers/therapy-session.controller');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @swagger
 * /api/therapy-sessions:
 *   post:
 *     summary: Schedule a new therapy session
 *     description: Create and schedule a new therapy session for a beneficiary
 *     tags: [Therapy Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *                 description: Therapeutic plan ID
 *               beneficiary:
 *                 type: string
 *                 description: Beneficiary ID
 *               therapist:
 *                 type: string
 *                 description: Therapist ID
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "10:00"
 *     responses:
 *       201:
 *         description: Session scheduled successfully
 *       400:
 *         description: Invalid request
 */
router.post('/', asyncHandler(therapySessionController.scheduleSession.bind(therapySessionController)));

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}:
 *   get:
 *     summary: Get a specific therapy session
 *     tags: [Therapy Sessions]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details
 *       404:
 *         description: Session not found
 */
router.get(
  '/:sessionId',
  asyncHandler(therapySessionController.getSession.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}/status:
 *   patch:
 *     summary: Update session status
 *     tags: [Therapy Sessions]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, CONFIRMED, COMPLETED, CANCELLED_BY_PATIENT, CANCELLED_BY_CENTER, NO_SHOW]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch(
  '/:sessionId/status',
  asyncHandler(therapySessionController.updateSessionStatus.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}/documentation:
 *   post:
 *     summary: Document a completed session with SOAP notes
 *     tags: [Session Documentation]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               soapNote:
 *                 type: object
 *               documentation:
 *                 type: string
 *               goalsAddressed:
 *                 type: array
 *               riskFlags:
 *                 type: array
 *     responses:
 *       201:
 *         description: Documentation saved
 */
router.post(
  '/:sessionId/documentation',
  asyncHandler(therapySessionController.documentSession.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}/documentation:
 *   get:
 *     summary: Get session documentation
 *     tags: [Session Documentation]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session documentation
 */
router.get(
  '/:sessionId/documentation',
  asyncHandler(therapySessionController.getSessionDocumentation.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}/reschedule:
 *   patch:
 *     summary: Reschedule a therapy session
 *     tags: [Therapy Sessions]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session rescheduled
 */
router.patch(
  '/:sessionId/reschedule',
  asyncHandler(therapySessionController.rescheduleSession.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}/cancel:
 *   post:
 *     summary: Cancel a therapy session
 *     tags: [Therapy Sessions]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               cancelledBy:
 *                 type: string
 *                 enum: [PATIENT, CENTER]
 *     responses:
 *       200:
 *         description: Session cancelled
 */
router.post(
  '/:sessionId/cancel',
  asyncHandler(therapySessionController.cancelSession.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}/attend:
 *   post:
 *     summary: Mark a session as attended
 *     tags: [Attendance]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               arrivalTime:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Attendance recorded
 */
router.post(
  '/:sessionId/attend',
  asyncHandler(therapySessionController.markAttendance.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/{sessionId}/no-show:
 *   post:
 *     summary: Mark a session as no-show
 *     tags: [Attendance]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: No-show recorded
 */
router.post(
  '/:sessionId/no-show',
  asyncHandler(therapySessionController.markNoShow.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/therapist/{therapistId}:
 *   get:
 *     summary: Get all sessions for a therapist
 *     tags: [Therapy Sessions]
 *     parameters:
 *       - name: therapistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sessions
 */
router.get(
  '/therapist/:therapistId',
  asyncHandler(therapySessionController.getTherapistSessions.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/beneficiary/{beneficiaryId}:
 *   get:
 *     summary: Get all sessions for a beneficiary
 *     tags: [Therapy Sessions]
 *     parameters:
 *       - name: beneficiaryId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: planId
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sessions
 */
router.get(
  '/beneficiary/:beneficiaryId',
  asyncHandler(therapySessionController.getBeneficiarySessions.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/upcoming/{beneficiaryId}:
 *   get:
 *     summary: Get upcoming sessions for a beneficiary
 *     tags: [Therapy Sessions]
 *     parameters:
 *       - name: beneficiaryId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: daysAhead
 *         in: query
 *         schema:
 *           type: number
 *           default: 30
 *     responses:
 *       200:
 *         description: List of upcoming sessions
 */
router.get(
  '/upcoming/:beneficiaryId',
  asyncHandler(therapySessionController.getUpcomingSessions.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/stats/therapist/{therapistId}:
 *   get:
 *     summary: Get session statistics for a therapist
 *     tags: [Statistics]
 *     parameters:
 *       - name: therapistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statistics data
 */
router.get(
  '/stats/therapist/:therapistId',
  asyncHandler(therapySessionController.getSessionStatistics.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/availability/{therapistId}/check:
 *   get:
 *     summary: Check therapist availability for a specific time slot
 *     tags: [Availability]
 *     parameters:
 *       - name: therapistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: startTime
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: endTime
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability status
 */
router.get(
  '/availability/:therapistId/check',
  asyncHandler(therapySessionController.checkAvailability.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/availability/{therapistId}:
 *   post:
 *     summary: Set therapist availability schedule
 *     tags: [Availability]
 *     parameters:
 *       - name: therapistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recurringSchedule:
 *                 type: array
 *               exceptions:
 *                 type: array
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.post(
  '/availability/:therapistId',
  asyncHandler(therapySessionController.setTherapistAvailability.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/availability/{therapistId}:
 *   get:
 *     summary: Get therapist availability schedule
 *     tags: [Availability]
 *     parameters:
 *       - name: therapistId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability schedule
 */
router.get(
  '/availability/:therapistId',
  asyncHandler(therapySessionController.getTherapistAvailability.bind(therapySessionController)),
);

/**
 * @swagger
 * /api/therapy-sessions/bulk-reschedule:
 *   post:
 *     summary: Bulk reschedule multiple sessions
 *     tags: [Therapy Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               newDate:
 *                 type: string
 *                 format: date
 *               newStartTime:
 *                 type: string
 *               newEndTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rescheduling results
 */
router.post(
  '/bulk-reschedule',
  asyncHandler(therapySessionController.bulkReschedule.bind(therapySessionController)),
);

module.exports = router;
