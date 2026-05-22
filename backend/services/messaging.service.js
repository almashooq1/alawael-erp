/* eslint-disable no-unused-vars */
/**
 * Messaging Service - Phase 2 & 3
 * Handles message creation, retrieval, updates, and deletion
 */

const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

/**
 * Create a new message
 */
const createMessage = async messageData => {
  const {
    content,
    sender,
    recipient,
    conversationId,
    attachments = [],
    mentions = [],
    read = false,
  } = messageData;

  // In Phase 2, we return a simple message object
  // In Phase 3, this would save to database
  return {
    _id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    sender,
    recipient,
    conversationId,
    attachments,
    mentions,
    read,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get messages with filtering and pagination
 */
const getMessages = async (options = {}) => {
  // Return mock data for Phase 2
  // In Phase 3, this would query the database
  const {
    page: _page = 1,
    limit: _limit = 20,
    conversationId: _conversationId,
    unread: _unread,
    userId: _userId,
  } = options;

  return [
    {
      _id: 'msg-001',
      content: 'First message',
      sender: 'user-001',
      recipient: 'user-002',
      read: true,
      createdAt: new Date('2026-01-15'),
    },
    {
      _id: 'msg-002',
      content: 'Second message',
      sender: 'user-002',
      recipient: 'user-001',
      read: false,
      createdAt: new Date('2026-01-20'),
    },
  ];
};

/**
 * Get a specific message by ID
 */
const getMessage = async (messageId, _userId) => {
  return {
    _id: messageId,
    content: 'Message content',
    sender: 'user-001',
    read: true,
    createdAt: new Date(),
  };
};

/**
 * Update message content
 */
const updateMessage = async (messageId, updates) => {
  return {
    _id: messageId,
    content: updates.content || 'Updated message',
    updated: true,
    updatedAt: new Date(),
  };
};

/**
 * Delete a message
 */
const deleteMessage = async (messageId, userId) => {
  return {
    success: true,
    deletedId: messageId,
  };
};

/**
 * Mark message(s) as read
 */
const markAsRead = async (messageId, userId) => {
  return {
    success: true,
    messageId,
    read: true,
    updatedAt: new Date(),
  };
};

/**
 * Bulk mark messages as read
 */
const markMultipleAsRead = async (messageIds, userId) => {
  return {
    success: true,
    updatedCount: (messageIds || []).length,
    messageIds,
  };
};

/**
 * Bulk delete messages
 */
const bulkDeleteMessages = async (messageIds, userId) => {
  return {
    success: true,
    deletedCount: (messageIds || []).length,
    deletedIds: messageIds,
  };
};

/**
 * Search messages
 */
const searchMessages = async (query, userId, options = {}) => {
  return [
    {
      _id: 'msg-search-001',
      content: 'matching message content',
      sender: 'user-001',
    },
  ];
};

/**
 * Get unread message count
 */
const getUnreadCount = async userId => {
  return {
    userId,
    unreadCount: 3,
  };
};

/**
 * Create a message thread
 */
const createThread = async threadData => {
  const { participants = [], subject, conversationId } = threadData;

  return {
    _id: `thread-${Date.now()}`,
    participants,
    subject,
    conversationId,
    messages: [],
    createdAt: new Date(),
  };
};

/**
 * Get threads (conversations) for a user.
 *
 * Delegates to Conversation.getUserConversations (a Mongoose static
 * on conversation.model.js that already handles populate + sort +
 * pagination). Adds per-thread unreadCount by querying Message.
 *
 * Wave 276c — real implementation replacing the pre-2026-05-21
 * hardcoded `[{_id:'thread-001',...}]` stub. Prior callers (legacy
 * frontend messagesService + parent-portal-v1) received fake data
 * irrespective of DB contents — see CLAUDE.md "known issues".
 *
 * @param {string|ObjectId} userId
 * @param {{page?:number, limit?:number, archived?:boolean}} [options]
 * @returns {Promise<Array<{_id, type, participants, lastMessage, unreadCount, updatedAt, ...}>>}
 */
const getThreads = async (userId, options = {}) => {
  if (!userId) return [];
  const { page = 1, limit = 20, archived = false } = options;
  const conversations = await Conversation.getUserConversations(userId, {
    page,
    limit,
    archived,
  });
  if (!Array.isArray(conversations) || conversations.length === 0) return [];

  // Decorate with unread counts (one query per conversation — small N
  // since results are already paginated). Tolerate Message.getUnreadCount
  // unavailable in test envs that mock only Conversation.
  const out = [];
  for (const c of conversations) {
    let unreadCount = 0;
    try {
      if (typeof Message.getUnreadCount === 'function') {
        unreadCount = (await Message.getUnreadCount(c._id, userId)) || 0;
      }
    } catch {
      /* leave unreadCount=0 when count probe fails */
    }
    const plain = typeof c.toObject === 'function' ? c.toObject() : c;
    out.push({ ...plain, unreadCount });
  }
  return out;
};

/**
 * Get a single thread + its recent messages.
 *
 * Returns { ok:false, reason:'NOT_FOUND' } when the conversation
 * doesn't exist OR the caller is not a participant. Authorization
 * rule: only active participants can read; this lib-level check is
 * the defense-in-depth complement to route-layer authentication.
 *
 * @param {string|ObjectId} threadId
 * @param {string|ObjectId} userId
 * @param {{page?:number, limit?:number}} [messageOptions]
 * @returns {Promise<{ok:true, thread, messages}|{ok:false, reason:string}>}
 */
const getThread = async (threadId, userId, messageOptions = {}) => {
  if (!threadId || !userId) return { ok: false, reason: 'INVALID_ARGS' };

  let conversation;
  try {
    conversation = await Conversation.findById(threadId)
      .populate('participants.user', 'fullName email avatar role')
      .populate('lastMessage.sender', 'fullName avatar');
  } catch {
    return { ok: false, reason: 'INVALID_ID' };
  }
  if (!conversation || conversation.isDeleted) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  // Authorization: caller must be an ACTIVE participant.
  const uid = String(userId);
  const isParticipant = (conversation.participants || []).some(p => {
    const pid = p.user && (p.user._id || p.user);
    return p.isActive !== false && String(pid) === uid;
  });
  if (!isParticipant) return { ok: false, reason: 'FORBIDDEN' };

  let messages = [];
  try {
    messages = await Message.getConversationMessages(threadId, userId, messageOptions);
  } catch {
    /* surface empty list if message lookup fails */
  }

  return { ok: true, thread: conversation, messages: messages || [] };
};

/**
 * Post a new message into a thread.
 *
 * Caller must be an active participant. Creates a Message row, then
 * updates the conversation's lastMessage + lastActivityAt via the
 * model's `updateLastMessage` instance method (which also bumps
 * stats.totalMessages — single source of truth for the counter).
 *
 * @param {string|ObjectId} threadId
 * @param {{text?:string, content?:string, type?:string, attachments?:any[], replyTo?:string}} messageData
 * @param {string|ObjectId} userId
 * @returns {Promise<{ok:true, message}|{ok:false, reason:string}>}
 */
const addMessageToThread = async (threadId, messageData = {}, userId) => {
  if (!threadId || !userId) return { ok: false, reason: 'INVALID_ARGS' };

  // Accept either `text` or string `content` from callers; normalize to
  // the model's `content.text` shape.
  const rawText =
    typeof messageData.text === 'string'
      ? messageData.text
      : typeof messageData.content === 'string'
        ? messageData.content
        : messageData.content && typeof messageData.content.text === 'string'
          ? messageData.content.text
          : '';
  if (!rawText || rawText.trim().length === 0) {
    return { ok: false, reason: 'EMPTY_CONTENT' };
  }

  let conversation;
  try {
    conversation = await Conversation.findById(threadId);
  } catch {
    return { ok: false, reason: 'INVALID_ID' };
  }
  if (!conversation || conversation.isDeleted) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  const uid = String(userId);
  const isParticipant = (conversation.participants || []).some(
    p => p.isActive !== false && String(p.user) === uid
  );
  if (!isParticipant) return { ok: false, reason: 'FORBIDDEN' };

  const created = await Message.create({
    conversationId: threadId,
    sender: userId,
    content: {
      text: rawText.trim(),
      type: messageData.type || 'text',
    },
    attachments: Array.isArray(messageData.attachments) ? messageData.attachments : [],
    replyTo: messageData.replyTo || undefined,
  });

  try {
    await conversation.updateLastMessage(created);
  } catch {
    /* lastMessage refresh is best-effort — message persisted regardless */
  }

  return { ok: true, message: created };
};

/**
 * Archive thread
 */
const archiveThread = async (threadId, userId) => {
  return {
    _id: threadId,
    archived: true,
    archivedAt: new Date(),
  };
};

/**
 * Leave thread
 */
const leaveThread = async (threadId, userId) => {
  return {
    _id: threadId,
    left: true,
    leftAt: new Date(),
  };
};

/**
 * Get unread messages
 */
const getUnreadMessages = async userId => {
  return [];
};

/**
 * Clear unread for user
 */
const clearUnread = async (userId, conversationId) => {
  return {
    success: true,
    userId,
    conversationId,
  };
};

/**
 * Mark conversation as read
 */
const markConversationAsRead = async (conversationId, userId) => {
  return {
    success: true,
    conversationId,
    userId,
  };
};

// Export all methods as an object
module.exports = {
  createMessage,
  getMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
  markMultipleAsRead,
  bulkDeleteMessages,
  searchMessages,
  getUnreadCount,
  createThread,
  getThreads,
  getThread,
  addMessageToThread,
  archiveThread,
  leaveThread,
  getUnreadMessages,
  clearUnread,
  markConversationAsRead,
};
