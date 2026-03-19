#!/bin/bash

# Team Training & Operational Handbook - v1.0.0
# Creates comprehensive team documentation and training materials

set -e

echo "👥 Alawael v1.0.0 - Team Training & Operations Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create team roles and responsibilities
cat > TEAM_ROLES_RESPONSIBILITIES.md << 'ROLES_EOF'
# Alawael v1.0.0 - Team Roles & Responsibilities

## 👨‍💼 Project Manager / Product Owner

**Responsibilities:**
- [ ] Prioritize feature requests and bug fixes
- [ ] Communicate with stakeholders
- [ ] Track project progress and metrics
- [ ] Plan sprints and releases
- [ ] Manage backlog

**Resources:**
- GitHub Issues: Backlog management
- Documentation Index: All documentation
- Release Notes: Version tracking

**Escalation Path:**
1. First: Tech Lead (technical blockers)
2. Second: CTO (strategic decisions)
3. Third: Executive (business issues)

---

## 👨‍💻 Backend Developer

**Responsibilities:**
- [ ] Develop API endpoints
- [ ] Database schema design
- [ ] Performance optimization
- [ ] Write unit tests
- [ ] Code review participation

**Development Workflow:**
```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes
npm run dev  # Start development server
npm test     # Run tests
npm run lint # Check code style

# 3. Commit and push
git commit -m "feat: description"
git push origin feature/your-feature

# 4. Create pull request
# https://github.com/[repo]/pulls

# 5. Address review feedback
# 6. Merge after approval
```

**Common Commands:**
```bash
npm install              # Install dependencies
npm run dev              # Start development server
npm test                 # Run test suite
npm run lint             # Check code style
npm run format           # Auto-format code
npm run build            # Build for production
docker-compose up        # Start all services
npm run migrate          # Run database migrations
npm run seed             # Seed test data
```

**Key Files to Know:**
- API Routes: `src/routes/`
- Controllers: `src/controllers/`
- Models: `src/models/`
- Tests: `src/__tests__/`
- Configuration: `.env` and `config/`

---

## 🎨 Frontend Developer

**Responsibilities:**
- [ ] Build user interfaces
- [ ] Implement responsive design
- [ ] State management
- [ ] Integration with API
- [ ] User experience optimization

**Component Structure:**
```
src/
├── components/        # Reusable components
├── pages/            # Page components
├── hooks/            # Custom hooks
├── services/         # API services
├── store/            # State management (Redux/Zustand)
└── styles/           # Global styles
```

**Development Commands:**
```bash
npm run dev            # Start dev server on 3001
npm run build          # Build for production
npm test               # Run component tests
npm run storybook      # Start Storybook UI library
npm run analyze        # Analyze bundle size
```

**Best Practices:**
- Use functional components with hooks
- Memoize components with useMemo/useCallback
- Implement error boundaries
- Add loading states
- Test user interactions

---

## 🔒 DevOps Engineer / Infrastructure

**Responsibilities:**
- [ ] Manage deployment pipelines
- [ ] Infrastructure provisioning
- [ ] Monitor system health
- [ ] Configure security
- [ ] Maintain uptime

**Deployment Commands:**
```bash
# Deploy to specific environment
./deploy-docker.sh              # Local Docker
./deploy-heroku.sh              # Heroku
./deploy-aws.sh                 # AWS
./deploy-azure.sh               # Azure
./deploy-gcp.sh                 # Google Cloud

# Monitoring
./health-check.sh               # Verify deployment
./setup-monitoring.sh           # Configure monitoring
```

**Infrastructure Stack:**
- Containerization: Docker / Docker Compose
- Orchestration: Kubernetes (optional)
- Load Balancing: NGINX
- Database: MongoDB Atlas / Self-hosted
- Caching: Redis
- Monitoring: Sentry, DataDog, or similar

**Key Responsibilities:**
- Scale resources based on demand
- Manage deployments and rollbacks
- Monitor logs and errors
- Ensure security compliance
- Backup and disaster recovery

---

## 🧪 QA / Test Engineer

