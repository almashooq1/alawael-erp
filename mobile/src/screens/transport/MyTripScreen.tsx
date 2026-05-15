/**
 * Driver "My Trip Today" — Phase E (mobile)
 *
 * Reads /transport-module/driver/my-trip-today, streams GPS every 10s
 * via LocationService → GpsBufferService → /gps/batch (offline-safe).
 * Big-tap-target stop list with Waze/Google deep links + pickup/dropoff
 * buttons that auto-pick the nearest beneficiary.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import { TransportApi, type DriverTripResponse } from '../../services/TransportApi';
import GpsBufferService from '../../services/GpsBufferService';
import LocationService, { type LocationSample } from '../../services/LocationService';

const POLL_INTERVAL_MS = 30_000;
const GPS_INTERVAL_MS = 10_000;

export default function MyTripScreen() {
  const [data, setData] = useState<DriverTripResponse | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [position, setPosition] = useState<LocationSample | null>(null);
  const [pendingGps, setPendingGps] = useState(0);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await TransportApi.myTripToday();
      setData(result);
    } catch (e) {
      setError('تعذر تحميل الرحلة');
      if (data === undefined) setData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Configure GPS streaming when trip + vehicle are known
  useEffect(() => {
    let alive = true;
    async function setupGps() {
      if (!data?.vehicle?._id) return;
      await GpsBufferService.configure(data.vehicle._id, data.trip._id);
      const ok = await LocationService.requestPermission();
      if (!ok || !alive) return;
      unsubscribeRef.current = LocationService.subscribe(async sample => {
        setPosition(sample);
        await GpsBufferService.add({
          latitude: sample.latitude,
          longitude: sample.longitude,
          speed: sample.speed,
          heading: sample.heading,
          altitude: sample.altitude,
          accuracy: sample.accuracy,
          timestamp: new Date(sample.timestamp).toISOString(),
        });
        setPendingGps(GpsBufferService.pendingCount());
      }, GPS_INTERVAL_MS);
    }
    void setupGps();
    return () => {
      alive = false;
      unsubscribeRef.current?.();
    };
  }, [data?.vehicle?._id, data?.trip?._id]);

  // Periodic flush attempt (in case threshold not reached but coverage is back)
  useEffect(() => {
    const t = setInterval(async () => {
      const sent = await GpsBufferService.flush();
      if (sent > 0) setPendingGps(GpsBufferService.pendingCount());
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const handlePickupAt = useCallback(
    async (beneficiary_id?: string, force = false) => {
      if (!position || !data) {
        Alert.alert('لا يوجد موقع', 'فعّل GPS أولاً.');
        return;
      }
      setActionBusy(beneficiary_id ?? 'auto');
      try {
        const result = await TransportApi.pickupAt(data.trip._id, position.latitude, position.longitude, beneficiary_id, force);
        if (!result.success) {
          // Distance-violation path returns 409 + distance metadata
          const m = result.data as { distanceMeters?: number; beneficiary_id?: string } | undefined;
          if (m?.distanceMeters) {
            Alert.alert(`أنت ${m.distanceMeters}م من المستفيد`, 'هل تريد التسجيل رغم ذلك؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'نعم', onPress: () => handlePickupAt(m.beneficiary_id, true) },
            ]);
            return;
          }
          throw new Error(result.message || 'تعذر التسجيل');
        }
        Alert.alert('✓ تم الاستلام', `المسافة: ${result.data?.distanceMeters ?? '?'}م`);
        await load();
      } catch (e) {
        Alert.alert('خطأ', (e as Error).message);
      } finally {
        setActionBusy(null);
      }
    },
    [position, data, load],
  );

  const handleDropoffAt = useCallback(
    async (beneficiary_id: string) => {
      if (!position || !data) return;
      setActionBusy(beneficiary_id);
      try {
        await TransportApi.dropoffAt(data.trip._id, position.latitude, position.longitude, beneficiary_id);
        await load();
      } catch (e) {
        Alert.alert('خطأ', (e as Error).message);
      } finally {
        setActionBusy(null);
      }
    },
    [position, data, load],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (data === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (data === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center}>
          <Text style={styles.empty}>لا توجد رحلة مجدولة لك اليوم</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const tripTypeLabel =
    data.trip.trip_type === 'morning_pickup' ? 'رحلة الصباح' : data.trip.trip_type === 'afternoon_dropoff' ? 'رحلة المساء' : 'رحلة خاصة';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{tripTypeLabel}</Text>
          <Text style={styles.headerSub}>
            {data.trip.trip_number} · {data.route.route_name_ar}
          </Text>
          <Text style={styles.headerSub}>
            👥 {data.trip.total_passengers} · ✓ {data.trip.picked_up_count} · ❌ {data.trip.absent_count}
          </Text>
        </View>

        {/* GPS status */}
        <View style={styles.card}>
          <Text style={styles.label}>الموقع الحالي</Text>
          {position ? (
            <Text style={styles.ok}>
              ✓ {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
              {position.accuracy ? ` (±${Math.round(position.accuracy)}م)` : ''}
            </Text>
          ) : (
            <Text style={styles.warn}>جاري تحديد الموقع…</Text>
          )}
          {pendingGps > 0 && <Text style={styles.warn}>⚠ {pendingGps} نقطة GPS في الانتظار (سيتم رفعها عند توفر الشبكة)</Text>}
        </View>

        {/* Next stop */}
        {data.nextStop && (
          <View style={[styles.card, { borderColor: data.nextStop.withinGeofence ? '#16a34a' : '#f59e0b', borderWidth: 2 }]}>
            <Text style={styles.label}>المحطة التالية</Text>
            <Text style={styles.nextStopText}>
              #{data.nextStop.waypoint.order} · على بُعد {data.nextStop.distanceMeters}م
            </Text>
            {data.nextStop.withinGeofence && (
              <TouchableOpacity
                style={[styles.btnLg, { backgroundColor: '#16a34a' }]}
                disabled={actionBusy === 'auto'}
                onPress={() => handlePickupAt()}
              >
                <Text style={styles.btnText}>⚡ استلام تلقائي</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Full route button */}
        {data.fullRouteUrl && (
          <TouchableOpacity
            style={[styles.btnLg, { backgroundColor: '#2563eb', margin: 12 }]}
            onPress={() => Linking.openURL(data.fullRouteUrl!)}
          >
            <Text style={styles.btnText}>🗺️ افتح كامل المسار في Google Maps</Text>
          </TouchableOpacity>
        )}

        {/* Stops list */}
        <Text style={styles.sectionTitle}>المحطات ({data.route.waypoints.length})</Text>
        {data.route.waypoints.map((wp, idx) => {
          const link = data.navigationLinks[idx];
          const eta = data.liveEta.find(e => e.order === wp.order);
          const benId = typeof wp.beneficiary_id === 'string' ? wp.beneficiary_id : wp.beneficiary_id?._id;
          const benName = typeof wp.beneficiary_id === 'string' ? '—' : (wp.beneficiary_id?.full_name_ar ?? '—');
          const passenger = data.passengers.find(
            p => String(typeof p.beneficiary_id === 'string' ? p.beneficiary_id : p.beneficiary_id?._id) === String(benId),
          );
          const done = passenger?.status === 'picked_up' || passenger?.status === 'dropped_off';

          return (
            <View key={`${wp.order}-${idx}`} style={[styles.stopCard, done && { opacity: 0.6 }]}>
              <View style={styles.stopHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopTitle}>
                    #{wp.order} {benName}
                  </Text>
                  <Text style={styles.stopAddr}>{wp.address ?? `${wp.lat?.toFixed?.(4)}, ${wp.lng?.toFixed?.(4)}`}</Text>
                </View>
                {eta && (
                  <Text style={[styles.stopEta, eta.delay_minutes && eta.delay_minutes > 5 ? styles.late : null]}>
                    {eta.live_eta}
                    {eta.delay_minutes != null && eta.delay_minutes !== 0 && ` (${eta.delay_minutes > 0 ? '+' : ''}${eta.delay_minutes}د)`}
                  </Text>
                )}
              </View>
              <View style={styles.btnRow}>
                {link && (
                  <>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#22d3ee' }]} onPress={() => Linking.openURL(link.waze)}>
                      <Text style={styles.btnText}>Waze</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#4285F4' }]} onPress={() => Linking.openURL(link.google)}>
                      <Text style={styles.btnText}>Google</Text>
                    </TouchableOpacity>
                  </>
                )}
                {!done && benId && data.trip.trip_type === 'morning_pickup' && (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: '#16a34a' }]}
                    disabled={!position || actionBusy === benId}
                    onPress={() => handlePickupAt(String(benId))}
                  >
                    <Text style={styles.btnText}>✓ استلام</Text>
                  </TouchableOpacity>
                )}
                {!done && benId && data.trip.trip_type === 'afternoon_dropoff' && (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: '#16a34a' }]}
                    disabled={!position || actionBusy === benId}
                    onPress={() => handleDropoffAt(String(benId))}
                  >
                    <Text style={styles.btnText}>🏠 توصيل</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  empty: { fontSize: 16, color: '#6b7280' },
  error: { color: '#dc2626', marginTop: 8 },
  ok: { color: '#16a34a', fontSize: 14 },
  warn: { color: '#f59e0b', fontSize: 13, marginTop: 4 },
  headerCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  card: {
    backgroundColor: '#fff',
    margin: 12,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  nextStopText: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', margin: 12, marginBottom: 6 },
  stopCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 6,
    borderLeftColor: '#2563eb',
  },
  stopHead: { flexDirection: 'row-reverse', marginBottom: 8 },
  stopTitle: { fontSize: 16, fontWeight: '700' },
  stopAddr: { fontSize: 13, color: '#6b7280' },
  stopEta: { fontSize: 14, fontWeight: '600' },
  late: { color: '#dc2626' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  btnLg: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
