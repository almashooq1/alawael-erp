/**
 * useCompensation — State & logic for CompensationStructureManagement
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from 'services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';
import { DEMO_STRUCTURES, INITIAL_FORM } from './compensationConstants';

const useCompensation = () => {
  const showSnackbar = useSnackbar();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [expandedCard, setExpandedCard] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formSection, setFormSection] = useState(0);

  /* ─── Data Loading ─── */
  const loadStructures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/payroll/compensation/structures');
      setStructures(data || []);
    } catch {
      setStructures(DEMO_STRUCTURES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStructures();
  }, [loadStructures]);

  /* ─── Computed ─── */
  const stats = useMemo(
    () => ({
      total: structures.length,
      active: structures.filter(s => s.isActive).length,
      avgAllowances: structures.length
        ? Math.round(
            structures.reduce(
              (a, s) => a + (s.fixedAllowances?.reduce((sum, al) => sum + al.amount, 0) || 0),
              0
            ) / structures.length
          )
        : 0,
      avgLeave: structures.length
        ? Math.round(
            structures.reduce((a, s) => a + (s.paidLeave?.annualDays || 0), 0) / structures.length
          )
        : 0,
    }),
    [structures]
  );

  /* ─── Handlers ─── */
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setFormOpen(false);
    setFormSection(0);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name) {
      showSnackbar('يرجى إدخال اسم الهيكل', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await apiClient.put(`/payroll/compensation/structures/${editingId}`, formData);
        showSnackbar('تم تحديث الهيكل بنجاح', 'success');
      } else {
        await apiClient.post('/payroll/compensation/structures', formData);
        showSnackbar('تم إنشاء الهيكل بنجاح', 'success');
      }
    } catch {
      if (editingId) {
        setStructures(prev => prev.map(s => (s._id === editingId ? { ...s, ...formData } : s)));
        showSnackbar('تم التحديث (وضع تجريبي)', 'success');
      } else {
        setStructures(prev => [...prev, { ...formData, _id: `s-${Date.now()}` }]);
        showSnackbar('تم الإنشاء (وضع تجريبي)', 'success');
      }
    }
    resetForm();
    setLoading(false);
    loadStructures();
  }, [formData, editingId, showSnackbar, loadStructures, resetForm]);

  const handleEdit = useCallback(structure => {
    setFormData(structure);
    setEditingId(structure._id);
    setFormOpen(true);
    setFormSection(0);
  }, []);

  const handleDelete = useCallback(
    async id => {
      try {
        await apiClient.delete(`/payroll/compensation/structures/${id}`);
        showSnackbar('تم حذف الهيكل بنجاح', 'success');
      } catch {
        setStructures(prev => prev.filter(s => s._id !== id));
        showSnackbar('تم الحذف (وضع تجريبي)', 'success');
      }
      setConfirmDelete(null);
      loadStructures();
    },
    [showSnackbar, loadStructures]
  );

  const handleDuplicate = useCallback(structure => {
    const copy = {
      ...structure,
      _id: undefined,
      name: `${structure.name} (نسخة)`,
      isActive: false,
    };
    setFormData(copy);
    setEditingId(null);
    setFormOpen(true);
    setFormSection(0);
  }, []);

  const openNewForm = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const updateAllowance = useCallback((index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.fixedAllowances];
      updated[index] = {
        ...updated[index],
        [field]: field === 'amount' ? parseFloat(value) || 0 : value,
      };
      return { ...prev, fixedAllowances: updated };
    });
  }, []);

  const addAllowance = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      fixedAllowances: [...prev.fixedAllowances, { name: '', amount: 0 }],
    }));
  }, []);

  const removeAllowance = useCallback(index => {
    setFormData(prev => ({
      ...prev,
      fixedAllowances: prev.fixedAllowances.filter((_, i) => i !== index),
    }));
  }, []);

  return {
    structures,
    loading,
    formOpen,
    editingId,
    formData,
    setFormData,
    expandedCard,
    setExpandedCard,
    confirmDelete,
    setConfirmDelete,
    formSection,
    setFormSection,
    stats,
    loadStructures,
    resetForm,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleDuplicate,
    openNewForm,
    updateAllowance,
    addAllowance,
    removeAllowance,
  };
};

export { useCompensation };
export default useCompensation;
