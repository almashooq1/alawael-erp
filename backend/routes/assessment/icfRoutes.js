const express = require('express');
const router = express.Router();
const ICFAssessment = require('../../models/assessment/ICFAssessmentLegacy');
const { authenticate: auth, requireRole: checkRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../../middleware/assertBranchMatch');
const { validate } = require('../../middleware/validate');
const Joi = require('joi');

// W269 cross-branch isolation: branch-check both the `:beneficiaryId` path
// params and the POST-body beneficiaryId. Fail-open for cross-branch roles /
// unscoped callers; enforced for restricted staff.
router.use(auth);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);
router.param('beneficiaryId', branchScopedBeneficiaryParam);

// نسخة محلية من دوال الحساب (backend-only) — لا تعتمد على frontend
function localCalculateDomainScore(scores, domain) {
  const domainMap = {
    b: 'bodyFunctions',
    s: 'bodyStructures',
    d: 'activitiesAndParticipation',
    e: 'environmentalFactors',
    p: 'personalFactors',
  };

  const domainScores = Object.entries(scores)
    .filter(([code]) => domainMap[code.charAt(0)] === domain)
    .map(([, score]) => score.performance)
    .filter(val => val !== undefined && val !== 8 && val !== 9);

  if (domainScores.length === 0) return 0;
  return domainScores.reduce((a, b) => a + b, 0) / domainScores.length;
}

function _localCalculateOverallScore(scores) {
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesAndParticipation',
    'environmentalFactors',
    'personalFactors',
  ];

  const validScores = domains.map(d => localCalculateDomainScore(scores, d)).filter(s => s > 0);

  if (validScores.length === 0) return 0;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

/**
 * ICF Assessment Routes
 * مسارات تقييم ICF
 */

// Create new assessment
router.post(
  '/',
  auth,
  checkRole(['therapist', 'doctor', 'admin']),
  validate({
    body: Joi.object({
      beneficiaryId: Joi.string().required(),
      coreSetType: Joi.string().valid('rehab', 'autism', 'cp', 'custom').default('rehab'),
      scores: Joi.object().required(),
      notes: Joi.string().optional(),
      assessmentDate: Joi.date().optional(),
    }),
  }),
  async (req, res) => {
    try {
      const { beneficiaryId, coreSetType, scores, notes, assessmentDate } = req.body;

      const assessment = new ICFAssessment({
        beneficiary: beneficiaryId,
        assessor: req.user.id,
        coreSetType,
        scores: new Map(Object.entries(scores)),
        notes,
        assessmentDate: assessmentDate || new Date(),
      });

      // Calculate domain scores and overall score
      assessment.calculateDomainScores();
      assessment.calculateOverallScore();

      await assessment.save();

      res.status(201).json({
        success: true,
        data: assessment,
        message: 'Assessment created successfully',
      });
    } catch (error) {
      console.error('Error creating ICF assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating assessment',
        error: error.message,
      });
    }
  }
);

// Get all assessments for a beneficiary
router.get('/beneficiary/:beneficiaryId', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const { limit, status, startDate, endDate, timeRange } = req.query;

    let assessments;

    if (timeRange) {
      assessments = await ICFAssessment.getProgressData(beneficiaryId, timeRange);
    } else {
      assessments = await ICFAssessment.findByPatient(beneficiaryId, {
        limit: parseInt(limit) || 10,
        status,
        startDate,
        endDate,
      });
    }

    res.json({
      success: true,
      data: assessments,
      count: assessments.length,
    });
  } catch (error) {
    console.error('Error fetching beneficiary assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assessments',
      error: error.message,
    });
  }
});

// Get latest assessment for a beneficiary
router.get('/beneficiary/:beneficiaryId/latest', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const assessment = await ICFAssessment.findLatestByPatient(beneficiaryId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'No assessment found',
      });
    }

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    console.error('Error fetching latest assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching latest assessment',
      error: error.message,
    });
  }
});

// Get specific assessment
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await ICFAssessment.findById(id)
      .populate('assessor', 'name role')
      .populate('linkedGoals', 'title status')
      .populate('beneficiary', 'name dateOfBirth');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    res.json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assessment',
      error: error.message,
    });
  }
});

// Update assessment
router.put(
  '/:id',
  auth,
  checkRole(['therapist', 'doctor', 'admin']),
  validate({
    body: Joi.object({
      scores: Joi.object().optional(),
      notes: Joi.string().optional(),
      status: Joi.string().valid('draft', 'completed', 'archived').optional(),
      recommendations: Joi.array().optional(),
      linkedGoals: Joi.array().optional(),
      environmentalBarriers: Joi.array().optional(),
      environmentalFacilitators: Joi.array().optional(),
    }),
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.scores) {
        updateData.scores = new Map(Object.entries(updateData.scores));
      }

      const assessment = await ICFAssessment.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Assessment not found',
        });
      }

      res.json({
        success: true,
        data: assessment,
        message: 'Assessment updated successfully',
      });
    } catch (error) {
      console.error('Error updating assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating assessment',
        error: error.message,
      });
    }
  }
);

