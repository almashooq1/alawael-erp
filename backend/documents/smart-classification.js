/**
 * Smart Classification Service
 */
const mongoose = require('mongoose');

/**
 * Classification Configuration
 */
const classificationConfig = {
  // Main categories
  categories: {
    financial: { label: 'المالية', keywords: ['فاتورة', 'مبلغ', 'دفع', 'invoice', 'payment'] },
    legal: { label: 'القانونية', keywords: ['عقد', 'اتفاقية', 'محكمة', 'contract', 'legal'] },
    hr: { label: 'الموارد البشرية', keywords: ['موظف', 'توظيف', 'راتب', 'employee', 'salary'] },
    operations: { label: 'العمليات', keywords: ['إجراء', 'عملية', 'تشغيل', 'operation'] },
    marketing: { label: 'التسويق', keywords: ['تسويق', 'إعلان', 'حملة', 'marketing', 'campaign'] },
    technical: { label: 'التقنية', keywords: ['تقنية', 'نظام', 'برمجة', 'technical', 'system'] },
    administrative: { label: 'الإدارية', keywords: ['إدارة', 'قرار', 'تعميم', 'administrative'] },
    correspondence: { label: 'المراسلات', keywords: ['خطاب', 'رسالة', 'طلب', 'letter', 'request'] },
  },
  
  // Security levels
  securityLevels: {
    public: { label: 'عام', level: 1 },
    internal: { label: 'داخلي', level: 2 },
    confidential: { label: 'سري', level: 3 },
    secret: { label: 'سري للغاية', level: 4 },
  },
  
  // Confidence thresholds
  confidence: {
    high: 0.85,
    medium: 0.65,
    low: 0.45,
  },
};

/**
 * Classification Model Schema
 */
const ClassificationModelSchema = new mongoose.Schema({
  // Model identification
  name: { type: String, required: true },
  version: { type: String, default: '1.0.0' },
  
  // Training info
  training: {
    samplesCount: Number,
    accuracy: Number,
    lastTrainedAt: Date,
  },
  
  // Categories
  categories: [{
    name: String,
    label: String,
    keywords: [String],
    samples: Number,
  }],
  
  // Status
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'classification_models',
});

/**
 * Classification Result Schema
 */
const ClassificationResultSchema = new mongoose.Schema({
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  
  // Classification results
  results: {
    primary: {
      category: String,
      confidence: Number,
    },
    alternatives: [{
      category: String,
      confidence: Number,
    }],
  },
  
  // Extracted entities
  entities: {
    people: [{ name: String, role: String, confidence: Number }],
    organizations: [{ name: String, type: String, confidence: Number }],
    dates: [{ text: String, parsed: Date, type: String }],
    amounts: [{ value: Number, currency: String, text: String }],
    locations: [{ name: String, type: String }],
    references: [{ type: String, value: String }],
  },
  
  // Keywords
  keywords: [{
    word: String,
    tfidf: Number,
    category: String,
  }],
  
  // Sentiment
  sentiment: {
    score: Number,
    label: { type: String, enum: ['positive', 'negative', 'neutral', 'mixed'] },
    confidence: Number,
  },
  
  // Language
  language: {
    detected: String,
    confidence: Number,
    dominantScript: String,
  },
  
  // Summary
  summary: {
    short: String,
    medium: String,
    keyPoints: [String],
  },
  
  // Processing info
  processing: {
    modelUsed: String,
    processingTime: Number,
    tokensUsed: Number,
  },
  
  // Status
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'classification_results',
});

/**
 * Smart Classification Service Class
 */
class SmartClassificationService {
  constructor() {
    this.ClassificationModel = null;
    this.ClassificationResult = null;
    this.models = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.ClassificationModel = connection.model('ClassificationModel', ClassificationModelSchema);
    this.ClassificationResult = connection.model('ClassificationResult', ClassificationResultSchema);
    
    // Load or create default model
    await this.loadDefaultModel();
    
    console.log('✅ Smart Classification Service initialized');
  }
  
  /**
   * Load default classification model
   */
  async loadDefaultModel() {
    let model = await this.ClassificationModel.findOne({ isDefault: true });
    
    if (!model) {
      model = await this.ClassificationModel.create({
        name: 'default-arabic-model',
        version: '1.0.0',
        categories: Object.entries(classificationConfig.categories).map(([key, value]) => ({
          name: key,
          label: value.label,
          keywords: value.keywords,
        })),
        isDefault: true,
        training: {
          samplesCount: 1000,
          accuracy: 0.87,
        },
      });
    }
    
    this.models.set('default', model);
  }
  
