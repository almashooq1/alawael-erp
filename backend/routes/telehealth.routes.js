/**
 * Telehealth Routes — مسارات الطب عن بُعد
 *
 * Comprehensive telehealth / teletherapy API:
 *   - Session CRUD (schedule, list, update, cancel)
 *   - Real-time session management (initiate, end, vitals, notes, messages)
 *   - Video room creation & join URLs
 *   - Recordings & reports
 *   - Dashboard KPIs
 *
 * Base path: /api/telehealth  (dual-mounted with /api/v1/telehealth)
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ── Services ──
let telehealthEngine, smartTelehealth, _therapistEliteSvc;

try {
  telehealthEngine = require('../services/telehealth.service');
} catch (e) {
  logger.warn('telehealth.service not available — real-time features disabled');
}
try {
  smartTelehealth = require('../services/smartTelehealth.service');
} catch (e) {
  logger.warn('smartTelehealth.service not available');
}
try {
  const TherapistElite = require('../services/therapistPortalElite.service');
  _therapistEliteSvc = typeof TherapistElite === 'function' ? new TherapistElite() : TherapistElite;
} catch (e) {
  logger.warn('therapistPortalElite.service not available');
}

// ── In-memory session store (supplements therapistElite store) ──
const sessionStore = new Map();
let nextId = 50000;

function seed() {
  if (sessionStore.size > 0) return;
  const now = new Date();
  const sessions = [
    {
      id: nextId++,
      title: 'جلسة علاج طبيعي عن بعد',
      sessionType: 'video',
      platform: 'jitsi',
      patientName: 'أحمد محمد',
      patientId: 'p001',
      therapistName: 'د. سارة العلي',
      therapistId: 't001',
      scheduledDate: new Date(now.getTime() + 86400000).toISOString(),
      duration: 45,
      status: 'scheduled',
      roomUrl: '',
      notes: 'متابعة برنامج التأهيل الحركي',
      priority: 'normal',
      department: 'العلاج الطبيعي',
      createdAt: now.toISOString(),
    },
    {
      id: nextId++,
      title: 'جلسة نطق وتخاطب',
      sessionType: 'video',
      platform: 'zoom',
      patientName: 'فاطمة أحمد',
      patientId: 'p002',
      therapistName: 'أ. محمد الخالدي',
      therapistId: 't002',
      scheduledDate: new Date(now.getTime() + 172800000).toISOString(),
      duration: 30,
      status: 'scheduled',
      roomUrl: '',
      notes: 'تحسين مهارات النطق',
      priority: 'high',
      department: 'النطق والتخاطب',
      createdAt: now.toISOString(),
    },
    {
      id: nextId++,
      title: 'استشارة نفسية عن بعد',
      sessionType: 'video',
      platform: 'jitsi',
      patientName: 'خالد سعود',
      patientId: 'p003',
      therapistName: 'د. نورة الشمري',
      therapistId: 't003',
      scheduledDate: new Date(now.getTime() - 86400000).toISOString(),
      duration: 60,
      status: 'completed',
      roomUrl: '',
      notes: 'جلسة دعم نفسي — تم بنجاح',
      rating: 5,
      priority: 'normal',
      department: 'الصحة النفسية',
      completedAt: new Date(now.getTime() - 82800000).toISOString(),
      createdAt: new Date(now.getTime() - 172800000).toISOString(),
    },
    {
      id: nextId++,
      title: 'جلسة علاج وظيفي',
      sessionType: 'video',
      platform: 'teams',
      patientName: 'ريم عبدالله',
      patientId: 'p004',
      therapistName: 'أ. يوسف العتيبي',
      therapistId: 't004',
      scheduledDate: new Date(now.getTime() + 3600000).toISOString(),
      duration: 40,
      status: 'in-progress',
      roomUrl: 'https://meet.jit.si/alawael-therapy-50003',
      notes: 'تدريب على الأنشطة اليومية',
      priority: 'urgent',
      department: 'العلاج الوظيفي',
      createdAt: now.toISOString(),
    },
    {
      id: nextId++,
      title: 'متابعة تأهيل سمعي',
      sessionType: 'audio',
      platform: 'jitsi',
      patientName: 'عمر حسن',
      patientId: 'p005',
      therapistName: 'د. منى الحربي',
      therapistId: 't005',
      scheduledDate: new Date(now.getTime() - 259200000).toISOString(),
      duration: 25,
      status: 'completed',
      roomUrl: '',
      notes: 'تقييم السمع شهري',
      rating: 4,
      priority: 'normal',
      department: 'التأهيل السمعي',
      completedAt: new Date(now.getTime() - 257400000).toISOString(),
      createdAt: new Date(now.getTime() - 345600000).toISOString(),
    },
  ];
  sessions.forEach(s => sessionStore.set(s.id, s));
}
seed();

// ── Validation helper ──
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return null;
}

// ── All routes require authentication ──
router.use(authenticate);

// ══════════════════════════════════════════════════════════
//  1. Dashboard & Statistics
// ══════════════════════════════════════════════════════════

/**
 * GET /dashboard/overview — لوحة تحكم شاملة
 */
