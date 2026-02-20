// Mock service for permissions
const permissions = [
  { id: 'perm1', name: 'عرض المستخدمين', description: 'عرض قائمة المستخدمين' },
  { id: 'perm2', name: 'تعديل المستخدمين', description: 'تعديل بيانات المستخدمين' },
  { id: 'perm3', name: 'حذف المستخدمين', description: 'حذف المستخدمين من النظام' },
  { id: 'perm4', name: 'إدارة الفروع', description: 'إدارة الفروع للمؤسسة' },
  { id: 'perm5', name: 'إدارة المؤسسات', description: 'إدارة بيانات المؤسسات' },
  { id: 'perm6', name: 'تصدير التقارير', description: 'تصدير التقارير والبيانات' },
];

export function fetchPermissions() {
  // Simulate async fetch
  return Promise.resolve(permissions);
}

export function getPermissionById(id) {
  return permissions.find(p => p.id === id);
}