**Responsibilities:**
- [ ] Write test cases
- [ ] Execute manual testing
- [ ] Identify bugs
- [ ] Performance testing
- [ ] Security testing

**Test Types:**

### Unit Tests (Jest)
```bash
npm test -- --coverage

# Write tests
// example.test.js
describe('Calculator', () => {
  test('adds 1 + 2 to equal 3', () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

### Integration Tests
```bash
# API testing with Supertest
test('GET /api/products returns 200', async () => {
  const res = await request(app)
    .get('/api/products')
    .expect(200);
  
  expect(res.body).toHaveLength(10);
});
```

### E2E Tests (Playwright/Cypress)
```bash
npm run test:e2e

# Test scenarios
describe('User Registration Flow', () => {
  test('User can register and login', async () => {
    await page.goto('http://localhost:3000/register');
    await page.fill('input[name="email"]', 'test@example.com');
    // ... more test steps
  });
});
```

### Performance Testing (Artillery)
```bash
artillery run load-test.yml

# Results show response times, error rates, etc.
```

**Testing Metrics:**
- Target Coverage: 80%+
- Pass Rate: > 95%
- Test Execution: < 10 minutes
- Coverage Trend: Increasing weekly

---

## 🔐 Security Engineer

**Responsibilities:**
- [ ] Security reviews
- [ ] Vulnerability scanning
- [ ] OWASP compliance verification
- [ ] Penetration testing
- [ ] Access control management

**Security Checklist:**

### Authentication & Authorization
- [ ] Passwords hashed with bcrypt
- [ ] JWT tokens properly signed
- [ ] Session management secure
- [ ] Rate limiting on auth endpoints
- [ ] CORS properly configured

### Data Protection
- [ ] Encryption at rest
- [ ] Encryption in transit (TLS/SSL)
- [ ] Sensitive data not logged
- [ ] Database access restricted
- [ ] Secrets in environment variables

### Vulnerability Management
- [ ] npm audit run weekly
- [ ] Snyk scanning enabled
- [ ] OWASP ZAP scanning
- [ ] Dependency updates automated
- [ ] Security patches applied quickly

### Monitoring & Auditing
- [ ] Failed login attempts logged
- [ ] API access logged
- [ ] All deployments logged
- [ ] Audit trail maintained
- [ ] Alerts on suspicious activity

---

## 👨‍🔬 Data Scientist / Analytics

**Responsibilities:**
- [ ] Build ML/AI models
- [ ] Data analysis
- [ ] Predictive features
- [ ] Performance forecasting
- [ ] Anomaly detection

**ML Models Available:**
1. Demand Forecasting
2. Customer Churn Prediction
3. Fraud Detection
4. Recommendation Engine
5. Price Optimization
6. Inventory Optimization

**Python Environment:**
```bash
# Create venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Train models
python train_models.py

# Make predictions
python predict.py --model demand_forecast --period 90
```

---

## 🎯 Team Collaboration

### Daily Standup (15 minutes)
**When:** 9:00 AM daily
**Who:** All team members
**What:** 
- What did you do yesterday?
- What are you doing today?
- Any blockers?

### Weekly Planning (1 hour)
**When:** Monday 10:00 AM
**Who:** PM, Tech Lead, Team Leads
**What:**
- Review previous week
- Prioritize new issues
- Plan sprints
- Discuss blockers

### Code Review (Async)
**How:** GitHub Pull Requests
- [ ] Assign 2 reviewers
- [ ] Address feedback
- [ ] Merge after approval
- [ ] Deploy to dev automatically

### Monthly Retrospective (1 hour)
**When:** Last Friday of month
**Who:** Entire team
**What:**
- What went well?
- What could improve?
- Action items for next month

---

## 📚 Knowledge Management

### Documentation
- **API Docs:** API_DOCUMENTATION.md
- **Architecture:** ARCHITECTURE_GUIDE.md
- **Deployment:** TEAM_DEPLOYMENT_LAUNCH_GUIDE.md
- **Best Practices:** Code style guide

### Video Tutorials
- [To be created during onboarding]

### Chat Channels
- `#general` - Announcements
- `#dev` - Development discussion
- `#devops` - Infrastructure discussion
- `#security` - Security issues
- `#incident` - On-call incidents

