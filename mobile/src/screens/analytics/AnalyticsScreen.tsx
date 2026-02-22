/**
 * Analytics Screen - View dashboards and KPIs
 */

import React, { useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchDashboards, fetchMetrics } from '../../store/slices/analyticsSlice';

export default function AnalyticsScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { dashboards, metrics, isLoading } = useAppSelector((state) => state.analytics);

  useEffect(() => {
    dispatch(fetchDashboards());
    dispatch(fetchMetrics());
  }, [dispatch]);

  const handleDashboardPress = (dashboardId: string) => {
    navigation.navigate('DashboardView', { dashboardId });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1673e6" />
        ) : (
          <View style={styles.metricsContainer}>
            {metrics.slice(0, 6).map((metric) => (
              <MetricCard key={metric.name} metric={metric} />
            ))}
          </View>
        )}
      </View>

      {/* Dashboards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboards</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1673e6" />
        ) : (
          <View>
            {dashboards.map((dashboard) => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                onPress={() => handleDashboardPress(dashboard.id)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MetricCard({ metric }: { metric: any }) {
  const trendColor = metric.trend > 0 ? '#4CAF50' : '#FF5252';

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{metric.name}</Text>
      <Text style={styles.metricValue}>{metric.value}</Text>
      <View style={styles.trendContainer}>
        <MaterialCommunityIcons
          name={metric.trend > 0 ? 'trending-up' : 'trending-down'}
          size={14}
          color={trendColor}
        />
        <Text style={[styles.trendValue, { color: trendColor }]}>
          {Math.abs(metric.trend)}%
        </Text>
      </View>
    </View>
  );
}

function DashboardCard({ dashboard, onPress }: { dashboard: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.dashboardCard} onPress={onPress}>
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.dashboardName}>{dashboard.name}</Text>
          <Text style={styles.dashboardType}>{dashboard.type} dashboard</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
      </View>
      <Text style={styles.widgetCount}>{dashboard.widgets?.length || 0} widgets</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  dashboardCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dashboardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dashboardType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  widgetCount: {
    fontSize: 12,
    color: '#999',
  },
});
