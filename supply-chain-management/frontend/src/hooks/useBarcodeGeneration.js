import { useState, useCallback } from 'react';
import apiClient from '../utils/api';

/**
 * Custom Hook for Barcode & QR Code Generation
 * Handles state management and API integration
 */
export const useBarcodeGeneration = () => {
  const [generatedCode, setGeneratedCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [statistics, setStatistics] = useState(null);

  /**
   * Generate QR Code
   */
  const generateQRCode = useCallback(async (data, errorCorrectionLevel = 'M') => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/barcode/qr-code', { data, errorCorrectionLevel });

      setGeneratedCode({
        type: 'QR',
        data: data,
        code: response.data.code,
        generatedAt: response.data.generatedAt,
      });

      return response.data.code;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      console.error('QR Code generation error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate Barcode
   */
  const generateBarcode = useCallback(async (data, format = 'CODE128') => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/barcode/barcode', { data, format });

      setGeneratedCode({
        type: 'BARCODE',
        data: data,
        format: format,
        code: response.data.code,
        generatedAt: response.data.generatedAt,
      });

      return response.data.code;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      console.error('Barcode generation error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate batch of codes
   */
  const generateBatch = useCallback(async items => {
    setLoading(true);
    setError(null);
    setBatchProgress(0);

    try {
      const response = await apiClient.post('/api/barcode/batch', { items });

      setBatchProgress(100);

      const batchResults = {
        type: 'BATCH',
        totalItems: response.data.totalItems,
        successCount: response.data.successCount,
        errorCount: response.data.errorCount,
        results: response.data.results,
        generatedAt: response.data.generatedAt,
      };

      setGeneratedCode(batchResults);
      return batchResults;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      console.error('Batch generation error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
      setBatchProgress(0);
    }
  }, []);

  /**
   * Fetch statistics
   */
  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/barcode/statistics');

      setStatistics(response.data.statistics);
      return response.data.statistics;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      console.error('Statistics fetch error:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Download code as image
   */
  const downloadCode = useCallback(
    (filename = 'barcode.png') => {
      if (!generatedCode?.code) {
        setError('No code generated to download');
        return;
      }

      const link = document.createElement('a');
      link.href = generatedCode.code;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [generatedCode]
  );

  /**
   * Copy code to clipboard
   */
  const copyToClipboard = useCallback(async () => {
    if (!generatedCode?.code) {
      setError('No code to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedCode.code);
      return true;
    } catch (err) {
      setError('Failed to copy code');
      return false;
    }
  }, [generatedCode]);

  /**
   * Clear all state
   */
  const clear = useCallback(() => {
    setGeneratedCode(null);
    setError(null);
    setBatchProgress(0);
  }, []);

  return {
    // Generated data
    generatedCode,
    loading,
    error,
    batchProgress,
    statistics,

    // Functions
    generateQRCode,
    generateBarcode,
    generateBatch,
    fetchStatistics,
    downloadCode,
    copyToClipboard,
    clear,

    // Utility
    hasCode: !!generatedCode,
  };
};

export default useBarcodeGeneration;
