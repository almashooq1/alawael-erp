/**
 * useCommunications — State & logic for CommunicationsSystem
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import apiClient from 'services/api.client';
import logger from 'utils/logger';
import { useConfirmDialog } from 'components/common/ConfirmDialog';
import { INITIAL_COMMUNICATION } from './communicationsConstants';

const useCommunications = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [communications, setCommunications] = useState([]);
  const [filteredCommunications, setFilteredCommunications] = useState([]);
  const [_selectedCommunication, setSelectedCommunication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, pending: 0, today: 0 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmState, showConfirm] = useConfirmDialog();
  const [newCommunication, setNewCommunication] = useState(INITIAL_COMMUNICATION);

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const loadCommunications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/communications');
      setCommunications(data);
    } catch (error) {
      logger.error('Error loading communications:', error);
      showSnackbar('خطأ في تحميل المراسلات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiClient.get('/communications/stats');
      setStats(data);
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  }, []);

  const filterCommunications = useCallback(() => {
    let filtered = [...communications];

    if (activeTab === 1) filtered = filtered.filter(c => c.type === 'incoming');
    if (activeTab === 2) filtered = filtered.filter(c => c.type === 'outgoing');
    if (activeTab === 3) filtered = filtered.filter(c => c.type === 'internal');
    if (activeTab === 4) filtered = filtered.filter(c => c.starred);
    if (activeTab === 5) filtered = filtered.filter(c => c.status === 'archived');

    if (searchQuery) {
      filtered = filtered.filter(
        c =>
          c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.recipientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') filtered = filtered.filter(c => c.type === filterType);
    if (filterStatus !== 'all') filtered = filtered.filter(c => c.status === filterStatus);
    if (filterPriority !== 'all') filtered = filtered.filter(c => c.priority === filterPriority);

    setFilteredCommunications(filtered);
  }, [communications, searchQuery, filterType, filterStatus, filterPriority, activeTab]);

  useEffect(() => {
    loadCommunications();
    loadStats();
  }, [loadCommunications, loadStats]);
  useEffect(() => {
    filterCommunications();
  }, [filterCommunications]);

  const handleCreateCommunication = async () => {
    try {
      const data = await apiClient.post('/communications', newCommunication);
      setCommunications([data, ...communications]);
      setShowNewDialog(false);
      setNewCommunication(INITIAL_COMMUNICATION);
      showSnackbar('تم إنشاء المراسلة بنجاح', 'success');
      loadStats();
    } catch (error) {
      logger.error('Error creating communication:', error);
      showSnackbar('خطأ في إنشاء المراسلة', 'error');
    }
  };

  const handleToggleStar = async id => {
    try {
      const communication = communications.find(c => c.id === id);
      await apiClient.patch(`/communications/${id}`, { starred: !communication.starred });
      setCommunications(communications.map(c => (c.id === id ? { ...c, starred: !c.starred } : c)));
    } catch (error) {
      logger.error('Error toggling star:', error);
    }
  };

  const handleArchive = async id => {
    try {
      await apiClient.patch(`/communications/${id}`, { status: 'archived' });
      setCommunications(communications.map(c => (c.id === id ? { ...c, status: 'archived' } : c)));
      showSnackbar('تم أرشفة المراسلة', 'success');
    } catch (error) {
      logger.error('Error archiving:', error);
      showSnackbar('خطأ في الأرشفة', 'error');
    }
  };

  const handleDelete = id => {
    showConfirm({
      title: 'حذف المراسلة',
      message: 'هل أنت متأكد من حذف هذه المراسلة؟',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/communications/${id}`);
          setCommunications(communications.filter(c => c.id !== id));
          showSnackbar('تم حذف المراسلة', 'success');
          loadStats();
        } catch (error) {
          logger.error('Error deleting:', error);
          showSnackbar('خطأ في الحذف', 'error');
        }
      },
    });
  };

  const formatDate = date => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });

  return {
    activeTab,
    setActiveTab,
    filteredCommunications,
    loading,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    showNewDialog,
    setShowNewDialog,
    stats,
    snackbar,
    closeSnackbar,
    confirmState,
    newCommunication,
    setNewCommunication,
    setSelectedCommunication,
    loadCommunications,
    handleCreateCommunication,
    handleToggleStar,
    handleArchive,
    handleDelete,
    formatDate,
  };
};

export default useCommunications;
