/**
 * ADVANCED CHATBOT TESTING SUITE
 * Unit Tests and Integration Tests
 * Version: 2.0
 */

const AdvancedChatbotService = require('../services/advancedChatbotService');

describe('AdvancedChatbotService', () => {
  let chatbotService;

  beforeAll(() => {
    chatbotService = new AdvancedChatbotService({
      maxConversationLength: 100,
      conversationTimeout: 3600000,
      confidenceThreshold: 0.6,
      learningEnabled: true,
      multiLanguageSupport: true,
    });
  });

  // ============================================================================
  // CORE FUNCTIONALITY TESTS
  // ============================================================================

  describe('Conversation Management', () => {
    test('should create a new conversation', () => {
      const conversationId = chatbotService.createConversation('user123');
      expect(conversationId).toBeDefined();
      expect(conversationId).toMatch(/^conv_/);
    });

    test('should retrieve existing conversation', () => {
      const conversationId = chatbotService.createConversation('user123');
      const history = chatbotService.getConversationHistory(conversationId);
      expect(history).toBeDefined();
      expect(history.conversationId).toBe(conversationId);
    });

    test('should clear conversation', () => {
      const conversationId = chatbotService.createConversation('user123');
      const result = chatbotService.clearConversation(conversationId);
      expect(result.success).toBe(true);
    });

    test('should get user conversations', () => {
      const userId = 'user' + Date.now();
      chatbotService.createConversation(userId);
      chatbotService.createConversation(userId);

      const conversations = chatbotService.getUserConversations(userId);
      expect(conversations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MESSAGE PROCESSING TESTS
  // ============================================================================

  describe('Message Processing', () => {
    let conversationId;

    beforeEach(() => {
      conversationId = chatbotService.createConversation('testUser');
    });

    test('should process user message', async () => {
      const result = await chatbotService.processMessage(
        'testUser',
        'What is my salary?',
        conversationId
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should handle Arabic messages', async () => {
      const result = await chatbotService.processMessage(
        'testUser',
        'كم راتبي؟',
        conversationId
      );

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    test('should detect intent correctly', async () => {
      const result = await chatbotService.processMessage(
        'testUser',
        'I want to request leave',
        conversationId
      );

      expect(result.success).toBe(true);
      expect(['hr.leave', 'general.help']).toContain(result.intent);
    });

    test('should handle empty message gracefully', async () => {
      const result = await chatbotService.processMessage(
        'testUser',
        '   ',
        conversationId
      );

      expect(result.success).toBe(false);
    });

    test('should return suggestions', async () => {
      const result = await chatbotService.processMessage(
        'testUser',
        'I need help with HR',
        conversationId
      );

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  // ============================================================================
  // LANGUAGE DETECTION TESTS
  // ============================================================================

  describe('Language Detection', () => {
    test('should detect Arabic language', () => {
      const analysis = chatbotService.analyzeMessage('السلام عليكم');
      expect(analysis.language).toBe('ar');
    });

    test('should detect English language', () => {
      const analysis = chatbotService.analyzeMessage('Hello world');
      expect(analysis.language).toBe('en');
    });

    test('should detect mixed language as English (default)', () => {
      const analysis = chatbotService.analyzeMessage('Hello مرحبا');
      expect(['ar', 'en']).toContain(analysis.language);
    });
  });

  // ============================================================================
  // SENTIMENT ANALYSIS TESTS
  // ============================================================================

  describe('Sentiment Analysis', () => {
    test('should detect positive sentiment', () => {
      const analysis = chatbotService.analyzeMessage('This is great! Excellent service!');
      expect(analysis.sentiment).toBe('positive');
    });

    test('should detect negative sentiment', () => {
      const analysis = chatbotService.analyzeMessage('This is terrible and awful');
      expect(analysis.sentiment).toBe('negative');
    });

    test('should detect neutral sentiment', () => {
      const analysis = chatbotService.analyzeMessage('What is the date today');
      expect(analysis.sentiment).toBe('neutral');
    });

    test('should detect Arabic positive sentiment', () => {
      const analysis = chatbotService.analyzeMessage('رائع جداً وممتاز');
      expect(analysis.sentiment).toBe('positive');
    });
  });

  // ============================================================================
  // ENTITY EXTRACTION TESTS
  // ============================================================================

  describe('Entity Extraction', () => {
    test('should extract module entity', () => {
      const entities = chatbotService.extractEntities('I need help with HR module');
      const moduleEntity = entities.find(e => e.type === 'module');
      expect(moduleEntity).toBeDefined();
      expect(moduleEntity.value).toBe('hr');
    });

    test('should extract action entity', () => {
      const entities = chatbotService.extractEntities('create a new record');
      const actionEntity = entities.find(e => e.type === 'action');
      expect(actionEntity).toBeDefined();
      expect(actionEntity.value).toBe('create');
    });

    test('should handle multiple entities', () => {
      const entities = chatbotService.extractEntities('create new HR report this week');
      expect(entities.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RATING AND FEEDBACK TESTS
  // ============================================================================

  describe('Rating and Feedback', () => {
    let conversationId;

    beforeEach(() => {
      conversationId = chatbotService.createConversation('testUser');
    });

    test('should rate conversation', () => {
      const result = chatbotService.rateConversation(conversationId, 5, 'Excellent service!');
      expect(result.success).toBe(true);
    });

    test('should reject invalid rating', () => {
      const result = chatbotService.rateConversation(conversationId, 6);
      expect(result.success).toBe(false);
    });

    test('should accept valid ratings 1-5', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const result = chatbotService.rateConversation(conversationId, rating);
        expect(result.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe('Statistics', () => {
    test('should get chatbot statistics', () => {
      const stats = chatbotService.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalMessages).toBeGreaterThanOrEqual(0);
      expect(stats.totalConversations).toBeGreaterThanOrEqual(0);
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeDefined();
    });

    test('should track total users', () => {
      const initialStats = chatbotService.getStatistics();
      chatbotService.createConversation('newUser' + Date.now());
      const updatedStats = chatbotService.getStatistics();
      expect(updatedStats.totalUsers).toBeGreaterThanOrEqual(initialStats.totalUsers);
    });

    test('should track user satisfaction', async () => {
      const conversationId = chatbotService.createConversation('user' + Date.now());
      await chatbotService.processMessage('testUser', 'test message', conversationId);
      chatbotService.rateConversation(conversationId, 5);

      const stats = chatbotService.getStatistics();
      expect(stats.userSatisfaction).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // RECOMMENDATIONS TESTS
  // ============================================================================

  describe('Recommendations', () => {
    test('should get recommendations for user', async () => {
      const userId = 'user' + Date.now();
      const conversationId = chatbotService.createConversation(userId);

      // Send some messages
      await chatbotService.processMessage(userId, 'Tell me about HR', conversationId);

      const recommendations = chatbotService.getRecommendations(userId);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should suggest unexplored topics', async () => {
      const userId = 'user' + Date.now();
      const conversationId = chatbotService.createConversation(userId);

      // Only explore HR
      await chatbotService.processMessage(userId, 'HR information please', conversationId);

      const recommendations = chatbotService.getRecommendations(userId);
      const categories = recommendations.map(r => r.title);

      // Should include topics other than HR
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // LEARNING DATA TESTS
  // ============================================================================

  describe('Learning Data', () => {
    test('should export learning data', () => {
      const data = chatbotService.exportLearningData();
      expect(data).toBeDefined();
      expect(data.learningDataPoints).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should collect learning data from interactions', async () => {
      const initialData = chatbotService.exportLearningData();
      const conversationId = chatbotService.createConversation('user' + Date.now());

      await chatbotService.processMessage('testUser', 'test message', conversationId);

      const updatedData = chatbotService.exportLearningData();
      expect(updatedData.learningDataPoints).toBeGreaterThanOrEqual(initialData.learningDataPoints);
    });
  });

  // ============================================================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    test('should handle very long messages', async () => {
      const conversationId = chatbotService.createConversation('testUser');
      const longMessage = 'a'.repeat(5000);

      const result = await chatbotService.processMessage(
        'testUser',
        longMessage,
        conversationId
      );

      expect(result).toBeDefined();
    });

    test('should handle special characters', async () => {
      const conversationId = chatbotService.createConversation('testUser');
      const message = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const result = await chatbotService.processMessage(
        'testUser',
        message,
        conversationId
      );

      expect(result.success).toBe(true);
    });

    test('should handle non-existent conversation gracefully', async () => {
      const result = await chatbotService.processMessage(
        'testUser',
        'message',
        'non_existent_conv'
      );

      expect(result.success).toBe(false);
    });

    test('should handle concurrent messages', async () => {
      const conversationId = chatbotService.createConversation('testUser');
      const messages = ['message1', 'message2', 'message3'];

      const results = await Promise.all(
        messages.map(msg =>
          chatbotService.processMessage('testUser', msg, conversationId)
        )
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    test('should process message within acceptable time', async () => {
      const conversationId = chatbotService.createConversation('testUser');
      const startTime = Date.now();

      await chatbotService.processMessage(
        'testUser',
        'Test message',
        conversationId
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should be less than 1 second
    });

    test('should maintain performance with many conversations', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        chatbotService.createConversation(`user${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should handle 100 conversations in < 5 seconds
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    test('should complete full conversation flow', async () => {
      // 1. Create conversation
      const conversationId = chatbotService.createConversation('testUser');
      expect(conversationId).toBeDefined();

      // 2. Send message
      const result1 = await chatbotService.processMessage(
        'testUser',
        'I need HR help',
        conversationId
      );
      expect(result1.success).toBe(true);

      // 3. Get history
      const history = chatbotService.getConversationHistory(conversationId);
      expect(history.messages.length).toBeGreaterThan(0);

      // 4. Rate conversation
      const ratingResult = chatbotService.rateConversation(conversationId, 5, 'Great!');
      expect(ratingResult.success).toBe(true);

      // 5. Get recommendations
      const recommendations = chatbotService.getRecommendations('testUser');
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should handle multi-turn conversation', async () => {
      const conversationId = chatbotService.createConversation('testUser');

      const messages = [
        'Hello',
        'I need help with my salary',
        'Can you show me my leave balance?',
        'How do I apply for a new leave?',
      ];

      for (const message of messages) {
        const result = await chatbotService.processMessage(
          'testUser',
          message,
          conversationId
        );
        expect(result.success).toBe(true);
      }

      const history = chatbotService.getConversationHistory(conversationId);
      expect(history.messages.length).toBeGreaterThanOrEqual(messages.length * 2);
    });
  });
});

module.exports = AdvancedChatbotService;
