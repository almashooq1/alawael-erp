/**
 * CctvAlertsScreen — open-alert queue for field officers.
 *
 * Tap to acknowledge in one tap. Long-press for resolve / false-positive
 * sheet. Auto-refreshes every 15s.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { cctv, type CctvAlert } from '../../services/modules';

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#6b7280',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'مفتوح',
  acknowledged: 'مُستلَم',
  investigating: 'قيد التحقيق',
  resolved: 'محلول',
  false_positive: 'إنذار كاذب',
  escalated: 'مُصعَّد',
};

export default function CctvAlertsScreen() {
  const [alerts, setAlerts] = useState<CctvAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await cctv.listAlerts({ limit: 100 });
      setAlerts(list);
    } catch {
      setError('تعذر تحميل التنبيهات');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
    const it = setInterval(() => void load(), 15_000);
    return () => clearInterval(it);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  const acknowledge = useCallback(
    async (id: string) => {
      setBusyId(id);
      try {
        await cctv.acknowledgeAlert(id);
        await load();
      } catch {
        Alert.alert('خطأ', 'فشل استلام التنبيه');
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const showActions = useCallback(
    (a: CctvAlert) => {
      Alert.alert(
        a.title_ar,
        `${a.code}\n${a.cameraCode ?? ''}\nعدد الأحداث: ${a.eventCount}`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'استلام',
            onPress: () => void acknowledge(a._id),
          },
          {
            text: 'إنذار كاذب',
            style: 'destructive',
            onPress: async () => {
              setBusyId(a._id);
              try {
                await cctv.resolveAlert(a._id, 'تم تحديده كإنذار كاذب من الميدان', 'false_positive');
                await load();
              } catch {
                Alert.alert('خطأ', 'فشل العملية');
              } finally {
                setBusyId(null);
              }
            },
          },
          {
            text: 'تم الحل',
            onPress: async () => {
              setBusyId(a._id);
              try {
                await cctv.resolveAlert(a._id, 'تمت المعالجة من الميدان', 'resolved');
                await load();
              } catch {
                Alert.alert('خطأ', 'فشل العملية');
              } finally {
                setBusyId(null);
              }
            },
          },
        ],
        { cancelable: true },
      );
    },
    [acknowledge, load],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>طابور التنبيهات</Text>
        <Text style={styles.subtitle}>{alerts.length} مفتوح</Text>
      </View>
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        contentContainerStyle={styles.list}
        data={alerts}
        keyExtractor={a => a._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>✓ لا توجد تنبيهات مفتوحة</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { borderLeftWidth: 4, borderLeftColor: SEVERITY_COLOR[item.severity] ?? '#6b7280' }]}
            onPress={() => showActions(item)}
            disabled={busyId === item._id}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title_ar}</Text>
              <View style={[styles.sevChip, { backgroundColor: SEVERITY_COLOR[item.severity] ?? '#6b7280' }]}>
                <Text style={styles.sevChipText}>{item.severity}</Text>
              </View>
            </View>
            <Text style={styles.cardCode}>{item.code}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {item.branchCode} • {item.cameraCode ?? '—'} • {item.eventCount} حدث
              </Text>
              <Text style={styles.statusText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            </View>
            <Text style={styles.timeText}>{new Date(item.firstEventAt).toLocaleString('ar-SA')}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  errorBox: { backgroundColor: '#fee2e2', marginHorizontal: 16, borderRadius: 8, padding: 12, marginBottom: 8 },
  errorText: { color: '#991b1b', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 16 },
  emptyText: { color: '#16a34a', fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  cardCode: { fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  metaText: { fontSize: 12, color: '#6b7280', flex: 1 },
  statusText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  timeText: { fontSize: 11, color: '#9ca3af' },
  sevChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  sevChipText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
});
