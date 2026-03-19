/**
 * useFleetManagement.js — State, data loading & CRUD handlers
 * حالة الأسطول وتحميل البيانات والمعاملات
 */
import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'contexts/SnackbarContext';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import fleetService from 'services/fleet.service';
import logger from 'utils/logger';
import demoData from './fleetManagement.demoData';
import { TABS } from './fleetManagement.constants';

const useFleetManagement = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({
    drivers: [],
    vehicles: [],
    trips: [],
    routes: [],
    accidents: [],
    gps: [],
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  /* ─── Load ─── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [drivers, vehicles, trips, routes, accidents, gps] = await Promise.all([
        fleetService.getDrivers().catch(err => logger.warn('فشل تحميل السائقين', err)),
        fleetService.getVehicles().catch(err => logger.warn('فشل تحميل المركبات', err)),
        fleetService.getTrips().catch(err => logger.warn('فشل تحميل الرحلات', err)),
        fleetService.getTransportRoutes().catch(err => logger.warn('فشل تحميل مسارات النقل', err)),
        fleetService.getAccidents().catch(err => logger.warn('فشل تحميل الحوادث', err)),
        fleetService.getGPSLocations().catch(err => logger.warn('فشل تحميل مواقع GPS', err)),
      ]);
      setData({
        drivers: drivers?.data || drivers || demoData.drivers,
        vehicles: vehicles?.data || vehicles || demoData.vehicles,
        trips: trips?.data || trips || demoData.trips,
        routes: routes?.data || routes || demoData.routes,
        accidents: accidents?.data || accidents || demoData.accidents,
        gps: gps?.data || gps || demoData.gps,
      });
    } catch (err) {
      logger.error('Fleet data load error:', err);
      setData(demoData);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Open handlers ─── */
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

  /* ─── Save ─── */
  const handleSave = async () => {
    try {
      const serviceMap = {
        drivers: editItem
          ? () => fleetService.updateDriver(editItem._id, form)
          : () => fleetService.createDriver(form),
        vehicles: editItem
          ? () => fleetService.updateVehicle(editItem._id, form)
          : () => fleetService.createVehicle(form),
        trips: editItem
          ? () => fleetService.updateTrip(editItem._id, form)
          : () => fleetService.createTrip(form),
        routes: editItem
          ? () => fleetService.updateTransportRoute(editItem._id, form)
          : () => fleetService.createTransportRoute(form),
        accidents: editItem
          ? () => fleetService.updateAccident(editItem._id, form)
          : () => fleetService.createAccident(form),
      };
      if (serviceMap[dialogType]) await serviceMap[dialogType]();
      showSnackbar(editItem ? 'تم التحديث بنجاح' : 'تم الإنشاء بنجاح', 'success');
      setDialogOpen(false);
      loadData();
    } catch (err) {
      showSnackbar('حدث خطأ أثناء الحفظ', 'error');
      logger.error('Save error:', err);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = (type, id) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذه المركبة؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          const deleteMap = {
            drivers: () => fleetService.deleteDriver(id),
            vehicles: () => fleetService.deleteVehicle(id),
            trips: () => fleetService.deleteTrip(id),
            routes: () => fleetService.deleteTransportRoute(id),
            accidents: () => fleetService.deleteAccident(id),
          };
          if (deleteMap[type]) await deleteMap[type]();
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
    loadData,
    dialogOpen,
    setDialogOpen,
    dialogType,
    editItem,
    form,
    setForm,
    openCreate,
    openEdit,
    handleSave,
    handleDelete,
    confirmState,
    TABS,
  };
};

export default useFleetManagement;
