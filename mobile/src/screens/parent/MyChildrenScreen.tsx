/**
 * MyChildrenScreen — parent-facing dashboard of their enrolled children.
 *
 * Consumes /api/parent-v2 via the typed parentPortal client. Shows each
 * child's card with live summary (upcoming sessions, active plans,
 * last assessment score). Tap to expand.
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
import {
  parentPortal,
  type ChildSummary,
  type ChildOverview,
} from '../../services/modules';

function fullName(c: ChildSummary): string {
  return (
    c.firstName_ar ||
    `${c.firstName || ''} ${c.lastName || ''}`.trim() ||
    c.beneficiaryNumber ||
    '—'
  );
}

function formatDate(v?: string | Date): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

const DISABILITY_LABELS: Record<string, string> = {
  autism: 'اضطراب طيف التوحد',
  intellectual: 'إعاقة ذهنية',
  down_syndrome: 'متلازمة داون',
  cerebral_palsy: 'الشلل الدماغي',
  learning_disability: 'صعوبات تعلُّم',
  adhd: 'فرط الحركة وتشتت الانتباه',
  developmental_delay: 'تأخُّر نمو',
  multiple: 'إعاقات متعددة',
};

export default function MyChildrenScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [overviews, setOverviews] = useState<Record<string, ChildOverview>>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await parentPortal.myChildren();
      setChildren(list);
      // Fetch overviews in parallel
      const pairs = await Promise.all(
        list.map(async c => [c._id, await parentPortal.childOverview(c._id).catch(() => null)] as const)
      );
      const map: Record<string, ChildOverview> = {};
      for (const [id, ov] of pairs) {
        if (ov) map[id] = ov;
      }
      setOverviews(map);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'تعذّر تحميل البيانات');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>أطفالي</Text>
        <Text style={styles.subtitle}>جلسات · خطط · تقييمات</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
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

          {children.length === 0 && !error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                لا يوجد أطفال مسجَّلون تحت حسابك حالياً.
              </Text>
            </View>
          ) : null}

          {children.map(child => {
            const ov = overviews[child._id];
            return (
              <TouchableOpacity key={child._id} style={styles.card} activeOpacity={0.85}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{fullName(child)[0]}</Text>
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.childName}>{fullName(child)}</Text>
                    <Text style={styles.meta}>
                      {child.beneficiaryNumber || '—'}
                      {child.dateOfBirth ? `  ·  ${formatDate(child.dateOfBirth)}` : ''}
                    </Text>
                    {child.disability?.primaryType ? (
                      <Text style={styles.meta}>
                        {DISABILITY_LABELS[child.disability.primaryType] || child.disability.primaryType}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {ov ? (
                  <View style={styles.stats}>
                    <Stat label="قادم (7 أيام)" value={ov.summary.sessionsUpcomingWeek} highlight />
                    <Stat label="إجمالي الجلسات" value={ov.summary.sessionsTotal} />
                    <Stat label="خطط نشطة" value={ov.summary.activeCarePlans} />
                    <Stat label="تقييمات" value={ov.summary.totalAssessments} />
                  </View>
                ) : null}

                {ov?.summary.lastAssessment ? (
                  <View style={styles.lastAssessment}>
                    <Text style={styles.lastLabel}>آخر تقييم</Text>
                    <Text style={styles.lastTool}>
                      {ov.summary.lastAssessment.tool}
                      {ov.summary.lastAssessment.score != null
                        ? `  ·  ${ov.summary.lastAssessment.score}/100`
                        : ''}
                    </Text>
                    <Text style={styles.lastDate}>
                      {formatDate(ov.summary.lastAssessment.assessmentDate)}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, highlight ? styles.statValueHighlight : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  errorBox: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: '#991b1b', textAlign: 'right' },
  emptyBox: {
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { color: '#6b7280', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  cardHeaderText: { flex: 1 },
  childName: { fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'right' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2, textAlign: 'right' },
  stats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#374151' },
  statValueHighlight: { color: '#ed6c02' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  lastAssessment: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  lastLabel: { fontSize: 11, color: '#6b7280', textAlign: 'right' },
  lastTool: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'right', marginTop: 2 },
  lastDate: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 2 },
});