### Weekly Knowledge Sharing
- Technical talks (30 minutes)
- Security updates
- Performance improvements
- New tools/technologies

ROLES_EOF

echo "✅ Team roles and responsibilities created: TEAM_ROLES_RESPONSIBILITIES.md"
echo ""

# Create operational handbook
cat > OPERATIONAL_HANDBOOK.md << 'HANDBOOK_EOF'
# Alawael v1.0.0 - Operational Handbook

## Daily Operations

### Morning Checklist (30 minutes)
- [ ] Review deployment health
- [ ] Check error tracking dashboard (Sentry)
- [ ] Review new issues in GitHub
- [ ] Verify backup completion
- [ ] Check monitoring alerts

### Health Check Commands
```bash
# API health
curl -s http://localhost:3000/api/health | jq .

# Database connection
mongosh --eval "db.adminCommand('ping')"

# Redis status
redis-cli ping

# All services
docker-compose ps
```

### Common Issues & Quick Fixes

#### Issue: High CPU Usage
1. Check which container: `docker stats`
2. Review application logs: `docker logs -f container-name`
3. Identify slow queries in database
4. Scale horizontally: `docker-compose up -d --scale app=3`

#### Issue: Memory Leak
1. Monitor memory: `docker stats | grep app`
2. Check for circular references in code
3. Restart container: `docker restart app`
4. Check logs for errors: `docker logs app`

#### Issue: Slow Queries
1. Enable query logging: `db.setProfilingLevel(1)`
2. Identify slow queries: `db.system.profile.find() | head`
3. Create indexes: `db.collection.createIndex({'field': 1})`
4. Analyze with explain: `db.orders.find({status: 'pending'}).explain('executionStats')`

#### Issue: Deployment Failures
1. Check logs: `docker-compose logs app`
2. Verify environment variables: `docker-compose config`
3. Test locally: `npm start`
4. Check secrets: `echo $DATABASE_URL`
5. Try rebuild: `docker build --no-cache .`

---

## Incident Response

### Severity Levels

**Critical (P1) - Immediate Action**
- System completely down
- Data corruption
- Security breach
- Revenue impacting
- Response time: 5 minutes (24/7)

**High (P2) - Within 1 Hour**
- Major functionality broken
- Significant performance degradation
- Large number of users affected
- Response time: 1 hour

**Medium (P3) - Within Business Hours**
- Minor functionality broken
- Small user impact
- Workaround available
- Response time: 4 hours

**Low (P4) - Next Sprint**
- UI issues
- Documentation errors
- Nice-to-have features
- Response time: Next week

### Incident Response Workflow

**Step 1: Alert & Acknowledgement (5 min)**
- Incident detected
- Incident commander assigned
- Team notified via Slack
- Status page updated

**Step 2: Triage & Assessment (10 min)**
- Determine severity level
- Identify impact scope
- Estimate TTR (Time to Recovery)
- Activate response team

**Step 3: Mitigation (Minutes to Hours)**
- Implement quick fix
- Or: Rollback to previous version
- Or: Scale resources
- Monitor impact

**Step 4: Resolution (Hours to Days)**
- Identify root cause
- Implement permanent fix
- Test thoroughly
- Deploy to production

**Step 5: Post-Mortem (24-72 hours)**
- Write detailed incident report
- Document timeline
- Analyze root cause
- Create action items
- Share findings

---

## Maintenance Windows

### Planned Maintenance
- **When:** Tuesday 2 AM UTC (off-peak)
- **Duration:** 30-60 minutes
- **Notification:** 48 hours advance notice
- **Status:** Posted on status page

**Common Maintenance Tasks:**
- Database backups (weekly)
- Security patches (monthly)
- Dependency updates (monthly)
- Performance optimization (quarterly)
- Infrastructure upgrades (as needed)

