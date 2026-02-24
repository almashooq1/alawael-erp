/**
 * Profile Screen - React Native
 * شاشة الملف الشخصي للسائق
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AuthService from '../../services/AuthService';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    initializeProfile();
  }, []);

  const initializeProfile = async () => {
    try {
      setLoading(true);
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('تسجيل خروج', 'هل أنت متأكد؟', [
      { text: 'إلغاء', onPress: () => {} },
      {
        text: 'خروج',
        onPress: async () => {
          const result = await AuthService.logout();
          if (result.success) {
            // إعادة توجيه إلى شاشة تسجيل الدخول
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* صورة الملف الشخصي */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={require('../../assets/default-avatar.png')}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.cameraButton}>
            <Icon name="camera" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{user?.name || 'بدون اسم'}</Text>
        <Text style={styles.role}>{user?.employeeId || 'سائق'}</Text>
      </View>

      {/* بيانات المستخدم الأساسية */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>البيانات الشخصية</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="email" size={20} color="#4ECDC4" />
              <Text style={styles.label}>البريد الإلكتروني</Text>
            </View>
            <Text style={styles.value}>{user?.email}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="phone" size={20} color="#4ECDC4" />
              <Text style={styles.label}>رقم الهاتف</Text>
            </View>
            <Text style={styles.value}>{user?.phone || '-'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="card-account-details" size={20} color="#4ECDC4" />
              <Text style={styles.label}>رقم الهوية</Text>
            </View>
            <Text style={styles.value}>{user?.idNumber || '-'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="calendar" size={20} color="#4ECDC4" />
              <Text style={styles.label}>تاريخ التوظيف</Text>
            </View>
            <Text style={styles.value}>
              {user?.joiningDate
                ? new Date(user.joiningDate).toLocaleDateString('ar-SA')
                : '-'
              }
            </Text>
          </View>
        </View>
      </View>

      {/* معلومات الترخيص */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات الترخيص</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="license" size={20} color="#FFB647" />
              <Text style={styles.label}>رقم الرخصة</Text>
            </View>
            <Text style={styles.value}>
              {user?.licenseDetails?.licenseNumber || '-'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="file-check" size={20} color="#FFB647" />
              <Text style={styles.label}>صلاحية الرخصة</Text>
            </View>
            <Text style={[
              styles.value,
              {
                color: user?.licenseDetails?.expiryDate &&
                  new Date(user.licenseDetails.expiryDate) < new Date()
                  ? '#FF6B6B'
                  : '#51CF66',
              }
            ]}>
              {user?.licenseDetails?.expiryDate
                ? new Date(user.licenseDetails.expiryDate).toLocaleDateString('ar-SA')
                : '-'
              }
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Icon name="format-list-bulleted" size={20} color="#FFB647" />
              <Text style={styles.label}>التصنيفات</Text>
            </View>
            <Text style={styles.value}>
              {user?.licenseDetails?.categories?.join(', ') || '-'}
            </Text>
          </View>
        </View>
      </Section>

      {/* الإحصائيات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الإحصائيات</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="target" size={32} color="#4ECDC4" />
            <Text style={styles.statValue}>
              {user?.performanceMetrics?.overallRating || 0}
            </Text>
            <Text style={styles.statLabel}>درجة الأداء</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="alert-circle" size={32} color="#FF6B6B" />
            <Text style={styles.statValue}>
              {user?.violationCount || 0}
            </Text>
            <Text style={styles.statLabel}>الانتهاكات</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="calendar" size={32} color="#51CF66" />
            <Text style={styles.statValue}>
              {user?.tripsCount || 0}
            </Text>
            <Text style={styles.statLabel}>الرحلات</Text>
          </View>
        </View>
      </View>

      {/* الأعدادات والخيارات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الخيارات</Text>

        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionContent}>
            <Icon name="shield-lock" size={20} color="#4ECDC4" />
            <Text style={styles.optionText}>تغيير كلمة المرور</Text>
          </View>
          <Icon name="chevron-left" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionContent}>
            <Icon name="bell" size={20} color="#4ECDC4" />
            <Text style={styles.optionText}>إعدادات الإشعارات</Text>
          </View>
          <Icon name="chevron-left" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionContent}>
            <Icon name="information" size={20} color="#4ECDC4" />
            <Text style={styles.optionText}>حول التطبيق</Text>
          </View>
          <Icon name="chevron-left" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton}>
          <View style={styles.optionContent}>
            <Icon name="file-document" size={20} color="#4ECDC4" />
            <Text style={styles.optionText}>شروط الخدمة</Text>
          </View>
          <Icon name="chevron-left" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* زر تسجيل الخروج */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Icon name="logout" size={20} color="#FFF" />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
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
  profileHeader: {
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    paddingVertical: 32,
    paddingTop: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
  },
  role: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4ECDC4',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  optionButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    marginHorizontal: 12,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});

export default ProfileScreen;
