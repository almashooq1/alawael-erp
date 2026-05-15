/**
 * NationalAddressScreen — demo screen exercising the RN
 * NationalAddressField component end-to-end against the
 * /api/v1/wasel/address/verify-and-stamp endpoint.
 *
 * Drop this into a stack navigator to let users (parent, therapist,
 * driver) update their national address from the mobile app. The
 * screen does not yet POST to a domain entity — wire the resulting
 * `nationalAddress` into the parent/therapist profile update payload
 * when that surface lands.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import NationalAddressField from '../../components/NationalAddressField';
import type { NationalAddress } from '../../services/modules/nationalAddress';

export default function NationalAddressScreen() {
  const [addr, setAddr] = useState<NationalAddress | undefined>(undefined);
  const verified = addr?.verification?.verified === true;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={styles.title}>العنوان الوطني السعودي</Text>
      <Text style={styles.subtitle}>أدخل الرمز البريدي المكوّن من 4 حروف و 4 أرقام (مثال: RFYA1234) ثم اضغط «تحقّق».</Text>

      <NationalAddressField value={addr} onChange={setAddr} />

      {verified && (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>تم التحقق ✓</Text>
          <Text style={styles.successBody}>سيُحفَظ هذا العنوان في ملفك التعريفي عند الضغط على «حفظ» في الشاشة الأصلية.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  successCard: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  successTitle: { fontWeight: '600', color: '#065f46', marginBottom: 4 },
  successBody: { fontSize: 13, color: '#065f46' },
});
