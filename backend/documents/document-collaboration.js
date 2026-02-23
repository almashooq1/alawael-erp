/**
 * Document Collaboration Service - خدمة التعاون على المستندات
 * Real-time Collaboration, Comments, Reviews & Sharing
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

/**
 * Collaboration Configuration
 */
const collaborationConfig = {
  // Comment types
  commentTypes: {
    general: 'تعليق عام',
    suggestion: 'اقتراح',
    question: 'سؤال',
    approval: 'موافقة',
    rejection: 'رفض',
    edit: 'تعديل مقترح',
  },
  
  // Review statuses
  reviewStatuses: {
    pending: 'قيد الانتظار',
    in_progress: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
    needs_revision: 'يحتاج تعديل',
  },
  
  // Sharing permissions
  permissions: {
    view: 'مشاهدة',
    comment: 'تعليق',
    edit: 'تحرير',
    approve: 'اعتماد',
    admin: 'إدارة كاملة',
  },
  
  // Notification events
  events: {
    commented: 'تم إضافة تعليق',
    replied: 'تم الرد على تعليق',
    approved: 'تم الاعتماد',
    rejected: 'تم الرفض',
    shared: 'تمت المشاركة',
    edited: 'تم التعديل',
    mentioned: 'تم ذكرك',
  },
};

/**
 * Comment Schema
 */
const CommentSchema = new mongoose.Schema({
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  
  // Comment content
  content: { type: String, required: true },
  type: { type: String, enum: Object.keys(collaborationConfig.commentTypes), default: 'general' },
  
  // Location in document (for inline comments)
  location: {
    page: Number,
    paragraph: Number,
    startOffset: Number,
    endOffset: Number,
    selectedText: String,
  },
  
  // Thread (for replies)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  
  // Author
  author: {
    userId: { type: String, required: true },
    name: String,
    avatar: String,
  },
  
  // Status
  status: { type: String, enum: ['active', 'resolved', 'hidden'], default: 'active' },
  resolvedAt: Date,
  resolvedBy: String,
  
  // Mentions
  mentions: [{
    userId: String,
    name: String,
    notified: { type: Boolean, default: false },
  }],
  
  // Reactions
  reactions: [{
    userId: String,
    type: { type: String, enum: ['like', 'agree', 'disagree', 'celebrate'] },
    createdAt: { type: Date, default: Date.now },
  }],
  
  // Attachments
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  
  // Tenant
  tenantId: String,
}, {
  collection: 'document_comments',
});

// Indexes
CommentSchema.index({ documentId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1 });

/**
 * Review Schema
 */
