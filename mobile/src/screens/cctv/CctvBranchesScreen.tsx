/**
 * CctvBranchesScreen — entry point for security officers in the field.
 *
 * Top KPIs (total/online/offline across all branches) + scrollable list
 * of branches with per-branch availability. Tap a branch → cameras screen.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { cctv, type CctvBranchStat, type CctvAlert } from '../../services/modules';

type Nav = NativeStackNavigationProp<{
  CctvCameras: { branchCode: string };
  CctvAlerts: undefined;
}>;

export default function CctvBranchesScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [branches, setBranches] = useState<CctvBranchStat[]>([]);
  const [alerts, setAlerts] = useState<CctvAlert[]>([]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [bs, al] = await Promise.all([cctv.statsByBranch().catch(() => []), cctv.listAlerts({ limit: 20 }).catch(() => [])]);
      setBranches(bs);
      setAlerts(al);
    } catch {
      setError('تعذر تحميل بيانات المراقبة');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  const totals = useMemo(
    () =>
      branches.reduce(
        (acc, b) => ({
          total: acc.total + b.total,
          online: acc.online + b.online,
          offline: acc.offline + b.offline,
        }),
        { total: 0, online: 0, offline: 0 },
      ),
    [branches],
  );

  const criticalAlerts = useMemo(() => alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length, [alerts]);

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
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.title}>نظام المراقبة CCTV</Text>
        <Text style={styles.subtitle}>كاميرات Hikvision عبر جميع الفروع</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <KpiTile label="إجمالي" value={totals.total} color="#1976d2" />
          <KpiTile label="متصلة" value={totals.online} color="#16a34a" />
          <KpiTile label="غير متصلة" value={totals.offline} color="#dc2626" />
        </View>

        {/* Alerts quick link */}
        <TouchableOpacity
          style={[styles.alertBanner, criticalAlerts > 0 && styles.alertBannerCritical]}
          onPress={() => navigation.navigate('CctvAlerts')}
        >
          <Text style={[styles.alertBannerText, criticalAlerts > 0 && styles.alertBannerTextCritical]}>
            {alerts.length === 0 ? '✓ لا توجد تنبيهات مفتوحة' : `🔔 ${alerts.length} تنبيه — ${criticalAlerts} حرج`}
          </Text>
          <Text style={styles.alertBannerArrow}>‹</Text>
        </TouchableOpacity>

        {/* Branches list */}
        <Text style={styles.sectionTitle}>الفروع</Text>
        {branches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>لا توجد فروع مسجلة بعد.</Text>
          </View>
        ) : (
          branches.map(b => {
            const pct = b.total ? Math.round((b.online * 100) / b.total) : 0;
            return (
              <TouchableOpacity
                key={b.branchCode}
                style={styles.branchCard}
                onPress={() => navigation.navigate('CctvCameras', { branchCode: b.branchCode })}
              >
                <View style={styles.branchHeader}>
                  <Text style={styles.branchCode}>{b.branchCode}</Text>
                  <View style={[styles.pctChip, { backgroundColor: pctColor(pct) }]}>
                    <Text style={styles.pctChipText}>{pct}%</Text>
                  </View>
                </View>
                <Text style={styles.branchMeta}>
                  {b.total} كاميرا — <Text style={styles.online}>{b.online} متصلة</Text>
                  {b.offline > 0 && (
                    <>
                      {' '}
                      • <Text style={styles.offline}>{b.offline} غير متصلة</Text>
                    </>
                  )}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.kpiTile}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function pctColor(pct: number): string {
  if (pct >= 90) return '#16a34a';
  if (pct >= 70) return '#eab308';
  return '#dc2626';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#991b1b', fontSize: 14 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiTile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  kpiValue: { fontSize: 26, fontWeight: '700' },
  alertBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  alertBannerCritical: { backgroundColor: '#fef2f2', borderColor: '#dc2626' },
  alertBannerText: { flex: 1, fontSize: 15, color: '#374151' },
  alertBannerTextCritical: { color: '#991b1b', fontWeight: '600' },
  alertBannerArrow: { fontSize: 24, color: '#9ca3af' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  empty: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
  branchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  branchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  branchCode: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pctChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  pctChipText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  branchMeta: { fontSize: 13, color: '#6b7280' },
  online: { color: '#16a34a', fontWeight: '600' },
  offline: { color: '#dc2626', fontWeight: '600' },
});
