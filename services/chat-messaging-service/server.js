/* ─────────────────────────────────────────────────────────
   Al-Awael ERP — Chat & Messaging Service  (Port 3720)
   ───────────────────────────────────────────────────────── */
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const dayjs = require('dayjs');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3720;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_chat';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/* ── Redis ───────────────────────────────────────────── */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
redis.on('error', e => console.error('Redis error', e.message));

const redisSub = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const redisPub = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

/* ── BullMQ ──────────────────────────────────────────── */
const connection = { connection: redis };
const chatQueue = new Queue('chat-actions', connection);

/* ── Mongoose Schemas ────────────────────────────────── */

// ── Room / Channel ──
const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: String,
    type: { type: String, enum: ['direct', 'group', 'channel', 'announcement', 'support'], default: 'group' },
    description: String,
    avatar: String,
    createdBy: { userId: String, name: String },
    members: [
      {
        userId: String,
        name: String,
        role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        lastReadAt: Date,
        isMuted: { type: Boolean, default: false },
      },
    ],
    isPrivate: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    pinnedMessages: [String],
    lastMessage: {
      messageId: String,
      text: String,
      sender: String,
      sentAt: Date,
    },
    messageCount: { type: Number, default: 0 },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

roomSchema.pre('save', async function (next) {
  if (!this.roomId) {
    const count = await mongoose.model('Room').countDocuments();
    this.roomId = `ROM-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});
const Room = mongoose.model('Room', roomSchema);

// ── Message ──
const messageSchema = new mongoose.Schema(
  {
    messageId: { type: String, unique: true },
    roomId: { type: String, required: true, index: true },
    sender: { userId: String, name: String, avatar: String },
    type: { type: String, enum: ['text', 'image', 'file', 'audio', 'video', 'system', 'emoji', 'link', 'location'], default: 'text' },
    text: String,
    textAr: String,
    attachment: {
      url: String,
      name: String,
      size: Number,
      mimeType: String,
      thumbnailUrl: String,
    },
    replyTo: { messageId: String, text: String, senderName: String },
    reactions: [
      {
        emoji: String,
        users: [{ userId: String, name: String }],
      },
    ],
    mentions: [{ userId: String, name: String }],
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    readBy: [{ userId: String, readAt: { type: Date, default: Date.now } }],
    isPinned: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed,
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

messageSchema.pre('save', async function (next) {
  if (!this.messageId) {
    this.messageId = `MSG-${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
  }
  next();
});
messageSchema.index({ roomId: 1, sentAt: -1 });
const Message = mongoose.model('Message', messageSchema);

// ── User Presence ──
const presenceSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    name: String,
    status: { type: String, enum: ['online', 'away', 'busy', 'offline'], default: 'offline' },
    statusText: String,
    lastSeen: { type: Date, default: Date.now },
    deviceType: { type: String, enum: ['web', 'mobile', 'desktop'], default: 'web' },
  },
  { timestamps: true },
);
const Presence = mongoose.model('Presence', presenceSchema);

/* ── WebSocket ───────────────────────────────────────── */
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const clients = new Map(); // userId -> Set<ws>

