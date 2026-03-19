/**
 * Community Integration Controller — تحكم الدمج المجتمعي
 *
 * Handles HTTP requests for community activities, civil partnerships,
 * event participation, integration assessments, and awareness programs.
 */

const service = require('../services/communityIntegration.service');
const { sendSuccess, sendError } = require('../utils/responseHelpers');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// COMMUNITY ACTIVITIES — الأنشطة المجتمعية
// ═══════════════════════════════════════════════════════════════════════════════

exports.createActivity = async (req, res) => {
  try {
    const activity = await service.createActivity(req.body, req.user?.id || req.user?._id);
    return sendSuccess(res, activity, 'تم إنشاء النشاط المجتمعي بنجاح', 201);
  } catch (error) {
    logger.error('Error creating community activity:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء إنشاء النشاط', 500);
  }
};

exports.getActivities = async (req, res) => {
  try {
    const result = await service.getActivities(req.query);
    return sendSuccess(res, result, 'تم جلب الأنشطة بنجاح');
  } catch (error) {
    logger.error('Error fetching activities:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الأنشطة', 500);
  }
};

exports.getActivityById = async (req, res) => {
  try {
    const activity = await service.getActivityById(req.params.id);
    if (!activity) return sendError(res, 'النشاط غير موجود', 404);
    return sendSuccess(res, activity, 'تم جلب النشاط بنجاح');
  } catch (error) {
    logger.error('Error fetching activity:', error);
    return sendError(res, 'حدث خطأ أثناء جلب النشاط', 500);
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const activity = await service.updateActivity(
      req.params.id,
      req.body,
      req.user?.id || req.user?._id
    );
    if (!activity) return sendError(res, 'النشاط غير موجود', 404);
    return sendSuccess(res, activity, 'تم تحديث النشاط بنجاح');
  } catch (error) {
    logger.error('Error updating activity:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء تحديث النشاط', 500);
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const activity = await service.deleteActivity(req.params.id);
    if (!activity) return sendError(res, 'النشاط غير موجود', 404);
    return sendSuccess(res, null, 'تم حذف النشاط بنجاح');
  } catch (error) {
    logger.error('Error deleting activity:', error);
    return sendError(res, 'حدث خطأ أثناء حذف النشاط', 500);
  }
};

