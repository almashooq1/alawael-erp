/**
 * NafathLoginScreen — Saudi national identity SSO flow.
 *
 * State machine:
 *   IDLE → user enters national ID → initiate()
 *   PENDING → polling every 2s, shows 2-digit random number
 *   APPROVED → persists token to SecureStore, calls onSuccess(user)
 *   REJECTED/EXPIRED/ERROR → show retry button
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { nafath, type NafathStatus } from '../../services/modules';

const POLL_INTERVAL_MS = 2000;

export default function NafathLoginScreen({
  onSuccess,
}: {
  onSuccess?: (user: { id: string; email: string; role: string; name?: string }) => void;
}) {
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<NafathStatus | 'IDLE'>('IDLE');
  const [err, setErr] = useState('');
  const [finalMessage, setFinalMessage] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [randomNumber, setRandomNumber] = useState<string | null>(null);
  const [, setExpiresAt] = useState<Date | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [mode, setMode] = useState<'mock' | 'live' | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (clockRef.current) clearInterval(clockRef.current);
    pollRef.current = null;
    clockRef.current = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const validate = (id: string) => /^[12]\d{9}$/.test(id);

  const initiate = async () => {
    setErr('');
    setFinalMessage('');
    if (!validate(nationalId)) {
      setErr('رقم هوية وطنية غير صحيح (10 أرقام، يبدأ بـ 1 أو 2)');
      return;
    }
    setLoading(true);
    try {
      const data = await nafath.initiate(nationalId);
      setRequestId(data.requestId);
      setRandomNumber(data.randomNumber);
      setExpiresAt(new Date(data.expiresAt));
      setMode(data.mode);
      setStatus('PENDING');
      if (data.message) setFinalMessage(data.message);

      pollRef.current = setInterval(() => pollStatus(data.requestId), POLL_INTERVAL_MS);
      clockRef.current = setInterval(() => {
        const left = Math.max(
          0,
          Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)
        );
        setRemainingSec(left);
      }, 1000);
      setRemainingSec(
        Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000))
      );
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'تعذّر بدء الطلب');
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    try {
      const res = await nafath.pollStatus(id);
      if (res.status === 'PENDING') return;

      stopPolling();
      setStatus(res.status);

      if (res.status === 'APPROVED' && res.token && res.user) {
        await SecureStore.setItemAsync('authToken', res.token);
        await SecureStore.setItemAsync('currentUser', JSON.stringify(res.user));
        setFinalMessage('تم التحقق بنجاح — جارٍ التحويل…');
        setTimeout(() => {
          onSuccess?.(res.user!);
        }, 1200);
      } else if (res.status === 'APPROVED' && res.needsOnboarding) {
        setFinalMessage(
          res.message || 'تم التحقق من هويتك — لا يوجد حساب مرتبط، تواصل مع الإدارة.'
        );
      } else if (res.status === 'REJECTED') {
        setFinalMessage('رفضت الطلب في تطبيق نفاذ.');
      } else if (res.status === 'EXPIRED') {
        setFinalMessage('انتهت مهلة الطلب.');
      } else if (res.status === 'ERROR') {
        setFinalMessage('حدث خطأ — حاول مرة أخرى.');
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        stopPolling();
        setStatus('ERROR');
        setFinalMessage('لم يُعثر على الطلب.');
      }
    }
  };

  const cancel = async () => {
    if (requestId) {
      try {
        await nafath.cancel(requestId);
      } catch {
        /* ignore */
      }
    }
    stopPolling();
    reset();
  };

  const reset = () => {
    setStatus('IDLE');
    setRequestId(null);
    setRandomNumber(null);
    setExpiresAt(null);
    setRemainingSec(0);
    setMode(null);
    setFinalMessage('');
    setErr('');
  };

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>نفاذ</Text>
        </View>
        <Text style={styles.title}>الدخول عبر نفاذ</Text>
        <Text style={styles.subtitle}>الدخول الموحَّد بالهوية الرقمية السعودية</Text>
        {mode === 'mock' && (
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>وضع المحاكاة (للتطوير)</Text>
          </View>
        )}

        {err ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{err}</Text>
          </View>
        ) : null}

        {status === 'IDLE' && (
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="رقم الهوية الوطنية — 10 أرقام"
              keyboardType="number-pad"
              maxLength={10}
              value={nationalId}
              onChangeText={v => setNationalId(v.replace(/\D/g, ''))}
              textAlign="right"
            />
            <TouchableOpacity
              style={[styles.submitBtn, !nationalId && { opacity: 0.5 }]}
              onPress={initiate}
              disabled={!nationalId || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>بدء التحقق عبر نفاذ</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.devHint}>
              💡 للتطوير: رقم ينتهي بـ 99 → رفض، بـ 88 → انتهاء المهلة
            </Text>
          </View>
        )}

        {status === 'PENDING' && randomNumber && (
          <View style={[styles.card, styles.pendingCard]}>
            <Text style={styles.pendingTitle}>في انتظار اعتمادك في تطبيق نفاذ</Text>
            <View style={styles.randomBox}>
              <Text style={styles.randomLabel}>الرقم المطلوب</Text>
              <Text style={styles.randomValue}>{randomNumber}</Text>
            </View>
            <Text style={styles.instructions}>
              افتح تطبيق نفاذ على جوالك، ستجد طلباً معلَّقاً. اضغط على الرقم{' '}
              <Text style={styles.instructionsBold}>{randomNumber}</Text> لاعتماد تسجيل الدخول.
            </Text>
            <Text style={styles.timer}>
              الوقت المتبقي: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </Text>
            {finalMessage ? <Text style={styles.pendingInfo}>{finalMessage}</Text> : null}
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>إلغاء الطلب</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'APPROVED' && (
          <View style={[styles.card, styles.approvedCard]}>
            <Text style={styles.approvedIcon}>✓</Text>
            <Text style={styles.approvedTitle}>تم التحقق بنجاح</Text>
            {finalMessage ? <Text style={styles.approvedText}>{finalMessage}</Text> : null}
            <ActivityIndicator color="#16a34a" size="small" style={{ marginTop: 12 }} />
          </View>
        )}

        {(status === 'REJECTED' || status === 'EXPIRED' || status === 'ERROR') && (
          <View style={[styles.card, styles.failedCard]}>
            <Text style={styles.failedIcon}>✗</Text>
            <Text style={styles.failedTitle}>
              {status === 'REJECTED'
                ? 'تم رفض الطلب'
                : status === 'EXPIRED'
                ? 'انتهت مهلة الطلب'
                : 'حدث خطأ'}
            </Text>
            {finalMessage ? <Text style={styles.failedText}>{finalMessage}</Text> : null}
            <TouchableOpacity style={styles.retryBtn} onPress={reset}>
              <Text style={styles.retryText}>المحاولة مرة أخرى</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  container: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 48 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  modeBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
  },
  modeBadgeText: { color: '#92400e', fontSize: 11, fontWeight: '600' },
  errorBox: {
    width: '100%',
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginTop: 20,
  },
  errorText: { color: '#991b1b', textAlign: 'right' },
  card: {
    width: '100%',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 32,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  submitBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  devHint: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 16 },
  pendingCard: { alignItems: 'center' },
  pendingTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 20 },
  randomBox: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  randomLabel: { color: '#bbf7d0', fontSize: 12, marginBottom: 4 },
  randomValue: { color: '#fff', fontSize: 72, fontWeight: '800', letterSpacing: 8 },
  instructions: { color: '#6b7280', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  instructionsBold: { fontWeight: '700', color: '#111827' },
  timer: { fontSize: 13, color: '#9ca3af', marginTop: 16 },
  pendingInfo: { fontSize: 12, color: '#0891b2', marginTop: 12, textAlign: 'center' },
  cancelBtn: { marginTop: 16, paddingVertical: 10 },
  cancelText: { color: '#6b7280', fontSize: 13 },
  approvedCard: { alignItems: 'center', borderWidth: 2, borderColor: '#16a34a' },
  approvedIcon: {
    fontSize: 64,
    color: '#16a34a',
    marginBottom: 12,
  },
  approvedTitle: { fontSize: 20, fontWeight: '700', color: '#16a34a' },
  approvedText: { color: '#374151', fontSize: 13, marginTop: 8, textAlign: 'center' },
  failedCard: { alignItems: 'center' },
  failedIcon: { fontSize: 64, color: '#ef4444', marginBottom: 12 },
  failedTitle: { fontSize: 18, fontWeight: '700', color: '#991b1b' },
  failedText: { color: '#6b7280', fontSize: 13, marginTop: 8, textAlign: 'center' },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
