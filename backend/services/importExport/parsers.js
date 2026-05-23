'use strict';

/**
 * parsers.js — extracted from services/importExportPro.service.js (W278f Pass 3).
 *
 * Import-side mirror of formatters.js (W278e Pass 2). 8 functions:
 *   - 3 file-format parsers: parseExcel, parseCSV, parseJSON
 *   - 1 mapping suggester: suggestColumnMappings (uses SYSTEM_TEMPLATES)
 *   - 1 validator: validateImportData (calls detectDuplicates internally)
 *   - 1 duplicate detector: detectDuplicates
 *   - 1 transformer: transformImportData (calls applyTransform per cell)
 *   - 1 transform rule applier: applyTransform (20+ rules incl. Saudi
 *     phone normalization + Arabic diacritics removal + percent→decimal)
 *
 * All pure functions, no class state. Pre-extract: lived as
 * `_parseExcel` / `_validateImportData` / etc. private methods on
 * ImportExportProService using `this._detectDuplicates` +
 * `this._applyTransform`. Post-extract: those calls become bare fn
 * references within this module.
 */

const ExcelJS = require('exceljs');
const { parse: csvParse } = require('csv-parse/sync');

const { SYSTEM_TEMPLATES } = require('./system-templates');

/**
 * Parse Excel file
 */
async function parseExcel(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[options.sheetIndex || 0];
  if (!worksheet) throw new Error('لا توجد صفحات بيانات في الملف');

  const headerRow = options.headerRow || 1;
  const startRow = options.startRow || 2;

  // Get headers
  const headers = [];
  worksheet.getRow(headerRow).eachCell((cell, colNum) => {
    let value = cell.value;
    if (typeof value === 'object' && value?.richText) {
      value = value.richText.map(r => r.text).join('');
    }
    headers[colNum] = String(value || '').trim();
  });

  // Parse rows
  const data = [];
  for (let rowNum = startRow; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const record = {};
    let hasData = false;

    headers.forEach((header, colNum) => {
      if (!header) return;
      let value = row.getCell(colNum).value;

      // Handle Excel date objects
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      } else if (typeof value === 'object' && value?.result !== undefined) {
        value = value.result;
      } else if (typeof value === 'object' && value?.richText) {
        value = value.richText.map(r => r.text).join('');
      }

      if (value !== null && value !== undefined && value !== '') {
        hasData = true;
      }
      record[header] = value;
    });

    if (
      hasData &&
      (!options.skipEmptyRows || Object.values(record).some(v => v !== null && v !== ''))
    ) {
      data.push(record);
    }
  }

  return data;
}

/**
 * Parse CSV file
 */
function parseCSV(buffer, options = {}) {
  const content = buffer.toString(options.encoding || 'utf-8');
  return csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    delimiter: options.delimiter || ',',
    trim: options.trimWhitespace !== false,
  });
}

/**
 * Parse JSON file
 */
function parseJSON(buffer) {
  const content = buffer.toString('utf-8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON file: ${err.message}`);
  }

  // Handle both array and { data: [] } formats
  if (Array.isArray(parsed)) return parsed;
  if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
  if (parsed.records && Array.isArray(parsed.records)) return parsed.records;

  throw new Error('JSON format not recognized. Expected array or { data: [] }');
}

/**
 * Auto-suggest column mappings based on column names
 */
function suggestColumnMappings(detectedColumns, module) {
  const systemFields = SYSTEM_TEMPLATES[module] || [];
  const mappings = [];

  for (const col of detectedColumns) {
    const colLower = col.toLowerCase().trim();

    // Direct match
    let match = systemFields.find(
      f =>
        f.key.toLowerCase() === colLower ||
        f.name.toLowerCase() === colLower ||
        (f.nameAr && f.nameAr === col)
    );

    // Fuzzy match
    if (!match) {
      match = systemFields.find(
        f =>
          colLower.includes(f.key.toLowerCase()) ||
          f.key.toLowerCase().includes(colLower) ||
          f.name.toLowerCase().includes(colLower)
      );
    }

    mappings.push({
      sourceColumn: col,
      targetField: match?.key || col,
      dataType: match?.dataType || 'string',
      required: match?.required || false,
      confidence: match ? (match.key.toLowerCase() === colLower ? 'high' : 'medium') : 'low',
      autoDetected: !!match,
    });
  }

  return mappings;
}

/**
 * Validate import data (enhanced with Saudi-specific validators)
 */
