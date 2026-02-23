/**
 * Search Service - خدمة البحث المتقدم
 * Enterprise Search for Alawael ERP
 */

const mongoose = require('mongoose');

/**
 * Search Configuration
 */
const searchConfig = {
  // Provider
  provider: process.env.SEARCH_PROVIDER || 'elasticsearch', // elasticsearch, mongodb, algolia
  
  // Elasticsearch Configuration
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USER,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
    indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'alawael',
  },
  
  // Algolia Configuration
  algolia: {
    appId: process.env.ALGOLIA_APP_ID,
    apiKey: process.env.ALGOLIA_API_KEY,
    indexPrefix: process.env.ALGOLIA_INDEX_PREFIX || 'alawael',
  },
  
  // Search settings
  defaults: {
    pageSize: 20,
    maxPageSize: 100,
    minQueryLength: 2,
    fuzzyThreshold: 0.6,
  },
  
  // Indexable collections
  collections: {
    employees: {
      fields: ['name', 'email', 'department', 'position', 'employeeId'],
      weights: { name: 10, employeeId: 8, email: 5, department: 3, position: 2 },
    },
    customers: {
      fields: ['name', 'email', 'phone', 'company', 'customerId'],
      weights: { name: 10, customerId: 8, company: 5, email: 3, phone: 2 },
    },
    products: {
      fields: ['name', 'sku', 'description', 'category', 'barcode'],
      weights: { name: 10, sku: 8, barcode: 8, category: 3, description: 1 },
    },
    invoices: {
      fields: ['invoiceNumber', 'customerName', 'status', 'reference'],
      weights: { invoiceNumber: 10, reference: 8, customerName: 5, status: 2 },
    },
    documents: {
      fields: ['title', 'content', 'tags', 'category'],
      weights: { title: 10, tags: 5, category: 3, content: 1 },
    },
  },
};

/**
 * Search Index Schema
 */
const SearchIndexSchema = new mongoose.Schema({
  // Document reference
  collection: { type: String, required: true, index: true },
  documentId: { type: String, required: true, index: true },
  
  // Search content
  content: { type: String, required: true },
  keywords: [String],
  
  // Metadata
  tenantId: { type: String, index: true },
  metadata: mongoose.Schema.Types.Mixed,
  
  // Boost score
  boost: { type: Number, default: 1 },
  
  // Timestamps
  indexedAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'search_index',
});

// Text index for search
SearchIndexSchema.index({ content: 'text', keywords: 'text' });
SearchIndexSchema.index({ collection: 1, tenantId: 1 });

/**
 * Search Service Class
 */
class SearchService {
  constructor() {
    this.client = null;
    this.SearchIndex = null;
    this.provider = searchConfig.provider;
  }
  
  /**
   * Initialize search service
   */
  async initialize(connection) {
    // Initialize Search Index model
    this.SearchIndex = connection.model('SearchIndex', SearchIndexSchema);
    
    // Initialize provider
    switch (this.provider) {
      case 'elasticsearch':
        await this.initElasticsearch();
        break;
      case 'algolia':
        await this.initAlgolia();
        break;
      default:
        console.log('✅ Search service initialized (MongoDB)');
        return;
    }
    
    console.log(`✅ Search service initialized (${this.provider})`);
  }
  
  /**
   * Initialize Elasticsearch client
   */
  async initElasticsearch() {
    const { Client } = require('@elastic/elasticsearch');
    
    this.client = new Client({
      node: searchConfig.elasticsearch.node,
      auth: searchConfig.elasticsearch.auth,
    });
    
    // Test connection
    try {
      await this.client.ping();
    } catch (error) {
      console.error('Elasticsearch connection failed:', error.message);
    }
  }
  
  /**
   * Initialize Algolia client
   */
  async initAlgolia() {
    const algoliasearch = require('algoliasearch');
    
    this.client = algoliasearch(
      searchConfig.algolia.appId,
      searchConfig.algolia.apiKey
    );
  }
  
