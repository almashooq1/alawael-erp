/**
 * DDD Collaboration Hub — Phase 13a
 * مركز التعاون والتواصل الفوري
 *
 * Real-time team messaging, channels, @mentions,
 * read receipts, typing indicators, and presence tracking.
 */

'use strict';

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════
   Mongoose Models
   ═══════════════════════════════════════════════════════════════ */

const dddChannelSchema = new mongoose.Schema(
  {
    channelId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: {
      type: String,
      enum: ['direct', 'group', 'team', 'department', 'case', 'announcement', 'support'],
      default: 'group',
    },
    domain: { type: String },
    entityRef: {
      entityType: String,
      entityId: { type: mongoose.Schema.Types.ObjectId },
    },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'admin', 'member', 'readonly'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        mutedUntil: Date,
        lastReadAt: Date,
      },
    ],
    settings: {
      isPrivate: { type: Boolean, default: false },
      allowThreads: { type: Boolean, default: true },
      allowReactions: { type: Boolean, default: true },
      allowFileSharing: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 365 },
      pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId }],
    },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dddChannelSchema.index({ 'members.userId': 1 });
dddChannelSchema.index({ type: 1, domain: 1 });

const DDDChannel = mongoose.models.DDDChannel || mongoose.model('DDDChannel', dddChannelSchema);

const dddMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    contentType: {
      type: String,
      enum: ['text', 'rich-text', 'system', 'file', 'image', 'link', 'clinical-note'],
      default: 'text',
    },
    mentions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['user', 'role', 'channel', 'everyone'], default: 'user' },
      },
    ],
    attachments: [
      {
        fileId: String,
        fileName: String,
        fileType: String,
        fileSize: Number,
        url: String,
      },
    ],
    threadId: { type: String, index: true },
    replyTo: { type: String },
    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

dddMessageSchema.index({ channelId: 1, createdAt: -1 });
dddMessageSchema.index({ sender: 1, createdAt: -1 });
dddMessageSchema.index({ 'mentions.userId': 1 });

const DDDMessage = mongoose.models.DDDMessage || mongoose.model('DDDMessage', dddMessageSchema);

const dddPresenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: {
      type: String,
      enum: ['online', 'away', 'busy', 'dnd', 'offline'],
      default: 'offline',
    },
    statusMessage: String,
    lastSeen: { type: Date, default: Date.now },
    currentChannel: String,
    device: { type: String, enum: ['web', 'mobile', 'desktop', 'tablet'], default: 'web' },
    isTyping: { channelId: String, since: Date },
  },
  { timestamps: true }
);

const DDDPresence = mongoose.models.DDDPresence || mongoose.model('DDDPresence', dddPresenceSchema);

/* ═══════════════════════════════════════════════════════════════
   Channel Types & Templates
   ═══════════════════════════════════════════════════════════════ */

const CHANNEL_TYPES = {
  direct: { label: 'Direct Message', labelAr: 'رسالة مباشرة', maxMembers: 2 },
  group: { label: 'Group Chat', labelAr: 'محادثة جماعية', maxMembers: 50 },
  team: { label: 'Team Channel', labelAr: 'قناة الفريق', maxMembers: 100 },
  department: { label: 'Department Channel', labelAr: 'قناة القسم', maxMembers: 200 },
  case: { label: 'Case Discussion', labelAr: 'مناقشة الحالة', maxMembers: 20 },
  announcement: { label: 'Announcement', labelAr: 'إعلان', maxMembers: 1000 },
  support: { label: 'Support Channel', labelAr: 'قناة الدعم', maxMembers: 50 },
};