// Submit assessment (mark as completed)
router.post('/:id/submit', auth, checkRole(['therapist', 'doctor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const assessment = await ICFAssessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    // Validate assessment completeness
    const scores = assessment.scores || new Map();
    const scoredCodes = Array.from(scores.values()).filter(
      score => score.performance !== undefined && score.performance !== 8 && score.performance !== 9
    );

    if (scoredCodes.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Assessment incomplete - at least 5 codes must be scored',
      });
    }

    assessment.status = 'completed';
    assessment.calculateDomainScores();
    assessment.calculateOverallScore();

    await assessment.save();

    res.json({
      success: true,
      data: assessment,
      message: 'Assessment submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting assessment',
      error: error.message,
    });
  }
});

// Delete assessment
router.delete('/:id', auth, checkRole(['admin', 'doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await ICFAssessment.findByIdAndDelete(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    res.json({
      success: true,
      message: 'Assessment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting assessment',
      error: error.message,
    });
  }
});

// Compare assessments
router.get('/:id/compare/:otherId', auth, async (req, res) => {
  try {
    const { id, otherId } = req.params;

    const assessment = await ICFAssessment.findById(id);
    const otherAssessment = await ICFAssessment.findById(otherId);

    if (!assessment || !otherAssessment) {
      return res.status(404).json({
        success: false,
        message: 'One or both assessments not found',
      });
    }

    const comparison = assessment.compareWith(otherAssessment);

    res.json({
      success: true,
      data: {
        currentAssessment: assessment,
        previousAssessment: otherAssessment,
        comparison,
      },
    });
  } catch (error) {
    console.error('Error comparing assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing assessments',
      error: error.message,
    });
  }
});

// Get assessment statistics
router.get('/stats/overview', auth, checkRole(['admin', 'doctor', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, coreSetType } = req.query;

    const stats = await ICFAssessment.getStatistics({
      startDate,
      endDate,
      coreSetType,
    });

    res.json({
      success: true,
      data: stats[0] || {},
    });
  } catch (error) {
    console.error('Error fetching assessment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
});

// Get progress data for a beneficiary
router.get('/beneficiary/:beneficiaryId/progress', auth, async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const { timeRange } = req.query;

    const progressData = await ICFAssessment.getProgressData(beneficiaryId, timeRange || '6months');

    // Calculate trends
    const trends = {};
    const domains = [
      'bodyFunctions',
      'bodyStructures',
      'activitiesAndParticipation',
      'environmentalFactors',
      'personalFactors',
    ];

    if (progressData.length >= 2) {
      domains.forEach(domain => {
        const scores = progressData.map(d => d.domainScores?.[domain]).filter(Boolean);

        if (scores.length >= 2) {
          const first = scores[0];
          const last = scores[scores.length - 1];
          const change = last - first;

          const firstDate = new Date(progressData[0].assessmentDate);
          const lastDate = new Date(progressData[progressData.length - 1].assessmentDate);
          const monthsDiff = Math.max((lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30), 1);
          const rate = change / monthsDiff;

          trends[domain] = {
            trend: rate < -0.1 ? 'improving' : rate > 0.1 ? 'worsening' : 'stable',
            rate: rate.toFixed(2),
            change: change.toFixed(2),
            firstScore: first.toFixed(2),
            lastScore: last.toFixed(2),
          };
        }
      });
    }

    res.json({
      success: true,
      data: {
        progressData,
        trends,
        totalAssessments: progressData.length,
      },
    });
  } catch (error) {
    console.error('Error fetching progress data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress data',
      error: error.message,
    });
  }
});

// ─── NEW: ICF → Care Plan Integration ────────────────────────────────

const {
  generateGoalsFromAssessment,
  createCarePlanFromICF,
  getGoalRecommendations,
} = require('../../services/icfGoalIntegration.service');

// Generate therapeutic goals from ICF assessment and push to CarePlanVersion
router.post(
  '/:id/generate-goals',
  auth,
  checkRole(['therapist', 'doctor', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { carePlanVersionId } = req.body;

      const result = await generateGoalsFromAssessment(id, carePlanVersionId || null);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      res.json({
        success: true,
        data: result.goals,
        message: result.message,
      });
    } catch (error) {
      console.error('Error generating goals from ICF assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating goals',
        error: error.message,
      });
    }
  }
);

// Get goal recommendations from ICF assessment (read-only, no save)
router.get('/:id/recommendations', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getGoalRecommendations(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      data: result.recommendations,
      message: result.message,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting recommendations',
      error: error.message,
    });
  }
});

// Create a new CarePlanVersion from ICF assessment
router.post(
  '/:id/create-care-plan',
  auth,
  checkRole(['therapist', 'doctor', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await createCarePlanFromICF(id, req.user.id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      res.status(201).json({
        success: true,
        data: {
          carePlanVersionId: result.carePlanVersionId,
          goals: result.goals,
        },
        message: result.message,
      });
    } catch (error) {
      console.error('Error creating care plan from ICF:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating care plan',
        error: error.message,
      });
    }
  }
);

// ─── NEW: ICF → Medical Files Integration ───────────────────────────

const { exportAssessmentToDocument } = require('../../services/icfReportExport.service');

// Export ICF assessment report as a Document in Medical Files
router.post(
  '/:id/export-to-document',
  auth,
  checkRole(['therapist', 'doctor', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await exportAssessmentToDocument(id, req.user.id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      res.json({
        success: true,
        data: { documentId: result.documentId },
        message: result.message,
      });
    } catch (error) {
      console.error('Error exporting ICF assessment to document:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting report to medical files',
        error: error.message,
      });
    }
  }
);

module.exports = router;
