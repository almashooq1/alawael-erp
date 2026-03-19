const VirtualSession = require('../models/VirtualSession');
const { sendSuccess, sendError } = require('../utils/responseHelpers');

// Create virtual session
exports.createSession = async (req, res) => {
  try {
    const {
      title,
      description,
      sessionType,
      targetDisabilityCategory,
      scheduledDate,
      duration,
      maxParticipants,
      meetingLink,
      platform,
      language,
      accessibilityServices,
    } = req.body;

    if (!title || !description || !sessionType || !scheduledDate || !duration || !meetingLink) {
      return sendError(res, 'جميع الحقول المطلوبة يجب أن تكون مملوءة', 400);
    }

    const session = await VirtualSession.create({
      title,
      description,
      sessionType,
      targetDisabilityCategory,
      scheduledDate,
      duration,
      maxParticipants,
      meetingLink,
      platform,
      language,
      accessibilityServices,
      instructor: req.user._id,
      status: 'draft',
    });

    await session.populate('instructor', 'name email');

    sendSuccess(res, session, 'تم إنشاء الجلسة بنجاح', 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get all sessions
exports.getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.targetDisabilityCategory = { $in: [category, 'all'] };
    }

    const sessions = await VirtualSession.find(query)
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('instructor', 'name email')
      .populate('coInstructors', 'name email');

    const total = await VirtualSession.countDocuments(query);

    sendSuccess(
      res,
      {
        sessions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
      'تم جلب الجلسات بنجاح'
    );
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get upcoming sessions
exports.getUpcomingSessions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const sessions = await VirtualSession.getUpcomingSessions(parseInt(limit));

    sendSuccess(res, sessions, 'تم جلب الجلسات القادمة بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get session by category
exports.getSessionsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const sessions = await VirtualSession.getByCategory(category);

    sendSuccess(res, sessions, `تم جلب الجلسات للفئة: ${category}`);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get single session
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await VirtualSession.findById(id)
      .populate('instructor', 'name email')
      .populate('coInstructors', 'name email')
      .populate('registrations.userId', 'name email');

    if (!session) {
      return sendError(res, 'الجلسة غير موجودة', 404);
    }

    sendSuccess(res, session, 'تم جلب الجلسة بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Register for session
exports.registerForSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await VirtualSession.findById(id);

    if (!session) {
      return sendError(res, 'الجلسة غير موجودة', 404);
    }

    // Check if already registered
    const alreadyRegistered = session.registrations.some(
      (r) => r.userId.toString() === req.user._id.toString()
    );

    if (alreadyRegistered) {
      return sendError(res, 'أنت مسجل بالفعل في هذه الجلسة', 400);
    }

    // Check if session is full
    if (session.currentParticipants >= session.maxParticipants) {
      return sendError(res, 'الجلسة ممتلئة', 400);
    }

    // Add registration
    session.registrations.push({
      userId: req.user._id,
      registrationDate: new Date(),
      status: 'registered',
    });

    session.currentParticipants += 1;
    session.statistics.registeredCount = session.registrations.length;

    await session.save();

    sendSuccess(res, session, 'تم التسجيل في الجلسة بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Cancel registration
exports.cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await VirtualSession.findById(id);

    if (!session) {
      return sendError(res, 'الجلسة غير موجودة', 404);
    }

    const registration = session.registrations.find(
      (r) => r.userId.toString() === req.user._id.toString()
    );

    if (!registration) {
      return sendError(res, 'أنت غير مسجل في هذه الجلسة', 400);
    }

    session.registrations = session.registrations.filter(
      (r) => r.userId.toString() !== req.user._id.toString()
    );

    session.currentParticipants = Math.max(0, session.currentParticipants - 1);
    session.statistics.registeredCount = session.registrations.length;

    await session.save();

    sendSuccess(res, session, 'تم إلغاء التسجيل بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Update session
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await VirtualSession.findById(id);

    if (!session) {
      return sendError(res, 'الجلسة غير موجودة', 404);
    }

    // Check authorization
    if (
      session.instructor.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return sendError(res, 'لا تملك صلاحية لتعديل هذه الجلسة', 403);
    }

    const updatedSession = await VirtualSession.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    sendSuccess(res, updatedSession, 'تم تحديث الجلسة بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Mark session as completed
exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { recordingUrl } = req.body;

    const session = await VirtualSession.findById(id);

    if (!session) {
      return sendError(res, 'الجلسة غير موجودة', 404);
    }

    // Check authorization
    if (
      session.instructor.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return sendError(res, 'لا تملك صلاحية لإكمال هذه الجلسة', 403);
    }

    session.status = 'completed';
    if (recordingUrl) {
      session.recordingUrl = recordingUrl;
    }

    await session.save();

    sendSuccess(res, session, 'تم وضع علامة على الجلسة كمكتملة');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Add feedback
exports.addFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 'التقييم يجب أن يكون بين 1 و 5', 400);
    }

    const session = await VirtualSession.findById(id);

    if (!session) {
      return sendError(res, 'الجلسة غير موجودة', 404);
    }

    // Check if user is registered
    const isRegistered = session.registrations.some(
      (r) => r.userId.toString() === req.user._id.toString()
    );

    if (!isRegistered) {
      return sendError(res, 'يجب أن تكون مسجلاً في الجلسة لإضافة تعليق', 400);
    }

    session.feedback.push({
      userId: req.user._id,
      rating,
      comment,
    });

    // Update average rating
    const ratings = session.feedback.map((f) => f.rating);
    session.statistics.averageRating =
      Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;

    await session.save();

    sendSuccess(res, session.feedback[session.feedback.length - 1], 'تم إضافة التعليق بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// Get session statistics
exports.getSessionStatistics = async (req, res) => {
  try {
    const sessions = await VirtualSession.find();

    const stats = {
      totalSessions: sessions.length,
      scheduledSessions: sessions.filter((s) => s.status === 'scheduled').length,
      completedSessions: sessions.filter((s) => s.status === 'completed').length,
      cancelledSessions: sessions.filter((s) => s.status === 'cancelled').length,
      totalRegistrations: sessions.reduce((sum, s) => sum + s.statistics.registeredCount, 0),
      totalAttendees: sessions.reduce((sum, s) => sum + s.statistics.attendedCount, 0),
      averageRating: Math.round(
        (sessions.reduce((sum, s) => sum + s.statistics.averageRating, 0) /
          sessions.length) *
          10
      ) / 10,
    };

    sendSuccess(res, stats, 'تم جلب إحصائيات الجلسات بنجاح');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};
