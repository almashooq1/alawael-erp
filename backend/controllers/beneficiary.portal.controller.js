/**
 * Beneficiary Portal Controller
 * 
 * Handles all operations for student/trainee portal
 * - Dashboard, Profile, Progress, Grades, Attendance
 * - Programs, Messaging, Documents, Notifications
 * - Settings, Export, Help & Support
 */

const Beneficiary = require('../models/Beneficiary');
const Guardian = require('../models/Guardian');
const BeneficiaryProgress = require('../models/BeneficiaryProgress');
const PortalMessage = require('../models/PortalMessage');
const PortalNotification = require('../models/PortalNotification');
const Document = require('../models/Document');
const { AppError, catchAsync } = require('../utils/errorHandler');
const { sendEmail } = require('../services/email.service');
const BeneficiaryService = require('../services/beneficiary.service');

// ==================== DASHBOARD ====================

/**
 * GET /api/beneficiary/dashboard
 * Retrieve beneficiary dashboard with key metrics and updates
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('firstName_ar firstName_en lastName_ar lastName_en academicScore attendanceRate behaviorRating currentLevel')
    .lean();

  if (!beneficiary) {
    return res.status(404).json({
      success: false,
      message: 'Beneficiary record not found'
    });
  }

  const recentProgress = await BeneficiaryProgress.findOne({ beneficiaryId })
    .sort({ createdAt: -1 })
    .lean();

  const unreadMessages = await PortalMessage.countDocuments({
    toId: beneficiaryId,
    toModel: 'Beneficiary',
    isRead: false
  });

  const unreadNotifications = await PortalNotification.countDocuments({
    beneficiaryId,
    isRead: false
  });

  const guardians = await Guardian.find({ beneficiaries: beneficiaryId })
    .select('firstName_ar lastName_ar email phone profilePhoto')
    .lean();

  const dashboard = {
    beneficiary: {
      name: `${beneficiary.firstName_ar} ${beneficiary.lastName_ar}`,
      nameEn: `${beneficiary.firstName_en} ${beneficiary.lastName_en}`,
      recentScore: beneficiary.academicScore,
      attendance: beneficiary.attendanceRate,
      behavior: beneficiary.behaviorRating,
      level: beneficiary.currentLevel
    },
    progress: {
      currentMonth: recentProgress?.month || new Date().toISOString().slice(0, 7),
      score: recentProgress?.academicScore || 0,
      completionRate: recentProgress?.activityCompletionRate || 0,
      performanceStatus: recentProgress?.performanceStatus || 'pending'
    },
    notifications: {
      unreadCount: unreadNotifications,
      unreadMessages: unreadMessages
    },
    guardians: guardians.map(g => ({
      id: g._id,
      name: `${g.firstName_ar} ${g.lastName_ar}`,
      email: g.email,
      phone: g.phone,
      photo: g.profilePhoto
    }))
  };

  res.status(200).json({
    success: true,
    data: dashboard
  });
});

/**
 * GET /api/beneficiary/dashboard/stats
 * Retrieve detailed dashboard statistics
 */
