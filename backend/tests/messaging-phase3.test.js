const mongoose = require('mongoose');
const MessagingServiceClass = require('../services/messaging.service');
const messagingService = new MessagingServiceClass();

// Mock with factory function
jest.mock('../models/message.model');
jest.mock('../models/conversation.model');
jest.mock('../config/socket.config', () => ({
  getIO: () => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  }),
}));

const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

describe('Messaging Service - Phase 3 Verification', () => {
  let mockSenderId, mockConversationId, mockConversation;

  beforeEach(() => {
    mockSenderId = new mongoose.Types.ObjectId();
    mockConversationId = new mongoose.Types.ObjectId();

    mockConversation = {
      _id: mockConversationId,
      participants: [{ user: mockSenderId, isActive: true }],
      updateLastMessage: jest.fn().mockResolvedValue(true),
    };

    // Set up the mocks for each test
    Conversation.findById = jest.fn().mockResolvedValue(mockConversation);

    Message.create = jest.fn().mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      content: { text: 'Hello Phase 3' },
      sender: mockSenderId,
      conversationId: mockConversationId,
      populate: jest.fn().mockReturnThis(),
    });
  });

  test('should send a message successfully', async () => {
    const result = await messagingService.sendMessage(mockSenderId, mockConversationId, {
      content: 'Hello Phase 3',
    });

    expect(result).toBeDefined();
    // The service returns { success: true, message: '...', data: { message: ... } }
    expect(result.data.message.content.text).toBe('Hello Phase 3');
    expect(Conversation.findById).toHaveBeenCalled();
    expect(Message.create).toHaveBeenCalled();
  });
});
