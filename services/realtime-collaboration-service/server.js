/**
 * Real-time Collaboration Service — Al-Awael ERP
 * Port: 3430
 *
 * WebSocket gateway for all real-time features: presence tracking,
 * chat rooms, live notifications push, shared document editing,
 * live cursors, typing indicators, activity feed, online status.
 * Uses Redis Pub/Sub for horizontal scaling across nodes.
 */

'use strict';

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
const sub = redis.duplicate();
const pub = redis.duplicate();

const JWT_SECRET = process.env.JWT_SECRET || 'realtime-secret-change-me';

/* ───────── Connection registry ───────── */

/** @type {Map<string, Set<WebSocket>>} userId → sockets */
const userConnections = new Map();
/** @type {Map<string, Set<string>>} roomId → set of userIds */
const rooms = new Map();
/** @type {Map<WebSocket, {userId: string, name: string, rooms: Set<string>}>} */
const socketMeta = new Map();

/* ───────── Mongoose schemas ───────── */

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: String,
    senderAvatar: String,
    type: { type: String, enum: ['text', 'image', 'file', 'audio', 'video', 'system', 'emoji'], default: 'text' },
    content: { type: String, required: true },
    contentAr: String,
    replyTo: String, // messageId
    attachments: [{ name: String, url: String, type: String, size: Number }],
    mentions: [String], // userIds
    reactions: [{ emoji: String, userId: String }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    readBy: [{ userId: String, readAt: Date }],
  },
  { timestamps: true },
);

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

const chatRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true, default: () => uuidv4() },
    name: String,
    nameAr: String,
    type: { type: String, enum: ['direct', 'group', 'channel', 'class', 'department', 'support'], required: true },
    members: [{ userId: String, role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' }, joinedAt: Date }],
    avatar: String,
    description: String,
    isArchived: { type: Boolean, default: false },
    lastMessage: { content: String, senderId: String, timestamp: Date },
    metadata: mongoose.Schema.Types.Mixed,
    createdBy: String,
  },
  { timestamps: true },
);

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'task', 'message', 'approval', 'reminder', 'system'],
      required: true,
    },
    title: String,
    titleAr: String,
    body: { type: String, required: true },
    bodyAr: String,
    action: { type: String }, // deep-link URL
    entityType: String,
    entityId: String,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    source: String, // service that sent it
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  },
  { timestamps: true },
);

const Notification = mongoose.model('RealtimeNotification', notificationSchema);

/* ───────── WebSocket handlers ───────── */

