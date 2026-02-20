/**
 * Duplicate Detector Service
 * Identifies duplicate records using multiple detection strategies
 * Supports fuzzy matching, exact matching, and custom comparison
 */

class DuplicateDetector {
  constructor(options = {}) {
    this.options = {
      threshold: options.threshold || 0.85, // Fuzzy match similarity threshold
      matchFields: options.matchFields || [], // Fields to check for duplicates
      exactMatchFields: options.exactMatchFields || [], // Exact match fields
      fuzzyMatchFields: options.fuzzyMatchFields || [], // Fuzzy match fields
      ...options,
    };

    this.detectionStrategies = new Map();
  }

  /**
   * Detect duplicates in dataset
   */
  async detectDuplicates(data, options = {}) {
    try {
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }

      const strategy = options.strategy || 'exact';
      const matchFields = options.matchFields || this.options.matchFields;

      let duplicateMap = new Map();
      const duplicates = [];
      const uniqueData = [];
      const seenRecords = new Set();

      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        let isDuplicate = false;

        // Check against previously seen records
        for (const [key, indices] of duplicateMap.entries()) {
          let isMatch = false;

          if (strategy === 'exact') {
            isMatch = this.isExactMatch(record, data[indices[0]], matchFields);
          } else if (strategy === 'fuzzy') {
            isMatch = this.isFuzzyMatch(record, data[indices[0]], matchFields);
          } else if (strategy === 'combined') {
            isMatch =
              this.isExactMatch(record, data[indices[0]], this.options.exactMatchFields) ||
              this.isFuzzyMatch(record, data[indices[0]], this.options.fuzzyMatchFields);
          }

          if (isMatch) {
            duplicateMap.get(key).push(i);
            isDuplicate = true;
            duplicates.push({
              index: i,
              record,
              matchedWith: indices[0],
              matchedRecord: data[indices[0]],
              strategy,
            });
            break;
          }
        }

        if (!isDuplicate) {
          const recordKey = this.generateRecordKey(record, matchFields);
          duplicateMap.set(recordKey, [i]);
          uniqueData.push(record);
          seenRecords.add(recordKey);
        }
      }

