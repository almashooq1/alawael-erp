// ============================================================
// 📝 KNOWLEDGE SYSTEM - QUICK DEVELOPER NOTES & TIPS
// ملاحظات سريعة للمطورين ونصائح
// ============================================================

const developerNotes = {
  // ============================================================
  // SECTION 1: IMPORTANT REMINDERS
  // ============================================================

  importantReminders: [
    {
      title: 'Environment Variables',
      items: [
        '⚠️ Never commit .env files to git',
        '⚠️ Change JWT_SECRET in production',
        '⚠️ Use MongoDB Atlas for production',
        '⚠️ Set FRONTEND_URL to production domain',
      ],
    },
    {
      title: 'Database',
      items: [
        '⚠️ Text indexes are critical for search',
        '⚠️ Backup MongoDB daily in production',
        '⚠️ Monitor database size and performance',
        '⚠️ Create admin user before going live',
      ],
    },
    {
      title: 'API Security',
      items: [
        '⚠️ Validate all input on backend',
        '⚠️ Never expose sensitive data in API',
        '⚠️ Use HTTPS in production',
        '⚠️ Implement rate limiting',
      ],
    },
    {
      title: 'Frontend',
      items: [
        '⚠️ Never store tokens in localStorage for sensitive apps',
        '⚠️ Implement proper error handling',
        '⚠️ Test responsive design on mobile',
        '⚠️ Optimize images for web',
      ],
    },
  ],

  // ============================================================
  // SECTION 2: COMMON CUSTOMIZATIONS
  // ============================================================

  commonCustomizations: [
    {
      feature: 'Add more content categories',
      steps: [
        '1. Update category enum in KnowledgeBase.js',
        'const categoryEnum = [',
        '  "therapeutic_protocols",',
        '  "case_studies",',
        '  "research_experiments",',
        '  "best_practices",',
        '  "YOUR_NEW_CATEGORY"  // Add here',
        '];',
        '2. Update frontend category list',
        '3. Update category list in KnowledgeAdmin.jsx',
      ],
    },

    {
      feature: 'Change rating scale (e.g., 1-10 instead of 1-5)',
      steps: [
        '1. Update KnowledgeBase.js validation:',
        'if (rating < 1 || rating > 10) throw Error("Rate 1-10");',
        '2. Update React component display',
        '3. Update API documentation',
      ],
    },

    {
      feature: 'Add new fields to articles',
      steps: [
        '1. Add field to KnowledgeArticle schema in KnowledgeBase.js',
        '2. Update API routes to handle new field',
        '3. Update React components to display/edit field',
        '4. Update sample data',
        '5. Migrate existing documents if needed',
      ],
    },

    {
      feature: 'Implement approval workflow',
      steps: [
        '1. Add status field (draft → pending → approved)',
        '2. Create admin approval endpoint',
        '3. Add approval UI in admin component',
        '4. Implement email notifications',
        '5. Add audit trail',
      ],
    },

    {
      feature: 'Add comments/discussions',
      steps: [
        '1. Create new Comment schema',
        '2. Add comments array to Article schema',
        '3. Create comment endpoints (POST, GET, DELETE)',
        '4. Add comment UI component',
        '5. Implement nested replies',
      ],
    },
  ],

  // ============================================================
  // SECTION 3: DEBUGGING TIPS
  // ============================================================

  debuggingTips: [
    {
      issue: 'Search not finding articles',
      debugging: [
        '1. Check MongoDB text indexes:',
        '   db.knowledgearticles.getIndexes()',
        '2. Verify sample data was seeded:',
        '   db.knowledgearticles.find().count()',
        '3. Check search query in browser:',
        '   Use browser DevTools Network tab',
        '4. Check server logs:',
        '   npm run dev | grep search',
      ],
    },

    {
      issue: 'API returns 401 Unauthorized',
      debugging: [
        '1. Verify token exists:',
        '   console.log(localStorage.getItem("token"))',
        '2. Check token format in request:',
        '   Authorization: Bearer {token}',
        '3. Verify JWT_SECRET matches:',
        '   Check .env file',
        '4. Check token expiry:',
        '   console.log(jwt.decode(token))',
      ],
    },

    {
      issue: 'Frontend not connecting to backend',
      debugging: [
        '1. Check CORS settings in server.js',
        '2. Verify API_BASE_URL in frontend:',
        '   console.log(process.env.REACT_APP_API_URL)',
        '3. Test API directly with curl:',
        '   curl http://localhost:3001/api/knowledge/articles',
        '4. Check network tab in DevTools',
        '5. Look for CORS errors in console',
      ],
    },

    {
      issue: 'Slow search performance',
      debugging: [
        '1. Check database indexes:',
        '   db.knowledgearticles.getIndexes()',
        '2. Monitor MongoDB performance:',
        '   mongosh > db.currentOp()',
        '3. Check query execution plan:',
        '   db.collection.find().explain()',
        '4. Limit search results:',
        '   Use pagination and limit params',
      ],
    },

    {
      issue: 'Rating not saving',
      debugging: [
        '1. Check authentication:',
        '   Verify user is logged in',
        '2. Check browser console for errors',
        '3. Check server logs',
        '4. Verify MongoDB connection',
        '5. Check if article exists:',
        '   db.knowledgearticles.findById(id)',
      ],
    },
  ],

  // ============================================================
  // SECTION 4: PERFORMANCE OPTIMIZATION TIPS
  // ============================================================

  performanceOptimization: [
    {
      area: 'Database',
      tips: [
        '✅ Use indexing for frequently queried fields',
        '✅ Implement pagination for large result sets',
        '✅ Use projection to return only needed fields',
        '✅ Cache frequently accessed data',
        '✅ Archive old articles to separate collection',
      ],
    },

    {
      area: 'API',
      tips: [
        '✅ Implement rate limiting',
        '✅ Use response compression (gzip)',
        '✅ Implement caching headers',
        '✅ Use async/await properly',
        '✅ Pool database connections',
      ],
    },

    {
      area: 'Frontend',
      tips: [
        '✅ Lazy load components',
        '✅ Implement virtual scrolling for large lists',
        '✅ Memoize expensive computations',
        '✅ Use React.lazy() for code splitting',
        '✅ Optimize images (WebP, lazy loading)',
      ],
    },

    {
      area: 'General',
      tips: [
        '✅ Use CDN for static assets',
        '✅ Implement caching strategy',
        '✅ Monitor performance metrics',
        '✅ Load test before deployment',
        '✅ Use analytics to find bottlenecks',
      ],
    },
  ],

  // ============================================================
  // SECTION 5: TESTING STRATEGY
  // ============================================================

  testingStrategy: [
    {
      testType: 'Unit Tests',
      description: 'Test individual functions',
      tools: 'Jest, Mocha',
      example:
        'Test article validation, search logic, rating calculations',
    },

    {
      testType: 'Integration Tests',
      description: 'Test API endpoints',
      tools: 'Supertest, Jest',
      example: 'Test GET /api/knowledge/articles with different filters',
    },

    {
      testType: 'E2E Tests',
      description: 'Test user workflows',
      tools: 'Cypress, Playwright',
      example:
        'Test full search → view → rate → admin workflows',
    },

    {
      testType: 'Performance Tests',
      description: 'Test system under load',
      tools: 'Apache JMeter, K6',
      example: 'Test search response time with 1000 concurrent users',
    },

    {
      testType: 'Security Tests',
      description: 'Test for vulnerabilities',
      tools: 'OWASP ZAP, Snyk',
      example: 'Test SQL injection, XSS, unauthorized access',
    },
  ],

  // ============================================================
  // SECTION 6: DEPLOYMENT CHECKLIST
  // ============================================================

  deploymentChecklist: [
    {
      phase: 'Pre-Deployment',
      items: [
        '☐ Review code for security issues',
        '☐ Update dependencies',
        '☐ Run full test suite',
        '☐ Performance testing completed',
        '☐ Database backup created',
        '☐ Rollback plan documented',
      ],
    },

    {
      phase: 'Deployment Day',
      items: [
        '☐ Notify users of maintenance window',
        '☐ Enable read-only mode if needed',
        '☐ Deploy backend first',
        '☐ Run database migrations',
        '☐ Deploy frontend',
        '☐ Test all major features',
        '☐ Monitor error logs',
      ],
    },

    {
      phase: 'Post-Deployment',
      items: [
        '☐ Verify analytics are working',
        '☐ Check user reports',
        '☐ Review error logs',
        '☐ Performance analysis',
        '☐ User feedback collection',
        '☐ Document issues and solutions',
      ],
    },
  ],

  // ============================================================
  // SECTION 7: USEFUL COMMANDS
  // ============================================================

  usefulCommands: {
    development: [
      'npm run dev                    # Start development server',
      'npm test                       # Run tests',
      'npm run seed                   # Seed database',
      'npm run migrate                # Run migrations',
      'npm run lint                   # Check code quality',
    ],

    database: [
      'mongosh                        # Open MongoDB shell',
      'db.knowledgearticles.find()    # View all articles',
      'db.knowledgearticles.find().count()  # Count articles',
      'db.knowledgearticles.drop()    # Delete all articles',
      'db.knowledgearticles.createIndex({title: "text", content: "text"})',
    ],

    api: [
      'curl http://localhost:3001/api/knowledge/articles',
      'curl http://localhost:3001/api/knowledge/search?q=علاج',
      'curl -X POST http://localhost:3001/api/knowledge/articles \\',
      '  -H "Content-Type: application/json" \\',
      '  -H "Authorization: Bearer TOKEN" \\',
      '  -d "{...article data...}"',
    ],

    git: [
      'git status                     # Check status',
      'git add .                      # Stage all changes',
      'git commit -m "message"        # Commit changes',
      'git push origin main           # Push to remote',
      'git log --oneline -n 10        # View recent commits',
    ],

    docker: [
      'docker build -t knowledge-app . # Build Docker image',
      'docker run -p 3001:3001 knowledge-app  # Run container',
      'docker ps                      # List running containers',
      'docker logs container_id       # View container logs',
    ],
  },

  // ============================================================
  // SECTION 8: CODE REVIEW CHECKLIST
  // ============================================================

  codeReviewChecklist: [
    '✅ Code follows project conventions',
    '✅ Comments explain complex logic',
    '✅ No console.log() statements left',
    '✅ Error handling is comprehensive',
    '✅ Input validation is present',
    '✅ No hardcoded secrets/passwords',
    '✅ Database queries are optimized',
    '✅ No N+1 query problems',
    '✅ React components are reusable',
    '✅ Props are validated',
    '✅ No memory leaks (cleanup useEffect)',
    '✅ Tests cover critical paths',
    '✅ Performance is acceptable',
    '✅ Security best practices followed',
    '✅ Documentation is updated',
  ],

  // ============================================================
  // SECTION 9: FREQUENTLY ASKED QUESTIONS
  // ============================================================

  faqs: [
    {
      question: 'How do I add a new role (e.g., "consultant")?',
      answer:
        'Update auth middleware to recognize new role, add role checks in protected endpoints, update frontend role-based rendering',
    },

    {
      question: 'How do I backup the database?',
      answer:
        'Use mongodump or MongoDB Atlas automatic backups. For production, enable daily backups in MongoDB Atlas settings',
    },

    {
      question: 'How do I migrate to a different database?',
      answer:
        'Create migration script, export data from old DB, transform data if needed, import to new DB, test thoroughly',
    },

    {
      question: 'Can I use this with GraphQL instead of REST?',
      answer:
        'Yes, create GraphQL schema that maps to existing models, use apollo-server, keep MongoDB schema unchanged',
    },

    {
      question: 'How do I scale this to 1M+ articles?',
      answer:
        'Implement elasticsearch for search, use database replication, implement caching layer (Redis), use CDN for static content',
    },

    {
      question: 'How do I add authentication via OAuth (Google, GitHub)?',
      answer:
        'Install passport.js, configure OAuth strategy, update login endpoint, map OAuth user to internal user',
    },

    {
      question: 'How can I export articles as PDF?',
      answer:
        'Use pdfkit or html-to-pdf library, create export endpoint, return PDF in response, add download button in frontend',
    },

    {
      question: 'How do I implement version control for articles?',
      answer:
        'Add versions array to article schema, save previous version when article is updated, add version history UI',
    },
  ],

  // ============================================================
  // SECTION 10: RESOURCES & LINKS
  // ============================================================

  resources: {
    documentation: [
      'https://docs.mongodb.com',
      'https://expressjs.com',
      'https://react.dev',
      'https://mui.com',
      'https://jwt.io',
    ],

    tools: [
      'MongoDB Compass (DB GUI)',
      'Postman (API testing)',
      'VS Code (Editor)',
      'Git (Version control)',
      'Docker (Containerization)',
    ],

    libraries: [
      'mongoose - MongoDB ODM',
      'axios - HTTP client',
      'jwt-decode - JWT parsing',
      'bcryptjs - Password hashing',
      'nodemailer - Email sending',
    ],

    bestPractices: [
      'https://12factor.net',
      'https://owasp.org/Top10',
      'https://eslint.org',
      'https://prettier.io',
      'https://github.com/goldbergyoni/nodebestpractices',
    ],
  },

  // ============================================================
  // SECTION 11: ERROR CODES & MEANINGS
  // ============================================================

  errorCodes: [
    { code: 400, meaning: 'Bad Request - Invalid input', action: 'Check request format' },
    { code: 401, meaning: 'Unauthorized - No valid token', action: 'Login and retry' },
    { code: 403, meaning: 'Forbidden - Insufficient permissions', action: 'Request admin access' },
    { code: 404, meaning: 'Not Found - Resource does not exist', action: 'Check resource ID' },
    { code: 409, meaning: 'Conflict - Duplicate entry', action: 'Use unique identifier' },
    { code: 500, meaning: 'Server Error - Internal issue', action: 'Check server logs' },
    { code: 503, meaning: 'Service Unavailable - Server down', action: 'Wait and retry' },
  ],

  // ============================================================
  // FINAL TIPS
  // ============================================================

  finalTips: [
    '💡 Read the documentation before asking questions',
    '💡 Test locally before deploying',
    '💡 Keep dependencies up to date',
    '💡 Monitor logs in production',
    '💡 Backup data regularly',
    '💡 Use version control for everything',
    '💡 Write tests while developing',
    '💡 Document your changes',
    '💡 Ask for code reviews',
    '💡 Celebrate your successes! 🎉',
  ],
};

