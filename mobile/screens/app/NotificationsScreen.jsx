/**
 * Notifications Screen - React Native
 * شاشة الإشعارات والتنبيهات
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationService from '../../services/NotificationService';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, violations, alerts
  const [animateDelete] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeNotifications();

    // تحديث الإشعارات كل 30 ثانية
    const interval = setInterval(() => {
      fetchNotifications('all', false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchNotifications(filter, false);
  }, [filter]);

  const initializeNotifications = async () => {
    try {
      setLoading(true);
      await fetchNotifications('all', false);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (filterType = 'all', showRefreshing = true) => {
    try {
      if (showRefreshing) setRefreshing(true);

      // استبدل userId بالبيانات الفعلية
      const userId = 'current_driver_id';
      let response;

      if (filterType === 'unread') {
        const unreadNotifs = await NotificationService.getUnreadNotifications(
          userId,
          50
        );
        response = { notifications: unreadNotifs };
      } else {
        response = await NotificationService.getAllNotifications(userId, 1, 50);
      }

      let filtered = response.notifications || [];

      // تطبيق الفلاتر الإضافية
      if (filterType === 'violations') {
        filtered = filtered.filter((n) => n.notificationType === 'violation_alert');
      } else if (filterType === 'alerts') {
        filtered = filtered.filter(
          (n) =>
            n.priority === 'critical' ||
            n.priority === 'high'
        );
      }

      setNotifications(filtered);
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      Alert.alert('خطأ', 'فشل تحديث الإشعارات');
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchNotifications(filter, true);
  }, [filter]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsRead(notificationId);
      // تحديث الإشعارات
      await fetchNotifications(filter, false);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحديث الإشعار');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      // تحديث القائمة
      setNotifications(
        notifications.filter((n) => n._id !== notificationId)
      );
      Alert.alert('تم', 'تم حذف الإشعار بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل حذف الإشعار');
    }
  };

  const renderNotificationIcon = (notification) => {
    switch (notification.notificationType) {
      case 'violation_alert':
        return <Icon name="alert-circle" size={24} color="#FF6B6B" />;
      case 'performance_report':
        return <Icon name="chart-line" size={24} color="#4ECDC4" />;
      case 'maintenance_reminder':
        return <Icon name="wrench" size={24} color="#FFB647" />;
      case 'system_message':
        return <Icon name="information" size={24} color="#51CF66" />;
      default:
        return <Icon name="bell" size={24} color="#4ECDC4" />;
    }
  };

  const renderNotificationCard = ({ item, index }) => {
    const isUnread = item.channels?.inApp?.read === false;

    return (
      <View
        style={[
          styles.notificationCard,
          {
            backgroundColor: isUnread ? '#F0F8FF' : '#FFF',
            borderLeftColor: item.priority === 'critical' ? '#FF6B6B' : '#4ECDC4',
          },
        ]}
      >
        {/* حذف عند السحب لليمين */}
        <View style={styles.notificationContent}>
          {/* الأيقونة */}
          <View style={styles.iconContainer}>
            {renderNotificationIcon(item)}
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          {/* النص */}
          <View style={styles.textContainer}>
            <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.notificationTime}>
              {new Date(item.createdAt).toLocaleString('ar-SA')}
            </Text>
          </View>

          {/* الأزرار */}
          <View style={styles.actions}>
            {isUnread && (
              <TouchableOpacity
                onPress={() => handleMarkAsRead(item._id)}
                style={styles.actionButton}
              >
                <Icon name="check" size={18} color="#51CF66" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleDelete(item._id)}
              style={[styles.actionButton, { marginLeft: 8 }]}
            >
              <Icon name="trash-can" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="inbox-multiple-outline" size={64} color="#CCC" />
      <Text style={styles.emptyText}>لا توجد إشعارات</Text>
      <Text style={styles.emptySubtext}>
        ستظهر الإشعارات هنا عند حدوث أحداث جديدة
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* الفلاتر */}
      <View style={styles.filterContainer}>
        {['all', 'unread', 'violations', 'alerts'].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === 'all' && 'الكل'}
              {f === 'unread' && 'غير مقروءة'}
              {f === 'violations' && 'الانتهاكات'}
              {f === 'alerts' && 'التنبيهات'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* قائمة الإشعارات */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={
          notifications.length === 0 && styles.emptyListContainer
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        scrollEnabled={notifications.length > 0}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    overflow: 'hidden',
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  notificationCard: {
    backgroundColor: '#FFF',
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
  },
});

export default NotificationsScreen;
