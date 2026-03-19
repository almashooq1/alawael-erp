import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'contexts/SnackbarContext';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import qualityService from 'services/quality.service';
import logger from 'utils/logger';
import { demoData } from './constants';
import { statusColors } from '../../theme/palette';

const useQualityCompliance = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({ quality: [], audits: [], cases: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [quality, audits, cases, tickets] = await Promise.all([
        qualityService.getQualityRecords().catch(err => logger.warn('فشل تحميل سجلات الجودة', err)),
        qualityService.getAudits().catch(err => logger.warn('فشل تحميل التدقيقات', err)),
        qualityService.getCases().catch(err => logger.warn('فشل تحميل الحالات', err)),
        qualityService.getTickets().catch(err => logger.warn('فشل تحميل التذاكر', err)),
      ]);
      setData({
        quality: quality?.data || quality || demoData.quality,
        audits: audits?.data || audits || demoData.audits,
        cases: cases?.data || cases || demoData.cases,
        tickets: tickets?.data || tickets || demoData.tickets,
      });
    } catch (err) {
      logger.error('Quality data error:', err);
      setData(demoData);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        quality: editItem
          ? () => qualityService.updateQualityRecord(editItem._id, form)
          : () => qualityService.createQualityRecord(form),
        audits: editItem
          ? () => qualityService.updateAudit(editItem._id, form)
          : () => qualityService.createAudit(form),
        cases: editItem
          ? () => qualityService.updateCase(editItem._id, form)
          : () => qualityService.createCase(form),
        tickets: editItem
          ? () => qualityService.updateTicket(editItem._id, form)
          : () => qualityService.createTicket(form),
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
      message: 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          const del = {
            quality: () => qualityService.deleteQualityRecord(id),
            audits: () => qualityService.deleteAudit(id),
            cases: () => qualityService.deleteCase(id),
            tickets: () => qualityService.deleteTicket(id),
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

  const stats = [
    { label: 'نسبة الامتثال', value: '85%', color: statusColors.success },
    {
      label: 'تدقيقات جارية',
      value: (Array.isArray(data.audits) ? data.audits : []).filter(a => a.status === 'in-progress')
        .length,
      color: statusColors.info,
    },
    {
      label: 'حالات مفتوحة',
      value: (Array.isArray(data.cases) ? data.cases : []).filter(c => c.status === 'open').length,
      color: statusColors.warning,
    },
    {
      label: 'تذاكر معلقة',
      value: (Array.isArray(data.tickets) ? data.tickets : []).filter(t => t.status === 'open')
        .length,
      color: statusColors.error,
    },
  ];

  return {
    data,
    loading,
    activeTab,
    setActiveTab,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    confirmState,
    stats,
    loadData,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
  };
};

export default useQualityCompliance;