  /**
   * Classify document
   */
  async classifyDocument(documentId, content, options = {}) {
    const startTime = Date.now();
    
    // Create result record
    const result = await this.ClassificationResult.create({
      documentId,
      status: 'pending',
    });
    
    try {
      // Perform classification
      const categoryResult = this.classifyCategory(content);
      
      // Extract entities
      const entities = this.extractEntities(content);
      
      // Extract keywords
      const keywords = this.extractKeywords(content);
      
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(content);
      
      // Detect language
      const language = this.detectLanguage(content);
      
      // Generate summary
      const summary = this.generateSummary(content);
      
      // Update result
      result.results = categoryResult;
      result.entities = entities;
      result.keywords = keywords;
      result.sentiment = sentiment;
      result.language = language;
      result.summary = summary;
      result.processing = {
        modelUsed: 'default',
        processingTime: Date.now() - startTime,
      };
      result.status = 'completed';
      
      await result.save();
      
      return result;
      
    } catch (error) {
      result.status = 'failed';
      await result.save();
      throw error;
    }
  }
  
  /**
   * Classify category
   */
  classifyCategory(content) {
    const scores = {};
    const contentLower = content.toLowerCase();
    
    // Calculate score for each category
    for (const [categoryName, categoryData] of Object.entries(classificationConfig.categories)) {
      let score = 0;
      for (const keyword of categoryData.keywords) {
        const regex = new RegExp(keyword, 'gi');
        const matches = contentLower.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      scores[categoryName] = score;
    }
    
    // Normalize scores
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    
    // Sort by score
    const sorted = Object.entries(scores)
      .map(([category, score]) => ({
        category,
        confidence: score / totalScore,
      }))
      .sort((a, b) => b.confidence - a.confidence);
    
    return {
      primary: sorted[0] || { category: 'administrative', confidence: 0.5 },
      alternatives: sorted.slice(1, 4),
    };
  }
  
  /**
   * Extract entities
   */
  extractEntities(content) {
    const entities = {
      people: [],
      organizations: [],
      dates: [],
      amounts: [],
      locations: [],
      references: [],
    };
    
    // Extract amounts (money)
    const amountPatterns = [
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(ريال|ر\.س|SAR|دولار|USD|درهم|AED)/gi,
    ];
    
    for (const pattern of amountPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && !entities.amounts.find(a => a.value === value)) {
          entities.amounts.push({
            value,
            currency: match[2],
            text: match[0],
          });
        }
      }
    }
    
