/**
 * خدمة الإشعارات الفعلية
 * Real-time Notifications Service
 *
 * توفر نظام إشعارات فعلي باستخدام WebSocket
 * Provides real-time notification system using WebSocket
 */

class NotificationService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.notifications = [];
    this.maxNotifications = 100;
  }

  /**
   * الاتصال بـ WebSocket
   * Connect to WebSocket server
   *
   * @param {string} url - عنوان الخادم
   * @param {Object} options - خيارات الاتصال
   * @returns {Promise}
   */
  connect(url, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // استخدام اتصال عادي إذا لم يتوفر WebSocket
        if (typeof WebSocket === 'undefined') {
          console.warn('WebSocket not available, using polling instead');
          this.setupPolling();
          resolve();
          return;
        }

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('Connected to notification server');
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        };

        this.socket.onmessage = event => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.socket.onerror = error => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.socket.onclose = () => {
          console.log('Disconnected from notification server');
          this.emit('disconnected');
          this.attemptReconnect(url);
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * محاولة الاتصال مجدداً
   * Attempt to reconnect
   *
   * @param {string} url - عنوان الخادم
   * @private
   */
  attemptReconnect(url) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect(url).catch(() => {
          // المحاولة التالية ستتم من onclose
        });
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.setupPolling();
    }
  }

  /**
   * إعداد polling كبديل للـ WebSocket
   * Setup polling as fallback
   *
   * @private
   */
  setupPolling() {
    // يمكن إضافة polling للتحقق من الإشعارات الجديدة
    console.log('Using polling for notifications');
    // هنا يمكن إضافة كود polling
  }

  /**
   * معالجة الرسالة الواردة
   * Handle incoming message
   *
   * @param {Object} message - الرسالة
   * @private
   */
  handleMessage(message) {
    if (message.type === 'notification') {
      this.addNotification(message.data);
      this.emit('notification', message.data);
    } else if (message.type === 'update') {
      this.emit('update', message.data);
    } else if (message.type === 'alert') {
      this.emit('alert', message.data);
    } else {
      this.emit(`message:${message.type}`, message.data);
    }
  }

  /**
   * إضافة إشعار إلى السجل
   * Add notification to history
   *
   * @param {Object} notification - الإشعار
   * @private
   */
  addNotification(notification) {
    const timestamp = new Date();
    const fullNotification = {
      ...notification,
      timestamp,
      id: `${timestamp.getTime()}-${Math.random()}`,
    };

    this.notifications.unshift(fullNotification);

    // الاحتفاظ برقم محدد من الإشعارات
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    return fullNotification;
  }

  /**
   * الاستماع لحدث معين
   * Listen for a specific event
   *
   * @param {string} event - اسم الحدث
   * @param {Function} callback - دالة الاستدعاء
   * @returns {Function} دالة إلغاء الاشتراك
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);

    // إرجاع دالة إلغاء الاشتراك
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * الاستماع لحدث مرة واحدة فقط
   * Listen for an event once
   *
   * @param {string} event - اسم الحدث
   * @param {Function} callback - دالة الاستدعاء
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      callback(...args);
      unsubscribe();
    });
  }

  /**
   * إطلاق حدث
   * Emit an event
   *
   * @param {string} event - اسم الحدث
   * @param {any} data - البيانات
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for event "${event}":`, error);
        }
      });
    }
  }

  /**
   * إرسال رسالة إلى الخادم
   * Send message to server
   *
   * @param {Object} message - الرسالة
   * @returns {boolean}
   */
  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected');
      return false;
    }
  }

  /**
   * إرسال إشعار
   * Send notification
   *
   * @param {Object} notification - بيانات الإشعار
   * @returns {boolean}
   */
  sendNotification(notification) {
    return this.send({
      type: 'notification',
      data: notification,
      timestamp: new Date(),
    });
  }

  /**
   * الحصول على الإشعارات المحفوظة
   * Get notification history
   *
   * @param {number} limit - عدد الإشعارات المطلوبة
   * @returns {Array}
   */
  getHistory(limit = 20) {
    return this.notifications.slice(0, limit);
  }

  /**
   * الحصول على إشعارات حسب النوع
   * Get notifications by type
   *
   * @param {string} type - نوع الإشعار
   * @returns {Array}
   */
  getByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * الحصول على الإشعارات الجديدة
   * Get unread notifications
   *
   * @returns {Array}
   */
  getUnread() {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * وضع علامة على إشعار كمقروء
   * Mark notification as read
   *
   * @param {string} id - معرّف الإشعار
   */
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.emit('notification-read', notification);
    }
  }

  /**
   * وضع علامة على جميع الإشعارات كمقروء
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => {
      n.read = true;
    });
    this.emit('all-read');
  }

  /**
   * حذف إشعار
   * Delete notification
   *
   * @param {string} id - معرّف الإشعار
   */
  delete(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.emit('notification-deleted', id);
  }

  /**
   * حذف جميع الإشعارات
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.emit('notifications-cleared');
  }

  /**
   * الحصول على حالة الاتصال
   * Get connection status
   *
   * @returns {boolean}
   */
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * قطع الاتصال
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.emit('disconnected');
  }

  /**
   * الحصول على إحصائيات الإشعارات
   * Get notification statistics
   *
   * @returns {Object}
   */
  getStatistics() {
    return {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.read).length,
      byType: this.notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {}),
      isConnected: this.isConnected(),
    };
  }
}

// إنشاء instance واحد فقط
const notificationService = new NotificationService();

export default notificationService;
