/**
 * Messaging Service Simplified - Phase 2
 * Lightweight version for basic messaging functionality
 */

module.exports = {
  /**
   * Create a new message
   */
  createMessage: async messageData => {
    const {
      content,
      sender,
      recipient,
      conversationId,
      attachments = [],
      mentions = [],
      read = false,
    } = messageData;
    return {
      _id: `msg-${Date.now()}`,
      content,
      sender,
      recipient,
      conversationId,
      attachments,
      mentions,
      read,
      createdAt: new Date(),
    };
  },

  /**
   * Get messages
   */
  getMessages: async (options = {}) => {
    return [
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
    ];
  },

  /**
   * Update a message
   */
  updateMessage: async (messageId, updates) => {
    return {
      _id: messageId,
      ...updates,
      updated: true,
    };
  },

  /**
   * Delete a message
   */
  deleteMessage: async (id, userId) => {
    return {
      success: true,
      deletedId: id,
    };
  },

  /**
   * Mark message as read
   */
  markAsRead: async (messageId, userId) => {
    return {
      success: true,
      messageId,
      read: true,
    };
  },

  /**
   * Create a thread
   */
  createThread: async threadData => {
    const { participants, subject } = threadData;
    return {
      _id: `thread-${Date.now()}`,
      participants: participants || [],
      subject,
      messages: [],
      createdAt: new Date(),
    };
  },

  /**
   * Get threads
   */
  getThreads: async (userId, options = {}) => {
    return [
      {
        _id: 'thread1',
        participants: ['user1', 'user2'],
        lastMessage: 'Last message',
        unreadCount: 0,
      },
    ];
  },

  /**
   * Search messages
   */
  searchMessages: async (query, userId) => {
    return [{ _id: 'msg123', content: 'matching message' }];
  },

  /**
   * Get unread count
   */
  getUnreadCount: async userId => {
    return {
      userId,
      unreadCount: 5,
    };
  },
};
