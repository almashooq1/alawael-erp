# Alawael ERP - Frontend Application

Modern React frontend for Alawael ERP System built with Vite, Material-UI, and RTL support.

## 🚀 Quick Start

### Install Dependencies

```bash
cd frontend-app
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will start on http://localhost:3000 and proxy API requests to http://localhost:3001

### Build for Production

```bash
npm run build
```

## 📦 Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **UI Library:** Material-UI v5
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Forms:** React Hook Form + Yup
- **Charts:** Recharts
- **Notifications:** React Toastify

## 🎨 Features

- ✅ RTL (Right-to-Left) support for Arabic
- ✅ Responsive design (Mobile, Tablet, Desktop)
- ✅ Dark mode ready
- ✅ Protected routes with authentication
- ✅ Axios interceptors for token management
- ✅ Form validation
- ✅ Toast notifications

## 📁 Project Structure

```
frontend-app/
├── src/
│   ├── layouts/       # Layout components (MainLayout, etc.)
│   ├── pages/         # Page components (Login, Dashboard, etc.)
│   ├── services/      # API services (authService, etc.)
│   ├── store/         # Zustand stores
│   ├── App.jsx        # Main app component
│   └── main.jsx       # Entry point
├── index.html
├── vite.config.js
└── package.json
```

## 🔐 Default Credentials

**Admin Account:**

- Email: `admin@alawael.com`
- Password: `Admin@123456`

## 🌐 API Proxy

All `/api/*` requests are automatically proxied to `http://localhost:3001` (configured in vite.config.js).

## 📝 Next Steps

1. [ ] Build HR Management pages
2. [ ] Build CRM pages
3. [ ] Build E-Learning portal
4. [ ] Add charts and analytics
5. [ ] Implement real-time notifications (Socket.IO)
6. [ ] Add file upload for documents
7. [ ] Implement advanced reporting

---

**Built with ❤️ for Alawael Center**
