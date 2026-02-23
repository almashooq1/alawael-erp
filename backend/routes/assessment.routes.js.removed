/**
 * Assessment Routes
 *
 * مسارات API لنظام التقييمات والتشخيصات
 * 15 نقطة نهاية
 */

const express = require('express');
const router = express.Router();
const AssessmentController = require('../controllers/assessmentController');

// CRUD أساسية
router.post('/', AssessmentController.createAssessment); // POST /api/assessments
router.get('/', AssessmentController.getAssessments); // GET /api/assessments
router.get('/:id', AssessmentController.getAssessmentById); // GET /api/assessments/:id
router.put('/:id', AssessmentController.updateAssessment); // PUT /api/assessments/:id
router.delete('/:id', AssessmentController.deleteAssessment); // DELETE /api/assessments/:id

// الموافقة والرفض
router.post('/:id/approve', AssessmentController.approveAssessment); // POST /api/assessments/:id/approve
router.post('/:id/reject', AssessmentController.rejectAssessment); // POST /api/assessments/:id/reject

// الأرشفة
router.post('/:id/archive', AssessmentController.archiveAssessment); // POST /api/assessments/:id/archive

// التحليلات والبحث
router.get('/statistics', AssessmentController.getStatistics); // GET /api/assessments/statistics
router.get('/search', AssessmentController.advancedSearch); // GET /api/assessments/search
router.get('/pending', AssessmentController.getPendingAssessments); // GET /api/assessments/pending
router.get('/type/:type', AssessmentController.getAssessmentsByType); // GET /api/assessments/type/:type

module.exports = router;
