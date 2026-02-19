/**
 * Messaging Routes Comprehensive Test Suite - Phase 2
 * Tests for all messaging and communication features
 * Target: Improve from 21.49% to 50%+ coverage
 */

// Mock messaging service - MUST be before require of app
jest.mock('../services/messaging.service', () => {
  return {
    createMessage: jest.fn().mockResolvedValue({
      _id: 'msg123',
      content: 'Test message',
      sender: 'sender123',
      recipient: 'recipient123',
      createdAt: new Date(),
      read: false,
    }),
    getMessages: jest.fn().mockResolvedValue([
      {
        _id: 'msg1',
        content: 'Message 1',
        sender: 'sender123',
        read: true,
      },
      {
        _id: 'msg2',
        content: 'Message 2',
        sender: 'other',
        read: false,
      },
    ]),
    updateMessage: jest.fn().mockResolvedValue({
      _id: 'msg123',
      content: 'Updated message',
      updated: true,
    }),
    deleteMessage: jest.fn().mockResolvedValue({
      success: true,
      deletedId: 'msg123',
    }),
    markAsRead: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'msg123',
      read: true,
    }),
    createThread: jest.fn().mockResolvedValue({
      _id: 'thread123',
      participants: ['user1', 'user2'],
      messages: [],
    }),
    getThreads: jest.fn().mockResolvedValue([
      {
        _id: 'thread1',
        participants: ['user1', 'user2'],
        lastMessage: 'Last message',
        unreadCount: 0,
      },
    ]),
    searchMessages: jest.fn().mockResolvedValue([{ _id: 'msg123', content: 'matching message' }]),
    getUnreadCount: jest.fn().mockResolvedValue({
      userId: 'user123',
      unreadCount: 5,
    }),
    getUnreadMessages: jest.fn().mockResolvedValue([]),
    markConversationAsRead: jest.fn().mockResolvedValue({
      success: true,
      conversationId: 'conv123',
    }),
    clearUnread: jest.fn().mockResolvedValue({
      success: true,
      cleared: true,
    }),
  };
});

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'user' };
    next();
  },
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Admin access required' });
    }
  },
  requireAuth: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'user' };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) => {
      if (req.user && roles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Forbidden' });
      }
    },
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => next(),
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
  authorizeRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  authenticate: (req, res, next) => next(),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Import after all mocks are defined
const request = require('supertest');
const app = require('../server');

