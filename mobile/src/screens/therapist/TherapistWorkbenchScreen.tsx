/**
 * TherapistWorkbenchScreen — therapist daily workbench.
 *
 * Today's sessions with inline check-in + SOAP notes modal.
 * Tabs: Today · Week · Caseload.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  therapistWorkbench,
  type WorkbenchSession,
  type CaseloadRow,
} from '../../services/modules';

type Tab = 'today' | 'week' | 'caseload';

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED: { label: 'مجدولة', color: '#1e40af', bg: '#dbeafe' },
  CONFIRMED: { label: 'مؤكَّدة', color: '#1e3a8a', bg: '#bfdbfe' },
  IN_PROGRESS: { label: 'جارية', color: '#92400e', bg: '#fef3c7' },
  COMPLETED: { label: 'مكتملة', color: '#166534', bg: '#dcfce7' },
  NO_SHOW: { label: 'لم يحضر', color: '#991b1b', bg: '#fee2e2' },
  CANCELLED_BY_PATIENT: { label: 'ألغى المستفيد', color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED_BY_CENTER: { label: 'ألغى المركز', color: '#6b7280', bg: '#f3f4f6' },
  RESCHEDULED: { label: 'أُعيدت', color: '#5b21b6', bg: '#ede9fe' },
};

function beneficiaryName(s: WorkbenchSession): string {
  return (
    s.beneficiary?.firstName_ar ||
    [s.beneficiary?.firstName_ar, s.beneficiary?.lastName_ar].filter(Boolean).join(' ') ||
    s.beneficiary?.beneficiaryNumber ||
    '—'
  );
}

export default function TherapistWorkbenchScreen() {
  const [tab, setTab] = useState<Tab>('today');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [todayData, setTodayData] = useState<{ items: WorkbenchSession[]; totals: any }>({
    items: [],
    totals: {},
  });
  const [weekGrouped, setWeekGrouped] = useState<Record<string, WorkbenchSession[]>>({});
  const [caseload, setCaseload] = useState<CaseloadRow[]>([]);

  const [soapModal, setSoapModal] = useState<{
    open: boolean;
    session: WorkbenchSession | null;
    mode: 'edit' | 'complete';
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    saving: boolean;
  }>({
    open: false,
    session: null,
    mode: 'edit',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    saving: false,
  });

  const load = useCallback(async (which: Tab) => {
    setError('');
    try {
      if (which === 'today') {
        const r = await therapistWorkbench.today();
        setTodayData(r);
      } else if (which === 'week') {
        const r = await therapistWorkbench.week();
        setWeekGrouped((r as any).grouped || {});
      } else {
        const r = await therapistWorkbench.caseload();
        setCaseload(r);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'فشل التحميل');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(tab).finally(() => setLoading(false));
  }, [tab, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  }, [tab, load]);

  const checkIn = async (s: WorkbenchSession) => {
    try {
      await therapistWorkbench.checkIn(s._id);
      await load('today');
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل تسجيل الحضور');
    }
  };

  const openSoap = (s: WorkbenchSession, mode: 'edit' | 'complete') => {
    setSoapModal({
      open: true,
      session: s,
      mode,
      subjective: s.notes?.subjective || '',
      objective: s.notes?.objective || '',
      assessment: s.notes?.assessment || '',
      plan: s.notes?.plan || '',
      saving: false,
    });
  };

  const saveSoap = async () => {
    if (!soapModal.session) return;
    setSoapModal(m => ({ ...m, saving: true }));
    try {
      const payload = {
        notes: {
          subjective: soapModal.subjective,
          objective: soapModal.objective,
          assessment: soapModal.assessment,
          plan: soapModal.plan,
        },
      };
      if (soapModal.mode === 'complete') {
        await therapistWorkbench.complete(soapModal.session._id, payload);
      } else {
        await therapistWorkbench.saveNotes(soapModal.session._id, payload);
      }
      setSoapModal(m => ({ ...m, open: false, saving: false }));
      await load('today');
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل الحفظ');
      setSoapModal(m => ({ ...m, saving: false }));
    }
  };

  const totals = todayData.totals || ({} as any);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>منصّة المعالج</Text>
        <Text style={styles.subtitle}>
          {tab === 'today' ? 'جلسات اليوم' : tab === 'week' ? 'جدول الأسبوع' : 'حالاتي'}
        </Text>
      </View>

      <View style={styles.tabs}>
        {[
          { k: 'today' as Tab, label: 'اليوم' },
          { k: 'week' as Tab, label: 'الأسبوع' },
          { k: 'caseload' as Tab, label: 'حالاتي' },
        ].map(t => (
          <TouchableOpacity
            key={t.k}
            style={[styles.tab, tab === t.k && styles.tabActive]}
            onPress={() => setTab(t.k)}
          >
            <Text style={[styles.tabText, tab === t.k && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'today' && (
        <View style={styles.statsRow}>
          <Stat label="اليوم" value={totals.total || 0} color="#1976d2" />
          <Stat label="قادمة" value={totals.upcoming || 0} color="#0891b2" />
          <Stat label="جارية" value={totals.inProgress || 0} color="#ed6c02" />
          <Stat label="مكتملة" value={totals.completed || 0} color="#166534" />
        </View>
      )}

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

          {tab === 'today' && todayData.items.map(s => (
            <SessionCard
              key={s._id}
              session={s}
              onCheckIn={() => checkIn(s)}
              onEditNotes={() => openSoap(s, 'edit')}
              onComplete={() => openSoap(s, 'complete')}
            />
          ))}

          {tab === 'week' && Object.keys(weekGrouped).sort().map(day => (
            <View key={day}>
              <Text style={styles.dayHeader}>
                {new Date(day).toLocaleDateString('ar-SA', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                {'  ·  '}
                {weekGrouped[day].length} جلسة
              </Text>
              {weekGrouped[day].map(s => (
                <SessionCard
                  key={s._id}
                  session={s}
                  compact
                  onEditNotes={() => openSoap(s, 'edit')}
                />
              ))}
            </View>
          ))}

          {tab === 'caseload' && caseload.map((row, i) => (
            <View key={i} style={styles.caseloadRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.caseloadName}>
                  {row.beneficiary?.firstName_ar || row.beneficiary?.beneficiaryNumber || '—'}
                </Text>
                <Text style={styles.caseloadMeta}>
                  {row.beneficiary?.disability?.primaryType || '—'}
                </Text>
              </View>
              <View style={styles.caseloadStats}>
                <Text style={styles.caseloadCount}>{row.sessionCount}</Text>
                <Text style={styles.caseloadLabel}>جلسات</Text>
              </View>
              <View style={styles.caseloadStats}>
                <Text style={[styles.caseloadCount, { color: '#16a34a' }]}>{row.completed}</Text>
                <Text style={styles.caseloadLabel}>مكتملة</Text>
              </View>
              <View style={styles.caseloadStats}>
                <Text style={[styles.caseloadCount, { color: '#ed6c02' }]}>{row.upcoming}</Text>
                <Text style={styles.caseloadLabel}>قادمة</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={soapModal.open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {soapModal.mode === 'complete' ? 'إنهاء الجلسة + SOAP' : 'ملاحظات SOAP'}
            </Text>
            <Text style={styles.modalSub}>
              {beneficiaryName(soapModal.session as any)}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map(key => (
                <View key={key} style={styles.soapField}>
                  <Text style={styles.soapLabel}>
                    {key === 'subjective' ? 'S — ما قاله المستفيد'
                      : key === 'objective' ? 'O — ما لاحظه المعالج'
                      : key === 'assessment' ? 'A — التحليل'
                      : 'P — الخطة التالية'}
                  </Text>
                  <TextInput
                    style={styles.soapInput}
                    multiline
                    value={(soapModal as any)[key]}
                    onChangeText={(v) => setSoapModal(m => ({ ...m, [key]: v }))}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setSoapModal(m => ({ ...m, open: false }))}
                disabled={soapModal.saving}
              >
                <Text style={styles.modalBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  soapModal.mode === 'complete' ? styles.modalBtnComplete : styles.modalBtnSave,
                ]}
                onPress={saveSoap}
                disabled={soapModal.saving}
              >
                {soapModal.saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    {soapModal.mode === 'complete' ? 'إنهاء + حفظ' : 'حفظ'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SessionCard({
  session,
  compact,
  onCheckIn,
  onEditNotes,
  onComplete,
}: {
  session: WorkbenchSession;
  compact?: boolean;
  onCheckIn?: () => void;
  onEditNotes?: () => void;
  onComplete?: () => void;
}) {
  const st = STATUS_STYLE[session.status] || { label: session.status, color: '#374151', bg: '#f3f4f6' };
  const canCheckIn = ['SCHEDULED', 'CONFIRMED'].includes(session.status) && onCheckIn;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.time}>
          {session.startTime || '—'} → {session.endTime || '—'}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      <Text style={styles.benName}>{beneficiaryName(session)}</Text>
      <Text style={styles.sessionType}>
        {session.sessionType}
        {session.room?.name ? `  ·  ${session.room.name}` : ''}
      </Text>

      {!compact && (
        <View style={styles.actions}>
          {canCheckIn && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionCheckIn]} onPress={onCheckIn}>
              <Text style={styles.actionText}>✓ تسجيل حضور</Text>
            </TouchableOpacity>
          )}
          {onEditNotes && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionNotes]} onPress={onEditNotes}>
              <Text style={styles.actionText}>📝 SOAP</Text>
            </TouchableOpacity>
          )}
          {onComplete && session.status !== 'COMPLETED' && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionComplete]} onPress={onComplete}>
              <Text style={[styles.actionText, { color: '#fff' }]}>إنهاء</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2, textAlign: 'right' },
  tabs: { flexDirection: 'row-reverse', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#e0f2fe' },
  tabText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#0369a1', fontWeight: '700' },
  statsRow: { flexDirection: 'row-reverse', padding: 12, backgroundColor: '#fff', gap: 8 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 40 },
  errorBox: { padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#991b1b', textAlign: 'right' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 14, fontWeight: '600', color: '#374151' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600' },
  benName: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 6, textAlign: 'right' },
  sessionType: { fontSize: 12, color: '#6b7280', marginTop: 2, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', marginTop: 10, gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionCheckIn: { backgroundColor: '#fef3c7' },
  actionNotes: { backgroundColor: '#e0f2fe' },
  actionComplete: { backgroundColor: '#16a34a' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dayHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'right',
  },
  caseloadRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  caseloadName: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'right' },
  caseloadMeta: { fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'right' },
  caseloadStats: { alignItems: 'center', minWidth: 50, marginRight: 8 },
  caseloadCount: { fontSize: 16, fontWeight: '700', color: '#374151' },
  caseloadLabel: { fontSize: 10, color: '#6b7280' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'right' },
  modalSub: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 12, textAlign: 'right' },
  soapField: { marginBottom: 12 },
  soapLabel: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  soapInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    textAlign: 'right',
    minHeight: 60,
  },
  modalActions: { flexDirection: 'row-reverse', marginTop: 16, gap: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#f3f4f6' },
  modalBtnSave: { backgroundColor: '#1976d2' },
  modalBtnComplete: { backgroundColor: '#16a34a' },
  modalBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
