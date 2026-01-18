/**
 * خدمة التصفية المتقدمة والذكية
 * Advanced Data Filtering Service
 *
 * توفير تصفية ذكية متقدمة للبيانات
 * Provide advanced smart data filtering
 */

class AdvancedFilterService {
  /**
   * تطبيق تصفية متقدمة
   * Apply advanced filters
   */
  static applyAdvancedFilters(data, filters) {
    let result = data;

    // تصفية نطاق التاريخ
    if (filters.dateRange) {
      result = this.filterByDateRange(result, filters.dateRange);
    }

    // تصفية النطاق العددي
    if (filters.rangeFilters) {
      result = this.filterByRange(result, filters.rangeFilters);
    }

    // تصفية البحث النصي
    if (filters.searchText) {
      result = this.filterBySearch(result, filters.searchText);
    }

    // تصفية متعددة الحقول
    if (filters.fieldFilters) {
      result = this.filterByFields(result, filters.fieldFilters);
    }

    // تصفية الحالة
    if (filters.statusFilters) {
      result = this.filterByStatus(result, filters.statusFilters);
    }

    // تصفية التصنيفات
    if (filters.categoryFilters) {
      result = this.filterByCategories(result, filters.categoryFilters);
    }

    // التصفية الشرطية المعقدة
    if (filters.complexFilters) {
      result = this.applyComplexFilters(result, filters.complexFilters);
    }

    // الفرز
    if (filters.sorting) {
      result = this.applySorting(result, filters.sorting);
    }

    return result;
  }

  /**
   * تصفية حسب نطاق التاريخ
   * Filter by date range
   */
  static filterByDateRange(data, dateRange) {
    const { from, to } = dateRange;
    return data.filter(item => {
      const itemDate = new Date(item.date || item.createdAt);
      return itemDate >= new Date(from) && itemDate <= new Date(to);
    });
  }

  /**
   * تصفية حسب النطاق العددي
   * Filter by numeric range
   */
  static filterByRange(data, rangeFilters) {
    let result = data;

    Object.keys(rangeFilters).forEach(field => {
      const { min, max } = rangeFilters[field];
      result = result.filter(item => {
        const value = Number(item[field]);
        return value >= min && value <= max;
      });
    });

    return result;
  }

  /**
   * البحث النصي الذكي
   * Smart text search
   */
  static filterBySearch(data, searchText) {
    const searchLower = searchText.toLowerCase();
    const searchWords = searchText.split(' ').filter(w => w.length > 0);

    return data.filter(item => {
      // محاولة البحث في جميع الحقول النصية
      for (const value of Object.values(item)) {
        const strValue = String(value).toLowerCase();

        // البحث الدقيق
        if (strValue.includes(searchLower)) return true;

        // البحث بالكلمات المفردة
        if (searchWords.every(word => strValue.includes(word))) return true;
      }
      return false;
    });
  }

  /**
   * تصفية متعددة الحقول
   * Multi-field filtering
   */
  static filterByFields(data, fieldFilters) {
    let result = data;

    Object.keys(fieldFilters).forEach(field => {
      const values = Array.isArray(fieldFilters[field]) ? fieldFilters[field] : [fieldFilters[field]];

      result = result.filter(item => values.includes(item[field]));
    });

    return result;
  }

  /**
   * تصفية حسب الحالة
   * Filter by status
   */
  static filterByStatus(data, statusFilters) {
    return data.filter(item => {
      return statusFilters.includes(item.status);
    });
  }

  /**
   * تصفية حسب التصنيفات
   * Filter by categories
   */
  static filterByCategories(data, categoryFilters) {
    return data.filter(item => {
      const itemCategories = Array.isArray(item.category) ? item.category : [item.category];

      return itemCategories.some(cat => categoryFilters.includes(cat));
    });
  }

  /**
   * التصفية الشرطية المعقدة
   * Complex conditional filtering
   */
  static applyComplexFilters(data, complexFilters) {
    return data.filter(item => {
      return complexFilters.every(condition => {
        const { field, operator, value } = condition;
        const itemValue = item[field];

        switch (operator) {
          case 'equals':
            return itemValue === value;
          case 'notEquals':
            return itemValue !== value;
          case 'greaterThan':
            return Number(itemValue) > Number(value);
          case 'lessThan':
            return Number(itemValue) < Number(value);
          case 'greaterThanOrEqual':
            return Number(itemValue) >= Number(value);
          case 'lessThanOrEqual':
            return Number(itemValue) <= Number(value);
          case 'contains':
            return String(itemValue).includes(value);
          case 'notContains':
            return !String(itemValue).includes(value);
          case 'startsWith':
            return String(itemValue).startsWith(value);
          case 'endsWith':
            return String(itemValue).endsWith(value);
          case 'inArray':
            return Array.isArray(value) ? value.includes(itemValue) : false;
          case 'between':
            return Number(itemValue) >= value[0] && Number(itemValue) <= value[1];
          default:
            return true;
        }
      });
    });
  }

  /**
   * تطبيق الفرز
   * Apply sorting
   */
  static applySorting(data, sorting) {
    const { field, direction = 'asc' } = sorting;

    return [...data].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      // تحويل إلى أرقام إذا كانت أرقام
      if (!isNaN(aVal) && !isNaN(bVal)) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * إنشاء فلتر من خالة المستخدم
   * Build filter from user state
   */
  static buildFilter(state) {
    const filter = {};

    if (state.selectedStatuses?.length > 0) {
      filter.statusFilters = state.selectedStatuses;
    }

    if (state.dateFrom && state.dateTo) {
      filter.dateRange = {
        from: state.dateFrom,
        to: state.dateTo,
      };
    }

    if (state.searchText) {
      filter.searchText = state.searchText;
    }

    if (state.selectedCategories?.length > 0) {
      filter.categoryFilters = state.selectedCategories;
    }

    if (state.rangeMin !== undefined || state.rangeMax !== undefined) {
      filter.rangeFilters = {
        value: {
          min: state.rangeMin || 0,
          max: state.rangeMax || Infinity,
        },
      };
    }

    if (state.sortField) {
      filter.sorting = {
        field: state.sortField,
        direction: state.sortDirection || 'asc',
      };
    }

    return filter;
  }

  /**
   * الحصول على إحصائيات التصفية
   * Get filter statistics
   */
  static getFilterStatistics(originalData, filteredData, filters) {
    return {
      totalItems: originalData.length,
      filteredItems: filteredData.length,
      filtered: originalData.length !== filteredData.length,
      filterPercentage: Math.round((1 - filteredData.length / originalData.length) * 100),
      appliedFilters: Object.keys(filters).length,
      filters: filters,
    };
  }
}

module.exports = AdvancedFilterService;
