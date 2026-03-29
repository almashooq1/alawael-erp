/**
 * لوحة تحكم نظام التعليم
 * Education System Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  LinearProgress,  Avatar,} from '@mui/material';
import {
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  MenuBook as SubjectIcon,
  Person as TeacherIcon,
  MeetingRoom as ClassroomIcon,
  AutoStories as CurriculumIcon,
  Schedule as TimetableIcon,
  Quiz as ExamIcon,
  Grade as GradeIcon,
  TrendingUp as TrendIcon,
  Groups as StudentsIcon,
  } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { gradients } from '../../theme/palette';

/* ── demo stats (fallback) ──────────────────────────────────── */
const defaultStats = {
  academicYears: 3,
  currentYear: '1446-1447 هـ',
  subjects: 24,
  teachers: 45,
  classrooms: 18,
  curricula: 32,
  timetables: 12,
  exams: 56,
  students: 280,
  passRate: 87,
};

/* ── module cards config ────────────────────────────────────── */
const modules = [
  {
    key: 'academic-years',
    title: 'العام الدراسي',
    titleEn: 'Academic Years',
    icon: CalendarIcon,
    gradient: gradients.primary,
    path: '/education-system/academic-years',
    desc: 'إدارة الأعوام والفصول الدراسية',
  },
  {
    key: 'subjects',
    title: 'المواد الدراسية',
    titleEn: 'Subjects',
    icon: SubjectIcon,
    gradient: gradients.info,
    path: '/education-system/subjects',
    desc: 'إدارة المواد والمقررات',
  },
  {
    key: 'teachers',
    title: 'المعلمون',
    titleEn: 'Teachers',
    icon: TeacherIcon,
    gradient: gradients.success,
    path: '/education-system/teachers',
    desc: 'إدارة بيانات المعلمين والمدربين',
  },
  {
    key: 'classrooms',
    title: 'الفصول الدراسية',
    titleEn: 'Classrooms',
    icon: ClassroomIcon,
    gradient: gradients.ocean,
    path: '/education-system/classrooms',
    desc: 'إدارة القاعات والفصول',
  },
  {
    key: 'curriculum',
    title: 'المناهج الدراسية',
    titleEn: 'Curriculum',
    icon: CurriculumIcon,
    gradient: gradients.accent,
    path: '/education-system/curriculum',
    desc: 'بناء وإدارة المناهج والخطط',
  },
  {
    key: 'timetable',
    title: 'الجدول الدراسي',
    titleEn: 'Timetable',
    icon: TimetableIcon,
    gradient: gradients.warning,
    path: '/education-system/timetable',
    desc: 'إنشاء وإدارة الجداول الدراسية',
  },
  {
    key: 'exams',
    title: 'الاختبارات',
    titleEn: 'Exams',
    icon: ExamIcon,
    gradient: gradients.orange,
    path: '/education-system/exams',
    desc: 'إنشاء وإدارة الاختبارات والتقويم',
  },
  {
    key: 'gradebook',
    title: 'سجل الدرجات',
    titleEn: 'Gradebook',
    icon: GradeIcon,
    gradient: gradients.fire,
    path: '/education-system/gradebook',
    desc: 'إدارة الدرجات والتقارير الفصلية',
  },
];

/* ── quick stat cards ───────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, gradient, subtitle }) => (
  <Card sx={{ borderRadius: 3, overflow: 'hidden', height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ background: gradient, width: 52, height: 52 }}>
          <Icon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

/* ── module link card ───────────────────────────────────────── */
const ModuleCard = ({ item, onClick }) => (
  <Card
    sx={{
      borderRadius: 3,
      height: '100%',
      transition: 'all 0.2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
    }}
  >
    <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ background: item.gradient, width: 56, height: 56 }}>
          <item.icon sx={{ fontSize: 30, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.desc}
          </Typography>
        </Box>
      </Box>
    </CardActionArea>
  </Card>
);

/* ══════════════════════════════════════════════════════════════ */
const EducationSystemDashboard = () => {
  const navigate = useNavigate();
  const [stats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>جاري تحميل نظام التعليم...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: gradients.primary,
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight={800}>
              نظام التعليم
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              إدارة شاملة للعملية التعليمية — الأعوام الدراسية، المواد، المعلمين، الفصول، المناهج،
              الجداول، الاختبارات، والدرجات
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ── Quick Stats ─────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="العام الحالي"
            value={stats.currentYear}
            icon={CalendarIcon}
            gradient={gradients.primary}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="المواد"
            value={stats.subjects}
            icon={SubjectIcon}
            gradient={gradients.info}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="المعلمون"
            value={stats.teachers}
            icon={TeacherIcon}
            gradient={gradients.success}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="الفصول"
            value={stats.classrooms}
            icon={ClassroomIcon}
            gradient={gradients.ocean}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="المناهج"
            value={stats.curricula}
            icon={CurriculumIcon}
            gradient={gradients.accent}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="الاختبارات"
            value={stats.exams}
            icon={ExamIcon}
            gradient={gradients.orange}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="الطلاب"
            value={stats.students}
            icon={StudentsIcon}
            gradient={gradients.fire}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3} lg={1.5}>
          <StatCard
            title="نسبة النجاح"
            value={`${stats.passRate}%`}
            icon={TrendIcon}
            gradient={gradients.success}
          />
        </Grid>
      </Grid>

      {/* ── Module Cards ────────────────────────────────────── */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        الأقسام الرئيسية
      </Typography>
      <Grid container spacing={2.5}>
        {modules.map(mod => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={mod.key}>
            <ModuleCard item={mod} onClick={() => navigate(mod.path)} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default EducationSystemDashboard;