### Maintenance Checklist
```
Preparation (24 hours before):
- [ ] Notify users
- [ ] Backup database
- [ ] Test rollback procedure
- [ ] Alert on-call team

During Maintenance:
- [ ] Start monitoring dashboard
- [ ] Begin maintenance
- [ ] Update status page every 15 min
- [ ] Have rollback ready

After Maintenance:
- [ ] Run health checks
- [ ] Verify all services
- [ ] Monitor for issues
- [ ] Post completion message
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

**Application Level**
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Throughput
- Active user sessions

**Infrastructure Level**
- CPU utilization
- Memory utilization
- Disk usage
- Network bandwidth
- Database connections

**Business Level**
- Revenue impact
- User sign-ups
- Transaction success rate
- Conversion rate

### Alert Thresholds

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | > 1% for 2 min | P1 |
| Slow Response | p95 > 1000ms | P2 |
| High CPU | > 80% for 5 min | P1 |
| High Memory | > 85% for 5 min | P1 |
| Database Down | connection refused | P1 |
| Health Check Failed | 3 consecutive failures | P1 |
| Backup Failed | No backup in 24h | P2 |

---

## Scaling Operations

### When to Scale Up
- Response time trending > 300ms
- CPU utilization > 70%
- Error rate increasing
- Load testing shows capacity limit

### Scaling Procedure
```bash
# 1. Decide scaling strategy
#    Horizontal: Add more instances
#    Vertical: Increase instance resources

# 2. Horizontal scaling
docker-compose up -d --scale app=5

# 3. Verify health
./health-check.sh

# 4. Monitor for 15 minutes
watch -n 5 'curl -s http://localhost:3000/api/health | jq .'

# 5. Adjust if needed
# If still high: add more, get different instance type
# If now low: reduce to previous level
```

### Scaling Down Procedure
- [ ] Ensure current load is below threshold
- [ ] Remove instance: `docker-compose down`
- [ ] Verify other instances handle load
- [ ] Update load balancer configuration

---

## Disaster Recovery

### Backup Verification
```bash
# Check latest backup
./setup-disaster-recovery.sh
./setup-disaster-recovery.sh/monitor-backups.sh

# Test restoration (monthly)
./restore-database.sh /backups/daily/db_backup_*.gz
```

### Recovery Time Targets (RTO)
- Application crash: 15 minutes
- Database corrupted: 1 hour
- Data loss: 4 hours
- Complete infrastructure failure: 8 hours

### Rollback Procedure
```bash
# 1. Identify problematic version
git log --oneline | head -5

# 2. Rollback to previous version
git revert [commit-hash]

# 3. Rebuild and redeploy
docker build -t alawael:rollback .
docker push alawael:rollback
docker-compose up -d

# 4. Verify health
./health-check.sh

# 5. Investigate issue
git diff [broken-version] [previous-version]
```

---

## Cost Management

### Monthly Budget Review
- [ ] Check cloud platform bills
- [ ] Review resource utilization
- [ ] Identify optimization opportunities
- [ ] Estimate next month

### Cost Optimization
1. **Right-sizing:** Match instance types to actual needs
2. **Reserved instances:** Pre-purchase for steady-state load
3. **Spot instances:** Use for non-critical workloads
4. **Auto-scaling:** Scale down during off-peak hours
5. **Database optimization:** Reduce expensive operations

### Cost Targets
- **Dev:** < $100/month
- **Staging:** < $200/month
- **Production:** < $500-1000/month

---

## Documentation Updates

### When to Update?
- Major feature release
- Infrastructure change
- Process change
- Bug fix (if significant)
- Performance improvement

### How to Update?
1. Edit relevant documentation files
2. Update version/date
3. Create pull request
4. Get reviewed and approved
5. Merge to main branch
6. Commit to docs repository

### Documentation Standards
- Clear, concise language
- Code examples included
- Links to related docs
- Update date included
- Reviewed by at least 1 person

HANDBOOK_EOF

echo "✅ Operational handbook created: OPERATIONAL_HANDBOOK.md"
echo ""

# Create onboarding guide
cat > TEAM_ONBOARDING_GUIDE.md << 'ONBOARDING_EOF'
# Alawael v1.0.0 - Team Onboarding Guide

## Week 1: Getting Started

### Day 1: Account Setup (4 hours)
- [ ] Create GitHub account / request access
- [ ] Create Docker Hub account / request access
- [ ] Request AWS/Azure/GCP access
- [ ] Set up 2FA for all services
- [ ] Add to team Slack channels
- [ ] Request VPN access if applicable

**Resources:**
- GitHub: https://github.com/[organization]
- Slack: [workspace-url]
- Documentation: [docs-url]

### Day 2: Environment Setup (6 hours)

**Install Required Tools:**
```bash
# Node/npm
node --version  # Should be v18+
npm --version   # Should be v9+

