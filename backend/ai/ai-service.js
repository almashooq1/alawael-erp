/**
 * AI/ML Service - خدمة الذكاء الاصطناعي
 * Enterprise AI Integration for Alawael ERP
 */

const axios = require('axios');

/**
 * AI Configuration
 */
const aiConfig = {
  // Provider
  provider: process.env.AI_PROVIDER || 'openai', // openai, azure, anthropic, local
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4000,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
  },
  
  // Azure OpenAI Configuration
  azure: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
    apiVersion: process.env.AZURE_OPENAI_VERSION || '2024-02-01',
  },
  
  // Anthropic Configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 4000,
  },
  
  // Local LLM Configuration (Ollama, LM Studio, etc.)
  local: {
    endpoint: process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:11434',
    model: process.env.LOCAL_LLM_MODEL || 'llama2',
  },
  
  // Cache settings
  cache: {
    enabled: process.env.AI_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.AI_CACHE_TTL) || 3600, // 1 hour
  },
};

/**
 * AI Service Class
 */
class AIService {
  constructor() {
    this.provider = aiConfig.provider;
    this.cache = new Map();
  }
  
  /**
   * Generate text completion
   */
  async complete(prompt, options = {}) {
    const cacheKey = this.getCacheKey('complete', prompt, options);
    
    // Check cache
    if (aiConfig.cache.enabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    let result;
    
    switch (this.provider) {
      case 'openai':
        result = await this.openaiComplete(prompt, options);
        break;
      case 'azure':
        result = await this.azureComplete(prompt, options);
        break;
      case 'anthropic':
        result = await this.anthropicComplete(prompt, options);
        break;
      case 'local':
        result = await this.localComplete(prompt, options);
        break;
      default:
        throw new Error(`Unknown AI provider: ${this.provider}`);
    }
    
    // Cache result
    if (aiConfig.cache.enabled) {
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), aiConfig.cache.ttl * 1000);
    }
    
