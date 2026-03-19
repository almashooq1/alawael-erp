/**
 * @deprecated This file is part of an older split implementation.
 * The active version is the monolithic ../DocumentsMgmt.js which takes
 * priority in webpack module resolution over this directory index.
 * Do NOT use or maintain this file — all changes go to ../DocumentsMgmt.js.
 */

/**
 * useDocumentsPage — state, effects & handlers for Documents page
 * هوك مخصص لصفحة إدارة المستندات
 */

import { useState, useEffect } from 'react';
import documentService from 'services/documentService';
import logger from 'utils/logger';
import { useSnackbar } from '../../contexts/SnackbarContext';

export const formatFileSize = bytes => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

export default function useDocumentsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const showSnackbar = useSnackbar();

  const fetchDashboardData = async () => {
    try {
      const res = await documentService.getDashboard();
      const data = res?.data || res;
      if (data) {
        setStats(data.stats || data);
        setCategories(data.categories || []);
      }
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      showSnackbar('خطأ في تحميل بيانات لوحة التحكم', 'error');
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory) filters.category = selectedCategory;

      const res = await documentService.getAllDocuments(filters);
      const data = res?.data || res;
      setDocuments(data?.documents || data || []);
    } catch (error) {
      logger.error('Error fetching documents:', error);
      showSnackbar('خطأ في تحميل المستندات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await documentService.getAnalytics();
      setAnalyticsData(res?.data || res);
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      showSnackbar('خطأ في تحميل التحليلات', 'error');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run once on mount
  }, []);

  useEffect(() => {
    if (activeTab === 4) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: fetchAnalytics is stable
  }, [activeTab]);

  const handleUploadDocument = async event => {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      const data = await documentService.uploadDocument(
        null,
        formData.get('title'),
        formData.get('description'),
        formData.get('category'),
        formData
          .get('tags')
          ?.split(',')
          .map(t => t.trim())
          .join(',')
      );

      if (data?.success !== false) {
        setUploadDialogOpen(false);
        fetchDocuments();
        fetchDashboardData();
        showSnackbar('تم رفع المستند بنجاح', 'success');
      }
    } catch (error) {
      logger.error('Error uploading document:', error);
      showSnackbar('خطأ في رفع المستند', 'error');
    }
  };

  return {
    activeTab,
    setActiveTab,
    documents,
    categories,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    uploadDialogOpen,
    setUploadDialogOpen,
    detailsDialogOpen,
    setDetailsDialogOpen,
    selectedDocument,
    setSelectedDocument,
    analyticsData,
    fetchDocuments,
    handleUploadDocument,
  };
}