# Docker
docker --version  # Should be 20.10+
docker-compose --version  # Should be 2.0+

# Git
git --version  # Should be 2.30+

# IDE: VS Code (recommended)
# Extensions: ESLint, Prettier, REST Client
```

**Clone Repository:**
```bash
git clone https://github.com/[org]/alawael-backend
cd alawael-backend
npm install
npm run dev  # Should start on port 3000
```

**Verify Setup:**
```bash
curl http://localhost:3000/api/health
# Should return { "status": "ok" }
```

### Day 3-4: Codebase Understanding (8 hours)

**Project Structure:**
```
alawael-backend/
├── src/
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── controllers/    # Business logic
│   ├── middleware/     # Custom middleware
│   ├── services/       # External services
│   ├── utils/          # Helper functions
│   └── tests/          # Test files
├── config/            # Configuration
├── docker-compose.yml # Services
├── package.json       # Dependencies
├── .env.example       # Example env vars
└── README.md          # Project info
```

**Key Files to Review:**
- [ ] README.md - Overview
- [ ] ARCHITECTURE_GUIDE.md - System design
- [ ] API_DOCUMENTATION.md - API endpoints
- [ ] .env.example - Configuration

**Code Tour:**
- [ ] Review API routes structure
- [ ] Understand database models
- [ ] Check business logic flow
- [ ] Study test examples

### Day 5: Tutorials & Training (4 hours)

**Recommended Learning Path:**

1. **Architecture Understanding (30 min)**
   - System overview
   - Technology stack
   - Data flow

2. **API Familiarization (30 min)**
   - REST principles
   - Available endpoints
   - Response formats

3. **Database Knowledge (30 min)**
   - Schema overview
   - Relationships
   - Indexing strategies

4. **Development Workflow (30 min)**
   - Branch strategy
   - PR process
   - Testing requirements

5. **Hands-on Exercise (2 hours)**
   - Create simple endpoint
   - Write tests
   - Submit PR
   - Get feedback

---

## Week 2: Role-Specific Training

### Backend Developer Path
- [ ] Code style guide
- [ ] Testing practices
- [ ] Database optimization
- [ ] Security guidelines
- [ ] API design patterns

**Exercise:** Add a new API endpoint with tests

### Frontend Developer Path
- [ ] Component architecture
- [ ] State management
- [ ] UI framework (React/Vue)
- [ ] Responsive design
- [ ] Performance optimization

**Exercise:** Create a new component with styling

### DevOps Engineer Path
- [ ] Deployment procedures
- [ ] Infrastructure overview
- [ ] Scaling strategies
- [ ] Monitoring setup
- [ ] Disaster recovery

**Exercise:** Deploy to staging environment

### QA/Test Engineer Path
- [ ] Testing frameworks
- [ ] Test case design
- [ ] Bug reporting
- [ ] Performance testing
- [ ] Test automation

**Exercise:** Write comprehensive test suite for endpoint

---

## Week 3: Integration & First Contribution

### Setup Your Workspace
- [ ] Configure IDE settings
- [ ] Install recommended extensions
- [ ] Set up git hooks (pre-commit)
- [ ] Configure linter/formatter
- [ ] Set up debugger

### Make Your First Contribution
1. [ ] Find issue labeled "good first issue"
2. [ ] Create feature branch
3. [ ] Implement solution
4. [ ] Add tests
5. [ ] Submit pull request
6. [ ] Address code review feedback
7. [ ] Merge to main

### Pair Programming Session
- [ ] Schedule with team member
- [ ] Learn their workflow
- [ ] Ask questions
- [ ] Pair on a real task

---

## Week 4: Independence & Responsibilities

### Assigned Tasks
- [ ] Independent task completion
- [ ] Code review participation
- [ ] Documentation updates
- [ ] Mentoring (if experienced)

### Successful Onboarding Checklist
- [ ] Development environment working
- [ ] Can run tests locally
- [ ] Understand architecture
- [ ] Made first PR
- [ ] Passed code review
- [ ] Can deploy to dev
- [ ] Know how to debug
- [ ] Know team communication channels
- [ ] Know escalation procedures
- [ ] Know Monday standup time

---

## Ongoing Learning

### Daily
- [ ] Attend standup
- [ ] Review PRs
- [ ] Fix any issues blocking team

### Weekly
- [ ] Attend planning meeting
- [ ] Complete assigned tasks
- [ ] Review code from others
- [ ] Ask questions

### Monthly
- [ ] Organize tech talk
- [ ] Review performance
- [ ] Update documentation
- [ ] Share learnings

### Quarterly
- [ ] Retrospective discussion
- [ ] Skills assessment
- [ ] Career development
- [ ] Identify improvements

---

## Support & Help

### Common Questions

**Q: I get "module not found" error**
A: Run `npm install` and clear cache: `npm cache clean --force`

**Q: Docker container won't start**
A: Check logs: `docker logs container-name` and verify ports aren't in use

**Q: How do I debug a failing test?**
A: Run with debug flag: `npm test -- --verbose --detectOpenHandles`

**Q: Environment variables not working?**
A: Check .env file exists, not in .gitignore, and reload with `npm run dev`

**Q: How do I rollback a bad deployment?**
A: See OPERATIONAL_HANDBOOK.md - Rollback Procedure section

### Getting Help
1. **Documentation:** Check DOCUMENTATION_INDEX.md first
2. **Team Chat:** Ask in #dev channel
3. **Pair Programming:** Request session with mentor
4. **Google:** "error message" + framework name
5. **Stack Overflow:** Search or post question

### Key Contacts
- **Code Help:** #dev or @tech-lead
- **DevOps Help:** #devops or @devops-lead
- **Design Help:** #design or @designer
- **General Help:** @your-manager or team lead

---

## Success Metrics

By end of onboarding, you should be able to:

✅ **Understand the System**
- Explain system architecture
- List all major components
- Describe data flow

✅ **Use Development Tools**
- Start dev environment
- Run tests locally
- Build and push Docker image
- Deploy to dev environment

✅ **Write Code**
- Implement feature following patterns
- Write unit tests
- Submit PR
- Pass code review

✅ **Collaborate**
- Participate in standup
- Review code effectively
- Ask for help appropriately
- Help other team members

✅ **Solve Problems**
- Debug issues independently
- Find answers in documentation
- Know when to ask for help
- Follow escalation procedures

---

Onboarding completed: __________  
Date: __________  
Mentor: __________  
Notes: __________  

ONBOARDING_EOF

echo "✅ Team onboarding guide created: TEAM_ONBOARDING_GUIDE.md"
echo ""

# Create troubleshooting guide
cat > TROUBLESHOOTING_GUIDE.md << 'TROUBLESHOOTING_EOF'
# Alawael v1.0.0 - Troubleshooting Guide

## Development Issues

### Docker Issues

**Problem: "Cannot connect to Docker daemon"**
```bash
# Solution
docker --version  # Not installed? Install Docker
docker start      # Service not running? Start it
sudo usermod -aG docker $USER  # Permission issue? Add user to group
```

**Problem: "Port 3000 already in use"**
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 [PID]  # macOS/Linux
taskkill /PID [PID] /F  # Windows

# Or use different port
PORT=3001 npm run dev
```

