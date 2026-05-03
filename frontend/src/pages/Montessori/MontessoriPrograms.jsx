/**
 * MontessoriPrograms — إدارة برامج مونتيسوري (Professional v3)
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
  CardContent,
  Card,
  useTheme,
  alpha,
} from '@mui/material';
import {
  School as SchoolIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Home as HomeIcon,
  TouchApp as TouchIcon,
  MenuBook as BookIcon,
  Functions as MathIcon,
  Public as GlobalIcon,
  Schedule as ScheduleIcon,
  EmojiObjects as OutcomeIcon,
  Build as MaterialIcon,
  Groups as GroupsIcon,
  Star as StarIcon,
  Assignment as AssignIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog, { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { gradients, statusColors } from '../../theme/palette';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';
import montessoriService from '../../services/montessoriService';

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

const MiniKPI = ({ label, value, icon, gradient, delay = 0, suffix = '' }) => {
  const numVal = typeof value === 'number' ? value : parseInt(value) || 0;
  const { count, ref } = useAnimatedCounter(numVal, 1200);
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
              {suffix}
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

const MONTESSORI_AREAS = [
  {
    id: 'practical',
    label: 'الحياة العملية',
    icon: <HomeIcon />,
    color: '#667eea',
    desc: 'مهارات الحياة اليومية والاستقلالية الشخصية',
    activities: ['الصب والسكب', 'الطي', 'التنظيف', 'ربط الأحذية', 'تمارين الخياطة'],
  },
  {
    id: 'sensorial',
    label: 'الحسي',
    icon: <TouchIcon />,
    color: '#43e97b',
    desc: 'تطوير الحواس الخمس وتدقيق الإدراك الحسي',
    activities: [
      'أسطوانات الصوت',
      'لوحة اللمس',
      'أكياس الأسرار',
      'الألوان التدريجية',
      'أبراج الوردة',
    ],
  },
  {
    id: 'language',
    label: 'اللغة',
    icon: <BookIcon />,
    color: '#f093fb',
    desc: 'اكتساب اللغة وتطوير مهارات القراءة والكتابة',
    activities: [
      'الحروف الخشنة',
      'صندوق الرمل',
      'بطاقات المفردات',
      'جهاز الكلمات المتحركة',
      'قراءة بطاقات الجمل',
    ],
  },
  {
    id: 'math',
    label: 'الرياضيات',
    icon: <MathIcon />,
    color: '#ff9800',
    desc: 'أساسيات الأرقام والعمليات الحسابية والهندسة',
    activities: [
      'خرز الذهب',
      'الأعداد الخشنة',
      'حبوب الخرز العشرية',
      'لوح الضرب',
      'المسطرة التسلسلية',
    ],
  },
  {
    id: 'cultural',
    label: 'الثقافي',
    icon: <GlobalIcon />,
    color: '#26c6da',
    desc: 'العلوم والجغرافيا والتاريخ والفنون والموسيقى',
    activities: [
      'خريطة العالم',
      'تصنيف الحيوانات',
      'تجارب العلوم',
      'الفنون الحرة',
      'الأغاني التقليدية',
    ],
  },
];

const statusConfig = {
  active: { label: 'نشط', color: 'success' },
  planned: { label: 'مخطط', color: 'info' },
  suspended: { label: 'معلق', color: 'warning' },
  completed: { label: 'مكتمل', color: 'default' },
  archived: { label: 'مؤرشف', color: 'default' },
};
const STATUS_OPTIONS = Object.keys(statusConfig);
const AGE_GROUPS = ['3-6', '6-9', '9-12', '3-12'];
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const TIME_SLOTS = ['8:00', '9:00', '10:00', '11:00', '12:00'];
const arr = v => (Array.isArray(v) ? v : []);

const DEMO_PROGRAMS = [
  {
    _id: '1',
    name: 'برنامج الحياة العملية',
    ageGroup: '3-6',
    capacity: 20,
    enrolled: 15,
    instructor: 'أ. نورة محمد',
    status: 'active',
    schedule: 'أحد - خميس 8:00-12:00',
    description: 'يركز على تنمية مهارات الاستقلالية الشخصية والحياة اليومية.',
    areas: ['practical', 'sensorial'],
    outcomes: ['تطوير التنسيق الحركي الدقيق', 'تعزيز الاستقلالية', 'بناء الثقة بالنفس'],
    materials: ['أدوات الصب والسكب', 'مجموعة الإطارات', 'خرز الخيط'],
  },
  {
    _id: '2',
    name: 'برنامج الحسي',
    ageGroup: '3-6',
    capacity: 15,
    enrolled: 12,
    instructor: 'أ. سارة أحمد',
    status: 'active',
    schedule: 'أحد - خميس 9:00-12:00',
    description: 'يساعد الأطفال على تطوير وتدقيق حواسهم الخمس.',
    areas: ['sensorial'],
    outcomes: ['تمييز الأشكال والألوان', 'تطوير حاسة السمع', 'تنمية الإدراك الحسي'],
    materials: ['أسطوانات الصوت', 'ألواح اللمس', 'أبراج الوردة'],
  },
  {
    _id: '3',
    name: 'برنامج اللغة',
    ageGroup: '3-6',
    capacity: 18,
    enrolled: 10,
    instructor: 'أ. فاطمة علي',
    status: 'active',
    schedule: 'أحد - خميس 8:00-11:00',
    description: 'يهدف إلى تنمية مهارات اللغة العربية قراءةً وكتابةً.',
    areas: ['language'],
    outcomes: ['التعرف على حروف الهجاء', 'بدء القراءة', 'تطوير المفردات'],
    materials: ['الحروف الخشنة', 'صندوق الرمل', 'بطاقات المفردات'],
  },
  {
    _id: '4',
    name: 'برنامج الرياضيات',
    ageGroup: '6-9',
    capacity: 16,
    enrolled: 9,
    instructor: 'أ. ليلى عبدالله',
    status: 'planned',
    schedule: 'أحد - خميس 10:00-12:00',
    description: 'يقدم مفاهيم الرياضيات بطريقة ملموسة وعملية.',
    areas: ['math'],
    outcomes: ['فهم قيمة الأرقام', 'إتقان الجمع والطرح', 'مفاهيم الضرب'],
    materials: ['خرز الذهب', 'الأعداد الخشنة', 'حبوب الخرز العشرية'],
  },
  {
    _id: '5',
    name: 'البرنامج الشامل',
    ageGroup: '3-12',
    capacity: 25,
    enrolled: 22,
    instructor: 'أ. منى خالد',
    status: 'active',
    schedule: 'أحد - خميس 8:00-14:00',
    description: 'برنامج متكامل يغطي جميع مجالات منتسوري الخمسة مع مسار فردي.',
    areas: ['practical', 'sensorial', 'language', 'math', 'cultural'],
    outcomes: ['التطور الشامل في جميع المجالات', 'تنمية التفكير الناقد', 'تعزيز الاستقلالية'],
    materials: ['مجموعة منتسوري الكاملة'],
  },
];

const DEMO_STUDENTS = [
  {
    _id: '1',
    fullName: 'أحمد محمد العلي',
    gender: 'ذكر',
    program: 'برنامج الحياة العملية',
    progress: { practical: 75, sensorial: 60, language: 40, math: 30 },
  },
  {
    _id: '2',
    fullName: 'سارة خالد المحمد',
    gender: 'أنثى',
    program: 'برنامج الحسي',
    progress: { practical: 65, sensorial: 80, language: 50, math: 45 },
  },
  {
    _id: '3',
    fullName: 'عبدالله فهد الأحمد',
    gender: 'ذكر',
    program: 'البرنامج الشامل',
    progress: { practical: 80, sensorial: 72, language: 65, math: 58 },
  },
  {
    _id: '4',
    fullName: 'لمى سعد الحربي',
    gender: 'أنثى',
    program: 'برنامج اللغة',
    progress: { practical: 70, sensorial: 65, language: 75, math: 50 },
  },
  {
    _id: '5',
    fullName: 'محمد عبدالرحمن',
    gender: 'ذكر',
    program: 'برنامج الحياة العملية',
    progress: { practical: 55, sensorial: 45, language: 35, math: 25 },
  },
];

const DEMO_SCHEDULE = [
  {
    day: 'الأحد',
    slots: {
      '8:00': 'الحياة العملية',
      '9:00': 'الحسي',
      '10:00': 'اللغة',
      '11:00': 'الرياضيات',
      '12:00': '',
    },
  },
  {
    day: 'الاثنين',
    slots: {
      '8:00': 'الحسي',
      '9:00': 'الحياة العملية',
      '10:00': 'الثقافي',
      '11:00': 'اللغة',
      '12:00': '',
    },
  },
  {
    day: 'الثلاثاء',
    slots: {
      '8:00': 'الرياضيات',
      '9:00': 'اللغة',
      '10:00': 'الحياة العملية',
      '11:00': 'الحسي',
      '12:00': '',
    },
  },
  {
    day: 'الأربعاء',
    slots: {
      '8:00': 'اللغة',
      '9:00': 'الرياضيات',
      '10:00': 'الحسي',
      '11:00': 'الثقافي',
      '12:00': '',
    },
  },
  {
    day: 'الخميس',
    slots: {
      '8:00': 'الثقافي',
      '9:00': 'الرياضيات',
      '10:00': 'الحياة العملية',
      '11:00': 'اللغة',
      '12:00': 'مراجعة',
    },
  },
];

const areaColor = label =>
  MONTESSORI_AREAS.find(a => a.label === label || (label && label.includes(a.label.slice(0, 4))))
    ?.color || '#90a4ae';

const MontessoriPrograms = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    ageGroup: '3-6',
    capacity: 20,
    enrolled: 0,
    instructor: '',
    status: 'active',
    schedule: '',
    description: '',
    areas: [],
    outcomes: [],
    materials: [],
  });
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [detailTab, setDetailTab] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await montessoriService.getPrograms();
      setPrograms(arr(res?.length ? res : DEMO_PROGRAMS));
    } catch {
      setPrograms(DEMO_PROGRAMS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activePrograms = programs.filter(p => p.status === 'active').length;
  const totalEnrolled = programs.reduce((s, p) => s + (p.enrolled || 0), 0);
  const totalCapacity = programs.reduce((s, p) => s + (p.capacity || 0), 0);
  const avgFill = totalCapacity ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const filtered = programs.filter(p => {
    const ms =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.instructor?.toLowerCase().includes(search.toLowerCase());
    const mf = !filterStatus || p.status === filterStatus;
    return ms && mf;
  });

  const pieData = STATUS_OPTIONS.map(s => ({
    name: statusConfig[s].label,
    value: programs.filter(p => p.status === s).length,
  })).filter(d => d.value > 0);
  const PIE_COLORS = ['#66bb6a', '#42a5f5', '#ff9800', '#9e9e9e', '#78909c'];
  const barData = programs
    .slice(0, 8)
    .map(p => ({
      name: p.name.replace('برنامج ', '').slice(0, 8),
      طاقة: p.capacity || 0,
      مسجلون: p.enrolled || 0,
    }));

  const openCreate = () => {
    setEditItem(null);
    setForm({
      name: '',
      ageGroup: '3-6',
      capacity: 20,
      enrolled: 0,
      instructor: '',
      status: 'active',
      schedule: '',
      description: '',
      areas: [],
      outcomes: [],
      materials: [],
    });
    setDialogOpen(true);
  };
  const openEdit = prog => {
    setEditItem(prog);
    setForm({
      name: prog.name || '',
      ageGroup: prog.ageGroup || '3-6',
      capacity: prog.capacity || 20,
      enrolled: prog.enrolled || 0,
      instructor: prog.instructor || '',
      status: prog.status || 'active',
      schedule: prog.schedule || '',
      description: prog.description || '',
      areas: prog.areas || [],
      outcomes: prog.outcomes || [],
      materials: prog.materials || [],
    });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    try {
      if (editItem) {
        await montessoriService.updateProgram(editItem._id, form);
        showSnackbar('تم تحديث البرنامج بنجاح', 'success');
      } else {
        await montessoriService.createProgram(form);
        showSnackbar('تم إنشاء البرنامج بنجاح', 'success');
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      showSnackbar('حدث خطأ أثناء الحفظ', 'error');
      logger.error('Save program', err);
    }
  };
  const handleDelete = prog => {
    showConfirm({
      title: 'حذف برنامج',
      message: `هل أنت متأكد من حذف "${prog.name}"؟`,
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await montessoriService.deleteProgram(prog._id);
          showSnackbar('تم الحذف', 'success');
          loadData();
        } catch {
          showSnackbar('فشل الحذف', 'error');
        }
      },
    });
  };
  const handleExport = () => {
    const hdr = 'الاسم,الفئة,الطاقة,المسجلون,المعلم,الحالة,الجدول';
    const rows = programs.map(
      p =>
        `"${p.name}",${p.ageGroup},${p.capacity},${p.enrolled},"${p.instructor || '-'}",${statusConfig[p.status || 'active']?.label},"${p.schedule || '-'}"`
    );
    const blob = new Blob(['\uFEFF' + [hdr, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `programs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showSnackbar('تم التصدير', 'success');
  };

  /* ── Program Detail View ── */
  if (selectedProgram) {
    const prog = selectedProgram;
    const fill = prog.capacity ? Math.round((prog.enrolled / prog.capacity) * 100) : 0;
    const progAreas = MONTESSORI_AREAS.filter(a => arr(prog.areas).includes(a.id));
    const showAreas = progAreas.length > 0 ? progAreas : MONTESSORI_AREAS;
    const progStudents = DEMO_STUDENTS.filter(s => s.program === prog.name);

    return (
      <DashboardErrorBoundary>
        <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
          {/* Header */}
          <Box
            sx={{
              background: gradients.success,
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
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            <Container maxWidth="lg">
              <Button
                startIcon={<BackIcon />}
                onClick={() => setSelectedProgram(null)}
                sx={{ color: '#fff', mb: 1 }}
              >
                العودة للقائمة
              </Button>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Avatar sx={{ width: 72, height: 72, bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <SchoolIcon sx={{ fontSize: 36, color: '#fff' }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h5" fontWeight={800} color="#fff">
                      {prog.name}
                    </Typography>
                    <Chip
                      label={statusConfig[prog.status || 'active']?.label}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
                    />
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      label={`الفئة: ${prog.ageGroup} سنة`}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                    />
                    <Chip
                      label={`${prog.enrolled}/${prog.capacity} مسجل`}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                    />
                    {prog.instructor && (
                      <Chip
                        label={prog.instructor}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                      />
                    )}
                    {prog.schedule && (
                      <Chip
                        label={prog.schedule}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' }}
                      />
                    )}
                  </Stack>
                </Box>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => {
                    openEdit(prog);
                    setSelectedProgram(null);
                  }}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  تعديل
                </Button>
              </Box>
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
                  { l: 'المسجلون', v: prog.enrolled },
                  { l: 'الطاقة', v: prog.capacity },
                  { l: 'الامتلاء', v: `${fill}%` },
                  { l: 'المجالات', v: showAreas.length },
                  { l: 'الأهداف', v: arr(prog.outcomes).length },
                ].map(s => (
                  <Box key={s.l} sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={800} color="#fff">
                      {s.v}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      {s.l}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Container>
          </Box>

          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Paper sx={{ mb: 2.5, borderRadius: 3, overflow: 'hidden' }}>
              <Tabs
                value={detailTab}
                onChange={(_, v) => setDetailTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ '& .MuiTab-root': { fontWeight: 600, py: 1.5 } }}
              >
                <Tab icon={<AssignIcon />} iconPosition="start" label="نظرة عامة" />
                <Tab icon={<BookIcon />} iconPosition="start" label="المنهج والأنشطة" />
                <Tab
                  icon={<GroupsIcon />}
                  iconPosition="start"
                  label={`الطلاب (${progStudents.length})`}
                />
                <Tab icon={<ScheduleIcon />} iconPosition="start" label="الجدول الأسبوعي" />
              </Tabs>
            </Paper>

            {/* Tab 0 — Overview */}
            {detailTab === 0 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={4}>
                  <Paper
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      نسبة الامتلاء
                    </Typography>
                    <Box
                      sx={{ position: 'relative', width: 140, height: 140, mx: 'auto', my: 1.5 }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[{ value: fill }, { value: 100 - fill }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={65}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            <Cell fill="#43e97b" />
                            <Cell fill={isDark ? '#333' : '#f0f0f0'} />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%,-50%)',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h4" fontWeight={800} color="success.main">
                          {fill}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ممتلئ
                        </Typography>
                      </Box>
                    </Box>
                    <Stack direction="row" justifyContent="center" spacing={2}>
                      <Box>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                          {prog.enrolled}
                        </Typography>
                        <Typography variant="caption">مسجل</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {prog.capacity}
                        </Typography>
                        <Typography variant="caption">الطاقة</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
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
                      معلومات البرنامج
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {[
                      { label: 'اسم البرنامج', value: prog.name },
                      { label: 'المعلم', value: prog.instructor || '-' },
                      { label: 'الفئة العمرية', value: `${prog.ageGroup} سنة` },
                      { label: 'الجدول', value: prog.schedule || '-' },
                      { label: 'الحالة', value: statusConfig[prog.status || 'active']?.label },
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
                    {prog.description && (
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          bgcolor: alpha(theme.palette.success.main, 0.07),
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          وصف البرنامج
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {prog.description}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
                {arr(prog.outcomes).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Paper
                      sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        gutterBottom
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <OutcomeIcon fontSize="small" color="success" />
                        نواتج التعلم
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <List dense disablePadding>
                        {arr(prog.outcomes).map((o, i) => (
                          <ListItem key={i} disableGutters>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                            </ListItemIcon>
                            <ListItemText primary={<Typography variant="body2">{o}</Typography>} />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Grid>
                )}
                {arr(prog.materials).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Paper
                      sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        gutterBottom
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <MaterialIcon fontSize="small" color="primary" />
                        المواد والأدوات
                      </Typography>
                      <Divider sx={{ mb: 1.5 }} />
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {arr(prog.materials).map((m, i) => (
                          <Chip key={i} label={m} size="small" variant="outlined" color="primary" />
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Tab 1 — Curriculum */}
            {detailTab === 1 && (
              <Grid container spacing={2}>
                {showAreas.map((area, ai) => (
                  <Grid item xs={12} sm={6} md={4} key={area.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ai * 0.07 }}
                    >
                      <Paper
                        sx={{
                          borderRadius: 3,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          height: '100%',
                        }}
                      >
                        <Box
                          sx={{
                            bgcolor: area.color,
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                          }}
                        >
                          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 40, height: 40 }}>
                            {area.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={800} color="#fff">
                              {area.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}
                            >
                              {area.desc}
                            </Typography>
                          </Box>
                        </Box>
                        <CardContent>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={600}
                            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                          >
                            الأنشطة الأساسية
                          </Typography>
                          <List dense disablePadding sx={{ mt: 0.75 }}>
                            {area.activities.map((act, i) => (
                              <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                                <ListItemIcon sx={{ minWidth: 22 }}>
                                  <Box
                                    sx={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: '50%',
                                      bgcolor: area.color,
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                                      {act}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>
                      </Paper>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Tab 2 — Students */}
            {detailTab === 2 && (
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  الطلاب المسجلون ({progStudents.length})
                </Typography>
                {progStudents.length === 0 ? (
                  <EmptyState title="لا يوجد طلاب مسجلون في هذا البرنامج حتى الآن" height={150} />
                ) : (
                  <Grid container spacing={2}>
                    {progStudents.map(s => (
                      <Grid item xs={12} md={6} key={s._id}>
                        <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: alpha(s.gender === 'أنثى' ? '#e91e63' : '#2196f3', 0.15),
                                  color: s.gender === 'أنثى' ? '#e91e63' : '#2196f3',
                                  width: 40,
                                  height: 40,
                                  fontWeight: 700,
                                }}
                              >
                                {s.fullName?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {s.fullName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.gender}
                                </Typography>
                              </Box>
                            </Box>
                            {MONTESSORI_AREAS.slice(0, 4).map(area => {
                              const val = s.progress?.[area.id] || 0;
                              return (
                                <Box key={area.id} sx={{ mb: 1 }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      mb: 0.25,
                                    }}
                                  >
                                    <Typography variant="caption" color="text.secondary">
                                      {area.label}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={600}>
                                      {val}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={val}
                                    sx={{
                                      height: 5,
                                      borderRadius: 3,
                                      bgcolor: alpha(area.color, 0.15),
                                      '& .MuiLinearProgress-bar': { bgcolor: area.color },
                                    }}
                                  />
                                </Box>
                              );
                            })}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Paper>
            )}

            {/* Tab 3 — Schedule */}
            {detailTab === 3 && (
              <Paper
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <ScheduleIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    الجدول الأسبوعي التفصيلي
                  </Typography>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 600 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '90px repeat(5, 1fr)',
                        bgcolor: isDark ? 'background.paper' : '#f5f7fa',
                        borderBottom: '2px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          الوقت
                        </Typography>
                      </Box>
                      {DAYS_AR.map(day => (
                        <Box
                          key={day}
                          sx={{
                            p: 1.5,
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {day}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    {TIME_SLOTS.map(slot => (
                      <Box
                        key={slot}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '90px repeat(5, 1fr)',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Box
                          sx={{
                            p: 1.5,
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            bgcolor: isDark ? 'background.paper' : '#fafafa',
                          }}
                        >
                          <Typography variant="caption" fontWeight={600} color="text.secondary">
                            {slot}
                          </Typography>
                        </Box>
                        {DAYS_AR.map(day => {
                          const activity =
                            DEMO_SCHEDULE.find(d => d.day === day)?.slots[slot] || '';
                          const color = areaColor(activity);
                          return (
                            <Box
                              key={day}
                              sx={{
                                p: 1,
                                borderRight: '1px solid',
                                borderColor: 'divider',
                                minHeight: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {activity ? (
                                <Chip
                                  label={activity}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(color, 0.15),
                                    color,
                                    fontWeight: 600,
                                    fontSize: 11,
                                    width: '100%',
                                    maxWidth: 110,
                                    '& .MuiChip-label': {
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    },
                                  }}
                                />
                              ) : (
                                <Typography variant="caption" color="text.disabled">
                                  —
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    {MONTESSORI_AREAS.map(a => (
                      <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                          sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: a.color }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {a.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            )}
          </Container>
        </Box>
        <ConfirmDialog {...confirmState} />
      </DashboardErrorBoundary>
    );
  }

  /* ── List View ── */
  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
        <Box
          sx={{
            background: gradients.success,
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
                  لوحة التحكم
                </Button>
                <Typography variant="h5" fontWeight={800} color="#fff">
                  برامج مونتيسوري
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  إدارة البرامج ومناهج التعليم المنتسوري الخمسة
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
                  برنامج جديد
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pt: 5, pb: 4 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="إجمالي البرامج"
                value={programs.length}
                icon={<SchoolIcon />}
                gradient={gradients.success}
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="برامج نشطة"
                value={activePrograms}
                icon={<TrendingIcon />}
                gradient={gradients.info}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="إجمالي الطلاب"
                value={totalEnrolled}
                icon={<PeopleIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MiniKPI
                label="نسبة الامتلاء"
                value={avgFill}
                icon={<CalendarIcon />}
                gradient={gradients.warning}
                delay={3}
                suffix="%"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  توزيع حالات البرامج
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الطاقة والتسجيل حسب البرنامج
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={barData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={16}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="طاقة" fill="#66bb6a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="مسجلون" fill="#42a5f5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالاسم أو المعلم..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
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
                  label="الحالة"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {STATUS_OPTIONS.map(s => (
                    <MenuItem key={s} value={s}>
                      {statusConfig[s]?.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} برنامج`}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {filtered.length === 0 ? (
            <EmptyState title="لا توجد برامج مطابقة" />
          ) : (
            <Grid container spacing={2.5}>
              {filtered.map((prog, i) => {
                const fill = prog.capacity ? Math.round((prog.enrolled / prog.capacity) * 100) : 0;
                const progAreas = MONTESSORI_AREAS.filter(a => arr(prog.areas).includes(a.id));
                return (
                  <Grid item xs={12} sm={6} md={4} xl={3} key={prog._id || i}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      style={{ height: '100%' }}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'box-shadow 0.2s, transform 0.2s',
                          '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                        }}
                      >
                        <Box
                          sx={{
                            height: 6,
                            background:
                              statusColors?.[prog.status || 'active'] || gradients.success,
                          }}
                        />
                        <CardContent sx={{ flex: 1, pt: 2 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 1.5,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <Avatar
                                sx={{
                                  bgcolor: alpha('#43e97b', 0.15),
                                  color: '#43e97b',
                                  width: 40,
                                  height: 40,
                                }}
                              >
                                <SchoolIcon fontSize="small" />
                              </Avatar>
                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={700}
                                  sx={{ lineHeight: 1.3 }}
                                >
                                  {prog.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {prog.ageGroup} سنة
                                </Typography>
                              </Box>
                            </Box>
                            <Chip
                              label={statusConfig[prog.status || 'active']?.label}
                              size="small"
                              color={statusConfig[prog.status || 'active']?.color || 'default'}
                              sx={{ fontWeight: 600, fontSize: 11 }}
                            />
                          </Box>
                          {prog.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                fontSize: 12,
                                mb: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {prog.description}
                            </Typography>
                          )}
                          {prog.instructor && (
                            <Box
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}
                            >
                              <Avatar
                                sx={{
                                  width: 20,
                                  height: 20,
                                  fontSize: 11,
                                  bgcolor: 'primary.main',
                                }}
                              >
                                {prog.instructor.charAt(3) || 'م'}
                              </Avatar>
                              <Typography variant="caption" color="text.secondary">
                                {prog.instructor}
                              </Typography>
                            </Box>
                          )}
                          {progAreas.length > 0 && (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.4 }}
                            >
                              {progAreas.map(a => (
                                <Chip
                                  key={a.id}
                                  label={a.label}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(a.color, 0.12),
                                    color: a.color,
                                    fontWeight: 600,
                                    fontSize: 10,
                                  }}
                                />
                              ))}
                            </Stack>
                          )}
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                الامتلاء
                              </Typography>
                              <Typography variant="caption" fontWeight={700}>
                                {prog.enrolled}/{prog.capacity} ({fill}%)
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={fill}
                              color={fill >= 90 ? 'error' : fill >= 70 ? 'warning' : 'success'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          {prog.schedule && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.25 }}>
                              <CalendarIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                              <Typography variant="caption" color="text.secondary">
                                {prog.schedule}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                        <Box sx={{ p: 1.5, pt: 0, display: 'flex', gap: 1 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => {
                              setSelectedProgram(prog);
                              setDetailTab(0);
                            }}
                            sx={{ borderRadius: 2, fontSize: 12 }}
                          >
                            عرض التفاصيل
                          </Button>
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              onClick={() => openEdit(prog)}
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              <EditIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(prog)}
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider' }}>
            {editItem ? 'تعديل البرنامج' : 'إنشاء برنامج جديد'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  المعلومات الأساسية
                </Typography>
              </Grid>
              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth
                  label="اسم البرنامج"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField
                  select
                  fullWidth
                  label="الفئة العمرية"
                  value={form.ageGroup}
                  onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}
                >
                  {AGE_GROUPS.map(g => (
                    <MenuItem key={g} value={g}>
                      {g} سنة
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField
                  select
                  fullWidth
                  label="الحالة"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(s => (
                    <MenuItem key={s} value={s}>
                      {statusConfig[s]?.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="الطاقة الاستيعابية"
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="المسجلون حالياً"
                  value={form.enrolled}
                  onChange={e => setForm(f => ({ ...f, enrolled: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="المعلم المسؤول"
                  value={form.instructor}
                  onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="الجدول الزمني"
                  placeholder="مثال: أحد - خميس 8:00-12:00"
                  value={form.schedule}
                  onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="وصف البرنامج"
                  multiline
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  مجالات منتسوري
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="المجالات الأساسية للبرنامج"
                  value={form.areas}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      areas:
                        typeof e.target.value === 'string'
                          ? e.target.value.split(',')
                          : e.target.value,
                    }))
                  }
                  SelectProps={{
                    multiple: true,
                    renderValue: sel =>
                      sel.map(v => MONTESSORI_AREAS.find(a => a.id === v)?.label || v).join('، '),
                  }}
                >
                  {MONTESSORI_AREAS.map(a => (
                    <MenuItem key={a.id} value={a.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: a.color }}
                        />
                        {a.label}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  نواتج التعلم والمواد
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="نواتج التعلم (مفصولة بسطر جديد)"
                  multiline
                  rows={3}
                  value={arr(form.outcomes).join('\n')}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      outcomes: e.target.value
                        .split('\n')
                        .map(o => o.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="المواد والأدوات (مفصولة بفاصلة)"
                  value={arr(form.materials).join('، ')}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      materials: e.target.value
                        .split(/،|,/)
                        .map(m => m.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button variant="contained" color="success" onClick={handleSave} disabled={!form.name}>
              {editItem ? 'حفظ التعديلات' : 'إنشاء البرنامج'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
      <ConfirmDialog {...confirmState} />
    </DashboardErrorBoundary>
  );
};

export default MontessoriPrograms;
