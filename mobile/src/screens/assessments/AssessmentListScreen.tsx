/**
 * AssessmentListScreen — mobile list of available assessment scales.
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { assessments, type ScaleSummary } from '../../services/modules';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function AssessmentListScreen({ navigation }: Props) {
  const [scales, setScales] = useState<ScaleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await assessments.listAvailableScales();
      setScales(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'فشل تحميل المقاييس');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المقاييس التقييمية</Text>
        <Text style={styles.headerSubtitle}>اختر مقياساً لعرض التفاصيل والنتائج</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {scales.length === 0 ? (
            <Text style={styles.empty}>لا توجد مقاييس متاحة</Text>
          ) : (
            scales.map(scale => (
              <TouchableOpacity
                key={scale.key}
                style={styles.card}
                onPress={() => navigation.navigate('AssessmentDetail', { scaleKey: scale.key })}
              >
                <Text style={styles.cardTitle}>{scale.name}</Text>
                <Text style={styles.cardSub}>{scale.nameEn || scale.key}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>الحد الأقصى: {scale.maxScore ?? '-'}</Text>
                  <Text style={styles.metaText}>المجالات: {scale.domainsCount ?? '-'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { padding: 16, backgroundColor: '#1976d2' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#e3f2fd', fontSize: 13, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  errorText: { color: '#b91c1c', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 12, backgroundColor: '#1976d2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderRightWidth: 4,
    borderRightColor: '#1976d2',
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'right' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  cardMeta: { flexDirection: 'row-reverse', marginTop: 10, gap: 16 },
  metaText: { fontSize: 12, color: '#374151', fontWeight: '600' },
});