**Problem: "Image build fails"**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild with fresh cache
docker build --no-cache -t alawael .

# Check Dockerfile
cat Dockerfile
```

### Database Issues

**Problem: "Cannot connect to MongoDB"**
```bash
# Check if running
docker ps | grep mongodb

# Start if not running
docker-compose up mongodb

# Check connection
mongosh mongodb://localhost:27017

# Check environment variable
echo $MONGODB_URI
```

**Problem: "Database migration failed"**
```bash
# Check migration files
ls -la migrations/

# Run migration with verbose
npm run migrate -- --verbose

# Check database state
mongosh
> db.collections()
```

### Application Issues

**Problem: "npm install fails"**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Check Node version
node --version  # Should be 18+
```

**Problem: "Tests failing locally but passing in CI"**
```bash
# Run tests with same environment as CI
NODE_ENV=test npm test

# Run with verbose output
npm test -- --verbose

# Run specific test
npm test -- test.spec.js

# Check mocks and stubs
grep -r "jest.mock" src/
```

---

## Deployment Issues

### Docker Compose Issues

**Problem: "Services won't start"**
```bash
# Check compose file syntax
docker-compose config

# View logs
docker-compose logs

# Rebuild services
docker-compose build --no-cache

# Start with verbose output
docker-compose up --verbose
```

