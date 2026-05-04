/**
 * MontessoriStudents — إدارة طلاب مونتيسوري (Professional v3)
 *
 * Improvements over v2:
 *  - Extended student profile: status, parent contacts, program enrollment
 *  - 4-tab detail view: الملف الشخصي، الخطط الفردية، التقييمات، الجلسات
 *  - RadarChart for visual skill assessment
 *  - Pagination (10 per page)
 *  - Status filter + color-coded status chips
 *  - Print profile button
 *  - Richer DEMO data covering all new fields
 *
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Stack,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemIcon,
  InputAdornment,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ChildCare as ChildIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Visibility as ViewIcon,
  PlaylistAddCheck as PlanIcon,
  Assessment as EvalIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as PendingIcon,
  Download as DownloadIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Event as SessionsIcon,
  School as ProgramIcon,
  Print as PrintIcon,
  EmojiEvents as GradIcon,
  Block as SuspendIcon,
  CheckCircleOutline as ActiveIcon,
  ContactEmergency as ContactIcon,
} from '@mui/icons-material';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog, { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { gradients } from '../../theme/palette';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';
import montessoriService from '../../services/montessoriService';

/* ─── Animated counter ─────────────────────────────────────────── */
const useAnimatedCounter = (endValue, duration = 1200) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !endValue) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !ran.current) {
          ran.current = true;
          const t0 = Date.now();
          const step = () => {
            const p = Math.min((Date.now() - t0) / duration, 1);
            setCount(Math.floor((p === 1 ? 1 : 1 - Math.pow(2, -10 * p)) * endValue));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [endValue, duration]);
  return { count, ref };
};

