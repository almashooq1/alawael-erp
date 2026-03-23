/**
 * Real-time Chat Service — نظام الدردشة الفورية
 * Phase 16: WebSocket chat بين الموظفين + مجموعات + مشاركة ملفات
 */
const logger = require('../utils/logger');

class ChatService {
  constructor() {
    // ═══ Data Stores ═══
    this.users = new Map();
    this.conversations = new Map(); // 1-on-1 and group chats
    this.messages = new Map();
    this.attachments = new Map();
    this.reactions = new Map();
    this.readReceipts = new Map();
    this.typingStatus = new Map();
    this.pinnedMessages = new Map();
    this.blockedUsers = new Map();
    this.notifications = new Map();

    // ═══ Auto-increment IDs (after seed data range) ═══
    this._nextConversationId = 200;
    this._nextMessageId = 10000;
    this._nextAttachmentId = 5000;
    this._nextReactionId = 6000;
    this._nextReceiptId = 7000;
    this._nextNotificationId = 8000;

    // ═══ WebSocket connections (userId → socket) ═══
    this._onlineUsers = new Map();

    this._seed();
  }

  // ═════════════════════════════════════════════════════════
  // SEED DATA — بيانات تجريبية
  // ═════════════════════════════════════════════════════════
  _seed() {
    // Users — المستخدمون
    const users = [
      { id: 'u1', name: 'أحمد الشهري', nameEn: 'Ahmed Al-Shahri', role: 'admin', department: 'الإدارة', avatar: null, email: 'ahmed@alawael.org', phone: '0501234567' },
      { id: 'u2', name: 'نورة العتيبي', nameEn: 'Noura Al-Otaibi', role: 'therapist', department: 'العلاج الطبيعي', avatar: null, email: 'noura@alawael.org', phone: '0507654321' },
      { id: 'u3', name: 'خالد المطيري', nameEn: 'Khalid Al-Mutairi', role: 'teacher', department: 'التعليم الخاص', avatar: null, email: 'khalid@alawael.org', phone: '0509876543' },
      { id: 'u4', name: 'فاطمة السبيعي', nameEn: 'Fatima Al-Subai', role: 'specialist', department: 'العلاج الوظيفي', avatar: null, email: 'fatima@alawael.org', phone: '0503456789' },
      { id: 'u5', name: 'محمد العنزي', nameEn: 'Mohammed Al-Anzi', role: 'manager', department: 'الموارد البشرية', avatar: null, email: 'mohammed@alawael.org', phone: '0504567890' },
      { id: 'u6', name: 'سارة الحربي', nameEn: 'Sara Al-Harbi', role: 'nurse', department: 'التمريض', avatar: null, email: 'sara@alawael.org', phone: '0505678901' },
    ];
    users.forEach(u => {
      u.status = 'online';
      u.lastSeen = new Date().toISOString();
      u.createdAt = new Date('2025-01-01').toISOString();
      this.users.set(u.id, u);
    });

    // Conversations — المحادثات
    const convs = [
      {
        id: '100', type: 'direct', name: null, description: null,
        participants: ['u1', 'u2'], admins: [],
        createdBy: 'u1', avatar: null, isPinned: false, isMuted: false,
        lastMessageId: '1002', unreadCount: { u1: 0, u2: 1 },
      },
      {
        id: '101', type: 'direct', name: null, description: null,
        participants: ['u1', 'u3'], admins: [],
        createdBy: 'u1', avatar: null, isPinned: false, isMuted: false,
        lastMessageId: '1004', unreadCount: { u1: 1, u3: 0 },
      },
      {
        id: '102', type: 'group', name: 'فريق العلاج', description: 'مجموعة فريق العلاج الطبيعي والوظيفي',
        participants: ['u1', 'u2', 'u4', 'u6'], admins: ['u1', 'u2'],
        createdBy: 'u1', avatar: null, isPinned: true, isMuted: false,
        lastMessageId: '1007', unreadCount: { u1: 0, u2: 0, u4: 2, u6: 1 },
      },
      {
        id: '103', type: 'group', name: 'الإدارة العامة', description: 'مجموعة الإدارة والمديرين',
        participants: ['u1', 'u3', 'u5'], admins: ['u1', 'u5'],
        createdBy: 'u5', avatar: null, isPinned: false, isMuted: false,
        lastMessageId: '1009', unreadCount: { u1: 0, u3: 1, u5: 0 },
      },
      {
        id: '104', type: 'channel', name: 'إعلانات المركز', description: 'قناة الإعلانات الرسمية لمركز الأوائل',
        participants: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], admins: ['u1', 'u5'],
        createdBy: 'u1', avatar: null, isPinned: true, isMuted: false,
        lastMessageId: '1011', unreadCount: { u1: 0, u2: 0, u3: 0, u4: 0, u5: 0, u6: 0 },
      },
    ];
    convs.forEach(c => {
      c.createdAt = new Date('2025-02-01').toISOString();
      c.updatedAt = new Date('2025-03-20').toISOString();
      this.conversations.set(c.id, c);
    });

