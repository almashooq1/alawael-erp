<template>
  <div class="notification-container">
    <transition-group
      name="notification"
      tag="div"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', `notification-${notification.type}`]"
      >
        <div class="notification-icon">
          {{ getIcon(notification.type) }}
        </div>
        <div class="notification-content">
          {{ notification.message }}
        </div>
        <button
          class="notification-close"
          @click="removeNotification(notification.id)"
        >
          ✕
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { useNotification } from '../composables/useNotification'

export default {
  name: 'NotificationContainer',
  setup() {
    const { notifications, removeNotification } = useNotification()

    const getIcon = (type) => {
      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
      }
      return icons[type] || '•'
    }

    return {
      notifications,
      removeNotification,
      getIcon,
    }
  },
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: var(--spacing-lg);
  left: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-width: 500px;
  margin-left: auto;
  margin-right: 0;
  direction: rtl;
}

.notification {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  animation: slideIn 0.3s ease-out;
}

.notification-icon {
  font-size: var(--text-lg);
  font-weight: 700;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  line-height: 1.5;
}

.notification-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-lg);
  opacity: 0.7;
  transition: opacity var(--transition-base);
}

.notification-close:hover {
  opacity: 1;
}

/* أنواع الإشعارات */
.notification-success {
  background: var(--color-green-100);
  color: var(--color-green-700);
  border: 1px solid var(--color-green-300);
}

.notification-success .notification-icon {
  color: var(--color-green-600);
}

.notification-error {
  background: var(--color-red-100);
  color: var(--color-red-700);
  border: 1px solid var(--color-red-300);
}

.notification-error .notification-icon {
  color: var(--color-red-600);
}

.notification-warning {
  background: var(--color-yellow-100);
  color: var(--color-yellow-700);
  border: 1px solid var(--color-yellow-300);
}

.notification-warning .notification-icon {
  color: var(--color-yellow-600);
}

.notification-info {
  background: var(--color-blue-100);
  color: var(--color-blue-700);
  border: 1px solid var(--color-blue-300);
}

.notification-info .notification-icon {
  color: var(--color-blue-600);
}

/* الحركات */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(400px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(400px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(400px);
}

@media (max-width: 640px) {
  .notification-container {
    left: var(--spacing-sm);
    right: var(--spacing-sm);
    top: var(--spacing-sm);
  }

  .notification {
    font-size: var(--text-sm);
  }
}
</style>
