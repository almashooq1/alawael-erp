/**
 * Unit Tests — ChatService (chat.service.js)
 * Comprehensive coverage for all 34 public methods
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const service = require('../../services/chat.service');

beforeEach(() => {
  // Clear ALL maps to prevent state leaking between tests
  service.users.clear();
  service.conversations.clear();
  service.messages.clear();
  service.attachments.clear();
  service.reactions.clear();
  service.readReceipts.clear();
  service.typingStatus.clear();
  service.pinnedMessages.clear();
  service.blockedUsers.clear();
  service.notifications.clear();
  // Reset auto-increment counters
  service._nextConversationId = 200;
  service._nextMessageId = 10000;
  service._nextAttachmentId = 5000;
  service._nextReactionId = 6000;
  service._nextReceiptId = 7000;
  service._nextNotificationId = 8000;
  service._seed();
});

// ═══════════════════════════════════════════════════════════
// 1. MODULE EXPORTS
// ═══════════════════════════════════════════════════════════
describe('Module exports', () => {
  it('should export a singleton object (not a class)', () => {
    expect(typeof service).toBe('object');
    expect(service).not.toBeNull();
  });

  it('should expose all user methods', () => {
    expect(typeof service.getUsers).toBe('function');
    expect(typeof service.getUserById).toBe('function');
    expect(typeof service.setUserStatus).toBe('function');
    expect(typeof service.getOnlineUsers).toBe('function');
  });

  it('should expose all conversation methods', () => {
    expect(typeof service.getConversations).toBe('function');
    expect(typeof service.getConversationById).toBe('function');
    expect(typeof service.createDirectConversation).toBe('function');
    expect(typeof service.createGroupConversation).toBe('function');
    expect(typeof service.updateConversation).toBe('function');
    expect(typeof service.deleteConversation).toBe('function');
  });

  it('should expose all group management methods', () => {
    expect(typeof service.addParticipant).toBe('function');
    expect(typeof service.removeParticipant).toBe('function');
    expect(typeof service.promoteToAdmin).toBe('function');
  });

  it('should expose all message methods', () => {
    expect(typeof service.getMessages).toBe('function');
    expect(typeof service.sendMessage).toBe('function');
    expect(typeof service.editMessage).toBe('function');
    expect(typeof service.deleteMessage).toBe('function');
    expect(typeof service.searchMessages).toBe('function');
  });

  it('should expose reaction, read-receipt, pin, file, typing, block, dashboard methods', () => {
    expect(typeof service.addReaction).toBe('function');
    expect(typeof service.getReactions).toBe('function');
    expect(typeof service.markAsRead).toBe('function');
    expect(typeof service.getUnreadCount).toBe('function');
    expect(typeof service.pinMessage).toBe('function');
    expect(typeof service.unpinMessage).toBe('function');
    expect(typeof service.getPinnedMessages).toBe('function');
    expect(typeof service.uploadAttachment).toBe('function');
    expect(typeof service.getAttachment).toBe('function');
    expect(typeof service.getConversationAttachments).toBe('function');
    expect(typeof service.setTyping).toBe('function');
    expect(typeof service.getTypingUsers).toBe('function');
    expect(typeof service.blockUser).toBe('function');
    expect(typeof service.unblockUser).toBe('function');
    expect(typeof service.getBlockedUsers).toBe('function');
    expect(typeof service.getDashboard).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════
// 2. USERS — المستخدمون
// ═══════════════════════════════════════════════════════════
describe('Users', () => {
  describe('getUsers', () => {
    it('should return all 6 seeded users when no filters given', () => {
      const users = service.getUsers();
      expect(users).toHaveLength(6);
    });

    it('should filter by Arabic name search', () => {
      const users = service.getUsers({ search: 'أحمد' });
      expect(users.length).toBeGreaterThanOrEqual(1);
      expect(users[0].id).toBe('u1');
    });

    it('should filter by English name search (case-insensitive)', () => {
      const users = service.getUsers({ search: 'ahmed' });
      expect(users.length).toBeGreaterThanOrEqual(1);
      expect(users[0].id).toBe('u1');
    });

    it('should filter by department name search', () => {
      const users = service.getUsers({ search: 'التعليم' });
      expect(users.some(u => u.id === 'u3')).toBe(true);
    });

    it('should filter by department exact match', () => {
      const users = service.getUsers({ department: 'التمريض' });
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('u6');
    });

    it('should filter by status', () => {
      service.setUserStatus('u1', 'away');
      const online = service.getUsers({ status: 'online' });
      expect(online.every(u => u.status === 'online')).toBe(true);
      expect(online.find(u => u.id === 'u1')).toBeUndefined();
    });

    it('should return empty array when no users match', () => {
      const users = service.getUsers({ search: 'غير موجود أبداً' });
      expect(users).toHaveLength(0);
    });

    it('should combine search + department filters', () => {
      const users = service.getUsers({ search: 'نورة', department: 'العلاج الطبيعي' });
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('u2');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', () => {
      const user = service.getUserById('u1');
      expect(user.id).toBe('u1');
      expect(user.name).toBe('أحمد الشهري');
    });

    it('should throw 404 for non-existent user', () => {
      expect(() => service.getUserById('bad')).toThrow('المستخدم غير موجود');
      try {
        service.getUserById('bad');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });
  });

  describe('setUserStatus', () => {
    it('should set status to online', () => {
      service.setUserStatus('u1', 'offline');
      const u = service.setUserStatus('u1', 'online');
      expect(u.status).toBe('online');
    });

    it('should set status to away', () => {
      const u = service.setUserStatus('u1', 'away');
      expect(u.status).toBe('away');
    });

    it('should set status to busy', () => {
      const u = service.setUserStatus('u1', 'busy');
      expect(u.status).toBe('busy');
    });

    it('should set status to offline', () => {
      const u = service.setUserStatus('u1', 'offline');
      expect(u.status).toBe('offline');
    });

    it('should update lastSeen', () => {
      const before = new Date().toISOString();
      const u = service.setUserStatus('u1', 'away');
      expect(u.lastSeen >= before).toBe(true);
    });

    it('should throw 400 for invalid status', () => {
      expect(() => service.setUserStatus('u1', 'invisible')).toThrow('حالة غير صالحة');
      try {
        service.setUserStatus('u1', 'invisible');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 404 for non-existent user', () => {
      expect(() => service.setUserStatus('ghost', 'online')).toThrow('المستخدم غير موجود');
    });
  });

  describe('getOnlineUsers', () => {
    it('should return all 6 users initially (all seeded as online)', () => {
      const online = service.getOnlineUsers();
      expect(online).toHaveLength(6);
    });

    it('should exclude users set to offline', () => {
      service.setUserStatus('u1', 'offline');
      service.setUserStatus('u2', 'away');
      const online = service.getOnlineUsers();
      expect(online).toHaveLength(4);
      expect(online.find(u => u.id === 'u1')).toBeUndefined();
      expect(online.find(u => u.id === 'u2')).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 3. CONVERSATIONS — المحادثات
// ═══════════════════════════════════════════════════════════
describe('Conversations', () => {
  describe('getConversations', () => {
    it('should return enriched conversations for u1 (participant in all 5)', () => {
      const convs = service.getConversations('u1');
      expect(convs.length).toBe(5);
    });

    it('should be sorted by updatedAt descending', () => {
      const convs = service.getConversations('u1');
      for (let i = 1; i < convs.length; i++) {
        expect(new Date(convs[i - 1].updatedAt) >= new Date(convs[i].updatedAt)).toBe(true);
      }
    });

    it('should enrich direct conversation with otherUser info', () => {
      const convs = service.getConversations('u1');
      const direct = convs.find(c => c.id === '100');
      expect(direct).toBeDefined();
      expect(direct.displayName).toBe('نورة العتيبي');
      expect(direct.otherUser).toBeDefined();
      expect(direct.otherUser.id).toBe('u2');
    });

    it('should enrich group conversation with participantCount', () => {
      const convs = service.getConversations('u1');
      const group = convs.find(c => c.id === '102');
      expect(group.displayName).toBe('فريق العلاج');
      expect(group.participantCount).toBe(4);
    });

    it('should include lastMessage preview', () => {
      const convs = service.getConversations('u1');
      const conv = convs.find(c => c.id === '100');
      expect(conv.lastMessage).toBeDefined();
      expect(conv.lastMessage.content).toBeDefined();
      expect(conv.lastMessage.senderName).toBeDefined();
    });

    it('should include unread count', () => {
      const convs = service.getConversations('u1');
      const conv101 = convs.find(c => c.id === '101');
      expect(conv101.unread).toBe(1);
    });

    it('should return only conversations where user participates', () => {
      // u6 is only in conv 102 and 104
      const convs = service.getConversations('u6');
      convs.forEach(c => {
        expect(c.participants).toContain('u6');
      });
    });
  });

  describe('getConversationById', () => {
    it('should return enriched conversation when found and user is participant', () => {
      const conv = service.getConversationById('100', 'u1');
      expect(conv.id).toBe('100');
      expect(conv.displayName).toBeDefined();
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.getConversationById('999', 'u1')).toThrow('المحادثة غير موجودة');
      try {
        service.getConversationById('999', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 403 when user is not a participant', () => {
      expect(() => service.getConversationById('100', 'u4')).toThrow(
        'غير مصرح بالوصول لهذه المحادثة'
      );
      try {
        service.getConversationById('100', 'u4');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });
  });

  describe('createDirectConversation', () => {
    it('should return existing conversation if direct chat already exists', () => {
      const conv = service.createDirectConversation('u1', 'u2');
      expect(conv.id).toBe('100');
    });

    it('should create new direct conversation for new pair', () => {
      const conv = service.createDirectConversation('u2', 'u3');
      expect(conv.type).toBe('direct');
      expect(conv.participants).toContain('u2');
      expect(conv.participants).toContain('u3');
    });

    it('should throw 400 when creating conversation with self', () => {
      expect(() => service.createDirectConversation('u1', 'u1')).toThrow(
        'لا يمكن إنشاء محادثة مع نفسك'
      );
      try {
        service.createDirectConversation('u1', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 404 when other user does not exist', () => {
      expect(() => service.createDirectConversation('u1', 'nonexistent')).toThrow(
        'المستخدم غير موجود'
      );
    });

    it('should throw 404 when calling user does not exist', () => {
      expect(() => service.createDirectConversation('nonexistent', 'u1')).toThrow(
        'المستخدم غير موجود'
      );
    });

    it('should be idempotent — same conv returned regardless of argument order', () => {
      const conv1 = service.createDirectConversation('u1', 'u2');
      const conv2 = service.createDirectConversation('u2', 'u1');
      expect(conv1.id).toBe(conv2.id);
    });

    it('should enrich the returned conversation', () => {
      const conv = service.createDirectConversation('u4', 'u5');
      expect(conv.displayName).toBeDefined();
    });
  });

  describe('createGroupConversation', () => {
    it('should create group with valid data', () => {
      const conv = service.createGroupConversation('u1', {
        name: 'مجموعة اختبار',
        participants: ['u2', 'u3'],
      });
      expect(conv.type).toBe('group');
      expect(conv.name).toBe('مجموعة اختبار');
      expect(conv.participants).toContain('u1');
      expect(conv.participants).toContain('u2');
      expect(conv.participants).toContain('u3');
      expect(conv.admins).toContain('u1');
    });

    it('should create channel when type is channel', () => {
      const conv = service.createGroupConversation('u1', {
        name: 'قناة اختبار',
        type: 'channel',
        participants: ['u2'],
      });
      expect(conv.type).toBe('channel');
    });

    it('should throw 400 when name is missing', () => {
      expect(() => service.createGroupConversation('u1', { participants: ['u2'] })).toThrow(
        'اسم المجموعة مطلوب'
      );
      try {
        service.createGroupConversation('u1', { participants: ['u2'] });
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 400 when participants missing', () => {
      expect(() => service.createGroupConversation('u1', { name: 'test' })).toThrow(
        'يجب إضافة مشارك واحد على الأقل'
      );
    });

    it('should throw 400 when participants empty array', () => {
      expect(() =>
        service.createGroupConversation('u1', { name: 'test', participants: [] })
      ).toThrow('يجب إضافة مشارك واحد على الأقل');
    });

    it('should throw 404 when participant does not exist', () => {
      expect(() =>
        service.createGroupConversation('u1', { name: 'test', participants: ['ghost'] })
      ).toThrow('المستخدم غير موجود');
    });

    it('should not duplicate creator in participants list', () => {
      const conv = service.createGroupConversation('u1', {
        name: 'test',
        participants: ['u1', 'u2'],
      });
      const u1Count = conv.participants.filter(p => p === 'u1').length;
      expect(u1Count).toBe(1);
    });

    it('should set description and avatar when provided', () => {
      const conv = service.createGroupConversation('u1', {
        name: 'grp',
        description: 'وصف المجموعة',
        avatar: 'avatar.png',
        participants: ['u2'],
      });
      expect(conv.description).toBe('وصف المجموعة');
      expect(conv.avatar).toBe('avatar.png');
    });
  });

  describe('updateConversation', () => {
    it('should update group name and description', () => {
      const conv = service.updateConversation('102', 'u1', {
        name: 'اسم جديد',
        description: 'وصف جديد',
      });
      expect(conv.name).toBe('اسم جديد');
      expect(conv.description).toBe('وصف جديد');
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.updateConversation('999', 'u1', { name: 'x' })).toThrow(
        'المحادثة غير موجودة'
      );
      try {
        service.updateConversation('999', 'u1', { name: 'x' });
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 400 for direct conversation', () => {
      expect(() => service.updateConversation('100', 'u1', { name: 'x' })).toThrow(
        'لا يمكن تعديل محادثة فردية'
      );
      try {
        service.updateConversation('100', 'u1', { name: 'x' });
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 403 when non-admin tries to update', () => {
      expect(() => service.updateConversation('102', 'u4', { name: 'x' })).toThrow(
        'يجب أن تكون مشرفاً لتعديل المجموعة'
      );
      try {
        service.updateConversation('102', 'u4', { name: 'x' });
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should update avatar', () => {
      const conv = service.updateConversation('102', 'u1', { avatar: 'new.png' });
      expect(conv.avatar).toBe('new.png');
    });

    it('should update updatedAt timestamp', () => {
      const before = new Date().toISOString();
      const conv = service.updateConversation('102', 'u1', { name: 'aaa' });
      expect(conv.updatedAt >= before).toBe(true);
    });
  });

  describe('deleteConversation', () => {
    it('should delete group conversation when admin', () => {
      const result = service.deleteConversation('102', 'u1');
      expect(result.message).toBe('تم حذف المحادثة بنجاح');
      expect(() => service.getConversationById('102', 'u1')).toThrow();
    });

    it('should delete all messages in the conversation', () => {
      const msgsBefore = Array.from(service.messages.values()).filter(
        m => m.conversationId === '102'
      );
      expect(msgsBefore.length).toBeGreaterThan(0);
      service.deleteConversation('102', 'u1');
      const msgsAfter = Array.from(service.messages.values()).filter(
        m => m.conversationId === '102'
      );
      expect(msgsAfter).toHaveLength(0);
    });

    it('should allow creator (non-admin) to delete', () => {
      // conv 103 createdBy u5, admins [u1, u5]
      const result = service.deleteConversation('103', 'u5');
      expect(result.message).toBe('تم حذف المحادثة بنجاح');
    });

    it('should throw 400 for direct conversation', () => {
      expect(() => service.deleteConversation('100', 'u1')).toThrow('لا يمكن حذف محادثة فردية');
      try {
        service.deleteConversation('100', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 403 when non-admin/non-creator tries to delete', () => {
      expect(() => service.deleteConversation('102', 'u6')).toThrow(
        'يجب أن تكون مشرفاً لحذف المجموعة'
      );
      try {
        service.deleteConversation('102', 'u6');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.deleteConversation('999', 'u1')).toThrow('المحادثة غير موجودة');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 4. GROUP MANAGEMENT — إدارة المجموعات
// ═══════════════════════════════════════════════════════════
describe('Group management', () => {
  describe('addParticipant', () => {
    it('should add a new participant to group', () => {
      const conv = service.addParticipant('102', 'u1', 'u3');
      expect(conv.participants).toContain('u3');
    });

    it('should initialize unread count for new participant', () => {
      const conv = service.addParticipant('102', 'u1', 'u3');
      expect(conv.unreadCount['u3']).toBe(0);
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.addParticipant('999', 'u1', 'u3')).toThrow('المحادثة غير موجودة');
      try {
        service.addParticipant('999', 'u1', 'u3');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 400 for direct conversation', () => {
      expect(() => service.addParticipant('100', 'u1', 'u3')).toThrow(
        'لا يمكن إضافة مشاركين لمحادثة فردية'
      );
      try {
        service.addParticipant('100', 'u1', 'u3');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 403 when non-admin tries to add', () => {
      expect(() => service.addParticipant('102', 'u4', 'u3')).toThrow(
        'يجب أن تكون مشرفاً لإضافة مشاركين'
      );
      try {
        service.addParticipant('102', 'u4', 'u3');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should throw 404 when target user does not exist', () => {
      expect(() => service.addParticipant('102', 'u1', 'ghost')).toThrow('المستخدم غير موجود');
    });

    it('should throw 400 when user is already a participant', () => {
      expect(() => service.addParticipant('102', 'u1', 'u2')).toThrow(
        'المستخدم موجود بالفعل في المجموعة'
      );
      try {
        service.addParticipant('102', 'u1', 'u2');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should update updatedAt', () => {
      const before = new Date().toISOString();
      const conv = service.addParticipant('102', 'u1', 'u3');
      expect(conv.updatedAt >= before).toBe(true);
    });
  });

  describe('removeParticipant', () => {
    it('should allow admin to remove another participant', () => {
      const conv = service.removeParticipant('102', 'u1', 'u4');
      expect(conv.participants).not.toContain('u4');
    });

    it('should allow user to remove themselves (self-leave)', () => {
      const conv = service.removeParticipant('102', 'u4', 'u4');
      expect(conv.participants).not.toContain('u4');
    });

    it('should also remove from admins list', () => {
      const conv = service.removeParticipant('102', 'u1', 'u2');
      expect(conv.admins).not.toContain('u2');
    });

    it('should delete unreadCount entry for removed user', () => {
      const conv = service.removeParticipant('102', 'u1', 'u4');
      expect(conv.unreadCount['u4']).toBeUndefined();
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.removeParticipant('999', 'u1', 'u2')).toThrow('المحادثة غير موجودة');
    });

    it('should throw 400 for direct conversation', () => {
      expect(() => service.removeParticipant('100', 'u1', 'u2')).toThrow(
        'لا يمكن إزالة مشاركين من محادثة فردية'
      );
      try {
        service.removeParticipant('100', 'u1', 'u2');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 403 when non-admin tries to remove someone else', () => {
      expect(() => service.removeParticipant('102', 'u6', 'u4')).toThrow(
        'يجب أن تكون مشرفاً لإزالة مشاركين'
      );
      try {
        service.removeParticipant('102', 'u6', 'u4');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should throw 404 when target user is not in the group', () => {
      expect(() => service.removeParticipant('102', 'u1', 'u3')).toThrow(
        'المستخدم غير موجود في المجموعة'
      );
      try {
        service.removeParticipant('102', 'u1', 'u3');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });
  });

  describe('promoteToAdmin', () => {
    it('should promote participant to admin', () => {
      const conv = service.promoteToAdmin('102', 'u1', 'u4');
      expect(conv.admins).toContain('u4');
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.promoteToAdmin('999', 'u1', 'u4')).toThrow('المحادثة غير موجودة');
      try {
        service.promoteToAdmin('999', 'u1', 'u4');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 403 when non-admin tries to promote', () => {
      expect(() => service.promoteToAdmin('102', 'u4', 'u6')).toThrow('يجب أن تكون مشرفاً');
      try {
        service.promoteToAdmin('102', 'u4', 'u6');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should throw 404 when target is not in the group', () => {
      expect(() => service.promoteToAdmin('102', 'u1', 'u3')).toThrow(
        'المستخدم غير موجود في المجموعة'
      );
      try {
        service.promoteToAdmin('102', 'u1', 'u3');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 400 when target is already admin', () => {
      expect(() => service.promoteToAdmin('102', 'u1', 'u2')).toThrow('المستخدم مشرف بالفعل');
      try {
        service.promoteToAdmin('102', 'u1', 'u2');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should update updatedAt', () => {
      const before = new Date().toISOString();
      const conv = service.promoteToAdmin('102', 'u1', 'u4');
      expect(conv.updatedAt >= before).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 5. MESSAGES — الرسائل
// ═══════════════════════════════════════════════════════════
describe('Messages', () => {
  describe('getMessages', () => {
    it('should return messages for a conversation', () => {
      const result = service.getMessages('100', 'u1');
      expect(result.messages).toBeDefined();
      expect(result.total).toBe(3); // 1000, 1001, 1002
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should sort messages by createdAt ascending', () => {
      const result = service.getMessages('100', 'u1');
      for (let i = 1; i < result.messages.length; i++) {
        expect(
          new Date(result.messages[i].createdAt) >= new Date(result.messages[i - 1].createdAt)
        ).toBe(true);
      }
    });

    it('should enrich messages with sender info', () => {
      const result = service.getMessages('100', 'u1');
      expect(result.messages[0].sender).toBeDefined();
      expect(result.messages[0].sender.id).toBe('u1');
      expect(result.messages[0].sender.name).toBe('أحمد الشهري');
    });

    it('should filter by search keyword', () => {
      const result = service.getMessages('100', 'u1', { search: 'المريض' });
      expect(result.messages.length).toBe(1);
      expect(result.messages[0].id).toBe('1000');
    });

    it('should support pagination with limit and offset', () => {
      const result = service.getMessages('100', 'u1', { limit: 2, offset: 0 });
      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('should support pagination offset', () => {
      const result = service.getMessages('100', 'u1', { limit: 2, offset: 2 });
      expect(result.messages).toHaveLength(1);
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.getMessages('999', 'u1')).toThrow('المحادثة غير موجودة');
    });

    it('should throw 403 when user is not a participant', () => {
      expect(() => service.getMessages('100', 'u4')).toThrow('غير مصرح بالوصول');
      try {
        service.getMessages('100', 'u4');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should exclude deleted messages', () => {
      service.deleteMessage('1000', 'u1');
      const result = service.getMessages('100', 'u1');
      expect(result.messages.find(m => m.id === '1000')).toBeUndefined();
    });

    it('should include attachment info for file messages', () => {
      const result = service.getMessages('102', 'u1');
      const fileMsg = result.messages.find(m => m.id === '1007');
      expect(fileMsg).toBeDefined();
      expect(fileMsg.attachment).toBeDefined();
      expect(fileMsg.attachment.filename).toBe('تقرير_العلاج_الأسبوعي.pdf');
    });

    it('should include replyTo message info', () => {
      const result = service.getMessages('101', 'u1');
      const replyMsg = result.messages.find(m => m.id === '1004');
      expect(replyMsg.replyToMessage).toBeDefined();
      expect(replyMsg.replyToMessage.id).toBe('1003');
    });

    it('should include reactions on messages', () => {
      const result = service.getMessages('102', 'u1');
      const msg1005 = result.messages.find(m => m.id === '1005');
      expect(msg1005.reactions).toBeDefined();
      expect(msg1005.reactions.length).toBe(2);
    });
  });

  describe('sendMessage', () => {
    it('should send a text message and return enriched result', () => {
      const msg = service.sendMessage('100', 'u1', { content: 'مرحبا' });
      expect(msg.id).toBeDefined();
      expect(msg.content).toBe('مرحبا');
      expect(msg.senderId).toBe('u1');
      expect(msg.type).toBe('text');
      expect(msg.sender).toBeDefined();
      expect(msg.sender.name).toBe('أحمد الشهري');
    });

    it('should set default type to text', () => {
      const msg = service.sendMessage('100', 'u1', { content: 'test' });
      expect(msg.type).toBe('text');
    });

    it('should accept valid message types', () => {
      const msg = service.sendMessage('100', 'u1', { content: 'file', type: 'file' });
      expect(msg.type).toBe('file');
    });

    it('should default invalid type to text', () => {
      const msg = service.sendMessage('100', 'u1', { content: 'test', type: 'unknown' });
      expect(msg.type).toBe('text');
    });

    it('should allow sending message with attachmentId only (no content)', () => {
      const msg = service.sendMessage('100', 'u1', { attachmentId: 'att-001' });
      expect(msg.attachmentId).toBe('att-001');
    });

    it('should throw 400 when no content and no attachmentId', () => {
      expect(() => service.sendMessage('100', 'u1', {})).toThrow('محتوى الرسالة مطلوب');
      try {
        service.sendMessage('100', 'u1', {});
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.sendMessage('999', 'u1', { content: 'hi' })).toThrow(
        'المحادثة غير موجودة'
      );
    });

    it('should throw 403 when user is not a participant', () => {
      expect(() => service.sendMessage('100', 'u4', { content: 'hi' })).toThrow(
        'غير مصرح بإرسال رسائل في هذه المحادثة'
      );
      try {
        service.sendMessage('100', 'u4', { content: 'hi' });
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should restrict channel messages to admins only', () => {
      // conv 104: admins [u1, u5]; u2 is participant but not admin
      expect(() => service.sendMessage('104', 'u2', { content: 'hi' })).toThrow(
        'فقط المشرفون يمكنهم الإرسال في القنوات'
      );
      try {
        service.sendMessage('104', 'u2', { content: 'hi' });
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should allow channel admin to send message', () => {
      const msg = service.sendMessage('104', 'u1', { content: 'إعلان جديد' });
      expect(msg.content).toBe('إعلان جديد');
    });

    it('should increment unread count for other participants', () => {
      service.sendMessage('100', 'u1', { content: 'test' });
      const conv = service.conversations.get('100');
      expect(conv.unreadCount['u2']).toBeGreaterThanOrEqual(2); // was 1, now +1
    });

    it('should not increment unread for the sender', () => {
      const convBefore = service.conversations.get('100');
      const senderUnread = convBefore.unreadCount['u1'];
      service.sendMessage('100', 'u1', { content: 'test' });
      const convAfter = service.conversations.get('100');
      expect(convAfter.unreadCount['u1']).toBe(senderUnread);
    });

    it('should update conversation lastMessageId and updatedAt', () => {
      const msg = service.sendMessage('100', 'u1', { content: 'test' });
      const conv = service.conversations.get('100');
      expect(conv.lastMessageId).toBe(msg.id);
    });

    it('should support replyTo', () => {
      const msg = service.sendMessage('100', 'u1', {
        content: 'رد',
        replyTo: '1000',
      });
      expect(msg.replyTo).toBe('1000');
    });

    it('should set readBy to include only sender', () => {
      const msg = service.sendMessage('100', 'u1', { content: 'test' });
      expect(msg.readBy).toEqual(['u1']);
    });
  });

  describe('editMessage', () => {
    it('should edit own message', () => {
      const msg = service.editMessage('1000', 'u1', 'محتوى معدّل');
      expect(msg.content).toBe('محتوى معدّل');
      expect(msg.isEdited).toBe(true);
    });

    it('should update updatedAt timestamp', () => {
      const before = new Date().toISOString();
      const msg = service.editMessage('1000', 'u1', 'new');
      expect(msg.updatedAt >= before).toBe(true);
    });

    it('should throw 404 for non-existent message', () => {
      expect(() => service.editMessage('bad', 'u1', 'x')).toThrow('الرسالة غير موجودة');
      try {
        service.editMessage('bad', 'u1', 'x');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 403 when non-owner tries to edit', () => {
      expect(() => service.editMessage('1000', 'u2', 'x')).toThrow('يمكنك تعديل رسائلك فقط');
      try {
        service.editMessage('1000', 'u2', 'x');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should throw 400 when message is deleted', () => {
      service.deleteMessage('1000', 'u1');
      expect(() => service.editMessage('1000', 'u1', 'x')).toThrow('لا يمكن تعديل رسالة محذوفة');
      try {
        service.editMessage('1000', 'u1', 'x');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 400 when new content is empty', () => {
      expect(() => service.editMessage('1000', 'u1', '')).toThrow('محتوى الرسالة مطلوب');
      try {
        service.editMessage('1000', 'u1', '');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 400 when new content is null/undefined', () => {
      expect(() => service.editMessage('1000', 'u1', null)).toThrow('محتوى الرسالة مطلوب');
    });
  });

  describe('deleteMessage', () => {
    it('should soft-delete message by owner', () => {
      const result = service.deleteMessage('1000', 'u1');
      expect(result.message).toBe('تم حذف الرسالة بنجاح');
      const msg = service.messages.get('1000');
      expect(msg.isDeleted).toBe(true);
      expect(msg.content).toBe('تم حذف الرسالة');
    });

    it('should allow conversation admin to delete any message', () => {
      // u1 is admin of conv 102, msg 1005 sent by u1, msg 1006 by u2
      const result = service.deleteMessage('1006', 'u1');
      expect(result.message).toBe('تم حذف الرسالة بنجاح');
    });

    it('should throw 404 for non-existent message', () => {
      expect(() => service.deleteMessage('bad', 'u1')).toThrow('الرسالة غير موجودة');
      try {
        service.deleteMessage('bad', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 403 when non-owner non-admin tries to delete', () => {
      // msg 1000 in conv 100, sent by u1; u2 is not admin of direct conv
      expect(() => service.deleteMessage('1000', 'u2')).toThrow('غير مصرح بحذف هذه الرسالة');
      try {
        service.deleteMessage('1000', 'u2');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should update updatedAt on the message', () => {
      const before = new Date().toISOString();
      service.deleteMessage('1000', 'u1');
      const msg = service.messages.get('1000');
      expect(msg.updatedAt >= before).toBe(true);
    });
  });

  describe('searchMessages', () => {
    it('should find messages matching query across conversations', () => {
      const results = service.searchMessages('u1', 'السلام');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].content).toContain('السلام');
    });

    it('should include conversationName and senderName', () => {
      const results = service.searchMessages('u1', 'السلام');
      expect(results[0].senderName).toBeDefined();
      expect(results[0].conversationName).toBeDefined();
    });

    it("should only search in user's conversations", () => {
      // u6 is not in conv 100/101/103
      const results = service.searchMessages('u6', 'المريض');
      expect(results).toHaveLength(0);
    });

    it('should exclude deleted messages', () => {
      service.deleteMessage('1000', 'u1');
      const results = service.searchMessages('u1', 'المريض');
      expect(results.find(r => r.id === '1000')).toBeUndefined();
    });

    it('should throw 400 when query is empty', () => {
      expect(() => service.searchMessages('u1', '')).toThrow('كلمة البحث مطلوبة');
      try {
        service.searchMessages('u1', '');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 400 when query is undefined', () => {
      expect(() => service.searchMessages('u1')).toThrow('كلمة البحث مطلوبة');
    });

    it('should return empty array when nothing matches', () => {
      const results = service.searchMessages('u1', 'xyzzzz_لا_يوجد');
      expect(results).toHaveLength(0);
    });

    it('should be case-insensitive for English text', () => {
      // Send an English message first
      service.sendMessage('100', 'u1', { content: 'Hello World' });
      const results = service.searchMessages('u1', 'hello');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 6. REACTIONS — التفاعلات
// ═══════════════════════════════════════════════════════════
describe('Reactions', () => {
  describe('addReaction', () => {
    it('should add a new reaction', () => {
      const result = service.addReaction('1000', 'u1', '❤️');
      expect(result.added).toBe(true);
      expect(result.emoji).toBe('❤️');
    });

    it('should toggle off existing reaction (same user + same emoji)', () => {
      // u2 already reacted with 👍 on msg 1005 (seeded as r-1)
      const result = service.addReaction('1005', 'u2', '👍');
      expect(result.removed).toBe(true);
      expect(result.emoji).toBe('👍');
    });

    it('should allow different emoji from same user', () => {
      const result = service.addReaction('1005', 'u2', '❤️');
      expect(result.added).toBe(true);
    });

    it('should allow same emoji from different user', () => {
      const result = service.addReaction('1000', 'u2', '👍');
      expect(result.added).toBe(true);
    });

    it('should throw 404 for non-existent message', () => {
      expect(() => service.addReaction('bad', 'u1', '👍')).toThrow('الرسالة غير موجودة');
      try {
        service.addReaction('bad', 'u1', '👍');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 400 when emoji is missing', () => {
      expect(() => service.addReaction('1000', 'u1', '')).toThrow('الرمز التعبيري مطلوب');
      try {
        service.addReaction('1000', 'u1', '');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 400 when emoji is null', () => {
      expect(() => service.addReaction('1000', 'u1', null)).toThrow('الرمز التعبيري مطلوب');
    });
  });

  describe('getReactions', () => {
    it('should return reactions for a message with user names', () => {
      const reactions = service.getReactions('1005');
      expect(reactions).toHaveLength(2);
      expect(reactions.every(r => r.userName)).toBe(true);
    });

    it('should return empty array for message with no reactions', () => {
      const reactions = service.getReactions('1000');
      expect(reactions).toHaveLength(0);
    });

    it('should include emoji, userId, userName', () => {
      const reactions = service.getReactions('1005');
      const r = reactions[0];
      expect(r.emoji).toBe('👍');
      expect(r.userId).toBeDefined();
      expect(r.userName).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 7. READ RECEIPTS — إيصالات القراءة
// ═══════════════════════════════════════════════════════════
describe('Read receipts', () => {
  describe('markAsRead', () => {
    it('should reset unread count for the user', () => {
      // u2 has unreadCount 1 in conv 100
      service.markAsRead('100', 'u2');
      const conv = service.conversations.get('100');
      expect(conv.unreadCount['u2']).toBe(0);
    });

    it('should mark all messages as read by user', () => {
      const result = service.markAsRead('100', 'u2');
      expect(result.conversationId).toBe('100');
      expect(result.markedRead).toBeGreaterThanOrEqual(0);
    });

    it('should return markedRead count', () => {
      const result = service.markAsRead('100', 'u2');
      expect(typeof result.markedRead).toBe('number');
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.markAsRead('999', 'u1')).toThrow('المحادثة غير موجودة');
      try {
        service.markAsRead('999', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 403 when user is not a participant', () => {
      expect(() => service.markAsRead('100', 'u4')).toThrow('غير مصرح بالوصول');
      try {
        service.markAsRead('100', 'u4');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });

    it('should add user to readBy on each message', () => {
      service.markAsRead('100', 'u2');
      const msgs = Array.from(service.messages.values()).filter(m => m.conversationId === '100');
      msgs.forEach(m => {
        expect(m.readBy).toContain('u2');
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return total and byConversation', () => {
      const result = service.getUnreadCount('u1');
      expect(typeof result.total).toBe('number');
      expect(typeof result.byConversation).toBe('object');
    });

    it('should reflect correct unread for u1 (seeded: conv 101 = 1)', () => {
      const result = service.getUnreadCount('u1');
      expect(result.total).toBe(1);
      expect(result.byConversation['101']).toBe(1);
    });

    it('should reflect 0 total when all are read', () => {
      // u1 unread in 101 = 1, mark as read
      service.markAsRead('101', 'u1');
      const result = service.getUnreadCount('u1');
      expect(result.total).toBe(0);
    });

    it('should increase after new messages', () => {
      service.sendMessage('100', 'u2', { content: 'ping' });
      const result = service.getUnreadCount('u1');
      expect(result.total).toBeGreaterThanOrEqual(2); // 101=1 + 100=1
    });

    it('should only count conversations where user participates', () => {
      // u6 only in conv 102, 104
      const result = service.getUnreadCount('u6');
      expect(Object.keys(result.byConversation).every(id => ['102', '104'].includes(id))).toBe(
        true
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 8. PINNED MESSAGES — الرسائل المثبتة
// ═══════════════════════════════════════════════════════════
describe('Pinned messages', () => {
  describe('pinMessage', () => {
    it('should pin a message successfully', () => {
      const result = service.pinMessage('102', '1006', 'u1');
      expect(result.pinned).toBe(true);
      expect(result.messageId).toBe('1006');
    });

    it('should throw 400 when message is already pinned', () => {
      // msg 1005 in conv 102 is already pinned
      expect(() => service.pinMessage('102', '1005', 'u1')).toThrow('الرسالة مثبتة بالفعل');
      try {
        service.pinMessage('102', '1005', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.pinMessage('999', '1005', 'u1')).toThrow('المحادثة غير موجودة');
      try {
        service.pinMessage('999', '1005', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 404 when message does not belong to conversation', () => {
      // msg 1000 is in conv 100, not 102
      expect(() => service.pinMessage('102', '1000', 'u1')).toThrow(
        'الرسالة غير موجودة في هذه المحادثة'
      );
      try {
        service.pinMessage('102', '1000', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 404 when message does not exist', () => {
      expect(() => service.pinMessage('102', 'bad', 'u1')).toThrow(
        'الرسالة غير موجودة في هذه المحادثة'
      );
    });
  });

  describe('unpinMessage', () => {
    it('should unpin a pinned message', () => {
      const result = service.unpinMessage('102', '1005');
      expect(result.unpinned).toBe(true);
      expect(result.messageId).toBe('1005');
    });

    it('should throw 404 when message is not pinned', () => {
      expect(() => service.unpinMessage('102', '1006')).toThrow('الرسالة غير مثبتة');
      try {
        service.unpinMessage('102', '1006');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });
  });

  describe('getPinnedMessages', () => {
    it('should return pinned messages with enriched info', () => {
      const pins = service.getPinnedMessages('102');
      expect(pins).toHaveLength(1);
      expect(pins[0].messageId).toBe('1005');
      expect(pins[0].message).toBeDefined();
      expect(pins[0].message.content).toBeDefined();
      expect(pins[0].message.senderName).toBeDefined();
    });

    it('should return empty array when no pinned messages', () => {
      const pins = service.getPinnedMessages('100');
      expect(pins).toHaveLength(0);
    });

    it('should include message sender name', () => {
      const pins = service.getPinnedMessages('102');
      expect(pins[0].message.senderName).toBe('أحمد الشهري');
    });

    it('should reflect pin after pinMessage', () => {
      service.pinMessage('102', '1006', 'u2');
      const pins = service.getPinnedMessages('102');
      expect(pins).toHaveLength(2);
    });

    it('should reflect unpin after unpinMessage', () => {
      service.unpinMessage('102', '1005');
      const pins = service.getPinnedMessages('102');
      expect(pins).toHaveLength(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 9. FILE SHARING — مشاركة الملفات
// ═══════════════════════════════════════════════════════════
describe('File sharing', () => {
  describe('uploadAttachment', () => {
    it('should upload a valid attachment', () => {
      const att = service.uploadAttachment('u1', {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });
      expect(att.id).toBeDefined();
      expect(att.filename).toBe('test.pdf');
      expect(att.uploadedBy).toBe('u1');
      expect(att.url).toContain(att.id);
    });

    it('should throw 400 when filename is missing', () => {
      expect(() => service.uploadAttachment('u1', { mimeType: 'application/pdf' })).toThrow(
        'اسم الملف مطلوب'
      );
      try {
        service.uploadAttachment('u1', { mimeType: 'application/pdf' });
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 400 when mimeType is missing', () => {
      expect(() => service.uploadAttachment('u1', { filename: 'test.pdf' })).toThrow(
        'نوع الملف مطلوب'
      );
      try {
        service.uploadAttachment('u1', { filename: 'test.pdf' });
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 400 when file exceeds 50MB', () => {
      expect(() =>
        service.uploadAttachment('u1', {
          filename: 'big.zip',
          mimeType: 'application/zip',
          size: 51 * 1024 * 1024,
        })
      ).toThrow('حجم الملف يتجاوز الحد المسموح (50MB)');
      try {
        service.uploadAttachment('u1', {
          filename: 'big.zip',
          mimeType: 'application/zip',
          size: 51 * 1024 * 1024,
        });
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should allow exactly 50MB', () => {
      const att = service.uploadAttachment('u1', {
        filename: 'exact.zip',
        mimeType: 'application/zip',
        size: 50 * 1024 * 1024,
      });
      expect(att.id).toBeDefined();
    });

    it('should use filename as originalName when originalName not provided', () => {
      const att = service.uploadAttachment('u1', {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      });
      expect(att.originalName).toBe('test.pdf');
    });

    it('should use provided originalName', () => {
      const att = service.uploadAttachment('u1', {
        filename: 'renamed.pdf',
        originalName: 'original.pdf',
        mimeType: 'application/pdf',
      });
      expect(att.originalName).toBe('original.pdf');
    });

    it('should default size to 0 when not provided', () => {
      const att = service.uploadAttachment('u1', {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      });
      expect(att.size).toBe(0);
    });
  });

  describe('getAttachment', () => {
    it('should return attachment by id', () => {
      const att = service.getAttachment('att-001');
      expect(att.id).toBe('att-001');
      expect(att.filename).toBe('تقرير_العلاج_الأسبوعي.pdf');
    });

    it('should throw 404 for non-existent attachment', () => {
      expect(() => service.getAttachment('bad')).toThrow('المرفق غير موجود');
      try {
        service.getAttachment('bad');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });
  });

  describe('getConversationAttachments', () => {
    it('should return attachments from messages in the conversation', () => {
      const atts = service.getConversationAttachments('102', 'u1');
      expect(atts.length).toBe(1);
      expect(atts[0].id).toBe('att-001');
    });

    it('should return empty array when no attachments', () => {
      const atts = service.getConversationAttachments('101', 'u1');
      expect(atts).toHaveLength(0);
    });

    it('should throw 404 for non-existent conversation', () => {
      expect(() => service.getConversationAttachments('999', 'u1')).toThrow('المحادثة غير موجودة');
    });

    it('should throw 403 when user is not a participant', () => {
      expect(() => service.getConversationAttachments('100', 'u4')).toThrow('غير مصرح بالوصول');
      try {
        service.getConversationAttachments('100', 'u4');
      } catch (e) {
        expect(e.statusCode).toBe(403);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 10. TYPING INDICATORS — مؤشرات الكتابة
// ═══════════════════════════════════════════════════════════
describe('Typing indicators', () => {
  describe('setTyping', () => {
    it('should set typing to true', () => {
      const result = service.setTyping('100', 'u1', true);
      expect(result.convId).toBe('100');
      expect(result.userId).toBe('u1');
      expect(result.isTyping).toBe(true);
    });

    it('should set typing to false (remove)', () => {
      service.setTyping('100', 'u1', true);
      const result = service.setTyping('100', 'u1', false);
      expect(result.isTyping).toBe(false);
    });

    it('should store typing status in the map', () => {
      service.setTyping('100', 'u1', true);
      expect(service.typingStatus.has('100:u1')).toBe(true);
    });

    it('should remove from map when set to false', () => {
      service.setTyping('100', 'u1', true);
      service.setTyping('100', 'u1', false);
      expect(service.typingStatus.has('100:u1')).toBe(false);
    });
  });

  describe('getTypingUsers', () => {
    it('should return typing users excluding self', () => {
      service.setTyping('100', 'u2', true);
      const typing = service.getTypingUsers('100', 'u1');
      expect(typing).toHaveLength(1);
      expect(typing[0].userId).toBe('u2');
      expect(typing[0].name).toBe('نورة العتيبي');
    });

    it('should exclude the requesting user', () => {
      service.setTyping('100', 'u1', true);
      service.setTyping('100', 'u2', true);
      const typing = service.getTypingUsers('100', 'u1');
      expect(typing.find(t => t.userId === 'u1')).toBeUndefined();
    });

    it('should return empty array when nobody is typing', () => {
      const typing = service.getTypingUsers('100', 'u1');
      expect(typing).toHaveLength(0);
    });

    it('should auto-expire typing after 5 seconds', () => {
      service.setTyping('100', 'u2', true);
      // Manually set timestamp to 6 seconds ago
      const key = '100:u2';
      service.typingStatus.get(key).timestamp = Date.now() - 6000;

      const typing = service.getTypingUsers('100', 'u1');
      expect(typing).toHaveLength(0);
      // Entry should have been cleaned up
      expect(service.typingStatus.has(key)).toBe(false);
    });

    it('should NOT expire typing within 5 seconds', () => {
      service.setTyping('100', 'u2', true);
      // Manually set timestamp to 3 seconds ago (within window)
      const key = '100:u2';
      service.typingStatus.get(key).timestamp = Date.now() - 3000;

      const typing = service.getTypingUsers('100', 'u1');
      expect(typing).toHaveLength(1);
    });

    it('should return multiple typing users', () => {
      service.setTyping('102', 'u2', true);
      service.setTyping('102', 'u4', true);
      service.setTyping('102', 'u6', true);
      const typing = service.getTypingUsers('102', 'u1');
      expect(typing).toHaveLength(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 11. BLOCKED USERS — حظر المستخدمين
// ═══════════════════════════════════════════════════════════
describe('Blocked users', () => {
  describe('blockUser', () => {
    it('should block a user successfully', () => {
      const result = service.blockUser('u1', 'u3');
      expect(result.blocked).toBe(true);
      expect(result.blockedUserId).toBe('u3');
    });

    it('should throw 400 when blocking self', () => {
      expect(() => service.blockUser('u1', 'u1')).toThrow('لا يمكن حظر نفسك');
      try {
        service.blockUser('u1', 'u1');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should throw 404 when target user does not exist', () => {
      expect(() => service.blockUser('u1', 'ghost')).toThrow('المستخدم غير موجود');
      try {
        service.blockUser('u1', 'ghost');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should throw 400 when user is already blocked', () => {
      service.blockUser('u1', 'u3');
      expect(() => service.blockUser('u1', 'u3')).toThrow('المستخدم محظور بالفعل');
      try {
        service.blockUser('u1', 'u3');
      } catch (e) {
        expect(e.statusCode).toBe(400);
      }
    });

    it('should allow blocking multiple different users', () => {
      service.blockUser('u1', 'u2');
      service.blockUser('u1', 'u3');
      const blocked = service.getBlockedUsers('u1');
      expect(blocked).toHaveLength(2);
    });

    it('should be directional — u1 blocks u2 but u2 has not blocked u1', () => {
      service.blockUser('u1', 'u2');
      const blockedByU1 = service.getBlockedUsers('u1');
      const blockedByU2 = service.getBlockedUsers('u2');
      expect(blockedByU1).toHaveLength(1);
      expect(blockedByU2).toHaveLength(0);
    });
  });

  describe('unblockUser', () => {
    it('should unblock a blocked user', () => {
      service.blockUser('u1', 'u3');
      const result = service.unblockUser('u1', 'u3');
      expect(result.unblocked).toBe(true);
      expect(result.blockedUserId).toBe('u3');
    });

    it('should throw 404 when user is not blocked', () => {
      expect(() => service.unblockUser('u1', 'u3')).toThrow('المستخدم غير محظور');
      try {
        service.unblockUser('u1', 'u3');
      } catch (e) {
        expect(e.statusCode).toBe(404);
      }
    });

    it('should actually remove the block entry', () => {
      service.blockUser('u1', 'u3');
      service.unblockUser('u1', 'u3');
      const blocked = service.getBlockedUsers('u1');
      expect(blocked).toHaveLength(0);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return empty list when no one is blocked', () => {
      const blocked = service.getBlockedUsers('u1');
      expect(blocked).toHaveLength(0);
    });

    it('should return blocked users with names', () => {
      service.blockUser('u1', 'u2');
      const blocked = service.getBlockedUsers('u1');
      expect(blocked).toHaveLength(1);
      expect(blocked[0].blockedUserId).toBe('u2');
      expect(blocked[0].blockedUserName).toBe('نورة العتيبي');
    });

    it('should return multiple blocked users', () => {
      service.blockUser('u1', 'u2');
      service.blockUser('u1', 'u3');
      service.blockUser('u1', 'u4');
      const blocked = service.getBlockedUsers('u1');
      expect(blocked).toHaveLength(3);
    });

    it('should include createdAt timestamp', () => {
      service.blockUser('u1', 'u2');
      const blocked = service.getBlockedUsers('u1');
      expect(blocked[0].createdAt).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 12. DASHBOARD — لوحة المعلومات
// ═══════════════════════════════════════════════════════════
describe('Dashboard', () => {
  describe('getDashboard', () => {
    it('should return dashboard with all expected keys', () => {
      const dash = service.getDashboard('u1');
      expect(dash).toHaveProperty('kpis');
      expect(dash).toHaveProperty('recentConversations');
      expect(dash).toHaveProperty('onlineUsers');
      expect(dash).toHaveProperty('msgsByType');
      expect(dash).toHaveProperty('topParticipants');
      expect(dash).toHaveProperty('unreadByConversation');
    });

    it('should return correct kpi structure', () => {
      const { kpis } = service.getDashboard('u1');
      expect(typeof kpis.totalConversations).toBe('number');
      expect(typeof kpis.totalMessages).toBe('number');
      expect(typeof kpis.totalAttachments).toBe('number');
      expect(typeof kpis.onlineUsers).toBe('number');
      expect(typeof kpis.totalUnread).toBe('number');
      expect(typeof kpis.activeConversations).toBe('number');
      expect(typeof kpis.directChats).toBe('number');
      expect(typeof kpis.groupChats).toBe('number');
    });

    it('should count total conversations for the user', () => {
      const { kpis } = service.getDashboard('u1');
      expect(kpis.totalConversations).toBe(5);
    });

    it('should count total messages across all conversations', () => {
      const { kpis } = service.getDashboard('u1');
      expect(kpis.totalMessages).toBe(12);
    });

    it('should count total attachments', () => {
      const { kpis } = service.getDashboard('u1');
      expect(kpis.totalAttachments).toBe(3);
    });

    it('should count online users', () => {
      const { kpis } = service.getDashboard('u1');
      expect(kpis.onlineUsers).toBe(6);
    });

    it('should count total unread for user', () => {
      const { kpis } = service.getDashboard('u1');
      expect(kpis.totalUnread).toBe(1); // conv 101 has 1 unread for u1
    });

    it('should separate direct and group chats', () => {
      const { kpis } = service.getDashboard('u1');
      expect(kpis.directChats).toBe(2); // conv 100, 101
      expect(kpis.groupChats).toBe(3); // conv 102, 103, 104
    });

    it('should include recentConversations (max 5)', () => {
      const { recentConversations } = service.getDashboard('u1');
      expect(recentConversations.length).toBeLessThanOrEqual(5);
    });

    it('should include onlineUsers with id, name, department, avatar', () => {
      const { onlineUsers } = service.getDashboard('u1');
      expect(onlineUsers.length).toBe(6);
      expect(onlineUsers[0]).toHaveProperty('id');
      expect(onlineUsers[0]).toHaveProperty('name');
      expect(onlineUsers[0]).toHaveProperty('department');
      expect(onlineUsers[0]).toHaveProperty('avatar');
    });

    it('should include msgsByType with text count', () => {
      const { msgsByType } = service.getDashboard('u1');
      expect(msgsByType.text).toBeGreaterThanOrEqual(11);
      expect(msgsByType.file).toBeGreaterThanOrEqual(1);
    });

    it('should include topParticipants sorted by messageCount desc', () => {
      const { topParticipants } = service.getDashboard('u1');
      expect(topParticipants.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < topParticipants.length; i++) {
        expect(topParticipants[i - 1].messageCount).toBeGreaterThanOrEqual(
          topParticipants[i].messageCount
        );
      }
    });

    it('should include topParticipants with userId, name, messageCount', () => {
      const { topParticipants } = service.getDashboard('u1');
      expect(topParticipants[0]).toHaveProperty('userId');
      expect(topParticipants[0]).toHaveProperty('name');
      expect(topParticipants[0]).toHaveProperty('messageCount');
    });

    it('should include unreadByConversation', () => {
      const { unreadByConversation } = service.getDashboard('u1');
      expect(typeof unreadByConversation).toBe('object');
      expect(unreadByConversation['101']).toBe(1);
    });

    it('should reflect changes after sending new messages', () => {
      service.sendMessage('100', 'u2', { content: 'new' });
      const { kpis } = service.getDashboard('u1');
      expect(kpis.totalMessages).toBe(13);
      expect(kpis.totalUnread).toBe(2); // 101=1 + 100=1
    });

    it('should work for user with fewer conversations', () => {
      // u6 is in conv 102, 104 only
      const { kpis } = service.getDashboard('u6');
      expect(kpis.totalConversations).toBe(2);
    });
  });
});
