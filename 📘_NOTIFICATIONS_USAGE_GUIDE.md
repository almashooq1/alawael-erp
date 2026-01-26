# 📘 دليل استخدام نظام الإشعارات المحسّن

## مقدمة

تم تحسين نظام الإشعارات بـ 5 أولويات رئيسية لجعله أكثر موثوقية وأماناً وسهولة في
الاستخدام.

---

## 🚀 البدء السريع

### 1. استيراد الـ Hook

```javascript
import { useNotifications } from './contexts/NotificationContext';

function MyComponent() {
  const notifications = useNotifications();
  // ...
}
```

### 2. الوصول إلى البيانات والدوال

```javascript
const {
  // البيانات
  notifications, // قائمة الإشعارات
  unreadCount, // عدد الإشعارات غير المقروءة
  loading, // هل جاري التحميل
  hasMore, // هل هناك إشعارات أخرى
  error, // رسالة الخطأ الحالية
  preferences, // تفضيلات المستخدم

  // الدوال
  fetchNotifications, // جلب الإشعارات
  markAsRead, // تحديد كمقروء
  markAllAsRead, // تحديد الكل كمقروء
  deleteNotification, // حذف إشعار
  loadMore, // تحميل المزيد
  toggleNotificationsMute, // كتم الإشعارات
  setPaginationLimit, // تعيين حد الـ pagination
} = useNotifications();
```

---

## 📝 أمثلة الاستخدام

### مثال 1: عرض الإشعارات

```javascript
function NotificationsPage() {
  const { notifications, loading, error } = useNotifications();

  if (loading) return <div>جاري التحميل...</div>;
  if (error) return <div style={{ color: 'red' }}>⚠️ {error.message}</div>;

  return (
    <div>
      {notifications.length === 0 ? (
        <p>لا توجد إشعارات</p>
      ) : (
        notifications.map(notif => (
          <div key={notif._id} className="notification">
            <h3>{notif.title}</h3>
            <p>{notif.message}</p>
            <small>{notif.createdAt}</small>
          </div>
        ))
      )}
    </div>
  );
}
```

### مثال 2: تحديد كمقروء

```javascript
function NotificationItem({ notification }) {
  const { markAsRead } = useNotifications();

  return (
    <div className={notification.isRead ? 'read' : 'unread'}>
      <h3>{notification.title}</h3>
      <p>{notification.message}</p>
      {!notification.isRead && (
        <button onClick={() => markAsRead(notification._id)}>
          تحديد كمقروء
        </button>
      )}
    </div>
  );
}
```

### مثال 3: كتم الإشعارات

```javascript
function NotificationSettings() {
  const { preferences, toggleNotificationsMute } = useNotifications();

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={preferences.notificationsMuted}
          onChange={toggleNotificationsMute}
        />
        كتم الإشعارات
      </label>

      {preferences.notificationsMuted && (
        <p style={{ color: 'orange' }}>
          🔇 الإشعارات مكتومة - لن تتلقى أي إشعارات
        </p>
      )}
    </div>
  );
}
```

### مثال 4: تخصيص حد الـ Pagination

```javascript
function PaginationSettings() {
  const { preferences, setPaginationLimit } = useNotifications();

  const handleLimitChange = e => {
    const newLimit = parseInt(e.target.value);
    setPaginationLimit(newLimit);
  };

  return (
    <div>
      <label>
        عدد الإشعارات لكل صفحة:
        <input
          type="number"
          min="1"
          max="100"
          value={preferences.paginationLimit}
          onChange={handleLimitChange}
        />
      </label>
      <small>الحد الأدنى: 1، الحد الأقصى: 100</small>
    </div>
  );
}
```

### مثال 5: تحميل المزيد

```javascript
function NotificationsFeed() {
  const { notifications, hasMore, loading, loadMore } = useNotifications();

  return (
    <div>
      {notifications.map(notif => (
        <NotificationItem key={notif._id} notification={notif} />
      ))}

      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
        </button>
      )}
    </div>
  );
}
```

### مثال 6: حذف الإشعارات

```javascript
function NotificationItem({ notification }) {
  const { deleteNotification, deleteReadNotifications } = useNotifications();

  return (
    <div>
      <h3>{notification.title}</h3>
      <button onClick={() => deleteNotification(notification._id)}>
        حذف هذا الإشعار
      </button>
      {notification.isRead && (
        <button onClick={deleteReadNotifications}>
          حذف جميع الإشعارات المقروءة
        </button>
      )}
    </div>
  );
}
```

---

## ⚙️ التفضيلات (Preferences)

### البنية:

```javascript
{
  notificationsMuted: false,      // كتم الإشعارات (boolean)
  selectedChannels: ['all'],      // القنوات المختارة (array)
  soundEnabled: true,             // تفعيل الصوت (boolean)
  emailEnabled: true,             // تفعيل البريد الإلكتروني (boolean)
  paginationLimit: 20,            // حد الـ pagination (number: 1-100)
}
```

### تحديث التفضيلات:

```javascript
const { updatePreferences } = useNotifications();

// تحديث خاصية واحدة:
updatePreferences({ soundEnabled: false });

// تحديث عدة خصائص:
updatePreferences({
  notificationsMuted: true,
  paginationLimit: 50,
});

// التفضيلات تُحفظ تلقائياً في localStorage
```

---

## 🛡️ معالجة الأخطاء

