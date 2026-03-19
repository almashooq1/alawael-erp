/**
 * useFleetManagement.js
 * هوك مخصص لإدارة حالة الأسطول والإجراءات
 */
import { useState, useCallback, useEffect } from 'react';

// ─── Demo data (Arabic) ─────────────────────────────────────
const DEMO_DATA = {
  vehicles: [
    {
      id: 1,
      name: 'تويوتا هايلكس 2024',
      plate: 'أ ب ج 1234',
      type: 'شاحنة خفيفة',
      status: 'active',
      km: 45200,
    },
    {
      id: 2,
      name: 'نيسان باترول 2023',
      plate: 'د هـ و 5678',
      type: 'دفع رباعي',
      status: 'active',
      km: 62000,
    },
    {
      id: 3,
      name: 'ميتسوبيشي كانتر',
      plate: 'ز ح ط 9012',
      type: 'شاحنة',
      status: 'maintenance',
      km: 120300,
    },
    {
      id: 4,
      name: 'هيونداي H100',
      plate: 'ي ك ل 3456',
      type: 'فان',
      status: 'inactive',
      km: 88700,
    },
  ],
  drivers: [
    {
      id: 1,
      name: 'أحمد محمد',
      license: 'DL-001',
      phone: '0501234567',
      status: 'active',
      vehicle: 'تويوتا هايلكس 2024',
    },
    {
      id: 2,
      name: 'خالد العلي',
      license: 'DL-002',
      phone: '0559876543',
      status: 'active',
      vehicle: 'نيسان باترول 2023',
    },
    {
      id: 3,
      name: 'سعيد حسن',
      license: 'DL-003',
      phone: '0561112233',
      status: 'on_leave',
      vehicle: '',
    },
  ],
  maintenance: [
    {
      id: 1,
      vehicle: 'ميتسوبيشي كانتر',
      type: 'صيانة دورية',
      date: '2026-03-10',
      status: 'pending',
      cost: 1500,
    },
    {
      id: 2,
      vehicle: 'تويوتا هايلكس 2024',
      type: 'تغيير زيت',
      date: '2026-03-05',
      status: 'completed',
      cost: 350,
    },
  ],
  fuel: [
    {
      id: 1,
      vehicle: 'تويوتا هايلكس 2024',
      liters: 65,
      cost: 150,
      date: '2026-03-12',
      station: 'محطة أرامكو - الرياض',
    },
    {
      id: 2,
      vehicle: 'نيسان باترول 2023',
      liters: 80,
      cost: 184,
      date: '2026-03-11',
      station: 'محطة الدريس - جدة',
    },
    {
      id: 3,
      vehicle: 'هيونداي H100',
      liters: 45,
      cost: 103,
      date: '2026-03-09',
      station: 'محطة نفط - الدمام',
    },
  ],
  gps: [
    {
      id: 1,
      vehicle: 'تويوتا هايلكس 2024',
      lat: 24.7136,
      lng: 46.6753,
      speed: 60,
      lastUpdate: '2026-03-15 08:30',
    },
    {
      id: 2,
      vehicle: 'نيسان باترول 2023',
      lat: 21.4858,
      lng: 39.1925,
      speed: 0,
      lastUpdate: '2026-03-15 08:25',
    },
  ],
};

// ─── Default form fields per tab ────────────────────────────
const DEFAULT_FORMS = {
  vehicles: { name: '', plate: '', type: '', status: 'active', km: 0 },
  drivers: { name: '', license: '', phone: '', status: 'active', vehicle: '' },
  maintenance: { vehicle: '', type: '', date: '', status: 'pending', cost: 0 },
  fuel: { vehicle: '', liters: 0, cost: 0, date: '', station: '' },
};

const useFleetManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('vehicles');
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  // ─── Load data ──────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    // Simulate API call with demo data
    setTimeout(() => {
      setData({ ...DEMO_DATA });
      setLoading(false);
    }, 600);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Dialog actions ─────────────────────────────────────
  const openCreate = useCallback(type => {
    setDialogType(type);
    setEditItem(null);
    setForm(DEFAULT_FORMS[type] || {});
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((type, item) => {
    setDialogType(type);
    setEditItem(item);
    setForm({ ...item });
    setDialogOpen(true);
  }, []);

  // ─── Save handler ───────────────────────────────────────
  const handleSave = useCallback(() => {
    setData(prev => {
      const list = [...(prev[dialogType] || [])];
      if (editItem) {
        const idx = list.findIndex(x => x.id === editItem.id);
        if (idx !== -1) list[idx] = { ...form, id: editItem.id };
      } else {
        const maxId = list.reduce((m, x) => Math.max(m, x.id || 0), 0);
        list.push({ ...form, id: maxId + 1 });
      }
      return { ...prev, [dialogType]: list };
    });
    setDialogOpen(false);
    setEditItem(null);
    setForm({});
  }, [dialogType, editItem, form]);

  // ─── Delete handler ─────────────────────────────────────
  const handleDelete = useCallback((type, item) => {
    setConfirmState({
      open: true,
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف "${item.name || item.vehicle || item.id}"؟`,
      onConfirm: () => {
        setData(prev => ({
          ...prev,
          [type]: (prev[type] || []).filter(x => x.id !== item.id),
        }));
        setConfirmState(s => ({ ...s, open: false }));
      },
      onCancel: () => setConfirmState(s => ({ ...s, open: false })),
    });
  }, []);

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
  };
};

export default useFleetManagement;