    return result;
  }
  
  /**
   * OpenAI completion
   */
  async openaiComplete(prompt, options = {}) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: options.model || aiConfig.openai.model,
        messages: [
          { role: 'system', content: options.system || 'أنت مساعد ذكي لنظام ERP عربي.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: options.maxTokens || aiConfig.openai.maxTokens,
        temperature: options.temperature ?? aiConfig.openai.temperature,
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return {
      text: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model,
    };
  }
  
  /**
   * Azure OpenAI completion
   */
  async azureComplete(prompt, options = {}) {
    const response = await axios.post(
      `${aiConfig.azure.endpoint}/openai/deployments/${aiConfig.azure.deploymentName}/chat/completions?api-version=${aiConfig.azure.apiVersion}`,
      {
        messages: [
          { role: 'system', content: options.system || 'أنت مساعد ذكي لنظام ERP عربي.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: options.maxTokens || 4000,
      },
      {
        headers: {
          'api-key': aiConfig.azure.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return {
      text: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: aiConfig.azure.deploymentName,
    };
  }
  
  /**
   * Anthropic completion
   */
  async anthropicComplete(prompt, options = {}) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: aiConfig.anthropic.model,
        max_tokens: options.maxTokens || aiConfig.anthropic.maxTokens,
        system: options.system || 'أنت مساعد ذكي لنظام ERP عربي.',
        messages: [
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          'x-api-key': aiConfig.anthropic.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );
    
    return {
      text: response.data.content[0].text,
      usage: response.data.usage,
      model: response.data.model,
    };
  }
  
  /**
   * Local LLM completion (Ollama)
   */
  async localComplete(prompt, options = {}) {
    const response = await axios.post(
      `${aiConfig.local.endpoint}/api/generate`,
      {
        model: aiConfig.local.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens || 2000,
        },
      }
    );
    
    return {
      text: response.data.response,
      usage: { total_tokens: response.data.eval_count || 0 },
      model: aiConfig.local.model,
    };
  }
  
  /**
   * Generate embeddings
   */
  async embed(text) {
    if (this.provider === 'openai') {
      return this.openaiEmbed(text);
    }
    throw new Error('Embeddings not supported for this provider');
  }
  
  /**
   * OpenAI embeddings
   */
  async openaiEmbed(text) {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: aiConfig.openai.embeddingModel,
        input: text,
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return {
      embedding: response.data.data[0].embedding,
      usage: response.data.usage,
    };
  }
  
  /**
   * Analyze sentiment
   */
  async analyzeSentiment(text) {
    const prompt = `حلل المشاعر في النص التالي وأرجع النتيجة كـ JSON:
    
النص: "${text}"

أرجع JSON بهذا التنسيق:
{
  "sentiment": "positive|negative|neutral",
  "score": 0-1,
  "emotions": ["emotion1", "emotion2"],
  "summary": "ملخص قصير"
}`;

    const result = await this.complete(prompt, { temperature: 0.3 });
    
    try {
      return JSON.parse(result.text);
    } catch {
      return { sentiment: 'neutral', score: 0.5, emotions: [], summary: '' };
    }
  }
  
  /**
   * Extract entities
   */
  async extractEntities(text) {
    const prompt = `استخرج الكيانات من النص التالي وأرجعها كـ JSON:

النص: "${text}"

أرجع JSON بهذا التنسيق:
{
  "people": [],
  "organizations": [],
  "locations": [],
  "dates": [],
  "amounts": [],
  "products": []
}`;

    const result = await this.complete(prompt, { temperature: 0.1 });
    
    try {
      return JSON.parse(result.text);
    } catch {
      return { people: [], organizations: [], locations: [], dates: [], amounts: [], products: [] };
    }
  }
  
  /**
   * Summarize text
   */
  async summarize(text, options = {}) {
    const { maxLength = 200, style = 'concise' } = options;
    
    const prompt = `لخص النص التالي بأسلوب ${style === 'concise' ? 'موجز' : 'مفصل'} (الحد الأقصى ${maxLength} كلمة):

"${text}"`;

    const result = await this.complete(prompt, { temperature: 0.5 });
    return result.text;
  }
  
  /**
   * Translate text
   */
  async translate(text, targetLang = 'en') {
    const langMap = { en: 'الإنجليزية', ar: 'العربية', fr: 'الفرنسية' };
    
    const prompt = `ترجم النص التالي إلى اللغة ${langMap[targetLang] || targetLang}:

"${text}"

أرجع الترجمة فقط بدون شرح إضافي.`;

    const result = await this.complete(prompt, { temperature: 0.3 });
    return result.text;
  }
  
  /**
   * Generate report insights
   */
  async generateInsights(data, type = 'sales') {
    const prompt = `بناءً على البيانات التالية من نوع "${type}"، قدم رؤى وتوصيات قابلة للتنفيذ:

${JSON.stringify(data, null, 2)}

قدم:
1. ملخص الوضع الحالي
2. الاتجاهات الملاحظة
3. نقاط القوة
4. نقاط الضعف
5. توصيات محددة للتحسين`;

    const result = await this.complete(prompt, { temperature: 0.7, maxTokens: 2000 });
    return result.text;
  }
  
  /**
   * Smart search (semantic)
   */
  async smartSearch(query, documents) {
    // Get query embedding
    const queryEmbedding = await this.embed(query);
    
    // Calculate similarity scores
    const results = documents.map(doc => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding.embedding, doc.embedding || []),
    }));
    
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    
    return results;
  }
  
  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Generate cache key
   */
  getCacheKey(operation, input, options) {
    const crypto = require('crypto');
    const data = `${operation}:${JSON.stringify(input)}:${JSON.stringify(options)}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
const aiService = new AIService();

/**
 * AI-Powered Helper Functions
 */

// Smart inventory prediction
const predictInventoryNeeds = async (historicalData) => {
  const prompt = `بناءً على بيانات المخزون التاريخية، توقع الاحتياجات للشهر القادم:

${JSON.stringify(historicalData)}

أرجع JSON بهذا التنسيق:
{
  "predictions": [
    { "productId": "", "productName": "", "currentStock": 0, "predictedNeed": 0, "reorderPoint": 0 }
  ],
  "confidence": 0-1,
  "factors": ["factor1", "factor2"]
}`;

  const result = await aiService.complete(prompt, { temperature: 0.4 });
  return JSON.parse(result.text);
};

// Customer behavior analysis
const analyzeCustomerBehavior = async (customerData) => {
  const prompt = `حلل سلوك العملاء بناءً على البيانات التالية:

${JSON.stringify(customerData)}

قدم تحليلاً يشمل:
1. أنماط الشراء
2. تفضيلات العملاء
3. احتمالية التكرار
4. توصيات لتحسين التجربة`;

  const result = await aiService.complete(prompt, { temperature: 0.6 });
  return result.text;
};

// Generate email response
const generateEmailResponse = async (email, context = '') => {
  const prompt = `أنت مساعد خدمة عملاء. قم بصياغة رد احترافي على البريد الإلكتروني التالي:

البريد المستلم:
"${email}"

${context ? `السياق: ${context}` : ''}

اكتب رداً مهذباً ومفيداً باللغة العربية.`;

  const result = await aiService.complete(prompt, { temperature: 0.7 });
  return result.text;
};

module.exports = {
  AIService,
  aiService,
  aiConfig,
  predictInventoryNeeds,
  analyzeCustomerBehavior,
  generateEmailResponse,
};