function validateImportData(data, mappings, _module) {
  const errors = [];
  const warnings = [];
  let validRows = 0;
  let invalidRows = 0;

  data.forEach((row, idx) => {
    let rowValid = true;

    (mappings || []).forEach(mapping => {
      const value = row[mapping.sourceColumn] || row[mapping.targetField];

      // Required check
      if (mapping.required && (value === null || value === undefined || value === '')) {
        errors.push({
          row: idx + 1,
          column: mapping.sourceColumn,
          field: mapping.targetField,
          value,
          error: `الحقل مطلوب: ${mapping.sourceColumn}`,
          severity: 'error',
        });
        rowValid = false;
      }

      // Type validation
      if (value !== null && value !== undefined && value !== '') {
        const strVal = String(value);
        switch (mapping.dataType) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
              errors.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'بريد إلكتروني غير صالح',
                severity: 'error',
              });
              rowValid = false;
            }
            break;
          case 'number':
          case 'currency':
            if (isNaN(Number(strVal.replace(/[,\s]/g, '')))) {
              errors.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'يجب أن يكون رقماً',
                severity: 'error',
              });
              rowValid = false;
            } else if (
              mapping.dataType === 'currency' &&
              Number(strVal.replace(/[,\s]/g, '')) < 0
            ) {
              warnings.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'قيمة مالية سالبة',
                severity: 'warning',
              });
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              warnings.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'تنسيق تاريخ غير معروف',
                severity: 'warning',
              });
            }
            break;
          case 'phone':
            if (!/^[\d\s\-+()]{7,20}$/.test(strVal)) {
              warnings.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'رقم هاتف قد يكون غير صالح',
                severity: 'warning',
              });
            }
            // Saudi phone validation
            else if (/(\+?966|05)/.test(strVal)) {
              const digits = strVal.replace(/\D/g, '');
              const normalized = digits.startsWith('966')
                ? digits
                : digits.startsWith('05')
                  ? '966' + digits.substring(1)
                  : digits;
              if (normalized.startsWith('966') && normalized.length !== 12) {
                warnings.push({
                  row: idx + 1,
                  column: mapping.sourceColumn,
                  field: mapping.targetField,
                  value,
                  error: 'رقم هاتف سعودي يجب أن يكون 12 رقم (مع 966)',
                  severity: 'warning',
                });
              }
            }
            break;
          case 'boolean': {
            const boolValid = ['true', 'false', '1', '0', 'yes', 'no', 'نعم', 'لا', 'صح', 'خطأ'];
            if (!boolValid.includes(strVal.toLowerCase().trim())) {
              warnings.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: 'قيمة منطقية غير معروفة',
                severity: 'warning',
              });
            }
            break;
          }
          case 'select':
            if (
              mapping.options &&
              mapping.options.length > 0 &&
              !mapping.options.includes(strVal)
            ) {
              errors.push({
                row: idx + 1,
                column: mapping.sourceColumn,
                field: mapping.targetField,
                value,
                error: `قيمة غير مسموحة. القيم المتاحة: ${mapping.options.join(', ')}`,
                severity: 'error',
              });
              rowValid = false;
            }
            break;
        }

        // Custom field-level validations
        const fieldKey = (mapping.targetField || '').toLowerCase();
        if (fieldKey === 'idnumber' || fieldKey === 'id_number') {
          // Saudi ID / Iqama validation (10 digits, starts with 1 or 2)
          const digits = strVal.replace(/\D/g, '');
          if (digits.length !== 10 || !['1', '2'].includes(digits[0])) {
            warnings.push({
              row: idx + 1,
              column: mapping.sourceColumn,
              field: mapping.targetField,
              value,
              error: 'رقم الهوية/الإقامة يجب أن يكون 10 أرقام يبدأ بـ 1 أو 2',
              severity: 'warning',
            });
          }
        }
        if (fieldKey === 'taxnumber' || fieldKey === 'tax_number') {
          // VAT number validation (15 digits, starts with 3)
          const digits = strVal.replace(/\D/g, '');
          if (digits.length !== 15 || digits[0] !== '3') {
            warnings.push({
              row: idx + 1,
              column: mapping.sourceColumn,
              field: mapping.targetField,
              value,
              error: 'الرقم الضريبي يجب أن يكون 15 رقم يبدأ بـ 3',
              severity: 'warning',
            });
          }
        }
        if (fieldKey === 'iban') {
          // Saudi IBAN validation
          if (!/^SA\d{22}$/.test(strVal.replace(/\s/g, ''))) {
            warnings.push({
              row: idx + 1,
              column: mapping.sourceColumn,
              field: mapping.targetField,
              value,
              error: 'IBAN سعودي يجب أن يبدأ بـ SA ويتبعه 22 رقم',
              severity: 'warning',
            });
          }
        }
      }
    });

    if (rowValid) validRows++;
    else invalidRows++;
  });

  // Duplicate detection
  const duplicates = detectDuplicates(data, mappings);
  if (duplicates.length > 0) {
    duplicates.forEach(dup => {
      warnings.push({
        row: dup.rows.join(', '),
        column: dup.field,
        field: dup.field,
        value: dup.value,
        error: `قيمة مكررة في الصفوف: ${dup.rows.join(', ')}`,
        severity: 'warning',
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors.slice(0, 100),
    warnings: warnings.slice(0, 50),
    totalRows: data.length,
    validRows,
    invalidRows,
    duplicateCount: duplicates.length,
  };
}

/**
 * Detect duplicates in import data
 */
function detectDuplicates(data, mappings) {
  const duplicates = [];
  const requiredFields = (mappings || [])
    .filter(m => m.required)
    .map(m => m.sourceColumn || m.targetField);

  requiredFields.forEach(field => {
    const seen = {};
    data.forEach((row, idx) => {
      const val = String(row[field] || '').trim();
      if (!val) return;
      if (seen[val]) {
        seen[val].push(idx + 1);
      } else {
        seen[val] = [idx + 1];
      }
    });
    Object.entries(seen).forEach(([val, rows]) => {
      if (rows.length > 1) {
        duplicates.push({ field, value: val, rows, count: rows.length });
      }
    });
  });

  return duplicates;
}

/**
 * Transform import data using column mappings
 */
function transformImportData(rawData, mappings) {
  if (!mappings || mappings.length === 0) return rawData;

  return rawData.map(row => {
    const transformed = {};

    mappings.forEach(mapping => {
      const sourceCol = mapping.sourceColumn;
      let value = row[sourceCol];
      const targetField = mapping.targetField;

      // Apply transformations
      if (mapping.transformRule) {
        value = applyTransform(value, mapping.transformRule);
      }

      // Type casting
      switch (mapping.dataType) {
        case 'number':
        case 'currency':
          value = value !== '' && value !== null ? Number(value) : undefined;
          break;
        case 'boolean':
          value = ['true', '1', 'yes', 'نعم', 'صح'].includes(String(value).toLowerCase());
          break;
        case 'date':
          value = value ? new Date(value) : undefined;
          break;
        default:
          if (typeof value === 'string') value = value.trim();
      }

      if (value !== undefined && value !== '') {
        transformed[targetField] = value;
      }
    });

    return transformed;
  });
}

/**
 * Apply transformation rules (enhanced)
 */
function applyTransform(value, rule) {
  if (value === null || value === undefined) return value;

  const str = String(value);
  switch (rule) {
    case 'uppercase':
      return str.toUpperCase();
    case 'lowercase':
      return str.toLowerCase();
    case 'trim':
      return str.trim();
    case 'capitalize':
      return str.charAt(0).toUpperCase() + str.slice(1);
    case 'titleCase':
      return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
    case 'removeSpaces':
      return str.replace(/\s+/g, '');
    case 'normalizeSpaces':
      return str.replace(/\s+/g, ' ').trim();
    case 'normalizeArabic':
      return str.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    case 'removeArabicDiacritics':
      return str.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '');
    case 'saudiPhone': {
      // Normalize to +966 format
      let phone = str.replace(/[-\s()]/g, '');
      if (phone.startsWith('00966')) phone = '+966' + phone.substring(5);
      else if (phone.startsWith('966')) phone = '+' + phone;
      else if (phone.startsWith('05')) phone = '+966' + phone.substring(1);
      else if (phone.startsWith('5') && phone.length === 9) phone = '+966' + phone;
      return phone;
    }
    case 'cleanNumber':
      return str.replace(/[^0-9.-]/g, '');
    case 'extractDigits':
      return str.replace(/\D/g, '');
    case 'currency_sar': {
      const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? str : num.toFixed(2);
    }
    case 'percentToDecimal': {
      const pct = parseFloat(str.replace('%', ''));
      return isNaN(pct) ? str : (pct / 100).toString();
    }
    case 'booleanNormalize': {
      const trueVals = ['true', '1', 'yes', 'نعم', 'صح', 'موافق', 'y'];
      return trueVals.includes(str.toLowerCase().trim()) ? 'true' : 'false';
    }
    default:
      if (rule.startsWith('dateFormat:')) {
        return new Date(value).toISOString().split('T')[0];
      }
      if (rule.startsWith('prefix:')) {
        return rule.substring(7) + str;
      }
      if (rule.startsWith('suffix:')) {
        return str + rule.substring(7);
      }
      if (rule.startsWith('replace:')) {
        const [, from, to] = rule.match(/^replace:(.+?):(.*)$/) || [];
        return from ? str.replace(new RegExp(from, 'g'), to || '') : str;
      }
      if (rule.startsWith('substring:')) {
        const [start, end] = rule.substring(10).split(',').map(Number);
        return str.substring(start, end);
      }
      if (rule.startsWith('padStart:')) {
        const [len, ch] = rule.substring(9).split(',');
        return str.padStart(parseInt(len), ch || '0');
      }
      if (rule.startsWith('lookup:')) {
        // Format: lookup:key1=val1,key2=val2,...
        const pairs = rule.substring(7).split(',');
        const map = {};
        pairs.forEach(p => {
          const [k, v] = p.split('=');
          if (k && v) map[k.trim()] = v.trim();
        });
        return map[str.trim()] || str;
      }
      return value;
  }
}

module.exports = {
  parseExcel,
  parseCSV,
  parseJSON,
  suggestColumnMappings,
  validateImportData,
  detectDuplicates,
  transformImportData,
  applyTransform,
};
