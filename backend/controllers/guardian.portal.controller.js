/* eslint-disable no-unused-vars */
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
const mongoose = require('mongoose');
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

  const guardian = await Guardian.findById(guardianId).populate('beneficiaries');
  const payments = await PortalPayment.find({ guardianId }).limit(100);

  const data = {
    guardian: guardian.toObject(),
    linkedBeneficiaries: guardian.beneficiaries ? guardian.beneficiaries.length : 0,
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

  // Verify guardian has access to this beneficiary
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized to view this beneficiary',
    });
  }

  const beneficiary = await Beneficiary.findById(beneficiaryId);

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
  await PortalNotification.create({
    guardianId,
    beneficiaryId: payment.beneficiaryId,
    type: 'payment',
    title_ar: 'تأكيد الدفع',
    title_en: 'Payment Confirmed',
    message_ar: 'تم استلام دفعتك بنجاح',
    message_en: 'Your payment has been received successfully',
    status: 'delivered',
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

  const guardian = await Guardian.findById(guardianId).select('notificationPreference language');

  res.status(200).json({
    success: true,
    data: { notificationPreference: guardian.notificationPreference, language: guardian.language },
  });
});

/**
 * PATCH /api/guardian/notifications/preferences
 * Update preferences
 */
exports.updateNotificationPreferences = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { notificationPreference, language } = req.body;

  const guardian = await Guardian.findByIdAndUpdate(
    guardianId,
    { notificationPreference, language },
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

// ==================== المواعيد APPOINTMENTS ====================

/**
 * GET /api/guardian/appointments
 * قائمة المواعيد
 */
exports.getAppointments = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { status, type } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const guardian = await Guardian.findById(guardianId).select('beneficiaries').lean();
  const beneficiaryIds = guardian.beneficiaries || [];

  const filter = {
    $or: [{ guardianId }, { beneficiaryId: { $in: beneficiaryIds } }],
  };
  if (status) filter.status = status;
  if (type) filter.appointmentType = type;

  const GuardianAppointment = _getModel('GuardianAppointment');
  const appointments = await GuardianAppointment.find(filter)
    .sort({ appointmentDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await GuardianAppointment.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: appointments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * POST /api/guardian/appointments
 * حجز موعد جديد
 */
exports.bookAppointment = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const {
    beneficiaryId,
    appointmentType,
    appointmentDate,
    timeSlot,
    staffId,
    staffName,
    reason,
    notes,
  } = req.body;

  if (!beneficiaryId || !appointmentType || !appointmentDate || !timeSlot) {
    return res.status(400).json({
      success: false,
      message: 'beneficiaryId, appointmentType, appointmentDate, and timeSlot are required',
    });
  }

  // Verify guardian access
  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized for this beneficiary' });
  }

  const GuardianAppointment = _getModel('GuardianAppointment');
  const appointment = await GuardianAppointment.create({
    guardianId,
    beneficiaryId,
    appointmentType,
    appointmentDate: new Date(appointmentDate),
    timeSlot,
    staffId,
    staffName: staffName || 'غير محدد',
    reason: reason || '',
    notes: notes || '',
    status: 'scheduled',
    createdBy: guardianId,
  });

  res.status(201).json({
    success: true,
    message: 'تم حجز الموعد بنجاح',
    data: appointment,
  });
});

/**
 * GET /api/guardian/appointments/:appointmentId
 * تفاصيل الموعد
 */
exports.getAppointmentDetail = catchAsync(async (req, res) => {
  const { appointmentId } = req.params;
  const GuardianAppointment = _getModel('GuardianAppointment');
  const appointment = await GuardianAppointment.findById(appointmentId).lean();

  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  res.status(200).json({ success: true, data: appointment });
});

/**
 * PUT /api/guardian/appointments/:appointmentId/cancel
 * إلغاء الموعد
 */
exports.cancelAppointment = catchAsync(async (req, res) => {
  const { appointmentId } = req.params;
  const { reason } = req.body;

  const GuardianAppointment = _getModel('GuardianAppointment');
  const appointment = await GuardianAppointment.findByIdAndUpdate(
    appointmentId,
    { status: 'cancelled', cancellationReason: reason || '', cancelledAt: new Date() },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'تم إلغاء الموعد',
    data: appointment,
  });
});

/**
 * GET /api/guardian/appointments/available-slots
 * الفترات المتاحة
 */
exports.getAvailableSlots = catchAsync(async (req, res) => {
  const { date, staffId, appointmentType } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // Default available slots
  const allSlots = [
    '08:00-08:30',
    '08:30-09:00',
    '09:00-09:30',
    '09:30-10:00',
    '10:00-10:30',
    '10:30-11:00',
    '11:00-11:30',
    '11:30-12:00',
    '13:00-13:30',
    '13:30-14:00',
    '14:00-14:30',
    '14:30-15:00',
  ];

  const GuardianAppointment = _getModel('GuardianAppointment');
  const filter = {
    appointmentDate: {
      $gte: new Date(targetDate),
      $lt: new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000),
    },
    status: { $nin: ['cancelled'] },
  };
  if (staffId) filter.staffId = staffId;
  if (appointmentType) filter.appointmentType = appointmentType;

  const bookedAppointments = await GuardianAppointment.find(filter).select('timeSlot').lean();
  const bookedSlots = bookedAppointments.map(a => a.timeSlot);

  const available = allSlots.filter(s => !bookedSlots.includes(s));

  res.status(200).json({
    success: true,
    data: { date: targetDate, availableSlots: available, totalSlots: allSlots.length },
  });
});

/**
 * GET /api/guardian/appointments/history
 * سجل المواعيد السابقة
 */
exports.getAppointmentHistory = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const GuardianAppointment = _getModel('GuardianAppointment');
  const history = await GuardianAppointment.find({
    guardianId,
    status: { $in: ['completed', 'cancelled', 'no_show'] },
  })
    .sort({ appointmentDate: -1 })
    .limit(50)
    .lean();

  res.status(200).json({ success: true, data: history });
});

// ==================== الجدول SCHEDULE ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/schedule
 * الجدول اليومي للمستفيد
 */
exports.getBeneficiarySchedule = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const { date } = req.query;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const targetDate = date || new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date(targetDate).getDay();
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const GuardianSchedule = _getModel('GuardianSchedule');
  const schedule = await GuardianSchedule.findOne({
    beneficiaryId,
    dayOfWeek,
    isActive: true,
  }).lean();

  res.status(200).json({
    success: true,
    data: {
      date: targetDate,
      dayName: dayNames[dayOfWeek],
      sessions: schedule ? schedule.sessions : [],
      beneficiaryId,
    },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/schedule/weekly
 * الجدول الأسبوعي
 */
exports.getBeneficiaryWeeklySchedule = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianSchedule = _getModel('GuardianSchedule');
  const weeklySchedule = await GuardianSchedule.find({
    beneficiaryId,
    isActive: true,
  })
    .sort({ dayOfWeek: 1 })
    .lean();

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const formattedWeek = dayNames.map((name, idx) => {
    const daySchedule = weeklySchedule.find(s => s.dayOfWeek === idx);
    return {
      dayOfWeek: idx,
      dayName: name,
      sessions: daySchedule ? daySchedule.sessions : [],
    };
  });

  res.status(200).json({
    success: true,
    data: { beneficiaryId, week: formattedWeek },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/schedule/exams
 * الاختبارات القادمة
 */
exports.getBeneficiaryExams = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianExam = _getModel('GuardianExam');
  const exams = await GuardianExam.find({
    beneficiaryId,
    examDate: { $gte: new Date() },
  })
    .sort({ examDate: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: exams,
    count: exams.length,
  });
});

// ==================== الخطة التعليمية الفردية IEP ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/iep
 * الخطة التعليمية الفردية الحالية
 */
exports.getBeneficiaryIEP = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianIEP = _getModel('GuardianIEP');
  const iep = await GuardianIEP.findOne({
    beneficiaryId,
    status: 'active',
  }).lean();

  res.status(200).json({
    success: true,
    data: iep || { message: 'لا توجد خطة تعليمية فردية حالية', beneficiaryId },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/iep/goals
 * أهداف الخطة التعليمية
 */
exports.getBeneficiaryIEPGoals = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianIEP = _getModel('GuardianIEP');
  const iep = await GuardianIEP.findOne({
    beneficiaryId,
    status: 'active',
  })
    .select('goals')
    .lean();

  const goals = iep ? iep.goals : [];

  res.status(200).json({
    success: true,
    data: goals,
    count: goals.length,
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/iep/progress
 * تقدم أهداف الخطة
 */
exports.getBeneficiaryIEPProgress = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianIEP = _getModel('GuardianIEP');
  const iep = await GuardianIEP.findOne({
    beneficiaryId,
    status: 'active',
  }).lean();

  if (!iep || !iep.goals) {
    return res.status(200).json({
      success: true,
      data: { goals: [], overallProgress: 0 },
    });
  }

  const goalsWithProgress = iep.goals.map(g => ({
    goalId: g._id,
    title: g.title,
    area: g.area,
    targetDate: g.targetDate,
    currentProgress: g.currentProgress || 0,
    targetProgress: g.targetProgress || 100,
    status: g.status || 'in_progress',
  }));

  const overallProgress = goalsWithProgress.length
    ? goalsWithProgress.reduce((sum, g) => sum + g.currentProgress, 0) / goalsWithProgress.length
    : 0;

  res.status(200).json({
    success: true,
    data: {
      goals: goalsWithProgress,
      overallProgress: overallProgress.toFixed(2),
      totalGoals: goalsWithProgress.length,
      completedGoals: goalsWithProgress.filter(g => g.status === 'completed').length,
    },
  });
});

/**
 * POST /api/guardian/beneficiaries/:beneficiaryId/iep/feedback
 * تقديم ملاحظات على الخطة
 */
exports.submitIEPFeedback = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const { goalId, feedback, rating, suggestions } = req.body;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianIEP = _getModel('GuardianIEP');
  const iep = await GuardianIEP.findOne({ beneficiaryId, status: 'active' });

  if (!iep) {
    return res.status(404).json({ success: false, message: 'No active IEP found' });
  }

  if (!iep.guardianFeedback) iep.guardianFeedback = [];

  iep.guardianFeedback.push({
    guardianId,
    goalId: goalId || null,
    feedback: feedback || '',
    rating: rating || 0,
    suggestions: suggestions || '',
    submittedAt: new Date(),
  });

  await iep.save();

  res.status(201).json({
    success: true,
    message: 'تم تقديم الملاحظات بنجاح',
  });
});

// ==================== الاستبيانات SURVEYS ====================

/**
 * GET /api/guardian/surveys
 * قائمة الاستبيانات المتاحة
 */
exports.getSurveys = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { status } = req.query;

  const GuardianSurvey = _getModel('GuardianSurvey');
  const filter = { isActive: true };
  if (status === 'pending') {
    filter['respondents.guardianId'] = { $ne: guardianId };
  }

  const surveys = await GuardianSurvey.find(filter)
    .select('title_ar title_en description_ar category deadline questionsCount')
    .sort({ createdAt: -1 })
    .lean();

  // Mark which ones the guardian already submitted
  const submitted = await GuardianSurvey.find({
    'respondents.guardianId': guardianId,
  })
    .select('_id')
    .lean();
  const submittedIds = submitted.map(s => s._id.toString());

  const enriched = surveys.map(s => ({
    ...s,
    isSubmitted: submittedIds.includes(s._id.toString()),
  }));

  res.status(200).json({
    success: true,
    data: enriched,
    count: enriched.length,
  });
});

/**
 * GET /api/guardian/surveys/:surveyId
 * تفاصيل الاستبيان
 */
exports.getSurveyDetail = catchAsync(async (req, res) => {
  const { surveyId } = req.params;

  const GuardianSurvey = _getModel('GuardianSurvey');
  const survey = await GuardianSurvey.findById(surveyId).lean();

  if (!survey) {
    return res.status(404).json({ success: false, message: 'Survey not found' });
  }

  res.status(200).json({ success: true, data: survey });
});

/**
 * POST /api/guardian/surveys/:surveyId/submit
 * تقديم إجابات الاستبيان
 */
exports.submitSurvey = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { surveyId } = req.params;
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ success: false, message: 'Answers array is required' });
  }

  const GuardianSurvey = _getModel('GuardianSurvey');
  const survey = await GuardianSurvey.findById(surveyId);

  if (!survey) {
    return res.status(404).json({ success: false, message: 'Survey not found' });
  }

  // Check if already submitted
  const alreadySubmitted =
    survey.respondents &&
    survey.respondents.some(r => r.guardianId && r.guardianId.toString() === guardianId.toString());

  if (alreadySubmitted) {
    return res.status(400).json({ success: false, message: 'تم تقديم الاستبيان مسبقاً' });
  }

  if (!survey.respondents) survey.respondents = [];
  survey.respondents.push({
    guardianId,
    answers,
    submittedAt: new Date(),
  });

  await survey.save();

  res.status(201).json({
    success: true,
    message: 'تم تقديم الاستبيان بنجاح',
  });
});

/**
 * GET /api/guardian/surveys/history
 * سجل الاستبيانات المقدمة
 */
exports.getSurveyHistory = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const GuardianSurvey = _getModel('GuardianSurvey');
  const surveys = await GuardianSurvey.find({
    'respondents.guardianId': guardianId,
  })
    .select('title_ar title_en category respondents')
    .lean();

  const history = surveys.map(s => {
    const myResponse = s.respondents.find(
      r => r.guardianId && r.guardianId.toString() === guardianId.toString()
    );
    return {
      surveyId: s._id,
      title_ar: s.title_ar,
      title_en: s.title_en,
      category: s.category,
      submittedAt: myResponse ? myResponse.submittedAt : null,
    };
  });

  res.status(200).json({ success: true, data: history });
});

// ==================== المكتبة الإلكترونية RESOURCES ====================

/**
 * GET /api/guardian/resources
 * قائمة الموارد التعليمية
 */
