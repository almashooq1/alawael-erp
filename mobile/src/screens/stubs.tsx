/**
 * Stub Screens for Navigation
 * These are placeholder implementations
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function OrderDetailScreen({ navigation, route }: any) {
  const { orderId } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Order ID: {orderId}</Text>
        <Text style={styles.subText}>Implementation coming in full version</Text>
      </View>
    </View>
  );
}

export function CreateOrderScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Order</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Create Order Form</Text>
        <Text style={styles.subText}>Implementation coming in full version</Text>
      </View>
    </View>
  );
}

export function DashboardViewScreen({ navigation, route }: any) {
  const { dashboardId } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard View</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Dashboard: {dashboardId}</Text>
        <Text style={styles.subText}>Implementation coming in full version</Text>
      </View>
    </View>
  );
}

export function NotificationsScreen({ navigation }: any) {
  // Lazy-require so test harnesses that don't wire a store can still
  // import from stubs.tsx without crashing.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FlatList, RefreshControl, ActivityIndicator } = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ApiService = require('../services/ApiService').default;

  const [items, setItems] = React.useState([] as any[]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const resp: any = await ApiService.get('/parent-v2/notifications');
      setItems(Array.isArray(resp?.items) ? resp.items : []);
      setUnreadCount(resp?.unreadCount || 0);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    try {
      await ApiService.post('/parent-v2/notifications/read-all', {});
      await load();
    } catch {
      /* non-fatal */
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await ApiService.patch(`/parent-v2/notifications/${id}/read`, {});
      await load();
    } catch {
      /* non-fatal */
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0}>
          <MaterialCommunityIcons
            name="email-open-outline"
            size={22}
            color={unreadCount > 0 ? '#1673e6' : '#ccc'}
          />
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#1673e6" />
        </View>
      ) : err ? (
        <View style={styles.content}>
          <Text style={styles.text}>{err}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
            <Text style={{ color: '#1673e6' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.content}>
          <MaterialCommunityIcons name="bell-outline" size={48} color="#ccc" />
          <Text style={[styles.text, { marginTop: 16 }]}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it: any) => String(it._id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[styles.notifRow, !item.isRead && styles.notifUnread]}
              onPress={() => !item.isRead && markOneRead(item._id)}
            >
              {!item.isRead && <View style={styles.unreadDot} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle} numberOfLines={1}>
                  {item.title || '—'}
                </Text>
                {item.message ? (
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                ) : null}
                <Text style={styles.notifDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

export function ProfileScreen({ navigation }: any) {
  // lazy-require to avoid breaking environments that boot this file
  // without the Redux store wired up (e.g. unit test harnesses)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useAppDispatch, useAppSelector } = require('../store');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { logout } = require('../store/slices/authSlice');
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s: any) => s.auth);

  const initials = (user?.name || user?.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.profileBody}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'Signed in'}</Text>
        <Text style={styles.profileEmail}>{user?.email || '—'}</Text>
        {user?.role && (
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{user.role}</Text>
          </View>
        )}

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>User ID</Text>
          <Text style={styles.profileValue}>{user?.id || '—'}</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            dispatch(logout());
            navigation.goBack();
          }}
        >
          <MaterialCommunityIcons name="logout" size={18} color="#d32f2f" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  profileBody: {
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1673e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  roleChip: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
  },
  roleChipText: {
    color: '#1673e6',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  profileLabel: {
    fontSize: 13,
    color: '#999',
  },
  profileValue: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d32f2f',
    borderRadius: 8,
  },
  logoutText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  unreadBadge: {
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    paddingHorizontal: 6,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  notifRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'flex-start',
    gap: 10,
  },
  notifUnread: {
    backgroundColor: '#f0f7ff',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1673e6',
    marginTop: 6,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  notifMessage: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  notifDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});