exports.getActivityStats = async (req, res) => {
  try {
    const stats = await service.getActivityStats();
    return sendSuccess(res, stats, 'تم جلب إحصائيات الأنشطة بنجاح');
  } catch (error) {
    logger.error('Error fetching activity stats:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الإحصائيات', 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CIVIL PARTNERSHIPS — الشراكات
// ═══════════════════════════════════════════════════════════════════════════════

exports.createPartnership = async (req, res) => {
  try {
    const partnership = await service.createPartnership(req.body, req.user?.id || req.user?._id);
    return sendSuccess(res, partnership, 'تم إنشاء الشراكة بنجاح', 201);
  } catch (error) {
    logger.error('Error creating partnership:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء إنشاء الشراكة', 500);
  }
};

exports.getPartnerships = async (req, res) => {
  try {
    const result = await service.getPartnerships(req.query);
    return sendSuccess(res, result, 'تم جلب الشراكات بنجاح');
  } catch (error) {
    logger.error('Error fetching partnerships:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الشراكات', 500);
  }
};

exports.getPartnershipById = async (req, res) => {
  try {
    const partnership = await service.getPartnershipById(req.params.id);
    if (!partnership) return sendError(res, 'الشراكة غير موجودة', 404);
    return sendSuccess(res, partnership, 'تم جلب الشراكة بنجاح');
  } catch (error) {
    logger.error('Error fetching partnership:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الشراكة', 500);
  }
};

exports.updatePartnership = async (req, res) => {
  try {
    const partnership = await service.updatePartnership(
      req.params.id,
      req.body,
      req.user?.id || req.user?._id
    );
    if (!partnership) return sendError(res, 'الشراكة غير موجودة', 404);
    return sendSuccess(res, partnership, 'تم تحديث الشراكة بنجاح');
  } catch (error) {
    logger.error('Error updating partnership:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء تحديث الشراكة', 500);
  }
};

exports.deletePartnership = async (req, res) => {
  try {
    const partnership = await service.deletePartnership(req.params.id);
    if (!partnership) return sendError(res, 'الشراكة غير موجودة', 404);
    return sendSuccess(res, null, 'تم حذف الشراكة بنجاح');
  } catch (error) {
    logger.error('Error deleting partnership:', error);
    return sendError(res, 'حدث خطأ أثناء حذف الشراكة', 500);
  }
};

exports.getPartnershipStats = async (req, res) => {
  try {
    const stats = await service.getPartnershipStats();
    return sendSuccess(res, stats, 'تم جلب إحصائيات الشراكات بنجاح');
  } catch (error) {
    logger.error('Error fetching partnership stats:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الإحصائيات', 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PARTICIPATION — تتبع المشاركة
// ═══════════════════════════════════════════════════════════════════════════════

exports.registerParticipation = async (req, res) => {
  try {
    const participation = await service.registerParticipation(
      req.body,
      req.user?.id || req.user?._id
    );
    return sendSuccess(res, participation, 'تم تسجيل المشاركة بنجاح', 201);
  } catch (error) {
    logger.error('Error registering participation:', error);
    if (error.code === 11000) {
      return sendError(res, 'المستفيد مسجل مسبقاً في هذا النشاط', 409);
    }
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء تسجيل المشاركة', 500);
  }
};

exports.getParticipations = async (req, res) => {
  try {
    const result = await service.getParticipations(req.query);
    return sendSuccess(res, result, 'تم جلب المشاركات بنجاح');
  } catch (error) {
    logger.error('Error fetching participations:', error);
    return sendError(res, 'حدث خطأ أثناء جلب المشاركات', 500);
  }
};

exports.getParticipationById = async (req, res) => {
  try {
    const participation = await service.getParticipationById(req.params.id);
    if (!participation) return sendError(res, 'المشاركة غير موجودة', 404);
    return sendSuccess(res, participation, 'تم جلب المشاركة بنجاح');
  } catch (error) {
    logger.error('Error fetching participation:', error);
    return sendError(res, 'حدث خطأ أثناء جلب المشاركة', 500);
  }
};

exports.updateParticipation = async (req, res) => {
  try {
    const participation = await service.updateParticipation(
      req.params.id,
      req.body,
      req.user?.id || req.user?._id
    );
    if (!participation) return sendError(res, 'المشاركة غير موجودة', 404);
    return sendSuccess(res, participation, 'تم تحديث المشاركة بنجاح');
  } catch (error) {
    logger.error('Error updating participation:', error);
    return sendError(res, 'حدث خطأ أثناء تحديث المشاركة', 500);
  }
};

exports.recordAttendance = async (req, res) => {
  try {
    const participation = await service.recordAttendance(req.params.id, req.body);
    if (!participation) return sendError(res, 'المشاركة غير موجودة', 404);
    return sendSuccess(res, participation, 'تم تسجيل الحضور بنجاح');
  } catch (error) {
    logger.error('Error recording attendance:', error);
    return sendError(res, 'حدث خطأ أثناء تسجيل الحضور', 500);
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { feedbackType, ...feedbackData } = req.body;
    const participation = await service.submitFeedback(req.params.id, feedbackData, feedbackType);
    if (!participation) return sendError(res, 'المشاركة غير موجودة', 404);
    return sendSuccess(res, participation, 'تم إرسال التقييم بنجاح');
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    return sendError(res, 'حدث خطأ أثناء إرسال التقييم', 500);
  }
};

exports.getParticipationStats = async (req, res) => {
  try {
    const stats = await service.getParticipationStats(req.query.activityId);
    return sendSuccess(res, stats, 'تم جلب إحصائيات المشاركة بنجاح');
  } catch (error) {
    logger.error('Error fetching participation stats:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الإحصائيات', 500);
  }
};

exports.getBeneficiaryHistory = async (req, res) => {
  try {
    const history = await service.getBeneficiaryHistory(req.params.beneficiaryId);
    return sendSuccess(res, history, 'تم جلب سجل مشاركات المستفيد بنجاح');
  } catch (error) {
    logger.error('Error fetching beneficiary history:', error);
    return sendError(res, 'حدث خطأ أثناء جلب السجل', 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION ASSESSMENTS — قياس الاندماج
// ═══════════════════════════════════════════════════════════════════════════════

exports.createAssessment = async (req, res) => {
  try {
    const assessment = await service.createAssessment(req.body, req.user?.id || req.user?._id);
    return sendSuccess(res, assessment, 'تم إنشاء تقييم الاندماج بنجاح', 201);
  } catch (error) {
    logger.error('Error creating assessment:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء إنشاء التقييم', 500);
  }
};

exports.getAssessments = async (req, res) => {
  try {
    const result = await service.getAssessments(req.query);
    return sendSuccess(res, result, 'تم جلب التقييمات بنجاح');
  } catch (error) {
    logger.error('Error fetching assessments:', error);
    return sendError(res, 'حدث خطأ أثناء جلب التقييمات', 500);
  }
};

exports.getAssessmentById = async (req, res) => {
  try {
    const assessment = await service.getAssessmentById(req.params.id);
    if (!assessment) return sendError(res, 'التقييم غير موجود', 404);
    return sendSuccess(res, assessment, 'تم جلب التقييم بنجاح');
  } catch (error) {
    logger.error('Error fetching assessment:', error);
    return sendError(res, 'حدث خطأ أثناء جلب التقييم', 500);
  }
};

exports.updateAssessment = async (req, res) => {
  try {
    const assessment = await service.updateAssessment(
      req.params.id,
      req.body,
      req.user?.id || req.user?._id
    );
    if (!assessment) return sendError(res, 'التقييم غير موجود', 404);
    return sendSuccess(res, assessment, 'تم تحديث التقييم بنجاح');
  } catch (error) {
    logger.error('Error updating assessment:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء تحديث التقييم', 500);
  }
};

exports.deleteAssessment = async (req, res) => {
  try {
    const assessment = await service.deleteAssessment(req.params.id);
    if (!assessment) return sendError(res, 'التقييم غير موجود', 404);
    return sendSuccess(res, null, 'تم حذف التقييم بنجاح');
  } catch (error) {
    logger.error('Error deleting assessment:', error);
    return sendError(res, 'حدث خطأ أثناء حذف التقييم', 500);
  }
};

exports.getIntegrationProgress = async (req, res) => {
  try {
    const progress = await service.getIntegrationProgress(req.params.beneficiaryId);
    return sendSuccess(res, progress, 'تم جلب تقدم الاندماج بنجاح');
  } catch (error) {
    logger.error('Error fetching integration progress:', error);
    return sendError(res, 'حدث خطأ أثناء جلب تقدم الاندماج', 500);
  }
};

exports.getAssessmentStats = async (req, res) => {
  try {
    const stats = await service.getAssessmentStats();
    return sendSuccess(res, stats, 'تم جلب إحصائيات التقييمات بنجاح');
  } catch (error) {
    logger.error('Error fetching assessment stats:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الإحصائيات', 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AWARENESS PROGRAMS — برامج التوعية
// ═══════════════════════════════════════════════════════════════════════════════

exports.createAwarenessProgram = async (req, res) => {
  try {
    const program = await service.createAwarenessProgram(req.body, req.user?.id || req.user?._id);
    return sendSuccess(res, program, 'تم إنشاء برنامج التوعية بنجاح', 201);
  } catch (error) {
    logger.error('Error creating awareness program:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء إنشاء البرنامج', 500);
  }
};

exports.getAwarenessPrograms = async (req, res) => {
  try {
    const result = await service.getAwarenessPrograms(req.query);
    return sendSuccess(res, result, 'تم جلب برامج التوعية بنجاح');
  } catch (error) {
    logger.error('Error fetching awareness programs:', error);
    return sendError(res, 'حدث خطأ أثناء جلب البرامج', 500);
  }
};

exports.getAwarenessProgramById = async (req, res) => {
  try {
    const program = await service.getAwarenessProgramById(req.params.id);
    if (!program) return sendError(res, 'البرنامج غير موجود', 404);
    return sendSuccess(res, program, 'تم جلب البرنامج بنجاح');
  } catch (error) {
    logger.error('Error fetching awareness program:', error);
    return sendError(res, 'حدث خطأ أثناء جلب البرنامج', 500);
  }
};

exports.updateAwarenessProgram = async (req, res) => {
  try {
    const program = await service.updateAwarenessProgram(
      req.params.id,
      req.body,
      req.user?.id || req.user?._id
    );
    if (!program) return sendError(res, 'البرنامج غير موجود', 404);
    return sendSuccess(res, program, 'تم تحديث البرنامج بنجاح');
  } catch (error) {
    logger.error('Error updating awareness program:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'حدث خطأ أثناء تحديث البرنامج', 500);
  }
};

exports.deleteAwarenessProgram = async (req, res) => {
  try {
    const program = await service.deleteAwarenessProgram(req.params.id);
    if (!program) return sendError(res, 'البرنامج غير موجود', 404);
    return sendSuccess(res, null, 'تم حذف البرنامج بنجاح');
  } catch (error) {
    logger.error('Error deleting awareness program:', error);
    return sendError(res, 'حدث خطأ أثناء حذف البرنامج', 500);
  }
};

exports.addWorkshop = async (req, res) => {
  try {
    const program = await service.addWorkshop(req.params.id, req.body);
    if (!program) return sendError(res, 'البرنامج غير موجود', 404);
    return sendSuccess(res, program, 'تم إضافة ورشة العمل بنجاح', 201);
  } catch (error) {
    logger.error('Error adding workshop:', error);
    return sendError(res, 'حدث خطأ أثناء إضافة الورشة', 500);
  }
};

exports.addMaterial = async (req, res) => {
  try {
    const program = await service.addMaterial(req.params.id, req.body);
    if (!program) return sendError(res, 'البرنامج غير موجود', 404);
    return sendSuccess(res, program, 'تم إضافة المادة التوعوية بنجاح', 201);
  } catch (error) {
    logger.error('Error adding material:', error);
    return sendError(res, 'حدث خطأ أثناء إضافة المادة', 500);
  }
};

exports.getAwarenessProgramStats = async (req, res) => {
  try {
    const stats = await service.getAwarenessProgramStats();
    return sendSuccess(res, stats, 'تم جلب إحصائيات برامج التوعية بنجاح');
  } catch (error) {
    logger.error('Error fetching awareness program stats:', error);
    return sendError(res, 'حدث خطأ أثناء جلب الإحصائيات', 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة المتابعة الشاملة
// ═══════════════════════════════════════════════════════════════════════════════

exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await service.getCommunityIntegrationDashboard();
    return sendSuccess(res, dashboard, 'تم جلب لوحة المتابعة بنجاح');
  } catch (error) {
    logger.error('Error fetching community integration dashboard:', error);
    return sendError(res, 'حدث خطأ أثناء جلب لوحة المتابعة', 500);
  }
};