    // Messages — الرسائل
    const msgs = [
      // Direct u1↔u2
      { id: '1000', conversationId: '100', senderId: 'u1', type: 'text', content: 'السلام عليكم نورة، كيف حال المريض أحمد؟', replyTo: null },
      { id: '1001', conversationId: '100', senderId: 'u2', type: 'text', content: 'وعليكم السلام، الحالة تتحسن والحمد لله', replyTo: null },
      { id: '1002', conversationId: '100', senderId: 'u1', type: 'text', content: 'ممتاز، أرسلي لي التقرير لو سمحتي', replyTo: null },
      // Direct u1↔u3
      { id: '1003', conversationId: '101', senderId: 'u1', type: 'text', content: 'خالد، هل جاهز تقرير الطلاب؟', replyTo: null },
      { id: '1004', conversationId: '101', senderId: 'u3', type: 'text', content: 'نعم سأرسله خلال ساعة إن شاء الله', replyTo: '1003' },
      // Group: فريق العلاج
      { id: '1005', conversationId: '102', senderId: 'u1', type: 'text', content: 'يا جماعة، الاجتماع غداً الساعة 10 صباحاً', replyTo: null },
      { id: '1006', conversationId: '102', senderId: 'u2', type: 'text', content: 'تمام، سأكون موجودة', replyTo: '1005' },
      { id: '1007', conversationId: '102', senderId: 'u4', type: 'file', content: 'تقرير_العلاج_الأسبوعي.pdf', replyTo: null, attachmentId: 'att-001' },
      // Group: الإدارة
      { id: '1008', conversationId: '103', senderId: 'u5', type: 'text', content: 'يرجى مراجعة الميزانية الشهرية المرفقة', replyTo: null },
      { id: '1009', conversationId: '103', senderId: 'u3', type: 'text', content: 'تم المراجعة، لدي بعض الملاحظات', replyTo: '1008' },
      // Channel: إعلانات
      { id: '1010', conversationId: '104', senderId: 'u1', type: 'text', content: 'إعلان: سيتم تحديث نظام الحضور يوم الأحد القادم', replyTo: null },
      { id: '1011', conversationId: '104', senderId: 'u5', type: 'text', content: 'تذكير: موعد التدريب على السلامة يوم الثلاثاء', replyTo: null },
    ];
    msgs.forEach(m => {
      m.status = 'delivered';
      m.isEdited = false;
      m.isDeleted = false;
      m.reactions = [];
      m.readBy = [m.senderId];
      m.createdAt = new Date('2025-03-20T10:00:00Z').toISOString();
      m.updatedAt = m.createdAt;
      this.messages.set(m.id, m);
    });

    // Attachments — المرفقات
    const atts = [
      { id: 'att-001', messageId: '1007', filename: 'تقرير_العلاج_الأسبوعي.pdf', originalName: 'تقرير_العلاج_الأسبوعي.pdf', mimeType: 'application/pdf', size: 245760, url: '/uploads/chat/att-001.pdf' },
      { id: 'att-002', messageId: null, filename: 'صورة_المركز.jpg', originalName: 'صورة_المركز.jpg', mimeType: 'image/jpeg', size: 1048576, url: '/uploads/chat/att-002.jpg' },
      { id: 'att-003', messageId: null, filename: 'خطة_التأهيل_2025.docx', originalName: 'خطة_التأهيل_2025.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 524288, url: '/uploads/chat/att-003.docx' },
    ];
    atts.forEach(a => {
      a.uploadedBy = 'u4';
      a.createdAt = new Date('2025-03-20').toISOString();
      this.attachments.set(a.id, a);
    });

    // Reactions on message 1005
    this.reactions.set('r-1', { id: 'r-1', messageId: '1005', userId: 'u2', emoji: '👍', createdAt: new Date('2025-03-20T10:05:00Z').toISOString() });
    this.reactions.set('r-2', { id: 'r-2', messageId: '1005', userId: 'u4', emoji: '👍', createdAt: new Date('2025-03-20T10:06:00Z').toISOString() });

    // Pinned messages
    this.pinnedMessages.set('pin-1', { id: 'pin-1', conversationId: '102', messageId: '1005', pinnedBy: 'u1', createdAt: new Date('2025-03-20').toISOString() });

    logger.info('ChatService seeded: 6 users, 5 conversations, 12 messages, 3 attachments');
  }

