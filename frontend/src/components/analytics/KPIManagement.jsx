/**
 * KPI Management Component
 * مكون إدارة مؤشرات الأداء الرئيسية
 * 
 * Features:
 * - List all KPIs
 * - Create/Edit KPIs
 * - Calculate KPI values
 * - View history
 * - Delete KPIs
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  History as HistoryIcon,
  TrendingUp,
  TrendingDown,
  Remove,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const CATEGORY_OPTIONS = [
  { value: 'operational', label: 'تشغيلي' },
  { value: 'quality', label: 'جودة' },
  { value: 'satisfaction', label: 'رضا' },
  { value: 'financial', label: 'مالي' },
  { value: 'performance', label: 'أداء' },
  { value: 'custom', label: 'مخصص' }
];

const UNIT_OPTIONS = [
  { value: 'percentage', label: '%' },
  { value: 'number', label: 'رقم' },
  { value: 'currency', label: 'عملة' },
  { value: 'time', label: 'وقت' },
  { value: 'count', label: 'عدد' }
];

const DIRECTION_OPTIONS = [
  { value: 'up', label: 'زيادة' },
  { value: 'down', label: 'انخفاض' },
  { value: 'stable', label: 'ثبات' }
];

const STATUS_COLORS = {
  excellent: '#4caf50',
  good: '#2196f3',
  warning: '#ff9800',
  critical: '#f44336'
};

const STATUS_LABELS = {
  excellent: 'ممتاز',
  good: 'جيد',
  warning: 'تحذير',
  critical: 'حرج'
};

function KPIManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [filteredKpis, setFilteredKpis] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [calculating, setCalculating] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    code: '',
    category: 'operational',
    unit: 'percentage',
    direction: 'up',
    value: {
      current: 0,
      target: 100,
      previous: 0
    },
    thresholds: {
      excellent: 90,
      good: 70,
      warning: 50,
      critical: 0
    },
    calculation: {
      formula: '',
      dataSource: '',
      refreshInterval: 3600
    },
    isActive: true
  });

  useEffect(() => {
    loadKPIs();
  }, []);

  useEffect(() => {
    filterKPIs();
  }, [kpis, selectedCategory, selectedTab]);

  const loadKPIs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analytics/kpis');
      setKpis(response.data.data || []);
    } catch (err) {
      console.error('Error loading KPIs:', err);
      setError('خطأ في تحميل المؤشرات');
    } finally {
      setLoading(false);
    }
  };

  const filterKPIs = () => {
    let filtered = [...kpis];

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(kpi => kpi.category === selectedCategory);
    }

    // Filter by active status
    if (selectedTab === 1) {
      filtered = filtered.filter(kpi => !kpi.isActive);
    } else if (selectedTab === 0) {
      filtered = filtered.filter(kpi => kpi.isActive);
    }

    setFilteredKpis(filtered);
  };

  const handleOpenDialog = (mode, kpi = null) => {
    setDialogMode(mode);
    setSelectedKpi(kpi);
    
    if (mode === 'edit' && kpi) {
      setFormData({
        name: kpi.name || '',
        nameAr: kpi.nameAr || '',
        code: kpi.code || '',
        category: kpi.category || 'operational',
        unit: kpi.unit || 'percentage',
        direction: kpi.direction || 'up',
        value: kpi.value || { current: 0, target: 100, previous: 0 },
        thresholds: kpi.thresholds || { excellent: 90, good: 70, warning: 50, critical: 0 },
        calculation: kpi.calculation || { formula: '', dataSource: '', refreshInterval: 3600 },
        isActive: kpi.isActive !== false
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        nameAr: '',
        code: '',
        category: 'operational',
        unit: 'percentage',
        direction: 'up',
        value: { current: 0, target: 100, previous: 0 },
        thresholds: { excellent: 90, good: 70, warning: 50, critical: 0 },
        calculation: { formula: '', dataSource: '', refreshInterval: 3600 },
        isActive: true
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedKpi(null);
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'create') {
        await axios.post('/api/analytics/kpis', formData);
      } else {
        await axios.put(`/api/analytics/kpis/${selectedKpi._id}`, formData);
      }
      
      await loadKPIs();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving KPI:', err);
      setError(err.response?.data?.error || 'خطأ في حفظ المؤشر');
    }
  };

  const handleCalculate = async (kpiId) => {
    try {
      setCalculating(prev => ({ ...prev, [kpiId]: true }));
      await axios.post(`/api/analytics/kpis/${kpiId}/calculate`);
      await loadKPIs();
    } catch (err) {
      console.error('Error calculating KPI:', err);
      alert('خطأ في حساب المؤشر');
    } finally {
      setCalculating(prev => ({ ...prev, [kpiId]: false }));
    }
  };

  const handleDelete = async (kpiId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المؤشر؟')) {
      return;
    }

    try {
      await axios.delete(`/api/analytics/kpis/${kpiId}`);
      await loadKPIs();
    } catch (err) {
      console.error('Error deleting KPI:', err);
      alert('خطأ في حذف المؤشر');
    }
  };

  const handleShowHistory = (kpi) => {
    setSelectedKpi(kpi);
    setOpenHistoryDialog(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          إدارة مؤشرات الأداء
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadKPIs}
          >
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            إضافة مؤشر جديد
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
              <Tab label={`نشط (${kpis.filter(k => k.isActive).length})`} />
              <Tab label={`غير نشط (${kpis.filter(k => !k.isActive).length})`} />
              <Tab label={`الكل (${kpis.length})`} />
            </Tabs>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="الفئة"
              >
                <MenuItem value="">الكل</MenuItem>
                {CATEGORY_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Grid */}
      <Grid container spacing={3}>
        {filteredKpis
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((kpi) => (
            <Grid item xs={12} md={6} lg={4} key={kpi._id}>
              <KPICard
                kpi={kpi}
                onEdit={() => handleOpenDialog('edit', kpi)}
                onDelete={() => handleDelete(kpi._id)}
                onCalculate={() => handleCalculate(kpi._id)}
                onShowHistory={() => handleShowHistory(kpi)}
                calculating={calculating[kpi._id]}
              />
            </Grid>
          ))}
      </Grid>

      {filteredKpis.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          لا توجد مؤشرات متاحة
        </Alert>
      )}

      {/* Pagination */}
      {filteredKpis.length > rowsPerPage && (
        <TablePagination
          component="div"
          count={filteredKpis.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="عدد الصفوف:"
        />
      )}

      {/* KPI Dialog */}
      <KPIDialog
        open={openDialog}
        onClose={handleCloseDialog}
        mode={dialogMode}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
      />

      {/* History Dialog */}
      <HistoryDialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        kpi={selectedKpi}
      />
    </Container>
  );
}

