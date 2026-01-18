export interface Message {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'template' | 'media';
  body?: string;
  templateName?: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  waMessageId?: string;
  errorCode?: string;
  createdAt: Date;
}
