# ⚡ QUICK COMMANDS - Phase 7 Development

**استخدم هذا الملف للأوامر السريعة - Copy & Paste مباشرة!**

---

## 🚀 ابدأ الآن (الخطوة الأولى)

```powershell
# 1. انتقل للمشروع
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system\backend"

# 2. ابدأ الخادم
npm run dev
```

**النتيجة**: Backend يعمل على http://localhost:3005 ✅

---

## ✅ اختبر API (في Terminal آخر)

```powershell
# داخل backend
npm run test:api
```

**النتيجة**: جميع الـ tests تمر ✅

---

## 📖 عرض التوثيق

افتح المتصفح:

```
http://localhost:3005/api-docs
```

---

## 🎨 Phase 7 - إنشاء Frontend

```powershell
# 1. انتقل للمشروع
cd "C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666\erp_new_system"

# 2. أنشئ React app
npx create-react-app frontend

# 3. ادخل المشروع
cd frontend

# 4. ثبت المتطلبات
npm install axios redux @reduxjs/toolkit react-redux react-router-dom

# 5. ابدأ التطوير
npm start
```

**النتيجة**: Frontend يعمل على http://localhost:3000 ✅

---

## 🔗 ربط API بـ Frontend

### أنشئ: `frontend/src/services/api.js`

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3005/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

## 🏗️ أنشئ هيكل Frontend

```powershell
# داخل frontend/src
cd src

# أنشئ المجلدات
mkdir components pages services store utils hooks

# أنشئ ملفات أساسية
# components/Login.jsx
# pages/Dashboard.jsx
# store/authSlice.js
```

---

## 📱 أول Component - Login

### أنشئ: `frontend/src/components/Login.jsx`

```javascript
import React, { useState } from 'react';
import apiClient from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      localStorage.setItem('token', response.data.data.token);
      console.log('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
```

---

## 🎯 Redux Setup

### أنشئ: `frontend/src/store/authSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    logout: state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
  },
});

export const { setUser, setToken, logout } = authSlice.actions;
export default authSlice.reducer;
```

---

## ⚙️ إعداد Store

### أنشئ: `frontend/src/store/index.js`

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});
```

---

## 📝 تحديث App.jsx

```javascript
import { Provider } from 'react-redux';
import { store } from './store';
import Login from './components/Login';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <Login />
      </div>
    </Provider>
  );
}

export default App;
```

---

## 🔧 حل المشاكل الشائعة

### ❌ CORS Error

✅ الحل:

- تأكد من Backend يعمل (npm run dev)
- تأكد من .env يحتوي: `CORS_ORIGIN=http://localhost:3000`

### ❌ Port already in use

```powershell
# اقتل العملية
Get-Process -Id (Get-NetTCPConnection -LocalPort 3005).OwningProcess | Stop-Process

# أو غيّر PORT في .env
PORT=3006
```

### ❌ Module not found

```powershell
# نظّف المكتبات
npm ci

# أو أعد التثبيت
rm -r node_modules package-lock.json
npm install
```

---

## 📚 الأوامر الأساسية

| الأمر                   | الوصف          |
| ----------------------- | -------------- |
| `npm run dev`           | تشغيل Backend  |
| `npm run test:api`      | اختبار APIs    |
| `npm start`             | تشغيل Frontend |
| `npm install [package]` | تثبيت مكتبة    |
| `npm run build`         | بناء للإنتاج   |

---

## 🎯 URLs المهمة

| الخدمة            | URL                              |
| ----------------- | -------------------------------- |
| Backend API       | http://localhost:3005            |
| API Documentation | http://localhost:3005/api-docs   |
| Health Check      | http://localhost:3005/api/health |
| Frontend          | http://localhost:3000            |

---

## 📖 الأدلة المهمة

- [⭐_START_HERE_FIXES.md](../../⭐_START_HERE_FIXES.md)
- [backend/QUICK_START.md](../QUICK_START.md)
- [🎨_FRONTEND_INTEGRATION_GUIDE.md](../🎨_FRONTEND_INTEGRATION_GUIDE.md)
- [📋_DEVELOPMENT_TRACKER.md](../../📋_DEVELOPMENT_TRACKER.md)

افتح Terminal:

```powershell
cd backend
code .env
```

**استبدل هذين السطرين:**

**من:**

```env
MONGODB_URI=mongodb://localhost:27017/alawael-erp
USE_MOCK_DB=true
```

**إلى (الصق رابط Atlas الخاص بك):**

```env
MONGODB_URI=mongodb+srv://alawael_admin:Admin@2026@cluster0.xxxxx.mongodb.net/alawael-erp?retryWrites=true&w=majority
USE_MOCK_DB=false
```

احفظ: `Ctrl+S`

---

### 7. Import Data

```powershell
node scripts\seed.js
```

يجب أن تشوف:

```
✅ Connected to MongoDB
✅ Organization created
✅ Data seeding completed!
```

---

### 8. Verify

```powershell
node scripts\verify-mongodb.js
```

يجب أن تشوف:

```
✅ Connected to MongoDB!
   Database: alawael-erp
   Collections: 5
```

---

### 9. Start System

**Terminal 1:**

```powershell
npm start
```

**Terminal 2:**

```powershell
cd frontend
npm start
```

---

### 10. Test

```powershell
Invoke-RestMethod http://localhost:3001/api/organizations | ConvertTo-Json
```

---

## ✅ Done! 🎉

البيانات الآن محفوظة في السحابة ودائمة!

---

## 🔧 Troubleshooting

| Problem             | Solution                                   |
| ------------------- | ------------------------------------------ |
| ❌ "bad auth"       | تأكد من `alawael_admin` و `Admin@2026`     |
| ❌ "ECONNREFUSED"   | أضف IP: 0.0.0.0/0 في Network Access        |
| ❌ "Not connecting" | انسخ Connection String مرة أخرى من MongoDB |
| ❌ "ENOTFOUND"      | تأكد من الاتصال بالإنترنت                  |

---

## 📱 Quick Commands

```powershell
# التحقق من الاتصال
node scripts\verify-mongodb.js

# استيراد البيانات
node scripts\seed.js

# بدء النظام
npm start

# اختبار API
Invoke-RestMethod http://localhost:3001/api/organizations

# النسخ الاحتياطي
node scripts\backup.js
```

---

**إذا حصلت على خطأ، ارسل الخطأ كاملاً!**
