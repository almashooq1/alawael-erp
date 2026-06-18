/**
 * RehabMetricsScreen — mobile rehab KPIs and program metrics.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView, StatusBar } from 'react-native';
import { rehabPrograms } from '../../services/modules';

export default function RehabMetricsScreen() {
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [kpis, setKpis] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, k] = await Promise.all([rehabPrograms.getDashboardStats(), rehabPrograms.getKpiDashboard()]);
      setStats(s);
      setKpis(k);
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

  const hero = kpis?.heroKpis || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مقاييس التأهيل</Text>
        <Text style={styles.headerSubtitle}>مؤشرات الأداء والإحصائيات الرئيسية</Text>
      </View>

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
          <Text style={styles.section}>إحصائيات عامة</Text>
          <View style={styles.grid}>
            <MetricCard label="المستفيدون" value={String(stats?.totalBeneficiaries ?? '-')} />
            <MetricCard label="البرامج النشطة" value={String(stats?.totalPrograms ?? '-')} />
            <MetricCard label="الجلسات" value={String(stats?.totalSessions ?? '-')} />
            <MetricCard label="التقييمات" value={String(stats?.totalAssessments ?? '-')} />
          </View>

          <Text style={styles.section}>مؤشرات الأداء</Text>
          {Array.isArray(hero) && hero.length > 0 ? (
            hero.slice(0, 6).map((k: any) => (
              <View key={k.id} style={styles.kpiCard}>
                <Text style={styles.kpiName}>{k.nameAr || k.nameEn || k.id}</Text>
                <Text style={styles.kpiValue}>
                  {typeof k.value === 'number' ? `${k.value}${k.unit === 'percent' ? '%' : ''}` : (k.value ?? '-')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>لا توجد مؤشرات متاحة</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { padding: 16, backgroundColor: '#7c3aed' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#ede9fe', fontSize: 13, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  errorText: { color: '#b91c1c', textAlign: 'center', paddingHorizontal: 32 },
  content: { padding: 16 },
  section: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 8, marginBottom: 10, textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#1976d2' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderRightWidth: 4,
    borderRightColor: '#0891b2',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiName: { flex: 1, textAlign: 'right', fontSize: 14, color: '#374151', fontWeight: '600' },
  kpiValue: { fontSize: 18, fontWeight: '700', color: '#0891b2', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 16 },
});