const ReviewSchema = new mongoose.Schema({
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  
  // Review details
  title: String,
  description: String,
  type: { type: String, enum: ['approval', 'review', 'feedback'] },
  
  // Status
  status: { type: String, enum: Object.keys(collaborationConfig.reviewStatuses), default: 'pending' },
  
  // Reviewers
  reviewers: [{
    userId: String,
    name: String,
    order: Number,
    decision: { type: String, enum: ['pending', 'approved', 'rejected', 'needs_revision'] },
    decisionAt: Date,
    comments: String,
    notified: { type: Boolean, default: false },
  }],
  
  // Current reviewer
  currentReviewerIndex: { type: Number, default: 0 },
  
  // Deadline
  deadline: Date,
  
  // Creator
  createdBy: String,
  
  // Result
  result: {
    decision: String,
    decidedAt: Date,
    decidedBy: String,
    summary: String,
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  completedAt: Date,
  
  // Tenant
  tenantId: String,
}, {
  collection: 'document_reviews',
});

/**
 * Share Schema
 */
const ShareSchema = new mongoose.Schema({
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  
  // Share type
  shareType: { type: String, enum: ['user', 'group', 'department', 'public', 'link'] },
  
  // Recipients
  recipients: [{
    userId: String,
    name: String,
    email: String,
    permission: { type: String, enum: Object.keys(collaborationConfig.permissions) },
  }],
  
  // Link sharing
  link: {
    token: String,
    password: String,
    expiresAt: Date,
    maxAccess: Number,
    accessCount: { type: Number, default: 0 },
    allowDownload: { type: Boolean, default: true },
    allowPrint: { type: Boolean, default: true },
  },
  
  // Message
  message: String,
  
  // Notification
  notificationSent: { type: Boolean, default: false },
  
  // Creator
  sharedBy: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'document_shares',
});

/**
 * Edit Session Schema (for real-time collaboration)
 */
const EditSessionSchema = new mongoose.Schema({
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  
  // Session ID
  sessionId: { type: String, unique: true },
  
  // Participants
  participants: [{
    userId: String,
    name: String,
    color: String,
    cursor: {
      line: Number,
      column: Number,
    },
    selection: {
      startLine: Number,
      startColumn: Number,
      endLine: Number,
      endColumn: Number,
    },
    lastActiveAt: Date,
    isActive: { type: Boolean, default: true },
  }],
  
  // Locks
  locks: [{
    userId: String,
    region: {
      startLine: Number,
      startColumn: Number,
      endLine: Number,
      endColumn: Number,
    },
    lockedAt: Date,
    expiresAt: Date,
  }],
  
  // Status
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  closedAt: Date,
  
  // Tenant
  tenantId: String,
}, {
  collection: 'document_edit_sessions',
});

/**
 * Document Collaboration Service Class
 */
class DocumentCollaborationService extends EventEmitter {
  constructor() {
    super();
    this.Comment = null;
    this.Review = null;
    this.Share = null;
    this.EditSession = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Comment = connection.model('Comment', CommentSchema);
    this.Review = connection.model('Review', ReviewSchema);
    this.Share = connection.model('Share', ShareSchema);
    this.EditSession = connection.model('EditSession', EditSessionSchema);
    
    console.log('✅ Document Collaboration Service initialized');
  }
  
  // ============ Comments ============
  
  /**
   * Add comment
   */
  async addComment(documentId, content, options = {}) {
    const comment = await this.Comment.create({
      documentId,
      content,
      type: options.type || 'general',
      location: options.location,
      parentId: options.parentId,
      author: {
        userId: options.userId,
        name: options.userName,
        avatar: options.userAvatar,
      },
      mentions: this.extractMentions(content),
      attachments: options.attachments,
      tenantId: options.tenantId,
    });
    
    // Update parent if reply
    if (options.parentId) {
      await this.Comment.findByIdAndUpdate(
        options.parentId,
        { $push: { replies: comment._id } }
      );
    }
    
    // Emit event
    this.emit('comment:added', comment);
    
    // Notify mentioned users
    await this.notifyMentions(comment);
    
    return comment;
  }
  
  /**
   * Extract mentions from content
   */
  extractMentions(content) {
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push({
        userId: match[1],
        notified: false,
      });
    }
    
    return mentions;
  }
  
  /**
   * Notify mentioned users
   */
  async notifyMentions(comment) {
    // Placeholder for notification logic
    this.emit('mentions:created', comment);
  }
  
  /**
   * Get comments for document
   */
  async getComments(documentId, options = {}) {
    const filter = { documentId, status: { $ne: 'hidden' } };
    if (!options.includeResolved) {
      filter.status = 'active';
    }
    
    return this.Comment.find(filter)
      .populate('replies')
      .sort({ createdAt: options.sort || -1 })
      .limit(options.limit || 50);
  }
  
  /**
   * Reply to comment
   */
  async replyToComment(commentId, content, options = {}) {
    return this.addComment(
      (await this.Comment.findById(commentId)).documentId,
      content,
      { ...options, parentId: commentId, type: 'general' }
    );
  }
  
  /**
   * Resolve comment
   */
  async resolveComment(commentId, userId) {
    const comment = await this.Comment.findByIdAndUpdate(
      commentId,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
      { new: true }
    );
    
    this.emit('comment:resolved', comment);
    
    return comment;
  }
  
  /**
   * Add reaction to comment
   */
  async addReaction(commentId, userId, type) {
    const comment = await this.Comment.findById(commentId);
    if (!comment) throw new Error('Comment not found');
    
    // Remove existing reaction from same user
    comment.reactions = comment.reactions.filter(r => r.userId !== userId);
    
    // Add new reaction
    comment.reactions.push({ userId, type });
    await comment.save();
    
    return comment;
  }
  
  // ============ Reviews ============
  
  /**
   * Create review request
   */
  async createReview(documentId, options = {}) {
    const review = await this.Review.create({
      documentId,
      title: options.title,
      description: options.description,
      type: options.type || 'approval',
      reviewers: options.reviewers.map((r, index) => ({
        ...r,
        order: index,
        decision: 'pending',
      })),
      deadline: options.deadline,
      createdBy: options.userId,
      tenantId: options.tenantId,
    });
    
    this.emit('review:created', review);
    
    // Notify first reviewer
    await this.notifyReviewer(review, 0);
    
    return review;
  }
  
  /**
   * Notify reviewer
   */
  async notifyReviewer(review, index) {
    if (index < review.reviewers.length) {
      this.emit('review:assigned', {
        review,
        reviewer: review.reviewers[index],
      });
    }
  }
  
  /**
   * Submit review decision
   */
  async submitDecision(reviewId, userId, decision, comments = '') {
    const review = await this.Review.findById(reviewId);
    if (!review) throw new Error('Review not found');
    
    // Find reviewer
    const reviewerIndex = review.reviewers.findIndex(r => r.userId === userId);
    if (reviewerIndex === -1) throw new Error('Not a reviewer');
    
    // Update decision
    review.reviewers[reviewerIndex].decision = decision;
    review.reviewers[reviewerIndex].decisionAt = new Date();
    review.reviewers[reviewerIndex].comments = comments;
    
    // Check if all reviewers have decided
    const allDecided = review.reviewers.every(r => r.decision !== 'pending');
    
    if (allDecided) {
      // Calculate final decision
      const finalDecision = this.calculateFinalDecision(review.reviewers);
      
      review.status = finalDecision === 'approved' ? 'approved' : 
                      finalDecision === 'rejected' ? 'rejected' : 'needs_revision';
      
      review.result = {
        decision: finalDecision,
        decidedAt: new Date(),
        summary: comments,
      };
      
      review.completedAt = new Date();
      
    } else if (decision === 'rejected') {
      // If any rejection, mark as needs revision
      review.status = 'needs_revision';
    } else if (decision === 'approved') {
      // Move to next reviewer
      review.currentReviewerIndex = reviewerIndex + 1;
      if (review.currentReviewerIndex < review.reviewers.length) {
        await this.notifyReviewer(review, review.currentReviewerIndex);
      }
    }
    
    review.updatedAt = new Date();
    await review.save();
    
    this.emit('review:decision', { review, decision, userId });
    
    return review;
  }
  
  /**
   * Calculate final decision
   */
  calculateFinalDecision(reviewers) {
    const decisions = reviewers.map(r => r.decision);
    
    if (decisions.every(d => d === 'approved')) return 'approved';
    if (decisions.some(d => d === 'rejected')) return 'rejected';
    return 'needs_revision';
  }
  
  /**
   * Get reviews for document
   */
  async getReviews(documentId, options = {}) {
    const filter = { documentId };
    if (options.status) filter.status = options.status;
    
    return this.Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(options.limit || 20);
  }
  
  /**
   * Get pending reviews for user
   */
  async getPendingReviews(userId, tenantId) {
    return this.Review.find({
      'reviewers.userId': userId,
      'reviewers.decision': 'pending',
      status: { $in: ['pending', 'in_progress'] },
      tenantId,
    }).sort({ deadline: 1 });
  }
  
  // ============ Sharing ============
  
  /**
   * Share document with users
   */
  async shareWithUsers(documentId, recipients, options = {}) {
    const share = await this.Share.create({
      documentId,
      shareType: 'user',
      recipients: recipients.map(r => ({
        ...r,
        permission: r.permission || 'view',
      })),
      message: options.message,
      sharedBy: options.userId,
      tenantId: options.tenantId,
    });
    
    this.emit('document:shared', share);
    
    return share;
  }
  
  /**
   * Create share link
   */
  async createShareLink(documentId, options = {}) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    
    const share = await this.Share.create({
      documentId,
      shareType: 'link',
      link: {
        token,
        password: options.password,
        expiresAt: options.expiresAt,
        maxAccess: options.maxAccess,
        allowDownload: options.allowDownload !== false,
        allowPrint: options.allowPrint !== false,
      },
      sharedBy: options.userId,
      tenantId: options.tenantId,
    });
    
    return {
      shareId: share._id,
      url: `/shared/${token}`,
      token,
    };
  }
  
  /**
   * Access shared document
   */
  async accessSharedDocument(token, password = null) {
    const share = await this.Share.findOne({ 'link.token': token });
    if (!share) throw new Error('Share not found');
    
    // Check expiration
    if (share.link.expiresAt && new Date() > share.link.expiresAt) {
      throw new Error('Share link expired');
    }
    
    // Check max access
    if (share.link.maxAccess && share.link.accessCount >= share.link.maxAccess) {
      throw new Error('Max access limit reached');
    }
    
    // Check password
    if (share.link.password && share.link.password !== password) {
      throw new Error('Invalid password');
    }
    
    // Increment access count
    share.link.accessCount += 1;
    await share.save();
    
    return share;
  }
  
  /**
   * Get shares for document
   */
  async getShares(documentId) {
    return this.Share.find({ documentId }).sort({ createdAt: -1 });
  }
  
  /**
   * Revoke share
   */
  async revokeShare(shareId) {
    const share = await this.Share.findByIdAndUpdate(
      shareId,
      { 'link.expiresAt': new Date() },
      { new: true }
    );
    
    this.emit('share:revoked', share);
    
    return share;
  }
  
  // ============ Real-time Editing ============
  
  /**
   * Create edit session
   */
  async createEditSession(documentId, userId, options = {}) {
    const crypto = require('crypto');
    const sessionId = `edit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const session = await this.EditSession.create({
      documentId,
      sessionId,
      participants: [{
        userId,
        name: options.userName,
        color: options.color || this.generateUserColor(),
        lastActiveAt: new Date(),
        isActive: true,
      }],
      tenantId: options.tenantId,
    });
    
    this.emit('session:created', session);
    
    return session;
  }
  
  /**
   * Generate user color
   */
  generateUserColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  /**
   * Join edit session
   */
  async joinEditSession(sessionId, userId, options = {}) {
    const session = await this.EditSession.findOne({ sessionId, status: 'active' });
    if (!session) throw new Error('Session not found or closed');
    
    // Check if already joined
    const existingParticipant = session.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      existingParticipant.isActive = true;
      existingParticipant.lastActiveAt = new Date();
    } else {
      session.participants.push({
        userId,
        name: options.userName,
        color: options.color || this.generateUserColor(),
        lastActiveAt: new Date(),
        isActive: true,
      });
    }
    
    await session.save();
    
    this.emit('session:joined', { session, userId });
    
    return session;
  }
  
  /**
   * Update cursor position
   */
  async updateCursor(sessionId, userId, cursor) {
    const session = await this.EditSession.findOne({ sessionId });
    if (!session) return;
    
    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.cursor = cursor;
      participant.lastActiveAt = new Date();
      await session.save();
    }
    
    return session;
  }
  
  /**
   * Leave edit session
   */
  async leaveEditSession(sessionId, userId) {
    const session = await this.EditSession.findOne({ sessionId });
    if (!session) return;
    
    const participant = session.participants.find(p => p.userId === userId);
    if (participant) {
      participant.isActive = false;
      await session.save();
    }
    
    // Check if all participants left
    if (session.participants.every(p => !p.isActive)) {
      session.status = 'closed';
      session.closedAt = new Date();
      await session.save();
    }
    
    this.emit('session:left', { session, userId });
    
    return session;
  }
  
  /**
   * Get active sessions for document
   */
  async getActiveSessions(documentId) {
    return this.EditSession.find({
      documentId,
      status: 'active',
      'participants.isActive': true,
    });
  }
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [comments, reviews, shares, sessions] = await Promise.all([
      this.Comment.countDocuments(filter),
      this.Review.countDocuments(filter),
      this.Share.countDocuments(filter),
      this.EditSession.countDocuments({ ...filter, status: 'active' }),
    ]);
    
    return {
      comments,
      reviews,
      shares,
      activeSessions: sessions,
    };
  }
}

// Singleton instance
const documentCollaborationService = new DocumentCollaborationService();

/**
 * Comment Types (Arabic)
 */
const commentTypes = {
  general: { label: 'تعليق عام', icon: 'message' },
  suggestion: { label: 'اقتراح', icon: 'lightbulb' },
  question: { label: 'سؤال', icon: 'help' },
  approval: { label: 'موافقة', icon: 'check' },
  rejection: { label: 'رفض', icon: 'close' },
  edit: { label: 'تعديل مقترح', icon: 'edit' },
};

module.exports = {
  DocumentCollaborationService,
  documentCollaborationService,
  collaborationConfig,
  commentTypes,
};