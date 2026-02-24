const express = require('express');
const router = express.Router();
const educationalContentController = require('../controllers/educationalContentController');
const virtualSessionController = require('../controllers/virtualSessionController');
const digitalLibraryController = require('../controllers/digitalLibraryController');
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middleware/authMiddleware');

// ==================== Educational Content Routes ====================
router.get('/content', educationalContentController.getAllContent);
router.get('/content/popular', educationalContentController.getPopularContent);
router.get('/content/category/:category', educationalContentController.getContentByCategory);
router.get('/content/:id', educationalContentController.getContentById);
router.get('/content/stats', educationalContentController.getContentStatistics);

router.post('/content', authenticate, educationalContentController.createContent);
router.put('/content/:id', authenticate, educationalContentController.updateContent);
router.post('/content/:id/publish', authenticate, educationalContentController.publishContent);
router.post('/content/:id/rate', authenticate, educationalContentController.rateContent);
router.delete('/content/:id', authenticate, educationalContentController.deleteContent);

// ==================== Virtual Session Routes ====================
router.get('/sessions', virtualSessionController.getAllSessions);
router.get('/sessions/upcoming', virtualSessionController.getUpcomingSessions);
router.get('/sessions/category/:category', virtualSessionController.getSessionsByCategory);
router.get('/sessions/stats', virtualSessionController.getSessionStatistics);
router.get('/sessions/:id', virtualSessionController.getSessionById);

router.post('/sessions', authenticate, virtualSessionController.createSession);
router.put('/sessions/:id', authenticate, virtualSessionController.updateSession);
router.post('/sessions/:id/register', authenticate, virtualSessionController.registerForSession);
router.post(
  '/sessions/:id/cancel-registration',
  authenticate,
  virtualSessionController.cancelRegistration
);
router.post('/sessions/:id/complete', authenticate, virtualSessionController.completeSession);
router.post('/sessions/:id/feedback', authenticate, virtualSessionController.addFeedback);

// ==================== Digital Library Routes ====================
router.get('/library', digitalLibraryController.getAllResources);
router.get('/library/search', digitalLibraryController.searchResources);
router.get('/library/category/:category', digitalLibraryController.getResourcesByCategory);
router.get('/library/stats', digitalLibraryController.getLibraryStatistics);
router.get('/library/:id', digitalLibraryController.getResourceById);

router.post('/library/upload', authenticate, digitalLibraryController.uploadResource);
router.post('/library/:id/download', authenticate, digitalLibraryController.downloadResource);
router.post('/library/:id/review', authenticate, digitalLibraryController.addReview);
router.put('/library/:id', authenticate, digitalLibraryController.updateResource);
router.post('/library/:id/approve', authenticate, digitalLibraryController.approveResource);
router.delete('/library/:id', authenticate, digitalLibraryController.deleteResource);

// ==================== Subscription Routes ====================
router.get('/subscriptions/plans', subscriptionController.getAllPlans);
router.get('/subscriptions/plans/:id', subscriptionController.getPlanById);
router.get('/subscriptions/stats', subscriptionController.getSubscriptionStatistics);
router.get('/subscriptions/expiring', subscriptionController.getExpiringSubscriptions);

router.post('/subscriptions/plans', authenticate, subscriptionController.createPlan);
router.put('/subscriptions/plans/:id', authenticate, subscriptionController.updatePlan);

router.get('/subscriptions/user', authenticate, subscriptionController.getUserSubscription);
router.post('/subscriptions/subscribe', authenticate, subscriptionController.subscribeUser);
router.post('/subscriptions/upgrade', authenticate, subscriptionController.upgradeSubscription);
router.post('/subscriptions/renew', authenticate, subscriptionController.renewSubscription);
router.post('/subscriptions/cancel', authenticate, subscriptionController.cancelSubscription);

module.exports = router;
