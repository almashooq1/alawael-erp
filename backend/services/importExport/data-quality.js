'use strict';

/**
 * data-quality.js — extracted from services/importExportPro.service.js (W278g Pass 4).
 *
 * 3 pure data-quality functions:
 *   - cleanAndEnrichData: trims strings + normalizes spaces + computes
 *     VAT (15%) for invoices/expenses + GOSI deduction (9.75%) + net
 *     salary for payroll. Saudi-specific business rules.
 *   - generateDataQualityReport: completeness / uniqueness / consistency
 *     analysis per field with suggestions. Calls calculateDataQualityScore.
 *   - calculateDataQualityScore: 0-100 score weighted across the three
 *     dimensions above.
 *
 * Pre-extract these lived as instance methods on ImportExportProService.
 * Post-extract: the parent's executeImport calls
 * dataQuality.cleanAndEnrichData; the controller imports this module
 * directly for generateDataQualityReport.
 */

// ─────────────────────────────────────────────────
// DATA CLEANUP & ENRICHMENT
// ─────────────────────────────────────────────────

/**
 * Clean and enrich data before import
 */
function cleanAndEnrichData(data, module, options = {}) {
  return data.map(row => {
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      let val = value;

      // Basic cleanup
      if (typeof val === 'string') {
        val = val.trim();
        if (options.normalizeSpaces !== false) val = val.replace(/\s+/g, ' ');
        // eslint-disable-next-line no-control-regex
        if (options.removeInvisibleChars) val = val.replace(/[\x00-\x1F\x7F]/g, '');
      }

      // Remove empty strings
      if (val === '' && options.removeEmpty) continue;

      cleaned[key] = val;
    }

    // Auto-calculate fields
    if (module === 'invoices' || module === 'expenses') {
      if (cleaned.amount && cleaned.tax === undefined) {
        const amount = parseFloat(cleaned.amount);
        if (!isNaN(amount)) {
          cleaned.tax = (amount * 0.15).toFixed(2); // 15% VAT
          cleaned.total = (amount * 1.15).toFixed(2);
        }
      }
    }

    if (module === 'payroll') {
      const basic = parseFloat(cleaned.basicSalary) || 0;
      const housing = parseFloat(cleaned.housingAllowance) || 0;
      const transport = parseFloat(cleaned.transportAllowance) || 0;
      const other = parseFloat(cleaned.otherAllowances) || 0;
      const overtime = parseFloat(cleaned.overtime) || 0;
      const deductions = parseFloat(cleaned.deductions) || 0;
      const gosi = parseFloat(cleaned.gosiDeduction) || basic * 0.0975; // 9.75% GOSI

      if (!cleaned.gosiDeduction) cleaned.gosiDeduction = gosi.toFixed(2);
      if (!cleaned.netSalary) {
        cleaned.netSalary = (
          basic +
          housing +
          transport +
          other +
          overtime -
          deductions -
          gosi
        ).toFixed(2);
      }
    }

    return cleaned;
  });
}

/**
 * Generate data quality report
 */
function generateDataQualityReport(data, mappings, _module) {
  const report = {
    totalRows: data.length,
    completeness: {},
    uniqueness: {},
    consistency: {},
    suggestions: [],
  };

  // Analyze completeness per field
  (mappings || []).forEach(mapping => {
    const field = mapping.sourceColumn || mapping.targetField;
    let filled = 0;
    data.forEach(row => {
      const val = row[field];
      if (val !== null && val !== undefined && val !== '') filled++;
    });
    report.completeness[field] = {
      filled,
      empty: data.length - filled,
      percentage: data.length ? Math.round((filled / data.length) * 100) : 0,
    };

    // Suggest removing empty columns
    if (filled === 0) {
      report.suggestions.push({
        type: 'remove_empty',
        field,
        message: `العمود "${field}" فارغ بالكامل ويمكن حذفه`,
      });
    }
  });

  // Analyze uniqueness for key fields
  const keyFields = (mappings || []).filter(m => m.required);
  keyFields.forEach(mapping => {
    const field = mapping.sourceColumn || mapping.targetField;
    const values = data.map(r => String(r[field] || '')).filter(v => v);
    const unique = new Set(values);
    report.uniqueness[field] = {
      total: values.length,
      unique: unique.size,
      duplicates: values.length - unique.size,
      isUnique: values.length === unique.size,
    };

    if (values.length !== unique.size) {
      report.suggestions.push({
        type: 'duplicates',
        field,
        message: `يوجد ${values.length - unique.size} قيمة مكررة في "${field}"`,
      });
    }
  });

  // Data type consistency
  (mappings || []).forEach(mapping => {
    const field = mapping.sourceColumn || mapping.targetField;
    const expectedType = mapping.dataType;
    let consistent = 0;
    let inconsistent = 0;

    data.forEach(row => {
      const val = row[field];
      if (val === null || val === undefined || val === '') return;

      switch (expectedType) {
        case 'number':
        case 'currency':
          if (isNaN(Number(String(val).replace(/[,\s]/g, '')))) {
            inconsistent++;
          } else {
            consistent++;
          }
          break;
        case 'date':
          if (isNaN(Date.parse(val))) {
            inconsistent++;
          } else {
            consistent++;
          }
          break;
        case 'email':
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
            consistent++;
          } else {
            inconsistent++;
          }
          break;
        default:
          consistent++;
      }
    });

    report.consistency[field] = { consistent, inconsistent, total: consistent + inconsistent };
    if (inconsistent > 0) {
      report.suggestions.push({
        type: 'inconsistency',
        field,
        message: `${inconsistent} قيمة غير متوافقة مع النوع "${expectedType}" في "${field}"`,
      });
    }
  });

  report.overallScore = calculateDataQualityScore(report);
  return report;
}

/**
 * Calculate overall data quality score (0-100)
 */
function calculateDataQualityScore(report) {
  const scores = [];

  // Completeness score
  const compValues = Object.values(report.completeness);
  if (compValues.length > 0) {
    const avgComp = compValues.reduce((s, c) => s + c.percentage, 0) / compValues.length;
    scores.push(avgComp);
  }

  // Uniqueness score for key fields
  const uniqValues = Object.values(report.uniqueness);
  if (uniqValues.length > 0) {
    const avgUniq =
      uniqValues.reduce((s, u) => {
        return s + (u.total > 0 ? (u.unique / u.total) * 100 : 100);
      }, 0) / uniqValues.length;
    scores.push(avgUniq);
  }

  // Consistency score
  const consValues = Object.values(report.consistency);
  if (consValues.length > 0) {
    const avgCons =
      consValues.reduce((s, c) => {
        return s + (c.total > 0 ? (c.consistent / c.total) * 100 : 100);
      }, 0) / consValues.length;
    scores.push(avgCons);
  }

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;
}

module.exports = {
  cleanAndEnrichData,
  generateDataQualityReport,
  calculateDataQualityScore,
};
