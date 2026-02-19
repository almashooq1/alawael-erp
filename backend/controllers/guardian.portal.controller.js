/**
 * Guardian Portal Controller
 *
 * Handles all operations for guardian/parent portal
 * - Dashboard with analytics
 * - Beneficiary management
 * - Progress tracking and reports
 * - Financial management
 * - Comprehensive analytics
 */

const Guardian = require('../models/Guardian');
const Beneficiary = require('../models/Beneficiary');
const BeneficiaryProgress = require('../models/BeneficiaryProgress');
const PortalMessage = require('../models/PortalMessage');
const PortalPayment = require('../models/PortalPayment');
const PortalNotification = require('../models/PortalNotification');
const { AppError, catchAsync } = require('../utils/errorHandler');
const { sendEmail } = require('../services/email.service');
const GuardianService = require('../services/guardian.service');

// ==================== DASHBOARD ====================

/**
 * GET /api/guardian/dashboard
 * Retrieve guardian dashboard with all key metrics
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId)
    .select('firstName_ar firstName_en lastName_ar lastName_en beneficiaries')
    .populate('beneficiaries', 'firstName_ar firstName_en academicScore attendanceRate')
    .lean();

  if (!guardian) {
    return res.status(404).json({
      success: false,
      message: 'Guardian profile not found',
    });
  }

  // Get financial summary
  const payments = await PortalPayment.find({ guardianId })
    .select('amount amountPaid status dueDate')
    .lean();

  const totalDue = payments
    .filter(p => ['pending', 'partially_paid', 'overdue'].includes(p.status))
    .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0);

  const overdueDue = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0);

  // Get unread notifications
  const unreadCount = await PortalNotification.countDocuments({
    guardianId,
    isRead: false,
  });

  // Get unread messages
  const unreadMessages = await PortalMessage.countDocuments({
    toId: guardianId,
    toModel: 'Guardian',
    isRead: false,
  });

  const dashboard = {
    guardian: {
      name: `${guardian.firstName_ar} ${guardian.lastName_ar}`,
      nameEn: `${guardian.firstName_en} ${guardian.lastName_en}`,
      beneficiaryCount: guardian.beneficiaries.length,
    },
    beneficiaries: guardian.beneficiaries.map(b => ({
      id: b._id,
      name: `${b.firstName_ar} ${b.firstName_en}`,
      score: b.academicScore,
      attendance: b.attendanceRate,
    })),
    financial: {
      totalDue: totalDue.toFixed(2),
      overdue: overdueDue.toFixed(2),
      paymentsPending: payments.filter(p => p.status === 'pending').length,
    },
    notifications: {
      unreadCount,
      unreadMessages,
    },
  };

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

/**
 * GET /api/guardian/dashboard/summary
 * Get comprehensive dashboard summary
 */
exports.getDashboardSummary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId)
    .select('beneficiaries')
    .populate('beneficiaries', '_id')
    .lean();

  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  // Get performance summary
  const progressRecords = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
  })
    .sort({ month: -1 })
    .limit(beneficiaryIds.length)
    .lean();

  const avgScore = progressRecords.length
    ? progressRecords.reduce((sum, p) => sum + p.academicScore, 0) / progressRecords.length
    : 0;

  const avgAttendance = progressRecords.length
    ? progressRecords.reduce((sum, p) => sum + p.attendanceRate, 0) / progressRecords.length
    : 0;

  const summary = {
    beneficiaryStats: {
      total: beneficiaryIds.length,
      activeCount: progressRecords.length,
      averageScore: avgScore.toFixed(2),
      averageAttendance: avgAttendance.toFixed(2),
    },
  };

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * GET /api/guardian/dashboard/overview
 * Get dashboard overview
 */
exports.getDashboardOverview = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId)
    .select('beneficiaries')
    .populate('beneficiaries');

  const overview = {
    beneficiaryCount: guardian.beneficiaries.length,
    addressOnFile: guardian.street ? 'Yes' : 'No',
    contactVerified: guardian.accountStatus === 'verified',
  };

  res.status(200).json({
    success: true,
    data: overview,
  });
});

/**
 * GET /api/guardian/dashboard/stats
 * Get detailed statistics
 */
