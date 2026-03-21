/**
 * usePerformanceData.js — Data fetching, CRUD, and dialog state
 * Custom hook extracted from PerformanceEvaluation.js
 */
import { useState, useEffect, useCallback, useMemo } from 'react';

import { useSnackbar } from 'contexts/SnackbarContext';
import systemService from 'services/system.service';
import logger from 'utils/logger';
import { statusColors } from '../../../theme/palette';
import { useConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DEMO_DATA } from './performanceEvaluation.constants';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupsIcon from '@mui/icons-material/Groups';
import WarningIcon from '@mui/icons-material/Warning';

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
      const [evaluations, succession, medical, scheduler] = await Promise.all([
        systemService.getEvaluations().catch(err => logger.warn('فشل تحميل التقييمات', err)),
        systemService.getSuccessionPlans().catch(err => logger.warn('فشل تحميل خطط التعاقب', err)),
        systemService.getMedicalFiles().catch(err => logger.warn('فشل تحميل الملفات الطبية', err)),
        systemService.getSchedulerTasks().catch(err => logger.warn('فشل تحميل مهام الجدولة', err)),
      ]);
      setData({
        evaluations: evaluations?.data || evaluations || DEMO_DATA.evaluations,
        succession: succession?.data || succession || DEMO_DATA.succession,
        medical: medical?.data || medical || DEMO_DATA.medical,
        scheduler: scheduler?.data || scheduler || DEMO_DATA.scheduler,
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
          ? () => systemService.updateEvaluation(editItem._id, form)
          : () => systemService.createEvaluation(form),
        succession: editItem
          ? () => systemService.updateSuccessionPlan(editItem._id, form)
          : () => systemService.createSuccessionPlan(form),
        medical: editItem
          ? () => systemService.updateMedicalFile(editItem._id, form)
          : () => systemService.createMedicalFile(form),
        scheduler: editItem
          ? () => systemService.updateSchedulerTask(editItem._id, form)
          : () => systemService.createSchedulerTask(form),
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
            evaluations: () => systemService.deleteEvaluation(id),
            succession: () => systemService.deleteSuccessionPlan(id),
            medical: () => systemService.deleteMedicalFile(id),
            scheduler: () => systemService.deleteSchedulerTask(id),
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