exports.getDashboardStats = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  // Get last 6 months of progress data for trends
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const progressTrend = await BeneficiaryProgress.find({
    beneficiaryId,
    createdAt: { $gte: sixMonthsAgo }
  })
    .sort({ month: -1 })
    .select('month academicScore attendanceRate behaviorRating activityCompletionRate')
    .limit(6)
    .lean();

  const stats = {
    academic: {
      currentScore: progressTrend[0]?.academicScore || 0,
      previousScore: progressTrend[1]?.academicScore || 0,
      trend: (progressTrend[0]?.academicScore || 0) - (progressTrend[1]?.academicScore || 0),
      average: (progressTrend.reduce((sum, p) => sum + p.academicScore, 0) / progressTrend.length) || 0
    },
    attendance: {
      currentRate: progressTrend[0]?.attendanceRate || 0,
      previousRate: progressTrend[1]?.attendanceRate || 0,
      trend: (progressTrend[0]?.attendanceRate || 0) - (progressTrend[1]?.attendanceRate || 0),
      average: (progressTrend.reduce((sum, p) => sum + p.attendanceRate, 0) / progressTrend.length) || 0
    },
    behavior: {
      currentRating: progressTrend[0]?.behaviorRating || 0,
      previousRating: progressTrend[1]?.behaviorRating || 0,
      trend: (progressTrend[0]?.behaviorRating || 0) - (progressTrend[1]?.behaviorRating || 0),
      average: (progressTrend.reduce((sum, p) => sum + p.behaviorRating, 0) / progressTrend.length) || 0
    },
    activity: {
      completionRate: progressTrend[0]?.activityCompletionRate || 0,
      activitiesCompleted: progressTrend[0]?.completedActivities || 0,
      totalActivities: progressTrend[0]?.totalActivities || 0
    },
    historicalData: progressTrend.map(p => ({
      month: p.month,
      score: p.academicScore,
      attendance: p.attendanceRate,
      behavior: p.behaviorRating,
      completion: p.activityCompletionRate
    }))
  };

  res.status(200).json({
    success: true,
    data: stats
  });
});

// ==================== PROFILE MANAGEMENT ====================

/**
 * GET /api/beneficiary/profile
 * Retrieve beneficiary profile information
 */
exports.getProfile = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('-password -accountVerificationCode')
    .lean();

  if (!beneficiary) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found'
    });
  }

  res.status(200).json({
    success: true,
    data: beneficiary
  });
});

/**
 * PATCH /api/beneficiary/profile
 * Update beneficiary profile information
 */
exports.updateProfile = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const allowedFields = [
    'email', 'phone', 'dateOfBirth', 'gender',
    'language', 'notificationPreference'
  ];

  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });

  const beneficiary = await Beneficiary.findByIdAndUpdate(
    beneficiaryId,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: beneficiary
  });
});

/**
 * PATCH /api/beneficiary/profile/photo
 * Upload beneficiary profile photo
 */
exports.updateProfilePhoto = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const photoUrl = `/uploads/beneficiaries/${beneficiaryId}/${req.file.filename}`;

  const beneficiary = await Beneficiary.findByIdAndUpdate(
    beneficiaryId,
    { profilePhoto: photoUrl },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile photo updated successfully',
    data: { photoUrl: beneficiary.profilePhoto }
  });
});

/**
 * GET /api/beneficiary/profile/download
 * Download complete profile data
 */
exports.downloadProfileData = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId);
  const progress = await BeneficiaryProgress.find({ beneficiaryId }).limit(12);
  const messages = await PortalMessage.find({
    $or: [
      { toId: beneficiaryId, toModel: 'Beneficiary' },
      { fromId: beneficiaryId, fromModel: 'Beneficiary' }
    ]
  }).limit(100);

  const profileData = {
    beneficiary: beneficiary.toObject(),
    progressHistory: progress,
    recentMessages: messages
  };

  res.status(200).json({
    success: true,
    data: profileData
  });
});

// ==================== PROGRESS TRACKING ====================

/**
 * GET /api/beneficiary/progress
 * Retrieve current month's progress
 */
exports.getProgress = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const progress = await BeneficiaryProgress.findOne({
    beneficiaryId,
    month: currentMonth
  });

  if (!progress) {
    return res.status(404).json({
      success: false,
      message: 'No progress record found for current month'
    });
  }

  res.status(200).json({
    success: true,
    data: progress
  });
});

/**
 * GET /api/beneficiary/progress/:monthId
 * Retrieve progress for a specific month
 */
exports.getProgressByMonth = catchAsync(async (req, res) => {
  const { monthId } = req.params;
  const beneficiaryId = req.user._id;

  const progress = await BeneficiaryProgress.findOne({
    beneficiaryId,
    month: monthId
  });

  if (!progress) {
    return res.status(404).json({
      success: false,
      message: `No progress record found for ${monthId}`
    });
  }

  res.status(200).json({
    success: true,
    data: progress
  });
});

/**
 * GET /api/beneficiary/progress/trend
 * Retrieve progress trend for last 6 months
 */
