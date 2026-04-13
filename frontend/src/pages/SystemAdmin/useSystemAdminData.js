/**
 * useSystemAdminData.js — Data fetching, CRUD, and dialog state
 * Custom hook extracted from SystemAdmin.js
 */
import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'contexts/SnackbarContext';
import systemService from 'services/system.service';
import logger from 'utils/logger';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { DEMO_DATA } from './systemAdmin.demoData';

const useSystemAdminData = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({
    inventory: [],
    ecommerce: [],
    templates: [],
    approvals: [],
    notifications: [],
    rbac: [],
    civilDefense: [],
    qiwa: [],
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [inventory, ecommerce, templates, approvals, notifications, rbac, civilDefense, qiwa] =
        await Promise.all([
          systemService.getInventory().catch(err => logger.warn('فشل تحميل المخزون', err)),
          systemService
            .getEcommerceProducts()
            .catch(err => logger.warn('فشل تحميل منتجات التجارة الإلكترونية', err)),
          systemService.getTemplates().catch(err => logger.warn('فشل تحميل القوالب', err)),
          systemService
            .getApprovalRequests()
            .catch(err => logger.warn('فشل تحميل طلبات الموافقة', err)),
          systemService
            .getNotificationTemplates()
            .catch(err => logger.warn('فشل تحميل قوالب الإشعارات', err)),
          systemService.getRoles().catch(err => logger.warn('فشل تحميل الأدوار', err)),
          systemService
            .getCivilDefenseItems()
            .catch(err => logger.warn('فشل تحميل عناصر الدفاع المدني', err)),
          systemService.getQiwaRecords().catch(err => logger.warn('فشل تحميل سجلات قوى', err)),
        ]);
      setData({
        inventory: inventory?.data || inventory || DEMO_DATA.inventory,
        ecommerce: ecommerce?.data || ecommerce || DEMO_DATA.ecommerce,
        templates: templates?.data || templates || DEMO_DATA.templates,
        approvals: approvals?.data || approvals || DEMO_DATA.approvals,
        notifications: notifications?.data || notifications || DEMO_DATA.notifications,
        rbac: rbac?.data || rbac || DEMO_DATA.rbac,
        civilDefense: civilDefense?.data || civilDefense || DEMO_DATA.civilDefense,
        qiwa: qiwa?.data || qiwa || DEMO_DATA.qiwa,
      });
    } catch (err) {
      logger.error('System data error:', err);
      setData(DEMO_DATA);
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
        inventory: editItem
          ? () => systemService.updateInventoryItem(editItem._id, form)
          : () => systemService.createInventoryItem(form),
        ecommerce: editItem
          ? () => systemService.updateEcommerceProduct(editItem._id, form)
          : () => systemService.createEcommerceProduct(form),
        templates: editItem
          ? () => systemService.updateTemplate(editItem._id, form)
          : () => systemService.createTemplate(form),
        approvals: editItem
          ? () => systemService.updateApprovalRequest(editItem._id, form)
          : () => systemService.createApprovalRequest(form),
        notifications: editItem
          ? () => systemService.updateNotificationTemplate(editItem._id, form)
          : () => systemService.createNotificationTemplate(form),
        rbac: editItem
          ? () => systemService.updateRole(editItem._id, form)
          : () => systemService.createRole(form),
        civilDefense: editItem
          ? () => systemService.updateCivilDefenseItem(editItem._id, form)
          : () => systemService.createCivilDefenseItem(form),
        qiwa: editItem
          ? () => systemService.updateQiwaRecord(editItem._id, form)
          : () => systemService.createQiwaRecord(form),
      };
      if (svc[dialogType]) await svc[dialogType]();
      showSnackbar(editItem ? 'تم التحديث بنجاح' : 'تم الإنشاء بنجاح', 'success');
      setDialogOpen(false);
      loadData();
    } catch (err) {
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
            inventory: () => systemService.deleteInventoryItem(id),
            ecommerce: () => systemService.deleteEcommerceProduct(id),
            templates: () => systemService.deleteTemplate(id),
            approvals: () => systemService.deleteApprovalRequest(id),
            notifications: () => systemService.deleteNotificationTemplate(id),
            rbac: () => systemService.deleteRole(id),
            civilDefense: () => systemService.deleteCivilDefenseItem(id),
            qiwa: () => systemService.deleteQiwaRecord(id),
          };
          if (del[type]) await del[type]();
          showSnackbar('تم الحذف بنجاح', 'success');
          loadData();
        } catch (err) {
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

export default useSystemAdminData;
