/**
 * Chatbot Service - AI-Powered Support System
 * Real-time chat, ticket management, knowledge base
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');

// Knowledge Base Schema
const KnowledgeBaseSchema = new mongoose.Schema({
  title: String,
  category: String,
  content: String,
  keywords: [String],
  helpful: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const KnowledgeBase = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);

// Support Ticket Schema
const SupportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: String,
  description: String,
  category: { type: String, enum: ['bug', 'feature', 'support', 'account'], default: 'support' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: String,
      attachment: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  resolution: String,
  resolutionTime: Date,
  rating: Number,
  feedback: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);

// Chat Message Schema
const ChatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  response: String,
  type: { type: String, enum: ['user', 'bot', 'agent'], default: 'user' },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
  confidence: Number,
  suggestions: [String],
  timestamp: { type: Date, default: Date.now },
  helpful: Boolean,
});

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

class ChatbotService {
  /**
   * Process user message
   */
  async processMessage(userId, message) {
    try {
      // Check knowledge base
      const kbResults = await this.searchKnowledgeBase(message);

      // Analyze intent
      const intent = this.analyzeIntent(message);

      // Generate response
      let response = '';
      let suggestions = [];

      if (kbResults.length > 0) {
        response = `بناءً على سؤالك، وجدت المقالات التالية:\n\n${kbResults
          .slice(0, 3)
          .map(kb => `📖 ${kb.title}`)
          .join('\n')}`;
        suggestions = kbResults.slice(0, 3).map(kb => kb.title);
      } else if (intent.requiresAgent) {
        response = 'يبدو أن سؤالك يحتاج إلى دعم من فريقنا. سيتم إنشاء تذكرة دعم لك.';
        // Create ticket
        await this.createTicketFromChat(userId, message);
      } else {
        response = this.generateBotResponse(intent);
      }

      // Save chat message
      const chatMsg = new ChatMessage({
        userId,
        message,
        response,
        type: 'bot',
        sentiment: this.analyzeSentiment(message),
        suggestions,
      });

      await chatMsg.save();

      return {
        response,
        suggestions,
        intent: intent.type,
        ticketCreated: intent.requiresAgent,
      };
    } catch (error) {
      console.error('Chatbot error:', error);
      return {
        response: 'عذراً، حدث خطأ. يرجى إعادة المحاولة.',
        error: error.message,
      };
    }
  }

  /**
   * Search knowledge base
   */
  async searchKnowledgeBase(query) {
    try {
      const results = await KnowledgeBase.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { keywords: { $in: query.split(' ') } },
        ],
      }).limit(5);

      // Increment view count
      results.forEach(async result => {
        result.views += 1;
        await result.save();
      });

      return results;
    } catch (error) {
      console.error('Knowledge base search error:', error);
      return [];
    }
  }

  /**
   * Analyze user intent
   */
  analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Intent patterns
    const patterns = {
      greeting: /^(مرحبا|السلام|hi|hello)/i,
      help: /help|ساعد|مساعدة/i,
      account: /حساب|account|profile|password/i,
      program: /برنامج|program|session|جلسة/i,
      technical: /خطأ|error|bug|لا يعمل|crash/i,
      report: /تقرير|report|statistics|إحصائيات/i,
    };

    let detectedIntent = 'general';
    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerMessage)) {
        detectedIntent = intent;
        break;
      }
    }

    return {
      type: detectedIntent,
      requiresAgent: ['technical', 'account'].includes(detectedIntent),
    };
  }

  /**
   * Analyze sentiment
   */
  analyzeSentiment(message) {
    const positiveWords = /رائع|ممتاز|شكرا|great|excellent|thanks|happy/i;
    const negativeWords = /سيء|مشكلة|خطأ|bad|problem|error|angry|frustrat/i;

    if (positiveWords.test(message)) return 'positive';
    if (negativeWords.test(message)) return 'negative';
    return 'neutral';
  }

  /**
   * Generate bot response
   */
  generateBotResponse(intent) {
    const responses = {
      greeting: 'مرحبا بك! كيف يمكنني مساعدتك اليوم؟',
      help: 'يمكنني مساعدتك في:\n- الأسئلة حول البرامج\n- مشاكل الحساب\n- الإحصائيات والتقارير',
      account:
        'بخصوص حسابك، يمكنك:\n- تغيير كلمة المرور\n- تحديث بيانات ملفك\n- تغيير إعدادات الخصوصية',
      program: 'حول البرامج والجلسات:\n- عرض البرامج المتاحة\n- جدولة جلسة جديدة\n- متابعة تقدمك',
      report: 'يمكنك الحصول على:\n- تقرير التقدم الشهري\n- إحصائيات الجلسات\n- مقارنة الأداء',
      general: 'كيف يمكنني مساعدتك؟ الرجاء اشرح سؤالك بالتفصيل.',
    };

    return responses[intent.type] || responses.general;
  }

  /**
   * Create support ticket
   */
  async createTicketFromChat(userId, issue) {
    try {
      const ticket = new SupportTicket({
        userId,
        subject: issue.substring(0, 100),
        description: issue,
        category: 'support',
        priority: 'medium',
      });

      await ticket.save();
      return ticket;
    } catch (error) {
      console.error('Ticket creation error:', error);
      return null;
    }
  }

  /**
   * Get FAQ suggestions
   */
  async getFAQSuggestions() {
    try {
      return await KnowledgeBase.find({}).sort({ helpful: -1, views: -1 }).limit(10);
    } catch (error) {
      console.error('FAQ error:', error);
      return [];
    }
  }
}

// Routes
const chatbotService = new ChatbotService();

/**
 * Send chat message
 * POST /api/support/chat
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'الرسالة فارغة' });
    }

    const result = await chatbotService.processMessage(req.user.id, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get chat history
 * GET /api/support/chat/history
 */
router.get('/chat/history', authenticate, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create support ticket
 * POST /api/support/tickets
 */
router.post('/tickets', authenticate, async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;

    const ticket = new SupportTicket({
      userId: req.user.id,
      subject,
      description,
      category: category || 'support',
      priority: priority || 'medium',
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      ticket,
      message: 'تم إنشاء التذكرة بنجاح',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user tickets
 * GET /api/support/tickets
 */
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update ticket
 * PUT /api/support/tickets/:ticketId
 */
router.put('/tickets/:ticketId', authenticate, async (req, res) => {
  try {
    const { status, message } = req.body;
    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'التذكرة غير موجودة' });
    }

    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    if (status) {
      ticket.status = status;
      if (status === 'resolved' || status === 'closed') {
        ticket.resolutionTime = new Date();
      }
    }

    if (message) {
      ticket.messages.push({
        sender: req.user.id,
        message,
        timestamp: new Date(),
      });
    }

    await ticket.save();

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Rate ticket resolution
 * POST /api/support/tickets/:ticketId/rate
 */
router.post('/tickets/:ticketId/rate', authenticate, async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'التذكرة غير موجودة' });
    }

    ticket.rating = rating;
    ticket.feedback = feedback;
    await ticket.save();

    res.json({ success: true, message: 'شكراً لتقييمك' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get knowledge base
 * GET /api/support/kb
 */
router.get('/kb', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const articles = await KnowledgeBase.find(query).sort({ helpful: -1 }).limit(20);

    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get FAQ
 * GET /api/support/faq
 */
router.get('/faq', async (req, res) => {
  try {
    const faqs = await chatbotService.getFAQSuggestions();
    res.json({ success: true, faqs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

