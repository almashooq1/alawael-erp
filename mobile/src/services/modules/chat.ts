/**
 * chat.ts — typed client for /api/chat-v2/*.
 */

import api from '../ApiService';

export interface ChatContact {
  _id: string;
  name: string;
  email: string;
  role?: string;
  category: string;
}

export interface Participant {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface Conversation {
  _id: string;
  type: 'private' | 'group' | 'channel';
  other?: Participant;
  participants: Participant[];
  lastMessage?: { content?: string; sender?: string; sentAt?: string; messageType?: string };
  lastActivityAt: string;
  unread: number;
  groupInfo?: { name?: string; description?: string; avatar?: string };
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: Participant;
  content: { text?: string; type: string };
  attachments?: Array<{ fileName: string; fileUrl: string; fileType: string; fileSize: number }>;
  replyTo?: string;
  createdAt: string;
}

const CHAT = '/chat-v2';

export const chat = {
  async conversations() {
    const res = await api.get<{ success: boolean; items: Conversation[] }>(`${CHAT}/conversations`);
    return res.items || [];
  },

  async findOrCreate(withUserId: string) {
    const res = await api.post<{ success: boolean; data: Conversation }>(
      `${CHAT}/conversations`,
      { withUserId }
    );
    return res.data;
  },

  async messages(conversationId: string, before?: string, limit = 50) {
    const res = await api.get<{ success: boolean; items: Message[]; hasMore: boolean }>(
      `${CHAT}/conversations/${conversationId}/messages`,
      { before, limit }
    );
    return { items: res.items || [], hasMore: res.hasMore || false };
  },

  async send(conversationId: string, text: string, replyTo?: string) {
    const res = await api.post<{ success: boolean; data: Message }>(
      `${CHAT}/conversations/${conversationId}/messages`,
      { text, replyTo }
    );
    return res.data;
  },

  async markRead(conversationId: string) {
    await api.post(`${CHAT}/conversations/${conversationId}/read`, {});
  },

  async contacts() {
    const res = await api.get<{ success: boolean; items: ChatContact[] }>(`${CHAT}/contacts`);
    return res.items || [];
  },
};

export default chat;
