/**
 * GPS Service for React Native
 * خدمة قراءة وإرسال مواقع GPS
 */

import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export class GPSService {
  static locationWatchId = null;
  static uploadInterval = null;

  /**
   * ابدأ مراقبة الموقع
   * @param {Function} onLocationUpdate - دالة تُستدعى عند تحديث الموقع
   * @param {number} updateInterval - الفترة الزمنية بالثواني
   */
  static startLocationTracking(onLocationUpdate, updateInterval = 10000) {
    return new Promise((resolve, reject) => {
      this.locationWatchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, accuracy, altitude } = position.coords;

          const locationData = {
            latitude,
            longitude,
            speed: Math.round(speed * 3.6), // Convert m/s to km/h
            accuracy,
            altitude,
            timestamp: new Date(),
          };

          onLocationUpdate(locationData);
          resolve(locationData);
        },
        (error) => {
          console.error('GPS Error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: updateInterval,
        }
      );
    });
  }

  /**
   * أوقف مراقبة الموقع
   */
  static stopLocationTracking() {
    if (this.locationWatchId) {
      Geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }

  /**
   * ارفع الموقع إلى الخادم
   * @param {object} location - بيانات الموقع
   * @param {string} driverId - معرف السائق
   */
  static async uploadLocation(location, driverId) {
    try {
      const payload = {
        driverId,
        coordinates: {
          longitude: location.longitude,
          latitude: location.latitude,
        },
        speed: location.speed,
        accuracy: location.accuracy,
        altitude: location.altitude,
        engineRunning: true,
        seatbeltStatus: 'fastened',
        timestamp: location.timestamp,
      };

      const response = await axios.post(`${API_BASE_URL}/gps/location`, payload);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Upload Location Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * احصل على السرعة الحالية
   */
  static getCurrentSpeed() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve(Math.round(position.coords.speed * 3.6));
        },
        (error) => reject(error)
      );
    });
  }

  /**
   * احصل على المسافة بين نقطتين (Haversine Formula)
   */
  static getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * احصل على سجل الموقع
   */
  static async getLocationHistory(driverId, hours = 24) {
    try {
      const response = await axios.get(`${API_BASE_URL}/gps/history/${driverId}`, {
        params: {
          hours,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Get History Error:', error.message);
      throw error;
    }
  }

  /**
   * احصل على سلوك القيادة
   */
  static async getDrivingBehavior(driverId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/gps/behavior/${driverId}`);
      return response.data;
    } catch (error) {
      console.error('Get Behavior Error:', error.message);
      throw error;
    }
  }

  /**
   * احصل على التنبيهات النشطة
   */
  static async getActiveAlerts(driverId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/gps/active-alerts/${driverId}`);
      return response.data;
    } catch (error) {
      console.error('Get Alerts Error:', error.message);
      throw error;
    }
  }

  /**
   * اعترف بالتنبيه
   */
  static async acknowledgeAlert(locationId, alertIndex) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/gps/acknowledge-alert/${locationId}/${alertIndex}`
      );
      return response.data;
    } catch (error) {
      console.error('Acknowledge Alert Error:', error.message);
      throw error;
    }
  }
}

export default GPSService;
