/**
 * Orders Screen - List and manage orders
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchOrders,
  setStatusFilter,
  clearFilters,
} from '../../store/slices/ordersSlice';

export default function OrdersScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { items: orders, isLoading, filters } = useAppSelector((state) => state.orders);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchOrders({ page: 1, limit: 20 }));
  }, [dispatch]);

  const handleStatusFilter = (status: string) => {
    dispatch(setStatusFilter(status === filters.status ? null : status));
  };

  const handleCreateOrder = () => {
    navigation.navigate('CreateOrder');
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetail', { orderId });
  };

  const filteredOrders = orders.filter((order: any) =>
    order.orderNumber?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
          <MaterialCommunityIcons name="filter" size={20} color="#1673e6" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filterContainer}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterOptions}>
              {['pending', 'processing', 'completed', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    filters.status === status && styles.filterOptionActive,
                  ]}
                  onPress={() => handleStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.status === status && styles.filterOptionActiveText,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {filters.status && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => dispatch(clearFilters())}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1673e6" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => <OrderItem order={item} onPress={() => handleOrderPress(item.id)} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* FAB - Create Order */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateOrder}>
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

// Order Item Component
function OrderItem({ order, onPress }: { order: any; onPress: () => void }) {
  const statusColor =
    order.status === 'completed'
      ? '#4CAF50'
      : order.status === 'pending'
      ? '#FF9800'
      : order.status === 'processing'
      ? '#2196F3'
      : '#9E9E9E';

  return (
    <TouchableOpacity style={styles.orderItem} onPress={onPress}>
      <View style={styles.orderItemContent}>
        <View style={styles.orderItemHeader}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={[styles.orderStatus, { color: statusColor }]}>{order.status}</Text>
        </View>
        <Text style={styles.customerInfo}>Customer: {order.customerId}</Text>
        <View style={styles.orderFooter}>
          <Text style={styles.amount}>{order.totalAmount} SAR</Text>
          <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="package-variant" size={60} color="#ccc" />
      <Text style={styles.emptyStateText}>No orders yet</Text>
      <Text style={styles.emptyStateSubtext}>Create your first order to get started</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterOptionActive: {
    borderColor: '#1673e6',
    backgroundColor: '#E3F2FD',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#666',
  },
  filterOptionActiveText: {
    color: '#1673e6',
    fontWeight: '600',
  },
  clearFiltersButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  orderItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  orderItemContent: {
    flex: 1,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  customerInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1673e6',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1673e6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
});