// ============================================================
// EXPORT
// ============================================================

module.exports = developerNotes;

// ============================================================
// CONSOLE OUTPUT
// ============================================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║         📝 DEVELOPER QUICK REFERENCE GUIDE 📝                 ║
║         دليل مرجع المطورين السريع                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📌 IMPORTANT REMINDERS
────────────────────────────────────────────────────────────────
⚠️  Never commit .env files
⚠️  Change JWT_SECRET in production
⚠️  Always validate input on backend
⚠️  Use HTTPS in production
⚠️  Backup database daily

🛠️  USEFUL COMMANDS
────────────────────────────────────────────────────────────────
npm run dev              → Start development server
npm test                 → Run tests
npm run seed             → Seed database
mongosh                  → Open MongoDB shell
curl http://localhost:3001/api/knowledge/articles → Test API

✅ DEBUGGING TIPS
────────────────────────────────────────────────────────────────
1. Check browser DevTools Console
2. Check server logs (terminal where npm run dev is running)
3. Check MongoDB in mongosh
4. Use Network tab to inspect API calls
5. Check .env variables

🚀 BEFORE DEPLOYMENT
────────────────────────────────────────────────────────────────
☐ Run full test suite
☐ Review code for security
☐ Update dependencies
☐ Test locally
☐ Backup database
☐ Document changes

💡 REMEMBER
────────────────────────────────────────────────────────────────
• Read the documentation first
• Test before deploying
• Monitor logs in production
• Back up data regularly
• Ask for help when needed

For more help, see:
📚 📚_KNOWLEDGE_MANAGEMENT_SYSTEM.md
🚀 🚀_KNOWLEDGE_SETUP_QUICK_START.md
💡 💡_KNOWLEDGE_SYSTEM_CODE_EXAMPLES.js
🧪 🧪_KNOWLEDGE_SYSTEM_TESTS.js

Good luck! Happy coding! 🎉
`);
