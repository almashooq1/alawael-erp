/**
 * Map Screen - React Native
 * شاشة الخريطة لعرض موقع السائق
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import GPSService from '../../services/GPSService';
import Geolocation from '@react-native-community/geolocation';

const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const mapRef = React.useRef(null);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      setLoading(true);

      // احصل على الموقع الحالي
      Geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;

        const initialLocation = {
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        setLocation(initialLocation);

        // ابدأ مراقبة الموقع
        startLocationTracking();
      });
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل الخريطة');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      await GPSService.startLocationTracking((newLocation) => {
        // تحديث الموقع الحالي
        setLocation((prev) => ({
          ...prev,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
        }));

        // أضف إلى المسار
        setRoute((prev) => [
          ...prev,
          {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
          },
        ]);
      });
    } catch (error) {
      console.error('خطأ في تتبع الموقع:', error);
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: location.latitudeDelta / 2,
        longitudeDelta: location.longitudeDelta / 2,
      });
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        ...location,
        latitudeDelta: location.latitudeDelta * 2,
        longitudeDelta: location.longitudeDelta * 2,
      });
    }
  };

  const handleCenterMap = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const handleClearRoute = () => {
    Alert.alert('مسح المسار', 'هل تريد مسح المسار المسجل؟', [
      { text: 'إلغاء', onPress: () => {} },
      {
        text: 'مسح',
        onPress: () => setRoute([]),
        style: 'destructive',
      },
    ]);
  };

  const handleFindNearby = async () => {
    try {
      if (!location) return;

      // البحث عن سائقين بالقرب من الموقع الحالي
      // const nearby = await GPSService.getNearbyDrivers(
      //   location.longitude,
      //   location.latitude,
      //   5000 // 5 km
      // );

      Alert.alert('البحث', 'جاري البحث عن سائقين بالقرب منك...');
    } catch (error) {
      Alert.alert('خطأ', 'فشل البحث');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <Text>فشل تحميل الموقع</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* الخريطة */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={location}
        onMapReady={() => setMapReady(true)}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
      >
        {/* موقع السائق الحالي */}
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="موقعك الحالي"
          description="أنت هنا"
          pinColor="#4ECDC4"
        />

        {/* دائرة حول الموقع الحالي (دقة الموقع) */}
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={100}
          strokeColor="rgba(78, 205, 196, 0.3)"
          fillColor="rgba(78, 205, 196, 0.1)"
        />

        {/* المسار المسجل */}
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor="#4ECDC4"
            strokeWidth={3}
            lineDashPattern={[0]}
          />
        )}

        {/* السائقون القريبون */}
        {nearbyDrivers.map((driver, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: driver.location.latitude,
              longitude: driver.location.longitude,
            }}
            title={driver.name}
            description={`${driver.distance} كم بعيد`}
            pinColor="#FF6B6B"
          />
        ))}
      </MapView>

      {/* الأزرار العائمة - الزوايا */}
      <View style={styles.controlsContainer}>
        {/* أزرار التكبير والتصغير */}
        <View style={styles.zoomButtons}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={handleZoomIn}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={24} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomButton}
            onPress={handleZoomOut}
            activeOpacity={0.7}
          >
            <Icon name="minus" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4ECDC4' }]}
            onPress={handleCenterMap}
            activeOpacity={0.7}
          >
            <Icon name="crosshairs-gps" size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FFB647' }]}
            onPress={handleFindNearby}
            activeOpacity={0.7}
          >
            <Icon name="account-multiple-plus" size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
            onPress={handleClearRoute}
            activeOpacity={0.7}
          >
            <Icon name="trash-can" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* معلومات الموقع الحالي */}
      <View style={styles.infoPanel}>
        <View style={styles.infoContent}>
          <View>
            <Text style={styles.infoLabel}>الموقع الحالي</Text>
            <Text style={styles.infoValue}>
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View>
            <Text style={styles.infoLabel}>المسار المسجل</Text>
            <Text style={styles.infoValue}>{route.length} نقطة</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  map: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  zoomButtons: {
    marginBottom: 12,
  },
  zoomButton: {
    backgroundColor: '#FFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
  },
  actionButtons: {
    marginTop: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 5,
  },
  infoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#EEE',
  },
});

export default MapScreen;
