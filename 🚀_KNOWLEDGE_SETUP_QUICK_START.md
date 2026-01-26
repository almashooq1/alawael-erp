/\*\*

- Knowledge Management System - Installation & Setup Guide
-
- This guide will help you install and configure the Knowledge Management System
  \*/

// ============ FILE STRUCTURE ============ /\* Backend Files: ├── models/ │ └──
KnowledgeBase.js ✅ Data models ├── routes/ │ └── knowledge.js ✅ API endpoints
├── seeds/ │ └── knowledgeBaseSamples.js ✅ Sample data └── server.js (Update
with integration)

Frontend Files: ├── components/ │ └── KnowledgeBase/ │ ├── KnowledgeSearch.jsx
✅ Search & browse │ ├── KnowledgeDetail.jsx ✅ Article viewer │ └──
KnowledgeAdmin.jsx ✅ Admin panel └── App.jsx (Update with routes)

Documentation: ├── 📚_KNOWLEDGE_MANAGEMENT_SYSTEM.md ✅ Full documentation ├──
⚙️_KNOWLEDGE_SYSTEM_INTEGRATION.js ✅ Integration steps └──
🚀_KNOWLEDGE_SETUP_QUICK_START.md ✅ This file \*/

// ============ INSTALLATION STEPS ============

// Step 1: Copy Files to Project console.log(`
╔════════════════════════════════════════════════════════════════╗ ║ STEP 1:
Copy Files to Your Project ║
╚════════════════════════════════════════════════════════════════╝

Backend: ✓ Copy KnowledgeBase.js to: backend/models/ ✓ Copy knowledge.js to:
backend/routes/ ✓ Copy knowledgeBaseSamples.js to: backend/seeds/

Frontend: ✓ Copy KnowledgeSearch.jsx to: frontend/src/components/KnowledgeBase/
✓ Copy KnowledgeDetail.jsx to: frontend/src/components/KnowledgeBase/ ✓ Copy
KnowledgeAdmin.jsx to: frontend/src/components/KnowledgeBase/ `);

// Step 2: Update Backend Server console.log(`
╔════════════════════════════════════════════════════════════════╗ ║ STEP 2:
Update Backend (server.js) ║
╚════════════════════════════════════════════════════════════════╝

1. Add imports at the top: const knowledgeRoutes =
   require('./routes/knowledge'); const { KnowledgeArticle, KnowledgeCategory,
   ... } = require('./models/KnowledgeBase');

2. Add route mounting: app.use('/api/knowledge', knowledgeRoutes);

3. Add seed function call after DB connection: seedKnowledgeBase();

See: ⚙️_KNOWLEDGE_SYSTEM_INTEGRATION.js for details `);

// Step 3: Update Frontend Router console.log(`
╔════════════════════════════════════════════════════════════════╗ ║ STEP 3:
Update Frontend (App.jsx or Router) ║
╚════════════════════════════════════════════════════════════════╝

1. Import components: import KnowledgeSearch from
   './components/KnowledgeBase/KnowledgeSearch'; import KnowledgeDetail from
   './components/KnowledgeBase/KnowledgeDetail'; import KnowledgeAdmin from
   './components/KnowledgeBase/KnowledgeAdmin';

2. Add routes: <Route path="/knowledge" element={<KnowledgeSearch />} /> <Route
   path="/knowledge/:slug" element={<KnowledgeDetail />} /> <Route
   path="/admin/knowledge" element={<KnowledgeAdmin />} />

See: ⚙️_KNOWLEDGE_SYSTEM_INTEGRATION.js for details `);

// Step 4: Database Setup console.log(`
╔════════════════════════════════════════════════════════════════╗ ║ STEP 4:
Database Setup ║
╚════════════════════════════════════════════════════════════════╝

The following collections will be created automatically: ✓ knowledge_articles -
Store articles ✓ knowledge_categories - Store categories ✓
knowledge_search_logs - Store search queries ✓ knowledge_ratings - Store user
ratings

Indexes will be created for: ✓ Full-text search (title, content, description) ✓
Category and status filtering ✓ Tag-based search ✓ Sorting by date and views `);

// Step 5: Configuration console.log(`
╔════════════════════════════════════════════════════════════════╗ ║ STEP 5:
Environment Configuration ║
╚════════════════════════════════════════════════════════════════╝

Add to .env file:

# Knowledge Management System

