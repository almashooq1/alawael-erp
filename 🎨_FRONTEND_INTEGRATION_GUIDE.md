# 🎨 Frontend Integration Guide - Phase 7

## 📦 Prerequisites

- Node.js v18+ installed
- npm or yarn package manager
- Backend running on http://localhost:3005
- Basic React knowledge

---

## 🚀 Setup Frontend

### 1. Create React App

```bash
cd erp_new_system
npx create-react-app frontend
cd frontend
```

### 2. Install Dependencies

```bash
npm install axios react-router-dom @reduxjs/toolkit react-redux
```

**Additional Recommended Packages**:

```bash
npm install tailwindcss postcss autoprefixer
npm install react-icons react-toastify
npm install moment date-fns
npm install zustand
```

### 3. Update .env

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:3005/api
REACT_APP_API_HEALTH=http://localhost:3005/health
REACT_APP_API_DOCS=http://localhost:3005/api-docs
NODE_ENV=development
```

---

## 📁 Recommended Folder Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   └── Widgets/
│   │   ├── Layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Footer.jsx
│   │   └── Common/
│   │       ├── Loading.jsx
│   │       ├── ErrorBoundary.jsx
│   │       └── NotFound.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Users.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   ├── services/
│   │   ├── api.js ..................... API client setup
│   │   ├── auth.js .................... Auth API calls
│   │   ├── users.js ................... User API calls
│   │   └── ...
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.js
│   │   │   ├── userSlice.js
│   │   │   └── appSlice.js
│   │   └── store.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useUser.js
│   │   └── useFetch.js
│   ├── styles/
│   │   ├── index.css
│   │   ├── tailwind.css
│   │   └── variables.css
│   ├── utils/
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── constants.js
│   ├── App.jsx
│   └── index.js
├── public/
├── .env
├── package.json
└── README.md
```

---

## 🔌 API Client Setup

Create `src/services/api.js`:

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3005/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Handle responses
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
```

---

## 🔐 Authentication Service

Create `src/services/auth.js`:

```javascript
import api from './api';

export const authService = {
  register: userData => api.post('/auth/register', userData),

  login: (email, password) => api.post('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  verifyToken: () => api.get('/auth/verify-token'),

  getProfile: () => api.get('/auth/me'),

  updateProfile: data => api.patch('/auth/update-profile', data),

  changePassword: (oldPassword, newPassword) =>
    api.post('/auth/change-password', { oldPassword, newPassword }),

  forgotPassword: email => api.post('/auth/forgot-password', { email }),

  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
};
```

---

## 👥 Users Service

Create `src/services/users.js`:

```javascript
import api from './api';

export const userService = {
  getAll: params => api.get('/users', { params }),

  getById: userId => api.get(`/users/${userId}`),

  create: userData => api.post('/users', userData),

  update: (userId, data) => api.put(`/users/${userId}`, data),

  delete: userId => api.delete(`/users/${userId}`),

  updateStatus: (userId, status) =>
    api.patch(`/users/${userId}/status`, { status }),

  updateRole: (userId, role) => api.patch(`/users/${userId}/role`, { role }),

  getStats: () => api.get('/users/stats/overview'),

  search: query => api.get('/users/search', { params: { q: query } }),

  importCSV: file => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/import/csv', formData);
  },
};
```

---

## 🏪 Redux Store Setup

Create `src/store/store.js`:

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import appReducer from './slices/appSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    app: appReducer,
  },
});
```

Create `src/store/slices/authSlice.js`:

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
      state.isAuthenticated = true;
    },
    logout: state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setUser, setToken, logout, setLoading, setError } =
  authSlice.actions;
export default authSlice.reducer;
```

---

## 🛡️ Protected Route Component

Create `src/components/Auth/ProtectedRoute.jsx`:

```javascript
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};
```

---

## 📱 Login Component Example

Create `src/components/Auth/Login.jsx`:

```javascript
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setUser, setToken } from '../../store/slices/authSlice';
import { authService } from '../../services/auth';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(email, password);
      dispatch(setToken(response.data.token));
      dispatch(setUser(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <div className="error">{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};
```

---

## 🎯 App.jsx Setup

```javascript
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store/store';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Login } from './components/Auth/Login';
import { Dashboard } from './pages/Dashboard';
import { Home } from './pages/Home';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
```

---

## 🧪 Testing API Connection

Add to `src/App.jsx` or create test component:

```javascript
useEffect(() => {
  const checkAPI = async () => {
    try {
      const response = await fetch('http://localhost:3005/api/health');
      const data = await response.json();
      console.log('✅ API Health:', data);
    } catch (error) {
      console.error('❌ API Error:', error);
    }
  };

  checkAPI();
}, []);
```

---

## 🚀 Start Development

### Terminal 1: Backend

```bash
cd erp_new_system/backend
npm run dev
# Backend runs on http://localhost:3005
```

### Terminal 2: Frontend

```bash
cd erp_new_system/frontend
npm start
# Frontend runs on http://localhost:3000
```

---

## 📚 Available API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `PATCH /auth/update-profile` - Update profile

### Users

- `GET /users` - Get all users
- `GET /users/:userId` - Get user details
- `POST /users` - Create user
- `PUT /users/:userId` - Update user
- `DELETE /users/:userId` - Delete user

### Other Systems

- See `/api-docs` for complete list

---

## 🔗 CORS Configuration

Backend `.env` includes:

```
CORS_ORIGIN=http://localhost:3000,http://localhost:3002,http://localhost:3003
```

If you use different port, update it!

---

## 🛠️ Common Issues

### CORS Error

```
Access to XMLHttpRequest blocked by CORS
```

**Solution**:

1. Ensure backend is running
2. Check CORS_ORIGIN in backend .env
3. Update frontend API_URL in .env

### 401 Unauthorized

```
{ message: "Unauthorized", statusCode: 401 }
```

**Solution**:

1. Login first to get token
2. Token stored in localStorage
3. Add Authorization header to requests

### Connection Refused

```
Cannot connect to http://localhost:3005
```

**Solution**:

1. Start backend: `npm run dev`
2. Check PORT in .env
3. Verify no port conflicts

---

## 📋 Development Checklist

- [ ] Frontend created with `create-react-app`
- [ ] Dependencies installed
- [ ] `.env` configured
- [ ] API client setup
- [ ] Services created
- [ ] Redux store configured
- [ ] Protected routes working
- [ ] Login component functional
- [ ] Dashboard component created
- [ ] API calls tested
- [ ] Authentication flow working
- [ ] Data display on pages
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Responsive design applied

---

## 📖 Next Steps

1. ✅ Setup complete
2. 🔄 Build components
3. 🧪 Test integration
4. 🎨 Style UI
5. ⚙️ Configure settings
6. 📊 Add data visualization
7. 🚀 Deploy

---

**Ready to build the frontend! 🎨**

تم تحضير الخطوات اللازمة لبناء الواجهة الأمامية! 🚀
