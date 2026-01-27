// src/modules/omnichannel.ts
// Omnichannel Support Module (WhatsApp, Email, Web)

export type Channel = 'whatsapp' | 'email' | 'web';

export interface OmniMessage {
  id: string;
  channel: Channel;
  from: string;
  to: string;
  content: string;
  receivedAt: string;
  status: 'received' | 'processed' | 'failed';
  metadata?: Record<string, any>;
}

const messages: OmniMessage[] = [];

function generateId() {
  return 'OM' + Math.random().toString(36).slice(2, 10);
}

export class Omnichannel {
  listMessages(channel?: Channel) {
    return channel ? messages.filter(m => m.channel === channel) : messages;
  }
  getMessage(id: string) {
    return messages.find(m => m.id === id);
  }
  receiveMessage(data: Omit<OmniMessage, 'id' | 'receivedAt' | 'status'> & { status?: OmniMessage['status'] }) {
    const msg: OmniMessage = {
      id: generateId(),
      receivedAt: new Date().toISOString(),
      status: data.status || 'received',
      ...data,
    };
    messages.push(msg);
    return msg;
  }
  updateMessageStatus(id: string, status: OmniMessage['status']) {
    const m = messages.find(m => m.id === id);
    if (!m) return null;
    m.status = status;
    return m;
  }
}
