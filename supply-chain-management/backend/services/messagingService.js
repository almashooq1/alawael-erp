const EventEmitter = require('events');

/**
 * Real-Time Messaging Service
 * Handles WebSocket connections, message routing, typing indicators, and read receipts
 */
class MessagingService extends EventEmitter {
  constructor() {
    super();
    this.activeConnections = new Map(); // userId -> socket
    this.activeChats = new Map(); // chatId -> {participants, messages}
    this.typingIndicators = new Map(); // userId -> {chatId, timestamp}
    this.readReceipts = new Map(); // messageId -> Set of userIds who read
    this.messageQueue = []; // For offline message delivery
  }

  /**
   * Register a user connection
   */
  registerConnection(userId, socket) {
    this.activeConnections.set(userId, socket);
    console.log(`✅ User ${userId} connected`);

    // Send queued messages
    this.deliverQueuedMessages(userId);

    this.emit('user-online', { userId, timestamp: new Date() });
    return { connected: true, userId };
  }

  /**
   * Remove a user connection
   */
  removeConnection(userId) {
    this.activeConnections.delete(userId);
    this.typingIndicators.delete(userId);
    console.log(`❌ User ${userId} disconnected`);

    this.emit('user-offline', { userId, timestamp: new Date() });
  }

  /**
   * Send a message to a user
   */
  sendMessage(messageData) {
    const { chatId, senderId, recipientId, message, type = 'text', metadata = {} } = messageData;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    const messageObject = {
      id: messageId,
      chatId,
      senderId,
      recipientId,
      message,
      type,
      metadata,
      timestamp,
      status: 'sent',
      readAt: null,
    };

    // Try to send to recipient
    const recipientSocket = this.activeConnections.get(recipientId);

    if (recipientSocket) {
      recipientSocket.emit('message-received', messageObject);
      messageObject.status = 'delivered';
    } else {
      // Queue for offline delivery
      this.messageQueue.push(messageObject);
      messageObject.status = 'queued';
    }

    // Emit on sender's socket
    const senderSocket = this.activeConnections.get(senderId);
    if (senderSocket) {
      senderSocket.emit('message-sent', { messageId, status: messageObject.status, timestamp });
    }

    this.emit('message-created', messageObject);

    return messageObject;
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(userId, chatId, isTyping = true) {
    if (isTyping) {
      this.typingIndicators.set(userId, { chatId, isTyping: true, timestamp: Date.now() });
    } else {
      this.typingIndicators.delete(userId);
    }

    // Get other users in chat
    const others = this.getOthersInChat(chatId, userId);

    others.forEach(({ userId: otherUserId, socket }) => {
      if (socket) {
        socket.emit('typing-indicator', {
          chatId,
          userId,
          isTyping,
          timestamp: new Date(),
        });
      }
    });

    this.emit('typing-state-changed', { userId, chatId, isTyping });
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(userId, messageId, chatId) {
    const timestamp = new Date();

    if (!this.readReceipts.has(messageId)) {
      this.readReceipts.set(messageId, new Set());
    }

    this.readReceipts.get(messageId).add(userId);

    // Notify sender
    const messageData = this.getMessageData(messageId); // In real app, fetch from DB
    if (messageData) {
      const senderSocket = this.activeConnections.get(messageData.senderId);
      if (senderSocket) {
        senderSocket.emit('message-read', {
          messageId,
          readBy: userId,
          chatId,
          timestamp,
        });
      }
    }

    this.emit('message-read', { userId, messageId, timestamp });
  }

  /**
   * Create a group chat
   */
  createGroupChat(groupData) {
    const { chatId, name, participants, createdBy, metadata = {} } = groupData;

    const groupChat = {
      id: chatId,
      name,
      type: 'group',
      participants,
      createdBy,
      createdAt: new Date(),
      metadata,
      messageCount: 0,
    };

    this.activeChats.set(chatId, {
      ...groupChat,
      messages: [],
    });

    this.emit('group-chat-created', groupChat);

    // Notify all participants
    participants.forEach(participantId => {
      const socket = this.activeConnections.get(participantId);
      if (socket) {
        socket.emit('added-to-group', {
          chatId,
          groupName: name,
          addedBy: createdBy,
          timestamp: new Date(),
        });
      }
    });

    return groupChat;
  }

  /**
   * Send message to group
   */
  sendGroupMessage(groupData) {
    const { chatId, senderId, message, type = 'text', metadata = {} } = groupData;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    const messageObject = {
      id: messageId,
      chatId,
      senderId,
      message,
      type,
      metadata,
      timestamp,
      status: 'sent',
      readBy: new Set(),
    };

    const chat = this.activeChats.get(chatId);
    if (chat) {
      chat.messages.push(messageObject);
      chat.messageCount = (chat.messageCount || 0) + 1;

      // Broadcast to all participants except sender
      chat.participants.forEach(participantId => {
        if (participantId !== senderId) {
          const socket = this.activeConnections.get(participantId);
          if (socket) {
            socket.emit('group-message-received', messageObject);
          }
        }
      });
    }

    this.emit('group-message-created', messageObject);

    return messageObject;
  }

  /**
   * Add participant to group
   */
  addGroupParticipant(chatId, participantId, addedBy) {
    const chat = this.activeChats.get(chatId);
    if (!chat) return null;

    if (!chat.participants.includes(participantId)) {
      chat.participants.push(participantId);

      const socket = this.activeConnections.get(participantId);
      if (socket) {
        socket.emit('added-to-group', {
          chatId,
          groupName: chat.name,
          addedBy,
          timestamp: new Date(),
        });
      }

      this.emit('participant-added', { chatId, participantId, addedBy });
    }

    return chat;
  }

  /**
   * Remove participant from group
   */
  removeGroupParticipant(chatId, participantId, removedBy = null) {
    const chat = this.activeChats.get(chatId);
    if (!chat) return null;

    chat.participants = chat.participants.filter(id => id !== participantId);

    const socket = this.activeConnections.get(participantId);
    if (socket) {
      socket.emit('removed-from-group', {
        chatId,
        groupName: chat.name,
        removedBy,
        timestamp: new Date(),
      });
    }

    this.emit('participant-removed', { chatId, participantId, removedBy });

    return chat;
  }

  /**
   * Get users in a specific chat
   */
  getOthersInChat(chatId, excludeUserId) {
    const chat = this.activeChats.get(chatId);
    if (!chat) return [];

    return chat.participants
      .filter(id => id !== excludeUserId && this.activeConnections.has(id))
      .map(id => ({
        userId: id,
        socket: this.activeConnections.get(id),
      }));
  }

  /**
   * Get online status of user
   */
  getOnlineStatus(userId) {
    return {
      userId,
      online: this.activeConnections.has(userId),
      lastSeen: this.activeConnections.has(userId) ? new Date() : null,
    };
  }

  /**
   * Get list of online users
   */
  getOnlineUsers() {
    return Array.from(this.activeConnections.keys()).map(userId => ({
      userId,
      connectedAt: new Date(),
    }));
  }

  /**
   * Clear old typing indicators (older than 30 seconds)
   */
  cleanupTypingIndicators() {
    const now = Date.now();
    const threshold = 30000; // 30 seconds

    for (const [userId, data] of this.typingIndicators) {
      if (now - data.timestamp > threshold) {
        this.typingIndicators.delete(userId);

        // Notify others in chat
        const others = this.getOthersInChat(data.chatId, userId);
        others.forEach(({ socket }) => {
          if (socket) {
            socket.emit('typing-indicator', {
              chatId: data.chatId,
              userId,
              isTyping: false,
              timestamp: new Date(),
            });
          }
        });
      }
    }
  }

  /**
   * Deliver queued messages to user
   */
  deliverQueuedMessages(userId) {
    const userMessages = this.messageQueue.filter(
      msg =>
        msg.recipientId === userId ||
        (msg.metadata.groupMembers && msg.metadata.groupMembers.includes(userId))
    );

    const socket = this.activeConnections.get(userId);
    if (socket && userMessages.length > 0) {
      socket.emit('queued-messages', userMessages);

      // Remove from queue
      this.messageQueue = this.messageQueue.filter(msg => !userMessages.includes(msg));
    }
  }

  /**
   * Get chat history (mock - in real app fetch from DB)
   */
  getChatHistory(chatId, limit = 50, skip = 0) {
    const chat = this.activeChats.get(chatId);
    if (!chat) return null;

    const messages = chat.messages || [];
    const totalMessages = messages.length;

    return {
      chatId,
      messages: messages.slice(skip, skip + limit),
      total: totalMessages,
      pages: Math.ceil(totalMessages / limit),
      currentPage: Math.ceil(skip / limit) + 1,
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      activeConnections: this.activeConnections.size,
      activeChats: this.activeChats.size,
      usersTyping: this.typingIndicators.size,
      queuedMessages: this.messageQueue.length,
      totalMessages: Array.from(this.activeChats.values()).reduce(
        (sum, chat) => sum + (chat.messageCount || 0),
        0
      ),
    };
  }

  /**
   * Get message data (mock)
   */
  getMessageData(messageId) {
    for (const chat of this.activeChats.values()) {
      const msg = chat.messages?.find(m => m.id === messageId);
      if (msg) return msg;
    }
    return null;
  }
}

// Export singleton
module.exports = new MessagingService();