wss.on('connection', (ws, req) => {
  // Parse token from query string
  const url = new URL(req.url, `http://localhost`);
  const token = url.searchParams.get('token');
  let user;

  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    ws.close(4001, 'Invalid token');
    return;
  }

  const userId = user.id || user.sub;
  const userName = user.name || 'User';

  // Register connection
  if (!userConnections.has(userId)) userConnections.set(userId, new Set());
  userConnections.get(userId).add(ws);
  socketMeta.set(ws, { userId, name: userName, rooms: new Set() });

  // Set online presence in Redis
  redis.hset('presence', userId, JSON.stringify({ status: 'online', name: userName, lastSeen: new Date().toISOString() }));
  pub.publish('presence:update', JSON.stringify({ userId, status: 'online', name: userName }));

  // Welcome message
  ws.send(JSON.stringify({ type: 'connected', userId, timestamp: new Date().toISOString() }));

  ws.on('message', async raw => {
    try {
      const msg = JSON.parse(raw);
      await handleMessage(ws, userId, userName, msg);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  });

  ws.on('close', () => {
    const meta = socketMeta.get(ws);
    if (meta) {
      // Leave all rooms
      for (const roomId of meta.rooms) {
        const room = rooms.get(roomId);
        if (room) {
          room.delete(userId);
          broadcastToRoom(roomId, { type: 'user-left', roomId, userId, name: userName }, userId);
        }
      }
      socketMeta.delete(ws);
    }

    const conns = userConnections.get(userId);
    if (conns) {
      conns.delete(ws);
      if (conns.size === 0) {
        userConnections.delete(userId);
        redis.hset('presence', userId, JSON.stringify({ status: 'offline', name: userName, lastSeen: new Date().toISOString() }));
        pub.publish('presence:update', JSON.stringify({ userId, status: 'offline', name: userName }));
      }
    }
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.isAlive = true;
});

async function handleMessage(ws, userId, userName, msg) {
  switch (msg.type) {
    case 'join-room': {
      const { roomId } = msg;
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(userId);
      socketMeta.get(ws).rooms.add(roomId);
      broadcastToRoom(roomId, { type: 'user-joined', roomId, userId, name: userName }, userId);
      // Send members list
      const members = [...(rooms.get(roomId) || [])];
      ws.send(JSON.stringify({ type: 'room-members', roomId, members }));
      break;
    }

    case 'leave-room': {
      const { roomId } = msg;
      rooms.get(roomId)?.delete(userId);
      socketMeta.get(ws)?.rooms.delete(roomId);
      broadcastToRoom(roomId, { type: 'user-left', roomId, userId, name: userName }, userId);
      break;
    }

    case 'chat': {
      const { roomId, content, replyTo, attachments, mentions } = msg;
      const saved = await ChatMessage.create({
        roomId,
        senderId: userId,
        senderName: userName,
        content,
        replyTo,
        attachments,
        mentions,
      });

      // Update room last message
      await ChatRoom.findOneAndUpdate({ roomId }, { lastMessage: { content, senderId: userId, timestamp: new Date() } });

      const payload = {
        type: 'chat',
        roomId,
        messageId: saved._id.toString(),
        senderId: userId,
        senderName: userName,
        content,
        replyTo,
        attachments,
        mentions,
        timestamp: saved.createdAt,
      };

      // Broadcast locally and via Redis for cross-node
      broadcastToRoom(roomId, payload, null);
      pub.publish(`chat:${roomId}`, JSON.stringify(payload));
      break;
    }

    case 'typing': {
      const { roomId, isTyping } = msg;
      broadcastToRoom(roomId, { type: 'typing', roomId, userId, name: userName, isTyping }, userId);
      break;
    }

    case 'cursor': {
      // Live cursor position for shared editing
      const { documentId, position } = msg;
      broadcastToRoom(`doc:${documentId}`, { type: 'cursor', documentId, userId, name: userName, position }, userId);
      break;
    }

    case 'edit': {
      // OT-style shared editing operation
      const { documentId, operation } = msg;
      broadcastToRoom(`doc:${documentId}`, { type: 'edit', documentId, userId, operation, timestamp: Date.now() }, userId);
      pub.publish(`doc:${documentId}`, JSON.stringify({ type: 'edit', documentId, userId, operation }));
      break;
    }

    case 'reaction': {
      const { messageId, emoji } = msg;
      await ChatMessage.findByIdAndUpdate(messageId, { $addToSet: { reactions: { emoji, userId } } });
      const chatMsg = await ChatMessage.findById(messageId);
      if (chatMsg) broadcastToRoom(chatMsg.roomId, { type: 'reaction', messageId, emoji, userId, name: userName }, null);
      break;
    }

    case 'read-receipt': {
      const { messageId } = msg;
      await ChatMessage.findByIdAndUpdate(messageId, { $addToSet: { readBy: { userId, readAt: new Date() } } });
      break;
    }

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'get-presence': {
      const { userIds } = msg;
      const result = {};
      for (const uid of userIds || []) {
        const data = await redis.hget('presence', uid);
        result[uid] = data ? JSON.parse(data) : { status: 'offline' };
      }
      ws.send(JSON.stringify({ type: 'presence-list', data: result }));
      break;
    }
  }
}

function broadcastToRoom(roomId, payload, excludeUserId) {
  const members = rooms.get(roomId);
  if (!members) return;
  const data = JSON.stringify(payload);
  for (const memberId of members) {
    if (memberId === excludeUserId) continue;
    const conns = userConnections.get(memberId);
    if (conns) {
      for (const ws of conns) {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      }
    }
  }
}

function sendToUser(userId, payload) {
  const conns = userConnections.get(userId);
  if (!conns) return false;
  const data = JSON.stringify(payload);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
  return true;
}

/* ───────── Redis Pub/Sub for cross-node messaging ───────── */

sub.subscribe('presence:update', 'notification:push', 'broadcast:all');

sub.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);
    if (channel === 'presence:update') {
      // Broadcast presence to all connected clients
      const payload = JSON.stringify({ type: 'presence', ...data });
      for (const [, conns] of userConnections) {
        for (const ws of conns) {
          if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        }
      }
    }
    if (channel === 'notification:push') {
      sendToUser(data.userId, { type: 'notification', data });
    }
    if (channel === 'broadcast:all') {
      const payload = JSON.stringify({ type: 'broadcast', data });
      for (const [, conns] of userConnections) {
        for (const ws of conns) {
          if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        }
      }
    }
  } catch {
    /* ignore parse errors */
  }
});

