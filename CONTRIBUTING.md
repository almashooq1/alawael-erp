# Contributing to AlAwael ERP System

## المحتويات

- [قبل البدء](#قبل-البدء)
- [Development Setup](#development-setup)
- [Git Workflow](#git-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Requests](#pull-requests)

---

## قبل البدء

### المتطلبات

- **Node.js** 16+ (LTS recommended)
- **npm** 7+
- **Git** 2.35+
- **Docker** (optional, for services)

### الأدوات الموصى بها

- VS Code with ESLint, Prettier
- Git GUI (GitKraken, GitHub Desktop)
- Postman/Thunder Client (API testing)

---

## Development Setup

### 1. Clone و Setup

```bash
# Clone repository
git clone https://github.com/almashooq1/alawael-erp.git
cd alawael-erp

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend/admin-dashboard
npm install

# Back to root
cd ../../
```

### 2. Environment Configuration

```bash
# Copy template
cp .env.example .env

# Edit .env with your settings
# Database URL, API ports, secrets, etc.
```

### 3. Start Development

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Server runs on http://localhost:3001

# Terminal 2: Frontend
cd frontend/admin-dashboard
npm run dev
# Frontend runs on http://localhost:5173

# Terminal 3: Tests (optional)
npm test --watch
```

### 4. Verify Setup

```bash
# Health check
curl http://localhost:3001/health

# API Docs (Swagger)
# Open http://localhost:3001/api-docs

# Frontend
# Open http://localhost:5173
```

---

## Git Workflow

### Feature Development

```bash
# 1. Create feature branch from master
git checkout master
git pull origin master
git checkout -b feature/user-authentication

# 2. Make changes locally
# Edit files...
git add .
git commit -m "feat: implement JWT authentication"

# 3. Keep updated with main branch
git pull origin master --rebase

# 4. Push to GitHub
git push origin feature/user-authentication

# 5. Create Pull Request on GitHub
# https://github.com/almashooq1/alawael-erp/pull/new/feature/...
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>

---

Types:
- feat     : new feature
- fix      : bug fix
- refactor : code restructuring
- style    : formatting (no logic change)
- test     : adding/updating tests
- docs     : documentation
- chore    : build, dependencies, etc.

Examples:
✅ feat(auth): implement JWT token refresh
✅ fix(api): resolve race condition in data sync
✅ test(rehabilitation): add therapy session tests
✅ docs(setup): update installation guide
```

### Branch Naming

```
✅ feature/user-management
✅ fix/memory-leak-in-cache
✅ docs/api-endpoints
✅ refactor/authentication-module

❌ my-feature (too vague)
❌ fix-stuff (not descriptive)
```

---

## Code Standards

### JavaScript/TypeScript

```javascript
// ✅ Good
const calculateTherapyScore = sessionData => {
  const { duration, intensity, feedback } = sessionData;
  return (duration * intensity * feedback) / 100;
};

// ❌ Bad
const calc = s => {
  return (s.d * s.i * s.f) / 100;
};
```

### File Structure

```
service/
├── __tests__/
│   ├── service.test.js
│   └── integration.test.js
├── service.js              # Main logic
├── service.routes.js       # Express routes
├── service.swagger.js      # API documentation
└── README.md
```

### Swagger Documentation

```javascript
/**
 * @swagger
 * /api/therapy-sessions:
 *   get:
 *     summary: Get therapy sessions
 *     tags:
 *       - Therapy Sessions
 *     parameters:
 *       - name: patientId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of therapy sessions
 *       400:
 *         description: Invalid patient ID
 */
router.get('/therapy-sessions', (req, res) => {
  // Implementation
});
```

### Error Handling

```javascript
// ✅ Good - specific error
try {
  const patient = await Patient.findById(id);
  if (!patient) {
    return res.status(404).json({
      error: 'PATIENT_NOT_FOUND',
      message: 'Patient record not found',
    });
  }
} catch (err) {
  logger.error('Database error:', err);
  return res.status(500).json({ error: 'DATABASE_ERROR' });
}

// ❌ Bad - generic error
if (!patient) {
  res.send('Error');
}
```

---

## Testing

### Unit Tests

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/service.test.js

# Watch mode
npm test -- --watch
```

### Writing Tests

```javascript
describe('Rehabilitation Service', () => {
  it('should calculate therapy progress correctly', () => {
    const data = { sessions: 10, improvements: 40 };
    const result = calculateProgress(data);
    expect(result).toBe(4); // 40 / 10
  });

  it('should handle missing session data', () => {
    expect(() => calculateProgress({})).toThrow();
  });
});
```

### Test Coverage Requirements

- Minimum 80% code coverage
- All public functions must have tests
- Critical paths: 100% coverage

### API Testing

```bash
# Using Postman or Thunder Client
# 1. Import OpenAPI spec: http://localhost:3001/api-spec.json
# 2. Test endpoints with authentication headers
# 3. Verify response codes and schemas
```

---

## Pull Requests

### Before Creating PR

- [ ] All tests pass: `npm test`
- [ ] Code formatted: `npm run lint` (if configured)
- [ ] No console.log statements (except dev)
- [ ] Changelog entry added
- [ ] Documentation updated
- [ ] Branch is up-to-date with master

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing

Describe tests performed and results

## Screenshots/Videos

If applicable, add visual proof

## Checklist

- [ ] Tests pass
- [ ] Code reviewed
- [ ] Documentation updated
```

### Code Review

- Keep PRs focused (1 feature per PR)
- Respond to feedback within 24 hours
- Minimum 1 approval required before merge
- Squash commits before merging

---

## Common Issues & Solutions

### Port Already in Use

```bash
# Find process on port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Dependency Conflicts

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Issues

```bash
# Reset database
npm run db:reset

# Run migrations
npm run db:migrate
```

---

## Resources

- [Node.js Best Practices](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Jest Testing](https://jestjs.io/)
- [OpenAPI Specification](https://spec.openapis.org/)
- [Git Workflow](https://git-scm.com/book/en/v2)

---

## Questions?

- 📧 Email: almashooq@gmail.com
- 💬 GitHub Issues: https://github.com/almashooq1/alawael-erp/issues
- 📖 Wiki: https://github.com/almashooq1/alawael-erp/wiki

---

**Happy coding! 🚀**