/* ─── Mini KPI ──────────────────────────────────────────────────── */
const MiniKPI = ({ label, value, icon, gradient, delay = 0 }) => {
  const { count, ref } = useAnimatedCounter(value, 1200);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.02 }}
      style={{ height: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          background: gradient,
          color: '#fff',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}
        >
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 42, height: 42 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {count.toLocaleString('ar-SA')}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {label}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

/* ─── Constants ─────────────────────────────────────────────────── */
const DISABILITY_OPTIONS = [
  'توحد',
  'ذهنية',
  'حركية',
  'سمعية',
  'بصرية',
  'تعلم',
  'نطق',
  'سلوكية',
  'أخرى',
];
const GENDER_OPTIONS = ['ذكر', 'أنثى'];
const RELATION_OPTIONS = ['الأب', 'الأم', 'الأخ', 'الأخت', 'الجد', 'الجدة', 'الوصي'];
const PROGRAM_OPTIONS = [
  'برنامج الحياة العملية',
  'برنامج الحسي',
  'برنامج اللغة',
  'برنامج الرياضيات',
  'البرنامج الشامل',
];
const STUDENT_STATUSES = ['active', 'suspended', 'graduated'];
const statusConfig = {
  active: { label: 'نشط', color: 'success', icon: <ActiveIcon fontSize="small" /> },
  suspended: { label: 'معلق', color: 'warning', icon: <SuspendIcon fontSize="small" /> },
  graduated: { label: 'متخرج', color: 'info', icon: <GradIcon fontSize="small" /> },
};
const levelColors = { ضعيف: '#ef5350', متوسط: '#ff9800', جيد: '#66bb6a', ممتاز: '#42a5f5' };
const levelToNum = { ضعيف: 1, متوسط: 2, جيد: 3, ممتاز: 4 };
const MONTESSORI_AREAS = ['حسي', 'لغوي', 'حركي', 'اجتماعي', 'معرفي', 'استقلالية'];
const ROWS_PER_PAGE = 10;
const arr = v => (Array.isArray(v) ? v : []);

/* ─── Rich demo data ────────────────────────────────────────────── */
const DEMO_STUDENTS = [
  {
    _id: '1',
    fullName: 'أحمد محمد العلي',
    gender: 'ذكر',
    disabilityTypes: ['توحد'],
    birthDate: '2020-03-15',
    status: 'active',
    parentName: 'محمد علي العلي',
    parentPhone: '0501234567',
    parentRelation: 'الأب',
    program: 'برنامج الحياة العملية',
    enrollmentDate: '2024-09-01',
    notes: 'يحتاج متابعة مكثفة',
  },
  {
    _id: '2',
    fullName: 'سارة خالد المحمد',
    gender: 'أنثى',
    disabilityTypes: ['ذهنية'],
    birthDate: '2019-07-22',
    status: 'active',
    parentName: 'نورة سعد',
    parentPhone: '0509876543',
    parentRelation: 'الأم',
    program: 'برنامج الحسي',
    enrollmentDate: '2024-09-01',
    notes: '',
  },
  {
    _id: '3',
    fullName: 'عبدالله فهد الأحمد',
    gender: 'ذكر',
    disabilityTypes: ['حركية'],
    birthDate: '2021-01-10',
    status: 'active',
    parentName: 'فهد أحمد',
    parentPhone: '0551122334',
    parentRelation: 'الأب',
    program: 'البرنامج الشامل',
    enrollmentDate: '2025-01-15',
    notes: 'تحسن ملحوظ في الحركة',
  },
  {
    _id: '4',
    fullName: 'لمى سعد الحربي',
    gender: 'أنثى',
    disabilityTypes: ['سمعية'],
    birthDate: '2020-11-05',
    status: 'active',
    parentName: 'هيلة الحربي',
    parentPhone: '0556677889',
    parentRelation: 'الأم',
    program: 'برنامج اللغة',
    enrollmentDate: '2024-09-01',
    notes: '',
  },
  {
    _id: '5',
    fullName: 'محمد عبدالرحمن',
    gender: 'ذكر',
    disabilityTypes: ['توحد', 'ذهنية'],
    birthDate: '2019-05-18',
    status: 'active',
    parentName: 'عبدالرحمن محمد',
    parentPhone: '0503344556',
    parentRelation: 'الأب',
    program: 'برنامج الحياة العملية',
    enrollmentDate: '2023-09-01',
    notes: 'يستجيب للعلاج باللعب',
  },
  {
    _id: '6',
    fullName: 'رنا علي القحطاني',
    gender: 'أنثى',
    disabilityTypes: ['نطق'],
    birthDate: '2021-06-20',
    status: 'suspended',
    parentName: 'علي القحطاني',
    parentPhone: '0507788990',
    parentRelation: 'الأب',
    program: '',
    enrollmentDate: '2024-09-01',
    notes: 'توقف مؤقت لأسباب صحية',
  },
  {
    _id: '7',
    fullName: 'خالد عمر الزهراني',
    gender: 'ذكر',
    disabilityTypes: ['بصرية'],
    birthDate: '2018-03-08',
    status: 'graduated',
    parentName: 'عمر الزهراني',
    parentPhone: '0512233445',
    parentRelation: 'الأب',
    program: 'برنامج الرياضيات',
    enrollmentDate: '2022-09-01',
    notes: 'أكمل البرنامج بنجاح',
  },
];
const DEMO_PLANS = [
  {
    _id: 'p1',
    student: { _id: '1' },
    goals: [
      {
        area: 'حسي',
        objective: 'تحسين التمييز البصري',
        achieved: true,
        activities: ['تصنيف الألوان', 'مطابقة الأشكال'],
      },
      {
        area: 'لغوي',
        objective: 'زيادة المفردات',
        achieved: false,
        activities: ['بطاقات المفردات', 'القصص المصورة'],
      },
      {
        area: 'اجتماعي',
        objective: 'التفاعل مع الأقران',
        achieved: false,
        activities: ['اللعب الجماعي'],
      },
    ],
  },
  {
    _id: 'p2',
    student: { _id: '2' },
    goals: [
      {
        area: 'حركي',
        objective: 'تحسين المهارات الدقيقة',
        achieved: false,
        activities: ['اللضم', 'القص'],
      },
      {
        area: 'معرفي',
        objective: 'التعرف على الأرقام',
        achieved: true,
        activities: ['بطاقات الأرقام'],
      },
    ],
  },
  {
    _id: 'p3',
    student: { _id: '3' },
    goals: [
      { area: 'حركي', objective: 'تحسين التوازن', achieved: true, activities: ['المشي على خط'] },
      {
        area: 'استقلالية',
        objective: 'الاعتناء بالنفس',
        achieved: false,
        activities: ['تمارين الملابس'],
      },
    ],
  },
];
const DEMO_EVALS = [
  {
    _id: 'e1',
    student: { _id: '1' },
    area: 'حسي',
    skill: 'التمييز البصري',
    level: 'جيد',
    date: '2026-03-15',
    notes: 'تحسن واضح',
  },
  {
    _id: 'e2',
    student: { _id: '1' },
    area: 'لغوي',
    skill: 'المفردات',
    level: 'متوسط',
    date: '2026-03-14',
    notes: '',
  },
  {
    _id: 'e3',
    student: { _id: '1' },
    area: 'حركي',
    skill: 'الحركة الكبيرة',
    level: 'ممتاز',
    date: '2026-03-13',
    notes: 'أداء رائع',
  },
  {
    _id: 'e4',
    student: { _id: '1' },
    area: 'اجتماعي',
    skill: 'التفاعل',
    level: 'ضعيف',
    date: '2026-03-12',
    notes: 'يحتاج دعم',
  },
  {
    _id: 'e5',
    student: { _id: '1' },
    area: 'معرفي',
    skill: 'التصنيف',
    level: 'جيد',
    date: '2026-03-11',
    notes: '',
  },
  {
    _id: 'e6',
    student: { _id: '2' },
    area: 'حركي',
    skill: 'المهارات الدقيقة',
    level: 'جيد',
    date: '2026-03-13',
    notes: '',
  },
  {
    _id: 'e7',
    student: { _id: '2' },
    area: 'معرفي',
    skill: 'الأرقام',
    level: 'متوسط',
    date: '2026-03-12',
    notes: '',
  },
];
const DEMO_SESSIONS = [
  {
    _id: 's1',
    student: { _id: '1' },
    date: '2026-04-28',
    duration: 60,
    type: 'فردية',
    status: 'حضر',
    notes: 'تفاعل جيد مع الأنشطة الحسية',
    instructor: 'أ. نورة محمد',
  },
  {
    _id: 's2',
    student: { _id: '1' },
    date: '2026-04-21',
    duration: 60,
    type: 'فردية',
    status: 'حضر',
    notes: 'تمرين على المهارات الحركية',
    instructor: 'أ. نورة محمد',
  },
  {
    _id: 's3',
    student: { _id: '1' },
    date: '2026-04-14',
    duration: 45,
    type: 'جماعية',
    status: 'غاب',
    notes: 'غياب بعذر',
    instructor: 'أ. فاطمة علي',
  },
  {
    _id: 's4',
    student: { _id: '2' },
    date: '2026-04-27',
    duration: 60,
    type: 'فردية',
    status: 'حضر',
    notes: 'تحسن في المهارات الدقيقة',
    instructor: 'أ. سارة أحمد',
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════ */
const MontessoriStudents = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDisability, setFilterDisability] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    birthDate: '',
    gender: 'ذكر',
    disabilityTypes: [],
    status: 'active',
    parentName: '',
    parentPhone: '',
    parentRelation: 'الأب',
    program: '',
    enrollmentDate: '',
    notes: '',
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailTab, setDetailTab] = useState(0);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    goals: [{ area: '', objective: '', activities: [] }],
  });
  const [editPlan, setEditPlan] = useState(null);

  /* ── Load ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, e, se] = await Promise.allSettled([
        montessoriService.getStudents(),
        montessoriService.getPlans(),
        montessoriService.getEvaluations(),
        montessoriService.getSessions(),
      ]);
      setStudents(arr(s.status === 'fulfilled' && s.value?.length ? s.value : DEMO_STUDENTS));
      setPlans(arr(p.status === 'fulfilled' && p.value?.length ? p.value : DEMO_PLANS));
      setEvaluations(arr(e.status === 'fulfilled' && e.value?.length ? e.value : DEMO_EVALS));
      setSessions(arr(se.status === 'fulfilled' && se.value?.length ? se.value : DEMO_SESSIONS));
    } catch {
      setStudents(DEMO_STUDENTS);
      setPlans(DEMO_PLANS);
      setEvaluations(DEMO_EVALS);
      setSessions(DEMO_SESSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Computed ── */
  const males = students.filter(s => s.gender === 'ذكر').length;
  const _females = students.filter(s => s.gender === 'أنثى').length;
  const activeCount = students.filter(s => (s.status || 'active') === 'active').length;
  const totalPlans = plans.length;

  const filtered = students.filter(s => {
    const matchSearch =
      !search ||
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.parentName?.toLowerCase().includes(search.toLowerCase());
    const matchDisability =
      !filterDisability || (s.disabilityTypes || []).includes(filterDisability);
    const matchStatus = !filterStatus || (s.status || 'active') === filterStatus;
    return matchSearch && matchDisability && matchStatus;
  });
  const paginated = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  /* ── CRUD ── */
  const openCreate = () => {
    setEditItem(null);
    setForm({
      fullName: '',
      birthDate: '',
      gender: 'ذكر',
      disabilityTypes: [],
      status: 'active',
      parentName: '',
      parentPhone: '',
      parentRelation: 'الأب',
      program: '',
      enrollmentDate: '',
      notes: '',
    });
    setDialogOpen(true);
  };
  const openEdit = student => {
    setEditItem(student);
    setForm({
      fullName: student.fullName || '',
      birthDate: student.birthDate?.substring(0, 10) || '',
      gender: student.gender || 'ذكر',
      disabilityTypes: student.disabilityTypes || [],
      status: student.status || 'active',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentRelation: student.parentRelation || 'الأب',
      program: student.program || '',
      enrollmentDate: student.enrollmentDate?.substring(0, 10) || '',
      notes: student.notes || '',
    });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    try {
      if (editItem) {
        await montessoriService.updateStudent(editItem._id, form);
        showSnackbar('تم تحديث بيانات الطالب بنجاح', 'success');
      } else {
        await montessoriService.createStudent(form);
        showSnackbar('تم تسجيل الطالب بنجاح', 'success');
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      showSnackbar('حدث خطأ أثناء الحفظ', 'error');
      logger.error('Save student error', err);
    }
  };
  const handleDelete = student => {
    showConfirm({
      title: 'حذف طالب',
      message: `هل أنت متأكد من حذف "${student.fullName}"؟`,
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await montessoriService.deleteStudent(student._id);
          showSnackbar('تم حذف الطالب', 'success');
          loadData();
        } catch {
          showSnackbar('فشل الحذف', 'error');
        }
      },
    });
  };

  /* ── Plan CRUD ── */
  const openCreatePlan = () => {
    setEditPlan(null);
    setPlanForm({ goals: [{ area: '', objective: '', activities: [] }] });
    setPlanDialogOpen(true);
  };
  const handleSavePlan = async () => {
    try {
      const payload = { student: selectedStudent._id, goals: planForm.goals };
      if (editPlan) {
        await montessoriService.updatePlan(editPlan._id, payload);
        showSnackbar('تم تحديث الخطة', 'success');
      } else {
        await montessoriService.createPlan(payload);
        showSnackbar('تم إنشاء الخطة', 'success');
      }
      setPlanDialogOpen(false);
      loadData();
    } catch {
      showSnackbar('فشل حفظ الخطة', 'error');
    }
  };
  const addGoalRow = () =>
    setPlanForm(prev => ({
      ...prev,
      goals: [...prev.goals, { area: '', objective: '', activities: [] }],
    }));
  const updateGoalRow = (idx, field, value) =>
    setPlanForm(prev => ({
      ...prev,
      goals: prev.goals.map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));

  /* ── Detail helpers ── */
  const studentPlans = selectedStudent
    ? plans.filter(p => (p.student?._id || p.student) === selectedStudent._id)
    : [];
  const studentEvals = selectedStudent
    ? evaluations.filter(e => (e.student?._id || e.student) === selectedStudent._id)
    : [];
  const studentSessions = selectedStudent
    ? sessions.filter(s => (s.student?._id || s.student) === selectedStudent._id)
    : [];

  const calcAge = bd => {
    if (!bd) return '-';
    return `${Math.floor((Date.now() - new Date(bd)) / 31536000000)} سنة`;
  };

  const buildRadarData = evals =>
    MONTESSORI_AREAS.map(area => {
      const areaEvals = evals.filter(e => e.area === area);
      if (!areaEvals.length) return { area, level: 0 };
      const avg =
        areaEvals.reduce((sum, e) => sum + (levelToNum[e.level] || 0), 0) / areaEvals.length;
      return { area, level: Math.round(avg * 25) };
    });

  /* ── Export CSV ── */
  const handleExport = () => {
    const header = 'الاسم,الجنس,العمر,أنواع الإعاقة,الحالة,البرنامج,ولي الأمر,الهاتف,ملاحظات';
    const rows = students.map(
      s =>
        `"${s.fullName}",${s.gender},${calcAge(s.birthDate)},"${(s.disabilityTypes || []).join('، ')}",${statusConfig[s.status || 'active']?.label || s.status},"${s.program || '-'}","${s.parentName || '-'}",${s.parentPhone || '-'},"${s.notes || ''}"`
    );
    const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `montessori_students_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showSnackbar('تم تصدير بيانات الطلاب', 'success');
  };

  /* ═══════════════════════════════════════════════════════════════
     Detail View
  ═══════════════════════════════════════════════════════════════ */
  if (selectedStudent) {
    const radarData = buildRadarData(studentEvals);
    const attendanceRate = studentSessions.length
      ? Math.round(
          (studentSessions.filter(s => s.status === 'حضر').length / studentSessions.length) * 100
        )
      : 0;
    const achievedGoals = studentPlans.reduce(
      (sum, p) => sum + (p.goals || []).filter(g => g.achieved).length,
      0
    );
    const totalGoals = studentPlans.reduce((sum, p) => sum + (p.goals || []).length, 0);

    return (
      <DashboardErrorBoundary>
        <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
          {/* Gradient sub-header */}
          <Box
            sx={{
              background: gradients.info,
              py: 3,
              px: 3,
              borderRadius: '0 0 24px 24px',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: -40,
                right: -40,
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            <Container maxWidth="lg">
              <Button
                startIcon={<BackIcon />}
                onClick={() => setSelectedStudent(null)}
                sx={{ color: '#fff', mb: 1 }}
              >
                العودة لقائمة الطلاب
              </Button>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    fontSize: 32,
                  }}
                >
                  {selectedStudent.gender === 'أنثى' ? (
                    <FemaleIcon fontSize="large" />
                  ) : (
                    <MaleIcon fontSize="large" />
                  )}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h5" fontWeight={800} color="#fff">
                      {selectedStudent.fullName}
                    </Typography>
                    <Chip
                      icon={statusConfig[selectedStudent.status || 'active']?.icon}
                      label={statusConfig[selectedStudent.status || 'active']?.label}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
                    />
                  </Box>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}
                  >
                    <Chip
                      label={selectedStudent.gender}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                    />
                    <Chip
                      label={`العمر: ${calcAge(selectedStudent.birthDate)}`}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                    />
                    {selectedStudent.program && (
                      <Chip
                        icon={<ProgramIcon sx={{ color: '#fff !important', fontSize: 14 }} />}
                        label={selectedStudent.program}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                      />
                    )}
                    {(selectedStudent.disabilityTypes || []).map((d, i) => (
                      <Chip
                        key={i}
                        label={d}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }}
                      />
                    ))}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="طباعة الملف">
                    <IconButton
                      onClick={() => window.print()}
                      sx={{
                        color: '#fff',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                      }}
                    >
                      <PrintIcon />
                    </IconButton>
                  </Tooltip>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => {
                      openEdit(selectedStudent);
                      setSelectedStudent(null);
                    }}
                    sx={{
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    تعديل
                  </Button>
                </Stack>
              </Box>

              {/* Quick stats bar */}
              <Stack
                direction="row"
                spacing={3}
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid rgba(255,255,255,0.2)',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {[
                  { label: 'الجلسات', value: studentSessions.length },
                  { label: 'نسبة الحضور', value: `${attendanceRate}%` },
                  { label: 'الخطط', value: studentPlans.length },
                  { label: 'الأهداف المحققة', value: `${achievedGoals}/${totalGoals}` },
                  { label: 'التقييمات', value: studentEvals.length },
                ].map(stat => (
                  <Box key={stat.label} sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={800} color="#fff">
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Container>
          </Box>

          <Container maxWidth="lg" sx={{ py: 3 }}>
            {/* Tabs */}
            <Paper sx={{ mb: 2.5, borderRadius: 3, overflow: 'hidden' }}>
              <Tabs
                value={detailTab}
                onChange={(_, v) => setDetailTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ '& .MuiTab-root': { fontWeight: 600, py: 1.5 } }}
              >
                <Tab icon={<PersonIcon />} label="الملف الشخصي" iconPosition="start" />
                <Tab
                  icon={<PlanIcon />}
                  label={`الخطط الفردية (${studentPlans.length})`}
                  iconPosition="start"
                />
                <Tab
                  icon={<EvalIcon />}
                  label={`التقييمات (${studentEvals.length})`}
                  iconPosition="start"
                />
                <Tab
                  icon={<SessionsIcon />}
                  label={`الجلسات (${studentSessions.length})`}
                  iconPosition="start"
                />
              </Tabs>
            </Paper>

            {/* ── Tab 0: Profile ── */}
            {detailTab === 0 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <Paper
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <PersonIcon fontSize="small" color="primary" /> المعلومات الشخصية
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {[
                      { label: 'الاسم الكامل', value: selectedStudent.fullName },
                      { label: 'الجنس', value: selectedStudent.gender },
                      {
                        label: 'تاريخ الميلاد',
                        value: selectedStudent.birthDate
                          ? new Date(selectedStudent.birthDate).toLocaleDateString('ar-SA')
                          : '-',
                      },
                      { label: 'العمر', value: calcAge(selectedStudent.birthDate) },
                      {
                        label: 'الحالة',
                        value: statusConfig[selectedStudent.status || 'active']?.label || '-',
                      },
                      { label: 'البرنامج', value: selectedStudent.program || '-' },
                      {
                        label: 'تاريخ الانتساب',
                        value: selectedStudent.enrollmentDate
                          ? new Date(selectedStudent.enrollmentDate).toLocaleDateString('ar-SA')
                          : '-',
                      },
                    ].map(row => (
                      <Box
                        key={row.label}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {row.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {row.value}
                        </Typography>
                      </Box>
                    ))}
                    {selectedStudent.notes && (
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          bgcolor: alpha(theme.palette.info.main, 0.08),
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          ملاحظات
                        </Typography>
                        <Typography variant="body2">{selectedStudent.notes}</Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <ContactIcon fontSize="small" color="secondary" /> معلومات ولي الأمر
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {[
                      { label: 'الاسم', value: selectedStudent.parentName || '-' },
                      { label: 'صلة القرابة', value: selectedStudent.parentRelation || '-' },
                      { label: 'رقم الهاتف', value: selectedStudent.parentPhone || '-' },
                    ].map(row => (
                      <Box
                        key={row.label}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {row.label}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {row.label === 'رقم الهاتف' && row.value !== '-' && (
                            <PhoneIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          )}
                          <Typography variant="body2" fontWeight={600}>
                            {row.value}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2.5, mb: 1 }}>
                      أنواع الإعاقة
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {(selectedStudent.disabilityTypes || []).map((d, i) => (
                        <Chip key={i} label={d} size="small" color="warning" variant="outlined" />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* ── Tab 1: Plans ── */}
            {detailTab === 1 && (
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 2,
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    الخطط الفردية (IEP)
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    size="small"
                    onClick={openCreatePlan}
                  >
                    خطة جديدة
                  </Button>
                </Box>
                {studentPlans.length === 0 ? (
                  <EmptyState title="لا توجد خطط فردية لهذا الطالب" height={150} />
                ) : (
                  studentPlans.map((plan, pi) => (
                    <motion.div
                      key={plan._id || pi}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: pi * 0.08 }}
                    >
                      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2.5 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              الخطة #{pi + 1} — {(plan.goals || []).length} هدف
                            </Typography>
                            <Chip
                              label={`${(plan.goals || []).filter(g => g.achieved).length}/${(plan.goals || []).length} محقق`}
                              size="small"
                              color={
                                (plan.goals || []).every(g => g.achieved) ? 'success' : 'warning'
                              }
                              variant="outlined"
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={
                              plan.goals?.length
                                ? (plan.goals.filter(g => g.achieved).length / plan.goals.length) *
                                  100
                                : 0
                            }
                            color="success"
                            sx={{ mb: 2, height: 5, borderRadius: 3 }}
                          />
                          <List dense disablePadding>
                            {(plan.goals || []).map((g, gi) => (
                              <ListItem key={gi} divider={gi < (plan.goals || []).length - 1}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  {g.achieved ? (
                                    <CheckIcon fontSize="small" color="success" />
                                  ) : (
                                    <PendingIcon fontSize="small" color="warning" />
                                  )}
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip
                                        label={g.area}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: 10 }}
                                      />
                                      <Typography variant="body2" fontWeight={500}>
                                        {g.objective}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    g.activities?.length
                                      ? `الأنشطة: ${g.activities.join(' ، ')}`
                                      : null
                                  }
                                />
                                <Chip
                                  label={g.achieved ? 'محقق' : 'قيد التنفيذ'}
                                  size="small"
                                  color={g.achieved ? 'success' : 'warning'}
                                  variant="outlined"
                                />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
                <Dialog
                  open={planDialogOpen}
                  onClose={() => setPlanDialogOpen(false)}
                  maxWidth="md"
                  fullWidth
                >
                  <DialogTitle sx={{ fontWeight: 700 }}>
                    {editPlan ? 'تعديل الخطة الفردية' : 'إنشاء خطة فردية جديدة'}
                  </DialogTitle>
                  <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      حدد أهداف الطالب في مختلف المجالات
                    </Typography>
                    {planForm.goals.map((goal, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                        <Typography variant="caption" fontWeight={700} color="primary">
                          الهدف #{idx + 1}
                        </Typography>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              label="المجال"
                              value={goal.area}
                              onChange={e => updateGoalRow(idx, 'area', e.target.value)}
                            >
                              {[
                                'حسي',
                                'لغوي',
                                'حركي',
                                'اجتماعي',
                                'معرفي',
                                'استقلالية',
                                'سلوكي',
                              ].map(a => (
                                <MenuItem key={a} value={a}>
                                  {a}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={8}>
                            <TextField
                              fullWidth
                              size="small"
                              label="الهدف"
                              value={goal.objective}
                              onChange={e => updateGoalRow(idx, 'objective', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="الأنشطة (مفصولة بفاصلة)"
                              value={(goal.activities || []).join(', ')}
                              onChange={e =>
                                updateGoalRow(
                                  idx,
                                  'activities',
                                  e.target.value
                                    .split(',')
                                    .map(a => a.trim())
                                    .filter(Boolean)
                                )
                              }
                            />
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                    <Button startIcon={<AddIcon />} onClick={addGoalRow} size="small">
                      إضافة هدف
                    </Button>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setPlanDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSavePlan}>
                      حفظ الخطة
                    </Button>
                  </DialogActions>
                </Dialog>
              </Paper>
            )}

            {/* ── Tab 2: Evaluations ── */}
            {detailTab === 2 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={5}>
                  <Paper
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      مخطط المهارات الشامل
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      تقييم أداء الطالب في مجالات منتسوري
                    </Typography>
                    {studentEvals.length === 0 ? (
                      <EmptyState title="لا توجد تقييمات" height={200} />
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <RadarChart
                          data={radarData}
                          margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
                        >
                          <PolarGrid stroke={isDark ? '#444' : '#e0e0e0'} />
                          <PolarAngleAxis
                            dataKey="area"
                            tick={{
                              fontSize: 11,
                              fill: isDark ? '#ccc' : '#555',
                              fontFamily: 'inherit',
                            }}
                          />
                          <Radar
                            name="المستوى"
                            dataKey="level"
                            stroke="#667eea"
                            fill="#667eea"
                            fillOpacity={0.35}
                            strokeWidth={2}
                          />
                          <RTooltip formatter={v => [`${v}%`, 'المستوى']} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {Object.entries(levelColors).map(([lvl, clr]) => (
                        <Box key={lvl} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: clr }} />
                          <Typography variant="caption">{lvl}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={7}>
                  <Paper
                    sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                      سجل التقييمات التفصيلي
                    </Typography>
                    {studentEvals.length === 0 ? (
                      <EmptyState title="لا توجد تقييمات" height={150} />
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow
                              sx={{
                                '& th': {
                                  fontWeight: 700,
                                  bgcolor: isDark ? 'background.paper' : '#f5f7fa',
                                },
                              }}
                            >
                              <TableCell>المجال</TableCell>
                              <TableCell>المهارة</TableCell>
                              <TableCell>المستوى</TableCell>
                              <TableCell>التاريخ</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {studentEvals.map((ev, i) => (
                              <TableRow key={ev._id || i} hover>
                                <TableCell>
                                  <Chip
                                    label={ev.area}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: 11 }}
                                  />
                                </TableCell>
                                <TableCell>{ev.skill}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={ev.level}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha(levelColors[ev.level] || '#ccc', 0.15),
                                      color: levelColors[ev.level] || '#666',
                                      fontWeight: 700,
                                      fontSize: 11,
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                                  {ev.date ? new Date(ev.date).toLocaleDateString('ar-SA') : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* ── Tab 3: Sessions ── */}
            {detailTab === 3 && (
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 2,
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    سجل الجلسات
                  </Typography>
                  {studentSessions.length > 0 && (
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={`${studentSessions.filter(s => s.status === 'حضر').length} حضر`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        label={`${studentSessions.filter(s => s.status === 'غاب').length} غاب`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                      <Chip
                        label={`${attendanceRate}% حضور`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                  )}
                </Box>
                {studentSessions.length === 0 ? (
                  <EmptyState title="لا توجد جلسات مسجلة لهذا الطالب" height={150} />
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow
                          sx={{
                            '& th': {
                              fontWeight: 700,
                              bgcolor: isDark ? 'background.paper' : '#f5f7fa',
                            },
                          }}
                        >
                          <TableCell>التاريخ</TableCell>
                          <TableCell>النوع</TableCell>
                          <TableCell>المدة</TableCell>
                          <TableCell>المعلم</TableCell>
                          <TableCell>الحضور</TableCell>
                          <TableCell>ملاحظات</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentSessions.map((s, i) => (
                          <TableRow key={s._id || i} hover>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {s.date ? new Date(s.date).toLocaleDateString('ar-SA') : '-'}
                            </TableCell>
                            <TableCell>{s.type || '-'}</TableCell>
                            <TableCell>{s.duration ? `${s.duration} دقيقة` : '-'}</TableCell>
                            <TableCell>{s.instructor || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={s.status || '-'}
                                size="small"
                                color={
                                  s.status === 'حضر'
                                    ? 'success'
                                    : s.status === 'غاب'
                                      ? 'error'
                                      : 'default'
                                }
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: 11 }}
                              />
                            </TableCell>
                            <TableCell
                              sx={{ color: 'text.secondary', fontSize: 12, maxWidth: 180 }}
                            >
                              <Typography variant="caption" noWrap>
                                {s.notes || '-'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            )}
          </Container>
        </Box>
        <ConfirmDialog {...confirmState} />
      </DashboardErrorBoundary>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     Students List View
  ═══════════════════════════════════════════════════════════════ */
  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
        {/* Gradient Header */}
        <Box
          sx={{
            background: gradients.info,
            py: 3,
            px: 3,
            mb: -3,
            borderRadius: '0 0 24px 24px',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: -25,
              left: -25,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            },
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box>
                <Button
                  startIcon={<BackIcon />}
                  onClick={() => navigate('/montessori')}
                  sx={{ color: '#fff', mb: 0.5 }}
                >
                  العودة للوحة التحكم
                </Button>
                <Typography variant="h5" fontWeight={800} color="#fff">
                  إدارة طلاب مونتيسوري
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  تسجيل الطلاب وإدارة الملفات الشخصية والخطط الفردية
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير CSV">
                  <IconButton
                    onClick={handleExport}
                    sx={{
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تحديث">
                  <IconButton
                    onClick={loadData}
                    sx={{
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreate}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  تسجيل طالب
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pt: 5, pb: 4 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {/* KPI Row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="إجمالي الطلاب"
                value={students.length}
                icon={<ChildIcon />}
                gradient={gradients.info}
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="نشطون"
                value={activeCount}
                icon={<ActiveIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="ذكور"
                value={males}
                icon={<MaleIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="الخطط الفردية"
                value={totalPlans}
                icon={<PlanIcon />}
                gradient={gradients.warning}
                delay={3}
              />
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالاسم أو ولي الأمر..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="نوع الإعاقة"
                  value={filterDisability}
                  onChange={e => {
                    setFilterDisability(e.target.value);
                    setPage(0);
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {DISABILITY_OPTIONS.map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3} md={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="الحالة"
                  value={filterStatus}
                  onChange={e => {
                    setFilterStatus(e.target.value);
                    setPage(0);
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {STUDENT_STATUSES.map(s => (
                    <MenuItem key={s} value={s}>
                      {statusConfig[s]?.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} طالب`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            {filtered.length === 0 ? (
              <Box sx={{ p: 4 }}>
                <EmptyState title="لا يوجد طلاب مطابقون للبحث" />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          '& th': {
                            fontWeight: 700,
                            bgcolor: isDark ? 'background.paper' : '#f5f7fa',
                          },
                        }}
                      >
                        <TableCell>#</TableCell>
                        <TableCell>الطالب</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>العمر</TableCell>
                        <TableCell>أنواع الإعاقة</TableCell>
                        <TableCell>البرنامج</TableCell>
                        <TableCell>ولي الأمر</TableCell>
                        <TableCell align="center">إجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginated.map((s, i) => (
                        <TableRow
                          key={s._id || i}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                          }}
                          onClick={() => {
                            setSelectedStudent(s);
                            setDetailTab(0);
                          }}
                        >
                          <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                            {page * ROWS_PER_PAGE + i + 1}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: alpha(s.gender === 'أنثى' ? '#e91e63' : '#2196f3', 0.15),
                                  color: s.gender === 'أنثى' ? '#e91e63' : '#2196f3',
                                  fontSize: 16,
                                }}
                              >
                                {s.gender === 'أنثى' ? (
                                  <FemaleIcon fontSize="small" />
                                ) : (
                                  <MaleIcon fontSize="small" />
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {s.fullName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.gender}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusConfig[s.status || 'active']?.label}
                              size="small"
                              color={statusConfig[s.status || 'active']?.color || 'default'}
                              sx={{ fontWeight: 600, fontSize: 11 }}
                            />
                          </TableCell>
                          <TableCell>{calcAge(s.birthDate)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {(s.disabilityTypes || []).slice(0, 2).map((d, di) => (
                                <Chip
                                  key={di}
                                  label={d}
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  sx={{ fontSize: 10 }}
                                />
                              ))}
                              {(s.disabilityTypes || []).length > 2 && (
                                <Chip
                                  label={`+${(s.disabilityTypes || []).length - 2}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: 10 }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: 12 }}
                            >
                              {s.program || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {s.parentName ? (
                              <Box>
                                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                                  {s.parentName}
                                </Typography>
                                {s.parentPhone && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
                                  >
                                    <PhoneIcon sx={{ fontSize: 11 }} />
                                    {s.parentPhone}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" onClick={e => e.stopPropagation()}>
                            <Tooltip title="عرض الملف">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedStudent(s);
                                  setDetailTab(0);
                                }}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton size="small" onClick={() => openEdit(s)}>
                                <EditIcon fontSize="small" color="primary" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(s)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filtered.length}
                  page={page}
                  onPageChange={(_, v) => setPage(v)}
                  rowsPerPage={ROWS_PER_PAGE}
                  rowsPerPageOptions={[ROWS_PER_PAGE]}
                  labelDisplayedRows={({ from, to, count: c }) => `${from}–${to} من ${c}`}
                />
              </>
            )}
          </Paper>
        </Container>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
            {editItem ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  المعلومات الشخصية
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="الاسم الكامل"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="تاريخ الميلاد"
                  value={form.birthDate}
                  onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  label="الجنس"
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                >
                  {GENDER_OPTIONS.map(g => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="أنواع الإعاقة"
                  value={form.disabilityTypes}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      disabilityTypes:
                        typeof e.target.value === 'string'
                          ? e.target.value.split(',')
                          : e.target.value,
                    }))
                  }
                  SelectProps={{ multiple: true, renderValue: sel => sel.join('، ') }}
                >
                  {DISABILITY_OPTIONS.map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  label="الحالة"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STUDENT_STATUSES.map(s => (
                    <MenuItem key={s} value={s}>
                      {statusConfig[s]?.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="تاريخ الانتساب"
                  value={form.enrollmentDate}
                  onChange={e => setForm(f => ({ ...f, enrollmentDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="البرنامج"
                  value={form.program}
                  onChange={e => setForm(f => ({ ...f, program: e.target.value }))}
                >
                  <MenuItem value="">— بدون —</MenuItem>
                  {PROGRAM_OPTIONS.map(p => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  معلومات ولي الأمر
                </Typography>
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="اسم ولي الأمر"
                  value={form.parentName}
                  onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  fullWidth
                  label="رقم الهاتف"
                  value={form.parentPhone}
                  onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  label="صلة القرابة"
                  value={form.parentRelation}
                  onChange={e => setForm(f => ({ ...f, parentRelation: e.target.value }))}
                >
                  {RELATION_OPTIONS.map(r => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ملاحظات"
                  multiline
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button variant="contained" onClick={handleSave} disabled={!form.fullName}>
              {editItem ? 'حفظ التعديلات' : 'تسجيل الطالب'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
      <ConfirmDialog {...confirmState} />
    </DashboardErrorBoundary>
  );
};

export default MontessoriStudents;
