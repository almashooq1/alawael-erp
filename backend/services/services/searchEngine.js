/**
 * Advanced Search Engine Service
 * Full-text search, fuzzy matching, and complex filters
 * Phase 10: Advanced Features
 */

const logger = require('../utils/logger');

class SearchEngine {
  constructor() {
    this.indexes = {};
    this.cache = new Map();
    this.cacheSize = 1000;
  }

  /**
   * Build search index for a collection
   */
  buildIndex(collectionName, documents, searchFields = ['name', 'description']) {
    try {
      const index = new Map();

      documents.forEach(doc => {
        searchFields.forEach(field => {
          const fieldValue = doc[field];
          if (!fieldValue) return;

          const tokens = this.tokenize(fieldValue.toString());
          tokens.forEach(token => {
            if (!index.has(token)) {
              index.set(token, []);
            }
            const docIds = index.get(token);
            if (!docIds.includes(doc._id)) {
              docIds.push(doc._id);
            }
          });
        });
      });

      this.indexes[collectionName] = {
        index,
        documents: new Map(documents.map(d => [d._id, d])),
        searchFields,
        createdAt: new Date(),
      };

      logger.info(`Search index built for ${collectionName}: ${documents.length} documents`);
      return true;
    } catch (error) {
      logger.error('Error building search index:', error);
      return false;
    }
  }

  /**
   * Tokenize text
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate Levenshtein distance (fuzzy matching)
   */
  levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Fuzzy search
   */
  fuzzySearch(query, collection, maxDistance = 2) {
    try {
      const indexData = this.indexes[collection];
      if (!indexData) return [];

      const queryTokens = this.tokenize(query);
      const results = new Map();

      indexData.index.forEach((docIds, token) => {
        queryTokens.forEach(queryToken => {
          const distance = this.levenshteinDistance(queryToken, token);
          if (distance <= maxDistance) {
            docIds.forEach(docId => {
              const score = results.get(docId) || 0;
              results.set(docId, score + (maxDistance - distance));
            });
          }
        });
      });

      return Array.from(results.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([docId, score]) => ({
          ...indexData.documents.get(docId),
          score,
        }));
    } catch (error) {
      logger.error('Fuzzy search error:', error);
      return [];
    }
  }

  /**
   * Full-text search
   */
  fullTextSearch(query, collection, limit = 20) {
    try {
      // Check cache
      const cacheKey = `${collection}:${query}:${limit}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const indexData = this.indexes[collection];
      if (!indexData) return [];

      const queryTokens = this.tokenize(query);
      const results = new Map();
      const totalTokens = queryTokens.length;

      queryTokens.forEach(token => {
        const matchedIds = indexData.index.get(token) || [];
        matchedIds.forEach(docId => {
          const score = results.get(docId) || 0;
          results.set(docId, score + 1);
        });
      });

      let searchResults = Array.from(results.entries())
        .map(([docId, matches]) => ({
          ...indexData.documents.get(docId),
          relevance: (matches / totalTokens) * 100,
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);

      // Cache result
      if (this.cache.size >= this.cacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, searchResults);

      return searchResults;
    } catch (error) {
      logger.error('Full-text search error:', error);
      return [];
    }
  }

  /**
   * Advanced filter search
   */
  advancedSearch(query, collection, filters = {}, options = {}) {
    try {
      const { limit = 20, offset = 0, sortBy = 'relevance', sortOrder = 'desc' } = options;

      const indexData = this.indexes[collection];
      if (!indexData) return { results: [], total: 0 };

      // Full-text search results
      let results = this.fullTextSearch(query, collection, 1000);

      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          results = results.filter(doc => value.includes(doc[field]));
        } else if (typeof value === 'object' && value.$gte !== undefined) {
          results = results.filter(doc => doc[field] >= value.$gte);
        } else if (typeof value === 'object' && value.$lte !== undefined) {
          results = results.filter(doc => doc[field] <= value.$lte);
        } else {
          results = results.filter(doc => doc[field] === value);
        }
      });

      const total = results.length;

      // Sort
      if (sortBy && sortBy !== 'relevance') {
        results.sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return sortOrder === 'asc' ? comparison : -comparison;
        });
      }

      // Paginate
      results = results.slice(offset, offset + limit);

      return { results, total, limit, offset };
    } catch (error) {
      logger.error('Advanced search error:', error);
      return { results: [], total: 0 };
    }
  }

  /**
   * Get search suggestions
   */
  getSuggestions(query, collection, limit = 10) {
    try {
      const indexData = this.indexes[collection];
      if (!indexData) return [];

      const queryTokens = this.tokenize(query);
      const suggestions = new Map();

      queryTokens.forEach(token => {
        indexData.index.forEach((docIds, indexToken) => {
          if (indexToken.startsWith(token)) {
            suggestions.set(indexToken, (suggestions.get(indexToken) || 0) + 1);
          }
        });
      });

      return Array.from(suggestions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([suggestion, count]) => ({ suggestion, count }));
    } catch (error) {
      logger.error('Suggestions error:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      indexes: Object.keys(this.indexes).length,
      cacheSize: this.cache.size,
      indexDetails: Object.entries(this.indexes).map(([name, data]) => ({
        name,
        documents: data.documents.size,
        tokens: data.index.size,
        createdAt: data.createdAt,
      })),
    };
  }
}

module.exports = new SearchEngine();