describe('Messaging Routes - Phase 2 Coverage', () => {
  describe('Message Creation', () => {
    it('should create a new message with required fields', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: 'Hello, this is a test message',
          recipient: 'recipient123',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toHaveProperty('_id');
      expect(res.body.message).toHaveProperty('content');
    });

    it('should reject message without content', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          recipient: 'recipient123',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject message without recipient', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: 'Test message',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should handle message with attachments', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: 'Message with attachment',
          recipient: 'recipient123',
          attachments: [{ filename: 'test.txt', fileId: 'file123' }],
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should create message with mentions', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: '@user1 hello @user2',
          recipient: 'recipient123',
          mentions: ['user1', 'user2'],
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should handle special characters in message', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: 'مرحبا بك في النظام! 你好 🎉',
          recipient: 'recipient123',
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should handle very long messages', async () => {
      const longContent = 'a'.repeat(10000);
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: longContent,
          recipient: 'recipient123',
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should set message as unread by default', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: 'Test message',
          recipient: 'recipient123',
        })
        .expect(201);

      expect(res.body.message.read).toBe(false);
    });
  });

  describe('Message Retrieval', () => {
    it('should get all messages for user', async () => {
      const res = await request(app).get('/api/messages').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('should get messages with pagination', async () => {
      const res = await request(app).get('/api/messages?page=1&limit=10').expect(200);

      expect(res.body.messages).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should get messages from specific sender', async () => {
      const res = await request(app).get('/api/messages?sender=sender123').expect(200);

      expect(res.body.messages).toBeDefined();
    });

    it('should get unread messages only', async () => {
      const res = await request(app).get('/api/messages?unread=true').expect(200);

      expect(res.body.messages).toBeDefined();
    });

    it('should get single message by ID', async () => {
      const res = await request(app).get('/api/messages/msg123').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent message', async () => {
      const res = await request(app).get('/api/messages/nonexistent').expect(404);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should sort messages by date', async () => {
      const res = await request(app).get('/api/messages?sort=-createdAt').expect(200);

      expect(res.body.messages).toBeDefined();
    });
  });

  describe('Message Updates', () => {
    it('should update message content', async () => {
      const res = await request(app)
        .put('/api/messages/msg123')
        .send({
          content: 'Updated message content',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toHaveProperty('content');
    });

    it('should mark message as read', async () => {
      const res = await request(app).patch('/api/messages/msg123/read').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message.read).toBe(true);
    });

    it('should mark multiple messages as read', async () => {
      const res = await request(app)
        .patch('/api/messages/mark-read')
        .send({
          messageIds: ['msg1', 'msg2', 'msg3'],
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should update message with attachments', async () => {
      const res = await request(app)
        .put('/api/messages/msg123')
        .send({
          content: 'Updated with attachment',
          attachments: [{ filename: 'new.pdf', fileId: 'file456' }],
        })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('should reject update without content', async () => {
      const res = await request(app).put('/api/messages/msg123').send({}).expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should prevent updating others messages', async () => {
      const res = await request(app)
        .put('/api/messages/other-user-msg')
        .send({
          content: 'Attempted update',
        })
        .expect(403);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Message Search & Filtering', () => {
    it('should search messages by content', async () => {
      const res = await request(app).get('/api/messages/search?q=matching').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.results)).toBe(true);
    });

    it('should filter messages by date range', async () => {
      const res = await request(app).get('/api/messages?from=2026-01-01&to=2026-02-10').expect(200);

      expect(res.body.messages).toBeDefined();
    });

    it('should filter messages by thread', async () => {
      const res = await request(app).get('/api/messages?threadId=thread123').expect(200);

      expect(res.body.messages).toBeDefined();
    });

    it('should search with special characters', async () => {
      const res = await request(app).get('/api/messages/search?q=test@example.com').expect(200);

      expect(res.body.results).toBeDefined();
    });
  });

  describe('Message Deletion', () => {
    it('should delete a message', async () => {
      const res = await request(app).delete('/api/messages/msg123').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should soft delete message (hide for user)', async () => {
      const res = await request(app).delete('/api/messages/msg123?soft=true').expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('should delete multiple messages', async () => {
      const res = await request(app)
        .post('/api/messages/delete-bulk')
        .send({
          messageIds: ['msg1', 'msg2', 'msg3'],
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should not delete others messages', async () => {
      const res = await request(app).delete('/api/messages/other-msg').expect(403);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should handle deletion of deleted message', async () => {
      const res = await request(app).delete('/api/messages/already-deleted').expect(404);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Message Threads', () => {
    it('should create a message thread', async () => {
      const res = await request(app)
        .post('/api/threads')
        .send({
          participants: ['user1', 'user2'],
          subject: 'Project Discussion',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.thread).toHaveProperty('_id');
    });

    it('should get all threads for user', async () => {
      const res = await request(app).get('/api/threads').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.threads)).toBe(true);
    });

    it('should get thread with messages', async () => {
      const res = await request(app).get('/api/threads/thread123').expect(200);

      expect(res.body.thread).toHaveProperty('_id');
      expect(res.body.thread).toHaveProperty('messages');
    });

    it('should add message to thread', async () => {
      const res = await request(app)
        .post('/api/threads/thread123/messages')
        .send({
          content: 'Message in thread',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should archive thread', async () => {
      const res = await request(app).patch('/api/threads/thread123/archive').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should leave thread', async () => {
      const res = await request(app).post('/api/threads/thread123/leave').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Message Notifications & Unread', () => {
    it('should get unread message count', async () => {
      const res = await request(app).get('/api/messages/unread/count').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('unreadCount');
    });

    it('should mark conversation as read', async () => {
      const res = await request(app).patch('/api/conversations/conv123/mark-read').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should get all unread messages', async () => {
      const res = await request(app).get('/api/messages/unread').expect(200);

      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('should clear unread status for user', async () => {
      const res = await request(app).post('/api/messages/clear-unread').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Message Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const messagingService = require('../services/messaging.service');
      messagingService.getMessages.mockRejectedValueOnce(new Error('DB Error'));

      const res = await request(app).get('/api/messages').expect(500);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should handle service unavailable', async () => {
      const messagingService = require('../services/messaging.service');
      messagingService.createMessage.mockRejectedValueOnce(new Error('Service unavailable'));

      const res = await request(app)
        .post('/api/messages')
        .send({
          content: 'Test',
          recipient: 'recipient123',
        })
        .expect(500);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should log message operations', async () => {
      const logger = require('../utils/logger');

      await request(app)
        .post('/api/messages')
        .send({
          content: 'Test',
          recipient: 'recipient123',
        })
        .expect(201);

      expect(logger.info).toHaveBeenCalled();
    });

    it('should log errors appropriately', async () => {
      const messagingService = require('../services/messaging.service');
      const logger = require('../utils/logger');
      messagingService.getMessages.mockRejectedValueOnce(new Error('Test error'));

      await request(app).get('/api/messages').expect(500);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Message Edge Cases', () => {
    it('should handle concurrent message creation', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/messages')
            .send({
              content: `Message ${i}`,
              recipient: 'recipient123',
            })
        );
      }

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      });
    });

    it('should handle empty message list', async () => {
      const messagingService = require('../services/messaging.service');
      messagingService.getMessages.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/messages').expect(200);

      expect(res.body.messages.length).toBe(0);
    });

    it('should handle very large attachments', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({
          content: 'Large file',
          recipient: 'recipient123',
          attachments: [{ filename: 'large.zip', fileId: 'large123', size: 104857600 }],
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should handle message with multiple recipients (group)', async () => {
      const res = await request(app)
        .post('/api/messages/group')
        .send({
          content: 'Group message',
          recipients: ['user1', 'user2', 'user3'],
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should handle scheduled messages', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      const res = await request(app)
        .post('/api/messages/schedule')
        .send({
          content: 'Scheduled message',
          recipient: 'recipient123',
          scheduledFor: futureDate,
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should handle message reactions/emoji', async () => {
      const res = await request(app)
        .post('/api/messages/msg123/react')
        .send({
          emoji: '👍',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should handle message forwarding', async () => {
      const res = await request(app)
        .post('/api/messages/msg123/forward')
        .send({
          recipient: 'newRecipient',
        })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should handle message pinning in thread', async () => {
      const res = await request(app)
        .post('/api/threads/thread123/pin-message')
        .send({
          messageId: 'msg123',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });
});
