/**
 * Smart Indexing Service - خدمة الفهرسة الذكية
 * AI-Powered Document Indexing & Classification
 */

const mongoose = require('mongoose');

/**
 * Smart Indexing Configuration
 */
const smartIndexingConfig = {
  // AI Provider
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    model: process.env.AI_MODEL || 'gpt-4',
  },
  
  // Indexing settings
  indexing: {
    batchSize: 10,
    maxTokens: 4000,
    embeddingModel: 'text-embedding-3-small',
  },
  
  // Classification
  classification: {
    confidence: 0.75,
    autoClassify: true,
  },
  
  // Entity extraction
  entities: {
    people: true,
    organizations: true,
    dates: true,
    amounts: true,
    locations: true,
    references: true,
  },
};

/**
 * Document Index Schema
 */
const DocumentIndexSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  
  // Embeddings (vector representation)
  embeddings: {
    vector: [Number],
    model: String,
    generatedAt: Date,
  },
  
  // AI-generated summary
  summary: {
    short: String, // 1-2 sentences
    medium: String, // 1 paragraph
    long: String, // Multiple paragraphs
  },
  
  // Keywords & Topics
  keywords: [{
    word: String,
    score: Number,
    type: { type: String, enum: ['topic', 'entity', 'concept', 'term'] },
  }],
  
  // Entities
  entities: {
    people: [{
      name: String,
      role: String,
      mentions: [Number], // Page numbers or positions
    }],
    organizations: [{
      name: String,
      type: String,
      mentions: [Number],
    }],
    dates: [{
      value: Date,
      text: String,
      type: { type: String, enum: ['document_date', 'due_date', 'event_date', 'reference_date'] },
    }],
    amounts: [{
      value: Number,
      currency: String,
      text: String,
      context: String,
    }],
    locations: [{
      name: String,
      type: String,
      mentions: [Number],
    }],
    references: [{
      type: String, // invoice_number, contract_id, etc.
      value: String,
      context: String,
    }],
  },
  
  // Classification
  classification: {
    predicted: { type: String }, // AI predicted category
    confidence: Number,
    alternatives: [{
      category: String,
      confidence: Number,
    }],
    manual: { type: String }, // Manual override
    subcategories: [String],
    tags: [String],
  },
  
  // Sentiment
  sentiment: {
    overall: { type: String, enum: ['positive', 'negative', 'neutral', 'mixed'] },
    score: Number, // -1 to 1
    aspects: [{
      aspect: String,
      sentiment: String,
      score: Number,
    }],
  },
  
  // Language
  language: {
    detected: String,
    confidence: Number,
    dominant: String,
    mixed: Boolean,
  },
  
  // Topics
  topics: [{
    name: String,
    relevance: Number,
    keywords: [String],
  }],
  
  // Relations
  relatedDocuments: [{
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    relationship: String,
    confidence: Number,
  }],
  
  // Processing status
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  processedAt: Date,
  error: String,
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'document_indexes',
});

// Indexes
DocumentIndexSchema.index({ documentId: 1 });
DocumentIndexSchema.index({ 'classification.predicted': 1 });
DocumentIndexSchema.index({ 'keywords.word': 'text' });

/**
 * Smart Indexing Service Class
 */
class SmartIndexingService {
  constructor() {
    this.DocumentIndex = null;
    this.aiProvider = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.DocumentIndex = connection.model('DocumentIndex', DocumentIndexSchema);
    console.log('✅ Smart Indexing Service initialized');
  }
  
  /**
   * Index document
   */
  async indexDocument(documentId, content, metadata = {}) {
    // Create index record
    let index = await this.DocumentIndex.findOne({ documentId });
    
    if (!index) {
      index = await this.DocumentIndex.create({
        documentId,
        status: 'pending',
        tenantId: metadata.tenantId,
      });
    }
    
    // Process in background
    this.processDocument(index, content, metadata).catch(console.error);
    
    return index;
  }
  
