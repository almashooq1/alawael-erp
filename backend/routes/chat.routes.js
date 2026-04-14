/**
 * Real-time Chat Routes — مسارات الدردشة الفورية
 *
 * 35 API endpoints:
 *   📊 Dashboard:       KPIs, statistics, chat overview
 *   👥 Users:           List users, online status, search
 *   💬 Conversations:   CRUD, direct + group + channel
 *   📝 Messages:        Send, edit, delete, search, list
 *   👤 Participants:    Add/remove members, promote admin
 *   😀 Reactions:       Add/remove/list reactions
 *   ✅ Read Receipts:   Mark as read, unread count
 *   📌 Pinned:          Pin/unpin/list pinned messages
 *   📎 Attachments:     Upload, download, list
 *   ⌨️ Typing:          Set/get typing indicators
 *   🚫 Blocked:         Block/unblock users
 *
 * Base path: /api/chat  (dual-mounted with /api/v1/chat)
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const _logger = require('../utils/logger');

// ── Service ──
const chat = require('../services/chat.service');
const safeError = require('../utils/safeError');

// ── Validation helper ──
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

// Helper to get current user id
function getUserId(req) {
  return req.user?.id || req.user?.userId || 'u1';
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة المعلومات
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const data = chat.getDashboard(getUserId(req));
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// USERS — المستخدمون
// ══════════════════════════════════════════════════════════════════════════════

router.get('/users', authenticate, async (req, res) => {
  try {
    const data = chat.getUsers(req.query);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'chat');
  }
});

router.get('/users/online', authenticate, async (req, res) => {
  try {
    const data = chat.getOnlineUsers();
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'chat');
  }
});

router.get(
  '/users/:id',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المستخدم مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getUserById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.put(
  '/users/status',
  authenticate,
  [body('status').isIn(['online', 'away', 'busy', 'offline']).withMessage('حالة غير صالحة')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.setUserStatus(getUserId(req), req.body.status);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSATIONS — المحادثات
// ══════════════════════════════════════════════════════════════════════════════

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const data = chat.getConversations(getUserId(req));
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'chat');
  }
});

router.get(
  '/conversations/:id',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getConversationById(req.params.id, getUserId(req));
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.post(
  '/conversations/direct',
  authenticate,
  [body('userId').notEmpty().withMessage('معرّف المستخدم مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.createDirectConversation(getUserId(req), req.body.userId);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.post(
  '/conversations/group',
  authenticate,
  [
    body('name').notEmpty().withMessage('اسم المجموعة مطلوب'),
    body('participants').isArray({ min: 1 }).withMessage('يجب إضافة مشارك واحد على الأقل'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.createGroupConversation(getUserId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.put(
  '/conversations/:id',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.updateConversation(req.params.id, getUserId(req), req.body);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.delete(
  '/conversations/:id',
  authenticate,
  authorize(['admin', 'manager']),
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.deleteConversation(req.params.id, getUserId(req));
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PARTICIPANTS — إدارة المشاركين
// ══════════════════════════════════════════════════════════════════════════════

router.post(
  '/conversations/:id/participants',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف المحادثة مطلوب'),
    body('userId').notEmpty().withMessage('معرّف المستخدم مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.addParticipant(req.params.id, getUserId(req), req.body.userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.delete(
  '/conversations/:id/participants/:userId',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف المحادثة مطلوب'),
    param('userId').notEmpty().withMessage('معرّف المستخدم مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.removeParticipant(req.params.id, getUserId(req), req.params.userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.post(
  '/conversations/:id/admins',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف المحادثة مطلوب'),
    body('userId').notEmpty().withMessage('معرّف المستخدم مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.promoteToAdmin(req.params.id, getUserId(req), req.body.userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGES — الرسائل
// ══════════════════════════════════════════════════════════════════════════════

router.get(
  '/conversations/:id/messages',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getMessages(req.params.id, getUserId(req), req.query);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.post(
  '/conversations/:id/messages',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف المحادثة مطلوب'),
    body('content').optional().isString().withMessage('محتوى الرسالة يجب أن يكون نص'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.sendMessage(req.params.id, getUserId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.put(
  '/messages/:id',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف الرسالة مطلوب'),
    body('content').notEmpty().withMessage('محتوى الرسالة مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.editMessage(req.params.id, getUserId(req), req.body.content);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.delete(
  '/messages/:id',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف الرسالة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.deleteMessage(req.params.id, getUserId(req));
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.get('/messages/search', authenticate, async (req, res) => {
  try {
    const data = chat.searchMessages(getUserId(req), req.query.q);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// REACTIONS — التفاعلات
// ══════════════════════════════════════════════════════════════════════════════

router.post(
  '/messages/:id/reactions',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف الرسالة مطلوب'),
    body('emoji').notEmpty().withMessage('الرمز التعبيري مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.addReaction(req.params.id, getUserId(req), req.body.emoji);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.get(
  '/messages/:id/reactions',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف الرسالة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getReactions(req.params.id);
      res.json({ success: true, data, total: data.length });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// READ RECEIPTS — إيصالات القراءة
// ══════════════════════════════════════════════════════════════════════════════

router.post(
  '/conversations/:id/read',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.markAsRead(req.params.id, getUserId(req));
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.get('/unread', authenticate, async (req, res) => {
  try {
    const data = chat.getUnreadCount(getUserId(req));
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'chat');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PINNED MESSAGES — الرسائل المثبتة
// ══════════════════════════════════════════════════════════════════════════════

router.get(
  '/conversations/:id/pinned',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getPinnedMessages(req.params.id);
      res.json({ success: true, data, total: data.length });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.post(
  '/conversations/:id/pinned',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف المحادثة مطلوب'),
    body('messageId').notEmpty().withMessage('معرّف الرسالة مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.pinMessage(req.params.id, req.body.messageId, getUserId(req));
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.delete(
  '/conversations/:id/pinned/:messageId',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف المحادثة مطلوب'),
    param('messageId').notEmpty().withMessage('معرّف الرسالة مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.unpinMessage(req.params.id, req.params.messageId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// ATTACHMENTS — المرفقات
// ══════════════════════════════════════════════════════════════════════════════

router.post(
  '/attachments',
  authenticate,
  [
    body('filename').notEmpty().withMessage('اسم الملف مطلوب'),
    body('mimeType').notEmpty().withMessage('نوع الملف مطلوب'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.uploadAttachment(getUserId(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.get(
  '/attachments/:id',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المرفق مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getAttachment(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.get(
  '/conversations/:id/attachments',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getConversationAttachments(req.params.id, getUserId(req));
      res.json({ success: true, data, total: data.length });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// TYPING INDICATORS — مؤشرات الكتابة
// ══════════════════════════════════════════════════════════════════════════════

router.post(
  '/conversations/:id/typing',
  authenticate,
  [
    param('id').notEmpty().withMessage('معرّف المحادثة مطلوب'),
    body('isTyping').isBoolean().withMessage('يجب تحديد حالة الكتابة'),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.setTyping(req.params.id, getUserId(req), req.body.isTyping);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.get(
  '/conversations/:id/typing',
  authenticate,
  [param('id').notEmpty().withMessage('معرّف المحادثة مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.getTypingUsers(req.params.id, getUserId(req));
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'chat');
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// BLOCKED USERS — حظر المستخدمين
// ══════════════════════════════════════════════════════════════════════════════

router.get('/blocked', authenticate, async (req, res) => {
  try {
    const data = chat.getBlockedUsers(getUserId(req));
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    safeError(res, err, 'chat');
  }
});

router.post(
  '/blocked',
  authenticate,
  [body('userId').notEmpty().withMessage('معرّف المستخدم مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.blockUser(getUserId(req), req.body.userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

router.delete(
  '/blocked/:userId',
  authenticate,
  [param('userId').notEmpty().withMessage('معرّف المستخدم مطلوب')],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    try {
      const data = chat.unblockUser(getUserId(req), req.params.userId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false });
    }
  }
);

module.exports = router;
