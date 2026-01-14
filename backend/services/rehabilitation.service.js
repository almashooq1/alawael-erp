/**
 * Rehabilitation Services - Advanced Implementation
 * خدمات التأهيل المتقدمة
 *
 * Comprehensive service for managing disability assessments,
 * rehabilitation programs, and therapeutic outcomes
 */

const DisabilityAssessment = require('../models/disability-assessment.model');
const RehabilitationProgram = require('../models/rehabilitation-program.model');

class RehabilitationService {
  // ==================== ASSESSMENT SERVICES ====================

  /**
   * Create new disability assessment
   */
  async createAssessment(assessmentData) {
    try {
      const assessment = new DisabilityAssessment(assessmentData);
      await assessment.save();
      return {
        success: true,
        message: 'تم إنشاء التقييم بنجاح',
        assessment_id: assessment._id,
        data: assessment,
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء التقييم: ${error.message}`);
    }
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(assessmentId) {
    try {
      const assessment = await DisabilityAssessment.findById(assessmentId);
      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }
      return assessment;
    } catch (error) {
      throw new Error(`خطأ في استرجاع التقييم: ${error.message}`);
    }
  }

  /**
   * Update assessment
   */
  async updateAssessment(assessmentId, updateData) {
    try {
      const assessment = await DisabilityAssessment.findByIdAndUpdate(assessmentId, updateData, { new: true, runValidators: true });
      if (!assessment) {
        throw new Error('التقييم غير موجود');
      }
      return {
        success: true,
        message: 'تم تحديث التقييم بنجاح',
        data: assessment,
      };
    } catch (error) {
      throw new Error(`خطأ في تحديث التقييم: ${error.message}`);
    }
  }

  /**
   * Get assessments by disability type
   */
  async getAssessmentsByType(disabilityType) {
    try {
      const assessments = await DisabilityAssessment.findByDisabilityType(disabilityType);
      return {
        success: true,
        count: assessments.length,
        data: assessments,
      };
    } catch (error) {
      throw new Error(`خطأ في استرجاع التقييمات: ${error.message}`);
    }
  }

  /**
   * Get assessment statistics
   */
  async getAssessmentStatistics() {
    try {
      const stats = await DisabilityAssessment.getAssessmentStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new Error(`خطأ في الحصول على الإحصائيات: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive assessment report
   */
  async generateAssessmentReport(assessmentId) {
    try {
      const assessment = await this.getAssessment(assessmentId);
      const report = assessment.generateAssessmentReport();
      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء التقرير: ${error.message}`);
    }
  }

  /**
   * Check rehabilitation readiness
   */
  async checkRehabilitationReadiness(assessmentId) {
    try {
      const assessment = await this.getAssessment(assessmentId);
      const isReady = assessment.isReadyForRehabilitation();
      const readiness = assessment.rehabilitation_readiness;

      return {
        success: true,
        is_ready: isReady,
        readiness_details: {
          motivation_score: readiness.motivation_score,
          cognitive_capacity: readiness.cognitive_capacity,
          physical_capacity: readiness.physical_capacity,
          family_support: readiness.family_support,
          resource_availability: readiness.resource_availability,
          overall_readiness: readiness.overall_readiness,
          readiness_status: isReady ? 'جاهز للتأهيل' : 'يحتاج إلى تحضيرات إضافية',
        },
      };
    } catch (error) {
      throw new Error(`خطأ في التحقق من الجاهزية: ${error.message}`);
    }
  }

  // ==================== REHABILITATION PROGRAM SERVICES ====================

  /**
   * Create rehabilitation program
   */
  async createRehabilitationProgram(programData) {
    try {
      // Check if assessment exists and is complete
      if (programData.assessment_reference_id) {
        const assessment = await DisabilityAssessment.findById(programData.assessment_reference_id);
        if (!assessment) {
          throw new Error('التقييم المرجعي غير موجود');
        }
      }

      const program = new RehabilitationProgram(programData);
      await program.save();

      return {
        success: true,
        message: 'تم إنشاء برنامج التأهيل بنجاح',
        program_id: program._id,
        data: program,
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء البرنامج: ${error.message}`);
    }
  }

  /**
   * Get rehabilitation program
   */
  async getRehabilitationProgram(programId) {
    try {
      const program = await RehabilitationProgram.findById(programId);
      if (!program) {
        throw new Error('البرنامج غير موجود');
      }
      return program;
    } catch (error) {
      throw new Error(`خطأ في استرجاع البرنامج: ${error.message}`);
    }
  }

  /**
   * Add therapy session to program
   */
  async addTherapySession(programId, sessionData) {
    try {
      const program = await this.getRehabilitationProgram(programId);

      // Validate session data
      if (!sessionData.session_date || !sessionData.therapist_id) {
        throw new Error('البيانات المطلوبة ناقصة');
      }

      sessionData.session_number = program.therapy_sessions.length + 1;
      await program.addTherapySession(sessionData);

      return {
        success: true,
        message: 'تمت إضافة جلسة العلاج بنجاح',
        session_number: sessionData.session_number,
        data: program,
      };
    } catch (error) {
      throw new Error(`خطأ في إضافة الجلسة: ${error.message}`);
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(programId, goalId, progressPercentage) {
    try {
      if (progressPercentage < 0 || progressPercentage > 100) {
        throw new Error('نسبة التقدم يجب أن تكون بين 0 و 100');
      }

      const program = await this.getRehabilitationProgram(programId);
      await program.updateGoalProgress(goalId, progressPercentage);

      return {
        success: true,
        message: 'تم تحديث تقدم الهدف بنجاح',
        data: program.getGoalProgress(),
      };
    } catch (error) {
      throw new Error(`خطأ في تحديث تقدم الهدف: ${error.message}`);
    }
  }

  /**
   * Generate progress report for program
   */
  async generateProgressReport(programId) {
    try {
      const program = await this.getRehabilitationProgram(programId);
      const report = program.generateProgressReport();

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      throw new Error(`خطأ في إنشاء تقرير التقدم: ${error.message}`);
    }
  }

  /**
   * Get program outcomes
   */
  async getProgramOutcomes(programId) {
    try {
      const outcomes = await RehabilitationProgram.getProgramOutcomes(programId);

      return {
        success: true,
        data: outcomes,
      };
    } catch (error) {
      throw new Error(`خطأ في استرجاع النتائج: ${error.message}`);
    }
  }

  /**
   * Discharge program
   */
  async dischargeProgram(programId, dischargeData) {
    try {
      const program = await this.getRehabilitationProgram(programId);

      program.program_status = 'discharged';
      program.program_duration.actual_discharge_date = new Date();
      program.discharge_reason = dischargeData.discharge_reason;
      program.discharge_summary = dischargeData.discharge_summary;
      program.follow_up_plan = dischargeData.follow_up_plan;

      // Calculate FIM gain if available
      if (dischargeData.discharge_fim) {
        program.functional_independence_gain.discharge_fim = dischargeData.discharge_fim;
        program.functional_independence_gain.fim_gain = dischargeData.discharge_fim - program.functional_independence_gain.baseline_fim;
      }

      await program.save();

      return {
        success: true,
        message: 'تم إنهاء البرنامج بنجاح',
        discharge_date: program.program_duration.actual_discharge_date,
        data: program,
      };
    } catch (error) {
      throw new Error(`خطأ في إنهاء البرنامج: ${error.message}`);
    }
  }

  /**
   * Get programs ready for discharge
   */
  async getProgramsReadyForDischarge() {
    try {
      const programs = await RehabilitationProgram.getProgramsReadyForDischarge();

      return {
        success: true,
        count: programs.length,
        data: programs,
      };
    } catch (error) {
      throw new Error(`خطأ في استرجاع البرامج: ${error.message}`);
    }
  }

  /**
   * Get active programs for beneficiary
   */
  async getActiveProgramsForBeneficiary(beneficiaryId) {
    try {
      const programs = await RehabilitationProgram.find({
        beneficiary_id: beneficiaryId,
        program_status: 'active',
      });

      return {
        success: true,
        count: programs.length,
        data: programs,
      };
    } catch (error) {
      throw new Error(`خطأ في استرجاع البرامج: ${error.message}`);
    }
  }

  // ==================== ANALYTICS AND REPORTING ====================

  /**
   * Get rehabilitation statistics
   */
  async getRehabilitationStatistics() {
    try {
      const activeCount = await RehabilitationProgram.countDocuments({ program_status: 'active' });
      const dischargedCount = await RehabilitationProgram.countDocuments({ program_status: 'discharged' });
      const completedCount = await RehabilitationProgram.countDocuments({ program_status: 'completed' });

      const disabilityStats = await RehabilitationProgram.getDisabilityTypeStatistics();

      const readyForRehabCount = await DisabilityAssessment.getReadyForRehabilitationCount();

      return {
        success: true,
        data: {
          active_programs: activeCount,
          discharged_programs: dischargedCount,
          completed_programs: completedCount,
          total_programs: activeCount + dischargedCount + completedCount,
          ready_for_rehabilitation: readyForRehabCount,
          by_disability_type: disabilityStats,
        },
      };
    } catch (error) {
      throw new Error(`خطأ في الحصول على الإحصائيات: ${error.message}`);
    }
  }

  /**
   * Get program effectiveness metrics
   */
  async getProgramEffectivenessMetrics(programId) {
    try {
      const program = await this.getRehabilitationProgram(programId);

      const goalProgress = program.getGoalProgress();
      const fimGain = program.calculateFIMGain();
      const complianceRate = program.calculateComplianceRate();

      return {
        success: true,
        data: {
          goal_achievement_rate: (goalProgress.goals_achieved / goalProgress.total_goals) * 100,
          overall_progress_percentage: goalProgress.overall_progress,
          fim_gain: fimGain,
          compliance_rate: complianceRate,
          client_satisfaction: program.client_satisfaction?.satisfaction_score,
          adverse_events: program.quality_indicators?.adverse_events_count || 0,
          duration_weeks: Math.ceil((new Date() - program.program_duration.enrollment_date) / (1000 * 60 * 60 * 24 * 7)),
        },
      };
    } catch (error) {
      throw new Error(`خطأ في حساب المقاييس: ${error.message}`);
    }
  }

  /**
   * Get therapy session details
   */
  async getTherapySessionDetails(programId, sessionNumber) {
    try {
      const program = await this.getRehabilitationProgram(programId);
      const session = program.therapy_sessions.find(s => s.session_number === sessionNumber);

      if (!session) {
        throw new Error('الجلسة غير موجودة');
      }

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      throw new Error(`خطأ في استرجاع تفاصيل الجلسة: ${error.message}`);
    }
  }

  /**
   * Generate outcome measurement comparison
   */
  async compareOutcomeMeasures(programId) {
    try {
      const program = await this.getRehabilitationProgram(programId);
      const outcome = program.outcome_measures;

      if (!outcome.baseline_measures || !outcome.discharge_measures) {
        throw new Error('البيانات الأساسية أو النهائية غير متوفرة');
      }

      const comparison = {
        success: true,
        data: {
          baseline: outcome.baseline_measures,
          discharge: outcome.discharge_measures,
          improvements: outcome.discharge_measures.map((discharge, idx) => {
            const baseline = outcome.baseline_measures[idx];
            return {
              measure: discharge.measure_type,
              baseline_score: baseline?.current_score,
              discharge_score: discharge.current_score,
              improvement: discharge.current_score - baseline?.current_score,
              improvement_percentage: (((discharge.current_score - baseline?.current_score) / baseline?.current_score) * 100).toFixed(2),
              clinically_significant: discharge.minimal_clinically_important_difference,
            };
          }),
        },
      };

      return comparison;
    } catch (error) {
      throw new Error(`خطأ في المقارنة: ${error.message}`);
    }
  }

  /**
   * Get therapist caseload
   */
  async getTherapistCaseload(therapistId) {
    try {
      const programs = await RehabilitationProgram.find({
        'team_members.team_member_id': therapistId,
        program_status: 'active',
      });

      return {
        success: true,
        caseload_size: programs.length,
        programs: programs.map(p => ({
          program_id: p._id,
          program_code: p.program_code,
          beneficiary_name: p.beneficiary_name,
          enrollment_date: p.program_duration.enrollment_date,
        })),
      };
    } catch (error) {
      throw new Error(`خطأ في استرجاع حالات المعالج: ${error.message}`);
    }
  }

  /**
   * Search assessments and programs
   */
  async searchRehabilitationData(searchParams) {
    try {
      const { keyword, disability_type, program_status, date_from, date_to } = searchParams;

      let assessmentFilter = {};
      let programFilter = {};

      if (keyword) {
        assessmentFilter.beneficiary_name = { $regex: keyword, $options: 'i' };
        programFilter.beneficiary_name = { $regex: keyword, $options: 'i' };
      }

      if (disability_type) {
        assessmentFilter['disability_profile.type'] = disability_type;
        programFilter.disability_type = disability_type;
      }

      if (program_status) {
        programFilter.program_status = program_status;
      }

      if (date_from || date_to) {
        const dateFilter = {};
        if (date_from) dateFilter.$gte = new Date(date_from);
        if (date_to) dateFilter.$lte = new Date(date_to);

        assessmentFilter.createdAt = dateFilter;
        programFilter.createdAt = dateFilter;
      }

      const assessments = await DisabilityAssessment.find(assessmentFilter).limit(50);
      const programs = await RehabilitationProgram.find(programFilter).limit(50);

      return {
        success: true,
        assessments_count: assessments.length,
        programs_count: programs.length,
        assessments,
        programs,
      };
    } catch (error) {
      throw new Error(`خطأ في البحث: ${error.message}`);
    }
  }
}

module.exports = new RehabilitationService();