const BUILTIN_CHANNELS = [
  { channelId: 'ch-general', name: 'General', nameAr: 'عام', type: 'team' },
  {
    channelId: 'ch-clinical',
    name: 'Clinical Team',
    nameAr: 'الفريق السريري',
    type: 'department',
    domain: 'sessions',
  },
  {
    channelId: 'ch-therapy',
    name: 'Therapy Updates',
    nameAr: 'تحديثات العلاج',
    type: 'team',
    domain: 'care-plans',
  },
  {
    channelId: 'ch-quality',
    name: 'Quality & Compliance',
    nameAr: 'الجودة والامتثال',
    type: 'department',
    domain: 'quality',
  },
  {
    channelId: 'ch-family',
    name: 'Family Coordination',
    nameAr: 'تنسيق الأسرة',
    type: 'team',
    domain: 'family',
  },
  {
    channelId: 'ch-research',
    name: 'Research',
    nameAr: 'البحث العلمي',
    type: 'team',
    domain: 'research',
  },
  {
    channelId: 'ch-training',
    name: 'Training & Development',
    nameAr: 'التدريب والتطوير',
    type: 'department',
    domain: 'field-training',
  },
  {
    channelId: 'ch-announcements',
    name: 'Announcements',
    nameAr: 'الإعلانات',
    type: 'announcement',
  },
  { channelId: 'ch-it-support', name: 'IT Support', nameAr: 'الدعم الفني', type: 'support' },
  { channelId: 'ch-management', name: 'Management', nameAr: 'الإدارة', type: 'team' },
];

/* ═══════════════════════════════════════════════════════════════
   Presence Status Definitions
   ═══════════════════════════════════════════════════════════════ */

const PRESENCE_STATUSES = {
  online: { label: 'Online', labelAr: 'متصل', color: '#4caf50', priority: 1 },
  away: { label: 'Away', labelAr: 'بعيد', color: '#ff9800', priority: 2 },
  busy: { label: 'Busy', labelAr: 'مشغول', color: '#f44336', priority: 3 },
  dnd: { label: 'Do Not Disturb', labelAr: 'عدم الإزعاج', color: '#9c27b0', priority: 4 },
  offline: { label: 'Offline', labelAr: 'غير متصل', color: '#9e9e9e', priority: 5 },
};

/* ═══════════════════════════════════════════════════════════════
   Core Functions
   ═══════════════════════════════════════════════════════════════ */