      return {
        count: duplicates.length,
        duplicates,
        uniqueData,
        totalRecords: data.length,
        uniqueCount: uniqueData.length,
        duplicatePercentage: ((duplicates.length / data.length) * 100).toFixed(2) + '%',
      };
    } catch (error) {
      throw new Error(`Duplicate detection failed: ${error.message}`);
    }
  }

  /**
   * Check for exact match
   */
  isExactMatch(record1, record2, fields = []) {
    if (fields.length === 0) {
      return JSON.stringify(record1) === JSON.stringify(record2);
    }

    for (const field of fields) {
      if (record1[field] !== record2[field]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for fuzzy match (similarity-based)
   */
  isFuzzyMatch(record1, record2, fields = [], threshold = null) {
    const matchThreshold = threshold || this.options.threshold;

    if (fields.length === 0) {
      return false;
    }

    let matches = 0;
    for (const field of fields) {
      const val1 = String(record1[field] || '').toLowerCase().trim();
      const val2 = String(record2[field] || '').toLowerCase().trim();

      const similarity = this.calculateSimilarity(val1, val2);
      if (similarity >= matchThreshold) {
        matches++;
      }
    }

    return matches === fields.length;
  }

  /**
   * Calculate string similarity (Levenshtein distance-based)
   */
  calculateSimilarity(str1, str2) {
    const len = Math.max(str1.length, str2.length);
    if (len === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / len;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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

    return matrix[str2.length][str1.length];
  }

  /**
   * Detect near-duplicates (records that are very similar)
   */
  async detectNearDuplicates(data, fields, threshold = 0.8) {
    const nearDuplicates = [];

    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        let similarityScore = 0;
        let checkedFields = 0;

        for (const field of fields) {
          const val1 = String(data[i][field] || '').toLowerCase();
          const val2 = String(data[j][field] || '').toLowerCase();

          similarityScore += this.calculateSimilarity(val1, val2);
          checkedFields++;
        }

        const avgSimilarity = similarityScore / checkedFields;

        if (avgSimilarity >= threshold && avgSimilarity < 1.0) {
          nearDuplicates.push({
            records: [i, j],
            similarity: (avgSimilarity * 100).toFixed(2) + '%',
            record1: data[i],
            record2: data[j],
          });
        }
      }
    }

    return {
      count: nearDuplicates.length,
      nearDuplicates,
      threshold,
    };
  }

  /**
   * Find duplicates by specific field
   */
  findDuplicatesByField(data, field) {
    const fieldValues = new Map();
    const duplicates = [];

    for (let i = 0; i < data.length; i++) {
      const value = data[i][field];
      
      if (fieldValues.has(value)) {
        const existingIndex = fieldValues.get(value);
        duplicates.push({
          field,
          value,
          indices: [existingIndex, i],
          records: [data[existingIndex], data[i]],
        });
      } else {
        fieldValues.set(value, i);
      }
    }

    return {
      field,
      duplicateCount: duplicates.length,
      duplicates,
      uniqueValues: fieldValues.size,
    };
  }

  /**
   * Generate unique key for record
   */
  generateRecordKey(record, fields = []) {
    if (fields.length === 0) {
      return JSON.stringify(record);
    }

    const keyParts = fields.map((field) => `${field}:${record[field]}`);
    return keyParts.join('|');
  }

  /**
   * Mark records for merging
   */
  identifies MergeCandidates(duplicates) {
    const mergeCandidates = [];

    for (const duplicate of duplicates) {
      mergeCandidates.push({
        primary: duplicate.matchedRecord,
        secondary: duplicate.record,
        reason: 'Exact duplicate',
        suggestedMergeStrategy: 'keep-first',
      });
    }

    return mergeCandidates;
  }

  /**
   * Merge duplicate records
   */
  mergeDuplicates(record1, record2, mergeStrategy = 'keep-all') {
    const merged = { ...record1 };

    if (mergeStrategy === 'keep-first') {
      return merged;
    }

    if (mergeStrategy === 'keep-all') {
      for (const [key, value] of Object.entries(record2)) {
        if (!merged[key] && value) {
          merged[key] = value;
        }
      }
      return merged;
    }

    if (mergeStrategy === 'prefer-newer') {
      const newer = record2.updatedAt > record1.updatedAt ? record2 : record1;
      return { ...record1, ...newer };
    }

    return merged;
  }

  /**
   * Generate deduplication report
   */
  generateReport(duplicateResult) {
    return {
      summary: {
        totalRecords: duplicateResult.totalRecords,
        uniqueRecords: duplicateResult.uniqueCount,
        duplicateRecords: duplicateResult.count,
        duplicatePercentage: duplicateResult.duplicatePercentage,
      },
      duplicates: duplicateResult.duplicates.slice(0, 20), // First 20
      timestamp: new Date().toISOString(),
      recommendations: this.getRecommendations(duplicateResult),
    };
  }

  /**
   * Get deduplication recommendations
   */
  getRecommendations(duplicateResult) {
    const recommendations = [];

    if (duplicateResult.count > 0) {
      recommendations.push(`Found ${duplicateResult.count} duplicate records`);
      recommendations.push(`Duplicate rate: ${duplicateResult.duplicatePercentage}`);
      
      if (parseFloat(duplicateResult.duplicatePercentage) > 10) {
        recommendations.push('⚠️ High duplicate rate detected. Consider implementing stricter validation.');
      }
    }

    return recommendations;
  }

  /**
   * Register custom detection strategy
   */
  registerStrategy(name, strategyFn) {
    if (typeof strategyFn !== 'function') {
      throw new Error('Strategy must be a function');
    }
    this.detectionStrategies.set(name, strategyFn);
    return this;
  }

  /**
   * Use custom strategy
   */
  async useStrategy(name, data) {
    const strategy = this.detectionStrategies.get(name);
    if (!strategy) {
      throw new Error(`Strategy '${name}' not found`);
    }
    return await strategy(data);
  }
}

module.exports = DuplicateDetector;
