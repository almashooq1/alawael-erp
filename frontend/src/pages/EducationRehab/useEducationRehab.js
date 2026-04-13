/**
 * useEducationRehab – state, data fetching & CRUD handlers.
 */
import { useState, useEffect, useCallback } from 'react';
import educationService from 'services/education.service';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { demoData, tabs } from './constants';

const useEducationRehab = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({
    knowledge: [],
    cms: [],
    montessori: [],
    programs: [],
    community: [],
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [knowledge, cms, montessori, programs, community] = await Promise.all([
        educationService
          .getArticles()
          .catch(err => logger.warn('فشل تحميل المقالات المعرفية', err)),
        educationService.getContent().catch(err => logger.warn('فشل تحميل صفحات CMS', err)),
        educationService
          .getMontessoriPrograms()
          .catch(err => logger.warn('فشل تحميل برامج مونتيسوري', err)),
        educationService.getPrograms().catch(err => logger.warn('فشل تحميل البرامج المتخصصة', err)),
        educationService
          .getCommunityEvents()
          .catch(err => logger.warn('فشل تحميل فعاليات المجتمع', err)),
      ]);
      setData({
        knowledge: knowledge?.data || knowledge || demoData.knowledge,
        cms: cms?.data || cms || demoData.cms,
        montessori: montessori?.data || montessori || demoData.montessori,
        programs: programs?.data || programs || demoData.programs,
        community: community?.data || community || demoData.community,
      });
    } catch (err) {
      logger.error('Education data error:', err);
      setData(demoData);
    } finally {
      setLoading(false);
    }
     
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
        knowledge: editItem
          ? () => educationService.updateArticle(editItem._id, form)
          : () => educationService.createArticle(form),
        cms: editItem
          ? () => educationService.updateContent(editItem._id, form)
          : () => educationService.createContent(form),
        montessori: editItem
          ? () => educationService.updateMontessoriProgram(editItem._id, form)
          : () => educationService.createMontessoriProgram(form),
        programs: editItem
          ? () => educationService.updateProgram(editItem._id, form)
          : () => educationService.createProgram(form),
        community: editItem
          ? () => educationService.updateCommunityEvent(editItem._id, form)
          : () => educationService.createCommunityEvent(form),
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
      message: 'هل أنت متأكد من حذف هذا البرنامج؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          const del = {
            knowledge: () => educationService.deleteArticle(id),
            cms: () => educationService.deleteContent(id),
            montessori: () => educationService.deleteMontessoriProgram(id),
            programs: () => educationService.deleteProgram(id),
            community: () => educationService.deleteCommunityEvent(id),
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
    activeTab,
    setActiveTab,
    data,
    loading,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    confirmState,
    loadData,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    currentTabKey: tabs[activeTab]?.key,
  };
};

export default useEducationRehab;
