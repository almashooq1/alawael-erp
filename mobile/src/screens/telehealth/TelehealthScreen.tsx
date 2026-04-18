/**
 * TelehealthScreen — upcoming video sessions + one-tap join.
 *
 * Taps "انضمام" → telehealth.join() → Linking.openURL(roomUrl).
 * Therapist/admin also get a "create room" button if envelope not ready.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { telehealth, type TelehealthSession } from '../../services/modules';

function fullName(p?: { firstName_ar?: string; lastName_ar?: string; beneficiaryNumber?: string }) {
  if (!p) return '—';
  return (
    [p.firstName_ar, p.lastName_ar].filter(Boolean).join(' ') ||
    p.beneficiaryNumber ||
    '—'
  );
}

function formatDateTime(s?: string): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function timeStatus(session: TelehealthSession): { label: string; color: string } {
  const now = new Date();
  const date = new Date(session.date);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) {
    if (session.status === 'IN_PROGRESS') return { label: 'جارية الآن', color: '#ed6c02' };
    return { label: 'اليوم', color: '#d97706' };
  }
  if (diff === 1) return { label: 'غداً', color: '#0891b2' };
  if (diff > 0) return { label: `بعد ${diff} أيام`, color: '#6b7280' };
  return { label: 'انتهت', color: '#991b1b' };
}

export default function TelehealthScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<TelehealthSession[]>([]);
  const [joining, setJoining] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const items = await telehealth.myUpcoming();
      setSessions(items);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'فشل التحميل');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const joinSession = async (session: TelehealthSession) => {
    setJoining(j => ({ ...j, [session._id]: true }));
    try {
      const info = await telehealth.join(session._id);
      const canOpen = await Linking.canOpenURL(info.roomUrl);
      if (canOpen) {
        await Linking.openURL(info.roomUrl);
      } else {
        Alert.alert('تعذّر الفتح', 'تحقق من تثبيت متصفح أو تطبيق Jitsi.');
      }
      await load();
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل الانضمام');
    } finally {
      setJoining(j => ({ ...j, [session._id]: false }));
    }
  };

  const createRoom = async (session: TelehealthSession) => {
    try {
      await telehealth.createRoom(session._id);
      Alert.alert('تم', 'أُنشئت الغرفة — يمكنك الآن الانضمام.');
      await load();
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل إنشاء الغرفة');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>جلسات الفيديو</Text>
        <Text style={styles.subtitle}>Jitsi / telehealth — انضم بضغطة واحدة</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {sessions.length === 0 && !error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📹</Text>
              <Text style={styles.emptyTitle}>لا توجد جلسات فيديو قادمة</Text>
              <Text style={styles.emptyText}>
                ستظهر هنا الجلسات المجدولة مع الطب عن بُعد المفعَّل.
              </Text>
            </View>
          ) : null}

          {sessions.map(session => {
            const ts = timeStatus(session);
            const ready = Boolean(session.telehealth?.roomUrl);
            const canCreate = !ready && (session.joinerRole === 'therapist' || session.joinerRole === 'admin');

            return (
              <View key={session._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.timePill, { backgroundColor: ts.color + '22' }]}>
                    <Text style={[styles.timePillText, { color: ts.color }]}>{ts.label}</Text>
                  </View>
                  <Text style={styles.dateText}>
                    {formatDateTime(session.date)}
                    {session.startTime ? `  ·  ${session.startTime}` : ''}
                  </Text>
                </View>

                <Text style={styles.sessionType}>{session.sessionType}</Text>

                <View style={styles.participants}>
                  <View style={styles.participant}>
                    <Text style={styles.participantLabel}>المستفيد</Text>
                    <Text style={styles.participantName}>
                      {fullName(session.beneficiary)}
                    </Text>
                  </View>
                  <View style={styles.participant}>
                    <Text style={styles.participantLabel}>المعالج</Text>
                    <Text style={styles.participantName}>
                      {fullName(session.therapist)}
                    </Text>
                  </View>
                </View>

                {session.telehealth?.hostJoinedAt ? (
                  <Text style={styles.connectedText}>
                    ● المعالج متصل منذ{' '}
                    {new Date(session.telehealth.hostJoinedAt).toLocaleTimeString('ar-SA')}
                  </Text>
                ) : null}

                {ready ? (
                  <TouchableOpacity
                    style={[styles.joinBtn, joining[session._id] && { opacity: 0.6 }]}
                    onPress={() => joinSession(session)}
                    disabled={joining[session._id]}
                  >
                    {joining[session._id] ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.joinBtnText}>📹 انضمام إلى الاجتماع</Text>
                    )}
                  </TouchableOpacity>
                ) : canCreate ? (
                  <TouchableOpacity
                    style={[styles.joinBtn, styles.createBtn]}
                    onPress={() => createRoom(session)}
                  >
                    <Text style={styles.joinBtnText}>✨ إنشاء غرفة Jitsi</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.notReadyBox}>
                    <Text style={styles.notReadyText}>
                      لم يُنشئ المعالج الغرفة بعد — حاول تحديث الصفحة.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf5ff' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  errorBox: { padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#991b1b', textAlign: 'right' },
  emptyBox: {
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  timePillText: { fontSize: 12, fontWeight: '700' },
  dateText: { fontSize: 13, color: '#6b7280' },
  sessionType: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'right', marginBottom: 8 },
  participants: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  participant: { flex: 1 },
  participantLabel: { fontSize: 10, color: '#9ca3af', textAlign: 'right' },
  participantName: { fontSize: 14, fontWeight: '500', color: '#374151', marginTop: 2, textAlign: 'right' },
  connectedText: { fontSize: 12, color: '#ed6c02', marginBottom: 8, textAlign: 'right' },
  joinBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtn: { backgroundColor: '#0891b2' },
  joinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  notReadyBox: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 },
  notReadyText: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