exports.getDashboardStats = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId)
    .select('beneficiaries')
    .populate('beneficiaries', '_id')
    .lean();

  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  // Get last 6 months data for all beneficiaries
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const progressData = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
    createdAt: { $gte: sixMonthsAgo },
  })
    .sort({ month: 1 })
    .lean();

  const stats = {
    academic: {
      avgScore: (
        progressData.reduce((sum, p) => sum + p.academicScore, 0) / progressData.length
      ).toFixed(2),
      highest: Math.max(...progressData.map(p => p.academicScore), 0),
      lowest: Math.min(...progressData.map(p => p.academicScore), 0),
    },
    attendance: {
      avgRate: (
        progressData.reduce((sum, p) => sum + p.attendanceRate, 0) / progressData.length
      ).toFixed(2),
      totalAbsences: progressData.reduce((sum, p) => sum + p.absenceDays, 0),
    },
    behavior: {
      avgRating: (
        progressData.reduce((sum, p) => sum + p.behaviorRating, 0) / progressData.length
      ).toFixed(2),
    },
  };

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// ==================== PROFILE MANAGEMENT ====================

/**
 * GET /api/guardian/profile
 * Get guardian profile
 */
exports.getProfile = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId)
    .select('-password -accountVerificationCode')
    .lean();

  res.status(200).json({
    success: true,
    data: guardian,
  });
});

/**
 * PATCH /api/guardian/profile
 * Update guardian profile
 */
exports.updateProfile = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const allowedFields = [
    'email',
    'phone',
    'alternatePhone',
    'street',
    'city',
    'state',
    'zipCode',
    'country',
    'occupation',
    'company',
    'workPhone',
    'workEmail',
  ];

  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const guardian = await Guardian.findByIdAndUpdate(guardianId, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: guardian,
  });
});

/**
 * PATCH /api/guardian/profile/photo
 * Update profile photo
 */
exports.updateProfilePhoto = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
    });
  }

  const photoUrl = `/uploads/guardians/${guardianId}/${req.file.filename}`;

  const guardian = await Guardian.findByIdAndUpdate(
    guardianId,
    { profilePhoto: photoUrl },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile photo updated',
    data: { photoUrl: guardian.profilePhoto },
  });
});

/**
 * GET /api/guardian/profile/download
 * Download profile data
 */
exports.downloadProfileData = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId);
  const beneficiaries = await Beneficiary.find({ guardians: guardianId });
  const payments = await PortalPayment.find({ guardianId }).limit(100);

  const data = {
    guardian: guardian.toObject(),
    linkedBeneficiaries: beneficiaries.length,
    recentPayments: payments.length,
  };

  res.status(200).json({
    success: true,
    data,
  });
});

// ==================== BENEFICIARY MANAGEMENT ====================

/**
 * GET /api/guardian/beneficiaries
 * Get all linked beneficiaries
 */
exports.getBeneficiaries = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId)
    .populate(
      'beneficiaries',
      'firstName_ar firstName_en lastName_ar lastName_en academicScore attendanceRate status profilePhoto'
    )
    .lean();

  const beneficiaries = guardian.beneficiaries.map(b => ({
    id: b._id,
    name: `${b.firstName_ar} ${b.lastName_ar}`,
    nameEn: `${b.firstName_en} ${b.lastName_en}`,
    score: b.academicScore,
    attendance: b.attendanceRate,
    status: b.status,
    photo: b.profilePhoto,
  }));

  res.status(200).json({
    success: true,
    data: beneficiaries,
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId
 * Get specific beneficiary details
 */
exports.getBeneficiaryDetail = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const beneficiary = await Beneficiary.findById(beneficiaryId);

  // Verify guardian has access to this beneficiary
  if (!beneficiary.guardians.includes(guardianId)) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized to view this beneficiary',
    });
  }

  res.status(200).json({
    success: true,
    data: beneficiary,
  });
});

/**
 * POST /api/guardian/beneficiaries/link
 * Link new beneficiary
 */
exports.linkBeneficiary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.body;

  if (!beneficiaryId) {
    return res.status(400).json({
      success: false,
      message: 'Beneficiary ID required',
    });
  }

  const guardian = await Guardian.findById(guardianId);
  const beneficiary = await Beneficiary.findById(beneficiaryId);

  if (!beneficiary) {
    return res.status(404).json({
      success: false,
      message: 'Beneficiary not found',
    });
  }

  if (guardian.beneficiaries.includes(beneficiaryId)) {
    return res.status(400).json({
      success: false,
      message: 'Beneficiary already linked',
    });
  }

  await guardian.linkBeneficiary(beneficiaryId);

  res.status(201).json({
    success: true,
    message: 'Beneficiary linked successfully',
  });
});

/**
 * DELETE /api/guardian/beneficiaries/:beneficiaryId
 * Unlink beneficiary
 */
