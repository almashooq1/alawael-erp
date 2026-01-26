/**
 * Integration: Add Knowledge Routes to Server
 * 
 * Add this to your backend/server.js
 */

// ============ STEP 1: Import Knowledge Routes ============
// Add this at the top of server.js with other route imports:
const knowledgeRoutes = require('./routes/knowledge');

// ============ STEP 2: Register Knowledge Models ============
// Add this after your other model imports:
const {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeSearchLog,
  KnowledgeRating,
} = require('./models/KnowledgeBase');

// ============ STEP 3: Mount Knowledge Routes ============
// Add this after your other route mounts (around line 200-250):
app.use('/api/knowledge', knowledgeRoutes);

// ============ STEP 4: Add Sample Data Seeding ============
// Add this function to initialize sample data (call once on startup):

const seedKnowledgeBase = async () => {
  try {
    const count = await KnowledgeArticle.countDocuments();
    
    if (count === 0) {
      console.log('🌱 Seeding Knowledge Base...');
      
      const KNOWLEDGE_BASE_SAMPLES = require('./seeds/knowledgeBaseSamples');
      
      // Get a default admin user (you may need to adjust this)
      let adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        adminUser = await User.findOne();
      }
      
      if (!adminUser) {
        console.log('⚠️  No user found. Skipping knowledge base seeding.');
        return;
      }
      
      const articlesWithAuthor = KNOWLEDGE_BASE_SAMPLES.map(article => ({
        ...article,
        author: adminUser._id,
        status: 'published',
        isPublic: true,
      }));
      
      await KnowledgeArticle.insertMany(articlesWithAuthor);
      console.log('✅ Knowledge Base seeded successfully');
    }
  } catch (error) {
    console.error('❌ Error seeding knowledge base:', error);
  }
};

// Call this after database connection:
// seedKnowledgeBase();

// ============ STEP 5: Add Frontend Routes (React Router) ============
// Add these routes to your App.jsx or main routing file:

import KnowledgeSearch from './components/KnowledgeBase/KnowledgeSearch';
import KnowledgeDetail from './components/KnowledgeBase/KnowledgeDetail';
import KnowledgeAdmin from './components/KnowledgeBase/KnowledgeAdmin';

// In your router configuration:
<Route path="/knowledge" element={<KnowledgeSearch />} />
<Route path="/knowledge/:slug" element={<KnowledgeDetail />} />
<Route path="/admin/knowledge" element={<ProtectedRoute><KnowledgeAdmin /></ProtectedRoute>} />

// ============ STEP 6: Add Navigation Links ============
// Add these to your main navigation:

<Link to="/knowledge">📚 Knowledge Base</Link>
<Link to="/admin/knowledge">📚 Manage Knowledge</Link>

// ============ STEP 7: Environment Variables (if needed) ============
// Ensure these are in your .env file:
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_KNOWLEDGE_ENABLED=true

// ============ STEP 8: Database Indexes ============
// These are automatically created by Mongoose, but you can verify:
// 
// db.knowledge_articles.createIndex({ title: "text", content: "text", description: "text" })
// db.knowledge_articles.createIndex({ category: 1, status: 1 })
// db.knowledge_articles.createIndex({ tags: 1 })
// db.knowledge_articles.createIndex({ createdAt: -1 })
// db.knowledge_articles.createIndex({ views: -1 })

console.log('✅ Knowledge Management System Integration Complete!');
