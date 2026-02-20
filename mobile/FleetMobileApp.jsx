/**
 * Smart Fleet Mobile App - React Native
 * تطبيق الهاتف الذكي لتتبع الحافلات
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import io from 'socket.io-client';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FleetMobileApp = ({ userType = 'driver' }) => {
  // ====== حالة التطبيق ======
  const [data, setData] = useState({
    vehicles: [],
    alerts: [],
    stats: null,
    selectedVehicle: null
  });
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('home');
  const socketRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ====== الاتصال بـ WebSocket ======
  useEffect(() => {
    setupWebSocket();
    loadInitialData();
    return () => socketRef.current?.disconnect();
  }, []);

  const setupWebSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      socketRef.current = io('http://192.168.1.100:5000', {
        auth: {
          token,
          userId,
          userType
        }
      });

      // الاستماع للأحداث
      socketRef.current.on('fleet_update', (update) => {
        setData(prev => ({
          ...prev,
          vehicles: update.vehicles,
          stats: update.stats
        }));
      });

      socketRef.current.on('alert_notification', (alert) => {
        setData(prev => ({
          ...prev,
          alerts: [alert, ...prev.alerts].slice(0, 10)
        }));
        playAlertSound();
      });

    } catch (error) {
      console.error('خطأ في الاتصال:', error);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        userType === 'driver' 
          ? `http://192.168.1.100:5000/api/gps/driver/dashboard`
          : `http://192.168.1.100:5000/api/gps/manager/dashboard`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const playAlertSound = () => {
    // تشغيل صوت التنبيه
    console.log('تشغيل صوت التنبيه');
  };

  // ====== آنيميشن الفتح ======
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  }, [selectedTab]);

  if (loading && data.vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ====== الرأس ====== */}
      {userType === 'driver' ? (
        <DriverHeader data={data} />
      ) : (
        <ManagerHeader data={data} />
      )}

      {/* ====== المحتوى الرئيسي ====== */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'home' && (
          <HomeTab data={data} setSelectedVehicle={(v) => setData(prev => ({ ...prev, selectedVehicle: v }))} />
        )}
        {selectedTab === 'map' && <MapTab vehicles={data.vehicles} />}
        {selectedTab === 'alerts' && <AlertsTab alerts={data.alerts} />}
        {selectedTab === 'stats' && <StatsTab data={data} />}
      </ScrollView>

      {/* ====== شريط التنقل السفلي ====== */

      <BottomNav 
        selectedTab={selectedTab} 
        onSelectTab={setSelectedTab}
        userType={userType}
      />
    </View>
  );
};

// ====== مكونات الرأس ======

const DriverHeader = ({ data }) => (
  <View style={styles.header}>
    <View style={styles.headerContent}>
      <Text style={styles.headerTitle}>🚌 لوحتك الشخصية</Text>
      <Text style={styles.headerSubtitle}>
        {data.vehicles.length === 0 ? 'لا توجد رحلات' : data.vehicles[0]?.plateNumber}
      </Text>
    </View>
    <View style={styles.statusBadge}>
      <Text style={styles.statusText}>نشط</Text>
    </View>
  </View>
);

const ManagerHeader = ({ data }) => (
  <View style={styles.header}>
    <View style={styles.headerContent}>
      <Text style={styles.headerTitle}>📊 لوحة المدير</Text>
      <Text style={styles.headerSubtitle}>
        {data.stats?.total || 0} مركبات
      </Text>
    </View>
    <View style={styles.statBadges}>
      <Badge 
        color="#2ecc71"
        value={(data.stats?.active || 0).toString()}
        label="نشطة"
      />
      <Badge 
        color="#e74c3c"
        value={(data.alerts?.length || 0).toString()}
        label="تنبيهات"
      />
    </View>
  </View>
);

const Badge = ({ color, value, label }) => (
  <View style={[styles.badge, { backgroundColor: color }]}>
    <Text style={styles.badgeValue}>{value}</Text>
    <Text style={styles.badgeLabel}>{label}</Text>
  </View>
);