/* ───────── Heartbeat ───────── */
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

/* ───────── REST API ───────── */
const r = express.Router();

// Chat rooms
r.get('/rooms', async (req, res) => {
  try {
    const { userId, type } = req.query;
    const q = {};
    if (userId) q['members.userId'] = userId;
    if (type) q.type = type;
    q.isArchived = false;
    const chatRooms = await ChatRoom.find(q).sort({ 'lastMessage.timestamp': -1 });
    res.json({ success: true, data: chatRooms });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/rooms', async (req, res) => {
  try {
    const room = await ChatRoom.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { before, limit = 50 } = req.query;
    const q = { roomId: req.params.roomId, isDeleted: false };
    if (before) q.createdAt = { $lt: new Date(before) };
    const messages = await ChatMessage.find(q).sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ success: true, data: messages.reverse() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Notifications (REST management)
r.get('/notifications/:userId', async (req, res) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    const q = { userId: req.params.userId };
    if (unreadOnly === 'true') q.isRead = false;
    const notifs = await Notification.find(q).sort({ createdAt: -1 }).limit(Number(limit));
    const unreadCount = await Notification.countDocuments({ userId: req.params.userId, isRead: false });
    res.json({ success: true, data: notifs, unreadCount });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/notifications', async (req, res) => {
  try {
    const notif = await Notification.create(req.body);
    // Push via WebSocket
    const delivered = sendToUser(notif.userId, { type: 'notification', data: notif });
    // Also via Redis for cross-node
    if (!delivered) {
      await pub.publish('notification:push', JSON.stringify(notif));
    }
    res.status(201).json({ success: true, data: notif, delivered });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/notifications/:userId/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Broadcast notification to all
r.post('/broadcast', async (req, res) => {
  try {
    await pub.publish('broadcast:all', JSON.stringify(req.body));
    res.json({ success: true, message: 'Broadcast sent' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Presence
r.get('/presence', async (_req, res) => {
  try {
    const all = await redis.hgetall('presence');
    const result = {};
    for (const [uid, data] of Object.entries(all)) {
      result[uid] = JSON.parse(data);
    }
    res.json({ success: true, data: result, onlineCount: Object.values(result).filter(p => p.status === 'online').length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Stats
r.get('/stats', async (_req, res) => {
  try {
    const connected = wss.clients.size;
    const uniqueUsers = userConnections.size;
    const activeRooms = rooms.size;
    const totalMessages = await ChatMessage.countDocuments();
    const todayMessages = await ChatMessage.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } });

    res.json({
      success: true,
      data: { connected, uniqueUsers, activeRooms, totalMessages, todayMessages },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'healthy' : 'degraded',
    mongo: mongoOk,
    redis: redisOk,
    wsClients: wss.clients.size,
    uptime: process.uptime(),
  });
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3430;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_realtime';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[RealtimeCollab] MongoDB connected');
    server.listen(PORT, '0.0.0.0', () => console.log(`[RealtimeCollab] listening on ${PORT} (HTTP + WS)`));
  })
  .catch(err => {
    console.error('[RealtimeCollab] Mongo error', err);
    process.exit(1);
  });
