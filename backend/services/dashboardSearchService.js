/**
 * Advanced Dashboard Search & Filter Service
 * Provides intelligent search, filtering, and discovery capabilities
 */

const logger = require('../utils/logger');

class DashboardSearchService {
  constructor() {
    this.searchIndex = [];
    this.filters = new Map();
    this.savedSearches = [];
  }

  /**
   * Build search index from KPIs
   */
  buildIndex(kpis = []) {
    this.searchIndex = [];

    kpis.forEach((kpi) => {
      this.searchIndex.push({
        id: kpi.id,
        type: 'kpi',
        name: kpi.name,
        name_ar: kpi.name_ar,
        description: kpi.description,
        category: kpi.category,
        keywords: this.extractKeywords(kpi),
        metadata: {
          target: kpi.target,
          current: kpi.current,
          status: kpi.status,
          trend: kpi.trend,
        },
      });
    });

    logger.info(`🔍 Built search index with ${this.searchIndex.length} items`);
  }

  /**
   * Extract keywords from KPI
   */
  extractKeywords(kpi) {
    const keywords = new Set();

    // Name words
    if (kpi.name) {
      kpi.name.split(' ').forEach(word => keywords.add(word.toLowerCase()));
    }

    // Arabic name words
    if (kpi.name_ar) {
      kpi.name_ar.split(' ').forEach(word => keywords.add(word));
    }

    // Category
    if (kpi.category) {
      keywords.add(kpi.category.toLowerCase());
    }

    // Status
    if (kpi.status) {
      keywords.add(kpi.status);
    }

    // Trend
    if (kpi.trend) {
      keywords.add(kpi.trend);
    }

    return Array.from(keywords);
  }

  /**
   * Search KPIs with full-text search
   */
  search(query, options = {}) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

    let results = this.searchIndex.filter((item) => {
      // Name match
      const nameMatch = item.name.toLowerCase().includes(queryLower) ||
                       item.name_ar.includes(query);

      // Keyword match
      const keywordMatch = queryWords.some(word =>
        item.keywords.some(keyword => keyword.includes(word))
      );

      // Description match
      const descMatch = item.description &&
                       item.description.toLowerCase().includes(queryLower);

      return nameMatch || keywordMatch || descMatch;
    });

    // Apply scoring for relevance
    results = results.map((item) => {
      let score = 0;

      if (item.name.toLowerCase() === queryLower) score += 100;
      if (item.name.toLowerCase().includes(queryLower)) score += 50;
      if (item.keywords.includes(queryLower)) score += 30;
      if (item.description?.toLowerCase().includes(queryLower)) score += 20;

      return { ...item, relevanceScore: score };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Apply multiple filters
   */
  applyFilters(kpis = [], filters = {}) {
    let filtered = [...kpis];

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(k => filters.categories.includes(k.category));
    }

    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      filtered = filtered.filter(k => filters.statuses.includes(k.status));
    }

    // Trend filter
    if (filters.trends && filters.trends.length > 0) {
      filtered = filtered.filter(k => filters.trends.includes(k.trend));
    }

    // Owner filter
    if (filters.owners && filters.owners.length > 0) {
      filtered = filtered.filter(k => filters.owners.includes(k.owner));
    }

    // Frequency filter
    if (filters.frequencies && filters.frequencies.length > 0) {
      filtered = filtered.filter(k => filters.frequencies.includes(k.frequency));
    }

    // Performance range filter
    if (filters.performanceMin !== undefined && filters.performanceMax !== undefined) {
      filtered = filtered.filter((k) => {
        const performance = (k.current / k.target) * 100;
        return performance >= filters.performanceMin && performance <= filters.performanceMax;
      });
    }

    // Alert filter
    if (filters.hasAlerts !== undefined) {
      filtered = filtered.filter((k) => {
        const hasAlerts = k.alerts && k.alerts.length > 0;
        return filters.hasAlerts ? hasAlerts : !hasAlerts;
      });
    }

    return filtered;
  }