  // ═════════════════════════════════════════════════════════
  // USERS — المستخدمون
  // ═════════════════════════════════════════════════════════
  getUsers(filters = {}) {
    let items = Array.from(this.users.values());
    if (filters.search) {
      const s = filters.search.toLowerCase();
      items = items.filter(u =>
        u.name.toLowerCase().includes(s) ||
        (u.nameEn && u.nameEn.toLowerCase().includes(s)) ||
        u.department.toLowerCase().includes(s)
      );
    }
    if (filters.department) items = items.filter(u => u.department === filters.department);
    if (filters.status) items = items.filter(u => u.status === filters.status);
    return items;
  }

  getUserById(id) {
    const u = this.users.get(id);
    if (!u) throw Object.assign(new Error('المستخدم غير موجود'), { statusCode: 404 });
    return u;
  }

  setUserStatus(userId, status) {
    const u = this.getUserById(userId);
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      throw Object.assign(new Error('حالة غير صالحة'), { statusCode: 400 });
    }
    u.status = status;
    u.lastSeen = new Date().toISOString();
    return u;
  }

  getOnlineUsers() {
    return Array.from(this.users.values()).filter(u => u.status === 'online');
  }

  // ═════════════════════════════════════════════════════════
  // CONVERSATIONS — المحادثات
  // ═════════════════════════════════════════════════════════
  getConversations(userId) {
    return Array.from(this.conversations.values())
      .filter(c => c.participants.includes(userId))
      .map(c => this._enrichConversation(c, userId))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  _enrichConversation(conv, userId) {
    const result = { ...conv };
    // For direct chats, set display name to the other participant
    if (conv.type === 'direct') {
      const otherId = conv.participants.find(p => p !== userId);
      const other = this.users.get(otherId);
      if (other) {
        result.displayName = other.name;
        result.displayAvatar = other.avatar;
        result.otherUser = { id: other.id, name: other.name, status: other.status };
      }
    } else {
      result.displayName = conv.name;
      result.participantCount = conv.participants.length;
    }
    // Last message preview
    if (conv.lastMessageId) {
      const msg = this.messages.get(conv.lastMessageId);
      if (msg) {
        const sender = this.users.get(msg.senderId);
        result.lastMessage = {
          content: msg.isDeleted ? 'تم حذف الرسالة' : msg.content,
          senderId: msg.senderId,
          senderName: sender ? sender.name : 'غير معروف',
          type: msg.type,
          createdAt: msg.createdAt,
        };
      }
    }
    result.unread = (conv.unreadCount && conv.unreadCount[userId]) || 0;
    return result;
  }

  getConversationById(id, userId) {
    const c = this.conversations.get(String(id));
    if (!c) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (!c.participants.includes(userId)) {
      throw Object.assign(new Error('غير مصرح بالوصول لهذه المحادثة'), { statusCode: 403 });
    }
    return this._enrichConversation(c, userId);
  }

  createDirectConversation(userId, otherUserId) {
    this.getUserById(userId);
    this.getUserById(otherUserId);
    if (userId === otherUserId) {
      throw Object.assign(new Error('لا يمكن إنشاء محادثة مع نفسك'), { statusCode: 400 });
    }
    // Check if direct conversation already exists
    const existing = Array.from(this.conversations.values()).find(c =>
      c.type === 'direct' &&
      c.participants.includes(userId) &&
      c.participants.includes(otherUserId)
    );
    if (existing) return this._enrichConversation(existing, userId);

    const id = String(this._nextConversationId++);
    const conv = {
      id, type: 'direct', name: null, description: null,
      participants: [userId, otherUserId], admins: [],
      createdBy: userId, avatar: null, isPinned: false, isMuted: false,
      lastMessageId: null, unreadCount: { [userId]: 0, [otherUserId]: 0 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.conversations.set(id, conv);
    logger.info(`Direct conversation created: ${id} (${userId} ↔ ${otherUserId})`);
    return this._enrichConversation(conv, userId);
  }

  createGroupConversation(userId, data) {
    if (!data.name) throw Object.assign(new Error('اسم المجموعة مطلوب'), { statusCode: 400 });
    if (!data.participants || !Array.isArray(data.participants) || data.participants.length < 1) {
      throw Object.assign(new Error('يجب إضافة مشارك واحد على الأقل'), { statusCode: 400 });
    }
    // Validate all participants exist
    const allParticipants = [userId, ...data.participants.filter(p => p !== userId)];
    allParticipants.forEach(pid => this.getUserById(pid));

    const id = String(this._nextConversationId++);
    const conv = {
      id, type: data.type === 'channel' ? 'channel' : 'group',
      name: data.name, description: data.description || '',
      participants: allParticipants, admins: [userId],
      createdBy: userId, avatar: data.avatar || null,
      isPinned: false, isMuted: false,
      lastMessageId: null,
      unreadCount: Object.fromEntries(allParticipants.map(p => [p, 0])),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.conversations.set(id, conv);
    logger.info(`Group conversation created: ${data.name} (${id}) by ${userId}`);
    return conv;
  }

  updateConversation(convId, userId, data) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (conv.type === 'direct') {
      throw Object.assign(new Error('لا يمكن تعديل محادثة فردية'), { statusCode: 400 });
    }
    if (!conv.admins.includes(userId)) {
      throw Object.assign(new Error('يجب أن تكون مشرفاً لتعديل المجموعة'), { statusCode: 403 });
    }
    if (data.name) conv.name = data.name;
    if (data.description !== undefined) conv.description = data.description;
    if (data.avatar !== undefined) conv.avatar = data.avatar;
    conv.updatedAt = new Date().toISOString();
    return conv;
  }

  deleteConversation(convId, userId) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (conv.type === 'direct') {
      throw Object.assign(new Error('لا يمكن حذف محادثة فردية'), { statusCode: 400 });
    }
    if (!conv.admins.includes(userId) && conv.createdBy !== userId) {
      throw Object.assign(new Error('يجب أن تكون مشرفاً لحذف المجموعة'), { statusCode: 403 });
    }
    // Delete all messages in this conversation
    for (const [msgId, msg] of this.messages) {
      if (msg.conversationId === String(convId)) this.messages.delete(msgId);
    }
    this.conversations.delete(String(convId));
    logger.info(`Conversation deleted: ${convId} by ${userId}`);
    return { message: 'تم حذف المحادثة بنجاح' };
  }

  // ═════════════════════════════════════════════════════════
  // GROUP MANAGEMENT — إدارة المجموعات
  // ═════════════════════════════════════════════════════════
  addParticipant(convId, userId, targetUserId) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (conv.type === 'direct') {
      throw Object.assign(new Error('لا يمكن إضافة مشاركين لمحادثة فردية'), { statusCode: 400 });
    }
    if (!conv.admins.includes(userId)) {
      throw Object.assign(new Error('يجب أن تكون مشرفاً لإضافة مشاركين'), { statusCode: 403 });
    }
    this.getUserById(targetUserId);
    if (conv.participants.includes(targetUserId)) {
      throw Object.assign(new Error('المستخدم موجود بالفعل في المجموعة'), { statusCode: 400 });
    }
    conv.participants.push(targetUserId);
    conv.unreadCount[targetUserId] = 0;
    conv.updatedAt = new Date().toISOString();
    logger.info(`User ${targetUserId} added to conversation ${convId}`);
    return conv;
  }

  removeParticipant(convId, userId, targetUserId) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (conv.type === 'direct') {
      throw Object.assign(new Error('لا يمكن إزالة مشاركين من محادثة فردية'), { statusCode: 400 });
    }
    if (!conv.admins.includes(userId) && userId !== targetUserId) {
      throw Object.assign(new Error('يجب أن تكون مشرفاً لإزالة مشاركين'), { statusCode: 403 });
    }
    if (!conv.participants.includes(targetUserId)) {
      throw Object.assign(new Error('المستخدم غير موجود في المجموعة'), { statusCode: 404 });
    }
    conv.participants = conv.participants.filter(p => p !== targetUserId);
    conv.admins = conv.admins.filter(a => a !== targetUserId);
    delete conv.unreadCount[targetUserId];
    conv.updatedAt = new Date().toISOString();
    logger.info(`User ${targetUserId} removed from conversation ${convId}`);
    return conv;
  }

  promoteToAdmin(convId, userId, targetUserId) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (!conv.admins.includes(userId)) {
      throw Object.assign(new Error('يجب أن تكون مشرفاً'), { statusCode: 403 });
    }
    if (!conv.participants.includes(targetUserId)) {
      throw Object.assign(new Error('المستخدم غير موجود في المجموعة'), { statusCode: 404 });
    }
    if (conv.admins.includes(targetUserId)) {
      throw Object.assign(new Error('المستخدم مشرف بالفعل'), { statusCode: 400 });
    }
    conv.admins.push(targetUserId);
    conv.updatedAt = new Date().toISOString();
    return conv;
  }

  // ═════════════════════════════════════════════════════════
  // MESSAGES — الرسائل
  // ═════════════════════════════════════════════════════════
  getMessages(convId, userId, options = {}) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (!conv.participants.includes(userId)) {
      throw Object.assign(new Error('غير مصرح بالوصول'), { statusCode: 403 });
    }

    let msgs = Array.from(this.messages.values())
      .filter(m => m.conversationId === String(convId) && !m.isDeleted);

    // Search within messages
    if (options.search) {
      const s = options.search.toLowerCase();
      msgs = msgs.filter(m => m.content && m.content.toLowerCase().includes(s));
    }

    msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const limit = parseInt(options.limit) || 50;
    const offset = parseInt(options.offset) || 0;
    const total = msgs.length;
    msgs = msgs.slice(offset, offset + limit);

    // Enrich with sender info
    const enriched = msgs.map(m => {
      const sender = this.users.get(m.senderId);
      const result = { ...m, sender: sender ? { id: sender.id, name: sender.name, avatar: sender.avatar } : null };
      // Include attachment info
      if (m.attachmentId) {
        const att = this.attachments.get(m.attachmentId);
        if (att) result.attachment = att;
      }
      // Include reply-to message
      if (m.replyTo) {
        const replyMsg = this.messages.get(m.replyTo);
        if (replyMsg) {
          const replySender = this.users.get(replyMsg.senderId);
          result.replyToMessage = {
            id: replyMsg.id, content: replyMsg.isDeleted ? 'تم حذف الرسالة' : replyMsg.content,
            senderId: replyMsg.senderId, senderName: replySender ? replySender.name : 'غير معروف',
          };
        }
      }
      // Include reactions
      const msgReactions = Array.from(this.reactions.values()).filter(r => r.messageId === m.id);
      if (msgReactions.length > 0) {
        result.reactions = msgReactions.map(r => ({
          emoji: r.emoji, userId: r.userId,
          userName: this.users.get(r.userId)?.name || 'غير معروف',
        }));
      }
      return result;
    });

    return { messages: enriched, total, limit, offset };
  }

  sendMessage(convId, userId, data) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (!conv.participants.includes(userId)) {
      throw Object.assign(new Error('غير مصرح بإرسال رسائل في هذه المحادثة'), { statusCode: 403 });
    }
    if (!data.content && !data.attachmentId) {
      throw Object.assign(new Error('محتوى الرسالة مطلوب'), { statusCode: 400 });
    }
    // Channel: only admins can post
    if (conv.type === 'channel' && !conv.admins.includes(userId)) {
      throw Object.assign(new Error('فقط المشرفون يمكنهم الإرسال في القنوات'), { statusCode: 403 });
    }

    const validTypes = ['text', 'file', 'image', 'audio', 'video', 'system'];
    const type = validTypes.includes(data.type) ? data.type : 'text';

    const id = String(this._nextMessageId++);
    const msg = {
      id, conversationId: String(convId), senderId: userId,
      type, content: data.content || '',
      replyTo: data.replyTo || null,
      attachmentId: data.attachmentId || null,
      status: 'sent', isEdited: false, isDeleted: false,
      reactions: [], readBy: [userId],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.messages.set(id, msg);

    // Update conversation
    conv.lastMessageId = id;
    conv.updatedAt = msg.createdAt;
    // Increment unread count for other participants
    conv.participants.forEach(pid => {
      if (pid !== userId) {
        conv.unreadCount[pid] = (conv.unreadCount[pid] || 0) + 1;
      }
    });

    // Enrich for response
    const sender = this.users.get(userId);
    const enriched = { ...msg, sender: sender ? { id: sender.id, name: sender.name, avatar: sender.avatar } : null };

    logger.info(`Message sent: ${id} in conversation ${convId} by ${userId}`);
    return enriched;
  }

  editMessage(messageId, userId, newContent) {
    const msg = this.messages.get(String(messageId));
    if (!msg) throw Object.assign(new Error('الرسالة غير موجودة'), { statusCode: 404 });
    if (msg.senderId !== userId) {
      throw Object.assign(new Error('يمكنك تعديل رسائلك فقط'), { statusCode: 403 });
    }
    if (msg.isDeleted) {
      throw Object.assign(new Error('لا يمكن تعديل رسالة محذوفة'), { statusCode: 400 });
    }
    if (!newContent) {
      throw Object.assign(new Error('محتوى الرسالة مطلوب'), { statusCode: 400 });
    }
    msg.content = newContent;
    msg.isEdited = true;
    msg.updatedAt = new Date().toISOString();
    return msg;
  }

  deleteMessage(messageId, userId) {
    const msg = this.messages.get(String(messageId));
    if (!msg) throw Object.assign(new Error('الرسالة غير موجودة'), { statusCode: 404 });
    // Allow sender or conversation admin to delete
    const conv = this.conversations.get(msg.conversationId);
    if (msg.senderId !== userId && (!conv || !conv.admins.includes(userId))) {
      throw Object.assign(new Error('غير مصرح بحذف هذه الرسالة'), { statusCode: 403 });
    }
    msg.isDeleted = true;
    msg.content = 'تم حذف الرسالة';
    msg.updatedAt = new Date().toISOString();
    return { message: 'تم حذف الرسالة بنجاح' };
  }

  searchMessages(userId, query) {
    if (!query) throw Object.assign(new Error('كلمة البحث مطلوبة'), { statusCode: 400 });
    const userConvIds = Array.from(this.conversations.values())
      .filter(c => c.participants.includes(userId))
      .map(c => c.id);

    const s = query.toLowerCase();
    const results = Array.from(this.messages.values())
      .filter(m =>
        userConvIds.includes(m.conversationId) &&
        !m.isDeleted &&
        m.content && m.content.toLowerCase().includes(s)
      )
      .map(m => {
        const conv = this.conversations.get(m.conversationId);
        const sender = this.users.get(m.senderId);
        return {
          ...m,
          conversationName: conv ? (conv.name || 'محادثة خاصة') : null,
          senderName: sender ? sender.name : 'غير معروف',
        };
      });
    return results;
  }

  // ═════════════════════════════════════════════════════════
  // REACTIONS — التفاعلات
  // ═════════════════════════════════════════════════════════
  addReaction(messageId, userId, emoji) {
    const msg = this.messages.get(String(messageId));
    if (!msg) throw Object.assign(new Error('الرسالة غير موجودة'), { statusCode: 404 });
    if (!emoji) throw Object.assign(new Error('الرمز التعبيري مطلوب'), { statusCode: 400 });

    // Check if user already reacted with same emoji
    const existing = Array.from(this.reactions.values()).find(
      r => r.messageId === String(messageId) && r.userId === userId && r.emoji === emoji
    );
    if (existing) {
      // Toggle off — remove reaction
      this.reactions.delete(existing.id);
      return { removed: true, emoji };
    }

    const id = `r-${this._nextReactionId++}`;
    this.reactions.set(id, {
      id, messageId: String(messageId), userId, emoji,
      createdAt: new Date().toISOString(),
    });
    return { added: true, emoji };
  }

  getReactions(messageId) {
    return Array.from(this.reactions.values())
      .filter(r => r.messageId === String(messageId))
      .map(r => ({
        ...r,
        userName: this.users.get(r.userId)?.name || 'غير معروف',
      }));
  }

  // ═════════════════════════════════════════════════════════
  // READ RECEIPTS — إيصالات القراءة
  // ═════════════════════════════════════════════════════════
  markAsRead(convId, userId) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (!conv.participants.includes(userId)) {
      throw Object.assign(new Error('غير مصرح بالوصول'), { statusCode: 403 });
    }
    // Reset unread count
    if (conv.unreadCount) conv.unreadCount[userId] = 0;
    // Mark all messages as read by this user
    const msgs = Array.from(this.messages.values())
      .filter(m => m.conversationId === String(convId) && !m.readBy.includes(userId));
    msgs.forEach(m => m.readBy.push(userId));

    return { conversationId: convId, markedRead: msgs.length };
  }

  getUnreadCount(userId) {
    let total = 0;
    const byConversation = {};
    for (const conv of this.conversations.values()) {
      if (conv.participants.includes(userId)) {
        const count = (conv.unreadCount && conv.unreadCount[userId]) || 0;
        if (count > 0) {
          byConversation[conv.id] = count;
          total += count;
        }
      }
    }
    return { total, byConversation };
  }

  // ═════════════════════════════════════════════════════════
  // PINNED MESSAGES — الرسائل المثبتة
  // ═════════════════════════════════════════════════════════
  pinMessage(convId, messageId, userId) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    const msg = this.messages.get(String(messageId));
    if (!msg || msg.conversationId !== String(convId)) {
      throw Object.assign(new Error('الرسالة غير موجودة في هذه المحادثة'), { statusCode: 404 });
    }
    // Check if already pinned
    const alreadyPinned = Array.from(this.pinnedMessages.values()).find(
      p => p.conversationId === String(convId) && p.messageId === String(messageId)
    );
    if (alreadyPinned) throw Object.assign(new Error('الرسالة مثبتة بالفعل'), { statusCode: 400 });

    const pinId = `pin-${Date.now()}`;
    this.pinnedMessages.set(pinId, {
      id: pinId, conversationId: String(convId), messageId: String(messageId),
      pinnedBy: userId, createdAt: new Date().toISOString(),
    });
    return { pinned: true, messageId };
  }

  unpinMessage(convId, messageId) {
    const pin = Array.from(this.pinnedMessages.values()).find(
      p => p.conversationId === String(convId) && p.messageId === String(messageId)
    );
    if (!pin) throw Object.assign(new Error('الرسالة غير مثبتة'), { statusCode: 404 });
    this.pinnedMessages.delete(pin.id);
    return { unpinned: true, messageId };
  }

  getPinnedMessages(convId) {
    const pins = Array.from(this.pinnedMessages.values())
      .filter(p => p.conversationId === String(convId));
    return pins.map(p => {
      const msg = this.messages.get(p.messageId);
      const sender = msg ? this.users.get(msg.senderId) : null;
      return {
        ...p,
        message: msg ? { id: msg.id, content: msg.content, type: msg.type, senderId: msg.senderId, senderName: sender ? sender.name : null } : null,
      };
    });
  }

  // ═════════════════════════════════════════════════════════
  // FILE SHARING — مشاركة الملفات
  // ═════════════════════════════════════════════════════════
  uploadAttachment(userId, fileData) {
    if (!fileData.filename) throw Object.assign(new Error('اسم الملف مطلوب'), { statusCode: 400 });
    if (!fileData.mimeType) throw Object.assign(new Error('نوع الملف مطلوب'), { statusCode: 400 });

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileData.size && fileData.size > maxSize) {
      throw Object.assign(new Error('حجم الملف يتجاوز الحد المسموح (50MB)'), { statusCode: 400 });
    }

    const id = `att-${this._nextAttachmentId++}`;
    const att = {
      id, messageId: null,
      filename: fileData.filename,
      originalName: fileData.originalName || fileData.filename,
      mimeType: fileData.mimeType,
      size: fileData.size || 0,
      url: `/uploads/chat/${id}_${fileData.filename}`,
      uploadedBy: userId,
      createdAt: new Date().toISOString(),
    };
    this.attachments.set(id, att);
    logger.info(`File uploaded: ${fileData.filename} by ${userId}`);
    return att;
  }

  getAttachment(id) {
    const att = this.attachments.get(id);
    if (!att) throw Object.assign(new Error('المرفق غير موجود'), { statusCode: 404 });
    return att;
  }

  getConversationAttachments(convId, userId) {
    const conv = this.conversations.get(String(convId));
    if (!conv) throw Object.assign(new Error('المحادثة غير موجودة'), { statusCode: 404 });
    if (!conv.participants.includes(userId)) {
      throw Object.assign(new Error('غير مصرح بالوصول'), { statusCode: 403 });
    }
    const msgIds = Array.from(this.messages.values())
      .filter(m => m.conversationId === String(convId) && m.attachmentId)
      .map(m => m.attachmentId);
    return msgIds.map(aId => this.attachments.get(aId)).filter(Boolean);
  }

  // ═════════════════════════════════════════════════════════
  // TYPING INDICATORS — مؤشرات الكتابة
  // ═════════════════════════════════════════════════════════
  setTyping(convId, userId, isTyping) {
    const key = `${convId}:${userId}`;
    if (isTyping) {
      this.typingStatus.set(key, { convId, userId, timestamp: Date.now() });
    } else {
      this.typingStatus.delete(key);
    }
    return { convId, userId, isTyping };
  }

  getTypingUsers(convId, excludeUserId) {
    const now = Date.now();
    const typingUsers = [];
    for (const [key, val] of this.typingStatus) {
      if (val.convId === String(convId) && val.userId !== excludeUserId) {
        // Auto-expire after 5 seconds
        if (now - val.timestamp < 5000) {
          const user = this.users.get(val.userId);
          typingUsers.push({ userId: val.userId, name: user ? user.name : 'غير معروف' });
        } else {
          this.typingStatus.delete(key);
        }
      }
    }
    return typingUsers;
  }

  // ═════════════════════════════════════════════════════════
  // BLOCKED USERS — حظر المستخدمين
  // ═════════════════════════════════════════════════════════
  blockUser(userId, blockedUserId) {
    if (userId === blockedUserId) {
      throw Object.assign(new Error('لا يمكن حظر نفسك'), { statusCode: 400 });
    }
    this.getUserById(blockedUserId);
    const key = `${userId}:${blockedUserId}`;
    if (this.blockedUsers.has(key)) {
      throw Object.assign(new Error('المستخدم محظور بالفعل'), { statusCode: 400 });
    }
    this.blockedUsers.set(key, { userId, blockedUserId, createdAt: new Date().toISOString() });
    return { blocked: true, blockedUserId };
  }

  unblockUser(userId, blockedUserId) {
    const key = `${userId}:${blockedUserId}`;
    if (!this.blockedUsers.has(key)) {
      throw Object.assign(new Error('المستخدم غير محظور'), { statusCode: 404 });
    }
    this.blockedUsers.delete(key);
    return { unblocked: true, blockedUserId };
  }

  getBlockedUsers(userId) {
    const blocked = [];
    for (const [, val] of this.blockedUsers) {
      if (val.userId === userId) {
        const user = this.users.get(val.blockedUserId);
        blocked.push({ ...val, blockedUserName: user ? user.name : 'غير معروف' });
      }
    }
    return blocked;
  }

  // ═════════════════════════════════════════════════════════
  // DASHBOARD — لوحة المعلومات
  // ═════════════════════════════════════════════════════════
  getDashboard(userId) {
    const conversations = this.getConversations(userId);
    const unread = this.getUnreadCount(userId);
    const onlineUsers = this.getOnlineUsers();
    const totalMessages = Array.from(this.messages.values()).length;
    const totalConversations = conversations.length;
    const totalAttachments = Array.from(this.attachments.values()).length;

    // Message stats by type
    const msgsByType = {};
    for (const msg of this.messages.values()) {
      msgsByType[msg.type] = (msgsByType[msg.type] || 0) + 1;
    }

    // Active conversations (those with messages in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeConversations = conversations.filter(c =>
      c.lastMessage && new Date(c.lastMessage.createdAt) > weekAgo
    ).length;

    // Top participants by message count
    const participantCounts = {};
    for (const msg of this.messages.values()) {
      if (!msg.isDeleted) {
        participantCounts[msg.senderId] = (participantCounts[msg.senderId] || 0) + 1;
      }
    }
    const topParticipants = Object.entries(participantCounts)
      .map(([userId, count]) => {
        const user = this.users.get(userId);
        return { userId, name: user ? user.name : 'غير معروف', messageCount: count };
      })
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 5);

    return {
      kpis: {
        totalConversations,
        totalMessages,
        totalAttachments,
        onlineUsers: onlineUsers.length,
        totalUnread: unread.total,
        activeConversations,
        directChats: conversations.filter(c => c.type === 'direct').length,
        groupChats: conversations.filter(c => c.type === 'group' || c.type === 'channel').length,
      },
      recentConversations: conversations.slice(0, 5),
      onlineUsers: onlineUsers.map(u => ({ id: u.id, name: u.name, department: u.department, avatar: u.avatar })),
      msgsByType,
      topParticipants,
      unreadByConversation: unread.byConversation,
    };
  }
}

module.exports = new ChatService();
