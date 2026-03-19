// User Management Service
// خدمة إدارة المستخدمين

class UserService {
  // الحصول على جميع المستخدمين
  static getAllUsers(filters = {}) {
    const mockUsers = [
      {
        id: 'USER_001',
        name: 'أحمد محمد',
        email: 'ahmed@example.com',
        role: 'admin',
        department: 'IT',
        status: 'active',
        organizationId: 'ORG_001',
        branchId: 'BR_01',
        roles: ['super-admin'],
        permissions: ['manage:all', 'edit:users'],
        lastLogin: new Date(Date.now() - 5 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: 'USER_002',
        name: 'فاطمة علي',
        email: 'fatima@example.com',
        role: 'manager',
        department: 'HR',
        status: 'active',
        organizationId: 'ORG_001',
        branchId: 'BR_02',
        roles: ['hr'],
        permissions: ['read:users', 'edit:attendance'],
        lastLogin: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: 'USER_003',
        name: 'محمود أحمد',
        email: 'mahmoud@example.com',
        role: 'user',
        department: 'Sales',
        status: 'active',
        organizationId: 'ORG_002',
        branchId: 'BR_01',
        roles: ['sales'],
        permissions: ['read:leads'],
        lastLogin: new Date(Date.now() - 30 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60000).toISOString(),
      },
      {
        id: 'USER_004',
        name: 'نور محمد',
        email: 'noor@example.com',
        role: 'user',
        department: 'Marketing',
        status: 'inactive',
        organizationId: 'ORG_002',
        branchId: 'BR_03',
        roles: ['marketing'],
        permissions: ['read:campaigns'],
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60000).toISOString(),
      },
    ];

    let filtered = mockUsers;
    if (filters.role) {
      filtered = filtered.filter(u => u.role === filters.role);
    }
    if (filters.department) {
      filtered = filtered.filter(u => u.department === filters.department);
    }
    if (filters.status) {
      filtered = filtered.filter(u => u.status === filters.status);
    }

    return {
      success: true,
      users: filtered,
      totalCount: filtered.length,
      timestamp: new Date().toISOString(),
    };
  }

  // الحصول على معلومات المستخدم
  static getUserById(userId) {
    // mock: يعيد أول مستخدم بنفس id أو mock افتراضي
    const all = this.getAllUsers().users || [];
    const user = all.find(u => u.id === userId) || all[0];
    return {
      success: true,
      user: user,
      timestamp: new Date().toISOString(),
    };
  }

  // إنشاء مستخدم جديد
  static createUser(data) {
    const user = {
      id: `USER_${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role || 'user',
      department: data.department,
      status: 'active',
      organizationId: data.organizationId || '',
      branchId: data.branchId || '',
      roles: data.roles || [],
      permissions: data.permissions || [],
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      user: user,
      message: 'User created successfully',
    };
  }

  // تحديث بيانات المستخدم
  static updateUser(userId, data) {
    return {
      success: true,
      user: {
        id: userId,
        ...data,
        updatedAt: new Date().toISOString(),
      },
      message: 'User updated successfully',
    };
  }

  // حذف المستخدم
  static deleteUser(userId) {
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  // تفعيل/تعطيل المستخدم
  static toggleUserStatus(userId, status) {
    return {
      success: true,
      user: {
        id: userId,
        status: status,
        updatedAt: new Date().toISOString(),
      },
      message: `User ${status === 'active' ? 'activated' : 'deactivated'}`,
    };
  }

  // تغيير دور المستخدم
  static changeUserRole(userId, newRole) {
    return {
      success: true,
      user: {
        id: userId,
        role: newRole,
        updatedAt: new Date().toISOString(),
      },
      message: 'User role changed successfully',
    };
  }

  // إحصائيات المستخدمين
  static getUserStatistics() {
    return {
      success: true,
      statistics: {
        totalUsers: 156,
        activeUsers: 142,
        inactiveUsers: 14,
        byRole: {
          admin: 5,
          manager: 18,
          user: 133,
        },
        byDepartment: {
          IT: 12,
          HR: 8,
          Sales: 45,
          Marketing: 32,
          Finance: 20,
          Other: 39,
        },
        newUsersThisMonth: 12,
        lastActivityToday: 98,
        averageLoginFrequency: '2.3 times per day',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // استيراد المستخدمين من CSV
  static importUsers(file) {
    return {
      success: true,
      imported: 45,
      skipped: 2,
      failed: 0,
      details: {
        successMessage: 'Successfully imported 45 users',
        skippedDuplicates: 2,
        importId: `IMPORT_${Date.now()}`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // تصدير المستخدمين
  static exportUsers(format = 'csv') {
    return {
      success: true,
      file: {
        name: `users_export_${new Date().toISOString().split('T')[0]}.${format}`,
        size: '245 KB',
        format: format,
        downloadUrl: `https://example.com/exports/users_${Date.now()}.${format}`,
        expiresIn: '24h',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // بحث عن مستخدمين
  static searchUsers(query) {
    return {
      success: true,
      results: [
        {
          id: 'USER_001',
          name: 'أحمد محمد',
          email: 'ahmed@example.com',
          role: 'admin',
        },
      ],
      totalResults: 1,
      timestamp: new Date().toISOString(),
    };
  }

  // إعادة تعيين كلمة مرور المستخدم
  static resetUserPassword(userId) {
    return {
      success: true,
      temporaryPassword: `TEMP_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      message: 'Temporary password generated',
      expiresIn: '24h',
    };
  }

  // الحصول على سجل أنشطة المستخدم
  static getUserActivityLog(userId) {
    return {
      success: true,
      activities: [
        {
          id: 'ACT_001',
          action: 'login',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          ip: '192.168.1.1',
          device: 'Chrome on Windows',
        },
        {
          id: 'ACT_002',
          action: 'view_report',
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          resource: 'Sales Report Q4',
        },
        {
          id: 'ACT_003',
          action: 'update_profile',
          timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
          changes: ['phone', 'avatar'],
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = UserService;