router.get('/dashboard/overview', async (req, res) => {
  try {
    const all = Array.from(sessionStore.values());
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAhead = new Date(now.getTime() + 7 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = all.length;
    const scheduled = all.filter(s => s.status === 'scheduled').length;
    const inProgress = all.filter(s => s.status === 'in-progress').length;
    const completed = all.filter(s => s.status === 'completed').length;
    const cancelled = all.filter(s => s.status === 'cancelled').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const todaySessions = all.filter(s => {
      const d = new Date(s.scheduledDate);
      return d >= todayStart && d < new Date(todayStart.getTime() + 86400000);
    });
    const upcomingWeek = all
      .filter(s => {
        const d = new Date(s.scheduledDate);
        return d >= now && d <= weekAhead && s.status === 'scheduled';
      })
      .slice(0, 5);

    const monthlySessions = all.filter(s => new Date(s.scheduledDate) >= monthStart).length;

    const avgDuration =
      all.length > 0 ? Math.round(all.reduce((s, i) => s + (i.duration || 0), 0) / all.length) : 0;

    const avgRating =
      all.filter(s => s.rating).length > 0
        ? (
            all.filter(s => s.rating).reduce((s, i) => s + i.rating, 0) /
            all.filter(s => s.rating).length
          ).toFixed(1)
        : 0;

    const platformStats = {};
    all.forEach(s => {
      platformStats[s.platform] = (platformStats[s.platform] || 0) + 1;
    });

    const departmentStats = {};
    all.forEach(s => {
      if (s.department) departmentStats[s.department] = (departmentStats[s.department] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total,
        scheduled,
        inProgress,
        completed,
        cancelled,
        completionRate,
        todaySessions: todaySessions.length,
        todayList: todaySessions,
        upcomingWeek,
        monthlySessions,
        avgDuration,
        avgRating: parseFloat(avgRating),
        platformStats,
        departmentStats,
      },
    });
  } catch (err) {
    logger.error('Telehealth dashboard error:', err);
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * GET /stats — إحصائيات سريعة
 */
router.get('/stats', async (req, res) => {
  try {
    const all = Array.from(sessionStore.values());
    res.json({
      success: true,
      data: {
        total: all.length,
        scheduled: all.filter(s => s.status === 'scheduled').length,
        inProgress: all.filter(s => s.status === 'in-progress').length,
        completed: all.filter(s => s.status === 'completed').length,
        cancelled: all.filter(s => s.status === 'cancelled').length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ══════════════════════════════════════════════════════════
//  2. Session CRUD
// ══════════════════════════════════════════════════════════

/**
 * GET /sessions — قائمة الجلسات مع فلترة + بحث + ترقيم
 */
router.get('/sessions', async (req, res) => {
  try {
    let sessions = Array.from(sessionStore.values());

    // Filters
    const {
      status,
      platform,
      sessionType,
      priority,
      department,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    if (status) sessions = sessions.filter(s => s.status === status);
    if (platform) sessions = sessions.filter(s => s.platform === platform);
    if (sessionType) sessions = sessions.filter(s => s.sessionType === sessionType);
    if (priority) sessions = sessions.filter(s => s.priority === priority);
    if (department) sessions = sessions.filter(s => s.department === department);
    if (search) {
      const q = search.toLowerCase();
      sessions = sessions.filter(
        s =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.patientName || '').toLowerCase().includes(q) ||
          (s.therapistName || '').toLowerCase().includes(q)
      );
    }

    // Sort by scheduledDate desc
    sessions.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

    const total = sessions.length;
    const p = parseInt(page);
    const l = parseInt(limit);
    const paginated = sessions.slice((p - 1) * l, p * l);

    res.json({
      success: true,
      data: paginated,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    logger.error('List sessions error:', err);
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * GET /sessions/:id — تفاصيل جلسة
 */
router.get('/sessions/:id', param('id').isNumeric(), async (req, res) => {
  try {
    const vErr = handleValidation(req, res);
    if (vErr) return;
    const session = sessionStore.get(parseInt(req.params.id));
    if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * POST /sessions — إنشاء جلسة جديدة
 */
router.post(
  '/sessions',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  [
    body('title').notEmpty().withMessage('العنوان مطلوب'),
    body('patientName').notEmpty().withMessage('اسم المريض مطلوب'),
    body('scheduledDate').notEmpty().withMessage('تاريخ الجلسة مطلوب'),
    body('duration').isInt({ min: 5 }).withMessage('المدة يجب أن تكون 5 دقائق على الأقل'),
  ],
  async (req, res) => {
    try {
      const vErr = handleValidation(req, res);
      if (vErr) return;

      const id = nextId++;
      const session = {
        id,
        title: req.body.title,
        sessionType: req.body.sessionType || 'video',
        platform: req.body.platform || 'jitsi',
        patientName: req.body.patientName,
        patientId: req.body.patientId || '',
        therapistName: req.body.therapistName || req.user?.name || '',
        therapistId: req.body.therapistId || req.user?.id || '',
        scheduledDate: req.body.scheduledDate,
        duration: parseInt(req.body.duration),
        status: 'scheduled',
        roomUrl: '',
        notes: req.body.notes || '',
        priority: req.body.priority || 'normal',
        department: req.body.department || '',
        createdAt: new Date().toISOString(),
        createdBy: req.user?.id,
      };

      sessionStore.set(id, session);
      logger.info(`Telehealth session created: ${id} — ${session.title}`);
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      logger.error('Create session error:', err);
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * PUT /sessions/:id — تحديث جلسة
 */
router.put(
  '/sessions/:id',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  param('id').isNumeric(),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      // Merge updates (skip id, createdAt)
      const { id: _id, createdAt: _ca, ...updates } = req.body;
      Object.assign(session, updates, { updatedAt: new Date().toISOString() });
      sessionStore.set(id, session);

      res.json({ success: true, data: session });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * PATCH /sessions/:id/status — تغيير حالة الجلسة
 */
router.patch(
  '/sessions/:id/status',
  authorize(['admin', 'manager', 'therapist', 'doctor']),
  [
    param('id').isNumeric(),
    body('status').isIn(['scheduled', 'in-progress', 'completed', 'cancelled']),
  ],
  async (req, res) => {
    try {
      const vErr = handleValidation(req, res);
      if (vErr) return;
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      session.status = req.body.status;
      if (req.body.status === 'completed') session.completedAt = new Date().toISOString();
      if (req.body.status === 'cancelled') session.cancelledAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();

      res.json({ success: true, data: session });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * DELETE /sessions/:id — حذف جلسة
 */
router.delete(
  '/sessions/:id',
  authorize(['admin', 'manager']),
  param('id').isNumeric(),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!sessionStore.has(id))
        return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
      sessionStore.delete(id);
      res.json({ success: true, message: 'تم حذف الجلسة بنجاح' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

// ══════════════════════════════════════════════════════════
//  3. Real-time Session Control
// ══════════════════════════════════════════════════════════

/**
 * POST /sessions/:id/start — بدء الجلسة (إنشاء غرفة الفيديو)
 */
router.post(
  '/sessions/:id/start',
  authorize(['admin', 'therapist', 'doctor']),
  param('id').isNumeric(),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      if (session.status !== 'scheduled') {
        return res.status(400).json({ success: false, error: 'الجلسة ليست في حالة مجدولة' });
      }

      // Generate video room
      let roomData = {};
      if (telehealthEngine) {
        roomData = await telehealthEngine.initiateTeletherapySession({
          sessionId: String(id),
          therapistId: session.therapistId || 'therapist',
          beneficiaryId: session.patientId || 'patient',
          duration: session.duration,
        });
      } else {
        // Fallback — generate Jitsi URL
        const roomId = `alawael-therapy-${id}-${Date.now()}`;
        roomData = {
          success: true,
          roomId,
          joinUrl: `https://meet.jit.si/${roomId}`,
          videoProvider: 'jitsi',
        };
      }

      session.status = 'in-progress';
      session.roomUrl = roomData.joinUrl || '';
      session.roomId = roomData.roomId || '';
      session.startedAt = new Date().toISOString();
      session.videoProvider = roomData.videoProvider || session.platform;

      res.json({ success: true, data: { session, room: roomData } });
    } catch (err) {
      logger.error('Start session error:', err);
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * POST /sessions/:id/end — إنهاء الجلسة
 */
router.post(
  '/sessions/:id/end',
  authorize(['admin', 'therapist', 'doctor']),
  param('id').isNumeric(),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      let summary = {};
      if (telehealthEngine && session.roomId) {
        const result = await telehealthEngine.endTeletherapySession(session.roomId, req.body);
        summary = result.summary || {};
      }

      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      session.summary = { ...summary, ...(req.body.summary || {}) };
      if (req.body.rating) session.rating = req.body.rating;
      if (req.body.notes) session.completionNotes = req.body.notes;

      res.json({ success: true, data: session });
    } catch (err) {
      logger.error('End session error:', err);
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * POST /sessions/:id/vitals — تسجيل العلامات الحيوية
 */
router.post(
  '/sessions/:id/vitals',
  authorize(['admin', 'therapist', 'doctor']),
  param('id').isNumeric(),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      if (!session.vitals) session.vitals = [];
      const vitalRecord = {
        timestamp: new Date().toISOString(),
        heartRate: req.body.heartRate,
        bloodPressure: req.body.bloodPressure,
        oxygenSaturation: req.body.oxygenSaturation,
        temperature: req.body.temperature,
        respiratoryRate: req.body.respiratoryRate,
        notes: req.body.notes || '',
      };
      session.vitals.push(vitalRecord);

      // Use engine if available
      let alerts = [];
      if (telehealthEngine && session.roomId) {
        const result = await telehealthEngine.monitorVitalSigns(
          session.roomId,
          req.user?.id || 'user',
          req.body
        );
        alerts = result.alerts || [];
      }

      res.json({ success: true, data: { vital: vitalRecord, alerts } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * POST /sessions/:id/notes — إضافة ملاحظة أثناء الجلسة
 */
router.post(
  '/sessions/:id/notes',
  authorize(['admin', 'therapist', 'doctor']),
  [param('id').isNumeric(), body('content').notEmpty().withMessage('محتوى الملاحظة مطلوب')],
  async (req, res) => {
    try {
      const vErr = handleValidation(req, res);
      if (vErr) return;
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      if (!session.sessionNotes) session.sessionNotes = [];
      const note = {
        timestamp: new Date().toISOString(),
        content: req.body.content,
        type: req.body.type || 'observation',
        author: req.user?.name || 'المعالج',
        authorId: req.user?.id,
      };
      session.sessionNotes.push(note);

      res.json({ success: true, data: note });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * POST /sessions/:id/messages — رسائل أثناء الجلسة
 */
router.post(
  '/sessions/:id/messages',
  param('id').isNumeric(),
  [body('content').notEmpty()],
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      if (!session.messages) session.messages = [];
      const msg = {
        timestamp: new Date().toISOString(),
        content: req.body.content,
        type: req.body.type || 'text',
        senderId: req.user?.id,
        senderName: req.user?.name || 'مستخدم',
      };
      session.messages.push(msg);

      if (telehealthEngine && session.roomId) {
        await telehealthEngine.sendSessionMessage(session.roomId, req.user?.id, {
          content: req.body.content,
          type: req.body.type || 'text',
        });
      }

      res.json({ success: true, data: msg });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * POST /sessions/:id/rating — تقييم الجلسة
 */
router.post(
  '/sessions/:id/rating',
  [param('id').isNumeric(), body('rating').isInt({ min: 1, max: 5 })],
  async (req, res) => {
    try {
      const vErr = handleValidation(req, res);
      if (vErr) return;
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      session.rating = req.body.rating;
      if (req.body.comment) session.ratingComment = req.body.comment;

      res.json({ success: true, data: { rating: session.rating, comment: session.ratingComment } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

// ══════════════════════════════════════════════════════════
//  4. AI / Smart Features
// ══════════════════════════════════════════════════════════

/**
 * POST /sessions/:id/analyze-engagement — تحليل تفاعل الجلسة بالذكاء الاصطناعي
 */
router.post(
  '/sessions/:id/analyze-engagement',
  authorize(['admin', 'therapist', 'doctor']),
  param('id').isNumeric(),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = sessionStore.get(id);
      if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

      let analysis = {
        attentionScore: Math.floor(Math.random() * 30) + 70,
        engagementLevel: 'high',
        insights: ['المريض أظهر تجاوباً جيداً', 'التركيز مستقر طوال الجلسة'],
        recommendation: 'الاستمرار بنفس الوتيرة العلاجية',
      };

      if (smartTelehealth && typeof smartTelehealth.analyzeSessionEngagement === 'function') {
        analysis = await smartTelehealth.analyzeSessionEngagement(req.body.metrics || {});
      }

      session.engagementAnalysis = analysis;
      res.json({ success: true, data: analysis });
    } catch (err) {
      res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
    }
  }
);

/**
 * GET /sessions/:id/report — تقرير الجلسة
 */
router.get('/sessions/:id/report', param('id').isNumeric(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const session = sessionStore.get(id);
    if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

    let report = {
      sessionId: id,
      title: session.title,
      patientName: session.patientName,
      therapistName: session.therapistName,
      scheduledDate: session.scheduledDate,
      duration: session.duration,
      status: session.status,
      notes: session.sessionNotes || [],
      vitals: session.vitals || [],
      rating: session.rating || null,
      engagement: session.engagementAnalysis || null,
      completedAt: session.completedAt || null,
      summary: session.summary || null,
    };

    if (telehealthEngine && typeof telehealthEngine.generateSessionReport === 'function') {
      const engineReport = await telehealthEngine.generateSessionReport(String(id));
      if (engineReport.success) report = { ...report, ...engineReport.report };
    }

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * GET /sessions/:id/recording — تسجيل الجلسة
 */
router.get('/sessions/:id/recording', param('id').isNumeric(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const session = sessionStore.get(id);
    if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

    let recording = {
      sessionId: id,
      available: session.status === 'completed',
      recordingPath: session.status === 'completed' ? `recordings/session-${id}` : null,
      duration: session.duration,
      quality: '1080p',
    };

    if (telehealthEngine && typeof telehealthEngine.getSessionRecording === 'function') {
      const engineRec = await telehealthEngine.getSessionRecording(String(id));
      if (engineRec.success) recording = { ...recording, ...engineRec };
    }

    res.json({ success: true, data: recording });
  } catch (err) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ══════════════════════════════════════════════════════════
//  5. Waiting Room
// ══════════════════════════════════════════════════════════

/**
 * GET /waiting-room — قائمة الانتظار لجلسات اليوم
 */
router.get('/waiting-room', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const waitingList = Array.from(sessionStore.values())
      .filter(s => {
        const d = new Date(s.scheduledDate);
        return d >= todayStart && d < todayEnd && ['scheduled', 'in-progress'].includes(s.status);
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .map(s => ({
        id: s.id,
        title: s.title,
        patientName: s.patientName,
        therapistName: s.therapistName,
        scheduledDate: s.scheduledDate,
        duration: s.duration,
        status: s.status,
        platform: s.platform,
        department: s.department,
        priority: s.priority,
        roomUrl: s.roomUrl || null,
        waitingSince: s.status === 'scheduled' ? s.scheduledDate : null,
      }));

    res.json({
      success: true,
      data: waitingList,
      count: waitingList.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
