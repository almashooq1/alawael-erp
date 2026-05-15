/**
 * NationalAddressField — Saudi National Address (وَصِل / SPL) capture
 * for React Native screens. Mirrors the web counterparts:
 *   - alawael-rehab-platform/apps/web-admin/src/components/ui/national-address-field.tsx
 *   - frontend/src/components/NationalAddressField.jsx
 *
 * Uses the typed `nationalAddress` service client under
 * `services/modules/nationalAddress`. The parent screen owns the value
 * and is responsible for refusing submission when an address is
 * present but `verification.verified !== true`.
 */

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import nationalAddressClient, { NationalAddress } from '../services/modules/nationalAddress';

const SHORT_CODE_REGEX = /^[A-Z]{4}\d{4}$/;

interface Props {
  value?: NationalAddress | undefined;
  onChange: (addr: NationalAddress | undefined) => void;
  nationalId?: string;
  label?: string;
  disabled?: boolean;
}

export default function NationalAddressField({ value, onChange, nationalId, label = 'العنوان الوطني السعودي', disabled = false }: Props) {
  const [shortCode, setShortCode] = useState(value?.shortCode ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verified = value?.verification?.verified === true;
  const status = value?.verification?.status;

  async function handleVerify() {
    setError(null);
    const trimmed = shortCode.trim().toUpperCase();
    if (!SHORT_CODE_REGEX.test(trimmed)) {
      setError('تنسيق غير صالح — يجب 4 حروف + 4 أرقام (مثل RFYA1234)');
      return;
    }
    setBusy(true);
    try {
      const payload: { shortCode: string; nationalId?: string } = { shortCode: trimmed };
      if (nationalId) payload.nationalId = nationalId;
      const r = await nationalAddressClient.verifyAndStamp(payload);
      onChange(r.address);
      if (!r.verified) {
        const v = r.address.verification;
        const reason = v?.message || (v?.status === 'not_found' ? 'الرمز غير مسجَّل في العنوان الوطني' : 'لم يتم التحقق من الرمز');
        setError(reason);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'تعذّر الاتصال بخدمة وَصِل';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleShortCodeChange(v: string) {
    setShortCode(v);
    if (verified && v.toUpperCase() !== (value?.shortCode ?? '').toUpperCase()) {
      onChange({
        ...value,
        shortCode: v.toUpperCase(),
        verification: { verified: false, status: 'unverified' },
      });
    }
  }

  function handleClear() {
    setShortCode('');
    setError(null);
    onChange(undefined);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.legend}>{label}</Text>

      <View style={styles.row}>
        <TextInput
          accessibilityLabel="الرمز البريدي للعنوان الوطني"
          value={shortCode}
          onChangeText={handleShortCodeChange}
          placeholder="RFYA1234"
          maxLength={8}
          autoCapitalize="characters"
          editable={!disabled && !busy}
          style={styles.input}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="تحقق من العنوان عبر وَصِل"
          onPress={handleVerify}
          disabled={disabled || busy || !shortCode}
          style={[styles.button, (disabled || busy || !shortCode) && styles.buttonDisabled]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>تحقّق</Text>}
        </TouchableOpacity>
        {value && (
          <TouchableOpacity onPress={handleClear} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>مسح</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statusRow}>
        {verified && (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={styles.badgeText}>موثَّق ✓</Text>
          </View>
        )}
        {!verified && status && status !== 'unverified' && (
          <View style={[styles.badge, styles.badgeDanger]}>
            <Text style={styles.badgeText}>
              {status === 'not_found' && 'غير مسجَّل'}
              {status === 'invalid_format' && 'تنسيق غير صالح'}
              {status === 'unknown' && 'تعذَّر التحقق'}
            </Text>
          </View>
        )}
        {!verified && !status && shortCode && (
          <View style={[styles.badge, styles.badgeWarn]}>
            <Text style={styles.badgeText}>بانتظار التحقق</Text>
          </View>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {verified && value && (
        <View style={styles.details}>
          {value.city && <DetailRow label="المدينة" value={value.city} />}
          {value.district && <DetailRow label="الحي" value={value.district} />}
          {value.postalCode && <DetailRow label="الرمز البريدي" value={value.postalCode} />}
          {value.buildingNumber && <DetailRow label="رقم المبنى" value={value.buildingNumber} />}
          {value.additionalNumber && <DetailRow label="الرقم الإضافي" value={value.additionalNumber} />}
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  legend: { fontSize: 14, fontWeight: '600', color: '#374151' },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  secondaryButtonText: { color: '#374151', fontWeight: '500', fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999 },
  badgeSuccess: { backgroundColor: '#d1fae5' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgeWarn: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  errorText: { color: '#dc2626', fontSize: 13, marginTop: 4 },
  details: { marginTop: 8, gap: 4 },
  detailRow: { flexDirection: 'row', gap: 6 },
  detailLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  detailValue: { fontSize: 13, color: '#111827' },
});
