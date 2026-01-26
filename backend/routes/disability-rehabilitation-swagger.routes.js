/**
 * Enhanced Routes with JSDoc for Swagger
 * Disability Rehabilitation System API Endpoints
 */

const express = require('express');
const router = express.Router();
const disabilityRehabilitationController = require('../controllers/disability-rehabilitation.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Base endpoint - Public info
/**
 * @swagger
 * /disability-rehabilitation/info:
 *   get:
 *     summary: Get system information
 *     description: Returns general information about the disability rehabilitation system
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: System information retrieved successfully
 */
router.get('/info', disabilityRehabilitationController.getInfo);

// Create a new program
/**
 * @swagger
 * /disability-rehabilitation/programs:
 *   post:
 *     summary: Create a new rehabilitation program
 *     description: Create a new comprehensive disability rehabilitation program with all details
 *     tags:
 *       - Programs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               program_info:
 *                 $ref: '#/components/schemas/ProgramInfo'
 *               beneficiary:
 *                 $ref: '#/components/schemas/Beneficiary'
 *               disability_info:
 *                 $ref: '#/components/schemas/DisabilityInfo'
 *               rehabilitation_goals:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/RehabilitationGoal'
 *               rehabilitation_services:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/RehabilitationService'
 *               family_involvement:
 *                 type: object
 *             required:
 *               - program_info
 *               - beneficiary
 *               - disability_info
 *     responses:
 *       201:
 *         description: Program created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.post(
  '/programs',
  authenticate,
  disabilityRehabilitationController.createProgram
);

// Get all programs with filtering
/**
 * @swagger
 * /disability-rehabilitation/programs:
 *   get:
 *     summary: Get all rehabilitation programs
 *     description: Retrieve all programs with advanced filtering, search, and pagination
 *     tags:
 *       - Programs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: disability_type
 *         schema:
 *           type: string
 *           enum: [physical, visual, hearing, intellectual, autism, learning, multiple, speech, behavioral, developmental]
 *         description: Filter by disability type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, pending, completed, on_hold]
 *         description: Filter by program status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [mild, moderate, severe]
 *         description: Filter by disability severity
 *       - in: query
 *         name: beneficiary_id
 *         schema:
 *           type: string
 *         description: Filter by beneficiary ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in program name or beneficiary name
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter programs starting from this date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter programs ending before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -created_at
 *         description: Sort field and order
 *     responses:
 *       200:
 *         description: Programs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/programs', authenticate, disabilityRehabilitationController.getAllPrograms);

// Get a specific program by ID
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}:
 *   get:
 *     summary: Get a specific rehabilitation program
 *     description: Retrieve detailed information about a specific program by ID
 *     tags:
 *       - Programs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Program retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Program not found
 *       401:
 *         description: Unauthorized
 */
router.get('/programs/:id', authenticate, disabilityRehabilitationController.getProgramById);

// Update a program
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}:
 *   put:
 *     summary: Update a rehabilitation program
 *     description: Update program information, goals, services, or any other field
 *     tags:
 *       - Programs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Fields to update
 *     responses:
 *       200:
 *         description: Program updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Program not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.put(
  '/programs/:id',
  authenticate,
  disabilityRehabilitationController.updateProgram
);

// Delete a program
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}:
 *   delete:
 *     summary: Delete a rehabilitation program
 *     description: Permanently delete a program (admin only)
 *     tags:
 *       - Programs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Program deleted successfully
 *       404:
 *         description: Program not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (admin only)
 */
router.delete(
  '/programs/:id',
  authenticate,
  disabilityRehabilitationController.deleteProgram
);

// Add a therapy session
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}/sessions:
 *   post:
 *     summary: Add a therapy session to a program
 *     description: Record a new therapy session with attendance and notes
 *     tags:
 *       - Therapy Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TherapySession'
 *     responses:
 *       201:
 *         description: Session added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid session data
 *       404:
 *         description: Program not found
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/programs/:id/sessions',
  authenticate,
  disabilityRehabilitationController.addSession
);

// Update goal status
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}/goals/{goalId}:
 *   put:
 *     summary: Update a rehabilitation goal
 *     description: Update goal status and progress percentage
 *     tags:
 *       - Goals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: Goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, achieved, paused]
 *               progress_percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Goal updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Program or goal not found
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/programs/:id/goals/:goalId',
  authenticate,
  disabilityRehabilitationController.updateGoalStatus
);

// Add assessment
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}/assessments:
 *   post:
 *     summary: Add an assessment to a program
 *     description: Record a new assessment with findings and recommendations
 *     tags:
 *       - Assessments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assessment_date:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [initial_assessment, mid_term_assessment, final_assessment]
 *               assessor_name:
 *                 type: string
 *               findings:
 *                 type: string
 *               recommendations:
 *                 type: string
 *               overall_score:
 *                 type: number
 *     responses:
 *       201:
 *         description: Assessment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Program not found
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/programs/:id/assessments',
  authenticate,
  disabilityRehabilitationController.addAssessment
);

// Complete a program
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}/complete:
 *   put:
 *     summary: Mark a program as completed
 *     description: Complete a rehabilitation program with final notes
 *     tags:
 *       - Programs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completion_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Program completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Program not found
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/programs/:id/complete',
  authenticate,
  disabilityRehabilitationController.completeProgram
);

// Get statistics
/**
 * @swagger
 * /disability-rehabilitation/statistics:
 *   get:
 *     summary: Get system statistics
 *     description: Get comprehensive statistics about programs by disability type, status, and performance
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: disability_type
 *         schema:
 *           type: string
 *         description: Filter statistics by disability type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter statistics by program status
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/statistics',
  authenticate,
  disabilityRehabilitationController.getStatistics
);

// Get monthly performance
/**
 * @swagger
 * /disability-rehabilitation/performance/{year}/{month}:
 *   get:
 *     summary: Get monthly performance metrics
 *     description: Get performance metrics for a specific month and year
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: number
 *         description: Year (e.g., 2024)
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: number
 *         description: Month (1-12)
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/performance/:year/:month',
  authenticate,
  disabilityRehabilitationController.getMonthlyPerformance
);

// Get beneficiary programs
/**
 * @swagger
 * /disability-rehabilitation/beneficiary/{beneficiaryId}/programs:
 *   get:
 *     summary: Get all programs for a specific beneficiary
 *     description: Retrieve all rehabilitation programs associated with a beneficiary
 *     tags:
 *       - Beneficiaries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: beneficiaryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Beneficiary ID
 *     responses:
 *       200:
 *         description: Programs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Beneficiary not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/beneficiary/:beneficiaryId/programs',
  authenticate,
  disabilityRehabilitationController.getBeneficiaryPrograms
);

// Get detailed program report
/**
 * @swagger
 * /disability-rehabilitation/programs/{id}/report:
 *   get:
 *     summary: Get detailed program report
 *     description: Get a comprehensive report for a program including all metrics and analytics
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Program ID
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Program not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/programs/:id/report',
  authenticate,
  disabilityRehabilitationController.getDetailedReport
);

module.exports = router;