  /**
   * Index a document
   */
  async index(collection, document) {
    const config = searchConfig.collections[collection];
    if (!config) return;
    
    // Build content from fields
    const content = config.fields
      .map(field => document[field])
      .filter(Boolean)
      .join(' ');
    
    // Extract keywords
    const keywords = this.extractKeywords(content);
    
    const indexData = {
      collection,
      documentId: document._id?.toString() || document.id,
      content,
      keywords,
      tenantId: document.tenantId,
      metadata: this.buildMetadata(document, config.fields),
      updatedAt: new Date(),
    };
    
    // Update or create in MongoDB
    await this.SearchIndex.findOneAndUpdate(
      { collection, documentId: indexData.documentId },
      indexData,
      { upsert: true, new: true }
    );
    
    // Index in external provider
    if (this.provider === 'elasticsearch' && this.client) {
      await this.indexInElasticsearch(collection, indexData);
    } else if (this.provider === 'algolia' && this.client) {
      await this.indexInAlgolia(collection, indexData);
    }
    
    return indexData;
  }
  
  /**
   * Bulk index documents
   */
  async bulkIndex(collection, documents) {
    const results = [];
    
    for (const doc of documents) {
      try {
        await this.index(collection, doc);
        results.push({ id: doc._id || doc.id, success: true });
      } catch (error) {
        results.push({ id: doc._id || doc.id, success: false, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Remove from index
   */
  async removeFromIndex(collection, documentId) {
    // Remove from MongoDB
    await this.SearchIndex.deleteOne({ collection, documentId });
    
    // Remove from external provider
    if (this.provider === 'elasticsearch' && this.client) {
      await this.client.delete({
        index: `${searchConfig.elasticsearch.indexPrefix}_${collection}`,
        id: documentId,
      }).catch(() => {});
    } else if (this.provider === 'algolia' && this.client) {
      const index = this.client.initIndex(`${searchConfig.algolia.indexPrefix}_${collection}`);
      await index.deleteObject(documentId).catch(() => {});
    }
    
    return true;
  }
  
  /**
   * Search
   */
  async search(query, options = {}) {
    const {
      collections = Object.keys(searchConfig.collections),
      tenantId,
      page = 1,
      pageSize = searchConfig.defaults.pageSize,
      filters = {},
      fuzzy = true,
    } = options;
    
    // Validate query
    if (query.length < searchConfig.defaults.minQueryLength) {
      return { results: [], total: 0, page, pageSize };
    }
    
    // Limit page size
    const limit = Math.min(pageSize, searchConfig.defaults.maxPageSize);
    const skip = (page - 1) * limit;
    
    let results;
    
    if (this.provider === 'elasticsearch' && this.client) {
      results = await this.searchElasticsearch(query, options);
    } else if (this.provider === 'algolia' && this.client) {
      results = await this.searchAlgolia(query, options);
    } else {
      results = await this.searchMongoDB(query, options);
    }
    
    return results;
  }
  
  /**
   * Search using MongoDB
   */
  async searchMongoDB(query, options) {
    const { collections, tenantId, page, pageSize, filters } = options;
    const limit = Math.min(pageSize, searchConfig.defaults.maxPageSize);
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = {
      collection: { $in: collections },
      $text: { $search: query },
    };
    
    if (tenantId) {
      searchQuery.tenantId = tenantId;
    }
    
    // Add additional filters
    Object.assign(searchQuery, filters);
    
    // Execute search
    const [results, total] = await Promise.all([
      this.SearchIndex.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit),
      this.SearchIndex.countDocuments(searchQuery),
    ]);
    
    return {
      results: results.map(r => ({
        collection: r.collection,
        documentId: r.documentId,
        score: r._doc.score || 1,
        metadata: r.metadata,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  
  /**
   * Search using Elasticsearch
   */
  async searchElasticsearch(query, options) {
    const { collections, tenantId, page, pageSize } = options;
    const limit = Math.min(pageSize, searchConfig.defaults.maxPageSize);
    const from = (page - 1) * limit;
    
    const indices = collections
      .map(c => `${searchConfig.elasticsearch.indexPrefix}_${c}`)
      .join(',');
    
    try {
      const response = await this.client.search({
        index: indices,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['content^2', 'keywords'],
                    fuzziness: 'AUTO',
                  },
                },
              ],
              filter: tenantId ? [{ term: { tenantId } }] : [],
            },
          },
          from,
          size: limit,
        },
      });
    
      return {
        results: response.hits.hits.map(hit => ({
          collection: hit._index.replace(`${searchConfig.elasticsearch.indexPrefix}_`, ''),
          documentId: hit._id,
          score: hit._score,
          metadata: hit._source.metadata,
        })),
        total: response.hits.total.value,
        page,
        pageSize: limit,
        totalPages: Math.ceil(response.hits.total.value / limit),
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error.message);
      // Fallback to MongoDB
      return this.searchMongoDB(query, options);
    }
  }
  
  /**
   * Search using Algolia
   */
  async searchAlgolia(query, options) {
    const { collections, tenantId, page, pageSize } = options;
    const limit = Math.min(pageSize, searchConfig.defaults.maxPageSize);
    
    // For simplicity, search in first collection
    // In production, you might want to search multiple indices
    const indexName = `${searchConfig.algolia.indexPrefix}_${collections[0]}`;
    const index = this.client.initIndex(indexName);
    
    try {
      const response = await index.search(query, {
        page: page - 1,
        hitsPerPage: limit,
        filters: tenantId ? `tenantId:${tenantId}` : undefined,
      });
      
      return {
        results: response.hits.map(hit => ({
          collection: collections[0],
          documentId: hit.objectID,
          score: 1,
          metadata: hit,
        })),
        total: response.nbHits,
        page,
        pageSize: limit,
        totalPages: response.nbPages,
      };
    } catch (error) {
      console.error('Algolia search error:', error.message);
      return this.searchMongoDB(query, options);
    }
  }
  
  /**
   * Suggest / Autocomplete
   */
  async suggest(query, options = {}) {
    const { collections, limit = 10 } = options;
    
    if (query.length < 2) return [];
    
    // Use aggregation for suggestions
    const results = await this.SearchIndex.aggregate([
      {
        $match: {
          collection: { $in: collections || Object.keys(searchConfig.collections) },
          keywords: { $regex: `^${query}`, $options: 'i' },
        },
      },
      { $unwind: '$keywords' },
      {
        $match: {
          keywords: { $regex: `^${query}`, $options: 'i' },
        },
      },
      { $group: { _id: '$keywords', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    
    return results.map(r => r._id);
  }
  
  /**
   * Extract keywords from content
   */
  extractKeywords(content) {
    if (!content) return [];
    
    // Simple keyword extraction
    return content
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // Keep Arabic characters
      .split(/\s+/)
      .filter(word => word.length >= 2)
      .filter(word => !this.isStopWord(word));
  }
  
  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      // English
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      // Arabic
      'في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي',
      'الذي', 'التي', 'هو', 'هي', 'هم', 'هن', 'أن', 'إن', 'كان', 'كانت',
    ]);
    
    return stopWords.has(word);
  }
  
  /**
   * Build metadata for indexing
   */
  buildMetadata(document, fields) {
    const metadata = {};
    
    for (const field of fields) {
      if (document[field] !== undefined) {
        metadata[field] = document[field];
      }
    }
    
    return metadata;
  }
  
  /**
   * Get search statistics
   */
  async getStats() {
    const [totalIndexed, byCollection] = await Promise.all([
      this.SearchIndex.countDocuments(),
      this.SearchIndex.aggregate([
        { $group: { _id: '$collection', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    
    return {
      totalIndexed,
      byCollection: byCollection.reduce((acc, c) => {
        acc[c._id] = c.count;
        return acc;
      }, {}),
    };
  }
  
  /**
   * Clear index for collection
   */
  async clearIndex(collection) {
    if (collection) {
      await this.SearchIndex.deleteMany({ collection });
    } else {
      await this.SearchIndex.deleteMany({});
    }
    
    return true;
  }
}

// Singleton instance
const searchService = new SearchService();

/**
 * Search Middleware for auto-indexing
 */
const searchIndexMiddleware = (collection) => {
  return (schema) => {
    schema.post('save', async function(doc) {
      await searchService.index(collection, doc.toObject());
    });
    
    schema.post('remove', async function(doc) {
      await searchService.removeFromIndex(collection, doc._id.toString());
    });
    
    schema.post('findOneAndDelete', async function(doc) {
      if (doc) {
        await searchService.removeFromIndex(collection, doc._id.toString());
      }
    });
  };
};

module.exports = {
  SearchService,
  searchService,
  searchConfig,
  searchIndexMiddleware,
};