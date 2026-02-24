/**
 * React Native Driver Tracking App - Phase 32
 * تطبيق الموبايل الذكي لتتبع السائقين
 * 
 * يتطلب:
 * - React Native 0.72+
 * - React Navigation
 * - Axios
 * - React Native Maps
 * - React Native Geolocation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TabBarIOS,
  AppState,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const DriverTrackingApp = () => {
  // ===== STATE =====
  const [activeTab, setActiveTab] = useState(0);
  const [driverData, setDriverData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [performanceScore, setPerformanceScore] = useState(0);
  const [appState, setAppState] = useState(AppState.currentState);

  const locationWatchRef = useRef(null);
  const uploadIntervalRef = useRef(null);

  // ===== PERMISSIONS =====
  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'تتبع الموقع',
              message: 'نحتاج لتتبع موقعك أثناء القيادة',
              buttonNeutral: 'اسأل لاحقاً',
              buttonNegative: 'إلغاء',
              buttonPositive: 'موافق',
            }
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            startTracking();
          }
        } catch (err) {
          console.warn(err);
        }
      } else {
        startTracking();
      }
    };

    requestLocationPermission();
  }, []);

  // ===== APP STATE =====
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // التطبيق استيقظ
      if (isTracking) {
        startTracking();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // التطبيق في الخلفية - استمر في التتبع
      console.log('تطبيق في الخلفية - استمر في التتبع');
    }

    setAppState(nextAppState);
  };

  // ===== LOCATION TRACKING =====
  const startTracking = () => {
    setIsTracking(true);

    // مراقب الموقع - تحديث كل 10 ثواني
    locationWatchRef.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: gpsSpeed, accuracy } = position.coords;

        setCurrentLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(),
        });

        setSpeed(Math.round(gpsSpeed * 3.6)); // تحويل m/s إلى km/h
      },
      (error) => {
        console.error('خطأ الموقع:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    // ===== UPLOAD LOCATION EVERY 30 SECONDS =====
    uploadIntervalRef.current = setInterval(() => {
      if (currentLocation && driverData) {
        uploadLocationToDB();
      }
    }, 30000);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (locationWatchRef.current) {
      Geolocation.clearWatch(locationWatchRef.current);
    }
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
    }
  };

  // ===== UPLOAD LOCATION =====
  const uploadLocationToDB = async () => {
    try {
      if (!currentLocation || !driverData) return;

      const payload = {
        driverId: driverData._id,
        coordinates: {
          longitude: currentLocation.longitude,
          latitude: currentLocation.latitude,
        },
        speed,
        accuracy: currentLocation.accuracy,
        engineRunning: true,
        seatbeltStatus: 'fastened', // يمكن الحصول من مستشعرات المركبة
      };

      const response = await axios.post(`${API_BASE_URL}/gps/location`, payload);

      if (response.data.location?.alerts) {
        // عرض التنبيهات
        showAlert(response.data.location.alerts);
      }
    } catch (error) {
      console.error('خطأ في رفع الموقع:', error.message);
    }
  };

  // ===== FETCH UNREAD NOTIFICATIONS =====
  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/unread`, {
        params: {
          userId: driverData?._id,
          limit: 10,
        },
      });

      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error.message);
    }
  };

  // ===== FETCH PERFORMANCE =====
  const fetchPerformance = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/drivers/${driverData?._id}/performance`
      );

      setPerformanceScore(response.data.report?.performanceMetrics?.overallRating || 0);
    } catch (error) {
      console.error('خطأ في جلب الأداء:', error.message);
    }
  };

  // ===== SHOW ALERT =====
  const showAlert = (alerts) => {
    alerts.forEach((alert) => {
      console.log(`🚨 تنبيه: ${alert.message}`);
      // عرض نوتيفيكيشن على الشاشة
    });
  };

  // ===== UI COMPONENTS =====

  // Tab 1: Dashboard
  const DashboardTab = () => (
    <View style={styles.container}>
      <Text style={styles.title}>لوحة التحكم</Text>

      {currentLocation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 الموقع الحالي</Text>
          <Text style={styles.cardText}>
            خط العرض: {currentLocation.latitude.toFixed(6)}
          </Text>
          <Text style={styles.cardText}>
            خط الطول: {currentLocation.longitude.toFixed(6)}
          </Text>
          <Text style={styles.cardText}>دقة: ±{currentLocation.accuracy.toFixed(0)} م</Text>
        </View>
      ) : (
        <Text style={styles.loadingText}>جاري تحديد الموقع...</Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ السرعة</Text>
        <Text style={[styles.largeText, { color: speed > 120 ? '#FF6B6B' : '#51CF66' }]}>
          {speed} كم/س
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 درجة الأداء</Text>
        <Text style={styles.largeText}>{performanceScore.toFixed(1)} / 5</Text>
      </View>

      <View style={[styles.card, { backgroundColor: isTracking ? '#D3F9D8' : '#FFE0E0' }]}>
        <Text style={styles.cardTitle}>
          {isTracking ? '✅ التتبع مفعل' : '❌ التتبع معطل'}
        </Text>
        <Text
          style={styles.button}
          onPress={isTracking ? stopTracking : startTracking}
        >
          {isTracking ? 'إيقاف التتبع' : 'بدء التتبع'}
        </Text>
      </View>
    </View>
  );

  // Tab 2: Notifications
  const NotificationsTab = () => (
    <View style={styles.container}>
      <Text style={styles.title}>الإشعارات</Text>

      {notifications.length > 0 ? (
        notifications.map((notif, index) => (
          <View key={index} style={[
            styles.notificationCard,
            { borderLeftColor: notif.priority === 'critical' ? '#FF6B6B' : '#4ECDC4' },
          ]}>
            <Text style={styles.notifTitle}>{notif.title}</Text>
            <Text style={styles.notifMessage}>{notif.message}</Text>
            <Text style={styles.notifTime}>
              {new Date(notif.createdAt).toLocaleString('ar-SA')}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>لا توجد إشعارات</Text>
      )}

      <Text
        style={[styles.button, { marginTop: 20 }]}
        onPress={fetchNotifications}
      >
        تحديث الإشعارات
      </Text>
    </View>
  );

  // Tab 3: History
  const HistoryTab = () => (
    <View style={styles.container}>
      <Text style={styles.title}>السجل</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📈 إحصائيات اليوم</Text>
        <Text style={styles.cardText}>
          المسافة: تحديث قريباً
        </Text>
        <Text style={styles.cardText}>
          متوسط السرعة: تحديث قريباً
        </Text>
        <Text style={styles.cardText}>
          وقت القيادة: تحديث قريباً
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚠️ الانتهاكات</Text>
        <Text style={styles.cardText}>عدد الانتهاكات: 0</Text>
        <Text style={styles.cardText}>آخر انتهاك: -</Text>
      </View>
    </View>
  );

  // ===== MAIN RENDER =====
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* TAB CONTENT */}
        {activeTab === 0 && <DashboardTab />}
        {activeTab === 1 && <NotificationsTab />}
        {activeTab === 2 && <HistoryTab />}

        {/* TAB BAR */}
        <TabBarIOS
          unselectedTintColor="#999"
          tintColor="#4ECDC4"
          barTintColor="#FFF"
          style={styles.tabBar}
        >
          <TabBarIOS.Item
            icon={{ uri: 'square_filled' }}
            title="لوحة التحكم"
            selected={activeTab === 0}
            onPress={() => setActiveTab(0)}
          />
          <TabBarIOS.Item
            icon={{ uri: 'square_filled' }}
            title="الإشعارات"
            selected={activeTab === 1}
            onPress={() => setActiveTab(1)}
            badge={notifications.filter((n) => !n.channels.inApp.read).length}
          />
          <TabBarIOS.Item
            icon={{ uri: 'square_filled' }}
            title="السجل"
            selected={activeTab === 2}
            onPress={() => setActiveTab(2)}
          />
        </TabBarIOS>
      </View>
    </SafeAreaView>
  );
};

// ===== STYLES =====
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
  },
  largeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4ECDC4',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4ECDC4',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: '600',
    overflow: 'hidden',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 40,
  },
  notificationCard: {
    backgroundColor: '#FFF',
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 12,
    color: '#999',
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
});

export default DriverTrackingApp;
