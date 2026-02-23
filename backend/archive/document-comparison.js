/**
 * Document Comparison Service - خدمة مقارنة المستندات
 * Advanced Document Comparison & Diff Analysis
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Comparison Configuration
 */
const comparisonConfig = {
  // Supported formats
  formats: ['pdf', 'docx', 'txt', 'rtf', 'html'],
  
  // Comparison modes
  modes: {
    text: 'مقارنة نصية',
    visual: 'مقارنة بصرية',
    semantic: 'مقارنة دلالية',
    structural: 'مقارنة هيكلية',
  },
  
  // Sensitivity levels
  sensitivity: {
    low: { threshold: 0.3, minMatch: 3 },
    medium: { threshold: 0.5, minMatch: 5 },
    high: { threshold: 0.7, minMatch: 7 },
  },
};

/**
 * Comparison Result Schema
 */
const ComparisonResultSchema = new mongoose.Schema({
  // Comparison ID
  comparisonId: { type: String, unique: true },
  
  // Documents being compared
  documents: {
    original: {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      version: Number,
      hash: String,
    },
    modified: {
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      version: Number,
      hash: String,
    },
  },
  
  // Comparison settings
  settings: {
    mode: { type: String, enum: ['text', 'visual', 'semantic', 'structural'], default: 'text' },
    sensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    ignoreCase: { type: Boolean, default: true },
    ignoreWhitespace: { type: Boolean, default: true },
  },
  
  // Results
  results: {
    // Similarity score (0-100)
    similarity: Number,
    
    // Statistics
    statistics: {
      totalCharacters: Number,
      changedCharacters: Number,
      addedLines: Number,
      removedLines: Number,
      unchangedLines: Number,
    },
    
    // Changes
    changes: [{
      type: { type: String, enum: ['addition', 'deletion', 'modification', 'move'] },
      position: {
        start: Number,
        end: Number,
      },
      original: String,
      modified: String,
      significance: { type: String, enum: ['minor', 'moderate', 'major'] },
    }],
    
    // Detailed diff
    diff: [{
      type: { type: String, enum: ['equal', 'insert', 'delete'] },
      value: String,
      lineNumber: Number,
    }],
    
    // Semantic changes (for AI-powered comparison)
    semanticChanges: [{
      category: String, // 'meaning_change', 'tone_change', 'fact_change'
      description: String,
      location: String,
      confidence: Number,
    }],
    
    // Structural changes
    structuralChanges: [{
      type: { type: String, enum: ['section_added', 'section_removed', 'section_moved', 'order_changed'] },
      section: String,
      details: String,
    }],
  },
  
  // Visual comparison (for PDFs)
  visual: {
    pagesCompared: Number,
    differences: [{
      pageNumber: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      },
      type: String,
    }],
  },
  
  // Status
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  error: String,
  
  // Metadata
  createdBy: String,
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
}, {
  collection: 'comparison_results',
});

/**
 * Document Comparison Service Class
 */
class DocumentComparisonService {
  constructor() {
    this.ComparisonResult = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.ComparisonResult = connection.model('ComparisonResult', ComparisonResultSchema);
    console.log('✅ Document Comparison Service initialized');
  }
  
