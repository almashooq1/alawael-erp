/**
 * AssessmentDetailScreen — mobile scale detail + recent results.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { assessments, type ScaleDefinition, type AssessmentResult } from '../../services/modules';

type Props = NativeStackScreenProps<any, 'AssessmentDetail'>;

export default function AssessmentDetailScreen({ route }: Props) {
  const { scaleKey } = route.params || {};
  const [scale, setScale] = useState<ScaleDefinition | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [detail, history] = await Promise.all([
        assessments.getScaleDetails(scaleKey),
        assessments.listScaleResults({ scaleId: scaleKey }),
      ]);
      setScale(detail);
      setResults(history);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'فشل تحميل التفاصيل');
    }
  }, [scaleKey]);

  useEffect(() => {
    if (!scaleKey) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, scaleKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.title}>{scale?.name || scaleKey}</Text>
          <Text style={styles.sub}>{scale?.nameEn || ''}</Text>
          <Text style={styles.score}>الدرجة القصوى: {scale?.maxScore ?? '-'}</Text>

          <Text style={styles.section}>المجالات</Text>
          {(scale?.domains || []).map(d => (
            <View key={d.key} style={styles.row}>
              <Text style={styles.rowName}>{d.name}</Text>
              <Text style={styles.rowValue}>{d.maxScore}</Text>
            </View>
          ))}

          <Text style={styles.section}>النتائج السابقة</Text>
          {results.length === 0 ? (
            <Text style={styles.empty}>لا توجد نتائج مسجلة</Text>
          ) : (
            results.map(r => (
              <View key={r._id || `${r.beneficiaryId}-${r.date}`} style={styles.resultCard}>
                <Text style={styles.resultScore}>
                  {r.totalScore} / {r.maxScore}
                </Text>
                <Text style={styles.resultMeta}>
                  {r.percentage}% · {r.level || ''}
                </Text>
                <Text style={styles.resultDate}>{r.date}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  errorText: { color: '#b91c1c', textAlign: 'center', paddingHorizontal: 32 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'right' },
  sub: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  score: { fontSize: 15, color: '#1976d2', fontWeight: '700', marginTop: 12, textAlign: 'right' },
  section: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 24, marginBottom: 8, textAlign: 'right' },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  rowName: { color: '#111827', fontWeight: '600' },
  rowValue: { color: '#1976d2', fontWeight: '700' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderRightWidth: 4,
    borderRightColor: '#7c3aed',
  },
  resultScore: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'right' },
  resultMeta: { fontSize: 13, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  resultDate: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 16 },
});