  /**
   * Process document
   */
  async processDocument(index, content, metadata) {
    try {
      index.status = 'processing';
      await index.save();
      
      // Run all analysis in parallel
      const [
        classification,
        entities,
        keywords,
        summary,
        sentiment,
        language,
      ] = await Promise.all([
        this.classifyDocument(content),
        this.extractEntities(content),
        this.extractKeywords(content),
        this.generateSummary(content),
        this.analyzeSentiment(content),
        this.detectLanguage(content),
      ]);
      
      // Update index
      index.classification = classification;
      index.entities = entities;
      index.keywords = keywords;
      index.summary = summary;
      index.sentiment = sentiment;
      index.language = language;
      index.status = 'completed';
      index.processedAt = new Date();
      
      await index.save();
      
      // Find related documents
      await this.findRelatedDocuments(index);
      
      return index;
      
    } catch (error) {
      index.status = 'failed';
      index.error = error.message;
      await index.save();
      throw error;
    }
  }
  
  /**
   * Classify document
   */
  async classifyDocument(content) {
    const categories = [
      'financial', 'legal', 'hr', 'contracts', 'correspondence',
      'technical', 'marketing', 'operations', 'reports', 'other'
    ];
    
    // Use AI to classify
    // This is a simplified version
    const categoryScores = {};
    const contentLower = content.toLowerCase();
    
    // Simple keyword-based classification (would be replaced with AI)
    const categoryKeywords = {
      financial: ['فاتورة', 'دفع', 'مبلغ', 'invoice', 'payment', 'amount'],
      legal: ['عقد', 'قانون', 'محكمة', 'contract', 'legal', 'court'],
      hr: ['موظف', 'توظيف', 'راتب', 'employee', 'hiring', 'salary'],
      contracts: ['عقد', 'اتفاقية', 'contract', 'agreement'],
      correspondence: ['خطاب', 'رسالة', 'letter', 'email'],
      technical: ['تقرير فني', 'مواصفات', 'technical', 'specification'],
    };
    
    let maxScore = 0;
    let predicted = 'other';
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const score = keywords.filter(kw => contentLower.includes(kw)).length;
      categoryScores[category] = score;
      if (score > maxScore) {
        maxScore = score;
        predicted = category;
      }
    }
    
