// utils/pagination-helper.js
// Pagination & Data Formatting Utilities

class PaginationHelper {
  /**
   * Generate pagination metadata
   */
  static generatePaginationInfo(currentPage, limit, totalDocuments) {
    const totalPages = Math.ceil(totalDocuments / limit);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
      currentPage,
      limit,
      totalDocuments,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      previousPage: hasPreviousPage ? currentPage - 1 : null,
    };
  }

  /**
   * Format paginated response
   */
  static formatResponse(data, pagination, success = true, message = 'Success') {
    return {
      success,
      message,
      data,
      pagination,
    };
  }

  /**
   * Execute paginated query
   */
  static async executePaginatedQuery(model, filter = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, select = null } = options;

    try {
      const skip = (page - 1) * limit;

      const query = model.find(filter);

      if (select) {
        query.select(select);
      }

      const documents = await query.sort(sort).skip(skip).limit(limit).lean();

      const totalCount = await model.countDocuments(filter);

      const pagination = this.generatePaginationInfo(page, limit, totalCount);

      return {
        success: true,
        data: documents,
        pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

class DataFormatterHelper {
  /**
   * Format supplier data for response
   */
  static formatSupplier(supplier) {
    return {
      id: supplier._id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      rating: supplier.rating,
      status: supplier.status,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  /**
   * Format product data for response
   */
  static formatProduct(product) {
    return {
      id: product._id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      supplierId: product.supplierId,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Format order data for response
   */
  static formatOrder(order) {
    return {
      id: order._id,
      number: order.number,
      supplierId: order.supplierId,
      products: order.products || [],
      status: order.status,
      total: order.total,
      date: order.date,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Format multiple documents
   */
  static formatMultiple(documents, type) {
    const formatters = {
      supplier: this.formatSupplier,
      product: this.formatProduct,
      order: this.formatOrder,
    };

    const formatter = formatters[type];
    if (!formatter) return documents;

    return documents.map(doc => formatter(doc));
  }

  /**
   * Calculate summary statistics
   */
  static calculateSummaryStats(data, field) {
    const values = data.map(item => item[field]).filter(v => v !== null && v !== undefined);

    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      min,
      max,
      avg: Math.round(avg * 100) / 100,
      sum: Math.round(sum * 100) / 100,
      count: values.length,
    };
  }
}

class CacheHelper {
  /**
   * Generate cache key
   */
  static generateKey(prefix, params = {}) {
    const paramString = Object.entries(params)
      .sort()
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `${prefix}:${paramString}`;
  }

  /**
   * Parse cache duration
   */
  static parseCacheDuration(duration) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    return parseInt(match[1]) * (units[match[2]] || 1);
  }
}

module.exports = {
  PaginationHelper,
  DataFormatterHelper,
  CacheHelper,
};