wss.on('connection', (ws, req) => {
  let userId = null;

  ws.on('message', async raw => {
    try {
      const data = JSON.parse(raw);

      if (data.type === 'auth') {
        userId = data.userId;
        if (!clients.has(userId)) clients.set(userId, new Set());
        clients.get(userId).add(ws);
        await Presence.findOneAndUpdate({ userId }, { status: 'online', lastSeen: new Date(), name: data.name }, { upsert: true });
        broadcastToRoom(null, { type: 'presence', userId, status: 'online' });
      }

      if (data.type === 'message' && userId) {
        const msg = await new Message({
          roomId: data.roomId,
          sender: { userId, name: data.senderName },
          type: data.msgType || 'text',
          text: data.text,
          replyTo: data.replyTo || null,
          mentions: data.mentions || [],
          attachment: data.attachment || null,
        }).save();

        await Room.findOneAndUpdate(
          { roomId: data.roomId },
          {
            lastMessage: { messageId: msg.messageId, text: msg.text, sender: msg.sender.name, sentAt: msg.sentAt },
            $inc: { messageCount: 1 },
          },
        );

        // Publish to Redis for multi-instance
        redisPub.publish('chat:messages', JSON.stringify({ roomId: data.roomId, message: msg }));
      }

      if (data.type === 'typing' && userId) {
        redisPub.publish('chat:typing', JSON.stringify({ roomId: data.roomId, userId, name: data.name, isTyping: data.isTyping }));
      }

      if (data.type === 'read' && userId) {
        await Message.updateMany({ roomId: data.roomId, 'readBy.userId': { $ne: userId } }, { $push: { readBy: { userId } } });
        const member = await Room.findOneAndUpdate(
          { roomId: data.roomId, 'members.userId': userId },
          { $set: { 'members.$.lastReadAt': new Date() } },
        );
      }
    } catch (e) {
      console.error('WS message error', e.message);
    }
  });

  ws.on('close', async () => {
    if (userId) {
      const userConns = clients.get(userId);
      if (userConns) {
        userConns.delete(ws);
        if (userConns.size === 0) {
          clients.delete(userId);
          await Presence.findOneAndUpdate({ userId }, { status: 'offline', lastSeen: new Date() });
          broadcastToRoom(null, { type: 'presence', userId, status: 'offline' });
        }
      }
    }
  });
});

// Redis PubSub for broadcasting
redisSub.subscribe('chat:messages', 'chat:typing');
redisSub.on('message', (channel, data) => {
  try {
    const parsed = JSON.parse(data);
    if (channel === 'chat:messages') broadcastToRoom(parsed.roomId, { type: 'new-message', data: parsed.message });
    if (channel === 'chat:typing') broadcastToRoom(parsed.roomId, { type: 'typing', data: parsed });
  } catch (e) {}
});

async function broadcastToRoom(roomId, payload) {
  const json = JSON.stringify(payload);
  if (!roomId) {
    // Broadcast to all connected clients
    for (const [, conns] of clients) {
      for (const ws of conns) {
        if (ws.readyState === WebSocket.OPEN) ws.send(json);
      }
    }
    return;
  }
  const room = await Room.findOne({ roomId }).lean();
  if (!room) return;
  for (const member of room.members) {
    const conns = clients.get(member.userId);
    if (conns) {
      for (const ws of conns) {
        if (ws.readyState === WebSocket.OPEN) ws.send(json);
      }
    }
  }
}

/* ── BullMQ Worker ───────────────────────────────────── */
new Worker(
  'chat-actions',
  async job => {
    const { action, data } = job.data;
    if (action === 'cleanup-old-messages') {
      const cutoff = dayjs().subtract(365, 'day').toDate();
      const result = await Message.deleteMany({ sentAt: { $lt: cutoff }, isPinned: false });
      console.log(`[Cleanup] Removed ${result.deletedCount} messages older than 1 year`);
    }
  },
  connection,
);

/* ── Health ───────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  res.status(mongoOk && redisOk ? 200 : 503).json({
    status: mongoOk && redisOk ? 'healthy' : 'degraded',
    service: 'chat-messaging-service',
    timestamp: new Date().toISOString(),
    mongo: mongoOk ? 'connected' : 'disconnected',
    redis: redisOk ? 'connected' : 'disconnected',
    wsClients: clients.size,
  });
});

/* ══════════════ ROOM ENDPOINTS ══════════════ */

