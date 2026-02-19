/**
 * Dashboard Screen - React Native
 * شاشة لوحة التحكم الرئيسية
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GPSService from '../../services/GPSService';
import NotificationService from '../../services/NotificationService';

const DashboardScreen = ({ navigation }) => {
  const [driverData, setDriverData] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    initializeDashboard();

    // مراقب دوري للإشعارات (كل 30 ثانية)
    const notificationInterval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(notificationInterval);
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      // حمل بيانات السائق
      // يمكن الحصول من Redux أو AsyncStorage أو API
      await fetchUnreadCount();
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
  };

  const fetchUnreadCount = async () => {
    try {
      // استبدل userId بالبيانات الفعلية
      const userId = 'current_driver_id';
      const count = await NotificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
    }
  };

  const startTracking = async () => {
    try {
      setIsTracking(true);
      await GPSService.startLocationTracking(
        (location) => {
          setLocation(location);
          setCurrentSpeed(location.speed);
        },
        10000 // كل 10 ثواني
      );

      Alert.alert('نجح', 'بدأ تتبع الموقع بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل بدء التتبع');
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    GPSService.stopLocationTracking();
    setIsTracking(false);
    Alert.alert('إيقاف', 'تم إيقاف التتبع');
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* الرأس الترحيبي */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرحباً بك</Text>
          <Text style={styles.subGreeting}>محمد أحمد الشهري</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Icon name="cog" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* حالة التتبع */}
      <View
        style={[
          styles.statusCard,
          { backgroundColor: isTracking ? '#D3F9D8' : '#FFE0E0' },
        ]}
      >
        <View style={styles.statusContent}>
          <Icon
            name={isTracking ? 'check-circle' : 'alert-circle'}
            size={32}
            color={isTracking ? '#51CF66' : '#FF6B6B'}
          />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              {isTracking ? '✅ التتبع مفعل' : '❌ التتبع معطل'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isTracking ? 'يتم تتبع موقعك الآن' : 'اضغط للبدء'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={toggleTracking}
          style={[
            styles.trackingButton,
            { backgroundColor: isTracking ? '#FF6B6B' : '#51CF66' },
          ]}
        >
          <Text style={styles.trackingButtonText}>
            {isTracking ? 'إيقاف' : 'بدء'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* السرعة الحالية */}
      <View style={styles.gridContainer}>
        <View
          style={[
            styles.gridItem,
            { backgroundColor: currentSpeed > 120 ? '#FFE0E0' : '#D3F9D8' },
          ]}
        >
          <Icon
            name="speedometer"
            size={32}
            color={currentSpeed > 120 ? '#FF6B6B' : '#51CF66'}
          />
          <Text style={styles.gridTitle}>السرعة الحالية</Text>
          <Text style={styles.gridValue}>{currentSpeed} كم/س</Text>
          <Text style={styles.gridSubtext}>
            {currentSpeed > 120 ? '⚠️ سرعة عالية' : '✅ سرعة آمنة'}
          </Text>
        </View>

        {/* الإشعارات */}
        <TouchableOpacity
          style={styles.gridItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Notifications')}
        >
          <View style={styles.badgeContainer}>
            <Icon name="bell" size={32} color="#4ECDC4" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.gridTitle}>الإشعارات</Text>
          <Text style={styles.gridValue}>{unreadCount} جديدة</Text>
          <Text style={styles.gridSubtext}>اضغط للعرض</Text>
        </TouchableOpacity>
      </View>

      {/* موقع البحث */}
      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.cardTitle}>📍 الموقع الحالي</Text>
          <View style={styles.locationInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>خط العرض:</Text>
              <Text style={styles.infoValue}>
                {location.latitude.toFixed(6)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>خط الطول:</Text>
              <Text style={styles.infoValue}>
                {location.longitude.toFixed(6)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الدقة:</Text>
              <Text style={styles.infoValue}>±{Math.round(location.accuracy)} م</Text>
            </View>
          </View>
        </View>
      )}

      {/* الإحصائيات السريعة */}
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>📊 إحصائيات اليوم</Text>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>المسافة</Text>
            <Text style={styles.statValue}>-- كم</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>الوقت</Text>
            <Text style={styles.statValue}>-- ساعة</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>الانتهاكات</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>
      </View>

      {/* الأزرار السريعة */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Map')}
        >
          <Icon name="map" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>الخريطة</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
          activeOpacity={0.7}
        >
          <Icon name="phone" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>الدعم</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FFB647' }]}
          activeOpacity={0.7}
        >
          <Icon name="file-document" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>التقارير</Text>
        </TouchableOpacity>
      </View>

      {/* المسافة البيضاء في النهاية */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: '#D3F9D8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trackingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trackingButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#D3F9D8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  gridTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  gridSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  locationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  locationInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4ECDC4',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default DashboardScreen;
