import api from './api';
const BASE = '/chat';

const chatService = {
  // ── Dashboard ──
  getDashboard: () => api.get(`${BASE}/dashboard`),

  // ── Users ──
  getUsers: (params = {}) => api.get(`${BASE}/users`, { params }),
  getOnlineUsers: () => api.get(`${BASE}/users/online`),
  getUserById: id => api.get(`${BASE}/users/${id}`),
  setUserStatus: status => api.put(`${BASE}/users/status`, { status }),

  // ── Conversations ──
  getConversations: () => api.get(`${BASE}/conversations`),
  getConversationById: id => api.get(`${BASE}/conversations/${id}`),
  createDirectConversation: userId => api.post(`${BASE}/conversations/direct`, { userId }),
  createGroupConversation: data => api.post(`${BASE}/conversations/group`, data),
  updateConversation: (id, data) => api.put(`${BASE}/conversations/${id}`, data),
  deleteConversation: id => api.delete(`${BASE}/conversations/${id}`),

  // ── Participants ──
  addParticipant: (convId, userId) => api.post(`${BASE}/conversations/${convId}/participants`, { userId }),
  removeParticipant: (convId, userId) => api.delete(`${BASE}/conversations/${convId}/participants/${userId}`),
  promoteToAdmin: (convId, userId) => api.post(`${BASE}/conversations/${convId}/admins`, { userId }),

  // ── Messages ──
  getMessages: (convId, params = {}) => api.get(`${BASE}/conversations/${convId}/messages`, { params }),
  sendMessage: (convId, data) => api.post(`${BASE}/conversations/${convId}/messages`, data),
  editMessage: (msgId, content) => api.put(`${BASE}/messages/${msgId}`, { content }),
  deleteMessage: msgId => api.delete(`${BASE}/messages/${msgId}`),
  searchMessages: q => api.get(`${BASE}/messages/search`, { params: { q } }),

  // ── Reactions ──
  addReaction: (msgId, emoji) => api.post(`${BASE}/messages/${msgId}/reactions`, { emoji }),
  getReactions: msgId => api.get(`${BASE}/messages/${msgId}/reactions`),

  // ── Read Receipts ──
  markAsRead: convId => api.post(`${BASE}/conversations/${convId}/read`),
  getUnreadCount: () => api.get(`${BASE}/unread`),

  // ── Pinned Messages ──
  getPinnedMessages: convId => api.get(`${BASE}/conversations/${convId}/pinned`),
  pinMessage: (convId, messageId) => api.post(`${BASE}/conversations/${convId}/pinned`, { messageId }),
  unpinMessage: (convId, messageId) => api.delete(`${BASE}/conversations/${convId}/pinned/${messageId}`),

  // ── Attachments ──
  uploadAttachment: data => api.post(`${BASE}/attachments`, data),
  getAttachment: id => api.get(`${BASE}/attachments/${id}`),
  getConversationAttachments: convId => api.get(`${BASE}/conversations/${convId}/attachments`),

  // ── Typing Indicators ──
  setTyping: (convId, isTyping) => api.post(`${BASE}/conversations/${convId}/typing`, { isTyping }),
  getTypingUsers: convId => api.get(`${BASE}/conversations/${convId}/typing`),

  // ── Blocked Users ──
  getBlockedUsers: () => api.get(`${BASE}/blocked`),
  blockUser: userId => api.post(`${BASE}/blocked`, { userId }),
  unblockUser: userId => api.delete(`${BASE}/blocked/${userId}`),
};

export default chatService;