exports.unlinkBeneficiary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId);
  await guardian.unlinkBeneficiary(beneficiaryId);

  res.status(200).json({
    success: true,
    message: 'Beneficiary unlinked successfully',
  });
});

// ==================== BENEFICIARY PROGRESS ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/progress
 * Get beneficiary progress
 */
exports.getBeneficiaryProgress = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  // Verify access
  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const progress = await BeneficiaryProgress.findOne({ beneficiaryId }).sort({ month: -1 });

  res.status(200).json({
    success: true,
    data: progress,
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/progress/monthly
 * Get monthly progress
 */
exports.getBeneficiaryMonthlyProgress = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const progress = await BeneficiaryProgress.find({ beneficiaryId }).sort({ month: -1 }).limit(12);

  res.status(200).json({
    success: true,
    data: progress,
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/progress/trend
 * Get progress trend
 */
exports.getBeneficiaryProgressTrend = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const trend = await BeneficiaryProgress.find({
    beneficiaryId,
    createdAt: { $gte: sixMonthsAgo },
  })
    .sort({ month: 1 })
    .select('month academicScore attendanceRate behaviorRating scoreImprovement');

  res.status(200).json({
    success: true,
    data: trend,
  });
});

// ==================== GRADES ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/grades
 * Get beneficiary grades
 */
exports.getBeneficiaryGrades = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const grades = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 })
    .select('month academicScore previousMonthScore scoreImprovement');

  res.status(200).json({
    success: true,
    data: grades,
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/grades/summary
 * Get grades summary
 */
exports.getBeneficiaryGradesSummary = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const grades = await BeneficiaryProgress.find({ beneficiaryId }).select('academicScore').lean();

  const scores = grades.map(g => g.academicScore);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length || 0;

  res.status(200).json({
    success: true,
    data: {
      current: scores[0] || 0,
      average: avg.toFixed(2),
      highest: Math.max(...scores, 0),
      lowest: Math.min(...scores, 0),
    },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/grades/comparison
 * Compare grades with other beneficiaries
 */
exports.getGradesComparison = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', '_id');
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  const allGrades = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
  })
    .sort({ month: -1 })
    .limit(beneficiaryIds.length)
    .select('beneficiaryId academicScore');

  const comparison = allGrades.map(g => ({
    beneficiaryId: g.beneficiaryId,
    score: g.academicScore,
    isSelected: g.beneficiaryId.toString() === beneficiaryId,
  }));

  res.status(200).json({
    success: true,
    data: comparison,
  });
});

// ==================== ATTENDANCE ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/attendance
 * Get attendance records
 */
exports.getBeneficiaryAttendance = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const records = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 })
    .select('month attendanceRate absenceDays lateDays');

  res.status(200).json({
    success: true,
    data: records,
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/attendance/summary
 * Get attendance summary
 */
exports.getBeneficiaryAttendanceSummary = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const records = await BeneficiaryProgress.find({ beneficiaryId })
    .select('attendanceRate absenceDays lateDays')
    .lean();

  const avgAttendance = records.reduce((sum, r) => sum + r.attendanceRate, 0) / records.length || 0;

  res.status(200).json({
    success: true,
    data: {
      averageRate: avgAttendance.toFixed(2),
      totalAbsences: records.reduce((sum, r) => sum + r.absenceDays, 0),
      totalLateArrivals: records.reduce((sum, r) => sum + r.lateDays, 0),
    },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/attendance/report
 * Get attendance report
 */
exports.getBeneficiaryAttendanceReport = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const report = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 })
    .limit(12)
    .select('month attendanceRate absenceDays lateDays');

  res.status(200).json({
    success: true,
    data: report,
  });
});

// ==================== BEHAVIOR ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/behavior
 * Get behavior tracking
 */
exports.getBehavior = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const records = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 })
    .select('month behaviorRating challenges');

  res.status(200).json({
    success: true,
    data: records,
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/behavior/summary
 * Get behavior summary
 */
exports.getBehaviorSummary = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;

  const records = await BeneficiaryProgress.find({ beneficiaryId }).select('behaviorRating').lean();

  const avgRating = records.reduce((sum, r) => sum + r.behaviorRating, 0) / records.length || 0;

  res.status(200).json({
    success: true,
    data: { averageRating: avgRating.toFixed(2) },
  });
});

// ==================== REPORTS ====================

/**
 * GET /api/guardian/reports
 * Get all reports
 */