exports.getResources = catchAsync(async (req, res) => {
  const { category, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const GuardianResource = _getModel('GuardianResource');
  const filter = { isPublished: true };
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };

  const resources = await GuardianResource.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await GuardianResource.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: resources,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/resources/categories
 * تصنيفات الموارد
 */
exports.getResourceCategories = catchAsync(async (req, res) => {
  const categories = [
    { key: 'educational', name_ar: 'تعليمية', name_en: 'Educational', icon: 'book' },
    { key: 'behavioral', name_ar: 'سلوكية', name_en: 'Behavioral', icon: 'heart' },
    { key: 'health', name_ar: 'صحية', name_en: 'Health', icon: 'activity' },
    { key: 'therapy', name_ar: 'علاجية', name_en: 'Therapy', icon: 'clipboard' },
    { key: 'parenting', name_ar: 'تربوية', name_en: 'Parenting', icon: 'users' },
    { key: 'special_needs', name_ar: 'احتياجات خاصة', name_en: 'Special Needs', icon: 'star' },
    { key: 'activities', name_ar: 'أنشطة', name_en: 'Activities', icon: 'play' },
    { key: 'guides', name_ar: 'أدلة إرشادية', name_en: 'Guides', icon: 'file-text' },
  ];

  res.status(200).json({ success: true, data: categories });
});

/**
 * GET /api/guardian/resources/:resourceId
 * تفاصيل المورد
 */
exports.getResourceDetail = catchAsync(async (req, res) => {
  const { resourceId } = req.params;

  const GuardianResource = _getModel('GuardianResource');
  const resource = await GuardianResource.findByIdAndUpdate(
    resourceId,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean();

  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  res.status(200).json({ success: true, data: resource });
});

/**
 * POST /api/guardian/resources/:resourceId/bookmark
 * حفظ المورد في المفضلة
 */
exports.bookmarkResource = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { resourceId } = req.params;

  const GuardianResource = _getModel('GuardianResource');
  const resource = await GuardianResource.findById(resourceId);

  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  if (!resource.bookmarkedBy) resource.bookmarkedBy = [];

  const idx = resource.bookmarkedBy.findIndex(id => id.toString() === guardianId.toString());
  if (idx > -1) {
    resource.bookmarkedBy.splice(idx, 1);
    await resource.save();
    return res.status(200).json({ success: true, message: 'تم إزالة الحفظ', bookmarked: false });
  }

  resource.bookmarkedBy.push(guardianId);
  await resource.save();

  res.status(200).json({ success: true, message: 'تم الحفظ في المفضلة', bookmarked: true });
});

/**
 * GET /api/guardian/resources/bookmarks
 * الموارد المحفوظة
 */
exports.getBookmarkedResources = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const GuardianResource = _getModel('GuardianResource');
  const resources = await GuardianResource.find({
    bookmarkedBy: guardianId,
    isPublished: true,
  }).lean();

  res.status(200).json({ success: true, data: resources });
});

// ==================== طلبات الدعم SUPPORT TICKETS ====================

/**
 * GET /api/guardian/support-tickets
 * قائمة طلبات الدعم
 */
exports.getSupportTickets = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const GuardianSupportTicket = _getModel('GuardianSupportTicket');
  const filter = { guardianId };
  if (status) filter.status = status;

  const tickets = await GuardianSupportTicket.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await GuardianSupportTicket.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: tickets,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * POST /api/guardian/support-tickets
 * إنشاء طلب دعم
 */
exports.createSupportTicket = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { subject, description, category, priority, beneficiaryId } = req.body;

  if (!subject || !description) {
    return res
      .status(400)
      .json({ success: false, message: 'Subject and description are required' });
  }

  const GuardianSupportTicket = _getModel('GuardianSupportTicket');
  const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

  const ticket = await GuardianSupportTicket.create({
    guardianId,
    ticketNumber,
    subject,
    description,
    category: category || 'general',
    priority: priority || 'normal',
    beneficiaryId: beneficiaryId || null,
    status: 'open',
    replies: [],
  });

  res.status(201).json({
    success: true,
    message: 'تم إنشاء طلب الدعم بنجاح',
    data: ticket,
  });
});

/**
 * GET /api/guardian/support-tickets/:ticketId
 * تفاصيل طلب الدعم
 */
exports.getSupportTicketDetail = catchAsync(async (req, res) => {
  const { ticketId } = req.params;

  const GuardianSupportTicket = _getModel('GuardianSupportTicket');
  const ticket = await GuardianSupportTicket.findById(ticketId).lean();

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  res.status(200).json({ success: true, data: ticket });
});

/**
 * POST /api/guardian/support-tickets/:ticketId/reply
 * إضافة رد على طلب الدعم
 */
exports.replySupportTicket = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { ticketId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Reply message is required' });
  }

  const GuardianSupportTicket = _getModel('GuardianSupportTicket');
  const ticket = await GuardianSupportTicket.findById(ticketId);

  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  if (!ticket.replies) ticket.replies = [];
  ticket.replies.push({
    senderId: guardianId,
    senderRole: 'guardian',
    message,
    createdAt: new Date(),
  });

  ticket.status = 'awaiting_response';
  ticket.lastUpdated = new Date();
  await ticket.save();

  res.status(201).json({
    success: true,
    message: 'تم إضافة الرد',
    data: ticket,
  });
});

/**
 * PUT /api/guardian/support-tickets/:ticketId/close
 * إغلاق طلب الدعم
 */
exports.closeSupportTicket = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { satisfactionRating, closingNotes } = req.body;

  const GuardianSupportTicket = _getModel('GuardianSupportTicket');
  const ticket = await GuardianSupportTicket.findByIdAndUpdate(
    ticketId,
    {
      status: 'closed',
      closedAt: new Date(),
      satisfactionRating: satisfactionRating || null,
      closingNotes: closingNotes || '',
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'تم إغلاق طلب الدعم',
    data: ticket,
  });
});

// ==================== التقويم والأحداث EVENTS ====================

/**
 * GET /api/guardian/events
 * الأحداث والفعاليات القادمة
 */
exports.getEvents = catchAsync(async (req, res) => {
  const { month, category } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const GuardianEvent = _getModel('GuardianEvent');
  const filter = { isPublished: true };

  if (month) {
    const [year, m] = month.split('-');
    filter.eventDate = {
      $gte: new Date(year, m - 1, 1),
      $lt: new Date(year, m, 1),
    };
  } else {
    filter.eventDate = { $gte: new Date() };
  }
  if (category) filter.category = category;

  const events = await GuardianEvent.find(filter)
    .sort({ eventDate: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await GuardianEvent.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: events,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/events/:eventId
 * تفاصيل الحدث
 */
exports.getEventDetail = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  const GuardianEvent = _getModel('GuardianEvent');
  const event = await GuardianEvent.findById(eventId).lean();

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  res.status(200).json({ success: true, data: event });
});

/**
 * POST /api/guardian/events/:eventId/rsvp
 * تأكيد الحضور
 */
exports.rsvpEvent = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { eventId } = req.params;
  const { attending, attendeeCount } = req.body;

  const GuardianEvent = _getModel('GuardianEvent');
  const event = await GuardianEvent.findById(eventId);

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (!event.rsvps) event.rsvps = [];

  const existingIdx = event.rsvps.findIndex(
    r => r.guardianId && r.guardianId.toString() === guardianId.toString()
  );

  if (existingIdx > -1) {
    event.rsvps[existingIdx] = {
      guardianId,
      attending: attending !== false,
      attendeeCount: attendeeCount || 1,
      updatedAt: new Date(),
    };
  } else {
    event.rsvps.push({
      guardianId,
      attending: attending !== false,
      attendeeCount: attendeeCount || 1,
      createdAt: new Date(),
    });
  }

  await event.save();

  res.status(200).json({
    success: true,
    message: attending !== false ? 'تم تأكيد الحضور' : 'تم إلغاء الحضور',
  });
});

/**
 * GET /api/guardian/events/calendar
 * بيانات التقويم
 */
exports.getEventsCalendar = catchAsync(async (req, res) => {
  const { year, month } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;

  const GuardianEvent = _getModel('GuardianEvent');
  const events = await GuardianEvent.find({
    isPublished: true,
    eventDate: {
      $gte: new Date(y, m - 1, 1),
      $lt: new Date(y, m, 1),
    },
  })
    .select('title_ar title_en eventDate category eventType')
    .sort({ eventDate: 1 })
    .lean();

  // Group by date
  const calendar = {};
  events.forEach(e => {
    const dateKey = e.eventDate.toISOString().slice(0, 10);
    if (!calendar[dateKey]) calendar[dateKey] = [];
    calendar[dateKey].push(e);
  });

  res.status(200).json({
    success: true,
    data: { year: y, month: m, events: calendar },
  });
});

// ==================== الاقتراحات والشكاوى FEEDBACK & COMPLAINTS ====================

/**
 * GET /api/guardian/feedback
 * قائمة الاقتراحات
 */
exports.getFeedback = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const GuardianFeedback = _getModel('GuardianFeedback');
  const feedback = await GuardianFeedback.find({ guardianId }).sort({ createdAt: -1 }).lean();

  res.status(200).json({ success: true, data: feedback });
});

/**
 * POST /api/guardian/feedback
 * تقديم اقتراح أو ملاحظة
 */
exports.submitFeedback = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { type, subject, message, category, rating } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Subject and message are required' });
  }

  const GuardianFeedback = _getModel('GuardianFeedback');
  const feedback = await GuardianFeedback.create({
    guardianId,
    type: type || 'suggestion',
    subject,
    message,
    category: category || 'general',
    rating: rating || null,
    status: 'submitted',
  });

  res.status(201).json({
    success: true,
    message: 'تم تقديم الاقتراح بنجاح',
    data: feedback,
  });
});

/**
 * POST /api/guardian/complaints
 * تقديم شكوى
 */
exports.submitComplaint = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { subject, description, category, beneficiaryId, urgency } = req.body;

  if (!subject || !description) {
    return res
      .status(400)
      .json({ success: false, message: 'Subject and description are required' });
  }

  const GuardianFeedback = _getModel('GuardianFeedback');
  const complaintNumber = `CMP-${Date.now().toString(36).toUpperCase()}`;

  const complaint = await GuardianFeedback.create({
    guardianId,
    type: 'complaint',
    complaintNumber,
    subject,
    message: description,
    category: category || 'general',
    beneficiaryId: beneficiaryId || null,
    urgency: urgency || 'normal',
    status: 'submitted',
  });

  res.status(201).json({
    success: true,
    message: 'تم تقديم الشكوى وسيتم مراجعتها',
    data: complaint,
  });
});

/**
 * GET /api/guardian/complaints
 * قائمة الشكاوى
 */
exports.getComplaints = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const GuardianFeedback = _getModel('GuardianFeedback');
  const complaints = await GuardianFeedback.find({
    guardianId,
    type: 'complaint',
  })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: complaints });
});

/**
 * GET /api/guardian/complaints/:complaintId
 * حالة الشكوى
 */
exports.getComplaintDetail = catchAsync(async (req, res) => {
  const { complaintId } = req.params;

  const GuardianFeedback = _getModel('GuardianFeedback');
  const complaint = await GuardianFeedback.findById(complaintId).lean();

  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  res.status(200).json({ success: true, data: complaint });
});

// ==================== المستندات DOCUMENTS ====================

/**
 * GET /api/guardian/documents
 * قائمة المستندات
 */
exports.getDocuments = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { category, beneficiaryId } = req.query;

  const GuardianDocument = _getModel('GuardianDocument');
  const filter = {
    $or: [{ guardianId }, { sharedWith: guardianId }],
  };
  if (category) filter.category = category;
  if (beneficiaryId) filter.beneficiaryId = beneficiaryId;

  const documents = await GuardianDocument.find(filter).sort({ createdAt: -1 }).lean();

  res.status(200).json({ success: true, data: documents, count: documents.length });
});

/**
 * GET /api/guardian/documents/categories
 * تصنيفات المستندات
 */
exports.getDocumentCategories = catchAsync(async (req, res) => {
  const categories = [
    { key: 'academic_report', name_ar: 'تقارير أكاديمية', name_en: 'Academic Reports' },
    { key: 'medical_report', name_ar: 'تقارير طبية', name_en: 'Medical Reports' },
    { key: 'iep_document', name_ar: 'مستندات الخطة التعليمية', name_en: 'IEP Documents' },
    { key: 'assessment', name_ar: 'تقييمات', name_en: 'Assessments' },
    { key: 'certificate', name_ar: 'شهادات', name_en: 'Certificates' },
    { key: 'financial', name_ar: 'مستندات مالية', name_en: 'Financial Documents' },
    { key: 'consent_form', name_ar: 'نماذج موافقة', name_en: 'Consent Forms' },
    { key: 'other', name_ar: 'أخرى', name_en: 'Other' },
  ];

  res.status(200).json({ success: true, data: categories });
});

/**
 * GET /api/guardian/documents/:documentId/download
 * تحميل المستند
 */
exports.downloadDocument = catchAsync(async (req, res) => {
  const { documentId } = req.params;

  const GuardianDocument = _getModel('GuardianDocument');
  const document = await GuardianDocument.findByIdAndUpdate(
    documentId,
    { $inc: { downloadCount: 1 }, lastDownloadedAt: new Date() },
    { new: true }
  ).lean();

  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  res.status(200).json({
    success: true,
    data: {
      downloadUrl: document.fileUrl || document.filePath,
      fileName: document.fileName,
      mimeType: document.mimeType,
    },
  });
});

/**
 * POST /api/guardian/documents/upload
 * رفع مستند
 */
exports.uploadDocument = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { title, description, category, beneficiaryId } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Document title is required' });
  }

  const GuardianDocument = _getModel('GuardianDocument');
  const fileInfo = req.file
    ? {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileUrl: `/uploads/guardian-docs/${req.file.filename}`,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      }
    : {
        fileName: title,
        filePath: '',
        fileUrl: '',
        mimeType: 'application/octet-stream',
        fileSize: 0,
      };

  const document = await GuardianDocument.create({
    guardianId,
    beneficiaryId: beneficiaryId || null,
    title,
    description: description || '',
    category: category || 'other',
    ...fileInfo,
    uploadedBy: guardianId,
  });

  res.status(201).json({
    success: true,
    message: 'تم رفع المستند بنجاح',
    data: document,
  });
});

// ==================== متابعة النقل TRANSPORTATION ====================

/**
 * GET /api/guardian/transportation
 * معلومات النقل المدرسي
 */
exports.getTransportation = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).select('beneficiaries').lean();
  const beneficiaryIds = guardian.beneficiaries || [];

  const GuardianTransportation = _getModel('GuardianTransportation');
  const transportInfo = await GuardianTransportation.find({
    beneficiaryId: { $in: beneficiaryIds },
    isActive: true,
  }).lean();

  res.status(200).json({ success: true, data: transportInfo });
});

/**
 * GET /api/guardian/transportation/tracking
 * تتبع الحافلة المباشر
 */
exports.getTransportationTracking = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.query;

  const guardian = await Guardian.findById(guardianId).select('beneficiaries').lean();
  const beneficiaryIds = guardian.beneficiaries || [];

  if (beneficiaryId && !beneficiaryIds.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const targetIds = beneficiaryId ? [beneficiaryId] : beneficiaryIds;

  const GuardianTransportation = _getModel('GuardianTransportation');
  const routes = await GuardianTransportation.find({
    beneficiaryId: { $in: targetIds },
    isActive: true,
  })
    .select('busNumber routeName currentLocation estimatedArrival status driverName driverPhone')
    .lean();

  res.status(200).json({
    success: true,
    data: routes.map(r => ({
      ...r,
      lastUpdated: new Date(),
    })),
  });
});

