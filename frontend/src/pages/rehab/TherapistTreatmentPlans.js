import { useState, useEffect } from 'react';

import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors } from '../../theme/palette';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import FlagIcon from '@mui/icons-material/Flag';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { ViewIcon } from 'utils/iconAliases';

const TherapistTreatmentPlans = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [data, setData] = useState({ plans: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    beneficiary: '',
    startDate: '',
    endDate: '',
    goals: [],
  });

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, statusFilter]);

  const loadPlans = async () => {
    try {
      const result = await therapistService.getTreatmentPlans({
        status: statusFilter,
        search: searchText,
      });
      setData(result || { plans: [], stats: {} });
      setLoading(false);
    } catch (error) {
      logger.error('Error loading treatment plans:', error);
      setLoading(false);
      showSnackbar('حدث خطأ في تحميل الخطط العلاجية', 'error');
    }
  };

  const handleCreate = async () => {
    try {
      await therapistService.createTreatmentPlan(newPlan);
      showSnackbar('تم إنشاء الخطة العلاجية بنجاح', 'success');
      setDialogOpen(false);
      setNewPlan({
        title: '',
        description: '',
        beneficiary: '',
        startDate: '',
        endDate: '',
        goals: [],
      });
      loadPlans();
    } catch (error) {
      showSnackbar('حدث خطأ في إنشاء الخطة', 'error');
    }
  };

  const getStatusChip = status => {
    const map = {
      active: { label: 'نشطة', color: 'success' },
      نشطة: { label: 'نشطة', color: 'success' },
      completed: { label: 'مكتملة', color: 'info' },
      مكتملة: { label: 'مكتملة', color: 'info' },
      pending: { label: 'معلقة', color: 'warning' },
      معلقة: { label: 'معلقة', color: 'warning' },
    };
    const config = map[status] || { label: status || 'غير محدد', color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const { stats = {} } = data;
  const filteredPlans = (data.plans || []).filter(
    p => !searchText || p.title?.includes(searchText) || p.description?.includes(searchText)
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل الخطط العلاجية...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PlanIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الخطط العلاجية
            </Typography>
            <Typography variant="body2">إدارة ومتابعة الخطط العلاجية والأهداف</Typography>
          </Box>
        </Box>
      </Box>

      {/* الإحصائيات */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الخطط',
            value: stats.total || 0,
            color: statusColors.info,
            icon: <PlanIcon />,
          },
          {
            label: 'خطط نشطة',
            value: stats.active || 0,
            color: statusColors.success,
            icon: <CheckIcon />,
          },
          {
            label: 'إجمالي الأهداف',
            value: stats.totalGoals || 0,
            color: statusColors.warning,
            icon: <FlagIcon />,
          },
          {
            label: 'أهداف محققة',
            value: stats.achievedGoals || 0,
            color: statusColors.purple,
            icon: <TrendingUpIcon />,
          },
        ].map((stat, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                <Box>
                  <Typography color="textSecondary" variant="caption">
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

      {/* أدوات البحث والفلترة */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="ابحث عن خطة..."
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="active">نشطة</MenuItem>
            <MenuItem value="completed">مكتملة</MenuItem>
            <MenuItem value="pending">معلقة</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          خطة جديدة
        </Button>
      </Box>

      {/* قائمة الخطط */}
      {filteredPlans.map(plan => (
        <Card key={plan._id || plan.id} sx={{ borderRadius: 2, mb: 2, boxShadow: 2 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {plan.title || 'خطة علاجية'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                  {plan.beneficiary?.name || 'مستفيد'} •{' '}
                  {plan.startDate ? new Date(plan.startDate).toLocaleDateString('ar') : ''}
                  {plan.endDate ? ` - ${new Date(plan.endDate).toLocaleDateString('ar')}` : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {getStatusChip(plan.status)}
                <Tooltip title="عرض التفاصيل">
                  <IconButton size="small">
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تعديل">
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            {plan.description && (
              <Typography variant="body2" sx={{ mb: 2, color: neutralColors.textMuted }}>
                {plan.description}
              </Typography>
            )}
            {/* الأهداف */}
            {plan.goals?.length > 0 && (
              <Box>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  الأهداف ({plan.goals.filter(g => g.status === 'ACHIEVED').length}/
                  {plan.goals.length})
                </Typography>
                {plan.goals.slice(0, 3).map((goal, gi) => (
                  <Box key={gi} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <FlagIcon
                      sx={{
                        fontSize: 16,
                        color: goal.status === 'ACHIEVED' ? 'success.main' : 'warning.main',
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {goal.description || goal.title || `هدف ${gi + 1}`}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={goal.status === 'ACHIEVED' ? 100 : goal.progress || 0}
                      sx={{ width: 80, height: 5, borderRadius: 3 }}
                    />
                    <Typography variant="caption">
                      {goal.status === 'ACHIEVED' ? '100' : goal.progress || 0}%
                    </Typography>
                  </Box>
                ))}
                {plan.goals.length > 3 && (
                  <Typography variant="caption" color="textSecondary">
                    +{plan.goals.length - 3} أهداف أخرى
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      {filteredPlans.length === 0 && (
        <Paper sx={{ textAlign: 'center', py: 6, borderRadius: 2 }}>
          <PlanIcon sx={{ fontSize: 60, color: neutralColors.textMuted, mb: 2 }} />
          <Typography color="textSecondary">لا توجد خطط علاجية</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => setDialogOpen(true)}
          >
            إنشاء خطة جديدة
          </Button>
        </Paper>
      )}

      {/* Dialog إنشاء خطة */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء خطة علاجية جديدة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="عنوان الخطة"
            fullWidth
            value={newPlan.title}
            onChange={e => setNewPlan({ ...newPlan, title: e.target.value })}
          />
          <TextField
            label="الوصف"
            fullWidth
            multiline
            rows={3}
            value={newPlan.description}
            onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="تاريخ البداية"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newPlan.startDate}
                onChange={e => setNewPlan({ ...newPlan, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="تاريخ النهاية"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={newPlan.endDate}
                onChange={e => setNewPlan({ ...newPlan, endDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newPlan.title}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistTreatmentPlans;