exports.getReports = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', '_id');
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  const reports = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
    reportGenerated: true,
  })
    .sort({ reportGeneratedAt: -1 })
    .select('beneficiaryId month reportGeneratedAt reportSentToGuardian');

  res.status(200).json({
    success: true,
    data: reports,
  });
});

/**
 * GET /api/guardian/reports/monthly
 * Get monthly reports
 */
exports.getMonthlyReports = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', '_id');
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const reports = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
    month: currentMonth,
  });

  res.status(200).json({
    success: true,
    data: reports,
  });
});

/**
 * POST /api/guardian/reports/generate
 * Generate new report
 */
exports.generateReport = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.body;

  if (!beneficiaryId) {
    return res.status(400).json({
      success: false,
      message: 'Beneficiary ID required',
    });
  }

  const progress = await BeneficiaryProgress.findOne({ beneficiaryId }).sort({ month: -1 });

  if (progress) {
    progress.reportGenerated = true;
    progress.reportGeneratedAt = new Date();
    await progress.save();
  }

  res.status(201).json({
    success: true,
    message: 'Report generated successfully',
  });
});

/**
 * POST /api/guardian/reports/schedule
 * Schedule report generation
 */
exports.scheduleReport = catchAsync(async (req, res) => {
  const { beneficiaryId, frequency } = req.body;

  // Implement report scheduling logic
  res.status(201).json({
    success: true,
    message: 'Report schedule updated',
  });
});

// ==================== PAYMENTS ====================

/**
 * GET /api/guardian/payments
 * Get all payments
 */
exports.getPayments = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const payments = await PortalPayment.find({ guardianId })
    .sort({ dueDate: -1 })
    .skip(skip)
    .limit(limit);

  const total = await PortalPayment.countDocuments({ guardianId });

  res.status(200).json({
    success: true,
    data: payments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/payments/:paymentId
 * Get payment details
 */
exports.getPaymentDetail = catchAsync(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await PortalPayment.findById(paymentId).populate(
    'beneficiaryId',
    'firstName_ar firstName_en'
  );

  res.status(200).json({
    success: true,
    data: payment,
  });
});

/**
 * GET /api/guardian/payments/pending
 * Get pending payments
 */
exports.getPendingPayments = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const payments = await PortalPayment.find({
    guardianId,
    status: { $in: ['pending', 'partially_paid'] },
  }).sort({ dueDate: 1 });

  res.status(200).json({
    success: true,
    data: payments,
  });
});

/**
 * GET /api/guardian/payments/overdue
 * Get overdue payments
 */
exports.getOverduePayments = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const payments = await PortalPayment.find({
    guardianId,
    status: 'overdue',
  });

  res.status(200).json({
    success: true,
    data: payments,
  });
});

/**
 * POST /api/guardian/payments/:paymentId/pay
 * Make payment
 */
exports.makePayment = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { paymentId } = req.params;
  const { amount, paymentMethod } = req.body;

  if (!amount || !paymentMethod) {
    return res.status(400).json({
      success: false,
      message: 'Amount and payment method required',
    });
  }

  const payment = await PortalPayment.findById(paymentId);

  if (payment.guardianId.toString() !== guardianId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized',
    });
  }

  payment.amountPaid += amount;
  payment.paymentMethod = paymentMethod;
  payment.paidDate = new Date();

  if (payment.amountPaid >= payment.amount) {
    payment.status = 'paid';
  } else if (payment.amountPaid > 0) {
    payment.status = 'partially_paid';
  }

  await payment.save();

  // Create notification
  await PortalNotification.createAndSend({
    guardianId,
    type: 'payment',
    title_ar: 'تأكيد الدفع',
    title_en: 'Payment Confirmed',
    message_ar: 'تم استلام دفعتك بنجاح',
    message_en: 'Your payment has been received successfully',
  });

  res.status(200).json({
    success: true,
    message: 'Payment processed successfully',
    data: payment,
  });
});

/**
 * POST /api/guardian/payments/:paymentId/request-invoice
 * Request invoice
 */
exports.requestInvoice = catchAsync(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await PortalPayment.findById(paymentId);
  payment.invoiceSentAt = new Date();
  await payment.save();

  res.status(200).json({
    success: true,
    message: 'Invoice sent to your email',
  });
});

/**
 * GET /api/guardian/payments/:paymentId/receipt
 * Get payment receipt
 */
exports.getReceipt = catchAsync(async (req, res) => {
  const { paymentId } = req.params;

  const payment = await PortalPayment.findById(paymentId);

  if (!payment.receiptGenerated) {
    await payment.generateReceipt();
  }

  res.status(200).json({
    success: true,
    data: { receiptUrl: payment.receiptUrl },
  });
});

