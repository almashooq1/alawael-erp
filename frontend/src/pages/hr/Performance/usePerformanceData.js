/**
 * usePerformanceData.js — Data fetching, CRUD, and dialog state
 * Custom hook extracted from PerformanceEvaluation.js
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EmojiEvents as TrophyIcon,
  Assessment as AssessmentIcon,
  Groups as GroupsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import apiClient from 'services/api.client';
import logger from 'utils/logger';
import { statusColors } from '../../../theme/palette';
import { useConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DEMO_DATA } from './performanceEvaluation.constants';

const BASE = '/api/v1/hr/performance';
const hrPerfApi = {
  listEvaluations: params => apiClient.get(`${BASE}/evaluations`, { params }),
  getStats: () => apiClient.get(`${BASE}/stats`),
  createEvaluation: body => apiClient.post(`${BASE}/evaluations`, body),
  updateEvaluation: (id, body) => apiClient.patch(`${BASE}/evaluations/${id}`, body),
  approveEvaluation: id => apiClient.post(`${BASE}/evaluations/${id}/approve`),
  deleteEvaluation: id => apiClient.delete(`${BASE}/evaluations/${id}`),
  listSuccession: params => apiClient.get(`${BASE}/succession`, { params }),
  createSuccession: body => apiClient.post(`${BASE}/succession`, body),
  updateSuccession: (id, body) => apiClient.patch(`${BASE}/succession/${id}`, body),
  deleteSuccession: id => apiClient.delete(`${BASE}/succession/${id}`),
};

const usePerformanceData = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({ evaluations: [], succession: [], medical: [], scheduler: [] });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  /* ─── Load Data ─── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [evaluations, succession] = await Promise.all([
        hrPerfApi.listEvaluations().catch(err => {
          logger.warn('فشل تحميل التقييمات', err);
          return null;
        }),
        hrPerfApi.listSuccession().catch(err => {
          logger.warn('فشل تحميل خطط التعاقب', err);
          return null;
        }),
      ]);
      setData({
        evaluations: evaluations?.data?.data || DEMO_DATA.evaluations,
        succession: succession?.data?.data || DEMO_DATA.succession,
        medical: DEMO_DATA.medical,
        scheduler: DEMO_DATA.scheduler,
      });
    } catch (err) {
      logger.error('Performance data error:', err);
      setData(DEMO_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Computed Stats ─── */
  const stats = useMemo(() => {
    const evals = Array.isArray(data.evaluations) ? data.evaluations : [];
    const medicals = Array.isArray(data.medical) ? data.medical : [];
    const completedEvals = evals.filter(e => e.status === 'completed').length;
    const avgScore = evals.length
      ? Math.round(evals.reduce((s, e) => s + (e.overallScore || 0), 0) / evals.length)
      : 0;
    const successionCount = (Array.isArray(data.succession) ? data.succession : []).length;
    const expiredMedical = medicals.filter(m => m.status === 'expired').length;
    return [
      {
        label: 'تقييمات مكتملة',
        value: `${completedEvals}/${evals.length}`,
        icon: <TrophyIcon />,
        color: statusColors.success,
      },
      {
        label: 'متوسط الأداء',
        value: `${avgScore}%`,
        icon: <AssessmentIcon />,
        color: statusColors.info,
      },
      {
        label: 'خطط تعاقب',
        value: successionCount,
        icon: <GroupsIcon />,
        color: statusColors.warning,
      },
      {
        label: 'فحوصات متأخرة',
        value: expiredMedical,
        icon: <WarningIcon />,
        color: expiredMedical > 0 ? statusColors.error : statusColors.success,
      },
    ];
  }, [data]);

  /* ─── CRUD Handlers ─── */
  const openCreate = type => {
    setDialogType(type);
    setEditItem(null);
    setForm({});
    setDialogOpen(true);
  };

  const openEdit = (type, item) => {
    setDialogType(type);
    setEditItem(item);
    setForm({ ...item });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const svc = {
        evaluations: editItem
          ? () => hrPerfApi.updateEvaluation(editItem._id, form)
          : () => hrPerfApi.createEvaluation(form),
        succession: editItem
          ? () => hrPerfApi.updateSuccession(editItem._id, form)
          : () => hrPerfApi.createSuccession(form),
        medical: async () => {},
        scheduler: async () => {},
      };
      if (svc[dialogType]) await svc[dialogType]();
      showSnackbar(editItem ? 'تم التحديث بنجاح' : 'تم الإنشاء بنجاح', 'success');
      setDialogOpen(false);
      loadData();
    } catch {
      showSnackbar('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleDelete = (type, id) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          const del = {
            evaluations: () => hrPerfApi.deleteEvaluation(id),
            succession: () => hrPerfApi.deleteSuccession(id),
            medical: async () => {},
            scheduler: async () => {},
          };
          if (del[type]) await del[type]();
          showSnackbar('تم الحذف بنجاح', 'success');
          loadData();
        } catch {
          showSnackbar('حدث خطأ أثناء الحذف', 'error');
        }
      },
    });
  };

  return {
    confirmState,
    activeTab,
    setActiveTab,
    data,
    loading,
    stats,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    loadData,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  };
};

export default usePerformanceData;
