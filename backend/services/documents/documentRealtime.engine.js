'use strict';

/**
 * Real-Time Document Collaboration Engine — محرك التعاون الفوري
 * ═══════════════════════════════════════════════════════════════
 * تتبع الحضور، مؤشرات، أقفال تحرير، بث مباشر، حل التعارضات
 *
 * @module documentRealtime.engine
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

// ─── نموذج جلسة التعاون ─────────────────────────────
const collabSessionSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        avatar: String,
        status: {
          type: String,
          enum: ['viewing', 'editing', 'commenting', 'idle'],
          default: 'viewing',
        },
        color: String,
        joinedAt: { type: Date, default: Date.now },
        lastHeartbeat: { type: Date, default: Date.now },
        cursorPosition: { page: Number, x: Number, y: Number },
        socketId: String,
      },
    ],
    lockedSections: [
      {
        sectionId: String,
        lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        lockedByName: String,
        lockedAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
    activityLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        action: {
          type: String,
          enum: [
            'joined',
            'left',
            'started_editing',
            'stopped_editing',
            'commented',
            'locked',
            'unlocked',
            'saved',
            'cursor_moved',
          ],
        },
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    isActive: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    totalEdits: { type: Number, default: 0 },
    autoSaveInterval: { type: Number, default: 30000 }, // ms
  },
  { timestamps: true, collection: 'document_collab_sessions' }
);

collabSessionSchema.index({ document: 1, isActive: 1 });
collabSessionSchema.index({ 'participants.userId': 1 });

const CollabSession =
  mongoose.models.CollabSession || mongoose.model('CollabSession', collabSessionSchema);

// ─── ألوان المشاركين ─────────────────────────────
const PARTICIPANT_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
];

class DocumentRealtimeEngine extends EventEmitter {
  constructor() {
    super();
    this._heartbeatInterval = null;
    this._lockTimeout = 5 * 60 * 1000; // 5 minutes
    this._staleTimeout = 2 * 60 * 1000; // 2 minutes
  }

  // ══════════════════════════════════════════
  //  انضمام إلى مستند
  // ══════════════════════════════════════════
  async joinDocument(userId, documentId, userData = {}) {
    try {
      let session = await CollabSession.findOne({ document: documentId, isActive: true });

      if (!session) {
        session = await CollabSession.create({
          document: documentId,
          participants: [],
          lockedSections: [],
          activityLog: [],
        });
      }

      // التحقق أن المستخدم ليس موجوداً بالفعل
      const existingIdx = session.participants.findIndex(p => String(p.userId) === String(userId));
      if (existingIdx >= 0) {
        session.participants[existingIdx].lastHeartbeat = new Date();
        session.participants[existingIdx].status = 'viewing';
        session.participants[existingIdx].socketId = userData.socketId;
      } else {
        const colorIdx = session.participants.length % PARTICIPANT_COLORS.length;
        session.participants.push({
          userId,
          userName: userData.userName || 'مستخدم',
          avatar: userData.avatar,
          status: 'viewing',
          color: PARTICIPANT_COLORS[colorIdx],
          joinedAt: new Date(),
          lastHeartbeat: new Date(),
          socketId: userData.socketId,
        });
      }

      session.activityLog.push({
        userId,
        userName: userData.userName,
        action: 'joined',
        timestamp: new Date(),
      });

      // تقليم سجل النشاط
      if (session.activityLog.length > 500) {
        session.activityLog = session.activityLog.slice(-200);
      }

      await session.save();

      this.emit('participant:joined', {
        documentId,
        userId,
        session: this._sanitizeSession(session),
      });

      logger.info(`[Realtime] User ${userId} joined document ${documentId}`);
      return {
        success: true,
        session: this._sanitizeSession(session),
        participantCount: session.participants.length,
      };
    } catch (err) {
      logger.error('[Realtime] joinDocument error:', err);
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  مغادرة مستند
  // ══════════════════════════════════════════
  async leaveDocument(userId, documentId) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: true };

      const participant = session.participants.find(p => String(p.userId) === String(userId));
      if (participant) {
        // تحرير أي أقفال لهذا المستخدم
        session.lockedSections = session.lockedSections.filter(
          l => String(l.lockedBy) !== String(userId)
        );
      }

      session.participants = session.participants.filter(p => String(p.userId) !== String(userId));

      session.activityLog.push({
        userId,
        userName: participant?.userName,
        action: 'left',
        timestamp: new Date(),
      });

      // إنهاء الجلسة إذا لم يعد هناك مشاركون
      if (session.participants.length === 0) {
        session.isActive = false;
        session.endedAt = new Date();
      }

      await session.save();

      this.emit('participant:left', { documentId, userId });
      return { success: true, remainingParticipants: session.participants.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  المتعاونون النشطون
  // ══════════════════════════════════════════
  async getActiveCollaborators(documentId) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: true, collaborators: [], count: 0 };

      // إزالة المشاركين الخاملين
      const now = Date.now();
      const active = session.participants.filter(
        p => now - new Date(p.lastHeartbeat).getTime() < this._staleTimeout
      );

      return {
        success: true,
        collaborators: active.map(p => ({
          userId: p.userId,
          userName: p.userName,
          avatar: p.avatar,
          status: p.status,
          color: p.color,
          joinedAt: p.joinedAt,
          cursorPosition: p.cursorPosition,
        })),
        count: active.length,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تحديث حالة المستخدم
  // ══════════════════════════════════════════
  async updateUserStatus(userId, documentId, status) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: false, error: 'لا توجد جلسة نشطة' };

      const participant = session.participants.find(p => String(p.userId) === String(userId));
      if (!participant) return { success: false, error: 'المستخدم غير موجود في الجلسة' };

      participant.status = status;
      participant.lastHeartbeat = new Date();

      if (status === 'editing') {
        session.activityLog.push({
          userId,
          userName: participant.userName,
          action: 'started_editing',
          timestamp: new Date(),
        });
      } else if (status === 'viewing') {
        session.activityLog.push({
          userId,
          userName: participant.userName,
          action: 'stopped_editing',
          timestamp: new Date(),
        });
      }

      await session.save();
      this.emit('status:changed', { documentId, userId, status });
      return { success: true, status };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تحديث موقع المؤشر
  // ══════════════════════════════════════════
  async updateCursorPosition(userId, documentId, position) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: false };

      const participant = session.participants.find(p => String(p.userId) === String(userId));
      if (participant) {
        participant.cursorPosition = position;
        participant.lastHeartbeat = new Date();
        await session.save();
      }

      this.emit('cursor:moved', { documentId, userId, position, color: participant?.color });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  قفل قسم
  // ══════════════════════════════════════════
  async lockSection(userId, documentId, sectionId, userName) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: false, error: 'لا توجد جلسة نشطة' };

      const existing = session.lockedSections.find(l => l.sectionId === sectionId);
      if (existing) {
        // هل انتهت الصلاحية؟
        if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
          session.lockedSections = session.lockedSections.filter(l => l.sectionId !== sectionId);
        } else if (String(existing.lockedBy) !== String(userId)) {
          return {
            success: false,
            error: `القسم مقفل بواسطة ${existing.lockedByName}`,
            lockedBy: existing.lockedByName,
          };
        }
      }

      session.lockedSections.push({
        sectionId,
        lockedBy: userId,
        lockedByName: userName,
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + this._lockTimeout),
      });

      session.activityLog.push({
        userId,
        userName,
        action: 'locked',
        details: { sectionId },
        timestamp: new Date(),
      });
      await session.save();

      this.emit('section:locked', { documentId, sectionId, userId, userName });
      return { success: true, sectionId, expiresIn: this._lockTimeout };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  فتح قفل قسم
  // ══════════════════════════════════════════
  async unlockSection(userId, documentId, sectionId) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: false };

      const lock = session.lockedSections.find(l => l.sectionId === sectionId);
      if (lock && String(lock.lockedBy) !== String(userId)) {
        return { success: false, error: 'ليس لديك صلاحية لفتح هذا القفل' };
      }

      session.lockedSections = session.lockedSections.filter(l => l.sectionId !== sectionId);
      session.activityLog.push({
        userId,
        action: 'unlocked',
        details: { sectionId },
        timestamp: new Date(),
      });
      await session.save();

      this.emit('section:unlocked', { documentId, sectionId, userId });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  نبضة القلب (heartbeat)
  // ══════════════════════════════════════════
  async heartbeat(userId, documentId) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: false };

      const participant = session.participants.find(p => String(p.userId) === String(userId));
      if (participant) {
        participant.lastHeartbeat = new Date();
        await session.save();
      }

      return { success: true, timestamp: new Date() };
    } catch (err) {
      return { success: false };
    }
  }

  // ══════════════════════════════════════════
  //  بث حدث (تعليق، تعديل، إلخ)
  // ══════════════════════════════════════════
  async broadcastEvent(documentId, eventType, eventData, userId) {
    try {
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: false };

      session.activityLog.push({
        userId,
        userName: eventData.userName,
        action: eventType,
        details: eventData,
        timestamp: new Date(),
      });

      if (eventType === 'saved') {
        session.totalEdits++;
      }

      await session.save();
      this.emit(`event:${eventType}`, { documentId, userId, data: eventData });

      return {
        success: true,
        broadcastTo: session.participants.filter(p => String(p.userId) !== String(userId)).length,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  سجل النشاط
  // ══════════════════════════════════════════
  async getActivityLog(documentId, options = {}) {
    try {
      const { limit = 50, since } = options;
      const session = await CollabSession.findOne({ document: documentId, isActive: true });
      if (!session) return { success: true, activities: [] };

      let activities = session.activityLog;
      if (since) {
        activities = activities.filter(a => new Date(a.timestamp) > new Date(since));
      }

      return {
        success: true,
        activities: activities.slice(-limit).reverse(),
        participantCount: session.participants.length,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  تنظيف الجلسات الخاملة
  // ══════════════════════════════════════════
  async cleanupStaleSessions() {
    try {
      const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 min
      const result = await CollabSession.updateMany(
        {
          isActive: true,
          updatedAt: { $lt: staleThreshold },
          'participants.0': { $exists: false },
        },
        { isActive: false, endedAt: new Date() }
      );

      // إزالة المشاركين الخاملين من الجلسات النشطة
      const activeSessions = await CollabSession.find({ isActive: true });
      let removedParticipants = 0;

      for (const session of activeSessions) {
        const before = session.participants.length;
        session.participants = session.participants.filter(
          p => Date.now() - new Date(p.lastHeartbeat).getTime() < this._staleTimeout
        );
        removedParticipants += before - session.participants.length;

        // إزالة الأقفال المنتهية
        session.lockedSections = session.lockedSections.filter(
          l => !l.expiresAt || new Date(l.expiresAt) > new Date()
        );

        if (session.participants.length === 0) {
          session.isActive = false;
          session.endedAt = new Date();
        }
        await session.save();
      }

      return {
        success: true,
        closedSessions: result.modifiedCount,
        removedParticipants,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ══════════════════════════════════════════
  //  إحصائيات
  // ══════════════════════════════════════════
  async getStats() {
    try {
      const [activeSessions, totalSessions, totalParticipants] = await Promise.all([
        CollabSession.countDocuments({ isActive: true }),
        CollabSession.countDocuments(),
        CollabSession.aggregate([
          { $match: { isActive: true } },
          { $project: { count: { $size: '$participants' } } },
          { $group: { _id: null, total: { $sum: '$count' } } },
        ]),
      ]);

      return {
        success: true,
        stats: {
          activeSessions,
          totalSessions,
          activeParticipants: totalParticipants[0]?.total || 0,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── Helper ──────────────────────────────
  _sanitizeSession(session) {
    return {
      id: session._id,
      document: session.document,
      participants: session.participants.map(p => ({
        userId: p.userId,
        userName: p.userName,
        avatar: p.avatar,
        status: p.status,
        color: p.color,
      })),
      lockedSections: session.lockedSections.map(l => ({
        sectionId: l.sectionId,
        lockedByName: l.lockedByName,
        expiresAt: l.expiresAt,
      })),
      participantCount: session.participants.length,
    };
  }
}

module.exports = new DocumentRealtimeEngine();
