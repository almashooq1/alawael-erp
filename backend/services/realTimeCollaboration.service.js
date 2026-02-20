/**
 * خدمة التعاون في الوقت الفعلي
 * Real-Time Collaboration Service
 * 
 * Features:
 * - Live document editing
 * - Real-time presence awareness
 * - Operational Transformation (OT) for conflict resolution
 * - Activity streaming and audit trail
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

class RealtimeCollaborationService extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.documents = new Map();
    this.activeUsers = new Map();
    this.changesQueue = new Map();
    this.undoStack = new Map();
    this.redoStack = new Map();
  }

  /**
   * إنشاء جلسة تعاون جديدة
   * Create a new collaboration session
   * @param {Object} config - Session configuration
   * @returns {Object} - Session details with unique ID
   */
  createCollaborationSession(config) {
    const sessionId = uuidv4();
    
    const session = {
      id: sessionId,
      documentId: config.documentId,
      createdAt: new Date(),
      createdBy: config.userId,
      participants: [config.userId],
      settings: {
        maxParticipants: config.maxParticipants || 50,
        allowComments: config.allowComments !== false,
        allowTracking: config.allowTracking !== false,
        version: 0,
      },
      metadata: {
        title: config.title || '',
        tags: config.tags || [],
        permissions: config.permissions || { edit: [], view: [] },
      },
    };

    this.sessions.set(sessionId, session);
    this.changesQueue.set(sessionId, []);
    this.undoStack.set(sessionId, []);
    this.redoStack.set(sessionId, []);

    this.emit('session:created', session);
    return session;
  }

  /**
   * إضافة مستخدم إلى جلسة التعاون
   * Add user to collaboration session
   * @param {String} sessionId - Session ID
   * @param {String} userId - User ID to add
   * @param {Object} presence - User presence info
   * @returns {Object} - Updated session
   */
  addUserToSession(sessionId, userId, presence = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.participants.length >= session.settings.maxParticipants) {
      throw new Error('Session is full');
    }

    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
    }

    const userPresence = {
      userId,
      joinedAt: new Date(),
      cursor: presence.cursor || { line: 0, ch: 0 },
      selection: presence.selection || null,
      color: presence.color || this.generateUserColor(userId),
      isTyping: false,
      lastActivity: new Date(),
    };

    this.activeUsers.set(`${sessionId}:${userId}`, userPresence);
    this.emit('user:joined', { sessionId, user: userPresence });

    return session;
  }

  /**
   * تطبيق تغيير على المستند (Operational Transformation)
   * Apply change to document with OT
   * @param {Object} change - Change object
   * @returns {Object} - Applied change with metadata
   */
  applyChange(change) {
    const {
      sessionId,
      userId,
      documentId,
      operation,
      position,
      content,
      timestamp,
    } = change;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Apply Operational Transformation for conflict resolution
    const transformedOperation = this.transformOperation(
      sessionId,
      operation,
      position,
      content
    );

    const appliedChange = {
      id: uuidv4(),
      sessionId,
      documentId,
      userId,
      operation: transformedOperation.type,
      position: transformedOperation.position,
      content: transformedOperation.content,
      timestamp: timestamp || new Date(),
      version: ++session.settings.version,
      hash: this.calculateHash(transformedOperation),
    };

    // Store in changes queue
    const changes = this.changesQueue.get(sessionId) || [];
    changes.push(appliedChange);
    this.changesQueue.set(sessionId, changes);

    // Store in undo stack
    const undoStack = this.undoStack.get(sessionId) || [];
    undoStack.push({
      ...appliedChange,
      reversedAt: null,
    });
    this.undoStack.set(sessionId, undoStack);

    // Clear redo stack
    this.redoStack.set(sessionId, []);

    this.emit('change:applied', {
      sessionId,
      change: appliedChange,
      allParticipants: session.participants,
    });

    return appliedChange;
  }

  /**
   * تحويل العملية بناءً على العمليات السابقة
   * Transform operation based on concurrent changes
   * @param {String} sessionId - Session ID
   * @param {String} operation - Operation type (insert/delete)
   * @param {Number} position - Position in document
   * @param {String} content - Content to insert/delete
   * @returns {Object} - Transformed operation
   */
  transformOperation(sessionId, operation, position, content) {
    const changes = this.changesQueue.get(sessionId) || [];
    let transformedPosition = position;

    // Transform position based on concurrent changes
    for (const change of changes) {
      if (change.timestamp >= new Date(Date.now() - 1000)) { // Recent changes
        if (change.operation === 'insert') {
          if (change.position <= transformedPosition) {
            transformedPosition += change.content.length;
          }
        } else if (change.operation === 'delete') {
          if (change.position < transformedPosition) {
            transformedPosition -= change.content.length;
          }
        }
      }
    }

    return {
      type: operation,
      position: Math.max(0, transformedPosition),
      content,
    };
  }

  /**
   * تتبع حركة المؤشر والتحديد للمستخدم
   * Track user cursor and selection position
   * @param {String} sessionId - Session ID
   * @param {String} userId - User ID
   * @param {Object} position - Cursor/selection position
   * @returns {Object} - Updated presence
   */
  updateUserPresence(sessionId, userId, position) {
    const key = `${sessionId}:${userId}`;
    const presence = this.activeUsers.get(key);

    if (!presence) {
      throw new Error('User not in session');
    }

    presence.cursor = position.cursor || presence.cursor;
    presence.selection = position.selection || null;
    presence.lastActivity = new Date();

    this.activeUsers.set(key, presence);
    this.emit('presence:updated', {
      sessionId,
      userId,
      presence,
    });

    return presence;
  }

  /**
   * تتبع كتابة المستخدم
   * Track user typing status
   * @param {String} sessionId - Session ID
   * @param {String} userId - User ID
   * @param {Boolean} isTyping - Is user typing
   */
  setUserTypingStatus(sessionId, userId, isTyping) {
    const key = `${sessionId}:${userId}`;
    const presence = this.activeUsers.get(key);

    if (!presence) {
      throw new Error('User not in session');
    }

    presence.isTyping = isTyping;
    presence.lastActivity = new Date();

    this.activeUsers.set(key, presence);
    this.emit('typing:status', {
      sessionId,
      userId,
      isTyping,
    });
  }

  /**
   * إضافة تعليق على المستند
   * Add comment to document
   * @param {Object} comment - Comment data
   * @returns {Object} - Created comment
   */
  addComment(comment) {
    const {
      sessionId,
      userId,
      documentId,
      position,
      content,
      resolved = false,
    } = comment;

    const session = this.sessions.get(sessionId);
    if (!session || !session.settings.allowComments) {
      throw new Error('Comments not allowed');
    }

    const createdComment = {
      id: uuidv4(),
      sessionId,
      documentId,
      userId,
      position,
      content,
      resolved,
      createdAt: new Date(),
      replies: [],
    };

    this.emit('comment:added', createdComment);
    return createdComment;
  }

  /**
   * الرد على تعليق محدد
   * Reply to a comment
   * @param {String} commentId - Comment ID
   * @param {Object} reply - Reply data
   * @returns {Object} - Created reply
   */
  replyToComment(commentId, reply) {
    const createdReply = {
      id: uuidv4(),
      userId: reply.userId,
      content: reply.content,
      createdAt: new Date(),
      resolved: false,
    };

    this.emit('comment:reply', {
      commentId,
      reply: createdReply,
    });

    return createdReply;
  }

  /**
   * التراجع عن التغيير الأخير
   * Undo last change
   * @param {String} sessionId - Session ID
   * @param {String} userId - User ID
   * @returns {Object} - Undone change
   */
  undo(sessionId, userId) {
    const undoStack = this.undoStack.get(sessionId) || [];
    
    if (undoStack.length === 0) {
      throw new Error('Nothing to undo');
    }

    const lastChange = undoStack.pop();
    
    // Move to redo stack
    const redoStack = this.redoStack.get(sessionId) || [];
    redoStack.push(lastChange);
    this.redoStack.set(sessionId, redoStack);

    lastChange.reversedAt = new Date();
    this.undoStack.set(sessionId, undoStack);

    this.emit('change:undone', {
      sessionId,
      userId,
      change: lastChange,
    });

    return lastChange;
  }

  /**
   * إعادة التغيير المتراجع عنه
   * Redo last undone change
   * @param {String} sessionId - Session ID
   * @param {String} userId - User ID
   * @returns {Object} - Redone change
   */
  redo(sessionId, userId) {
    const redoStack = this.redoStack.get(sessionId) || [];

    if (redoStack.length === 0) {
      throw new Error('Nothing to redo');
    }

    const lastUndoneChange = redoStack.pop();
    
    // Move back to undo stack
    const undoStack = this.undoStack.get(sessionId) || [];
    lastUndoneChange.reversedAt = null;
    undoStack.push(lastUndoneChange);
    this.undoStack.set(sessionId, undoStack);
    this.redoStack.set(sessionId, redoStack);

    this.emit('change:redone', {
      sessionId,
      userId,
      change: lastUndoneChange,
    });

    return lastUndoneChange;
  }

  /**
   * الحصول على نسخة النقطة في الزمن من المستند
   * Get document snapshot at point in time
   * @param {String} sessionId - Session ID
   * @param {Date} timestamp - Point in time
   * @returns {Array} - Document changes up to timestamp
   */
  getDocumentSnapshot(sessionId, timestamp = new Date()) {
    const changes = this.changesQueue.get(sessionId) || [];
    return changes.filter(
      change => new Date(change.timestamp) <= new Date(timestamp)
    );
  }

  /**
   * الحصول على جميع المستخدمين النشطين في الجلسة
   * Get all active users in session
   * @param {String} sessionId - Session ID
   * @returns {Array} - Active user presence data
   */
  getActiveUsers(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    return session.participants.map(userId => {
      const presence = this.activeUsers.get(`${sessionId}:${userId}`);
      return presence || { userId, cursor: { line: 0, ch: 0 } };
    });
  }

  /**
   * مغادرة الجلسة
   * Leave collaboration session
   * @param {String} sessionId - Session ID
   * @param {String} userId - User ID
   */
  removeUserFromSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const index = session.participants.indexOf(userId);
    if (index !== -1) {
      session.participants.splice(index, 1);
    }

    this.activeUsers.delete(`${sessionId}:${userId}`);
    this.emit('user:left', { sessionId, userId });

    // Close session if no participants
    if (session.participants.length === 0) {
      this.closeSession(sessionId);
    }
  }

  /**
   * إغلاق جلسة التعاون
   * Close collaboration session
   * @param {String} sessionId - Session ID
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const changes = this.changesQueue.get(sessionId) || [];
    this.emit('session:closed', {
      sessionId,
      totalChanges: changes.length,
      participants: session.participants,
    });

    this.sessions.delete(sessionId);
    this.changesQueue.delete(sessionId);
    this.undoStack.delete(sessionId);
    this.redoStack.delete(sessionId);

    // Clean up active user presence
    session.participants.forEach(userId => {
      this.activeUsers.delete(`${sessionId}:${userId}`);
    });
  }

  /**
   * حساب بصمة التغيير
   * Calculate change hash
   * @param {Object} operation - Operation object
   * @returns {String} - Hash of operation
   */
  calculateHash(operation) {
    const crypto = require('crypto');
    const data = JSON.stringify(operation);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * إنشاء لون فريد للمستخدم
   * Generate unique color for user
   * @param {String} userId - User ID
   * @returns {String} - Hex color
   */
  generateUserColor(userId) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B88B', '#A9DFBF', '#F1948A', '#D7BDE2',
    ];
    return colors[userId.charCodeAt(0) % colors.length];
  }

  /**
   * الحصول على إحصائيات الجلسة
   * Get session statistics
   * @param {String} sessionId - Session ID
   * @returns {Object} - Session stats
   */
  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    const changes = this.changesQueue.get(sessionId) || [];
    const activeUsers = this.getActiveUsers(sessionId);

    if (!session) {
      return null;
    }

    const insertions = changes.filter(c => c.operation === 'insert').length;
    const deletions = changes.filter(c => c.operation === 'delete').length;

    return {
      sessionId,
      duration: new Date() - new Date(session.createdAt),
      totalParticipants: session.participants.length,
      activeUsers: activeUsers.length,
      totalChanges: changes.length,
      insertions,
      deletions,
      currentVersion: session.settings.version,
      lastModified: changes.length > 0 ? changes[changes.length - 1].timestamp : session.createdAt,
    };
  }

  /**
   * تصدير سجل التغييرات (للمراجعة والدقابة)
   * Export change history
   * @param {String} sessionId - Session ID
   * @param {Object} options - Export options
   * @returns {Object} - Export data
   */
  exportChangeHistory(sessionId, options = {}) {
    const session = this.sessions.get(sessionId);
    const changes = this.changesQueue.get(sessionId) || [];

    if (!session) {
      return null;
    }

    const filtered = options.userId
      ? changes.filter(c => c.userId === options.userId)
      : changes;

    return {
      sessionId,
      documentId: session.documentId,
      exportedAt: new Date(),
      participants: session.participants,
      totalChanges: filtered.length,
      changes: filtered.map(c => ({
        id: c.id,
        userId: c.userId,
        operation: c.operation,
        position: c.position,
        content: c.content.substring(0, 100), // Truncate for export
        timestamp: c.timestamp,
        version: c.version,
      })),
    };
  }
}

module.exports = new RealtimeCollaborationService();
