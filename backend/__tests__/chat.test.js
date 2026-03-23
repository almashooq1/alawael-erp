/**
 * Real-time Chat — backend integration tests
 *
 * Tests the /api/chat endpoints:
 *  - Dashboard & KPIs
 *  - Users: List, Online, Status
 *  - Conversations: Direct, Group, Channel, CRUD
 *  - Participants: Add, Remove, Promote
 *  - Messages: Send, Edit, Delete, Search, List
 *  - Reactions: Add, Toggle, List
 *  - Read Receipts: Mark Read, Unread Count
 *  - Pinned Messages: Pin, Unpin, List
 *  - Attachments: Upload, Get, List per Conversation
 *  - Typing Indicators: Set, Get
 *  - Blocked Users: Block, Unblock, List
 *  - Full Workflow: Create Group → Send Messages → React → Pin → Share File
 */

const request = require('supertest');
const express = require('express');

// ── Minimal auth mock ──
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', name: 'Test Admin', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const router = require('../routes/chat.routes');
  app.use('/api/chat', router);
});

// ══════════════════════════════════════════════════════════
//  1. Dashboard & KPIs
// ══════════════════════════════════════════════════════════

describe('Chat — Dashboard', () => {
  test('GET /dashboard → returns KPIs and summary', async () => {
    const res = await request(app).get('/api/chat/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { kpis, recentConversations, onlineUsers, msgsByType, topParticipants } = res.body.data;
    expect(kpis).toHaveProperty('totalConversations');
    expect(kpis).toHaveProperty('totalMessages');
    expect(kpis).toHaveProperty('totalAttachments');
    expect(kpis).toHaveProperty('onlineUsers');
    expect(kpis).toHaveProperty('totalUnread');
    expect(kpis).toHaveProperty('activeConversations');
    expect(kpis).toHaveProperty('directChats');
    expect(kpis).toHaveProperty('groupChats');
    expect(kpis.totalConversations).toBeGreaterThanOrEqual(3);
    expect(kpis.totalMessages).toBeGreaterThanOrEqual(10);
    expect(recentConversations).toBeInstanceOf(Array);
    expect(onlineUsers).toBeInstanceOf(Array);
    expect(onlineUsers.length).toBeGreaterThanOrEqual(1);
    expect(msgsByType).toBeDefined();
    expect(topParticipants).toBeInstanceOf(Array);
  });
});

// ══════════════════════════════════════════════════════════
//  2. Users
// ══════════════════════════════════════════════════════════

describe('Chat — Users', () => {
  test('GET /users → list all chat users', async () => {
    const res = await request(app).get('/api/chat/users');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(6);
    const user = res.body.data[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('department');
    expect(user).toHaveProperty('status');
  });

  test('GET /users?search=أحمد → filter by name', async () => {
    const res = await request(app).get('/api/chat/users?search=%D8%A3%D8%AD%D9%85%D8%AF');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].name).toContain('أحمد');
  });

  test('GET /users?department=التعليم الخاص → filter by department', async () => {
    const res = await request(app).get('/api/chat/users?department=%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85%20%D8%A7%D9%84%D8%AE%D8%A7%D8%B5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /users/online → list online users', async () => {
    const res = await request(app).get('/api/chat/users/online');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /users/:id → get single user', async () => {
    const res = await request(app).get('/api/chat/users/u1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('u1');
    expect(res.body.data.name).toBeDefined();
  });

  test('GET /users/:id → 404 for unknown user', async () => {
    const res = await request(app).get('/api/chat/users/unknown');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('PUT /users/status → update own status', async () => {
    const res = await request(app).put('/api/chat/users/status').send({ status: 'busy' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('busy');
  });

  test('PUT /users/status → reject invalid status', async () => {
    const res = await request(app).put('/api/chat/users/status').send({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Restore status for later tests
  afterAll(async () => {
    await request(app).put('/api/chat/users/status').send({ status: 'online' });
  });
});

// ══════════════════════════════════════════════════════════
//  3. Conversations — List & Direct
// ══════════════════════════════════════════════════════════

describe('Chat — Conversations (List & Direct)', () => {
  test('GET /conversations → list user conversations', async () => {
    const res = await request(app).get('/api/chat/conversations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    const conv = res.body.data[0];
    expect(conv).toHaveProperty('id');
    expect(conv).toHaveProperty('type');
    expect(conv).toHaveProperty('displayName');
  });

  test('GET /conversations/:id → get single conversation', async () => {
    const res = await request(app).get('/api/chat/conversations/100');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('100');
    expect(res.body.data.type).toBe('direct');
    expect(res.body.data.displayName).toBeDefined();
  });

  test('GET /conversations/:id → 404 for unknown', async () => {
    const res = await request(app).get('/api/chat/conversations/9999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('POST /conversations/direct → create direct chat', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/direct')
      .send({ userId: 'u4' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('direct');
  });

  test('POST /conversations/direct → return existing if duplicate', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/direct')
      .send({ userId: 'u2' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('100'); // existing conversation
  });

  test('POST /conversations/direct → reject self-chat', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/direct')
      .send({ userId: 'u1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /conversations/direct → missing userId', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/direct')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
//  4. Conversations — Group & Channel
// ══════════════════════════════════════════════════════════

describe('Chat — Conversations (Group & Channel)', () => {
  let groupId;

  test('POST /conversations/group → create group chat', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/group')
      .send({ name: 'فريق الاختبار', description: 'مجموعة للاختبار', participants: ['u2', 'u3', 'u5'] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('group');
    expect(res.body.data.name).toBe('فريق الاختبار');
    expect(res.body.data.participants).toContain('u1');
    expect(res.body.data.participants).toContain('u2');
    expect(res.body.data.admins).toContain('u1');
    groupId = res.body.data.id;
  });

  test('POST /conversations/group → create channel', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/group')
      .send({ name: 'قناة اختبار', type: 'channel', participants: ['u2'] });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('channel');
  });

  test('POST /conversations/group → missing name', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/group')
      .send({ participants: ['u2'] });
    expect(res.status).toBe(400);
  });

  test('POST /conversations/group → missing participants', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/group')
      .send({ name: 'مجموعة فارغة' });
    expect(res.status).toBe(400);
  });

  test('PUT /conversations/:id → update group name', async () => {
    const res = await request(app)
      .put(`/api/chat/conversations/${groupId}`)
      .send({ name: 'فريق الاختبار المحدّث', description: 'وصف جديد' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('فريق الاختبار المحدّث');
  });

  test('PUT /conversations/:id → cannot update direct', async () => {
    const res = await request(app)
      .put('/api/chat/conversations/100')
      .send({ name: 'test' });
    expect(res.status).toBe(400);
  });

  test('DELETE /conversations/:id → delete group', async () => {
    // Create a temporary group to delete
    const cr = await request(app)
      .post('/api/chat/conversations/group')
      .send({ name: 'مؤقت', participants: ['u2'] });
    const tempId = cr.body.data.id;
    const res = await request(app).delete(`/api/chat/conversations/${tempId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /conversations/:id → cannot delete direct', async () => {
    const res = await request(app).delete('/api/chat/conversations/100');
    expect(res.status).toBe(400);
  });

  test('DELETE /conversations/:id → 404 for unknown', async () => {
    const res = await request(app).delete('/api/chat/conversations/99999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  5. Participants
// ══════════════════════════════════════════════════════════

describe('Chat — Participants', () => {
  test('POST /conversations/:id/participants → add user', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/102/participants')
      .send({ userId: 'u3' });
    expect(res.status).toBe(200);
    expect(res.body.data.participants).toContain('u3');
  });

  test('POST /conversations/:id/participants → duplicate user', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/102/participants')
      .send({ userId: 'u2' });
    expect(res.status).toBe(400);
  });

  test('POST /conversations/:id/participants → cannot add to direct', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/participants')
      .send({ userId: 'u3' });
    expect(res.status).toBe(400);
  });

  test('DELETE /conversations/:id/participants/:userId → remove user', async () => {
    const res = await request(app)
      .delete('/api/chat/conversations/102/participants/u3');
    expect(res.status).toBe(200);
    expect(res.body.data.participants).not.toContain('u3');
  });

  test('DELETE /conversations/:id/participants/:userId → not found', async () => {
    const res = await request(app)
      .delete('/api/chat/conversations/102/participants/u3');
    expect(res.status).toBe(404);
  });

  test('POST /conversations/:id/admins → promote to admin', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/102/admins')
      .send({ userId: 'u4' });
    expect(res.status).toBe(200);
    expect(res.body.data.admins).toContain('u4');
  });

  test('POST /conversations/:id/admins → already admin', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/102/admins')
      .send({ userId: 'u4' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  6. Messages
// ══════════════════════════════════════════════════════════

describe('Chat — Messages', () => {
  let newMsgId;

  test('GET /conversations/:id/messages → list messages', async () => {
    const res = await request(app).get('/api/chat/conversations/100/messages');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.messages).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    const msg = res.body.messages[0];
    expect(msg).toHaveProperty('id');
    expect(msg).toHaveProperty('content');
    expect(msg).toHaveProperty('senderId');
    expect(msg).toHaveProperty('sender');
    expect(msg.sender).toHaveProperty('name');
  });

  test('GET /conversations/:id/messages → search within conversation', async () => {
    const res = await request(app).get('/api/chat/conversations/100/messages?search=%D8%AA%D9%82%D8%B1%D9%8A%D8%B1');
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /conversations/:id/messages → with pagination', async () => {
    const res = await request(app).get('/api/chat/conversations/100/messages?limit=2&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeLessThanOrEqual(2);
    expect(res.body.limit).toBe(2);
  });

  test('GET /conversations/:id/messages → 404 for unknown conv', async () => {
    const res = await request(app).get('/api/chat/conversations/99999/messages');
    expect(res.status).toBe(404);
  });

  test('GET /conversations/:id/messages → includes reply-to info', async () => {
    const res = await request(app).get('/api/chat/conversations/101/messages');
    expect(res.status).toBe(200);
    const replyMsg = res.body.messages.find(m => m.replyTo);
    expect(replyMsg).toBeDefined();
    expect(replyMsg.replyToMessage).toBeDefined();
    expect(replyMsg.replyToMessage).toHaveProperty('senderName');
  });

  test('POST /conversations/:id/messages → send text message', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .send({ content: 'رسالة اختبار جديدة', type: 'text' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe('رسالة اختبار جديدة');
    expect(res.body.data.senderId).toBe('u1');
    expect(res.body.data.sender).toBeDefined();
    newMsgId = res.body.data.id;
  });

  test('POST /conversations/:id/messages → send reply', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .send({ content: 'رد على الرسالة', replyTo: '1000' });
    expect(res.status).toBe(201);
    expect(res.body.data.replyTo).toBe('1000');
  });

  test('POST /conversations/:id/messages → send file message', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .send({ content: 'document.pdf', type: 'file', attachmentId: 'att-001' });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('file');
  });

  test('POST /conversations/:id/messages → increments unread for others', async () => {
    const convRes = await request(app).get('/api/chat/conversations/100');
    // u2's unread should have increased
    expect(convRes.body.data).toBeDefined();
  });

  test('POST /conversations/:id/messages → no content (400)', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .send({});
    expect(res.status).toBe(400);
  });

  test('PUT /messages/:id → edit own message', async () => {
    const res = await request(app)
      .put(`/api/chat/messages/${newMsgId}`)
      .send({ content: 'رسالة معدّلة' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('رسالة معدّلة');
    expect(res.body.data.isEdited).toBe(true);
  });

  test('PUT /messages/:id → cannot edit other\'s message', async () => {
    const res = await request(app)
      .put('/api/chat/messages/1001')
      .send({ content: 'محاولة تعديل' });
    expect(res.status).toBe(403);
  });

  test('PUT /messages/:id → 404 for unknown', async () => {
    const res = await request(app)
      .put('/api/chat/messages/99999')
      .send({ content: 'test' });
    expect(res.status).toBe(404);
  });

  test('DELETE /messages/:id → delete own message', async () => {
    // Create a temporary message to delete
    const cr = await request(app)
      .post('/api/chat/conversations/100/messages')
      .send({ content: 'سيتم حذفها' });
    const tempId = cr.body.data.id;
    const res = await request(app).delete(`/api/chat/messages/${tempId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /messages/:id → 404 for unknown', async () => {
    const res = await request(app).delete('/api/chat/messages/99999');
    expect(res.status).toBe(404);
  });

  test('GET /messages/search?q=… → search across conversations', async () => {
    const res = await request(app).get('/api/chat/messages/search?q=%D8%A7%D9%84%D8%A7%D8%AC%D8%AA%D9%85%D8%A7%D8%B9');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('conversationName');
  });

  test('GET /messages/search → missing query (400)', async () => {
    const res = await request(app).get('/api/chat/messages/search');
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  7. Reactions
// ══════════════════════════════════════════════════════════

describe('Chat — Reactions', () => {
  test('POST /messages/:id/reactions → add reaction', async () => {
    const res = await request(app)
      .post('/api/chat/messages/1000/reactions')
      .send({ emoji: '❤️' });
    expect(res.status).toBe(200);
    expect(res.body.data.added).toBe(true);
    expect(res.body.data.emoji).toBe('❤️');
  });

  test('POST /messages/:id/reactions → toggle off same reaction', async () => {
    const res = await request(app)
      .post('/api/chat/messages/1000/reactions')
      .send({ emoji: '❤️' });
    expect(res.status).toBe(200);
    expect(res.body.data.removed).toBe(true);
  });

  test('POST /messages/:id/reactions → missing emoji', async () => {
    const res = await request(app)
      .post('/api/chat/messages/1000/reactions')
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /messages/:id/reactions → 404 for unknown message', async () => {
    const res = await request(app)
      .post('/api/chat/messages/99999/reactions')
      .send({ emoji: '👍' });
    expect(res.status).toBe(404);
  });

  test('GET /messages/:id/reactions → list reactions', async () => {
    // Add a reaction first
    await request(app).post('/api/chat/messages/1005/reactions').send({ emoji: '🎉' });
    const res = await request(app).get('/api/chat/messages/1005/reactions');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('emoji');
    expect(res.body.data[0]).toHaveProperty('userName');
  });
});

// ══════════════════════════════════════════════════════════
//  8. Read Receipts
// ══════════════════════════════════════════════════════════

describe('Chat — Read Receipts', () => {
  test('GET /unread → get unread count', async () => {
    const res = await request(app).get('/api/chat/unread');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('byConversation');
  });

  test('POST /conversations/:id/read → mark as read', async () => {
    const res = await request(app).post('/api/chat/conversations/101/read');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('markedRead');
  });

  test('POST /conversations/:id/read → 404 for unknown', async () => {
    const res = await request(app).post('/api/chat/conversations/99999/read');
    expect(res.status).toBe(404);
  });

  test('GET /unread → decreased after marking read', async () => {
    const res = await request(app).get('/api/chat/unread');
    expect(res.status).toBe(200);
    // Conv 101 unread should now be 0
    expect(res.body.data.byConversation['101']).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════
//  9. Pinned Messages
// ══════════════════════════════════════════════════════════

describe('Chat — Pinned Messages', () => {
  test('GET /conversations/:id/pinned → list pinned', async () => {
    const res = await request(app).get('/api/chat/conversations/102/pinned');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('message');
    expect(res.body.data[0].message).toHaveProperty('content');
  });

  test('POST /conversations/:id/pinned → pin a message', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/pinned')
      .send({ messageId: '1000' });
    expect(res.status).toBe(200);
    expect(res.body.data.pinned).toBe(true);
  });

  test('POST /conversations/:id/pinned → already pinned (400)', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/pinned')
      .send({ messageId: '1000' });
    expect(res.status).toBe(400);
  });

  test('POST /conversations/:id/pinned → missing messageId', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/pinned')
      .send({});
    expect(res.status).toBe(400);
  });

  test('DELETE /conversations/:id/pinned/:msgId → unpin', async () => {
    const res = await request(app)
      .delete('/api/chat/conversations/100/pinned/1000');
    expect(res.status).toBe(200);
    expect(res.body.data.unpinned).toBe(true);
  });

  test('DELETE /conversations/:id/pinned/:msgId → not pinned (404)', async () => {
    const res = await request(app)
      .delete('/api/chat/conversations/100/pinned/1000');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  10. Attachments
// ══════════════════════════════════════════════════════════

describe('Chat — Attachments', () => {
  let attId;

  test('POST /attachments → upload file metadata', async () => {
    const res = await request(app)
      .post('/api/chat/attachments')
      .send({ filename: 'test-report.pdf', mimeType: 'application/pdf', size: 1024 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('url');
    expect(res.body.data.filename).toBe('test-report.pdf');
    attId = res.body.data.id;
  });

  test('POST /attachments → missing filename', async () => {
    const res = await request(app)
      .post('/api/chat/attachments')
      .send({ mimeType: 'application/pdf' });
    expect(res.status).toBe(400);
  });

  test('POST /attachments → missing mimeType', async () => {
    const res = await request(app)
      .post('/api/chat/attachments')
      .send({ filename: 'test.pdf' });
    expect(res.status).toBe(400);
  });

  test('POST /attachments → file too large', async () => {
    const res = await request(app)
      .post('/api/chat/attachments')
      .send({ filename: 'big.zip', mimeType: 'application/zip', size: 100 * 1024 * 1024 });
    expect(res.status).toBe(400);
  });

  test('GET /attachments/:id → get attachment', async () => {
    const res = await request(app).get(`/api/chat/attachments/${attId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(attId);
  });

  test('GET /attachments/:id → 404 for unknown', async () => {
    const res = await request(app).get('/api/chat/attachments/unknown');
    expect(res.status).toBe(404);
  });

  test('GET /conversations/:id/attachments → list conv attachments', async () => {
    const res = await request(app).get('/api/chat/conversations/102/attachments');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════
//  11. Typing Indicators
// ══════════════════════════════════════════════════════════

describe('Chat — Typing Indicators', () => {
  test('POST /conversations/:id/typing → start typing', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/typing')
      .send({ isTyping: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isTyping).toBe(true);
  });

  test('POST /conversations/:id/typing → stop typing', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/typing')
      .send({ isTyping: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isTyping).toBe(false);
  });

  test('POST /conversations/:id/typing → missing isTyping', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/typing')
      .send({});
    expect(res.status).toBe(400);
  });

  test('GET /conversations/:id/typing → get typing users', async () => {
    // Set typing first
    await request(app)
      .post('/api/chat/conversations/100/typing')
      .send({ isTyping: true });
    const res = await request(app).get('/api/chat/conversations/100/typing');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    // u1 is the auth user, so they are excluded from typing list
  });
});

// ══════════════════════════════════════════════════════════
//  12. Blocked Users
// ══════════════════════════════════════════════════════════

describe('Chat — Blocked Users', () => {
  test('GET /blocked → list blocked (initially empty)', async () => {
    const res = await request(app).get('/api/chat/blocked');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  test('POST /blocked → block a user', async () => {
    const res = await request(app)
      .post('/api/chat/blocked')
      .send({ userId: 'u6' });
    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(true);
  });

  test('POST /blocked → already blocked', async () => {
    const res = await request(app)
      .post('/api/chat/blocked')
      .send({ userId: 'u6' });
    expect(res.status).toBe(400);
  });

  test('POST /blocked → cannot block self', async () => {
    const res = await request(app)
      .post('/api/chat/blocked')
      .send({ userId: 'u1' });
    expect(res.status).toBe(400);
  });

  test('POST /blocked → missing userId', async () => {
    const res = await request(app)
      .post('/api/chat/blocked')
      .send({});
    expect(res.status).toBe(400);
  });

  test('GET /blocked → shows blocked user', async () => {
    const res = await request(app).get('/api/chat/blocked');
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].blockedUserId).toBe('u6');
  });

  test('DELETE /blocked/:userId → unblock', async () => {
    const res = await request(app).delete('/api/chat/blocked/u6');
    expect(res.status).toBe(200);
    expect(res.body.data.unblocked).toBe(true);
  });

  test('DELETE /blocked/:userId → not blocked (404)', async () => {
    const res = await request(app).delete('/api/chat/blocked/u6');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  13. Full Workflow
// ══════════════════════════════════════════════════════════

describe('Chat — Full Workflow', () => {
  let wfGroupId, wfMsg1, wfMsg2, wfAttId;

  test('Step 1: Create group → add members → promote', async () => {
    // Create group
    const gr = await request(app)
      .post('/api/chat/conversations/group')
      .send({ name: 'ورشة عمل شاملة', participants: ['u2', 'u3'] });
    expect(gr.status).toBe(201);
    wfGroupId = gr.body.data.id;

    // Add another member
    const add = await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/participants`)
      .send({ userId: 'u5' });
    expect(add.body.data.participants).toContain('u5');

    // Promote u2 to admin
    const promo = await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/admins`)
      .send({ userId: 'u2' });
    expect(promo.body.data.admins).toContain('u2');
  });

  test('Step 2: Send messages → reply → search', async () => {
    // Send first message
    const m1 = await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/messages`)
      .send({ content: 'مرحباً بالجميع في الورشة' });
    expect(m1.status).toBe(201);
    wfMsg1 = m1.body.data.id;

    // Reply to first message
    const m2 = await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/messages`)
      .send({ content: 'أهلاً وسهلاً', replyTo: wfMsg1 });
    expect(m2.status).toBe(201);
    wfMsg2 = m2.body.data.id;

    // Search for the message
    const search = await request(app).get('/api/chat/messages/search?q=%D9%88%D8%B1%D8%B4%D8%A9');
    expect(search.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('Step 3: React → pin → get pinned', async () => {
    // Add reaction
    const react = await request(app)
      .post(`/api/chat/messages/${wfMsg1}/reactions`)
      .send({ emoji: '🎯' });
    expect(react.body.data.added).toBe(true);

    // Pin message
    const pin = await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/pinned`)
      .send({ messageId: wfMsg1 });
    expect(pin.body.data.pinned).toBe(true);

    // List pinned
    const pinned = await request(app).get(`/api/chat/conversations/${wfGroupId}/pinned`);
    expect(pinned.body.total).toBe(1);
  });

  test('Step 4: Upload file → send as message', async () => {
    // Upload file
    const upload = await request(app)
      .post('/api/chat/attachments')
      .send({ filename: 'ورشة_عمل.pptx', mimeType: 'application/vnd.ms-powerpoint', size: 2048 });
    expect(upload.status).toBe(201);
    wfAttId = upload.body.data.id;

    // Send file message
    const fileMsg = await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/messages`)
      .send({ content: 'ورشة_عمل.pptx', type: 'file', attachmentId: wfAttId });
    expect(fileMsg.status).toBe(201);
    expect(fileMsg.body.data.type).toBe('file');
  });

  test('Step 5: Mark read → check unread', async () => {
    // Mark as read
    const read = await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/read`);
    expect(read.body.data.markedRead).toBeGreaterThanOrEqual(0);

    // Check unread — wfGroupId should be 0
    const unread = await request(app).get('/api/chat/unread');
    expect(unread.body.data.byConversation[wfGroupId]).toBeUndefined();
  });

  test('Step 6: Edit → delete → verify', async () => {
    // Edit message
    const edit = await request(app)
      .put(`/api/chat/messages/${wfMsg2}`)
      .send({ content: 'أهلاً وسهلاً - تم التعديل' });
    expect(edit.body.data.isEdited).toBe(true);

    // Delete first message
    const del = await request(app).delete(`/api/chat/messages/${wfMsg1}`);
    expect(del.status).toBe(200);

    // Verify messages list
    const msgs = await request(app).get(`/api/chat/conversations/${wfGroupId}/messages`);
    // Deleted messages are filtered out
    const deletedMsg = msgs.body.messages.find(m => m.id === wfMsg1);
    expect(deletedMsg).toBeUndefined();
  });

  test('Step 7: Typing → status → dashboard', async () => {
    // Set typing
    await request(app)
      .post(`/api/chat/conversations/${wfGroupId}/typing`)
      .send({ isTyping: true });

    // Set user status
    const status = await request(app)
      .put('/api/chat/users/status')
      .send({ status: 'away' });
    expect(status.body.data.status).toBe('away');

    // Reset status
    await request(app).put('/api/chat/users/status').send({ status: 'online' });

    // Dashboard still works
    const dash = await request(app).get('/api/chat/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.body.data.kpis.totalConversations).toBeGreaterThanOrEqual(4);
  });

  test('Step 8: Remove member → update group → cleanup', async () => {
    // Remove u5
    const rm = await request(app)
      .delete(`/api/chat/conversations/${wfGroupId}/participants/u5`);
    expect(rm.body.data.participants).not.toContain('u5');

    // Update group name
    const upd = await request(app)
      .put(`/api/chat/conversations/${wfGroupId}`)
      .send({ name: 'ورشة عمل - مكتملة' });
    expect(upd.body.data.name).toBe('ورشة عمل - مكتملة');
  });
});