**Problem: "Data lost after restart"**
```bash
# Check volume configuration
docker volume ls

# Verify volumes in compose file
grep -A 10 "volumes:" docker-compose.yml

# Backup data before restart
docker cp mongodb:/data/db ./mongodb-backup
```

### Deployment Script Issues

**Problem: "./deploy-*.sh: Permission denied"**
```bash
# Make script executable
chmod +x deploy-*.sh

# Verify permissions
ls -la deploy-*.sh
```

**Problem: "Script fails with undefined variables"**
```bash
# Check environment variables
env | grep -E "GITHUB|DOCKER|AWS|AZURE|GCP"

# Source environment file
source .env

# Verify variables
echo $GITHUB_TOKEN
```

---

## Production Issues

### Performance Problems

**Problem: "Response time is slow"**
```bash
# Check database query performance
db.setProfilingLevel(1)
db.system.profile.find().limit(10).pretty()

# Identify N+1 queries
grep -r "find(" src/ | wc -l

# Check indexes
db.collection.getIndexes()

# Add missing index
db.collection.createIndex({ 'field': 1 })
```

**Problem: "Memory usage increasing"**
```bash
# Monitor memory
docker stats alawael-api

# Check for memory leaks
npm install -g clinic
clinic doctor -- npm start

# Take heap snapshot
node --inspect app.js
# Visit chrome://inspect in Chrome
```

**Problem: "High CPU usage"**
```bash
# Identify CPU-intensive processes
docker stats --no-stream

# Check for infinite loops
strace -p [PID]

# Use profiler
npm install -g 0x
0x npm start
```

### Database Issues

**Problem: "Database getting too large"**
```bash
# Check collections size
db.collection.stats()

# Check indexes size
db.collection.aggregate([{ $indexStats: {} }])

# Archive old data
db.collection.deleteMany({ createdAt: { $lt: date } })

# Compact collection
db.runCommand({ compact: 'collection_name' })
```

**Problem: "Replication lag"**
```bash
# Check replica status
rs.status()

# Monitor replication
db.getReplicationInfo()

# Check network between replicas
ping replica-node-2
```

---

## Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| ECONNREFUSED | Connection refused | Service not running |
| EADDRINUSE | Address already in use | Kill process or use different port |
| ENOMEM | Out of memory | Increase container memory or scale |
| EACCES | Permission denied | Change file permissions (chmod) |
| ETIMEDOUT | Connection timeout | Network issue or service slow |
| ENOTFOUND | DNS resolution failed | Check hostname or DNS settings |
| EPIPE | Broken pipe | Connection closed, retry operation |
| EINVAL | Invalid argument | Check parameter values |

---

## Log Analysis

