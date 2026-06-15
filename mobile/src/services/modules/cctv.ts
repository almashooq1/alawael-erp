/**
 * cctv.ts — typed mobile client for /api/v1/cctv/*.
 *
 * Mirrors the backend surface in backend/routes/cctv/*.routes.js.
 * All methods return the unwrapped `data` payload.
 *
 * Field-ops focus: list cameras by branch, view live, get alerts,
 * acknowledge from the field, snapshot fetch.
 */

import api, { API_BASE_URL } from '../ApiService';
// Note: snapshotUrl needs the origin OUTSIDE the private axios instance
// (it builds an <Image> src), so it reuses the shared API_BASE_URL default
// re-exported by ApiService instead of duplicating the fallback string.

export type CctvCameraStatus = 'provisioned' | 'online' | 'offline' | 'degraded' | 'retired';

export type CctvSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type CctvAlertStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive' | 'escalated';

export interface CctvCamera {
  _id: string;
  code: string;
  branchCode: string;
  name_ar: string;
  name_en?: string;
  ip: string;
  port?: number;
  channel?: number;
  status: CctvCameraStatus;
  location?: { area?: string; room?: string; floor?: string };
  capabilities?: {
    ptz?: boolean;
    faceDetection?: boolean;
    anpr?: boolean;
    audio?: boolean;
  };
  pdpl?: {
    retentionDays?: number;
    watermarkRequired?: boolean;
    parentConsentRequired?: boolean;
  };
  lastSeenAt?: string;
}

export interface CctvAlert {
  _id: string;
  code: string;
  branchCode: string;
  cameraId?: string;
  cameraCode?: string;
  ruleId?: string;
  title_ar: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  eventCount: number;
  firstEventAt: string;
  lastEventAt: string;
  status: CctvAlertStatus;
}

export interface CctvEvent {
  _id: string;
  eventId: string;
  cameraId: string;
  cameraCode: string;
  branchCode: string;
  type: string;
  severity: CctvSeverity;
  startedAt: string;
  source: string;
  aiResult?: {
    label?: string;
    confidence?: number;
    plate?: string;
  };
}

export interface CctvLiveSession {
  sessionId: string;
  hlsUrl: string;
  watermark?: { enabled?: boolean; text?: string };
  expiresAt: string;
}

export interface CctvBranchStat {
  branchCode: string;
  total: number;
  online: number;
  offline: number;
}

const BASE = '/cctv';

function unwrap<T>(envelope: { success?: boolean; data?: T; message?: string }): T {
  if (envelope?.success === false) {
    throw new Error(envelope.message || 'CCTV request failed');
  }
  return (envelope.data ?? envelope) as T;
}

export const cctv = {
  // ── Cameras ──────────────────────────────────────────────────────────
  async listForBranch(branchCode: string, status?: string): Promise<CctvCamera[]> {
    const res = await api.get(
      `${BASE}/cameras/by-branch/${encodeURIComponent(branchCode)}` + (status ? `?status=${encodeURIComponent(status)}` : ''),
    );
    return unwrap<CctvCamera[]>(res.data);
  },
  async getCamera(id: string): Promise<CctvCamera> {
    const res = await api.get(`${BASE}/cameras/${encodeURIComponent(id)}`);
    return unwrap<CctvCamera>(res.data);
  },
  async statsByBranch(): Promise<CctvBranchStat[]> {
    const res = await api.get(`${BASE}/cameras/stats/by-branch`);
    return unwrap<CctvBranchStat[]>(res.data);
  },

  // ── Streams ──────────────────────────────────────────────────────────
  async startLive(cameraId: string, requireGrant = true): Promise<CctvLiveSession> {
    const res = await api.post(`${BASE}/streams/live`, { cameraId, requireGrant });
    return unwrap<CctvLiveSession>(res.data);
  },
  async heartbeat(sessionId: string): Promise<void> {
    await api.post(`${BASE}/streams/${encodeURIComponent(sessionId)}/heartbeat`);
  },
  async stopStream(sessionId: string): Promise<void> {
    await api.post(`${BASE}/streams/${encodeURIComponent(sessionId)}/stop`);
  },
  snapshotUrl(cameraId: string): string {
    const base = API_BASE_URL.replace(/\/+$/, '');
    return `${base}${BASE}/streams/snapshot/${encodeURIComponent(cameraId)}`;
  },
  async ptz(cameraId: string, body: { pan?: number; tilt?: number; zoom?: number }): Promise<void> {
    await api.post(`${BASE}/streams/ptz/${encodeURIComponent(cameraId)}`, body);
  },
  async ptzStop(cameraId: string): Promise<void> {
    await api.post(`${BASE}/streams/ptz/${encodeURIComponent(cameraId)}/stop`);
  },

  // ── Events ───────────────────────────────────────────────────────────
  async listEvents(
    params: {
      branchCode?: string;
      type?: string;
      severity?: string;
      cameraId?: string;
      limit?: number;
    } = {},
  ): Promise<CctvEvent[]> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    }
    const q = qs.toString();
    const res = await api.get(`${BASE}/events${q ? `?${q}` : ''}`);
    return unwrap<CctvEvent[]>(res.data);
  },

  // ── Alerts ───────────────────────────────────────────────────────────
  async listAlerts(params: { branchCode?: string; severity?: string; limit?: number } = {}): Promise<CctvAlert[]> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
    }
    const q = qs.toString();
    const res = await api.get(`${BASE}/alerts${q ? `?${q}` : ''}`);
    return unwrap<CctvAlert[]>(res.data);
  },
  async acknowledgeAlert(id: string): Promise<CctvAlert> {
    const res = await api.post(`${BASE}/alerts/${encodeURIComponent(id)}/acknowledge`);
    return unwrap<CctvAlert>(res.data);
  },
  async resolveAlert(id: string, resolution: string, status: CctvAlertStatus = 'resolved'): Promise<CctvAlert> {
    const res = await api.post(`${BASE}/alerts/${encodeURIComponent(id)}/resolve`, { resolution, status });
    return unwrap<CctvAlert>(res.data);
  },
  async escalateAlert(id: string, incidentId?: string): Promise<CctvAlert> {
    const res = await api.post(`${BASE}/alerts/${encodeURIComponent(id)}/escalate`, { incidentId });
    return unwrap<CctvAlert>(res.data);
  },
};

export default cctv;