// ====== تبويبات المحتوى ======

const HomeTab = ({ data, setSelectedVehicle }) => (
  <Animated.View style={[styles.tab, { opacity: 1 }]}>
    {/* الإحصائيات السريعة */}
    <View style={styles.quickStatsContainer}>
      <QuickStat icon="🚌" value={data.vehicles.length} label="المركبات" />
      <QuickStat icon="⚠️" value={data.alerts.length} label="التنبيهات" />
      <QuickStat icon="⛽" value={Math.round(data.stats?.avgFuel || 0)} label="الوقود %" />
      <QuickStat icon="⏱️" value={Math.round(data.stats?.avgSpeed || 0)} label="السرعة" />
    </View>

    {/* قائمة المركبات */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>المركبات النشطة</Text>
      <FlatList
        scrollEnabled={false}
        data={data.vehicles}
        renderItem={({ item }) => (
          <VehicleCard 
            vehicle={item}
            onPress={() => setSelectedVehicle(item)}
          />
        )}
        keyExtractor={item => item._id}
      />
    </View>

    {/* التنبيهات الأخيرة */}
    {data.alerts.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>التنبيهات الأخيرة</Text>
        <FlatList
          scrollEnabled={false}
          data={data.alerts.slice(0, 3)}
          renderItem={({ item }) => (
            <AlertItem alert={item} />
          )}
          keyExtractor={(item, idx) => idx.toString()}
        />
      </View>
    )}
  </Animated.View>
);

const MapTab = ({ vehicles }) => (
  <View style={styles.tab}>
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: vehicles[0]?.location?.latitude || 24.7136,
        longitude: vehicles[0]?.location?.longitude || 46.6753,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
    >
      {vehicles.map(vehicle => (
        <Marker
          key={vehicle._id}
          coordinate={{
            latitude: vehicle.location?.latitude || 0,
            longitude: vehicle.location?.longitude || 0
          }}
          title={vehicle.plateNumber}
          description={`${vehicle.currentSpeed} كم/س`}
        />
      ))}
    </MapView>
  </View>
);

const AlertsTab = ({ alerts }) => (
  <View style={styles.tab}>
    <FlatList
      data={alerts}
      renderItem={({ item }) => (
        <AlertCard alert={item} />
      )}
      keyExtractor={(item, idx) => idx.toString()}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>✅ لا توجد تنبيهات</Text>
        </View>
      }
    />
  </View>
);

const StatsTab = ({ data }) => (
  <View style={styles.tab}>
    <Text style={styles.sectionTitle}>إحصائيات الأداء</Text>
    
    {/* رسم بياني الوقود */}
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>استهلاك الوقود</Text>
      <BarChart
        data={{
          labels: ['8', '10', '12', '2', '4', '6'],
          datasets: [{ data: [5.2, 6.1, 7.3, 6.8, 7.5, 8.2] }]
        }}
        width={Dimensions.get('window').width - 40}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
      />
    </View>

    {/* رسم بياني الأداء */}
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>درجة الأداء</Text>
      <PieChart
        data={{
          labels: ['ممتاز', 'جيد', 'متوسط'],
          datasets: [{ data: [65, 25, 10] }]
        }}
        width={Dimensions.get('window').width - 40}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
      />
    </View>
  </View>
);

// ====== المكونات المساعدة ======

const QuickStat = ({ icon, value, label }) => (
  <View style={styles.quickStat}>
    <Text style={styles.quickStatIcon}>{icon}</Text>
    <Text style={styles.quickStatValue}>{value}</Text>
    <Text style={styles.quickStatLabel}>{label}</Text>
  </View>
);

