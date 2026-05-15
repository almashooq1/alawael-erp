/**
 * CctvCamerasScreen — list of cameras for a single branch.
 *
 * Field officers pick a camera here to live-view or check status.
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
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cctv, type CctvCamera } from '../../services/modules';

type Nav = NativeStackNavigationProp<{ CctvCameraDetail: { cameraId: string } }>;
type Rt = RouteProp<{ CctvCameras: { branchCode: string } }, 'CctvCameras'>;

const STATUS_LABEL: Record<string, string> = {
  online: 'متصلة',
  offline: 'غير متصلة',
  degraded: 'متدنية',
  provisioned: 'مُهيأة',
  retired: 'متقاعدة',
};

const STATUS_COLOR: Record<string, string> = {
  online: '#16a34a',
  offline: '#dc2626',
  degraded: '#eab308',
  provisioned: '#6b7280',
  retired: '#374151',
};

export default function CctvCamerasScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const branchCode = route.params?.branchCode ?? '';

  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await cctv.listForBranch(branchCode);
      setCameras(list);
    } catch {
      setError('تعذر تحميل قائمة الكاميرات');
    }
  }, [branchCode]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

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
        <Text style={styles.title}>{branchCode}</Text>
        <Text style={styles.subtitle}>{cameras.length} كاميرا</Text>
      </View>
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        contentContainerStyle={styles.list}
        data={cameras}
        keyExtractor={c => c._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>لا توجد كاميرات في هذا الفرع.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CctvCameraDetail', { cameraId: item._id })}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name_ar}</Text>
              <View style={[styles.statusChip, { backgroundColor: STATUS_COLOR[item.status] || '#6b7280' }]}>
                <Text style={styles.statusChipText}>{STATUS_LABEL[item.status] || item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardCode}>{item.code}</Text>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardMeta}>{item.location?.room || item.location?.area || '—'}</Text>
              <View style={styles.caps}>
                {item.capabilities?.ptz && <Cap label="PTZ" />}
                {item.capabilities?.faceDetection && <Cap label="Face" />}
                {item.capabilities?.anpr && <Cap label="ANPR" />}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function Cap({ label }: { label: string }) {
  return (
    <View style={styles.capChip}>
      <Text style={styles.capChipText}>{label}</Text>
    </View>
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
  empty: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
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
  cardCode: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace', marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { fontSize: 13, color: '#6b7280' },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 8 },
  statusChipText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  caps: { flexDirection: 'row', gap: 4 },
  capChip: { backgroundColor: '#e0e7ff', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  capChipText: { color: '#3730a3', fontSize: 10, fontWeight: '600' },
});
