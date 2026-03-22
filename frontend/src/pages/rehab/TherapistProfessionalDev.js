import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Tooltip,
  LinearProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  CardMembership as CertIcon,
  Groups as GroupsIcon,
  Science as ScienceIcon,
  Build as BuildIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Timer as TimerIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const categoryIcons = {
  courses: <SchoolIcon />,
  certifications: <CertIcon />,
  conferences: <GroupsIcon />,
  workshops: <BuildIcon />,
  research: <ScienceIcon />,
  supervision: <GroupsIcon />,
};

const TherapistProfessionalDev = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [data, setData] = useState({
    activities: [],
    categories: [],
    stats: {},
    recommendations: [],
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({
    title: '',
    category: 'courses',
    provider: '',
    date: '',
    hours: 0,
    cpdPoints: 0,
    status: 'in_progress',
    certificate: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadData = async () => {
    try {
      const result = await therapistService.getProfessionalDev();
      setData(result || { activities: [], categories: [], stats: {}, recommendations: [] });
      setLoading(false);
    } catch (error) {
      logger.error('Error loading professional dev:', error);
      setLoading(false);
      showSnackbar('حدث خطأ في تحميل بيانات التطوير المهني', 'error');
    }
  };

  const handleCreate = async () => {
    try {
      await therapistService.addProfessionalDev(newActivity);
      showSnackbar('تم إضافة النشاط بنجاح', 'success');
      setDialogOpen(false);
      setNewActivity({
        title: '',
        category: 'courses',
        provider: '',
        date: '',
        hours: 0,
        cpdPoints: 0,
        status: 'in_progress',
        certificate: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      showSnackbar('حدث خطأ في الإضافة', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteProfessionalDev(id);
      showSnackbar('تم حذف النشاط', 'success');
      loadData();
    } catch (error) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const { stats = {}, recommendations = [], categories = [] } = data;
  const activities = data.activities || [];
  const cpdProgress = stats.targetCpdPoints
    ? Math.min(100, Math.round((stats.cpdPoints / stats.targetCpdPoints) * 100))
    : 0;

  const getCategoryLabel = catId => {
    const cat = categories.find(c => c.id === catId);
    return cat?.name || catId;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل بيانات التطوير المهني...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrophyIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              التطوير المهني
            </Typography>
            <Typography variant="body2">
              تتبع الدورات والشهادات ونقاط التطوير المهني المستمر
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* نقاط CPD */}
      <Card sx={{ borderRadius: 2, mb: 3, background: surfaceColors.paperAlt }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              <StarIcon sx={{ verticalAlign: 'middle', mr: 1, color: statusColors.warning }} />
              نقاط التطوير المهني المستمر (CPD)
            </Typography>
            <Chip
              label={`${stats.cpdPoints || 0} / ${stats.targetCpdPoints || 40} نقطة`}
              color={cpdProgress >= 100 ? 'success' : 'warning'}
              size="small"
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={cpdProgress}
            sx={{ height: 12, borderRadius: 6, mb: 1 }}
            color={cpdProgress >= 100 ? 'success' : 'primary'}
          />
          <Typography variant="caption" color="textSecondary">
            {cpdProgress >= 100
              ? 'تهانينا! تم تحقيق الهدف السنوي'
              : `متبقي ${(stats.targetCpdPoints || 40) - (stats.cpdPoints || 0)} نقطة لتحقيق الهدف`}
          </Typography>
        </CardContent>
      </Card>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الأنشطة',
            value: stats.totalActivities || 0,
            color: statusColors.info,
            icon: <SchoolIcon />,
          },
          {
            label: 'ساعات التدريب',
            value: stats.totalHours || 0,
            color: statusColors.success,
            icon: <TimerIcon />,
          },
          {
            label: 'أنشطة مكتملة',
            value: stats.completedActivities || 0,
            color: statusColors.warning,
            icon: <CheckIcon />,
          },
          {
            label: 'الشهادات',
            value: stats.certificates || 0,
            color: statusColors.purple,
            icon: <CertIcon />,
          },
        ].map((stat, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: stat.color }}>
                    {stat.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* الأنشطة */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  الأنشطة التدريبية
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setDialogOpen(true)}
                >
                  إضافة نشاط
                </Button>
              </Box>

              {activities.length > 0 ? (
                <List>
                  {activities.map(activity => (
                    <ListItem
                      key={activity.id}
                      sx={{ borderBottom: `1px solid ${surfaceColors.borderSubtle}`, py: 2 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: statusColors.info }}>
                          {categoryIcons[activity.category] || <SchoolIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {activity.title}
                            </Typography>
                            <Chip
                              label={getCategoryLabel(activity.category)}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={activity.status === 'completed' ? 'مكتمل' : 'جاري'}
                              color={activity.status === 'completed' ? 'success' : 'warning'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption">{activity.provider}</Typography>
                            {activity.date && (
                              <Typography variant="caption">
                                {' '}
                                • {new Date(activity.date).toLocaleDateString('ar')}
                              </Typography>
                            )}
                            {activity.hours > 0 && (
                              <Typography variant="caption"> • {activity.hours} ساعة</Typography>
                            )}
                            {activity.cpdPoints > 0 && (
                              <Typography variant="caption">
                                {' '}
                                • {activity.cpdPoints} نقطة CPD
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemText />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Paper sx={{ textAlign: 'center', py: 4 }}>
                  <SchoolIcon sx={{ fontSize: 50, color: neutralColors.textMuted, mb: 1 }} />
                  <Typography color="textSecondary">لا توجد أنشطة تدريبية</Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* التوصيات */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                فرص تدريبية موصى بها
              </Typography>
              {recommendations.map((rec, i) => (
                <Paper
                  key={i}
                  sx={{ p: 2, mb: 2, backgroundColor: surfaceColors.paperAlt, borderRadius: 2 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {rec.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    {rec.provider}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={`${rec.hours} ساعة`} size="small" icon={<TimerIcon />} />
                    <Chip
                      label={`${rec.cpdPoints} نقطة`}
                      size="small"
                      icon={<StarIcon />}
                      color="warning"
                    />
                  </Box>
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    الموعد النهائي: {new Date(rec.deadline).toLocaleDateString('ar')}
                  </Typography>
                </Paper>
              ))}
            </CardContent>
          </Card>

          {/* فئات الأنشطة */}
          <Card sx={{ borderRadius: 2, mt: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                فئات التدريب
              </Typography>
              {categories.map(cat => (
                <Box key={cat.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: `${statusColors.info}20`,
                      color: statusColors.info,
                    }}
                  >
                    {categoryIcons[cat.id] || <SchoolIcon fontSize="small" />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {cat.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {cat.nameEn}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog إضافة نشاط */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة نشاط تطوير مهني</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="عنوان النشاط"
            fullWidth
            value={newActivity.title}
            onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>الفئة</InputLabel>
            <Select
              value={newActivity.category}
              label="الفئة"
              onChange={e => setNewActivity({ ...newActivity, category: e.target.value })}
            >
              {categories.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="الجهة المقدمة"
            fullWidth
            value={newActivity.provider}
            onChange={e => setNewActivity({ ...newActivity, provider: e.target.value })}
          />
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                label="التاريخ"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newActivity.date}
                onChange={e => setNewActivity({ ...newActivity, date: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="عدد الساعات"
                type="number"
                fullWidth
                value={newActivity.hours}
                onChange={e => setNewActivity({ ...newActivity, hours: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="نقاط CPD"
                type="number"
                fullWidth
                value={newActivity.cpdPoints}
                onChange={e =>
                  setNewActivity({ ...newActivity, cpdPoints: Number(e.target.value) })
                }
              />
            </Grid>
          </Grid>
          <FormControl fullWidth>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={newActivity.status}
              label="الحالة"
              onChange={e => setNewActivity({ ...newActivity, status: e.target.value })}
            >
              <MenuItem value="in_progress">جاري</MenuItem>
              <MenuItem value="completed">مكتمل</MenuItem>
              <MenuItem value="planned">مخطط</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="ملاحظات"
            fullWidth
            multiline
            rows={2}
            value={newActivity.notes}
            onChange={e => setNewActivity({ ...newActivity, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newActivity.title}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistProfessionalDev;
