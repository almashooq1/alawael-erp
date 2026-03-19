/**
 * useEmployeeManagement – custom hook
 * Manages all state & handlers for the EmployeeManagement page.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { DEPARTMENTS, STATUS_MAP } from './employeeManagement.constants';

/* ───── demo seed data (Arabic) ───── */
const DEMO_EMPLOYEES = [
  {
    _id: 'EMP-001',
    empNumber: '1001',
    firstName: 'أحمد',
    lastName: 'الشمري',
    department: 'تقنية المعلومات',
    position: 'مهندس برمجيات',
    status: 'active',
    phone: '0501234567',
    email: 'ahmed@alawael.sa',
    joinDate: '2023-01-15',
    nationalId: '1098765432',
  },
  {
    _id: 'EMP-002',
    empNumber: '1002',
    firstName: 'فاطمة',
    lastName: 'العتيبي',
    department: 'الموارد البشرية',
    position: 'أخصائية موارد بشرية',
    status: 'active',
    phone: '0559876543',
    email: 'fatima@alawael.sa',
    joinDate: '2023-03-20',
    nationalId: '1087654321',
  },
  {
    _id: 'EMP-003',
    empNumber: '1003',
    firstName: 'محمد',
    lastName: 'القحطاني',
    department: 'المالية',
    position: 'محاسب أول',
    status: 'onLeave',
    phone: '0567891234',
    email: 'mohammed@alawael.sa',
    joinDate: '2022-06-10',
    nationalId: '1076543210',
  },
  {
    _id: 'EMP-004',
    empNumber: '1004',
    firstName: 'نورة',
    lastName: 'الدوسري',
    department: 'التعليم',
    position: 'معلمة رياضيات',
    status: 'active',
    phone: '0543216789',
    email: 'noura@alawael.sa',
    joinDate: '2024-01-05',
    nationalId: '1065432109',
  },
  {
    _id: 'EMP-005',
    empNumber: '1005',
    firstName: 'خالد',
    lastName: 'الحربي',
    department: 'العمليات',
    position: 'مدير عمليات',
    status: 'inactive',
    phone: '0534567890',
    email: 'khaled@alawael.sa',
    joinDate: '2021-09-01',
    nationalId: '1054321098',
  },
  {
    _id: 'EMP-006',
    empNumber: '1006',
    firstName: 'سارة',
    lastName: 'الزهراني',
    department: 'العلاج الطبيعي',
    position: 'أخصائية علاج طبيعي',
    status: 'active',
    phone: '0512345678',
    email: 'sara@alawael.sa',
    joinDate: '2024-05-12',
    nationalId: '1043210987',
  },
  {
    _id: 'EMP-007',
    empNumber: '1007',
    firstName: 'عبدالله',
    lastName: 'المالكي',
    department: 'الإدارة',
    position: 'مدير إداري',
    status: 'probation',
    phone: '0576543210',
    email: 'abdullah@alawael.sa',
    joinDate: '2025-11-01',
    nationalId: '1032109876',
  },
  {
    _id: 'EMP-008',
    empNumber: '1008',
    firstName: 'ريم',
    lastName: 'السبيعي',
    department: 'الخدمات',
    position: 'منسقة خدمات',
    status: 'active',
    phone: '0598765432',
    email: 'reem@alawael.sa',
    joinDate: '2023-08-22',
    nationalId: '1021098765',
  },
];

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
  الإدارة: ['مدير إداري', 'سكرتير', 'مساعد إداري'],
  الخدمات: ['منسق خدمات', 'فني صيانة', 'حارس أمن'],
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
  const isDemo = true; // flip when API is wired

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

  /* ── load demo data ── */
  const loadEmployees = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setEmployees(DEMO_EMPLOYEES);
      setLoading(false);
    }, 400);
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
          e.empNumber.includes(q) ||
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
        if (!form.nationalId) errs.nationalId = 'مطلوب';
        if (!form.phone) errs.phone = 'مطلوب';
      } else if (step === 1) {
        if (!form.department) errs.department = 'مطلوب';
        if (!form.position) errs.position = 'مطلوب';
        if (!form.joinDate) errs.joinDate = 'مطلوب';
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
  const handleSave = useCallback(() => {
    const errs = validateStep(activeStep);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setTimeout(() => {
      if (dialogMode === 'add') {
        const newEmp = {
          ...form,
          _id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
          empNumber: String(1000 + employees.length + 1),
        };
        setEmployees(prev => [...prev, newEmp]);
        setSnack({ open: true, message: 'تم إضافة الموظف بنجاح', severity: 'success' });
      } else {
        setEmployees(prev => prev.map(e => (e._id === form._id ? { ...e, ...form } : e)));
        setSnack({ open: true, message: 'تم تحديث بيانات الموظف', severity: 'success' });
      }
      setSaving(false);
      setDialogOpen(false);
    }, 600);
  }, [dialogMode, form, employees.length, activeStep, validateStep]);

  /* ── delete ── */
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setEmployees(prev => prev.filter(e => e._id !== deleteTarget._id));
    setDeleteTarget(null);
    setSnack({ open: true, message: 'تم حذف الموظف', severity: 'info' });
  }, [deleteTarget]);

  /* ── export ── */
  const handleExport = useCallback(() => {
    const header = ['الرقم الوظيفي', 'الاسم', 'القسم', 'المسمى', 'الحالة'];
    const rows = filtered.map(e => [
      e.empNumber,
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
    navigator.clipboard.writeText(emp.empNumber).then(() => {
      setSnack({ open: true, message: `تم نسخ الرقم ${emp.empNumber}`, severity: 'info' });
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
