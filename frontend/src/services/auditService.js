// Mock audit log service
const auditLog = [
  {
    date: '2026-01-28 10:00',
    user: 'admin',
    action: 'تغيير صلاحيات',
    details: 'تمت إضافة صلاحية "تصدير التقارير" لدور "مدير"',
  },
  {
    date: '2026-01-27 15:30',
    user: 'manager',
    action: 'تغيير دور',
    details: 'تمت ترقية المستخدم "ahmed" إلى دور "مدير فرع"',
  },
  {
    date: '2026-01-26 12:10',
    user: 'admin',
    action: 'تغيير صلاحيات',
    details: 'تمت إزالة صلاحية "حذف المستخدمين" من دور "مشاهد"',
  },
];

export function fetchAuditLog() {
  return Promise.resolve(auditLog);
}
