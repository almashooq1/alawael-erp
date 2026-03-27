# 🏗️ Architecture & Design Patterns

**Version:** 1.0.0  
**Date:** February 24, 2026  
**Status:** Production Ready

---

## 📐 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│           CLIENT LAYER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Web UI   │  │ Mobile   │  │ Admin    │  │
│  │ (React)  │  │ (Native) │  │ (Portal) │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└────────────────┬────────────────────────────┘
                 │ HTTPS/WebSocket
┌────────────────┴────────────────────────────┐
│      API GATEWAY & LOAD BALANCER            │
│     (NGINX/ALB, Rate Limiting, Auth)        │
└────────────────┬────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───┴──┐    ┌───┴──┐    ┌───┴──┐
│ App  │    │ App  │    │ App  │
│ #1   │    │ #2   │    │ #3   │
└───┬──┘    └───┬──┘    └───┬──┘
    │           │           │
    └───────────┼───────────┘
                │
     ┌──────────┼──────────┐
     │          │          │
┌────┴──┐  ┌───┴──┐  ┌───┴──┐
│ Data  │  │Cache │  │Queue │
│ Store │  │      │  │      │
│(PG)   │  │(Redis)  │(RabbitMQ)
└───────┘  └───────┘  └───────┘
```

### Layered Architecture

```
┌───────────────────────────────────┐
│      PRESENTATION LAYER           │
│  (Controllers, REST endpoints)    │
├───────────────────────────────────┤
│     SERVICE/BUSINESS LAYER        │
│  (Business logic, validation)     │
├───────────────────────────────────┤
│       DATA ACCESS LAYER           │
│  (Repositories, ORM queries)      │
├───────────────────────────────────┤
│      INFRASTRUCTURE LAYER         │
│  (Database, Cache, Queue, Email)  │
└───────────────────────────────────┘
```

### Module Structure

```
alawael-unified/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── routes/          # API endpoints (75+)
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic (95+)
│   │   ├── models/          # Data models (45+)
│   │   ├── middleware/      # Request middleware
│   │   ├── validators/      # Input validation
│   │   ├── utils/           # Utilities
│   │   ├── lib/             # Libraries
│   │   └── app.js           # Express setup
│   ├── test/                # Unit/Integration tests
│   └── migrations/          # Database migrations
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom hooks
│   │   ├── store/           # State management
│   │   └── utils/           # Utilities
│   └── test/                # Tests
│
├── mobile/
│   ├── src/
│   │   ├── screens/         # Screens
│   │   ├── components/      # Components
│   │   └── services/        # API services
│   └── test/                # Tests
│
└── docs/
    ├── api.md
    ├── architecture.md
    └── deployment.md
```

---

## 🎯 Design Patterns Used

### 1. MVC (Model-View-Controller)

**Purpose:** Separate concerns in web application

**Implementation:**
```
Model:      Database models (user.js, order.js)
View:       React components / Frontend
Controller: Express route handlers
```

**Example:**
```javascript
// Model: models/User.js
const User = sequelize.define('User', { ... });

// Controller: controllers/userController.js
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
};

// Route: routes/users.js
router.get('/:id', userController.getUser);
```

---

### 2. Service Layer Pattern

**Purpose:** Isolate business logic from controllers

**Implementation:**
```
Controller → Service → Repository → Database
```

**Example:**
```javascript
// Service: services/userService.js
class UserService {
  async getUser(userId) {
    // Complex business logic
    const user = await userRepository.findById(userId);
    // Process/validate data
    return processUser(user);
  }
}

// Controller uses service
exports.getUser = async (req, res) => {
  const user = await userService.getUser(req.params.id);
  res.json(user);
};
```

---

### 3. Repository Pattern

**Purpose:** Abstract data access logic

**Implementation:**
```
Service → Repository → Database Abstraction
```

**Example:**
```javascript
// Repository: repositories/userRepository.js
class UserRepository {
  async findById(id) {
    return User.findByPk(id);
  }
  
  async findAll(filters) {
    return User.findAll({ where: filters });
  }
  
  async create(data) {
    return User.create(data);
  }
}

// Used in service
const user = await userRepository.findById(userId);
```

---

### 4. Dependency Injection

**Purpose:** Loose coupling between components

**Implementation:**
```javascript
// Without DI (tight coupling)
class UserController {
  constructor() {
    this.userService = new UserService();
  }
}

// With DI (loose coupling)
class UserController {
  constructor(userService) {
    this.userService = userService;
  }
}

// Container
const userService = new UserService(repository);
const userController = new UserController(userService);
```

---

### 5. Factory Pattern

**Purpose:** Create objects without specifying exact classes

**Implementation:**
```javascript
// Factory: factories/NotificationFactory.js
class NotificationFactory {
  static createNotification(type) {
    switch(type) {
      case 'email': return new EmailNotification();
      case 'sms': return new SMSNotification();
      case 'push': return new PushNotification();
    }
  }
}

