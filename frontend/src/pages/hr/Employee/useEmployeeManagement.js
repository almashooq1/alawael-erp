/**
 * useEmployeeManagement – custom hook
 * Manages all state & handlers for the EmployeeManagement page.
 * Wired to /api/hr-advanced/employees — falls back to demo data when API unavailable.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import {  STATUS_MAP, normalizeStatus } from './employeeManagement.constants';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee as deleteEmployeeApi,
} from '../../../services/hr/employeeService';

const BLANK_FORM = {
  firstName: '',
  lastName: '',
  nationalId: '',
  phone: '',
  email: '',
  department: '',
  position: '',
  joinDate: '',
  status: 'active',
  salary: '',
  notes: '',
  documents: [],
};

const POSITIONS_BY_DEPT = {
  'تقنية المعلومات': ['مهندس برمجيات', 'مدير تقنية', 'محلل نظم', 'فني دعم تقني'],
  'الموارد البشرية': ['أخصائي موارد بشرية', 'أخصائية موارد بشرية', 'مدير موارد بشرية'],
  المالية: ['محاسب أول', 'محاسب', 'مدير مالي'],
  العمليات: ['مدير عمليات', 'منسق عمليات', 'مشرف عمليات'],
  التعليم: ['معلم', 'معلمة رياضيات', 'معلمة علوم', 'مشرف تعليمي'],
  'العلاج الطبيعي': ['أخصائي علاج طبيعي', 'أخصائية علاج طبيعي', 'معالج وظيفي'],
  'العلاج الوظيفي': ['أخصائي علاج وظيفي', 'أخصائية علاج وظيفي'],
  'علاج النطق': ['أخصائي نطق', 'أخصائية نطق'],
  التمريض: ['ممرض', 'ممرضة', 'مشرف تمريض'],
  الإدارة: ['مدير إداري', 'سكرتير', 'مساعد إداري'],
  الخدمات: ['منسق خدمات', 'فني صيانة', 'حارس أمن'],
  'الخدمات المساندة': ['مشرف صيانة', 'فني تكييف', 'عامل نظافة'],
};

/* ────────────────────────────────── */
export default function useEmployeeManagement() {
  /* ── list / filter state ── */
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  /* ── dialog state ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // add | edit | view
  const [form, _setForm] = useState({ ...BLANK_FORM });
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  /* ── misc ── */
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  /* ── load employees from API (falls back to demo) ── */
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, isDemo: demo } = await getEmployees();
      const raw = Array.isArray(data) ? data : [];
      // Normalize status field from backend/demo to STATUS_MAP keys
      setEmployees(raw.map(e => ({ ...e, status: normalizeStatus(e.status) })));
      setIsDemo(demo);
    } catch {
      setEmployees([]);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /* ── positions list based on form.department ── */
  const positionsList = useMemo(() => POSITIONS_BY_DEPT[form.department] || [], [form.department]);

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    let list = [...employees];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        e =>
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          (e.employeeId || '').toLowerCase().includes(q) ||
          (e.email && e.email.toLowerCase().includes(q))
      );
    }
    if (deptFilter) list = list.filter(e => e.department === deptFilter);
    if (statusFilter) list = list.filter(e => e.status === statusFilter);
    return list;
  }, [employees, search, deptFilter, statusFilter]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const deptSet = new Set(employees.map(e => e.department));
    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      onLeave: employees.filter(e => e.status === 'onLeave').length,
      inactive: employees.filter(e => e.status === 'inactive').length,
      departments: deptSet.size,
    };
  }, [employees]);

  /* ── field setter ── */
  const setField = useCallback((name, value) => {
    _setForm(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
  }, []);

  /* ── open helpers ── */
  const openAdd = useCallback(() => {
    _setForm({ ...BLANK_FORM });
    setDialogMode('add');
    setActiveStep(0);
    setErrors({});
    setTouched({});
    setDialogOpen(true);
  }, []);

  const openView = useCallback(emp => {
    _setForm({ ...BLANK_FORM, ...emp });
    setDialogMode('view');
    setActiveStep(0);
    setErrors({});
    setTouched({});
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback(emp => {
    _setForm({ ...BLANK_FORM, ...emp });
    setDialogMode('edit');
    setActiveStep(0);
    setErrors({});
    setTouched({});
    setDialogOpen(true);
  }, []);

  /* ── stepper validation ── */
  const validateStep = useCallback(
    step => {
      const errs = {};
      if (step === 0) {
        if (!form.firstName) errs.firstName = 'مطلوب';
        if (!form.lastName) errs.lastName = 'مطلوب';

        // National ID: 10 digits, starts with 1 or 2
        if (!form.nationalId) {
          errs.nationalId = 'مطلوب';
        } else if (!/^[12]\d{9}$/.test(form.nationalId)) {
          errs.nationalId = 'رقم الهوية يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2';
        }

        // Phone: Saudi format 05xxxxxxxx
        if (!form.phone) {
          errs.phone = 'مطلوب';
        } else if (!/^05\d{8}$/.test(form.phone)) {
          errs.phone = 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
        }

        // Email (optional but must be valid if provided)
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          errs.email = 'صيغة البريد الإلكتروني غير صحيحة';
        }
      } else if (step === 1) {
        if (!form.department) errs.department = 'مطلوب';
        if (!form.position) errs.position = 'مطلوب';
        if (!form.joinDate) errs.joinDate = 'مطلوب';

        // Salary: positive number
        if (form.salary && (isNaN(form.salary) || Number(form.salary) < 0)) {
          errs.salary = 'الراتب يجب أن يكون رقم موجب';
        }
      }
      return errs;
    },
    [form]
  );

  const handleNext = useCallback(() => {
    const errs = validateStep(activeStep);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setActiveStep(s => s + 1);
  }, [activeStep, validateStep]);

  const handleBack = useCallback(() => {
    setActiveStep(s => Math.max(s - 1, 0));
  }, []);

  /* ── save ── */
  const handleSave = useCallback(async () => {
    const errs = validateStep(activeStep);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === 'add') {
        const { isDemo: demo } = await createEmployee(form);
        if (demo) {
          // API unavailable — local-only add
          const newEmp = {
            ...form,
            _id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
            employeeId: `EMP-${String(1000 + employees.length + 1)}`,
          };
          setEmployees(prev => [...prev, newEmp]);
        } else {
          await loadEmployees(); // reload from server
        }
        setSnack({ open: true, message: 'تم إضافة الموظف بنجاح', severity: 'success' });
      } else {
        const { isDemo: demo } = await updateEmployee(form._id, form);
        if (demo) {
          setEmployees(prev => prev.map(e => (e._id === form._id ? { ...e, ...form } : e)));
        } else {
          await loadEmployees();
        }
        setSnack({ open: true, message: 'تم تحديث بيانات الموظف', severity: 'success' });
      }
      setDialogOpen(false);
    } catch {
      setSnack({ open: true, message: 'حدث خطأ أثناء الحفظ', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [dialogMode, form, employees.length, activeStep, validateStep, loadEmployees]);

  /* ── delete ── */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const { isDemo: demo } = await deleteEmployeeApi(deleteTarget._id);
      if (demo) {
        setEmployees(prev => prev.filter(e => e._id !== deleteTarget._id));
      } else {
        await loadEmployees();
      }
      setSnack({ open: true, message: 'تم حذف الموظف', severity: 'info' });
    } catch {
      setSnack({ open: true, message: 'حدث خطأ أثناء الحذف', severity: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, loadEmployees]);

  /* ── export ── */
  const handleExport = useCallback(() => {
    const header = ['الرقم الوظيفي', 'الاسم', 'القسم', 'المسمى', 'الحالة'];
    const rows = filtered.map(e => [
      e.employeeId,
      `${e.firstName} ${e.lastName}`,
      e.department,
      e.position,
      STATUS_MAP[e.status]?.label ?? e.status,
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    URL.revokeObjectURL(url);
    setSnack({ open: true, message: 'تم تصدير البيانات', severity: 'success' });
  }, [filtered]);

  /* ── copy ID ── */
  const handleCopyId = useCallback(emp => {
    const id = emp.employeeId || '';
    navigator.clipboard.writeText(id).then(() => {
      setSnack({ open: true, message: `تم نسخ الرقم ${id}`, severity: 'info' });
    });
  }, []);

  /* ── print ── */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ── return ── */
  return {
    // list / filters
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    deptFilter,
    setDeptFilter,
    statusFilter,
    setStatusFilter,
    loading,
    isDemo,
    filtered,
    stats,
    // dialog
    dialogOpen,
    setDialogOpen,
    dialogMode,
    setDialogMode,
    form,
    setField,
    positionsList,
    activeStep,
    setActiveStep,
    errors,
    setErrors,
    touched,
    setTouched,
    saving,
    handleNext,
    handleBack,
    handleSave,
    handlePrint,
    // CRUD helpers
    openAdd,
    openView,
    openEdit,
    loadEmployees,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    handleExport,
    handleCopyId,
    snack,
    setSnack,
  };
}