### عرض الأخطاء:

الأخطاء تظهر تلقائياً في الـ UI كرسالة حمراء في أعلى اليمين:

```
⚠️ Error fetching notifications: Network timeout
```

### الأخطاء تختفي تلقائياً:

بعد 5 ثوانٍ، الرسالة تختفي تلقائياً.

### التعامل مع الأخطاء يدوياً:

```javascript
function NotificationsPage() {
  const { error } = useNotifications();

  return (
    <>
      {error && (
        <div
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        >
          ⚠️ {error.message}
        </div>
      )}
    </>
  );
}
```

---

## 🔄 WebSocket Reconnection

### آلية إعادة الاتصال:

- **المحاولات القصوى**: 15 محاولة (مرتفعة من 5)
- **التأخير الأولي**: 1-2 ثانية
- **الزيادة**: تتضاعف مع كل محاولة
- **الحد الأقصى**: 30 ثانية

### مثال على الأوقات:

```
المحاولة 1:  1-2 ثانية
المحاولة 2:  2-4 ثوانٍ
المحاولة 3:  4-8 ثوانٍ
المحاولة 4:  8-16 ثانية
المحاولة 5:  16-30 ثانية
المحاولات 6-15: 30 ثانية (ثابتة)
```

### لا تحتاج لفعل شيء - تحدث تلقائياً!

---

## 📊 مثال عملي شامل

```javascript
import React from 'react';
import { useNotifications } from './contexts/NotificationContext';

function NotificationsApp() {
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    error,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    loadMore,
    toggleNotificationsMute,
    setPaginationLimit,
  } = useNotifications();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* عنوان */}
      <h1>الإشعارات ({unreadCount})</h1>

      {/* الإعدادات */}
      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <label>
            <input
              type="checkbox"
              checked={preferences.notificationsMuted}
              onChange={toggleNotificationsMute}
            />{' '}
            كتم الإشعارات
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            حد الـ Pagination:
            <input
              type="number"
              min="1"
              max="100"
              value={preferences.paginationLimit}
              onChange={e => setPaginationLimit(parseInt(e.target.value))}
              style={{ marginLeft: '8px', width: '60px' }}
            />
          </label>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            تحديد الكل كمقروء
          </button>
        )}

        {notifications.some(n => n.isRead) && (
          <button
            onClick={deleteReadNotifications}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
          >
            حذف المقروءة
          </button>
        )}
      </div>

      {/* رسالة الخطأ */}
      {error && (
        <div
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        >
          ⚠️ {error.message}
        </div>
      )}

      {/* الإشعارات */}
      {loading && notifications.length === 0 ? (
        <div>جاري التحميل...</div>
      ) : notifications.length === 0 ? (
        <div>لا توجد إشعارات</div>
      ) : (
        <>
          {notifications.map(notif => (
            <div
              key={notif._id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: notif.isRead ? '#f5f5f5' : '#fff3e0',
                borderLeft: notif.isRead ? 'none' : '4px solid #ff9800',
                borderRadius: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0' }}>{notif.title}</h3>
                  <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                    {notif.message}
                  </p>
                  <small style={{ color: '#999' }}>
                    {new Date(notif.createdAt).toLocaleString('ar-SA')}
                  </small>
                </div>
                <div>
                  {!notif.isRead && (
                    <button
                      onClick={() => markAsRead(notif._id)}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        width: '100%',
                      }}
                    >
                      ✓ مقروء
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif._id)}
                    style={{
                      backgroundColor: '#f44336',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    🗑️ حذف
                  </button>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '12px',
              }}
            >
              {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default NotificationsApp;
```

---

## 💡 نصائح مهمة

### 1. الأداء:

- استخدم `useCallback` لتجنب إعادة التصيير غير الضرورية
- لا تدعو `fetchNotifications` في كل render

### 2. الأمان:

- الأخطاء معالجة بأمان - لن تظهر messages خطرة
- توكن JWT مُمرر بأمان في Authorization header

### 3. المستخدم:

- إذا فشل الاتصال، المستخدم يرى رسالة واضحة
- التفضيلات محفوظة تلقائياً

### 4. التطوير:

- استخدم React DevTools للتحقق من الـ state
- فتح Browser Console لرؤية الـ logs

---

## 🐛 استكشاف الأخطاء

### المشكلة: الإشعارات لا تظهر

**الحل**:

1. تحقق من أن WebSocket متصل (DevTools → Network)
2. تحقق من الـ token في Authorization header
3. افتح Browser Console لرؤية الأخطاء

### المشكلة: تأخير في التحميل

**الحل**:

1. تقليل `paginationLimit`
2. تحقق من سرعة الإنترنت
3. تحقق من API response time

### المشكلة: التفضيلات لا تُحفظ

**الحل**:

1. تحقق من أن localStorage مفعل
2. تحقق من storage quota في DevTools
3. امسح الـ cache وأعد المحاولة

---

## 📞 الدعم

للمزيد من المساعدة:

- 📖 اقرأ الملف: `⚡_NOTIFICATIONS_IMPROVEMENTS_COMPLETE.md`
- 🧪 شغّل الاختبارات: `NotificationContext.test.js`
- 📝 تفقد الكود: `NotificationContext.js`

---

**آخر تحديث**: 23 يناير 2026 **الحالة**: ✅ جاهز للاستخدام
