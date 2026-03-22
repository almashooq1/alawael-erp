/**
 * StudentReportsCenter — مركز تقارير الطلاب
 *
 * Hub page that provides access to all student report types:
 * - Comprehensive individual report
 * - Periodic center report
 * - Comparison report
 * - Parent report
 * - Progress timeline
 * - Attendance & Progress reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Stack,
  Chip,
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Autocomplete,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  DateRange as DateRangeIcon,
  Compare as CompareIcon,
  FamilyRestroom as FamilyIcon,
  Timeline as TimelineIcon,
  EventAvailable as EventAvailableIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Analytics as AnalyticsIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { gradients, brandColors } from 'theme/palette';
import studentManagementService from 'services/studentManagementService';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';

const iconMap = {
  description: <DescriptionIcon sx={{ fontSize: 40 }} />,
  date_range: <DateRangeIcon sx={{ fontSize: 40 }} />,
  compare: <CompareIcon sx={{ fontSize: 40 }} />,
  family_restroom: <FamilyIcon sx={{ fontSize: 40 }} />,
  timeline: <TimelineIcon sx={{ fontSize: 40 }} />,
  event_available: <EventAvailableIcon sx={{ fontSize: 40 }} />,
  trending_up: <TrendingUpIcon sx={{ fontSize: 40 }} />,
};

const gradientMap = {
  comprehensive: gradients.indigo,
  periodic: gradients.ocean,
  comparison: gradients.primary,
  parent: gradients.info,
  'progress-timeline': gradients.success,
  attendance: gradients.warning,
  progress: gradients.accent,
};

const typeLabels = {
  individual: 'تقرير فردي',
  center: 'تقرير مركز',
  multi: 'تقرير مقارنة',
};

const typeColors = {
  individual: 'primary',
  center: 'secondary',
  multi: 'warning',
};

const StudentReportsCenter = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const centerId = currentUser?.centerId || currentUser?.center?.centerId || 'default';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [pendingReportType, setPendingReportType] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Load students for picker
  const loadStudents = useCallback(async () => {
    if (allStudents.length > 0) return;
    setLoadingStudents(true);
    try {
      const res = await studentManagementService.getStudents({ centerId, limit: 500 });
      const list = res?.data?.students || res?.students || res?.data || [];
      setAllStudents(Array.isArray(list) ? list : []);
    } catch {
      setAllStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [centerId, allStudents.length]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentManagementService.getCenterReportsSummary(centerId);
      setSummary(res?.data || res);
    } catch (err) {
      logger.error('Error loading reports center summary:', err);
      setError('تعذر تحميل ملخص التقارير — يتم عرض البيانات الافتراضية');
      // Fallback data when API is not available
      setSummary({
        overview: {
          totalStudents: 0,
          activeStudents: 0,
          avgAttendance: 0,
          avgProgress: 0,
          recentAssessments: 0,
          studentsAtRisk: 0,
        },
        availableReports: [
          {
            id: 'comprehensive',
            title: 'التقرير الشامل للطالب',
            description: 'تقرير متكامل يشمل جميع بيانات الطالب والتقدم والتقييمات',
            type: 'individual',
            icon: 'description',
          },
          {
            id: 'periodic',
            title: 'التقرير الدوري للمركز',
            description: 'ملخص أداء جميع الطلاب لفترة زمنية محددة',
            type: 'center',
            icon: 'date_range',
          },
          {
            id: 'comparison',
            title: 'تقرير المقارنة',
            description: 'مقارنة أداء مجموعة من الطلاب جنباً إلى جنب',
            type: 'multi',
            icon: 'compare',
          },
          {
            id: 'parent',
            title: 'تقرير ولي الأمر',
            description: 'تقرير مبسط ومناسب لمشاركته مع أولياء الأمور',
            type: 'individual',
            icon: 'family_restroom',
          },
          {
            id: 'progress-timeline',
            title: 'الخط الزمني للتقدم',
            description: 'عرض بصري لتطور الطالب عبر الزمن',
            type: 'individual',
            icon: 'timeline',
          },
          {
            id: 'attendance',
            title: 'تقرير الحضور',
            description: 'تحليل مفصل لحضور وغياب طلاب المركز',
            type: 'center',
            icon: 'event_available',
          },
          {
            id: 'progress',
            title: 'تقرير التقدم',
            description: 'تحليل مفصل لمستوى تقدم الطلاب في البرامج',
            type: 'center',
            icon: 'trending_up',
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleReportClick = reportId => {
    switch (reportId) {
      case 'comprehensive':
        setPendingReportType('comprehensive');
        setStudentPickerOpen(true);
        loadStudents();
        break;
      case 'periodic':
        navigate('/student-reports/periodic');
        break;
      case 'comparison':
        navigate('/student-reports/comparison');
        break;
      case 'parent':
        setPendingReportType('parent');
        setStudentPickerOpen(true);
        loadStudents();
        break;
      case 'progress-timeline':
        setPendingReportType('comprehensive');
        setStudentPickerOpen(true);
        loadStudents();
        break;
      case 'attendance':
        navigate('/student-reports/periodic');
        break;
      case 'progress':
        navigate('/student-reports/periodic');
        break;
      default:
        break;
    }
  };

  const handleStudentSelected = (studentId) => {
    setStudentPickerOpen(false);
    if (!studentId) return;
    if (pendingReportType === 'parent') {
      navigate(`/student-report/${studentId}/parent`);
    } else {
      navigate(`/student-report/${studentId}`);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const overview = summary?.overview || {};
  const reports = summary?.availableReports || [];
  const filteredReports = searchQuery
    ? reports.filter(r =>
        r.title.includes(searchQuery) || r.description.includes(searchQuery)
      )
    : reports;

  return (
    <Box sx={{ p: 3 }}>
      {/* ═══ Header ═══ */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: gradients.indigo,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <AnalyticsIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                مركز تقارير الطلاب
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                جميع التقارير والتحليلات المتعلقة بالطلاب في مكان واحد
              </Typography>
            </Box>
          </Stack>
        </Box>
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -40,
            left: '30%',
            width: 120,
            height: 120,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.04)',
          }}
        />
      </Paper>

      {/* ═══ KPI Cards ═══ */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          {
            label: 'إجمالي الطلاب',
            value: overview.totalStudents || 0,
            icon: <GroupIcon />,
            gradient: gradients.primary,
          },
          {
            label: 'الطلاب النشطون',
            value: overview.activeStudents || 0,
            icon: <CheckCircleIcon />,
            gradient: gradients.success,
          },
          {
            label: 'متوسط الحضور',
            value: `${overview.avgAttendance || 0}%`,
            icon: <EventAvailableIcon />,
            gradient: gradients.ocean,
          },
          {
            label: 'متوسط التقدم',
            value: `${overview.avgProgress || 0}%`,
            icon: <TrendingUpIcon />,
            gradient: gradients.info,
          },
          {
            label: 'تقييمات حديثة',
            value: overview.recentAssessments || 0,
            icon: <AssessmentIcon />,
            gradient: gradients.warning,
          },
          {
            label: 'طلاب بحاجة متابعة',
            value: overview.studentsAtRisk || 0,
            icon: <WarningIcon />,
            gradient: gradients.orange,
          },
        ].map(card => (
          <Grid item xs={6} sm={4} md={2} key={card.label}>
            <Card
              sx={{
                borderRadius: 3,
                color: '#fff',
                background: card.gradient,
                boxShadow: 4,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-3px)' },
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ opacity: 0.8, fontSize: 24 }}>{card.icon}</Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {card.value}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ═══ Search ═══ */}
      <TextField
        fullWidth
        placeholder="البحث في التقارير..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* ═══ Quick Access Bar ═══ */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: '#f8f9fc' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          وصول سريع
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DescriptionIcon />}
            onClick={() => navigate('/student-management')}
          >
            التقارير الشاملة
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DateRangeIcon />}
            onClick={() => navigate('/student-reports/periodic')}
          >
            التقرير الدوري
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CompareIcon />}
            onClick={() => navigate('/student-reports/comparison')}
          >
            المقارنة
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={() => handleReportClick('parent')}
          >
            تقرير ولي الأمر
          </Button>
        </Stack>
      </Paper>

      {/* ═══ Report Types Grid ═══ */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        التقارير المتاحة ({filteredReports.length})
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {filteredReports.map(report => (
          <Grid item xs={12} sm={6} md={4} key={report.id}>
            <Card
              sx={{
                borderRadius: 3,
                height: '100%',
                transition: 'all 0.3s',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 8,
                  borderColor: 'primary.main',
                },
              }}
            >
              <CardActionArea
                onClick={() => handleReportClick(report.id)}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <Box
                  sx={{
                    p: 3,
                    background: gradientMap[report.id] || gradients.primary,
                    color: '#fff',
                    textAlign: 'center',
                  }}
                >
                  {iconMap[report.icon] || <DescriptionIcon sx={{ fontSize: 40 }} />}
                </Box>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {report.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, flexGrow: 1 }}
                  >
                    {report.description}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip
                      label={typeLabels[report.type] || report.type}
                      color={typeColors[report.type] || 'default'}
                      size="small"
                      variant="outlined"
                    />
                    <ArrowForwardIcon
                      sx={{
                        color: 'text.secondary',
                        transform: 'rotate(180deg)',
                      }}
                    />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ═══ Student Picker Dialog ═══ */}
      <Dialog
        open={studentPickerOpen}
        onClose={() => setStudentPickerOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          اختر الطالب لعرض {pendingReportType === 'parent' ? 'تقرير ولي الأمر' : 'التقرير الشامل'}
        </DialogTitle>
        <DialogContent>
          {loadingStudents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : allStudents.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>لا يوجد طلاب مسجلين</Alert>
          ) : (
            <>
              <Autocomplete
                options={allStudents}
                getOptionLabel={(opt) => opt.name || opt.studentName || `طالب ${opt._id?.slice(-4)}`}
                onChange={(_, student) => student && handleStudentSelected(student._id)}
                renderInput={(params) => (
                  <TextField {...params} label="ابحث عن طالب..." fullWidth sx={{ mt: 1, mb: 2 }} />
                )}
                noOptionsText="لا يوجد نتائج"
              />
              <Divider sx={{ mb: 1 }} />
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {allStudents.slice(0, 50).map((s) => (
                  <ListItem key={s._id} disablePadding>
                    <ListItemButton onClick={() => handleStudentSelected(s._id)}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: brandColors.primaryStart }}>
                          {(s.name || s.studentName || '?').charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={s.name || s.studentName}
                        secondary={s.studentId || s._id?.slice(-6)}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentPickerOpen(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Footer Info ═══ */}
      <Paper sx={{ p: 2, mt: 4, borderRadius: 3, bgcolor: '#f8f9fc', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          مركز تقارير الطلاب — نظام الأوائل | جميع التقارير قابلة للتصدير والطباعة
        </Typography>
      </Paper>
    </Box>
  );
};

export default StudentReportsCenter;