### Application Logs
```bash
# View recent logs
docker logs --tail 100 alawael-api

# Follow logs in real-time
docker logs -f alawael-api

# Search for errors
docker logs alawael-api 2>&1 | grep ERROR

# Show timestamps
docker logs -t alawael-api
```

### Database Logs
```bash
# MongoDB logs
docker logs mongodb

# Show slow operations
mongo --eval "db.getProfilingStatus()"
```

### Nginx Logs
```bash
# Access logs
docker exec nginx tail -f /var/log/nginx/access.log

# Error logs
docker exec nginx tail -f /var/log/nginx/error.log
```

---

## Getting Help

### Troubleshooting Checklist
1. [ ] Read error message carefully
2. [ ] Check documentation
3. [ ] Search similar issues on GitHub
4. [ ] Check logs for details
5. [ ] Try reproduction steps
6. [ ] Test with minimal example
7. [ ] Ask team in chat
8. [ ] Create GitHub issue if no solution

### Information to Include When Asking for Help
- Error message (full)
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, versions, config)
- Relevant logs
- What you've already tried
- Screenshots/code samples

---

## Emergency Recovery

### System Down - Quick Recovery
```bash
# 1. Check what's running
docker ps
docker ps -a

# 2. Check recent errors
docker logs --tail 50 [container]

# 3. Try restart
docker-compose restart [service]

# 4. Check connectivity
curl http://localhost:3000/api/health

# 5. Full restart if needed
docker-compose down
docker-compose up -d
```

### Data Corruption - Recovery
```bash
# 1. Stop application
docker-compose down

# 2. Restore from backup
./restore-database.sh /backups/daily/db_backup_*.gz

# 3. Verify data
mongosh --eval "db.collection.countDocuments()"

# 4. Restart application
docker-compose up -d

# 5. Run health checks
./health-check.sh
```

### Security Incident - Actions
```bash
# 1. Rotate credentials
# Update all secrets in environment

# 2. Review access logs
docker logs mongodb | grep PERMISSION_DENIED

# 3. Change database credentials
mongo --eval "db.changeUserPassword('admin', 'newpass')"

# 4. Update application
git pull origin main
docker build --no-cache .
docker-compose up -d

# 5. Audit access
docker logs --since 2024-02-19T10:00:00 [container]
```

TROUBLESHOOTING_EOF

echo "✅ Troubleshooting guide created: TROUBLESHOOTING_GUIDE.md"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Team Training & Operations Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📚 Created Documentation Files:"
echo "   1. TEAM_ROLES_RESPONSIBILITIES.md (5 roles defined)"
echo "   2. OPERATIONAL_HANDBOOK.md (Daily operations)"
echo "   3. TEAM_ONBOARDING_GUIDE.md (4-week onboarding)"
echo "   4. TROUBLESHOOTING_GUIDE.md (Common issues + solutions)"
echo ""

echo "👥 Team Roles Documented:"
echo "   ✅ Project Manager / Product Owner"
echo "   ✅ Backend Developer"
echo "   ✅ Frontend Developer"
echo "   ✅ DevOps Engineer"
echo "   ✅ QA / Test Engineer"
echo "   ✅ Security Engineer"
echo "   ✅ Data Scientist / Analytics"
echo ""

echo "📋 Operations Covered:"
echo "   ✅ Daily operations checklist"
echo "   ✅ Health check procedures"
echo "   ✅ Common issues and fixes"
echo "   ✅ Incident response workflow"
echo "   ✅ Maintenance windows"
echo "   ✅ Monitoring and alerting"
echo "   ✅ Scaling operations"
echo "   ✅ Disaster recovery"
echo ""

echo "🎓 Onboarding Path:"
echo "   Week 1: Setup & environment"
echo "   Week 2: Role-specific training"
echo "   Week 3: First contribution"
echo "   Week 4: Independence"
echo ""

echo "🔧 Troubleshooting Resources:"
echo "   • 20+ common issues documented"
echo "   • Solutions for each issue"
echo "   • Emergency recovery procedures"
echo "   • Log analysis techniques"
echo ""

echo "✅ All team training & operations files created!"
echo ""