exports.getProgressTrend = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const trend = await BeneficiaryProgress.find({
    beneficiaryId,
    createdAt: { $gte: sixMonthsAgo }
  })
    .sort({ month: 1 })
    .select('month academicScore attendanceRate behaviorRating activityCompletionRate scoreImprovement performanceStatus');

  res.status(200).json({
    success: true,
    data: {
      trend,
      summary: {
        totalMonths: trend.length,
        averageScore: trend.reduce((sum, p) => sum + p.academicScore, 0) / trend.length || 0,
        averageAttendance: trend.reduce((sum, p) => sum + p.attendanceRate, 0) / trend.length || 0,
        overallImprovement: trend[trend.length - 1]?.scoreImprovement || 0
      }
    }
  });
});

/**
 * GET /api/beneficiary/progress/reports
 * Retrieve generated progress reports
 */
exports.getProgressReports = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const reports = await BeneficiaryProgress.find({
    beneficiaryId,
    reportGenerated: true
  })
    .sort({ reportGeneratedAt: -1 })
    .select('month reportGeneratedAt reportSentToGuardian reportSentAt overallPerformance');

  res.status(200).json({
    success: true,
    data: {
      totalReports: reports.length,
      reports: reports.map(r => ({
        month: r.month,
        generatedAt: r.reportGeneratedAt,
        sentAt: r.reportSentAt,
        sentStatus: r.reportSentToGuardian,
        performance: r.overallPerformance
      }))
    }
  });
});

// ==================== GRADES ====================

/**
 * GET /api/beneficiary/grades
 * Retrieve all grades
 */
exports.getGrades = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const grades = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 })
    .select('month academicScore previousMonthScore scoreImprovement');

  const formattedGrades = grades.map(g => ({
    month: g.month,
    score: g.academicScore,
    previousScore: g.previousMonthScore,
    improvement: g.scoreImprovement,
    status: g.academicScore >= 80 ? 'excellent' : g.academicScore >= 70 ? 'good' : 'needs_improvement'
  }));

  res.status(200).json({
    success: true,
    data: formattedGrades
  });
});

/**
 * GET /api/beneficiary/grades/summary
 * Get grades summary
 */
exports.getGradesSummary = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const grades = await BeneficiaryProgress.find({ beneficiaryId })
    .select('academicScore')
    .lean();

  const scores = grades.map(g => g.academicScore);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length || 0;
  const highest = Math.max(...scores, 0);
  const lowest = Math.min(...scores, 0);

  res.status(200).json({
    success: true,
    data: {
      average: average.toFixed(2),
      highest,
      lowest,
      totalGrades: scores.length
    }
  });
});

/**
 * GET /api/beneficiary/grades/trend
 * Get grades trend
 */
exports.getGradesTrend = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const trend = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: 1 })
    .select('month academicScore scoreImprovement')
    .limit(12);

  const trendData = trend.map(t => ({
    month: t.month,
    score: t.academicScore,
    improvement: t.scoreImprovement
  }));

  const improvingMonths = trendData.filter(t => t.improvement > 0).length;

  res.status(200).json({
    success: true,
    data: {
      trend: trendData,
      improvingMonths,
      decliningMonths: trendData.length - improvingMonths,
      overallDirection: improvingMonths > trendData.length / 2 ? 'improving' : 'declining'
    }
  });
});

// ==================== ATTENDANCE ====================

/**
 * GET /api/beneficiary/attendance
 * Retrieve attendance records
 */
exports.getAttendance = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const attendance = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 })
    .select('month attendanceRate absenceDays lateDays');

  res.status(200).json({
    success: true,
    data: attendance
  });
});

/**
 * GET /api/beneficiary/attendance/summary
 * Get attendance summary
 */
