// Mock smart notification service for RBAC changes
let id = 100;
const smartNotifications = [];

export function sendSmartRBACNotification({ user, action, details }) {
  const notification = {
    id: ++id,
    title: 'تنبيه أمني: تغيير صلاحيات',
    message: `تم إجراء ${action} بواسطة ${user}. التفاصيل: ${details}`,
    date: new Date().toLocaleString('ar-EG'),
    read: false,
    type: 'rbac',
  };
  smartNotifications.unshift(notification);
  return Promise.resolve(notification);
}

export function getSmartNotifications() {
  return Promise.resolve(smartNotifications);
}