/**
 * GET /api/guardian/transportation/schedule
 * جدول النقل
 */
exports.getTransportationSchedule = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).select('beneficiaries').lean();
  const beneficiaryIds = guardian.beneficiaries || [];

  const GuardianTransportation = _getModel('GuardianTransportation');
  const schedules = await GuardianTransportation.find({
    beneficiaryId: { $in: beneficiaryIds },
    isActive: true,
  })
    .select(
      'beneficiaryId routeName pickupTime dropoffTime pickupLocation dropoffLocation busNumber'
    )
    .lean();

  res.status(200).json({ success: true, data: schedules });
});

/**
 * POST /api/guardian/transportation/absence
 * إبلاغ عن غياب عن النقل
 */
exports.reportTransportationAbsence = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, date, reason, direction } = req.body;

  if (!beneficiaryId || !date) {
    return res.status(400).json({ success: false, message: 'beneficiaryId and date are required' });
  }

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianTransportation = _getModel('GuardianTransportation');
  const transport = await GuardianTransportation.findOne({
    beneficiaryId,
    isActive: true,
  });

  if (transport) {
    if (!transport.absenceReports) transport.absenceReports = [];
    transport.absenceReports.push({
      date: new Date(date),
      reason: reason || '',
      direction: direction || 'both',
      reportedBy: guardianId,
      reportedAt: new Date(),
    });
    await transport.save();
  }

  res.status(201).json({
    success: true,
    message: 'تم الإبلاغ عن الغياب بنجاح',
  });
});

// ==================== الأنشطة اللاصفية ACTIVITIES ====================

/**
 * GET /api/guardian/activities
 * قائمة الأنشطة المتاحة
 */
exports.getActivities = catchAsync(async (req, res) => {
  const { category, status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const GuardianActivity = _getModel('GuardianActivity');
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (status) filter.registrationStatus = status;

  const activities = await GuardianActivity.find(filter)
    .sort({ startDate: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await GuardianActivity.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: activities,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/activities/:activityId
 * تفاصيل النشاط
 */
exports.getActivityDetail = catchAsync(async (req, res) => {
  const { activityId } = req.params;

  const GuardianActivity = _getModel('GuardianActivity');
  const activity = await GuardianActivity.findById(activityId).lean();

  if (!activity) {
    return res.status(404).json({ success: false, message: 'Activity not found' });
  }

  res.status(200).json({ success: true, data: activity });
});

/**
 * POST /api/guardian/activities/:activityId/enroll
 * تسجيل المستفيد في نشاط
 */
exports.enrollActivity = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { activityId } = req.params;
  const { beneficiaryId, notes } = req.body;

  if (!beneficiaryId) {
    return res.status(400).json({ success: false, message: 'beneficiaryId is required' });
  }

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized for this beneficiary' });
  }

  const GuardianActivity = _getModel('GuardianActivity');
  const activity = await GuardianActivity.findById(activityId);

  if (!activity) {
    return res.status(404).json({ success: false, message: 'Activity not found' });
  }

  if (!activity.enrollments) activity.enrollments = [];

  const alreadyEnrolled = activity.enrollments.some(
    e => e.beneficiaryId && e.beneficiaryId.toString() === beneficiaryId
  );

  if (alreadyEnrolled) {
    return res.status(400).json({ success: false, message: 'المستفيد مسجل مسبقاً في هذا النشاط' });
  }

  if (activity.maxCapacity && activity.enrollments.length >= activity.maxCapacity) {
    return res.status(400).json({ success: false, message: 'النشاط مكتمل العدد' });
  }

  activity.enrollments.push({
    beneficiaryId,
    guardianId,
    notes: notes || '',
    enrolledAt: new Date(),
    status: 'enrolled',
  });

  await activity.save();

  res.status(201).json({
    success: true,
    message: 'تم التسجيل في النشاط بنجاح',
  });
});

/**
 * DELETE /api/guardian/activities/:activityId/withdraw
 * سحب التسجيل من نشاط
 */
exports.withdrawActivity = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { activityId } = req.params;
  const { beneficiaryId } = req.body;

  const GuardianActivity = _getModel('GuardianActivity');
  const activity = await GuardianActivity.findById(activityId);

  if (!activity) {
    return res.status(404).json({ success: false, message: 'Activity not found' });
  }

  if (activity.enrollments) {
    activity.enrollments = activity.enrollments.filter(
      e => !(e.beneficiaryId && e.beneficiaryId.toString() === beneficiaryId)
    );
    await activity.save();
  }

  res.status(200).json({ success: true, message: 'تم سحب التسجيل من النشاط' });
});

/**
 * GET /api/guardian/activities/enrolled
 * الأنشطة المسجل فيها
 */
exports.getEnrolledActivities = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).select('beneficiaries').lean();
  const beneficiaryIds = (guardian.beneficiaries || []).map(b => b.toString());

  const GuardianActivity = _getModel('GuardianActivity');
  const activities = await GuardianActivity.find({
    'enrollments.beneficiaryId': { $in: guardian.beneficiaries },
    isActive: true,
  }).lean();

  const enriched = activities.map(a => ({
    ...a,
    enrolledBeneficiaries: (a.enrollments || [])
      .filter(e => e.beneficiaryId && beneficiaryIds.includes(e.beneficiaryId.toString()))
      .map(e => ({
        beneficiaryId: e.beneficiaryId,
        enrolledAt: e.enrolledAt,
        status: e.status,
      })),
  }));

  res.status(200).json({ success: true, data: enriched });
});

// ==================== طلبات الإذن PERMISSION REQUESTS ====================

/**
 * GET /api/guardian/permission-requests
 * قائمة طلبات الإذن والغياب
 */
exports.getPermissionRequests = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { status, beneficiaryId } = req.query;

  const GuardianPermissionRequest = _getModel('GuardianPermissionRequest');
  const filter = { guardianId };
  if (status) filter.status = status;
  if (beneficiaryId) filter.beneficiaryId = beneficiaryId;

  const requests = await GuardianPermissionRequest.find(filter).sort({ createdAt: -1 }).lean();

  res.status(200).json({ success: true, data: requests, count: requests.length });
});

/**
 * POST /api/guardian/permission-requests
 * تقديم طلب إذن / غياب
 */
exports.createPermissionRequest = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, requestType, startDate, endDate, reason, attachmentUrl, notes } = req.body;

  if (!beneficiaryId || !requestType || !startDate) {
    return res.status(400).json({
      success: false,
      message: 'beneficiaryId, requestType, and startDate are required',
    });
  }

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized for this beneficiary' });
  }

  const GuardianPermissionRequest = _getModel('GuardianPermissionRequest');
  const request = await GuardianPermissionRequest.create({
    guardianId,
    beneficiaryId,
    requestType,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : new Date(startDate),
    reason: reason || '',
    attachmentUrl: attachmentUrl || '',
    notes: notes || '',
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    message: 'تم تقديم طلب الإذن بنجاح',
    data: request,
  });
});

/**
 * GET /api/guardian/permission-requests/:requestId
 * تفاصيل طلب الإذن
 */
exports.getPermissionRequestDetail = catchAsync(async (req, res) => {
  const { requestId } = req.params;

  const GuardianPermissionRequest = _getModel('GuardianPermissionRequest');
  const request = await GuardianPermissionRequest.findById(requestId).lean();

  if (!request) {
    return res.status(404).json({ success: false, message: 'Permission request not found' });
  }

  res.status(200).json({ success: true, data: request });
});

/**
 * DELETE /api/guardian/permission-requests/:requestId
 * إلغاء طلب إذن (إن كان لا يزال معلقاً)
 */
exports.cancelPermissionRequest = catchAsync(async (req, res) => {
  const { requestId } = req.params;

  const GuardianPermissionRequest = _getModel('GuardianPermissionRequest');
  const request = await GuardianPermissionRequest.findById(requestId);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Permission request not found' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'لا يمكن إلغاء طلب تمت معالجته',
    });
  }

  request.status = 'cancelled';
  request.cancelledAt = new Date();
  await request.save();

  res.status(200).json({ success: true, message: 'تم إلغاء الطلب' });
});

// ==================== الإعلانات ANNOUNCEMENTS ====================

/**
 * GET /api/guardian/announcements
 * إعلانات المركز
 */
exports.getAnnouncements = catchAsync(async (req, res) => {
  const { category, priority } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const GuardianAnnouncement = _getModel('GuardianAnnouncement');
  const filter = { isPublished: true };
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  const announcements = await GuardianAnnouncement.find(filter)
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await GuardianAnnouncement.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: announcements,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/announcements/:announcementId
 * تفاصيل الإعلان
 */
exports.getAnnouncementDetail = catchAsync(async (req, res) => {
  const { announcementId } = req.params;

  const GuardianAnnouncement = _getModel('GuardianAnnouncement');
  const announcement = await GuardianAnnouncement.findByIdAndUpdate(
    announcementId,
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean();

  if (!announcement) {
    return res.status(404).json({ success: false, message: 'Announcement not found' });
  }

  res.status(200).json({ success: true, data: announcement });
});

// ==================== التواصل مع المعلمين TEACHER COMMUNICATION ====================

/**
 * GET /api/guardian/teachers
 * قائمة المعلمين والأخصائيين
 */
exports.getTeachers = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.query;

  const guardian = await Guardian.findById(guardianId).select('beneficiaries').lean();
  const beneficiaryIds = beneficiaryId ? [beneficiaryId] : guardian.beneficiaries || [];

  // Get staff assigned to these beneficiaries
  const GuardianTeacherLink = _getModel('GuardianTeacherLink');
  const teachers = await GuardianTeacherLink.find({
    beneficiaryId: { $in: beneficiaryIds },
    isActive: true,
  }).lean();

  res.status(200).json({
    success: true,
    data: teachers,
    count: teachers.length,
  });
});

/**
 * POST /api/guardian/teachers/:teacherId/message
 * إرسال رسالة مباشرة للمعلم
 */
exports.messageTeacher = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { teacherId } = req.params;
  const { subject, message, beneficiaryId } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message content is required' });
  }

  const newMessage = await PortalMessage.create({
    fromId: guardianId,
    fromModel: 'Guardian',
    toId: teacherId,
    toModel: 'User',
    subject: subject || 'رسالة من ولي الأمر',
    message,
    messageType: 'teacher_communication',
    priority: 'normal',
    metadata: { beneficiaryId },
  });

  res.status(201).json({
    success: true,
    message: 'تم إرسال الرسالة للمعلم',
    data: newMessage,
  });
});

/**
 * GET /api/guardian/teachers/:teacherId/messages
 * محادثات مع معلم معين
 */
exports.getTeacherMessages = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { teacherId } = req.params;

  const messages = await PortalMessage.find({
    $or: [
      { fromId: guardianId, toId: teacherId },
      { fromId: teacherId, toId: guardianId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.status(200).json({ success: true, data: messages });
});

// ==================== نظام المكافآت REWARDS ====================

/**
 * GET /api/guardian/rewards
 * نقاط ومكافآت المستفيدين
 */
exports.getRewards = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).select('beneficiaries').lean();
  const beneficiaryIds = guardian.beneficiaries || [];

  const GuardianReward = _getModel('GuardianReward');
  const rewards = await GuardianReward.find({
    beneficiaryId: { $in: beneficiaryIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate per beneficiary
  const summary = {};
  rewards.forEach(r => {
    const bid = r.beneficiaryId.toString();
    if (!summary[bid]) summary[bid] = { totalPoints: 0, rewards: [] };
    summary[bid].totalPoints += r.points || 0;
    summary[bid].rewards.push(r);
  });

  res.status(200).json({
    success: true,
    data: { rewards, summary },
  });
});

/**
 * GET /api/guardian/rewards/:beneficiaryId/history
 * سجل مكافآت المستفيد
 */
exports.getRewardHistory = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;

  const guardian = await Guardian.findById(guardianId);
  if (!guardian.beneficiaries.map(b => b.toString()).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const GuardianReward = _getModel('GuardianReward');
  const history = await GuardianReward.find({ beneficiaryId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const totalPoints = history.reduce((sum, r) => sum + (r.points || 0), 0);

  res.status(200).json({
    success: true,
    data: { history, totalPoints, count: history.length },
  });
});

// ==================== الطوارئ EMERGENCY ====================

/**
 * GET /api/guardian/emergency-contacts
 * جهات اتصال الطوارئ
 */
exports.getEmergencyContacts = catchAsync(async (req, res) => {
  const guardianId = req.user._id;

  const guardian = await Guardian.findById(guardianId).select('emergencyContacts').lean();

  res.status(200).json({
    success: true,
    data: guardian.emergencyContacts || [],
  });
});

/**
 * PUT /api/guardian/emergency-contacts
 * تحديث جهات اتصال الطوارئ
 */
exports.updateEmergencyContacts = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { contacts } = req.body;

  if (!contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ success: false, message: 'Contacts array is required' });
  }

  const guardian = await Guardian.findByIdAndUpdate(
    guardianId,
    { emergencyContacts: contacts },
    { new: true }
  ).select('emergencyContacts');

  res.status(200).json({
    success: true,
    message: 'تم تحديث جهات اتصال الطوارئ',
    data: guardian.emergencyContacts,
  });
});

/**
 * POST /api/guardian/emergency-alert
 * إرسال تنبيه طوارئ
 */
exports.sendEmergencyAlert = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, alertType, description, location } = req.body;

  if (!beneficiaryId || !alertType) {
    return res
      .status(400)
      .json({ success: false, message: 'beneficiaryId and alertType are required' });
  }

  // Create emergency notification
  await PortalNotification.create({
    guardianId,
    beneficiaryId,
    type: 'emergency',
    priority: 'urgent',
    title_ar: 'تنبيه طوارئ من ولي الأمر',
    title_en: 'Guardian Emergency Alert',
    message_ar: description || `تنبيه طوارئ: ${alertType}`,
    message_en: `Emergency alert: ${alertType}`,
    status: 'delivered',
    metadata: { alertType, location },
  });

  res.status(201).json({
    success: true,
    message: 'تم إرسال تنبيه الطوارئ',
  });
});

// ==================== السجل الصحي HEALTH RECORDS ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/health
 * عرض السجل الصحي للمستفيد
 */
exports.getBeneficiaryHealthRecords = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const HealthRecord = _getModel('GuardianHealthRecord');
  const records = await HealthRecord.find({ beneficiaryId }).sort({ recordDate: -1 }).limit(50);
  res.json({ success: true, data: records });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/health/medications
 * الأدوية الحالية
 */
