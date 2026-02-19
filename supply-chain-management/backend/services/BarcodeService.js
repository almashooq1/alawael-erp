const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger.js');
const BarcodeLog = require('../models/BarcodeLog.js');

class BarcodeService {
  /**
   * Generate QR Code with error correction
   * @param {string} data - Data to encode
   * @param {string} errorCorrectionLevel - L|M|Q|H (default: M)
   * @returns {Promise<string>} - Data URL of generated QR code
   */
  async generateQRCode(data, errorCorrectionLevel = 'M') {
    try {
      if (!data || data.trim() === '') {
        throw new Error('Data is required');
      }

      const qrDataUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: errorCorrectionLevel,
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      logger.info(`QR Code generated successfully for data: ${data.substring(0, 50)}`);

      // Log the operation
      await BarcodeLog.create({
        type: 'QR',
        data: data,
        errorCorrection: errorCorrectionLevel,
        status: 'success',
        generatedBy: 'system',
      });

      return qrDataUrl;
    } catch (error) {
      logger.error(`Error generating QR Code: ${error.message}`);
      throw new Error(`QR Code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Barcode in specified format
   * @param {string} data - Data to encode
   * @param {string} format - FORMAT (CODE128|CODE39|EAN13|UPC)
   * @returns {Promise<string>} - Data URL of generated barcode
   */
  async generateBarcode(data, format = 'CODE128') {
    try {
      if (!data || data.trim() === '') {
        throw new Error('Data is required');
      }

      const validFormats = ['CODE128', 'CODE39', 'EAN13', 'UPC'];
      if (!validFormats.includes(format)) {
        throw new Error(`Invalid format. Use: ${validFormats.join(', ')}`);
      }

      const png = await bwipjs.toBuffer({
        bcid: format.toLowerCase(),
        text: data,
        scale: 3,
        height: 10,
        includetext: true,
      });

      const base64 = png.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      logger.info(`Barcode generated successfully for data: ${data} (${format})`);

      // Log the operation
      await BarcodeLog.create({
        type: 'BARCODE',
        data: data,
        format: format,
        status: 'success',
        generatedBy: 'system',
      });

      return dataUrl;
    } catch (error) {
      logger.error(`Error generating barcode: ${error.message}`);
      throw new Error(`Barcode generation failed: ${error.message}`);
    }
  }

  /**
   * Generate batch of codes
   * @param {Array} items - Array of items {data, type, format}
   * @param {Function} progressCallback - Callback for progress updates
   * @returns {Promise<Array>} - Array of generated codes
   */
  async generateBatchCodes(items, progressCallback = null) {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items must be a non-empty array');
      }

      if (items.length > 1000) {
        throw new Error('Maximum 1000 items allowed per batch');
      }

      const results = [];
      const batchStartTime = Date.now();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const { data, type = 'QR', format = 'CODE128' } = item;

        try {
          let code;
          if (type === 'QR') {
            code = await this.generateQRCode(data);
          } else if (type === 'BARCODE') {
            code = await this.generateBarcode(data, format);
          } else {
            throw new Error(`Unknown type: ${type}`);
          }

          results.push({
            data,
            type,
            format,
            code,
            status: 'success',
            index: i + 1,
          });

          // Update progress
          if (progressCallback) {
            progressCallback({
              current: i + 1,
              total: items.length,
              percentage: Math.round(((i + 1) / items.length) * 100),
            });
          }
        } catch (itemError) {
          results.push({
            data,
            type,
            status: 'error',
            error: itemError.message,
            index: i + 1,
          });

          logger.warn(`Error processing item ${i + 1}: ${itemError.message}`);
        }
      }

      const batchDuration = Date.now() - batchStartTime;
      logger.info(`Batch generation completed: ${results.length} items in ${batchDuration}ms`);

      // Log batch operation
      await BarcodeLog.create({
        type: 'BATCH',
        batchSize: items.length,
        successCount: results.filter(r => r.status === 'success').length,
        errorCount: results.filter(r => r.status === 'error').length,
        duration: batchDuration,
        status: 'completed',
        generatedBy: 'system',
      });

      return results;
    } catch (error) {
      logger.error(`Batch generation error: ${error.message}`);
      throw new Error(`Batch generation failed: ${error.message}`);
    }
  }

  /**
   * Get generation statistics
   * @returns {Promise<Object>} - Statistics object
   */
  async getStatistics() {
    try {
      const stats = await BarcodeLog.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            errorCount: {
              $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] },
            },
          },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error(`Error getting statistics: ${error.message}`);
      throw new Error(`Statistics retrieval failed: ${error.message}`);
    }
  }
}

module.exports = new BarcodeService();