    const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0) || 1;
    const confidence = maxScore / totalScore;
    
    return {
      predicted,
      confidence: Math.min(confidence, 0.95),
      alternatives: Object.entries(categoryScores)
        .filter(([cat]) => cat !== predicted)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, score]) => ({
          category,
          confidence: score / totalScore,
        })),
    };
  }
  
  /**
   * Extract entities
   */
  async extractEntities(content) {
    const entities = {
      people: [],
      organizations: [],
      dates: [],
      amounts: [],
      locations: [],
      references: [],
    };
    
    // Extract amounts (currency patterns)
    const amountPatterns = [
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(ريال|ر\.س|SAR|دولار|USD)/gi,
      /SAR\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    ];
    
    for (const pattern of amountPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!entities.amounts.find(a => a.value === value)) {
          entities.amounts.push({
            value,
            currency: match[2] || 'SAR',
            text: match[0],
            context: this.getContext(content, match.index, 50),
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
              value: date,
              text: match[1],
              type: 'reference_date',
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
        entities.references.push({
          type: match[0].split(/[:\s]/)[0],
          value: match[1],
          context: match[0],
        });
      }
    }
    
    return entities;
  }
  
  /**
   * Get context around a position
   */
  getContext(content, position, length) {
    const start = Math.max(0, position - length);
    const end = Math.min(content.length, position + length);
    return content.substring(start, end);
  }
  
  /**
   * Extract keywords
   */
  async extractKeywords(content) {
    // Simple TF-IDF style extraction
    const words = content.toLowerCase().match(/\b[\u0600-\u06FFa-zA-Z]{3,}\b/g) || [];
    const stopWords = new Set([
      'من', 'إلى', 'على', 'في', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    ]);
    
    const frequency = {};
    for (const word of words) {
      if (!stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    }
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({
        word,
        score: count / words.length,
        type: 'term',
      }));
  }
  
  /**
   * Generate summary
   */
  async generateSummary(content) {
    // Extract first 200 characters for short summary
    const sentences = content.match(/[^.!?。।۔]+[.!?。।۔]+/g) || [content];
    
    return {
      short: sentences[0]?.substring(0, 200) || '',
      medium: sentences.slice(0, 3).join(' ').substring(0, 500),
      long: content.substring(0, 2000),
    };
  }
  
  /**
   * Analyze sentiment
   */
  async analyzeSentiment(content) {
    const positiveWords = ['ممتاز', 'رائع', 'نجاح', 'تقدم', 'excellent', 'success', 'good'];
    const negativeWords = ['فشل', 'مشكلة', 'تأخير', 'failure', 'problem', 'delay', 'bad'];
    
    const contentLower = content.toLowerCase();
    const positive = positiveWords.filter(w => contentLower.includes(w)).length;
    const negative = negativeWords.filter(w => contentLower.includes(w)).length;
    
    const score = (positive - negative) / Math.max(positive + negative, 1);
    
    let overall = 'neutral';
    if (score > 0.3) overall = 'positive';
    else if (score < -0.3) overall = 'negative';
    else if (Math.abs(score) > 0.1) overall = 'mixed';
    
    return {
      overall,
      score,
    };
  }
  
  /**
   * Detect language
   */
  async detectLanguage(content) {
    const arabicChars = (content.match(/[\u0600-\u06FF]/g) || []).length;
    const englishChars = (content.match(/[a-zA-Z]/g) || []).length;
    const total = arabicChars + englishChars;
    
    if (total === 0) {
      return { detected: 'unknown', confidence: 0, dominant: 'unknown', mixed: false };
    }
    
    const arabicRatio = arabicChars / total;
    const englishRatio = englishChars / total;
    
    return {
      detected: arabicRatio > 0.5 ? 'ar' : 'en',
      confidence: Math.max(arabicRatio, englishRatio),
      dominant: arabicRatio > englishRatio ? 'ar' : 'en',
      mixed: arabicRatio > 0.2 && englishRatio > 0.2,
    };
  }
  
  /**
   * Find related documents
   */
  async findRelatedDocuments(index) {
    // Find documents with similar keywords
    const keywords = index.keywords.slice(0, 10).map(k => k.word);
    
    const related = await this.DocumentIndex.find({
      _id: { $ne: index._id },
      'keywords.word': { $in: keywords },
    }).limit(10);
    
    index.relatedDocuments = related.map(r => ({
      documentId: r.documentId,
      relationship: 'similar_content',
      confidence: 0.5, // Would calculate actual similarity
    }));
    
    await index.save();
  }
  
  /**
   * Search with semantic understanding
   */
  async semanticSearch(query, options = {}) {
    // Extract keywords from query
    const queryKeywords = query.toLowerCase().match(/\b[\u0600-\u06FFa-zA-Z]{3,}\b/g) || [];
    
    // Find documents with matching keywords
    const results = await this.DocumentIndex.find({
      $or: [
        { 'keywords.word': { $in: queryKeywords } },
        { $text: { $search: query } },
        { 'classification.predicted': options.category },
      ],
    })
      .sort({ 'keywords.score': -1 })
      .limit(options.limit || 20);
    
    return results.map(r => ({
      documentId: r.documentId,
      score: this.calculateRelevanceScore(queryKeywords, r.keywords),
      classification: r.classification,
      summary: r.summary.short,
    }));
  }
  
  /**
   * Calculate relevance score
   */
  calculateRelevanceScore(queryKeywords, documentKeywords) {
    const docWords = new Set(documentKeywords.map(k => k.word));
    const matches = queryKeywords.filter(k => docWords.has(k)).length;
    return matches / Math.max(queryKeywords.length, 1);
  }
  
  /**
   * Get document index
   */
  async getDocumentIndex(documentId) {
    return this.DocumentIndex.findOne({ documentId });
  }
  
  /**
   * Batch index documents
   */
  async batchIndex(documents) {
    const results = [];
    
    for (const doc of documents) {
      try {
        const index = await this.indexDocument(doc.id, doc.content, doc.metadata);
        results.push({ documentId: doc.id, status: 'queued', indexId: index._id });
      } catch (error) {
        results.push({ documentId: doc.id, status: 'error', error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Get statistics
   */
  async getStatistics() {
    const [total, completed, pending, failed] = await Promise.all([
      this.DocumentIndex.countDocuments(),
      this.DocumentIndex.countDocuments({ status: 'completed' }),
      this.DocumentIndex.countDocuments({ status: 'pending' }),
      this.DocumentIndex.countDocuments({ status: 'failed' }),
    ]);
    
    const byCategory = await this.DocumentIndex.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$classification.predicted', count: { $sum: 1 } } },
    ]);
    
    return {
      total,
      completed,
      pending,
      failed,
      byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    };
  }
}

// Singleton instance
const smartIndexingService = new SmartIndexingService();

module.exports = {
  SmartIndexingService,
  smartIndexingService,
  smartIndexingConfig,
};