exports.getBeneficiaryMedications = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const HealthRecord = _getModel('GuardianHealthRecord');
  const meds = await HealthRecord.find({ beneficiaryId, recordType: 'medication', isActive: true });
  res.json({ success: true, data: meds });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/health/allergies
 * الحساسيات
 */
exports.getBeneficiaryAllergies = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const HealthRecord = _getModel('GuardianHealthRecord');
  const allergies = await HealthRecord.find({ beneficiaryId, recordType: 'allergy' });
  res.json({ success: true, data: allergies });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/health/vaccinations
 * سجل التطعيمات
 */
exports.getBeneficiaryVaccinations = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const HealthRecord = _getModel('GuardianHealthRecord');
  const vaccinations = await HealthRecord.find({ beneficiaryId, recordType: 'vaccination' }).sort({
    recordDate: -1,
  });
  res.json({ success: true, data: vaccinations });
});

/**
 * POST /api/guardian/beneficiaries/:beneficiaryId/health/incident
 * الإبلاغ عن حادث صحي
 */
exports.reportHealthIncident = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const { incidentType, description, severity, date } = req.body;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  if (!incidentType || !description) {
    return res
      .status(400)
      .json({ success: false, message: 'incidentType and description required' });
  }
  const HealthRecord = _getModel('GuardianHealthRecord');
  const incident = await HealthRecord.create({
    beneficiaryId,
    guardianId,
    recordType: 'incident',
    incidentType,
    description,
    severity: severity || 'medium',
    recordDate: date || new Date(),
    reportedBy: guardianId,
    status: 'reported',
  });
  res.status(201).json({ success: true, data: incident });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/health/summary
 * ملخص الحالة الصحية
 */
exports.getHealthSummary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const HealthRecord = _getModel('GuardianHealthRecord');
  const [medications, allergies, vaccinations, incidents] = await Promise.all([
    HealthRecord.countDocuments({ beneficiaryId, recordType: 'medication', isActive: true }),
    HealthRecord.countDocuments({ beneficiaryId, recordType: 'allergy' }),
    HealthRecord.countDocuments({ beneficiaryId, recordType: 'vaccination' }),
    HealthRecord.countDocuments({ beneficiaryId, recordType: 'incident' }),
  ]);
  res.json({
    success: true,
    data: {
      activeMedications: medications,
      allergies,
      vaccinations,
      incidents,
      lastUpdated: new Date(),
    },
  });
});

// ==================== الجلسات العلاجية THERAPY SESSIONS ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/therapy
 * قائمة الجلسات العلاجية
 */
exports.getBeneficiaryTherapySessions = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const TherapySession = _getModel('GuardianTherapySession');
  const page = parseInt(req.query.page) || 1;
  const limit = 15;
  const [sessions, total] = await Promise.all([
    TherapySession.find({ beneficiaryId })
      .sort({ sessionDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    TherapySession.countDocuments({ beneficiaryId }),
  ]);
  res.json({
    success: true,
    data: sessions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/therapy/:sessionId
 * تفاصيل جلسة علاجية
 */
exports.getTherapySessionDetail = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, sessionId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const TherapySession = _getModel('GuardianTherapySession');
  const session = await TherapySession.findOne({ _id: sessionId, beneficiaryId });
  if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
  res.json({ success: true, data: session });
});

/**
 * POST /api/guardian/beneficiaries/:beneficiaryId/therapy/:sessionId/rate
 * تقييم جلسة علاجية
 */
exports.rateTherapySession = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, sessionId } = req.params;
  const { rating, comment } = req.body;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }
  const TherapySession = _getModel('GuardianTherapySession');
  const session = await TherapySession.findOneAndUpdate(
    { _id: sessionId, beneficiaryId },
    { guardianRating: rating, guardianComment: comment, ratedAt: new Date() },
    { new: true }
  );
  if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
  res.json({ success: true, data: session });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/therapy/upcoming
 * الجلسات القادمة
 */
exports.getUpcomingTherapySessions = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const TherapySession = _getModel('GuardianTherapySession');
  const sessions = await TherapySession.find({
    beneficiaryId,
    sessionDate: { $gte: new Date() },
    status: { $in: ['scheduled', 'confirmed'] },
  })
    .sort({ sessionDate: 1 })
    .limit(20);
  res.json({ success: true, data: sessions });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/therapy/progress
 * تقدم الجلسات العلاجية
 */
exports.getTherapyProgress = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const TherapySession = _getModel('GuardianTherapySession');
  const sessions = await TherapySession.find({ beneficiaryId, status: 'completed' })
    .sort({ sessionDate: -1 })
    .limit(30);
  const totalSessions = await TherapySession.countDocuments({ beneficiaryId });
  const completedSessions = sessions.length;
  const avgRating =
    sessions.filter(s => s.therapistRating).reduce((a, s) => a + s.therapistRating, 0) /
    (sessions.filter(s => s.therapistRating).length || 1);
  res.json({
    success: true,
    data: {
      totalSessions,
      completedSessions,
      averageTherapistRating: Math.round(avgRating * 10) / 10,
      recentSessions: sessions.slice(0, 10),
    },
  });
});

// ==================== خطة التغذية MEAL PLANS ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/meals
 * خطة الوجبات
 */
exports.getBeneficiaryMealPlan = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const MealPlan = _getModel('GuardianMealPlan');
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const meals = await MealPlan.find({
    beneficiaryId,
    date: { $gte: weekStart },
  }).sort({ date: 1 });
  res.json({ success: true, data: meals });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/meals/dietary
 * القيود الغذائية
 */
exports.getBeneficiaryDietary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const MealPlan = _getModel('GuardianMealPlan');
  const dietary = await MealPlan.findOne({ beneficiaryId, recordType: 'dietary_profile' });
  res.json({
    success: true,
    data: dietary || { restrictions: [], allergies: [], preferences: [], specialDiet: null },
  });
});

/**
 * PUT /api/guardian/beneficiaries/:beneficiaryId/meals/dietary
 * تحديث القيود الغذائية
 */
exports.updateBeneficiaryDietary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const { restrictions, allergies, preferences, specialDiet } = req.body;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const MealPlan = _getModel('GuardianMealPlan');
  const dietary = await MealPlan.findOneAndUpdate(
    { beneficiaryId, recordType: 'dietary_profile' },
    {
      beneficiaryId,
      guardianId,
      recordType: 'dietary_profile',
      restrictions,
      allergies,
      preferences,
      specialDiet,
      updatedBy: guardianId,
    },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: dietary });
});

/**
 * POST /api/guardian/beneficiaries/:beneficiaryId/meals/request
 * طلب وجبة خاصة
 */
exports.requestSpecialMeal = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const { date, mealType, description, reason } = req.body;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  if (!date || !description) {
    return res.status(400).json({ success: false, message: 'date and description required' });
  }
  const MealPlan = _getModel('GuardianMealPlan');
  const request = await MealPlan.create({
    beneficiaryId,
    guardianId,
    recordType: 'special_request',
    date: new Date(date),
    mealType: mealType || 'lunch',
    description,
    reason,
    status: 'pending',
    requestedBy: guardianId,
  });
  res.status(201).json({ success: true, data: request });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/meals/nutrition
 * تقرير التغذية
 */
exports.getNutritionReport = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const MealPlan = _getModel('GuardianMealPlan');
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const meals = await MealPlan.find({
    beneficiaryId,
    recordType: { $ne: 'dietary_profile' },
    date: { $gte: last30 },
  });
  res.json({
    success: true,
    data: {
      totalMeals: meals.length,
      period: '30_days',
      meals,
    },
  });
});

// ==================== معرض الصور GALLERY ====================

/**
 * GET /api/guardian/gallery
 * ألبومات الصور
 */
exports.getGallery = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian) return res.status(404).json({ success: false, message: 'ولي الأمر غير موجود' });
  const Gallery = _getModel('GuardianGallery');
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const query = {
    $or: [{ visibility: 'public' }, { beneficiaryId: { $in: guardian.beneficiaries } }],
  };
  if (req.query.category) query.category = req.query.category;
  const [items, total] = await Promise.all([
    Gallery.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Gallery.countDocuments(query),
  ]);
  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/gallery/albums
 * قائمة الألبومات
 */
exports.getGalleryAlbums = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian) return res.status(404).json({ success: false, message: 'غير موجود' });
  const Gallery = _getModel('GuardianGallery');
  const albums = await Gallery.aggregate([
    {
      $match: {
        $or: [{ visibility: 'public' }, { beneficiaryId: { $in: guardian.beneficiaries } }],
      },
    },
    {
      $group: {
        _id: '$albumName',
        count: { $sum: 1 },
        cover: { $first: '$thumbnailUrl' },
        lastDate: { $max: '$createdAt' },
      },
    },
    { $sort: { lastDate: -1 } },
  ]);
  res.json({ success: true, data: albums });
});

/**
 * GET /api/guardian/gallery/:mediaId
 * تفاصيل صورة/فيديو
 */
exports.getGalleryItem = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian) return res.status(404).json({ success: false, message: 'غير موجود' });
  const Gallery = _getModel('GuardianGallery');
  const item = await Gallery.findById(req.params.mediaId);
  if (!item) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
  res.json({ success: true, data: item });
});

/**
 * POST /api/guardian/gallery/:mediaId/download
 * طلب تنزيل صورة/فيديو
 */
exports.downloadGalleryItem = catchAsync(async (req, res) => {
  const Gallery = _getModel('GuardianGallery');
  const item = await Gallery.findById(req.params.mediaId);
  if (!item) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
  await Gallery.findByIdAndUpdate(req.params.mediaId, { $inc: { downloadCount: 1 } });
  res.json({ success: true, data: { url: item.fileUrl, filename: item.filename } });
});

// ==================== الواجبات والمهام HOMEWORK ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/homework
 * قائمة الواجبات
 */
exports.getBeneficiaryHomework = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Homework = _getModel('GuardianHomework');
  const page = parseInt(req.query.page) || 1;
  const limit = 15;
  const query = { beneficiaryId };
  if (req.query.status) query.status = req.query.status;
  const [items, total] = await Promise.all([
    Homework.find(query)
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Homework.countDocuments(query),
  ]);
  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/homework/:homeworkId
 * تفاصيل واجب
 */
exports.getHomeworkDetail = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, homeworkId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Homework = _getModel('GuardianHomework');
  const homework = await Homework.findOne({ _id: homeworkId, beneficiaryId });
  if (!homework) return res.status(404).json({ success: false, message: 'الواجب غير موجود' });
  res.json({ success: true, data: homework });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/homework/pending
 * الواجبات المعلقة
 */
exports.getPendingHomework = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Homework = _getModel('GuardianHomework');
  const pending = await Homework.find({
    beneficiaryId,
    status: { $in: ['assigned', 'in_progress'] },
    dueDate: { $gte: new Date() },
  }).sort({ dueDate: 1 });
  res.json({ success: true, data: pending });
});

/**
 * POST /api/guardian/beneficiaries/:beneficiaryId/homework/:homeworkId/acknowledge
 * تأكيد استلام الواجب
 */
exports.acknowledgeHomework = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, homeworkId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Homework = _getModel('GuardianHomework');
  const homework = await Homework.findOneAndUpdate(
    { _id: homeworkId, beneficiaryId },
    { guardianAcknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: guardianId },
    { new: true }
  );
  if (!homework) return res.status(404).json({ success: false, message: 'الواجب غير موجود' });
  res.json({ success: true, data: homework });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/homework/stats
 * إحصائيات الواجبات
 */
exports.getHomeworkStats = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Homework = _getModel('GuardianHomework');
  const [total, completed, pending, overdue] = await Promise.all([
    Homework.countDocuments({ beneficiaryId }),
    Homework.countDocuments({ beneficiaryId, status: 'completed' }),
    Homework.countDocuments({ beneficiaryId, status: { $in: ['assigned', 'in_progress'] } }),
    Homework.countDocuments({
      beneficiaryId,
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date() },
    }),
  ]);
  res.json({
    success: true,
    data: {
      total,
      completed,
      pending,
      overdue,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    },
  });
});

// ==================== الشهادات والإنجازات CERTIFICATES ====================

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/certificates
 * قائمة الشهادات
 */
exports.getBeneficiaryCertificates = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Certificate = _getModel('GuardianCertificate');
  const certs = await Certificate.find({ beneficiaryId }).sort({ issuedDate: -1 });
  res.json({ success: true, data: certs });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/certificates/:certId
 * تفاصيل شهادة
 */
exports.getCertificateDetail = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId, certId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Certificate = _getModel('GuardianCertificate');
  const cert = await Certificate.findOne({ _id: certId, beneficiaryId });
  if (!cert) return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
  res.json({ success: true, data: cert });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/certificates/:certId/download
 * تنزيل شهادة
 */
exports.downloadCertificate = catchAsync(async (req, res) => {
  const { beneficiaryId, certId } = req.params;
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Certificate = _getModel('GuardianCertificate');
  const cert = await Certificate.findOne({ _id: certId, beneficiaryId });
  if (!cert) return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
  await Certificate.findByIdAndUpdate(certId, { $inc: { downloadCount: 1 } });
  res.json({
    success: true,
    data: { url: cert.fileUrl, filename: cert.filename || `certificate-${certId}.pdf` },
  });
});

/**
 * GET /api/guardian/beneficiaries/:beneficiaryId/achievements
 * الإنجازات والأوسمة
 */
exports.getBeneficiaryAchievements = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { beneficiaryId } = req.params;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian || !guardian.beneficiaries.map(String).includes(beneficiaryId)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  const Certificate = _getModel('GuardianCertificate');
  const achievements = await Certificate.find({ beneficiaryId, type: 'achievement' }).sort({
    issuedDate: -1,
  });
  res.json({ success: true, data: achievements });
});

// ==================== تصاريح الزيارة VISITOR PASS ====================

/**
 * GET /api/guardian/visitor-passes
 * قائمة تصاريح الزيارة
 */
exports.getVisitorPasses = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const VisitorPass = _getModel('GuardianVisitorPass');
  const passes = await VisitorPass.find({ guardianId }).sort({ visitDate: -1 }).limit(30);
  res.json({ success: true, data: passes });
});

/**
 * POST /api/guardian/visitor-passes
 * طلب تصريح زيارة
 */
exports.requestVisitorPass = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { visitDate, visitTime, purpose, visitorName, visitorId, beneficiaryId, duration } =
    req.body;
  if (!visitDate || !purpose) {
    return res.status(400).json({ success: false, message: 'visitDate and purpose required' });
  }
  const VisitorPass = _getModel('GuardianVisitorPass');
  const pass = await VisitorPass.create({
    guardianId,
    beneficiaryId,
    visitDate: new Date(visitDate),
    visitTime: visitTime || '09:00',
    purpose,
    visitorName: visitorName || req.user.name,
    visitorId,
    duration: duration || 60,
    status: 'pending',
    requestedAt: new Date(),
  });
  res.status(201).json({ success: true, data: pass });
});

