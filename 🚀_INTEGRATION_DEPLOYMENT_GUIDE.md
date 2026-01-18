# 🚀 Complete Integration & Deployment Guide

# دليل التكامل والنشر الكامل

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Integration](#frontend-integration)
4. [Database Setup](#database-setup)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- Python 3.9+
- Node.js 16+
- MongoDB 4.4+ or MySQL 8.0+
- Docker (for containerized deployment)
- Git

### Environment Variables

Create `.env` file in the backend directory:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/alawael
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password

# API Configuration
API_PORT=5000
API_HOST=0.0.0.0
DEBUG=False
SECRET_KEY=your_secret_key_here

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=notifications@example.com
SENDER_PASSWORD=your_email_password

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Frontend
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=Alawael ERP
```

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install packages
pip install -r requirements.txt
```

### 2. Install New Service Packages

```bash
pip install flask flask-cors flask-restful
pip install pymongo
pip install pydantic python-dotenv
pip install pytest pytest-asyncio
pip install pytz
```

### 3. Register API Routes in Main App

```python
# app.py
from flask import Flask
from api.ai_prediction_api import api as predictions_bp
from api.smart_reports_api import api as reports_bp
from api.smart_notifications_api import api as notifications_bp
from api.support_system_api import api as support_bp
from api.performance_analytics_api import api as analytics_bp

app = Flask(__name__)

# Register blueprints
app.register_blueprint(predictions_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(notifications_bp)
app.register_blueprint(support_bp)
app.register_blueprint(analytics_bp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

### 4. Initialize Database Collections

```python
# db_init.py
from pymongo import MongoClient

client = MongoClient(os.getenv('DATABASE_URL'))
db = client['alawael']

# Create collections
collections = [
    'predictions',
    'prediction_history',
    'reports',
    'report_schedules',
    'notifications',
    'notification_preferences',
    'support_tickets',
    'ticket_messages',
    'metrics',
    'alerts',
    'alert_history'
]

for collection in collections:
    if collection not in db.list_collection_names():
        db.create_collection(collection)
        print(f"Created collection: {collection}")

# Create indexes
db['predictions'].create_index('user_id')
db['reports'].create_index('created_at')
db['support_tickets'].create_index([('status', 1), ('priority', -1)])
db['metrics'].create_index('timestamp')
```

---

## Frontend Integration

### 1. Install Frontend Dependencies

```bash
cd alawael-erp-frontend

# Install packages
npm install
npm install axios pinia vue-router
npm install chart.js
npm install date-fns
```

### 2. Register New Components

```javascript
// src/main.js
import { createApp } from 'vue';
import App from './App.vue';

// Import new components
import AIPredictions from './components/AIPredictions.vue';
import SmartReports from './components/SmartReports.vue';
import SmartNotifications from './components/SmartNotifications.vue';
import SupportSystem from './components/SupportSystem.vue';
import PerformanceAnalytics from './components/PerformanceAnalytics.vue';

const app = createApp(App);

// Register components globally
app.component('AIPredictions', AIPredictions);
app.component('SmartReports', SmartReports);
app.component('SmartNotifications', SmartNotifications);
app.component('SupportSystem', SupportSystem);
app.component('PerformanceAnalytics', PerformanceAnalytics);

app.mount('#app');
```

### 3. Add Routes

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/predictions',
    name: 'Predictions',
    component: () => import('../components/AIPredictions.vue'),
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('../components/SmartReports.vue'),
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../components/SmartNotifications.vue'),
  },
  {
    path: '/support',
    name: 'Support',
    component: () => import('../components/SupportSystem.vue'),
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: () => import('../components/PerformanceAnalytics.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

### 4. Create Pinia Stores

```javascript
// src/stores/predictions.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePredictionStore = defineStore('predictions', () => {
  const predictions = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchPredictions = async () => {
    loading.value = true;
    try {
      const response = await fetch('/api/predictions/dashboard');
      const data = await response.json();
      predictions.value = data.data.recent_predictions;
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  return { predictions, loading, error, fetchPredictions };
});
```

---

## Database Setup

### MongoDB Setup

```javascript
// Create database and collections
use alawael;

db.createCollection('predictions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'type', 'confidence'],
      properties: {
        _id: { bsonType: 'objectId' },
        user_id: { bsonType: 'string' },
        type: { enum: ['student', 'deal', 'maintenance', 'risk'] },
        confidence: { bsonType: 'int', minimum: 0, maximum: 100 },
        created_at: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes
db.predictions.createIndex({ user_id: 1, created_at: -1 });
db.reports.createIndex({ created_at: -1 });
db.support_tickets.createIndex({ status: 1, priority: -1 });
db.metrics.createIndex({ timestamp: 1 });
```

### SQL Setup (MySQL Alternative)

```sql
-- Create databases and tables
CREATE DATABASE alawael_erp;
USE alawael_erp;

CREATE TABLE predictions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  type ENUM('student', 'deal', 'maintenance', 'risk'),
  confidence INT CHECK (confidence >= 0 AND confidence <= 100),
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at)
);

CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  type ENUM('student_progress', 'sales_performance', 'financial_summary'),
  data JSON,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
);

-- Additional tables...
```

---

## Testing

### Run Backend Tests

```bash
# Install test dependencies
pip install pytest pytest-cov pytest-asyncio

# Run all tests
pytest tests/ -v --tb=short

# Run with coverage
pytest tests/ --cov=services --cov-report=html

# Run specific test file
pytest tests/test_all_features.py -v
```

### Run Frontend Tests

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/ui

# Run tests
npm run test

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Start services
python -m backend.app &
npm run dev &

# Run integration tests
pytest tests/test_integration.py -v
```

---

## Deployment

### Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - '5000:5000'
    environment:
      - DATABASE_URL=mongodb://admin:password@mongodb:27017/alawael
      - API_PORT=5000
    depends_on:
      - mongodb
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./alawael-erp-frontend
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    depends_on:
      - backend

volumes:
  mongo_data:
```

### Deploy Command

```bash
# Build and run containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Cloud Deployment (Railway/Heroku)

**Backend on Railway:**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize and deploy
railway init
railway up
```

**Environment Variables:**

```
DATABASE_URL=your_mongodb_atlas_url
API_PORT=8000
SECRET_KEY=your_secret_key
```

---

## Monitoring

### Backend Monitoring

```python
# Add monitoring to app.py
from prometheus_client import Counter, Histogram
import time

request_count = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint'])
request_duration = Histogram('api_request_duration_seconds', 'API request duration')

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    request_count.labels(
        method=request.method,
        endpoint=request.endpoint
    ).inc()
    request_duration.observe(duration)
    return response
```

### Frontend Monitoring

```javascript
// src/utils/monitoring.js
export const trackPageView = pageName => {
  console.log(`Page viewed: ${pageName}`);
  // Send to analytics service
};

export const trackEvent = (eventName, data) => {
  console.log(`Event: ${eventName}`, data);
  // Send to analytics service
};
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Error**

```
Error: Connection refused
Solution: Ensure MongoDB is running: mongod --dbpath /data/db
```

**2. CORS Error**

```
Error: Access to XMLHttpRequest blocked by CORS policy
Solution: Add to app.py:
  from flask_cors import CORS
  CORS(app)
```

**3. Port Already in Use**

```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

**4. Module Not Found**

```bash
# Reinstall dependencies
pip install -r requirements.txt
npm install
```

---

## Performance Tuning

### Backend Optimization

```python
# Enable caching
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/api/predictions/dashboard')
@cache.cached(timeout=300)
def predictions_dashboard():
    # Endpoint code
```

### Frontend Optimization

```javascript
// Lazy load components
const AIPredictions = defineAsyncComponent(() => import('./components/AIPredictions.vue'));

// Enable production mode
import.meta.env.PROD && Object.freeze(app.config.globalProperties);
```

---

## Security Checklist

- [ ] Environment variables set correctly
- [ ] Database credentials stored securely
- [ ] API endpoints have authentication
- [ ] HTTPS enabled in production
- [ ] SQL/NoSQL injection prevention implemented
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Sensitive data logged is minimal
- [ ] Regular security updates applied

---

## Next Steps

1. Deploy to production environment
2. Set up monitoring and alerting
3. Configure backup and recovery procedures
4. Implement user documentation
5. Plan for scaling and optimization
6. Establish support procedures
