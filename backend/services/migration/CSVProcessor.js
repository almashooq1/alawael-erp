/**
 * CSV Import/Export Service
 * Handles reading and writing CSV files for migration
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

class CSVProcessor {
  constructor(options = {}) {
    this.options = {
      delimiter: options.delimiter || ',',
      encoding: options.encoding || 'utf-8',
      maxRowsPerChunk: options.maxRowsPerChunk || 1000,
      ...options,
    };

    this.importedData = [];
    this.errorLog = [];
  }

  /**
   * Import CSV file
   */
  async importCSV(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const results = [];
        const errors = [];
        let lineNumber = 1;

        const parser = parse({
          delimiter: options.delimiter || this.options.delimiter,
          columns: options.columns === true,
          skip_empty_lines: true,
          relax_quotes: true,
          encoding: this.options.encoding,
        });

        parser.on('readable', function () {
          let record;
          while ((record = parser.read()) !== null) {
            try {
              lineNumber++;
              if (Array.isArray(record) && options.columns) {
                // Record is already parsed as object
                results.push(record);
              } else {
                results.push(record);
              }
            } catch (error) {
              errors.push({
                line: lineNumber,
                error: error.message,
                record,
              });
            }
          }
        });

        parser.on('error', (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });

        parser.on('end', () => {
          this.importedData = results;
          resolve({
            success: true,
            recordCount: results.length,
            errorCount: errors.length,
            data: results,
            errors,
            filePath,
            importTime: new Date().toISOString(),
          });
        });

        const stream = fs.createReadStream(filePath, { encoding: this.options.encoding });
        stream.pipe(parser);
      } catch (error) {
        reject(new Error(`Failed to import CSV: ${error.message}`));
      }
    });
  }

  /**
   * Import CSV in chunks (for large files)
   */
  async importCSVInChunks(filePath, chunkSize = null) {
    return new Promise((resolve, reject) => {
      try {
        const results = [];
        const chunks = [];
        const maxRowsPerChunk = chunkSize || this.options.maxRowsPerChunk;
        let currentChunk = [];
        let lineNumber = 0;

        const parser = parse({
          delimiter: this.options.delimiter,
          columns: true,
          skip_empty_lines: true,
        });

        parser.on('readable', function () {
          let record;
          while ((record = parser.read()) !== null) {
            lineNumber++;
            currentChunk.push(record);
            results.push(record);

            if (currentChunk.length >= maxRowsPerChunk) {
              chunks.push([...currentChunk]);
              currentChunk = [];
            }
          }
        });

        parser.on('error', (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });

        parser.on('end', () => {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
          }

          resolve({
            success: true,
            totalRecords: lineNumber,
            chunkCount: chunks.length,
            chunks,
            data: results,
            importTime: new Date().toISOString(),
          });
        });

        const stream = fs.createReadStream(filePath, { encoding: this.options.encoding });
        stream.pipe(parser);
      } catch (error) {
        reject(new Error(`Failed to import CSV: ${error.message}`));
      }
    });
  }

  /**
   * Export data to CSV
   */
  async exportToCSV(data, filePath, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!Array.isArray(data) || data.length === 0) {
          reject(new Error('Data must be a non-empty array'));
          return;
        }

        // Get column headers from first record
        const headers = Object.keys(data[0]);

        const stringifier = stringify({
          header: true,
          columns: options.columns || headers,
          delimiter: options.delimiter || this.options.delimiter,
          encoding: this.options.encoding,
        });

        stringifier.on('error', (error) => {
          reject(new Error(`CSV stringify error: ${error.message}`));
        });

        const writeStream = fs.createWriteStream(filePath, {
          encoding: this.options.encoding,
        });

        writeStream.on('error', (error) => {
          reject(new Error(`File write error: ${error.message}`));
        });

        stringifier.pipe(writeStream);

        for (const record of data) {
          stringifier.write(record);
        }

        stringifier.end();

        writeStream.on('finish', () => {
          resolve({
            success: true,
            recordCount: data.length,
            filePath,
            fileSize: fs.statSync(filePath).size,
            exportTime: new Date().toISOString(),
          });
        });
      } catch (error) {
        reject(new Error(`Failed to export CSV: ${error.message}`));
      }
    });
  }

  /**
   * Transform CSV data before import
   */
  transformData(data, transformRules) {
    return data.map((record, index) => {
      const transformed = { ...record };

      for (const [field, rule] of Object.entries(transformRules)) {
        if (transformed.hasOwnProperty(field)) {
          if (typeof rule === 'function') {
            transformed[field] = rule(transformed[field], transformed, index);
          } else if (rule.mapping) {
            transformed[field] = rule.mapping[transformed[field]] || transformed[field];
          } else if (rule.type) {
            transformed[field] = this.convertType(transformed[field], rule.type);
          }
        }
      }

      return transformed;
    });
  }

  /**
   * Convert value to specified type
   */
  convertType(value, type) {
    if (value === null || value === undefined || value === '') return null;

    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'integer':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        return value === true || value === '1' || value === 'true' || value === 'yes';
      case 'date':
        return new Date(value).toISOString();
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  /**
   * Map CSV columns to target fields
   */
  mapColumns(data, columnMapping) {
    return data.map((record) => {
      const mapped = {};

      for (const [sourceCol, targetCol] of Object.entries(columnMapping)) {
        if (record.hasOwnProperty(sourceCol)) {
          mapped[targetCol] = record[sourceCol];
        }
      }

      return mapped;
    });
  }

  /**
   * Filter CSV data
   */
  filterData(data, filterFn) {
    return data.filter(filterFn);
  }

  /**
   * Sample CSV file (read first N rows)
   */
  async sampleCSV(filePath, sampleSize = 10) {
    return new Promise((resolve, reject) => {
      try {
        const samples = [];
        let count = 0;
        let resolved = false;

        const parser = parse({
          delimiter: this.options.delimiter,
          columns: true,
          skip_empty_lines: true,
        });

        parser.on('readable', function () {
          let record;
          while ((record = parser.read()) !== null && count < sampleSize) {
            samples.push(record);
            count++;
          }

          if (count >= sampleSize && !resolved) {
            resolved = true;
            parser.destroy();
            resolve({
              success: true,
              sampleSize: samples.length,
              samples,
              filePath,
            });
          }
        });

        parser.on('error', (error) => {
          if (!resolved) {
            resolved = true;
            reject(new Error(`CSV sampling error: ${error.message}`));
          }
        });

        parser.on('end', () => {
          if (!resolved) {
            resolved = true;
            resolve({
              success: true,
              sampleSize: samples.length,
              samples,
              filePath,
            });
          }
        });

        const stream = fs.createReadStream(filePath, { encoding: this.options.encoding });
        stream.pipe(parser);
      } catch (error) {
        reject(new Error(`Failed to sample CSV: ${error.message}`));
      }
    });
  }

  /**
   * Get CSV file info
   */
  async getCSVInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      let rowCount = 0;
      const columns = new Set();

      return new Promise((resolve, reject) => {
        const parser = parse({
          delimiter: this.options.delimiter,
          skip_empty_lines: true,
        });

        let isFirstRow = true;

        parser.on('readable', function () {
          let record;
          while ((record = parser.read()) !== null) {
            if (isFirstRow) {
              for (const col of record) {
                columns.add(col);
              }
              isFirstRow = false;
            } else {
              rowCount++;
            }
          }
        });

        parser.on('error', (error) => {
          reject(new Error(`CSV info error: ${error.message}`));
        });

        parser.on('end', () => {
          resolve({
            filePath,
            fileSize: stats.size,
            fileSizeKB: (stats.size / 1024).toFixed(2),
            rowCount,
            columnCount: columns.size,
            columns: Array.from(columns),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          });
        });

        const stream = fs.createReadStream(filePath, { encoding: this.options.encoding });
        stream.pipe(parser);
      });
    } catch (error) {
      throw new Error(`Failed to get CSV info: ${error.message}`);
    }
  }

  /**
   * Validate CSV structure
   */
  async validateCSVStructure(filePath, expectedColumns) {
    try {
      const info = await this.getCSVInfo(filePath);

      const validation = {
        valid: true,
        errors: [],
        warnings: [],
      };

      if (expectedColumns && Array.isArray(expectedColumns)) {
        const missingColumns = expectedColumns.filter((col) => !info.columns.includes(col));
        const extraColumns = info.columns.filter((col) => !expectedColumns.includes(col));

        if (missingColumns.length > 0) {
          validation.valid = false;
          validation.errors.push(`Missing columns: ${missingColumns.join(', ')}`);
        }

        if (extraColumns.length > 0) {
          validation.warnings.push(`Extra columns: ${extraColumns.join(', ')}`);
        }
      }

      if (info.rowCount === 0) {
        validation.valid = false;
        validation.errors.push('CSV file is empty');
      }

      return { ...info, ...validation };
    } catch (error) {
      throw new Error(`CSV validation error: ${error.message}`);
    }
  }

  /**
   * Get import errors
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Clear import data
   */
  clearData() {
    this.importedData = [];
    this.errorLog = [];
    return this;
  }
}

module.exports = CSVProcessor;
