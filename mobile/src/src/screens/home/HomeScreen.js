/**
 * Home Screen - Mobile App
 * شاشة الرئيسية - تطبيق الهاتف الذكي
 *
 * Features:
 * ✅ License Status Cards
 * ✅ Quick Actions
 * ✅ Recent Notifications
 * ✅ Upcoming Renewals
 * ✅ Analytics Overview
 * ✅ Pull to Refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from '@react-native-vector-icons/material-community';
import mobileApiService from '../../services/mobileApiService';

const { width, height } = Dimensions.get('window');

/**
 * License Status Card Component
 */
const LicenseCard = ({ license, onPress }) => {
  const { theme } = useTheme();
  const getStatusColor = status => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'expiring':
        return '#FF9800';
      case 'expired':
        return '#F44336';
      default:
        return '#2196F3';
    }
  };

  const statusColor = getStatusColor(license.status);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{license.type}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.text + '99' }]}>{license.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {license.status === 'active' && '✓ نشطة'}
            {license.status === 'expiring' && '⚠️ تنتهي'}
            {license.status === 'expired' && '✗ منتهية'}
          </Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.text + '99'} />
          <Text style={[styles.infoText, { color: theme.colors.text + '99' }]}>ينتهي: {license.expiryDate}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="clock" size={16} color={theme.colors.text + '99'} />
          <Text style={[styles.infoText, { color: theme.colors.text + '99' }]}>متبقي: {license.daysRemaining} يوم</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${license.progressPercentage}%`,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

/**
 * Quick Action Button Component
 */
const QuickActionButton = ({ icon, label, color, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionButton}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color: theme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
};

/**
 * Home Screen Component
 */
const HomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    totalLicenses: 0,
    activeLicenses: 0,
    expiringLicenses: 0,
    expiredLicenses: 0,
  });

  const user = useSelector(state => state.auth.user);

  /**
   * Load Dashboard Data
   */
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch licenses
      const licensesData = await mobileApiService.get('/licenses', {
        cache: true,
      });
      setLicenses(licensesData);

      // Fetch notifications
      const notificationsData = await mobileApiService.get('/notifications?limit=5', {
        cache: false,
      });
      setNotifications(notificationsData);

      // Calculate stats
      const stats = {
        totalLicenses: licensesData.length,
        activeLicenses: licensesData.filter(l => l.status === 'active').length,
        expiringLicenses: licensesData.filter(l => l.status === 'expiring').length,
        expiredLicenses: licensesData.filter(l => l.status === 'expired').length,
      };
      setStats(stats);
    } catch (error) {
      console.error('❌ Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle Pull to Refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    mobileApiService.clearCache();
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'} />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>👋 أهلاً بك</Text>
            <Text style={styles.userName}>{user?.name || 'المستخدم'}</Text>
            <Text style={styles.headerSubtitle}>لديك {stats.expiringLicenses} رخصة قريبة الانتهاء</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileTab', { screen: 'ProfileMain' })} style={styles.profileButton}>
            <MaterialCommunityIcons name="account" size={28} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Statistics */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#667eea' }]}>{stats.totalLicenses}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text + '99' }]}>إجمالي الرخص</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.activeLicenses}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text + '99' }]}>نشطة</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.expiringLicenses}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text + '99' }]}>تنتهي قريباً</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>الإجراءات السريعة</Text>
          <View style={styles.actionsGrid}>
            <QuickActionButton
              icon="file-document"
              label="المستندات"
              color="#667eea"
              onPress={() => navigation.navigate('DocumentsTab', { screen: 'DocumentsList' })}
            />
            <QuickActionButton
              icon="credit-card"
              label="المدفوعات"
              color="#FF9800"
              onPress={() => navigation.navigate('PaymentsTab', { screen: 'PaymentsList' })}
            />
            <QuickActionButton
              icon="bell"
              label="الإشعارات"
              color="#4CAF50"
              onPress={() => navigation.navigate('ProfileTab', { screen: 'Notifications' })}
            />
            <QuickActionButton
              icon="government-uk"
              label="الجهات"
              color="#F44336"
              onPress={() => navigation.navigate('HomeTab', { screen: 'GovernmentServices' })}
            />
          </View>
        </View>

        {/* Licenses Section */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>رخصي</Text>
              <TouchableOpacity onPress={() => navigation.navigate('LicensesTab', { screen: 'LicensesList' })}>
                <Text style={[styles.viewAll, { color: theme.colors.primary }]}>عرض الكل →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={licenses.slice(0, 3)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <LicenseCard
                  license={item}
                  onPress={() =>
                    navigation.navigate('LicensesTab', {
                      screen: 'LicenseInfo',
                      params: { licenseId: item.id, licenseType: item.type },
                    })
                  }
                />
              )}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>آخر الإشعارات</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProfileTab', { screen: 'Notifications' })}>
                <Text style={[styles.viewAll, { color: theme.colors.primary }]}>عرض الكل →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={notifications.slice(0, 3)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={[styles.notificationItem, { backgroundColor: theme.colors.surface }]}>
                  <View
                    style={[
                      styles.notificationIcon,
                      {
                        backgroundColor: item.type === 'urgent' ? '#F44336' : item.type === 'warning' ? '#FF9800' : '#2196F3',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name={item.type === 'urgent' ? 'alert' : 'information'} size={18} color="#fff" />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>{item.title}</Text>
                    <Text style={[styles.notificationMsg, { color: theme.colors.text + '99' }]}>{item.message}</Text>
                  </View>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.85,
    marginTop: 6,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardInfo: {
    marginTop: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    backgroundColor: '#ddd',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  loader: {
    marginVertical: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationMsg: {
    fontSize: 11,
    lineHeight: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default HomeScreen;
