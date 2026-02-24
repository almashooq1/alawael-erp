/**
 * Beneficiary Portal Routes
 * مسارات بوابة المستفيدين الآمنة
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  Beneficiary,
  Schedule,
  ProgressReport,
  Message,
  Conversation,
  Survey,
  SurveyResponse,
  Notification,
  Document,
} = require('../models/BeneficiaryPortal');

// ==================== MIDDLEWARE ====================

// Beneficiary Authentication Middleware
const authenticateBeneficiary = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const beneficiary = await Beneficiary.findById(decoded.id);

    if (!beneficiary || beneficiary.accountStatus !== 'active') {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    req.beneficiary = beneficiary;
    req.beneficiaryId = beneficiary._id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
  }
};

// ==================== AUTHENTICATION ====================

// Beneficiary Registration
router.post('/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Basic format validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Accept E.164-style phone numbers like +966501234567
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone format' });
    }

    // Password strength: min 8 with upper, lower, digit, special
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({ success: false, message: 'Weak password' });
    }

    // Check if beneficiary exists
    const existingBeneficiary = await Beneficiary.findOne({ email: email.toLowerCase() });
    if (existingBeneficiary) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Create beneficiary
    const beneficiary = new Beneficiary({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      accountStatus: 'active',
    });

    await beneficiary.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      beneficiary: {
        id: beneficiary._id,
        email: beneficiary.email,
        name: `${beneficiary.firstName} ${beneficiary.lastName}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
});

// Beneficiary Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const beneficiary = await Beneficiary.findOne({ email: email.toLowerCase() });
    if (!beneficiary) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check account status
    if (beneficiary.accountStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    // Hash and verify password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    if (beneficiary.password !== hashedPassword) {
      beneficiary.loginAttempts = (beneficiary.loginAttempts || 0) + 1;
      if (beneficiary.loginAttempts >= 5) {
        beneficiary.accountStatus = 'suspended';
      }
      await beneficiary.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (beneficiary.twoFactorEnabled && !twoFactorCode) {
      return res
        .status(403)
        .json({ success: false, message: 'Two-factor authentication required' });
    }

    // Reset login attempts
    beneficiary.loginAttempts = 0;
    beneficiary.lastLoginDate = new Date();
    await beneficiary.save();

    // Generate JWT
    const token = jwt.sign(
      { id: beneficiary._id, email: beneficiary.email },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      beneficiary: {
        id: beneficiary._id,
        email: beneficiary.email,
        name: `${beneficiary.firstName} ${beneficiary.lastName}`,
        programs: beneficiary.enrolledPrograms,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
});

// ==================== SCHEDULE ROUTES ====================

// Get Beneficiary Schedule
router.get('/schedule', authenticateBeneficiary, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ beneficiaryId: req.beneficiaryId });

    if (!schedule) {
      return res.json({ success: true, data: { items: [] } });
    }

    // Sort by date
    schedule.items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({
      success: true,
      data: {
        items: schedule.items,
        upcomingCount: schedule.items.filter(
          item => new Date(item.startDate) > new Date() && item.status === 'scheduled'
        ).length,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch schedule', error: error.message });
  }
});

// Mark Attendance
router.post('/schedule/:scheduleItemId/attend', authenticateBeneficiary, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ beneficiaryId: req.beneficiaryId });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const item = schedule.items.id(req.params.scheduleItemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Schedule item not found' });
    }

    item.attended = true;
    item.status = 'completed';
    await schedule.save();

    res.json({ success: true, message: 'Attendance recorded' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to record attendance', error: error.message });
  }
});

// ==================== PROGRESS REPORT ROUTES ====================

// Get Progress Report
router.get('/progress', authenticateBeneficiary, async (req, res) => {
  try {
    const report = await ProgressReport.findOne({ beneficiaryId: req.beneficiaryId });

    if (!report) {
      return res.json({
        success: true,
        data: {
          overallProgress: 0,
          status: 'no_data',
          message: 'No progress data available yet',
        },
      });
    }

    res.json({
      success: true,
      data: {
        overallProgress: report.overallProgress,
        attendanceRate: report.attendanceRate,
        assignmentCompletion: report.assignmentCompletion,
        assessmentScore: report.assessmentScore,
        achievements: report.achievements,
        instructorFeedback: report.instructorFeedback,
        status: report.status,
        lastUpdated: report.lastUpdated,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch progress', error: error.message });
  }
});

// Get Detailed Progress Analytics
router.get('/progress/analytics', authenticateBeneficiary, async (req, res) => {
  try {
    const report = await ProgressReport.findOne({ beneficiaryId: req.beneficiaryId });

    if (!report) {
      return res.status(404).json({ success: false, message: 'No progress data' });
    }

    res.json({
      success: true,
      data: {
        metrics: {
          attendance: {
            current: report.attendanceRate,
            target: 85,
            trend: 'up',
          },
          assignments: {
            completed: report.assignmentsCompleted,
            total: report.assignmentsTotal,
            completionRate: ((report.assignmentsCompleted / report.assignmentsTotal) * 100).toFixed(
              2
            ),
          },
          assessments: {
            averageGrade: report.averageGrade,
            highestScore: 100,
            lowestScore: report.assessmentScore,
          },
          achievements: report.achievements.length,
        },
        challenges: report.instructorFeedback?.areasForImprovement || [],
        recommendations: report.instructorFeedback?.recommendations || [],
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
});

// ==================== MESSAGING ROUTES ====================

// Get Conversations
router.get('/messages/conversations', authenticateBeneficiary, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.userId': req.beneficiaryId,
      isActive: true,
    }).sort({ lastMessageDate: -1 });

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch conversations', error: error.message });
  }
});

// Get Messages in Conversation
router.get('/messages/conversation/:conversationId', authenticateBeneficiary, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    }).sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { conversationId: req.params.conversationId, recipientId: req.beneficiaryId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch messages', error: error.message });
  }
});

// Send Message
router.post('/messages/send', authenticateBeneficiary, async (req, res) => {
  try {
    const { recipientId, subject, body, attachments, priority } = req.body;

    if (!recipientId || !body) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: {
        $all: [
          { $elemMatch: { userId: req.beneficiaryId } },
          { $elemMatch: { userId: recipientId } },
        ],
      },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [
          { userId: req.beneficiaryId, name: req.beneficiary.firstName },
          { userId: recipientId, name: 'Recipient' },
        ],
      });
      await conversation.save();
    }

    // Create message
    const message = new Message({
      conversationId: conversation._id,
      senderId: req.beneficiaryId,
      senderName: req.beneficiary.firstName,
      senderRole: 'beneficiary',
      recipientId,
      subject,
      body,
      attachments: attachments || [],
      priority: priority || 'normal',
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = body;
    conversation.lastMessageDate = new Date();
    conversation.lastMessageSenderId = req.beneficiaryId;
    conversation.messageCount = (conversation.messageCount || 0) + 1;
    await conversation.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to send message', error: error.message });
  }
});

// ==================== SURVEY ROUTES ====================

// Get Available Surveys
router.get('/surveys', authenticateBeneficiary, async (req, res) => {
  try {
    const surveys = await Survey.find({
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    // Filter surveys already responded to
    const responses = await SurveyResponse.find({ beneficiaryId: req.beneficiaryId });
    const respondedSurveyIds = responses.map(r => r.surveyId.toString());

    const availableSurveys = surveys.filter(s => !respondedSurveyIds.includes(s._id.toString()));

    res.json({
      success: true,
      data: {
        available: availableSurveys.length,
        surveys: availableSurveys.map(s => ({
          id: s._id,
          title: s.title,
          description: s.description,
          questionsCount: s.questions.length,
          estimatedTime: s.questions.length * 2, // 2 minutes per question
        })),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch surveys', error: error.message });
  }
});

// Get Survey Details
router.get('/surveys/:surveyId', authenticateBeneficiary, async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.surveyId);
    if (!survey) {
      return res.status(404).json({ success: false, message: 'Survey not found' });
    }

    res.json({
      success: true,
      data: {
        id: survey._id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
        isAnonymous: survey.isAnonymous,
        allowSkipQuestions: survey.allowSkipQuestions,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch survey', error: error.message });
  }
});

// Submit Survey Response
router.post('/surveys/:surveyId/submit', authenticateBeneficiary, async (req, res) => {
  try {
    const { responses } = req.body;

    if (!responses || responses.length === 0) {
      return res.status(400).json({ success: false, message: 'No responses provided' });
    }

    // Check if already responded
    const existingResponse = await SurveyResponse.findOne({
      surveyId: req.params.surveyId,
      beneficiaryId: req.beneficiaryId,
    });

    if (existingResponse) {
      return res.status(409).json({ success: false, message: 'Already responded to this survey' });
    }

    // Create response
    const surveyResponse = new SurveyResponse({
      surveyId: req.params.surveyId,
      beneficiaryId: req.beneficiaryId,
      responses,
      completionTime: req.body.completionTime || 0,
    });

    await surveyResponse.save();

    res.status(201).json({
      success: true,
      message: 'Survey response submitted successfully',
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to submit survey', error: error.message });
  }
});

// ==================== PROFILE ROUTES ====================

// Get Beneficiary Profile
router.get('/profile', authenticateBeneficiary, async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.beneficiaryId).select('-password');

    res.json({
      success: true,
      data: beneficiary,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
});

// Update Profile
router.put('/profile', authenticateBeneficiary, async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, familyMembers, notificationPreferences } =
      req.body;

    const beneficiary = await Beneficiary.findByIdAndUpdate(
      req.beneficiaryId,
      {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        familyMembers,
        notificationPreferences,
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: beneficiary,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to update profile', error: error.message });
  }
});

// Change Password
router.post('/profile/change-password', authenticateBeneficiary, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Invalid password data' });
    }

    const beneficiary = await Beneficiary.findById(req.beneficiaryId);

    // Verify current password
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');
    if (beneficiary.password !== currentHash) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update password
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    beneficiary.password = newHash;
    await beneficiary.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to change password', error: error.message });
  }
});

// ==================== DOCUMENT ROUTES ====================

// Upload Document
router.post('/documents/upload', authenticateBeneficiary, async (req, res) => {
  try {
    // File upload handling would be here
    const { fileName, fileUrl, fileSize, fileType, category, programId } = req.body;

    const document = new Document({
      beneficiaryId: req.beneficiaryId,
      programId,
      fileName,
      fileUrl,
      fileSize,
      fileType,
      category,
      uploadedBy: req.beneficiaryId,
    });

    await document.save();

    // Update beneficiary document count
    await Beneficiary.findByIdAndUpdate(req.beneficiaryId, { $inc: { documentUploadCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to upload document', error: error.message });
  }
});

// Get Documents
router.get('/documents', authenticateBeneficiary, async (req, res) => {
  try {
    const documents = await Document.find({
      beneficiaryId: req.beneficiaryId,
    }).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch documents', error: error.message });
  }
});

// ==================== NOTIFICATION ROUTES ====================

// Get Notifications
router.get('/notifications', authenticateBeneficiary, async (req, res) => {
  try {
    const notifications = await Notification.find({
      beneficiaryId: req.beneficiaryId,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({
      beneficiaryId: req.beneficiaryId,
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch notifications', error: error.message });
  }
});

// Mark Notification as Read
router.patch('/notifications/:notificationId/read', authenticateBeneficiary, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to update notification', error: error.message });
  }
});

module.exports = router;
