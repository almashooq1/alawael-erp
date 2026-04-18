/**
 * notify.ts — unified notifications dispatch + audit (/api/notify).
 *
 * Mobile-usable for staff who send ad-hoc push/SMS/email from the app.
 */

import api from '../ApiService';

export type NotifyChannel = 'whatsapp' | 'sms' | 'email' | 'push' | 'auto';

export interface NotifySingleRequest {
  to: string; // phone/email/deviceId
  channels?: NotifyChannel[]; // default ['auto']
  subject?: string;
  body: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  templateKey?: string;
  beneficiaryId?: string;
  metadata?: Record<string, any>;
}

export interface NotifyBulkRequest {
  recipients: Array<string | { to: string; subject?: string; body?: string; beneficiaryId?: string; metadata?: any }>;
  channels?: NotifyChannel[];
  subject?: string;
  body: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  templateKey?: string;
  metadata?: Record<string, any>;
}

export interface NotifyResult {
  success: boolean;
  channelUsed?: string;
  messageId?: string;
  error?: string;
}

export interface NotifyLog {
  _id: string;
  channel: string;
  to: string;
  subject?: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'queued';
  createdAt: string;
  sentAt?: string;
  error?: string;
}

const NOTIFY = '/notify';

export const notify = {
  async send(payload: NotifySingleRequest) {
    return api.post<NotifyResult>(NOTIFY, payload);
  },

  async bulk(payload: NotifyBulkRequest) {
    return api.post<{
      success: boolean;
      total: number;
      sent: number;
      failed: number;
      results: NotifyResult[];
    }>(`${NOTIFY}/bulk`, payload);
  },

  async logs(filter: { channel?: string; status?: string; q?: string; page?: number; limit?: number } = {}) {
    const res = await api.get<{
      success: boolean;
      items: NotifyLog[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>(`${NOTIFY}/logs`, filter);
    return res;
  },

  async stats() {
    return api.get<{
      success: boolean;
      total: number;
      last30days: number;
      byChannel: Record<string, number>;
      byStatus: Record<string, number>;
    }>(`${NOTIFY}/stats`);
  },
};

export default notify;