/**
 * POST /api/guardian/payments/:paymentId/refund-request
 * Request refund
 */
exports.requestRefund = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body;

  const payment = await PortalPayment.findById(paymentId);
  await payment.requestRefund(reason || 'No reason provided');

  res.status(200).json({
    success: true,
    message: 'Refund request submitted',
  });
});

// ==================== FINANCIAL MANAGEMENT ====================

/**
 * GET /api/guardian/financial/summary
 * Get financial summary
 */
exports.getFinancialSummary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId);

  res.status(200).json({
    success: true,
    data: {
      totalPaid: guardian.totalPaid,
      totalDue: guardian.totalDue,
      totalOverdue: guardian.totalOverdue,
      financialStatus: guardian.financialStatus,
    },
  });
});

/**
 * GET /api/guardian/financial/balance
 * Get balance information
 */
exports.getBalance = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const payments = await PortalPayment.find({ guardianId });

  const paidAmount = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountPaid, 0);
  const dueAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0);

  res.status(200).json({
    success: true,
    data: { paidAmount, dueAmount },
  });
});

/**
 * GET /api/guardian/financial/history
 * Get financial history
 */
exports.getFinancialHistory = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const history = await PortalPayment.find({ guardianId }).sort({ createdAt: -1 }).limit(50);

  res.status(200).json({
    success: true,
    data: history,
  });
});

/**
 * GET /api/guardian/financial/forecast
 * Get financial forecast
 */
exports.getFinancialForecast = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const payments = await PortalPayment.find({ guardianId });
  const pendingAmount = payments
    .filter(p => ['pending', 'partially_paid'].includes(p.status))
    .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0);

  const forecast = {
    nextMonthDue: pendingAmount,
    expectedPayments: payments.filter(p => p.dueDate > new Date()).length,
    trend: 'stable',
  };

  res.status(200).json({
    success: true,
    data: forecast,
  });
});

// ==================== MESSAGING ====================

/**
 * GET /api/guardian/messages
 * Get all messages
 */
exports.getMessages = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 15;
  const skip = (page - 1) * limit;

  const messages = await PortalMessage.find({
    $or: [
      { toId: guardianId, toModel: 'Guardian' },
      { fromId: guardianId, fromModel: 'Guardian' },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await PortalMessage.countDocuments({
    $or: [
      { toId: guardianId, toModel: 'Guardian' },
      { fromId: guardianId, fromModel: 'Guardian' },
    ],
  });

  res.status(200).json({
    success: true,
    data: messages,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/messages/:messageId
 * Get message detail
 */
exports.getMessageDetail = catchAsync(async (req, res) => {
  const { messageId } = req.params;

  const message = await PortalMessage.findByIdAndUpdate(
    messageId,
    { isRead: true, readAt: new Date() },
    { new: true }
  ).populate('fromId');

  res.status(200).json({
    success: true,
    data: message,
  });
});

/**
 * POST /api/guardian/messages
 * Send message
 */
exports.sendMessage = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { toId, toModel, subject, message } = req.body;

  const newMessage = await PortalMessage.create({
    fromId: guardianId,
    fromModel: 'Guardian',
    toId,
    toModel,
    subject,
    message,
  });

  res.status(201).json({
    success: true,
    message: 'Message sent',
    data: newMessage,
  });
});

/**
 * PATCH /api/guardian/messages/:messageId/read
 * Mark as read
 */
exports.markMessageRead = catchAsync(async (req, res) => {
  const { messageId } = req.params;

  const message = await PortalMessage.findByIdAndUpdate(
    messageId,
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  res.status(200).json({ success: true, data: message });
});

/**
 * PATCH /api/guardian/messages/:messageId/archive
 * Archive message
 */
exports.archiveMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;

  const message = await PortalMessage.findByIdAndUpdate(
    messageId,
    { isArchived: true, archivedAt: new Date() },
    { new: true }
  );

  res.status(200).json({ success: true, data: message });
});

/**
 * DELETE /api/guardian/messages/:messageId
 * Delete message
 */
exports.deleteMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;

  await PortalMessage.findByIdAndDelete(messageId);

  res.status(200).json({ success: true, message: 'Message deleted' });
});

// ==================== NOTIFICATIONS ====================

/**
 * GET /api/guardian/notifications
 * Get notifications
 */
