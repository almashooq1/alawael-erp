# 📚 Swagger/OpenAPI Documentation Guide

## نظام تأهيل ذوي الإعاقة - API Documentation

### 📖 Files Created

1. **config/swagger.js** - Swagger configuration with OpenAPI 3.0 specification
2. **config/swagger-ui.js** - Swagger UI setup and mounting
3. **routes/disability-rehabilitation-swagger.routes.js** - Enhanced routes with
   JSDoc comments

### 🚀 Installation & Setup

#### Step 1: Install Required Packages

```bash
npm install swagger-jsdoc swagger-ui-express
```

#### Step 2: Update server.js

Add to your Express server:

```javascript
const setupSwaggerUI = require('./config/swagger-ui');

// Mount Swagger UI
setupSwaggerUI(app);

// Mount API routes
app.use(
  '/api/disability-rehabilitation',
  require('./routes/disability-rehabilitation.routes')
);
```

#### Step 3: Access Swagger UI

```
http://localhost:3001/api/docs
```

---

## 📋 Documented Endpoints (13 Total)

### System

- **GET /info** - Get system information

### Programs Management

- **POST /programs** - Create new program
- **GET /programs** - Get all programs (with advanced filtering)
- **GET /programs/{id}** - Get specific program
- **PUT /programs/{id}** - Update program
- **DELETE /programs/{id}** - Delete program

### Therapy Sessions

- **POST /programs/{id}/sessions** - Add therapy session

### Goals Management

- **PUT /programs/{id}/goals/{goalId}** - Update goal status

### Assessments

- **POST /programs/{id}/assessments** - Add assessment

### Program Operations

- **PUT /programs/{id}/complete** - Complete program

### Analytics & Reporting

- **GET /statistics** - Get system statistics
- **GET /performance/{year}/{month}** - Get monthly performance
- **GET /beneficiary/{beneficiaryId}/programs** - Get beneficiary programs
- **GET /programs/{id}/report** - Get detailed report

---

## 🔐 Authentication

All endpoints require JWT Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

---

## ✅ Features Included

✅ OpenAPI 3.0 specification ✅ Comprehensive schema definitions ✅
Request/response examples ✅ Role-based access control documentation ✅ Advanced
filtering parameters ✅ Error responses documentation ✅ Arabic support in UI ✅
Syntax highlighting ✅ Try-it-out functionality

---

## 📊 Schema Definitions

Fully documented schemas for:

- ProgramInfo
- Beneficiary
- DisabilityInfo
- RehabilitationGoal
- RehabilitationService
- TherapySession
- DisabilityRehabilitation
- ApiResponse
- Error

---

## 🎯 Benefits

1. **Easy API Testing** - Try endpoints directly from Swagger UI
2. **Clear Documentation** - All parameters and responses documented
3. **Developer Friendly** - Self-generating documentation
4. **Security** - Built-in authentication support
5. **Professional** - Enterprise-grade API documentation
6. **Maintainable** - Documentation stays in sync with code