exports.getAttendanceSummary = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const records = await BeneficiaryProgress.find({ beneficiaryId }).select('attendanceRate absenceDays lateDays').lean();

  const totalDays = records.length * 20; // Assume 20 school days per month
  const totalAbsences = records.reduce((sum, r) => sum + r.absenceDays, 0);
  const totalLateArrivals = records.reduce((sum, r) => sum + r.lateDays, 0);
  const averageAttendance = records.reduce((sum, r) => sum + r.attendanceRate, 0) / records.length || 0;

  res.status(200).json({
    success: true,
    data: {
      averageAttendanceRate: averageAttendance.toFixed(2),
      totalAbsences,
      totalLateArrivals,
      attendanceStatus: averageAttendance >= 90 ? 'excellent' : averageAttendance >= 80 ? 'good' : 'needs_improvement'
    }
  });
});

/**
 * GET /api/beneficiary/attendance/report
 * Get detailed attendance report
 */
exports.getAttendanceReport = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const report = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 })
    .select('month attendanceRate absenceDays lateDays')
    .limit(6);

  res.status(200).json({
    success: true,
    data: {
      lastSixMonths: report,
      totalAbsences: report.reduce((sum, r) => sum + r.absenceDays, 0),
      totalLateArrivals: report.reduce((sum, r) => sum + r.lateDays, 0)
    }
  });
});

// ==================== PROGRAMS ====================

/**
 * GET /api/beneficiary/programs
 * Get enrolled programs
 */
exports.getPrograms = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('programs')
    .populate('programs', 'name description startDate endDate status');

  res.status(200).json({
    success: true,
    data: beneficiary.programs
  });
});

/**
 * GET /api/beneficiary/programs/:programId
 * Get specific program details
 */
exports.getProgramDetails = catchAsync(async (req, res) => {
  const { programId } = req.params;

  // Assuming Program model exists
  const program = await require('../models/Program').findById(programId);

  if (!program) {
    return res.status(404).json({
      success: false,
      message: 'Program not found'
    });
  }

  res.status(200).json({
    success: true,
    data: program
  });
});

/**
 * GET /api/beneficiary/programs/:programId/activities
 * Get program activities
 */
exports.getProgramActivities = catchAsync(async (req, res) => {
  const { programId } = req.params;

  // Assuming Activity model exists
  const activities = await require('../models/Activity').find({ programId });

  res.status(200).json({
    success: true,
    data: activities
  });
});

/**
 * POST /api/beneficiary/programs/:programId/enroll
 * Enroll in a program
 */
exports.enrollProgram = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { programId } = req.params;

  const beneficiary = await Beneficiary.findById(beneficiaryId);
  
  if (beneficiary.programs.includes(programId)) {
    return res.status(400).json({
      success: false,
      message: 'Already enrolled in this program'
    });
  }

  beneficiary.programs.push(programId);
  await beneficiary.save();

  // Create notification
  await PortalNotification.createAndSend({
    guardianId: beneficiary.guardians[0],
    type: 'event',
    title_ar: 'التحاق جديد ببرنامج',
    title_en: 'New Program Enrollment',
    message_ar: `تم التحاق الطالب ببرنامج جديد`,
    message_en: 'Student enrolled in new program'
  });

  res.status(201).json({
    success: true,
    message: 'Successfully enrolled in program'
  });
});

/**
 * POST /api/beneficiary/programs/:programId/unenroll
 * Unenroll from a program
 */
exports.unenrollProgram = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { programId } = req.params;

  const beneficiary = await Beneficiary.findById(beneficiaryId);
  beneficiary.programs = beneficiary.programs.filter(id => id.toString() !== programId);
  await beneficiary.save();

  res.status(200).json({
    success: true,
    message: 'Successfully unenrolled from program'
  });
});

// ==================== MESSAGING ====================

/**
 * GET /api/beneficiary/messages
 * Get inbox messages
 */