/**
 * GET /api/guardian/visitor-passes/:passId
 * تفاصيل تصريح
 */
exports.getVisitorPassDetail = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const VisitorPass = _getModel('GuardianVisitorPass');
  const pass = await VisitorPass.findOne({ _id: req.params.passId, guardianId });
  if (!pass) return res.status(404).json({ success: false, message: 'التصريح غير موجود' });
  res.json({ success: true, data: pass });
});

/**
 * DELETE /api/guardian/visitor-passes/:passId
 * إلغاء تصريح زيارة
 */
exports.cancelVisitorPass = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const VisitorPass = _getModel('GuardianVisitorPass');
  const pass = await VisitorPass.findOneAndUpdate(
    { _id: req.params.passId, guardianId, status: 'pending' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!pass) return res.status(404).json({ success: false, message: 'لا يمكن إلغاء هذا التصريح' });
  res.json({ success: true, data: pass });
});

/**
 * GET /api/guardian/visitor-passes/upcoming
 * الزيارات القادمة
 */
exports.getUpcomingVisits = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const VisitorPass = _getModel('GuardianVisitorPass');
  const passes = await VisitorPass.find({
    guardianId,
    visitDate: { $gte: new Date() },
    status: { $in: ['pending', 'approved'] },
  })
    .sort({ visitDate: 1 })
    .limit(10);
  res.json({ success: true, data: passes });
});

// ==================== حجز المرافق FACILITY BOOKING ====================

/**
 * GET /api/guardian/facilities
 * قائمة المرافق المتاحة
 */
exports.getFacilities = catchAsync(async (req, res) => {
  const FacilityBooking = _getModel('GuardianFacilityBooking');
  const facilities = await FacilityBooking.distinct('facilityName');
  const facilityList = facilities.map(name => ({ name, available: true }));
  res.json({ success: true, data: facilityList });
});

/**
 * POST /api/guardian/facilities/book
 * حجز مرفق
 */
exports.bookFacility = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const { facilityName, date, startTime, endTime, purpose, beneficiaryId } = req.body;
  if (!facilityName || !date || !startTime) {
    return res
      .status(400)
      .json({ success: false, message: 'facilityName, date and startTime required' });
  }
  const FacilityBooking = _getModel('GuardianFacilityBooking');
  // Check for conflicts
  const conflict = await FacilityBooking.findOne({
    facilityName,
    date: new Date(date),
    startTime,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (conflict) {
    return res.status(409).json({ success: false, message: 'المرفق محجوز في هذا الوقت' });
  }
  const booking = await FacilityBooking.create({
    guardianId,
    beneficiaryId,
    facilityName,
    date: new Date(date),
    startTime,
    endTime: endTime || null,
    purpose,
    status: 'pending',
  });
  res.status(201).json({ success: true, data: booking });
});

/**
 * GET /api/guardian/facilities/bookings
 * حجوزاتي
 */
exports.getMyFacilityBookings = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const FacilityBooking = _getModel('GuardianFacilityBooking');
  const bookings = await FacilityBooking.find({ guardianId }).sort({ date: -1 }).limit(30);
  res.json({ success: true, data: bookings });
});

/**
 * DELETE /api/guardian/facilities/bookings/:bookingId
 * إلغاء حجز مرفق
 */
exports.cancelFacilityBooking = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const FacilityBooking = _getModel('GuardianFacilityBooking');
  const booking = await FacilityBooking.findOneAndUpdate(
    { _id: req.params.bookingId, guardianId, status: { $in: ['pending', 'confirmed'] } },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!booking) return res.status(404).json({ success: false, message: 'لا يمكن إلغاء هذا الحجز' });
  res.json({ success: true, data: booking });
});

/**
 * GET /api/guardian/facilities/availability
 * التحقق من توفر مرفق
 */
exports.checkFacilityAvailability = catchAsync(async (req, res) => {
  const { facilityName, date } = req.query;
  const FacilityBooking = _getModel('GuardianFacilityBooking');
  const existingBookings = await FacilityBooking.find({
    facilityName: facilityName || '',
    date: date ? new Date(date) : new Date(),
    status: { $in: ['pending', 'confirmed'] },
  }).select('startTime endTime');
  const allSlots = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
  ];
  const bookedSlots = existingBookings.map(b => b.startTime);
  const available = allSlots.filter(s => !bookedSlots.includes(s));
  res.json({
    success: true,
    data: { facility: facilityName, date, available, booked: bookedSlots },
  });
});

// ==================== تقييم الرضا SATISFACTION ====================

/**
 * GET /api/guardian/satisfaction
 * تقييمات الرضا السابقة
 */
exports.getSatisfactionRatings = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const Satisfaction = _getModel('GuardianSatisfaction');
  const ratings = await Satisfaction.find({ guardianId }).sort({ createdAt: -1 }).limit(20);
  res.json({ success: true, data: ratings });
});

/**
 * POST /api/guardian/satisfaction
 * تقديم تقييم رضا
 */
exports.submitSatisfaction = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const {
    serviceType,
    overallRating,
    staffRating,
    facilityRating,
    communicationRating,
    comment,
    suggestions,
  } = req.body;
  if (!serviceType || !overallRating) {
    return res
      .status(400)
      .json({ success: false, message: 'serviceType and overallRating required' });
  }
  const Satisfaction = _getModel('GuardianSatisfaction');
  const rating = await Satisfaction.create({
    guardianId,
    serviceType,
    overallRating,
    staffRating: staffRating || null,
    facilityRating: facilityRating || null,
    communicationRating: communicationRating || null,
    comment,
    suggestions,
    submittedAt: new Date(),
  });
  res.status(201).json({ success: true, data: rating });
});

/**
 * GET /api/guardian/satisfaction/pending
 * تقييمات الرضا المطلوبة
 */
exports.getPendingSatisfaction = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const Satisfaction = _getModel('GuardianSatisfaction');
  const completed = await Satisfaction.find({ guardianId }).select('serviceType');
  const allServices = [
    'therapy',
    'education',
    'transportation',
    'nutrition',
    'administration',
    'facilities',
    'communication',
  ];
  const completedTypes = completed.map(c => c.serviceType);
  const pending = allServices.filter(s => !completedTypes.includes(s));
  res.json({ success: true, data: pending });
});

/**
 * GET /api/guardian/satisfaction/summary
 * ملخص التقييمات
 */
exports.getSatisfactionSummary = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const Satisfaction = _getModel('GuardianSatisfaction');
  const ratings = await Satisfaction.find({ guardianId });
  const totalRatings = ratings.length;
  const avgOverall = ratings.reduce((a, r) => a + (r.overallRating || 0), 0) / (totalRatings || 1);
  const byService = {};
  ratings.forEach(r => {
    if (!byService[r.serviceType]) byService[r.serviceType] = [];
    byService[r.serviceType].push(r.overallRating);
  });
  const serviceSummary = Object.entries(byService).map(([service, scores]) => ({
    service,
    average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    count: scores.length,
  }));
  res.json({
    success: true,
    data: {
      totalRatings,
      averageOverall: Math.round(avgOverall * 10) / 10,
      byService: serviceSummary,
    },
  });
});

// ==================== التقويم الأكاديمي ACADEMIC CALENDAR ====================

/**
 * GET /api/guardian/academic-calendar
 * التقويم الأكاديمي
 */