const VehicleCard = ({ vehicle, onPress }) => (
  <TouchableOpacity style={styles.vehicleCard} onPress={onPress}>
    <View style={styles.vehicleCardHeader}>
      <Text style={styles.vehicleNumber}>{vehicle.plateNumber}</Text>
      <View style={[
        styles.statusTag,
        { backgroundColor: vehicle.status === 'active' ? '#2ecc71' : '#e74c3c' }
      ]}>
        <Text style={styles.statusTagText}>
          {vehicle.status === 'active' ? 'نشطة' : 'معطلة'}
        </Text>
      </View>
    </View>
    
    <View style={styles.vehicleCardBody}>
      <StatRow icon="🚗" label="النوع" value={vehicle.type} />
      <StatRow icon="⚡" label="السرعة" value={`${vehicle.currentSpeed} كم/س`} />
      <StatRow icon="⛽" label="الوقود" value={`${vehicle.fuel}%`} />
      <StatRow icon="👤" label="السائق" value={vehicle.driver || 'لم يتم التعيين'} />
    </View>
  </TouchableOpacity>
);

const StatRow = ({ icon, label, value }) => (
  <View style={styles.statRow}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const AlertItem = ({ alert }) => (
  <View style={[
    styles.alertItem,
    {
      backgroundColor: alert.severity === 'critical' ? '#fadbd8' : '#fdebd0'
    }
  ]}>
    <Text style={styles.alertMessage}>{alert.message}</Text>
    <Text style={styles.alertTime}>
      {new Date(alert.timestamp).toLocaleTimeString('ar-SA')}
    </Text>
  </View>
);

const AlertCard = ({ alert }) => (
  <View style={[
    styles.alertCard,
    {
      borderLeftColor: alert.severity === 'critical' ? '#e74c3c' : '#f39c12'
    }
  ]}>
    <View style={styles.alertCardHeader}>
      <Text style={styles.alertCardTitle}>{alert.message}</Text>
      <Text style={styles.alertCardTime}>
        {new Date(alert.timestamp).toLocaleTimeString('ar-SA')}
      </Text>
    </View>
    <Text style={styles.alertCardRecommendation}>
      💡 {alert.recommendation}
    </Text>
  </View>
);

// ====== شريط التنقل ======

const BottomNav = ({ selectedTab, onSelectTab, userType }) => {
  const tabs = userType === 'driver' 
    ? ['home', 'map', 'alerts', 'stats']
    : ['home', 'map', 'alerts', 'stats'];

  const tabLabels = {
    home: '🏠 الرئيسية',
    map: '🗺️ الخريطة',
    alerts: '🚨 التنبيهات',
    stats: '📊 الإحصائيات'
  };

  return (
    <View style={styles.bottomNav}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.navButton,
            selectedTab === tab && styles.navButtonActive
          ]}
          onPress={() => onSelectTab(tab)}
        >
          <Text style={styles.navButtonText}>{tabLabels[tab]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ====== الأنماط ======

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#667eea',
    color: 'white',
    paddingTop: 40,
    paddingHorizontal: 15,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  statusBadge: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold'
  },
  statBadges: {
    flexDirection: 'row',
    gap: 10
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  badgeValue: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  badgeLabel: {
    color: 'white',
    fontSize: 10,
    marginTop: 2
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  tab: {
    padding: 15
  },
  quickStatsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  quickStat: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 5
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 3
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 10
  },
  vehicleCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 10
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#2ecc71'
  },
  statusTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  vehicleCardBody: {
    gap: 8
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  statIcon: {
    fontSize: 16,
    width: 20
  },
  statLabel: {
    flex: 1,
    color: '#7f8c8d',
    fontSize: 12
  },
  statValue: {
    fontWeight: '600',
    color: '#667eea'
  },
  alertItem: {
    backgroundColor: '#fdebd0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12'
  },
  alertMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5
  },
  alertTime: {
    fontSize: 11,
    color: '#7f8c8d'
  },
  alertCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  alertCardHeader: {
    marginBottom: 8
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50'
  },
  alertCardTime: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 4
  },
  alertCardRecommendation: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic'
  },
  map: {
    width: '100%',
    height: 400,
    borderRadius: 10,
    marginVertical: 10
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10
  },
  chart: {
    borderRadius: 8
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d'
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingBottom: 10
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: 'transparent'
  },
  navButtonActive: {
    borderTopColor: '#667eea'
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea'
  }
});

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5
};

export default FleetMobileApp;
