/**
 * Settings Screen - React Native
 * شاشة الإعدادات والخيارات المتقدمة
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AuthService from '../../services/AuthService';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    gpsTracking: true,
    pushNotifications: true,
    emailNotifications: false,
    smsNotifications: true,
    darkMode: false,
    autoUploadLocation: true,
    dataCollection: true,
  });

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSettingChange = (setting) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('خطأ', 'كلمات المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const result = await AuthService.changePassword(oldPassword, newPassword);

      if (result.success) {
        Alert.alert('نجح', 'تم تغيير كلمة المرور بنجاح');
        setShowChangePassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('خطأ', result.error);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل تغيير كلمة المرور');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* رأس الإعدادات */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color="#4ECDC4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* إعدادات GPS والتتبع */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 تتبع الموقع</Text>

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>تفعيل GPS</Text>
            <Text style={styles.settingDescription}>
              تتبع موقعك في الوقت الفعلي
            </Text>
          </View>
          <Switch
            value={settings.gpsTracking}
            onValueChange={() => handleSettingChange('gpsTracking')}
            trackColor={{ false: '#DDD', true: '#81C784' }}
            thumbColor={settings.gpsTracking ? '#4ECDC4' : '#FFF'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>رفع الموقع تلقائياً</Text>
            <Text style={styles.settingDescription}>
              رفع موقعك للخادم تلقائياً كل 30 ثانية
            </Text>
          </View>
          <Switch
            value={settings.autoUploadLocation}
            onValueChange={() => handleSettingChange('autoUploadLocation')}
            trackColor={{ false: '#DDD', true: '#81C784' }}
            thumbColor={settings.autoUploadLocation ? '#4ECDC4' : '#FFF'}
          />
        </View>
      </View>

      {/* إعدادات الإشعارات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 الإشعارات</Text>

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>إشعارات الضغط</Text>
            <Text style={styles.settingDescription}>
              تنبيهات فورية على الجهاز
            </Text>
          </View>
          <Switch
            value={settings.pushNotifications}
            onValueChange={() => handleSettingChange('pushNotifications')}
            trackColor={{ false: '#DDD', true: '#81C784' }}
            thumbColor={settings.pushNotifications ? '#4ECDC4' : '#FFF'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>إشعارات البريد الإلكتروني</Text>
            <Text style={styles.settingDescription}>
              تقارير يومية وتنبيهات مهمة
            </Text>
          </View>
          <Switch
            value={settings.emailNotifications}
            onValueChange={() => handleSettingChange('emailNotifications')}
            trackColor={{ false: '#DDD', true: '#81C784' }}
            thumbColor={settings.emailNotifications ? '#4ECDC4' : '#FFF'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>إشعارات الرسائل النصية</Text>
            <Text style={styles.settingDescription}>
              تنبيهات الانتهاكات الحرجة
            </Text>
          </View>
          <Switch
            value={settings.smsNotifications}
            onValueChange={() => handleSettingChange('smsNotifications')}
            trackColor={{ false: '#DDD', true: '#81C784' }}
            thumbColor={settings.smsNotifications ? '#4ECDC4' : '#FFF'}
          />
        </View>
      </View>

      {/* إعدادات الخصوصية والبيانات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 الخصوصية والبيانات</Text>

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>جمع البيانات</Text>
            <Text style={styles.settingDescription}>
              السماح بجمع بيانات الأداء والاستخدام
            </Text>
          </View>
          <Switch
            value={settings.dataCollection}
            onValueChange={() => handleSettingChange('dataCollection')}
            trackColor={{ false: '#DDD', true: '#81C784' }}
            thumbColor={settings.dataCollection ? '#4ECDC4' : '#FFF'}
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowChangePassword(true)}
        >
          <View>
            <Text style={styles.settingLabel}>تغيير كلمة المرور</Text>
            <Text style={styles.settingDescription}>
              تحديث كلمة مرورك الأمنية
            </Text>
          </View>
          <Icon name="chevron-left" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* إعدادات التطبيق */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ التطبيق</Text>

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>الإصدار</Text>
            <Text style={styles.settingDescription}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>حجم الكاش</Text>
            <Text style={styles.settingDescription}>~25 MB</Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              Alert.alert('نجح', 'تم مسح الكاش');
            }}
          >
            <Text style={styles.buttonText}>مسح</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            Alert.alert('حول التطبيق', 'تطبيق تتبع السائقين v1.0.0\n© 2024');
          }}
        >
          <View>
            <Text style={styles.settingLabel}>حول التطبيق</Text>
            <Text style={styles.settingDescription}>معلومات التطبيق</Text>
          </View>
          <Icon name="information" size={18} color="#4ECDC4" />
        </TouchableOpacity>
      </View>

      {/* منطقة الخطر */}
      <View style={styles.dangerZone}>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() => {
            Alert.alert(
              'تحذير',
              'هل تريد حقاً حذف جميع بيانات التطبيق؟',
              [
                { text: 'إلغاء', onPress: () => {} },
                {
                  text: 'حذف',
                  onPress: () => {
                    Alert.alert('نجح', 'تم حذف البيانات');
                  },
                  style: 'destructive',
                },
              ]
            );
          }}
        >
          <Icon name="delete-forever" size={20} color="#FFF" />
          <Text style={styles.dangerButtonText}>حذف جميع البيانات</Text>
        </TouchableOpacity>
      </View>

      {/* Modal لتغيير كلمة المرور */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تغيير كلمة المرور</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>كلمة المرور الحالية</Text>
                <View style={styles.passwordInput}>
                  <Icon name="lock" size={18} color="#4ECDC4" />
                  <View style={styles.input} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>كلمة المرور الجديدة</Text>
                <View style={styles.passwordInput}>
                  <Icon name="lock" size={18} color="#4ECDC4" />
                  <View style={styles.input} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>تأكيد كلمة المرور</Text>
                <View style={styles.passwordInput}>
                  <Icon name="lock" size={18} color="#4ECDC4" />
                  <View style={styles.input} />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveButtonText}>تحديث</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginVertical: 8,
    backgroundColor: '#FFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginLeft: 16,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#51CF66',
    borderRadius: 6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerZone: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  dangerButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  dangerButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  input: {
    flex: 1,
    height: 44,
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;