exports.getAcademicCalendar = catchAsync(async (req, res) => {
  const AcademicCalendar = _getModel('GuardianAcademicCalendar');
  const { year, month } = req.query;
  const query = {};
  if (year) {
    const startDate = new Date(`${year}-${month || '01'}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (month ? 1 : 12));
    query.date = { $gte: startDate, $lt: endDate };
  }
  const events = await AcademicCalendar.find(query).sort({ date: 1 });
  res.json({ success: true, data: events });
});

/**
 * GET /api/guardian/academic-calendar/holidays
 * العطل الرسمية
 */
exports.getHolidays = catchAsync(async (req, res) => {
  const AcademicCalendar = _getModel('GuardianAcademicCalendar');
  const holidays = await AcademicCalendar.find({ eventType: 'holiday' }).sort({ date: 1 });
  res.json({ success: true, data: holidays });
});

/**
 * GET /api/guardian/academic-calendar/important-dates
 * التواريخ المهمة
 */
exports.getImportantDates = catchAsync(async (req, res) => {
  const AcademicCalendar = _getModel('GuardianAcademicCalendar');
  const dates = await AcademicCalendar.find({
    eventType: { $in: ['exam', 'event', 'deadline', 'meeting'] },
    date: { $gte: new Date() },
  })
    .sort({ date: 1 })
    .limit(20);
  res.json({ success: true, data: dates });
});

// ==================== مشاركة الأسرة FAMILY ENGAGEMENT ====================

/**
 * GET /api/guardian/family-engagement
 * برامج مشاركة الأسرة
 */
exports.getFamilyEngagement = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const FamilyEngagement = _getModel('GuardianFamilyEngagement');
  const programs = await FamilyEngagement.find({
    $or: [{ guardianId }, { visibility: 'all' }],
  })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ success: true, data: programs });
});

/**
 * GET /api/guardian/family-engagement/:programId
 * تفاصيل برنامج
 */
exports.getFamilyEngagementDetail = catchAsync(async (req, res) => {
  const FamilyEngagement = _getModel('GuardianFamilyEngagement');
  const program = await FamilyEngagement.findById(req.params.programId);
  if (!program) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
  res.json({ success: true, data: program });
});

/**
 * POST /api/guardian/family-engagement/:programId/enroll
 * التسجيل في برنامج
 */
exports.enrollFamilyProgram = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const FamilyEngagement = _getModel('GuardianFamilyEngagement');
  const program = await FamilyEngagement.findById(req.params.programId);
  if (!program) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
  const alreadyEnrolled =
    program.enrolledGuardians &&
    program.enrolledGuardians.map(String).includes(guardianId.toString());
  if (alreadyEnrolled) {
    return res.status(409).json({ success: false, message: 'أنت مسجل بالفعل' });
  }
  await FamilyEngagement.findByIdAndUpdate(req.params.programId, {
    $addToSet: { enrolledGuardians: guardianId },
    $inc: { enrollmentCount: 1 },
  });
  res.json({ success: true, message: 'تم التسجيل بنجاح' });
});

/**
 * GET /api/guardian/family-engagement/home-activities
 * الأنشطة المنزلية
 */
exports.getHomeActivities = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId);
  if (!guardian) return res.status(404).json({ success: false, message: 'غير موجود' });
  const FamilyEngagement = _getModel('GuardianFamilyEngagement');
  const activities = await FamilyEngagement.find({
    type: 'home_activity',
    $or: [{ beneficiaryId: { $in: guardian.beneficiaries } }, { visibility: 'all' }],
  })
    .sort({ createdAt: -1 })
    .limit(15);
  res.json({ success: true, data: activities });
});

// ==================== مقارنة الأشقاء SIBLINGS COMPARISON ====================

/**
 * GET /api/guardian/siblings/comparison
 * مقارنة التقدم بين الأشقاء
 */
exports.getSiblingsComparison = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', 'name status');
  if (!guardian || !guardian.beneficiaries.length) {
    return res.status(404).json({ success: false, message: 'لا يوجد مستفيدين' });
  }
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);
  const progressData = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
  })
    .sort({ month: -1 })
    .limit(beneficiaryIds.length * 6);

  const comparison = guardian.beneficiaries.map(ben => {
    const benProgress = progressData.filter(p => p.beneficiaryId.toString() === ben._id.toString());
    const latest = benProgress[0];
    return {
      beneficiary: { _id: ben._id, name: ben.name, status: ben.status },
      latestProgress: latest
        ? {
            academicScore: latest.academicScore,
            attendanceRate: latest.attendanceRate,
            behaviorRating: latest.behaviorRating,
            overallPerformance: latest.overallPerformance,
            month: latest.month,
          }
        : null,
      totalRecords: benProgress.length,
    };
  });
  res.json({ success: true, data: comparison });
});

/**
 * GET /api/guardian/siblings/attendance-comparison
 * مقارنة الحضور بين الأشقاء
 */
exports.getSiblingsAttendanceComparison = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', 'name');
  if (!guardian || !guardian.beneficiaries.length) {
    return res.status(404).json({ success: false, message: 'لا يوجد مستفيدين' });
  }
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);
  const progressData = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
  })
    .sort({ month: -1 })
    .limit(beneficiaryIds.length * 12);

  const comparison = guardian.beneficiaries.map(ben => {
    const benProgress = progressData.filter(p => p.beneficiaryId.toString() === ben._id.toString());
    const attendanceRates = benProgress.filter(p => p.attendanceRate).map(p => p.attendanceRate);
    return {
      beneficiary: { _id: ben._id, name: ben.name },
      averageAttendance: attendanceRates.length
        ? Math.round(attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length)
        : 0,
      totalAbsenceDays: benProgress.reduce((a, p) => a + (p.absenceDays || 0), 0),
      totalLateDays: benProgress.reduce((a, p) => a + (p.lateDays || 0), 0),
      months: benProgress.map(p => ({ month: p.month, rate: p.attendanceRate })),
    };
  });
  res.json({ success: true, data: comparison });
});

/**
 * GET /api/guardian/siblings/academic-comparison
 * مقارنة الأداء الأكاديمي بين الأشقاء
 */
exports.getSiblingsAcademicComparison = catchAsync(async (req, res) => {
  const guardianId = req.user._id;
  const guardian = await Guardian.findById(guardianId).populate('beneficiaries', 'name');
  if (!guardian || !guardian.beneficiaries.length) {
    return res.status(404).json({ success: false, message: 'لا يوجد مستفيدين' });
  }
  const beneficiaryIds = guardian.beneficiaries.map(b => b._id);
  const progressData = await BeneficiaryProgress.find({
    beneficiaryId: { $in: beneficiaryIds },
  })
    .sort({ month: -1 })
    .limit(beneficiaryIds.length * 12);

  const comparison = guardian.beneficiaries.map(ben => {
    const benProgress = progressData.filter(p => p.beneficiaryId.toString() === ben._id.toString());
    const scores = benProgress.filter(p => p.academicScore).map(p => p.academicScore);
    return {
      beneficiary: { _id: ben._id, name: ben.name },
      averageScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0,
      improvement: scores.length >= 2 ? scores[0] - scores[scores.length - 1] : 0,
      months: benProgress.map(p => ({ month: p.month, score: p.academicScore })),
    };
  });
  res.json({ success: true, data: comparison });
});

// ═══════════════════════════════════════════════════════════════════════════
// VOLUNTEER PROGRAMS (برامج التطوع)
// ═══════════════════════════════════════════════════════════════════════════

exports.getVolunteerPrograms = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const Model = _getModel('GuardianVolunteerProgram');
  const items = await Model.find({ status: { $in: ['upcoming', 'active'] } })
    .sort({ startDate: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Model.countDocuments({ status: { $in: ['upcoming', 'active'] } });
  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getVolunteerProgramDetail = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianVolunteerProgram');
  const item = await Model.findById(req.params.programId).lean();
  if (!item) throw new AppError('البرنامج غير موجود', 404);
  res.json({ success: true, data: item });
});

exports.enrollVolunteer = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianVolunteerProgram');
  const program = await Model.findById(req.params.programId);
  if (!program) throw new AppError('البرنامج غير موجود', 404);
  if (program.maxVolunteers && program.enrolledVolunteers.length >= program.maxVolunteers) {
    throw new AppError('البرنامج مكتمل', 400);
  }
  if (!program.enrolledVolunteers.includes(req.user._id)) {
    program.enrolledVolunteers.push(req.user._id);
    program.enrollmentCount = program.enrolledVolunteers.length;
    await program.save();
  }
  res.json({ success: true, message: 'تم التسجيل بنجاح', data: program });
});

exports.getMyVolunteerHistory = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianVolunteerProgram');
  const items = await Model.find({ enrolledVolunteers: req.user._id })
    .sort({ startDate: -1 })
    .lean();
  res.json({ success: true, data: items });
});

exports.getVolunteerCertificate = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianVolunteerProgram');
  const program = await Model.findById(req.params.programId).lean();
  if (!program) throw new AppError('البرنامج غير موجود', 404);
  res.json({
    success: true,
    data: {
      programName: program.title,
      volunteerName: req.user.name || 'ولي الأمر',
      hours: program.hours || 0,
      completionDate: program.endDate,
      certificateUrl: `/certificates/volunteer/${program._id}/${req.user._id}`,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DAILY REPORTS (التقارير اليومية)
// ═══════════════════════════════════════════════════════════════════════════

exports.getDailyReports = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const Model = _getModel('GuardianDailyReport');
  const filter = { beneficiaryId };
  const items = await Model.find(filter)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Model.countDocuments(filter);
  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getDailyReportDetail = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianDailyReport');
  const item = await Model.findById(req.params.reportId).lean();
  if (!item) throw new AppError('التقرير غير موجود', 404);
  res.json({ success: true, data: item });
});

exports.getDailyReportByDate = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const { date } = req.query;
  const Model = _getModel('GuardianDailyReport');
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
  const reports = await Model.find({
    beneficiaryId,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).lean();
  res.json({ success: true, data: reports });
});

exports.subscribeDailyReport = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const { channels, frequency } = req.body;
  res.status(200).json({
    success: true,
    message: 'تم تسجيل الاشتراك بنجاح',
    data: { beneficiaryId, channels: channels || ['email'], frequency: frequency || 'daily' },
  });
});

exports.getDailyReportSummary = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianDailyReport');
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const reports = await Model.find({ beneficiaryId, date: { $gte: weekAgo } }).lean();
  const moodAvg = reports.filter(r => r.mood).length
    ? Math.round(
        reports.reduce((s, r) => s + (r.mood || 0), 0) / reports.filter(r => r.mood).length
      )
    : 0;
  res.json({
    success: true,
    data: {
      totalReports: reports.length,
      averageMood: moodAvg,
      lastReportDate: reports[0]?.date || null,
      weeklyHighlights: reports
        .slice(0, 3)
        .map(r => r.highlights || r.notes)
        .filter(Boolean),
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MEDICAL APPOINTMENTS (المواعيد الطبية)
// ═══════════════════════════════════════════════════════════════════════════

exports.getMedicalAppointments = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const Model = _getModel('GuardianMedicalAppointment');
  const guardian = await mongoose.model('Guardian').findOne({ userId: req.user._id }).lean();
  const beneficiaryIds = guardian ? guardian.beneficiaries.map(b => b._id) : [];
  const items = await Model.find({ beneficiaryId: { $in: beneficiaryIds } })
    .sort({ appointmentDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Model.countDocuments({ beneficiaryId: { $in: beneficiaryIds } });
  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.bookMedicalAppointment = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianMedicalAppointment');
  const { beneficiaryId, doctorName, specialty, appointmentDate, appointmentTime, notes } =
    req.body;
  const item = await Model.create({
    guardianId: req.user._id,
    beneficiaryId,
    doctorName,
    specialty,
    appointmentDate,
    appointmentTime,
    notes,
    status: 'scheduled',
  });
  res.status(201).json({ success: true, message: 'تم حجز الموعد الطبي', data: item });
});

exports.getMedicalAppointmentDetail = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianMedicalAppointment');
  const item = await Model.findById(req.params.appointmentId).lean();
  if (!item) throw new AppError('الموعد غير موجود', 404);
  res.json({ success: true, data: item });
});

exports.cancelMedicalAppointment = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianMedicalAppointment');
  const item = await Model.findByIdAndUpdate(
    req.params.appointmentId,
    { status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body.reason },
    { new: true }
  );
  if (!item) throw new AppError('الموعد غير موجود', 404);
  res.json({ success: true, message: 'تم إلغاء الموعد', data: item });
});

exports.getMedicalHistory = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianMedicalAppointment');
  const items = await Model.find({ beneficiaryId, status: 'completed' })
    .sort({ appointmentDate: -1 })
    .lean();
  res.json({ success: true, data: items });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTION BOX (صندوق الاقتراحات)
// ═══════════════════════════════════════════════════════════════════════════

exports.getSuggestions = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianSuggestion');
  const items = await Model.find({ guardianId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

exports.submitSuggestion = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianSuggestion');
  const { title, description, category, priority } = req.body;
  const item = await Model.create({
    guardianId: req.user._id,
    title,
    description,
    category: category || 'general',
    priority: priority || 'medium',
    status: 'submitted',
  });
  res.status(201).json({ success: true, message: 'تم تقديم الاقتراح بنجاح', data: item });
});

exports.getSuggestionDetail = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianSuggestion');
  const item = await Model.findById(req.params.suggestionId).lean();
  if (!item) throw new AppError('الاقتراح غير موجود', 404);
  res.json({ success: true, data: item });
});

exports.getSuggestionStats = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianSuggestion');
  const total = await Model.countDocuments({ guardianId: req.user._id });
  const byStatus = await Model.aggregate([
    { $match: { guardianId: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json({
    success: true,
    data: { total, byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}) },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PARENT TRAINING (تدريب أولياء الأمور)
// ═══════════════════════════════════════════════════════════════════════════

exports.getParentTrainings = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const Model = _getModel('GuardianParentTraining');
  const items = await Model.find({ status: { $in: ['upcoming', 'active'] } })
    .sort({ startDate: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Model.countDocuments({ status: { $in: ['upcoming', 'active'] } });
  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.getParentTrainingDetail = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianParentTraining');
  const item = await Model.findById(req.params.trainingId).lean();
  if (!item) throw new AppError('الدورة غير موجودة', 404);
  res.json({ success: true, data: item });
});

exports.enrollParentTraining = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianParentTraining');
  const training = await Model.findById(req.params.trainingId);
  if (!training) throw new AppError('الدورة غير موجودة', 404);
  if (training.maxParticipants && training.enrolledParents.length >= training.maxParticipants) {
    throw new AppError('الدورة مكتملة', 400);
  }
  if (!training.enrolledParents.includes(req.user._id)) {
    training.enrolledParents.push(req.user._id);
    training.enrollmentCount = training.enrolledParents.length;
    await training.save();
  }
  res.json({ success: true, message: 'تم التسجيل في الدورة', data: training });
});

exports.getMyTrainingHistory = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianParentTraining');
  const items = await Model.find({ enrolledParents: req.user._id }).sort({ startDate: -1 }).lean();
  res.json({ success: true, data: items });
});

exports.getTrainingCertificates = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianParentTraining');
  const completed = await Model.find({
    enrolledParents: req.user._id,
    status: 'completed',
  }).lean();
  const certs = completed.map(t => ({
    trainingId: t._id,
    title: t.title,
    completionDate: t.endDate,
    hours: t.hours,
    certificateUrl: `/certificates/training/${t._id}/${req.user._id}`,
  }));
  res.json({ success: true, data: certs });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHILD SAFETY (سلامة الطفل)
// ═══════════════════════════════════════════════════════════════════════════

exports.getSafetyAlerts = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianChildSafety');
  const guardian = await mongoose.model('Guardian').findOne({ userId: req.user._id }).lean();
  const beneficiaryIds = guardian ? guardian.beneficiaries.map(b => b._id) : [];
  const items = await Model.find({
    beneficiaryId: { $in: beneficiaryIds },
    type: 'alert',
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: items });
});

exports.getSafetyPolicies = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianChildSafety');
  const policies = await Model.find({ type: 'policy' }).sort({ priority: -1 }).lean();
  res.json({ success: true, data: policies });
});

exports.reportSafetyConcern = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianChildSafety');
  const { beneficiaryId, description, severity, category } = req.body;
  const item = await Model.create({
    guardianId: req.user._id,
    beneficiaryId,
    type: 'concern',
    description,
    severity: severity || 'medium',
    category: category || 'general',
    status: 'reported',
  });
  res.status(201).json({ success: true, message: 'تم تقديم البلاغ', data: item });
});

exports.getSafetyConcernStatus = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianChildSafety');
  const item = await Model.findById(req.params.concernId).lean();
  if (!item) throw new AppError('البلاغ غير موجود', 404);
  res.json({ success: true, data: item });
});

exports.getSafetyTraining = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianChildSafety');
  const training = await Model.find({ type: 'training' }).sort({ priority: -1 }).lean();
  res.json({ success: true, data: training });
});

// ═══════════════════════════════════════════════════════════════════════════
// LEARNING PATHS (المسارات التعليمية)
// ═══════════════════════════════════════════════════════════════════════════

exports.getLearningPaths = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianLearningPath');
  const items = await Model.find({ beneficiaryId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

exports.getLearningPathDetail = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianLearningPath');
  const item = await Model.findById(req.params.pathId).lean();
  if (!item) throw new AppError('المسار غير موجود', 404);
  res.json({ success: true, data: item });
});

exports.getBeneficiaryLearningProgress = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianLearningPath');
  const paths = await Model.find({ beneficiaryId }).lean();
  const totalMilestones = paths.reduce((s, p) => s + (p.milestones?.length || 0), 0);
  const completedMilestones = paths.reduce(
    (s, p) => s + (p.milestones?.filter(m => m.completed).length || 0),
    0
  );
  res.json({
    success: true,
    data: {
      totalPaths: paths.length,
      activePaths: paths.filter(p => p.status === 'active').length,
      completedPaths: paths.filter(p => p.status === 'completed').length,
      totalMilestones,
      completedMilestones,
      overallProgress: totalMilestones
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0,
    },
  });
});

exports.getRecommendedResources = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianLearningPath');
  const paths = await Model.find({ beneficiaryId, status: 'active' }).lean();
  const resources = paths.flatMap(p => p.recommendedResources || []);
  res.json({ success: true, data: resources });
});

exports.getSkillAssessments = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianLearningPath');
  const paths = await Model.find({ beneficiaryId }).lean();
  const assessments = paths.flatMap(p => p.assessments || []);
  res.json({ success: true, data: assessments });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNICATION PREFERENCES (تفضيلات التواصل)
// ═══════════════════════════════════════════════════════════════════════════

exports.getCommunicationPreferences = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianCommunicationPref');
  let prefs = await Model.findOne({ guardianId: req.user._id }).lean();
  if (!prefs) {
    prefs = {
      guardianId: req.user._id,
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      whatsappNotifications: false,
      preferredLanguage: 'ar',
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
  }
  res.json({ success: true, data: prefs });
});

exports.updateCommunicationPreferences = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianCommunicationPref');
  const prefs = await Model.findOneAndUpdate(
    { guardianId: req.user._id },
    { ...req.body, guardianId: req.user._id },
    { new: true, upsert: true }
  );
  res.json({ success: true, message: 'تم تحديث تفضيلات التواصل', data: prefs });
});

exports.getPreferredChannels = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianCommunicationPref');
  const prefs = await Model.findOne({ guardianId: req.user._id }).lean();
  const channels = [];
  if (prefs?.emailNotifications) channels.push('email');
  if (prefs?.smsNotifications) channels.push('sms');
  if (prefs?.pushNotifications) channels.push('push');
  if (prefs?.whatsappNotifications) channels.push('whatsapp');
  res.json({ success: true, data: { channels: channels.length ? channels : ['email', 'sms'] } });
});

exports.updatePreferredChannels = catchAsync(async (req, res) => {
  const { channels } = req.body;
  const Model = _getModel('GuardianCommunicationPref');
  const update = {
    guardianId: req.user._id,
    emailNotifications: channels?.includes('email') || false,
    smsNotifications: channels?.includes('sms') || false,
    pushNotifications: channels?.includes('push') || false,
    whatsappNotifications: channels?.includes('whatsapp') || false,
  };
  const prefs = await Model.findOneAndUpdate({ guardianId: req.user._id }, update, {
    new: true,
    upsert: true,
  });
  res.json({ success: true, message: 'تم تحديث قنوات التواصل', data: prefs });
});

// ═══════════════════════════════════════════════════════════════════════════
// GIFTED PROGRAM (برنامج الموهوبين)
// ═══════════════════════════════════════════════════════════════════════════

exports.getGiftedPrograms = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianGiftedProgram');
  const items = await Model.find({ status: { $in: ['upcoming', 'active'] } })
    .sort({ startDate: 1 })
    .lean();
  res.json({ success: true, data: items });
});

exports.getGiftedProgramDetail = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianGiftedProgram');
  const item = await Model.findById(req.params.programId).lean();
  if (!item) throw new AppError('البرنامج غير موجود', 404);
  res.json({ success: true, data: item });
});

exports.nominateBeneficiary = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianGiftedProgram');
  const { beneficiaryId, reason, skills } = req.body;
  const program = await Model.findById(req.params.programId);
  if (!program) throw new AppError('البرنامج غير موجود', 404);
  program.nominations = program.nominations || [];
  program.nominations.push({
    guardianId: req.user._id,
    beneficiaryId,
    reason,
    skills: skills || [],
    nominatedAt: new Date(),
    status: 'pending',
  });
  await program.save();
  res.status(201).json({ success: true, message: 'تم ترشيح المستفيد بنجاح', data: program });
});

exports.getGiftedAssessments = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianGiftedProgram');
  const programs = await Model.find({ 'nominations.beneficiaryId': beneficiaryId }).lean();
  const assessments = programs.flatMap(p =>
    (p.nominations || [])
      .filter(n => n.beneficiaryId?.toString() === beneficiaryId)
      .map(n => ({ programId: p._id, programTitle: p.title, ...n }))
  );
  res.json({ success: true, data: assessments });
});

exports.getGiftedProgress = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianGiftedProgram');
  const enrolled = await Model.find({
    'nominations.beneficiaryId': beneficiaryId,
    'nominations.status': 'accepted',
  }).lean();
  res.json({
    success: true,
    data: {
      totalPrograms: enrolled.length,
      activePrograms: enrolled.filter(p => p.status === 'active').length,
      completedPrograms: enrolled.filter(p => p.status === 'completed').length,
      programs: enrolled.map(p => ({ _id: p._id, title: p.title, status: p.status })),
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SLEEP & WELLBEING (النوم والرفاهية)
// ═══════════════════════════════════════════════════════════════════════════

exports.getSleepLog = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 30;
  const Model = _getModel('GuardianWellbeing');
  const items = await Model.find({ beneficiaryId, type: 'sleep' })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const total = await Model.countDocuments({ beneficiaryId, type: 'sleep' });
  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.addSleepEntry = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const { date, sleepTime, wakeTime, quality, notes } = req.body;
  const Model = _getModel('GuardianWellbeing');
  const item = await Model.create({
    guardianId: req.user._id,
    beneficiaryId,
    type: 'sleep',
    date: date || new Date(),
    sleepTime,
    wakeTime,
    quality,
    notes,
  });
  res.status(201).json({ success: true, message: 'تم تسجيل بيانات النوم', data: item });
});

exports.getWellbeingAssessment = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianWellbeing');
  const latest = await Model.findOne({ beneficiaryId, type: 'assessment' })
    .sort({ date: -1 })
    .lean();
  res.json({ success: true, data: latest || { message: 'لا يوجد تقييم بعد' } });
});

exports.submitWellbeingAssessment = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const { mood, energy, appetite, socialInteraction, notes } = req.body;
  const Model = _getModel('GuardianWellbeing');
  const item = await Model.create({
    guardianId: req.user._id,
    beneficiaryId,
    type: 'assessment',
    date: new Date(),
    mood,
    energy,
    appetite,
    socialInteraction,
    notes,
  });
  res.status(201).json({ success: true, message: 'تم تقديم تقييم الرفاهية', data: item });
});

exports.getWellbeingTrend = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianWellbeing');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const items = await Model.find({
    beneficiaryId,
    date: { $gte: thirtyDaysAgo },
  })
    .sort({ date: 1 })
    .lean();
  const sleepEntries = items.filter(i => i.type === 'sleep');
  const assessments = items.filter(i => i.type === 'assessment');
  res.json({
    success: true,
    data: {
      sleepTrend: sleepEntries.map(e => ({ date: e.date, quality: e.quality })),
      moodTrend: assessments.map(a => ({ date: a.date, mood: a.mood, energy: a.energy })),
      averageSleepQuality: sleepEntries.length
        ? Math.round(sleepEntries.reduce((s, e) => s + (e.quality || 0), 0) / sleepEntries.length)
        : 0,
      averageMood: assessments.length
        ? Math.round(assessments.reduce((s, a) => s + (a.mood || 0), 0) / assessments.length)
        : 0,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL SKILLS (المهارات الاجتماعية)
// ═══════════════════════════════════════════════════════════════════════════

exports.getSocialSkillsReport = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianSocialSkills');
  const latest = await Model.findOne({ beneficiaryId }).sort({ assessmentDate: -1 }).lean();
  res.json({ success: true, data: latest || { message: 'لا يوجد تقرير بعد', skills: [] } });
});

exports.getSocialSkillsGoals = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianSocialSkills');
  const reports = await Model.find({ beneficiaryId }).sort({ assessmentDate: -1 }).limit(1).lean();
  const goals = reports[0]?.goals || [];
  res.json({ success: true, data: goals });
});

exports.getSocialSkillsProgress = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianSocialSkills');
  const reports = await Model.find({ beneficiaryId }).sort({ assessmentDate: 1 }).lean();
  const progress = reports.map(r => ({
    date: r.assessmentDate,
    overallScore: r.overallScore,
    communication: r.communication,
    teamwork: r.teamwork,
    empathy: r.empathy,
    conflictResolution: r.conflictResolution,
  }));
  res.json({ success: true, data: progress });
});

exports.getPeerInteractions = catchAsync(async (req, res) => {
  const { beneficiaryId } = req.params;
  const Model = _getModel('GuardianSocialSkills');
  const latest = await Model.findOne({ beneficiaryId }).sort({ assessmentDate: -1 }).lean();
  res.json({ success: true, data: latest?.peerInteractions || [] });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUDGET PLANNING (التخطيط المالي)
// ═══════════════════════════════════════════════════════════════════════════

exports.getBudgetPlan = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianBudgetPlan');
  let plan = await Model.findOne({ guardianId: req.user._id, status: 'active' }).lean();
  if (!plan) {
    plan = {
      guardianId: req.user._id,
      status: 'none',
      message: 'لا توجد خطة مالية حالية',
      categories: [],
    };
  }
  res.json({ success: true, data: plan });
});

exports.createBudgetPlan = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianBudgetPlan');
  const { title, totalBudget, categories, startDate, endDate } = req.body;
  await Model.updateMany({ guardianId: req.user._id, status: 'active' }, { status: 'archived' });
  const item = await Model.create({
    guardianId: req.user._id,
    title: title || 'خطة مالية جديدة',
    totalBudget: totalBudget || 0,
    categories: categories || [],
    startDate: startDate || new Date(),
    endDate,
    status: 'active',
  });
  res.status(201).json({ success: true, message: 'تم إنشاء الخطة المالية', data: item });
});

exports.getExpenseForecast = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianBudgetPlan');
  const plan = await Model.findOne({ guardianId: req.user._id, status: 'active' }).lean();
  if (!plan) {
    return res.json({ success: true, data: { message: 'لا توجد خطة مالية نشطة', forecast: [] } });
  }
  const forecast = (plan.categories || []).map(cat => ({
    category: cat.name,
    budgeted: cat.budget || 0,
    spent: cat.spent || 0,
    remaining: (cat.budget || 0) - (cat.spent || 0),
    percentUsed: cat.budget ? Math.round(((cat.spent || 0) / cat.budget) * 100) : 0,
  }));
  res.json({ success: true, data: { plan: plan.title, totalBudget: plan.totalBudget, forecast } });
});

exports.getBudgetAnalytics = catchAsync(async (req, res) => {
  const Model = _getModel('GuardianBudgetPlan');
  const plans = await Model.find({ guardianId: req.user._id }).sort({ createdAt: -1 }).lean();
  const activePlan = plans.find(p => p.status === 'active');
  const totalSpent = activePlan
    ? (activePlan.categories || []).reduce((s, c) => s + (c.spent || 0), 0)
    : 0;
  res.json({
    success: true,
    data: {
      totalPlans: plans.length,
      activePlan: activePlan?.title || null,
      totalBudget: activePlan?.totalBudget || 0,
      totalSpent,
      savingsRate: activePlan?.totalBudget
        ? Math.round(((activePlan.totalBudget - totalSpent) / activePlan.totalBudget) * 100)
        : 0,
      monthlyTrend: plans.slice(0, 6).map(p => ({
        title: p.title,
        budget: p.totalBudget,
        spent: (p.categories || []).reduce((s, c) => s + (c.spent || 0), 0),
      })),
    },
  });
});

// ==================== Helper: Dynamic Model Loader ====================

/**
 * Safely get or create a mongoose model.
 * For new guardian-portal subdomain collections.
 */
function _getModel(modelName) {
  const mongoose = require('mongoose');

  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  // Dynamic schemas for guardian portal sub-collections
  const schemas = {
    GuardianAppointment: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        appointmentType: {
          type: String,
          enum: ['teacher', 'specialist', 'admin', 'therapy', 'medical', 'other'],
          default: 'teacher',
        },
        appointmentDate: { type: Date, required: true },
        timeSlot: { type: String },
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        staffName: String,
        reason: String,
        notes: String,
        status: {
          type: String,
          enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
          default: 'scheduled',
        },
        cancellationReason: String,
        cancelledAt: Date,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
      { timestamps: true }
    ),

    GuardianSchedule: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        dayOfWeek: { type: Number, min: 0, max: 6 },
        sessions: [
          {
            time: String,
            subject: String,
            subject_ar: String,
            teacher: String,
            room: String,
            type: {
              type: String,
              enum: ['class', 'therapy', 'activity', 'break', 'other'],
              default: 'class',
            },
          },
        ],
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true }
    ),

    GuardianExam: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        subject: String,
        subject_ar: String,
        examDate: { type: Date, required: true },
        examType: {
          type: String,
          enum: ['midterm', 'final', 'quiz', 'assessment', 'practical'],
          default: 'assessment',
        },
        duration: Number,
        room: String,
        notes: String,
      },
      { timestamps: true }
    ),

    GuardianIEP: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        title: String,
        title_ar: String,
        status: {
          type: String,
          enum: ['draft', 'active', 'completed', 'archived'],
          default: 'active',
        },
        startDate: Date,
        endDate: Date,
        goals: [
          {
            title: String,
            area: {
              type: String,
              enum: ['academic', 'behavioral', 'social', 'motor', 'speech', 'daily_living'],
            },
            description: String,
            targetDate: Date,
            currentProgress: { type: Number, default: 0 },
            targetProgress: { type: Number, default: 100 },
            status: {
              type: String,
              enum: ['not_started', 'in_progress', 'completed', 'on_hold'],
              default: 'not_started',
            },
            milestones: [{ title: String, achieved: Boolean, achievedDate: Date }],
          },
        ],
        guardianFeedback: [
          {
            guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
            goalId: mongoose.Schema.Types.ObjectId,
            feedback: String,
            rating: Number,
            suggestions: String,
            submittedAt: Date,
          },
        ],
        team: [
          {
            staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            role: String,
            name: String,
          },
        ],
      },
      { timestamps: true }
    ),

    GuardianSurvey: new mongoose.Schema(
      {
        title_ar: String,
        title_en: String,
        description_ar: String,
        category: { type: String, default: 'general' },
        deadline: Date,
        isActive: { type: Boolean, default: true },
        questions: [
          {
            questionText_ar: String,
            questionText_en: String,
            questionType: {
              type: String,
              enum: ['text', 'rating', 'multiple_choice', 'yes_no', 'scale'],
            },
            options: [String],
            required: { type: Boolean, default: false },
          },
        ],
        questionsCount: Number,
        respondents: [
          {
            guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
            answers: [mongoose.Schema.Types.Mixed],
            submittedAt: Date,
          },
        ],
      },
      { timestamps: true }
    ),

    GuardianResource: new mongoose.Schema(
      {
        title_ar: String,
        title_en: String,
        description_ar: String,
        description_en: String,
        category: { type: String, default: 'educational' },
        resourceType: {
          type: String,
          enum: ['article', 'video', 'pdf', 'link', 'audio', 'presentation'],
        },
        contentUrl: String,
        thumbnailUrl: String,
        author: String,
        tags: [String],
        viewCount: { type: Number, default: 0 },
        bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' }],
        isPublished: { type: Boolean, default: true },
      },
      { timestamps: true }
    ),

    GuardianSupportTicket: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        ticketNumber: { type: String, unique: true },
        subject: String,
        description: String,
        category: {
          type: String,
          enum: ['technical', 'administrative', 'financial', 'academic', 'general'],
          default: 'general',
        },
        priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        status: {
          type: String,
          enum: ['open', 'in_progress', 'awaiting_response', 'resolved', 'closed'],
          default: 'open',
        },
        replies: [
          {
            senderId: { type: mongoose.Schema.Types.ObjectId },
            senderRole: { type: String, enum: ['guardian', 'admin', 'support'] },
            message: String,
            createdAt: { type: Date, default: Date.now },
          },
        ],
        closedAt: Date,
        satisfactionRating: Number,
        closingNotes: String,
        lastUpdated: Date,
      },
      { timestamps: true }
    ),

    GuardianEvent: new mongoose.Schema(
      {
        title_ar: String,
        title_en: String,
        description_ar: String,
        description_en: String,
        eventDate: { type: Date, required: true },
        endDate: Date,
        location: String,
        category: {
          type: String,
          enum: [
            'academic',
            'social',
            'sports',
            'cultural',
            'parent_meeting',
            'celebration',
            'other',
          ],
          default: 'other',
        },
        eventType: {
          type: String,
          enum: ['mandatory', 'optional', 'information'],
          default: 'optional',
        },
        isPublished: { type: Boolean, default: true },
        rsvps: [
          {
            guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
            attending: Boolean,
            attendeeCount: { type: Number, default: 1 },
            createdAt: Date,
            updatedAt: Date,
          },
        ],
        maxAttendees: Number,
      },
      { timestamps: true }
    ),

    GuardianFeedback: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        type: {
          type: String,
          enum: ['suggestion', 'complaint', 'praise', 'general'],
          default: 'suggestion',
        },
        complaintNumber: String,
        subject: String,
        message: String,
        category: { type: String, default: 'general' },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        urgency: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
        rating: Number,
        status: {
          type: String,
          enum: ['submitted', 'under_review', 'responded', 'resolved', 'closed'],
          default: 'submitted',
        },
        adminResponse: String,
        respondedAt: Date,
      },
      { timestamps: true }
    ),

    GuardianDocument: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        title: String,
        description: String,
        category: { type: String, default: 'other' },
        fileName: String,
        filePath: String,
        fileUrl: String,
        mimeType: String,
        fileSize: Number,
        downloadCount: { type: Number, default: 0 },
        lastDownloadedAt: Date,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId },
        sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' }],
      },
      { timestamps: true }
    ),

    GuardianTransportation: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        busNumber: String,
        routeName: String,
        driverName: String,
        driverPhone: String,
        supervisorName: String,
        supervisorPhone: String,
        pickupTime: String,
        dropoffTime: String,
        pickupLocation: { address: String, lat: Number, lng: Number },
        dropoffLocation: { address: String, lat: Number, lng: Number },
        currentLocation: { lat: Number, lng: Number, updatedAt: Date },
        estimatedArrival: String,
        status: {
          type: String,
          enum: ['on_route', 'arrived', 'delayed', 'not_started'],
          default: 'not_started',
        },
        isActive: { type: Boolean, default: true },
        absenceReports: [
          {
            date: Date,
            reason: String,
            direction: { type: String, enum: ['pickup', 'dropoff', 'both'], default: 'both' },
            reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
            reportedAt: Date,
          },
        ],
      },
      { timestamps: true }
    ),

    GuardianActivity: new mongoose.Schema(
      {
        title_ar: String,
        title_en: String,
        description_ar: String,
        description_en: String,
        category: {
          type: String,
          enum: ['sports', 'arts', 'academic', 'social', 'therapy', 'cultural', 'other'],
          default: 'other',
        },
        startDate: Date,
        endDate: Date,
        schedule: String,
        location: String,
        instructor: String,
        maxCapacity: Number,
        ageRange: { min: Number, max: Number },
        isActive: { type: Boolean, default: true },
        registrationStatus: { type: String, enum: ['open', 'closed', 'waitlist'], default: 'open' },
        enrollments: [
          {
            beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
            guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
            notes: String,
            enrolledAt: Date,
            status: {
              type: String,
              enum: ['enrolled', 'waitlisted', 'withdrawn'],
              default: 'enrolled',
            },
          },
        ],
      },
      { timestamps: true }
    ),

    GuardianPermissionRequest: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        requestType: {
          type: String,
          enum: [
            'sick_leave',
            'personal_leave',
            'early_pickup',
            'late_arrival',
            'field_trip',
            'other',
          ],
          default: 'personal_leave',
        },
        startDate: { type: Date, required: true },
        endDate: Date,
        reason: String,
        attachmentUrl: String,
        notes: String,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'cancelled'],
          default: 'pending',
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date,
        reviewNotes: String,
        cancelledAt: Date,
      },
      { timestamps: true }
    ),

    GuardianAnnouncement: new mongoose.Schema(
      {
        title_ar: String,
        title_en: String,
        content_ar: String,
        content_en: String,
        category: { type: String, default: 'general' },
        priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
        isPinned: { type: Boolean, default: false },
        isPublished: { type: Boolean, default: true },
        publishDate: Date,
        expiryDate: Date,
        viewCount: { type: Number, default: 0 },
        attachments: [{ fileName: String, fileUrl: String }],
      },
      { timestamps: true }
    ),

    GuardianTeacherLink: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        staffName: String,
        staffName_ar: String,
        role: {
          type: String,
          enum: ['teacher', 'specialist', 'therapist', 'counselor', 'supervisor'],
          default: 'teacher',
        },
        subject: String,
        subject_ar: String,
        email: String,
        phone: String,
        isActive: { type: Boolean, default: true },
      },
      { timestamps: true }
    ),

    GuardianReward: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        title_ar: String,
        title_en: String,
        description: String,
        points: { type: Number, default: 0 },
        rewardType: {
          type: String,
          enum: ['academic', 'behavior', 'attendance', 'activity', 'special'],
          default: 'academic',
        },
        awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        awardedByName: String,
      },
      { timestamps: true }
    ),

    // ─── New Phase 2 Models ───────────────────────────────────────────

    GuardianHealthRecord: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        recordType: {
          type: String,
          enum: ['medication', 'allergy', 'vaccination', 'incident', 'checkup', 'general'],
          default: 'general',
        },
        title: String,
        description: String,
        incidentType: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        medicationName: String,
        dosage: String,
        frequency: String,
        isActive: { type: Boolean, default: true },
        allergen: String,
        reaction: String,
        vaccineName: String,
        vaccineDate: Date,
        recordDate: { type: Date, default: Date.now },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
        status: { type: String, default: 'active' },
        metadata: mongoose.Schema.Types.Mixed,
      },
      { timestamps: true }
    ),

    GuardianTherapySession: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        therapistName: String,
        sessionDate: { type: Date, index: true },
        duration: { type: Number, default: 60 },
        sessionType: {
          type: String,
          enum: [
            'speech',
            'occupational',
            'physical',
            'behavioral',
            'psychological',
            'educational',
          ],
          default: 'behavioral',
        },
        status: {
          type: String,
          enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
          default: 'scheduled',
        },
        notes: String,
        goals: [String],
        achievements: [String],
        therapistRating: { type: Number, min: 1, max: 10 },
        guardianRating: { type: Number, min: 1, max: 5 },
        guardianComment: String,
        ratedAt: Date,
        nextSessionDate: Date,
      },
      { timestamps: true }
    ),

    GuardianMealPlan: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
        recordType: {
          type: String,
          enum: ['meal', 'dietary_profile', 'special_request'],
          default: 'meal',
        },
        date: Date,
        mealType: {
          type: String,
          enum: ['breakfast', 'lunch', 'snack', 'dinner'],
          default: 'lunch',
        },
        menuItems: [String],
        calories: Number,
        description: String,
        reason: String,
        restrictions: [String],
        allergies: [String],
        preferences: [String],
        specialDiet: String,
        status: {
          type: String,
          enum: ['pending', 'approved', 'served', 'cancelled'],
          default: 'pending',
        },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId },
      },
      { timestamps: true }
    ),

    GuardianGallery: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        title: String,
        description: String,
        filename: String,
        fileUrl: String,
        thumbnailUrl: String,
        mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
        albumName: { type: String, default: 'عام' },
        category: String,
        visibility: { type: String, enum: ['public', 'beneficiary', 'private'], default: 'public' },
        downloadCount: { type: Number, default: 0 },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
      { timestamps: true }
    ),

    GuardianHomework: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        title: String,
        description: String,
        subject: String,
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedByName: String,
        dueDate: { type: Date, index: true },
        status: {
          type: String,
          enum: ['assigned', 'in_progress', 'completed', 'graded', 'overdue'],
          default: 'assigned',
        },
        grade: Number,
        maxGrade: { type: Number, default: 100 },
        feedback: String,
        attachments: [String],
        guardianAcknowledged: { type: Boolean, default: false },
        acknowledgedAt: Date,
        acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
      },
      { timestamps: true }
    ),

    GuardianCertificate: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
        title: String,
        description: String,
        type: {
          type: String,
          enum: ['certificate', 'achievement', 'badge', 'award'],
          default: 'certificate',
        },
        category: String,
        issuedDate: { type: Date, default: Date.now },
        issuedBy: String,
        fileUrl: String,
        filename: String,
        thumbnailUrl: String,
        downloadCount: { type: Number, default: 0 },
        validUntil: Date,
      },
      { timestamps: true }
    ),

    GuardianVisitorPass: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        visitorName: String,
        visitorId: String,
        visitDate: { type: Date, index: true },
        visitTime: String,
        duration: { type: Number, default: 60 },
        purpose: String,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'expired'],
          default: 'pending',
        },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        requestedAt: Date,
        cancelledAt: Date,
        notes: String,
      },
      { timestamps: true }
    ),

    GuardianFacilityBooking: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        facilityName: { type: String, required: true },
        facilityType: String,
        date: { type: Date, index: true },
        startTime: String,
        endTime: String,
        purpose: String,
        status: {
          type: String,
          enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
          default: 'pending',
        },
        cancelledAt: Date,
      },
      { timestamps: true }
    ),

    GuardianSatisfaction: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', index: true },
        serviceType: {
          type: String,
          enum: [
            'therapy',
            'education',
            'transportation',
            'nutrition',
            'administration',
            'facilities',
            'communication',
            'overall',
          ],
        },
        overallRating: { type: Number, min: 1, max: 5 },
        staffRating: { type: Number, min: 1, max: 5 },
        facilityRating: { type: Number, min: 1, max: 5 },
        communicationRating: { type: Number, min: 1, max: 5 },
        comment: String,
        suggestions: String,
        submittedAt: { type: Date, default: Date.now },
      },
      { timestamps: true }
    ),

    GuardianAcademicCalendar: new mongoose.Schema(
      {
        title_ar: String,
        title_en: String,
        description: String,
        date: { type: Date, index: true },
        endDate: Date,
        eventType: {
          type: String,
          enum: [
            'holiday',
            'exam',
            'event',
            'deadline',
            'meeting',
            'vacation',
            'semester_start',
            'semester_end',
          ],
          default: 'event',
        },
        isAllDay: { type: Boolean, default: true },
        color: String,
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      },
      { timestamps: true }
    ),

    GuardianFamilyEngagement: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        title: String,
        description: String,
        type: {
          type: String,
          enum: ['program', 'workshop', 'home_activity', 'training'],
          default: 'program',
        },
        visibility: { type: String, enum: ['all', 'specific'], default: 'all' },
        startDate: Date,
        endDate: Date,
        enrolledGuardians: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' }],
        enrollmentCount: { type: Number, default: 0 },
        maxEnrollment: Number,
        status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
        resources: [String],
        instructions: String,
      },
      { timestamps: true }
    ),

    GuardianVolunteerProgram: new mongoose.Schema(
      {
        title: String,
        description: String,
        category: {
          type: String,
          enum: ['teaching', 'events', 'mentoring', 'community', 'other'],
          default: 'other',
        },
        startDate: Date,
        endDate: Date,
        hours: { type: Number, default: 0 },
        location: String,
        maxVolunteers: Number,
        enrolledVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        enrollmentCount: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['upcoming', 'active', 'completed', 'cancelled'],
          default: 'upcoming',
        },
        requirements: [String],
        contactPerson: String,
      },
      { timestamps: true }
    ),

    GuardianDailyReport: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        date: { type: Date, default: Date.now },
        mood: { type: Number, min: 1, max: 5 },
        attendance: {
          type: String,
          enum: ['present', 'absent', 'late', 'excused'],
          default: 'present',
        },
        meals: { breakfast: Boolean, lunch: Boolean, snack: Boolean },
        activities: [{ name: String, duration: Number, notes: String }],
        highlights: String,
        notes: String,
        therapySessions: [{ type: String }],
        behaviorNotes: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
      { timestamps: true }
    ),

    GuardianMedicalAppointment: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        doctorName: String,
        specialty: String,
        clinic: String,
        appointmentDate: Date,
        appointmentTime: String,
        status: {
          type: String,
          enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
          default: 'scheduled',
        },
        notes: String,
        diagnosis: String,
        prescription: [String],
        followUp: Date,
        cancelledAt: Date,
        cancelReason: String,
      },
      { timestamps: true }
    ),

    GuardianSuggestion: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        title: String,
        description: String,
        category: {
          type: String,
          enum: ['education', 'facilities', 'services', 'communication', 'safety', 'general'],
          default: 'general',
        },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        status: {
          type: String,
          enum: ['submitted', 'under_review', 'accepted', 'implemented', 'rejected'],
          default: 'submitted',
        },
        adminResponse: String,
        respondedAt: Date,
        votes: { type: Number, default: 0 },
      },
      { timestamps: true }
    ),

    GuardianParentTraining: new mongoose.Schema(
      {
        title: String,
        description: String,
        category: {
          type: String,
          enum: ['skills', 'health', 'education', 'technology', 'communication', 'other'],
          default: 'other',
        },
        instructor: String,
        startDate: Date,
        endDate: Date,
        hours: { type: Number, default: 0 },
        location: String,
        isOnline: { type: Boolean, default: false },
        meetingUrl: String,
        maxParticipants: Number,
        enrolledParents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        enrollmentCount: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['upcoming', 'active', 'completed', 'cancelled'],
          default: 'upcoming',
        },
        materials: [String],
        certificate: { type: Boolean, default: false },
      },
      { timestamps: true }
    ),

    GuardianChildSafety: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        type: { type: String, enum: ['alert', 'policy', 'concern', 'training'], default: 'alert' },
        title: String,
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
        category: {
          type: String,
          enum: ['bullying', 'health', 'facility', 'transport', 'general'],
          default: 'general',
        },
        status: {
          type: String,
          enum: ['reported', 'investigating', 'resolved', 'dismissed'],
          default: 'reported',
        },
        priority: { type: Number, default: 0 },
        resolution: String,
        resolvedAt: Date,
      },
      { timestamps: true }
    ),

    GuardianLearningPath: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        title: String,
        description: String,
        subject: String,
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced'],
          default: 'beginner',
        },
        status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
        milestones: [
          { title: String, completed: { type: Boolean, default: false }, completedAt: Date },
        ],
        recommendedResources: [{ title: String, url: String, type: String }],
        assessments: [{ title: String, score: Number, maxScore: Number, date: Date }],
        progress: { type: Number, default: 0 },
        startDate: Date,
        targetDate: Date,
      },
      { timestamps: true }
    ),

    GuardianCommunicationPref: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
        whatsappNotifications: { type: Boolean, default: false },
        preferredLanguage: { type: String, default: 'ar' },
        quietHoursStart: String,
        quietHoursEnd: String,
        digestFrequency: {
          type: String,
          enum: ['realtime', 'daily', 'weekly'],
          default: 'realtime',
        },
      },
      { timestamps: true }
    ),

    GuardianGiftedProgram: new mongoose.Schema(
      {
        title: String,
        description: String,
        category: {
          type: String,
          enum: ['academic', 'arts', 'sports', 'leadership', 'technology', 'other'],
          default: 'other',
        },
        eligibility: String,
        startDate: Date,
        endDate: Date,
        nominations: [
          {
            guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
            reason: String,
            skills: [String],
            nominatedAt: Date,
            status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
          },
        ],
        status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
        maxParticipants: Number,
      },
      { timestamps: true }
    ),

    GuardianWellbeing: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        type: { type: String, enum: ['sleep', 'assessment'], default: 'sleep' },
        date: { type: Date, default: Date.now },
        sleepTime: String,
        wakeTime: String,
        quality: { type: Number, min: 1, max: 5 },
        mood: { type: Number, min: 1, max: 5 },
        energy: { type: Number, min: 1, max: 5 },
        appetite: { type: Number, min: 1, max: 5 },
        socialInteraction: { type: Number, min: 1, max: 5 },
        notes: String,
      },
      { timestamps: true }
    ),

    GuardianSocialSkills: new mongoose.Schema(
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        assessmentDate: { type: Date, default: Date.now },
        overallScore: { type: Number, min: 0, max: 100 },
        communication: { type: Number, min: 0, max: 100 },
        teamwork: { type: Number, min: 0, max: 100 },
        empathy: { type: Number, min: 0, max: 100 },
        conflictResolution: { type: Number, min: 0, max: 100 },
        goals: [{ title: String, target: String, progress: Number, dueDate: Date }],
        peerInteractions: [{ date: Date, type: String, description: String, outcome: String }],
        assessor: String,
        notes: String,
      },
      { timestamps: true }
    ),

    GuardianBudgetPlan: new mongoose.Schema(
      {
        guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        title: String,
        totalBudget: { type: Number, default: 0 },
        categories: [
          {
            name: String,
            budget: { type: Number, default: 0 },
            spent: { type: Number, default: 0 },
            icon: String,
          },
        ],
        startDate: Date,
        endDate: Date,
        status: { type: String, enum: ['active', 'archived', 'completed'], default: 'active' },
      },
      { timestamps: true }
    ),
  };

  if (!schemas[modelName]) {
    throw new Error(`Unknown guardian model: ${modelName}`);
  }

  return mongoose.model(modelName, schemas[modelName]);
}

module.exports = exports;
