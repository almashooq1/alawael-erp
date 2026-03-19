/**
 * Barcode Service
 * Frontend service for barcode operations
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const BARCODE_API = `${API_BASE}/barcodes`;

export const BarcodeService = {
  /**
   * Generate a new barcode
   */
  generateBarcode: async barcodeData => {
    try {
      const response = await axios.post(`${BARCODE_API}/generate`, barcodeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get barcode by ID
   */
  getBarcodeById: async id => {
    try {
      const response = await axios.get(`${BARCODE_API}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get barcode by code
   */
  getBarcodeByCode: async code => {
    try {
      const response = await axios.get(`${BARCODE_API}/code/${code}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * List all barcodes with filters
   */
  listBarcodes: async (filters = {}) => {
    try {
      const response = await axios.get(BARCODE_API, { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Record a barcode scan
   */
  scanBarcode: async scanData => {
    try {
      const response = await axios.post(`${BARCODE_API}/scan`, scanData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get scan history for a barcode
   */
  getScanHistory: async barcodeId => {
    try {
      const response = await axios.get(`${BARCODE_API}/${barcodeId}/scans`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update barcode
   */
  updateBarcode: async (id, updates) => {
    try {
      const response = await axios.put(`${BARCODE_API}/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Deactivate barcode
   */
  deactivateBarcode: async (id, reason = '') => {
    try {
      const response = await axios.delete(`${BARCODE_API}/${id}`, {
        data: { reason },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Generate batch of barcodes
   */
  generateBatch: async batchData => {
    try {
      const response = await axios.post(`${BARCODE_API}/batch/generate`, batchData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get barcodes in a batch
   */
  getBatchBarcodes: async batchId => {
    try {
      const response = await axios.get(`${BARCODE_API}/batch/${batchId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get barcode statistics
   */
  getStatistics: async () => {
    try {
      const response = await axios.get(`${BARCODE_API}/stats/overview`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Download barcode as image
   */
  downloadBarcode: async (barcodeId, format = 'PNG') => {
    try {
      const response = await axios.get(`${BARCODE_API}/${barcodeId}/download`, {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Export barcodes
   */
  exportBarcodes: async (filters = {}, format = 'CSV') => {
    try {
      const response = await axios.get(`${BARCODE_API}/export`, {
        params: { ...filters, format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default BarcodeService;