exports.getMessages = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const messages = await PortalMessage.find({
    toId: beneficiaryId,
    toModel: 'Beneficiary'
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('fromId', 'firstName_ar firstName_en lastName_ar lastName_en profilePhoto');

  const total = await PortalMessage.countDocuments({
    toId: beneficiaryId,
    toModel: 'Beneficiary'
  });

  res.status(200).json({
    success: true,
    data: messages,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

/**
 * GET /api/beneficiary/messages/sent
 * Get sent messages
 */
exports.getSentMessages = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const skip = (page - 1) * limit;

  const messages = await PortalMessage.find({
    fromId: beneficiaryId,
    fromModel: 'Beneficiary'
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await PortalMessage.countDocuments({
    fromId: beneficiaryId,
    fromModel: 'Beneficiary'
  });

  res.status(200).json({
    success: true,
    data: messages,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

/**
 * GET /api/beneficiary/messages/:messageId
 * Get message details
 */
exports.getMessageDetail = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const beneficiaryId = req.user._id;

  const message = await PortalMessage.findById(messageId)
    .populate('fromId', 'firstName_ar firstName_en lastName_ar lastName_en profilePhoto');

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }

  if (message.toId.toString() !== beneficiaryId.toString() && message.fromId.toString() !== beneficiaryId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized to view this message'
    });
  }

  if (!message.isRead && message.toId.toString() === beneficiaryId.toString()) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
  }

  res.status(200).json({
    success: true,
    data: message
  });
});

/**
 * POST /api/beneficiary/messages
 * Send new message
 */
exports.sendMessage = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { toId, toModel, subject, message, messageType, priority } = req.body;

  if (!toId || !toModel || !message) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  const newMessage = await PortalMessage.create({
    fromId: beneficiaryId,
    fromModel: 'Beneficiary',
    toId,
    toModel,
    subject: subject || 'No Subject',
    message,
    messageType: messageType || 'general',
    priority: priority || 'normal'
  });

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: newMessage
  });
});

/**
 * POST /api/beneficiary/messages/:messageId/reply
 * Reply to message
 */
exports.replyMessage = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { messageId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: 'Message content required'
    });
  }

  const originalMessage = await PortalMessage.findById(messageId);

  if (!originalMessage) {
    return res.status(404).json({
      success: false,
      message: 'Original message not found'
    });
  }

  const reply = await PortalMessage.create({
    fromId: beneficiaryId,
    fromModel: 'Beneficiary',
    toId: originalMessage.fromId,
    toModel: originalMessage.fromModel,
    subject: `RE: ${originalMessage.subject}`,
    message,
    isReply: true,
    repliedToId: messageId,
    messageType: originalMessage.messageType
  });

  originalMessage.replies = originalMessage.replies || [];
  originalMessage.replies.push(reply._id);
  await originalMessage.save();

  res.status(201).json({
    success: true,
    message: 'Reply sent successfully',
    data: reply
  });
});

/**
 * PATCH /api/beneficiary/messages/:messageId/read
 * Mark message as read
 */
exports.markMessageRead = catchAsync(async (req, res) => {
  const { messageId } = req.params;

  const message = await PortalMessage.findByIdAndUpdate(
    messageId,
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Message marked as read',
    data: message
  });
});

/**
 * PATCH /api/beneficiary/messages/:messageId/archive
 * Archive message
 */
exports.archiveMessage = catchAsync(async (req, res) => {
  const { messageId } = req.params;

  const message = await PortalMessage.findByIdAndUpdate(
    messageId,
    { isArchived: true, archivedAt: new Date() },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Message archived',
    data: message
  });
});

// ==================== DOCUMENTS ====================

/**
 * GET /api/beneficiary/documents
 * Get uploaded documents
 */
exports.getDocuments = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('documents')
    .lean();

  res.status(200).json({
    success: true,
    data: beneficiary.documents
  });
});

/**
 * GET /api/beneficiary/documents/:documentId
 * Get document details
 */
exports.getDocumentDetail = catchAsync(async (req, res) => {
  const { documentId } = req.params;

  const document = await Document.findById(documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  res.status(200).json({
    success: true,
    data: document
  });
});

/**
 * GET /api/beneficiary/documents/:documentId/download
 * Download document
 */
exports.downloadDocument = catchAsync(async (req, res) => {
  const { documentId } = req.params;

  const document = await Document.findById(documentId);

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  res.download(document.filePath);
});

/**
 * POST /api/beneficiary/documents
 * Upload new document
 */
exports.uploadDocument = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const document = await Document.create({
    beneficiaryId,
    fileName: req.file.originalname,
    filePath: req.file.path,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    uploadedAt: new Date()
  });

  // Add to beneficiary's documents
  await Beneficiary.findByIdAndUpdate(
    beneficiaryId,
    { $push: { documents: document._id } }
  );

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: document
  });
});

