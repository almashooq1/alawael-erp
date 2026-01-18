const express = require('express');
const request = require('supertest');

// MOCKS
const mockMessagingService = {
  sendMessage: jest.fn(),
  getConversationMessages: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteMessage: jest.fn(),
  searchMessages: jest.fn(),
  getUserConversations: jest.fn(),
  createPrivateConversation: jest.fn(),
  createGroupConversation: jest.fn(),
  getConversationDetails: jest.fn(),
  addParticipant: jest.fn(),
  removeParticipant: jest.fn(),
  getStats: jest.fn(),
};

jest.mock('../services/messaging.service', () => mockMessagingService);

jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-123', _id: 'user-123', role: 'user', name: 'Test User' };
    next();
  },
}));

// Route file
const messagingRoutes = require('../routes/messaging.routes');

describe('Messaging Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/messages', messagingRoutes);

    // Middleware error handler mock
    app.use((err, req, res, next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  describe('POST /api/messages/send', () => {
    it('should send a message successfully', async () => {
      mockMessagingService.sendMessage.mockResolvedValue({
        _id: 'msg-1',
        content: 'Hello World',
        sender: 'user-123',
        createdAt: new Date(),
      });

      const res = await request(app).post('/api/messages/send').send({ conversationId: 'conv-1', content: 'Hello World' });

      expect(res.status).toBe(200);
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'user-123',
        'conv-1',
        expect.objectContaining({ content: 'Hello World' }),
      );
    });

    it('should return 400 if validation fails', async () => {
      const res = await request(app).post('/api/messages/send').send({ content: 'Missing conversationId' });

      expect(res.status).toBe(400);
      expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/messages/conversation/:id', () => {
    it('should get conversation messages', async () => {
      mockMessagingService.getConversationMessages.mockResolvedValue({
        messages: [],
        pagination: { total: 0 },
      });

      const res = await request(app).get('/api/messages/conversation/conv-1');

      expect(res.status).toBe(200);
      expect(mockMessagingService.getConversationMessages).toHaveBeenCalled();
    });
  });

  describe('POST /api/messages/mark-read/:conversationId', () => {
    it('should mark messages as read', async () => {
      mockMessagingService.markAllAsRead.mockResolvedValue({ success: true });

      const res = await request(app).post('/api/messages/mark-read/conv-1');

      expect(res.status).toBe(200);
      expect(mockMessagingService.markAllAsRead).toHaveBeenCalledWith('user-123', 'conv-1');
    });
  });

  // Note: The router mounts routes at /api/messages
  // But some routes in the file might be mounted relatively?
  // Let's check conversation routes.
  // The file comment says: GET /api/conversations - محادثات المستخدم
  // But usually routes are mounted on a prefix.
  // If router handles /api/conversations, it might be separate.
  // Looking at the file content line 20:
  // router.post('/send', ...) -> /api/messages/send (if mounted at /api/messages)
  // Wait, the file *also* has conversation routes?
  // Let's assume the router handles everything defined in it.
  // Ideally user conversations route is likely defined as router.get('/conversations', ...)
  // If so, and we mounted at /api/messages, it would be /api/messages/conversations.
  // But the comment says /api/conversations.
  // Usually one file = one router. I will verify if I need to adjust mount point or paths.
  // The file has: router.get('/conversations', ...) ? Or just router.get('/', ...) relative to a conversations mount?
  // I need to be careful. I'll assume they are in this file.
});
