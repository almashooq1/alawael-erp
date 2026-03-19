/**
 * useEmployeeManagement.js — State, data loading, filtering, stats & CRUD handlers
 * الحالة والتحميل والتصفية والمعاملات
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import hrService from 'services/hrService';
import {
  EMPTY_FORM,
  STATUS_MAP,
  POSITIONS_BY_DEPT,
  validateStep,
  generateEmpNumber,
  STEPS,
} from './employeeManagement.constants';

const useEmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Delete + Snackbar
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  /* ─── Load ─── */
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    const res = await hrService.getEmployees();
    setEmployees(Array.isArray(res.data) ? res.data : []);
    setIsDemo(res.isDemo);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /* ─── Filtering ─── */
  const filtered = useMemo(
    () =>
      employees.filter(e => {
        const txt =
          `${e.firstName || ''} ${e.lastName || ''} ${e.employeeNumber || ''} ${e.phone || ''} ${e.email || ''}`.toLowerCase();
        if (search && !txt.includes(search.toLowerCase())) return false;
        if (deptFilter && e.department !== deptFilter) return false;
        if (statusFilter && e.status !== statusFilter) return false;
        return true;
      }),
    [employees, search, deptFilter, statusFilter]
  );

  /* ─── Stats ─── */
  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      onLeave: employees.filter(e => e.status === 'on_leave').length,
      inactive: employees.filter(e => e.status === 'inactive' || e.status === 'terminated').length,
      depts: [...new Set(employees.map(e => e.department).filter(Boolean))].length,
    }),
    [employees]
  );

  /* ─── Dynamic positions ─── */
  const positionsList = POSITIONS_BY_DEPT[form.department] || [];

  /* ─── Form field handler ─── */
  const setField = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'department' && prev.department !== value) next.position = '';
      if (field === 'contractType' && value === 'permanent') next.contractEndDate = '';
      return next;
    });
    setTouched(prev => ({ ...prev, [field]: true }));
    if (errors[field])
      setErrors(prev => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
  };

  /* ─── CRUD ─── */
  const openAdd = () => {
    setForm({ ...EMPTY_FORM, employeeNumber: generateEmpNumber() });
    setDialogMode('add');
    setActiveStep(0);
    setErrors({});
    setTouched({});
    setDialogOpen(true);
  };
  const openEdit = emp => {
    setForm({ ...EMPTY_FORM, ...emp });
    setDialogMode('edit');
    setActiveStep(0);
    setErrors({});
    setTouched({});
    setDialogOpen(true);
  };
  const openView = emp => {
    setForm({ ...EMPTY_FORM, ...emp });
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleNext = () => {
    const stepErrors = validateStep(activeStep, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setTouched(prev => {
        const n = { ...prev };
        Object.keys(stepErrors).forEach(k => {
          n[k] = true;
        });
        return n;
      });
      return;
    }
    setErrors({});
    if (activeStep < STEPS.length - 1) setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setErrors({});
    setActiveStep(prev => Math.max(0, prev - 1));
  };

  const handleSave = async () => {
    const stepErrors = validateStep(activeStep, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setSaving(true);
    try {
      if (dialogMode === 'edit' && form._id) {
        await hrService.updateEmployee(form._id, form);
        setSnack({ open: true, message: 'تم تحديث بيانات الموظف بنجاح', severity: 'success' });
      } else {
        await hrService.createEmployee(form);
        setSnack({ open: true, message: 'تم تسجيل الموظف الجديد بنجاح', severity: 'success' });
      }
      setDialogOpen(false);
      loadEmployees();
    } catch {
      setSnack({ open: true, message: 'فشل في حفظ البيانات', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrService.deleteEmployee(deleteTarget._id);
      setEmployees(prev => prev.filter(e => e._id !== deleteTarget._id));
      setSnack({ open: true, message: 'تم حذف الموظف بنجاح', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'فشل في حذف الموظف', severity: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    const header =
      'رقم الموظف,الاسم الأول,الاسم الأخير,القسم,المنصب,الحالة,الهاتف,البريد,تاريخ التعيين,الراتب,نوع العقد,الجنسية';
    const rows = filtered.map(e =>
      [
        e.employeeNumber,
        e.firstName,
        e.lastName,
        e.department,
        e.position,
        (STATUS_MAP[e.status] || {}).label || e.status,
        e.phone,
        e.email,
        e.joinDate,
        e.basicSalary,
        e.contractType,
        e.nationality,
      ]
        .map(v => `"${v || ''}"`)
        .join(',')
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyId = empNum => {
    navigator.clipboard?.writeText(empNum);
    setSnack({ open: true, message: `تم نسخ ${empNum}`, severity: 'info' });
  };

  return {
    employees,
    loading,
    isDemo,
    search,
    setSearch,
    deptFilter,
    setDeptFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    dialogOpen,
    setDialogOpen,
    dialogMode,
    setDialogMode,
    form,
    setForm,
    saving,
    activeStep,
    setActiveStep,
    errors,
    setErrors,
    touched,
    setTouched,
    deleteTarget,
    setDeleteTarget,
    snack,
    setSnack,
    filtered,
    stats,
    positionsList,
    setField,
    loadEmployees,
    openAdd,
    openEdit,
    openView,
    handleNext,
    handleBack,
    handleSave,
    handleDelete,
    handleExport,
    handlePrint,
    handleCopyId,
  };
};

export default useEmployeeManagement;
