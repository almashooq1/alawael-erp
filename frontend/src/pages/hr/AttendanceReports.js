import { useState, useEffect } from 'react';

import { parentService } from 'services/parentService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import WarningIcon from '@mui/icons-material/Warning';
import StarIcon from '@mui/icons-material/Star';
import { CalendarIcon, ViewIcon } from 'utils/iconAliases';

const AttendanceReports = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const userId = currentUser?._id || currentUser?.id || '';
  const [attendanceData, setAttendanceData] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [selectedBehavior, setSelectedBehavior] = useState(null);
  const [behaviorDialogOpen, setBehaviorDialogOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await parentService.getAttendanceReports(userId);
        setAttendanceData(data);
      } catch (err) {
        logger.error('Failed to load attendance reports:', err);
        setError(err.message || 'حدث خطأ في تحميل البيانات');
        showSnackbar('حدث خطأ في تحميل تقارير الحضور', 'error');
      }
    };
    fetchData();
  }, [userId, showSnackbar]);

  const getStatusChip = status => {
    const config = {
      حاضر: { color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> },
      غائب: { color: 'error', icon: <CancelIcon sx={{ fontSize: 16 }} /> },
      متأخر: { color: 'warning', icon: <LateIcon sx={{ fontSize: 16 }} /> },
    };
    const c = config[status] || { color: 'default', icon: null };
    return (
      <Chip
        label={status}
        color={c.color}
        size="small"
        icon={c.icon}
        sx={{ fontWeight: 600, minWidth: 85 }}
      />
    );
  };

  const filteredRecords = attendanceData?.attendanceRecords?.filter(
    r =>
      !searchText ||
      r.therapist?.includes(searchText) ||
      r.notes?.includes(searchText) ||
      r.date?.includes(searchText)
  );

  const handleViewBehavior = report => {
    setSelectedBehavior(report);
    setBehaviorDialogOpen(true);
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  if (!attendanceData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل تقارير الحضور...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: gradients.primary,
          color: '#fff',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <EventNoteIcon sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                تقارير الحضور والسلوك
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                متابعة حضور الجلسات وتقارير الأداء السلوكي
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {attendanceData.summaryStats?.map(stat => (
          <Grid item xs={6} sm={3} key={stat.id}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${surfaceColors.border}`,
                background: surfaceColors.card,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: stat.color, mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: neutralColors.textSecondary, fontWeight: 500 }}
                >
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}`, mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="fullWidth"
          sx={{
            borderBottom: `1px solid ${surfaceColors.border}`,
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.95rem',
              py: 2,
            },
          }}
        >
          <Tab icon={<CalendarIcon />} label="سجل الحضور" iconPosition="start" />
          <Tab icon={<BehaviorIcon />} label="تقارير السلوك" iconPosition="start" />
          <Tab icon={<TrendingUpIcon />} label="مقاييس الأداء" iconPosition="start" />
        </Tabs>

        {/* Tab 0: Attendance Records */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 2.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث بالتاريخ، المعالج، أو الملاحظات..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: neutralColors.textDisabled }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: surfaceColors.background,
                  },
                }}
              />
            </Box>
            <TableContainer sx={{ borderRadius: 2, border: `1px solid ${surfaceColors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.background }}>
                    <TableCell sx={{ fontWeight: 700, color: neutralColors.textPrimary }}>
                      التاريخ
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: neutralColors.textPrimary }}>
                      الوقت
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: neutralColors.textPrimary }}>
                      المعالج
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: neutralColors.textPrimary }}>
                      الحالة
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: neutralColors.textPrimary }}>
                      ملاحظات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords?.length > 0 ? (
                    filteredRecords.map(record => (
                      <TableRow
                        key={record.id}
                        hover
                        sx={{
                          '&:hover': { bgcolor: `${brandColors.primary}08` },
                          transition: 'background 0.15s',
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon
                              sx={{ fontSize: 18, color: brandColors.primary, opacity: 0.7 }}
                            />
                            <Typography variant="body2" fontWeight={600}>
                              {record.date}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                            {record.time}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.therapist}
                            size="small"
                            sx={{
                              bgcolor: `${brandColors.primary}15`,
                              color: brandColors.primary,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>{getStatusChip(record.status)}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: neutralColors.textSecondary,
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {record.notes}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography sx={{ color: neutralColors.textDisabled }}>
                          {searchText ? 'لا توجد نتائج مطابقة' : 'لا توجد سجلات حضور'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title="طباعة السجل">
                <IconButton size="small">
                  <PrintIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* Tab 1: Behavior Reports */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              {attendanceData.behaviorReports?.map(report => (
                <Grid item xs={12} md={6} key={report.id}>
                  <Card
                    sx={{
                      borderRadius: 2.5,
                      border: `1px solid ${surfaceColors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: brandColors.primary,
                        boxShadow: `0 4px 16px ${brandColors.primary}20`,
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => handleViewBehavior(report)}
                  >
                    <CardHeader
                      avatar={
                        <Avatar
                          sx={{
                            bgcolor: `${brandColors.primary}15`,
                            color: brandColors.primary,
                          }}
                        >
                          <BehaviorIcon />
                        </Avatar>
                      }
                      title={
                        <Typography fontWeight={700} variant="subtitle1">
                          تقرير {report.date}
                        </Typography>
                      }
                      subheader={
                        <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                          {report.therapist}
                        </Typography>
                      }
                      action={
                        <Tooltip title="عرض التفاصيل">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      }
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: neutralColors.textSecondary,
                          mb: 2,
                          lineHeight: 1.7,
                        }}
                      >
                        {report.summary}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {report.positiveTraits?.slice(0, 3).map((trait, i) => (
                          <Chip
                            key={i}
                            label={trait}
                            size="small"
                            icon={<ThumbUpIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              bgcolor: `${statusColors.success}15`,
                              color: statusColors.success,
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        ))}
                        {report.areasToImprove?.slice(0, 2).map((area, i) => (
                          <Chip
                            key={`imp-${i}`}
                            label={area}
                            size="small"
                            icon={<WarningIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              bgcolor: `${statusColors.warning}15`,
                              color: statusColors.warning,
                              fontWeight: 500,
                              fontSize: '0.75rem',
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {(!attendanceData.behaviorReports || attendanceData.behaviorReports.length === 0) && (
                <Grid item xs={12}>
                  <Typography align="center" sx={{ py: 4, color: neutralColors.textDisabled }}>
                    لا توجد تقارير سلوكية حالياً
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Tab 2: Performance Metrics */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              {attendanceData.performanceMetrics?.map(metric => (
                <Grid item xs={12} sm={6} key={metric.id}>
                  <Card
                    sx={{
                      borderRadius: 2.5,
                      border: `1px solid ${surfaceColors.border}`,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        height: 4,
                        background: `linear-gradient(90deg, ${metric.color}, ${metric.color}88)`,
                      }}
                    />
                    <CardContent sx={{ py: 2.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 1.5,
                        }}
                      >
                        <Typography fontWeight={700} variant="subtitle1">
                          {metric.name}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            bgcolor: `${metric.color}15`,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                          }}
                        >
                          <StarIcon sx={{ fontSize: 18, color: metric.color }} />
                          <Typography fontWeight={800} variant="h6" sx={{ color: metric.color }}>
                            {metric.score}
                          </Typography>
                          <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                            / 10
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(metric.score / 10) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: `${metric.color}15`,
                          mb: 1,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: `linear-gradient(90deg, ${metric.color}, ${metric.color}cc)`,
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: neutralColors.textSecondary, fontWeight: 500 }}
                      >
                        {metric.notes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {(!attendanceData.performanceMetrics ||
                attendanceData.performanceMetrics.length === 0) && (
                <Grid item xs={12}>
                  <Typography align="center" sx={{ py: 4, color: neutralColors.textDisabled }}>
                    لا توجد مقاييس أداء حالياً
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Card>

      {/* Behavior Detail Dialog */}
      <Dialog
        open={behaviorDialogOpen}
        onClose={() => setBehaviorDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: gradients.primary,
            color: '#fff',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <BehaviorIcon />
          تقرير سلوكي - {selectedBehavior?.date}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedBehavior && (
            <>
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary, mb: 0.5 }}>
                  المعالج
                </Typography>
                <Chip
                  label={selectedBehavior.therapist}
                  sx={{
                    bgcolor: `${brandColors.primary}15`,
                    color: brandColors.primary,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" sx={{ mb: 2.5, lineHeight: 1.8 }}>
                {selectedBehavior.summary}
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: statusColors.success, fontWeight: 700 }}
              >
                الصفات الإيجابية
              </Typography>
              <List dense sx={{ mb: 2 }}>
                {selectedBehavior.positiveTraits?.map((trait, i) => (
                  <ListItem key={i} sx={{ py: 0.3 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ThumbUpIcon sx={{ fontSize: 18, color: statusColors.success }} />
                    </ListItemIcon>
                    <ListItemText primary={trait} />
                  </ListItem>
                ))}
              </List>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, color: statusColors.warning, fontWeight: 700 }}
              >
                مجالات التحسين
              </Typography>
              <List dense>
                {selectedBehavior.areasToImprove?.map((area, i) => (
                  <ListItem key={i} sx={{ py: 0.3 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon sx={{ fontSize: 18, color: statusColors.warning }} />
                    </ListItemIcon>
                    <ListItemText primary={area} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setBehaviorDialogOpen(false)}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AttendanceReports;