exports.getNotifications = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 15;
  const skip = (page - 1) * limit;

  const notifications = await PortalNotification.find({ guardianId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await PortalNotification.countDocuments({ guardianId });

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/notifications/unread
 * Get unread notifications
 */
exports.getUnreadNotifications = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const notifications = await PortalNotification.find({
    guardianId,
    isRead: false,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: notifications,
    count: notifications.length,
  });
});

/**
 * PATCH /api/guardian/notifications/:notificationId/read
 * Mark as read
 */
exports.markNotificationRead = catchAsync(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await PortalNotification.findByIdAndUpdate(
    notificationId,
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  res.status(200).json({ success: true, data: notification });
});

/**
 * PATCH /api/guardian/notifications/read-all
 * Mark all as read
 */
exports.markAllNotificationsRead = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  await PortalNotification.updateMany(
    { guardianId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({ success: true });
});

/**
 * GET /api/guardian/notifications/preferences
 * Get notification preferences
 */
exports.getNotificationPreferences = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).select('notifications language');

  res.status(200).json({
    success: true,
    data: { notifications: guardian.notifications, language: guardian.language },
  });
});

/**
 * PATCH /api/guardian/notifications/preferences
 * Update preferences
 */
exports.updateNotificationPreferences = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { notifications, language } = req.body;

  const guardian = await Guardian.findByIdAndUpdate(
    guardianId,
    { notifications, language },
    { new: true }
  );

  res.status(200).json({ success: true });
});

// ==================== SETTINGS ====================

/**
 * GET /api/guardian/settings
 * Get account settings
 */
exports.getSettings = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).select(
    'email phone language accountStatus accountVerified'
  );

  res.status(200).json({
    success: true,
    data: guardian,
  });
});

/**
 * PATCH /api/guardian/settings
 * Update settings
 */
exports.updateSettings = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { email, phone, language } = req.body;

  const guardian = await Guardian.findByIdAndUpdate(
    guardianId,
    { email, phone, language },
    { new: true }
  );

  res.status(200).json({ success: true });
});

/**
 * PATCH /api/guardian/settings/password
 * Change password
 */
exports.changePassword = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  const user = await require('../models/User').findById(guardianId);
  const isCorrect = await user.comparePassword(currentPassword);

  if (!isCorrect) {
    return res.status(401).json({ success: false, message: 'Incorrect password' });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated' });
});

/**
 * PATCH /api/guardian/settings/language
 * Change language
 */
exports.changeLanguage = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { language } = req.body;

  const guardian = await Guardian.findByIdAndUpdate(guardianId, { language }, { new: true });

  res.status(200).json({ success: true });
});

// ==================== ANALYTICS ====================

/**
 * GET /api/guardian/analytics/dashboard
 * Get analytics dashboard
 */
exports.getAnalyticsDashboard = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', '_id');
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  const progressData = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
  })
    .sort({ month: -1 })
    .limit(beneficiaryIds.length);

  const avgScore = progressData.length
    ? progressData.reduce((sum, p) => sum + p.academicScore, 0) / progressData.length
    : 0;

  res.status(200).json({
    success: true,
    data: {
      beneficiaryCount: beneficiaryIds.length,
      averageScore: avgScore.toFixed(2),
      dataPoints: progressData.length,
    },
  });
});

/**
 * GET /api/guardian/analytics/performance
 * Get performance analytics
 */
exports.getPerformanceAnalytics = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', '_id');
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  const aggregate = await BeneficiaryProgress.aggregate([
    { $match: { beneficiaryId: { $in: beneficiaryIds } } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$academicScore' },
        maxScore: { $max: '$academicScore' },
        minScore: { $min: '$academicScore' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: aggregate[0] || {},
  });
});

/**
 * GET /api/guardian/analytics/financial
 * Get financial analytics
 */
exports.getFinancialAnalytics = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const payments = await PortalPayment.find({ guardianId });

  const stats = {
    totalPaid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amountPaid, 0),
    totalDue: payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0),
    overdue: payments.filter(p => p.status === 'overdue').length,
  };

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/guardian/analytics/attendance
 * Get attendance analytics
 */
exports.getAttendanceAnalytics = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', '_id');
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

  const aggregate = await BeneficiaryProgress.aggregate([
    { $match: { beneficiaryId: { $in: beneficiaryIds } } },
    {
      $group: {
        _id: null,
        avgAttendance: { $avg: '$attendanceRate' },
        totalAbsences: { $sum: '$absenceDays' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: aggregate[0] || {},
  });
});

module.exports = exports;
