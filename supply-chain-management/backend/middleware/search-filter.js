// middleware/search-filter.js
// Advanced Search & Filter Middleware

class SearchFilter {
  constructor() {
    this.filters = {};
    this.searchFields = [];
    this.pagination = { page: 1, limit: 10 };
  }

  // Parse query parameters for search
  parseSearchQuery(query, allowedFields) {
    const searchTerm = query.search || query.q || '';
    const searchFields = allowedFields || ['name', 'email', 'sku'];

    if (!searchTerm) return null;

    // Escape special regex characters to prevent ReDoS
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build OR query for multiple fields
    return {
      $or: searchFields.map(field => ({
        [field]: { $regex: escapedTerm, $options: 'i' },
      })),
    };
  }

  // Parse filters
  parseFilters(query, allowedFilters) {
    const filters = {};

    Object.keys(query).forEach(key => {
      if (allowedFilters.includes(key)) {
        // Handle range filters (min, max)
        if (key.startsWith('min_')) {
          const fieldName = key.replace('min_', '');
          filters[fieldName] = filters[fieldName] || {};
          filters[fieldName].$gte = parseFloat(query[key]);
        } else if (key.startsWith('max_')) {
          const fieldName = key.replace('max_', '');
          filters[fieldName] = filters[fieldName] || {};
          filters[fieldName].$lte = parseFloat(query[key]);
        } else if (key === 'status' || key === 'rating') {
          filters[key] = query[key];
        }
      }
    });

    return Object.keys(filters).length > 0 ? filters : null;
  }

  // Parse pagination
  parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  // Default allowed sort fields — prevents arbitrary field name injection
  static ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price', 'quantity', 'status', 'rating', 'sku', 'date'];

  // Parse sorting
  parseSorting(query, allowedSortFields) {
    const allowed = allowedSortFields || SearchFilter.ALLOWED_SORT_FIELDS;
    const rawField = query.sort || 'createdAt';
    const sortField = allowed.includes(rawField) ? rawField : 'createdAt';
    const sortOrder = (query.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    return { [sortField]: sortOrder };
  }

  // Build complete query
  buildQuery(queryParams, config = {}) {
    const { searchFields = ['name'], filterFields = [], sortField = 'createdAt' } = config;

    const query = {};

    // Add search
    const searchQuery = this.parseSearchQuery(queryParams, searchFields);
    if (searchQuery) {
      Object.assign(query, searchQuery);
    }

    // Add filters
    const filterQuery = this.parseFilters(queryParams, filterFields);
    if (filterQuery) {
      Object.assign(query, filterQuery);
    }

    // Get pagination and sorting
    const pagination = this.parsePagination(queryParams);
    const sorting = this.parseSorting(queryParams);

    return {
      query,
      pagination,
      sorting,
    };
  }
}

// Enhanced query middleware
const createSearchFilterMiddleware = config => {
  return (req, res, next) => {
    const sf = new SearchFilter();
    const queryData = sf.buildQuery(req.query, config);

    req.queryParams = {
      filter: queryData.query,
      pagination: queryData.pagination,
      sorting: queryData.sorting,
    };

    next();
  };
};

module.exports = {
  SearchFilter,
  createSearchFilterMiddleware,
};
