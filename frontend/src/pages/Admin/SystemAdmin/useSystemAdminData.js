import { useState, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Demo seed data – one array per tab key                            */
/* ------------------------------------------------------------------ */
const DEMO = {
  inventory: [
    { id: 1, name: 'قطع غيار محرك', qty: 120, status: 'متوفر' },
    { id: 2, name: 'إطارات شاحنات', qty: 45, status: 'منخفض' },
    { id: 3, name: 'زيوت تشغيل', qty: 300, status: 'متوفر' },
  ],
  ecommerce: [
    { id: 1, name: 'منتج A', price: 150, status: 'نشط' },
    { id: 2, name: 'منتج B', price: 320, status: 'معلّق' },
  ],
  templates: [
    { id: 1, name: 'نموذج طلب إجازة', category: 'HR', status: 'مفعّل' },
    { id: 2, name: 'نموذج صيانة', category: 'عمليات', status: 'مفعّل' },
  ],
  approvals: [
    { id: 1, title: 'طلب شراء #401', requester: 'أحمد', status: 'قيد المراجعة' },
    { id: 2, title: 'طلب إجازة #88', requester: 'سارة', status: 'معتمد' },
  ],
  notifications: [
    { id: 1, title: 'تنبيه صيانة', channel: 'بريد', status: 'مفعّل' },
    { id: 2, title: 'تذكير دفع', channel: 'SMS', status: 'مفعّل' },
  ],
  rbac: [
    { id: 1, role: 'مدير النظام', users: 3, permissions: 42 },
    { id: 2, role: 'مشرف', users: 8, permissions: 25 },
    { id: 3, role: 'موظف', users: 54, permissions: 10 },
  ],
  civilDefense: [
    { id: 1, permit: 'رخصة سلامة #12', expiry: '2026-09-01', status: 'سارية' },
    { id: 2, permit: 'رخصة إطفاء #7', expiry: '2026-04-15', status: 'قاربت الانتهاء' },
  ],
  qiwa: [
    { id: 1, name: 'عقد موظف #201', type: 'دوام كامل', status: 'فعّال' },
    { id: 2, name: 'عقد موظف #202', type: 'دوام جزئي', status: 'منتهي' },
  ],
};

const EMPTY_FORM = { name: '', status: '', notes: '' };

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */
const useSystemAdminData = () => {
  const [data, setData] = useState(DEMO);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('create'); // 'create' | 'edit'
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // confirmation state (for delete prompts etc.)
  const [confirmState, setConfirmState] = useState({ open: false, item: null });

  /* ---------- actions ---------- */

  const loadData = useCallback(() => {
    setLoading(true);
    // simulate async reload
    setTimeout(() => {
      setData({ ...DEMO });
      setLoading(false);
    }, 600);
  }, []);

  const openCreate = useCallback(() => {
    setDialogType('create');
    setEditItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback(item => {
    setDialogType('edit');
    setEditItem(item);
    setForm({ name: item.name || '', status: item.status || '', notes: item.notes || '' });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    setData(prev => {
      const tabRows = [...(prev[activeTab] || [])];

      if (dialogType === 'edit' && editItem) {
        const idx = tabRows.findIndex(r => r.id === editItem.id);
        if (idx !== -1) tabRows[idx] = { ...tabRows[idx], ...form };
      } else {
        const newId = tabRows.length ? Math.max(...tabRows.map(r => r.id)) + 1 : 1;
        tabRows.push({ id: newId, ...form });
      }

      return { ...prev, [activeTab]: tabRows };
    });
    setDialogOpen(false);
    setForm(EMPTY_FORM);
  }, [activeTab, dialogType, editItem, form]);

  const handleDelete = useCallback(
    item => {
      setData(prev => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).filter(r => r.id !== item.id),
      }));
      setConfirmState({ open: false, item: null });
    },
    [activeTab]
  );

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