/**
 * DELETE /api/beneficiary/documents/:documentId
 * Delete document
 */
exports.deleteDocument = catchAsync(async (req, res) => {
  const { documentId } = req.params;

  await Document.findByIdAndDelete(documentId);

  res.status(200).json({
    success: true,
    message: 'Document deleted successfully'
  });
});

// ==================== NOTIFICATIONS ====================

/**
 * GET /api/beneficiary/notifications
 * Get all notifications
 */
exports.getNotifications = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 15;
  const skip = (page - 1) * limit;

  const notifications = await PortalNotification.find({ beneficiaryId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await PortalNotification.countDocuments({ beneficiaryId });

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

/**
 * PATCH /api/beneficiary/notifications/:notificationId/read
 * Mark notification as read
 */
exports.markNotificationRead = catchAsync(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await PortalNotification.findByIdAndUpdate(
    notificationId,
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: notification
  });
});

/**
 * PATCH /api/beneficiary/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllNotificationsRead = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  await PortalNotification.updateMany(
    { beneficiaryId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

/**
 * PATCH /api/beneficiary/notifications/:notificationId/archive
 * Archive notification
 */
exports.archiveNotification = catchAsync(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await PortalNotification.findByIdAndUpdate(
    notificationId,
    { isArchived: true, archivedAt: new Date() },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: notification
  });
});

/**
 * GET /api/beneficiary/notifications/preferences
 * Get notification preferences
 */
exports.getNotificationPreferences = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('notificationPreference language');

  res.status(200).json({
    success: true,
    data: {
      preference: beneficiary.notificationPreference,
      language: beneficiary.language
    }
  });
});

/**
 * PATCH /api/beneficiary/notifications/preferences
 * Update notification preferences
 */
exports.updateNotificationPreferences = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { notificationPreference, language } = req.body;

  const beneficiary = await Beneficiary.findByIdAndUpdate(
    beneficiaryId,
    {
      notificationPreference: notificationPreference || 'email',
      language: language || 'ar'
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: { preference: beneficiary.notificationPreference, language: beneficiary.language }
  });
});

// ==================== SETTINGS ====================

/**
 * GET /api/beneficiary/settings
 * Get account settings
 */
exports.getSettings = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('email phone language notificationPreference accountStatus accountVerified');

  res.status(200).json({
    success: true,
    data: beneficiary
  });
});

/**
 * PATCH /api/beneficiary/settings
 * Update account settings
 */
exports.updateSettings = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { email, phone, language } = req.body;

  const beneficiary = await Beneficiary.findByIdAndUpdate(
    beneficiaryId,
    { email, phone, language },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: beneficiary
  });
});

/**
 * PATCH /api/beneficiary/settings/password
 * Change password
 */
exports.changePassword = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match'
    });
  }

  const user = await require('../models/User').findById(beneficiaryId);
  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * PATCH /api/beneficiary/settings/language
 * Change language preference
 */
exports.changeLanguage = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { language } = req.body;

  if (!['ar', 'en'].includes(language)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid language. Supported: ar, en'
    });
  }

  const beneficiary = await Beneficiary.findByIdAndUpdate(
    beneficiaryId,
    { language },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Language updated successfully',
    data: { language: beneficiary.language }
  });
});

// ==================== EXPORT ====================

/**
 * GET /api/beneficiary/export/data
 * Export profile data as JSON
 */
exports.exportProfileData = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  const beneficiary = await Beneficiary.findById(beneficiaryId);
  const progress = await BeneficiaryProgress.find({ beneficiaryId });

  const data = {
    profile: beneficiary.toObject(),
    progressHistory: progress.map(p => p.toObject())
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=profile.json');
  res.send(JSON.stringify(data, null, 2));
});

