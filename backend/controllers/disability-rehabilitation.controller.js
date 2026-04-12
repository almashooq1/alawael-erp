/* eslint-disable no-unused-vars */
/**
 * Disability Rehabilitation Controller
 * متحكم نظام تأهيل ذوي الإعاقة
 *
 * @module controllers/disability-rehabilitation
 * @description معالجة طلبات API لنظام التأهيل
 * @version 1.0.0
 * @date 2026-01-19
 */

const rehabilitationService = require('../services/disability-rehabilitation.service');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class DisabilityRehabilitationController {
  /**
   * @route   POST /api/v1/disability-rehabilitation/programs
   * @desc    إنشاء برنامج تأهيل جديد
   * @access  Private
   */
  async createProgram(req, res) {
    try {
      if (!req.headers.authorization) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!req.body?.program_info?.name_ar || !req.body?.program_info?.name_en) {
        return res.status(400).json({
          success: false,
          message: 'بيانات البرنامج غير مكتملة',
        });
      }

      const programData = req.body;
      const createdBy = {
        userId: req.user?.id || req.user?._id || 'test-user',
        name: req.user?.name || req.user?.full_name || 'Test User',
      };

      const result = await rehabilitationService.createProgram(programData, createdBy);
      if (!result.success) {
        const statusCode = result.code === 'VALIDATION_FAILED' ? 400 : 404;
        return res.status(statusCode).json(result);
      }
      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in createProgram');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs/:id
   * @desc    الحصول على برنامج محدد
   * @access  Private
   */
  async getProgramById(req, res) {
    try {
      const { id } = req.params;
      const result = await rehabilitationService.getProgramById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getProgramById');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs
   * @desc    الحصول على جميع البرامج مع الفلترة
   * @access  Private
   */
  async getAllPrograms(req, res) {
    try {
      const filters = {
        disability_type: req.query.disability_type,
        status: req.query.status,
        beneficiary_id: req.query.beneficiary_id,
        severity: req.query.severity,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        search: req.query.search,
      };

      const pagination = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sort: req.query.sort || '-createdAt',
      };

      const result = await rehabilitationService.getAllPrograms(filters, pagination);

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getAllPrograms');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id
   * @desc    تحديث برنامج التأهيل
   * @access  Private
   */
  async updateProgram(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.updateProgram(id, updateData, updatedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateProgram');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/sessions
   * @desc    إضافة جلسة جديدة
   * @access  Private
   */
  async addSession(req, res) {
    try {
      const { id } = req.params;
      const sessionData = req.body;
      const addedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.addSession(id, sessionData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addSession');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/goals/:goalId
   * @desc    تحديث حالة هدف
   * @access  Private
   */
  async updateGoalStatus(req, res) {
    try {
      const { id, goalId } = req.params;
      const { status, progress } = req.body;
      const updatedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.updateGoalStatus(
        id,
        goalId,
        status,
        progress,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateGoalStatus');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/assessments
   * @desc    إضافة تقييم
   * @access  Private
   */
  async addAssessment(req, res) {
    try {
      const { id } = req.params;
      const assessmentData = req.body;
      const addedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.addAssessment(id, assessmentData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addAssessment');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/complete
   * @desc    إنهاء البرنامج
   * @access  Private
   */
  async completeProgram(req, res) {
    try {
      const { id } = req.params;
      const { completion_notes } = req.body;
      const completedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.completeProgram(id, completion_notes, completedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in completeProgram');
    }
  }

  /**
   * @route   DELETE /api/v1/disability-rehabilitation/programs/:id
   * @desc    حذف برنامج (soft delete)
   * @access  Private
   */
  async deleteProgram(req, res) {
    try {
      const { id } = req.params;
      const deletedBy = {
        userId: req.user.id || req.user._id,
        name: req.user.name || req.user.full_name,
      };

      const result = await rehabilitationService.deleteProgram(id, deletedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in deleteProgram');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/statistics
   * @desc    إحصائيات عامة
   * @access  Private
   */
  async getStatistics(req, res) {
    try {
      const filters = {
        date_from: req.query.date_from,
        date_to: req.query.date_to,
      };

      const result = await rehabilitationService.getStatistics(filters);

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getStatistics');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/performance/:year/:month
   * @desc    تقرير الأداء الشهري
   * @access  Private
   */
  async getMonthlyPerformance(req, res) {
    try {
      const { year, month } = req.params;

      const result = await rehabilitationService.getMonthlyPerformance(
        parseInt(year),
        parseInt(month)
      );

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getMonthlyPerformance');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/beneficiary/:beneficiaryId/programs
   * @desc    الحصول على برامج المستفيد
   * @access  Private
   */
  async getBeneficiaryPrograms(req, res) {
    try {
      const { beneficiaryId } = req.params;

      const result = await rehabilitationService.getBeneficiaryPrograms(beneficiaryId);

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getBeneficiaryPrograms');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs/:id/report
   * @desc    تقرير تفصيلي عن برنامج
   * @access  Private
   */
  async getDetailedReport(req, res) {
    try {
      const { id } = req.params;

      const result = await rehabilitationService.getDetailedReport(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getDetailedReport');
    }
  }

  // ============================================
  // الميزات الجديدة - New Features
  // ============================================

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/suspend
   * @desc    تعليق برنامج تأهيل
   * @access  Private
   */
  async suspendProgram(req, res) {
    try {
      const { id } = req.params;
      const { reason, expected_resume_date } = req.body;
      const suspendedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.suspendProgram(
        id,
        reason,
        expected_resume_date,
        suspendedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in suspendProgram');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/resume
   * @desc    استئناف برنامج معلق
   * @access  Private
   */
  async resumeProgram(req, res) {
    try {
      const { id } = req.params;
      const resumedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.resumeProgram(id, resumedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in resumeProgram');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/transfer
   * @desc    تحويل المستفيد إلى برنامج آخر
   * @access  Private
   */
  async transferProgram(req, res) {
    try {
      const { id } = req.params;
      const { target_program_id, transfer_reason, transfer_notes } = req.body;
      const transferredBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.transferProgram(
        id,
        target_program_id,
        transfer_reason,
        transfer_notes,
        transferredBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in transferProgram');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/risk-assessment
   * @desc    تحديث تقييم المخاطر
   * @access  Private
   */
  async updateRiskAssessment(req, res) {
    try {
      const { id } = req.params;
      const riskData = req.body;
      const assessedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateRiskAssessment(id, riskData, assessedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateRiskAssessment');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/quality-of-life
   * @desc    تحديث تقييم جودة الحياة
   * @access  Private
   */
  async updateQualityOfLife(req, res) {
    try {
      const { id } = req.params;
      const qolData = req.body;
      const assessedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateQualityOfLife(id, qolData, assessedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateQualityOfLife');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/transition-plan
   * @desc    تحديث خطة الانتقال
   * @access  Private
   */
  async updateTransitionPlan(req, res) {
    try {
      const { id } = req.params;
      const transitionData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateTransitionPlan(
        id,
        transitionData,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateTransitionPlan');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/medications
   * @desc    إضافة/تحديث الأدوية
   * @access  Private
   */
  async manageMedications(req, res) {
    try {
      const { id } = req.params;
      const medicationData = req.body;
      const addedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.manageMedications(id, medicationData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in manageMedications');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/team-communication
   * @desc    إضافة رسالة تواصل فريق
   * @access  Private
   */
  async addTeamCommunication(req, res) {
    try {
      const { id } = req.params;
      const messageData = req.body;
      const sentBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
        role: req.user?.role || 'staff',
      };

      const result = await rehabilitationService.addTeamCommunication(id, messageData, sentBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addTeamCommunication');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/satisfaction-survey
   * @desc    إضافة استبيان رضا
   * @access  Private
   */
  async addSatisfactionSurvey(req, res) {
    try {
      const { id } = req.params;
      const surveyData = req.body;

      const result = await rehabilitationService.addSatisfactionSurvey(id, surveyData);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addSatisfactionSurvey');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/discharge-plan
   * @desc    تحديث خطة التخريج
   * @access  Private
   */
  async updateDischargePlan(req, res) {
    try {
      const { id } = req.params;
      const dischargeData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateDischargePlan(id, dischargeData, updatedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateDischargePlan');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/home-program
   * @desc    تحديث البرنامج المنزلي
   * @access  Private
   */
  async updateHomeProgram(req, res) {
    try {
      const { id } = req.params;
      const homeProgramData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateHomeProgram(id, homeProgramData, updatedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateHomeProgram');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/vitals
   * @desc    إضافة قياسات حيوية
   * @access  Private
   */
  async addVitals(req, res) {
    try {
      const { id } = req.params;
      const vitalsData = req.body;
      const addedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.addVitals(id, vitalsData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addVitals');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/iep
   * @desc    تحديث الخطة التعليمية الفردية
   * @access  Private
   */
  async updateIEP(req, res) {
    try {
      const { id } = req.params;
      const iepData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateIEP(id, iepData, updatedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateIEP');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs/:id/progress-summary
   * @desc    ملخص التقدم الشامل
   * @access  Private
   */
  async getProgressSummary(req, res) {
    try {
      const { id } = req.params;

      const result = await rehabilitationService.getProgressSummary(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getProgressSummary');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/waiting-list
   * @desc    قائمة الانتظار
   * @access  Private
   */
  async getWaitingList(req, res) {
    try {
      const filters = {
        priority_level: req.query.priority_level,
        disability_type: req.query.disability_type,
        sort: req.query.sort || 'date_added',
      };

      const result = await rehabilitationService.getWaitingList(filters);

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getWaitingList');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/dashboard
   * @desc    لوحة المعلومات الشاملة
   * @access  Private
   */
  async getDashboard(req, res) {
    try {
      const result = await rehabilitationService.getDashboard();

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getDashboard');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/programs/:id/export
   * @desc    تصدير تقرير البرنامج
   * @access  Private
   */
  async exportProgramReport(req, res) {
    try {
      const { id } = req.params;
      const { format } = req.query; // 'json', 'csv', 'pdf'

      const result = await rehabilitationService.exportProgramReport(id, format || 'json');

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in exportProgramReport');
    }
  }

  // ============================================
  // Phase 3 - الميزات المتقدمة الجديدة
  // ============================================

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/behavioral-plans
   * @desc    إضافة خطة تدخل سلوكي
   * @access  Private
   */
  async addBehavioralPlan(req, res) {
    try {
      const { id } = req.params;
      const planData = req.body;
      const addedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
        role: req.user?.role || 'therapist',
      };

      const result = await rehabilitationService.addBehavioralPlan(id, planData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addBehavioralPlan');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/behavioral-plans/:planId
   * @desc    تحديث خطة تدخل سلوكي
   * @access  Private
   */
  async updateBehavioralPlan(req, res) {
    try {
      const { id, planId } = req.params;
      const planData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateBehavioralPlan(
        id,
        planId,
        planData,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateBehavioralPlan');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/incidents
   * @desc    إضافة تقرير حادثة
   * @access  Private
   */
  async addIncidentReport(req, res) {
    try {
      const { id } = req.params;
      const incidentData = req.body;
      const reportedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
        role: req.user?.role || 'staff',
      };

      const result = await rehabilitationService.addIncidentReport(id, incidentData, reportedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addIncidentReport');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/incidents/:incidentId
   * @desc    تحديث تقرير حادثة
   * @access  Private
   */
  async updateIncidentReport(req, res) {
    try {
      const { id, incidentId } = req.params;
      const incidentData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateIncidentReport(
        id,
        incidentId,
        incidentData,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateIncidentReport');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/appointments
   * @desc    إضافة موعد جديد
   * @access  Private
   */
  async addAppointment(req, res) {
    try {
      const { id } = req.params;
      const appointmentData = req.body;
      const addedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.addAppointment(id, appointmentData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addAppointment');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/appointments/:appointmentId
   * @desc    تحديث موعد
   * @access  Private
   */
  async updateAppointment(req, res) {
    try {
      const { id, appointmentId } = req.params;
      const appointmentData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateAppointment(
        id,
        appointmentId,
        appointmentData,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateAppointment');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/documents
   * @desc    إضافة مستند
   * @access  Private
   */
  async addDocument(req, res) {
    try {
      const { id } = req.params;
      const documentData = req.body;
      const uploadedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.addDocument(id, documentData, uploadedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addDocument');
    }
  }

  /**
   * @route   DELETE /api/v1/disability-rehabilitation/programs/:id/documents/:documentId
   * @desc    حذف مستند
   * @access  Private
   */
  async deleteDocument(req, res) {
    try {
      const { id, documentId } = req.params;
      const deletedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.deleteDocument(id, documentId, deletedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in deleteDocument');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/group-activities
   * @desc    إضافة نشاط مجموعة
   * @access  Private
   */
  async addGroupActivity(req, res) {
    try {
      const { id } = req.params;
      const activityData = req.body;
      const addedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
        role: req.user?.role || 'therapist',
      };

      const result = await rehabilitationService.addGroupActivity(id, activityData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addGroupActivity');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/emergency-contacts
   * @desc    تحديث جهات اتصال الطوارئ
   * @access  Private
   */
  async updateEmergencyContacts(req, res) {
    try {
      const { id } = req.params;
      const contactsData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateEmergencyContacts(
        id,
        contactsData,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateEmergencyContacts');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/cultural-preferences
   * @desc    تحديث التفضيلات الثقافية واللغوية
   * @access  Private
   */
  async updateCulturalPreferences(req, res) {
    try {
      const { id } = req.params;
      const prefData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateCulturalPreferences(id, prefData, updatedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateCulturalPreferences');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/attendance-summary
   * @desc    تحديث ملخص الحضور
   * @access  Private
   */
  async updateAttendanceSummary(req, res) {
    try {
      const { id } = req.params;
      const attendanceData = req.body;
      const updatedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.updateAttendanceSummary(
        id,
        attendanceData,
        updatedBy
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in updateAttendanceSummary');
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/programs/:id/alerts
   * @desc    إضافة تنبيه
   * @access  Private
   */
  async addAlert(req, res) {
    try {
      const { id } = req.params;
      const alertData = req.body;
      const addedBy = {
        userId: req.user?.id || req.user?._id,
        name: req.user?.name || req.user?.full_name,
      };

      const result = await rehabilitationService.addAlert(id, alertData, addedBy);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      safeError(res, error, 'in addAlert');
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/programs/:id/alerts/:alertId/dismiss
   * @desc    تجاهل تنبيه
   * @access  Private
   */
  async dismissAlert(req, res) {
    try {
      const { id, alertId } = req.params;

      const result = await rehabilitationService.dismissAlert(id, alertId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in dismissAlert');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/analytics
   * @desc    تحليلات متقدمة
   * @access  Private
   */
  async getAnalytics(req, res) {
    try {
      const filters = {
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        disability_type: req.query.disability_type,
      };

      const result = await rehabilitationService.getAnalytics(filters);

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getAnalytics');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/upcoming-appointments
   * @desc    المواعيد القادمة
   * @access  Private
   */
  async getUpcomingAppointments(req, res) {
    try {
      const { days = 7 } = req.query;

      const result = await rehabilitationService.getUpcomingAppointments(parseInt(days));

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getUpcomingAppointments');
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/active-alerts
   * @desc    التنبيهات النشطة
   * @access  Private
   */
  async getActiveAlerts(req, res) {
    try {
      const result = await rehabilitationService.getActiveAlerts();

      return res.status(200).json(result);
    } catch (error) {
      safeError(res, error, 'in getActiveAlerts');
    }
  }

  // =====================================================
  // Phase 4: Telehealth, Financial, Notes, Referrals, Transportation
  // =====================================================

  /**
   * @route   PUT /api/v1/disability-rehabilitation/:id/telehealth
   * @desc    تحديث معلومات الرعاية عن بعد
   */
  async updateTelehealth(req, res) {
    try {
      const result = await rehabilitationService.updateTelehealth(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateTelehealth:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({
          success: false,
          message: 'حدث خطأ أثناء تحديث بيانات الرعاية عن بعد',
          error: 'حدث خطأ داخلي',
        });
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/:id/telehealth/connectivity-issue
   * @desc    تسجيل مشكلة اتصال
   */
  async addConnectivityIssue(req, res) {
    try {
      const result = await rehabilitationService.addConnectivityIssue(req.params.id, req.body);
      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in addConnectivityIssue:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({
          success: false,
          message: 'حدث خطأ أثناء تسجيل مشكلة الاتصال',
          error: 'حدث خطأ داخلي',
        });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/:id/financial
   * @desc    تحديث المعلومات المالية
   */
  async updateFinancialInfo(req, res) {
    try {
      const result = await rehabilitationService.updateFinancialInfo(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateFinancialInfo:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({
          success: false,
          message: 'حدث خطأ أثناء تحديث البيانات المالية',
          error: 'حدث خطأ داخلي',
        });
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/:id/invoices
   * @desc    إضافة فاتورة
   */
  async addInvoice(req, res) {
    try {
      const result = await rehabilitationService.addInvoice(req.params.id, req.body);
      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in addInvoice:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({ success: false, message: 'حدث خطأ أثناء إضافة الفاتورة', error: 'حدث خطأ داخلي' });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/:id/insurance
   * @desc    تحديث معلومات التأمين
   */
  async updateInsuranceInfo(req, res) {
    try {
      const result = await rehabilitationService.updateInsuranceInfo(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateInsuranceInfo:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({
          success: false,
          message: 'حدث خطأ أثناء تحديث بيانات التأمين',
          error: 'حدث خطأ داخلي',
        });
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/:id/notes
   * @desc    إضافة ملاحظة
   */
  async addNote(req, res) {
    try {
      const result = await rehabilitationService.addNote(req.params.id, req.body, req.user);
      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in addNote:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({ success: false, message: 'حدث خطأ أثناء إضافة الملاحظة', error: 'حدث خطأ داخلي' });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/:id/notes/:noteId
   * @desc    تحديث ملاحظة
   */
  async updateNote(req, res) {
    try {
      const result = await rehabilitationService.updateNote(
        req.params.id,
        req.params.noteId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateNote:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({ success: false, message: 'حدث خطأ أثناء تحديث الملاحظة', error: 'حدث خطأ داخلي' });
    }
  }

  /**
   * @route   DELETE /api/v1/disability-rehabilitation/:id/notes/:noteId
   * @desc    حذف ملاحظة
   */
  async deleteNote(req, res) {
    try {
      const result = await rehabilitationService.deleteNote(req.params.id, req.params.noteId);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in deleteNote:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({ success: false, message: 'حدث خطأ أثناء حذف الملاحظة', error: 'حدث خطأ داخلي' });
    }
  }

  /**
   * @route   POST /api/v1/disability-rehabilitation/:id/referrals
   * @desc    إضافة إحالة
   */
  async addReferral(req, res) {
    try {
      const result = await rehabilitationService.addReferral(req.params.id, req.body);
      return res.status(201).json(result);
    } catch (error) {
      logger.error('Error in addReferral:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({ success: false, message: 'حدث خطأ أثناء إضافة الإحالة', error: 'حدث خطأ داخلي' });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/:id/referrals/:referralId
   * @desc    تحديث حالة الإحالة
   */
  async updateReferral(req, res) {
    try {
      const result = await rehabilitationService.updateReferral(
        req.params.id,
        req.params.referralId,
        req.body
      );
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateReferral:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({ success: false, message: 'حدث خطأ أثناء تحديث الإحالة', error: 'حدث خطأ داخلي' });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/:id/transportation
   * @desc    تحديث معلومات النقل
   */
  async updateTransportation(req, res) {
    try {
      const result = await rehabilitationService.updateTransportation(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateTransportation:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({
          success: false,
          message: 'حدث خطأ أثناء تحديث بيانات النقل',
          error: 'حدث خطأ داخلي',
        });
    }
  }

  /**
   * @route   PUT /api/v1/disability-rehabilitation/:id/treatment-team
   * @desc    تحديث فريق العلاج
   */
  async updateTreatmentTeam(req, res) {
    try {
      const result = await rehabilitationService.updateTreatmentTeam(req.params.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in updateTreatmentTeam:', error);
      if (error.message?.includes('not found') || error.message?.includes('غير موجود'))
        return res.status(404).json({ success: false, message: safeError(error) });
      return res
        .status(500)
        .json({
          success: false,
          message: 'حدث خطأ أثناء تحديث فريق العلاج',
          error: 'حدث خطأ داخلي',
        });
    }
  }

  /**
   * @route   GET /api/v1/disability-rehabilitation/financial-summary
   * @desc    ملخص مالي شامل
   */
  async getFinancialSummary(req, res) {
    try {
      const result = await rehabilitationService.getFinancialSummary();
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error in getFinancialSummary:', error);
      return res
        .status(500)
        .json({
          success: false,
          message: 'حدث خطأ أثناء جلب الملخص المالي',
          error: 'حدث خطأ داخلي',
        });
    }
  }
}

module.exports = new DisabilityRehabilitationController();
