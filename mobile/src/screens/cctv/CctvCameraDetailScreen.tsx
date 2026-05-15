/**
 * CctvCameraDetailScreen — single-camera live + PTZ + snapshot for field ops.
 *
 * NOTE: Real HLS video playback requires `expo-av` (Video) or
 * `react-native-video`. Neither is in package.json yet — when adding,
 * import `Video` from `expo-av` and feed `session.hlsUrl` as the `source`.
 * For now this screen shows live snapshots that auto-refresh every 5s.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { cctv, type CctvCamera, type CctvLiveSession, type CctvEvent } from '../../services/modules';

type Rt = RouteProp<{ CctvCameraDetail: { cameraId: string } }, 'CctvCameraDetail'>;

export default function CctvCameraDetailScreen() {
  const route = useRoute<Rt>();
  const cameraId = route.params?.cameraId ?? '';

  const [camera, setCamera] = useState<CctvCamera | null>(null);
  const [events, setEvents] = useState<CctvEvent[]>([]);
  const [session, setSession] = useState<CctvLiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snapshotTick, setSnapshotTick] = useState(Date.now());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!cameraId) return;
    try {
      const [c, evs] = await Promise.all([cctv.getCamera(cameraId), cctv.listEvents({ cameraId, limit: 15 }).catch(() => [])]);
      setCamera(c);
      setEvents(evs);
    } catch {
      Alert.alert('خطأ', 'تعذر تحميل بيانات الكاميرا');
    }
  }, [cameraId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  // Auto-refresh snapshot every 5s while screen is open
  useEffect(() => {
    snapshotTimerRef.current = setInterval(() => setSnapshotTick(Date.now()), 5000);
    return () => {
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    };
  }, []);

  // Heartbeat live session
  useEffect(() => {
    if (!session) return;
    heartbeatRef.current = setInterval(() => {
      void cctv.heartbeat(session.sessionId).catch(() => {});
    }, 10_000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [session]);

  // Stop session on unmount
  useEffect(() => {
    return () => {
      if (session?.sessionId) {
        void cctv.stopStream(session.sessionId).catch(() => {});
      }
    };
  }, [session?.sessionId]);

  const startLive = useCallback(async () => {
    if (!cameraId) return;
    setBusy(true);
    try {
      const s = await cctv.startLive(cameraId);
      setSession(s);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر بدء البث';
      Alert.alert('فشل بدء البث', msg);
    } finally {
      setBusy(false);
    }
  }, [cameraId]);

  const stopLive = useCallback(async () => {
    if (!session) return;
    await cctv.stopStream(session.sessionId).catch(() => {});
    setSession(null);
  }, [session]);

  const ptz = useCallback(
    async (dir: 'left' | 'right' | 'up' | 'down' | 'in' | 'out') => {
      if (!cameraId) return;
      const m: Record<typeof dir, { pan?: number; tilt?: number; zoom?: number }> = {
        left: { pan: -30 },
        right: { pan: 30 },
        up: { tilt: 30 },
        down: { tilt: -30 },
        in: { zoom: 30 },
        out: { zoom: -30 },
      };
      await cctv.ptz(cameraId, m[dir]).catch(() => {});
      setTimeout(() => {
        void cctv.ptzStop(cameraId).catch(() => {});
      }, 500);
    },
    [cameraId],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!camera) {
    return (
      <View style={styles.center}>
        <Text>الكاميرا غير موجودة</Text>
      </View>
    );
  }

  const snapshotUri = `${cctv.snapshotUrl(camera._id)}?_=${snapshotTick}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{camera.name_ar}</Text>
        <Text style={styles.subtitle}>
          {camera.code} — {camera.branchCode}
        </Text>

        {/* Video / snapshot area */}
        <View style={styles.videoBox}>
          {session ? (
            // HLS playback would mount expo-av Video here.
            // For now show a "live" placeholder + the snapshot that
            // auto-refreshes every 5s.
            <View style={styles.videoInner}>
              <Image source={{ uri: snapshotUri }} style={styles.snapshot} resizeMode="cover" />
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>● مباشر</Text>
              </View>
              {session.watermark?.enabled && (
                <View style={styles.watermark}>
                  <Text style={styles.watermarkText} numberOfLines={1}>
                    {session.watermark.text}
                  </Text>
                </View>
              )}
            </View>
          ) : camera.status === 'online' ? (
            <Image source={{ uri: snapshotUri }} style={styles.snapshot} resizeMode="cover" />
          ) : (
            <View style={styles.videoOffline}>
              <Text style={styles.videoOfflineText}>الكاميرا غير متصلة</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!session ? (
            <TouchableOpacity
              style={[styles.btnPrimary, (camera.status !== 'online' || busy) && styles.btnDisabled]}
              onPress={() => void startLive()}
              disabled={camera.status !== 'online' || busy}
            >
              <Text style={styles.btnPrimaryText}>{busy ? 'جاري الاتصال…' : 'بدء البث المباشر'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnDanger} onPress={() => void stopLive()}>
              <Text style={styles.btnPrimaryText}>إيقاف البث</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* PTZ */}
        {camera.capabilities?.ptz && (
          <View style={styles.ptzCard}>
            <Text style={styles.ptzTitle}>التحكم بالحركة (PTZ)</Text>
            <View style={styles.ptzGrid}>
              <View />
              <PtzBtn label="▲" onPress={() => void ptz('up')} />
              <View />
              <PtzBtn label="◀" onPress={() => void ptz('left')} />
              <PtzBtn label="＋" onPress={() => void ptz('in')} />
              <PtzBtn label="▶" onPress={() => void ptz('right')} />
              <View />
              <PtzBtn label="▼" onPress={() => void ptz('down')} />
              <PtzBtn label="－" onPress={() => void ptz('out')} />
            </View>
          </View>
        )}

        {/* Properties */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المواصفات</Text>
          <Row label="الحالة" value={camera.status} />
          <Row label="الـ IP" value={`${camera.ip}:${camera.port ?? 80}`} />
          <Row label="القناة" value={String(camera.channel ?? '—')} />
          <Row label="المنطقة" value={camera.location?.area ?? '—'} />
          <Row label="الغرفة" value={camera.location?.room ?? '—'} />
          <Row label="آخر اتصال" value={camera.lastSeenAt ? new Date(camera.lastSeenAt).toLocaleString('ar-SA') : '—'} />
          <Row label="الاحتفاظ (PDPL)" value={`${camera.pdpl?.retentionDays ?? 30} يوم`} />
        </View>

        {/* Recent events */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>أحدث الأحداث</Text>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد أحداث.</Text>
          ) : (
            events.map(e => (
              <View key={e._id} style={styles.eventRow}>
                <View style={[styles.severityDot, { backgroundColor: severityColor(e.severity) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventType}>{e.type}</Text>
                  <Text style={styles.eventTime}>{new Date(e.startedAt).toLocaleString('ar-SA')}</Text>
                </View>
                {e.aiResult?.label && <Text style={styles.aiLabel}>{e.aiResult.label}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function PtzBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.ptzBtn} onPress={onPress}>
      <Text style={styles.ptzBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function severityColor(s: string): string {
  if (s === 'critical' || s === 'high') return '#dc2626';
  if (s === 'medium') return '#eab308';
  if (s === 'info') return '#3b82f6';
  return '#9ca3af';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 12 },
  videoBox: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  videoInner: { flex: 1 },
  snapshot: { width: '100%', height: '100%' },
  videoOffline: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoOfflineText: { color: '#9ca3af', fontSize: 14 },
  liveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(220,38,38,0.9)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  watermark: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: '80%',
  },
  watermarkText: { color: '#ffffff', fontSize: 10, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDanger: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnPrimaryText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  ptzCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ptzTitle: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  ptzGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 192,
    alignSelf: 'center',
    gap: 4,
  },
  ptzBtn: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ptzBtnText: { fontSize: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: '#6b7280' },
  rowValue: { fontSize: 13, color: '#111827', fontWeight: '500' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  eventType: { fontSize: 13, color: '#111827', fontWeight: '500' },
  eventTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  aiLabel: { fontSize: 11, color: '#6b7280', fontStyle: 'italic' },
  emptyText: { color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
});