/**
 * GET /api/beneficiary/export/grades/:format
 * Export grades as PDF or CSV
 */
exports.exportGrades = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { format } = req.params;

  const grades = await BeneficiaryProgress.find({ beneficiaryId })
    .select('month academicScore attendanceRate behaviorRating activityCompletionRate');

  if (format === 'csv') {
    let csv = 'Month,Score,Attendance,Behavior,Completion\n';
    grades.forEach(g => {
      csv += `${g.month},${g.academicScore},${g.attendanceRate},${g.behaviorRating},${g.activityCompletionRate}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
  } else {
    // PDF export would require additional library
    res.setHeader('Content-Type', 'application/json');
  }

  res.setHeader('Content-Disposition', `attachment; filename=grades.${format}`);
  res.send(csv || JSON.stringify(grades));
});

/**
 * GET /api/beneficiary/export/attendance/:format
 * Export attendance records
 */
exports.exportAttendance = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { format } = req.params;

  const records = await BeneficiaryProgress.find({ beneficiaryId })
    .select('month attendanceRate absenceDays lateDays');

  if (format === 'csv') {
    let csv = 'Month,AttendanceRate,Absences,LateArrivals\n';
    records.forEach(r => {
      csv += `${r.month},${r.attendanceRate},${r.absenceDays},${r.lateDays}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(records));
  }

  res.setHeader('Content-Disposition', `attachment; filename=attendance.${format}`);
});

/**
 * GET /api/beneficiary/export/progress/:format
 * Export progress reports
 */
exports.exportProgress = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { format } = req.params;

  const progress = await BeneficiaryProgress.find({ beneficiaryId })
    .sort({ month: -1 });

  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=progress.${format}`);

  if (format === 'csv') {
    let csv = 'Month,Score,Attendance,Behavior,Completion,Status\n';
    progress.forEach(p => {
      csv += `${p.month},${p.academicScore},${p.attendanceRate},${p.behaviorRating},${p.activityCompletionRate},${p.performanceStatus}\n`;
    });
    res.send(csv);
  } else {
    res.send(JSON.stringify(progress, null, 2));
  }
});

// ==================== HELP & SUPPORT ====================

/**
 * GET /api/beneficiary/help/faq
 * Get Frequently Asked Questions
 */
exports.getFAQ = catchAsync(async (req, res) => {
  const faqs = [
    {
      question_ar: 'كيف أعرض درجاتي؟',
      question_en: 'How do I view my grades?',
      answer_ar: 'يمكنك عرض درجاتك من خلال الذهاب إلى قسم الدرجات في البوابة',
      answer_en: 'You can view your grades by going to the Grades section'
    },
    {
      question_ar: 'كيف أتواصل مع ولي الأمر؟',
      question_en: 'How do I contact my guardian?',
      answer_ar: 'استخدم قسم الرسائل للتواصل مع ولي الأمر',
      answer_en: 'Use the Messages section to contact your guardian'
    }
  ];

  res.status(200).json({
    success: true,
    data: faqs
  });
});

/**
 * POST /api/beneficiary/help/contact
 * Contact support
 */
exports.contactSupport = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;
  const { subject, message, category } = req.body;

  // Create support ticket
  const ticketData = {
    beneficiaryId,
    subject,
    message,
    category: category || 'general',
    status: 'open',
    createdAt: new Date()
  };

  // Save to database (assuming SupportTicket model exists)
  // const ticket = await SupportTicket.create(ticketData);

  res.status(201).json({
    success: true,
    message: 'Support request submitted successfully'
  });
});

/**
 * GET /api/beneficiary/help/support-tickets
 * Get support tickets
 */
exports.getSupportTickets = catchAsync(async (req, res) => {
  const beneficiaryId = req.user._id;

  // Fetch support tickets for beneficiary
  const tickets = []; // Replace with actual query

  res.status(200).json({
    success: true,
    data: tickets
  });
});

module.exports = exports;
