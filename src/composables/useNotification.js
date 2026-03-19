// Toast/Notification System
// استخدام: const { showToast, showSuccess, showError } = useNotification()

import { ref } from 'vue';

const notifications = ref([]);
let notificationId = 0;

export const useNotification = () => {
  /**
   * إضافة إشعار
   * @param {string} message
   * @param {string} type - 'success', 'error', 'warning', 'info'
   * @param {number} duration
   */
  const showNotification = (message, type = 'info', duration = 3000) => {
    const id = notificationId++;
    const notification = {
      id,
      message,
      type,
    };

    notifications.value.push(notification);

    // إزالة الإشعار بعد المدة المحددة
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  };

  /**
   * إزالة إشعار
   * @param {number} id
   */
  const removeNotification = id => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  /**
   * إظهار رسالة نجاح
   * @param {string} message
   * @param {number} duration
   */
  const showSuccess = (message, duration = 3000) => {
    return showNotification(message, 'success', duration);
  };

  /**
   * إظهار رسالة خطأ
   * @param {string} message
   * @param {number} duration
   */
  const showError = (message, duration = 4000) => {
    return showNotification(message, 'error', duration);
  };

  /**
   * إظهار رسالة تحذير
   * @param {string} message
   * @param {number} duration
   */
  const showWarning = (message, duration = 3500) => {
    return showNotification(message, 'warning', duration);
  };

  /**
   * إظهار رسالة معلومات
   * @param {string} message
   * @param {number} duration
   */
  const showInfo = (message, duration = 3000) => {
    return showNotification(message, 'info', duration);
  };

  /**
   * إزالة جميع الإشعارات
   */
  const clearAll = () => {
    notifications.value = [];
  };

  return {
    notifications,
    showNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  };
};

export default useNotification;