// Usage
const notification = NotificationFactory.createNotification('email');
notification.send(message);
```

---

### 6. Singleton Pattern

**Purpose:** Ensure single instance of a class

**Implementation:**
```javascript
// Without Singleton
const db = new Database();
const db2 = new Database();  // Different instance!

// With Singleton
class Database {
  static instance = null;
  
  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}

const db = Database.getInstance();
const db2 = Database.getInstance();  // Same instance
```

---

### 7. Observer Pattern

**Purpose:** Notify multiple objects about state changes

**Implementation:**
```javascript
// Event Emitter (Observer pattern)
const EventEmitter = require('events');

class UserService extends EventEmitter {
  async createUser(userData) {
    const user = await User.create(userData);
    this.emit('userCreated', user);  // Notify observers
    return user;
  }
}

// Observers
userService.on('userCreated', (user) => {
  emailService.sendWelcomeEmail(user.email);
  analyticsService.trackUserSignup(user);
});
```

---

### 8. Middleware Pattern

**Purpose:** Execute functions in sequence

**Implementation:**
```javascript
// Middleware: Check authentication
app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  req.user = verifyToken(token);
  next();
});

// Middleware: Validate input
app.use('/api/users', validateInput, userController.create);

// Middleware: Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

---

### 9. Strategy Pattern

**Purpose:** Select algorithm at runtime

**Implementation:**
```javascript
// Strategies
class PDFReportStrategy {
  generate(data) { /* PDF logic */ }
}

class ExcelReportStrategy {
  generate(data) { /* Excel logic */ }
}

// Context
class ReportGenerator {
  constructor(strategy) {
    this.strategy = strategy;
  }
  
  generate(data) {
    return this.strategy.generate(data);
  }
}

// Usage
const pdfStrategy = new PDFReportStrategy();
const generator = new ReportGenerator(pdfStrategy);
generator.generate(reportData);
```

---

### 10. Decorator Pattern

**Purpose:** Add behavior to objects dynamically

**Implementation:**
```javascript
// Without decorator
async function getUser(userId) {
  return User.findById(userId);
}

// With caching decorator
function withCache(fn) {
  return async function(...args) {
    const cacheKey = `${fn.name}:${JSON.stringify(args)}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
    
    const result = await fn(...args);
    await redis.set(cacheKey, result, 3600);
    return result;
  };
}

const cachedGetUser = withCache(getUser);
```

---

## 🔄 Request/Response Flow

### API Request Lifecycle

```
1. Request Arrives
   ↓
2. Load Balancer Routes
   ↓
3. NGINX receives request
   ↓
4. Rate Limit Check
   ↓
5. Express receives
   ↓
6. Middlewares (Auth, Parse body, etc)
   ↓
7. Route Handler (Controller)
   ↓
8. Service Layer (Business Logic)
   ↓
9. Repository Layer (Data Access)
   ↓
10. Database Query
    ↓
11. Response built
    ↓
12. Response Middlewares (Compression, etc)
    ↓
13. Response sent to client
```

### Example Code Flow

```javascript
// Request: GET /api/users/123

// 1. Route Match
router.get('/:id', authMiddleware, userController.getUser);

// 2. Middleware: Auth Check
authMiddleware: verifyJWT(req.headers.authorization);

// 3. Controller: Handle Request
userController.getUser:
  userId = req.params.id;
  user = await userService.getUser(userId);
  res.json(user);

// 4. Service: Business Logic
userService.getUser:
  user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError();
  enrichWithAdditionalData(user);
  return user;

// 5. Repository: Data Access
userRepository.findById:
  SELECT * FROM users WHERE id = ?;
  return user;

// 6. Response
{
  "success": true,
  "data": { user object }
}
```

---

## 💾 Data Persistence Strategy

### Database Design

```
Entities (45+ models):
  ├── Core
  │   ├── User (users table)
  │   ├── Organization (organizations table)
  │   └── Role (roles table)
  │
  ├── HR Module
  │   ├── Employee
  │   ├── Department
  │   └── Position
  │
  ├── Payroll Module
  │   ├── Salary
  │   ├── Deduction
  │   └── Payment
  │
  └── Others...

Relationships:
  • One-to-Many: Organization → Users
  • Many-to-Many: Users ↔ Roles
  • One-to-One: User → Profile
```

### Indexing Strategy

```
High-Priority Indexes:
  • users(email) - for login
  • users(status) - for filtering
  • organizations(id) - for FK lookup
  • orders(user_id) - for user orders
  • orders(created_at) - for sorting

Composite Indexes:
  • (tenant_id, status) - multi-column filtering
  • (user_id, created_at) - common query pattern

Analysis:
  • Regular index review
  • Remove unused indexes
  • Add missing indexes (found 7 missing)
