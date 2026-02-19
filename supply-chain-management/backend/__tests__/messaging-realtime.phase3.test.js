const MessagingService = require('../services/messagingService');

describe('Phase 3 Extension: Real-Time Messaging', () => {
  const userId1 = 'user-1';
  const userId2 = 'user-2';
  const userId3 = 'user-3';
  const groupChatId = 'group-chat-1';

  beforeEach(() => {
    // Reset service state
    MessagingService.activeConnections.clear();
    MessagingService.activeChats.clear();
    MessagingService.typingIndicators.clear();
    MessagingService.messageQueue = [];
  });

  describe('Connection Management', () => {
    test('should register user connection', () => {
      const mockSocket = { emit: jest.fn() };
      const result = MessagingService.registerConnection(userId1, mockSocket);

      expect(result.connected).toBe(true);
      expect(result.userId).toBe(userId1);
      expect(MessagingService.activeConnections.has(userId1)).toBe(true);
    });

    test('should remove user connection', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);

      MessagingService.removeConnection(userId1);

      expect(MessagingService.activeConnections.has(userId1)).toBe(false);
    });

    test('should get online status', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);

      const status = MessagingService.getOnlineStatus(userId1);

      expect(status.userId).toBe(userId1);
      expect(status.online).toBe(true);
      expect(status.lastSeen).toBeDefined();
    });

    test('should get list of online users', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);
      MessagingService.registerConnection(userId2, mockSocket);

      const onlineUsers = MessagingService.getOnlineUsers();

      expect(onlineUsers.length).toBe(2);
      expect(onlineUsers.map(u => u.userId)).toContain(userId1);
      expect(onlineUsers.map(u => u.userId)).toContain(userId2);
    });
  });

  describe('Direct Messaging', () => {
    test('should send message between users', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);
      MessagingService.registerConnection(userId2, mockSocket);

      const result = MessagingService.sendMessage({
        chatId: 'chat-1',
        senderId: userId1,
        recipientId: userId2,
        message: 'Hello!',
      });

      expect(result).toBeDefined();
      expect(result.senderId).toBe(userId1);
      expect(result.recipientId).toBe(userId2);
      expect(result.message).toBe('Hello!');
      expect(result.status).toBe('delivered');
    });

    test('should queue message if recipient offline', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);

      const result = MessagingService.sendMessage({
        chatId: 'chat-1',
        senderId: userId1,
        recipientId: userId2,
        message: 'Hello offline user',
      });

      expect(result.status).toBe('queued');
      expect(MessagingService.messageQueue.length).toBeGreaterThan(0);
    });

    test('should deliver queued messages on user connection', () => {
      const mockSocket = { emit: jest.fn() };

      // Send message while user2 is offline
      MessagingService.registerConnection(userId1, mockSocket);
      MessagingService.sendMessage({
        chatId: 'chat-1',
        senderId: userId1,
        recipientId: userId2,
        message: 'Message while offline',
      });

      expect(MessagingService.messageQueue.length).toBeGreaterThan(0);

      // User2 comes online
      MessagingService.registerConnection(userId2, mockSocket);

      // Should have received queued messages
      expect(mockSocket.emit).toHaveBeenCalledWith('queued-messages', expect.any(Array));
    });
  });

  describe('Typing Indicators', () => {
    test('should send typing indicator', () => {
      const mockSocket1 = { emit: jest.fn() };
      const mockSocket2 = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket1);
      MessagingService.registerConnection(userId2, mockSocket2);

      MessagingService.sendTypingIndicator(userId1, 'chat-1', true);

      expect(MessagingService.typingIndicators.has(userId1)).toBe(true);
      // Verify typing indicator was recorded
      const indicator = MessagingService.typingIndicators.get(userId1);
      expect(indicator).toBeDefined();
      expect(indicator.chatId).toBe('chat-1');
      expect(indicator.isTyping).toBe(true);
    });

    test('should cleanup old typing indicators', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);

      // Manually set old timestamp
      MessagingService.typingIndicators.set(userId1, {
        chatId: 'chat-1',
        timestamp: Date.now() - 40000, // 40 seconds ago
      });

      MessagingService.cleanupTypingIndicators();

      expect(MessagingService.typingIndicators.has(userId1)).toBe(false);
    });
  });

  describe('Read Receipts', () => {
    test('should track read receipts for messages', () => {
      const messageId = 'msg-123';

      MessagingService.sendReadReceipt(userId2, messageId, 'chat-1');

      expect(MessagingService.readReceipts.has(messageId)).toBe(true);
      expect(MessagingService.readReceipts.get(messageId).has(userId2)).toBe(true);
    });

    test('should track multiple users reading same message', () => {
      const messageId = 'msg-123';

      MessagingService.sendReadReceipt(userId2, messageId, 'chat-1');
      MessagingService.sendReadReceipt(userId3, messageId, 'chat-1');

      const readers = MessagingService.readReceipts.get(messageId);

      expect(readers.has(userId2)).toBe(true);
      expect(readers.has(userId3)).toBe(true);
      expect(readers.size).toBe(2);
    });
  });

  describe('Group Messaging', () => {
    test('should create a group chat', () => {
      const group = MessagingService.createGroupChat({
        chatId: groupChatId,
        name: 'Team Alpha',
        participants: [userId1, userId2, userId3],
        createdBy: userId1,
      });

      expect(group.id).toBe(groupChatId);
      expect(group.name).toBe('Team Alpha');
      expect(group.type).toBe('group');
      expect(group.participants.length).toBe(3);
    });

    test('should send message to group', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);
      MessagingService.registerConnection(userId2, mockSocket);

      MessagingService.createGroupChat({
        chatId: groupChatId,
        name: 'Team',
        participants: [userId1, userId2, userId3],
        createdBy: userId1,
      });

      const result = MessagingService.sendGroupMessage({
        chatId: groupChatId,
        senderId: userId1,
        message: 'Group message!',
      });

      expect(result.chatId).toBe(groupChatId);
      expect(result.senderId).toBe(userId1);
      expect(result.message).toBe('Group message!');
    });

    test('should add participant to group', () => {
      MessagingService.createGroupChat({
        chatId: groupChatId,
        name: 'Team',
        participants: [userId1, userId2],
        createdBy: userId1,
      });

      const updated = MessagingService.addGroupParticipant(groupChatId, userId3, userId1);

      expect(updated.participants).toContain(userId3);
      expect(updated.participants.length).toBe(3);
    });

    test('should remove participant from group', () => {
      MessagingService.createGroupChat({
        chatId: groupChatId,
        name: 'Team',
        participants: [userId1, userId2, userId3],
        createdBy: userId1,
      });

      const updated = MessagingService.removeGroupParticipant(groupChatId, userId3, userId1);

      expect(updated.participants).not.toContain(userId3);
      expect(updated.participants.length).toBe(2);
    });

    test('should get chat history with pagination', () => {
      MessagingService.createGroupChat({
        chatId: groupChatId,
        name: 'Team',
        participants: [userId1, userId2],
        createdBy: userId1,
      });

      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        MessagingService.sendGroupMessage({
          chatId: groupChatId,
          senderId: userId1,
          message: `Message ${i}`,
        });
      }

      const history = MessagingService.getChatHistory(groupChatId, 2, 0);

      expect(history).toBeDefined();
      expect(history.messages.length).toBe(2);
      expect(history.total).toBe(5);
      expect(history.pages).toBe(3);
    });
  });

  describe('Statistics & Monitoring', () => {
    test('should get messaging statistics', () => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);
      MessagingService.registerConnection(userId2, mockSocket);

      MessagingService.createGroupChat({
        chatId: groupChatId,
        name: 'Team',
        participants: [userId1, userId2],
        createdBy: userId1,
      });

      MessagingService.sendTypingIndicator(userId1, groupChatId, true);

      const stats = MessagingService.getStatistics();

      expect(stats.activeConnections).toBe(2);
      expect(stats.activeChats).toBe(1);
      expect(stats.usersTyping).toBe(1);
      expect(typeof stats.queuedMessages).toBe('number');
    });
  });

  describe('Event Emission', () => {
    test('should emit user-online event', done => {
      const mockSocket = { emit: jest.fn() };

      MessagingService.once('user-online', data => {
        expect(data.userId).toBe(userId1);
        expect(data.timestamp).toBeDefined();
        done();
      });

      MessagingService.registerConnection(userId1, mockSocket);
    });

    test('should emit user-offline event', done => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);

      MessagingService.once('user-offline', data => {
        expect(data.userId).toBe(userId1);
        expect(data.timestamp).toBeDefined();
        done();
      });

      MessagingService.removeConnection(userId1);
    });

    test('should emit message-created event', done => {
      const mockSocket = { emit: jest.fn() };
      MessagingService.registerConnection(userId1, mockSocket);
      MessagingService.registerConnection(userId2, mockSocket);

      MessagingService.once('message-created', data => {
        expect(data.senderId).toBe(userId1);
        expect(data.message).toBe('Test message');
        done();
      });

      MessagingService.sendMessage({
        chatId: 'chat-1',
        senderId: userId1,
        recipientId: userId2,
        message: 'Test message',
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing group chat gracefully', () => {
      const result = MessagingService.addGroupParticipant('non-existent', userId3, userId1);

      expect(result).toBeNull();
    });

    test('should return null for non-existent chat history', () => {
      const history = MessagingService.getChatHistory('non-existent');

      expect(history).toBeNull();
    });
  });
});