async function createChannel(data) {
  const channelId = data.channelId || `ch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return DDDChannel.create({ ...data, channelId });
}

async function sendMessage(channelId, senderId, content, options = {}) {
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

  // Parse mentions from content
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({ userId: match[2], type: 'user' });
  }

  const message = await DDDMessage.create({
    messageId,
    channelId,
    sender: senderId,
    content,
    contentType: options.contentType || 'text',
    mentions,
    attachments: options.attachments || [],
    threadId: options.threadId,
    replyTo: options.replyTo,
    metadata: options.metadata,
  });

  return message;
}

async function getChannelMessages(channelId, options = {}) {
  const { limit = 50, before, after } = options;
  const query = { channelId, isDeleted: false };
  if (before) query.createdAt = { $lt: new Date(before) };
  if (after) query.createdAt = { ...query.createdAt, $gt: new Date(after) };

  return DDDMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean();
}

async function markAsRead(channelId, userId) {
  await DDDMessage.updateMany(
    { channelId, 'readBy.userId': { $ne: userId } },
    { $push: { readBy: { userId, readAt: new Date() } } }
  );
  await DDDChannel.updateOne(
    { channelId, 'members.userId': userId },
    { $set: { 'members.$.lastReadAt': new Date() } }
  );
  return { channelId, userId, markedAt: new Date() };
}

async function addReaction(messageId, userId, emoji) {
  const msg = await DDDMessage.findOne({ messageId });
  if (!msg) throw new Error(`Message not found: ${messageId}`);

  const reaction = msg.reactions.find(r => r.emoji === emoji);
  if (reaction) {
    if (!reaction.users.includes(userId)) {
      reaction.users.push(userId);
    }
  } else {
    msg.reactions.push({ emoji, users: [userId] });
  }
  await msg.save();
  return msg;
}

async function updatePresence(userId, status, options = {}) {
  return DDDPresence.findOneAndUpdate(
    { userId },
    {
      $set: {
        status,
        statusMessage: options.statusMessage,
        lastSeen: new Date(),
        device: options.device || 'web',
        currentChannel: options.currentChannel,
      },
    },
    { upsert: true, new: true }
  );
}

async function getOnlineUsers(channelId) {
  if (channelId) {
    const channel = await DDDChannel.findOne({ channelId }).lean();
    if (!channel) return [];
    const memberIds = channel.members.map(m => m.userId);
    return DDDPresence.find({ userId: { $in: memberIds }, status: { $ne: 'offline' } }).lean();
  }
  return DDDPresence.find({ status: { $ne: 'offline' } }).lean();
}

async function searchMessages(query, options = {}) {
  const filter = { isDeleted: false };
  if (options.channelId) filter.channelId = options.channelId;
  if (query) filter.$text = { $search: query };
  else if (query) filter.content = { $regex: query, $options: 'i' };

  return DDDMessage.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .lean();
}

async function getUnreadCount(userId) {
  const channels = await DDDChannel.find({ 'members.userId': userId }).lean();
  const results = [];
  for (const ch of channels) {
    const member = ch.members.find(m => m.userId?.toString() === userId?.toString());
    const lastRead = member?.lastReadAt || new Date(0);
    const unread = await DDDMessage.countDocuments({
      channelId: ch.channelId,
      createdAt: { $gt: lastRead },
      sender: { $ne: userId },
      isDeleted: false,
    });
    if (unread > 0) results.push({ channelId: ch.channelId, name: ch.name, unread });
  }
  return results;
}

async function seedChannels() {
  let seeded = 0;
  for (const ch of BUILTIN_CHANNELS) {
    const exists = await DDDChannel.findOne({ channelId: ch.channelId }).lean();
    if (!exists) {
      await DDDChannel.create({ ...ch, members: [], settings: {} });
      seeded++;
    }
  }
  return { seeded, total: BUILTIN_CHANNELS.length };
}

async function getCollaborationDashboard() {
  const [channelCount, messageCount, onlineCount] = await Promise.all([
    DDDChannel.countDocuments({ isActive: true }),
    DDDMessage.countDocuments({ isDeleted: false }),
    DDDPresence.countDocuments({ status: { $ne: 'offline' } }),
  ]);

  return {
    service: 'CollaborationHub',
    channels: {
      total: channelCount,
      builtin: BUILTIN_CHANNELS.length,
      types: Object.keys(CHANNEL_TYPES).length,
    },
    messages: messageCount,
    onlineUsers: onlineCount,
    presenceStatuses: Object.keys(PRESENCE_STATUSES).length,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════════════════ */

function createCollaborationHubRouter() {
  const r = Router();

  r.get('/collaboration', async (_req, res) => {
    try {
      res.json({ success: true, data: await getCollaborationDashboard() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/collaboration/channels', async (req, res) => {
    try {
      const query = { isActive: true };
      if (req.query.type) query.type = req.query.type;
      const channels = await DDDChannel.find(query).lean();
      res.json({ success: true, data: channels });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/collaboration/channels', async (req, res) => {
    try {
      res.json({ success: true, data: await createChannel(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/collaboration/channels/:channelId/messages', async (req, res) => {
    try {
      res.json({ success: true, data: await getChannelMessages(req.params.channelId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/collaboration/channels/:channelId/messages', async (req, res) => {
    try {
      const { senderId, content, ...opts } = req.body;
      res.json({
        success: true,
        data: await sendMessage(req.params.channelId, senderId, content, opts),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/collaboration/channels/:channelId/read', async (req, res) => {
    try {
      res.json({ success: true, data: await markAsRead(req.params.channelId, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/collaboration/messages/:messageId/reactions', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await addReaction(req.params.messageId, req.body.userId, req.body.emoji),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/collaboration/presence', async (req, res) => {
    try {
      res.json({ success: true, data: await getOnlineUsers(req.query.channelId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/collaboration/presence', async (req, res) => {
    try {
      const { userId, status, ...opts } = req.body;
      res.json({ success: true, data: await updatePresence(userId, status, opts) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.get('/collaboration/search', async (req, res) => {
    try {
      res.json({ success: true, data: await searchMessages(req.query.q, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  r.post('/collaboration/seed', async (_req, res) => {
    try {
      res.json({ success: true, data: await seedChannels() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return r;
}

/* ═══════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDChannel,
  DDDMessage,
  DDDPresence,
  CHANNEL_TYPES,
  BUILTIN_CHANNELS,
  PRESENCE_STATUSES,
  createChannel,
  sendMessage,
  getChannelMessages,
  markAsRead,
  addReaction,
  updatePresence,
  getOnlineUsers,
  searchMessages,
  getUnreadCount,
  seedChannels,
  getCollaborationDashboard,
  createCollaborationHubRouter,
};