/**
 * KPI Card Component
 */
function KPICard({ kpi, onEdit, onDelete, onCalculate, onShowHistory, calculating }) {
  const getTrendIcon = () => {
    if (!kpi.value.previous || kpi.value.previous === kpi.value.current) {
      return <Remove fontSize="small" />;
    }
    
    const isPositive = kpi.value.current > kpi.value.previous;
    
    if ((kpi.direction === 'up' && isPositive) || (kpi.direction === 'down' && !isPositive)) {
      return <TrendingUp fontSize="small" sx={{ color: 'success.main' }} />;
    } else {
      return <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />;
    }
  };

  const getProgress = () => {
    if (!kpi.value.target || kpi.value.target === 0) return 0;
    return Math.min((kpi.value.current / kpi.value.target) * 100, 100);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {kpi.nameAr || kpi.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {kpi.code}
            </Typography>
          </Box>
          <Chip
            label={STATUS_LABELS[kpi.status]}
            size="small"
            sx={{
              bgcolor: STATUS_COLORS[kpi.status],
              color: 'white'
            }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="h4">
            {kpi.value.current}
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {kpi.unit === 'percentage' ? '%' : kpi.unit === 'currency' ? 'ريال' : ''}
            </Typography>
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            {getTrendIcon()}
            <Typography variant="body2" color="text.secondary">
              الهدف: {kpi.value.target}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">التقدم</Typography>
            <Typography variant="caption">{getProgress().toFixed(0)}%</Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: 8,
              bgcolor: 'grey.200',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${getProgress()}%`,
                height: '100%',
                bgcolor: STATUS_COLORS[kpi.status],
                transition: 'width 0.3s ease'
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={CATEGORY_OPTIONS.find(c => c.value === kpi.category)?.label || kpi.category}
            size="small"
            variant="outlined"
          />
          {kpi.history && kpi.history.length > 0 && (
            <Chip
              label={`${kpi.history.length} سجل`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <IconButton size="small" onClick={onEdit} title="تعديل">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onDelete} title="حذف">
          <DeleteIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={onCalculate} 
          disabled={calculating}
          title="حساب"
        >
          {calculating ? (
            <CircularProgress size={16} />
          ) : (
            <CalculateIcon fontSize="small" />
          )}
        </IconButton>
        {kpi.history && kpi.history.length > 0 && (
          <IconButton size="small" onClick={onShowHistory} title="السجل">
            <HistoryIcon fontSize="small" />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
}

/**
 * KPI Dialog Component
 */
function KPIDialog({ open, onClose, mode, formData, setFormData, onSubmit }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'إضافة مؤشر جديد' : 'تعديل المؤشر'}
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="الاسم (English)"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="الاسم (عربي)"
              value={formData.nameAr}
              onChange={(e) => handleChange('nameAr', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="الكود"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              disabled={mode === 'edit'}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                label="الفئة"
              >
                {CATEGORY_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>الوحدة</InputLabel>
              <Select
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                label="الوحدة"
              >
                {UNIT_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>الاتجاه</InputLabel>
              <Select
                value={formData.direction}
                onChange={(e) => handleChange('direction', e.target.value)}
                label="الاتجاه"
              >
                {DIRECTION_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider>القيم</Divider>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="القيمة الحالية"
              value={formData.value.current}
              onChange={(e) => handleNestedChange('value', 'current', parseFloat(e.target.value))}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="الهدف"
              value={formData.value.target}
              onChange={(e) => handleNestedChange('value', 'target', parseFloat(e.target.value))}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="القيمة السابقة"
              value={formData.value.previous}
              onChange={(e) => handleNestedChange('value', 'previous', parseFloat(e.target.value))}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider>العتبات</Divider>
          </Grid>

          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="ممتاز"
              value={formData.thresholds.excellent}
              onChange={(e) => handleNestedChange('thresholds', 'excellent', parseFloat(e.target.value))}
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="جيد"
              value={formData.thresholds.good}
              onChange={(e) => handleNestedChange('thresholds', 'good', parseFloat(e.target.value))}
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="تحذير"
              value={formData.thresholds.warning}
              onChange={(e) => handleNestedChange('thresholds', 'warning', parseFloat(e.target.value))}
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <TextField
              fullWidth
              type="number"
              label="حرج"
              value={formData.thresholds.critical}
              onChange={(e) => handleNestedChange('thresholds', 'critical', parseFloat(e.target.value))}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                />
              }
              label="نشط"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={onSubmit} variant="contained">
          {mode === 'create' ? 'إضافة' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * History Dialog Component
 */
function HistoryDialog({ open, onClose, kpi }) {
  if (!kpi || !kpi.history || kpi.history.length === 0) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>سجل المؤشر</DialogTitle>
        <DialogContent>
          <Alert severity="info">لا يوجد سجل متاح لهذا المؤشر</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const chartData = kpi.history.map(h => ({
    date: new Date(h.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    value: h.value
  })).reverse();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        سجل المؤشر: {kpi.nameAr || kpi.name}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            الرسم البياني
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2196f3" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          السجل التفصيلي
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell align="right">القيمة</TableCell>
                <TableCell>ملاحظات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kpi.history.slice().reverse().map((record, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {new Date(record.date).toLocaleString('ar-SA')}
                  </TableCell>
                  <TableCell align="right">
                    {record.value}
                  </TableCell>
                  <TableCell>
                    {record.note || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

export default KPIManagement;
