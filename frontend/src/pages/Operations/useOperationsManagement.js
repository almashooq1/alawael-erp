/**
 * useOperationsManagement — Custom hook for operations state & logic
 */
import { useState, useEffect, useCallback } from 'react';
import operationsService from '../../services/operations.service';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import logger from '../../utils/logger';
import demoData from './demoData';
import { TABS } from './constants';
import { statusColors } from '../../theme/palette';

const useOperationsManagement = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({
    assets: [],
    equipment: [],
    maintenance: [],
    schedules: [],
    licenses: [],
    branches: [],
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assets, equipment, maintenance, schedules, licenses, branches] = await Promise.all([
        operationsService.getAssets().catch(err => logger.warn('فشل تحميل الأصول', err)),
        operationsService.getEquipment().catch(err => logger.warn('فشل تحميل المعدات', err)),
        operationsService.getMaintenance().catch(err => logger.warn('فشل تحميل الصيانة', err)),
        operationsService.getSchedules().catch(err => logger.warn('فشل تحميل الجداول', err)),
        operationsService.getLicenses().catch(err => logger.warn('فشل تحميل التراخيص', err)),
        operationsService.getBranches().catch(err => logger.warn('فشل تحميل الفروع', err)),
      ]);
      setData({
        assets: assets?.data || assets || demoData.assets,
        equipment: equipment?.data || equipment || demoData.equipment,
        maintenance: maintenance?.data || maintenance || demoData.maintenance,
        schedules: schedules?.data || schedules || demoData.schedules,
        licenses: licenses?.data || licenses || demoData.licenses,
        branches: branches?.data || branches || demoData.branches,
      });
    } catch (err) {
      logger.error('Operations data load error:', err);
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
      const svcMap = {
        assets: editItem
          ? () => operationsService.updateAsset(editItem._id, form)
          : () => operationsService.createAsset(form),
        equipment: editItem
          ? () => operationsService.updateEquipment(editItem._id, form)
          : () => operationsService.createEquipment(form),
        maintenance: editItem
          ? () => operationsService.updateMaintenance(editItem._id, form)
          : () => operationsService.createMaintenance(form),
        schedules: editItem
          ? () => operationsService.updateSchedule(editItem._id, form)
          : () => operationsService.createSchedule(form),
        licenses: editItem
          ? () => operationsService.updateLicense(editItem._id, form)
          : () => operationsService.createLicense(form),
        branches: editItem
          ? () => operationsService.updateBranch(editItem._id, form)
          : () => operationsService.createBranch(form),
      };
      if (svcMap[dialogType]) await svcMap[dialogType]();
      showSnackbar(editItem ? 'تم التحديث بنجاح' : 'تم الإنشاء بنجاح', 'success');
      setDialogOpen(false);
      loadData();
    } catch (err) {
      showSnackbar('حدث خطأ أثناء الحفظ', 'error');
      logger.error('Save error:', err);
    }
  };

  const handleDelete = (type, id) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          const delMap = {
            assets: () => operationsService.deleteAsset(id),
            equipment: () => operationsService.deleteEquipment(id),
            maintenance: () => operationsService.deleteMaintenance(id),
            schedules: () => operationsService.deleteSchedule(id),
            licenses: () => operationsService.deleteLicense(id),
            branches: () => operationsService.deleteBranch(id),
          };
          if (delMap[type]) await delMap[type]();
          showSnackbar('تم الحذف بنجاح', 'success');
          loadData();
        } catch (err) {
          showSnackbar('حدث خطأ أثناء الحذف', 'error');
        }
      },
    });
  };

  const stats = [
    {
      label: 'إجمالي الأصول',
      value: (Array.isArray(data.assets) ? data.assets : []).length,
      color: statusColors.success,
    },
    {
      label: 'المعدات العاملة',
      value: (Array.isArray(data.equipment) ? data.equipment : []).filter(
        e => e.status === 'operational'
      ).length,
      color: statusColors.info,
    },
    {
      label: 'صيانة معلقة',
      value: (Array.isArray(data.maintenance) ? data.maintenance : []).filter(
        m => m.status === 'pending'
      ).length,
      color: statusColors.warning,
    },
    {
      label: 'تراخيص منتهية',
      value: (Array.isArray(data.licenses) ? data.licenses : []).filter(l => l.status === 'expired')
        .length,
      color: statusColors.error,
    },
  ];

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
    stats,
    tabs: TABS,
  };
};

export default useOperationsManagement;