  /**
   * Compare two documents
   */
  async compareDocuments(originalDoc, modifiedDoc, options = {}) {
    const comparisonId = `CMP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Create comparison record
    const comparison = await this.ComparisonResult.create({
      comparisonId,
      documents: {
        original: {
          documentId: originalDoc.id,
          version: originalDoc.version || 1,
          hash: this.calculateHash(originalDoc.content),
        },
        modified: {
          documentId: modifiedDoc.id,
          version: modifiedDoc.version || 1,
          hash: this.calculateHash(modifiedDoc.content),
        },
      },
      settings: {
        mode: options.mode || 'text',
        sensitivity: options.sensitivity || 'medium',
        ignoreCase: options.ignoreCase !== false,
        ignoreWhitespace: options.ignoreWhitespace !== false,
      },
      status: 'processing',
      createdBy: options.userId,
      tenantId: options.tenantId,
    });
    
    // Process comparison
    try {
      const results = await this.performComparison(originalDoc.content, modifiedDoc.content, comparison.settings);
      
      comparison.results = results;
      comparison.status = 'completed';
      comparison.completedAt = new Date();
      await comparison.save();
      
    } catch (error) {
      comparison.status = 'failed';
      comparison.error = error.message;
      await comparison.save();
    }
    
    return comparison;
  }
  
  /**
   * Perform comparison
   */
  async performComparison(original, modified, settings) {
    const originalLines = this.preprocessText(original, settings).split('\n');
    const modifiedLines = this.preprocessText(modified, settings).split('\n');
    
    // Calculate diff
    const diff = this.computeDiff(originalLines, modifiedLines);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(diff, originalLines, modifiedLines);
    
    // Extract changes
    const changes = this.extractChanges(diff);
    
    // Calculate similarity
    const similarity = this.calculateSimilarity(statistics);
    
    // Detect semantic changes
    const semanticChanges = await this.detectSemanticChanges(original, modified);
    
    // Detect structural changes
    const structuralChanges = this.detectStructuralChanges(originalLines, modifiedLines);
    
    return {
      similarity,
      statistics,
      changes,
      diff,
      semanticChanges,
      structuralChanges,
    };
  }
  
  /**
   * Preprocess text
   */
  preprocessText(text, settings) {
    let processed = text;
    
    if (settings.ignoreCase) {
      processed = processed.toLowerCase();
    }
    
    if (settings.ignoreWhitespace) {
      processed = processed.replace(/\s+/g, ' ').trim();
    }
    
    return processed;
  }
  
  /**
   * Calculate hash
   */
  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Compute diff using Longest Common Subsequence
   */
  computeDiff(original, modified) {
    const diff = [];
    const lcs = this.computeLCS(original, modified);
    
    let origIndex = 0;
    let modIndex = 0;
    let lcsIndex = 0;
    
    while (origIndex < original.length || modIndex < modified.length) {
      if (lcsIndex < lcs.length && origIndex < original.length && original[origIndex] === lcs[lcsIndex]) {
        if (modIndex < modified.length && modified[modIndex] === lcs[lcsIndex]) {
          diff.push({ type: 'equal', value: original[origIndex], lineNumber: origIndex + 1 });
          origIndex++;
          modIndex++;
          lcsIndex++;
        } else {
          diff.push({ type: 'insert', value: modified[modIndex], lineNumber: modIndex + 1 });
          modIndex++;
        }
      } else if (origIndex < original.length) {
        diff.push({ type: 'delete', value: original[origIndex], lineNumber: origIndex + 1 });
        origIndex++;
      } else if (modIndex < modified.length) {
        diff.push({ type: 'insert', value: modified[modIndex], lineNumber: modIndex + 1 });
        modIndex++;
      }
    }
    
    return diff;
  }
  
  /**
   * Compute Longest Common Subsequence
   */
  computeLCS(arr1, arr2) {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // Backtrack to find LCS
    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  }
  
  /**
   * Calculate statistics
   */
  calculateStatistics(diff, originalLines, modifiedLines) {
    let addedLines = 0;
    let removedLines = 0;
    let unchangedLines = 0;
    
    for (const item of diff) {
      if (item.type === 'insert') addedLines++;
      else if (item.type === 'delete') removedLines++;
      else unchangedLines++;
    }
    
    const totalCharacters = originalLines.join('').length + modifiedLines.join('').length;
    const changedCharacters = (addedLines + removedLines) * 50; // Approximate
    
    return {
      totalCharacters,
      changedCharacters,
      addedLines,
      removedLines,
      unchangedLines,
    };
  }
  
  /**
   * Extract changes
   */
  extractChanges(diff) {
    const changes = [];
    let currentPosition = 0;
    
    for (const item of diff) {
      if (item.type !== 'equal') {
        changes.push({
          type: item.type === 'insert' ? 'addition' : item.type === 'delete' ? 'deletion' : 'modification',
          position: {
            start: currentPosition,
            end: currentPosition + item.value.length,
          },
          original: item.type === 'delete' ? item.value : '',
          modified: item.type === 'insert' ? item.value : '',
          significance: item.value.length > 100 ? 'major' : item.value.length > 20 ? 'moderate' : 'minor',
        });
      }
      currentPosition += item.value.length;
    }
    
    return changes;
  }
  
  /**
   * Calculate similarity score
   */
  calculateSimilarity(statistics) {
    const total = statistics.addedLines + statistics.removedLines + statistics.unchangedLines;
    if (total === 0) return 100;
    return Math.round((statistics.unchangedLines / total) * 100);
  }
  
  /**
   * Detect semantic changes
   */
  async detectSemanticChanges(original, modified) {
    const changes = [];
    
    // Check for number changes
    const numPattern = /\d+(?:[.,]\d+)?/g;
    const originalNums = original.match(numPattern) || [];
    const modifiedNums = modified.match(numPattern) || [];
    
    if (originalNums.join(',') !== modifiedNums.join(',')) {
      changes.push({
        category: 'fact_change',
        description: 'تم تغيير الأرقام أو المبالغ',
        location: 'throughout document',
        confidence: 0.9,
      });
    }
    
    // Check for date changes
    const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
    const originalDates = original.match(datePattern) || [];
    const modifiedDates = modified.match(datePattern) || [];
    
    if (originalDates.join(',') !== modifiedDates.join(',')) {
      changes.push({
        category: 'fact_change',
        description: 'تم تغيير التواريخ',
        location: 'throughout document',
        confidence: 0.85,
      });
    }
    
    // Check for name/entity changes
    // This would be enhanced with NER
    
    return changes;
  }
  
  /**
   * Detect structural changes
   */
  detectStructuralChanges(originalLines, modifiedLines) {
    const changes = [];
    
    // Check for section headers (lines starting with # or numbered)
    const headerPattern = /^(#{1,6}|\d+\.)\s+.+/;
    const originalHeaders = originalLines.filter(l => headerPattern.test(l));
    const modifiedHeaders = modifiedLines.filter(l => headerPattern.test(l));
    
    // Find added sections
    for (const header of modifiedHeaders) {
      if (!originalHeaders.includes(header)) {
        changes.push({
          type: 'section_added',
          section: header,
          details: 'تمت إضافة قسم جديد',
        });
      }
    }
    
    // Find removed sections
    for (const header of originalHeaders) {
      if (!modifiedHeaders.includes(header)) {
        changes.push({
          type: 'section_removed',
          section: header,
          details: 'تم حذف قسم',
        });
      }
    }
    
    return changes;
  }
  
  /**
   * Get comparison result
   */
  async getComparisonResult(comparisonId) {
    return this.ComparisonResult.findOne({ comparisonId });
  }
  
  /**
   * Get document comparison history
   */
  async getDocumentHistory(documentId) {
    return this.ComparisonResult.find({
      $or: [
        { 'documents.original.documentId': documentId },
        { 'documents.modified.documentId': documentId },
      ],
    }).sort({ createdAt: -1 });
  }
  
  /**
   * Compare document versions
   */
  async compareVersions(documentId, version1, version2) {
    // Would fetch both versions and compare
    // Placeholder implementation
    return {
      comparisonId: `CMP-versions-${Date.now()}`,
      documentId,
      versions: [version1, version2],
      status: 'pending',
    };
  }
  
  /**
   * Batch compare documents
   */
  async batchCompare(pairs, options = {}) {
    const results = [];
    
    for (const pair of pairs) {
      try {
        const result = await this.compareDocuments(pair.original, pair.modified, options);
        results.push({
          pair: pair.id,
          comparisonId: result.comparisonId,
          status: 'queued',
        });
      } catch (error) {
        results.push({
          pair: pair.id,
          status: 'error',
          error: error.message,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Generate comparison report
   */
  async generateReport(comparisonId) {
    const comparison = await this.getComparisonResult(comparisonId);
    if (!comparison) throw new Error('Comparison not found');
    
    return {
      comparisonId: comparison.comparisonId,
      summary: {
        similarity: comparison.results.similarity,
        totalChanges: comparison.results.changes.length,
        addedLines: comparison.results.statistics.addedLines,
        removedLines: comparison.results.statistics.removedLines,
      },
      changes: comparison.results.changes,
      semanticChanges: comparison.results.semanticChanges,
      structuralChanges: comparison.results.structuralChanges,
      generatedAt: new Date(),
    };
  }
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [total, completed, pending] = await Promise.all([
      this.ComparisonResult.countDocuments(filter),
      this.ComparisonResult.countDocuments({ ...filter, status: 'completed' }),
      this.ComparisonResult.countDocuments({ ...filter, status: 'pending' }),
    ]);
    
    const avgSimilarity = await this.ComparisonResult.aggregate([
      { $match: { ...filter, status: 'completed' } },
      { $group: { _id: null, avg: { $avg: '$results.similarity' } } },
    ]);
    
    return {
      total,
      completed,
      pending,
      averageSimilarity: avgSimilarity[0]?.avg || 0,
    };
  }
}

// Singleton instance
const documentComparisonService = new DocumentComparisonService();

/**
 * Change Types (Arabic)
 */
const changeTypes = {
  addition: { name: 'addition', label: 'إضافة', icon: 'plus', color: 'green' },
  deletion: { name: 'deletion', label: 'حذف', icon: 'minus', color: 'red' },
  modification: { name: 'modification', label: 'تعديل', icon: 'edit', color: 'orange' },
  move: { name: 'move', label: 'نقل', icon: 'move', color: 'blue' },
};

module.exports = {
  DocumentComparisonService,
  documentComparisonService,
  comparisonConfig,
  changeTypes,
};