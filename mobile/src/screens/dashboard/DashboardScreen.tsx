/**
 * Dashboard Screen - Home view
 */

import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMetrics } from '../../store/slices/analyticsSlice';
import { fetchOrders } from '../../store/slices/ordersSlice';
import { fetchNotifications } from '../../store/slices/notificationsSlice';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { metrics, isLoading } = useAppSelector((state) => state.analytics);
  const { items: orders, total: totalOrders } = useAppSelector((state) => state.orders);
  const { unreadCount } = useAppSelector((state) => state.notifications);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Load dashboard data
    dispatch(fetchMetrics());
    dispatch(fetchOrders({ limit: 10 }));
    dispatch(fetchNotifications({ limit: 5 }));
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1673e6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        {metrics.slice(0, 4).map((metric) => (
          <MetricCard key={metric.name} metric={metric} />
        ))}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        <Text style={styles.metric}>{totalOrders} total orders</Text>
        {orders.slice(0, 5).map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.buttonGrid}>
          <ActionButton icon="plus" label="New Order" />
          <ActionButton icon="file-document" label="Generate Report" />
          <ActionButton icon="chart-box" label="View Analytics" />
          <ActionButton icon="cog" label="Settings" />
        </View>
      </View>
    </ScrollView>
  );
}

// Metric Card Component
function MetricCard({ metric }: { metric: any }) {
  const { Text } = require('react-native');
  const trendColor = metric.trend > 0 ? '#4CAF50' : '#FF5252';

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{metric.name}</Text>
      <Text style={styles.metricValue}>{metric.value}</Text>
      <Text style={[styles.trendText, { color: trendColor }]}>
        {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
      </Text>
    </View>
  );
}

// Order Card Component
function OrderCard({ order }: { order: any }) {
  const { Text } = require('react-native');
  const statusColor =
    order.status === 'completed' ? '#4CAF50' : order.status === 'pending' ? '#FF9800' : '#2196F3';

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>Order {order.orderNumber}</Text>
        <Text style={[styles.orderStatus, { color: statusColor }]}>{order.status}</Text>
      </View>
      <Text style={styles.orderAmount}>{order.totalAmount} SAR</Text>
      <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
    </View>
  );
}

// Action Button Component
function ActionButton({ icon, label }: { icon: string; label: string }) {
  const { Text } = require('react-native');
  const { MaterialCommunityIcons } = require('@expo/vector-icons');

  return (
    <View style={styles.actionButton}>
      <MaterialCommunityIcons name={icon} size={28} color="#1673e6" />
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  notificationBadge: {
    backgroundColor: '#FF5252',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  trendText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  metric: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1673e6',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
  },
  actionLabel: {
    fontSize: 12,
    marginTop: 8,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
});
