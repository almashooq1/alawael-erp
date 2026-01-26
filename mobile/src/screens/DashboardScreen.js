/**
 * PHASE 15: MOBILE APPLICATION
 * React Native - iOS/Android Support
 * AlAwael ERP Mobile v1.0 | 2026-01-24
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import PushNotification from 'react-native-push-notification';

// ============================================================================
// 1. MOBILE API CLIENT
// ============================================================================
export class MobileAPIClient {
  constructor(baseURL = 'https://api.alawael.com') {
    this.baseURL = baseURL;
    this.authToken = null;
    this.isOffline = false;
    this.pendingRequests = [];
  }

  /**
   * Configure offline sync
   */
  async initializeOfflineSync() {
    try {
      const unsubscribe = NetInfo.addEventListener(state => {
        this.isOffline = !state.isConnected;
        if (state.isConnected && this.pendingRequests.length > 0) {
          this.syncPendingRequests();
        }
      });

      return { success: true, monitoring: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Make API request with offline fallback
   */
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        ...options.headers,
      };

      if (this.isOffline) {
        return await this.getOfflineData(endpoint);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Cache response for offline use
      await this.cacheData(endpoint, data);

      return { success: true, data };
    } catch (error) {
      // Return cached data if offline
      return await this.getOfflineData(endpoint);
    }
  }

  /**
   * Cache data for offline use
   */
  async cacheData(key, data) {
    try {
      await AsyncStorage.setItem(
        `cache_${key}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  /**
   * Get cached offline data
   */
  async getOfflineData(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (cached) {
        const { data } = JSON.parse(cached);
        return { success: true, data, offline: true };
      }
      return { success: false, error: 'No cached data' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync pending requests when online
   */
  async syncPendingRequests() {
    try {
      for (const request of this.pendingRequests) {
        await this.request(request.endpoint, request.options);
      }
      this.pendingRequests = [];
      return { success: true, synced: this.pendingRequests.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// 2. DASHBOARD SCREEN
// ============================================================================
export const DashboardScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const apiClient = new MobileAPIClient();

  useEffect(() => {
    loadDashboardData();
    setupNetworkListener();
  }, []);

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    return unsubscribe;
  };

  const loadDashboardData = async () => {
    try {
      const response = await apiClient.request('/api/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {!isOnline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>📡 Offline Mode</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AlAwael ERP</Text>
          <Text style={styles.subtitle}>Dashboard</Text>
        </View>

        {/* Statistics Cards */}
        <View style={styles.cardContainer}>
          <StatCard
            title="Total Sales"
            value={data?.sales?.total || '0'}
            trend="+12.5%"
            icon="💰"
          />
          <StatCard title="Active Users" value={data?.users?.active || '0'} trend="+5%" icon="👥" />
          <StatCard title="Inventory" value={data?.inventory?.items || '0'} trend="-2%" icon="📦" />
          <StatCard
            title="Revenue"
            value={data?.revenue?.current || '0'}
            trend="+18.2%"
            icon="📈"
          />
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {data?.transactions?.slice(0, 5).map((tx, idx) => (
            <TransactionItem key={idx} transaction={tx} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>➕ New Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📦 Update Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>👤 Customer Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// 3. COMPONENTS
// ============================================================================
const StatCard = ({ title, value, trend, icon }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={[styles.statTrend, trend.startsWith('+') ? styles.positive : styles.negative]}>
      {trend}
    </Text>
  </View>
);

const TransactionItem = ({ transaction }) => (
  <View style={styles.transactionItem}>
    <View style={styles.transactionInfo}>
      <Text style={styles.transactionTitle}>{transaction.description}</Text>
      <Text style={styles.transactionDate}>{transaction.date}</Text>
    </View>
    <Text
      style={[
        styles.transactionAmount,
        transaction.type === 'income' ? styles.income : styles.expense,
      ]}
    >
      {transaction.type === 'income' ? '+' : '-'} {transaction.amount}
    </Text>
  </View>
);

// ============================================================================
// 4. AUTHENTICATION SCREEN
// ============================================================================
export const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const apiClient = new MobileAPIClient();

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success) {
        const token = response.data.token;
        apiClient.setAuthToken(token);
        await AsyncStorage.setItem('authToken', token);
        onLogin(token);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginForm}>
        <Text style={styles.loginTitle}>AlAwael ERP</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ============================================================================
// 5. PUSH NOTIFICATIONS
// ============================================================================
export class MobilePushNotifications {
  static initialize() {
    PushNotification.configure({
      onNotification(notification) {
        console.log('Notification received:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
    });
  }

  static sendLocalNotification(title, message) {
    PushNotification.localNotification({
      title,
      message,
      bigText: message,
      subText: 'AlAwael ERP',
    });
  }
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  offlineBar: {
    backgroundColor: '#FF9500',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  cardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  positive: {
    color: '#34C759',
  },
  negative: {
    color: '#FF3B30',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  income: {
    color: '#34C759',
  },
  expense: {
    color: '#FF3B30',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loginForm: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default {
  MobileAPIClient,
  DashboardScreen,
  LoginScreen,
  MobilePushNotifications,
};
