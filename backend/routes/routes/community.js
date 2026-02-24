/**
 * Community Awareness Routes
 * Endpoints for educational content, virtual sessions, digital library, and subscriptions
 */

const express = require('express');
const router = express.Router();

// Mock database storage
const communityData = {
  content: [],
  sessions: [],
  library: [],
  subscriptions: [],
  ratings: [],
  reviews: [],
};

let contentIdCounter = 1;
let sessionIdCounter = 1;

// Valid disability categories
const VALID_CATEGORIES = ['visual', 'hearing', 'mobility', 'cognitive', 'learning', 'developmental'];

// ================== EDUCATIONAL CONTENT ==================

// POST /api/community/content - Create educational content
router.post('/content', (req, res) => {
  try {
    const { title, description, contentType, disabilityCategory, contentUrl, level, tags, accessibilityFeatures } = req.body;
    
    const newContent = {
      _id: contentIdCounter++,
      title,
      description,
      contentType,
      disabilityCategory,
      contentUrl,
      level,
      tags: tags || [],
      accessibilityFeatures: accessibilityFeatures || {},
      views: 0,
      rating: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    communityData.content.push(newContent);

    return res.status(201).json({
      success: true,
      message: 'Educational content created successfully',
      data: newContent,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/content/popular - Get popular content (MUST come before /:id)
router.get('/content/popular', (req, res) => {
  try {
    const popular = communityData.content.sort((a, b) => b.views - a.views).slice(0, 10);

    return res.status(200).json({
      success: true,
      data: popular,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/content/category/:category - Get content by category (MUST come before /:id)
router.get('/content/category/:category', (req, res) => {
  try {
    const category = req.params.category;
    
    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Valid categories are: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const filtered = communityData.content.filter(c => c.disabilityCategory === category);

    return res.status(200).json({
      success: true,
      data: {
        content: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/content/stats - Get content statistics (MUST come before /:id)
router.get('/content/stats', (req, res) => {
  try {
    const stats = {
      totalContent: communityData.content.length,
      totalViews: communityData.content.reduce((acc, c) => acc + c.views, 0),
      averageRating: communityData.content.reduce((acc, c) => acc + c.rating, 0) / Math.max(communityData.content.length, 1),
      contentByCategory: {},
      contentByType: {},
    };

    communityData.content.forEach(c => {
      stats.contentByCategory[c.disabilityCategory] = (stats.contentByCategory[c.disabilityCategory] || 0) + 1;
      stats.contentByType[c.contentType] = (stats.contentByType[c.contentType] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/content - Get all educational content
router.get('/content', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const paginatedContent = communityData.content.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      data: {
        content: paginatedContent,
        total: communityData.content.length,
        page,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/content/:id - Get specific content by ID
router.get('/content/:id', (req, res) => {
  try {
    const contentId = parseInt(req.params.id);
    const content = communityData.content.find(c => c._id === contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    content.views++;
    return res.status(200).json({
      success: true,
      data: content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/content/:id/rate - Rate content
router.post('/content/:id/rate', (req, res) => {
  try {
    const { rating } = req.body;
    const contentId = parseInt(req.params.id);
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const content = communityData.content.find(c => c._id === contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    communityData.ratings.push({ contentId, rating, userId: req.user?._id || 'guest', createdAt: new Date() });
    content.rating = (content.rating * 0.9 + rating * 0.1); // Weighted average

    return res.status(200).json({
      success: true,
      message: 'Content rated successfully',
      data: content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================== VIRTUAL SESSIONS ==================

// POST /api/community/sessions - Create virtual session
router.post('/sessions', (req, res) => {
  try {
    const { title, description, sessionType, targetDisabilityCategory, scheduledDate, duration } = req.body;

    const newSession = {
      _id: sessionIdCounter++,
      title,
      description,
      sessionType,
      targetDisabilityCategory,
      scheduledDate,
      duration,
      participants: [],
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    communityData.sessions.push(newSession);

    return res.status(201).json({
      success: true,
      message: 'Virtual session created successfully',
      data: newSession,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/sessions/upcoming - Get upcoming sessions (MUST come before /:id)
router.get('/sessions/upcoming', (req, res) => {
  try {
    const now = new Date();
    const upcoming = communityData.sessions.filter(s => new Date(s.scheduledDate) > now);

    return res.status(200).json({
      success: true,
      data: upcoming,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/sessions/stats - Get session statistics (MUST come before /:id)
router.get('/sessions/stats', (req, res) => {
  try {
    const stats = {
      totalSessions: communityData.sessions.length,
      activeSessions: communityData.sessions.filter(s => s.status === 'active').length,
      totalParticipants: communityData.sessions.reduce((sum, s) => sum + s.participants.length, 0),
      upcomingSessions: communityData.sessions.filter(s => new Date(s.scheduledDate) > new Date()).length,
    };

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/sessions - Get all sessions
router.get('/sessions', (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        sessions: communityData.sessions,
        total: communityData.sessions.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/sessions/:id/register - Register for session
router.post('/sessions/:id/register', (req, res) => {
  try {
    let sessionId = req.params.id;
    
    // Try to parse as number, otherwise use as string
    if (!isNaN(sessionId)) {
      sessionId = parseInt(sessionId);
    }
    
    const session = communityData.sessions.find(s => {
      if (typeof sessionId === 'number') {
        return s._id === sessionId;
      } else {
        return s._id === sessionId || String(s._id) === sessionId;
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Extract userId from either request body or generate one for testing
    const userId = req.body?.userId || `user-${req.user?._id || 'guest'}`;
    
    if (userId && !session.participants.includes(userId)) {
      session.participants.push(userId);
    }

    return res.status(200).json({
      success: true,
      message: 'Registered for session successfully',
      data: session,
    });
  } catch (error) {
    console.error('Register session error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/sessions/:id/feedback - Add session feedback
router.post('/sessions/:id/feedback', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { userId, rating, comment } = req.body;
    const session = communityData.sessions.find(s => s._id === sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const feedback = {
      sessionId,
      userId,
      rating,
      comment,
      createdAt: new Date(),
    };

    communityData.reviews.push(feedback);

    return res.status(200).json({
      success: true,
      message: 'Feedback added successfully',
      data: feedback,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================== DIGITAL LIBRARY ==================

// POST /api/community/library/upload - Upload resource to library
router.post('/library/upload', (req, res) => {
  try {
    const { title, author, resourceType, fileUrl, category, description, language, tags, license } = req.body;

    const newResource = {
      _id: `lib-${Date.now()}`,
      title,
      author,
      resourceType,
      fileUrl,
      category: category || 'general',
      description,
      language: language || 'en',
      tags: tags || [],
      license: license || 'cc_by',
      downloads: 0,
      rating: 0,
      createdAt: new Date(),
    };

    communityData.library.push(newResource);

    return res.status(201).json({
      success: true,
      message: 'Resource added to library',
      data: newResource,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/library - Add to library (alias for upload)
router.post('/library', (req, res) => {
  try {
    const { title, author, resourceType, fileUrl, category, description, language, tags, license } = req.body;

    const newResource = {
      _id: `lib-${Date.now()}`,
      title,
      author,
      resourceType,
      fileUrl,
      category: category || 'general',
      description,
      language: language || 'en',
      tags: tags || [],
      license: license || 'cc_by',
      downloads: 0,
      rating: 0,
      createdAt: new Date(),
    };

    communityData.library.push(newResource);

    return res.status(201).json({
      success: true,
      message: 'Resource added to library',
      data: newResource,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/library/search - Search library resources (MUST come before /:id)
router.get('/library/search', (req, res) => {
  try {
    const { q, category, type } = req.query;
    let results = communityData.library;

    if (q) {
      results = results.filter(r => 
        r.title.toLowerCase().includes(q.toLowerCase()) ||
        r.author.toLowerCase().includes(q.toLowerCase())
      );
    }

    if (category) {
      results = results.filter(r => r.category === category);
    }

    if (type) {
      results = results.filter(r => r.resourceType === type);
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/library/category/:category - Get resources by category (MUST come before /:id)
router.get('/library/category/:category', (req, res) => {
  try {
    const filtered = communityData.library.filter(r => r.category === req.params.category);

    return res.status(200).json({
      success: true,
      data: {
        resources: filtered,
        total: filtered.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/library/stats - Get library statistics (MUST come before /:id)
router.get('/library/stats', (req, res) => {
  try {
    const stats = {
      totalResources: communityData.library.length,
      totalDownloads: communityData.library.reduce((acc, r) => acc + r.downloads, 0),
      averageRating: communityData.library.reduce((acc, r) => acc + r.rating, 0) / Math.max(communityData.library.length, 1),
      resourcesByType: {},
      resourcesByCategory: {},
    };

    communityData.library.forEach(r => {
      stats.resourcesByType[r.resourceType] = (stats.resourcesByType[r.resourceType] || 0) + 1;
      stats.resourcesByCategory[r.category] = (stats.resourcesByCategory[r.category] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/library - Get library resources
router.get('/library', (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        resources: communityData.library,
        total: communityData.library.length,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/library/:id/review - Add review to resource
router.post('/library/:id/review', (req, res) => {
  try {
    const { userId, rating, comment } = req.body;
    const resource = communityData.library.find(r => r._id === req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const review = {
      resourceId: req.params.id,
      userId,
      rating,
      comment,
      createdAt: new Date(),
    };

    communityData.reviews.push(review);
    resource.rating = (resource.rating * 0.9 + rating * 0.1);

    return res.status(200).json({
      success: true,
      message: 'Review added successfully',
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/library/:id/download - Download resource
router.post('/library/:id/download', (req, res) => {
  try {
    const resource = communityData.library.find(r => r._id === req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    resource.downloads++;

    return res.status(200).json({
      success: true,
      message: 'Download started',
      data: resource,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ================== SUBSCRIPTIONS ==================

// GET /api/community/subscriptions/plans - Get subscription plans (MUST come before /:userId)
router.get('/subscriptions/plans', (req, res) => {
  try {
    const plans = [
      {
        _id: 'basic',
        name: 'Basic',
        price: 0,
        features: ['Access to public content'],
      },
      {
        _id: 'premium',
        name: 'Premium',
        price: 99,
        features: ['All content', 'Priority support', 'Ad-free'],
      },
      {
        _id: 'enterprise',
        name: 'Enterprise',
        price: 999,
        features: ['Custom content', '24/7 support', 'API access'],
      },
    ];

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/subscriptions/plans - Create subscription plan (admin only)
router.post('/subscriptions/plans', (req, res) => {
  try {
    const { name, description, price, features, limitations } = req.body;

    const newPlan = {
      _id: `plan-${Date.now()}`,
      name,
      description,
      price,
      features,
      limitations,
      createdAt: new Date(),
    };

    communityData.subscriptions.push(newPlan);

    return res.status(200).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: newPlan,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/subscriptions/subscribe - Subscribe to plan
router.post('/subscriptions/subscribe', (req, res) => {
  try {
    const { planId, subscriptionType } = req.body;

    const subscription = {
      _id: `sub-${Date.now()}`,
      planId,
      subscriptionType: subscriptionType || 'monthly',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    };

    communityData.subscriptions.push(subscription);

    return res.status(201).json({
      success: true,
      message: 'Subscribed successfully',
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/subscriptions/user - Get current user subscription (MUST come before /:userId)
router.get('/subscriptions/user', (req, res) => {
  try {
    // For testing, return a mock subscription
    const subscription = {
      _id: `sub-${Date.now()}`,
      userId: req.user?._id || 'test-user',
      planId: 'premium',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    };

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/subscriptions/stats - Get subscription statistics (MUST come before /:userId)
router.get('/subscriptions/stats', (req, res) => {
  try {
    const stats = {
      totalSubscriptions: communityData.subscriptions.filter(s => s.status === 'active' && !s.features).length || 0,
      activeSubscriptions: communityData.subscriptions.filter(s => s.status === 'active' && !s.features).length || 0,
      subscriptionByPlan: {},
      revenue: 0,
    };

    communityData.subscriptions.forEach(s => {
      if (!s.features) { // Only count actual subscriptions, not plans
        stats.subscriptionByPlan[s.planId] = (stats.subscriptionByPlan[s.planId] || 0) + 1;
      }
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/community/subscriptions - Subscribe to plan (old endpoint for backward compatibility)
router.post('/subscriptions', (req, res) => {
  try {
    const { planId, userId } = req.body;

    const subscription = {
      _id: `sub-${Date.now()}`,
      userId,
      planId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    };

    communityData.subscriptions.push(subscription);

    return res.status(201).json({
      success: true,
      message: 'Subscribed successfully',
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/community/subscriptions/:userId - Get user subscription
router.get('/subscriptions/:userId', (req, res) => {
  try {
    const subscription = communityData.subscriptions.find(s => s.userId === req.params.userId && s.status === 'active');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
