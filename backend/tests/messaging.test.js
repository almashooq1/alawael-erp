const mongoose = require('mongoose');
const MessagingServiceClass = require('../services/messaging.service');
const messagingService = new MessagingServiceClass();
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

// Mock Mongoose Models
jest.mock('../models/message.model');
jest.mock('../models/conversation.model');
jest.mock('../config/socket.config', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

describe('Messaging Service', () => {
  let saveMock;
  let conversationFindByIdMock;

  beforeEach(() => {
    saveMock = jest.fn().mockResolvedValue({
      _id: 'msg123',
      populate: jest.fn().mockResolvedValue({
        conversationId: 'conv123',
        content: { text: 'Hello' },
      }),
    });

    Message.create = jest.fn().mockImplementation(async data => {
      return {
        ...data,
        _id: 'msg123',
        populate: jest.fn().mockResolvedValue(true),
      };
    });

    conversationFindByIdMock = jest.fn().mockResolvedValue({
      _id: 'conv123',
      participants: [{ user: 'user123', isActive: true }],
      save: saveMock,
    });

    Conversation.findById = conversationFindByIdMock;

    // Cleanup mocks
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message securely if user is participant', async () => {
      // Setup
      Conversation.findById.mockResolvedValue({
        _id: 'conv123',
        participants: [{ user: 'sender1', isActive: true }],
        lastMessage: null,
        unreadCount: 0,
        save: jest.fn(),
        updateLastMessage: jest.fn().mockResolvedValue(true),
      });

      Message.create.mockResolvedValue({
        _id: 'newMsg',
        conversationId: 'conv123',
        populate: jest.fn().mockResolvedValue({
          _id: 'newMsg',
          sender: { fullName: 'Sender' },
        }),
      });

      const messageData = { content: 'Hello World' };
      const result = await messagingService.sendMessage('sender1', 'conv123', messageData);

      expect(Conversation.findById).toHaveBeenCalledWith('conv123');
      expect(Message.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error if user is not participant', async () => {
      Conversation.findById.mockResolvedValue({
        _id: 'conv123',
        participants: [{ user: 'otherUser', isActive: true }],
      });

      await expect(messagingService.sendMessage('intruder', 'conv123', { content: 'Hi' })).rejects.toThrow(
        'ليس لديك صلاحية للإرسال في هذه المحادثة',
      );
    });
  });
});
