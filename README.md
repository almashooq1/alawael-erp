# AlAwael ERP System | نظام الأوائل لتخطيط موارد المؤسسات

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)
![React](https://img.shields.io/badge/React-18.2-blue?logo=react)
![Express](https://img.shields.io/badge/Express-4.18-lightgrey?logo=express)
![Material--UI](https://img.shields.io/badge/Material--UI-5.13-0081CB?logo=mui)
![License](https://img.shields.io/badge/License-MIT-yellow?logo=opensourceinitiative)
![JWT](https://img.shields.io/badge/JWT-Auth-purple?logo=jsonwebtokens)

A comprehensive, full-stack **Enterprise Resource Planning (ERP)** system designed for managing organizational resources efficiently. Built with modern technologies and featuring Arabic language support.

نظام متكامل لتخطيط موارد المؤسسات مصمم لإدارة الموارد التنظيمية بكفاءة عالية. مبني بتقنيات حديثة مع دعم كامل للغة العربية.

---

## ✨ Features | المميزات

### 🔐 Authentication & Security

- ✅ **JWT Authentication** - Secure login with access & refresh tokens
- ✅ **Role-Based Access Control** - Admin, Manager, Employee roles
- ✅ **Token Refresh Mechanism** - 24h access, 7-day refresh tokens
- ✅ **Password Hashing** - Secure bcrypt encryption
- ✅ **Security Middleware** - Helmet, rate limiting, input sanitization

### 👥 User Management

- ✅ **User Registration & Login** - Complete authentication flow
- ✅ **User Profiles** - Manage user information and settings
- ✅ **Employee Directory** - Comprehensive employee database
- ✅ **Permission Management** - Fine-grained access control

### 🏢 HR Management

- ✅ **Attendance Tracking** - Clock in/out system with reports
- ✅ **Leave Management** - Request, approve, and track leave requests
- ✅ **Employee Records** - Complete HR database with history
- ✅ **Performance Tracking** - Monitor employee performance

### 💰 Finance Management

- ✅ **Invoicing System** - Create and manage invoices
- ✅ **Expense Tracking** - Record and categorize expenses
- ✅ **Financial Reports** - Comprehensive financial analytics
- ✅ **Budget Management** - Track and control budgets

### 📊 Analytics & Reporting

- ✅ **Dashboard** - Real-time KPIs and statistics
- ✅ **Custom Reports** - Generate detailed reports
- ✅ **Data Visualization** - Charts and graphs
- ✅ **AI-Powered Insights** - Predictive analytics

### 🔔 Notifications

- ✅ **Real-time Notifications** - Instant updates
- ✅ **Email Notifications** - Automated email alerts
- ✅ **Activity Feed** - Track system activities

### 🌐 Modern UI/UX

- ✅ **Material-UI Design** - Beautiful, responsive interface
- ✅ **Arabic Language Support** - RTL layout support
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Dark Mode Ready** - Theme customization

---

## 🛠️ Tech Stack | التقنيات المستخدمة

### Backend

- **Node.js** v18.x - JavaScript runtime
- **Express.js** v4.18 - Web framework
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Express Validator** - Input validation

### Frontend

- **React** v18.2 - UI library
- **Material-UI** v5.13 - Component library
- **React Router** v6.11 - Client-side routing
- **Axios** v1.4 - HTTP client
- **Formik** v2.4 - Form handling
- **Yup** v1.2 - Schema validation

### Database

- **In-Memory JSON Database** - Fast development database
- **Modular Design** - Easy to migrate to MongoDB/PostgreSQL

---

## 🚀 Quick Start | البدء السريع

### Prerequisites | المتطلبات

- **Node.js** v18.x or higher
- **npm** v8.x or higher
- **Git**

### Installation Steps | خطوات التثبيت

1. **Clone the repository:**

   ```bash
   git clone https://github.com/almashooq1/alawael-erp.git
   cd alawael-erp
   ```

2. **Backend Setup:**

   ```bash
   cd backend
   npm install
   ```

3. **Frontend Setup:**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Variables:**

   **Backend** (`backend/.env`):

   ```env
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=your-super-secret-key-change-in-production
   JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
   JWT_EXPIRE=24h
   JWT_REFRESH_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

   **Frontend** (`frontend/.env`):

   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_API_BASE=/api
   PORT=3000
   BROWSER=none
   ```

5. **Start the Backend Server:**

   ```bash
   cd backend
   npm start
   # Backend runs on http://localhost:3001
   ```

6. **Start the Frontend Server:**
   ```bash
   cd frontend
   npm start
   # Frontend runs on http://localhost:3000
   ```

### 🔑 Default Login Credentials | بيانات الدخول الافتراضية

```
Email: admin@alawael.com
Password: Admin@123456
Role: Admin
```

---

## 📁 Project Structure | هيكل المشروع

```
alawael-erp/
├── backend/                    # Backend Node.js/Express
│   ├── api/
│   │   ├── routes/            # API route handlers
│   │   │   ├── auth.js        # Authentication endpoints
│   │   │   ├── users.js       # User management
│   │   │   ├── employees.js   # Employee management
│   │   │   ├── hr.js          # HR operations
│   │   │   ├── finance.js     # Financial operations
│   │   │   ├── reports.js     # Reporting system
│   │   │   ├── notifications.js # Notification system
│   │   │   └── ai.js          # AI/Analytics endpoints
│   │   └── middleware/        # Express middleware
│   ├── data/                  # JSON database files
│   ├── config/                # Configuration files
│   ├── server.js              # Express server entry
│   └── package.json
│
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Groups.js
│   │   │   ├── Friends.js
│   │   │   ├── Activity.js
│   │   │   └── Profile.js
│   │   ├── contexts/          # React Context API
│   │   │   └── AuthContext.js
│   │   ├── services/          # API services
│   │   └── App.js
│   └── package.json
│
├── LICENSE                    # MIT License
├── README.md                  # This file
└── CONTRIBUTING.md            # Contribution guidelines
```

---

## 🔌 API Endpoints | نقاط النهاية

### Authentication

```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login user
POST   /api/auth/refresh       - Refresh access token
POST   /api/auth/logout        - Logout user
```

### Users

```
GET    /api/users              - Get all users (Admin)
GET    /api/users/:id          - Get user by ID
PUT    /api/users/:id          - Update user
DELETE /api/users/:id          - Delete user (Admin)
```

### Employees

```
GET    /api/employees          - Get all employees
POST   /api/employees          - Create employee
GET    /api/employees/:id      - Get employee by ID
PUT    /api/employees/:id      - Update employee
DELETE /api/employees/:id      - Delete employee
```

### HR Management

```
GET    /api/hr/attendance      - Get attendance records
POST   /api/hr/attendance      - Clock in/out
GET    /api/hr/leaves          - Get leave requests
POST   /api/hr/leaves          - Submit leave request
PUT    /api/hr/leaves/:id      - Approve/reject leave
```

### Finance

```
GET    /api/finance/invoices   - Get all invoices
POST   /api/finance/invoices   - Create invoice
GET    /api/finance/expenses   - Get all expenses
POST   /api/finance/expenses   - Create expense
```

### Reports & Analytics

```
GET    /api/reports/dashboard  - Dashboard statistics
GET    /api/reports/financial  - Financial reports
GET    /api/reports/hr         - HR reports
GET    /api/ai/predictions     - AI predictions
GET    /api/ai/insights        - Business insights
```

### Notifications

```
GET    /api/notifications      - Get user notifications
POST   /api/notifications      - Create notification
PUT    /api/notifications/:id  - Mark as read
DELETE /api/notifications/:id  - Delete notification
```

For detailed API documentation, see [API.md](API.md)

---

## 🧪 Testing | الاختبار

### Run Backend Tests:

```bash
cd backend
npm test
```

### Test All APIs:

```powershell
# Windows PowerShell
.\TEST_ALL_APIS.ps1
```

### Manual Testing:

1. Start both Backend and Frontend servers
2. Navigate to `http://localhost:3000`
3. Login with default credentials
4. Test features in the dashboard

---

## 🚢 Deployment | النشر

### Backend Deployment (Node.js)

**Recommended platforms:**

- Railway
- Render
- Heroku
- DigitalOcean
- AWS Elastic Beanstalk

**Steps:**

1. Set production environment variables
2. Use `npm run start:prod` for production
3. Configure database connection (PostgreSQL/MongoDB)
4. Set up SSL certificates
5. Configure CORS for production domain

### Frontend Deployment (React)

**Recommended platforms:**

- Vercel (Recommended)
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

**Steps:**

1. Update `.env.production` with backend URL
2. Build: `npm run build`
3. Deploy build folder

---

## 🤝 Contributing | المساهمة

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

نرحب بالمساهمات! يرجى مراجعة ملف المساهمة للتفاصيل.

---

## 📝 License | الترخيص

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

هذا المشروع مرخص بموجب رخصة MIT - راجع ملف الترخيص للتفاصيل.

---

## 👥 Authors | المؤلفون

**AlAwael Team**

- GitHub: [@almashooq1](https://github.com/almashooq1)
- Repository: [alawael-erp](https://github.com/almashooq1/alawael-erp)

---

## 🙏 Acknowledgments | شكر وتقدير

- Material-UI for the beautiful component library
- React community for excellent documentation
- Express.js for the robust backend framework
- All contributors who helped make this project better

---

## 📞 Support | الدعم

- 📧 Email: support@alawael.com
- 🐛 Issues: [GitHub Issues](https://github.com/almashooq1/alawael-erp/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/almashooq1/alawael-erp/discussions)

---

## 🔗 Links | روابط

- [Documentation](docs/)
- [API Reference](API.md)
- [Changelog](CHANGELOG.md)
- [Contributing Guide](CONTRIBUTING.md)

---

<div align="center">

**⭐ If you find this project useful, please give it a star! ⭐**

**Made with ❤️ by AlAwael Team**

</div>
   The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## API Endpoints

- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `GET /api/protected` - Example protected route (requires authentication)

## Project Structure

```
splitwise/
├── app.py                 # Main Flask application
├── models.py              # Database models
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables
├── .gitignore
└── README.md
```

## License

MIT
