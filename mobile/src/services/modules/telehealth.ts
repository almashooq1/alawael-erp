/**
 * telehealth.ts — typed client for /api/telehealth-v2/*.
 */

import api from '../ApiService';

export interface TelehealthSession {
  _id: string;
  title?: string;
  sessionType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status: string;
  beneficiary?: { firstName_ar?: string; lastName_ar?: string; beneficiaryNumber?: string };
  therapist?: { firstName_ar?: string; lastName_ar?: string };
  telehealth?: {
    enabled: boolean;
    provider?: 'jitsi' | 'zoom' | 'googlemeet' | 'custom';
    roomName?: string;
    roomUrl?: string;
    hostJoinedAt?: string;
    guestJoinedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
  };
  joinerRole?: 'admin' | 'therapist' | 'guardian';
}

const TH = '/telehealth-v2';

export const telehealth = {
  async myUpcoming() {
    const res = await api.get<{ success: boolean; items: TelehealthSession[] }>(
      `${TH}/my/upcoming`
    );
    return res.items || [];
  },

  async getSession(sessionId: string) {
    const res = await api.get<{ success: boolean; data: TelehealthSession }>(
      `${TH}/sessions/${sessionId}`
    );
    return res.data;
  },

  async createRoom(sessionId: string, provider: 'jitsi' | 'custom' = 'jitsi') {
    const res = await api.post<{ success: boolean; data: TelehealthSession }>(
      `${TH}/sessions/${sessionId}/create-room`,
      { provider }
    );
    return res.data;
  },

  async join(sessionId: string) {
    const res = await api.post<{
      success: boolean;
      roomUrl: string;
      roomName: string;
      provider: string;
      joinerRole: string;
      displayName: string;
    }>(`${TH}/sessions/${sessionId}/join`, {});
    return res;
  },

  async end(sessionId: string) {
    const res = await api.post<{ success: boolean; data: TelehealthSession }>(
      `${TH}/sessions/${sessionId}/end`,
      {}
    );
    return res.data;
  },
};

export default telehealth;
