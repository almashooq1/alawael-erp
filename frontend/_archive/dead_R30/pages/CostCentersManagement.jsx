import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Assessment,
  Warning,
} from '@mui/icons-material';
import axios from 'axios';

/**
 * 💼 إدارة مراكز التكلفة
 * ==========================
 * 
 * المميزات:
 * - عرض جميع مراكز التكلفة
 * - إضافة/تعديل/حذف المراكز
 * - تسجيل التكاليف والإيرادات
 * - متابعة الميزانية
 * - تحديث مؤشرات الأداء (KPIs)
 * - تحليل الأداء
 */

const CostCentersManagement = () => {
  // الحالة
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // نوافذ الحوار
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // add, edit, view, cost, revenue, kpi
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [formData, setFormData] = useState({});

  // الإحصائيات
  const [stats, setStats] = useState({
    totalCenters: 0,
    overBudgetCount: 0,
    totalBudget: 0,
    totalSpent: 0,
  });

  // أنواع مراكز التكلفة
  const types = [
    { value: 'cost', label: 'مركز تكلفة', color: 'error' },
    { value: 'revenue', label: 'مركز إيراد', color: 'success' },
    { value: 'profit', label: 'مركز ربحية', color: 'info' },
    { value: 'investment', label: 'مركز استثماري', color: 'warning' },
  ];

  // الفئات
  const categories = [
    { value: 'administrative', label: 'إداري' },
    { value: 'production', label: 'إنتاج' },
    { value: 'sales', label: 'مبيعات' },
    { value: 'marketing', label: 'تسويق' },
    { value: 'technical', label: 'تقني' },
    { value: 'support', label: 'دعم' },
  ];

  // جلب البيانات
  useEffect(() => {
    fetchCostCenters();
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedCategory]);

  const fetchCostCenters = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedType !== 'all') params.type = selectedType;
      if (selectedCategory !== 'all') params.category = selectedCategory;

      const response = await axios.get('/api/accounting/cost-centers', { params });
      setCostCenters(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/accounting/cost-centers/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // فتح نافذة الحوار
  const handleOpenDialog = (type, center = null) => {
    setDialogType(type);
    setSelectedCenter(center);

    if (type === 'add') {
      setFormData({
        code: '',
        name: '',
        nameEn: '',
        type: 'cost',
        category: 'administrative',
        description: '',
        totalBudget: '',
        year: new Date().getFullYear(),
      });
    } else if (type === 'edit' && center) {
      setFormData({
        name: center.name,
        nameEn: center.nameEn || '',
        type: center.type,
        category: center.category,
        description: center.description || '',
      });
    } else if (type === 'cost' && center) {
      setFormData({
        amount: '',
        type: 'direct',
        category: 'materials',
        description: '',
      });
    } else if (type === 'revenue' && center) {
      setFormData({
        amount: '',
        source: '',
      });
    } else if (type === 'kpi' && center) {
      setFormData({
        name: '',
        targetValue: '',
        actualValue: '',
      });
    }

    setOpenDialog(true);
  };

  // إغلاق نافذة الحوار
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCenter(null);
    setFormData({});
  };

  // حفظ البيانات
  const handleSave = async () => {
    try {
      if (dialogType === 'add') {
        await axios.post('/api/accounting/cost-centers', formData);
      } else if (dialogType === 'edit') {
        await axios.put(`/api/accounting/cost-centers/${selectedCenter._id}`, formData);
      } else if (dialogType === 'cost') {
        await axios.post(`/api/accounting/cost-centers/${selectedCenter._id}/cost`, formData);
      } else if (dialogType === 'revenue') {
        await axios.post(`/api/accounting/cost-centers/${selectedCenter._id}/revenue`, formData);
      } else if (dialogType === 'kpi') {
        await axios.put(`/api/accounting/cost-centers/${selectedCenter._id}/kpi`, formData);
      }

      handleCloseDialog();
      fetchCostCenters();
      fetchStats();
    } catch (error) {
      console.error('Error saving:', error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  // حذف المركز
  const handleDelete = async (centerId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المركز؟')) {
      try {
        await axios.delete(`/api/accounting/cost-centers/${centerId}`);
        fetchCostCenters();
        fetchStats();
      } catch (error) {
        console.error('Error deleting:', error);
        alert('حدث خطأ أثناء الحذف');
      }
    }
  };

  // بطاقة إحصائية
  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" color={color} mt={1}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );

  // شريط الميزانية
  const BudgetBar = ({ center }) => {
    const utilization = center.budgetUtilization || 0;
    const color =
      utilization > 90 ? 'error' : utilization > 75 ? 'warning' : 'success';

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Typography variant="body2">{utilization.toFixed(1)}%</Typography>
          <Typography variant="body2" color="text.secondary">
            {center.budget?.spentBudget?.toLocaleString('ar-SA')} /{' '}
            {center.budget?.totalBudget?.toLocaleString('ar-SA')} ر.س
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(utilization, 100)}
          color={color}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
    );
  };

  // محتوى نافذة الحوار
  const renderDialogContent = () => {
    if (dialogType === 'view' && selectedCenter) {
      return (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                الرمز
              </Typography>
              <Typography variant="body1">{selectedCenter.code}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                الاسم
              </Typography>
              <Typography variant="body1">{selectedCenter.name}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                النوع
              </Typography>
              <Chip
                label={types.find((t) => t.value === selectedCenter.type)?.label}
                color={types.find((t) => t.value === selectedCenter.type)?.color}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                الفئة
              </Typography>
              <Typography variant="body1">{selectedCenter.category}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                الميزانية
              </Typography>
              <BudgetBar center={selectedCenter} />
            </Grid>
            {selectedCenter.type === 'profit' && (
              <>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    هامش الربح
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {selectedCenter.profitMargin?.toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    العائد على الاستثمار
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {selectedCenter.roi?.toFixed(2)}%
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      );
    }

    if (dialogType === 'add' || dialogType === 'edit') {
      return (
        <Grid container spacing={2}>
          {dialogType === 'add' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الرمز"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="CC-XXX"
              />
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="الاسم"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="الاسم بالإنجليزية"
              value={formData.nameEn || ''}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="النوع"
              >
                {types.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="الفئة"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {dialogType === 'add' && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الميزانية الإجمالية"
                  type="number"
                  value={formData.totalBudget || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, totalBudget: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="السنة"
                  type="number"
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="الوصف"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    if (dialogType === 'cost') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info">
              تسجيل تكلفة لمركز: {selectedCenter?.name}
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="المبلغ"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>نوع التكلفة</InputLabel>
              <Select
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="نوع التكلفة"
              >
                <MenuItem value="direct">مباشرة</MenuItem>
                <MenuItem value="indirect">غير مباشرة</MenuItem>
                <MenuItem value="fixed">ثابتة</MenuItem>
                <MenuItem value="variable">متغيرة</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>فئة التكلفة</InputLabel>
              <Select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="فئة التكلفة"
              >
                <MenuItem value="materials">مواد خام</MenuItem>
                <MenuItem value="labor">أجور</MenuItem>
                <MenuItem value="overhead">تكاليف عامة</MenuItem>
                <MenuItem value="utilities">مرافق</MenuItem>
                <MenuItem value="maintenance">صيانة</MenuItem>
                <MenuItem value="other">أخرى</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="الوصف"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    if (dialogType === 'revenue') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="success">
              تسجيل إيراد لمركز: {selectedCenter?.name}
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="المبلغ"
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="المصدر"
              value={formData.source || ''}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    if (dialogType === 'kpi') {
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info">
              تحديث مؤشر أداء لمركز: {selectedCenter?.name}
            </Alert>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="اسم المؤشر"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="القيمة المستهدفة"
              type="number"
              value={formData.targetValue || ''}
              onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="القيمة الفعلية"
              type="number"
              value={formData.actualValue || ''}
              onChange={(e) => setFormData({ ...formData, actualValue: e.target.value })}
            />
          </Grid>
        </Grid>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* العنوان */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          💼 إدارة مراكز التكلفة
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog('add')}
        >
          إضافة مركز جديد
        </Button>
      </Box>

      {/* بطاقات الإحصائيات */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي المراكز"
            value={stats.totalCenters}
            icon={<Assessment fontSize="large" color="primary" />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="المراكز المتجاوزة للميزانية"
            value={stats.overBudgetCount}
            icon={<Warning fontSize="large" color="error" />}
            color="error.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الميزانية"
            value={stats.totalBudget?.toLocaleString('ar-SA')}
            subtitle="ر.س"
            icon={<AttachMoney fontSize="large" color="success" />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="المصروف"
            value={stats.totalSpent?.toLocaleString('ar-SA')}
            subtitle="ر.س"
            icon={<TrendingDown fontSize="large" color="warning" />}
            color="warning.main"
          />
        </Grid>
      </Grid>

      {/* الفلترة */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                label="النوع"
              >
                <MenuItem value="all">الكل</MenuItem>
                {types.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="الفئة"
              >
                <MenuItem value="all">الكل</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* جدول المراكز */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الرمز</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الميزانية</TableCell>
              <TableCell align="center">الحالة</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {costCenters.map((center) => (
              <TableRow key={center._id}>
                <TableCell>{center.code}</TableCell>
                <TableCell>{center.name}</TableCell>
                <TableCell>
                  <Chip
                    label={types.find((t) => t.value === center.type)?.label}
                    color={types.find((t) => t.value === center.type)?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell>{center.category}</TableCell>
                <TableCell>
                  <BudgetBar center={center} />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={center.budgetStatus}
                    color={
                      center.budgetStatus === 'over'
                        ? 'error'
                        : center.budgetStatus === 'warning'
                        ? 'warning'
                        : 'success'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="عرض">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('view', center)}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('edit', center)}
                    >
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تسجيل تكلفة">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog('cost', center)}
                    >
                      <TrendingDown />
                    </IconButton>
                  </Tooltip>
                  {(center.type === 'revenue' || center.type === 'profit') && (
                    <Tooltip title="تسجيل إيراد">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog('revenue', center)}
                      >
                        <TrendingUp />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="حذف">
                    <IconButton size="small" onClick={() => handleDelete(center._id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* نافذة الحوار */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'add' && 'إضافة مركز تكلفة جديد'}
          {dialogType === 'edit' && 'تعديل مركز التكلفة'}
          {dialogType === 'view' && 'تفاصيل مركز التكلفة'}
          {dialogType === 'cost' && 'تسجيل تكلفة'}
          {dialogType === 'revenue' && 'تسجيل إيراد'}
          {dialogType === 'kpi' && 'تحديث مؤشر الأداء'}
        </DialogTitle>
        <DialogContent>{renderDialogContent()}</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          {dialogType !== 'view' && (
            <Button variant="contained" onClick={handleSave}>
              حفظ
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CostCentersManagement;
