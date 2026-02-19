/**
 * ALAWAEL ERP - PHASE 21: WORKFORCE ANALYTICS & PLANNING ROUTES
 * REST API endpoints for workforce planning, analytics, succession planning, and talent management
 */

const express = require('express');

module.exports = workforceAnalyticsService => {
  const router = express.Router();

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFORCE PLANNING endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /headcount-plan - Create headcount plan
  router.post('/headcount-plan', (req, res) => {
    try {
      const {
        departmentId,
        planYear,
        currentHeadcount,
        targetHeadcount,
        budgetedCost,
        plannedHires,
        plannedSeparations,
        assumptions,
        risks,
      } = req.body;

      if (!departmentId || !planYear || !targetHeadcount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: departmentId, planYear, targetHeadcount',
        });
      }

      const plan = workforceAnalyticsService.createHeadcountPlan({
        departmentId,
        planYear,
        currentHeadcount: currentHeadcount || 0,
        targetHeadcount,
        budgetedCost: budgetedCost || null,
        plannedHires: plannedHires || 0,
        plannedSeparations: plannedSeparations || 0,
        assumptions: assumptions || [],
        risks: risks || [],
      });

      res.status(201).json({
        success: true,
        message: 'Headcount plan created',
        data: plan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PATCH /headcount-plan/:id/approve - Approve headcount plan
  router.patch('/headcount-plan/:planId/approve', (req, res) => {
    try {
      const { planId } = req.params;
      const { status, approver, comments } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: status',
        });
      }

      const updated = workforceAnalyticsService.approveHeadcountPlan(planId, {
        status,
        approver: approver || 'system',
        comments: comments || '',
      });

      res.json({
        success: true,
        message: 'Headcount plan approved',
        data: updated,
      });
    } catch (error) {
      res.status(error.message === 'Plan not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /forecast - Create workforce forecast
  router.post('/forecast', (req, res) => {
    try {
      const {
        metric,
        department,
        period,
        historicalData,
        predictedValue,
        confidence,
        methodology,
      } = req.body;

      if (!metric || !department || !period) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: metric, department, period',
        });
      }

      const forecast = workforceAnalyticsService.createForecast({
        metric,
        department,
        period,
        historicalData: historicalData || [],
        predictedValue: predictedValue || null,
        confidence: confidence || null,
        methodology: methodology || 'trend-analysis',
      });

      res.status(201).json({
        success: true,
        message: 'Forecast created',
        data: forecast,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PATCH /forecast/:id/accuracy - Update forecast accuracy
  router.patch('/forecast/:forecastId/accuracy', (req, res) => {
    try {
      const { forecastId } = req.params;
      const { actualValue } = req.body;

      if (actualValue === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: actualValue',
        });
      }

      const updated = workforceAnalyticsService.updateForecastAccuracy(forecastId, { actualValue });

      res.json({
        success: true,
        message: 'Forecast accuracy updated',
        data: updated,
      });
    } catch (error) {
      res.status(error.message === 'Forecast not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUCCESSION PLANNING endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /succession-plan - Create succession plan
  router.post('/succession-plan', (req, res) => {
    try {
      const {
        positionId,
        positionTitle,
        currentHolder,
        criticalityLevel,
        successors,
        developmentNeeds,
        riskFactors,
        timelineToVacancy,
      } = req.body;

      if (!positionId || !currentHolder || !criticalityLevel) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: positionId, currentHolder, criticalityLevel',
        });
      }

      const plan = workforceAnalyticsService.createSuccessionPlan({
        positionId,
        positionTitle: positionTitle || null,
        currentHolder,
        criticalityLevel,
        successors: successors || [],
        developmentNeeds: developmentNeeds || [],
        riskFactors: riskFactors || [],
        timelineToVacancy: timelineToVacancy || null,
      });

      res.status(201).json({
        success: true,
        message: 'Succession plan created',
        data: plan,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /succession-plan/:id/successor - Add successor
  router.post('/succession-plan/:planId/successor', (req, res) => {
    try {
      const { planId } = req.params;
      const {
        employeeId,
        name,
        department,
        readinessLevel,
        developmentActions,
        estimatedReadyDate,
        priority,
      } = req.body;

      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: employeeId',
        });
      }

      const successor = workforceAnalyticsService.addSuccessor(planId, {
        employeeId,
        name: name || null,
        department: department || null,
        readinessLevel: readinessLevel || 'developing',
        developmentActions: developmentActions || [],
        estimatedReadyDate: estimatedReadyDate || null,
        priority: priority || 'secondary',
      });

      res.status(201).json({
        success: true,
        message: 'Successor added to plan',
        data: successor,
      });
    } catch (error) {
      res.status(error.message === 'Succession plan not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SKILLS & COMPETENCY TRACKING endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /skills - Create skill mapping
  router.post('/skills', (req, res) => {
    try {
      const {
        employeeId,
        employeeName,
        department,
        skills,
        certifications,
        languages,
        clearances,
      } = req.body;

      if (!employeeId || !department) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: employeeId, department',
        });
      }

      const mapping = workforceAnalyticsService.createSkillMapping({
        employeeId,
        employeeName: employeeName || null,
        department,
        skills: skills || [],
        certifications: certifications || [],
        languages: languages || [],
        clearances: clearances || [],
      });

      res.status(201).json({
        success: true,
        message: 'Skill mapping created',
        data: mapping,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PATCH /skills/:id - Update skill proficiency
  router.patch('/skills/:skillMappingId', (req, res) => {
    try {
      const { skillMappingId } = req.params;
      const { skillName, proficiency, yearsOfExperience } = req.body;

      if (!skillName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: skillName',
        });
      }

      const updated = workforceAnalyticsService.updateSkillProficiency(skillMappingId, {
        skillName,
        proficiency: proficiency || 0,
        yearsOfExperience: yearsOfExperience || 0,
      });

      res.json({
        success: true,
        message: 'Skill proficiency updated',
        data: updated,
      });
    } catch (error) {
      res.status(error.message === 'Skill mapping not found' ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RETENTION & ATTRITION ANALYSIS endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /retention - Analyze retention
  router.post('/retention', (req, res) => {
    try {
      const {
        department,
        period,
        startHeadcount,
        endHeadcount,
        separations,
        voluntaryAttrition,
        involuntaryAttrition,
        riskEmployees,
      } = req.body;

      if (!department || !period) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: department, period',
        });
      }

      const analysis = workforceAnalyticsService.analyzeRetention({
        department,
        period,
        startHeadcount: startHeadcount || 0,
        endHeadcount: endHeadcount || 0,
        separations: separations || 0,
        voluntaryAttrition: voluntaryAttrition || 0,
        involuntaryAttrition: involuntaryAttrition || 0,
        riskEmployees: riskEmployees || [],
      });

      res.status(201).json({
        success: true,
        message: 'Retention analysis completed',
        data: analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /attrition-risk - Predict attrition risk
  router.post('/attrition-risk', (req, res) => {
    try {
      const {
        employeeId,
        yearsWithCompany,
        performanceRating,
        marketableSkills,
        promotionsInTenure,
      } = req.body;

      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: employeeId',
        });
      }

      const riskAssessment = workforceAnalyticsService.predictAttritionRisk({
        employeeId,
        yearsWithCompany: yearsWithCompany || 0,
        performanceRating: performanceRating || 3,
        marketableSkills: marketableSkills || [],
        promotionsInTenure: promotionsInTenure || 0,
      });

      res.status(201).json({
        success: true,
        message: 'Attrition risk assessed',
        data: riskAssessment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPENSATION & BENEFITS ANALYSIS endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /salary-band - Create salary band
  router.post('/salary-band', (req, res) => {
    try {
      const { bandName, level, minSalary, maxSalary, currency, positions } = req.body;

      if (!bandName || minSalary === undefined || maxSalary === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: bandName, minSalary, maxSalary',
        });
      }

      const band = workforceAnalyticsService.createSalaryBand({
        bandName,
        level: level || 0,
        minSalary,
        maxSalary,
        currency: currency || 'USD',
        positions: positions || [],
      });

      res.status(201).json({
        success: true,
        message: 'Salary band created',
        data: band,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /compensation-analysis - Analyze compensation
  router.post('/compensation-analysis', (req, res) => {
    try {
      const {
        department,
        totalPayroll,
        headcount,
        medianSalary,
        benefitsCosts,
        compaRatio,
        genderPayGap,
      } = req.body;

      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: department',
        });
      }

      const analysis = workforceAnalyticsService.analyzeCompensation({
        department,
        totalPayroll: totalPayroll || 0,
        headcount: headcount || 0,
        medianSalary: medianSalary || 0,
        benefitsCosts: benefitsCosts || 0,
        compaRatio: compaRatio || null,
        genderPayGap: genderPayGap || null,
      });

      res.status(201).json({
        success: true,
        message: 'Compensation analysis completed',
        data: analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /compensation-adjustment - Identify compensation adjustments
  router.post('/compensation-adjustment', (req, res) => {
    try {
      const { employeeId, currentSalary, marketRate, effectiveDate } = req.body;

      if (!employeeId || !marketRate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: employeeId, marketRate',
        });
      }

      const adjustment = workforceAnalyticsService.identifyCompensationAdjustments(employeeId, {
        currentSalary: currentSalary || 0,
        marketRate,
        effectiveDate: effectiveDate || new Date(),
      });

      res.status(201).json({
        success: true,
        message: 'Compensation adjustment identified',
        data: adjustment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS & REPORTING endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /analytics/:departmentId - Get department analytics
  router.get('/analytics/:departmentId', (req, res) => {
    try {
      const { departmentId } = req.params;

      const analytics = workforceAnalyticsService.getDepartmentAnalytics(departmentId);

      res.json({
        success: true,
        message: 'Department analytics retrieved',
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /report - Generate workforce report
  router.post('/report', (req, res) => {
    try {
      const { period, generatedBy } = req.body;

      if (!period) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: period',
        });
      }

      const report = workforceAnalyticsService.generateWorkforceReport({
        period,
        generatedBy: generatedBy || 'system',
      });

      res.status(201).json({
        success: true,
        message: 'Workforce report generated',
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // GET /health - Get workforce health score
  router.get('/health', (req, res) => {
    try {
      const health = workforceAnalyticsService.getWorkforceHealthScore();

      res.json({
        success: true,
        message: 'Workforce health score retrieved',
        data: health,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
};