  /**
   * Get available filters
   */
  getAvailableFilters(kpis = []) {
    const filters = {
      categories: [],
      statuses: [],
      trends: [],
      owners: [],
      frequencies: [],
      performanceRange: {
        min: 0,
        max: 100,
      },
    };

    if (kpis.length === 0) return filters;

    // Extract unique values
    filters.categories = [...new Set(kpis.map(k => k.category).filter(Boolean))];
    filters.statuses = [...new Set(kpis.map(k => k.status).filter(Boolean))];
    filters.trends = [...new Set(kpis.map(k => k.trend).filter(Boolean))];
    filters.owners = [...new Set(kpis.map(k => k.owner).filter(Boolean))];
    filters.frequencies = [...new Set(kpis.map(k => k.frequency).filter(Boolean))];

    // Calculate performance range
    const performances = kpis.map(k => (k.current / k.target) * 100);
    filters.performanceRange = {
      min: Math.floor(Math.min(...performances)),
      max: Math.ceil(Math.max(...performances)),
    };

    return filters;
  }

  /**
   * Smart search suggestions
   */
  getSuggestions(query, limit = 5) {
    if (!query || query.length < 2) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const suggestions = this.searchIndex
      .filter((item) => {
        return item.name.toLowerCase().includes(queryLower) ||
               item.category.toLowerCase().includes(queryLower) ||
               item.keywords.some(k => k.startsWith(queryLower));
      })
      .slice(0, limit)
      .map((item) => ({
        text: item.name,
        type: item.type,
        category: item.category,
      }));

    return suggestions;
  }

  /**
   * Save search query
   */
  saveSearch(name, query, filters = {}) {
    const savedSearch = {
      id: `search_${Date.now()}`,
      name,
      query,
      filters,
      createdAt: new Date(),
      usageCount: 0,
    };

    this.savedSearches.push(savedSearch);
    return savedSearch;
  }

  /**
   * Get saved searches
   */
  getSavedSearches() {
    return this.savedSearches.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Execute saved search
   */
  executeSavedSearch(searchId, kpis = []) {
    const search = this.savedSearches.find(s => s.id === searchId);
    if (!search) {
      return [];
    }

    search.usageCount++;
    let results = this.search(search.query, { limit: 100 });
    results = this.applyFilters(results, search.filters);

    return results;
  }

  /**
   * Advanced search with operators
   */
  advancedSearch(queryString, kpis = []) {
    // Parse query: status:critical trend:down category:Financial
    const operators = {};
    let cleanQuery = queryString;

    const operatorPattern = /(\w+):(\w+)/g;
    let match;

    while ((match = operatorPattern.exec(queryString)) !== null) {
      operators[match[1]] = match[2];
      cleanQuery = cleanQuery.replace(match[0], '').trim();
    }

    // Build filter from operators
    const filter = {};
    if (operators.status) filter.statuses = [operators.status];
    if (operators.trend) filter.trends = [operators.trend];
    if (operators.category) filter.categories = [operators.category];

    let results = kpis;

    // Apply filter
    if (Object.keys(filter).length > 0) {
      results = this.applyFilters(results, filter);
    }

    // Apply text search
    if (cleanQuery.length > 0) {
      const textResults = this.search(cleanQuery);
      const textIds = new Set(textResults.map(r => r.id));
      results = results.filter(k => textIds.has(k.id));
    }

    return results;
  }

  /**
   * Get search stats
   */
  getSearchStats() {
    return {
      indexedItems: this.searchIndex.length,
      savedSearches: this.savedSearches.length,
      totalSearches: this.savedSearches.reduce((sum, s) => sum + s.usageCount, 0),
      timestamp: new Date(),
    };
  }

  /**
   * Get trending searches
   */
  getTrendingSearches(limit = 10) {
    return this.savedSearches
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Clear search history
   */
  clearSearchHistory() {
    this.savedSearches = [];
    this.searchIndex = [];
    logger.info('🗑️  Cleared search history');
  }
}

module.exports = new DashboardSearchService();
