import api from '../utils/api';

/**
 * Messaging Service
 * خدمة الرسائل والمحادثات
 */
const messagingService = {
  /**
   * الحصول على قائمة المحادثات
   */
  getConversations: async () => {
    const response = await api.get('/conversations');
    return response.data;
  },

  /**
   * إنشاء محادثة خاصة جديدة
   * @param {string} userId - معرف المستخدم الآخر
   */
  createPrivateConversation: async userId => {
    const response = await api.post('/conversations/private', { userId });
    return response.data;
  },

  /**
   * إنشاء مجموعة جديدة
   * @param {string} name - اسم المجموعة
   * @param {Array<string>} userIds - معرفات الأعضاء
   */
  createGroupConversation: async (name, userIds) => {
    const response = await api.post('/conversations/group', { name, userIds });
    return response.data;
  },

  /**
   * الحصول على تفاصيل محادثة
   * @param {string} conversationId
   */
  getConversationById: async conversationId => {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * الحصول على رسائل محادثة
   * @param {string} conversationId
   * @param {number} page - رقم الصفحة
   * @param {number} limit - عدد الرسائل
   */
  getMessages: async (conversationId, page = 1, limit = 50) => {
    const response = await api.get(`/messages/conversation/${conversationId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * إرسال رسالة
   * @param {string} conversationId
   * @param {string} content - نص الرسالة
   * @param {Array} attachments - المرفقات (اختياري)
   * @param {string} replyTo - معرف الرسالة المردود عليها (اختياري)
   */
  sendMessage: async (conversationId, content, attachments = [], replyTo = null) => {
    const response = await api.post('/messages/send', {
      conversationId,
      content,
      attachments,
      replyTo,
    });
    return response.data;
  },

  /**
   * تحديد الرسائل كمقروءة
   * @param {string} conversationId
   */
  markAsRead: async conversationId => {
    const response = await api.post(`/messages/mark-read/${conversationId}`);
    return response.data;
  },

  /**
   * البحث في الرسائل
   * @param {string} query
   */
  searchMessages: async query => {
    const response = await api.get('/messages/search', {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * إضافة مشارك للمجموعة
   * @param {string} conversationId
   * @param {string} userId
   */
  addParticipant: async (conversationId, userId) => {
    const response = await api.post(`/conversations/${conversationId}/participants`, { userId });
    return response.data;
  },

  /**
   * إزالة مشارك من المجموعة
   * @param {string} conversationId
   * @param {string} userId
   */
  removeParticipant: async (conversationId, userId) => {
    const response = await api.delete(`/conversations/${conversationId}/participants/${userId}`);
    return response.data;
  },
};

export default messagingService;
