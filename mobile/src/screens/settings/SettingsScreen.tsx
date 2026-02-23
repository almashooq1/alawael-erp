/**
 * Settings Screen - App configuration and preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/slices/authSlice';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../services/NotificationService';

export default function SettingsScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const prefs = await getNotificationPreferences();
    setNotificationSettings(prefs);
  };

  const handleNotificationToggle = async (setting: string) => {
    const updated = { ...notificationSettings, [setting]: !notificationSettings[setting] };
    setNotificationSettings(updated);
    await updateNotificationPreferences(updated);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          dispatch(logout());
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <MaterialCommunityIcons name="account" size={20} color="#1673e6" />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Profile</Text>
            <Text style={styles.settingValue}>{user?.name || 'User'}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Notification Settings */}
      {notificationSettings && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <SettingToggle
            icon="bell"
            label="Push Notifications"
            value={notificationSettings.pushEnabled}
            onToggle={() => handleNotificationToggle('pushEnabled')}
          />

          <SettingToggle
            icon="email"
            label="Email Notifications"
            value={notificationSettings.emailEnabled}
            onToggle={() => handleNotificationToggle('emailEnabled')}
          />

          <SettingToggle
            icon="package"
            label="Order Updates"
            value={notificationSettings.ordersNotifications}
            onToggle={() => handleNotificationToggle('ordersNotifications')}
          />

          <SettingToggle
            icon="file-document"
            label="Report Generation"
            value={notificationSettings.reportNotifications}
            onToggle={() => handleNotificationToggle('reportNotifications')}
          />

          <SettingToggle
            icon="alert"
            label="Alerts & Warnings"
            value={notificationSettings.alertNotifications}
            onToggle={() => handleNotificationToggle('alertNotifications')}
          />
        </View>
      )}

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>

        <TouchableOpacity style={styles.settingItem}>
          <MaterialCommunityIcons name="moon-waning-crescent" size={20} color="#1673e6" />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingValue}>Coming soon</Text>
          </View>
          <Switch disabled value={false} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <MaterialCommunityIcons name="translate" size={20} color="#1673e6" />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Language</Text>
            <Text style={styles.settingValue}>English</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingItem}>
          <MaterialCommunityIcons name="information" size={20} color="#1673e6" />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <MaterialCommunityIcons name="file-document" size={20} color="#1673e6" />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
          </View>
          <MaterialCommunityIcons name="open-in-new" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <MaterialCommunityIcons name="file-document" size={20} color="#1673e6" />
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Terms of Service</Text>
          </View>
          <MaterialCommunityIcons name="open-in-new" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
          <Text style={styles.dangerButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SettingToggle({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.settingItem}>
      <MaterialCommunityIcons name={icon} size={20} color="#1673e6" />
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    marginVertical: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    marginHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  settingValue: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  dangerButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