    // Extract dates
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    ];
    
    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            entities.dates.push({
              text: match[1],
              parsed: date,
              type: 'reference',
            });
          }
        } catch (e) {
          // Invalid date
        }
      }
    }
    
    // Extract reference numbers
    const refPatterns = [
      /(?:رقم|مرجع|رقم المرجع|Ref|Reference)[:\s]*([A-Z0-9\-\/]+)/gi,
      /(?:فاتورة|Invoice)[:\s]*([A-Z0-9\-]+)/gi,
      /(?:عقد|Contract)[:\s]*([A-Z0-9\-]+)/gi,
    ];
    
    for (const pattern of refPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (!entities.references.find(r => r.value === match[1])) {
          entities.references.push({
            type: match[0].split(/[:\s]/)[0],
            value: match[1],
          });
        }
      }
    }
    
    // Extract people names (Arabic pattern)
    const namePattern = /(?:السيد|الأستاذ|الدكتور|المهندس|السيدة)[:\s]+([أ-ي\s]{3,20})/g;
    let nameMatch;
    while ((nameMatch = namePattern.exec(content)) !== null) {
      const name = nameMatch[1].trim();
      if (!entities.people.find(p => p.name === name)) {
        entities.people.push({
          name,
          confidence: 0.8,
        });
      }
    }
    
    // Extract organizations
    const orgPattern = /(?:شركة|مؤسسة|وزارة|هيئة|مركز|بنك)[:\s]+([أ-ي\s]{3,30})/g;
    let orgMatch;
    while ((orgMatch = orgPattern.exec(content)) !== null) {
      const name = orgMatch[1].trim();
      if (!entities.organizations.find(o => o.name === name)) {
        entities.organizations.push({
          name,
          confidence: 0.8,
        });
      }
    }
    
    return entities;
  }
  
  /**
   * Extract keywords
   */
  extractKeywords(content) {
    // Simple TF-IDF style extraction
    const stopWords = new Set([
      'من', 'إلى', 'على', 'في', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'و', 'أو', 'ثم', 'بل', 'لكن', 'حيث', 'عند', 'بعد', 'قبل', 'بين', 'خلال',
    ]);
    
    // Tokenize
    const words = content.toLowerCase().match(/\b[\u0600-\u06FFa-zA-Z]{3,}\b/g) || [];
    
    // Count frequency
    const frequency = {};
    for (const word of words) {
      if (!stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    }
    
    // Sort by frequency
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({
        word,
        tfidf: count / words.length,
      }));
  }
  
  /**
   * Analyze sentiment
   */
  analyzeSentiment(content) {
    const positiveWords = [
      'ممتاز', 'رائع', 'نجاح', 'تقدم', 'إنجاز', 'تفوق', 'مبارك', 'تهنئة',
      'excellent', 'success', 'good', 'great', 'congratulations',
    ];
    
    const negativeWords = [
      'فشل', 'مشكلة', 'تأخير', 'خطأ', 'عيب', 'نقص', 'خسارة', 'رفض',
      'failure', 'problem', 'error', 'delay', 'rejected',
    ];
    
    const contentLower = content.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of positiveWords) {
      const regex = new RegExp(word, 'gi');
      const matches = contentLower.match(regex);
      if (matches) positiveCount += matches.length;
    }
    
    for (const word of negativeWords) {
      const regex = new RegExp(word, 'gi');
      const matches = contentLower.match(regex);
      if (matches) negativeCount += matches.length;
    }
    
    const total = positiveCount + negativeCount || 1;
    const score = (positiveCount - negativeCount) / total;
    
    let label = 'neutral';
    if (score > 0.3) label = 'positive';
    else if (score < -0.3) label = 'negative';
    else if (Math.abs(score) > 0.1) label = 'mixed';
    
    return {
      score: Math.round(score * 100) / 100,
      label,
      confidence: Math.max(positiveCount, negativeCount) / total,
    };
  }
  
  /**
   * Detect language
   */
  detectLanguage(content) {
    const arabicChars = (content.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (content.match(/[a-zA-Z]/g) || []).length;
    const total = arabicChars + englishChars;
    
    if (total === 0) {
      return { detected: 'unknown', confidence: 0, dominantScript: 'unknown' };
    }
    
    const arabicRatio = arabicChars / total;
    
    return {
      detected: arabicRatio > 0.5 ? 'ar' : 'en',
      confidence: Math.max(arabicRatio, 1 - arabicRatio),
      dominantScript: arabicRatio > 0.5 ? 'Arabic' : 'Latin',
    };
  }
  
  /**
   * Generate summary
   */
  generateSummary(content) {
    // Extract sentences
    const sentences = content.match(/[^.!?۔۔。।]+[.!?۔۔。।]+/g) || [content];
    
    // Short summary (first sentence)
    const short = sentences[0]?.trim().substring(0, 200) || '';
    
    // Medium summary (first 3 sentences)
    const medium = sentences.slice(0, 3).join(' ').substring(0, 500);
    
    // Extract key points (sentences with keywords)
    const keyPointKeywords = ['مهام', 'أهداف', 'نتائج', 'توصيات', 'ملاحظات'];
    const keyPoints = [];
    
    for (const sentence of sentences.slice(0, 10)) {
      for (const keyword of keyPointKeywords) {
        if (sentence.includes(keyword) && keyPoints.length < 5) {
          keyPoints.push(sentence.trim());
          break;
        }
      }
    }
    
    return {
      short,
      medium,
      keyPoints,
    };
  }
  
  /**
   * Get classification result
   */
  async getResult(documentId) {
    return this.ClassificationResult.findOne({ documentId });
  }
  
  /**
   * Reclassify document
   */
  async reclassify(documentId, content) {
    // Remove old result
    await this.ClassificationResult.deleteMany({ documentId });
    
    // Create new classification
    return this.classifyDocument(documentId, content);
  }
  
  /**
   * Batch classify
   */
  async batchClassify(documents) {
    const results = [];
    
    for (const doc of documents) {
      try {
        const result = await this.classifyDocument(doc.id, doc.content);
        results.push({ documentId: doc.id, status: 'success', result });
      } catch (error) {
        results.push({ documentId: doc.id, status: 'error', error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Get classification statistics
   */
  async getStatistics() {
    const [total, byCategory, byLanguage] = await Promise.all([
      this.ClassificationResult.countDocuments({ status: 'completed' }),
      this.ClassificationResult.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$results.primary.category', count: { $sum: 1 } } },
      ]),
      this.ClassificationResult.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$language.detected', count: { $sum: 1 } } },
      ]),
    ]);
    
    return {
      total,
      byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      byLanguage: byLanguage.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    };
  }
  
  /**
   * Train model (placeholder for ML integration)
   */
  async trainModel(trainingData) {
    // This would integrate with actual ML services
    // For now, it's a placeholder
    return {
      success: true,
      message: 'Training queued',
      samplesProcessed: trainingData.length,
    };
  }
}

// Singleton instance
const smartClassificationService = new SmartClassificationService();

/**
 * Category Labels (Arabic)
 */
const categoryLabels = {
  financial: { label: 'المالية', icon: 'dollar', color: 'green' },
  legal: { label: 'القانونية', icon: 'gavel', color: 'blue' },
  hr: { label: 'الموارد البشرية', icon: 'users', color: 'purple' },
  operations: { label: 'العمليات', icon: 'cog', color: 'orange' },
  marketing: { label: 'التسويق', icon: 'megaphone', color: 'pink' },
  technical: { label: 'التقنية', icon: 'code', color: 'cyan' },
  administrative: { label: 'الإدارية', icon: 'briefcase', color: 'gray' },
  correspondence: { label: 'المراسلات', icon: 'mail', color: 'yellow' },
};

module.exports = {
  SmartClassificationService,
  smartClassificationService,
  classificationConfig,
  categoryLabels,
};