/**
 * Threads Routes - Separate routing for /api/threads
 * To avoid conflicts with messaging.routes.js
 */

const express = require('express');
const router = express.Router();

// Mock messaging service
const messagingService = {
  getThreads: async () => [
    {
      _id: 'thread1',
      title: 'Sample Thread',
      participants: ['user123'],
      description: '',
      lastMessage: 'Last message',
      unreadCount: 0,
      createdAt: new Date(),
    }
  ],
  getThread: async (id) => ({
    _id: id,
    title: 'Thread ' + id,
    description: '',
    participants: ['user123'],
    messages: [
      { _id: 'msg1', content: 'Sample message', author: 'user123', createdAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  })
};

/**
 * POST /api/threads
 * Create a new thread
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, participants, subject } = req.body;
    const userId = req.user?.id || req.user?.userId;

    if (!title && !subject) {
      return res.status(400).json({
        success: false,
        message: 'Thread title or subject is required',
      });
    }

    const thread = {
      _id: `thread_${Date.now()}`,
      title: title || subject,
      description: description || '',
      creator: userId,
      participants: participants || [userId],
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };

    return res.status(201).json({
      success: true,
      thread,
      message: 'Thread created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create thread',
      error: error.message,
    });
  }
});

/**
 * GET /api/threads
 * Get all threads for current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { page = 1, limit = 20 } = req.query;

    const threads = await messagingService.getThreads() || [];

    return res.status(200).json({
      success: true,
      threads: Array.isArray(threads) ? threads : [threads],
      count: Array.isArray(threads) ? threads.length : 1,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve threads',
      error: error.message,
    });
  }
});

/**
 * GET /api/threads/:id
 * Get specific thread
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Thread ID is required',
      });
    }

    const thread = await messagingService.getThread(id) || {
      _id: id,
      title: 'Unknown Thread',
      messages: [],
      createdAt: new Date(),
    };

    return res.status(200).json({
      success: true,
      thread: {
        ...thread,
        messages: thread.messages || []
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve thread',
      error: error.message,
    });
  }
});

/**
 * POST /api/threads/:id/messages
 * Add message to thread
 */
router.post('/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { content, attachments } = req.body;
  const userId = req.user?.id || req.user?.userId;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Thread ID is required',
    });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Message content is required',
    });
  }

  const reply = {
    _id: `reply_${Date.now()}`,
    threadId: id,
    author: userId,
    content,
    attachments: attachments || [],
    createdAt: new Date(),
    read: false,
  };

  return res.status(201).json({
    success: true,
    reply,
    message: 'Message added to thread successfully',
  });
});

/**
 * PATCH /api/threads/:id/archive
 * Archive thread
 */
router.patch('/:id/archive', (req, res) => {
  res.json({
    success: true,
    message: 'Thread archived successfully',
  });
});

/**
 * POST /api/threads/:id/leave
 * Leave thread
 */
router.post('/:id/leave', (req, res) => {
  res.json({
    success: true,
    message: 'Left thread successfully',
  });
});

/**
 * POST /api/threads/:id/pin-message
 * Pin a message in a thread
 */
router.post('/:id/pin-message', (req, res) => {
  try {
    const { id } = req.params;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required',
      });
    }

    return res.json({
      success: true,
      message: 'Message pinned successfully',
      thread: {
        _id: id,
        pinnedMessage: messageId,
        pinnedAt: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to pin message',
      error: error.message,
    });
  }
});

module.exports = router;