app.post('/api/chat/rooms', async (req, res) => {
  try {
    const room = await new Room(req.body).save();
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/chat/rooms', async (req, res) => {
  try {
    const { userId, type, page = 1, limit = 50 } = req.query;
    const filter = { isArchived: false };
    if (userId) filter['members.userId'] = userId;
    if (type) filter.type = type;
    const rooms = await Room.find(filter)
      .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Room.countDocuments(filter);
    res.json({ success: true, data: rooms, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/chat/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.id });
    if (!room) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/chat/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findOneAndUpdate({ roomId: req.params.id }, req.body, { new: true });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add member
app.post('/api/chat/rooms/:id/members', async (req, res) => {
  try {
    const { userId, name, role = 'member' } = req.body;
    const room = await Room.findOneAndUpdate({ roomId: req.params.id }, { $push: { members: { userId, name, role } } }, { new: true });
    // System message
    await new Message({
      roomId: req.params.id,
      sender: { userId: 'system', name: 'النظام' },
      type: 'system',
      text: `${name} joined the room`,
    }).save();
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove member
app.delete('/api/chat/rooms/:id/members/:userId', async (req, res) => {
  try {
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.id },
      { $pull: { members: { userId: req.params.userId } } },
      { new: true },
    );
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Archive room
app.put('/api/chat/rooms/:id/archive', async (req, res) => {
  try {
    const room = await Room.findOneAndUpdate({ roomId: req.params.id }, { isArchived: true }, { new: true });
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ MESSAGE ENDPOINTS (REST fallback) ══════════════ */

app.get('/api/chat/rooms/:id/messages', async (req, res) => {
  try {
    const { page = 1, limit = 50, before } = req.query;
    const filter = { roomId: req.params.id, isDeleted: false };
    if (before) filter.sentAt = { $lt: new Date(before) };
    const messages = await Message.find(filter)
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Message.countDocuments(filter);
    res.json({ success: true, data: messages.reverse(), pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chat/rooms/:id/messages', async (req, res) => {
  try {
    const msg = await new Message({ ...req.body, roomId: req.params.id }).save();
    await Room.findOneAndUpdate(
      { roomId: req.params.id },
      {
        lastMessage: { messageId: msg.messageId, text: msg.text, sender: msg.sender?.name, sentAt: msg.sentAt },
        $inc: { messageCount: 1 },
      },
    );
    broadcastToRoom(req.params.id, { type: 'new-message', data: msg });
    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Edit message
app.put('/api/chat/messages/:id', async (req, res) => {
  try {
    const msg = await Message.findOneAndUpdate(
      { messageId: req.params.id },
      { text: req.body.text, isEdited: true, editedAt: new Date() },
      { new: true },
    );
    if (msg) broadcastToRoom(msg.roomId, { type: 'message-edited', data: msg });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete message (soft)
app.delete('/api/chat/messages/:id', async (req, res) => {
  try {
    const msg = await Message.findOneAndUpdate(
      { messageId: req.params.id },
      { isDeleted: true, deletedAt: new Date(), text: '[deleted]' },
      { new: true },
    );
    if (msg) broadcastToRoom(msg.roomId, { type: 'message-deleted', data: { messageId: req.params.id } });
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pin message
app.post('/api/chat/messages/:id/pin', async (req, res) => {
  try {
    const msg = await Message.findOneAndUpdate({ messageId: req.params.id }, { isPinned: true }, { new: true });
    if (msg) {
      await Room.findOneAndUpdate({ roomId: msg.roomId }, { $addToSet: { pinnedMessages: msg.messageId } });
    }
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reactions
app.post('/api/chat/messages/:id/react', async (req, res) => {
  try {
    const { emoji, userId, name } = req.body;
    const msg = await Message.findOne({ messageId: req.params.id });
    if (!msg) return res.status(404).json({ success: false, error: 'Not found' });
    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      const already = existing.users.find(u => u.userId === userId);
      if (already) existing.users = existing.users.filter(u => u.userId !== userId);
      else existing.users.push({ userId, name });
    } else {
      msg.reactions.push({ emoji, users: [{ userId, name }] });
    }
    await msg.save();
    broadcastToRoom(msg.roomId, { type: 'reaction', data: { messageId: msg.messageId, reactions: msg.reactions } });
    res.json({ success: true, data: msg.reactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search messages
app.get('/api/chat/search', async (req, res) => {
  try {
    const { q, roomId, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: false };
    if (roomId) filter.roomId = roomId;
    if (q) filter.text = { $regex: q, $options: 'i' };
    const messages = await Message.find(filter)
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Message.countDocuments(filter);
    res.json({ success: true, data: messages, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ PRESENCE ══════════════ */

app.get('/api/chat/presence', async (req, res) => {
  try {
    const { userIds } = req.query;
    const filter = {};
    if (userIds) filter.userId = { $in: userIds.split(',') };
    const presences = await Presence.find(filter);
    res.json({ success: true, data: presences });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/chat/presence/:userId', async (req, res) => {
  try {
    const presence = await Presence.findOneAndUpdate(
      { userId: req.params.userId },
      { ...req.body, lastSeen: new Date() },
      { upsert: true, new: true },
    );
    broadcastToRoom(null, { type: 'presence', userId: req.params.userId, status: presence.status });
    res.json({ success: true, data: presence });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ UNREAD COUNT ══════════════ */

app.get('/api/chat/unread/:userId', async (req, res) => {
  try {
    const rooms = await Room.find({ 'members.userId': req.params.userId });
    const unread = [];
    for (const room of rooms) {
      const member = room.members.find(m => m.userId === req.params.userId);
      const lastRead = member?.lastReadAt || new Date(0);
      const count = await Message.countDocuments({
        roomId: room.roomId,
        sentAt: { $gt: lastRead },
        'sender.userId': { $ne: req.params.userId },
        isDeleted: false,
      });
      if (count > 0) unread.push({ roomId: room.roomId, name: room.name, unreadCount: count });
    }
    const total = unread.reduce((s, u) => s + u.unreadCount, 0);
    res.json({ success: true, data: { rooms: unread, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════ DASHBOARD ══════════════ */

app.get('/api/chat/dashboard/overview', async (req, res) => {
  try {
    const cacheKey = 'chat:dashboard';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [totalRooms, totalMessages, onlineUsers, roomsByType, todayMessages, activeRooms] = await Promise.all([
      Room.countDocuments({ isArchived: false }),
      Message.countDocuments({ isDeleted: false }),
      Presence.countDocuments({ status: { $in: ['online', 'away', 'busy'] } }),
      Room.aggregate([{ $match: { isArchived: false } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      Message.countDocuments({ sentAt: { $gte: dayjs().startOf('day').toDate() } }),
      Room.find({ isArchived: false }).sort({ 'lastMessage.sentAt': -1 }).limit(10).lean(),
    ]);

    const dashboard = {
      totalRooms,
      totalMessages,
      todayMessages,
      onlineUsers,
      roomsByType: roomsByType.reduce((a, r) => ({ ...a, [r._id]: r.count }), {}),
      activeRooms,
      wsConnections: clients.size,
      generatedAt: new Date().toISOString(),
    };
    await redis.setex(cacheKey, 30, JSON.stringify(dashboard));
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Cron Jobs ───────────────────────────────────────── */

// Mark away users (idle >10 min) every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const cutoff = dayjs().subtract(10, 'minute').toDate();
    await Presence.updateMany({ status: 'online', lastSeen: { $lt: cutoff } }, { status: 'away' });
  } catch (e) {
    console.error('[Cron] presence update failed', e.message);
  }
});

// Cleanup old messages yearly
cron.schedule('0 2 1 1 *', async () => {
  await chatQueue.add('cleanup-old', { action: 'cleanup-old-messages', data: {} });
});

/* ── Seed Data ───────────────────────────────────────── */
async function seedDefaults() {
  const count = await Room.countDocuments();
  if (count > 0) return;

  const rooms = [
    { name: 'General', nameAr: 'عام', type: 'channel', description: 'General discussion for all staff', isPrivate: false },
    { name: 'Announcements', nameAr: 'الإعلانات', type: 'announcement', description: 'Official announcements', isPrivate: false },
    { name: 'Teachers Lounge', nameAr: 'غرفة المعلمين', type: 'group', description: 'Teachers discussion room', isPrivate: true },
    { name: 'IT Support', nameAr: 'الدعم الفني', type: 'support', description: 'Technical support channel', isPrivate: false },
    { name: 'Management', nameAr: 'الإدارة', type: 'group', description: 'Management team', isPrivate: true },
  ];

  for (const r of rooms) {
    await new Room({
      ...r,
      createdBy: { userId: 'USR-001', name: 'أحمد المدير' },
      members: [
        { userId: 'USR-001', name: 'أحمد المدير', role: 'owner' },
        { userId: 'USR-002', name: 'فاطمة المنسقة', role: 'admin' },
      ],
    }).save();
  }
  console.log('[Seed] Default chat rooms created');
}

/* ── Start ───────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_chat');
    await seedDefaults();
    server.listen(PORT, () => console.log(`🚀 Chat & Messaging Service running on port ${PORT} (WS: /ws)`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