REACT_APP_API_URL=http://localhost:3001/api REACT_APP_KNOWLEDGE_ENABLED=true
KNOWLEDGE_SEARCH_LIMIT=20 KNOWLEDGE_CACHE_TIME=3600 `);

// Step 6: Test Installation console.log(`
╔════════════════════════════════════════════════════════════════╗ ║ STEP 6:
Test Installation ║
╚════════════════════════════════════════════════════════════════╝

1. Start Backend: cd backend npm start

2. Start Frontend: cd frontend npm start

3. Test Endpoints:

   Browser Console or Postman:

   GET http://localhost:3001/api/knowledge/articles GET
   http://localhost:3001/api/knowledge/categories GET
   http://localhost:3001/api/knowledge/search?q=test

4. Open in Browser: http://localhost:3002/knowledge
   http://localhost:3002/admin/knowledge `);

// ============ API ENDPOINTS SUMMARY ============

const API_ENDPOINTS = { articles: { list: 'GET
/api/knowledge/articles?category=&page=1&limit=10', get: 'GET
/api/knowledge/articles/:id', create: 'POST /api/knowledge/articles', update:
'PUT /api/knowledge/articles/:id', delete: 'DELETE /api/knowledge/articles/:id',
}, search: { fullText: 'GET /api/knowledge/search?q=query&category=&limit=20',
trending: 'GET /api/knowledge/trending?limit=5', topRated: 'GET
/api/knowledge/top-rated?limit=10', }, categories: { list: 'GET
/api/knowledge/categories', byCategory: 'GET
/api/knowledge/categories/:category', }, ratings: { rate: 'POST
/api/knowledge/articles/:id/rate', }, analytics: { searches: 'GET
/api/knowledge/analytics/searches?days=30', stats: 'GET
/api/knowledge/analytics/stats', }, };

console.log('✅ API Endpoints:', API_ENDPOINTS);

// ============ VERIFICATION CHECKLIST ============

console.log(` ╔════════════════════════════════════════════════════════════════╗
║ VERIFICATION CHECKLIST ║
╚════════════════════════════════════════════════════════════════╝

Backend: ☐ KnowledgeBase.js in models/ ☐ knowledge.js in routes/ ☐
knowledgeBaseSamples.js in seeds/ ☐ Routes imported in server.js ☐ Routes
mounted in server.js ☐ Seed function called ☐ Database connected

Frontend: ☐ KnowledgeSearch.jsx copied ☐ KnowledgeDetail.jsx copied ☐
KnowledgeAdmin.jsx copied ☐ Routes added to App.jsx ☐ Navigation links added ☐
Environment variables set

Testing: ☐ Backend starts without errors ☐ Frontend starts without errors ☐
/knowledge page loads ☐ Search works ☐ Sample data appears ☐ Admin panel
accessible

Documentation: ☐ 📚_KNOWLEDGE_MANAGEMENT_SYSTEM.md read ☐
⚙️_KNOWLEDGE_SYSTEM_INTEGRATION.js reviewed ☐ Users trained on system `);

// ============ TROUBLESHOOTING ============

console.log(` ╔════════════════════════════════════════════════════════════════╗
║ TROUBLESHOOTING ║
╚════════════════════════════════════════════════════════════════╝

Issue: 404 Error on /api/knowledge endpoints Fix: Ensure routes are mounted in
server.js Check: app.use('/api/knowledge', knowledgeRoutes);

Issue: No sample data appears Fix: Call seedKnowledgeBase() after DB connection
Check: Database connection is successful

Issue: Search not working Fix: Ensure MongoDB indexes are created Check:
Database logs for index creation

Issue: Ratings not saving Fix: Ensure user is authenticated Check: Auth
middleware is applied to route

Issue: React component errors Fix: Ensure MUI packages are installed npm install
@mui/material @mui/icons-material

Issue: CORS errors Fix: Backend CORS should already be configured Check:
REACT_APP_API_URL matches backend URL `);

// ============ PERFORMANCE TIPS ============

console.log(` ╔════════════════════════════════════════════════════════════════╗
║ PERFORMANCE OPTIMIZATION TIPS ║
╚════════════════════════════════════════════════════════════════╝

1. Database Queries: ✓ Indexes are created automatically ✓ Pagination limits
   default to 10 items ✓ Search results are limited to 20 by default

2. Frontend Rendering: ✓ Use pagination for large result sets ✓ Lazy load
   article details ✓ Cache search results locally

3. Search Optimization: ✓ Full-text indexes on title, content, description ✓
   Category indexes for faster filtering ✓ Sorting indexes on views and date

4. Monitoring: ✓ Check analytics for popular searches ✓ Monitor database query
   performance ✓ Track user engagement metrics `);

module.exports = { API_ENDPOINTS, };