```

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Hash password & compare with DB
   ↓
3. If valid:
   - Generate JWT token
   - Generate refresh token
   - Return to client
   ↓
4. Client stores tokens (secure)
   ↓
5. Client includes token in requests
   ↓
6. Server verifies token signature
   ↓
7. Extract claims (user ID, role)
   ↓
8. Execute request
```

### Authorization Model

```
Role-Based Access Control (RBAC):

Roles:
  • Admin: All permissions
  • Manager: Department level
  • User: Own resources
  • Viewer: Read-only

Permissions:
  • Create
  • Read
  • Update
  • Delete
  • Execute

Check:
  if (!hasPermission(req.user.role, action, resource)) {
    throw new ForbiddenError();
  }
```

---

## 📡 Communication Patterns

### Synchronous (REST API)

```
Client → API → Database
↓
Response immediately
```

### Asynchronous (Message Queue)

```
Client → API → Queue → Worker → Database
↓
Response immediately (queued)
```

**Example: Email Sending**
```javascript
// API Route
router.post('/send-email', async (req, res) => {
  // Queue the email
  await emailQueue.add({ to, subject, body });
  res.json({ message: 'Email queued' });
});

// Worker processing queue
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

### Real-time (WebSocket)

```
Client ↔ API ↔ WebSocket Server
↓
Bi-directional communication
```

**Example: Live Updates**
```javascript
// Server
io.on('connection', (socket) => {
  // User joins room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });
  
  // Broadcast to room
  io.to(roomId).emit('user-added', userData);
});

// Client
socket.emit('join-room', roomId);
socket.on('user-added', (userData) => {
  // Update UI
});
```

---

## 🛡️ Error Handling Strategy

### Error Hierarchy

```
AppError (Base)
├── ValidationError (422)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
└── InternalError (500)
```

### Error Handling Flow

```javascript
try {
  // Business logic
  const user = await userService.getUser(id);
  res.json(user);
} catch (error) {
  if (error instanceof ValidationError) {
    return res.status(422).json(error.toJSON());
  }
  if (error instanceof NotFoundError) {
    return res.status(404).json(error.toJSON());
  }
  // Log unexpected error
  logger.error(error);
  res.status(500).json({ message: 'Internal server error' });
}
```

---

## 🔄 Data Flow Patterns

### CQRS (Command Query Responsibility Segregation)

```
Write Path (Command):
  POST /orders
  ↓
  OrderService.create()
  ↓
  Database update
  ↓
  Event emitted
  ↓
  Analytics updated
  ↓
  Notification sent

Read Path (Query):
  GET /orders
  ↓
  Cache check
  ↓
  If hit: return from cache
  ↓
  If miss: query database
  ↓
  Cache result
  ↓
  Return to client
```

---

## 📊 State Management

### Frontend State

```
React Context / Redux:
  • User state (logged-in user)
  • UI state (modals, forms)
  • Data state (cached data)
  
Example:
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchUsers();
  }, []);
```

### Backend State

```
Session Management:
  • Stored in Redis
  • TTL: 24 hours
  • Contains: user ID, roles, permissions
  
  redis.set(`session:${sessionId}`, { userId, roles }, 'EX', 86400);
  
Cache:
  • Query results cached
  • TTL: 1 hour
  • Invalidated on data changes
```

---

## 🚀 Scalability Considerations

### Horizontal Scaling

```
Load Balancer
      ↓
  ┌───┴───┐
  ↓       ↓
 App1   App2  (Can add App3, App4, ...)
  └───┬───┘
      ↓
Shared Database
Shared Cache
```

### Database Scaling

```
Current: Single primary + read replica

Future (6-12 months):
  Shard by tenant/customer
  
  Shard 1: Customers A-G
  Shard 2: Customers H-M
  Shard 3: Customers N-T
  Shard 4: Customers U-Z
```

### Cache Layering

```
Request
  ↓
L1: In-memory cache (application level)
  ↓
L2: Redis (distributed cache)
  ↓
L3: Database query
```

---

## 🔍 Monitoring & Observability

### Logging Strategy

```
Application Logs:
  • Request/response logs
  • Error stack traces
  • Performance metrics
  • Business events

Centralization:
  → ELK Stack or similar
  → Searchable & analyzable
  → Retention: 30 days (hot), 1 year (archive)

Levels:
  DEBUG: Full details (disabled in prod)
  INFO: Important business events
  WARN: Potential issues
  ERROR: Errors requiring attention
```

### Metrics & Monitoring

```
Key Metrics:
  • Request rate (req/sec)
  • Response time (p50, p95, p99)
  • Error rate (%)
  • CPU/Memory usage
  • Database query time

Tools:
  • Prometheus (metrics collection)
  • Grafana (visualization)
  • AlertManager (alerting)
```

---

**Status:** Production Ready  
**Last Updated:** February 24, 2026

